'use client';

import Dexie, { type Table } from 'dexie';
import { CURRENCIES, type Activity, type Ask, type AskStatus, type ChangeOrder, type Project, type Settings, type ScopeItem } from './types';
import { draftFor, type Decision } from './scripts';
import { addBusinessDays } from './format';
import { DEMO_SCOPE } from './demo';
import { z } from 'zod';

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
  if (patch.hourlyRate !== undefined && (!Number.isFinite(patch.hourlyRate) || patch.hourlyRate <= 0)) throw new Error('Hourly rate must be a positive number.');
  if (patch.includedRevisions !== undefined && (!Number.isInteger(patch.includedRevisions) || patch.includedRevisions < 0)) throw new Error('Included revisions must be a non-negative whole number.');
  if (patch.rushMultiplier !== undefined && (!Number.isFinite(patch.rushMultiplier) || patch.rushMultiplier < 1)) throw new Error('Rush multiplier must be at least 1.');
  if (patch.currency !== undefined && !CURRENCIES.some((option) => option.code === patch.currency)) throw new Error('Choose a supported currency.');
  if (patch.tone !== undefined && !['warm', 'firm', 'formal'].includes(patch.tone)) throw new Error('Choose a supported reply tone.');
  return db.transaction('rw', db.settings, async () => {
    const existing = (await db.settings.get('settings')) ?? emptySettings();
    const next: Settings = { ...existing, ...patch, id: 'settings', updatedAt: Date.now() };
    await db.settings.put(next);
    return next;
  });
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
  if (!input.name.trim() || !input.clientName.trim()) throw new Error('A project needs a name and a client.');
  if (!Number.isFinite(input.rate) || input.rate <= 0) throw new Error('Project rate must be a positive number.');
  if (input.budget !== undefined && (!Number.isFinite(input.budget) || input.budget < 0)) throw new Error('Project budget must be a valid non-negative number.');
  if (!Number.isInteger(input.revisionRounds) || input.revisionRounds < 0) throw new Error('Revision rounds must be a non-negative whole number.');
  const hasInvalidScopeItem = input.scope.some((item) => {
    const invalidHours = item.hours !== undefined && (!Number.isFinite(item.hours) || item.hours < 0);
    const invalidQuantity = item.qty !== undefined && (!Number.isFinite(item.qty) || item.qty <= 0);
    return !item.label.trim() || invalidHours || invalidQuantity;
  });
  if (hasInvalidScopeItem) throw new Error('Scope items need a label and valid quantity and hour values.');
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

function validateNewAskInput(input: NewAskInput): void {
  if (!input.title.trim() || !input.sourceText.trim()) throw new Error('A request needs a title and the client message.');
  if (!Number.isFinite(input.hours) || input.hours < 0 || !Number.isFinite(input.value) || input.value < 0) throw new Error('Estimated hours and value must be valid non-negative numbers.');
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) throw new Error('Confidence must be between 0 and 1.');
}

export async function saveAsks(inputs: NewAskInput[]): Promise<Ask[]> {
  const db = getDb();
  if (!db) throw new Error('Storage unavailable');
  if (inputs.length === 0) return [];
  inputs.forEach(validateNewAskInput);
  const createdAt = Date.now();
  const asks = inputs.map((input) => ({ id: uid(), status: 'open' as const, createdAt, ...input }));
  await db.transaction('rw', db.projects, db.asks, async () => {
    const projectIds = [...new Set(asks.map((ask) => ask.projectId))];
    const projects = await db.projects.bulkGet(projectIds);
    if (projects.some((project) => !project)) throw new Error('A selected project no longer exists. No requests were saved.');
    await db.asks.bulkAdd(asks);
  });
  return asks;
}

export async function saveAsk(input: NewAskInput): Promise<Ask> {
  const [ask] = await saveAsks([input]);
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
  const statusMap: Record<Decision, AskStatus> = { absorb: 'absorbed', bill: 'billed', decline: 'declined', clarify: 'clarified' };

  return db.transaction('rw', db.projects, db.asks, db.changeOrders, db.activity, async () => {
    const ask = await db.asks.get(askId);
    if (!ask) throw new Error('Request not found');
    const project = await db.projects.get(ask.projectId);
    if (!project) throw new Error('Project not found');

    if (ask.status === statusMap[decision]) {
      const existingOrder = decision === 'bill' && ask.changeOrderId ? await db.changeOrders.get(ask.changeOrderId) : undefined;
      return { ask, changeOrder: existingOrder };
    }
    if (ask.status === 'billed' && ask.changeOrderId) {
      throw new Error('This request already has a change order. Delete that draft first if you need to change the decision.');
    }

    const hours = options.hours ?? ask.hours;
    const value = options.value ?? ask.value;
    if (!Number.isFinite(hours) || hours < 0 || !Number.isFinite(value) || value < 0) throw new Error('Hours and amount must be valid non-negative numbers.');

    const now = Date.now();
    let changeOrder: ChangeOrder | undefined;
    if (decision === 'bill') {
      const [existing, history] = await Promise.all([
        db.changeOrders.where('projectId').equals(project.id).toArray(),
        db.activity.where('projectId').equals(project.id).toArray(),
      ]);
      const largestNumber = Math.max(
        ...existing.map((order) => Number(order.number.match(/^CO-(\d+)$/i)?.[1] ?? 0)),
        ...history.map((entry) => Number(entry.message.match(/\bCO-(\d+)\b/i)?.[1] ?? 0)),
        0,
      );
      changeOrder = {
        id: uid(), number: `CO-${String(largestNumber + 1).padStart(3, '0')}`,
        projectId: project.id, askIds: [ask.id], title: ask.title,
        summary: `Additional work requested by ${project.clientName}, outside the scope agreed for ${project.name}.`,
        items: [{ id: uid(), description: ask.title, hours, rate: project.rate, amount: value }],
        total: value, currency: settings.currency,
        timelineImpact: options.timelineDays
          ? `Delivery moves ${options.timelineDays} business day${options.timelineDays === 1 ? '' : 's'}, to ${addBusinessDays(project.dueDate ?? new Date().toISOString().slice(0, 10), options.timelineDays)}.`
          : 'Additional work scheduled alongside the current plan; delivery date confirmed on approval.',
        terms: settings.terms, status: 'draft', validUntil: new Date(now + 14 * 86400000).toISOString().slice(0, 10), createdAt: now, updatedAt: now,
      };
      await db.changeOrders.add(changeOrder);
    }

    const nextAsk: Ask = { ...ask, status: statusMap[decision], hours, value, changeOrderId: changeOrder?.id, decidedAt: now };
    await db.asks.put(nextAsk);
    const messages: Record<Decision, string> = {
      absorb: `Absorbed “${ask.title}” for ${project.clientName}.`,
      bill: `Drafted ${changeOrder?.number} for “${ask.title}” for ${project.clientName}; it has not been sent yet.`,
      decline: `Declined “${ask.title}” for ${project.clientName}.`,
      clarify: `Held “${ask.title}” pending scope confirmation.`,
    };
    await db.activity.put({
      id: uid(), at: now,
      type: decision === 'bill' ? 'change-order' : decision === 'absorb' ? 'absorbed' : decision === 'decline' ? 'declined' : 'clarified',
      message: messages[decision], amount: decision === 'decline' ? 0 : value, projectId: project.id,
    });
    return { ask: nextAsk, changeOrder };
  });
}

/* -------------------------------------------------------------- change orders */

export async function markChangeOrderSent(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.transaction('rw', db.changeOrders, db.activity, async () => {
    const order = await db.changeOrders.get(id);
    if (!order || order.status !== 'draft') return;
    const now = Date.now();
    await db.changeOrders.update(id, { status: 'sent', sentAt: now, updatedAt: now });
    await db.activity.put({ id: uid(), at: now, type: 'change-order', message: `${order.number} marked as sent.`, projectId: order.projectId, amount: order.total });
  });
}

export async function markChangeOrderApproved(id: string, approvedBy: string, approvalId?: string, approvedAt?: number): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.transaction('rw', db.changeOrders, db.activity, async () => {
    const order = await db.changeOrders.get(id);
    if (!order || order.status === 'approved') return;
    if (order.status !== 'sent' && order.status !== 'draft') throw new Error('Only an active change order can be marked approved.');
    const now = Date.now();
    const approvalTime = approvedAt !== undefined && Number.isFinite(approvedAt) ? approvedAt : now;
    await db.changeOrders.update(id, { status: 'approved', approvedAt: approvalTime, approvedBy, approvalId, updatedAt: now });
    await db.activity.put({
      id: uid(), at: now, type: 'approved',
      message: `${order.number} recorded as approved by ${approvedBy || 'client'} — ${order.currency} ${order.total.toLocaleString('en-US')}.`,
      projectId: order.projectId, amount: order.total,
    });
  });
}

export async function markChangeOrderDeclined(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.transaction('rw', db.changeOrders, db.asks, db.activity, async () => {
    const order = await db.changeOrders.get(id);
    if (!order || order.status === 'approved' || order.status === 'declined') return;
    const now = Date.now();
    await db.changeOrders.update(id, { status: 'declined', updatedAt: now });
    for (const askId of order.askIds) await db.asks.update(askId, { status: 'declined', decidedAt: now });
    await db.activity.put({ id: uid(), at: now, type: 'declined', message: `${order.number} marked as declined.`, projectId: order.projectId, amount: 0 });
  });
}

export async function updateChangeOrder(id: string, patch: Partial<ChangeOrder>): Promise<void> {
  const db = getDb();
  if (!db) return;

  const editableFields = ['title', 'summary', 'timelineImpact', 'validUntil', 'items', 'total'] as const;
  if (Object.keys(patch).some((key) => !editableFields.includes(key as (typeof editableFields)[number]))) {
    throw new Error('Only the draft description, timeline, expiry, and priced line items can be edited.');
  }

  await db.transaction('rw', db.changeOrders, async () => {
    const order = await db.changeOrders.get(id);
    if (!order) throw new Error('Change order not found.');
    if (order.status !== 'draft') throw new Error('Only draft change orders can be edited. Sent or approved records are kept unchanged.');

    if (patch.title !== undefined && !patch.title.trim()) throw new Error('A change order needs a title.');
    if (patch.summary !== undefined && !patch.summary.trim()) throw new Error('A change order needs a summary.');
    if (patch.timelineImpact !== undefined && !patch.timelineImpact.trim()) throw new Error('A change order needs a timeline note.');
    if (patch.validUntil !== undefined) {
      const expiry = new Date(`${patch.validUntil}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.validUntil) || Number.isNaN(expiry.getTime()) || expiry.toISOString().slice(0, 10) !== patch.validUntil) {
        throw new Error('Enter a valid change-order expiry date.');
      }
    }

    if (patch.items !== undefined || patch.total !== undefined) {
      const items = patch.items;
      if (!items?.length) throw new Error('A change order needs at least one line item.');
      const ids = new Set(items.map((item) => item.id));
      if (ids.size !== items.length || items.some((item) => !item.id.trim() || !item.description.trim()
        || !Number.isFinite(item.hours) || item.hours < 0
        || !Number.isFinite(item.rate) || item.rate < 0
        || !Number.isFinite(item.amount) || item.amount !== Math.round(item.hours * item.rate))) {
        throw new Error('Each line item needs a description and valid hours, rate, and calculated amount.');
      }
      const calculatedTotal = items.reduce((sum, item) => sum + item.amount, 0);
      if (!Number.isFinite(calculatedTotal) || patch.total !== calculatedTotal) {
        throw new Error('The total must equal the sum of the line items. Recheck the hours and rates.');
      }
    }

    await db.changeOrders.update(id, { ...patch, updatedAt: Date.now() });
  });
}

export async function deleteChangeOrder(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.transaction('rw', db.changeOrders, db.asks, async () => {
    const order = await db.changeOrders.get(id);
    if (!order) return;
    if (order.status !== 'draft') throw new Error('Only draft change orders can be deleted. Sent, approved, or declined records are preserved in your ledger.');
    await db.changeOrders.delete(id);
    for (const askId of order.askIds) await db.asks.update(askId, { status: 'open', changeOrderId: undefined });
  });
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

const nonNegative = z.number().finite().min(0);
const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'INR', 'JPY', 'BRL']);
const scopeItemSchema = z.object({ id: z.string().min(1), kind: z.enum(['deliverable', 'included', 'excluded']), label: z.string(), qty: z.number().finite().positive().optional(), hours: nonNegative.optional() });
const settingsSchema = z.object({ id: z.literal('settings'), name: z.string(), businessName: z.string(), role: z.string(), email: z.string(), currency: currencySchema, hourlyRate: z.number().finite().positive(), tone: z.enum(['warm', 'firm', 'formal']), includedRevisions: z.number().int().min(0), rushMultiplier: z.number().finite().min(1), terms: z.string(), onboardedAt: nonNegative.optional(), createdAt: nonNegative, updatedAt: nonNegative });
const projectSchema = z.object({ id: z.string().min(1), name: z.string(), clientName: z.string(), clientEmail: z.string().optional(), status: z.enum(['active', 'paused', 'complete']), rate: z.number().finite().positive(), budget: nonNegative.optional(), startDate: z.string(), dueDate: z.string().optional(), revisionRounds: z.number().int().min(0), scope: z.array(scopeItemSchema), notes: z.string().optional(), createdAt: nonNegative, updatedAt: nonNegative });
const askSchema = z.object({ id: z.string().min(1), projectId: z.string().min(1), sourceText: z.string(), title: z.string(), status: z.enum(['open', 'absorbed', 'billed', 'declined', 'clarified']), verdict: z.enum(['covered', 'gray', 'extra']), confidence: z.number().finite().min(0).max(1), reasons: z.array(z.object({ tone: z.enum(['good', 'bad', 'neutral']), text: z.string() })), matchedScopeId: z.string().optional(), workLabel: z.string().optional(), hours: nonNegative, value: nonNegative, rush: z.boolean(), changeOrderId: z.string().optional(), notes: z.string().optional(), createdAt: nonNegative, decidedAt: nonNegative.optional() });
const orderSchema = z.object({ id: z.string().min(1), number: z.string().min(1), projectId: z.string().min(1), askIds: z.array(z.string()), title: z.string(), summary: z.string(), items: z.array(z.object({ id: z.string().min(1), description: z.string(), hours: nonNegative, rate: nonNegative, amount: nonNegative })), total: nonNegative, currency: currencySchema, timelineImpact: z.string(), terms: z.string(), status: z.enum(['draft', 'sent', 'approved', 'declined']), validUntil: z.string().optional(), createdAt: nonNegative, updatedAt: nonNegative, sentAt: nonNegative.optional(), approvedAt: nonNegative.optional(), approvedBy: z.string().optional(), approvalId: z.string().optional() });
const activitySchema = z.object({ id: z.string().min(1), type: z.enum(['absorbed', 'billed', 'declined', 'clarified', 'project', 'change-order', 'approved']), message: z.string(), amount: nonNegative.optional(), projectId: z.string().optional(), at: nonNegative });
const workspaceSchema = z.object({ app: z.literal('unbilled'), version: z.literal(1), exportedAt: z.string(), settings: settingsSchema.nullable(), projects: z.array(projectSchema), asks: z.array(askSchema), changeOrders: z.array(orderSchema), activity: z.array(activitySchema) }).superRefine((workspace, context) => {
  const projectIds = new Set(workspace.projects.map((project) => project.id));
  const asksById = new Map(workspace.asks.map((ask) => [ask.id, ask]));
  const ordersById = new Map(workspace.changeOrders.map((order) => [order.id, order]));
  const askIds = new Set(asksById.keys());
  const orderIds = new Set(ordersById.keys());
  if (projectIds.size !== workspace.projects.length || askIds.size !== workspace.asks.length || orderIds.size !== workspace.changeOrders.length) context.addIssue({ code: 'custom', message: 'Duplicate record IDs.' });
  workspace.asks.forEach((ask, index) => {
    if (!projectIds.has(ask.projectId)) context.addIssue({ code: 'custom', path: ['asks', index, 'projectId'], message: 'Missing project reference.' });
    if (ask.changeOrderId) {
      const order = ordersById.get(ask.changeOrderId);
      if (!order) context.addIssue({ code: 'custom', path: ['asks', index, 'changeOrderId'], message: 'Missing change-order reference.' });
      else if (order.projectId !== ask.projectId) context.addIssue({ code: 'custom', path: ['asks', index, 'changeOrderId'], message: 'Request and change order belong to different projects.' });
    }
  });
  workspace.changeOrders.forEach((order, index) => {
    const linkedAsks = order.askIds.map((id) => asksById.get(id));
    if (!projectIds.has(order.projectId) || linkedAsks.some((ask) => !ask)) context.addIssue({ code: 'custom', path: ['changeOrders', index], message: 'Invalid project or request reference.' });
    if (linkedAsks.some((ask) => ask && ask.projectId !== order.projectId)) context.addIssue({ code: 'custom', path: ['changeOrders', index, 'askIds'], message: 'Change order and request belong to different projects.' });
    if (order.items.reduce((sum, item) => sum + item.amount, 0) !== order.total) context.addIssue({ code: 'custom', path: ['changeOrders', index, 'total'], message: 'Change-order total does not match its line items.' });
  });
  workspace.activity.forEach((entry, index) => {
    if (entry.projectId && !projectIds.has(entry.projectId)) context.addIssue({ code: 'custom', path: ['activity', index, 'projectId'], message: 'Missing project reference.' });
  });
});

export function validateWorkspace(data: unknown): data is WorkspaceExport {
  return workspaceSchema.safeParse(data).success;
}

export async function importWorkspace(data: WorkspaceExport): Promise<void> {
  if (!validateWorkspace(data)) throw new Error('This backup is invalid or incompatible. Your existing workspace was not changed.');
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
