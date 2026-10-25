'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, FileSignature, MessageSquareText, Zap } from 'lucide-react';
import type { Ask, Project, Settings } from '@/lib/types';
import { ASK_STATUS_META } from '@/lib/types';
import { hoursLabel, money, relativeTime } from '@/lib/format';
import type { Decision } from '@/lib/scripts';
import { VerdictChip } from '@/components/brand';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const STATUS_TONE: Record<Ask['status'], 'neutral' | 'accent' | 'sage' | 'gold'> = {
  open: 'neutral',
  absorbed: 'gold',
  billed: 'sage',
  declined: 'neutral',
  clarified: 'neutral',
};

export function AskCard({
  ask,
  project,
  settings,
  onDecide,
  showProject = false,
  compact = false,
}: {
  ask: Ask;
  project?: Project;
  settings: Settings;
  onDecide: (decision?: Decision) => void;
  showProject?: boolean;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const reasons = expanded ? ask.reasons : ask.reasons.slice(0, 1);
  const canDecide = ask.status === 'open';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-card transition-shadow hover:shadow-[var(--shadow-paper)]',
        compact ? 'px-3 py-2.5' : 'px-3.5 py-3',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-[2.5px]',
          ask.verdict === 'extra' ? 'bg-accent' : ask.verdict === 'gray' ? 'bg-gold' : 'bg-sage/60',
        )}
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <VerdictChip verdict={ask.verdict} size="sm" />
          <div className="min-w-0">
            <p className={cn('font-medium leading-snug text-ink', compact ? 'text-[13px]' : 'text-[13.5px]')}>{ask.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-ink-mute">
              <span className="tnum">Est. {hoursLabel(ask.hours)}</span>
              <span aria-hidden>·</span>
              <span className="tnum">{money(ask.value, settings.currency)}</span>
              <span aria-hidden>·</span>
              <span>{ask.workLabel}</span>
              {showProject && project ? (
                <>
                  <span aria-hidden>·</span>
                  <Link href={`/app/projects/${project.id}`} className="link-underline hover:text-ink">
                    {project.clientName}
                  </Link>
                </>
              ) : null}
              {!showProject ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{relativeTime(ask.createdAt)}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {ask.rush ? (
            <Badge tone="accent">
              <Zap className="h-2.5 w-2.5" /> rush
            </Badge>
          ) : null}
          {ask.status !== 'open' ? <Badge tone={STATUS_TONE[ask.status]}>{ASK_STATUS_META[ask.status].label}</Badge> : null}
        </div>
      </div>

      {reasons.length ? (
        <ul className="mt-1.5 space-y-1 pl-[2px]">
          {reasons.map((reason) => (
            <li key={reason.text} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
              <span
                className={cn(
                  'mt-[5px] h-1 w-1 shrink-0 rounded-full',
                  reason.tone === 'good' ? 'bg-sage' : reason.tone === 'bad' ? 'bg-accent' : 'bg-gold',
                )}
              />
              {reason.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {ask.reasons.length > 1 ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-0.5 text-[11px] text-ink-mute transition-colors hover:text-ink"
          >
            {expanded ? 'Less' : 'Why'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1 text-[11px] text-ink-mute transition-colors hover:text-ink"
        >
          <MessageSquareText className="h-3 w-3" /> {expanded ? 'Hide message' : 'Message'}
        </button>
        {ask.changeOrderId ? (
          <Link href={`/app/change-orders/${ask.changeOrderId}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-sage">
            <FileSignature className="h-3 w-3" /> View change order
          </Link>
        ) : null}

        {canDecide ? (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11.5px]" onClick={() => onDecide('absorb')}>
              Absorb
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11.5px]" onClick={() => onDecide('decline')}>
              Decline
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11.5px]" onClick={() => onDecide('clarify')}>
              Hold
            </Button>
            <Button size="sm" className="h-7 px-2.5 text-[11.5px]" onClick={() => onDecide('bill')}>
              Bill it
            </Button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2">
          <p className="rounded-lg border border-line bg-paper/60 px-2.5 py-2 text-[11.5px] leading-relaxed text-ink-soft">
            “{ask.sourceText}”
          </p>
          <button type="button" onClick={() => onDecide()} className="text-[11px] font-medium text-accent-deep link-underline">
            {ask.status === 'open' ? 'Open full decision' : 'Review or change the decision'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
