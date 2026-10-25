import { NextResponse } from 'next/server';
import { accountSetupStatus } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(accountSetupStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
