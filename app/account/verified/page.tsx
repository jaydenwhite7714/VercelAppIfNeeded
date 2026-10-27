'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { AuthFrame } from '@/components/auth/AuthForm';
import { Button } from '@/components/ui';

type SessionState = { verified?: boolean; authenticated?: boolean; error?: string };

export default function VerifiedPage() {
  const [state, setState] = useState<SessionState | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/account/session', { cache: 'no-store' })
      .then(async (response) => ({ response, data: await response.json() as SessionState }))
      .then(({ data }) => { if (active) setState(data); })
      .catch(() => { if (active) setState({ error: 'Account status could not be confirmed.' }); });
    return () => { active = false; };
  }, []);

  const verified = state?.authenticated && state.verified;
  return (
    <AuthFrame
      title={verified ? 'Email verified.' : 'Check your verification link.'}
      description={verified ? 'Your account email is confirmed. You can sign in and keep a private cloud backup of your Unbilled workspace.' : 'We could not confirm the account status in this browser. The link may be expired, or account setup may still be incomplete.'}
    >
      {verified ? <div className="flex items-center gap-2 rounded-lg border border-sage/30 bg-sage-soft/60 p-3 text-sm text-sage"><CheckCircle2 className="h-4 w-4" /> Email access confirmed by the authentication provider.</div> : <p role="status" className="rounded-lg border border-line bg-paper/60 p-3 text-xs leading-relaxed text-ink-mute">{state?.error ?? 'Checking verification status…'}</p>}
      <Link href="/signin" className="mt-5 block"><Button variant="accent" className="w-full">Continue to sign in <ArrowRight className="h-4 w-4" /></Button></Link>
    </AuthFrame>
  );
}
