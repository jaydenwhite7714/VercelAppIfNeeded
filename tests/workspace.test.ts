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
  saveSettings,
  seedDemoWorkspace,
  updateProject,
  getSettings,
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

    const db = getDb()!;
    const orders = await db.changeOrders.toArray();
    expect(orders).toHaveLength(1);
    expect(orders[0].timelineImpact).toMatch(/business day/);

    const activity = await db.activity.toArray();
    expect(activity.some((event) => event.type === 'billed')).toBe(true);

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

  it('exports and restores a workspace as JSON', async () => {
    await seedDemoWorkspace();
    const dumped = await exportWorkspace();
    expect(dumped.projects.length).toBeGreaterThan(0);
    expect(dumped.asks.length).toBeGreaterThan(0);

    await resetWorkspace();
    expect(await getDb()!.projects.count()).toBe(0);

    await importWorkspace(JSON.parse(JSON.stringify(dumped)));
    expect(await getDb()!.projects.count()).toBe(dumped.projects.length);
    expect(await getDb()!.asks.count()).toBe(dumped.asks.length);
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
