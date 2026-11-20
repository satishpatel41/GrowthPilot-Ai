import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Logo } from '@/components/ui/field';

const features = [
  ['AI content in three languages', 'Posts, ad copy and WhatsApp drafts in Gujarati, Hindi and English, in your brand voice.'],
  ['Approval before anything goes live', 'Every post and ad draft waits for your approval, and every decision is recorded.'],
  ['Publish to your social pages', 'Connect Facebook, Instagram, LinkedIn and YouTube with secure sign-in.'],
  ['Every enquiry in one pipeline', 'Website forms, landing pages, Facebook lead forms and WhatsApp in one list.'],
  ['WhatsApp and email, with consent', 'Approved templates and opt-in tracking. No unsolicited bulk messages.'],
  ['Reports you can trust', 'Numbers come from connected accounts. Anything missing is marked unavailable.'],
];

export default function Home() {
  return (
    <div className="bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-6">
          <Link href="/"><Logo /></Link>
          <div className="flex gap-3">
            <Link href="/login" className={buttonClass({ variant: 'outline', size: 'sm' })}>Log in</Link>
            <Link href="/register" className={buttonClass({ size: 'sm' })}>Get started</Link>
          </div>
        </div>
      </header>
      <section className="bg-canvas">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-medium text-brand-700">Built for local businesses across India</span>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.06] tracking-tight">Marketing that runs itself, with your approval on every post.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">GrowthPilot AI plans your content, publishes to your social pages, captures every enquiry and reports only real results.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={buttonClass({ size: 'md' })}>Create your account</Link>
            <Link href="/login" className={buttonClass({ variant: 'outline' })}>Log in</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl tracking-tight">Everything an agency does, in one place</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-line p-6">
              <h3 className="text-lg">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-line py-8 text-center text-sm text-muted">© 2026 GrowthPilot AI</footer>
    </div>
  );
}
