import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHmac, randomInt } from 'crypto';
import { AuditService } from '../common/audit.service';
import { config } from '../common/config';
import { DbService, Tx } from '../db/db.service';
import { OtpSender } from './otp-sender';

interface UserRow {
  id: string; email: string; name: string; phone: string | null; role: string; status: string;
  password_hash: string | null; phone_verified: boolean; email_verified: boolean;
}

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(private db: DbService, private jwt: JwtService, private audit: AuditService, private otp: OtpSender) {}

  private hashOtp(userId: string, code: string) {
    return createHmac('sha256', config.jwtSecret).update(`${userId}:${code}`).digest('hex');
  }

  private async issueOtp(tx: Tx, userId: string, phone: string) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await tx.query(`UPDATE otp_codes SET consumed_at = now() WHERE user_id = $1 AND purpose = 'PHONE_VERIFY' AND consumed_at IS NULL`, [userId]);
    await tx.query(
      `INSERT INTO otp_codes(user_id, purpose, code_hash, expires_at) VALUES ($1,'PHONE_VERIFY',$2,$3)`,
      [userId, this.hashOtp(userId, code), new Date(Date.now() + OTP_TTL_MS)],
    );
    await this.otp.sendSms(phone, code);
    return config.otpDevEcho ? code : undefined;
  }

  private async sessionToken(userId: string) {
    return this.jwt.signAsync({ sub: userId });
  }

  private async profile(tx: Tx, userId: string) {
    const u = await tx.one<UserRow & { tenant_id: string | null; onboarding_completed: boolean | null; onboarding_step: number | null; tenant_name: string | null }>(
      `SELECT u.*, m.tenant_id, t.onboarding_completed, t.onboarding_step, t.name AS tenant_name
         FROM users u LEFT JOIN tenant_members m ON m.user_id = u.id LEFT JOIN tenants t ON t.id = m.tenant_id
        WHERE u.id = $1 LIMIT 1`,
      [userId],
    );
    if (!u) throw new UnauthorizedException();
    return {
      id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role,
      phoneVerified: u.phone_verified, emailVerified: u.email_verified,
      tenant: u.tenant_id ? { id: u.tenant_id, name: u.tenant_name, onboardingCompleted: u.onboarding_completed, onboardingStep: u.onboarding_step } : null,
    };
  }

  private async createCustomer(tx: Tx, input: { name: string; email: string; phone?: string | null; passwordHash?: string | null; googleSub?: string | null; emailVerified?: boolean }) {
    const user = await tx.one<{ id: string }>(
      `INSERT INTO users(email, phone, name, password_hash, google_sub, email_verified, role) VALUES ($1,$2,$3,$4,$5,$6,'CUSTOMER') RETURNING id`,
      [input.email.toLowerCase(), input.phone ?? null, input.name, input.passwordHash ?? null, input.googleSub ?? null, input.emailVerified ?? false],
    );
    const tenant = await tx.one<{ id: string }>(`INSERT INTO tenants(name) VALUES ($1) RETURNING id`, [`${input.name}'s business`]);
    await tx.query(`INSERT INTO tenant_members(tenant_id, user_id, role) VALUES ($1,$2,'OWNER')`, [tenant!.id, user!.id]);
    await this.audit.log(tx, { actorId: user!.id, tenantId: tenant!.id, action: 'customer.registered', entity: 'user', entityId: user!.id });
    return { userId: user!.id, tenantId: tenant!.id };
  }

  async register(dto: { name: string; email: string; phone: string; password: string }) {
    const passwordHash = await bcrypt.hash(dto.password, config.bcryptRounds);
    try {
      return await this.db.system(async (tx) => {
        const { userId } = await this.createCustomer(tx, { ...dto, passwordHash });
        const devOtp = await this.issueOtp(tx, userId, dto.phone);
        return { userId, user: await this.profile(tx, userId), devOtp };
      }).then(async (r) => ({ token: await this.sessionToken(r.userId), user: r.user, devOtp: r.devOtp }));
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new ConflictException('An account with this email or mobile number already exists');
      }
      throw e;
    }
  }

  async login(email: string, password: string) {
    const user = await this.db.system((tx) => tx.one<UserRow>(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]));
    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !user.password_hash || !ok) throw new UnauthorizedException('Incorrect email or password');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('This account is suspended');
    const profile = await this.db.system(async (tx) => {
      await this.audit.log(tx, { actorId: user.id, action: 'auth.login' });
      return this.profile(tx, user.id);
    });
    return { token: await this.sessionToken(user.id), user: profile };
  }

  async google(idToken: string) {
    if (!config.googleClientId) throw new NotImplementedException('Google sign-in is not configured on this server');
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) throw new UnauthorizedException('Google sign-in failed');
    const info = (await res.json()) as { aud: string; email: string; email_verified: string | boolean; name?: string; sub: string };
    if (info.aud !== config.googleClientId || !(info.email_verified === true || info.email_verified === 'true')) {
      throw new UnauthorizedException('Google sign-in failed');
    }
    const result = await this.db.system(async (tx) => {
      let u = await tx.one<UserRow>(`SELECT * FROM users WHERE google_sub = $1 OR email = $2 LIMIT 1`, [info.sub, info.email.toLowerCase()]);
      if (u && u.status !== 'ACTIVE') throw new ForbiddenException('This account is suspended');
      if (!u) {
        const created = await this.createCustomer(tx, { name: info.name ?? info.email.split('@')[0], email: info.email, googleSub: info.sub, emailVerified: true });
        return { userId: created.userId, user: await this.profile(tx, created.userId) };
      }
      await tx.query(`UPDATE users SET google_sub = COALESCE(google_sub, $2), email_verified = true WHERE id = $1`, [u.id, info.sub]);
      return { userId: u.id, user: await this.profile(tx, u.id) };
    });
    return { token: await this.sessionToken(result.userId), user: result.user };
  }

  me(userId: string) {
    return this.db.system((tx) => this.profile(tx, userId));
  }

  async verifyOtp(userId: string, code: string) {
    // Failures are returned, not thrown, inside the transaction: throwing would roll back
    // the attempt counter and allow unlimited guessing.
    const outcome = await this.db.system(async (tx) => {
      const row = await tx.one<{ id: string; code_hash: string; attempts: number; expires_at: Date }>(
        `SELECT id, code_hash, attempts, expires_at FROM otp_codes
          WHERE user_id = $1 AND purpose = 'PHONE_VERIFY' AND consumed_at IS NULL
          ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [userId],
      );
      if (!row || row.expires_at.getTime() < Date.now()) return { error: 'This code has expired. Request a new one.' };
      if (row.attempts >= OTP_MAX_ATTEMPTS) return { error: 'Too many attempts. Request a new code.' };
      if (row.code_hash !== this.hashOtp(userId, code)) {
        await tx.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
        return { error: 'That code is not correct' };
      }
      await tx.query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [row.id]);
      await tx.query(`UPDATE users SET phone_verified = true WHERE id = $1`, [userId]);
      await this.audit.log(tx, { actorId: userId, action: 'auth.phone_verified' });
      return { user: await this.profile(tx, userId) };
    });
    if ('error' in outcome) throw new BadRequestException(outcome.error);
    return outcome.user;
  }

  async resendOtp(userId: string) {
    return this.db.system(async (tx) => {
      const u = await tx.one<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      if (!u?.phone) throw new BadRequestException('No mobile number on this account');
      if (u.phone_verified) throw new BadRequestException('Mobile number is already verified');
      return { devOtp: await this.issueOtp(tx, userId, u.phone) };
    });
  }
}
