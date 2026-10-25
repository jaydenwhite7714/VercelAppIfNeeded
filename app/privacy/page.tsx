import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Privacy and data',
  description:
    'Unbilled stores your ledger in your browser. No account, no server-side client data, no analytics, no AI vendor. Here is exactly how it works.',
  alternates: { canonical: '/privacy' },
};

const SECTIONS = [
  {
    title: 'What we store',
    body: 'Nothing on a server. Projects, scopes, client names, requests, rates, change orders, and settings are stored in IndexedDB in your browser. Clearing your browser data deletes them.',
  },
  {
    title: 'What leaves your browser',
    body: 'Only what you choose to send. A change order link carries the entire document in the URL fragment — the part after the # — which browsers never transmit to a server. When you email it, your mail client sends it, not us.',
  },
  {
    title: 'Accounts and tracking',
    body: 'There are no accounts, no cookies for tracking, no analytics scripts, no session recording, and no advertising pixels. The app ships without third-party client-side code beyond its own bundled libraries.',
  },
  {
    title: 'AI and client data',
    body: 'The scope engine is deterministic: pattern matching and a pricing table that runs locally. No language model is called, and no client message is sent to an AI provider.',
  },
  {
    title: 'Backups and portability',
    body: 'You can export your entire workspace as a JSON file at any time in Settings, and import it on another device. You own the file. There is no export request to file and no waiting period.',
  },
  {
    title: 'If you delete something',
    body: 'Deleting a project, request, or change order removes it from your browser immediately. Because there is no server copy, it cannot be recovered unless you exported a backup first.',
  },
];

export default function PrivacyPage() {
  return (
    <div>
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <p className="mono-label text-accent">Privacy and data</p>
        <h1 className="mt-4 text-[clamp(2.1rem,4.8vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.038em]">
          Your client&apos;s business is not our business.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Unbilled is local-first by design. That is not a marketing position — it is why the app loads instantly, works
          offline, and costs nothing to run. Here is the complete data story.
        </p>

        <div className="mt-8 divide-y divide-line border-y border-line">
          {SECTIONS.map((section) => (
            <section key={section.title} className="py-5">
              <h2 className="text-[18px] leading-snug tracking-[-0.015em]">{section.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-card p-5">
          <h2 className="text-[18px]">Questions worth asking any tool you paste a client email into</h2>
          <ul className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-ink-soft">
            <li>• Where does the text go when I hit “analyze”?</li>
            <li>• Is it stored, logged, or used to train a model?</li>
            <li>• Can I delete it, and does deletion actually delete it?</li>
            <li>• What happens if the company shuts down?</li>
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-mute">
            For Unbilled the answers are: nowhere, no, immediately, and your ledger keeps working because it was never on
            our server.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/onboarding">
            <Button size="md">Open the ledger</Button>
          </Link>
          <Link href="/scope-clauses">
            <Button size="md" variant="outline">
              Read the clause library
            </Button>
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
