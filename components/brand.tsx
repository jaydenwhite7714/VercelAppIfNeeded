import { cn } from '@/lib/cn';
import type { Verdict } from '@/lib/types';
import { VERDICT_META } from '@/lib/types';
import { AlertTriangle, Check, CircleDashed } from 'lucide-react';

export function LogoMark({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'paper' }) {
  const fill = tone === 'ink' ? '#14161A' : '#F5F0E6';
  const cut = tone === 'ink' ? '#F5F0E6' : '#14161A';
  return (
    <svg viewBox="0 0 32 32" className={cn('h-7 w-7', className)} aria-hidden fill="none">
      <path
        d="M6 3.5h20a1.5 1.5 0 0 1 1.5 1.5v19.2l-3.1-1.6-3 2.1-3.1-2.2-3.2 2.2-3-2.1-3.1 1.6V5A1.5 1.5 0 0 1 6 3.5Z"
        fill={fill}
      />
      <path d="M10.5 9.5h11" stroke={cut} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M10.5 13.5h6" stroke={cut} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M10.5 18.5h11" stroke={cut} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="21.6" cy="13.6" r="2.3" fill="#D14727" />
      <path d="M21.6 16.4v3.2" stroke="#D14727" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'paper' }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark tone={tone} />
      <span className={cn('font-display text-[19px] font-semibold tracking-[-0.03em]', tone === 'ink' ? 'text-ink' : 'text-paper')}>
        unbilled<span className="text-accent">.</span>
      </span>
    </span>
  );
}

export function VerdictChip({ verdict, size = 'md', withIcon = true }: { verdict: Verdict; size?: 'sm' | 'md'; withIcon?: boolean }) {
  const meta = VERDICT_META[verdict];
  const styles: Record<Verdict, string> = {
    covered: 'border-sage/25 bg-sage-soft text-sage',
    gray: 'border-gold/30 bg-gold-soft text-gold',
    extra: 'border-accent/25 bg-accent-soft text-accent-deep',
  };
  const Icon = verdict === 'covered' ? Check : verdict === 'gray' ? CircleDashed : AlertTriangle;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium leading-none',
        styles[verdict],
        size === 'sm' ? 'px-2 py-[3px] text-[11px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      {withIcon ? <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.4} /> : null}
      {meta.short}
    </span>
  );
}

export function Underline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 12" preserveAspectRatio="none" className={cn('h-2.5 w-full', className)} aria-hidden fill="none">
      <path d="M2 8.2C46 3.6 96 2.4 135 4.1c34 1.4 66 3.4 103 1.1" stroke="#D14727" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 11c52-2.4 96-2.9 132-1.6" stroke="#D14727" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.18] mix-blend-multiply"
      aria-hidden
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
