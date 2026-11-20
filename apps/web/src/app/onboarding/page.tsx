'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorNote, Field, Input, Logo, Select, Spinner, Textarea } from '@/components/ui/field';
import { api } from '@/lib/api';
import { useAuth, useRequireUser } from '@/lib/auth';
import { CATEGORIES, LANGUAGES, OBJECTIVES, type Location, type Tenant } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS = ['Business profile', 'Brand and voice', 'Marketing goals', 'Locations', 'Review'];

export default function OnboardingPage() {
  const { user, loading } = useRequireUser(['CUSTOMER']);
  const { refresh, logout } = useAuth();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>(['#0F766E']);
  const [language, setLanguage] = useState('en');

  const load = useCallback(async () => {
    const r = await api<{ tenant: Tenant; locations: Location[] }>('/tenant');
    setTenant(r.tenant); setLocations(r.locations);
    setObjectives(r.tenant.objectives);
    if (r.tenant.brandColors.length) setColors(r.tenant.brandColors);
    setLanguage(r.tenant.language);
    setStep(Math.min(Math.max(r.tenant.onboardingStep - 2, 0), 4));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!user.phoneVerified) { router.replace('/verify'); return; }
    if (user.tenant?.onboardingCompleted) { router.replace('/dashboard'); return; }
    load().catch((e) => setError(e.message));
  }, [user, router, load]);

  if (loading || !user || !tenant) return <Spinner />;

  async function save(patch: Record<string, unknown>, next: number) {
    setBusy(true); setError(null);
    try {
      const r = await api<{ tenant: Tenant; locations: Location[] }>('/tenant/profile', { method: 'PUT', body: { ...patch, step: next + 2 } });
      setTenant(r.tenant); setLocations(r.locations);
      setStep(next);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const val = (f: FormData, k: string) => { const v = String(f.get(k) ?? '').trim(); return v || undefined; };

  function submitProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void save({ name: val(f, 'name'), category: val(f, 'category'), industry: val(f, 'industry'), website: val(f, 'website'), description: val(f, 'description') }, 1);
  }
  function submitBrand(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void save({ language, brandColors: colors }, 2);
  }
  function submitGoals(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!objectives.length) { setError('Choose at least one objective'); return; }
    const f = new FormData(e.currentTarget);
    void save({ objectives, targetAudience: val(f, 'targetAudience'), targetLocation: val(f, 'targetLocation') }, 3);
  }
  async function addLocation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setError(null);
    try {
      const { location } = await api<{ location: Location }>('/tenant/locations', { body: { name: val(f, 'name'), address: val(f, 'address'), city: val(f, 'city'), state: val(f, 'state') } });
      setLocations((l) => [...l, location]);
      form.reset();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }
  async function removeLocation(id: string) {
    setError(null);
    try { await api(`/tenant/locations/${id}`, { method: 'DELETE' }); setLocations((l) => l.filter((x) => x.id !== id)); }
    catch (e: any) { setError(e.message); }
  }
  async function finish() {
    setBusy(true); setError(null);
    try {
      await api('/tenant/onboarding/complete', { body: {} });
      await refresh();
      router.push('/dashboard');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const back = (to: number) => <Button type="button" variant="outline" onClick={() => { setError(null); setStep(to); }}>Back</Button>;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          <Logo />
          <button type="button" onClick={logout} className="text-sm font-medium text-muted">Save and finish later</button>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-wrap items-start gap-8 px-6 py-10">
        <aside className="w-full space-y-5 lg:w-72">
          <div>
            <h1 className="text-2xl tracking-tight">Set up your business</h1>
            <p className="mt-1 text-sm text-muted">Step {step + 1} of {STEPS.length}</p>
            <div className="mt-3 h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
              <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
          <ol className="space-y-1">
            {STEPS.map((s, i) => (
              <li key={s} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm', i === step && 'bg-brand-50')}>
                <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold',
                  i < step ? 'border-brand-600 bg-brand-600 text-white' : i === step ? 'border-2 border-brand-600 bg-white text-brand-600' : 'border-gray-300 bg-white text-muted')}>
                  {i < step ? <Check size={14} aria-hidden="true" /> : i + 1}
                </span>
                <span className={cn(i === step ? 'font-semibold text-brand-700' : 'font-medium text-gray-700')}>{s}</span>
              </li>
            ))}
          </ol>
        </aside>

        <section className="min-w-0 flex-1 basis-[560px] space-y-6 rounded-2xl border border-line bg-white p-8">
          <ErrorNote message={error} />

          {step === 0 && (
            <form onSubmit={submitProfile} className="space-y-5">
              <h2 className="text-2xl tracking-tight">Tell us about your business</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Business name"><Input name="name" required minLength={2} defaultValue={tenant.name} /></Field>
                <Field label="Business category">
                  <Select name="category" required defaultValue={tenant.category ?? ''}>
                    <option value="" disabled>Choose one</option>
                    {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Industry"><Input name="industry" defaultValue={tenant.industry ?? ''} placeholder="For example, clothing and textiles" /></Field>
                <Field label="Website (optional)" error={null}><Input name="website" type="url" defaultValue={tenant.website ?? ''} placeholder="https://" /></Field>
              </div>
              <Field label="Business description"><Textarea name="description" required rows={4} maxLength={1000} defaultValue={tenant.description ?? ''} /></Field>
              <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</Button></div>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={submitBrand} className="space-y-6">
              <h2 className="text-2xl tracking-tight">Brand and voice</h2>
              <div className="space-y-2">
                <p className="text-sm font-medium">Preferred content language</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preferred content language">
                  {LANGUAGES.map(([v, l]) => (
                    <button key={v} type="button" role="radio" aria-checked={language === v} onClick={() => setLanguage(v)}
                      className={cn('h-10 rounded-lg border px-5 text-sm font-medium', language === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 bg-white text-gray-700')}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Brand colours (up to 5)</p>
                <div className="flex flex-wrap items-center gap-3">
                  {colors.map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <input type="color" aria-label={`Brand colour ${i + 1}`} value={c} onChange={(e) => setColors((cs) => cs.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))} className="size-11 cursor-pointer rounded-lg border border-gray-300 bg-white p-1" />
                      {colors.length > 1 && <button type="button" aria-label={`Remove colour ${i + 1}`} onClick={() => setColors((cs) => cs.filter((_, j) => j !== i))} className="text-sm text-muted">Remove</button>}
                    </span>
                  ))}
                  {colors.length < 5 && <Button type="button" variant="outline" size="sm" onClick={() => setColors((cs) => [...cs, '#101828'])}>Add colour</Button>}
                </div>
              </div>
              <div className="flex justify-between">{back(0)}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</Button></div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submitGoals} className="space-y-6">
              <h2 className="text-2xl tracking-tight">Marketing goals</h2>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">What do you want marketing to do for you?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {OBJECTIVES.map(([v, l]) => (
                    <label key={v} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm', objectives.includes(v) ? 'border-brand-600 bg-brand-50' : 'border-gray-300')}>
                      <input type="checkbox" className="size-4 accent-brand-600" checked={objectives.includes(v)} onChange={() => setObjectives((o) => (o.includes(v) ? o.filter((x) => x !== v) : [...o, v]))} />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Target audience"><Input name="targetAudience" required defaultValue={tenant.targetAudience ?? ''} placeholder="For example, families and wedding shoppers" /></Field>
                <Field label="Target location"><Input name="targetLocation" defaultValue={tenant.targetLocation ?? ''} placeholder="For example, Surat and nearby towns" /></Field>
              </div>
              <div className="flex justify-between">{back(1)}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</Button></div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl tracking-tight">Business locations</h2>
              {locations.length > 0 && (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {locations.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span><span className="font-medium">{l.name}</span><span className="block text-muted">{[l.address, l.city, l.state].filter(Boolean).join(', ')}</span></span>
                      <button type="button" onClick={() => removeLocation(l.id)} className="font-medium text-red-700">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={addLocation} className="space-y-4 rounded-lg bg-canvas p-4">
                <p className="text-sm font-medium">Add a location</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Location name"><Input name="name" required placeholder="Main store" /></Field>
                  <Field label="Address (optional)"><Input name="address" /></Field>
                  <Field label="City"><Input name="city" required /></Field>
                  <Field label="State"><Input name="state" required defaultValue="Gujarat" /></Field>
                </div>
                <Button type="submit" variant="outline" size="sm" disabled={busy}>Add location</Button>
              </form>
              <div className="flex justify-between">{back(2)}<Button type="button" disabled={!locations.length} onClick={() => { setError(null); setStep(4); }}>Continue</Button></div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl tracking-tight">Review and finish</h2>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {[
                  ['Business', tenant.name], ['Category', CATEGORIES.find(([v]) => v === tenant.category)?.[1]], ['Industry', tenant.industry],
                  ['Language', LANGUAGES.find(([v]) => v === tenant.language)?.[1]], ['Target audience', tenant.targetAudience], ['Target location', tenant.targetLocation],
                  ['Objectives', tenant.objectives.map((o) => OBJECTIVES.find(([v]) => v === o)?.[1]).join(', ')], ['Locations', locations.map((l) => l.name).join(', ')],
                ].map(([k, v]) => (<div key={k as string}><dt className="text-muted">{k}</dt><dd className="font-medium">{v || 'Not provided'}</dd></div>))}
              </dl>
              <p className="rounded-lg bg-canvas p-4 text-sm text-muted">After you finish, your dashboard opens. The AI marketing strategy is added in a later release, so it is not generated yet.</p>
              <div className="flex justify-between">{back(3)}<Button type="button" onClick={finish} disabled={busy}>{busy ? 'Finishing…' : 'Finish setup'}</Button></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
