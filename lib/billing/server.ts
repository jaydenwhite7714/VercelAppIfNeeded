import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPrivilegedSupabaseKey, parseBillingConfig, type BillingConfig, type SubscriptionSnapshot } from '@/lib/billing/core';

export async function runtimeEnv(name: string): Promise<string | undefined> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === 'string' && value.length) return value;
  } catch {
    // Vercel and local Next.js use process.env; OpenNext provides Worker bindings above.
  }
  const value = process.env[name];
  return typeof value === 'string' && value.length ? value : undefined;
}

export async function getBillingConfig(): Promise<BillingConfig | null> {
  const names = ['STRIPE_SECRET_KEY', 'STRIPE_PRO_PRICE_ID', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_PRO_PRICE_LABEL', 'BILLING_SCHEMA_READY'];
  const [values, webhookSecret, serviceRoleKey] = await Promise.all([
    Promise.all(names.map(runtimeEnv)),
    runtimeEnv('STRIPE_WEBHOOK_SECRET'),
    runtimeEnv('SUPABASE_SERVICE_ROLE_KEY'),
  ]);
  if (!webhookSecret?.startsWith('whsec_') || !serviceRoleKey || !isPrivilegedSupabaseKey(serviceRoleKey)) return null;
  return parseBillingConfig(Object.fromEntries(names.map((name, index) => [name, values[index]])));
}

export async function getVerifiedUser(): Promise<{ supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; user: User } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || !data.user.email_confirmed_at) return null;
    return { supabase, user: data.user };
  } catch {
    return null;
  }
}

export async function createBillingAdmin(): Promise<SupabaseClient | null> {
  const [url, serviceRoleKey] = await Promise.all([runtimeEnv('NEXT_PUBLIC_SUPABASE_URL'), runtimeEnv('SUPABASE_SERVICE_ROLE_KEY')]);
  if (!url || !serviceRoleKey || !isPrivilegedSupabaseKey(serviceRoleKey)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null;
    return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  } catch {
    return null;
  }
}

export async function stripeRequest<T>(
  config: BillingConfig,
  path: string,
  options: { method?: 'GET' | 'POST'; form?: URLSearchParams; idempotencyKey?: string } = {},
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      ...(options.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    },
    ...(options.form ? { body: options.form.toString() } : {}),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Stripe request failed.');
  return await response.json() as T;
}

export interface StripeSubscription {
  id: string;
  customer: string | { id?: string } | null;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string }; current_period_end?: number }> };
}

export function subscriptionSnapshot(subscription: StripeSubscription, preferredPriceId?: string): SubscriptionSnapshot {
  const priceIds = subscription.items?.data?.map((item) => item.price?.id).filter((id): id is string => Boolean(id)) ?? [];
  const priceId = (preferredPriceId && priceIds.includes(preferredPriceId) ? preferredPriceId : priceIds[0]) ?? '';
  const periodEnd = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  return {
    status: subscription.status,
    planCode: preferredPriceId && priceId === preferredPriceId ? 'pro' : 'other',
    priceId,
    currentPeriodEnd: Number.isSafeInteger(periodEnd) ? periodEnd! : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
  };
}

export function stripeCustomerId(customer: StripeSubscription['customer']): string | null {
  if (typeof customer === 'string' && customer.startsWith('cus_')) return customer;
  if (customer && typeof customer === 'object' && typeof customer.id === 'string' && customer.id.startsWith('cus_')) return customer.id;
  return null;
}

export async function fetchCurrentSubscription(config: BillingConfig, id: string): Promise<StripeSubscription> {
  if (!/^sub_[A-Za-z0-9]+$/.test(id)) throw new Error('Invalid Stripe subscription reference.');
  return stripeRequest<StripeSubscription>(config, `subscriptions/${encodeURIComponent(id)}`);
}

export async function billingSchemaReady(): Promise<boolean> {
  return (await runtimeEnv('BILLING_SCHEMA_READY')) === 'true';
}
