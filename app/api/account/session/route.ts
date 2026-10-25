import { NextResponse } from 'next/server';
import { accountSetupIssue, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const issue = accountSetupIssue();
  if (issue) return NextResponse.json({ configured: false, error: issue }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ configured: true, authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) return NextResponse.json({ error: 'Account profile setup is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({
      configured: true,
      authenticated: true,
      verified: Boolean(user.email_confirmed_at),
      email: user.email ?? '',
      username: profile?.username ?? '',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Account status is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
