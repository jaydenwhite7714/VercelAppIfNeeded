import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { readJsonBody } from '@/lib/auth/request';
import { z } from 'zod';
import { validateWorkspace } from '@/lib/workspace-schema';
import { accountSetupIssue, createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const MAX_WORKSPACE_BYTES = 5 * 1024 * 1024;
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const workspaceWriteSchema = z.object({
  expectedUpdatedAt: z.string().nullable(),
  workspace: z.unknown(),
}).strict();
const workspaceDeleteSchema = z.object({ expectedUpdatedAt: z.string() }).strict();
type VerifiedAuth =
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; user: User }
  | { ok: false; response: NextResponse };

async function getVerifiedClient(): Promise<VerifiedAuth> {
  const issue = accountSetupIssue();
  if (issue) return { ok: false, response: NextResponse.json({ error: issue }, { status: 503, headers: privateHeaders }) };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { ok: false, response: NextResponse.json({ error: 'Sign in to use private cloud backup.' }, { status: 401, headers: privateHeaders }) };
    if (!user.email_confirmed_at) return { ok: false, response: NextResponse.json({ error: 'Verify your email before using private cloud backup.' }, { status: 403, headers: privateHeaders }) };
    return { ok: true, supabase, user };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Account service is temporarily unavailable.' }, { status: 502, headers: privateHeaders }) };
  }
}

export async function GET(): Promise<NextResponse> {
  const auth = await getVerifiedClient();
  if (!auth.ok) return auth.response;
  try {
    const { data, error } = await auth.supabase
      .from('user_workspaces')
      .select('workspace, updated_at')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not read this account’s private workspace.' }, { status: 502, headers: privateHeaders });
    return NextResponse.json({ workspace: data?.workspace ?? null, updatedAt: data?.updated_at ?? null }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Could not read this account’s private workspace.' }, { status: 502, headers: privateHeaders });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403, headers: privateHeaders });
  const auth = await getVerifiedClient();
  if (!auth.ok) return auth.response;
  const input = await readJsonBody(request, 2_000);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status, headers: privateHeaders });
  const parsed = workspaceDeleteSchema.safeParse(input.value);
  if (!parsed.success || !Number.isFinite(Date.parse(parsed.data.expectedUpdatedAt))) return NextResponse.json({ error: 'The delete request is invalid.' }, { status: 400, headers: privateHeaders });
  try {
    const { data: deleted, error } = await auth.supabase.rpc('delete_own_workspace_snapshot', { p_expected_updated_at: parsed.data.expectedUpdatedAt });
    if (error) return NextResponse.json({ error: 'Could not delete the private cloud backup.' }, { status: 502, headers: privateHeaders });
    if (!deleted) return NextResponse.json({ error: 'The cloud backup changed since you last checked. Refresh before deleting it.' }, { status: 409, headers: privateHeaders });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Could not delete the private cloud backup.' }, { status: 502, headers: privateHeaders });
  }
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified. Reload the page and try again.' }, { status: 403, headers: privateHeaders });
  const auth = await getVerifiedClient();
  if (!auth.ok) return auth.response;
  const input = await readJsonBody(request, MAX_WORKSPACE_BYTES);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status, headers: privateHeaders });
  const parsed = workspaceWriteSchema.safeParse(input.value);
  if (!parsed.success || (parsed.data.expectedUpdatedAt !== null && !Number.isFinite(Date.parse(parsed.data.expectedUpdatedAt)))) {
    return NextResponse.json({ error: 'The cloud save request is invalid. No cloud data was changed.' }, { status: 400, headers: privateHeaders });
  }
  if (!validateWorkspace(parsed.data.workspace)) return NextResponse.json({ error: 'This workspace backup is invalid. No cloud data was changed.' }, { status: 400, headers: privateHeaders });

  try {
    const { data: updatedAt, error } = await auth.supabase.rpc('save_own_workspace_snapshot', {
      p_workspace: parsed.data.workspace,
      p_expected_updated_at: parsed.data.expectedUpdatedAt,
    });
    if (error) return NextResponse.json({ error: 'Could not save this account’s private workspace. Your local copy was left unchanged.' }, { status: 502, headers: privateHeaders });
    if (!updatedAt) return NextResponse.json({ error: 'The cloud backup changed since you last checked. Reload it before saving to avoid overwriting newer data.' }, { status: 409, headers: privateHeaders });
    return NextResponse.json({ ok: true, updatedAt }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Could not save this account’s private workspace. Your local copy was left unchanged.' }, { status: 502, headers: privateHeaders });
  }
}
