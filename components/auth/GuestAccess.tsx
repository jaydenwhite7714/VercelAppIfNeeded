'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { OAuthProviderButtons } from '@/components/auth/OAuthProviderButtons';
import { Button } from '@/components/ui';
import {
  canGuestUseAction,
  emptyGuestState,
  GUEST_ACTION_LIMIT,
  GUEST_STATE_KEY,
  parseGuestState,
  recordGuestAction,
  remainingGuestActions,
  type GuestState,
} from '@/lib/guest-usage';

type Mode = 'loading' | 'welcome' | 'guest' | 'authenticated';
type GuestAccessValue = {
  mode: Mode;
  actionsUsed: number;
  actionsRemaining: number;
  tryAction: () => boolean;
  recordAction: () => void;
  startGuestMode: () => void;
  refreshAuth: () => void;
};

const GuestAccessContext = createContext<GuestAccessValue | null>(null);

type AuthStatus = { providerConfigured?: boolean; authenticated?: boolean };

function isAuthRoute(pathname: string | null): boolean {
  return Boolean(pathname === '/signin' || pathname === '/signup' || pathname === '/forgot-password'
    || pathname === '/verify-email' || pathname === '/update-password' || pathname === '/account/update-password'
    || pathname === '/account/verified' || pathname?.startsWith('/auth/'));
}

export function GuestAccessProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>('loading');
  const [state, setState] = useState<GuestState>(emptyGuestState);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const isAuthPath = isAuthRoute(pathname);

  const save = useCallback((next: GuestState) => {
    setState(next);
    try { window.localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(next)); } catch { /* Keep this tab usable when storage is blocked. */ }
  }, []);

  const refreshAuth = useCallback(() => {
    let active = true;
    fetch('/api/account/status', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Account status is unavailable.');
        return await response.json() as AuthStatus;
      })
      .then((status) => {
        if (!active || !status) return;
        setProviderConfigured(status.providerConfigured === true);
        if (status.authenticated === true) {
          setMode('authenticated');
          setPromptOpen(false);
          return;
        }
        setMode((current) => current === 'authenticated' || current === 'loading' ? 'welcome' : current);
      })
      .catch(() => {
        if (active) setMode((current) => current === 'loading' ? 'welcome' : current);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const stored = parseGuestState(window.localStorage.getItem(GUEST_STATE_KEY));
      if (stored) {
        setState(stored);
        setMode('guest');
        setPromptOpen(stored.actionsUsed >= GUEST_ACTION_LIMIT && !stored.promptDismissed);
      }
    } catch { /* Defaults to the welcome flow. */ }
    const eventHandler = () => refreshAuth();
    window.addEventListener('unbilled:auth-changed', eventHandler);
    return () => window.removeEventListener('unbilled:auth-changed', eventHandler);
  }, [refreshAuth]);

  useEffect(() => {
    const cancel = refreshAuth();
    return cancel;
  }, [pathname, refreshAuth]);

  const tryAction = useCallback(() => {
    if (mode === 'authenticated') return true;
    if (mode !== 'guest') return false;
    if (!canGuestUseAction(state)) {
      setPromptOpen(true);
      return false;
    }
    return true;
  }, [mode, state]);

  const recordAction = useCallback(() => {
    if (mode !== 'guest') return;
    const next = recordGuestAction(state);
    save(next);
    if (next.actionsUsed >= GUEST_ACTION_LIMIT) setPromptOpen(true);
  }, [mode, save, state]);

  const startGuestMode = useCallback(() => {
    let stored: GuestState | null = null;
    try { stored = parseGuestState(window.localStorage.getItem(GUEST_STATE_KEY)); } catch { /* Use this tab's default allowance. */ }
    const next = stored ?? emptyGuestState();
    save(next);
    setMode('guest');
  }, [save]);

  const value = useMemo<GuestAccessValue>(() => ({
    mode,
    actionsUsed: mode === 'guest' ? state.actionsUsed : 0,
    actionsRemaining: mode === 'guest' ? remainingGuestActions(state) : GUEST_ACTION_LIMIT,
    tryAction,
    recordAction,
    startGuestMode,
    refreshAuth,
  }), [mode, state, tryAction, recordAction, startGuestMode, refreshAuth]);

  const continueAsGuest = startGuestMode;

  const dismissPrompt = () => {
    const next = { ...state, promptDismissed: true };
    save(next);
    setPromptOpen(false);
  };

  const showWelcome = mode === 'welcome' && !isAuthPath;
  const showPrompt = mode === 'guest' && state.actionsUsed >= GUEST_ACTION_LIMIT && promptOpen && !isAuthPath;

  return (
    <GuestAccessContext.Provider value={value}>
      {children}
      {showWelcome ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="my-auto w-full max-w-lg overflow-hidden rounded-[24px] border border-line bg-card shadow-[0_30px_100px_rgba(26,31,25,0.28)]">
            <div className="relative overflow-hidden border-b border-line bg-paper/70 px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
              <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft text-accent-deep"><Sparkles className="h-5 w-5" /></div>
              <p className="mono-label relative mt-5 text-accent-deep">A little room for the work</p>
              <h1 id="welcome-title" className="relative mt-2 max-w-md font-display text-[clamp(2rem,7vw,2.9rem)] leading-[1.04] tracking-[-0.045em]">Scope creep shouldn’t be part of the deal.</h1>
              <p className="relative mt-3 max-w-md text-sm leading-relaxed text-ink-mute">Check the ask against what you agreed, price the extra, and find the words to protect your time.</p>
            </div>
            <div className="space-y-4 px-6 py-6 sm:px-8">
              {providerConfigured ? (
                <OAuthProviderButtons next="/app" />
              ) : (
                <div className="rounded-xl border border-gold/30 bg-gold-soft/50 px-4 py-3 text-xs leading-relaxed text-ink-soft">Social sign-in is not configured in this environment. You can still use Unbilled locally.</div>
              )}
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-ink-mute"><span className="h-px flex-1 bg-line" />or try it locally<span className="h-px flex-1 bg-line" /></div>
              <Button variant="outline" className="w-full justify-center" onClick={continueAsGuest}>Continue as guest <ArrowRight className="h-4 w-4" /></Button>
              <p className="text-center text-[11px] leading-relaxed text-ink-mute">Guests get two successful actions. Your work stays in this browser. After sign-in, Settings → Account backup lets you save it as a private cloud snapshot; if one already exists, choose whether to restore or replace it. Nothing uploads or merges automatically.</p>
              <p className="text-center text-xs text-ink-mute">Already have an account? <Link href="/signin" className="font-medium text-ink underline underline-offset-4">Sign in</Link></p>
            </div>
          </section>
        </div>
      ) : null}
      {showPrompt ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="guest-limit-title" className="my-auto w-full max-w-md rounded-[22px] border border-line bg-card p-6 shadow-[0_30px_100px_rgba(26,31,25,0.25)] sm:p-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-deep"><LockKeyhole className="h-4.5 w-4.5" /></div>
            <p className="mono-label mt-4 text-accent-deep">Guest allowance used</p>
            <h2 id="guest-limit-title" className="mt-2 font-display text-3xl leading-tight tracking-[-0.04em]">Keep your work moving.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-mute">You’ve used both guest actions. Your local work is saved in this browser. Sign in to continue; we’ll keep your local copy intact and never overwrite a cloud workspace automatically.</p>
            {providerConfigured ? <div className="mt-5"><OAuthProviderButtons next="/app" /></div> : <Link href="/signin" className="mt-5 block rounded-xl border border-line px-4 py-3 text-center text-sm font-medium">Sign-in setup details</Link>}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-mute"><Link href="/signin" className="underline underline-offset-4">Sign in</Link><span>·</span><Link href="/signup" className="underline underline-offset-4">Email signup</Link></div>
            <button type="button" onClick={dismissPrompt} className="mt-5 w-full rounded-lg px-3 py-2 text-xs text-ink-mute underline underline-offset-4 hover:text-ink">Continue browsing (usage stays locked)</button>
          </section>
        </div>
      ) : null}
    </GuestAccessContext.Provider>
  );
}

export function useGuestAccess(): GuestAccessValue {
  const context = useContext(GuestAccessContext);
  if (!context) throw new Error('useGuestAccess must be used inside GuestAccessProvider.');
  return context;
}
