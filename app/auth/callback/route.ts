import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth/validation';
import { accountSetupIssue, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const target = safeNextPath(request.nextUrl.searchParams.get('next'));
  const code = request.nextUrl.searchParams.get('code');
  const issue = accountSetupIssue();
  if (issue || !code) return NextResponse.redirect(new URL('/signup?verification=unavailable', request.url));

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/signup?verification=invalid', request.url));
    const response = NextResponse.redirect(new URL(target, request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return NextResponse.redirect(new URL('/signup?verification=unavailable', request.url));
  }
}
