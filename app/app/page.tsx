'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  FileSignature,
  FolderPlus,
  HandHeart,
  Inbox,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/app/AppShell';
import { AskCard } from '@/components/app/AskCard';
import { DecisionPanel } from '@/components/app/DecisionPanel';
import { ProjectForm } from '@/components/app/ProjectForm';
import { Button, Card, SectionLabel, Skeleton, useToast } from '@/components/ui';
import { useActivity, useAsks, useChangeOrders, useProjects, useReadySettings, computeMetrics } from '@/lib/hooks';
import { seedDemoWorkspace } from '@/lib/db';
import { hoursLabel, money, relativeTime } from '@/lib/format';
import type { Ask, Project } from '@/lib/types';
import type { Decision } from '@/lib/scripts';

const ACTIVITY_DOT: Record<string, string> = {
  absorbed: 'bg-gold',
  billed: 'bg-sage',
  declined: 'bg-ink-mute',
  clarified: 'bg-ink-mute',
  approved: 'bg-sage',
  project: 'bg-ink/40',
  'change-order': 'bg-ink/40',
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Stat({
  label,
  value,
  sub,
  tone = 'default',
  icon,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'default' | 'accent' | 'sage';
  icon?: React.ReactNode;
  href?: string;
}) {
  const content = (
    <Card className="group h-full p-4 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-5">
      <div className="flex items-center justify-between">
        <p className="mono-label">{label}</p>
        {icon}
      </div>
      <p
        className={
          tone === 'accent'
            ? 'mt-3 font-display text-[30px] leading-none tracking-[-0.035em] tnum text-accent-deep sm:text-[34px]'
            : tone === 'sage'
              ? 'mt-3 font-display text-[30px] leading-none tracking-[-0.035em] tnum text-sage sm:text-[34px]'
              : 'mt-3 font-display text-[30px] leading-none tracking-[-0.035em] tnum sm:text-[34px]'
        }
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-snug text-ink-mute">{sub}</p>
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{content}</Link> : content;
}

export default function LedgerPage() {
  const { settings } = useReadySettings();
  const { push } = useToast();
  const projects = useProjects();
  const asks = useAsks();
  const orders = useChangeOrders();
  const activity = useActivity(6);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [decision, setDecision] = useState<{ ask: Ask; project: Project; decision?: Decision } | null>(null);
  const [seeding, setSeeding] = useState(false);

  const metrics = useMemo(() => computeMetrics(projects ?? [], asks ?? [], orders ?? []), [projects, asks, orders]);

  if (!settings) return null;

  const loading = !projects || !asks || !orders;
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
  const lastMonth = metrics.monthly[metrics.monthly.length - 2]?.absorbed ?? 0;
  const delta = lastMonth > 0 ? Math.round(((metrics.absorbedThisMonth - lastMonth) / lastMonth) * 100) : null;
  const openAsks = (asks ?? []).filter((ask) => ask.status === 'open').sort((a, b) => b.value - a.value);
  const activeProjects = (projects ?? []).filter((project) => project.status !== 'complete');
  const pendingOrders = (orders ?? []).filter((order) => order.status === 'draft' || order.status === 'sent');
  const leakTotal = metrics.absorbedAllTime + metrics.billedAllTime;
  const absorbedShare = leakTotal > 0 ? Math.round((metrics.absorbedAllTime / leakTotal) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow={`${monthName} · the ledger`}
        title={`${greeting()}, ${settings.name.split(' ')[0] || 'there'}.`}
        description={
          activeProjects.length
            ? 'Estimated value of absorbed requests, approved change orders, and what is still waiting for a decision.'
            : 'Start with one project and one client message. The ledger does the rest.'
        }
        actions={
          <>
            <Button variant="outline" size="md" onClick={() => setProjectFormOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" /> New project
            </Button>
            <Link href="/app/requests">
              <Button size="md">
                Check a message <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !(projects ?? []).length ? (
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-6 sm:p-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="mono-label">Empty ledger</p>
              <h2 className="mt-3 max-w-[24ch] text-[clamp(1.7rem,3.6vw,2.3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                The first entry is always the same: “it was only a small thing.”
              </h2>
              <p className="mt-3 max-w-[48ch] text-[13.5px] leading-relaxed text-ink-soft">
                Add a project with the scope you agreed to — what is included, what is not, and your rate. Then paste the
                next client message. Unbilled will estimate its value from the hours and rates you enter.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => setProjectFormOpen(true)}>
                  <FolderPlus className="h-3.5 w-3.5" /> Add your first project
                </Button>
                <Button
                  variant="outline"
                  loading={seeding}
                  onClick={async () => {
                    setSeeding(true);
                    try {
                      await seedDemoWorkspace();
                      push('Sample ledger is ready, or it was already present.');
                    } catch (error) {
                      push(error instanceof Error ? error.message : 'Could not load the sample ledger.', 'error');
                    } finally {
                      setSeeding(false);
                    }
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Load a sample ledger
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-paper/60 p-4">
              <p className="mono-label">what a ledger entry looks like</p>
              <div className="mt-3 space-y-2">
                {[
                  ['Add a pricing page', '$380', 'Extra'],
                  ['Swap the hero photo', '$95', 'Covered'],
                  ['One more revision round', '$238', 'Extra'],
                ].map(([title, value, verdict]) => (
                  <div key={title} className="flex items-center justify-between rounded-lg border border-line bg-card px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium">{title}</p>
                      <p className="text-[10.5px] text-ink-mute">{verdict}</p>
                    </div>
                    <span className="text-[12px] tnum">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
                Absorbed, approved, declined, or held. Every request has an estimated value.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Estimated absorbed value · month"
              value={money(metrics.absorbedThisMonth, settings.currency)}
              sub={`Est. ${hoursLabel(metrics.absorbedHours)} across ${metrics.absorbedCountThisMonth} absorbed requests${
                delta !== null ? ` · ${delta > 0 ? '+' : ''}${delta}% vs last month` : ''
              }`}
              tone="accent"
              icon={<HandHeart className="h-4 w-4 text-accent/70" />}
            />
            <Stat
              label="Approved this month"
              value={money(metrics.billedThisMonth, settings.currency)}
              sub={
                metrics.billedThisMonth > 0
                  ? 'Approved change-order value. Payments are not tracked.'
                  : 'No approved change orders yet this month.'
              }
              tone="sage"
              icon={<Wallet className="h-4 w-4 text-sage/70" />}
              href="/app/change-orders"
            />
            <Stat
              label="Estimated value waiting"
              value={money(metrics.pendingValue, settings.currency)}
              sub={`${openAsks.length} request${openAsks.length === 1 ? '' : 's'} with no decision logged`}
              icon={<Inbox className="h-4 w-4 text-ink-mute" />}
              href="/app/requests"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <SectionLabel className="flex-1">Decide next</SectionLabel>
                <Link href="/app/requests" className="ml-3 shrink-0 text-[11.5px] text-ink-mute transition-colors hover:text-ink">
                  All requests
                </Link>
              </div>
              {openAsks.length ? (
                <div className="mt-3 space-y-2">
                  {openAsks.slice(0, 4).map((ask) => (
                    <AskCard
                      key={ask.id}
                      ask={ask}
                      project={(projects ?? []).find((project) => project.id === ask.projectId)}
                      settings={settings}
                      showProject
                      compact
                      onDecide={(next) =>
                        setDecision({
                          ask,
                          project: (projects ?? []).find((project) => project.id === ask.projectId)!,
                          decision: next,
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-line-strong bg-paper/40 px-4 py-7 text-center">
                  <p className="text-[13px] font-medium">Every request has a decision.</p>
                  <p className="mt-1 text-[12px] text-ink-mute">That is the whole point. Paste the next message when it lands.</p>
                  <Link href="/app/requests" className="mt-3 inline-block">
                    <Button size="sm" variant="outline">
                      Check a message <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}

              {pendingOrders.length ? (
                <div className="mt-4 rounded-xl border border-line bg-paper/50 p-3">
                  <p className="mono-label">change orders out for approval</p>
                  <div className="mt-2 space-y-1.5">
                    {pendingOrders.slice(0, 3).map((order) => (
                      <Link
                        key={order.id}
                        href={`/app/change-orders/${order.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5 transition-colors hover:border-ink/30"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FileSignature className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
                          <span className="truncate text-[12px]">{order.number} · {order.title}</span>
                        </span>
                        <span className="shrink-0 text-[11.5px] tnum">{money(order.total, settings.currency)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>

            <div className="space-y-4">
              <Card className="p-4 sm:p-5">
                <SectionLabel>Where it went</SectionLabel>
                <p className="mt-3 text-[12px] leading-relaxed text-ink-mute">
                  Logged absorbed request estimates compared with approved change-order totals.
                </p>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-line/60">
                  <div className="h-full bg-accent transition-all" style={{ width: `${leakTotal > 0 ? absorbedShare : 0}%` }} />
                  <div className="h-full bg-sage transition-all" style={{ width: `${leakTotal > 0 ? 100 - absorbedShare : 0}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-accent-deep">
                    {absorbedShare}% estimated absorbed · {money(metrics.absorbedAllTime, settings.currency, { compact: true })}
                  </span>
                  <span className="text-sage">
                    {money(metrics.billedAllTime, settings.currency, { compact: true })} approved
                  </span>
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mono-label">This month</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                    {metrics.absorbedThisMonth === 0
                      ? 'No absorbed requests logged this month.'
                      : `You logged an estimated ${money(metrics.absorbedThisMonth, settings.currency)} in absorbed requests — about ${hoursLabel(
                          metrics.absorbedHours,
                        )} of estimated labor.`}
                  </p>
                  <Link href="/app/reports" className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent-deep link-underline">
                    Open the leak report <BarChart3 className="h-3 w-3" />
                  </Link>
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <SectionLabel>Activity</SectionLabel>
                {activity?.length ? (
                  <ul className="mt-3 space-y-2.5">
                    {activity.map((event) => (
                      <li key={event.id} className="flex gap-2.5">
                        <span className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${ACTIVITY_DOT[event.type] ?? 'bg-line-strong'}`} />
                        <div className="min-w-0">
                          <p className="text-[11.5px] leading-snug text-ink-soft">{event.message}</p>
                          <p className="mono-label mt-0.5">{relativeTime(event.at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[12px] text-ink-mute">Nothing yet. Decisions and change orders show up here.</p>
                )}
              </Card>
            </div>
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <SectionLabel className="flex-1">Active projects</SectionLabel>
              <Link href="/app/projects" className="ml-3 text-[11.5px] text-ink-mute transition-colors hover:text-ink">
                Manage
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeProjects.slice(0, 4).map((project) => {
                const row = metrics.byProject.find((entry) => entry.projectId === project.id);
                const pct = project.budget ? Math.min(100, Math.round(((row?.absorbed ?? 0) / project.budget) * 100)) : 0;
                return (
                  <Link
                    key={project.id}
                    href={`/app/projects/${project.id}`}
                    className="group rounded-xl border border-line bg-card px-4 py-3.5 transition-shadow hover:shadow-[var(--shadow-paper)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">{project.name}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-ink-mute">
                          {project.clientName} · {money(project.rate, settings.currency)}/h
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="tnum text-accent-deep">{money(row?.absorbed ?? 0, settings.currency)} absorbed</span>
                      <span className="tnum text-ink-mute">{row?.open ?? 0} open</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/70">
                      <div className="h-full bg-accent/70" style={{ width: `${Math.max(pct, row?.absorbed ? 4 : 0)}%` }} />
                    </div>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setProjectFormOpen(true)}
                className="flex min-h-[104px] items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-card/40 text-[12.5px] text-ink-mute transition-colors hover:border-ink/30 hover:text-ink"
              >
                <FolderPlus className="h-4 w-4" /> Add a project
              </button>
            </div>
          </div>
        </div>
      )}

      <ProjectForm open={projectFormOpen} onClose={() => setProjectFormOpen(false)} currency={settings.currency} />
      {decision ? (
        <DecisionPanel
          ask={decision.ask}
          project={decision.project}
          settings={settings}
          open
          initialDecision={decision.decision}
          onClose={() => setDecision(null)}
        />
      ) : null}
    </>
  );
}
