import { NextResponse, type NextRequest } from 'next/server';
import { parseOAuthProvider, type OAuthProvider } from '@/lib/auth/oauth';
import { safeNextPath } from '@/lib/auth/validation';
import { accountSetupIssue, accountSetupStatus, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function oauthErrorRedirect(request: NextRequest, provider: OAuthProvider | null, cancelled: boolean) {
  const params = new URLSearchParams({ oauth: cancelled ? 'cancelled' : 'error' });
  if (provider) params.set('provider', provider);
  const response = NextResponse.redirect(new URL(`/signup?${params.toString()}`, request.url));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const flow = request.nextUrl.searchParams.get('flow');
  // Accept an in-flight Google callback created by the previous Google-only initiation route.
  const isOAuthFlow = flow === 'oauth' || flow === 'google';
  const provider = flow === 'google' ? 'google' : flow === 'oauth' ? parseOAuthProvider(request.nextUrl.searchParams.get('provider')) : null;
  const target = safeNextPath(request.nextUrl.searchParams.get('next'));
  const code = request.nextUrl.searchParams.get('code');
  const providerError = request.nextUrl.searchParams.get('error') ?? request.nextUrl.searchParams.get('error_code');

  if (isOAuthFlow && providerError) {
    const normalizedError = providerError.toLowerCase();
    const cancelled = ['access_denied', 'user_cancelled_authorize', 'user_cancelled', 'cancelled'].includes(normalizedError);
    return oauthErrorRedirect(request, provider, cancelled);
  }
  if (isOAuthFlow && !provider) return oauthErrorRedirect(request, null, false);
  if (!code) {
    return isOAuthFlow
      ? oauthErrorRedirect(request, provider, false)
      : NextResponse.redirect(new URL('/signup?verification=invalid', request.url));
  }
  if (isOAuthFlow ? !accountSetupStatus().providerConfigured : Boolean(accountSetupIssue())) {
    return isOAuthFlow
      ? NextResponse.redirect(new URL(`/signup?oauth=unavailable&provider=${provider}`, request.url))
      : NextResponse.redirect(new URL('/signup?verification=unavailable', request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return isOAuthFlow
        ? oauthErrorRedirect(request, provider, false)
        : NextResponse.redirect(new URL('/signup?verification=invalid', request.url));
    }
    const response = NextResponse.redirect(new URL(target, request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return isOAuthFlow
      ? NextResponse.redirect(new URL(`/signup?oauth=unavailable&provider=${provider}`, request.url))
      : NextResponse.redirect(new URL('/signup?verification=unavailable', request.url));
  }
}
