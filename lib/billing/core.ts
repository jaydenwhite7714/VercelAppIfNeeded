export type BillingEnvironment = Record<string, string | undefined>;

export interface BillingConfig {
  stripeSecretKey: string;
  proPriceId: string;
  appOrigin: string;
  priceLabel: string;
  schemaReady: boolean;
}

export interface SubscriptionSnapshot {
  status: string;
  planCode: 'pro' | 'other';
  priceId: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
}

export function isPrivilegedSupabaseKey(key: string): boolean {
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts = key.split('.');
  if (!key.startsWith('eyJ') || parts.length !== 3) return false;
  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))) as { role?: unknown };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

export function parseBillingConfig(env: BillingEnvironment): BillingConfig | null {
  const stripeSecretKey = env.STRIPE_SECRET_KEY?.trim();
  const proPriceId = env.STRIPE_PRO_PRICE_ID?.trim();
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  const priceLabel = env.NEXT_PUBLIC_PRO_PRICE_LABEL?.trim();
  if (!stripeSecretKey?.startsWith('sk_test_') || !/^price_[A-Za-z0-9]+$/.test(proPriceId ?? '') || !appUrl || !priceLabel) return null;
  try {
    const url = new URL(appUrl);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null;
    return {
      stripeSecretKey,
      proPriceId: proPriceId!,
      appOrigin: url.origin,
      priceLabel,
      schemaReady: env.BILLING_SCHEMA_READY === 'true',
    };
  } catch {
    return null;
  }
}

export function isProEntitled(subscription: SubscriptionSnapshot | null | undefined, nowMs = Date.now()): boolean {
  return Boolean(
    subscription
    && subscription.status === 'active'
    && subscription.planCode === 'pro'
    && subscription.currentPeriodEnd !== null
    && subscription.currentPeriodEnd * 1000 > nowMs,
  );
}

function stripeReferenceId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') return (value as Record<string, string>).id;
  return null;
}

export function stripeSubscriptionId(event: Record<string, unknown>): string | null {
  const data = event.data && typeof event.data === 'object' ? event.data as Record<string, unknown> : null;
  const object = data?.object && typeof data.object === 'object' ? data.object as Record<string, unknown> : null;
  if (!object) return null;
  if (event.type === 'checkout.session.completed') {
    return stripeReferenceId(object.subscription);
  }
  if (typeof object.object === 'string' && object.object === 'subscription' && typeof object.id === 'string') return object.id;
  if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
    const directSubscriptionId = stripeReferenceId(object.subscription);
    if (directSubscriptionId) return directSubscriptionId;
    const parent = object.parent && typeof object.parent === 'object' ? object.parent as Record<string, unknown> : null;
    const details = parent?.subscription_details && typeof parent.subscription_details === 'object'
      ? parent.subscription_details as Record<string, unknown>
      : null;
    return stripeReferenceId(details?.subscription);
  }
  return null;
}

function fromHex(value: string): Uint8Array | null {
  if (!/^(?:[a-f0-9]{2})+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader || !secret.startsWith('whsec_')) return false;
  const parts = signatureHeader.split(',').map((part) => part.split('=', 2));
  const timestampText = parts.find(([key]) => key === 't')?.[1];
  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => fromHex(value ?? '')).filter((value): value is Uint8Array => value !== null);
  if (!signatures.length) return false;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
    const expected = new Uint8Array(signed);
    return signatures.some((signature) => constantTimeEqual(signature, expected));
  } catch {
    return false;
  }
}

export function readBoundedRawBody(request: Request, maxBytes = 1_000_000): Promise<string | null> {
  return (async () => {
    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > maxBytes || !request.body) return null;
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } catch {
      return null;
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return null;
    }
  })();
}
