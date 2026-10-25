import { describe, expect, it } from 'vitest';
import {
  approvalReceipt,
  buildSharedOrder,
  buildSharedScope,
  checksum,
  decodeSharedOrder,
  decodeSharedScope,
  encodeSharedOrder,
  encodeSharedScope,
  isChangeOrderExpired,
  MAX_SHARE_LENGTH,
  parseApprovalReceipt,
  shareUrl,
} from '@/lib/codec';
import { draftFor } from '@/lib/scripts';
import type { ChangeOrder, Settings } from '@/lib/types';

const settings: Settings = {
  id: 'settings',
  name: 'Sam Rivera',
  businessName: 'Rivera Studio',
  role: 'Designer',
  email: 'sam@riverastudio.com',
  currency: 'USD',
  hourlyRate: 95,
  tone: 'warm',
  includedRevisions: 2,
  rushMultiplier: 1.5,
  terms: 'Standard terms.',
  createdAt: 0,
  updatedAt: 0,
};

const order: ChangeOrder = {
  id: 'co1',
  number: 'CO-001',
  projectId: 'p1',
  askIds: ['a1'],
  title: 'Add a pricing page',
  summary: 'Additional work outside the agreed scope.',
  items: [{ id: 'i1', description: 'Add a pricing page', hours: 4, rate: 95, amount: 380 }],
  total: 380,
  currency: 'USD',
  timelineImpact: 'Delivery moves two business days.',
  terms: 'Standard terms.',
  status: 'sent',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('share codec', () => {
  it('round-trips a change order through a URL-safe payload', () => {
    const shared = buildSharedOrder(order, 'Halcyon Coffee', 'Maya Chen', 'maya@halcyoncoffee.com', settings);
    const encoded = encodeSharedOrder(shared);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded.length).toBeLessThan(MAX_SHARE_LENGTH);
    const { order: decoded, corrupted } = decodeSharedOrder(encoded);
    expect(corrupted).toBe(false);
    expect(decoded?.title).toBe('Add a pricing page');
    expect(decoded?.total).toBe(380);
    expect(decoded?.clientName).toBe('Maya Chen');
  });

  it('flags a mangled payload instead of rendering it', () => {
    const shared = buildSharedOrder(order, 'Halcyon Coffee', 'Maya Chen', undefined, settings);
    const encoded = encodeSharedOrder(shared);
    const tampered = `${encoded.slice(0, 20)}${encoded.slice(20, 30) === 'AAAA' ? 'BBBB' : 'AAAA'}${encoded.slice(30)}`;
    const result = decodeSharedOrder(tampered);
    expect(result.order === null || result.corrupted).toBe(true);
  });

  it('returns nothing for garbage input', () => {
    expect(decodeSharedOrder('not-a-payload').order).toBeNull();
  });

  it('produces a stable checksum', () => {
    expect(checksum('hello')).toBe(checksum('hello'));
    expect(checksum('hello')).not.toBe(checksum('hello!'));
  });

  it('builds a fragment-based share url so nothing is sent to a server', () => {
    expect(shareUrl('abc', 'https://unbilled.app')).toBe('https://unbilled.app/c#abc');
  });
});

describe('approval receipts', () => {
  it('round-trips the receipt the client downloads', () => {
    const shared = buildSharedOrder(order, 'Halcyon Coffee', 'Maya Chen', 'maya@halcyoncoffee.com', settings);
    const receipt = approvalReceipt(shared, 'Maya Chen', Date.UTC(2026, 9, 14, 15, 30));
    const parsed = parseApprovalReceipt(receipt);
    expect(parsed?.approvedBy).toBe('Maya Chen');
    expect(parsed?.checksum).toBe(shared.checksum);
    expect(parsed?.total).toBe(380);
    expect(parsed?.changeOrderNumber).toBe('CO-001');
    expect(parsed?.approvedAt).toBe(Date.UTC(2026, 9, 14, 15, 30));
  });

  it('includes the client note safely without letting it imitate receipt fields', () => {
    const shared = buildSharedOrder(order, 'Halcyon Coffee', 'Maya Chen', 'maya@halcyoncoffee.com', settings);
    const receipt = approvalReceipt(
      shared,
      'Maya Chen',
      Date.UTC(2026, 9, 14, 15, 30),
      'Please begin Monday.\nDocument checksum: forged',
    );
    expect(receipt).toContain('> Please begin Monday.\n> Document checksum: forged');
    expect(parseApprovalReceipt(receipt)?.checksum).toBe(shared.checksum);
  });

  it('rejects text that is not a receipt', () => {
    expect(parseApprovalReceipt('Looks good, go ahead!')).toBeNull();
    expect(parseApprovalReceipt('Approved by: Maya Chen')).toBeNull();
  });

  it('requires all document details and a supported currency', () => {
    const shared = buildSharedOrder(order, 'Halcyon Coffee', 'Maya Chen', 'maya@halcyoncoffee.com', settings);
    const receipt = approvalReceipt(shared, 'Maya Chen', Date.UTC(2026, 9, 14, 15, 30));
    expect(parseApprovalReceipt(receipt.replace(/^Document checksum:.*\n/m, ''))).toBeNull();
    expect(parseApprovalReceipt(receipt.replace('USD 380', 'XYZ 380'))).toBeNull();
  });
});

describe('scripts', () => {
  const ctx = {
    userName: 'Sam Rivera',
    businessName: 'Rivera Studio',
    clientName: 'Maya Chen',
    projectName: 'Halcyon Coffee',
    askTitle: 'Add a pricing page',
    hours: 4,
    value: 380,
    currency: 'USD' as const,
    tone: 'warm' as const,
    dueDate: '2026-11-10',
    changeOrderNumber: 'CO-001',
  };

  it('writes a script for every decision without leaving placeholders', () => {
    for (const decision of ['absorb', 'bill', 'decline', 'clarify'] as const) {
      const draft = draftFor(decision, ctx);
      expect(draft.subject.length).toBeGreaterThan(5);
      expect(draft.body.length).toBeGreaterThan(80);
      expect(draft.body).toContain('Maya');
      expect(draft.body).not.toMatch(/\[(client|ask|hours|fee)\]/i);
    }
  });

  it('changes voice with tone', () => {
    const warm = draftFor('decline', { ...ctx, tone: 'warm' });
    const formal = draftFor('decline', { ...ctx, tone: 'formal' });
    expect(warm.body).not.toBe(formal.body);
  });
});

describe('change-order validity window', () => {
  it('allows approvals through the inclusive expiry date and blocks links afterward', () => {
    expect(isChangeOrderExpired('2026-10-25', new Date('2026-10-25T23:59:00Z'))).toBe(false);
    expect(isChangeOrderExpired('2026-10-25', new Date('2026-10-26T00:00:00Z'))).toBe(true);
    expect(isChangeOrderExpired(undefined, new Date('2026-10-26T00:00:00Z'))).toBe(false);
  });
});

describe('shared scope', () => {
  const scopeInput = {
    settings,
    projectName: 'Halcyon Coffee — brand & site',
    clientName: 'Maya Chen',
    dueDate: '2026-11-10',
    revisionRounds: 2,
    rate: 95,
    currency: 'USD' as const,
    deliverables: [{ l: 'Homepage (1)', h: 8 }, { l: 'Interior pages (4)', h: 4 }],
    included: ['2 rounds of revisions', 'Mobile responsive layout'],
    excluded: ['Copywriting and page content', 'Paid ads and social content'],
    note: 'Two rounds included; after that each round is quoted first.',
  };

  it('round-trips a scope document', () => {
    const shared = buildSharedScope(scopeInput);
    const encoded = encodeSharedScope(shared);
    const { scope, corrupted } = decodeSharedScope(encoded);
    expect(corrupted).toBe(false);
    expect(scope?.deliverables).toHaveLength(2);
    expect(scope?.excluded).toContain('Paid ads and social content');
    expect(encoded.length).toBeLessThan(2000);
  });

  it('detects tampering', () => {
    const shared = buildSharedScope(scopeInput);
    const encoded = encodeSharedScope({ ...shared, revisionRounds: 99 });
    expect(decodeSharedScope(encoded).corrupted).toBe(true);
  });

  it('rejects garbage', () => {
    expect(decodeSharedScope('nope').scope).toBeNull();
  });
});
