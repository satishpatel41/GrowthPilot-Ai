'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorNote, Field, Input, Logo, Spinner } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useAuth, useRequireUser } from '@/lib/auth';
import { homeFor, type User } from '@/lib/types';

export default function VerifyPage() {
  const { user, loading } = useRequireUser(['CUSTOMER']);
  const { setUser, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setDevCode(sessionStorage.getItem('gp_dev_otp')); } catch { /* storage may be unavailable */ }
  }, []);
  useEffect(() => { if (user?.phoneVerified) router.replace(homeFor(user)); }, [user, router]);

  if (loading || !user) return <Spinner />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code'));
    setBusy(true); setError(null);
    try {
      const { user: u } = await api<{ user: User }>('/auth/otp/verify', { body: { code } });
      try { sessionStorage.removeItem('gp_dev_otp'); } catch { /* ignore */ }
      setUser(u);
      router.push(homeFor(u));
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  async function resend() {
    setError(null); setInfo(null);
    try {
      const r = await api<{ devOtp?: string }>('/auth/otp/resend', { body: {} });
      if (r.devOtp) { setDevCode(r.devOtp); try { sessionStorage.setItem('gp_dev_otp', r.devOtp); } catch { /* ignore */ } }
      setInfo('A new code has been sent.');
    } catch (err: any) { setError(err.message); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-line bg-white p-8">
        <Logo />
        <div>
          <h1 className="text-2xl tracking-tight">Verify your mobile number</h1>
          <p className="mt-1 text-sm text-muted">Enter the 6 digit code sent to {user.phone}. It expires in 10 minutes.</p>
        </div>
        {devCode && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Development mode: no SMS provider is connected, so the code is shown here: <strong className="tracking-widest">{devCode}</strong>
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <ErrorNote message={error} />
          {info && <p role="status" className="text-sm text-brand-700">{info}</p>}
          <Field label="Verification code"><Input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" className="tracking-[0.4em]" /></Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Checking…' : 'Verify'}</Button>
        </form>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={resend} className="font-medium text-brand-700 underline">Send a new code</button>
          <button type="button" onClick={logout} className="text-muted underline">Log out</button>
        </div>
      </div>
    </main>
  );
}
