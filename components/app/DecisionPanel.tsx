'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, FileSignature, HandHeart, HelpCircle, Mail, MailX } from 'lucide-react';
import type { Ask, Project, Settings } from '@/lib/types';
import { VERDICT_META } from '@/lib/types';
import { decideAsk, scriptContextFor, updateAsk } from '@/lib/db';
import { draftFor } from '@/lib/scripts';
import type { Decision } from '@/lib/scripts';
import { buildSharedOrder, encodeSharedOrder, shareUrl } from '@/lib/codec';
import { hoursLabel, money } from '@/lib/format';
import { Button, CopyButton, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { VerdictChip } from '@/components/brand';
import { cn } from '@/lib/cn';
import { useGuestAccess } from '@/components/auth/GuestAccess';

const DECISIONS: { value: Decision; title: string; blurb: string; icon: typeof HandHeart }[] = [
  { value: 'absorb', title: 'Absorb it', blurb: 'Do it free, with a cap and a trade.', icon: HandHeart },
  { value: 'bill', title: 'Bill it', blurb: 'Create a change order and send the link.', icon: FileSignature },
  { value: 'decline', title: 'Decline it', blurb: 'A warm no, with an alternative.', icon: MailX },
  { value: 'clarify', title: 'Hold it', blurb: 'Ask replace-or-add before starting.', icon: HelpCircle },
];

export function DecisionPanel({
  ask,
  project,
  settings,
  open,
  onClose,
  initialDecision,
}: {
  ask: Ask;
  project: Project;
  settings: Settings;
  open: boolean;
  onClose: () => void;
  initialDecision?: Decision;
}) {
  const { push } = useToast();
  const { tryAction, recordAction } = useGuestAccess();
  const savingRef = useRef(false);
  const [decision, setDecision] = useState<Decision>(initialDecision ?? (ask.verdict === 'covered' ? 'absorb' : 'bill'));
  const [hours, setHours] = useState(ask.hours);
  const [value, setValue] = useState(ask.value);
  const [timelineDays, setTimelineDays] = useState(2);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState<string | undefined>();
  const [coNumber, setCoNumber] = useState<string | undefined>();
  const [coId, setCoId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDecision(initialDecision ?? (ask.verdict === 'covered' ? 'absorb' : 'bill'));
    setHours(ask.hours);
    setValue(ask.value);
    setSaved(false);
    setError(null);
    setLink(undefined);
    setCoNumber(undefined);
    setCoId(undefined);
  }, [open, ask.id, ask.hours, ask.value, ask.verdict, initialDecision]);

  const matchedScope = useMemo(() => {
    const item = project.scope.find((entry) => entry.id === ask.matchedScopeId);
    return item?.label;
  }, [project.scope, ask.matchedScopeId]);

  const draft = useMemo(
    () =>
      draftFor(decision, {
        ...scriptContextFor({ settings, project, ask: { title: ask.title, hours, value }, matchedScope }),
        changeOrderNumber: coNumber ?? 'CO-001',
        changeOrderLink: link,
        timelineNote:
          decision === 'bill'
            ? timelineDays > 0
              ? `Delivery moves ${timelineDays} business day${timelineDays === 1 ? '' : 's'}.`
              : 'No change to the delivery date.'
            : undefined,
      }),
    [decision, settings, project, ask.title, hours, value, matchedScope, coNumber, link, timelineDays],
  );

  useEffect(() => {
    if (!open) return;
    setSubject(draft.subject);
    setBody(draft.body);
  }, [open, draft.subject, draft.body]);

  const rushMultiplier = ask.rush ? Math.max(1, settings.rushMultiplier) : 1;
  const suggestedValue = Math.round(hours * project.rate * rushMultiplier);

  async function save() {
    if (savingRef.current) return;
    const nextStatus = decision === 'absorb' ? 'absorbed' : decision === 'bill' ? 'billed' : decision === 'decline' ? 'declined' : 'clarified';
    const isNewDecision = ask.status !== nextStatus;
    if (isNewDecision && !tryAction()) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      if (ask.verdict !== (decision === 'absorb' ? 'covered' : 'extra')) {
        // keep the engine verdict unless the user overrides hours; nothing to do here
      }
      const result = await decideAsk(ask.id, decision, settings, { hours, value, timelineDays });
      if (isNewDecision) recordAction();
      if (decision === 'bill' && result.changeOrder) {
        const shared = buildSharedOrder(result.changeOrder, project.name, project.clientName, project.clientEmail, settings);
        const encoded = encodeSharedOrder(shared);
        const url = shareUrl(encoded);
        setLink(url);
        setCoNumber(result.changeOrder.number);
        setCoId(result.changeOrder.id);
        const withLink = draftFor('bill', {
          ...scriptContextFor({ settings, project, ask: { title: ask.title, hours, value }, matchedScope }),
          changeOrderNumber: result.changeOrder.number,
          changeOrderLink: url,
          timelineNote: result.changeOrder.timelineImpact,
        });
        setSubject(withLink.subject);
        setBody(withLink.body);
        push(`${result.changeOrder.number} created with a share link.`);
      } else {
        push('Logged. The ledger has been updated.');
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the decision.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function overrideVerdict(verdict: Ask['verdict']) {
    await updateAsk(ask.id, { verdict });
    push('Verdict overridden.');
  }

  const mailto = project.clientEmail
    ? `mailto:${project.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={ask.title}
      description={`${project.name} · ${project.clientName} · ${hoursLabel(ask.hours)} estimated · ${money(ask.value, settings.currency)} at your rate`}
      footer={
        saved ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[12.5px] text-sage">
              <Check className="h-4 w-4" /> Logged to the ledger.
            </p>
            <div className="flex flex-wrap gap-2">
              {coId ? (
                <Link href={`/app/change-orders/${coId}`}>
                  <Button size="sm" variant="outline">
                    Open change order <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              ) : null}
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11.5px] text-ink-mute">
              {decision === 'bill' ? 'Creates a change order with a shareable approval link.' : 'Creates a ledger entry — no change order.'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                {decision === 'bill' ? 'Create change order' : 'Log decision'}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-line bg-paper/50 p-3">
          <p className="mono-label mb-1.5">Client&apos;s words</p>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">“{ask.sourceText}”</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium">Engine verdict</p>
            <VerdictChip verdict={ask.verdict} />
          </div>
          <ul className="mt-2 space-y-1.5">
            {ask.reasons.map((reason) => (
              <li key={reason.text} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
                <span
                  className={cn(
                    'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                    reason.tone === 'good' ? 'bg-sage' : reason.tone === 'bad' ? 'bg-accent' : 'bg-gold',
                  )}
                />
                {reason.text}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mono-label">disagree?</span>
            {(['covered', 'gray', 'extra'] as const).map((verdict) => (
              <button
                key={verdict}
                type="button"
                onClick={() => overrideVerdict(verdict)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                  ask.verdict === verdict
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong/70 bg-card text-ink-soft hover:border-ink/40 hover:text-ink',
                )}
              >
                {VERDICT_META[verdict].short}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Hours" hint="Your estimate, not ours.">
            <Input
              type="number"
              min={0}
              step={0.25}
              value={hours}
              onChange={(event) => {
                const next = Number(event.target.value);
                setHours(next);
                setValue(Math.round(next * project.rate * rushMultiplier));
              }}
              className="tnum"
            />
          </Field>
          <Field label={`Fee (${settings.currency})`} hint={ask.rush ? 'Rush premium applied.' : 'Editable.'}>
            <Input type="number" min={0} value={value} onChange={(event) => setValue(Number(event.target.value))} className="tnum" />
          </Field>
          <div className="flex flex-col justify-end">
            <p className="mono-label mb-1.5">at your rate</p>
            <div className="rounded-[10px] border border-dashed border-line-strong bg-paper/50 px-3 py-2">
              <p className="text-[13px] tnum text-ink">{money(value, settings.currency)}</p>
              <p className="text-[10.5px] text-ink-mute">
                suggested {money(suggestedValue, settings.currency)}
                {ask.rush ? ' · rush' : ''}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium">Your move</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DECISIONS.map((option) => {
              const Icon = option.icon;
              const active = decision === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDecision(option.value)}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    active ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink/30',
                  )}
                >
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-paper' : 'text-ink-mute')} strokeWidth={1.8} />
                  <span>
                    <span className="block text-[13px] font-medium">{option.title}</span>
                    <span className={cn('mt-0.5 block text-[11.5px] leading-snug', active ? 'text-paper/65' : 'text-ink-mute')}>
                      {option.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {decision === 'bill' ? (
          <Field label="Timeline impact" hint="Shown on the change order and in the email.">
            <Select value={timelineDays} onChange={(event) => setTimelineDays(Number(event.target.value))}>
              <option value={0}>No change to the delivery date</option>
              <option value={1}>+1 business day</option>
              <option value={2}>+2 business days</option>
              <option value={5}>+1 week</option>
              <option value={10}>+2 weeks</option>
            </Select>
          </Field>
        ) : null}

        <div className="rounded-xl border border-line bg-card p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="mono-label">The reply</p>
            <div className="flex items-center gap-2">
              <CopyButton value={`${subject}\n\n${body}`} label="Copy email" />
              {mailto ? (
                <a href={mailto}>
                  <Button size="sm" variant="outline">
                    <Mail className="h-3.5 w-3.5" /> Email it
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 h-9 text-[12.5px]" aria-label="Email subject" />
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-2 min-h-52 text-[12.5px] leading-relaxed" aria-label="Email body" />
          {link ? (
            <div className="mt-2 rounded-lg border border-sage/25 bg-sage-soft/60 p-2.5">
              <p className="mono-label text-sage">approval link included</p>
              <p className="mt-1 break-all text-[11px] text-ink-soft">{link}</p>
              <CopyButton value={link} label="Copy link" className="mt-2" variant="subtle" />
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-[12.5px] text-accent-deep">{error}</p> : null}
      </div>
    </Modal>
  );
}
