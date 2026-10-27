import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/auth/request';
import { authErrorMessage, isUsernameConflict, normalizeEmail, normalizeUsername, signupSchema } from '@/lib/auth/validation';
import { accountSetupIssue, createSupabaseServerClient, getAppOrigin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403 });
  const issue = accountSetupIssue(true);
  if (issue) return NextResponse.json({ error: issue }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const input = await readJsonBody(request, 12_000);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });
  const parsed = signupSchema.safeParse(input.value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? 'Check your signup details.' }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const normalizedUsername = normalizeUsername(parsed.data.username);
    const { data: usernameAvailable, error: usernameCheckError } = await supabase.rpc('is_unbilled_username_available', { p_username: normalizedUsername });
    if (usernameCheckError || typeof usernameAvailable !== 'boolean') {
      return NextResponse.json({ error: 'Username availability could not be checked. No account was created; please try again later.' }, { status: 503 });
    }
    if (!usernameAvailable) return NextResponse.json({ error: 'That username is already taken. Please choose another.' }, { status: 409 });
    const callback = new URL('/auth/callback', getAppOrigin(request.url));
    callback.searchParams.set('next', '/account/verified');
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(parsed.data.email),
      password: parsed.data.password,
      options: {
        data: { username: normalizeUsername(parsed.data.username) },
        emailRedirectTo: callback.toString(),
      },
    });

    if (error) {
      if (isUsernameConflict(error)) {
        return NextResponse.json({ error: 'That username is already taken. Please choose another.' }, { status: 409 });
      }
      if (/database error saving new user|database error creating user/i.test(error.message)) {
        const { data: stillAvailable } = await supabase.rpc('is_unbilled_username_available', { p_username: normalizedUsername });
        if (stillAvailable === false) return NextResponse.json({ error: 'That username is already taken. Please choose another.' }, { status: 409 });
      }
      if (/already registered|already exists|user exists/i.test(error.message)) {
        return NextResponse.json({
          message: 'If this address can be registered, follow the verification email. If it is already in use, sign in or reset your password. Check spam; mailbox delivery cannot be confirmed here.',
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const safe = authErrorMessage(error.message);
      return NextResponse.json({ error: safe.message }, { status: safe.status });
    }

    return NextResponse.json({
      message: 'If this address can be registered, follow the verification email. If it is already in use, sign in or reset your password. Check spam; mailbox delivery cannot be confirmed here.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'We could not request verification right now. No email delivery was confirmed; please try again.' }, { status: 502 });
  }
}
