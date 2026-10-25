import Link from 'next/link';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div>
      <SiteNav />
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center sm:py-32">
        <p className="mono-label text-accent">404 · not found</p>
        <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight tracking-[-0.03em]">
          This page is out of scope.
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-soft">
          The link may be broken, or the page may have moved. The ledger is still where you left it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/app">
            <Button size="md">Open the ledger</Button>
          </Link>
          <Link href="/">
            <Button size="md" variant="outline">
              Back to the homepage
            </Button>
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
