import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type SupabaseEnv = { url: string; key: string };

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null;
  } catch {
    return null;
  }
  return { url, key };
}

export function accountSetupStatus() {
  return {
    providerConfigured: getSupabaseEnv() !== null,
    databaseReady: process.env.SUPABASE_AUTH_SCHEMA_READY === 'true',
    emailReady: process.env.SUPABASE_EMAIL_DELIVERY_READY === 'true',
  };
}

export function accountSetupIssue(needsEmail = false): string | null {
  const status = accountSetupStatus();
  if (!status.providerConfigured) return 'Account services are not configured yet. You can continue using the local workspace.';
  if (!status.databaseReady) return 'Account database setup is incomplete. Local-only workspaces remain available.';
  if (needsEmail && !status.emailReady) return 'Email delivery is not configured yet. No verification email was requested.';
  return null;
}

export function getAppOrigin(requestUrl?: string): string {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (process.env.VERCEL_ENV === 'preview' && vercelUrl) return `https://${vercelUrl}`;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || url.hostname === 'localhost') return url.origin;
    } catch {
      // Fall through to the hosting-provided origin.
    }
  }
  if (vercelUrl) return `https://${vercelUrl}`;
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      if (url.protocol === 'https:' || url.hostname === 'localhost') return url.origin;
    } catch {
      // Use localhost for local development when the request URL is not usable.
    }
  }
  return 'http://localhost:3000';
}

export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error('Account services are not configured.');
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot write cookies. Route handlers and middleware can.
        }
      },
    },
  });
}
