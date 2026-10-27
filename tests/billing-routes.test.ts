import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getBillingConfig: vi.fn(),
  billingSchemaReady: vi.fn(),
  getVerifiedUser: vi.fn(),
  stripeRequest: vi.fn(),
  runtimeEnv: vi.fn(),
  createBillingAdmin: vi.fn(),
  fetchCurrentSubscription: vi.fn(),
}));

vi.mock('@/lib/billing/server', () => ({
  ...mocks,
  stripeCustomerId: (customer: string | { id?: string } | null) => typeof customer === 'string' ? customer : customer?.id ?? null,
  subscriptionSnapshot: (subscription: { status: string; current_period_end?: number; cancel_at_period_end?: boolean; items?: { data?: Array<{ price?: { id?: string }; current_period_end?: number }> } }, preferred?: string) => {
    const items = subscription.items?.data ?? [];
    const prices = items.map((item) => item.price?.id).filter((id): id is string => Boolean(id));
    return {
      status: subscription.status,
      priceId: preferred && prices.includes(preferred) ? preferred : prices[0] ?? '',
      currentPeriodEnd: subscription.current_period_end ?? items[0]?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    };
  },
}));

import { POST as checkoutPost } from '@/app/api/billing/checkout/route';
import { POST as portalPost } from '@/app/api/billing/portal/route';
import { POST as playbookPost } from '@/app/api/billing/playbooks/route';
import { POST as webhookPost } from '@/app/api/billing/webhook/route';
import { stripeSubscriptionId } from '@/lib/billing/core';

const config = {
  stripeSecretKey: 'sk_test_local',
  proPriceId: 'price_serverowned',
  appOrigin: 'https://unbilled.example',
  priceLabel: '$12 USD / month',
  schemaReady: true,
};
const userId = 'f5e1a182-0b9b-4edf-a570-21ee3ef73d09';
const user = { id: userId, email: 'sam@example.com' };

function makeSupabase(customer: string | null = null) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => table === 'billing_subscriptions'
          ? { limit: vi.fn(async () => ({ data: [], error: null })) }
          : { maybeSingle: vi.fn(async () => ({ data: customer ? { stripe_customer_id: customer } : null, error: null })) }),
      })),
    })),
  };
}

function request(path: string, body = '{}', origin = 'https://unbilled.example') {
  return new Request(`https://unbilled.example/api/billing/${path}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getBillingConfig.mockResolvedValue(config);
  mocks.billingSchemaReady.mockResolvedValue(true);
  mocks.getVerifiedUser.mockResolvedValue({ user, supabase: makeSupabase() });
  mocks.stripeRequest.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_123' });
});

describe('billing API authorization', () => {
  it('rejects cross-origin or malformed checkout requests before calling Stripe', async () => {
    const crossOrigin = await checkoutPost(request('checkout', '{}', 'https://attacker.example'));
    expect(crossOrigin.status).toBe(403);
    const forgedPlan = await checkoutPost(request('checkout', JSON.stringify({ userId, priceId: 'price_attacker', plan: 'pro' })));
    expect(forgedPlan.status).toBe(400);
    expect(mocks.stripeRequest).not.toHaveBeenCalled();
  });

  it('requires a verified server session and derives the checkout customer/price on the server', async () => {
    mocks.getVerifiedUser.mockResolvedValueOnce(null);
    expect((await checkoutPost(request('checkout'))).status).toBe(401);

    mocks.getVerifiedUser.mockResolvedValueOnce({ user, supabase: makeSupabase('cus_owned_123') });
    const response = await checkoutPost(request('checkout'));
    expect(response.status).toBe(200);
    const [receivedConfig, path, options] = mocks.stripeRequest.mock.calls[0] as unknown as [typeof config, string, { form: URLSearchParams }];
    expect(receivedConfig).toEqual(config);
    expect(path).toBe('checkout/sessions');
    expect(options.form.get('line_items[0][price]')).toBe('price_serverowned');
    expect(options.form.get('client_reference_id')).toBe(userId);
    expect(options.form.get('customer')).toBe('cus_owned_123');
  });

  it('requires an authenticated owner mapping before opening the portal', async () => {
    mocks.getVerifiedUser.mockResolvedValueOnce(null);
    expect((await portalPost(request('portal'))).status).toBe(401);
    mocks.getVerifiedUser.mockResolvedValueOnce({ user, supabase: makeSupabase() });
    expect((await portalPost(request('portal'))).status).toBe(404);
    expect(mocks.stripeRequest).not.toHaveBeenCalled();
  });

  it('validates cloud playbook input and derives ownership from the verified session', async () => {
    const insert = vi.fn((row: Record<string, unknown>) => ({
      select: () => ({ single: async () => ({ data: { id: 'cf63b734-f42a-4c69-8f09-75d7ca90ffca', ...row }, error: null }) }),
    }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mocks.getVerifiedUser.mockResolvedValueOnce({ user, supabase });
    const response = await playbookPost(request('playbooks', JSON.stringify({ title: 'Revision boundary', subject: '', body: 'Happy to quote this as another round.' })));
    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({ user_id: userId, title: 'Revision boundary', subject: '', body: 'Happy to quote this as another round.' });

    const forgedOwner = await playbookPost(request('playbooks', JSON.stringify({ title: 'Forged', body: 'Try to assign someone else', user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })));
    expect(forgedOwner.status).toBe(400);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('maps Postgres RLS denial to a Pro-required response', async () => {
    const supabase = { from: vi.fn(() => ({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '42501', message: 'row-level security denied' } }) }) }) })) };
    mocks.getVerifiedUser.mockResolvedValueOnce({ user, supabase });
    expect((await playbookPost(request('playbooks', JSON.stringify({ title: 'Locked', body: 'Requires Pro' })))).status).toBe(403);
  });
});

describe('webhook endpoint safety', () => {
  it('rejects missing/invalid signatures and live-mode events before persistence', async () => {
    mocks.runtimeEnv.mockResolvedValue('whsec_webhook_test');
    const unsigned = new Request('https://unbilled.example/api/billing/webhook', { method: 'POST', body: '{"livemode":false}' });
    expect((await webhookPost(unsigned)).status).toBe(400);
    expect(mocks.createBillingAdmin).not.toHaveBeenCalled();

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ id: 'evt_live', type: 'customer.subscription.updated', created: timestamp, livemode: true, data: { object: { object: 'subscription', id: 'sub_123' } } });
    const digest = createHmac('sha256', 'whsec_webhook_test').update(`${timestamp}.${payload}`).digest('hex');
    const live = new Request('https://unbilled.example/api/billing/webhook', {
      method: 'POST', headers: { 'stripe-signature': `t=${timestamp},v1=${digest}` }, body: payload,
    });
    expect((await webhookPost(live)).status).toBe(400);
    expect(mocks.createBillingAdmin).not.toHaveBeenCalled();
  });

  it('sends signed test events through the idempotent database RPC (including duplicate deliveries)', async () => {
    mocks.runtimeEnv.mockResolvedValue('whsec_webhook_test');
    const rpc = vi.fn(async (_fn: string, _args: Record<string, unknown>) => ({ data: false, error: null })); // duplicate event ID: RPC reports no second insert
    mocks.createBillingAdmin.mockResolvedValue({
      rpc,
      from: vi.fn(),
    });
    mocks.fetchCurrentSubscription.mockResolvedValue({
      id: 'sub_123', customer: 'cus_123', status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 86_400,
      cancel_at_period_end: false, metadata: { user_id: userId },
      items: { data: [{ price: { id: 'price_serverowned' } }] },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ id: 'evt_test123', type: 'customer.subscription.updated', created: timestamp, livemode: false, data: { object: { object: 'subscription', id: 'sub_123' } } });
    expect(stripeSubscriptionId(JSON.parse(payload))).toBe('sub_123');
    const digest = createHmac('sha256', 'whsec_webhook_test').update(`${timestamp}.${payload}`).digest('hex');
    const makeWebhook = () => new Request('https://unbilled.example/api/billing/webhook', {
      method: 'POST', headers: { 'stripe-signature': `t=${timestamp},v1=${digest}` }, body: payload,
    });

    const firstResponse = await webhookPost(makeWebhook());
    expect(firstResponse.status).toBe(200);
    expect(await firstResponse.clone().json()).toEqual({ received: true });
    expect((await webhookPost(makeWebhook())).status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(2);
    const [functionName, rpcArgs] = rpc.mock.calls[0]!;
    expect(functionName).toBe('apply_stripe_subscription_event');
    expect(rpcArgs.p_plan_code).toBe('pro');
    expect(rpcArgs.p_user_id).toBe(userId);
  });
});
