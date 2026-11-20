import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.BCRYPT_ROUNDS = '4';
process.env.OTP_DEV_ECHO = 'true';
process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://growthpilot:growthpilot@localhost:5432/growthpilot_test';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { migrate } from '../src/db/migrate';
import { DbService } from '../src/db/db.service';

describe('GrowthPilot API', () => {
  let app: INestApplication;
  let http: any;
  let pool: Pool;
  let db: DbService;

  const register = (n: string) =>
    request(http).post('/api/auth/register').send({ name: `Owner ${n}`, email: `owner${n}@example.com`, phone: `+9198000000${n.padStart(2, '0')}`, password: 'Passw0rdOK' });

  const agent = (cookie: string[]) => ({
    get: (u: string) => request(http).get(u).set('Cookie', cookie),
    post: (u: string, b?: any) => request(http).post(u).set('Cookie', cookie).send(b),
    put: (u: string, b?: any) => request(http).put(u).set('Cookie', cookie).send(b),
    patch: (u: string, b?: any) => request(http).patch(u).set('Cookie', cookie).send(b),
    del: (u: string) => request(http).delete(u).set('Cookie', cookie),
  });

  async function loginAs(email: string, password: string) {
    const res = await request(http).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return agent(res.headers['set-cookie'] as unknown as string[]);
  }

  beforeAll(async () => {
    const admin = new Pool({ connectionString: 'postgresql://growthpilot:growthpilot@localhost:5432/growthpilot' });
    await admin.query('DROP DATABASE IF EXISTS growthpilot_test WITH (FORCE)').catch(() => undefined);
    await admin.query('CREATE DATABASE growthpilot_test');
    await admin.end();
    await migrate(process.env.DATABASE_URL);

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const hash = bcrypt.hashSync('AdminPassw0rd!', 4);
    await pool.query(`INSERT INTO users(email, name, password_hash, role) VALUES ('admin@example.com','Admin',$1,'SUPER_ADMIN')`, [hash]);

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    http = app.getHttpServer();
    db = app.get(DbService);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe('health and validation', () => {
    it('reports healthy', async () => {
      const r = await request(http).get('/api/health');
      expect(r.status).toBe(200);
      expect(r.body.status).toBe('ok');
    });

    it('rejects a weak password and a bad phone', async () => {
      const r = await request(http).post('/api/auth/register').send({ name: 'Bad', email: 'bad@example.com', phone: '12', password: 'short' });
      expect(r.status).toBe(400);
    });

    it('rejects unknown fields', async () => {
      const r = await request(http).post('/api/auth/login').send({ email: 'a@b.com', password: 'x', role: 'SUPER_ADMIN' });
      expect(r.status).toBe(400);
    });

    it('requires a session for protected routes', async () => {
      expect((await request(http).get('/api/tenant')).status).toBe(401);
      expect((await request(http).get('/api/admin/stats')).status).toBe(401);
    });
  });

  describe('registration, OTP and login', () => {
    let cookie: string[];
    let otp: string;

    it('registers a customer, creates a tenant and sets an httpOnly session cookie', async () => {
      const r = await register('1');
      expect(r.status).toBe(201);
      expect(r.body.user.role).toBe('CUSTOMER');
      expect(r.body.user.tenant.onboardingCompleted).toBe(false);
      expect(r.body.user.passwordHash).toBeUndefined();
      cookie = r.headers['set-cookie'] as unknown as string[];
      expect(cookie[0]).toMatch(/HttpOnly/i);
      otp = r.body.devOtp;
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('rejects a duplicate email', async () => {
      expect((await register('1')).status).toBe(409);
    });

    it('rejects a wrong OTP and counts attempts, then accepts the right one', async () => {
      const a = agent(cookie);
      const bad = await a.post('/api/auth/otp/verify', { code: otp === '000000' ? '111111' : '000000' });
      expect(bad.status).toBe(400);
      const good = await a.post('/api/auth/otp/verify', { code: otp });
      expect(good.status).toBe(200);
      expect(good.body.user.phoneVerified).toBe(true);
      expect((await a.post('/api/auth/otp/verify', { code: otp })).status).toBe(400);
    });

    it('locks an OTP after too many wrong attempts', async () => {
      const r = await register('2');
      const a = agent(r.headers['set-cookie'] as unknown as string[]);
      const wrong = r.body.devOtp === '123456' ? '654321' : '123456';
      for (let i = 0; i < 5; i++) await a.post('/api/auth/otp/verify', { code: wrong });
      const locked = await a.post('/api/auth/otp/verify', { code: r.body.devOtp });
      expect(locked.status).toBe(400);
      expect(locked.body.message).toMatch(/too many/i);
      const resend = await a.post('/api/auth/otp/resend');
      expect(resend.status).toBe(200);
      expect((await a.post('/api/auth/otp/verify', { code: resend.body.devOtp })).status).toBe(200);
    });

    it('logs in with the right password only', async () => {
      expect((await request(http).post('/api/auth/login').send({ email: 'owner1@example.com', password: 'WrongPass1' })).status).toBe(401);
      expect((await request(http).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Passw0rdOK' })).status).toBe(401);
      const ok = await request(http).post('/api/auth/login').send({ email: 'OWNER1@example.com', password: 'Passw0rdOK' });
      expect(ok.status).toBe(200);
    });

    it('returns the current user and clears the session on logout', async () => {
      const a = agent(cookie);
      expect((await a.get('/api/auth/me')).body.user.email).toBe('owner1@example.com');
      const out = await request(http).post('/api/auth/logout');
      expect(out.headers['set-cookie'][0]).toMatch(/gp_session=;/);
    });

    it('google sign-in reports not configured without a client id', async () => {
      const r = await request(http).post('/api/auth/google').send({ idToken: 'x'.repeat(30) });
      expect(r.status).toBe(501);
    });
  });

  describe('onboarding', () => {
    let a: ReturnType<typeof agent>;

    beforeAll(async () => { a = await loginAs('owner1@example.com', 'Passw0rdOK'); });

    it('cannot complete onboarding with missing information', async () => {
      const r = await a.post('/api/tenant/onboarding/complete');
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/category/);
    });

    it('validates profile fields', async () => {
      expect((await a.put('/api/tenant/profile', { category: 'spaceships' })).status).toBe(400);
      expect((await a.put('/api/tenant/profile', { brandColors: ['red'] })).status).toBe(400);
      expect((await a.put('/api/tenant/profile', { website: 'not a url' })).status).toBe(400);
      expect((await a.put('/api/tenant/profile', {})).status).toBe(400);
    });

    it('saves profile, brand and goals, locations, then completes', async () => {
      const p = await a.put('/api/tenant/profile', {
        name: 'Shree Textile House', category: 'retail', industry: 'Textiles', website: 'https://shree.example.com',
        description: 'Family-run fabric store', targetAudience: 'Families', targetLocation: 'Surat', language: 'gu',
        objectives: ['more_leads', 'more_store_visits'], brandColors: ['#0F766E', '#101828'], step: 4,
      });
      expect(p.status).toBe(200);
      expect(p.body.tenant.name).toBe('Shree Textile House');
      expect(p.body.tenant.onboardingStep).toBe(4);

      const l = await a.post('/api/tenant/locations', { name: 'Main store', city: 'Surat', state: 'Gujarat' });
      expect(l.status).toBe(201);
      expect(l.body.location.country).toBe('India');

      const done = await a.post('/api/tenant/onboarding/complete');
      expect(done.status).toBe(200);
      expect(done.body.tenant.onboardingCompleted).toBe(true);
      expect(done.body.tenant.status).toBe('ACTIVE');
      expect(done.body.strategy.status).toBe('not_available');
    });

    it('does not let a step move backwards', async () => {
      const p = await a.put('/api/tenant/profile', { industry: 'Fabric', step: 2 });
      expect(p.body.tenant.onboardingStep).toBe(6);
    });
  });

  describe('tenant isolation', () => {
    let a: ReturnType<typeof agent>;
    let b: ReturnType<typeof agent>;
    let locA: string;

    beforeAll(async () => {
      a = await loginAs('owner1@example.com', 'Passw0rdOK');
      const rb = await register('3');
      b = agent(rb.headers['set-cookie'] as unknown as string[]);
      await b.put('/api/tenant/profile', { name: 'Other Business' });
      await b.post('/api/tenant/locations', { name: 'Other shop', city: 'Rajkot', state: 'Gujarat' });
      locA = (await a.get('/api/tenant')).body.locations[0].id;
    });

    it('each customer sees only their own business', async () => {
      const ra = await a.get('/api/tenant');
      const rb = await b.get('/api/tenant');
      expect(ra.body.tenant.name).toBe('Shree Textile House');
      expect(rb.body.tenant.name).toBe('Other Business');
      expect(rb.body.locations.map((l: any) => l.name)).toEqual(['Other shop']);
    });

    it("cannot delete another business's location", async () => {
      expect((await b.del(`/api/tenant/locations/${locA}`)).status).toBe(404);
      expect((await a.get('/api/tenant')).body.locations).toHaveLength(1);
    });

    it('row-level security hides other tenants even for an unfiltered query', async () => {
      const tenantA = (await a.get('/api/tenant')).body.tenant.id;
      const rows = await db.forTenant(tenantA, (tx) => tx.query('SELECT name FROM locations'));
      expect(rows.map((r: any) => r.name)).toEqual(['Main store']);
      const tenants = await db.forTenant(tenantA, (tx) => tx.query('SELECT id FROM tenants'));
      expect(tenants).toHaveLength(1);
    });

    it('row-level security blocks writing into another tenant', async () => {
      const tenantA = (await a.get('/api/tenant')).body.tenant.id;
      const tenantB = (await b.get('/api/tenant')).body.tenant.id;
      await expect(
        db.forTenant(tenantA, (tx) => tx.query(`INSERT INTO locations(tenant_id, name, city, state) VALUES ($1,'x','y','z')`, [tenantB])),
      ).rejects.toThrow(/row-level security/);
    });

    it('a context with no tenant sees nothing', async () => {
      const rows = await db.forTenant('00000000-0000-0000-0000-000000000000', (tx) => tx.query('SELECT * FROM tenants'));
      expect(rows).toHaveLength(0);
    });
  });

  describe('role-based access', () => {
    it('customers cannot reach admin endpoints', async () => {
      const a = await loginAs('owner1@example.com', 'Passw0rdOK');
      expect((await a.get('/api/admin/stats')).status).toBe(403);
      expect((await a.get('/api/admin/customers')).status).toBe(403);
    });

    it('admins cannot use the customer-only tenant endpoints', async () => {
      const adm = await loginAs('admin@example.com', 'AdminPassw0rd!');
      expect((await adm.get('/api/tenant')).status).toBe(403);
    });

    it('super admin sees stats and all customers with search and filters', async () => {
      const adm = await loginAs('admin@example.com', 'AdminPassw0rd!');
      const s = await adm.get('/api/admin/stats');
      expect(s.status).toBe(200);
      expect(s.body.customers.total).toBe(3);
      expect(s.body.customers.active).toBe(1);
      expect(s.body.unavailable).toContain('monthlyRecurringRevenue');
      const all = await adm.get('/api/admin/customers');
      expect(all.body.total).toBe(3);
      expect((await adm.get('/api/admin/customers?search=shree')).body.total).toBe(1);
      expect((await adm.get('/api/admin/customers?status=ACTIVE')).body.items[0].name).toBe('Shree Textile House');
      expect((await adm.get('/api/admin/customers?status=BOGUS')).status).toBe(400);
    });

    it('agency staff only see customers assigned to them', async () => {
      const adm = await loginAs('admin@example.com', 'AdminPassw0rd!');
      const created = await adm.post('/api/admin/team', { name: 'Priya', email: 'priya@example.com', password: 'StaffPassw0rd' });
      expect(created.status).toBe(201);
      expect((await adm.post('/api/admin/team', { name: 'Priya', email: 'priya@example.com', password: 'StaffPassw0rd' })).status).toBe(409);

      const staff = await loginAs('priya@example.com', 'StaffPassw0rd');
      expect((await staff.get('/api/admin/customers')).body.total).toBe(0);

      const shree = (await adm.get('/api/admin/customers?search=shree')).body.items[0];
      const assign = await adm.put(`/api/admin/customers/${shree.id}/assignments`, { userIds: [created.body.member.id] });
      expect(assign.status).toBe(200);

      const mine = await staff.get('/api/admin/customers');
      expect(mine.body.total).toBe(1);
      expect(mine.body.items[0].id).toBe(shree.id);
      expect((await staff.get(`/api/admin/customers/${shree.id}`)).status).toBe(200);
      const other = (await adm.get('/api/admin/customers?search=Other')).body.items[0];
      expect((await staff.get(`/api/admin/customers/${other.id}`)).status).toBe(404);
      expect((await staff.get('/api/admin/stats')).body.customers.total).toBe(1);
      expect((await staff.patch(`/api/admin/customers/${shree.id}/status`, { status: 'SUSPENDED' })).status).toBe(403);
      expect((await staff.get('/api/admin/team')).status).toBe(403);
    });

    it('only agency staff can be assigned to a customer', async () => {
      const adm = await loginAs('admin@example.com', 'AdminPassw0rd!');
      const c = (await adm.get('/api/admin/customers')).body.items[0];
      const ownerId = (await adm.get(`/api/admin/customers/${c.id}`)).body.owner.id;
      expect((await adm.put(`/api/admin/customers/${c.id}/assignments`, { userIds: [ownerId] })).status).toBe(403);
    });
  });

  describe('suspension', () => {
    it('a suspended business is locked out immediately and can be restored', async () => {
      const adm = await loginAs('admin@example.com', 'AdminPassw0rd!');
      const cust = await loginAs('owner1@example.com', 'Passw0rdOK');
      const id = (await adm.get('/api/admin/customers?search=shree')).body.items[0].id;

      expect((await adm.patch(`/api/admin/customers/${id}/status`, { status: 'SUSPENDED' })).body.customer.status).toBe('SUSPENDED');
      expect((await cust.get('/api/tenant')).status).toBe(403);

      const restored = await adm.patch(`/api/admin/customers/${id}/status`, { status: 'ACTIVE' });
      expect(restored.body.customer.status).toBe('ACTIVE');
      expect((await cust.get('/api/tenant')).status).toBe(200);
    });

    it('a suspended team member cannot sign in', async () => {
      const adm = await loginAs('admin@example.com', 'AdminPassw0rd!');
      const staff = await loginAs('priya@example.com', 'StaffPassw0rd');
      const id = (await adm.get('/api/admin/team')).body.items[0].id;
      await adm.patch(`/api/admin/team/${id}/status`, { status: 'SUSPENDED' });
      expect((await staff.get('/api/admin/customers')).status).toBe(401);
      expect((await request(http).post('/api/auth/login').send({ email: 'priya@example.com', password: 'StaffPassw0rd' })).status).toBe(403);
    });
  });

  describe('audit log', () => {
    it('records important actions for the super admin', async () => {
      const adm = await loginAs('admin@example.com', 'AdminPassw0rd!');
      const r = await adm.get('/api/admin/audit-logs?limit=100');
      expect(r.status).toBe(200);
      const actions = r.body.items.map((i: any) => i.action);
      expect(actions).toEqual(expect.arrayContaining(['customer.registered', 'tenant.onboarding_completed', 'customer.suspended', 'team.member_created']));
    });
  });

  describe('rate limiting', () => {
    it('throttles repeated login attempts', async () => {
      process.env.AUTH_RATE_LIMIT = '3';
      const codes: number[] = [];
      for (let i = 0; i < 5; i++) {
        codes.push((await request(http).post('/api/auth/login').send({ email: 'x@example.com', password: 'WrongPass1' })).status);
      }
      process.env.AUTH_RATE_LIMIT = '1000';
      expect(codes.every((c) => c === 401 || c === 429)).toBe(true);
      expect(codes).toContain(429);
    });
  });
});
