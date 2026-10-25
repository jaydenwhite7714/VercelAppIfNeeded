import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { signupSchema, normalizeEmail, normalizeUsername, safeNextPath } from '@/lib/auth/validation';
import { getAccountSetupIssue, getAccountSetupStatus } from '@/lib/auth/readiness';
import { getAuthFieldErrors, getAuthSetupBlockers, isAuthSubmitDisabled } from '@/lib/auth/form-state';

const { accountSetupIssue, auth, createSupabaseServerClient, from, rpc } = vi.hoisted(() => ({
  accountSetupIssue: vi.fn(),
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    updateUser: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
  createSupabaseServerClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  accountSetupIssue,
  createSupabaseServerClient,
  getAppOrigin: (requestUrl: string) => new URL(requestUrl).origin,
  getSupabaseEnv: () => ({ url: 'https://test.supabase.co', key: 'public-test-key' }),
}));

import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as signin } from '@/app/api/auth/signin/route';
import { POST as resend } from '@/app/api/auth/resend/route';
import { POST as reset } from '@/app/api/auth/reset/route';
import { POST as updatePassword } from '@/app/api/auth/password/route';
import { GET as authCallback } from '@/app/auth/callback/route';
import { GET as privateWorkspace } from '@/app/api/account/workspace/route';

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function payload(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

const validSignup = {
  username: 'StudioOwner_1',
  email: '  PERSON@Example.COM ',
  password: 'correct horse battery staple',
  confirmPassword: 'correct horse battery staple',
};

beforeEach(() => {
  vi.clearAllMocks();
  accountSetupIssue.mockReturnValue(null);
  from.mockReset();
  rpc.mockReset();
  createSupabaseServerClient.mockReset();
  createSupabaseServerClient.mockResolvedValue({ auth, from, rpc });
  rpc.mockResolvedValue({ data: true, error: null });
  auth.signUp.mockResolvedValue({ data: { user: { id: 'user-1' }, session: null }, error: null });
  auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1', email_confirmed_at: '2026-10-25T00:00:00Z' } }, error: null });
  auth.resend.mockResolvedValue({ error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email_confirmed_at: '2026-10-25T00:00:00Z' } }, error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

describe('signup readiness and disabled-state behavior', () => {
  const completeValues = {
    username: 'StudioOwner_1',
    email: 'person@example.com',
    password: 'correct horse battery staple',
    confirmPassword: 'correct horse battery staple',
  };
  const readySetup = { providerConfigured: true, databaseReady: true, emailReady: true };

  it('keeps all readiness gates off when their environment variables are unset', () => {
    expect(getAccountSetupStatus({ NEXT_PUBLIC_SUPABASE_URL: 'https://qsjjyhkakqvfcptydqnc.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key' }))
      .toEqual({ providerConfigured: true, databaseReady: false, emailReady: false });
    const status = getAccountSetupStatus({});
    expect(status).toEqual({ providerConfigured: false, databaseReady: false, emailReady: false });
    expect(getAccountSetupIssue(status, true)).toContain('not configured');
  });

  it('requires literal readiness flags and explains both Preview gates without implying delivery', () => {
    const setup = getAccountSetupStatus({
      NEXT_PUBLIC_SUPABASE_URL: 'https://qsjjyhkakqvfcptydqnc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
      SUPABASE_AUTH_SCHEMA_READY: 'TRUE',
      SUPABASE_EMAIL_DELIVERY_READY: 'false',
    });
    expect(setup.databaseReady).toBe(false);
    expect(setup.emailReady).toBe(false);
    expect(getAuthSetupBlockers('signup', setup).join(' ')).toMatch(/SUPABASE_AUTH_SCHEMA_READY/);
    expect(getAuthSetupBlockers('signup', setup).join(' ')).toMatch(/SUPABASE_EMAIL_DELIVERY_READY/);
    expect(getAuthSetupBlockers('signup', setup).join(' ')).toMatch(/No signup.*email request will be made|No signup, verification, or recovery email request will be made/);
  });

  it('disables submit for invalid or incomplete values and enables it only when valid and ready', () => {
    expect(isAuthSubmitDisabled('signup', { ...completeValues, email: 'bad-address' }, readySetup, false)).toBe(true);
    expect(getAuthFieldErrors('signup', { ...completeValues, email: 'bad-address' }).email).toBe('Enter a valid email address.');
    expect(isAuthSubmitDisabled('signup', { ...completeValues, username: '' }, readySetup, false)).toBe(true);
    expect(getAuthFieldErrors('signup', { ...completeValues, username: '' }).username).toBe('Enter a username.');
    expect(isAuthSubmitDisabled('signup', completeValues, { ...readySetup, emailReady: false }, false)).toBe(true);
    expect(isAuthSubmitDisabled('signup', completeValues, readySetup, true)).toBe(true);
    expect(isAuthSubmitDisabled('signup', completeValues, readySetup, false)).toBe(false);
  });
});

describe('account input validation and normalization', () => {
  it('accepts valid signup data and consistently normalizes username and email', () => {
    const parsed = signupSchema.parse(validSignup);
    expect(normalizeEmail(parsed.email)).toBe('person@example.com');
    expect(normalizeUsername(parsed.username)).toBe('studioowner_1');
  });

  it.each(['missing-at.example.com', 'two@@example.com', 'name@', '@example.com', 'a b@example.com'])('rejects malformed email %s', (email) => {
    expect(signupSchema.safeParse({ ...validSignup, email }).success).toBe(false);
  });

  it('rejects missing, weak, mismatched, or overlong passwords and invalid usernames', () => {
    for (const password of ['', 'short', '12345678901']) {
      expect(signupSchema.safeParse({ ...validSignup, password, confirmPassword: password }).success).toBe(false);
    }
    expect(signupSchema.safeParse({ ...validSignup, confirmPassword: 'another password value' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...validSignup, password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) }).success).toBe(false);
    for (const username of ['ab', '1starts_with_number', 'contains-hyphen', 'has space', 'x'.repeat(25)]) {
      expect(signupSchema.safeParse({ ...validSignup, username }).success).toBe(false);
    }
  });

  it('normalizes case so username and email uniqueness checks use stable keys', () => {
    expect(normalizeUsername('  StudioOwner_1 ')).toBe(normalizeUsername('studioowner_1'));
    expect(normalizeEmail('Person@Example.com')).toBe(normalizeEmail('person@example.COM'));
  });

  it('does not allow callback redirects to external URLs', () => {
    expect(safeNextPath('https://attacker.example')).toBe('/app');
    expect(safeNextPath('//attacker.example')).toBe('/app');
    expect(safeNextPath('/account/update-password')).toBe('/account/update-password');
  });
});

describe('provider-backed auth route behavior', () => {
  it('fails closed before any provider call when readiness is unset', async () => {
    accountSetupIssue.mockReturnValue('Email delivery is not configured yet. No verification email was requested.');
    const response = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(response.status).toBe(503);
    expect((await payload(response)).error).toMatch(/No verification email was requested/);
    expect(rpc).not.toHaveBeenCalled();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('requests signup with normalized identifiers and configured verification callback', async () => {
    const response = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(response.status).toBe(200);
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com',
      options: expect.objectContaining({ data: { username: 'studioowner_1' }, emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Faccount%2Fverified') }),
    }));
    expect(String((await payload(response)).message)).not.toMatch(/email sent/i);
  });

  it('rejects malformed emails and weak passwords on the server before calling Supabase', async () => {
    const malformed = await signup(jsonRequest('/api/auth/signup', { ...validSignup, email: 'not-an-email' }));
    const weak = await signup(jsonRequest('/api/auth/signup', { ...validSignup, password: 'short', confirmPassword: 'short' }));
    expect(malformed.status).toBe(400);
    expect(weak.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('maps useful provider validation and email-delivery errors without exposing raw provider details', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Error sending confirmation email: SMTP rejected request' } });
    const deliveryResponse = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(deliveryResponse.status).toBe(503);
    expect((await payload(deliveryResponse)).error).toMatch(/No email delivery was confirmed/);

    auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Password must be at least 12 characters.' } });
    const passwordResponse = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(passwordResponse.status).toBe(400);
    expect((await payload(passwordResponse)).error).toMatch(/at least 12 characters/i);

    auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'upstream internal host and secret detail' } });
    const genericResponse = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(genericResponse.status).toBe(400);
    expect((await payload(genericResponse)).error).not.toContain('upstream internal host');

    auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Email rate limit exceeded.' } });
    const limited = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(limited.status).toBe(429);
    expect((await payload(limited)).error).toMatch(/wait a little while/i);
  });

  it('returns the exact username-conflict message before creating an account when a handle is already taken', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    const response = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(response.status).toBe(409);
    expect((await payload(response)).error).toBe('That username is already taken. Please choose another.');
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('returns the exact username-conflict message from the database uniqueness constraint', async () => {
    auth.signUp.mockResolvedValue({ data: { user: null }, error: { code: '23505', message: 'duplicate key profiles_username_normalized_key' } });
    const response = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(response.status).toBe(409);
    expect((await payload(response)).error).toBe('That username is already taken. Please choose another.');
  });

  it('handles simultaneous case-insensitive duplicate usernames with one success and one conflict', async () => {
    const claimed = new Set<string>();
    auth.signUp.mockImplementation(async ({ options }: { options: { data: { username: string } } }) => {
      const username = options.data.username;
      await Promise.resolve();
      if (claimed.has(username)) return { data: { user: null }, error: { code: '23505', message: 'profiles_username_normalized_key' } };
      claimed.add(username);
      return { data: { user: { id: 'one' }, session: null }, error: null };
    });
    const [first, second] = await Promise.all([
      signup(jsonRequest('/api/auth/signup', { ...validSignup, username: 'SameUser', email: 'first@example.com' })),
      signup(jsonRequest('/api/auth/signup', { ...validSignup, username: 'sameuser', email: 'second@example.com' })),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
  });

  it('does not enumerate existing email addresses and offers the same recovery guidance', async () => {
    auth.signUp.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } });
    const duplicate = await signup(jsonRequest('/api/auth/signup', validSignup));
    auth.signUp.mockResolvedValue({ data: { user: { id: 'new' }, session: null }, error: null });
    const newAccount = await signup(jsonRequest('/api/auth/signup', validSignup));
    const duplicateBody = await payload(duplicate);
    const newAccountBody = await payload(newAccount);
    expect(duplicateBody).toEqual(newAccountBody);
    expect(String(duplicateBody.message)).toMatch(/sign in or reset/i);
  });

  it('does not confirm a signup request when the email provider fails and supports safe retry', async () => {
    auth.signUp.mockRejectedValueOnce(new Error('SMTP provider unavailable'));
    const failed = await signup(jsonRequest('/api/auth/signup', validSignup));
    expect(failed.status).toBe(502);
    expect(String((await payload(failed)).error)).toMatch(/delivery was confirmed/i);
    auth.signUp.mockResolvedValueOnce({ data: { user: { id: 'retry' }, session: null }, error: null });
    expect((await signup(jsonRequest('/api/auth/signup', validSignup))).status).toBe(200);
  });

  it('rejects sign-in before verification, but permits a verified account', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { user: { id: 'user-1', email_confirmed_at: null } }, error: null });
    const unverified = await signin(jsonRequest('/api/auth/signin', { email: 'PERSON@example.com', password: validSignup.password }));
    expect(unverified.status).toBe(403);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    const verified = await signin(jsonRequest('/api/auth/signin', { email: 'person@example.com', password: validSignup.password }));
    expect(verified.status).toBe(200);
    auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Too many requests; rate limit reached.' } });
    const limited = await signin(jsonRequest('/api/auth/signin', { email: 'person@example.com', password: validSignup.password }));
    expect(limited.status).toBe(429);
    expect((await payload(limited)).error).toMatch(/wait a little while/i);
  });

  it('requests email verification with a safe, non-enumerating retry response', async () => {
    const response = await resend(jsonRequest('/api/auth/resend', { email: 'Person@Example.com' }));
    expect(response.status).toBe(200);
    expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ email: 'person@example.com' }));
    expect(String((await payload(response)).message)).toMatch(/if the address has an unverified account/i);
    auth.resend.mockResolvedValueOnce({ error: { message: 'mail service down' } });
    expect((await resend(jsonRequest('/api/auth/resend', { email: 'person@example.com' }))).status).toBe(502);
    auth.resend.mockResolvedValueOnce({ error: { message: 'For security purposes, you can only request this after 60 seconds.' } });
    const limited = await resend(jsonRequest('/api/auth/resend', { email: 'person@example.com' }));
    expect(limited.status).toBe(429);
    expect((await payload(limited)).error).toMatch(/wait a little while/i);
  });

  it('requests password reset without revealing whether the account exists', async () => {
    const response = await reset(jsonRequest('/api/auth/reset', { email: 'Person@Example.com' }));
    expect(response.status).toBe(200);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', expect.objectContaining({ redirectTo: expect.stringContaining('/account/update-password') }));
    expect(String((await payload(response)).message)).toMatch(/if an account exists/i);
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'mail service down' } });
    expect((await reset(jsonRequest('/api/auth/reset', { email: 'person@example.com' }))).status).toBe(502);
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'Email rate limit exceeded.' } });
    const limited = await reset(jsonRequest('/api/auth/reset', { email: 'person@example.com' }));
    expect(limited.status).toBe(429);
    expect((await payload(limited)).error).toMatch(/wait a little while/i);
  });

  it('uses provider single-use callback codes and rejects invalid, expired, or reused links', async () => {
    const request = (code: string) => new NextRequest(`http://localhost:3000/auth/callback?code=${code}&next=%2Faccount%2Fverified`);
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'Invalid or expired token' } });
    const success = await authCallback(request('one-time-code'));
    expect(success.headers.get('location')).toContain('/account/verified');
    const reused = await authCallback(request('one-time-code'));
    expect(reused.headers.get('location')).toContain('verification=invalid');
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'Token expired' } });
    expect((await authCallback(request('expired-code'))).headers.get('location')).toContain('verification=invalid');
  });

  it('updates passwords only for a provider-authenticated recovery/session and validates weak values first', async () => {
    const weak = await updatePassword(jsonRequest('/api/auth/password', { password: 'short', confirmPassword: 'short' }));
    expect(weak.status).toBe(400);
    expect(auth.updateUser).not.toHaveBeenCalled();
    const good = await updatePassword(jsonRequest('/api/auth/password', { password: 'another strong password 42', confirmPassword: 'another strong password 42' }));
    expect(good.status).toBe(200);
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'another strong password 42' });
  });

  it('fails closed for unauthenticated private workspace reads', async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'No session' } });
    const response = await privateWorkspace();
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('queries cloud rows only with the authenticated user ID, never a client-supplied owner', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });
    const response = await privateWorkspace();
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith('user_workspaces');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

describe('database protections and local-data migration', () => {
  it('uses a database unique constraint and auth trigger for atomic case-insensitive usernames', () => {
    const sql = readFileSync('supabase/migrations/20261025000100_accounts_and_private_workspaces.sql', 'utf8');
    expect(sql).toContain('unique (username_normalized)');
    expect(sql).toContain('after insert on auth.users');
    expect(sql).toContain("lower(username)");
  });

  it('isolates cloud rows by the signed-in subject and rejects direct write grants', () => {
    const sql = readFileSync('supabase/migrations/20261025000100_accounts_and_private_workspaces.sql', 'utf8');
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql).toContain('owner_id uuid := auth.uid()');
    expect(sql).toContain('revoke all on public.user_workspaces from anon, authenticated');
    expect(sql).toContain('grant execute on function public.save_own_workspace_snapshot(jsonb, timestamptz) to authenticated');
    expect(sql).toContain('updated_at = p_expected_updated_at');
  });
});
