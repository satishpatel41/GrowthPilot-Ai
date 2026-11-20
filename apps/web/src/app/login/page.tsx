'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorNote, Field, Input, Logo } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { homeFor, type User } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const { user } = await api<{ user: User }>('/auth/login', { body: { email: f.get('email'), password: f.get('password') } });
      setUser(user);
      router.push(homeFor(user));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-line bg-white p-8">
        <Link href="/"><Logo /></Link>
        <div>
          <h1 className="text-2xl tracking-tight">Log in</h1>
          <p className="mt-1 text-sm text-muted">Welcome back. Enter your details to continue.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <ErrorNote message={error} />
          <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
          <Field label="Password"><Input name="password" type="password" required autoComplete="current-password" /></Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Log in'}</Button>
        </form>
        <p className="text-sm text-muted">New here? <Link href="/register" className="font-medium text-brand-700 underline">Create an account</Link></p>
      </div>
    </main>
  );
}
