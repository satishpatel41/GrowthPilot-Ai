'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorNote, Input, Select, Spinner } from '@/components/ui/field';
import { api } from '@/lib/api';
import { statusClass, type Tenant } from '@/lib/types';
import { cn } from '@/lib/utils';

type Row = Tenant & { owner: { name: string; email: string; phone: string | null; phoneVerified: boolean } };

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Row[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    const q = new URLSearchParams({ page: String(page) });
    if (debounced) q.set('search', debounced);
    if (status) q.set('status', status);
    setError(null);
    api<{ items: Row[]; total: number; pageSize: number }>(`/admin/customers?${q}`).then(setData).catch((e) => setError(e.message));
  }, [debounced, status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl tracking-tight">Customers</h1>
      <div className="flex flex-wrap gap-3">
        <Input type="search" aria-label="Search customers" placeholder="Search business, owner or email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44">
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="ONBOARDING">Onboarding</option><option value="SUSPENDED">Suspended</option>
        </Select>
      </div>
      <ErrorNote message={error} />
      {!data ? !error && <Spinner /> : data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-400 bg-white p-10 text-center text-sm text-muted">No customers match.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-muted">
              <tr><th className="px-4 py-3">Business</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th></tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3"><Link href={`/admin/customers/${c.id}`} className="font-medium text-brand-700 underline">{c.name}</Link></td>
                  <td className="px-4 py-3">{c.owner.name}<span className="block text-xs text-muted">{c.owner.email}</span></td>
                  <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusClass[c.status])}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</span></td>
                  <td className="px-4 py-3">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Page {page} of {pages} · {data.total} customers</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 rounded-lg border border-gray-300 bg-white px-3 disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-9 rounded-lg border border-gray-300 bg-white px-3 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
