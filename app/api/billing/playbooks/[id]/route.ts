import { jsonError, sameOriginRequest } from '@/lib/billing/http';
import { billingSchemaReady, getVerifiedUser } from '@/lib/billing/server';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOriginRequest(request)) return jsonError('Request origin could not be verified.', 403);
  if (!await billingSchemaReady()) return jsonError('Cloud playbooks are not configured yet.', 503);
  const session = await getVerifiedUser();
  if (!session) return jsonError('Sign in with a verified account to continue.', 401);
  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError('Playbook not found.', 404);
  const { data, error } = await session.supabase
    .from('pro_reply_playbooks')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select('id')
    .maybeSingle();
  if (error) {
    if (error.code === '42501' || /row-level security/i.test(error.message)) return jsonError('An active Pro subscription is required to manage cloud playbooks.', 403);
    return jsonError('Playbooks are temporarily unavailable.', 503);
  }
  if (!data) return jsonError('Playbook not found.', 404);
  return Response.json({ deleted: true }, { headers: { 'Cache-Control': 'no-store' } });
}
