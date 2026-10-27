import { NextResponse } from 'next/server';
import { accountSetupStatus, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const setup = accountSetupStatus();
  const headers = { 'Cache-Control': 'no-store' };
  if (!setup.providerConfigured) return NextResponse.json({ ...setup, authenticated: false }, { headers });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ ...setup, authenticated: false }, { headers });
    if (!setup.databaseReady) return NextResponse.json({ ...setup, authenticated: true, email: user.email ?? '', username: '' }, { headers });
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) return NextResponse.json({ ...setup, authenticated: true, profileReady: false, email: user.email ?? '', username: '' }, { headers });
    return NextResponse.json({
      ...setup,
      authenticated: true,
      profileReady: Boolean(profile),
      verified: Boolean(user.email_confirmed_at),
      email: user.email ?? '',
      username: profile?.username ?? '',
    }, { headers });
  } catch {
    return NextResponse.json({ ...setup, authenticated: false }, { headers });
  }
}
