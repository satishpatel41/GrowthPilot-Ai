'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorNote, Spinner } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, LANGUAGES, OBJECTIVES, statusClass, type Location, type Tenant } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Detail {
  customer: Tenant; locations: Location[];
  owner: { id: string; name: string; email: string; phone: string | null; phoneVerified: boolean } | null;
  assignedStaff: { id: string; name: string; email: string }[];
}
interface Member { id: string; name: string; email: string; status: string }

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [d, setD] = useState<Detail | null>(null);
  const [team, setTeam] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const detail = await api<Detail>(`/admin/customers/${id}`);
    setD(detail); setSelected(detail.assignedStaff.map((s) => s.id));
    if (isSuper) setTeam((await api<{ items: Member[] }>('/admin/team')).items.filter((m) => m.status === 'ACTIVE'));
  }, [id, isSuper]);
  useEffect(() => { if (user) load().catch((e) => setError(e.message)); }, [user, load]);

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true); setError(null); setNote(null);
    try { await fn(); await load(); setNote(done); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  if (!d) return error ? <ErrorNote message={error} /> : <Spinner />;
  const c = d.customer;
  const suspended = c.status === 'SUSPENDED';

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="text-sm font-medium text-brand-700 underline">All customers</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl tracking-tight">{c.name}</h1>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusClass[c.status])}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</span>
        </div>
        {isSuper && (
          <Button variant={suspended ? 'primary' : 'danger'} disabled={busy}
            onClick={() => { if (suspended || confirm(`Suspend ${c.name}? Their users will be signed out of access immediately.`)) void run(() => api(`/admin/customers/${id}/status`, { method: 'PATCH', body: { status: suspended ? 'ACTIVE' : 'SUSPENDED' } }), suspended ? 'Customer restored.' : 'Customer suspended.'); }}>
            {suspended ? 'Restore customer' : 'Suspend customer'}
          </Button>
        )}
      </div>
      <ErrorNote message={error} />
      {note && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{note}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-line bg-white p-6">
          <h2 className="text-lg">Business profile</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {[
              ['Category', CATEGORIES.find(([v]) => v === c.category)?.[1]], ['Industry', c.industry], ['Website', c.website],
              ['Language', LANGUAGES.find(([v]) => v === c.language)?.[1]], ['Target audience', c.targetAudience], ['Target location', c.targetLocation],
              ['Objectives', c.objectives.map((o) => OBJECTIVES.find(([v]) => v === o)?.[1]).join(', ')],
              ['Onboarding', c.onboardingCompleted ? 'Complete' : `Step ${c.onboardingStep - 1} of 5`],
            ].map(([k, v]) => (<div key={k as string}><dt className="text-muted">{k}</dt><dd className="font-medium">{v || 'Not provided'}</dd></div>))}
          </dl>
          <div><p className="text-sm text-muted">Description</p><p className="text-sm">{c.description || 'Not provided'}</p></div>
        </section>

        <div className="space-y-6">
          <section className="space-y-2 rounded-xl border border-line bg-white p-6">
            <h2 className="text-lg">Owner</h2>
            {d.owner ? (
              <p className="text-sm"><span className="font-medium">{d.owner.name}</span><br />{d.owner.email}<br />{d.owner.phone ?? 'No phone'} {d.owner.phone && <span className="text-muted">({d.owner.phoneVerified ? 'verified' : 'not verified'})</span>}</p>
            ) : <p className="text-sm text-muted">No owner.</p>}
          </section>
          <section className="space-y-2 rounded-xl border border-line bg-white p-6">
            <h2 className="text-lg">Locations</h2>
            {d.locations.length ? (
              <ul className="divide-y divide-line text-sm">{d.locations.map((l) => (<li key={l.id} className="py-2"><span className="font-medium">{l.name}</span><span className="block text-muted">{[l.address, l.city, l.state].filter(Boolean).join(', ')}</span></li>))}</ul>
            ) : <p className="text-sm text-muted">No locations yet.</p>}
          </section>
          <section className="space-y-3 rounded-xl border border-line bg-white p-6">
            <h2 className="text-lg">Assigned team</h2>
            {isSuper ? (
              team.length ? (
                <>
                  <div className="space-y-2">
                    {team.map((m) => (
                      <label key={m.id} className="flex items-center gap-3 text-sm">
                        <input type="checkbox" className="size-4 accent-brand-600" checked={selected.includes(m.id)} onChange={() => setSelected((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} />
                        <span><span className="font-medium">{m.name}</span> <span className="text-muted">{m.email}</span></span>
                      </label>
                    ))}
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => run(() => api(`/admin/customers/${id}/assignments`, { method: 'PUT', body: { userIds: selected } }), 'Assignments saved.')}>Save assignments</Button>
                </>
              ) : <p className="text-sm text-muted">No active team members yet. <Link href="/admin/team" className="font-medium text-brand-700 underline">Add one</Link>.</p>
            ) : (
              d.assignedStaff.length ? <p className="text-sm">{d.assignedStaff.map((s) => s.name).join(', ')}</p> : <p className="text-sm text-muted">Nobody assigned.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
