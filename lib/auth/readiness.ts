export type SupabaseEnv = { url: string; key: string };
export type AccountSetupStatus = { providerConfigured: boolean; databaseReady: boolean; emailReady: boolean };

type Env = Record<string, string | undefined>;

export function getSupabaseConfig(env: Env): SupabaseEnv | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null;
  } catch {
    return null;
  }
  return { url, key };
}

export function getAccountSetupStatus(env: Env): AccountSetupStatus {
  return {
    providerConfigured: getSupabaseConfig(env) !== null,
    databaseReady: env.SUPABASE_AUTH_SCHEMA_READY === 'true',
    emailReady: env.SUPABASE_EMAIL_DELIVERY_READY === 'true',
  };
}

export function getAccountSetupIssue(status: AccountSetupStatus, needsEmail = false): string | null {
  if (!status.providerConfigured) return 'Account services are not configured yet. You can continue using the local workspace.';
  if (!status.databaseReady) return 'Account database setup is incomplete. Local-only workspaces remain available.';
  if (needsEmail && !status.emailReady) return 'Email delivery is not configured yet. No verification email was requested.';
  return null;
}
