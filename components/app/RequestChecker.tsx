'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Plus, ScanSearch, Sparkles } from 'lucide-react';
import { analyzeMessage, type AnalyzedAsk } from '@/lib/engine/analyze';
import type { Ask, Project, Settings, Verdict } from '@/lib/types';
import { saveAsk, saveAsks, uid } from '@/lib/db';
import { SAMPLE_MESSAGES } from '@/lib/engine/parse';
import { hoursLabel, money } from '@/lib/format';
import { Button, Card, EmptyState, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { VerdictChip } from '@/components/brand';
import { cn } from '@/lib/cn';

interface DraftAsk extends AnalyzedAsk {
  included: boolean;
  key: string;
}

export function RequestChecker({
  projects,
  asks,
  settings,
  defaultProjectId,
}: {
  projects: Project[];
  asks: Ask[];
  settings: Settings;
  defaultProjectId?: string;
}) {
  const { push } = useToast();
  const activeProjects = projects.filter((project) => project.status !== 'complete');
  const [projectId, setProjectId] = useState(defaultProjectId ?? activeProjects[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<DraftAsk[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [added, setAdded] = useState(0);
  const [manual, setManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualHours, setManualHours] = useState(2);

  const project = activeProjects.find((entry) => entry.id === projectId) ?? activeProjects[0];

  const totals = useMemo(() => {
    if (!drafts) return { count: 0, value: 0, hours: 0 };
    const included = drafts.filter((draft) => draft.included);
    return {
      count: included.length,
      value: included.reduce((sum, draft) => sum + draft.value, 0),
      hours: included.reduce((sum, draft) => sum + draft.hours, 0),
    };
  }, [drafts]);

  function check() {
    if (!project || !message.trim()) return;
    setChecking(true);
    setAdded(0);
    window.setTimeout(() => {
      try {
        const { asks: analyzed } = analyzeMessage(message, {
          project,
          rate: project.rate,
          rushMultiplier: settings.rushMultiplier,
          existingAsks: asks.filter((existing) => existing.projectId === project.id),
        });
        setDrafts(
          analyzed.map((ask) => ({
            ...ask,
            key: uid(),
            included: ask.verdict !== 'covered',
          })),
        );
      } catch (error) {
        push(error instanceof Error ? error.message : 'Could not analyze that message.', 'error');
      } finally {
        setChecking(false);
      }
    }, 340);
  }

  function updateDraft(key: string, patch: Partial<DraftAsk>) {
    setDrafts((current) => current?.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)) ?? null);
  }

  async function addToLedger() {
    if (!project || !drafts) return;
    const selected = drafts.filter((draft) => draft.included);
    if (!selected.length) return;
    setSaving(true);
    try {
      await saveAsks(selected.map((draft) => ({
        projectId: project.id,
        title: draft.title,
        sourceText: draft.text,
        verdict: draft.verdict,
        confidence: draft.confidence,
        reasons: draft.reasons,
        matchedScopeId: draft.matchedScopeId,
        workLabel: draft.workLabel,
        hours: draft.hours,
        value: draft.value,
        rush: draft.rush,
      })));
      setAdded(selected.length);
      setDrafts(null);
      setMessage('');
      push(`${selected.length} request${selected.length === 1 ? '' : 's'} added to the ledger.`);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save the requests. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addManual() {
    if (!project || !manualTitle.trim() || manualSaving) return;
    setManualSaving(true);
    try {
      await saveAsk({
        projectId: project.id,
        title: manualTitle.trim(),
        sourceText: manualTitle.trim(),
        verdict: 'extra',
        confidence: 1,
        reasons: [{ tone: 'neutral', text: 'Added manually.' }],
        hours: manualHours,
        value: Math.round(manualHours * project.rate),
        rush: false,
      });
      push('Request added.');
      setManualTitle('');
      setManual(false);
      setAdded((value) => value + 1);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not add the request.', 'error');
    } finally {
      setManualSaving(false);
    }
  }

  if (!activeProjects.length) {
    return (
      <EmptyState
        icon={<ScanSearch className="h-5 w-5" />}
        title="Add a project first"
        description="The checker compares a client message against an agreed scope. Create one project — it takes about a minute."
        action={
          <Link href="/app/projects">
            <Button size="sm">
              Go to projects <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/60 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="mono-label text-ink-soft">Scope check</span>
        </div>
        <span className="mono-label normal-case tracking-[0.03em]">Nothing leaves this page</span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Check against">
            <Select value={project?.id ?? ''} onChange={(event) => setProjectId(event.target.value)}>
              {activeProjects.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} — {entry.clientName}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-[10px] border border-line bg-paper/50 px-3 py-2">
            <p className="mono-label">rate</p>
            <p className="text-[13px] tnum">{money(project?.rate ?? 0, settings.currency)}/h</p>
          </div>
        </div>

        <div className="mt-3">
          <Field label="Paste the client message">
            <Textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setDrafts(null);
              }}
              placeholder="Paste the email, Slack message, or the whole thread. Any request hiding in it gets found."
              className="min-h-32 bg-paper/40 text-[13px] leading-relaxed"
            />
          </Field>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mono-label mr-1">Examples</span>
            {SAMPLE_MESSAGES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setMessage(sample.text);
                  setDrafts(null);
                }}
                className="rounded-full border border-line-strong/70 bg-card px-2.5 py-1 text-[11.5px] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={check} loading={checking} disabled={!message.trim()} className="flex-1 sm:flex-none">
            {checking ? 'Reading' : 'Check the message'}
            {!checking ? <ScanSearch className="h-4 w-4" /> : null}
          </Button>
          <Button variant="ghost" onClick={() => setManual((value) => !value)}>
            <Plus className="h-3.5 w-3.5" /> Add manually
          </Button>
          {added ? (
            <Link href="/app/requests" className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-sage">
              {added} added — view requests <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {manual ? (
          <div className="mt-3 rounded-xl border border-line bg-paper/40 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto] sm:items-end">
              <Field label="Request">
                <Input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Add a pricing page" />
              </Field>
              <Field label="Hours">
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  value={manualHours}
                  onChange={(event) => setManualHours(Number(event.target.value))}
                  className="tnum"
                />
              </Field>
              <Button onClick={addManual} loading={manualSaving} disabled={!manualTitle.trim()} variant="outline">
                Add request
              </Button>
            </div>
          </div>
        ) : null}

        {drafts ? (
          drafts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-paper/40 px-4 py-6 text-center">
              <p className="text-[13px] font-medium">No requests found in that message.</p>
              <p className="mt-1 text-[12px] text-ink-mute">
                If it is pure pleasantries, that is good news. Otherwise add the request manually above.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-dashed border-line-strong pt-3">
                <div>
                  <p className="mono-label">Found in the message</p>
                  <p className="mt-1 text-[13px]">
                    <span className="font-medium">{totals.count}</span> selected ·{' '}
                    <span className="tnum">Est. {hoursLabel(totals.hours)}</span> ·{' '}
                    <span className="tnum font-medium">{money(totals.value, settings.currency)}</span> outside your scope
                  </p>
                </div>
                <Button onClick={addToLedger} loading={saving} disabled={!totals.count} size="sm">
                  Add {totals.count || ''} to ledger <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <ul className="mt-3 space-y-2">
                {drafts.map((draft) => (
                  <li
                    key={draft.key}
                    className={cn(
                      'rounded-xl border bg-card px-3 py-2.5 transition-opacity',
                      draft.included ? 'border-line' : 'border-line/60 opacity-55',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={draft.included}
                        onChange={(event) => updateDraft(draft.key, { included: event.target.checked })}
                        className="mt-1 h-3.5 w-3.5 shrink-0 accent-[#14161A]"
                        aria-label={`Include “${draft.title}”`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <VerdictChip verdict={draft.verdict} size="sm" />
                          <p className="text-[13px] font-medium leading-snug">{draft.title}</p>
                        </div>
                        <p className="mt-1 text-[11.5px] text-ink-mute">
                          {draft.workLabel}
                          {draft.rush ? ' · rush deadline' : ''}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {draft.reasons.slice(0, 2).map((reason) => (
                            <li key={reason.text} className="text-[11.5px] leading-snug text-ink-soft">
                              — {reason.text}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Select
                            value={draft.verdict}
                            onChange={(event) => updateDraft(draft.key, { verdict: event.target.value as Verdict })}
                            className="h-7 w-auto px-2 py-0 text-[11px]"
                            aria-label="Verdict"
                          >
                            <option value="covered">Covered</option>
                            <option value="gray">Gray</option>
                            <option value="extra">Extra</option>
                          </Select>
                          <label className="flex items-center gap-1 rounded-md border border-line bg-paper/50 px-1.5 py-1 text-[11px]">
                            <span className="text-ink-mute">h</span>
                            <input
                              type="number"
                              min={0}
                              step={0.25}
                              value={draft.hours}
                              onChange={(event) => {
                                const hours = Number(event.target.value);
                                updateDraft(draft.key, {
                                  hours,
                                  value: Math.round(hours * (project?.rate ?? 0) * (draft.rush ? settings.rushMultiplier : 1)),
                                });
                              }}
                              className="w-10 bg-transparent text-right tnum outline-none"
                              aria-label="Hours"
                            />
                          </label>
                          <label className="flex items-center gap-1 rounded-md border border-line bg-paper/50 px-1.5 py-1 text-[11px]">
                            <span className="text-ink-mute">{settings.currency}</span>
                            <input
                              type="number"
                              min={0}
                              value={draft.value}
                              onChange={(event) => updateDraft(draft.key, { value: Number(event.target.value) })}
                              className="w-14 bg-transparent text-right tnum outline-none"
                              aria-label="Value"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : null}
      </div>
    </Card>
  );
}
