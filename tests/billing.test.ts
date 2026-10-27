import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isPrivilegedSupabaseKey, isProEntitled, parseBillingConfig, stripeSubscriptionId, verifyStripeSignature } from '@/lib/billing/core';

const baseEnv = {
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_PRO_PRICE_ID: 'price_test123',
  NEXT_PUBLIC_APP_URL: 'https://unbilled.example',
  NEXT_PUBLIC_PRO_PRICE_LABEL: '$12 USD / month',
  BILLING_SCHEMA_READY: 'true',
};

describe('test-mode billing configuration', () => {
  it('accepts a test key and server-configured price, but fails closed for missing or live credentials', () => {
    expect(parseBillingConfig(baseEnv)?.proPriceId).toBe('price_test123');
    expect(parseBillingConfig({ ...baseEnv, STRIPE_SECRET_KEY: 'sk_live_example' })).toBeNull();
    expect(parseBillingConfig({ ...baseEnv, STRIPE_PRO_PRICE_ID: 'price from client' })).toBeNull();
    expect(parseBillingConfig({ ...baseEnv, NEXT_PUBLIC_APP_URL: 'http://billing.example' })).toBeNull();
    expect(parseBillingConfig({ ...baseEnv, NEXT_PUBLIC_PRO_PRICE_LABEL: '' })).toBeNull();
  });

  it('only accepts a privileged Supabase key for webhook persistence', () => {
    const jwt = (role: string) => `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify({ role })).replace(/=/g, '')}.signature`;
    expect(isPrivilegedSupabaseKey(jwt('service_role'))).toBe(true);
    expect(isPrivilegedSupabaseKey('sb_secret_testSecret123')).toBe(true);
    expect(isPrivilegedSupabaseKey(jwt('anon'))).toBe(false);
    expect(isPrivilegedSupabaseKey('sb_publishable_publicKey')).toBe(false);
    expect(isPrivilegedSupabaseKey('invalid')).toBe(false);
  });

  it('recognizes only an active, unexpired subscription for the configured Pro price', () => {
    const now = 1_800_000_000_000;
    const active = { status: 'active', planCode: 'pro' as const, priceId: 'price_test123', currentPeriodEnd: 1_800_000_001, cancelAtPeriodEnd: false };
    expect(isProEntitled(active, now)).toBe(true);
    expect(isProEntitled({ ...active, status: 'canceled' }, now)).toBe(false);
    expect(isProEntitled({ ...active, currentPeriodEnd: 1_800_000_000 }, now)).toBe(false);
    expect(isProEntitled({ ...active, planCode: 'other' }, now)).toBe(false);
    expect(isProEntitled(null, now)).toBe(false);
  });
});

describe('billing migration safeguards', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202610260001_billing_and_pro_playbooks.sql', import.meta.url), 'utf8');

  it('enables forced RLS and scopes billing reads and Pro playbooks to the authenticated owner', () => {
    for (const table of ['billing_customers', 'billing_subscriptions', 'billing_webhook_events', 'pro_reply_playbooks']) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    }
    expect(migration).toMatch(/revoke all on public\.billing_customers, public\.billing_subscriptions, public\.billing_webhook_events from anon, authenticated/i);
    expect(migration).toMatch(/user_id = \(select auth\.uid\(\)\)/i);
    expect(migration).toMatch(/has_active_pro_subscription/i);
    expect(migration).toMatch(/grant execute on function public\.apply_stripe_subscription_event[\s\S]*?to service_role/i);
    expect(migration).not.toMatch(/card_number|security_code|cvc/i);
  });

  it('deduplicates Stripe event IDs and prevents older events from replacing newer subscription state', () => {
    expect(migration).toMatch(/on conflict \(stripe_event_id\) do nothing/i);
    expect(migration).toMatch(/excluded\.last_stripe_event_created >= public\.billing_subscriptions\.last_stripe_event_created/i);
    expect(migration).toMatch(/stripe customer ownership conflict/i);
    expect(migration).toMatch(/stripe subscription ownership conflict/i);
  });
});

describe('Stripe webhook verification and event parsing', () => {
  const secret = 'whsec_unit_test_secret';
  const payload = '{"id":"evt_test123","type":"customer.subscription.updated"}';
  const timestamp = 1_800_000_000;
  const signature = `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;

  it('verifies the exact raw payload and rejects changed, unsigned, and stale requests', async () => {
    expect(await verifyStripeSignature(payload, signature, secret, timestamp)).toBe(true);
    expect(await verifyStripeSignature(`${payload} `, signature, secret, timestamp)).toBe(false);
    expect(await verifyStripeSignature(payload, null, secret, timestamp)).toBe(false);
    expect(await verifyStripeSignature(payload, signature, secret, timestamp + 301)).toBe(false);
    expect(await verifyStripeSignature(payload, signature, 'sk_test_not_a_webhook_secret', timestamp)).toBe(false);
  });

  it('extracts a subscription only from supported Stripe object shapes', () => {
    expect(stripeSubscriptionId({ type: 'customer.subscription.updated', data: { object: { object: 'subscription', id: 'sub_123' } } })).toBe('sub_123');
    expect(stripeSubscriptionId({ type: 'checkout.session.completed', data: { object: { subscription: 'sub_456' } } })).toBe('sub_456');
    expect(stripeSubscriptionId({ type: 'invoice.payment_failed', data: { object: { parent: { subscription_details: { subscription: 'sub_789' } } } } })).toBe('sub_789');
    expect(stripeSubscriptionId({ type: 'invoice.payment_succeeded', data: { object: { subscription: { id: 'sub_999' } } } })).toBe('sub_999');
    expect(stripeSubscriptionId({ type: 'customer.created', data: { object: { id: 'cus_123' } } })).toBeNull();
  });
});
