import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAccountSetupIssue, getAccountSetupStatus, getSupabaseConfig } from '@/lib/auth/readiness';
import type { SupabaseEnv } from '@/lib/auth/readiness';

export type { SupabaseEnv };

export function getSupabaseEnv(): SupabaseEnv | null {
  return getSupabaseConfig(process.env);
}

export function accountSetupStatus() {
  return getAccountSetupStatus(process.env);
}

export function accountSetupIssue(needsEmail = false): string | null {
  return getAccountSetupIssue(accountSetupStatus(), needsEmail);
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
