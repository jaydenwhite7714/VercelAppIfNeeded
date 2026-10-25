'use client';

import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { PageHeader } from '@/components/app/AppShell';
import { AskCard } from '@/components/app/AskCard';
import { DecisionPanel } from '@/components/app/DecisionPanel';
import { RequestChecker } from '@/components/app/RequestChecker';
import { Button, EmptyState, Select, Skeleton, Tabs } from '@/components/ui';
import { useAsks, useProjects, useReadySettings } from '@/lib/hooks';
import { hoursLabel, money } from '@/lib/format';
import type { Ask, Project } from '@/lib/types';
import type { Decision } from '@/lib/scripts';

type Filter = 'open' | 'decided' | 'all';

export default function RequestsPage() {
  const { settings } = useReadySettings();
  const projects = useProjects();
  const asks = useAsks();
  const [filter, setFilter] = useState<Filter>('open');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [decision, setDecision] = useState<{ ask: Ask; project: Project; decision?: Decision } | null>(null);

  const filtered = useMemo(() => {
    const list = (asks ?? []).filter((ask) => (projectFilter === 'all' ? true : ask.projectId === projectFilter));
    if (filter === 'open') return list.filter((ask) => ask.status === 'open');
    if (filter === 'decided') return list.filter((ask) => ask.status !== 'open');
    return list;
  }, [asks, filter, projectFilter]);

  const openValue = (asks ?? []).filter((ask) => ask.status === 'open').reduce((sum, ask) => sum + ask.value, 0);
  const openHours = (asks ?? []).filter((ask) => ask.status === 'open').reduce((sum, ask) => sum + ask.hours, 0);

  if (!settings) return null;

  return (
    <>
      <PageHeader
        eyebrow="Requests"
        title="What the client actually asked for"
        description="Paste a message to find every request inside it, then decide what each one is worth. Nothing is uploaded — the checker runs here."
        actions={
          <div className="rounded-xl border border-line bg-card px-3 py-2">
            <p className="mono-label">undecided</p>
            <p className="text-[13px] tnum">
              {money(openValue, settings.currency)} · est. {hoursLabel(openHours)}
            </p>
          </div>
        }
      />

      <RequestChecker projects={projects ?? []} asks={asks ?? []} settings={settings} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'open', label: 'Needs a decision', count: (asks ?? []).filter((ask) => ask.status === 'open').length },
            { value: 'decided', label: 'Decided', count: (asks ?? []).filter((ask) => ask.status !== 'open').length },
            { value: 'all', label: 'All', count: (asks ?? []).length },
          ]}
        />
        <Select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="h-9 sm:w-56"
          aria-label="Filter by project"
        >
          <option value="all">All projects</option>
          {(projects ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        {!asks ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : filtered.length ? (
          <div className="space-y-2">
            {filtered.map((ask) => {
              const project = (projects ?? []).find((entry) => entry.id === ask.projectId);
              if (!project) return null;
              return (
                <AskCard
                  key={ask.id}
                  ask={ask}
                  project={project}
                  settings={settings}
                  showProject
                  onDecide={(next) => setDecision({ ask, project, decision: next })}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title={filter === 'open' ? 'No undecided requests' : 'Nothing here yet'}
            description={
              filter === 'open'
                ? 'Every request has a decision logged. Paste the next client message above when it arrives.'
                : 'Check a client message above — anything you log will appear here with its verdict and price.'
            }
            action={
              <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                Show all requests
              </Button>
            }
          />
        )}
      </div>

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
