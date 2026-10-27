import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Button, Card } from '@/components/ui';
import { ProPricingCard } from '@/components/billing/BillingPanel';

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
            The core workspace is free. An optional Pro plan adds private cloud-saved reply playbooks; your ledger and existing projects stay local in this browser on every plan.
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

          <ProPricingCard />
        </section>

        <footer className="py-10 text-center text-xs text-ink-mute"><Link className="underline" href="/privacy">Privacy details</Link> · <Link className="underline" href="/">Unbilled home</Link></footer>
      </div>
    </main>
  );
}
