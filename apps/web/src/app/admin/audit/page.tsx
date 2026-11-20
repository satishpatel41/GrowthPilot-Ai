'use client';
import { useEffect, useState } from 'react';
import { ErrorNote, Spinner } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useRequireUser } from '@/lib/auth';

interface Entry { id: string; action: string; actor: { name: string; email: string } | null; entity: string | null; createdAt: string }

export default function AuditPage() {
  const { user } = useRequireUser(['SUPER_ADMIN']);
  const [items, setItems] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (user) api<{ items: Entry[] }>('/admin/audit-logs?limit=100').then((r) => setItems(r.items)).catch((e) => setError(e.message)); }, [user]);

  if (!user) return <Spinner />;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl tracking-tight">Audit logs</h1>
      <ErrorNote message={error} />
      {!items ? !error && <Spinner /> : items.length === 0 ? <p className="rounded-xl border border-dashed border-gray-400 bg-white p-10 text-center text-sm text-muted">Nothing recorded yet.</p> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-muted"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">By</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="whitespace-nowrap px-4 py-3">{new Date(i.createdAt).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 font-mono text-xs">{i.action}</td>
                  <td className="px-4 py-3">{i.actor ? `${i.actor.name} (${i.actor.email})` : 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
