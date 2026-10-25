import type { SharedChangeOrder } from '@/lib/codec';
import { money, formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export function ChangeOrderDocument({ order, className }: { order: SharedChangeOrder; className?: string }) {
  const subtotal = order.items.reduce((sum, item) => sum + item.a, 0);
  return (
    <article className={cn('overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-paper)]', className)}>
      <div className="border-b border-line px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-[var(--font-display)] text-[16px] font-semibold tracking-[-0.02em]">
              {order.fromBusiness || order.fromName}
            </p>
            {order.fromEmail ? <p className="mt-0.5 text-[11.5px] text-ink-mute">{order.fromEmail}</p> : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="mono-label text-accent">Change order</p>
            <p className="mt-1 text-[11.5px] tnum text-ink-mute">
              {order.number} · {formatDate(order.issuedAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 pt-5 sm:px-7">
        <div className="grid gap-4 border-b border-dashed border-line pb-4 sm:grid-cols-2">
          <div>
            <p className="mono-label">Prepared for</p>
            <p className="mt-1 text-[13.5px] font-medium">{order.clientName}</p>
            {order.clientEmail ? <p className="text-[11.5px] text-ink-mute">{order.clientEmail}</p> : null}
          </div>
          <div>
            <p className="mono-label">Project</p>
            <p className="mt-1 text-[13.5px] font-medium">{order.projectName}</p>
            {order.validUntil ? <p className="text-[11.5px] text-ink-mute">Valid until {formatDate(order.validUntil)}</p> : null}
          </div>
        </div>

        <h2 className="mt-5 text-[clamp(1.3rem,2.6vw,1.75rem)] font-semibold leading-tight tracking-[-0.02em]">{order.title}</h2>
        {order.summary ? <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-soft">{order.summary}</p> : null}

        <div className="mt-5 overflow-hidden rounded-xl border border-line">
          <div className="hidden grid-cols-[1fr_60px_90px_100px] gap-2 bg-paper/70 px-3 py-2 sm:grid">
            <span className="mono-label">Description</span>
            <span className="mono-label text-right">Hours</span>
            <span className="mono-label text-right">Rate</span>
            <span className="mono-label text-right">Amount</span>
          </div>
          {order.items.map((item, index) => (
            <div
              key={`${item.d}-${index}`}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-t border-line px-3 py-2.5 sm:grid-cols-[1fr_60px_90px_100px]"
            >
              <span className="text-[12.5px] leading-snug text-ink">{item.d}</span>
              <span className="text-right sm:hidden">
                <span className="block text-[12.5px] tnum">{money(item.a, order.currency)}</span>
                <span className="block text-[10px] text-ink-mute tnum">
                  {item.h}h × {money(item.r, order.currency)}
                </span>
              </span>
              <span className="hidden text-right text-[12px] tnum text-ink-soft sm:block">{item.h}</span>
              <span className="hidden text-right text-[12px] tnum text-ink-soft sm:block">{money(item.r, order.currency)}</span>
              <span className="hidden text-right text-[12.5px] tnum sm:block">{money(item.a, order.currency)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-ink bg-ink px-3 py-3 text-paper">
            <span className="mono-label text-paper/60">Total additional fee</span>
            <div className="text-right">
              <span className="block text-[17px] font-medium tnum">{money(order.total, order.currency)}</span>
              {subtotal !== order.total ? <span className="block text-[10px] text-paper/50 tnum">items {money(subtotal, order.currency)}</span> : null}
            </div>
          </div>
        </div>

        {order.timeline ? (
          <div className="mt-4 rounded-xl border border-line bg-paper/50 px-3.5 py-3">
            <p className="mono-label text-accent">Timeline impact</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{order.timeline}</p>
          </div>
        ) : null}

        <div className="mt-4">
          <p className="mono-label">Terms</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">{order.terms}</p>
        </div>

        <div className="mt-5 grid gap-5 border-t border-dashed border-line pt-4 sm:grid-cols-2">
          <div>
            <div className="h-8 border-b border-line-strong" />
            <p className="mono-label mt-1.5">Approved by</p>
          </div>
          <div>
            <div className="h-8 border-b border-line-strong" />
            <p className="mono-label mt-1.5">Date</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-mute">
          <span className="mono-label normal-case tracking-[0.03em]">checksum {order.checksum}</span>
          <span className="mono-label normal-case tracking-[0.03em]">made with unbilled</span>
        </div>
      </div>
    </article>
  );
}
