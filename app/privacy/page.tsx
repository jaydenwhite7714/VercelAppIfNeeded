import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Privacy and data',
  description:
    'Unbilled keeps your working ledger in your browser. Optional verified accounts can store a private, manually saved workspace backup. No analytics or AI vendor.',
  alternates: { canonical: '/privacy' },
};

const SECTIONS = [
  {
    title: 'What stays in this browser',
    body: 'By default, projects, scopes, client names, requests, rates, change orders, and settings are stored in IndexedDB on this device. A local workspace is not protected from other people who can use the same browser profile.',
  },
  {
    title: 'Optional account data',
    body: 'If account services are enabled, Supabase Auth processes your normalized email, username, password credential, verification/reset tokens, and secure session. Unbilled never receives or stores your plaintext password. When you explicitly save a cloud backup in Settings, the complete workspace JSON (which can contain client names, messages, rates, and change orders) is stored in a user-owned database row protected by PostgreSQL row-level security. It is not automatic synchronization.',
  },
  {
    title: 'Optional Pro billing and saved playbooks',
    body: 'If the owner enables Stripe test-mode billing and you choose Pro Checkout, Stripe-hosted pages collect payment details; Unbilled never receives or stores card numbers or security codes. Supabase stores the Stripe customer reference, subscription status, configured price, billing period, and cancellation state under account-level row-level security. Personal reply playbooks you choose to save are stored in your own Supabase rows and protected by server-verified Pro access and RLS. Stripe processes payment information under its own privacy terms; no live payment is available through this test-only integration.',
  },
  {
    title: 'What leaves your browser',
    body: 'No client message is uploaded when you analyze it locally. A change-order link carries the document in the URL fragment — the part after the # — which browsers do not transmit to the link host. Sending that link or a generated email uses your mail client. Choosing a cloud backup is different: it uploads the whole workspace snapshot to the configured Supabase project.',
  },
  {
    title: 'Authentication and tracking',
    body: 'Account cookies are used only for secure sign-in and session refresh, not advertising. The app does not include analytics scripts, session recording, or advertising pixels. Supabase processes account requests and may retain operational/security logs under its own terms and retention policies.',
  },
  {
    title: 'AI and client data',
    body: 'The scope engine is deterministic: pattern matching and a pricing table that runs locally. No language model is called, and no client message is sent to an AI provider.',
  },
  {
    title: 'Backups, deletion, and portability',
    body: 'Settings lets you export/import a local JSON backup. A verified account can manually save, restore, replace, or delete its private cloud snapshot; restoring downloads a backup of the current local workspace first. Removing a local project does not update an older cloud snapshot. Account deletion is not yet self-service; ask the site owner to remove the Auth account. Clearing browser data removes the local copy, not an account backup.',
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
          Unbilled is local-first by design: work happens in your browser and remains there unless you explicitly save
          a private cloud snapshot with a verified account. Here is the data story, including what account setup changes.
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
            Analysis runs locally. If you opt in to a cloud backup, the complete JSON workspace is sent to your account’s
            Supabase row, where row-level security limits access by authenticated user ID. Keep a separate JSON export
            if you need an independent copy.
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
