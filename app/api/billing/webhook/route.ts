import { NextResponse } from 'next/server';
import { readBoundedRawBody, stripeSubscriptionId, verifyStripeSignature } from '@/lib/billing/core';
import { createBillingAdmin, fetchCurrentSubscription, getBillingConfig, runtimeEnv, stripeCustomerId, subscriptionSnapshot } from '@/lib/billing/server';

export const dynamic = 'force-dynamic';
const RELEVANT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);
const STRIPE_STATUSES = new Set(['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ok(ignored = false) {
  return NextResponse.json({ received: true, ...(ignored ? { ignored: true } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const [config, secret] = await Promise.all([getBillingConfig(), runtimeEnv('STRIPE_WEBHOOK_SECRET')]);
  if (!config || !config.schemaReady || !secret?.startsWith('whsec_')) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }
  const rawBody = await readBoundedRawBody(request);
  if (rawBody === null) return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  const signature = request.headers.get('stripe-signature');
  if (!await verifyStripeSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid event.');
    event = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }
  if (event.livemode !== false || typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]+$/.test(event.id)
      || typeof event.type !== 'string' || !Number.isSafeInteger(event.created) || (event.created as number) < 0) {
    return NextResponse.json({ error: 'Only valid Stripe test-mode events are accepted.' }, { status: 400 });
  }
  if (!RELEVANT_EVENTS.has(event.type)) return ok(true);
  const subscriptionId = stripeSubscriptionId(event);
  if (!subscriptionId) return ok(true);

  try {
    const [admin, subscription] = await Promise.all([createBillingAdmin(), fetchCurrentSubscription(config, subscriptionId)]);
    if (!admin) return NextResponse.json({ error: 'Webhook persistence is not configured.' }, { status: 503 });
    const customerId = stripeCustomerId(subscription.customer);
    const snapshot = subscriptionSnapshot(subscription, config.proPriceId);
    if (!customerId || !STRIPE_STATUSES.has(snapshot.status) || !/^price_[A-Za-z0-9]+$/.test(snapshot.priceId)) return ok(true);

    let userId = subscription.metadata?.user_id;
    if (!userId || !UUID.test(userId)) {
      const { data: mapping, error: mappingError } = await admin
        .from('billing_customers')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      if (mappingError) return NextResponse.json({ error: 'Webhook persistence failed.' }, { status: 500 });
      userId = mapping?.user_id;
    }
    if (!userId || !UUID.test(userId)) return ok(true);

    const { error } = await admin.rpc('apply_stripe_subscription_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created: event.created,
      p_user_id: userId,
      p_customer_id: customerId,
      p_subscription_id: subscription.id,
      p_status: snapshot.status,
      p_plan_code: snapshot.priceId === config.proPriceId ? 'pro' : 'other',
      p_price_id: snapshot.priceId,
      p_current_period_end: snapshot.currentPeriodEnd === null ? null : new Date(snapshot.currentPeriodEnd * 1000).toISOString(),
      p_cancel_at_period_end: snapshot.cancelAtPeriodEnd,
    });
    if (error) return NextResponse.json({ error: 'Webhook persistence failed.' }, { status: 500 });
    return ok();
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed; Stripe may retry.' }, { status: 500 });
  }
}
