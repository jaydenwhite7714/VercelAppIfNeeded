import { describe, expect, it } from 'vitest';
import { loggedDecisionCount } from '@/lib/reporting';

const inApril = new Date(2026, 3, 10).getTime();
const inMarch = new Date(2026, 2, 10).getTime();

describe('report decision counts', () => {
  it('counts logged request decisions and new client approvals once, while excluding open asks and drafts', () => {
    const asks = [
      { id: 'absorbed', status: 'absorbed' as const, decidedAt: inApril, createdAt: inMarch },
      { id: 'declined', status: 'declined' as const, decidedAt: inApril, createdAt: inMarch },
      { id: 'clarified', status: 'clarified' as const, decidedAt: inApril, createdAt: inMarch },
      { id: 'approved-later', status: 'billed' as const, decidedAt: inMarch, createdAt: inMarch },
      { id: 'open', status: 'open' as const, createdAt: inApril },
    ];
    const orders = [
      { id: 'approved', askIds: ['approved-later'], status: 'approved' as const, approvedAt: inApril, createdAt: inMarch },
      { id: 'draft', askIds: [], status: 'draft' as const, createdAt: inApril },
    ];

    expect(loggedDecisionCount(asks, orders, '2026-04')).toBe(4);
  });

  it('counts an approval in its approval month without duplicating a same-month request decision', () => {
    const asks = [{ id: 'same-month', status: 'billed' as const, decidedAt: inApril, createdAt: inApril }];
    const orders = [{ id: 'approved', askIds: ['same-month'], status: 'approved' as const, approvedAt: inApril, createdAt: inApril }];

    expect(loggedDecisionCount(asks, orders, '2026-04')).toBe(1);
  });
});
