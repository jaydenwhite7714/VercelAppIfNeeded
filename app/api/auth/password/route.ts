import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/auth/request';
import { passwordUpdateSchema } from '@/lib/auth/validation';
import { accountSetupIssue, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403 });
  const issue = accountSetupIssue();
  if (issue) return NextResponse.json({ error: issue }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const input = await readJsonBody(request);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });
  const parsed = passwordUpdateSchema.safeParse(input.value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Check the new password.' }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'This password-reset link is invalid or expired. Request a new one.' }, { status: 401 });
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return NextResponse.json({ error: 'Could not update your password. Request a fresh reset link and try again.' }, { status: 502 });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not update your password. Request a fresh reset link and try again.' }, { status: 502 });
  }
}
