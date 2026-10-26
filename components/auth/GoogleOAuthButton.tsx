'use client';

import { useState } from 'react';

type Props = { className?: string; label?: string; next?: string };

export function GoogleOAuthButton({ className, label = 'Continue with Google', next = '/app' }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setError(result.error || 'Google sign-in could not be started. Please try again.');
        setBusy(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError('Google sign-in could not be reached. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className={className ?? 'flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:cursor-wait disabled:opacity-60'}
        aria-busy={busy}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[18px] w-[18px]">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 5)" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.47-4.73 7.16l7.64 5.93c4.46-4.12 7.13-10.19 7.13-17.56Z" transform="translate(0 -1)" />
          <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 -1)" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.64-5.93c-2.12 1.43-4.84 2.27-8.26 2.27-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -5)" />
        </svg>
        {busy ? 'Connecting to Google…' : label}
      </button>
      {error ? <p role="alert" className="mt-2 text-left text-xs leading-relaxed text-accent-deep">{error}</p> : null}
    </div>
  );
}
