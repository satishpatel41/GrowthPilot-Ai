'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LayoutDashboard, ScrollText, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { Logo, Spinner } from '@/components/ui/field';
import { useAuth, useRequireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, admin: false },
  { href: '/admin/customers', label: 'Customers', icon: Users, admin: false },
  { href: '/admin/team', label: 'Team', icon: UsersRound, admin: true },
  { href: '/admin/audit', label: 'Audit logs', icon: ScrollText, admin: true },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireUser(['SUPER_ADMIN', 'AGENCY_STAFF']);
  const { logout } = useAuth();
  const path = usePathname();
  if (loading || !user) return <Spinner />;
  const isSuper = user.role === 'SUPER_ADMIN';

  return (
    <div className="flex min-h-screen flex-wrap bg-canvas">
      <aside className="flex w-full flex-col gap-6 bg-ink p-4 text-white lg:w-64">
        <div className="px-2"><Logo dark /></div>
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{isSuper ? 'Agency admin' : 'Agency team'}</p>
        <nav className="-mt-4 flex flex-wrap gap-1 lg:flex-col">
          {NAV.filter((n) => isSuper || !n.admin).map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className={cn('flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium', active ? 'bg-[#1d2939] text-white' : 'text-gray-300 hover:bg-[#1d2939]')}>
                <Icon size={18} aria-hidden="true" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 border-t border-[#1d2939] px-2 pt-4 text-sm">
          <div><p className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} aria-hidden="true" />{user.name}</p><p className="text-gray-400">{user.email}</p></div>
          <button type="button" onClick={logout} className="font-medium text-gray-300 underline">Log out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 basis-[560px] p-6 lg:p-8">{children}</main>
    </div>
  );
}
