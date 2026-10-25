'use client';

import Dexie, { type Table } from 'dexie';
import type { Activity, Ask, AskStatus, ChangeOrder, Project, Settings, ScopeItem } from './types';
import { draftFor, type Decision } from './scripts';
import { addBusinessDays } from './format';
import { DEMO_SCOPE } from './demo';

export class UnbilledDB extends Dexie {
  settings!: Table<Settings, string>;
  projects!: Table<Project, string>;
  asks!: Table<Ask, string>;
  changeOrders!: Table<ChangeOrder, string>;
  activity!: Table<Activity, string>;

  constructor() {
    super('unbilled');
    this.version(1).stores({
      settings: 'id',
      projects: 'id, status, updatedAt',
      asks: 'id, projectId, status, createdAt, changeOrderId',
      changeOrders: 'id, projectId, status, createdAt',
      activity: 'id, at, projectId',
    });
  }
}

let instance: UnbilledDB | null = null;

export function getDb(): UnbilledDB | null {
  if (typeof indexedDB === 'undefined') return null;
  if (!instance) instance = new UnbilledDB();
  return instance;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export const DEFAULT_TERMS = `This change order is valid for 14 days from the date of issue. Work begins after written approval and, where applicable, receipt of payment. The fee and timeline above apply only to the work described; anything further requires a new change order. The original agreement remains in effect in all other respects.`;

export function emptySettings(): Settings {
  return {
    id: 'settings',
    name: '',
    businessName: '',
    role: 'Designer',
    email: '',
    currency: 'USD',
    hourlyRate: 85,
    tone: 'warm',
    includedRevisions: 2,
    rushMultiplier: 1.5,
    terms: DEFAULT_TERMS,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function getSettings(): Promise<Settings | undefined> {
  const db = getDb();
  if (!db) return undefined;
  return db.settings.get('settings');
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = getDb();
  if (!db) throw new Error('Storage unavailable');
  const existing = (await db.settings.get('settings')) ?? emptySettings();
  const next: Settings = { ...existing, ...patch, id: 'settings', updatedAt: Date.now() };
  await db.settings.put(next);
  return next;
}

export async function logActivity(entry: Omit<Activity, 'id' | 'at'> & { at?: number }): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.activity.put({ id: uid(), at: entry.at ?? Date.now(), ...entry });
}

/* ------------------------------------------------------------------ projects */

export interface NewProjectInput {
  name: string;
  clientName: string;
  clientEmail?: string;
  rate: number;
  budget?: number;
  startDate: string;
  dueDate?: string;
  revisionRounds: number;
  scope: ScopeItem[];
  notes?: string;
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const db = getDb();
  if (!db) throw new Error('Storage unavailable');
  const now = Date.now();
  const project: Project = {
    id: uid(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  await db.projects.put(project);
  await logActivity({ type: 'project', message: `Project “${project.name}” created for ${project.clientName}.`, projectId: project.id });
  return project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.projects.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteProject(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.transaction('rw', db.projects, db.asks, db.changeOrders, db.activity, async () => {
    await db.asks.where('projectId').equals(id).delete();
    await db.changeOrders.where('projectId').equals(id).delete();
    await db.activity.where('projectId').equals(id).delete();
    await db.projects.delete(id);
  });
}

/* ---------------------------------------------------------------------- asks */

export interface NewAskInput {
  projectId: string;
  title: string;
  sourceText: string;
  verdict: Ask['verdict'];
  confidence: number;
  reasons: Ask['reasons'];
  matchedScopeId?: string;
  workLabel?: string;
  hours: number;
  value: number;
  rush: boolean;
}

export async function saveAsk(input: NewAskInput): Promise<Ask> {
  const db = getDb();
  if (!db) throw new Error('Storage unavailable');
  const ask: Ask = {
    id: uid(),
    status: 'open',
    createdAt: Date.now(),
    ...input,
  };
  await db.asks.put(ask);
  return ask;
}

export async function updateAsk(id: string, patch: Partial<Ask>): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.asks.update(id, patch);
}

export async function deleteAsk(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.asks.delete(id);
}

export interface DecisionResult {
  ask: Ask;
  changeOrder?: ChangeOrder;
}

export async function decideAsk(
  askId: string,
  decision: Decision,
  settings: Settings,
  options: { hours?: number; value?: number; timelineDays?: number } = {},
): Promise<DecisionResult> {
  const db = getDb();
  if (!db) throw new Error('Storage unavailable');
  const ask = await db.asks.get(askId);
  if (!ask) throw new Error('Request not found');
  const project = await db.projects.get(ask.projectId);
  if (!project) throw new Error('Project not found');

  const hours = options.hours ?? ask.hours;
  const value = options.value ?? ask.value;
  const statusMap: Record<Decision, AskStatus> = {
    absorb: 'absorbed',
    bill: 'billed',
    decline: 'declined',
    clarify: 'clarified',
  };

  let changeOrder: ChangeOrder | undefined;
  const now = Date.now();

  if (decision === 'bill') {
    const existing = await db.changeOrders.where('projectId').equals(project.id).toArray();
    const number = `CO-${String(existing.length + 1).padStart(3, '0')}`;
    changeOrder = {
      id: uid(),
      number,
      projectId: project.id,
      askIds: [ask.id],
      title: ask.title,
      summary: `Additional work requested by ${project.clientName}, outside the scope agreed for ${project.name}.`,
      items: [{ id: uid(), description: ask.title, hours, rate: project.rate, amount: value }],
      total: value,
      currency: settings.currency,
      timelineImpact: options.timelineDays
        ? `Delivery moves ${options.timelineDays} business day${options.timelineDays === 1 ? '' : 's'}, to ${addBusinessDays(project.dueDate ?? new Date().toISOString().slice(0, 10), options.timelineDays)}.`
        : `Additional work scheduled alongside the current plan; delivery date confirmed on approval.`,
      terms: settings.terms,
      status: 'draft',
      validUntil: new Date(now + 14 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };
    await db.changeOrders.put(changeOrder);
  }

  const nextAsk: Ask = {
    ...ask,
    status: statusMap[decision],
    hours,
    value,
    changeOrderId: changeOrder?.id,
    decidedAt: now,
  };
  await db.asks.put(nextAsk);

  const messages: Record<Decision, string> = {
    absorb: `Absorbed “${ask.title}” for ${project.clientName}.`,
    bill: `Billed “${ask.title}” to ${project.clientName} as ${changeOrder?.number}.`,
    decline: `Declined “${ask.title}” for ${project.clientName}.`,
    clarify: `Held “${ask.title}” pending scope confirmation.`,
  };
  await logActivity({
    type: decision === 'bill' ? 'billed' : decision === 'absorb' ? 'absorbed' : decision === 'decline' ? 'declined' : 'clarified',
    message: messages[decision],
    amount: decision === 'decline' ? 0 : value,
    projectId: project.id,
  });

  return { ask: nextAsk, changeOrder };
}

/* -------------------------------------------------------------- change orders */

export async function markChangeOrderSent(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const order = await db.changeOrders.get(id);
  if (!order) return;
  await db.changeOrders.update(id, { status: 'sent', sentAt: Date.now(), updatedAt: Date.now() });
  await logActivity({ type: 'change-order', message: `${order.number} marked as sent.`, projectId: order.projectId, amount: order.total });
}

export async function markChangeOrderApproved(id: string, approvedBy: string, approvalId?: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const order = await db.changeOrders.get(id);
  if (!order) return;
  await db.changeOrders.update(id, {
    status: 'approved',
    approvedAt: Date.now(),
    approvedBy,
    approvalId,
    updatedAt: Date.now(),
  });
  await logActivity({
    type: 'approved',
    message: `${order.number} approved by ${approvedBy || 'client'} — ${order.currency} ${order.total.toLocaleString('en-US')} added.`,
    projectId: order.projectId,
    amount: order.total,
  });
}

export async function updateChangeOrder(id: string, patch: Partial<ChangeOrder>): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.changeOrders.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteChangeOrder(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const order = await db.changeOrders.get(id);
  if (!order) return;
  await db.changeOrders.delete(id);
  for (const askId of order.askIds) {
    await db.asks.update(askId, { status: 'open', changeOrderId: undefined });
  }
}

/* ------------------------------------------------------------- demo workspace */

export async function seedDemoWorkspace(): Promise<void> {
  const db = getDb();
  if (!db) return;
  const existingSettings = await db.settings.get('settings');
  const alreadySeeded = (await db.projects.toArray()).some((project) => project.name === 'Halcyon Coffee — brand & site');
  if (alreadySeeded) return;

  const settings = await saveSettings({
    name: existingSettings?.name || 'Sam Rivera',
    businessName: existingSettings?.businessName || 'Rivera Studio',
    role: existingSettings?.role || 'Brand & web designer',
    email: existingSettings?.email || 'sam@riverastudio.com',
    currency: existingSettings?.currency ?? 'USD',
    hourlyRate: existingSettings?.hourlyRate ?? 95,
    tone: existingSettings?.tone ?? 'warm',
    includedRevisions: existingSettings?.includedRevisions ?? 2,
    rushMultiplier: existingSettings?.rushMultiplier ?? 1.5,
    onboardedAt: existingSettings?.onboardedAt ?? Date.now(),
  });

  const project = await createProject({
    name: 'Halcyon Coffee — brand & site',
    clientName: 'Maya Chen',
    clientEmail: 'maya@halcyoncoffee.com',
    rate: 95,
    budget: 7200,
    startDate: addBusinessDays(new Date().toISOString().slice(0, 10), -24),
    dueDate: addBusinessDays(new Date().toISOString().slice(0, 10), 12),
    revisionRounds: 2,
    scope: DEMO_SCOPE.map((item) => ({ ...item, id: uid() })),
    notes: 'Two-phase engagement. Phase one was signed on the original proposal; phase two is TBD.',
  });

  const absorbed: NewAskInput[] = [
    {
      projectId: project.id,
      title: 'Swap the hero photo for the Slack version',
      sourceText: 'Can you swap the hero photo for the one I sent on Slack?',
      verdict: 'covered',
      confidence: 0.88,
      reasons: [{ tone: 'good', text: 'Covered by “Homepage (1)” in your agreed scope.' }],
      workLabel: 'Photo work',
      hours: 1,
      value: 95,
      rush: false,
    },
    {
      projectId: project.id,
      title: 'Add a 6-email welcome sequence',
      sourceText: 'Could you also write a 6-email welcome sequence for the newsletter?',
      verdict: 'extra',
      confidence: 0.8,
      reasons: [{ tone: 'bad', text: 'Your scope explicitly leaves this out: “Copywriting and page content”.' }],
      workLabel: 'Email sequence',
      hours: 6,
      value: 570,
      rush: false,
    },
  ];

  for (const item of absorbed) {
    const ask = await saveAsk(item);
    await updateAsk(ask.id, { status: 'absorbed', decidedAt: Date.now() - 86400000 * 3 });
  }

  const billed = await saveAsk({
    projectId: project.id,
    title: 'Add a pricing page before launch',
    sourceText: 'Quick thing — could you also add a pricing page before launch?',
    verdict: 'extra',
    confidence: 0.8,
    reasons: [{ tone: 'bad', text: 'Your scope covers “Homepage (1)” — this is a different page.' }],
    workLabel: 'Web page',
    hours: 4,
    value: 380,
    rush: true,
  });
  await decideAsk(billed.id, 'bill', settings, { hours: 4, value: 380, timelineDays: 2 });

  const open = await saveAsk({
    projectId: project.id,
    title: 'One more round of revisions on the logo',
    sourceText: 'And one more round of revisions on the logo feels needed — the CEO wants to see something bolder.',
    verdict: 'extra',
    confidence: 0.9,
    reasons: [{ tone: 'bad', text: 'Your agreement includes 2 revision rounds. You have already used 2.' }],
    workLabel: 'Revision round',
    hours: 2.5,
    value: 238,
    rush: false,
  });
  void open;

  await logActivity({ type: 'project', message: 'Sample workspace loaded — explore, then reset it in Settings.', projectId: project.id });
}

/* ------------------------------------------------------------ import / export */

export interface WorkspaceExport {
  app: 'unbilled';
  version: 1;
  exportedAt: string;
  settings: Settings | null;
  projects: Project[];
  asks: Ask[];
  changeOrders: ChangeOrder[];
  activity: Activity[];
}

export async function exportWorkspace(): Promise<WorkspaceExport> {
  const db = getDb();
  if (!db) throw new Error('Storage unavailable');
  const [settings, projects, asks, changeOrders, activity] = await Promise.all([
    db.settings.get('settings'),
    db.projects.toArray(),
    db.asks.toArray(),
    db.changeOrders.toArray(),
    db.activity.toArray(),
  ]);
  return {
    app: 'unbilled',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings ?? null,
    projects,
    asks,
    changeOrders,
    activity,
  };
}

export function validateWorkspace(data: unknown): data is WorkspaceExport {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<WorkspaceExport>;
  return candidate.app === 'unbilled' && Array.isArray(candidate.projects) && Array.isArray(candidate.asks) && Array.isArray(candidate.changeOrders);
}

export async function importWorkspace(data: WorkspaceExport): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Storage unavailable');
  await db.transaction('rw', db.settings, db.projects, db.asks, db.changeOrders, db.activity, async () => {
    await Promise.all([db.settings.clear(), db.projects.clear(), db.asks.clear(), db.changeOrders.clear(), db.activity.clear()]);
    if (data.settings) await db.settings.put({ ...data.settings, id: 'settings' });
    if (data.projects.length) await db.projects.bulkPut(data.projects);
    if (data.asks.length) await db.asks.bulkPut(data.asks);
    if (data.changeOrders.length) await db.changeOrders.bulkPut(data.changeOrders);
    if (data.activity?.length) await db.activity.bulkPut(data.activity);
  });
}

export async function resetWorkspace(): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.transaction('rw', db.settings, db.projects, db.asks, db.changeOrders, db.activity, async () => {
    await Promise.all([db.settings.clear(), db.projects.clear(), db.asks.clear(), db.changeOrders.clear(), db.activity.clear()]);
  });
}

/* ------------------------------------------------------------------- helpers */

export function scriptContextFor(args: {
  settings: Settings;
  project: Project;
  ask: Pick<Ask, 'title' | 'hours' | 'value'>;
  changeOrder?: ChangeOrder;
  link?: string;
  matchedScope?: string;
  timelineDays?: number;
}) {
  const { settings, project, ask, changeOrder, link, matchedScope, timelineDays } = args;
  return {
    userName: settings.name || 'Me',
    businessName: settings.businessName,
    clientName: project.clientName,
    projectName: project.name,
    askTitle: ask.title,
    hours: ask.hours,
    value: ask.value,
    currency: settings.currency,
    tone: settings.tone,
    dueDate: project.dueDate,
    changeOrderNumber: changeOrder?.number,
    changeOrderLink: link,
    validUntil: changeOrder?.validUntil,
    timelineNote: changeOrder?.timelineImpact,
    matchedScope,
    timelineDays,
  };
}

export function draftForAsk(decision: Decision, ctx: ReturnType<typeof scriptContextFor>) {
  return draftFor(decision, ctx);
}
