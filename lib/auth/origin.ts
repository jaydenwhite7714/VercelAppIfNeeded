import { getAppOrigin } from '@/lib/supabase/server';

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let parsed: URL;
  try { parsed = new URL(origin); } catch { return false; }
  const allowed = new Set([getAppOrigin(request.url)]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try { allowed.add(new URL(appUrl).origin); } catch { /* Invalid deployment configuration remains disallowed. */ }
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) allowed.add(`https://${vercelUrl}`);
  const fetchSite = request.headers.get('sec-fetch-site');
  return allowed.has(parsed.origin) && (!fetchSite || fetchSite === 'same-origin' || fetchSite === 'same-site');
}
