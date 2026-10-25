import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Button, CopyButton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Free scope of work template for freelancers',
  description:
    'A short, plain-language scope of work template that prevents scope creep: deliverables with quantities, revision limits, exclusions, assumptions, and change requests.',
  alternates: { canonical: '/templates/scope-of-work' },
};

const SOW = `SCOPE OF WORK

Project: [Project name]
Client: [Client name]
Studio: [Your name / studio]
Date: [Date]
Fee: [Total fee] ([deposit]% deposit, balance [terms])

1. WHAT IS INCLUDED
• [Deliverable 1 — with quantity, e.g. "Homepage design, one direction"]
• [Deliverable 2 — quantity]
• [Deliverable 3 — quantity]
Each deliverable includes [number] rounds of consolidated revisions.

2. WHAT IS NOT INCLUDED
• Copywriting, content entry, or editing, unless listed above
• Photography, illustration, or video production
• Additional pages, screens, formats, or languages
• SEO strategy, paid media, or analytics implementation
• Ongoing maintenance, hosting management, or support after handover
• Source files (available for [fee])

Anything not listed in section 1 is out of scope, even if discussed on a call.

3. REVISIONS
A revision round is one consolidated set of written feedback from one point of contact. Additional rounds are [fee] each. A change of direction after approval is new work, not a revision.

4. CLIENT RESPONSIBILITIES
• Provide final content, brand assets, and account access by [date]
• Provide consolidated written feedback within [number] business days
• Nominate one decision-maker for approvals
Delays in content or feedback move the delivery date by at least the length of the delay.

5. TIMELINE
Kickoff: [date]
First presentation: [date]
Final delivery: [date]
Dates assume feedback within the window above.

6. FEES AND PAYMENT
[Deposit]% deposit due before work begins. Balance due [on delivery / net 14]. Work may pause on overdue invoices. Late fees: [terms].

7. CHANGE REQUESTS
Any request that adds, removes, or changes a deliverable is handled with a written change order stating the fee and the timeline impact. Work begins on written approval. No additional work is assumed to be free, though [Studio] may absorb a small request as a logged one-off at its discretion.

8. USAGE
On full payment, the client receives a licence to use final deliverables for [channels]. Portfolio rights: [yes/no]. Source files: [fee].

9. CANCELLATION
If the project is cancelled after work begins, completed work is payable and the deposit is non-refundable. If [Studio] cancels before work begins, the deposit is returned.

Approved by: ______________________  Date: ____________`;

export default function SowTemplatePage() {
  return (
    <div>
      <SiteNav />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mono-label text-accent">Free template</p>
            <h1 className="mt-4 text-[clamp(2.1rem,4.8vw,3.2rem)] font-semibold leading-[1.0] tracking-[-0.038em]">
              One page that prevents the whole argument.
            </h1>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-ink-soft">
              A scope of work does not need to be twenty pages. It needs quantities, a revision cap, an exclusions list,
              and a change-request process. Everything else is decoration.
            </p>
            <ul className="mt-6 space-y-2.5 text-[13px] leading-relaxed text-ink-soft">
              {[
                ['Quantities, not vibes', '“Homepage + 4 pages” prevents six months of “I assumed pages were unlimited”.'],
                ['A real exclusions list', 'Naming what is not included is more useful than naming what is.'],
                ['A revision definition', 'One round = one consolidated set of feedback. Say it out loud.'],
                ['A change process', 'The sentence that turns an awkward ask into a normal transaction.'],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span>
                    <span className="font-medium text-ink">{title}.</span> {body}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/scope-clauses">
                <Button size="md" variant="outline">
                  Clause library
                </Button>
              </Link>
              <Link href="/templates/change-order">
                <Button size="md" variant="outline">
                  Change order template
                </Button>
              </Link>
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-card p-4">
              <p className="text-[12.5px] font-medium">Want the scope checked automatically?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
                Add your scope to Unbilled and every future client message is matched against it — with a price attached
                to anything that falls outside.
              </p>
              <Link href="/onboarding" className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-accent-deep link-underline">
                Open the ledger <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line bg-paper/60 px-4 py-2.5">
              <span className="mono-label">Copy-ready scope of work</span>
              <CopyButton value={SOW} label="Copy template" variant="primary" />
            </div>
            <pre className="max-h-[720px] overflow-y-auto whitespace-pre-wrap p-4 font-[var(--font-mono)] text-[10.5px] leading-[1.85] text-ink-soft sm:p-5">
              {SOW}
            </pre>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
