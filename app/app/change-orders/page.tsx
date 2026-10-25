'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileSignature, FilePlus2 } from 'lucide-react';
import { PageHeader } from '@/components/app/AppShell';
import { Badge, Button, Card, EmptyState, Skeleton, Tabs } from '@/components/ui';
import { useChangeOrders, useProjects, useReadySettings } from '@/lib/hooks';
import { formatShortDate, money } from '@/lib/format';
import type { ChangeOrderStatus } from '@/lib/types';

const STATUS_TONE: Record<ChangeOrderStatus, 'neutral' | 'accent' | 'sage' | 'gold'> = {
  draft: 'neutral',
  sent: 'gold',
  approved: 'sage',
  declined: 'neutral',
};

export default function ChangeOrdersPage() {
  const { settings } = useReadySettings();
  const orders = useChangeOrders();
  const projects = useProjects();
  const [filter, setFilter] = useState<'all' | ChangeOrderStatus>('all');

  const totals = useMemo(() => {
    const approved = (orders ?? []).filter((order) => order.status === 'approved').reduce((sum, order) => sum + order.total, 0);
    const pending = (orders ?? []).filter((order) => order.status === 'sent' || order.status === 'draft').reduce((sum, order) => sum + order.total, 0);
    return { approved, pending };
  }, [orders]);

  const filtered = (orders ?? []).filter((order) => (filter === 'all' ? true : order.status === filter));

  if (!settings) return null;

  return (
    <>
      <PageHeader
        eyebrow="Change orders"
        title="Paperwork that pays"
        description="Every change order has a shareable approval link, a downloadable PDF, and a receipt when the client approves. Nothing to chase in a thread."
        actions={
          <div className="hidden gap-2 sm:flex">
            <div className="rounded-xl border border-line bg-card px-3 py-2">
              <p className="mono-label">approved</p>
              <p className="text-[13px] tnum text-sage">{money(totals.approved, settings.currency)}</p>
            </div>
            <div className="rounded-xl border border-line bg-card px-3 py-2">
              <p className="mono-label">out for approval</p>
              <p className="text-[13px] tnum">{money(totals.pending, settings.currency)}</p>
            </div>
          </div>
        }
      />

      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All', count: orders?.length ?? 0 },
          { value: 'draft', label: 'Drafts', count: (orders ?? []).filter((order) => order.status === 'draft').length },
          { value: 'sent', label: 'Sent', count: (orders ?? []).filter((order) => order.status === 'sent').length },
          { value: 'approved', label: 'Approved', count: (orders ?? []).filter((order) => order.status === 'approved').length },
        ]}
      />

      <div className="mt-4">
        {!orders ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : filtered.length ? (
          <div className="space-y-2">
            {filtered.map((order) => {
              const project = (projects ?? []).find((entry) => entry.id === order.projectId);
              return (
                <Link key={order.id} href={`/app/change-orders/${order.id}`} className="block">
                  <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-shadow hover:shadow-[var(--shadow-lift)]">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-paper/60">
                        <FileSignature className="h-3.5 w-3.5 text-ink-mute" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mono-label">{order.number}</span>
                          <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                          <span className="mono-label">issued {formatShortDate(order.createdAt)}</span>
                        </div>
                        <p className="mt-1 truncate text-[13.5px] font-medium">{order.title}</p>
                        <p className="truncate text-[11.5px] text-ink-mute">
                          {project ? `${project.name} · ${project.clientName}` : 'Project removed'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] tnum">{money(order.total, settings.currency)}</span>
                      <ArrowUpRight className="h-4 w-4 text-ink-mute" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<FilePlus2 className="h-5 w-5" />}
            title={filter === 'all' ? 'No change orders yet' : `No ${filter} change orders`}
            description="Bill an extra request from the Requests page — a draft change order with a share link is created for you."
            action={
              <Link href="/app/requests">
                <Button size="sm" variant="outline">
                  Check a client message
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
