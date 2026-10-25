import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProject,
  decideAsk,
  exportWorkspace,
  getDb,
  importWorkspace,
  resetWorkspace,
  saveAsk,
  saveAsks,
  saveSettings,
  seedDemoWorkspace,
  markChangeOrderSent,
  markChangeOrderApproved,
  markChangeOrderDeclined,
  deleteChangeOrder,
  updateChangeOrder,
  updateProject,
  updateAsk,
  getSettings,
  validateWorkspace,
} from '@/lib/db';
import { buildSharedOrder, encodeSharedOrder, MAX_SHARE_LENGTH, shareUrl } from '@/lib/codec';
import { computeMetrics } from '@/lib/hooks';
import type { Settings } from '@/lib/types';

async function freshWorkspace(): Promise<Settings> {
  await resetWorkspace();
  return saveSettings({
    name: 'Sam Rivera',
    businessName: 'Rivera Studio',
    role: 'Brand designer',
    email: 'sam@riverastudio.com',
    currency: 'USD',
    hourlyRate: 95,
    tone: 'warm',
    includedRevisions: 2,
    rushMultiplier: 1.5,
    onboardedAt: Date.now(),
  });
}

describe('workspace persistence', () => {
  beforeEach(async () => {
    await freshWorkspace();
  });

  it('creates a project and reads it back', async () => {
    const project = await createProject({
      name: 'Halcyon Coffee',
      clientName: 'Maya Chen',
      rate: 95,
      budget: 7200,
      startDate: '2026-10-01',
      dueDate: '2026-11-10',
      revisionRounds: 2,
      scope: [
        { id: 's1', kind: 'deliverable', label: 'Homepage (1)', hours: 8 },
        { id: 's2', kind: 'excluded', label: 'Copywriting and page content', hours: 2 },
      ],
    });

    const db = getDb()!;
    const stored = await db.projects.get(project.id);
    expect(stored?.clientName).toBe('Maya Chen');
    expect(stored?.scope).toHaveLength(2);

    await updateProject(project.id, { status: 'paused' });
    expect((await db.projects.get(project.id))?.status).toBe('paused');
  });

  it('rejects invalid project prices and request values before storing them', async () => {
    await expect(createProject({ name: 'Bad', clientName: 'Client', rate: Number.NaN, startDate: '2026-10-01', revisionRounds: 1, scope: [] })).rejects.toThrow(/positive number/i);
    await expect(createProject({ name: 'Bad date', clientName: 'Client', rate: 100, startDate: '2026-02-30', revisionRounds: 1, scope: [] })).rejects.toThrow(/start date/i);
    await expect(createProject({ name: 'Bad delivery', clientName: 'Client', rate: 100, startDate: '2026-10-01', dueDate: '2026-09-30', revisionRounds: 1, scope: [] })).rejects.toThrow(/before the project start/i);
    await expect(createProject({ name: 'Bad email', clientName: 'Client', clientEmail: 'not-an-email', rate: 100, startDate: '2026-10-01', revisionRounds: 1, scope: [] })).rejects.toThrow(/client email/i);
    await expect(saveSettings({ email: 'not-an-email' })).rejects.toThrow(/business email/i);
    const project = await createProject({ name: 'Valid', clientName: 'Client', rate: 100, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    await expect(updateProject(project.id, { rate: 0 })).rejects.toThrow(/positive number/i);
    await expect(updateProject(project.id, { clientEmail: 'bad' })).rejects.toThrow(/client email/i);
    await expect(saveAsk({ projectId: project.id, title: 'Bad value', sourceText: 'Add work', verdict: 'extra', confidence: 0.8, reasons: [], hours: 2, value: Number.NaN, rush: false })).rejects.toThrow(/valid non-negative/i);
    expect(await getDb()!.asks.count()).toBe(0);
  });

  it('saves a batch of parsed requests atomically', async () => {
    const project = await createProject({ name: 'Batch test', clientName: 'Client', rate: 100, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    const valid = { projectId: project.id, title: 'Valid item', sourceText: 'Valid item', verdict: 'extra' as const, confidence: 0.8, reasons: [], hours: 1, value: 100, rush: false };
    await expect(saveAsks([valid, { ...valid, title: '', sourceText: '' }])).rejects.toThrow(/needs a title/i);
    expect(await getDb()!.asks.count()).toBe(0);
    const saved = await saveAsks([valid, { ...valid, title: 'Second item', sourceText: 'Second item' }]);
    expect(saved).toHaveLength(2);
    expect(await getDb()!.asks.count()).toBe(2);
  });

  it('does not overwrite settings when an invalid rate is submitted', async () => {
    await saveSettings({ name: 'Keep me', hourlyRate: 95 });
    await expect(saveSettings({ hourlyRate: Number.NaN })).rejects.toThrow(/positive number/i);
    expect((await getSettings())?.hourlyRate).toBe(95);
  });

  it('prevents changing currency after records exist so saved numbers are not silently relabeled', async () => {
    await createProject({ name: 'Currency guard', clientName: 'Client', rate: 100, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    await expect(saveSettings({ currency: 'EUR' })).rejects.toThrow(/relabel|not converted/i);
    expect((await getSettings())?.currency).toBe('USD');
  });

  it('preserves independent profile edits made concurrently', async () => {
    await Promise.all([saveSettings({ name: 'Sam Rivera' }), saveSettings({ businessName: 'Rivera Studio' })]);
    const settings = (await getSettings())!;
    expect(settings.name).toBe('Sam Rivera');
    expect(settings.businessName).toBe('Rivera Studio');
  });

  it('logs settings as a single record', async () => {
    await saveSettings({ name: 'Sam R.' });
    const settings = await getSettings();
    expect(settings?.name).toBe('Sam R.');
    const db = getDb()!;
    expect(await db.settings.count()).toBe(1);
  });

  it('turns a billed request into a change order and a ledger entry', async () => {
    const settings = await freshWorkspace();
    const project = await createProject({
      name: 'Halcyon Coffee',
      clientName: 'Maya Chen',
      rate: 95,
      budget: 7200,
      startDate: '2026-10-01',
      dueDate: '2026-11-10',
      revisionRounds: 2,
      scope: [{ id: 's1', kind: 'deliverable', label: 'Homepage (1)', hours: 8 }],
    });
    const ask = await saveAsk({
      projectId: project.id,
      title: 'Add a pricing page',
      sourceText: 'Could you also add a pricing page?',
      verdict: 'extra',
      confidence: 0.8,
      reasons: [{ tone: 'bad', text: 'Not in scope.' }],
      hours: 4,
      value: 380,
      rush: true,
    });

    const result = await decideAsk(ask.id, 'bill', settings, { hours: 4, value: 380, timelineDays: 2 });
    expect(result.changeOrder?.number).toBe('CO-001');
    expect(result.changeOrder?.total).toBe(380);
    expect(result.ask.status).toBe('billed');
    expect(result.ask.changeOrderId).toBe(result.changeOrder?.id);
    const repeated = await decideAsk(ask.id, 'bill', settings, { hours: 4, value: 380 });
    expect(repeated.changeOrder?.id).toBe(result.changeOrder?.id);

    const db = getDb()!;
    const orders = await db.changeOrders.toArray();
    expect(orders).toHaveLength(1);
    expect(orders[0].timelineImpact).toMatch(/business day/);

    const activity = await db.activity.toArray();
    expect(activity.some((event) => event.type === 'change-order')).toBe(true);

    // a second billed request must increment the change order number
    const second = await saveAsk({
      projectId: project.id,
      title: 'Add analytics',
      sourceText: 'Set up analytics',
      verdict: 'extra',
      confidence: 0.7,
      reasons: [],
      hours: 2,
      value: 190,
      rush: false,
    });
    const secondResult = await decideAsk(second.id, 'bill', settings);
    expect(secondResult.changeOrder?.number).toBe('CO-002');
  });

  it('does not reuse a deleted change-order number', async () => {
    const settings = await freshWorkspace();
    const project = await createProject({ name: 'Number test', clientName: 'Client', rate: 100, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    const first = await saveAsk({ projectId: project.id, title: 'First extra', sourceText: 'First extra', verdict: 'extra', confidence: 0.8, reasons: [], hours: 1, value: 100, rush: false });
    const second = await saveAsk({ projectId: project.id, title: 'Second extra', sourceText: 'Second extra', verdict: 'extra', confidence: 0.8, reasons: [], hours: 1, value: 100, rush: false });
    const firstOrder = (await decideAsk(first.id, 'bill', settings)).changeOrder!;
    await deleteChangeOrder(firstOrder.id);
    const secondOrder = (await decideAsk(second.id, 'bill', settings)).changeOrder!;
    expect(firstOrder.number).toBe('CO-001');
    expect(secondOrder.number).toBe('CO-002');
  });

  it('edits a draft with consistent line-item math and rejects unsafe or inconsistent changes', async () => {
    const settings = await freshWorkspace();
    const project = await createProject({ name: 'Edit test', clientName: 'Client', rate: 95, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    const ask = await saveAsk({ projectId: project.id, title: 'Add a section', sourceText: 'Add a section', verdict: 'extra', confidence: 0.8, reasons: [], hours: 2, value: 190, rush: false });
    const { changeOrder } = await decideAsk(ask.id, 'bill', settings);
    const order = changeOrder!;
    const items = [{ ...order.items[0], description: 'Add a new pricing section', hours: 3, rate: 95, amount: 285 }];

    await updateChangeOrder(order.id, { title: 'Pricing section', items, total: 285, validUntil: '2026-11-15' });
    expect(await getDb()!.changeOrders.get(order.id)).toMatchObject({ title: 'Pricing section', total: 285, validUntil: '2026-11-15', items });
    await expect(updateChangeOrder(order.id, { items, total: 284 })).rejects.toThrow(/total must equal/i);
    await expect(updateChangeOrder(order.id, { status: 'approved' })).rejects.toThrow(/Only the draft description/i);
    await expect(updateChangeOrder(order.id, { validUntil: '2026-99-99' })).rejects.toThrow(/valid.*expiry date/i);
    expect((await getDb()!.changeOrders.get(order.id))?.total).toBe(285);

    await markChangeOrderSent(order.id);
    await expect(updateChangeOrder(order.id, { title: 'Changed after sending' })).rejects.toThrow(/Only draft/i);
    expect((await getDb()!.changeOrders.get(order.id))?.title).toBe('Pricing section');
  });

  it('keeps a declined change order and its linked request in sync', async () => {
    const settings = await freshWorkspace();
    const project = await createProject({ name: 'Decline test', clientName: 'Client', rate: 100, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    const ask = await saveAsk({ projectId: project.id, title: 'New section', sourceText: 'Add a new section', verdict: 'extra', confidence: 0.8, reasons: [], hours: 1, value: 100, rush: false });
    const { changeOrder } = await decideAsk(ask.id, 'bill', settings);
    await markChangeOrderSent(changeOrder!.id);
    await markChangeOrderDeclined(changeOrder!.id);
    const db = getDb()!;
    expect((await db.changeOrders.get(changeOrder!.id))?.status).toBe('declined');
    expect((await db.asks.get(ask.id))?.status).toBe('declined');
    expect((await db.asks.get(ask.id))?.changeOrderId).toBe(changeOrder!.id);
  });

  it('preserves sent and approved change-order history and does not duplicate approval entries', async () => {
    const settings = await freshWorkspace();
    const project = await createProject({ name: 'Ledger project', clientName: 'Client', rate: 100, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    const ask = await saveAsk({ projectId: project.id, title: 'Add a page', sourceText: 'Add a page', verdict: 'extra', confidence: 0.8, reasons: [], hours: 2, value: 200, rush: false });
    const { changeOrder } = await decideAsk(ask.id, 'bill', settings);
    expect(changeOrder).toBeTruthy();
    await markChangeOrderSent(changeOrder!.id);
    await markChangeOrderSent(changeOrder!.id);
    const clientApprovedAt = Date.UTC(2026, 9, 14, 15, 30);
    await markChangeOrderApproved(changeOrder!.id, 'Client', 'receipt-1', clientApprovedAt);
    await markChangeOrderApproved(changeOrder!.id, 'Client', 'receipt-1');

    await expect(deleteChangeOrder(changeOrder!.id)).rejects.toThrow(/preserved/i);
    await expect(updateChangeOrder(changeOrder!.id, { total: 1 })).rejects.toThrow(/Only draft/i);
    const db = getDb()!;
    expect((await db.changeOrders.get(changeOrder!.id))?.total).toBe(200);
    expect((await db.changeOrders.get(changeOrder!.id))?.approvedAt).toBe(clientApprovedAt);
    expect((await db.activity.toArray()).filter((entry) => entry.type === 'approved')).toHaveLength(1);
  });

  it('records absorbed work without creating a change order', async () => {
    const settings = await freshWorkspace();
    const project = await createProject({
      name: 'Small project',
      clientName: 'Alex',
      rate: 80,
      startDate: '2026-10-01',
      revisionRounds: 1,
      scope: [],
    });
    const ask = await saveAsk({
      projectId: project.id,
      title: 'Swap a photo',
      sourceText: 'Swap a photo',
      verdict: 'covered',
      confidence: 0.9,
      reasons: [],
      hours: 1,
      value: 80,
      rush: false,
    });
    const result = await decideAsk(ask.id, 'absorb', settings);
    expect(result.changeOrder).toBeUndefined();
    expect(result.ask.status).toBe('absorbed');

    const db = getDb()!;
    expect(await db.changeOrders.count()).toBe(0);

    const metrics = computeMetrics([project], await db.asks.toArray(), []);
    expect(metrics.absorbedAllTime).toBe(80);
    expect(metrics.absorbedThisMonth).toBe(80);
    expect(metrics.leakRate).toBe(1);
  });

  it('reports only approved billed totals, and separates them from absorbed and pending value', async () => {
    const settings = await freshWorkspace();
    const project = await createProject({ name: 'Report math', clientName: 'Client', rate: 95, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    const absorbed = await saveAsk({ projectId: project.id, title: 'Small included tweak', sourceText: 'Move the logo', verdict: 'covered', confidence: 0.9, reasons: [], hours: 1, value: 120, rush: false });
    await decideAsk(absorbed.id, 'absorb', settings);
    const previousMonthAsk = await saveAsk({ projectId: project.id, title: 'Last month’s extra', sourceText: 'Add a footer', verdict: 'covered', confidence: 0.9, reasons: [], hours: 2, value: 220, rush: false });
    await decideAsk(previousMonthAsk.id, 'absorb', settings);
    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    await updateAsk(previousMonthAsk.id, { decidedAt: previousMonth.getTime() });

    const approvedAsk = await saveAsk({ projectId: project.id, title: 'New page', sourceText: 'Add a new page', verdict: 'extra', confidence: 0.9, reasons: [], hours: 3, value: 285, rush: false });
    const approvedOrder = (await decideAsk(approvedAsk.id, 'bill', settings)).changeOrder!;
    await markChangeOrderApproved(approvedOrder.id, 'Client', 'receipt');

    const draftAsk = await saveAsk({ projectId: project.id, title: 'New section', sourceText: 'Add a section', verdict: 'extra', confidence: 0.8, reasons: [], hours: 2, value: 190, rush: false });
    await decideAsk(draftAsk.id, 'bill', settings);
    await saveAsk({ projectId: project.id, title: 'Open request', sourceText: 'Please review this', verdict: 'gray', confidence: 0.5, reasons: [], hours: 1, value: 90, rush: false });

    const db = getDb()!;
    const metrics = computeMetrics([project], await db.asks.toArray(), await db.changeOrders.toArray());
    expect(metrics.absorbedAllTime).toBe(340);
    expect(metrics.absorbedThisMonth).toBe(120);
    expect(metrics.absorbedHours).toBe(1);
    expect(metrics.billedAllTime).toBe(285);
    expect(metrics.pendingValue).toBe(90);
    expect(metrics.openCount).toBe(1);
    expect(metrics.byProject[0]).toMatchObject({ absorbed: 340, billed: 285, open: 1 });
  });

  it('adds the sample workspace without replacing existing user records and avoids duplicating it', async () => {
    const project = await createProject({ name: 'My real project', clientName: 'Client', rate: 120, startDate: '2026-10-01', revisionRounds: 1, scope: [] });
    const ask = await saveAsk({ projectId: project.id, title: 'My real request', sourceText: 'Please update the brand', verdict: 'covered', confidence: 0.8, reasons: [], hours: 1, value: 120, rush: false });

    await seedDemoWorkspace();
    const afterFirstLoad = await exportWorkspace();
    expect(afterFirstLoad.projects.some((entry) => entry.id === project.id)).toBe(true);
    expect(afterFirstLoad.asks.some((entry) => entry.id === ask.id)).toBe(true);
    const countAfterFirstLoad = afterFirstLoad.projects.length;

    await seedDemoWorkspace();
    expect((await getDb()!.projects.count())).toBe(countAfterFirstLoad);
    expect((await getDb()!.asks.get(ask.id))?.title).toBe('My real request');
  });

  it('exports and restores a workspace as JSON', async () => {
    await seedDemoWorkspace();
    const dumped = await exportWorkspace();
    expect(dumped.projects.length).toBeGreaterThan(0);
    expect(dumped.asks.length).toBeGreaterThan(0);

    await resetWorkspace();
    expect(await getDb()!.projects.count()).toBe(0);

    await importWorkspace(JSON.parse(JSON.stringify(dumped)));
    const restored = await exportWorkspace();
    expect(restored.settings).toEqual(dumped.settings);
    expect(restored.projects).toEqual(dumped.projects);
    expect(restored.asks).toEqual(dumped.asks);
    expect(restored.changeOrders).toEqual(dumped.changeOrders);
    expect(restored.activity).toEqual(dumped.activity);
  });

  it('rejects malformed backups without clearing the existing workspace', async () => {
    await seedDemoWorkspace();
    const existingProjects = await getDb()!.projects.count();
    const invalid = await exportWorkspace();
    const damaged = JSON.parse(JSON.stringify(invalid)) as Record<string, unknown>;
    damaged.projects = [{ name: 'missing required project fields' }];

    expect(validateWorkspace(damaged)).toBe(false);
    await expect(importWorkspace(damaged as never)).rejects.toThrow(/existing workspace was not changed/i);
    expect(await getDb()!.projects.count()).toBe(existingProjects);
  });

  it('rejects a backup with mismatched change-order totals without changing local records', async () => {
    await seedDemoWorkspace();
    const before = await exportWorkspace();
    const damaged = JSON.parse(JSON.stringify(before)) as typeof before;
    damaged.changeOrders[0].total += 1;

    expect(validateWorkspace(damaged)).toBe(false);
    await expect(importWorkspace(damaged)).rejects.toThrow(/existing workspace was not changed/i);
    const after = await exportWorkspace();
    expect(after.projects).toEqual(before.projects);
    expect(after.asks).toEqual(before.asks);
    expect(after.changeOrders).toEqual(before.changeOrders);
    expect(after.activity).toEqual(before.activity);
  });

  it('produces a shareable link that fits in a URL for a real change order', async () => {
    await seedDemoWorkspace();
    const db = getDb()!;
    const settings = (await db.settings.get('settings'))!;
    const order = (await db.changeOrders.toArray())[0];
    const project = (await db.projects.toArray())[0];
    expect(order).toBeTruthy();

    const shared = buildSharedOrder(order, project.name, project.clientName, project.clientEmail, settings);
    const encoded = encodeSharedOrder(shared);
    const url = shareUrl(encoded, 'https://unbilled.app');
    expect(url.length).toBeLessThan(MAX_SHARE_LENGTH);
    expect(url.startsWith('https://unbilled.app/c#')).toBe(true);
  });
});
