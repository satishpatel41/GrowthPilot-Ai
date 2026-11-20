import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../common/audit.service';
import { SessionUser } from '../common/auth.types';
import { DbService, Tx } from '../db/db.service';
import { LocationDto, UpdateProfileDto } from './tenants.dto';

const FIELD_MAP: Record<string, string> = {
  name: 'name', category: 'category', industry: 'industry', website: 'website', description: 'description',
  targetAudience: 'target_audience', targetLocation: 'target_location', language: 'language',
  objectives: 'objectives', brandColors: 'brand_colors',
};

export function toTenant(r: any) {
  return {
    id: r.id, name: r.name, status: r.status, onboardingStep: r.onboarding_step, onboardingCompleted: r.onboarding_completed,
    category: r.category, industry: r.industry, website: r.website, description: r.description,
    targetAudience: r.target_audience, targetLocation: r.target_location, language: r.language,
    objectives: r.objectives, brandColors: r.brand_colors, createdAt: r.created_at,
  };
}
export const toLocation = (r: any) => ({ id: r.id, name: r.name, address: r.address, city: r.city, state: r.state, country: r.country });

@Injectable()
export class TenantsService {
  constructor(private db: DbService, private audit: AuditService) {}

  private tenantId(user: SessionUser) {
    if (!user.tenantId) throw new NotFoundException('No business is linked to this account');
    return user.tenantId;
  }

  private async load(tx: Tx, id: string) {
    const t = await tx.one(`SELECT * FROM tenants WHERE id = $1`, [id]);
    if (!t) throw new NotFoundException('Business not found');
    const locations = await tx.query(`SELECT * FROM locations WHERE tenant_id = $1 ORDER BY name`, [id]);
    return { tenant: toTenant(t), locations: locations.map(toLocation) };
  }

  get(user: SessionUser) {
    const id = this.tenantId(user);
    return this.db.forTenant(id, (tx) => this.load(tx, id));
  }

  updateProfile(user: SessionUser, dto: UpdateProfileDto) {
    const id = this.tenantId(user);
    return this.db.forTenant(id, async (tx) => {
      const sets: string[] = [];
      const vals: any[] = [id];
      for (const [key, col] of Object.entries(FIELD_MAP)) {
        const v = (dto as any)[key];
        if (v !== undefined) { vals.push(v); sets.push(`${col} = $${vals.length}`); }
      }
      if (dto.step !== undefined) { vals.push(dto.step); sets.push(`onboarding_step = GREATEST(onboarding_step, $${vals.length})`); }
      if (!sets.length) throw new BadRequestException('Nothing to update');
      sets.push('updated_at = now()');
      await tx.query(`UPDATE tenants SET ${sets.join(', ')} WHERE id = $1`, vals);
      await this.audit.log(tx, { actorId: user.id, tenantId: id, action: 'tenant.profile_updated', entity: 'tenant', entityId: id, meta: { fields: Object.keys(dto) } });
      return this.load(tx, id);
    });
  }

  addLocation(user: SessionUser, dto: LocationDto) {
    const id = this.tenantId(user);
    return this.db.forTenant(id, async (tx) => {
      const count = await tx.one<{ n: string }>(`SELECT count(*) AS n FROM locations WHERE tenant_id = $1`, [id]);
      if (Number(count!.n) >= 25) throw new BadRequestException('You can add up to 25 locations');
      const row = await tx.one(
        `INSERT INTO locations(tenant_id, name, address, city, state, country) VALUES ($1,$2,$3,$4,$5,COALESCE($6,'India')) RETURNING *`,
        [id, dto.name, dto.address ?? null, dto.city, dto.state, dto.country ?? null],
      );
      await this.audit.log(tx, { actorId: user.id, tenantId: id, action: 'location.added', entity: 'location', entityId: row.id });
      return { location: toLocation(row) };
    });
  }

  removeLocation(user: SessionUser, locationId: string) {
    const id = this.tenantId(user);
    return this.db.forTenant(id, async (tx) => {
      const rows = await tx.query(`DELETE FROM locations WHERE id = $1 AND tenant_id = $2 RETURNING id`, [locationId, id]);
      if (!rows.length) throw new NotFoundException('Location not found');
      await this.audit.log(tx, { actorId: user.id, tenantId: id, action: 'location.removed', entity: 'location', entityId: locationId });
      return { ok: true };
    });
  }

  completeOnboarding(user: SessionUser) {
    const id = this.tenantId(user);
    return this.db.forTenant(id, async (tx) => {
      const { tenant, locations } = await this.load(tx, id);
      const missing: string[] = [];
      if (!tenant.category) missing.push('business category');
      if (!tenant.description) missing.push('business description');
      if (!tenant.targetAudience) missing.push('target audience');
      if (!tenant.objectives.length) missing.push('at least one marketing objective');
      if (!locations.length) missing.push('at least one business location');
      if (missing.length) throw new BadRequestException(`Please add: ${missing.join(', ')}`);
      await tx.query(
        `UPDATE tenants SET onboarding_completed = true, onboarding_step = 6, status = CASE WHEN status = 'SUSPENDED' THEN status ELSE 'ACTIVE' END, updated_at = now() WHERE id = $1`,
        [id],
      );
      await this.audit.log(tx, { actorId: user.id, tenantId: id, action: 'tenant.onboarding_completed', entity: 'tenant', entityId: id });
      const result = await this.load(tx, id);
      // The AI strategy is generated by the AI module (Phase 3). Until then it is reported as not generated.
      return { ...result, strategy: { status: 'not_available', reason: 'AI strategy generation is added in Phase 3' } };
    });
  }
}
