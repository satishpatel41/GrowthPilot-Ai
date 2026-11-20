import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { Role, SessionUser } from './auth.types';
import { SESSION_COOKIE } from './config';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('public', true);

function readToken(req: any): string | null {
  const header = req.headers?.authorization as string | undefined;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookie = req.headers?.cookie as string | undefined;
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private db: DbService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const token = readToken(req);
    if (!token) throw new UnauthorizedException('Sign in required');

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    // Re-check the account on every request so suspension takes effect immediately.
    const row = await this.db.system((tx) =>
      tx.one<{ id: string; email: string; name: string; role: Role; status: string; tenant_id: string | null; tenant_status: string | null }>(
        `SELECT u.id, u.email, u.name, u.role, u.status, m.tenant_id, t.status AS tenant_status
           FROM users u
           LEFT JOIN tenant_members m ON m.user_id = u.id
           LEFT JOIN tenants t ON t.id = m.tenant_id
          WHERE u.id = $1
          LIMIT 1`,
        [payload.sub],
      ),
    );
    if (!row || row.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
    if (row.role === 'CUSTOMER' && row.tenant_status === 'SUSPENDED') {
      throw new ForbiddenException('This business account is suspended. Contact your agency.');
    }

    const user: SessionUser = { id: row.id, email: row.email, name: row.name, role: row.role, tenantId: row.tenant_id };
    req.user = user;

    const roles = this.reflector.getAllAndOverride<Role[]>('roles', targets);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('You do not have access to this resource');
    return true;
  }
}
