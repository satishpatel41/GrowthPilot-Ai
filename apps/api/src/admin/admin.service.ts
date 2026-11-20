import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../common/audit.service';
import { SessionUser } from '../common/auth.types';
import { config } from '../common/config';
import { DbService, Tx } from '../db/db.service';
import { toLocation, toTenant } from '../tenants/tenants.service';
import { AuditQuery, CreateStaffDto, ListCustomersQuery } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private db: DbService, private audit: AuditService) {}

  /** SQL fragment limiting agency staff to the customers assigned to them. */
  private scope(user: SessionUser, params: any[], alias = 't') {
    if (user.role === 'SUPER_ADMIN') return '';
    params.push(user.id);
    return ` AND EXISTS (SELECT 1 FROM agency_assignments a WHERE a.tenant_id = ${alias}.id AND a.user_id = $${params.length})`;
  }

  stats(user: SessionUser) {
    return this.db.system(async (tx) => {
      const p: any[] = [];
      const scope = this.scope(user, p);
      const r = await tx.one<any>(
        `SELECT count(*) AS total,
                count(*) FILTER (WHERE t.status = 'ACTIVE') AS active,
                count(*) FILTER (WHERE t.status = 'ONBOARDING') AS onboarding,
                count(*) FILTER (WHERE t.status = 'SUSPENDED') AS suspended,
                count(*) FILTER (WHERE t.created_at >= date_trunc('month', now())) AS new_this_month
           FROM tenants t WHERE true ${scope}`,
        p,
      );
      const staff = user.role === 'SUPER_ADMIN'
        ? Number((await tx.one<any>(`SELECT count(*) AS n FROM users WHERE role = 'AGENCY_STAFF' AND status = 'ACTIVE'`))!.n)
        : null;
      const monthly = await tx.query<any>(
        `SELECT to_char(date_trunc('month', t.created_at), 'YYYY-MM') AS month, count(*) AS n
           FROM tenants t WHERE t.created_at >= date_trunc('month', now()) - interval '5 months' ${scope}
          GROUP BY 1 ORDER BY 1`,
        p,
      );
      return {
        customers: { total: +r.total, active: +r.active, onboarding: +r.onboarding, suspended: +r.suspended, newThisMonth: +r.new_this_month },
        activeStaff: staff,
        signupsByMonth: monthly.map((m) => ({ month: m.month, count: +m.n })),
        // Revenue, subscriptions and AI usage arrive with Phases 2 and 3 and are intentionally not reported here.
        unavailable: ['monthlyRecurringRevenue', 'activeSubscriptions', 'aiUsage', 'churn'],
      };
    });
  }

  listCustomers(user: SessionUser, q: ListCustomersQuery) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    return this.db.system(async (tx) => {
      const p: any[] = [];
      let where = ' WHERE true';
      if (q.status) { p.push(q.status); where += ` AND t.status = $${p.length}`; }
      if (q.search) { p.push(`%${q.search.replace(/[%_]/g, '\\$&')}%`); where += ` AND (t.name ILIKE $${p.length} OR u.email ILIKE $${p.length} OR u.name ILIKE $${p.length})`; }
      where += this.scope(user, p);
      const base = `FROM tenants t
        LEFT JOIN tenant_members m ON m.tenant_id = t.id AND m.role = 'OWNER'
        LEFT JOIN users u ON u.id = m.user_id ${where}`;
      const total = Number((await tx.one<any>(`SELECT count(*) AS n ${base}`, p))!.n);
      const rows = await tx.query<any>(
        `SELECT t.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone, u.phone_verified
           ${base} ORDER BY t.created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        p,
      );
      return {
        total, page, pageSize,
        items: rows.map((r) => ({
          ...toTenant(r),
          owner: { name: r.owner_name, email: r.owner_email, phone: r.owner_phone, phoneVerified: r.phone_verified },
        })),
      };
    });
  }

  customer(user: SessionUser, id: string) {
    return this.db.system(async (tx) => {
      const p: any[] = [id];
      const scope = this.scope(user, p);
      const t = await tx.one<any>(`SELECT t.* FROM tenants t WHERE t.id = $1 ${scope}`, p);
      if (!t) throw new NotFoundException('Customer not found');
      const locations = await tx.query(`SELECT * FROM locations WHERE tenant_id = $1 ORDER BY name`, [id]);
      const owner = await tx.one<any>(
        `SELECT u.id, u.name, u.email, u.phone, u.phone_verified FROM tenant_members m JOIN users u ON u.id = m.user_id WHERE m.tenant_id = $1 AND m.role = 'OWNER'`, [id]);
      const team = await tx.query<any>(
        `SELECT u.id, u.name, u.email FROM agency_assignments a JOIN users u ON u.id = a.user_id WHERE a.tenant_id = $1 ORDER BY u.name`, [id]);
      return {
        customer: toTenant(t),
        locations: locations.map(toLocation),
        owner: owner && { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone, phoneVerified: owner.phone_verified },
        assignedStaff: team,
      };
    });
  }

  setStatus(user: SessionUser, id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.db.system(async (tx) => {
      const next = status === 'SUSPENDED' ? 'SUSPENDED' : `CASE WHEN onboarding_completed THEN 'ACTIVE' ELSE 'ONBOARDING' END`;
      const rows = await tx.query<any>(
        `UPDATE tenants SET status = ${status === 'SUSPENDED' ? `'SUSPENDED'` : next}, updated_at = now() WHERE id = $1 RETURNING *`, [id]);
      if (!rows.length) throw new NotFoundException('Customer not found');
      await this.audit.log(tx, { actorId: user.id, tenantId: id, action: `customer.${status.toLowerCase()}`, entity: 'tenant', entityId: id });
      return { customer: toTenant(rows[0]) };
    });
  }

  setAssignments(user: SessionUser, id: string, userIds: string[]) {
    return this.db.system(async (tx) => {
      if (!(await tx.one(`SELECT 1 FROM tenants WHERE id = $1`, [id]))) throw new NotFoundException('Customer not found');
      const unique = [...new Set(userIds)];
      if (unique.length) {
        const ok = await tx.query<any>(`SELECT id FROM users WHERE id = ANY($1::uuid[]) AND role = 'AGENCY_STAFF' AND status = 'ACTIVE'`, [unique]);
        if (ok.length !== unique.length) throw new ForbiddenException('Only active agency team members can be assigned');
      }
      await tx.query(`DELETE FROM agency_assignments WHERE tenant_id = $1`, [id]);
      for (const uid of unique) await tx.query(`INSERT INTO agency_assignments(tenant_id, user_id) VALUES ($1,$2)`, [id, uid]);
      await this.audit.log(tx, { actorId: user.id, tenantId: id, action: 'customer.assignments_updated', entity: 'tenant', entityId: id, meta: { userIds: unique } });
      return { assigned: unique.length };
    });
  }

  team() {
    return this.db.system(async (tx) => {
      const rows = await tx.query<any>(
        `SELECT u.id, u.name, u.email, u.status, u.created_at,
                (SELECT count(*) FROM agency_assignments a WHERE a.user_id = u.id) AS customers
           FROM users u WHERE u.role = 'AGENCY_STAFF' ORDER BY u.name`);
      return { items: rows.map((r) => ({ id: r.id, name: r.name, email: r.email, status: r.status, customers: +r.customers, createdAt: r.created_at })) };
    });
  }

  async createStaff(user: SessionUser, dto: CreateStaffDto) {
    const hash = await bcrypt.hash(dto.password, config.bcryptRounds);
    try {
      return await this.db.system(async (tx) => {
        const row = await tx.one<any>(
          `INSERT INTO users(email, name, password_hash, role, email_verified) VALUES ($1,$2,$3,'AGENCY_STAFF',true) RETURNING id, name, email, status`,
          [dto.email.toLowerCase(), dto.name, hash]);
        await this.audit.log(tx, { actorId: user.id, action: 'team.member_created', entity: 'user', entityId: row.id });
        return { member: row };
      });
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('A user with this email already exists');
      throw e;
    }
  }

  setStaffStatus(user: SessionUser, id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.db.system(async (tx) => {
      const rows = await tx.query<any>(`UPDATE users SET status = $2 WHERE id = $1 AND role = 'AGENCY_STAFF' RETURNING id, name, email, status`, [id, status]);
      if (!rows.length) throw new NotFoundException('Team member not found');
      await this.audit.log(tx, { actorId: user.id, action: `team.member_${status.toLowerCase()}`, entity: 'user', entityId: id });
      return { member: rows[0] };
    });
  }

  auditLogs(q: AuditQuery) {
    return this.db.system(async (tx: Tx) => {
      const p: any[] = [];
      let where = '';
      if (q.tenantId) { p.push(q.tenantId); where = ` WHERE l.tenant_id = $1`; }
      const rows = await tx.query<any>(
        `SELECT l.id, l.action, l.entity, l.entity_id, l.tenant_id, l.created_at, u.name AS actor_name, u.email AS actor_email
           FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id ${where} ORDER BY l.created_at DESC LIMIT ${q.limit ?? 50}`, p);
      return { items: rows.map((r) => ({ id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id, tenantId: r.tenant_id, actor: r.actor_name ? { name: r.actor_name, email: r.actor_email } : null, createdAt: r.created_at })) };
    });
  }
}
