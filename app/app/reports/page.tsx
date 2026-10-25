'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Download, Share2 } from 'lucide-react';
import { PageHeader } from '@/components/app/AppShell';
import { Button, Card, EmptyState, SectionLabel, Skeleton, useToast } from '@/components/ui';
import { useAsks, useChangeOrders, useProjects, useReadySettings } from '@/lib/hooks';
import { hoursLabel, money, monthKey } from '@/lib/format';
import { Wordmark } from '@/components/brand';
import { cn } from '@/lib/cn';
import { loggedDecisionCount } from '@/lib/reporting';
import { toPng } from 'html-to-image';

function monthsBack(count: number) {
  const list: { key: string; label: string; short: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i, 1);
    list.push({
      key: monthKey(date.getTime()),
      label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date),
      short: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
    });
  }
  return list;
}

export default function ReportsPage() {
  const { settings } = useReadySettings();
  const asks = useAsks();
  const orders = useChangeOrders();
  const projects = useProjects();
  const { push } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const months = useMemo(() => monthsBack(6).reverse(), []);
  const [selected, setSelected] = useState(monthKey(Date.now()));

  const data = useMemo(() => {
    const absorbedAsks = (asks ?? []).filter((ask) => ask.status === 'absorbed' && monthKey(ask.decidedAt ?? ask.createdAt) === selected);
    const approvedOrders = (orders ?? []).filter(
      (order) => order.status === 'approved' && monthKey(order.approvedAt ?? order.createdAt) === selected,
    );
    const allTimeAbsorbed = (asks ?? []).filter((ask) => ask.status === 'absorbed');
    const series = months.map((month) => ({
      ...month,
      absorbed: (asks ?? [])
        .filter((ask) => ask.status === 'absorbed' && monthKey(ask.decidedAt ?? ask.createdAt) === month.key)
        .reduce((sum, ask) => sum + ask.value, 0),
      billed: (orders ?? [])
        .filter((order) => order.status === 'approved' && monthKey(order.approvedAt ?? order.createdAt) === month.key)
        .reduce((sum, order) => sum + order.total, 0),
    }));
    const perProject = (projects ?? [])
      .map((project) => {
        const projectAbsorbed = allTimeAbsorbed.filter((ask) => ask.projectId === project.id).reduce((sum, ask) => sum + ask.value, 0);
        const projectBilled = (orders ?? [])
          .filter((order) => order.projectId === project.id && order.status === 'approved')
          .reduce((sum, order) => sum + order.total, 0);
        const contract = (project.budget ?? 0) + projectBilled;
        return {
          project,
          absorbed: projectAbsorbed,
          billed: projectBilled,
          tax: contract + projectAbsorbed > 0 ? projectAbsorbed / (contract + projectAbsorbed) : 0,
        };
      })
      .filter((row) => row.absorbed > 0 || row.billed > 0)
      .sort((a, b) => b.absorbed - a.absorbed);

    const absorbedValue = absorbedAsks.reduce((sum, ask) => sum + ask.value, 0);
    const absorbedHours = absorbedAsks.reduce((sum, ask) => sum + ask.hours, 0);
    const billedValue = approvedOrders.reduce((sum, order) => sum + order.total, 0);
    const biggest = [...absorbedAsks].sort((a, b) => b.value - a.value)[0];
    const biggestProject = biggest ? (projects ?? []).find((project) => project.id === biggest.projectId) : undefined;

    return {
      absorbedAsks,
      approvedOrders,
      absorbedValue,
      absorbedHours,
      billedValue,
      series,
      perProject,
      biggest,
      biggestProject,
      allTimeAbsorbedValue: allTimeAbsorbed.reduce((sum, ask) => sum + ask.value, 0),
      allTimeBilledValue: (orders ?? []).filter((order) => order.status === 'approved').reduce((sum, order) => sum + order.total, 0),
      decisions: loggedDecisionCount(asks ?? [], orders ?? [], selected),
    };
  }, [asks, orders, projects, selected, months]);

  const activeMonth = months.find((month) => month.key === selected) ?? months[months.length - 1];
  const maxValue = Math.max(1, ...data.series.flatMap((month) => [month.absorbed, month.billed]));
  const summary = `In ${activeMonth.label.split(' ')[0]} I absorbed ${money(data.absorbedValue, settings?.currency ?? 'USD')} of client work — ${hoursLabel(
    data.absorbedHours,
  )} across ${data.absorbedAsks.length} request${data.absorbedAsks.length === 1 ? '' : 's'}${
    data.biggestProject ? `, the biggest from ${data.biggestProject.clientName}` : ''
  }. Tracked with Unbilled.`;

  if (!settings) return null;

  async function download() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#14161A' });
      const link = document.createElement('a');
      link.download = `unbilled-${selected}.png`;
      link.href = dataUrl;
      link.click();
      push('Share card downloaded.');
    } catch {
      push('Could not render the image. Try a screenshot instead.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My unbilled work this month', text: summary });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(summary);
    push('Summary copied — paste it anywhere.');
  }

  const hasData = (asks ?? []).length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Leak report"
        title="The number you can act on"
        description="What you absorbed, what you recovered, and what your rate actually turned out to be. Everything here comes from decisions you logged."
        actions={
          <div className="rounded-xl border border-line bg-card px-3 py-2">
            <p className="mono-label">all time</p>
            <p className="text-[13px] tnum text-accent-deep">{money(data.allTimeAbsorbedValue, settings.currency)} absorbed</p>
          </div>
        }
      />

      {!asks ? (
        <Skeleton className="h-64" />
      ) : !hasData ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="No data to report yet"
          description="Log a few requests and this page fills in: the monthly total, your biggest leak, and a card you can share."
          action={
            <Link href="/app/requests">
              <Button size="sm">
                Check a client message <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {months.map((month) => (
              <button
                key={month.key}
                type="button"
                onClick={() => setSelected(month.key)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                  selected === month.key ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-soft hover:border-ink/30',
                )}
              >
                {month.label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <Card className="overflow-hidden">
                <div className="border-b border-line bg-paper/50 px-4 py-3 sm:px-5">
                  <p className="mono-label">{activeMonth.label}</p>
                </div>
                <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-5">
                  <div>
                    <p className="mono-label">Absorbed</p>
                    <p className="mt-1 font-display text-[clamp(1.9rem,4vw,2.5rem)] leading-none tracking-[-0.04em] tnum text-accent-deep">
                      {money(data.absorbedValue, settings.currency)}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-ink-mute">
                      {hoursLabel(data.absorbedHours)} · {data.absorbedAsks.length} requests
                    </p>
                  </div>
                  <div className="sm:border-l sm:border-line sm:pl-4">
                    <p className="mono-label">Recovered</p>
                    <p className="mt-1 font-display text-[clamp(1.9rem,4vw,2.5rem)] leading-none tracking-[-0.04em] tnum text-sage">
                      {money(data.billedValue, settings.currency)}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-ink-mute">
                      {data.approvedOrders.length} approved change order{data.approvedOrders.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="sm:border-l sm:border-line sm:pl-4">
                    <p className="mono-label">Decisions</p>
                    <p className="mt-1 font-display text-[clamp(1.9rem,4vw,2.5rem)] leading-none tracking-[-0.04em] tnum">
                      {data.decisions}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-ink-mute">logged this month</p>
                  </div>
                </div>
                <div className="border-t border-dashed border-line px-4 py-3 sm:px-5">
                  <p className="text-[12px] leading-relaxed text-ink-soft">
                    {data.absorbedValue === 0
                      ? 'Nothing absorbed this month. That is either a good month or a quiet one.'
                      : `At ${money(settings.hourlyRate, settings.currency)}/hour, that is ${hoursLabel(
                          data.absorbedValue / Math.max(settings.hourlyRate, 1),
                        )} of work that did not appear on an invoice.`}
                  </p>
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <SectionLabel>Six months</SectionLabel>
                <div className="mt-4 flex items-end justify-between gap-2 sm:gap-4">
                  {data.series.map((month) => {
                    const isActive = month.key === selected;
                    return (
                      <button
                        key={month.key}
                        type="button"
                        onClick={() => setSelected(month.key)}
                        className="group flex flex-1 flex-col items-center gap-1.5"
                        title={`${month.label}: ${money(month.absorbed, settings.currency)} absorbed, ${money(month.billed, settings.currency)} billed`}
                      >
                        <div className="flex h-28 w-full items-end justify-center gap-1">
                          <div
                            className={cn('w-1/3 rounded-t-[3px] transition-colors', isActive ? 'bg-accent' : 'bg-accent/35 group-hover:bg-accent/60')}
                            style={{ height: `${Math.max(2, (month.absorbed / maxValue) * 100)}%` }}
                          />
                          <div
                            className={cn('w-1/3 rounded-t-[3px] transition-colors', isActive ? 'bg-sage' : 'bg-sage/30 group-hover:bg-sage/60')}
                            style={{ height: `${Math.max(2, (month.billed / maxValue) * 100)}%` }}
                          />
                        </div>
                        <span className={cn('mono-label', isActive && 'text-ink')}>{month.short}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-line pt-2.5">
                  <span className="flex items-center gap-1.5 text-[10.5px] text-ink-mute">
                    <span className="h-2 w-2 rounded-sm bg-accent" /> absorbed
                  </span>
                  <span className="flex items-center gap-1.5 text-[10.5px] text-ink-mute">
                    <span className="h-2 w-2 rounded-sm bg-sage" /> billed
                  </span>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-4 pt-4 sm:px-5">
                  <SectionLabel>By client</SectionLabel>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mute">
                    “Scope tax” is the share of a project&apos;s value you gave away — absorbed work as a percentage of
                    fee plus billed work.
                  </p>
                </div>
                {data.perProject.length ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-[12px]">
                      <thead>
                        <tr className="border-y border-line bg-paper/50">
                          <th className="mono-label px-4 py-2 text-left font-medium sm:px-5">Client</th>
                          <th className="mono-label px-3 py-2 text-right font-medium">Absorbed</th>
                          <th className="mono-label px-3 py-2 text-right font-medium">Billed</th>
                          <th className="mono-label px-4 py-2 text-right font-medium sm:px-5">Scope tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.perProject.map((row) => (
                          <tr key={row.project.id} className="border-b border-line last:border-0">
                            <td className="px-4 py-2.5 sm:px-5">
                              <Link href={`/app/projects/${row.project.id}`} className="link-underline">
                                {row.project.clientName}
                              </Link>
                              <span className="block text-[10.5px] text-ink-mute">{row.project.name}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right tnum text-accent-deep">{money(row.absorbed, settings.currency)}</td>
                            <td className="px-3 py-2.5 text-right tnum text-sage">{money(row.billed, settings.currency)}</td>
                            <td className="px-4 py-2.5 text-right tnum sm:px-5">
                              <span className={row.tax > 0.2 ? 'text-accent-deep' : 'text-ink-soft'}>{Math.round(row.tax * 100)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-6 text-[12px] text-ink-mute sm:px-5">No project activity yet.</p>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionLabel className="flex-1">Share card</SectionLabel>
              </div>
              <div
                ref={cardRef}
                className="relative overflow-hidden rounded-[18px] bg-ink px-5 py-6 text-paper"
                style={{ aspectRatio: '4 / 5' }}
              >
                <div className="flex items-center justify-between">
                  <Wordmark tone="paper" />
                  <span className="mono-label text-paper/40">{activeMonth.label}</span>
                </div>
                <div className="mt-8">
                  <p className="mono-label text-paper/50">Unbilled client work</p>
                  <p className="mt-2 font-display text-[clamp(2.6rem,7vw,3.6rem)] leading-none tracking-[-0.045em] tnum">
                    {money(data.absorbedValue, settings.currency)}
                  </p>
                  <p className="mt-2 text-[11.5px] text-paper/60">
                    {hoursLabel(data.absorbedHours)} · {data.absorbedAsks.length} request{data.absorbedAsks.length === 1 ? '' : 's'}
                    {data.billedValue > 0 ? ` · ${money(data.billedValue, settings.currency)} recovered` : ''}
                  </p>
                </div>
                <div className="mt-6 space-y-1.5">
                  {data.absorbedAsks.slice(0, 3).map((ask) => (
                    <div key={ask.id} className="flex items-center justify-between gap-3 border-t border-dashed border-paper/15 pt-1.5">
                      <span className="truncate text-[10.5px] text-paper/70">{ask.title}</span>
                      <span className="shrink-0 text-[10.5px] tnum text-paper/90">{money(ask.value, settings.currency)}</span>
                    </div>
                  ))}
                  {data.absorbedAsks.length === 0 ? (
                    <p className="border-t border-dashed border-paper/15 pt-2 text-[10.5px] text-paper/50">
                      Nothing absorbed. The boundary held.
                    </p>
                  ) : null}
                </div>
                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                  <p className="max-w-[24ch] text-[10px] leading-snug text-paper/40">
                    {data.biggestProject ? `Biggest leak: ${data.biggestProject.clientName}. ` : ''}Tracked in Unbilled.
                  </p>
                  <span className="mono-label text-paper/30">unbilled.app</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={download} loading={downloading}>
                  <Download className="h-3.5 w-3.5" /> Download PNG
                </Button>
                <Button size="sm" variant="outline" onClick={share}>
                  <Share2 className="h-3.5 w-3.5" /> Share summary
                </Button>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-mute">
                Posts like this are how the next freelancer finds out they are not the only one. Nothing personal is
                included beyond the numbers you see.
              </p>

              <Card className="p-4">
                <SectionLabel>What to do next</SectionLabel>
                <ul className="mt-2.5 space-y-2 text-[12px] leading-snug text-ink-soft">
                  {data.biggest ? (
                    <li className="flex gap-2">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                      Your biggest absorbed request was “{data.biggest.title}” at {money(data.biggest.value, settings.currency)}. Send
                      a change order next time it lands.
                    </li>
                  ) : null}
                  {data.absorbedValue > 0 ? (
                    <li className="flex gap-2">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                      Add the scope clause below to your next proposal so revision caps are in writing.
                    </li>
                  ) : null}
                  <li className="flex gap-2">
                    <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-sage" />
                    Set a standing rule: any request over 2 hours gets a change order, no exceptions.
                  </li>
                </ul>
                <Link href="/scope-clauses" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent-deep link-underline">
                  Open the clause library <ArrowRight className="h-3 w-3" />
                </Link>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
