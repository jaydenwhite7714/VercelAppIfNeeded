'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FolderPlus, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/app/AppShell';
import { ProjectForm } from '@/components/app/ProjectForm';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { computeMetrics, useAsks, useChangeOrders, useProjects, useReadySettings } from '@/lib/hooks';
import { money } from '@/lib/format';

export default function ProjectsPage() {
  const { settings } = useReadySettings();
  const projects = useProjects();
  const asks = useAsks();
  const orders = useChangeOrders();
  const [open, setOpen] = useState(false);

  const metrics = useMemo(() => computeMetrics(projects ?? [], asks ?? [], orders ?? []), [projects, asks, orders]);

  if (!settings) return null;

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="Your agreements, in plain language"
        description="A scope summary is enough: what is included, what is excluded, how many revisions, and your rate. The checker compares every request against this."
        actions={
          <Button onClick={() => setOpen(true)}>
            <FolderPlus className="h-3.5 w-3.5" /> New project
          </Button>
        }
      />

      {!projects ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-5 w-5" />}
          title="No projects yet"
          description="Add one client engagement — a template can fill in the usual deliverables and exclusions in a single click."
          action={
            <Button onClick={() => setOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" /> Create the first project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const row = metrics.byProject.find((entry) => entry.projectId === project.id);
            const excluded = project.scope.filter((item) => item.kind === 'excluded').length;
            const due = project.dueDate
              ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${project.dueDate}T12:00:00`))
              : null;
            return (
              <Link key={project.id} href={`/app/projects/${project.id}`} className="group block">
                <Card className="h-full p-4 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={project.status === 'active' ? 'sage' : project.status === 'paused' ? 'gold' : 'neutral'}>
                          {project.status}
                        </Badge>
                        {due ? <span className="mono-label">due {due}</span> : null}
                      </div>
                      <h2 className="mt-2 truncate text-[16px] leading-snug tracking-[-0.015em]">{project.name}</h2>
                      <p className="mt-0.5 truncate text-[12px] text-ink-mute">
                        {project.clientName} · {money(project.rate, settings.currency)}/h
                        {project.budget ? ` · ${money(project.budget, settings.currency)} fee` : ''}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                    <div>
                      <p className="mono-label">estimated absorbed</p>
                      <p className="mt-0.5 text-[13px] tnum text-accent-deep">{money(row?.absorbed ?? 0, settings.currency)}</p>
                    </div>
                    <div>
                      <p className="mono-label">approved</p>
                      <p className="mt-0.5 text-[13px] tnum text-sage">{money(row?.billed ?? 0, settings.currency)}</p>
                    </div>
                    <div>
                      <p className="mono-label">open</p>
                      <p className="mt-0.5 text-[13px] tnum">{row?.open ?? 0}</p>
                    </div>
                  </div>

                  <p className="mono-label mt-3 normal-case tracking-[0.03em]">
                    {project.scope.length} scope items · {excluded} exclusions · {project.revisionRounds} revision round
                    {project.revisionRounds === 1 ? '' : 's'}
                  </p>
                </Card>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-[180px] items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/40 text-[13px] text-ink-mute transition-colors hover:border-ink/30 hover:text-ink"
          >
            <FolderPlus className="h-4 w-4" /> Add another project
          </button>
        </div>
      )}

      <ProjectForm open={open} onClose={() => setOpen(false)} currency={settings.currency} />
    </>
  );
}
