import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, sameOriginRequest } from '@/lib/billing/http';
import { readBoundedRawBody } from '@/lib/billing/core';
import { billingSchemaReady, getVerifiedUser } from '@/lib/billing/server';

export const dynamic = 'force-dynamic';
const playbookInput = z.object({
  title: z.string().trim().min(1).max(80),
  subject: z.string().trim().max(160).default(''),
  body: z.string().trim().min(1).max(4_000),
}).strict();

export async function GET() {
  if (!await billingSchemaReady()) return jsonError('Cloud playbooks are not configured yet.', 503);
  const session = await getVerifiedUser();
  if (!session) return jsonError('Sign in with a verified account to continue.', 401);
  const { data, error } = await session.supabase
    .from('pro_reply_playbooks')
    .select('id, title, subject, body, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) return jsonError('Playbooks are temporarily unavailable.', 503);
  return NextResponse.json({ playbooks: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError('Request origin could not be verified.', 403);
  if (!await billingSchemaReady()) return jsonError('Cloud playbooks are not configured yet.', 503);
  const session = await getVerifiedUser();
  if (!session) return jsonError('Sign in with a verified account to continue.', 401);
  const raw = await readBoundedRawBody(request, 6_000);
  if (raw === null) return jsonError('Invalid playbook.', 400);
  let input: z.infer<typeof playbookInput>;
  try {
    input = playbookInput.parse(JSON.parse(raw));
  } catch {
    return jsonError('Check the playbook title, subject, and reply text.', 400);
  }
  const { data, error } = await session.supabase
    .from('pro_reply_playbooks')
    .insert({ user_id: session.user.id, ...input })
    .select('id, title, subject, body, created_at, updated_at')
    .single();
  if (error) {
    if (error.code === '42501' || /row-level security/i.test(error.message)) return jsonError('An active Pro subscription is required to save cloud playbooks.', 403);
    return jsonError('Playbooks are temporarily unavailable.', 503);
  }
  return NextResponse.json({ playbook: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
