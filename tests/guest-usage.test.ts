import { describe, expect, it } from 'vitest';
import {
  canGuestUseAction,
  emptyGuestState,
  GUEST_ACTION_LIMIT,
  mergeGuestState,
  parseGuestState,
  recordGuestAction,
  remainingGuestActions,
} from '@/lib/guest-usage';

describe('persistent guest allowance model', () => {
  it('starts with exactly two actions and allows navigation without consuming them', () => {
    const state = emptyGuestState();
    expect(GUEST_ACTION_LIMIT).toBe(2);
    expect(remainingGuestActions(state)).toBe(2);
    expect(canGuestUseAction(state)).toBe(true);
  });

  it('counts only recorded successful actions and blocks the third', () => {
    const first = recordGuestAction(emptyGuestState());
    expect(remainingGuestActions(first)).toBe(1);
    expect(canGuestUseAction(first)).toBe(true);
    const second = recordGuestAction(first);
    expect(remainingGuestActions(second)).toBe(0);
    expect(canGuestUseAction(second)).toBe(false);
    expect(recordGuestAction(second).actionsUsed).toBe(2);
  });

  it('keeps the highest cross-tab usage count and avoids reopening a dismissed limit prompt', () => {
    const local = { choice: 'guest' as const, actionsUsed: 1, promptDismissed: true };
    const staleIncoming = { choice: 'guest' as const, actionsUsed: 0, promptDismissed: false };
    const currentIncoming = { choice: 'guest' as const, actionsUsed: 1, promptDismissed: false };
    expect(mergeGuestState(local, staleIncoming)).toEqual(local);
    expect(mergeGuestState(local, currentIncoming)).toEqual(local);
    expect(mergeGuestState(local, { ...currentIncoming, actionsUsed: 2 })).toEqual({ ...currentIncoming, actionsUsed: 2 });
  });

  it('round-trips persisted usage across refresh and clamps malformed over-limit data', () => {
    const state = recordGuestAction(recordGuestAction(emptyGuestState()));
    expect(parseGuestState(JSON.stringify(state))).toEqual(state);
    expect(parseGuestState(JSON.stringify({ choice: 'guest', actionsUsed: 99, promptDismissed: false })))
      .toEqual({ choice: 'guest', actionsUsed: 2, promptDismissed: false });
    expect(parseGuestState('{not json')).toBeNull();
    expect(parseGuestState(JSON.stringify({ choice: 'guest', actionsUsed: -1 }))).toBeNull();
  });
});
