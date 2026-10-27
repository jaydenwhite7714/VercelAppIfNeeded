import { NextResponse } from 'next/server';
import { jsonError, sameOriginRequest } from '@/lib/billing/http';
import { getBillingConfig, getVerifiedUser, stripeRequest } from '@/lib/billing/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError('Request origin could not be verified.', 403);
  const [config, session] = await Promise.all([getBillingConfig(), getVerifiedUser()]);
  if (!session) return jsonError('Sign in with a verified account to continue.', 401);
  if (!config || !config.schemaReady) return jsonError('Billing is not configured yet.', 503);

  try {
    const { data: customer, error } = await session.supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) return jsonError('Billing records are not available yet.', 503);
    if (!customer?.stripe_customer_id) return jsonError('No billing profile is available for this account.', 404);
    const portal = await stripeRequest<{ url?: string }>(config, 'billing_portal/sessions', {
      method: 'POST',
      form: new URLSearchParams({ customer: customer.stripe_customer_id, return_url: `${config.appOrigin}/app/settings` }),
    });
    if (!portal.url) return jsonError('The billing portal could not be opened.', 502);
    const portalUrl = new URL(portal.url);
    if (portalUrl.protocol !== 'https:' || portalUrl.hostname !== 'billing.stripe.com') return jsonError('The billing portal could not be opened.', 502);
    return NextResponse.json({ url: portalUrl.toString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('The billing portal is temporarily unavailable.', 502);
  }
}
