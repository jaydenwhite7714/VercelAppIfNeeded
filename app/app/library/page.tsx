'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Quote } from 'lucide-react';
import { PageHeader } from '@/components/app/AppShell';
import { Card, CopyButton, SectionLabel, Tabs } from '@/components/ui';
import { LIBRARY } from '@/lib/scripts';
import { useReadySettings } from '@/lib/hooks';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { ReplyPlaybooks } from '@/components/billing/ReplyPlaybooks';

type Category = 'All' | 'Boundaries' | 'Pricing' | 'Revisions' | 'Relationship' | 'Contracts';

export default function LibraryPage() {
  const { settings } = useReadySettings();
  const [category, setCategory] = useState<Category>('All');
  const [open, setOpen] = useState<string | null>(LIBRARY[0]?.id ?? null);

  const scripts = useMemo(() => (category === 'All' ? LIBRARY : LIBRARY.filter((script) => script.category === category)), [category]);

  if (!settings) return null;

  return (
    <>
      <PageHeader
        eyebrow="Reply library"
        title="The sentences you never have time to write"
        description="Copy-ready replies for the moments that cost the most money: the quick favour, the extra round, the deadline that moved. Edit names and numbers, then send."
        actions={
          <Link href="/scope-clauses">
            <Button variant="outline" size="sm">
              Clause library <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />

      <ReplyPlaybooks />

      <Tabs value={category} onChange={setCategory} tabs={(['All', 'Boundaries', 'Pricing', 'Revisions', 'Relationship', 'Contracts'] as Category[]).map((value) => ({ value, label: value }))} />

      <div className="mt-4 space-y-2">
        {scripts.map((script) => {
          const isOpen = open === script.id;
          return (
            <Card key={script.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : script.id)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left"
                aria-expanded={isOpen}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono-label">{script.category}</span>
                    <span className="mono-label">·</span>
                    <span className="mono-label normal-case tracking-[0.03em]">{script.fields.length} fields to fill</span>
                  </div>
                  <p className="mt-1 text-[14px] font-medium leading-snug">{script.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mute">{script.when}</p>
                </div>
                <Quote className={cn('mt-0.5 h-4 w-4 shrink-0 transition-colors', isOpen ? 'text-accent' : 'text-ink-mute')} />
              </button>
              {isOpen ? (
                <div className="border-t border-line bg-paper/40 px-4 py-3.5">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {script.fields.map((field) => (
                      <span key={field} className="rounded-full border border-line bg-card px-2 py-0.5 text-[10.5px] text-ink-mute">
                        {field}
                      </span>
                    ))}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-[1.75] text-ink-soft">{script.body}</pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyButton value={script.body} label="Copy script" variant="primary" />
                    <Link href="/app/requests">
                      <Button size="sm" variant="outline">
                        Use it on a real message
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 p-5">
        <SectionLabel>Put the clauses in the proposal</SectionLabel>
        <p className="mt-2 max-w-[60ch] text-[12.5px] leading-relaxed text-ink-soft">
          The cheapest scope creep is the kind that never happens, because the contract already said what a revision round
          is. The public clause library has eight copy-ready sections — revision caps, rush fees, change request language,
          and the “quick favour” boundary.
        </p>
        <Link href="/scope-clauses" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent-deep link-underline">
          Read the clauses <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </>
  );
}
