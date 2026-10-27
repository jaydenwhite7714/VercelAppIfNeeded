'use client';

import { useState } from 'react';
import { OAUTH_PROVIDERS, oauthProviderLabel, type OAuthProvider } from '@/lib/auth/oauth';

type Props = { next?: string; className?: string };

function ProviderMark({ provider }: { provider: OAuthProvider }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 5)" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.47-4.73 7.16l7.64 5.93c4.46-4.12 7.13-10.19 7.13-17.56Z" transform="translate(0 -1)" />
        <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 -1)" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.64-5.93c-2.12 1.43-4.84 2.27-8.26 2.27-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -5)" />
      </svg>
    );
  }

  if (provider === 'azure') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
        <path fill="#F35325" d="M1 1h10v10H1z" />
        <path fill="#81BC06" d="M13 1h10v10H13z" />
        <path fill="#05A6F0" d="M1 13h10v10H1z" />
        <path fill="#FFBA08" d="M13 13h10v10H13z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 384 512" aria-hidden="true" className="h-[18px] w-[14px] shrink-0 fill-current">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 44.8-84.7-17.3-24.7-43.4-38.4-77.8-41.1-32.7-2.6-68.4 19.2-81.5 19.2-13.8 0-45.5-18.3-70-18.3C83.5 144.2 27 176.4 27 241.8c0 19.3 3.5 39.2 10.5 59.6 9.3 26.7 42.9 92.1 77.9 91.1 18.3-.4 31.2-13.3 61.9-13.3 29.8 0 41.5 13.3 62.1 13.3 35.3-.5 65.7-59.9 74.6-86.7-47.4-22.3-45.3-65.8-45.3-67.1zM262.5 107.9c25.2-29.9 22.9-57.2 22.2-67-22.3 1.3-48.1 15.2-62.8 32.5-16.2 18.5-25.7 41.4-23.6 67.2 24.1 1.9 46.1-10.5 64.2-32.7z" />
    </svg>
  );
}

export function OAuthProviderButtons({ next = '/app', className }: Props) {
  const [busyProvider, setBusyProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');

  async function start(provider: OAuthProvider) {
    if (busyProvider) return;
    setBusyProvider(provider);
    setError('');
    try {
      const response = await fetch('/api/auth/oauth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, next }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setError(result.error || `${oauthProviderLabel(provider)} sign-in could not be started. Please try again.`);
        setBusyProvider(null);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError(`${oauthProviderLabel(provider)} sign-in could not be reached. Check your connection and try again.`);
      setBusyProvider(null);
    }
  }

  return (
    <div className={`w-full space-y-2 ${className ?? ''}`}>
      {OAUTH_PROVIDERS.map((provider) => {
        const label = oauthProviderLabel(provider);
        const apple = provider === 'apple';
        return (
          <button
            key={provider}
            type="button"
            onClick={() => void start(provider)}
            disabled={busyProvider !== null}
            aria-label={`Continue with ${label}`}
            aria-busy={busyProvider === provider}
            className={`flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${apple ? 'border-black bg-black text-white hover:bg-black/90' : 'border-line-strong bg-card text-ink hover:bg-paper'}`}
          >
            {busyProvider === provider ? (
              <span className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
            ) : <ProviderMark provider={provider} />}
            {busyProvider === provider ? `Connecting to ${label}…` : `Continue with ${label}`}
          </button>
        );
      })}
      {error ? <p role="alert" aria-live="polite" className="rounded-lg border border-accent/25 bg-accent-soft/60 px-3 py-2 text-xs leading-relaxed text-accent-deep">{error}</p> : null}
    </div>
  );
}
