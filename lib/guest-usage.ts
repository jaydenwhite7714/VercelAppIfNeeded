export const GUEST_ACTION_LIMIT = 2;
export const GUEST_STATE_KEY = 'unbilled:guest-access:v1';

export interface GuestState {
  choice: 'guest';
  actionsUsed: number;
  promptDismissed: boolean;
}

export function emptyGuestState(): GuestState {
  return { choice: 'guest', actionsUsed: 0, promptDismissed: false };
}

export function parseGuestState(value: string | null): GuestState | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const state = parsed as Partial<GuestState>;
    if (state.choice !== 'guest' || !Number.isInteger(state.actionsUsed) || (state.actionsUsed ?? -1) < 0) return null;
    return {
      choice: 'guest',
      actionsUsed: Math.min(GUEST_ACTION_LIMIT, state.actionsUsed as number),
      promptDismissed: state.promptDismissed === true,
    };
  } catch {
    return null;
  }
}

export function remainingGuestActions(state: GuestState): number {
  return Math.max(0, GUEST_ACTION_LIMIT - state.actionsUsed);
}

export function canGuestUseAction(state: GuestState): boolean {
  return state.actionsUsed < GUEST_ACTION_LIMIT;
}

export function recordGuestAction(state: GuestState): GuestState {
  return { ...state, actionsUsed: Math.min(GUEST_ACTION_LIMIT, state.actionsUsed + 1), promptDismissed: false };
}
