import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { createSupabaseServerClient, getSupabaseEnv } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403 });
  if (!getSupabaseEnv()) return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) return NextResponse.json({ error: 'Could not safely end this session. Please retry.' }, { status: 502 });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not safely end this session. Please retry.' }, { status: 502 });
  }
}
