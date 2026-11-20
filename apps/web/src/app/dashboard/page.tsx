'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorNote, Logo, Spinner } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useAuth, useRequireUser } from '@/lib/auth';
import { CATEGORIES, LANGUAGES, OBJECTIVES, type Location, type Tenant } from '@/lib/types';

const upcoming = [
  ['Subscription and payments', 'Choose a plan and pay with UPI, card or net banking.'],
  ['AI content and calendar', 'Generate posts and approve them on a content calendar.'],
  ['Social accounts and publishing', 'Connect Facebook, Instagram, LinkedIn and YouTube.'],
  ['Leads and WhatsApp', 'Capture and follow up enquiries in one pipeline.'],
];

export default function DashboardPage() {
  const { user, loading } = useRequireUser(['CUSTOMER']);
  const { logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ tenant: Tenant; locations: Location[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!user.phoneVerified) { router.replace('/verify'); return; }
    if (!user.tenant?.onboardingCompleted) { router.replace('/onboarding'); return; }
    api<{ tenant: Tenant; locations: Location[] }>('/tenant').then(setData).catch((e) => setError(e.message));
  }, [user, router]);

  if (loading || !user) return <Spinner />;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-4 text-sm"><span className="text-muted">{user.name}</span><Button variant="outline" size="sm" onClick={logout}>Log out</Button></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <ErrorNote message={error} />
        {!data ? !error && <Spinner /> : (
          <>
            <div>
              <h1 className="text-3xl tracking-tight">{data.tenant.name}</h1>
              <p className="mt-1 text-sm text-muted">Your business profile is complete.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-sm font-medium text-muted">Account status</p>
                <p className="mt-2 font-display text-2xl font-semibold">{data.tenant.status === 'ACTIVE' ? 'Active' : data.tenant.status}</p>
              </div>
              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-sm font-medium text-muted">Locations</p>
                <p className="mt-2 font-display text-2xl font-semibold">{data.locations.length}</p>
              </div>
              <div className="rounded-xl border border-dashed border-gray-400 bg-white p-5">
                <p className="text-sm font-medium text-muted">Leads and campaign results</p>
                <p className="mt-2 font-display text-xl font-semibold text-muted">Not available yet</p>
                <p className="mt-1 text-sm text-muted">Appears once leads and ad accounts are connected.</p>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-4 rounded-xl border border-line bg-white p-6">
                <h2 className="text-lg">Business profile</h2>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  {[
                    ['Category', CATEGORIES.find(([v]) => v === data.tenant.category)?.[1]], ['Industry', data.tenant.industry],
                    ['Language', LANGUAGES.find(([v]) => v === data.tenant.language)?.[1]], ['Website', data.tenant.website],
                    ['Target audience', data.tenant.targetAudience], ['Target location', data.tenant.targetLocation],
                    ['Objectives', data.tenant.objectives.map((o) => OBJECTIVES.find(([v]) => v === o)?.[1]).join(', ')],
                  ].map(([k, v]) => (<div key={k as string}><dt className="text-muted">{k}</dt><dd className="font-medium">{v || 'Not provided'}</dd></div>))}
                </dl>
                <div className="flex items-center gap-2"><span className="text-sm text-muted">Brand colours</span>
                  {data.tenant.brandColors.map((c) => <span key={c} title={c} aria-label={c} className="size-6 rounded-full border border-line" style={{ background: c }} />)}
                </div>
              </section>
              <section className="space-y-3 rounded-xl border border-line bg-white p-6">
                <h2 className="text-lg">Coming next</h2>
                <ul className="divide-y divide-line">
                  {upcoming.map(([t, d]) => (<li key={t} className="py-3"><p className="text-sm font-medium">{t}</p><p className="text-sm text-muted">{d}</p></li>))}
                </ul>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
