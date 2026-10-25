'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, CornerDownRight, Lock, Sparkles } from 'lucide-react';
import { analyzeMessage, type AnalyzedAsk } from '@/lib/engine/analyze';
import { demoProject, DEMO_MESSAGE, DEMO_MESSAGE_ALT, DEMO_MESSAGE_SHORT, DEMO_SCOPE } from '@/lib/demo';
import { hoursLabel, money } from '@/lib/format';
import { draftFor } from '@/lib/scripts';
import { VerdictChip } from '@/components/brand';
import { Button, CopyButton, Spinner, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

const SAMPLES = [
  { label: '“Quick thing…”', text: DEMO_MESSAGE },
  { label: '“Nothing fancy”', text: DEMO_MESSAGE_ALT },
  { label: '“Just a quick export”', text: DEMO_MESSAGE_SHORT },
];

export function ScopeCheckDemo({ compact = false }: { compact?: boolean }) {
  const [rate, setRate] = useState(95);
  const [message, setMessage] = useState(DEMO_MESSAGE);
  const [result, setResult] = useState<{ asks: AnalyzedAsk[]; total: number; hours: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [openDraft, setOpenDraft] = useState<number | null>(null);

  const project = useMemo(() => demoProject(rate), [rate]);

  function check() {
    if (!message.trim()) return;
    setPending(true);
    setOpenDraft(null);
    window.setTimeout(() => {
      const { asks } = analyzeMessage(message, { project, rate, rushMultiplier: 1.5 });
      const billable = asks.filter((ask) => ask.verdict !== 'covered');
      setResult({
        asks,
        total: billable.reduce((sum, ask) => sum + ask.value, 0),
        hours: billable.reduce((sum, ask) => sum + ask.hours, 0),
      });
      setPending(false);
    }, 380);
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-line bg-card shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/70 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage" />
          </span>
          <span className="mono-label text-ink-soft">Scope check · live demo</span>
        </div>
        <span className="mono-label flex items-center gap-1.5 normal-case tracking-[0.04em] text-ink-mute">
          <Lock className="h-3 w-3" /> runs in your browser
        </span>
      </div>

      <div className="px-4 pb-4 pt-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{project.name}</p>
            <p className="mono-label mt-0.5 normal-case tracking-[0.04em]">Agreed scope loaded · {DEMO_SCOPE.length} items</p>
          </div>
          <label className="flex items-center gap-1.5 rounded-lg border border-line bg-paper/60 px-2 py-1">
            <span className="mono-label">rate</span>
            <span className="text-[13px] text-ink-mute">$</span>
            <input
              type="number"
              min={10}
              max={600}
              value={rate}
              onChange={(event) => setRate(Math.max(10, Math.min(600, Number(event.target.value) || 10)))}
              className="w-12 bg-transparent text-right text-[13px] font-medium tnum outline-none"
              aria-label="Your hourly rate"
            />
            <span className="text-[11px] text-ink-mute">/h</span>
          </label>
        </div>

        <Textarea
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setResult(null);
          }}
          className={cn('resize-none bg-paper/40 text-[13px] leading-relaxed', compact ? 'h-32' : 'h-40')}
          placeholder="Paste the client message here…"
          aria-label="Client message"
        />

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mono-label mr-1">Try</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setMessage(sample.text);
                setResult(null);
                setOpenDraft(null);
              }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
                message === sample.text
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong/70 bg-card text-ink-soft hover:border-ink/40 hover:text-ink',
              )}
            >
              {sample.label}
            </button>
          ))}
        </div>

        <Button onClick={check} variant="accent" className="mt-3 w-full" size="md" loading={pending}>
          {pending ? 'Reading the message' : 'Check this message'}
          {!pending ? <Sparkles className="h-3.5 w-3.5" /> : null}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {result ? (
          <motion.div
            key="result"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-dashed border-line-strong/80" />
            <div className="bg-paper/50 px-4 py-4 sm:px-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="mono-label">Outside your scope</p>
                  <p className="mt-1 font-display text-[34px] leading-none tracking-[-0.03em] tnum">
                    {money(result.total, 'USD')}
                  </p>
                </div>
                <p className="max-w-[45%] pb-1 text-right text-[11.5px] leading-snug text-ink-mute">
                  {result.asks.filter((ask) => ask.verdict !== 'covered').length} requests · {hoursLabel(result.hours)} of
                  work you would have done for free
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {result.asks.map((ask, index) => {
                  const draft = draftFor(ask.verdict === 'covered' ? 'absorb' : 'bill', {
                    userName: 'You',
                    businessName: 'Your studio',
                    clientName: project.clientName,
                    projectName: project.name,
                    askTitle: ask.title,
                    hours: ask.hours,
                    value: ask.value,
                    currency: 'USD',
                    tone: 'warm',
                    dueDate: project.dueDate,
                    changeOrderNumber: 'CO-001',
                    matchedScope: ask.reasons[0]?.text,
                  });
                  return (
                    <motion.li
                      key={`${ask.title}-${index}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + index * 0.05 }}
                      className="rounded-xl border border-line bg-card px-3 py-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <VerdictChip verdict={ask.verdict} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium leading-snug text-ink">{ask.title}</p>
                          <p className="mt-1 text-[11.5px] text-ink-mute">
                            <span className="tnum">{hoursLabel(ask.hours)}</span> ·{' '}
                            <span className="tnum">{money(ask.value, 'USD')}</span> · {ask.workLabel}
                          </p>
                          {ask.reasons[0] ? (
                            <p className="mt-1.5 flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
                              <CornerDownRight className="mt-[2px] h-3 w-3 shrink-0 text-ink-mute" />
                              {ask.reasons[0].text}
                            </p>
                          ) : null}
                          {ask.verdict !== 'covered' ? (
                            <button
                              type="button"
                              onClick={() => setOpenDraft(openDraft === index ? null : index)}
                              className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent-deep link-underline"
                            >
                              {openDraft === index ? 'Hide the reply' : 'See the reply it writes'}
                              <ChevronDown className={cn('h-3 w-3 transition-transform', openDraft === index && 'rotate-180')} />
                            </button>
                          ) : null}
                          <AnimatePresence>
                            {openDraft === index ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 rounded-lg border border-line bg-paper/70 p-3">
                                  <p className="mono-label mb-1.5">Subject</p>
                                  <p className="text-[12px] font-medium text-ink">{draft.subject}</p>
                                  <p className="mono-label mb-1.5 mt-2.5">Reply</p>
                                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-ink-soft">
                                    {draft.body}
                                  </p>
                                  <CopyButton value={`${draft.subject}\n\n${draft.body}`} label="Copy reply" className="mt-2.5" />
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-snug text-ink-mute">
                  That took 5 seconds. The awkward 20-minute draft takes longer.
                </p>
                <Link href="/onboarding" className="shrink-0">
                  <Button size="sm" variant="primary">
                    Do this for real <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {pending ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 border-t border-line bg-paper/80 py-2 text-[11px] text-ink-mute">
          <Spinner /> Splitting the message into requests…
        </div>
      ) : null}
    </div>
  );
}
