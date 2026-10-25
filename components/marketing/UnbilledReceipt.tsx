import { LogoMark } from '@/components/brand';
import { cn } from '@/lib/cn';

const ITEMS = [
  { label: 'Pricing page', hours: '4h', amount: '$380' },
  { label: 'Revision round 3', hours: '2.5h', amount: '$238' },
  { label: '6-email welcome sequence', hours: '6h', amount: '$570' },
  { label: 'Logo “but bolder” pass', hours: '3h', amount: '$285' },
  { label: 'Business card exports', hours: '1.5h', amount: '$143' },
];

export function UnbilledReceipt({ className, compact = false }: { className?: string; compact?: boolean }) {
  const total = 1616;
  const hours = 17;

  return (
    <div className={cn('relative mx-auto w-full max-w-[336px]', className)}>
      <div className="absolute inset-x-6 -bottom-4 h-8 rounded-[50%] bg-ink/10 blur-xl" aria-hidden />
      <figure className="receipt-shell relative rounded-t-[10px] border border-b-0 border-line-strong shadow-[0_18px_40px_-24px_rgba(20,22,26,0.55)]">
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LogoMark className="h-4 w-4" />
              <span className="font-display text-[13px] font-semibold tracking-[-0.02em]">unbilled</span>
            </div>
            <span className="mono-label">no. 0042</span>
          </div>

          <div className="mt-3 border-y border-dashed border-line-strong/80 py-2">
            <p className="mono-label">Work performed for free</p>
            <p className="mt-0.5 text-[11.5px] text-ink-soft">Halcyon Coffee · Maya Chen</p>
          </div>

          <ul className={cn('mt-3 space-y-2', compact && 'space-y-1.5')}>
            {ITEMS.map((item) => (
              <li key={item.label} className="flex items-baseline text-[11.5px] leading-tight">
                <span className="text-ink">{item.label}</span>
                <span className="leader" aria-hidden />
                <span className="shrink-0 tnum text-ink-soft">{item.amount}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-dashed border-line-strong/80 pt-2.5">
            <div className="flex items-baseline justify-between text-[11.5px] text-ink-mute">
              <span>Subtotal</span>
              <span className="tnum">$1,616.00</span>
            </div>
            <div className="flex items-baseline justify-between text-[11.5px] text-ink-mute">
              <span>Invoice sent</span>
              <span className="tnum">$0.00</span>
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between border-t-2 border-ink pt-2.5">
            <div>
              <p className="mono-label">Total absorbed</p>
              <p className="mt-0.5 text-[10.5px] text-ink-mute">{hours} hours · 5 requests</p>
            </div>
            <p className="font-display text-[30px] leading-none tracking-[-0.03em] tnum">${total.toLocaleString('en-US')}</p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-dashed border-line-strong/80 pt-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">thank you for your patience</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-accent">unbilled.app</span>
          </div>
        </div>

        {/* perforated edge */}
        <div className="absolute inset-y-0 left-0 w-px bg-[repeating-linear-gradient(to_bottom,var(--color-line-strong)_0_3px,transparent_3px_7px)]" aria-hidden />
        <div className="absolute inset-y-0 right-0 w-px bg-[repeating-linear-gradient(to_bottom,var(--color-line-strong)_0_3px,transparent_3px_7px)]" aria-hidden />
      </figure>
      <div className="receipt-teeth" aria-hidden />
      <figcaption className="sr-only">
        Illustration of an Unbilled receipt: five absorbed client requests totalling $1,616 across 17 hours, with nothing
        invoiced.
      </figcaption>
    </div>
  );
}
