'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, Mail, ShieldCheck, X } from 'lucide-react';
import { decodeSharedScope, type SharedScope } from '@/lib/codec';
import { Button, Card, copyText, CopyButton, Skeleton, useToast } from '@/components/ui';
import { Wordmark } from '@/components/brand';
import { formatDate } from '@/lib/format';

type State = { status: 'loading' } | { status: 'empty' } | { status: 'corrupted' } | { status: 'ready'; scope: SharedScope };

export default function SharedScopePage() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      setState({ status: 'empty' });
      return;
    }
    const { scope, corrupted } = decodeSharedScope(hash);
    setState(scope && !corrupted ? { status: 'ready', scope } : { status: 'corrupted' });
  }, []);

  const scope = state.status === 'ready' ? state.scope : null;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Wordmark />
          <span className="mono-label flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-sage" /> shared scope
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        {state.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : state.status === 'empty' || state.status === 'corrupted' ? (
          <Card className="p-6 text-center sm:p-10">
            <AlertTriangle className={`mx-auto h-6 w-6 ${state.status === 'corrupted' ? 'text-accent' : 'text-gold'}`} />
            <h1 className="mt-3 text-[22px]">
              {state.status === 'corrupted' ? 'This scope could not be verified.' : 'This link is missing its scope.'}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft">
              The full scope travels after the <code className="rounded bg-paper-deep px-1">#</code> in the link, which some
              apps strip. Ask the sender to resend the complete link.
            </p>
          </Card>
        ) : (
          <>
            <p className="mono-label text-accent">Agreed scope of work</p>
            <h1 className="mt-2 text-[clamp(1.7rem,4vw,2.2rem)] font-semibold leading-tight tracking-[-0.03em]">
              {scope!.projectName}
            </h1>
            <p className="mt-1.5 text-[13px] text-ink-mute">
              Prepared for {scope!.clientName} by {scope!.fromBusiness || scope!.fromName} ·{' '}
              {scope!.dueDate ? `delivery ${formatDate(scope!.dueDate, { year: undefined })}` : formatDate(scope!.issuedAt)}
            </p>
            <p role="note" className="mt-3 rounded-lg border border-gold/30 bg-gold-soft/40 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-soft">
              This scope is carried in the link itself, not encrypted or access-controlled. Anyone with the URL can view it; share it only with intended recipients.
            </p>

            <Card className="mt-5 overflow-hidden">
              <div className="border-b border-line bg-paper/50 px-5 py-3">
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  This is a plain-language summary of what is included in the fee, so we are working from the same map. If
                  something is not listed here, it is not assumed to be included — we will quote it first.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="mono-label text-sage">Included</p>
                  <span className="mono-label">{scope!.deliverables.length + scope!.included.length} items</span>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {scope!.deliverables.map((item, index) => (
                    <li key={`d-${index}`} className="flex items-start gap-2.5 rounded-lg border border-line bg-card px-3 py-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" strokeWidth={2.4} />
                      <span className="text-[13px] leading-snug text-ink">{item.l}</span>
                    </li>
                  ))}
                  {scope!.included.map((item, index) => (
                    <li key={`i-${index}`} className="flex items-start gap-2.5 rounded-lg border border-line bg-paper/40 px-3 py-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage/70" strokeWidth={2.4} />
                      <span className="text-[13px] leading-snug text-ink-soft">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-4">
                  <p className="mono-label text-accent-deep">Not included</p>
                  <span className="mono-label">quoted separately</span>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {scope!.excluded.map((item, index) => (
                    <li key={`e-${index}`} className="flex items-start gap-2.5 rounded-lg border border-accent/15 bg-accent-soft/40 px-3 py-2">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.4} />
                      <span className="text-[13px] leading-snug text-ink-soft">{item}</span>
                    </li>
                  ))}
                  {scope!.excluded.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-ink-mute">
                      Nothing has been excluded yet — anything outside the list above will be quoted before it starts.
                    </li>
                  ) : null}
                </ul>

                <div className="mt-5 grid gap-2 rounded-xl border border-line bg-paper/50 px-3.5 py-3 sm:grid-cols-2">
                  <div>
                    <p className="mono-label">Revision rounds</p>
                    <p className="mt-0.5 text-[13px]">
                      {scope!.revisionRounds === 0 ? 'None included' : `${scope!.revisionRounds} per deliverable`}
                    </p>
                  </div>
                  <div>
                    <p className="mono-label">Additional work</p>
                    <p className="mt-0.5 text-[13px]">
                      {scope!.rate ? `Billed at ${scope!.currency} ${scope!.rate}/hour, quoted first` : 'Quoted before it starts'}
                    </p>
                  </div>
                </div>

                {scope!.note ? (
                  <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-mute">{scope!.note}</p>
                ) : null}
              </div>
            </Card>

            <Card className="mt-4 p-5">
              <h2 className="text-[17px]">Need something that is not listed?</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                That is completely normal — projects change. Ask, and you will get a short change order with the fee and the
                timeline impact before any work starts. Nothing is added to the invoice by surprise.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {scope!.fromEmail ? (
                  <a
                    href={`mailto:${scope!.fromEmail}?subject=${encodeURIComponent(`A change to ${scope!.projectName}`)}&body=${encodeURIComponent(
                      `Hi ${scope!.fromName},\n\nI'd like to add something to ${scope!.projectName}:\n\n\n\nCould you send a change order with the fee and timing?\n\nThanks,\n${scope!.clientName}`,
                    )}`}
                  >
                    <Button size="sm">
                      <Mail className="h-3.5 w-3.5" /> Request a change
                    </Button>
                  </a>
                ) : (
                  <CopyButton value={`I'd like to add something to ${scope!.projectName} — could you send a change order?`} label="Copy a request" />
                )}
                <Button
                  size="sm"
                  variant="outline"
                onClick={async () => {
                  const ok = await copyText(`${scope!.projectName} — agreed scope, prepared by ${scope!.fromBusiness || scope!.fromName}`);
                  if (ok) {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  } else {
                    push('Could not access the clipboard — select the text and copy manually.', 'error');
                  }
                }}
                >
                  {copied ? 'Copied' : 'Copy summary'}
                </Button>
              </div>
            </Card>

            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <p className="mono-label">No account required · nothing uploaded</p>
              <p className="max-w-md text-[11px] leading-relaxed text-ink-mute">
                This scope was generated with Unbilled, a free-work ledger for freelancers. The document travelled inside the
                link itself, so no server has seen it. Checksum {scope!.checksum}.
              </p>
              <Link href="/" className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-ink link-underline">
                What is Unbilled? <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
