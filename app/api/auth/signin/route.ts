import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/auth/request';
import { authErrorMessage, signInSchema, normalizeEmail } from '@/lib/auth/validation';
import { accountSetupIssue, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403 });
  const issue = accountSetupIssue();
  if (issue) return NextResponse.json({ error: issue }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const input = await readJsonBody(request);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });
  const parsed = signInSchema.safeParse(input.value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Check your sign-in details.' }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(parsed.data.email),
      password: parsed.data.password,
    });
    if (error || !data.user) {
      if (error) {
        const safe = authErrorMessage(error.message);
        if (safe.status === 429) return NextResponse.json({ error: safe.message }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
      }
      return NextResponse.json({ error: 'Email or password is incorrect. If you have not verified your email, check your inbox or request a new link.' }, { status: 401 });
    }
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut({ scope: 'local' });
      return NextResponse.json({ error: 'Verify your email before signing in. Request a fresh verification link if needed.' }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please try again.' }, { status: 502 });
  }
}
