'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui';
import { Wordmark } from '@/components/brand';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unbilled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Wordmark />
      <p className="mono-label mt-8 text-accent">Something broke</p>
      <h1 className="mt-3 max-w-xl text-[clamp(1.8rem,4.2vw,2.6rem)] font-semibold leading-tight tracking-[-0.03em]">
        The ledger hit an unexpected error.
      </h1>
      <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-soft">
        Your data is stored in this browser, so nothing was lost. Try again — and if it keeps happening, export a backup
        from settings before doing anything else.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/app">
          <Button variant="outline">Back to the ledger</Button>
        </Link>
      </div>
      {error.digest ? <p className="mono-label mt-6 normal-case tracking-[0.03em]">reference {error.digest}</p> : null}
    </div>
  );
}
