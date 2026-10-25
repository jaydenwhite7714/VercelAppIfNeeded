import { monthKey } from './format';
import type { Ask, ChangeOrder } from './types';

/** Count distinct request outcomes recorded in a month, including client approvals. */
export function loggedDecisionCount(
  asks: Pick<Ask, 'id' | 'status' | 'decidedAt' | 'createdAt'>[],
  orders: Pick<ChangeOrder, 'id' | 'askIds' | 'status' | 'approvedAt' | 'createdAt'>[],
  selectedMonth: string,
): number {
  const decidedAskIds = new Set<string>();

  for (const ask of asks) {
    if (ask.status !== 'open' && monthKey(ask.decidedAt ?? ask.createdAt) === selectedMonth) {
      decidedAskIds.add(ask.id);
    }
  }

  const knownAskIds = new Set(asks.map((ask) => ask.id));
  let standaloneApprovals = 0;
  for (const order of orders) {
    if (order.status !== 'approved' || monthKey(order.approvedAt ?? order.createdAt) !== selectedMonth) continue;
    const linkedAskIds = order.askIds.filter((id) => knownAskIds.has(id));
    if (linkedAskIds.length) linkedAskIds.forEach((id) => decidedAskIds.add(id));
    else standaloneApprovals += 1;
  }

  return decidedAskIds.size + standaloneApprovals;
}
