'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, FileSignature, Link2, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { AskCard } from '@/components/app/AskCard';
import { DecisionPanel } from '@/components/app/DecisionPanel';
import { ProjectForm } from '@/components/app/ProjectForm';
import { Badge, Button, Card, copyText, EmptyState, Field, Modal, SectionLabel, Select, Skeleton, Tabs, Textarea, useToast } from '@/components/ui';
import { deleteProject, updateProject } from '@/lib/db';
import { useAsks, useChangeOrders, useProject, useReadySettings } from '@/lib/hooks';
import { buildSharedScope, encodeSharedScope, MAX_SHARE_LENGTH, shareUrl } from '@/lib/codec';
import { formatDate, hoursLabel, money, relativeTime } from '@/lib/format';
import type { Ask, Project, ScopeKind } from '@/lib/types';
import type { Decision } from '@/lib/scripts';
import { cn } from '@/lib/cn';

const KIND_ORDER: ScopeKind[] = ['deliverable', 'included', 'excluded'];
const KIND_META: Record<ScopeKind, { title: string; blurb: string; tone: string }> = {
  deliverable: { title: 'Deliverables', blurb: 'The work you are producing.', tone: 'text-sage' },
  included: { title: 'Included in the fee', blurb: 'The small things clients assume are free — make them explicit.', tone: 'text-ink-soft' },
  excluded: { title: 'Not included', blurb: 'The most valuable section. Every line here is a future argument avoided.', tone: 'text-accent-deep' },
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id;
  const { settings } = useReadySettings();
  const project = useProject(projectId);
  const asks = useAsks(projectId);
  const orders = useChangeOrders(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [decision, setDecision] = useState<{ ask: Ask; project: Project; decision?: Decision } | null>(null);
  const [tab, setTab] = useState<'requests' | 'orders'>('requests');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeLink, setScopeLink] = useState('');
  const [scopeCopied, setScopeCopied] = useState(false);
  const [scopeNote, setScopeNote] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const { push } = useToast();

  const totals = useMemo(() => {
    const absorbed = (asks ?? []).filter((ask) => ask.status === 'absorbed').reduce((sum, ask) => sum + ask.value, 0);
    const billed = (orders ?? []).filter((order) => order.status === 'approved').reduce((sum, order) => sum + order.total, 0);
    const pending = (orders ?? []).filter((order) => order.status === 'draft' || order.status === 'sent').reduce((sum, order) => sum + order.total, 0);
    return { absorbed, billed, pending };
  }, [asks, orders]);

  if (!settings) return null;

  if (project === undefined) {
    return (
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-8 h-40 w-full" />
      </div>
    );
  }

  if (project === null) {
    return (
      <EmptyState
        title="Project not found"
        description="It may have been deleted. Everything is stored locally in this browser, so a different device will not see it."
        action={
          <Link href="/app/projects">
            <Button size="sm">Back to projects</Button>
          </Link>
        }
      />
    );
  }

  const currentProjectId = project.id;
  async function changeStatus(status: Project['status']) {
    setStatusSaving(true);
    try {
      await updateProject(currentProjectId, { status });
      push(`Project marked ${status}.`);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update project status.', 'error');
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <>
      <Link href="/app/projects" className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-mute transition-colors hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={project.status === 'active' ? 'sage' : project.status === 'paused' ? 'gold' : 'neutral'}>{project.status}</Badge>
            <label className="sr-only" htmlFor="project-status">Project status</label>
            <Select
              id="project-status"
              aria-label="Project status"
              value={project.status}
              disabled={statusSaving}
              onChange={(event) => void changeStatus(event.target.value as Project['status'])}
              className="h-8 w-auto min-w-28 text-xs"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="complete">Complete</option>
            </Select>
            <span className="mono-label">created {formatDate(project.createdAt)}</span>
          </div>
          <h1 className="mt-2 text-[clamp(1.6rem,3.4vw,2.1rem)] font-semibold leading-tight tracking-[-0.03em]">{project.name}</h1>
          <p className="mt-1 text-[13px] text-ink-mute">
            {project.clientName}
            {project.clientEmail ? ` · ${project.clientEmail}` : ''} · {money(project.rate, settings.currency)}/h
            {project.budget ? ` · ${money(project.budget, settings.currency)} fee` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit scope
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const shared = buildSharedScope({
                settings,
                projectName: project.name,
                clientName: project.clientName,
                dueDate: project.dueDate,
                revisionRounds: project.revisionRounds,
                rate: project.rate,
                currency: settings.currency,
                deliverables: project.scope.filter((item) => item.kind === 'deliverable').map((item) => ({ l: item.label, h: item.hours })),
                included: project.scope.filter((item) => item.kind === 'included').map((item) => item.label),
                excluded: project.scope.filter((item) => item.kind === 'excluded').map((item) => item.label),
                note: scopeNote.trim() || undefined,
              });
              setScopeLink(shareUrl(encodeSharedScope(shared), typeof window !== 'undefined' ? window.location.origin : undefined));
              setScopeCopied(false);
              setScopeOpen(true);
            }}
          >
            <Share2 className="h-3.5 w-3.5" /> Share scope
          </Button>
          <Link href="/app/requests">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Check a message
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-4">
        {[
          { label: 'Estimated absorbed', value: money(totals.absorbed, settings.currency), tone: 'text-accent-deep' },
          { label: 'Approved order value', value: money(totals.billed, settings.currency), tone: 'text-sage' },
          { label: 'Out for approval', value: money(totals.pending, settings.currency), tone: 'text-ink' },
          {
            label: 'Delivery',
            value: project.dueDate ? formatDate(project.dueDate, { year: undefined }) : '—',
            tone: 'text-ink',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-card px-3.5 py-2.5">
            <p className="mono-label">{stat.label}</p>
            <p className={cn('mt-1 text-[16px] tnum', stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <SectionLabel className="flex-1">Agreed scope</SectionLabel>
            <span className="mono-label ml-3">{project.revisionRounds} revisions</span>
          </div>
          <div className="mt-4 space-y-4">
            {KIND_ORDER.map((kind) => {
              const items = project.scope.filter((item) => item.kind === kind);
              if (!items.length) return null;
              const meta = KIND_META[kind];
              return (
                <div key={kind}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={cn('text-[12.5px] font-medium', meta.tone)}>{meta.title}</p>
                    <span className="mono-label">{items.length}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-mute">{meta.blurb}</p>
                  <ul className="mt-2 space-y-1">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          'flex items-start justify-between gap-3 rounded-lg border px-2.5 py-1.5',
                          kind === 'excluded' ? 'border-accent/20 bg-accent-soft/40' : 'border-line bg-paper/40',
                        )}
                      >
                        <span className="text-[12.5px] leading-snug text-ink-soft">{item.label}</span>
                        <span className="shrink-0 text-[10.5px] text-ink-mute tnum">
                          {item.qty ? `×${item.qty}` : ''}
                          {item.hours ? ` ${hoursLabel(item.hours)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {project.scope.length === 0 ? (
              <EmptyState
                title="No scope yet"
                description="Add the deliverables and exclusions so requests can be checked against them."
                action={
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                    Add scope
                  </Button>
                }
              />
            ) : null}
          </div>
          {project.notes ? (
            <div className="mt-4 rounded-lg border border-line bg-paper/50 p-3">
              <p className="mono-label">notes</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{project.notes}</p>
            </div>
          ) : null}
        </Card>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'requests', label: 'Requests', count: asks?.length ?? 0 },
                { value: 'orders', label: 'Change orders', count: orders?.length ?? 0 },
              ]}
              className="flex-1"
            />
          </div>

          {tab === 'requests' ? (
            asks?.length ? (
              <div className="space-y-2">
                {asks.map((ask) => (
                  <AskCard
                    key={ask.id}
                    ask={ask}
                    project={project}
                    settings={settings}
                    onDecide={(next) => setDecision({ ask, project, decision: next })}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No requests logged"
                description="Paste a client message into Requests and anything you add will show up here."
                action={
                  <Link href="/app/requests">
                    <Button size="sm" variant="outline">
                      Check a message
                    </Button>
                  </Link>
                }
              />
            )
          ) : orders?.length ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/app/change-orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-3 transition-colors hover:border-ink/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
                      <span className="mono-label">{order.number}</span>
                      <Badge tone={order.status === 'approved' ? 'sage' : order.status === 'declined' ? 'neutral' : 'gold'}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[12.5px]">{order.title}</p>
                    <p className="text-[10.5px] text-ink-mute">{relativeTime(order.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-[13px] tnum">{money(order.total, settings.currency)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No change orders"
              description="When you bill an extra request, the change order and its approval link appear here."
            />
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="flex items-center gap-1.5 text-[11.5px] text-ink-mute">
          <CalendarDays className="h-3.5 w-3.5" /> Started {formatDate(project.startDate)}
          {project.dueDate ? ` · delivery ${formatDate(project.dueDate)}` : ''}
        </p>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete project
        </Button>
      </div>

      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} project={project} currency={settings.currency} />

      <Modal
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        title="Share the scope with your client"
        description="A clean, read-only page of what is included and what is not. No account, no login, no server — the scope travels inside the link."
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="mono-label normal-case tracking-[0.03em]">{scopeLink.length > MAX_SHARE_LENGTH ? 'link is long — trim the scope' : 'safe to paste anywhere'}</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setScopeOpen(false)}>
                Close
              </Button>
              <Button
                onClick={async () => {
                  const copied = await copyText(scopeLink);
                  if (copied) {
                    setScopeCopied(true);
                    push('Scope link copied.');
                  } else {
                    push('Could not copy — select the link manually.', 'error');
                  }
                }}
              >
                <Link2 className="h-3.5 w-3.5" /> {scopeCopied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-paper/60 p-2.5">
            <p className="break-all font-mono text-[10px] leading-relaxed text-ink-mute">{scopeLink}</p>
          </div>
          <Field label="Add a note for the client" optional hint="Shown at the bottom of the shared page.">
            <Textarea
              value={scopeNote}
              onChange={(event) => setScopeNote(event.target.value)}
              placeholder="Two rounds of revisions are included; after that I'll quote each round before starting."
              className="min-h-16 text-[12.5px]"
            />
          </Field>
          <p className="text-[11.5px] leading-relaxed text-ink-mute">
            Change the note or the scope and close this dialog to regenerate the link. Clients can request a change from the
            page, which opens an email to you — no new app to learn.
          </p>
          <a href={scopeLink} target="_blank" rel="noreferrer" className="inline-block">
            <Button size="sm" variant="outline">
              Preview the client view
            </Button>
          </a>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this project?"
        description="Requests and change orders attached to it are removed too. This cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="accent"
              onClick={async () => {
                await deleteProject(project.id);
                router.push('/app/projects');
              }}
            >
              Delete project
            </Button>
          </div>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-soft">
          You are about to delete <span className="font-medium text-ink">{project.name}</span> for {project.clientName}.
          Export a backup first if you want a copy of the ledger.
        </p>
      </Modal>

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
