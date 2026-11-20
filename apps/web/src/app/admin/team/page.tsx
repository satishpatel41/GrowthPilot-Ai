'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorNote, Field, Input, Spinner } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useRequireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Member { id: string; name: string; email: string; status: 'ACTIVE' | 'SUSPENDED'; customers: number }

export default function TeamPage() {
  const { user } = useRequireUser(['SUPER_ADMIN']);
  const [items, setItems] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<{ items: Member[] }>('/admin/team').then((r) => setItems(r.items)).catch((e) => setError(e.message)), []);
  useEffect(() => { if (user) void load(); }, [user, load]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const f = new FormData(form);
    setBusy(true); setError(null);
    try { await api('/admin/team', { body: { name: f.get('name'), email: f.get('email'), password: f.get('password') } }); form.reset(); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }
  async function toggle(m: Member) {
    setError(null);
    try { await api(`/admin/team/${m.id}/status`, { method: 'PATCH', body: { status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  if (!user) return <Spinner />;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl tracking-tight">Team</h1>
      <ErrorNote message={error} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="overflow-x-auto rounded-xl border border-line bg-white lg:col-span-2">
          {!items ? <Spinner /> : items.length === 0 ? <p className="p-10 text-center text-sm text-muted">No team members yet. Add the first one.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Customers</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{m.name}<span className="block text-xs font-normal text-muted">{m.email}</span></td>
                    <td className="px-4 py-3">{m.customers}</td>
                    <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', m.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>{m.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span></td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => toggle(m)} className="font-medium text-brand-700 underline">{m.status === 'ACTIVE' ? 'Suspend' : 'Restore'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <form onSubmit={create} className="space-y-4 rounded-xl border border-line bg-white p-6">
          <h2 className="text-lg">Add team member</h2>
          <Field label="Full name"><Input name="name" required minLength={2} /></Field>
          <Field label="Email"><Input name="email" type="email" required /></Field>
          <Field label="Temporary password" hint="At least 8 characters, with a letter and a number"><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Adding…' : 'Add member'}</Button>
        </form>
      </div>
    </div>
  );
}
