'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorNote, Field, Input, Logo } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const digits = String(f.get('phone')).replace(/[\s-]/g, '');
    const phone = digits.startsWith('+') ? digits : digits.length === 10 ? `+91${digits}` : `+${digits}`;
    setBusy(true); setError(null);
    try {
      const res = await api<{ user: User; devOtp?: string }>('/auth/register', {
        body: { name: f.get('name'), email: f.get('email'), phone, password: f.get('password') },
      });
      setUser(res.user);
      // devOtp is only returned when the server runs with OTP_DEV_ECHO in development.
      if (res.devOtp) sessionStorage.setItem('gp_dev_otp', res.devOtp);
      router.push('/verify');
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
          <h1 className="text-2xl tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Next, you will verify your mobile number and describe your business.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <ErrorNote message={error} />
          <Field label="Full name"><Input name="name" required minLength={2} autoComplete="name" /></Field>
          <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
          <Field label="Mobile number" hint="10 digit Indian number, or include a country code"><Input name="phone" type="tel" required autoComplete="tel" placeholder="98765 43210" /></Field>
          <Field label="Password" hint="At least 8 characters, with a letter and a number"><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
        </form>
        <p className="text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-brand-700 underline">Log in</Link></p>
      </div>
    </main>
  );
}
