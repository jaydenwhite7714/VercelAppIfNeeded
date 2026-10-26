import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/auth/request';
import { safeNextPath } from '@/lib/auth/validation';
import { OAUTH_PROVIDERS, oauthProviderLabel } from '@/lib/auth/oauth';
import type { OAuthProvider } from '@/lib/auth/oauth';
import { accountSetupStatus, createSupabaseServerClient, getAppOrigin, getSupabaseEnv } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const oauthSchema = z.object({
  provider: z.enum(OAUTH_PROVIDERS),
  next: z.string().optional(),
}).strict();

function oauthConfigurationError(provider: OAuthProvider): string {
  return `${oauthProviderLabel(provider)} sign-in is unavailable. Check that the provider is enabled and configured in Supabase Auth.`;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!getSupabaseEnv()) {
    return NextResponse.json({ error: 'Social sign-in is not configured in this environment. Your local workspace remains available.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!accountSetupStatus().databaseReady) {
    return NextResponse.json({ error: 'Social sign-in is paused until the account profile migrations have been applied and verified. Your local workspace remains available.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const input = await readJsonBody(request, 2_000);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status, headers: { 'Cache-Control': 'no-store' } });
  const parsed = oauthSchema.safeParse(input.value);
  if (!parsed.success) return NextResponse.json({ error: 'The social sign-in request is invalid.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });

  const { provider } = parsed.data;
  try {
    const supabase = await createSupabaseServerClient();
    const callback = new URL('/auth/callback', getAppOrigin(request.url));
    callback.searchParams.set('flow', 'oauth');
    callback.searchParams.set('provider', provider);
    callback.searchParams.set('next', safeNextPath(parsed.data.next));

    const scopes = provider === 'google'
      ? 'openid email profile'
      : provider === 'azure'
        ? 'email'
        : 'email';
    const queryParams = provider === 'google'
      ? { prompt: 'select_account consent' }
      : provider === 'azure'
        ? { prompt: 'select_account' }
        : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callback.toString(),
        scopes,
        ...(queryParams ? { queryParams } : {}),
      },
    });
    if (error || !data.url) {
      return NextResponse.json({ error: oauthConfigurationError(provider) }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ url: data.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Social sign-in could not be started. Check the provider setup and try again.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
