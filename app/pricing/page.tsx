import Link from 'next/link';
import { ArrowRight, Check, LockKeyhole, Sparkles } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Button, Card } from '@/components/ui';

const features = [
  'Check client messages against your agreed scope',
  'Track absorbed, billed, declined, and held requests',
  'Draft replies and client-ready change orders',
  'Create shareable scope and approval links',
  'Review your monthly free-work report',
];

export default function PricingPage() {
  return (
    <main className="min-h-dvh bg-paper px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Unbilled home"><Wordmark /></Link>
          <Link className="text-sm text-ink-mute transition-colors hover:text-ink" href="/">Back to home</Link>
        </header>

        <section className="py-14 text-center sm:py-20">
          <p className="mono-label">Simple pricing · no surprises</p>
          <h1 className="mt-4 font-display text-5xl tracking-tight sm:text-6xl">Useful work tools.<br /><span className="text-accent">Free to use.</span></h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-mute">
            Unbilled is currently free. Use the scope checker and keep your work ledger in this browser, with no account or subscription.
          </p>
        </section>

        <section className="mx-auto grid max-w-3xl gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6 sm:p-8">
            <p className="mono-label">Available now</p>
            <h2 className="mt-2 text-3xl font-semibold">Free</h2>
            <p className="mt-2 text-sm text-ink-mute">$0 · no payment details required</p>
            <ul className="mt-6 space-y-3">
              {features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm leading-relaxed"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{feature}</li>)}
            </ul>
            <Link href="/onboarding" className="mt-8 block"><Button variant="outline" className="w-full">Start using Unbilled <ArrowRight className="h-4 w-4" /></Button></Link>
            <p className="mt-3 text-center text-[11px] text-ink-mute">Your project data stays in this browser. Export a backup in Settings.</p>
          </Card>

          <Card className="flex flex-col border-ink/15 bg-paper-deep/40 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-accent"><Sparkles className="h-4 w-4"/><p className="mono-label text-accent">Being explored</p></div>
            <h2 className="mt-3 text-2xl font-semibold">Unbilled Pro</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-mute">A paid plan is not available yet. Pro features, pricing, and license activation have not been released.</p>
            <div className="my-4 rounded-xl border border-line bg-card p-3.5">
              <p className="mono-label">Ideas only · not available</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-mute">Optional encrypted sync or team collaboration may be explored if demand can support the ongoing costs. The local, single-browser workspace is intended to remain free. No plan, price, or release date is committed.</p>
            </div>
            <div className="my-5 rounded-xl border border-line bg-card p-3.5">
              <div className="flex items-start gap-2.5"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute"/><p className="text-xs leading-relaxed text-ink-mute">There is no checkout button and this page will not ask you to pay. We’ll update this page when paid features actually exist.</p></div>
            </div>
            <div className="mt-auto pt-3"><Link href="/app"><Button className="w-full">Open the free workspace <ArrowRight className="h-4 w-4" /></Button></Link></div>
          </Card>
        </section>

        <footer className="py-10 text-center text-xs text-ink-mute"><Link className="underline" href="/privacy">Privacy details</Link> · <Link className="underline" href="/">Unbilled home</Link></footer>
      </div>
    </main>
  );
}
