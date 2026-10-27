'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3 } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Button, Card } from '@/components/ui';

export default function BillingSuccessPage() {
  const [active, setActive] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);
  const check = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/status', { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json() as { isPro?: boolean };
      setActive(response.ok && result.isPro === true);
    } catch {
      setActive(false);
    }
    setAttempt((current) => current + 1);
  }, []);
  useEffect(() => { void check(); }, [check]);
  useEffect(() => {
    if (active || attempt >= 5) return;
    const timer = window.setTimeout(() => { void check(); }, 2_000);
    return () => window.clearTimeout(timer);
  }, [active, attempt, check]);

  return <main className="min-h-dvh bg-paper px-4 py-7 sm:px-8"><div className="mx-auto max-w-2xl">
    <Link href="/" aria-label="Unbilled home"><Wordmark /></Link>
    <Card className="mt-12 p-6 text-center sm:p-10">
      {active ? <><Check className="mx-auto h-8 w-8 text-sage" /><p className="mono-label mt-4 text-sage">Verified by Unbilled</p><h1 className="mt-2 font-display text-3xl">Pro is active</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-mute">The server confirmed your test-mode subscription. Your cloud reply playbooks are now available in the Reply library. Your local ledger was not changed.</p><Link href="/app/library" className="mt-6 inline-block"><Button variant="accent">Open reply library</Button></Link></> : <><Clock3 className="mx-auto h-8 w-8 text-accent" /><p className="mono-label mt-4">Waiting for verification</p><h1 className="mt-2 font-display text-3xl">Checkout returned</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-mute">Unbilled only enables Pro after a signed Stripe webhook updates your account. This page does not trust the Checkout return URL or session ID to grant access. If verification is still pending, check again shortly or contact the site owner.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => { setAttempt(0); void check(); }}>Check status again</Button><Link href="/pricing"><Button variant="ghost">Back to pricing</Button></Link></div></>}
    </Card>
  </div></main>;
}
