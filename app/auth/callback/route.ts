import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth/validation';
import { accountSetupIssue, accountSetupStatus, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const isGoogleOAuth = request.nextUrl.searchParams.get('flow') === 'google';
  const target = safeNextPath(request.nextUrl.searchParams.get('next'));
  const code = request.nextUrl.searchParams.get('code');
  const providerError = request.nextUrl.searchParams.get('error');

  if (isGoogleOAuth && providerError) {
    const cancelled = providerError === 'access_denied';
    return NextResponse.redirect(new URL(`/signup?oauth=${cancelled ? 'cancelled' : 'error'}`, request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(isGoogleOAuth ? '/signup?oauth=error' : '/signup?verification=invalid', request.url));
  }
  if (isGoogleOAuth ? !accountSetupStatus().providerConfigured : Boolean(accountSetupIssue())) {
    return NextResponse.redirect(new URL(isGoogleOAuth ? '/signup?oauth=unavailable' : '/signup?verification=unavailable', request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(isGoogleOAuth ? '/signup?oauth=error' : '/signup?verification=invalid', request.url));
    const response = NextResponse.redirect(new URL(target, request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return NextResponse.redirect(new URL(isGoogleOAuth ? '/signup?oauth=unavailable' : '/signup?verification=unavailable', request.url));
  }
}
