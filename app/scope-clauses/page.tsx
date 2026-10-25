import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Button, CopyButton } from '@/components/ui';
import { CLAUSES } from '@/lib/clauses';

export const metadata: Metadata = {
  title: 'Free scope clause library for freelancers',
  description:
    'Ten copy-ready contract clauses for freelancers: revision limits, change orders, rush fees, goodwill, payments, usage rights. Plain language, free to use.',
  alternates: { canonical: '/scope-clauses' },
  openGraph: { title: 'The scope clause library', description: 'Ten contract clauses that make scope creep a process problem, not a personality problem.' },
};

export default function ScopeClausesPage() {
  return (
    <div>
      <SiteNav />

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="grid gap-8 lg:grid-cols-[0.62fr_0.38fr] lg:items-end">
          <div>
            <p className="mono-label text-accent">Free clause library</p>
            <h1 className="mt-4 max-w-[24ch] text-[clamp(2.2rem,5.4vw,3.6rem)] font-semibold leading-[1.0] tracking-[-0.038em]">
              End the argument before it starts.
            </h1>
            <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-ink-soft">
              Ten copy-ready sections for your proposal or contract. Written in plain language, tested against the
              requests that actually cost freelancers money — extra rounds, “quick” additions, pulled-forward deadlines,
              and the mystery of the source files.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="#clause-01">
                <Button size="md">
                  Start reading <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link href="/templates/scope-of-work">
                <Button size="md" variant="outline">
                  Build a scope of work
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="mono-label">How to use these</p>
            <ol className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
              <li>
                <span className="font-medium text-ink">1.</span> Replace every [bracket] with your numbers.
              </li>
              <li>
                <span className="font-medium text-ink">2.</span> Delete what does not apply. Shorter is stronger.
              </li>
              <li>
                <span className="font-medium text-ink">3.</span> Put clauses 01, 03 and 09 in every proposal. They do most
                of the work.
              </li>
              <li>
                <span className="font-medium text-ink">4.</span> Have a lawyer review anything high-value. This is not
                legal advice.
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.24fr_0.76fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 border-l border-line pl-4" aria-label="Clauses">
              <p className="mono-label">Contents</p>
              <ul className="mt-2.5 space-y-1.5">
                {CLAUSES.map((clause) => (
                  <li key={clause.id}>
                    <a href={`#clause-${clause.number}`} className="flex gap-2 text-[12px] text-ink-soft transition-colors hover:text-ink">
                      <span className="tnum text-ink-mute">{clause.number}</span>
                      {clause.title}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl border border-line bg-card p-3">
                <div className="flex items-center gap-1.5 text-sage">
                  <Lock className="h-3 w-3" />
                  <span className="mono-label text-sage">free to use</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-mute">
                  No email gate. Copy them, adapt them, put them in your proposal.
                </p>
              </div>
            </nav>
          </aside>

          <div className="space-y-4">
            {CLAUSES.map((clause) => (
              <article key={clause.id} id={`clause-${clause.number}`} className="scroll-mt-24 rounded-[var(--radius-card)] border border-line bg-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="mono-label text-accent">{clause.number} · {clause.tags.join(' / ')}</p>
                    <h2 className="mt-1.5 text-[22px] leading-tight tracking-[-0.02em]">{clause.title}</h2>
                  </div>
                  <CopyButton value={clause.body} label="Copy clause" variant="outline" />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-mute">
                  <span className="font-medium text-ink-soft">Use it when:</span> {clause.when}
                </p>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-paper/50 p-3.5 font-[var(--font-sans)] text-[12.5px] leading-[1.75] text-ink-soft sm:p-4">
                  {clause.body}
                </pre>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {clause.fields.map((field) => (
                    <span key={field} className="rounded-full border border-line bg-paper/60 px-2 py-0.5 text-[10.5px] text-ink-mute">
                      {field}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-[var(--radius-card)] border border-line bg-ink p-6 text-paper sm:p-9">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="mono-label text-paper/50">From clause to invoice</p>
              <h2 className="mt-3 max-w-[26ch] text-[clamp(1.6rem,3.4vw,2.3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
                Clauses stop the argument. The ledger proves you were right.
              </h2>
              <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-paper/70">
                Unbilled checks every client request against your scope, prices it at your rate, and writes the change
                order when the answer is no.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link href="/onboarding">
                <Button variant="accent" size="md">
                  Open the ledger <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/templates/change-order">
                <Button variant="outline" size="md" className="border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:text-paper">
                  Change order template
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-[11px] leading-relaxed text-ink-mute">
          These clauses are provided for general information. They are not legal advice and do not create a lawyer-client
          relationship. Contract law varies by jurisdiction — have a qualified professional review agreements for
          high-value work.
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
