'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const links = [
  { href: '/#how', label: 'How it works' },
  { href: '/scope-clauses', label: 'Free clauses' },
  { href: '/templates/change-order', label: 'Change order template' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/pricing', label: 'Pricing' },
];

export function SiteNav({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors',
        transparent ? 'border-transparent bg-paper/80 backdrop-blur-md' : 'border-line bg-paper/85 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Unbilled home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-[13.5px] text-ink-soft transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link href="/library" className="hidden text-[13.5px] text-ink-soft transition-colors hover:text-ink sm:block">
            Reply library
          </Link>
          <Link href="/app">
            <Button size="sm" className="hidden sm:inline-flex">
              Open the ledger <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-paper px-5 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-3 text-[15px] text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/app" onClick={() => setOpen(false)} className="mt-4 block">
            <Button className="w-full" size="md">
              Open the ledger <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mono-label mt-4 normal-case tracking-[0.04em]">No account needed · runs in your browser</p>
        </div>
      ) : null}
    </header>
  );
}
