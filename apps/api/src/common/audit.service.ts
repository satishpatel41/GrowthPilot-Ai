import { Injectable } from '@nestjs/common';
import { Tx } from '../db/db.service';

@Injectable()
export class AuditService {
  async log(
    tx: Tx,
    entry: { actorId?: string | null; tenantId?: string | null; action: string; entity?: string; entityId?: string; meta?: unknown },
  ) {
    await tx.query(
      `INSERT INTO audit_logs(actor_id, tenant_id, action, entity, entity_id, meta) VALUES ($1,$2,$3,$4,$5,$6)`,
      [entry.actorId ?? null, entry.tenantId ?? null, entry.action, entry.entity ?? null, entry.entityId ?? null, entry.meta ? JSON.stringify(entry.meta) : null],
    );
  }
}
