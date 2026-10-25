'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button, Card, Field, Input } from '@/components/ui';
import { Wordmark } from '@/components/brand';
import { emailOnlySchema, passwordUpdateSchema, signInSchema, signupSchema, normalizeEmail } from '@/lib/auth/validation';

type AuthMode = 'signup' | 'signin' | 'reset' | 'verify' | 'update-password';
type Setup = { providerConfigured: boolean; databaseReady: boolean; emailReady: boolean };

async function sendJson(url: string, payload: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as Record<string, unknown>;
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { error: 'The account service could not be reached. Your local workspace is still available.' } };
  }
}

export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-paper px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" aria-label="Unbilled home"><Wordmark /></Link>
        <Link href="/app" className="text-xs font-medium text-ink-mute underline-offset-4 hover:text-ink hover:underline">Continue without an account</Link>
      </div>
      <div className="mx-auto my-auto w-full max-w-md py-10">
        <div className="mb-5 flex items-center gap-2 text-sage"><LockKeyhole className="h-4 w-4" /><span className="mono-label text-sage">optional account · private workspace backup</span></div>
        <h1 className="text-[clamp(2rem,7vw,2.7rem)] font-semibold leading-tight tracking-[-0.04em]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">{description}</p>
        <Card className="mt-6 p-5 sm:p-6">{children}</Card>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-ink-mute">
          <ShieldCheck className="h-3.5 w-3.5" /> Account data is private to your user. Read our <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
        </p>
      </div>
      <div className="mx-auto w-full max-w-5xl border-t border-line pt-4 text-[11px] text-ink-mute">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft className="h-3 w-3" /> Back to Unbilled</Link>
      </div>
    </main>
  );
}

function SetupNotice({ setup, needsEmail }: { setup: Setup | null; needsEmail: boolean }) {
  if (!setup) return <p role="status" className="mb-4 rounded-lg border border-line bg-paper/60 p-3 text-xs text-ink-mute">Checking account service configuration…</p>;
  const issue = !setup.providerConfigured
    ? 'Account services are not configured yet. You can still use Unbilled locally without an account.'
    : !setup.databaseReady
      ? 'Account database setup is incomplete. Signup and private cloud backup are paused; local workspaces are unaffected.'
      : needsEmail && !setup.emailReady
        ? 'Email delivery is not configured. No verification or recovery message will be requested.'
        : null;
  return issue ? <p role="status" className="mb-4 rounded-lg border border-gold/30 bg-gold-soft/50 p-3 text-xs leading-relaxed text-ink-soft">{issue}</p> : null;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/account/status', { cache: 'no-store' })
      .then(async (response) => ({ response, data: await response.json() as Setup }))
      .then(({ data }) => { if (active) setSetup(data); })
      .catch(() => { if (active) setSetup({ providerConfigured: false, databaseReady: false, emailReady: false }); });
    if (mode === 'signup') {
      const verification = new URLSearchParams(window.location.search).get('verification');
      if (verification === 'invalid') setError('That verification link is invalid, expired, or already used. Request a fresh link.');
      if (verification === 'unavailable') setError('We could not verify that link. Check account setup and try again.');
    }
    if (mode === 'signin' && new URLSearchParams(window.location.search).get('password') === 'updated') {
      setMessage('Password updated. Sign in with your new password.');
    }
    return () => { active = false; };
  }, [mode]);

  const needsEmail = mode === 'signup' || mode === 'reset' || mode === 'verify';
  const setupBlocked = !setup || !setup.providerConfigured || !setup.databaseReady || (needsEmail && !setup.emailReady);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    const input = mode === 'signup'
      ? signupSchema.safeParse({ username, email, password, confirmPassword })
      : mode === 'signin'
        ? signInSchema.safeParse({ email, password })
        : mode === 'reset' || mode === 'verify'
          ? emailOnlySchema.safeParse({ email })
          : passwordUpdateSchema.safeParse({ password, confirmPassword });
    if (!input.success) {
      setError(input.error.issues[0]?.message ?? 'Check the highlighted fields.');
      return;
    }
    if (setupBlocked) {
      setError('Account setup is not ready. Continue with the local workspace or ask the owner to complete provider setup.');
      return;
    }
    setBusy(true);
    try {
      let endpoint = '';
      let payload: unknown = input.data;
      if (mode === 'signup') {
        endpoint = '/api/auth/signup';
        payload = { ...input.data, email: normalizeEmail(email) };
      } else if (mode === 'signin') {
        endpoint = '/api/auth/signin';
        payload = { ...input.data, email: normalizeEmail(email) };
      } else if (mode === 'reset') {
        endpoint = '/api/auth/reset';
        payload = { email: normalizeEmail(email) };
      } else if (mode === 'verify') {
        endpoint = '/api/auth/resend';
        payload = { email: normalizeEmail(email) };
      } else {
        endpoint = '/api/auth/password';
      }
      const result = await sendJson(endpoint, payload);
      if (!result.ok) {
        setError(typeof result.data.error === 'string' ? result.data.error : 'The request failed. Please try again.');
        return;
      }
      if (mode === 'signin') {
        router.replace('/app');
        router.refresh();
        return;
      }
      if (mode === 'update-password') {
        setMessage('Password updated. You can sign in with it now.');
        window.setTimeout(() => router.replace('/signin?password=updated'), 800);
        return;
      }
      setMessage(typeof result.data.message === 'string' ? result.data.message : 'Request accepted. Check your email if an account is eligible.');
    } finally {
      setBusy(false);
    }
  }

  const views: Record<AuthMode, { title: string; description: string; button: string }> = {
    signup: { title: 'Make room for your work.', description: 'Create an account to keep a private cloud backup of your workspace. Your local ledger remains available either way.', button: 'Create account' },
    signin: { title: 'Welcome back.', description: 'Sign in to access your account and private cloud workspace.', button: 'Sign in' },
    reset: { title: 'Get back in.', description: 'Enter your account email. If an account exists, we will request a password-reset email.', button: 'Request reset email' },
    verify: { title: 'Verify your email.', description: 'Request a fresh verification link. We do not reveal whether an address has an account.', button: 'Request verification link' },
    'update-password': { title: 'Choose a new password.', description: 'Use at least 12 characters. The reset link is single-use and expires according to the authentication provider.', button: 'Save new password' },
  };
  const view = views[mode];

  return (
    <AuthFrame title={view.title} description={view.description}>
      <SetupNotice setup={setup} needsEmail={needsEmail} />
      {message ? (
        <div role="status" className="mb-4 flex gap-2 rounded-lg border border-sage/30 bg-sage-soft/60 p-3 text-xs leading-relaxed text-sage">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> <span>{message}</span>
        </div>
      ) : null}
      {error ? <p role="alert" className="mb-4 rounded-lg border border-accent/30 bg-accent-soft/60 p-3 text-xs leading-relaxed text-accent-deep">{error}</p> : null}
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {mode === 'signup' ? (
          <Field label="Username" hint="3–24 characters; start with a letter. Letters, numbers, and underscores.">
            <Input autoComplete="username" autoCapitalize="none" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={24} required />
          </Field>
        ) : null}
        {mode !== 'update-password' ? (
          <Field label="Email address">
            <Input type="email" inputMode="email" autoComplete={mode === 'signin' ? 'username' : 'email'} autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
          </Field>
        ) : null}
        {mode === 'signup' || mode === 'signin' || mode === 'update-password' ? (
          <Field label={mode === 'update-password' ? 'New password' : 'Password'} hint={mode !== 'signin' ? 'At least 12 characters.' : undefined}>
            <Input type="password" autoComplete={mode === 'signin' ? 'current-password' : mode === 'update-password' ? 'new-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} required />
          </Field>
        ) : null}
        {mode === 'signup' || mode === 'update-password' ? (
          <Field label="Confirm password">
            <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} maxLength={128} required />
          </Field>
        ) : null}
        <Button type="submit" variant="accent" className="w-full" loading={busy} disabled={setupBlocked}>{view.button}<ArrowRight className="h-4 w-4" /></Button>
      </form>
      <div className="mt-5 border-t border-line pt-4 text-center text-xs text-ink-mute">
        {mode === 'signup' ? <>Already have an account? <Link href="/signin" className="font-medium text-ink underline underline-offset-4">Sign in</Link></> : null}
        {mode === 'signin' ? <><Link href="/forgot-password" className="underline underline-offset-4">Forgot password?</Link><span className="mx-2">·</span><Link href="/verify-email" className="underline underline-offset-4">Resend verification</Link><p className="mt-3">New to Unbilled? <Link href="/signup" className="font-medium text-ink underline underline-offset-4">Create an account</Link></p></> : null}
        {mode === 'reset' ? <>Remembered it? <Link href="/signin" className="font-medium text-ink underline underline-offset-4">Sign in</Link></> : null}
        {mode === 'verify' ? <>Already verified? <Link href="/signin" className="font-medium text-ink underline underline-offset-4">Sign in</Link></> : null}
        {mode === 'update-password' ? <>Reset link expired? <Link href="/forgot-password" className="font-medium text-ink underline underline-offset-4">Request another</Link></> : null}
      </div>
    </AuthFrame>
  );
}
