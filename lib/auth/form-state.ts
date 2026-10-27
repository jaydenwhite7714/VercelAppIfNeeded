import {
  emailOnlySchema,
  passwordUpdateSchema,
  signInSchema,
  signupSchema,
} from '@/lib/auth/validation';

export type AuthMode = 'signup' | 'signin' | 'reset' | 'verify' | 'update-password';
export type AuthSetup = { providerConfigured: boolean; databaseReady: boolean; emailReady: boolean };
export type AuthValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function getAuthSetupBlockers(mode: AuthMode, setup: AuthSetup | null): string[] {
  if (!setup) return ['Checking account service readiness.'];
  if (!setup.providerConfigured) {
    return ['Supabase is not configured for this Preview. Account signup is unavailable; you can continue using Unbilled locally.'];
  }

  const blockers: string[] = [];
  if (!setup.databaseReady) {
    blockers.push('The Preview readiness flag SUPABASE_AUTH_SCHEMA_READY is not true. The database migration may already be applied, but the app still requires this explicit owner-controlled check.');
  }
  if ((mode === 'signup' || mode === 'reset' || mode === 'verify') && !setup.emailReady) {
    blockers.push('The Preview readiness flag SUPABASE_EMAIL_DELIVERY_READY is not true. No signup, verification, or recovery email request will be made until email delivery has been tested and this gate is intentionally enabled.');
  }
  return blockers;
}

export function getAuthFieldErrors(mode: AuthMode, values: AuthValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const parsed = mode === 'signup'
    ? signupSchema.safeParse(values)
    : mode === 'signin'
      ? signInSchema.safeParse(values)
      : mode === 'reset' || mode === 'verify'
        ? emailOnlySchema.safeParse(values)
        : passwordUpdateSchema.safeParse(values);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !errors[field]) errors[field] = issue.message;
    }
  }

  // More useful messages for empty fields than format/strength errors.
  if (mode === 'signup' && !values.username.trim()) errors.username = 'Enter a username.';
  if (mode !== 'update-password' && !values.email.trim()) errors.email = 'Enter your email address.';
  if ((mode === 'signup' || mode === 'signin' || mode === 'update-password') && !values.password) errors.password = 'Enter your password.';
  if ((mode === 'signup' || mode === 'update-password') && !values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  return errors;
}

export function isAuthSubmitDisabled(
  mode: AuthMode,
  values: AuthValues,
  setup: AuthSetup | null,
  busy: boolean,
): boolean {
  return busy || getAuthSetupBlockers(mode, setup).length > 0 || Object.keys(getAuthFieldErrors(mode, values)).length > 0;
}
