import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleSlash2,
  FileSignature,
  Fingerprint,
  Quote,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { ScopeCheckDemo } from '@/components/ScopeCheckDemo';
import { UnbilledReceipt } from '@/components/marketing/UnbilledReceipt';
import { Button, SectionLabel } from '@/components/ui';
import { Underline } from '@/components/brand';
import { LIBRARY } from '@/lib/scripts';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const PHRASES = [
  '“Quick thing…”',
  '“Shouldn’t take long”',
  '“One more round”',
  '“While you’re at it”',
  '“Nothing fancy”',
  '“Just a small tweak”',
  '“The client loved it, but…”',
  '“Can we hop on a call?”',
];

const STATS = [
  {
    value: '52%',
    label: 'of projects reported scope creep in a PMI survey',
    note: 'PMI, Pulse of the Profession 2018',
    sourceUrl: 'https://www.pmi.org/-/media/pmi/documents/public/pdf/learning/thought-leadership/pulse/pulse-of-the-profession-2018.pdf',
  },
  {
    value: '$1–5k',
    label: 'monthly scope-creep losses reported by 57% of agencies',
    note: 'Ignition, 2025 agency survey',
    sourceUrl: 'https://www.ignitionapp.com/2025-agency-pricing-cashflow-report',
  },
  {
    value: '97%',
    label: 'of agencies are chasing late payments',
    note: 'Ignition, 2025 agency survey',
    sourceUrl: 'https://www.ignitionapp.com/2025-agency-pricing-cashflow-report',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Paste the message',
    body: 'The Slack thread, the Friday email, the “quick favor”. Unbilled splits it into individual requests — including the ones buried in the middle of a compliment.',
    visual: (
      <div className="rounded-xl border border-line bg-paper/70 p-3">
        <div className="flex items-center gap-1.5 pb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
          <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
          <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
          <span className="mono-label ml-1">client email</span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          “Quick thing — <span className="bg-gold-soft px-0.5">could you also add a pricing page</span> before launch? And{' '}
          <span className="bg-accent-soft px-0.5">one more round of revisions</span> on the logo feels needed.”
        </p>
      </div>
    ),
  },
  {
    n: '02',
    title: 'See what is actually inside',
    body: 'Every request gets a verdict against your agreed scope, an hour estimate, and a price at your rate — with the reason shown, so you never have to guess why.',
    visual: (
      <div className="space-y-1.5">
        {[
          { verdict: 'Extra', value: '$380', reason: 'Homepage ≠ pricing page', tone: 'accent' },
          { verdict: 'Covered', value: '—', reason: 'Hero photo swaps', tone: 'sage' },
          { verdict: 'Extra', value: '$238', reason: '2 of 2 revisions used', tone: 'accent' },
        ].map((row) => (
          <div key={row.reason} className="flex items-center justify-between rounded-lg border border-line bg-card px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span
                className={
                  row.tone === 'accent'
                    ? 'rounded-full bg-accent-soft px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-accent-deep'
                    : 'rounded-full bg-sage-soft px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-sage'
                }
              >
                {row.verdict}
              </span>
              <span className="text-[11px] text-ink-soft">{row.reason}</span>
            </div>
            <span className="text-[11px] font-medium tnum text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    n: '03',
    title: 'Pick your move, send the words',
    body: 'Absorb it with a cap. Bill it as a change order. Decline it warmly. Hold it until they decide. Each choice writes the email in the tone you actually use.',
    visual: (
      <div className="rounded-xl border border-line bg-card p-3">
        <p className="mono-label">subject</p>
        <p className="mt-1 text-[11.5px] font-medium text-ink">Halcyon Coffee — change order CO-001</p>
        <div className="mt-2 h-px bg-line" />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
          “Love this direction — and it’s doable. It does sit outside what we agreed, so here’s the cleanest way to
          handle it…”
        </p>
      </div>
    ),
  },
  {
    n: '04',
    title: 'Watch the leak close',
    body: 'Approved change orders become revenue in the ledger. The monthly Leak Report shows exactly what you gave away, to whom, and what it cost — the number you can act on.',
    visual: (
      <div className="rounded-xl border border-line bg-card p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="mono-label">absorbed this month</p>
            <p className="mt-1 font-display text-2xl leading-none tnum">$1,240</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-deep">
            <TrendingDown className="h-3 w-3" /> 14h unbilled
          </span>
        </div>
        <div className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          <span className="h-full w-[68%] bg-accent" />
          <span className="h-full flex-1 bg-sage/70" />
        </div>
        <div className="mt-1.5 flex justify-between text-[9.5px] uppercase tracking-wider text-ink-mute">
          <span>absorbed</span>
          <span>billed</span>
        </div>
      </div>
    ),
  },
];

const FEATURES = [
  {
    icon: Wallet,
    title: 'A ledger, not a time tracker',
    body: 'Every extra request becomes a line item — absorbed, billed, declined, or held. You finally have a number for the thing you have always described as “a lot of little stuff”.',
  },
  {
    icon: Quote,
    title: 'The words you would rather not find',
    body: 'Four decisions, three tones, zero corporate sludge. Warm, firm, or formal — written to keep the client and still get paid.',
  },
  {
    icon: FileSignature,
    title: 'Change orders that look like a firm',
    body: 'A priced, itemised change order with a link your client can approve without an account. Download it as a PDF or mark it approved with a receipt.',
  },
  {
    icon: Fingerprint,
    title: 'Local-first privacy',
    body: 'No account is required for the ledger. Analysis stays in your browser; an optional verified account can store a private snapshot only when you choose to upload it. Shared documents travel in the URL fragment and are visible to anyone with the link.'
  },
];

const FAQ = [
  {
    q: 'Is this just another AI wrapper?',
    a: 'No. The scope check is a deterministic rules engine: it reads the request, matches it against your scope, and prices the work. No model, no API key, no waiting, no client data leaving the page. It shows its reasoning so you can disagree with it.',
  },
  {
    q: 'Do I need a signed contract?',
    a: 'No. A plain-language scope summary is enough: what is included, what is excluded, how many revision rounds, and your rate. The project setup takes about a minute, and you can import an existing scope item by item.',
  },
  {
    q: 'What if it gets a verdict wrong?',
    a: 'Every request is editable — title, hours, price, and verdict. The engine shows why it decided what it decided, so overriding it takes one click. It is designed to catch the request you would otherwise skim past, not to replace your judgement.',
  },
  {
    q: 'Where is my data stored?',
    a: 'The working ledger stays in this browser’s IndexedDB by default. You can export a JSON backup, or opt into a verified account and manually save a private snapshot to Supabase. Restore downloads a local backup first; this is not automatic sync.',
  },
  {
    q: 'How do clients approve a change order?',
    a: 'You share a self-contained link. The document is carried in the URL fragment and is not stored on Unbilled servers, but it is not encrypted or access-controlled: anyone with the link can read it. A client can create a timestamped receipt on their device; they must send it back to you, because the app does not transmit approval automatically.'
  },
  {
    q: 'What does it cost?',
    a: 'The Unbilled app is free during beta. No account is required to use the local workspace, and there is no checkout or subscription. Optional account features depend on the configured provider’s free-tier limits.',
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

const APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Unbilled',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'A free-work ledger for freelancers: find the extra work hiding in client messages, price it at your rate, and send the reply that gets it paid.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function LandingPage() {
  const clauseIndex = LIBRARY.findIndex((item) => item.id === 'free-work-boundary');
  const clause = LIBRARY[clauseIndex];

  return (
    <div className="relative min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([APP_SCHEMA, FAQ_SCHEMA]) }} />
      <SiteNav transparent />

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(900px 420px at 78% -8%, rgba(209,71,39,0.10), transparent 70%), radial-gradient(700px 380px at 8% 8%, rgba(44,91,75,0.08), transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
          aria-hidden
          style={{ backgroundImage: 'linear-gradient(to right, rgba(20,22,26,0.12) 50%, transparent 0)', backgroundSize: '10px 1px' }}
        />

        <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10 lg:pt-20">
          <div className="animate-rise">
            <div className="flex items-center gap-2">
              <span className="mono-label text-accent">The free-work ledger</span>
              <span className="mono-label text-ink-mute">for freelancers</span>
            </div>

            <h1 className="mt-5 text-[clamp(2.6rem,6.4vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              Every favor
              <br />
              has a price.
              <br />
              <span className="relative inline-block pb-1">
                Now you can see it.
                <span className="absolute -bottom-1 left-0 w-full">
                  <Underline />
                </span>
              </span>
            </h1>

            <p className="mt-7 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-soft">
              Paste the client message. Unbilled finds every request hiding in the friendly tone, checks it against what
              you actually agreed to, prices it at your rate — and writes the reply you have been putting off.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link href="/onboarding">
                <Button size="lg" className="w-full sm:w-auto">
                  Open the ledger — it&apos;s free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Try it on a real message
                </Button>
              </a>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-mute">
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-sage" /> No sign-up
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sage" /> Scope check stays local
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sage" /> Works offline
              </span>
            </div>

            <div className="mt-9 flex items-center gap-3 border-t border-line pt-5">
              <div className="flex -space-x-1.5" aria-hidden>
                {['bg-accent/80', 'bg-sage/80', 'bg-gold/80', 'bg-ink/70'].map((color) => (
                  <span key={color} className={`h-6 w-6 rounded-full border-2 border-paper ${color}`} />
                ))}
              </div>
              <p className="text-[12px] leading-snug text-ink-mute">
                Built for designers, developers, copywriters, photographers, consultants, and anyone who has ever said
                “sure, no problem” while quietly doing $400 of extra work.
              </p>
            </div>
          </div>

          <div id="demo" className="animate-rise scroll-mt-24 [animation-delay:120ms]">
            <ScopeCheckDemo />
            <p className="mt-2.5 text-center text-[11px] text-ink-mute">
              A live demo with a realistic scope. Change the message, the rate, or the wording — it is all local.
            </p>
          </div>
        </div>

        {/* phrases strip */}
        <div className="border-y border-line bg-paper-deep/30">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 sm:px-8">
            <span className="mono-label shrink-0">Things clients actually say</span>
            {PHRASES.map((phrase) => (
              <span key={phrase} className="text-[12.5px] text-ink-soft/80">
                {phrase}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- stats */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STATS.map((stat, index) => (
            <div key={stat.value} className={index > 0 ? 'sm:border-l sm:border-line sm:pl-6' : ''}>
              <p className="font-display text-[clamp(2.4rem,5vw,3.2rem)] leading-none tracking-[-0.04em] tnum">
                {stat.value}
              </p>
              <p className="mt-2.5 max-w-[26ch] text-[13.5px] leading-snug text-ink-soft">{stat.label}</p>
              <a
                className="mono-label mt-2 inline-block normal-case tracking-[0.03em] text-ink-mute underline decoration-line-strong underline-offset-2 hover:text-ink"
                href={stat.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {stat.note} <span aria-hidden="true">↗</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- the receipt */}
      <section className="border-y border-line bg-paper-deep/25">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <SectionLabel>The artefact</SectionLabel>
            <h2 className="mt-5 max-w-[22ch] text-[clamp(1.9rem,4.2vw,2.9rem)] font-semibold leading-[1.02] tracking-[-0.032em]">
              A receipt for the work you were never paid for.
            </h2>
            <p className="mt-4 max-w-[50ch] text-[14.5px] leading-relaxed text-ink-soft">
              Freelancers talk about “loads of little extras”. That is not a number, and it is not a boundary. Unbilled
              turns the goodwill into line items — a page, a revision round, an export, a “quick” sequence — so you can see
              exactly what you gave away, month by month.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                ['Every request has a price.', 'Hours and a fee, calculated from your own rate.'],
                ['Every price has a decision.', 'Absorbed, billed, declined or held — never “I forgot”.'],
                ['Every decision has a sentence.', 'The email you would have spent twenty minutes rewriting.'],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink">{title}</span> {body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
              Illustrative example — your numbers come from your ledger
            </p>
          </div>
          <div className="lg:pl-6">
            <UnbilledReceipt className="rotate-[-1.4deg]" />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- how it works */}
      <section id="how" className="scroll-mt-20 border-y border-line bg-card/50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <SectionLabel>How it works</SectionLabel>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="text-[clamp(2rem,4.4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              The twenty seconds between
              <br />
              “can you also” and “sure”.
            </h2>
            <p className="max-w-[52ch] text-[14.5px] leading-relaxed text-ink-soft lg:pb-2">
              Scope creep is rarely a contract problem. It is a moment. A client asks for something small, you want to be
              helpful, and the cost of saying yes is invisible until the invoice. Unbilled makes it visible — then hands
              you the sentence.
            </p>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div key={step.n} className="group relative">
                <div className="flex items-baseline gap-3">
                  <span className="mono-label text-accent">{step.n}</span>
                  <h3 className="text-[21px] leading-tight tracking-[-0.02em]">{step.title}</h3>
                </div>
                <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-soft">{step.body}</p>
                <div className="mt-4">{step.visual}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ features */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <SectionLabel>What is inside</SectionLabel>
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-[22ch] text-[clamp(2rem,4.4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            Four things every freelancer needs and nobody sells together.
          </h2>
          <Link href="/app" className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
            <span className="link-underline">Open a sample ledger</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line md:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-card p-6 transition-colors hover:bg-paper/60 sm:p-8">
                <Icon className="h-5 w-5 text-accent" strokeWidth={1.7} />
                <h3 className="mt-4 text-[19px] leading-snug tracking-[-0.02em]">{feature.title}</h3>
                <p className="mt-2 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-soft">{feature.body}</p>
              </div>
            );
          })}
        </div>

        {/* leak report teaser */}
        <div className="mt-6 grid gap-6 rounded-[var(--radius-card)] border border-line bg-ink p-6 text-paper sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mono-label text-paper/50">The monthly leak report</p>
            <h3 className="mt-3 max-w-[30ch] text-[clamp(1.6rem,3.4vw,2.3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
              “I gave away $1,840 of work in October.”
            </h3>
            <p className="mt-3 max-w-[46ch] text-[13.5px] leading-relaxed text-paper/70">
              At the end of every month Unbilled totals what you absorbed, what you billed, and what your rate actually
              turned out to be — then hands you a card you can post, or a sentence you can send your client.
            </p>
            <Link href="/app/reports" className="mt-5 inline-block">
              <Button variant="accent" size="md">
                See the report <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border border-paper/15 bg-paper/[0.06] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="mono-label text-paper/50">October 2026</p>
                <p className="mt-1 text-[13px] text-paper/80">Halcyon Coffee · Maya Chen</p>
              </div>
              <span className="rounded-full border border-accent/40 bg-accent/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#ffb9a5]">
                leaking
              </span>
            </div>
            <p className="mt-5 font-display text-[42px] leading-none tracking-[-0.04em] tnum">$1,840</p>
            <p className="mt-1 text-[11.5px] text-paper/60">absorbed across 7 requests · 19.5 hours</p>
            <div className="mt-4 space-y-2">
              {[
                ['Pricing page', '+$380'],
                ['Revision round 3', '+$238'],
                ['Email sequence', '+$570'],
              ].map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between border-t border-dashed border-paper/15 pt-2 text-[12px]">
                  <span className="text-paper/70">{label}</span>
                  <span className="tnum text-paper/90">{amount}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10.5px] leading-relaxed text-paper/40">
              Illustrative example. Your numbers come from your own ledger.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- clause teaser */}
      <section className="border-y border-line bg-paper-deep/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <SectionLabel>Free clause library</SectionLabel>
            <h2 className="mt-5 text-[clamp(1.9rem,4vw,2.7rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
              End the argument before it starts.
            </h2>
            <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-ink-soft">
              Eight copy-ready clauses for proposals, contracts, and awkward mid-project emails. Written to be firm
              without being hostile — and free to take, whether you use Unbilled or not.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/scope-clauses">
                <Button size="sm">
                  Read the clause library <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/templates/change-order">
                <Button size="sm" variant="outline">
                  Change order template
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative rounded-2xl border border-line bg-card p-6 shadow-[var(--shadow-paper)]">
            <span className="absolute -top-3 left-6 max-w-[calc(100%-1.75rem)] truncate rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-mute">
              Clause {String(clauseIndex + 1).padStart(2, '0')} · {clause?.title.replace(/ clause$/, '')}
            </span>
            <p className="whitespace-pre-line text-[12.5px] leading-[1.75] text-ink-soft">
              {clause?.body.slice(0, 640)}…
            </p>
            <div className="mt-4 flex items-center gap-2 border-t border-dashed border-line pt-3">
              <CircleSlash2 className="h-3.5 w-3.5 text-accent" />
              <p className="text-[11.5px] text-ink-mute">The sentence that makes every later conversation easier.</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- privacy */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionLabel>Local-first, on purpose</SectionLabel>
            <h2 className="mt-5 text-[clamp(1.9rem,4vw,2.8rem)] font-semibold leading-[1.03] tracking-[-0.03em]">
              Your clients&apos; names, budgets, and arguments do not belong on someone else&apos;s server.
            </h2>
            <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-ink-soft">
              The working ledger and scope analysis run in your browser by default. No account is needed to use them.
              An optional verified account can hold a private cloud snapshot only when you explicitly save one; there is
              no automatic upload of pasted client messages. Shared scope and change-order URLs contain their document
              data in the fragment, so anyone who receives a link can read it.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                ['Stored in IndexedDB', 'Your ledger lives on this device. Export it as JSON whenever you like.'],
                ['Share links in the fragment', 'Document data is not sent in HTTP requests to the link host, but links are not encrypted or access-controlled. Anyone with a link can view it.'],
                ['No third-party tracking', 'No Google Analytics, no pixels, no session replay, no AI vendor.'],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink">{title}.</span> {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="mono-label">Data flow</p>
              <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sage">
                local by default
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Your browser', sub: 'Scope · requests · change orders · rates', active: true },
                { label: 'IndexedDB on this device', sub: 'Survives refreshes and offline use', active: true },
                { label: 'A link you choose to send', sub: 'Document travels in the URL fragment', active: true },
                { label: 'Private account snapshot', sub: 'Optional full workspace backup; user-scoped row security', active: false },
              ].map((row) => (
                <div
                  key={row.label}
                  className={
                    row.active
                      ? 'rounded-xl border border-sage/25 bg-sage-soft/60 px-3.5 py-3'
                      : 'rounded-xl border border-dashed border-line-strong bg-paper/50 px-3.5 py-3'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className={row.active ? 'text-[13px] font-medium text-sage' : 'text-[13px] font-medium text-ink-mute'}>
                      {row.label}
                    </p>
                    <span className="mono-label">{row.active ? 'local' : '—'}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{row.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- FAQ */}
      <section id="faq" className="scroll-mt-20 border-y border-line bg-card/50">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
          <SectionLabel>Questions</SectionLabel>
          <h2 className="mt-5 text-[clamp(1.8rem,4vw,2.5rem)] font-semibold tracking-[-0.03em]">Before you ask.</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-medium text-ink">
                  {item.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-ink-mute transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-[26px] border border-line bg-card px-6 py-12 text-center sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden
            style={{
              backgroundImage:
                'radial-gradient(600px 260px at 50% 0%, rgba(209,71,39,0.10), transparent 70%), radial-gradient(500px 240px at 80% 100%, rgba(44,91,75,0.08), transparent 70%)',
            }}
          />
          <p className="mono-label">You already know which client this is</p>
          <h2 className="mx-auto mt-4 max-w-[24ch] text-[clamp(2rem,4.6vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Price the next “quick thing” in ten seconds.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[14px] leading-relaxed text-ink-soft">
            Set up one project, paste one message, send one reply you would have rewritten four times. That is the whole
            app.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Link href="/onboarding">
              <Button size="lg">
                Start your ledger <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/library">
              <Button size="lg" variant="outline">
                Browse the reply library
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-ink-mute">Free while in beta · no account · works offline</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
