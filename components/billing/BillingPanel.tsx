'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CreditCard, Sparkles } from 'lucide-react';
import { Button, Card, SectionLabel } from '@/components/ui';

export interface BillingStatus {
  billingReady: boolean;
  statusAvailable?: boolean;
  authenticated: boolean;
  verified: boolean;
  plan: 'free' | 'pro';
  isPro: boolean;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  priceLabel: string;
}

export function useBillingStatus() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/status', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json() as BillingStatus;
      setStatus(data);
      setError(response.ok ? '' : 'Billing status could not be checked right now.');
    } catch {
      setError('Billing status could not be checked right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { status, loading, error, refresh };
}

function BillingButtons({ status, onRefresh }: { status: BillingStatus; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function go(endpoint: '/api/billing/checkout' | '/api/billing/portal') {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        ...(endpoint.endsWith('/checkout') ? { body: '{}' } : {}),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'Billing is temporarily unavailable.');
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)) throw new Error('The billing link could not be verified.');
      window.location.assign(url.toString());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Billing is temporarily unavailable.');
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  if (!status.billingReady) {
    return <p className="text-[12px] leading-relaxed text-ink-mute">Test-mode billing is not configured for this deployment. No payment can be taken here.</p>;
  }
  if (status.statusAvailable === false) {
    return <p className="text-[12px] leading-relaxed text-ink-mute">Subscription status could not be verified. Billing actions are paused until the account service responds.</p>;
  }
  if (!status.authenticated || !status.verified) {
    return <div className="flex flex-wrap gap-2"><Link href="/signup"><Button size="sm" variant="accent">Create account</Button></Link><Link href="/signin"><Button size="sm" variant="outline">Sign in</Button></Link><p className="basis-full text-[11px] text-ink-mute">A verified account is required. Checkout never accepts identity or pricing from the browser.</p></div>;
  }
  if (status.isPro) {
    return <div className="space-y-2">
      <p className="text-sm font-medium text-sage">Pro is active</p>
      {status.currentPeriodEnd ? <p className="text-[11px] text-ink-mute">{status.cancelAtPeriodEnd ? 'Access through' : 'Next renewal'} {new Date(status.currentPeriodEnd).toLocaleDateString()}.</p> : null}
      <Button size="sm" variant="outline" loading={busy} onClick={() => void go('/api/billing/portal')}><CreditCard className="h-3.5 w-3.5" /> Manage subscription</Button>
      {message ? <p role="status" className="text-xs text-accent">{message}</p> : null}
    </div>;
  }
  return <div className="space-y-2">
    <p className="text-sm font-semibold">{status.priceLabel}</p>
    <Button size="sm" variant="accent" loading={busy} onClick={() => void go('/api/billing/checkout')}><Sparkles className="h-3.5 w-3.5" /> Continue to secure Checkout <ArrowUpRight className="h-3.5 w-3.5" /></Button>
    <p className="text-[11px] text-ink-mute">Stripe-hosted test-mode checkout. Unbilled never sees or stores card details.</p>
    {message ? <p role="status" className="text-xs text-accent">{message}</p> : null}
  </div>;
}

export function BillingPanel() {
  const { status, loading, error, refresh } = useBillingStatus();
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" /><SectionLabel className="flex-1">Plan & billing</SectionLabel></div>
      <div className="mt-3 flex items-baseline gap-2"><span className="text-lg font-semibold">{loading ? 'Checking…' : !status || status.statusAvailable === false ? 'Unavailable' : status.isPro ? 'Pro' : 'Free'}</span>{status?.isPro ? <span className="mono-label text-sage">active</span> : null}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">Free workspace tools stay local in this browser. Pro adds personal cloud-saved reply playbooks; it never syncs or changes your local ledger.</p>
      <div className="mt-3">
        {loading ? <p className="text-xs text-ink-mute">Checking subscription status…</p> : status && (!status.billingReady || status.statusAvailable !== false) ? <BillingButtons status={status} onRefresh={refresh} /> : <p className="text-xs text-ink-mute">{error || 'Billing status is unavailable.'}</p>}
      </div>
      {error && status ? <p role="status" className="mt-2 text-xs text-accent">{error}</p> : null}
    </Card>
  );
}

export function ProPricingCard() {
  const { status, loading, error, refresh } = useBillingStatus();
  return (
    <Card className="flex flex-col border-ink/15 bg-paper-deep/40 p-6 sm:p-8">
      <div className="flex items-center gap-2 text-accent"><Sparkles className="h-4 w-4" /><p className="mono-label text-accent">Optional upgrade</p></div>
      <h2 className="mt-3 text-2xl font-semibold">Unbilled Pro</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-mute">Keep private reply playbooks in your account and use them across signed-in devices. Your existing browser-based ledger remains local and Free.</p>
      <div className="my-5 rounded-xl border border-line bg-card p-3.5"><p className="mono-label">One personal feature</p><p className="mt-2 text-xs leading-relaxed text-ink-mute">Create, save, and remove your own reusable reply playbooks. Access is checked by the server and database against the subscription status—not a browser flag.</p></div>
      <div className="mt-auto pt-2">
        {loading ? <p className="text-xs text-ink-mute">Checking availability…</p> : status && (!status.billingReady || status.statusAvailable !== false) ? <BillingButtons status={status} onRefresh={refresh} /> : <p className="text-xs text-ink-mute">{error || 'Billing status is temporarily unavailable; Checkout is paused.'}</p>}
      </div>
      <p className="mt-4 text-[10.5px] leading-relaxed text-ink-mute">Only Stripe test-mode credentials are accepted by this integration. Test transactions are not real charges. Production billing requires a separate owner-approved release.</p>
    </Card>
  );
}
