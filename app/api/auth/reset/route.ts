import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/auth/request';
import { emailOnlySchema, normalizeEmail } from '@/lib/auth/validation';
import { accountSetupIssue, createSupabaseServerClient, getAppOrigin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403 });
  const issue = accountSetupIssue(true);
  if (issue) return NextResponse.json({ error: issue }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const input = await readJsonBody(request);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });
  const parsed = emailOnlySchema.safeParse(input.value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const redirectTo = new URL('/auth/callback?next=/account/update-password', getAppOrigin(request.url)).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(parsed.data.email), { redirectTo });
    if (error) return NextResponse.json({ error: 'We could not request a password reset. Nothing was confirmed as sent; try again later.' }, { status: 502 });
    return NextResponse.json({ message: 'If an account exists for that address, a password-reset request was accepted. Check your inbox and spam; delivery is not guaranteed.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'We could not request a password reset. Nothing was confirmed as sent; try again later.' }, { status: 502 });
  }
}
