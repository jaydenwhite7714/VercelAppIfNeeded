'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BadgeCheck, Check, Download, Mail, ShieldCheck } from 'lucide-react';
import { ChangeOrderDocument } from '@/components/app/ChangeOrderDocument';
import { Button, Card, CopyButton, Field, Input, Modal, Skeleton, Textarea } from '@/components/ui';
import { approvalReceipt, decodeSharedOrder, isChangeOrderExpired, type SharedChangeOrder } from '@/lib/codec';
import { downloadChangeOrderPdf } from '@/lib/pdf';
import { Wordmark } from '@/components/brand';
import { money } from '@/lib/format';

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'corrupted' }
  | { status: 'ready'; order: SharedChangeOrder };

export default function ClientChangeOrderPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');
  const [approvedAt, setApprovedAt] = useState<number | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      setState({ status: 'empty' });
      return;
    }
    const { order, corrupted } = decodeSharedOrder(hash);
    if (!order) {
      setState({ status: 'corrupted' });
      return;
    }
    if (corrupted) {
      setState({ status: 'corrupted' });
      return;
    }
    setState({ status: 'ready', order });
    setApprovedBy(order.clientName);
  }, []);

  const order = state.status === 'ready' ? state.order : null;
  const expired = isChangeOrderExpired(order?.validUntil);

  const receipt = useMemo(() => {
    if (!order || !approvedAt) return '';
    return approvalReceipt(order, approvedBy || order.clientName, approvedAt);
  }, [order, approvedAt, approvedBy]);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Wordmark />
          <span className="mono-label flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-sage" /> private link
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        {state.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-[520px] w-full" />
          </div>
        ) : state.status === 'empty' ? (
          <Card className="p-6 text-center sm:p-10">
            <AlertTriangle className="mx-auto h-6 w-6 text-gold" />
            <h1 className="mt-3 text-[22px]">This link is missing its document.</h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft">
              A change order link carries the document after the <code className="rounded bg-paper-deep px-1">#</code>. Some
              email clients or chat apps strip that part. Ask the sender to resend the full link, or send the PDF instead.
            </p>
          </Card>
        ) : state.status === 'corrupted' ? (
          <Card className="p-6 text-center sm:p-10">
            <AlertTriangle className="mx-auto h-6 w-6 text-accent" />
            <h1 className="mt-3 text-[22px]">This document could not be verified.</h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft">
              The link may have been cut short, or the contents were changed after it was created. Do not approve it —
              ask the sender for a fresh link or a PDF copy.
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-5">
              <p className="mono-label text-accent">Change order for review</p>
              <h1 className="mt-2 text-[clamp(1.7rem,3.8vw,2.2rem)] font-semibold leading-tight tracking-[-0.03em]">
                {order!.fromBusiness || order!.fromName} has sent you a change order.
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-soft">
                {order!.number} for {order!.projectName}. It covers work outside the original agreement:{' '}
                <span className="font-medium text-ink">{money(order!.total, order!.currency)}</span> additional fee. Review
                the details, then approve or ask a question.
              </p>
            </div>

            <ChangeOrderDocument order={order!} />

            {approvedAt ? (
              <Card className="mt-5 border-sage/30 bg-sage-soft/50 p-5">
                <div className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
                  <div className="min-w-0">
                    <h2 className="text-[17px] text-sage">Approved — here is your receipt.</h2>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                      Nothing is sent automatically. Copy the receipt below and reply to {order!.fromName}
                      {order!.fromEmail ? ` (${order!.fromEmail})` : ''} so it is on record. A timestamped receipt gives both sides a copy of the decision.
                    </p>
                    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-card p-3 font-mono text-[10.5px] leading-relaxed text-ink-soft">
                      {receipt}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyButton value={receipt} label="Copy receipt" variant="primary" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob([receipt], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `${order!.number}-approval.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" /> Download receipt
                      </Button>
                      {order!.fromEmail ? (
                        <a
                          href={`mailto:${order!.fromEmail}?subject=${encodeURIComponent(`Approved: ${order!.number} — ${order!.title}`)}&body=${encodeURIComponent(receipt)}`}
                        >
                          <Button size="sm" variant="outline">
                            <Mail className="h-3.5 w-3.5" /> Email approval
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            ) : declined ? (
              <Card className="mt-5 p-5">
                <h2 className="text-[17px]">Decline noted on this device.</h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                  Nothing was sent. To make it official, reply to {order!.fromName}
                  {order!.fromEmail ? ` at ${order!.fromEmail}` : ''} and say the change is not approved for now. A short
                  note is enough — no explanation is required.
                </p>
                {order!.fromEmail ? (
                  <a
                    className="mt-3 inline-block"
                    href={`mailto:${order!.fromEmail}?subject=${encodeURIComponent(`Re: ${order!.number} — ${order!.title}`)}&body=${encodeURIComponent(
                      `Hi ${order!.fromName},\n\nThanks for sending ${order!.number}. I'm not able to approve this change right now. Let's keep the current plan as agreed and revisit this separately.\n\nBest,\n${order!.clientName}`,
                    )}`}
                  >
                    <Button size="sm" variant="outline">
                      <Mail className="h-3.5 w-3.5" /> Open the decline email
                    </Button>
                  </a>
                ) : null}
              </Card>
            ) : expired ? (
              <Card className="mt-5 border-gold/30 bg-gold-soft/40 p-5">
                <h2 className="text-[17px]">This change order has expired.</h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                  The review date was {order!.validUntil}. This link is read-only now; ask {order!.fromName} for an updated proposal before approving.
                </p>
                {order!.fromEmail ? <a className="mt-3 inline-block" href={`mailto:${order!.fromEmail}?subject=${encodeURIComponent(`Updated change order requested: ${order!.number}`)}`}><Button size="sm" variant="outline"><Mail className="h-3.5 w-3.5" /> Ask for an updated proposal</Button></a> : null}
              </Card>
            ) : (
              <Card className="mt-5 p-5">
                <h2 className="text-[17px]">Your decision</h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                  Approving here creates a receipt in your browser. Send it back to make the approval official — it
                  includes the document checksum, your name, and a timestamp.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => setApproveOpen(true)}>
                    <Check className="h-4 w-4" /> Approve this change
                  </Button>
                  {order!.fromEmail ? (
                    <a
                      href={`mailto:${order!.fromEmail}?subject=${encodeURIComponent(`Question about ${order!.number} — ${order!.title}`)}&body=${encodeURIComponent(
                        `Hi ${order!.fromName},\n\nThanks for sending ${order!.number}. A couple of questions before I approve:\n\n1. \n2. \n\nBest,\n${order!.clientName}`,
                      )}`}
                    >
                      <Button variant="outline">
                        <Mail className="h-4 w-4" /> Ask a question
                      </Button>
                    </a>
                  ) : null}
                  <Button variant="ghost" onClick={() => setDeclined(true)}>
                    Decline for now
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      downloadChangeOrderPdf(order!);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Download a PDF copy
                  </Button>
                  <span className="mono-label normal-case tracking-[0.03em]">
                    Checksum {order!.checksum} · verified in your browser
                  </span>
                </div>
              </Card>
            )}

            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <p className="mono-label">No account required · nothing uploaded</p>
              <p className="max-w-md text-[11px] leading-relaxed text-ink-mute">
                This change order was created with Unbilled, a free-work ledger for freelancers. The document travelled
                inside the link itself, so no server has seen it.
              </p>
              <a href="/" className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-ink link-underline">
                What is Unbilled? <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </>
        )}
      </main>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve this change order"
        description="Type the name that should appear on the approval receipt."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setApprovedAt(Date.now());
                setApproveOpen(false);
              }}
              disabled={!approvedBy.trim()}
            >
              Confirm approval
            </Button>
          </div>
        }
      >
        <Field label="Your name" hint="This is recorded on the receipt, not sent anywhere.">
          <Input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} placeholder="Maya Chen" autoFocus />
        </Field>
        <div className="mt-4">
          <Field label="Optional note to the sender" optional>
            <Textarea placeholder="Anything you want them to know before they start." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
