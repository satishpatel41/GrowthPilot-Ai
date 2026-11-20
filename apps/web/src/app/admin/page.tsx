'use client';
import { useEffect, useState } from 'react';
import { ErrorNote, Spinner } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Stats {
  customers: { total: number; active: number; onboarding: number; suspended: number; newThisMonth: number };
  activeStaff: number | null;
  signupsByMonth: { month: string; count: number }[];
  unavailable: string[];
}

function SignupsChart({ data }: { data: Stats['signupsByMonth'] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No sign-ups in the last six months.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 560, h = 200, pad = 28, bw = Math.min(56, (w - pad * 2) / data.length - 12);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Sign-ups per month: ${data.map((d) => `${d.month} ${d.count}`).join(', ')}`} className="w-full">
      <line x1={pad} x2={w - pad} y1={h - 28} y2={h - 28} stroke="#e4e7ec" />
      {data.map((d, i) => {
        const x = pad + (i + 0.5) * ((w - pad * 2) / data.length);
        const bh = (d.count / max) * (h - 70);
        return (
          <g key={d.month}>
            <rect x={x - bw / 2} y={h - 28 - bh} width={bw} height={bh} rx="4" fill="#0f766e" />
            <text x={x} y={h - 34 - bh} textAnchor="middle" fontSize="12" fill="#101828">{d.count}</text>
            <text x={x} y={h - 10} textAnchor="middle" fontSize="11" fill="#475467">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Stats>('/admin/stats').then(setStats).catch((e) => setError(e.message)); }, []);

  const cards = stats && [
    ['Total customers', stats.customers.total], ['Active', stats.customers.active], ['Onboarding', stats.customers.onboarding],
    ['Suspended', stats.customers.suspended], ['New this month', stats.customers.newThisMonth],
    ...(stats.activeStaff !== null ? [['Active team members', stats.activeStaff] as [string, number]] : []),
  ] as [string, number][];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight">{user?.role === 'SUPER_ADMIN' ? 'Agency dashboard' : 'My customers'}</h1>
        <p className="mt-1 text-sm text-muted">Live figures from your database.</p>
      </div>
      <ErrorNote message={error} />
      {!stats ? !error && <Spinner /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards!.map(([label, v]) => (
              <div key={label} className="rounded-xl border border-line bg-white p-5">
                <p className="text-sm font-medium text-muted">{label}</p>
                <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{v}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-line bg-white p-6 lg:col-span-2">
              <h2 className="text-lg">New customers per month</h2>
              <SignupsChart data={stats.signupsByMonth} />
            </section>
            <section className="rounded-xl border border-dashed border-gray-400 bg-white p-6">
              <h2 className="text-lg">Not available yet</h2>
              <p className="mt-2 text-sm text-muted">These figures need subscriptions and AI usage, which arrive in the next phases, so they are not shown instead of being estimated:</p>
              <ul className="mt-3 list-inside list-disc text-sm text-muted">
                <li>Monthly recurring revenue</li><li>Active subscriptions</li><li>Churn</li><li>AI usage</li>
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
