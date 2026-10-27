import { NextResponse } from 'next/server';
import { isProEntitled } from '@/lib/billing/core';
import { getBillingConfig, getVerifiedUser } from '@/lib/billing/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [config, session] = await Promise.all([getBillingConfig(), getVerifiedUser()]);
  const headers = { 'Cache-Control': 'no-store' };
  if (!config || !config.schemaReady) {
    return NextResponse.json({ billingReady: false, statusAvailable: false, authenticated: Boolean(session), verified: Boolean(session), plan: 'free', isPro: false, priceLabel: config?.priceLabel ?? '$12 USD / month' }, { headers });
  }
  if (!session) {
    return NextResponse.json({ billingReady: true, statusAvailable: true, authenticated: false, verified: false, plan: 'free', isPro: false, priceLabel: config.priceLabel }, { headers });
  }

  try {
    const { data, error } = await session.supabase
      .from('billing_subscriptions')
      .select('status, plan_code, price_id, current_period_end, cancel_at_period_end')
      .eq('user_id', session.user.id)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(25);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ status: string; plan_code: string; price_id: string; current_period_end: string | null; cancel_at_period_end: boolean }>;
    const toSnapshot = (row: typeof rows[number]) => ({
      status: row.status,
      planCode: row.plan_code === 'pro' ? 'pro' as const : 'other' as const,
      priceId: row.price_id,
      currentPeriodEnd: row.current_period_end ? Date.parse(row.current_period_end) / 1000 : null,
      cancelAtPeriodEnd: row.cancel_at_period_end,
    });
    const activePro = rows.find((candidate) => isProEntitled(toSnapshot(candidate)));
    const row = activePro ?? rows[0] ?? null;
    const isPro = Boolean(activePro);
    return NextResponse.json({
      billingReady: true,
      statusAvailable: true,
      authenticated: true,
      verified: true,
      plan: isPro ? 'pro' : 'free',
      isPro,
      subscriptionStatus: row?.status ?? null,
      currentPeriodEnd: row?.current_period_end ?? null,
      cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
      priceLabel: config.priceLabel,
    }, { headers });
  } catch {
    return NextResponse.json({ billingReady: true, statusAvailable: false, authenticated: true, verified: true, plan: 'free', isPro: false, priceLabel: config.priceLabel }, { status: 503, headers });
  }
}
