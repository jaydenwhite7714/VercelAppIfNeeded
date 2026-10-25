import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Button, CopyButton } from '@/components/ui';
import { LIBRARY } from '@/lib/scripts';

export const metadata: Metadata = {
  title: 'Free reply scripts for freelancers',
  description:
    'Copy-ready replies for the awkward client moments: the quick favour, the extra revision round, the rush deadline, the scope reset. Free, no signup.',
  alternates: { canonical: '/library' },
};

const CATEGORIES = ['Boundaries', 'Pricing', 'Revisions', 'Relationship', 'Contracts'] as const;

export default function PublicLibraryPage() {
  return (
    <div>
      <SiteNav />

      <div className="mx-auto max-w-4xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <p className="mono-label text-accent">Reply library</p>
        <h1 className="mt-4 max-w-[26ch] text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.0] tracking-[-0.038em]">
          The sentences you never have time to write.
        </h1>
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-ink-soft">
          The money does not disappear because you lacked a contract. It disappears in the thirty seconds after “could you
          just…”, when you say yes to keep the peace. These are the replies that hold the boundary and the relationship.
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {CATEGORIES.map((category) => (
            <span key={category} className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-ink-soft">
              {category}
            </span>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {LIBRARY.map((script) => (
            <article key={script.id} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
                <div>
                  <p className="mono-label">{script.category}</p>
                  <h2 className="mt-1 text-[19px] leading-tight tracking-[-0.02em]">{script.title}</h2>
                  <p className="mt-0.5 max-w-[60ch] text-[12px] leading-relaxed text-ink-mute">{script.when}</p>
                </div>
                <CopyButton value={script.body} label="Copy" variant="outline" />
              </div>
              <pre className="whitespace-pre-wrap px-4 py-4 font-[var(--font-sans)] text-[12.5px] leading-[1.8] text-ink-soft sm:px-5">
                {script.body}
              </pre>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-4 rounded-[var(--radius-card)] border border-line bg-card p-5 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
          <div>
            <p className="mono-label text-accent">Do it with the numbers filled in</p>
            <h2 className="mt-2 text-[22px] leading-snug tracking-[-0.02em]">
              These scripts work better when they include the fee.
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              Unbilled checks the request against your scope, prices it at your rate, and writes the reply with your
              numbers already in it. One click, no placeholders left to forget.
            </p>
            <Link href="/onboarding" className="mt-3 inline-block">
              <Button size="sm">
                Open the ledger <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="rounded-xl border border-line bg-paper/60 p-3">
            <div className="flex items-center gap-1.5 text-sage">
              <Lock className="h-3 w-3" />
              <span className="mono-label text-sage">free forever</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-mute">
              No email gate, no account. If you use these scripts and they work, tell the next freelancer — that is the
              whole growth plan.
            </p>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
