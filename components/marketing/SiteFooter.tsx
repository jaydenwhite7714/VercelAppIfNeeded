import Link from 'next/link';
import { Wordmark } from '@/components/brand';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/app', label: 'The ledger' },
      { href: '/#how', label: 'How it works' },
      { href: '/library', label: 'Reply library' },
      { href: '/app/reports', label: 'Leak report' },
    ],
  },
  {
    title: 'Free resources',
    links: [
      { href: '/scope-clauses', label: 'Scope clause library' },
      { href: '/templates/change-order', label: 'Change order template' },
      { href: '/templates/scope-of-work', label: 'Scope of work starter' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/privacy', label: 'Privacy & data' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-deep/40">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-[26ch] text-[13px] leading-relaxed text-ink-mute">
              A quiet ledger for the work you do for free. Built for freelancers who would rather keep the client than
              lose the money.
            </p>
            <p className="mono-label mt-5 normal-case tracking-[0.04em] text-ink-mute">
              Built local-first. Accounts are optional; only private backup snapshots are stored with opt-in.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="mono-label">{column.title}</p>
              <ul className="mt-3 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-[13px] text-ink-soft transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-ink-mute">© {new Date().getFullYear()} Unbilled. Made for people who invoice.</p>
          <p className="max-w-lg text-[11px] leading-relaxed text-ink-mute">
            Unbilled is not a law firm and does not give legal advice. Estimates are market medians to help you price
            your work, not a quote.
          </p>
        </div>
      </div>
    </footer>
  );
}
