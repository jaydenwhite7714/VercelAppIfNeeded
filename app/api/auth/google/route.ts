import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/auth/request';
import { safeNextPath } from '@/lib/auth/validation';
import { accountSetupStatus, createSupabaseServerClient, getAppOrigin, getSupabaseEnv } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const oauthSchema = z.object({ next: z.string().optional() }).strict();

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  if (!getSupabaseEnv()) return NextResponse.json({ error: 'Google sign-in is not configured in this environment. Your local workspace remains available.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (!accountSetupStatus().databaseReady) return NextResponse.json({ error: 'Google sign-in is paused until the account profile migration has been applied and verified. Your local workspace remains available.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const input = await readJsonBody(request, 2_000);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status, headers: { 'Cache-Control': 'no-store' } });
  const parsed = oauthSchema.safeParse(input.value);
  if (!parsed.success) return NextResponse.json({ error: 'The Google sign-in request is invalid.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });

  try {
    const supabase = await createSupabaseServerClient();
    const callback = new URL('/auth/callback', getAppOrigin(request.url));
    callback.searchParams.set('flow', 'google');
    callback.searchParams.set('next', safeNextPath(parsed.data.next));
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback.toString(),
        scopes: 'openid email profile',
        queryParams: { prompt: 'select_account consent' },
      },
    });
    if (error || !data.url) return NextResponse.json({ error: 'Google sign-in is unavailable right now. Check that the Google provider is enabled in Supabase Auth.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ url: data.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Google sign-in could not be started. Check the provider setup and try again.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
