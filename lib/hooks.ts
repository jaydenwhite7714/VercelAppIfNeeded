'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from './db';
import type { Activity, Ask, ChangeOrder, Project, Settings } from './types';
import { monthKey, startOfMonth } from './format';

/**
 * `undefined` means "still reading IndexedDB"; `null` means "no workspace yet".
 * The distinction decides whether the shell shows a skeleton or redirects.
 */
export function useSettings(): Settings | null | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    if (!db) return undefined;
    const settings = await db.settings.get('settings');
    return settings ?? null;
  }, []);
}

export function useReadySettings(): { settings: Settings | null | undefined; loading: boolean } {
  const settings = useSettings();
  return { settings, loading: settings === undefined };
}

export function useProjects(): Project[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    if (!db) return [];
    const projects = await db.projects.toArray();
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);
}

export function useProject(id: string | undefined): Project | undefined | null {
  return useLiveQuery(async () => {
    const db = getDb();
    if (!db || !id) return null;
    return (await db.projects.get(id)) ?? null;
  }, [id]);
}

export function useAsks(projectId?: string): Ask[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    if (!db) return [];
    const asks = projectId ? await db.asks.where('projectId').equals(projectId).toArray() : await db.asks.toArray();
    return asks.sort((a, b) => b.createdAt - a.createdAt);
  }, [projectId]);
}

export function useOpenAsks(): Ask[] | undefined {
  const asks = useAsks();
  return asks?.filter((ask) => ask.status === 'open');
}

export function useChangeOrders(projectId?: string): ChangeOrder[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    if (!db) return [];
    const orders = projectId
      ? await db.changeOrders.where('projectId').equals(projectId).toArray()
      : await db.changeOrders.toArray();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  }, [projectId]);
}

export function useChangeOrder(id: string | undefined): ChangeOrder | undefined | null {
  return useLiveQuery(async () => {
    const db = getDb();
    if (!db || !id) return null;
    return (await db.changeOrders.get(id)) ?? null;
  }, [id]);
}

export function useActivity(limit = 8): Activity[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb();
    if (!db) return [];
    const items = await db.activity.toArray();
    return items.sort((a, b) => b.at - a.at).slice(0, limit);
  }, [limit]);
}

export interface Metrics {
  absorbedThisMonth: number;
  absorbedCountThisMonth: number;
  billedThisMonth: number;
  pendingValue: number;
  openCount: number;
  absorbedHours: number;
  absorbedAllTime: number;
  billedAllTime: number;
  leakRate: number;
  monthly: { key: string; label: string; absorbed: number; billed: number }[];
  byProject: { projectId: string; name: string; client: string; absorbed: number; billed: number; open: number }[];
  decisionsThisMonth: number;
}

export function computeMetrics(projects: Project[], asks: Ask[], orders: ChangeOrder[]): Metrics {
  const monthStart = startOfMonth();

  const absorbedAsks = asks.filter((ask) => ask.status === 'absorbed');
  const absorbedThisMonthAsks = absorbedAsks.filter((ask) => (ask.decidedAt ?? ask.createdAt) >= monthStart);
  const approvedThisMonth = orders.filter((order) => order.status === 'approved' && (order.approvedAt ?? order.createdAt) >= monthStart);

  const absorbedThisMonth = absorbedThisMonthAsks.reduce((sum, ask) => sum + ask.value, 0);
  const billedThisMonth = approvedThisMonth.reduce((sum, order) => sum + order.total, 0);
  const pendingValue = asks.filter((ask) => ask.status === 'open').reduce((sum, ask) => sum + ask.value, 0);
  const absorbedAllTime = absorbedAsks.reduce((sum, ask) => sum + ask.value, 0);
  const billedAllTime = orders.filter((order) => order.status === 'approved').reduce((sum, order) => sum + order.total, 0);
  const absorbedHours = absorbedThisMonthAsks.reduce((sum, ask) => sum + ask.hours, 0);

  const monthly: Metrics['monthly'] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i, 1);
    const key = monthKey(date.getTime());
    const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    const absorbed = absorbedAsks
      .filter((ask) => monthKey(ask.decidedAt ?? ask.createdAt) === key)
      .reduce((sum, ask) => sum + ask.value, 0);
    const billed = orders
      .filter((order) => order.status === 'approved' && monthKey(order.approvedAt ?? order.createdAt) === key)
      .reduce((sum, order) => sum + order.total, 0);
    monthly.push({ key, label, absorbed, billed });
  }

  const byProject = projects.map((project) => {
    const projectAsks = asks.filter((ask) => ask.projectId === project.id);
    return {
      projectId: project.id,
      name: project.name,
      client: project.clientName,
      absorbed: projectAsks.filter((ask) => ask.status === 'absorbed').reduce((sum, ask) => sum + ask.value, 0),
      billed: orders
        .filter((order) => order.projectId === project.id && order.status === 'approved')
        .reduce((sum, order) => sum + order.total, 0),
      open: projectAsks.filter((ask) => ask.status === 'open').length,
    };
  });

  const total = absorbedAllTime + billedAllTime;
  return {
    absorbedThisMonth,
    absorbedCountThisMonth: absorbedThisMonthAsks.length,
    billedThisMonth,
    pendingValue,
    openCount: asks.filter((ask) => ask.status === 'open').length,
    absorbedHours,
    absorbedAllTime,
    billedAllTime,
    leakRate: total > 0 ? absorbedAllTime / total : 0,
    monthly,
    byProject: byProject.sort((a, b) => b.absorbed - a.absorbed),
    decisionsThisMonth: asks.filter((ask) => (ask.decidedAt ?? 0) >= monthStart).length,
  };
}
