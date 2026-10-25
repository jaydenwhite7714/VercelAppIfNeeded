import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, FileSignature } from 'lucide-react';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Button, CopyButton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Free change order template for freelancers',
  description:
    'A copy-ready change order template for freelancers and studios: scope, fee, timeline impact, terms, and approval. Plus the six sections every change order needs.',
  alternates: { canonical: '/templates/change-order' },
};

const TEMPLATE = `CHANGE ORDER

From: [Your name / studio]
To: [Client name]
Project: [Project name]
Change order: [CO-001]
Date issued: [Date]
Valid until: [Date + 14 days]

THE REQUEST
[One or two sentences describing what the client asked for, in their words where possible.]

WHY THIS IS A CHANGE
The original agreement covers [deliverables in scope]. This request adds or changes [what is new], which was not included in the agreed fee.

WHAT IS ADDED
• [Item 1] — [hours] hours at [rate] = [amount]
• [Item 2] — [hours] hours at [rate] = [amount]
Total additional fee: [total]

IMPACT ON TIMELINE
Delivery was scheduled for [original date]. With this change, delivery moves to [new date]. No other dates are affected.

TERMS
This change order is valid for 14 days. Work begins once this change order is approved in writing and, where applicable, the additional fee is paid. All other terms of the original agreement remain in place.

APPROVAL
Approved by: ______________________
Name: ______________________
Date: ______________________

Reply "approved" to this email, or approve through the link provided, and I will add it to the schedule.`;

const EXAMPLE = `CHANGE ORDER

From: Rivera Studio
To: Maya Chen
Project: Halcyon Coffee — brand & site
Change order: CO-001
Date issued: 14 October 2026
Valid until: 28 October 2026

THE REQUEST
Add a pricing page to the new website before launch.

WHY THIS IS A CHANGE
The agreed scope covers the homepage plus three interior pages (About, Menu, Contact). A pricing page is an additional deliverable, and it was not part of the fee.

WHAT IS ADDED
• Pricing page design and build, desktop and mobile — 4 hours at $95 = $380
Total additional fee: $380

IMPACT ON TIMELINE
Delivery was scheduled for 10 November. With this change, delivery moves to 12 November.

TERMS
This change order is valid for 14 days. Work begins once approved in writing. All other terms of the original agreement remain in place.

APPROVAL
Approved by: Maya Chen
Date: 14 October 2026`;

const SECTIONS = [
  ['What was asked', 'Quote the request. It removes the “I never said that” problem before it starts.'],
  ['Why it is a change', 'Reference the original scope by name. Specificity is what makes this a document and not an opinion.'],
  ['What is added and what it costs', 'One line per item, hours × rate, and a single total. No bundles, no vagueness.'],
  ['Timeline impact', 'State the original date, the new date, and that nothing else moved. This is the part clients actually read.'],
  ['Terms and validity', 'A short window (14 days) and a clear trigger for starting work: approval plus payment.'],
  ['Approval', 'A line for a name and a date, plus an email or link trail. Written approval is the whole point.'],
];

export default function ChangeOrderTemplatePage() {
  return (
    <div>
      <SiteNav />

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="mono-label text-accent">Free template</p>
            <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.0] tracking-[-0.038em]">
              The change order that gets paid.
            </h1>
            <p className="mt-4 max-w-[50ch] text-[15px] leading-relaxed text-ink-soft">
              A change order is not a permission slip. It is a small, polite, itemised document that makes the extra work
              visible, prices it, and gives the client a single obvious action: approve.
            </p>

            <ul className="mt-6 space-y-2.5">
              {SECTIONS.map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-medium text-paper">
                    {index + 1}
                  </span>
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink">{title}.</span> {body}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-7 rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-accent" />
                <p className="text-[13px] font-medium">Generate one instead</p>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-mute">
                Unbilled writes the change order from the client&apos;s message, prices it at your rate, and gives you a link
                your client can approve in one click — with a timestamped receipt for your invoice.
              </p>
              <Link href="/onboarding" className="mt-3 inline-block">
                <Button size="sm">
                  Create a change order <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
              <div className="flex items-center justify-between border-b border-line bg-paper/60 px-4 py-2.5">
                <span className="mono-label">Copy-ready template</span>
                <CopyButton value={TEMPLATE} label="Copy template" variant="primary" />
              </div>
              <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap p-4 font-[var(--font-mono)] text-[11px] leading-[1.8] text-ink-soft">
                {TEMPLATE}
              </pre>
            </div>

            <details className="group rounded-[var(--radius-card)] border border-line bg-card p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium">
                See a filled-in example
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-ink-mute transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-paper/50 p-3.5 font-[var(--font-mono)] text-[10.5px] leading-[1.8] text-ink-soft">
                {EXAMPLE}
              </pre>
            </details>

            <div className="rounded-[var(--radius-card)] border border-line bg-paper-deep/40 p-4">
              <p className="mono-label">Two rules that matter more than the template</p>
              <ul className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
                <li className="flex gap-2">
                  <Check className="mt-1 h-3 w-3 shrink-0 text-sage" />
                  Send it <span className="font-medium text-ink">before</span> you do the work. A change order sent after
                  delivery is an invoice with extra steps.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-1 h-3 w-3 shrink-0 text-sage" />
                  Never send it apologetically. You are not asking for a favour; you are pricing work.
                </li>
              </ul>
              <Link href="/scope-clauses" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent-deep link-underline">
                Add the matching clause to your contract <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
