'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  FileSignature,
  Check,
  Download,
  ExternalLink,
  Mail,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { ChangeOrderDocument } from '@/components/app/ChangeOrderDocument';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, SectionLabel, Skeleton, Textarea, useToast } from '@/components/ui';
import {
  deleteChangeOrder,
  markChangeOrderApproved,
  markChangeOrderSent,
  markChangeOrderDeclined,
  updateChangeOrder,
} from '@/lib/db';
import { useChangeOrder, useProject, useReadySettings } from '@/lib/hooks';
import { buildSharedOrder, encodeSharedOrder, MAX_SHARE_LENGTH, parseApprovalReceipt, shareUrl, type SharedChangeOrder } from '@/lib/codec';
import { downloadChangeOrderPdf } from '@/lib/pdf';
import { draftFor } from '@/lib/scripts';
import { formatDate, money } from '@/lib/format';
import type { ChangeOrderItem } from '@/lib/types';

export default function ChangeOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const { settings } = useReadySettings();
  const order = useChangeOrder(params?.id);
  const project = useProject(order?.projectId);

  const [share, setShare] = useState<{ url: string; tooLong: boolean; shared: SharedChangeOrder } | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTimeline, setEditTimeline] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editItems, setEditItems] = useState<ChangeOrderItem[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order || !project || !settings) return;
    const shared = buildSharedOrder(order, project.name, project.clientName, project.clientEmail, settings);
    const encoded = encodeSharedOrder(shared);
    const url = shareUrl(encoded);
    setShare({ url, tooLong: url.length > MAX_SHARE_LENGTH, shared });
    setApprovedBy(project.clientName);
  }, [order, project, settings]);

  useEffect(() => {
    if (!order) return;
    setEditTitle(order.title);
    setEditSummary(order.summary);
    setEditTimeline(order.timelineImpact);
    setEditValidUntil(order.validUntil ?? '');
    setEditItems(order.items);
  }, [order]);

  const email = useMemo(() => {
    if (!order || !project || !settings || !share) return null;
    return draftFor('bill', {
      userName: settings.name,
      businessName: settings.businessName,
      clientName: project.clientName,
      projectName: project.name,
      askTitle: order.title,
      hours: order.items.reduce((sum, item) => sum + item.hours, 0),
      value: order.total,
      currency: settings.currency,
      tone: settings.tone,
      dueDate: project.dueDate,
      changeOrderNumber: order.number,
      changeOrderLink: share.url,
      validUntil: order.validUntil,
      timelineNote: order.timelineImpact,
    });
  }, [order, project, settings, share]);

  if (!settings) return null;

  if (order === undefined || project === undefined) {
    return (
      <div>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-4 h-9 w-2/3" />
        <Skeleton className="mt-6 h-[520px] w-full" />
      </div>
    );
  }

  if (order === null || project === null) {
    return (
      <EmptyState
        title="Change order not found"
        description="It may have been deleted. Change orders live in this browser, alongside the rest of your ledger."
        action={
          <Link href="/app/change-orders">
            <Button size="sm">All change orders</Button>
          </Link>
        }
      />
    );
  }

  const mailto =
    project.clientEmail && email
      ? `mailto:${project.clientEmail}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
      : undefined;

  async function saveEdit() {
    if (!order) return;
    setSaving(true);
    setEditError(null);
    try {
      const items = editItems.map((item) => ({ ...item, amount: Math.round(item.hours * item.rate) }));
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      await updateChangeOrder(order.id, {
        title: editTitle,
        summary: editSummary,
        timelineImpact: editTimeline,
        validUntil: editValidUntil || undefined,
        items,
        total,
      });
      setEditOpen(false);
      push('Change order updated. The share link is refreshed.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not save this change order.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link href="/app/change-orders" className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-mute transition-colors hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All change orders
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label">{order.number}</span>
            <Badge tone={order.status === 'approved' ? 'sage' : order.status === 'declined' ? 'neutral' : 'gold'}>{order.status}</Badge>
            <span className="mono-label">issued {formatDate(order.createdAt)}</span>
          </div>
          <h1 className="mt-2 text-[clamp(1.55rem,3.2vw,2rem)] font-semibold leading-tight tracking-[-0.03em]">{order.title}</h1>
          <p className="mt-1 text-[13px] text-ink-mute">
            {project.name} · {project.clientName} · {money(order.total, settings.currency)} additional fee
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {order.status === 'draft' ? (
            <Button variant="outline" size="sm" onClick={() => { setEditError(null); setEditOpen(true); }}>
              <Pencil className="h-3.5 w-3.5" /> Edit draft
            </Button>
          ) : null}
          {share ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadChangeOrderPdf(share.shared);
                push('PDF downloaded.');
              }}
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          ) : null}
        </div>
      </div>

      {order.status === 'approved' ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sage/25 bg-sage-soft/60 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
            <div>
              <p className="text-[13px] font-medium text-sage">Approved by {order.approvedBy || project.clientName}</p>
              <p className="text-[11.5px] text-sage/80">
                {order.approvedAt ? formatDate(order.approvedAt) : ''} · {money(order.total, settings.currency)} approved order value
                {order.approvalId ? ` · receipt checksum ${order.approvalId}` : ''}
              </p>
            </div>
          </div>
          <Link href="/app/reports">
            <Button size="sm" variant="subtle">
              See it in the report
            </Button>
          </Link>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div>{share ? <ChangeOrderDocument order={share.shared} /> : <Skeleton className="h-[560px]" />}</div>

        <div className="space-y-4">
          <Card className="p-4">
            <SectionLabel>Send for approval</SectionLabel>
            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-mute">
              The whole document travels in the link&apos;s fragment — no account, no server, nothing to log in to.
            </p>
            {share ? (
              <>
                <div className="mt-3 rounded-lg border border-line bg-paper/60 p-2.5">
                  <p className="break-all font-mono text-[10px] leading-relaxed text-ink-mute">{share.url}</p>
                </div>
                {share.tooLong ? (
                  <p className="mt-2 rounded-lg border border-gold/30 bg-gold-soft px-2.5 py-2 text-[11px] leading-relaxed text-gold">
                    This document is large for a link. Send the PDF instead, or trim the terms and summary.
                  </p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(share.url);
                        push('Approval link copied.');
                      } catch {
                        push('Could not copy — select the link manually.', 'error');
                      }
                    }}
                  >
                    Copy link
                  </Button>
                  <Link href={share.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3.5 w-3.5" /> Preview
                    </Button>
                  </Link>
                </div>
              </>
            ) : null}

            {email ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mono-label">ready to send</p>
                <p className="mt-1 text-[12px] font-medium leading-snug">{email.subject}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`);
                      push('Email copied.');
                    }}
                  >
                    Copy email
                  </Button>
                  {mailto ? (
                    <a href={mailto}>
                      <Button size="sm" variant="outline">
                        <Mail className="h-3.5 w-3.5" /> Open mail app
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <SectionLabel>Status</SectionLabel>
            <div className="mt-3 space-y-2">
              <Button
                variant={order.status === 'sent' ? 'subtle' : 'outline'}
                size="sm"
                className="w-full justify-start"
                disabled={order.status === 'approved'}
                onClick={async () => {
                  await markChangeOrderSent(order.id);
                  push('Marked as sent. The clock on the validity window starts now.');
                }}
              >
                <Send className="h-3.5 w-3.5" /> Mark as sent
              </Button>
              <Button
                variant={order.status === 'approved' ? 'subtle' : 'outline'}
                size="sm"
                className="w-full justify-start"
                disabled={order.status === 'approved'}
                onClick={() => setApproveOpen(true)}
              >
                <Check className="h-3.5 w-3.5" /> Record approval
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={order.status === 'approved'}
                onClick={() => {
                  setReceiptError(null);
                  setReceiptText('');
                  setReceiptOpen(true);
                }}
              >
                <FileSignature className="h-3.5 w-3.5" /> Paste approval receipt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={order.status === 'declined' || order.status === 'approved'}
                onClick={async () => {
                  await markChangeOrderDeclined(order.id);
                  push('Marked as declined. The request stays in the ledger.');
                }}
              >
                <X className="h-3.5 w-3.5" /> Mark as declined
              </Button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
              After confirming on the share page, the client can copy or download a text receipt. Bring it back manually;
              matching details do not authenticate who sent it.
            </p>
          </Card>

          <Card className="p-4">
            <SectionLabel>Details</SectionLabel>
            <dl className="mt-2.5 space-y-1.5 text-[12px]">
              {[
                ['Items', String(order.items.length)],
                ['Hours', `${order.items.reduce((sum, item) => sum + item.hours, 0)}`],
                ['Valid until', order.validUntil ? formatDate(order.validUntil) : '—'],
                ['Created', formatDate(order.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-mute">{label}</dt>
                  <dd className="tnum">{value}</dd>
                </div>
              ))}
            </dl>
            {order.status === 'draft' ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-accent-deep transition-opacity hover:opacity-70"
              >
                <Trash2 className="h-3 w-3" /> Delete draft change order
              </button>
            ) : (
              <p className="mt-3 text-[11px] text-ink-mute">This {order.status} record is kept to preserve the approval history.</p>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Record the approval"
        description="Record the change order as approved only after you receive confirmation through your own channel. This status does not verify identity or payment."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!order) return;
                await markChangeOrderApproved(order.id, approvedBy || project.clientName, share?.shared.checksum);
                setApproveOpen(false);
                push('Approved. Added to the ledger.');
              }}
            >
              Mark approved
            </Button>
          </div>
        }
      >
        <Field label="Approved by" hint="The name on the client's email is fine.">
          <Input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        wide
        title="Edit change order"
        description="Amounts are calculated from hours × rate. The share link updates automatically."
        footer={
          <div className="flex items-center justify-between">
            <span className="mono-label tnum">
              total {money(editItems.reduce((sum, item) => sum + Math.round(item.hours * item.rate), 0), settings.currency)}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} loading={saving}>
                Save changes
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {editError ? <p role="alert" className="rounded-lg border border-accent/25 bg-accent-soft px-3 py-2 text-[12px] leading-relaxed text-accent-deep">{editError}</p> : null}
          <Field label="Title">
            <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
          </Field>
          <Field label="Summary">
            <Textarea value={editSummary} onChange={(event) => setEditSummary(event.target.value)} className="min-h-20 text-[13px]" />
          </Field>
          <Field label="Timeline impact">
            <Input value={editTimeline} onChange={(event) => setEditTimeline(event.target.value)} />
          </Field>
          <Field label="Valid until" optional>
            <Input type="date" value={editValidUntil} onChange={(event) => setEditValidUntil(event.target.value)} />
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium">Line items</p>
            <div className="space-y-2">
              {editItems.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-line bg-paper/40 p-2.5">
                  <Input
                    value={item.description}
                    onChange={(event) =>
                      setEditItems((items) => items.map((entry) => (entry.id === item.id ? { ...entry, description: event.target.value } : entry)))
                    }
                    className="h-9 text-[12.5px]"
                    aria-label={`Item ${index + 1} description`}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex flex-1 items-center gap-1.5 rounded-lg border border-line bg-card px-2 py-1">
                      <span className="mono-label">hrs</span>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={item.hours}
                        onChange={(event) =>
                          setEditItems((items) =>
                            items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, hours: Number(event.target.value), amount: Math.round(Number(event.target.value) * entry.rate) }
                                : entry,
                            ),
                          )
                        }
                        className="w-12 bg-transparent text-right text-[12px] tnum outline-none"
                      />
                    </label>
                    <label className="flex flex-1 items-center gap-1.5 rounded-lg border border-line bg-card px-2 py-1">
                      <span className="mono-label">rate</span>
                      <input
                        type="number"
                        min={0}
                        value={item.rate}
                        onChange={(event) =>
                          setEditItems((items) =>
                            items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, rate: Number(event.target.value), amount: Math.round(entry.hours * Number(event.target.value)) }
                                : entry,
                            ),
                          )
                        }
                        className="w-16 bg-transparent text-right text-[12px] tnum outline-none"
                      />
                    </label>
                    <span className="w-20 text-right text-[12.5px] tnum">{money(Math.round(item.hours * item.rate), settings.currency)}</span>
                    <button
                      type="button"
                      onClick={() => setEditItems((items) => items.filter((entry) => entry.id !== item.id))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute hover:bg-accent-soft hover:text-accent-deep"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() =>
                setEditItems((items) => [
                  ...items,
                  { id: Math.random().toString(36).slice(2), description: 'Additional work', hours: 1, rate: project.rate, amount: project.rate },
                ])
              }
            >
              Add line item
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title="Paste the client's approval receipt"
        description="Check that the receipt's amount, currency, order number and checksum match this version before recording it. This does not authenticate who approved or prove the text is genuine."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReceiptOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const parsed = parseApprovalReceipt(receiptText);
                if (!parsed) {
                  setReceiptError('This receipt is incomplete or malformed. Paste the full receipt generated from the client approval page.');
                  return;
                }
                if (
                  !share ||
                  parsed.checksum !== share.shared.checksum ||
                  parsed.changeOrderNumber !== share.shared.number ||
                  parsed.total !== share.shared.total ||
                  parsed.currency !== share.shared.currency
                ) {
                  setReceiptError('The receipt details do not match this version of the change order. Re-send the current link if it was updated.');
                  return;
                }
                await markChangeOrderApproved(order.id, parsed.approvedBy, parsed.checksum, parsed.approvedAt);
                setReceiptOpen(false);
                push('Receipt details match — approval recorded.');
              }}
            >
              Verify & record
            </Button>
          </div>
        }
      >
        <Field label="Receipt text" hint="Paste everything the client sent back.">
          <Textarea
            value={receiptText}
            onChange={(event) => {
              setReceiptText(event.target.value);
              setReceiptError(null);
            }}
            className="min-h-44 font-mono text-[11px] leading-relaxed"
            placeholder={'CHANGE ORDER APPROVAL\nChange order: CO-001 — Add a pricing page\nApproved by: Maya Chen\nApproved at: ...'}
          />
        </Field>
        {receiptError ? (
          <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] leading-relaxed text-accent-deep">{receiptError}</p>
        ) : null}
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this change order?"
        description="The linked request returns to undecided. The document cannot be recovered."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="accent"
              onClick={async () => {
                await deleteChangeOrder(order.id);
                router.push('/app/change-orders');
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-soft">
          {order.number} — {order.title} · {money(order.total, settings.currency)}
        </p>
      </Modal>
    </>
  );
}
