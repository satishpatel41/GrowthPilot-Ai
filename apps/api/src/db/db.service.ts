import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

export type DbContext = { tenantId: string } | { bypass: true };

export interface Tx {
  query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T[]>;
  one<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T | null>;
}

function wrap(client: PoolClient): Tx {
  return {
    async query(sql, params) {
      return (await client.query(sql, params)).rows;
    },
    async one(sql, params) {
      return (await client.query(sql, params)).rows[0] ?? null;
    },
  };
}

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 10),
  });

  /**
   * Runs fn in a transaction with the row-level security context set.
   * Tenant contexts can only see their own tenant's rows; bypass is for
   * trusted server code (authentication, admin) and is never derived from input.
   */
  async run<T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tenantId = 'tenantId' in ctx ? ctx.tenantId : '';
      const bypass = 'bypass' in ctx ? 'on' : 'off';
      await client.query(
        `SELECT set_config('app.tenant_id', $1, true), set_config('app.bypass_rls', $2, true)`,
        [tenantId, bypass],
      );
      const result = await fn(wrap(client));
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  system<T>(fn: (tx: Tx) => Promise<T>) {
    return this.run({ bypass: true }, fn);
  }

  forTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>) {
    return this.run({ tenantId }, fn);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
