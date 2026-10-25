export interface Clause {
  id: string;
  number: string;
  title: string;
  when: string;
  body: string;
  fields: string[];
  tags: string[];
}

/**
 * Plain-language contract clauses. Written for freelancers and small studios,
 * not for a legal department. Placeholders are in [brackets].
 */
export const CLAUSES: Clause[] = [
  {
    id: 'scope',
    number: '01',
    title: 'Scope of work and deliverables',
    when: 'Every proposal. This is the section that decides whether a request is a favour or a fee.',
    tags: ['Scope', 'Core'],
    fields: ['Deliverable list', 'Revision rounds'],
    body: `Scope of work

[Studio name] will deliver only the items listed in this section:

• [Deliverable 1, including quantity — e.g. "Homepage design, one concept"]
• [Deliverable 2]
• [Deliverable 3]

Each deliverable includes [number] rounds of revisions. A round is one consolidated set of written feedback delivered in a single message.

Anything not listed here — including additional pages, screens, formats, languages, assets, or revision rounds — is not included in the fee and is handled under "Change requests" below.

Delivery dates assume feedback is returned within [number] business days of each submission.`,
  },
  {
    id: 'revisions',
    number: '02',
    title: 'Revision limits',
    when: 'The single highest-leverage clause for design, copy, and video work.',
    tags: ['Revisions', 'Core'],
    fields: ['Rounds included', 'Price per extra round'],
    body: `Revisions

The fee includes [number] rounds of revisions per deliverable. A round means one consolidated set of feedback, delivered in writing.

Feedback from multiple stakeholders should be combined into that single round. Revision rounds do not carry over between deliverables.

Additional rounds are billed at [fee] per round, payable before the round begins. A change of direction after a concept has been approved — a new visual route, a rewritten structure, a different audience — is treated as new work rather than a revision.

Final files are released after the final invoice is paid.`,
  },
  {
    id: 'changes',
    number: '03',
    title: 'Change requests and change orders',
    when: 'Pair this with clause 01. It turns an awkward conversation into a process.',
    tags: ['Scope', 'Core'],
    fields: ['Hourly rate', 'Approval method'],
    body: `Change requests

Any request that adds, removes, or materially changes a deliverable — including new pages, new formats, extra revision rounds, or a change in direction after approval — is handled as a written change order.

A change order states the additional work, the fee, and the impact on the delivery date. Work begins once the change order is approved in writing [by email reply / by signed approval / through the approval link provided].

Additional work is billed at [hourly rate] per hour unless a fixed fee is agreed in the change order.

No additional work is assumed to be free. [Studio name] may choose, at its discretion, to absorb a small request as a one-off; doing so does not change the scope of this agreement or set a precedent.`,
  },
  {
    id: 'rush',
    number: '04',
    title: 'Rush and out-of-hours work',
    when: 'When "can we pull this forward?" becomes a regular request.',
    tags: ['Pricing', 'Boundaries'],
    fields: ['Rush premium', 'Business hours'],
    body: `Rush work

Standard turnaround assumes work is scheduled within normal business hours ([days and hours], [time zone]).

Requests requiring delivery outside those hours, or requiring other work to be re-sequenced to meet a new date, are billed at a rush premium of [percentage]% on the affected work. The premium is agreed before the work starts.

Requests received after [time] on a business day are treated as received the next business day unless a rush fee has been agreed in writing.`,
  },
  {
    id: 'goodwill',
    number: '05',
    title: 'Goodwill (the “quick favour” clause)',
    when: 'The most human clause in the library. It keeps generosity deliberate.',
    tags: ['Boundaries', 'Relationship'],
    fields: ['One-off limit'],
    body: `Goodwill

Small requests outside the scope of work may occasionally be accommodated at no charge, at [Studio name]'s discretion, as a gesture of goodwill.

Goodwill work is limited to [one] small request per project, is logged in writing, and does not form part of the agreed scope. It does not create an obligation to repeat the gesture, and it does not change the fee, the timeline, or the deliverables in this agreement.

Where a goodwill request would delay a committed delivery date, [Studio name] will either schedule it after the current phase or issue a change order for the additional work, and will confirm which before starting.`,
  },
  {
    id: 'client-responsibilities',
    number: '06',
    title: 'Client responsibilities and feedback',
    when: 'Protects you from delays that are not yours, without sounding like a threat.',
    tags: ['Process', 'Core'],
    fields: ['Feedback deadline', 'Content deadline'],
    body: `Client responsibilities

The client will provide, by [date]: final copy and content, brand assets, access to required accounts, and a single point of contact empowered to give consolidated feedback.

Feedback will be delivered in writing within [number] business days of each submission. Consolidated feedback from all stakeholders is required before a revision round begins.

Delays in providing content, access, or feedback extend the schedule by at least the length of the delay. Where a project is paused at the client's request for more than [number] days, work may be rescheduled and a restart fee of [fee] may apply.`,
  },
  {
    id: 'pause',
    number: '07',
    title: 'Pause, cancellation and kill fee',
    when: 'For projects that quietly stall for months and then expect to resume at the old price.',
    tags: ['Process', 'Risk'],
    fields: ['Kill fee tiers', 'Pause window'],
    body: `Pausing and cancellation

Either party may pause the project with written notice. A project paused for more than [number] days may be rescheduled subject to availability, and the quoted fee may be revised to reflect current rates.

If the client cancels after work has begun, the following applies: [percentage]% of the fee is non-refundable for work completed to date, plus any third-party costs already committed. Work completed up to the cancellation date is delivered on payment of the outstanding balance.

Deposits are non-refundable except where [Studio name] cancels before work begins.`,
  },
  {
    id: 'usage',
    number: '08',
    title: 'Usage rights and handover',
    when: 'Prevents "we need the source files" from becoming a free second project.',
    tags: ['Rights', 'Payment'],
    fields: ['Licence scope', 'Source file fee'],
    body: `Usage and ownership

On receipt of full payment, the client receives a perpetual licence to use the final deliverables for [stated purpose and channels]. Ownership of working files, source files, unused concepts, and process materials remains with [Studio name] unless assigned in writing.

Source files are available on request for [fee].

[Studio name] retains the right to display the work in its portfolio and on social channels unless the client requests confidentiality in writing.

Third-party assets — fonts, stock photography, music, plugins — are licensed to the client under their own terms and are not transferred by this agreement.`,
  },
  {
    id: 'payment',
    number: '09',
    title: 'Payment, deposits and late fees',
    when: 'Cash-flow protection. Most freelance disputes are really payment disputes.',
    tags: ['Payment', 'Core'],
    fields: ['Deposit %', 'Payment terms', 'Late fee'],
    body: `Payment terms

A deposit of [percentage]% is required before work begins. The remaining balance is due [on delivery / within 14 days of invoice].

Work may be paused on overdue invoices. Invoices unpaid after [number] days may incur a late fee of [percentage]% per month, or the maximum permitted by law, and [Studio name] may withhold delivery of work in progress until the balance is settled.

Fees are exclusive of applicable taxes. Third-party costs — stock licences, printing, hosting, paid plugins — are billed at cost or quoted separately in advance.`,
  },
  {
    id: 'ai',
    number: '10',
    title: 'AI and third-party tools',
    when: 'Increasingly requested by clients. Say clearly what was and was not used.',
    tags: ['Process', 'Modern'],
    fields: ['Disclosure policy'],
    body: `Tools and AI

Unless agreed in writing, [Studio name] may use industry-standard software, including AI-assisted tools, for research, drafting, and production. Final deliverables are reviewed and directed by a human.

Client content is not submitted to third-party AI services where doing so would breach confidentiality or the client's own policies. Where a deliverable is generated substantially by AI tools, [Studio name] will disclose this before delivery.

The client is responsible for confirming that any AI-generated material supplied by the client is cleared for the intended use.`,
  },
];
