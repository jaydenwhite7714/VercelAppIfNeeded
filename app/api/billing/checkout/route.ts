import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, sameOriginRequest } from '@/lib/billing/http';
import { getBillingConfig, getVerifiedUser, stripeRequest } from '@/lib/billing/server';
import { readBoundedRawBody } from '@/lib/billing/core';

export const dynamic = 'force-dynamic';
const emptyBody = z.object({}).strict();

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError('Request origin could not be verified.', 403);
  const body = await readBoundedRawBody(request, 1_000);
  if (body === null) return jsonError('Invalid request body.', 400);
  try {
    emptyBody.parse(JSON.parse(body));
  } catch {
    return jsonError('Invalid request body.', 400);
  }

  const [config, session] = await Promise.all([getBillingConfig(), getVerifiedUser()]);
  if (!session) return jsonError('Sign in with a verified account to continue.', 401);
  if (!config || !config.schemaReady) return jsonError('Billing is not configured yet.', 503);

  try {
    const [{ data: existing, error: subscriptionError }, { data: customer, error: customerError }] = await Promise.all([
      session.supabase.from('billing_subscriptions').select('status, plan_code, price_id, current_period_end').eq('user_id', session.user.id).limit(10),
      session.supabase.from('billing_customers').select('stripe_customer_id').eq('user_id', session.user.id).maybeSingle(),
    ]);
    if (subscriptionError || customerError) return jsonError('Billing records are not available yet.', 503);
    const hasCurrentSubscription = (existing ?? []).some((row: { status: string; plan_code: string; price_id: string; current_period_end: string | null }) =>
      ['active', 'trialing', 'past_due', 'incomplete'].includes(row.status)
      && row.plan_code === 'pro'
      && (row.status === 'incomplete' || (Boolean(row.current_period_end) && Date.parse(row.current_period_end!) > Date.now())));
    if (hasCurrentSubscription) return jsonError('A Pro subscription or Checkout is already in progress for this account.', 409);

    const form = new URLSearchParams();
    form.set('mode', 'subscription');
    form.set('line_items[0][price]', config.proPriceId);
    form.set('line_items[0][quantity]', '1');
    form.set('client_reference_id', session.user.id);
    form.set('success_url', `${config.appOrigin}/billing/success`);
    form.set('cancel_url', `${config.appOrigin}/billing/cancelled`);
    form.set('metadata[user_id]', session.user.id);
    form.set('subscription_data[metadata][user_id]', session.user.id);
    if (customer?.stripe_customer_id) form.set('customer', customer.stripe_customer_id);
    else if (session.user.email) form.set('customer_email', session.user.email);

    const checkout = await stripeRequest<{ url?: string }>(config, 'checkout/sessions', {
      method: 'POST',
      form,
      idempotencyKey: `unbilled-checkout-${session.user.id}-${Math.floor(Date.now() / 60_000)}`,
    });
    if (!checkout.url) return jsonError('Checkout could not be started.', 502);
    const checkoutUrl = new URL(checkout.url);
    if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') return jsonError('Checkout could not be started.', 502);
    return NextResponse.json({ url: checkoutUrl.toString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Checkout is temporarily unavailable. Please try again.', 502);
  }
}
