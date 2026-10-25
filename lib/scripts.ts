import { money, formatDate } from './format';
import type { Currency, Tone } from './types';

export type Decision = 'absorb' | 'bill' | 'decline' | 'clarify';

export interface ScriptContext {
  userName: string;
  businessName: string;
  clientName: string;
  projectName: string;
  askTitle: string;
  hours: number;
  value: number;
  currency: Currency;
  tone: Tone;
  dueDate?: string;
  changeOrderNumber?: string;
  changeOrderLink?: string;
  validUntil?: string;
  timelineNote?: string;
  matchedScope?: string;
}

export interface ScriptDraft {
  subject: string;
  body: string;
  short: string;
}

function firstName(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return 'there';
  return cleaned.split(/\s+/)[0];
}

function signOff(ctx: ScriptContext): string {
  return ctx.businessName ? `${ctx.userName}\n${ctx.businessName}` : ctx.userName;
}

function due(ctx: ScriptContext): string {
  return ctx.dueDate ? formatDate(ctx.dueDate, { day: 'numeric', month: 'short' }) : 'the current delivery date';
}

function hoursText(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} hours`;
}

type ToneSet = Record<Tone, string>;

function tonePick(tone: Tone, set: ToneSet): string {
  return set[tone] ?? set.warm;
}

/* ------------------------------------------------------------------ absorb */

export function absorbDraft(ctx: ScriptContext): ScriptDraft {
  const value = money(ctx.value, ctx.currency);
  const opening = tonePick(ctx.tone, {
    warm: `Yes — I can fold this in. Logging it so we both know it happened.`,
    firm: `I can do this one. I'm flagging it as a one-off, not a new baseline.`,
    formal: `I am able to accommodate this request. For clarity, I am recording it as a one-off addition.`,
  });

  const body = [
    `Hi ${firstName(ctx.clientName)},`,
    ``,
    opening,
    ``,
    `${ctx.askTitle} isn't part of the agreed scope for ${ctx.projectName}, so I've logged it as a goodwill add-on: roughly ${hoursText(ctx.hours)} of work, about ${value} at my standard rate. I'd rather show you that number than quietly build it into the next invoice.`,
    ``,
    `To protect ${due(ctx)}, I'll keep everything currently in flight on schedule and move the lowest-priority item on the list to a follow-up. If you'd prefer to keep that item in this round, I can quote ${ctx.askTitle} separately instead — just say which.`,
    ``,
    `One-off additions are fine; I just keep a limit of one per project so the plan stays honest.`,
    ``,
    `Thanks,`,
    signOff(ctx),
  ].join('\n');

  return {
    subject: `Re: ${ctx.askTitle} — happy to fold this in`,
    body,
    short: `Yes — I can fold that in as a one-off (≈${hoursText(ctx.hours)}, ${value} at my rate). Logging it as goodwill rather than new baseline, and something on the list moves to the follow-up so ${due(ctx)} holds. Good?`,
  };
}

/* -------------------------------------------------------------------- bill */

export function billDraft(ctx: ScriptContext): ScriptDraft {
  const value = money(ctx.value, ctx.currency);
  const timeline = ctx.timelineNote || `Delivery moves by roughly the additional effort — I've listed the new date on the change order.`;
  const linkLine = ctx.changeOrderLink
    ? `You can review and approve it here — no account needed: ${ctx.changeOrderLink}`
    : `I've attached it as change order ${ctx.changeOrderNumber ?? ''}.`;

  const opening = tonePick(ctx.tone, {
    warm: `Love this direction — and it's doable. It does sit outside what we agreed, so here's the cleanest way to handle it.`,
    firm: `That's outside the agreed scope for ${ctx.projectName}. Here's the change order so we can keep the timeline and the invoice in sync.`,
    formal: `This request falls outside the agreed scope of work. Please find the corresponding change order below.`,
  });

  const body = [
    `Hi ${firstName(ctx.clientName)},`,
    ``,
    opening,
    ``,
    `The current agreement covers ${ctx.matchedScope ? `“${ctx.matchedScope}”` : 'the deliverables in the signed proposal'}. ${ctx.askTitle} is additional work.`,
    ``,
    `Change order ${ctx.changeOrderNumber ?? ''}${ctx.changeOrderNumber ? ':' : ''}`,
    `• ${ctx.askTitle} — ${hoursText(ctx.hours)} at my standard rate`,
    `• Additional fee: ${value}${ctx.validUntil ? ` (held until ${formatDate(ctx.validUntil)})` : ''}`,
    `• Timeline: ${timeline}`,
    ``,
    linkLine,
    ``,
    `Nothing changes on the current plan until you approve. If the timing doesn't work, the alternative is to park ${ctx.askTitle} for a phase two — both are completely fine by me.`,
    ``,
    `Thanks,`,
    signOff(ctx),
  ].join('\n');

  return {
    subject: `${ctx.projectName} — change order ${ctx.changeOrderNumber ?? ''} for ${ctx.askTitle}`.replace(/\s+/g, ' '),
    body,
    short: `That one's outside our agreed scope, so I've written it up as change order ${ctx.changeOrderNumber ?? ''}: ${ctx.askTitle}, ${hoursText(ctx.hours)}, ${value}. Approval link: ${ctx.changeOrderLink ?? '(attached)'} — current plan unaffected until you approve.`,
  };
}

/* ----------------------------------------------------------------- decline */

export function declineDraft(ctx: ScriptContext): ScriptDraft {
  const value = money(ctx.value, ctx.currency);

  const opening = tonePick(ctx.tone, {
    warm: `Thanks for asking me — I had to think about this one.`,
    firm: `Thanks for the note. I'm going to pass on adding this to the current project.`,
    formal: `Thank you for the request. Unfortunately I am unable to include this within the current engagement.`,
  });

  const body = [
    `Hi ${firstName(ctx.clientName)},`,
    ``,
    opening,
    ``,
    `${ctx.askTitle} isn't inside what we scoped for ${ctx.projectName}. I could squeeze it in, but doing that quietly is how projects end up late and resentful — so I'd rather be straight with you.`,
    ``,
    `Here's what I can do:`,
    `• Keep the current plan exactly as agreed, on track for ${due(ctx)}.`,
    `• Quote ${ctx.askTitle} as separate work — around ${value} — either now as an add-on or after this project lands.`,
    `• If budget is the constraint, we can swap something of similar size out of this round instead of adding to it.`,
    ``,
    `Tell me which of those is most useful and I'll make it happen.`,
    ``,
    `Thanks,`,
    signOff(ctx),
  ].join('\n');

  return {
    subject: `Re: ${ctx.askTitle} — scoping this properly`,
    body,
    short: `I'm going to keep ${ctx.projectName} as scoped — adding ${ctx.askTitle} quietly would put ${due(ctx)} at risk. Happy to quote it separately (≈${value}) or swap something out of this round. Your call.`,
  };
}

/* ----------------------------------------------------------------- clarify */

export function clarifyDraft(ctx: ScriptContext): ScriptDraft {
  const value = money(ctx.value, ctx.currency);

  const opening = tonePick(ctx.tone, {
    warm: `Quick check before I start so I build the right thing.`,
    firm: `Before I pick this up, I need one decision from you.`,
    formal: `Before work begins, I would like to confirm the intended scope of this request.`,
  });

  const body = [
    `Hi ${firstName(ctx.clientName)},`,
    ``,
    opening,
    ``,
    `For ${ctx.askTitle} — is this a replacement for something already in the plan, or an addition?`,
    ``,
    `• If it replaces an item of similar size, the timeline stays as is and I'll start today.`,
    `• If it's additional, it's roughly ${hoursText(ctx.hours)} of work (${value}) and I'll send a change order for your approval.`,
    ``,
    `I'll hold it off the schedule until you confirm — that way nothing moves without a decision.`,
    ``,
    `Thanks,`,
    signOff(ctx),
  ].join('\n');

  return {
    subject: `Re: ${ctx.askTitle} — one question before I start`,
    body,
    short: `Before I start on "${ctx.askTitle}" — replace something in the plan, or add it? If it's additional it's ≈${hoursText(ctx.hours)} (${value}) and I'll send a change order. Holding it until you confirm.`,
  };
}

export function draftFor(decision: Decision, ctx: ScriptContext): ScriptDraft {
  switch (decision) {
    case 'absorb':
      return absorbDraft(ctx);
    case 'bill':
      return billDraft(ctx);
    case 'decline':
      return declineDraft(ctx);
    case 'clarify':
      return clarifyDraft(ctx);
  }
}

/* --------------------------------------------------------- reusable library */

export interface LibraryScript {
  id: string;
  category: 'Boundaries' | 'Pricing' | 'Revisions' | 'Relationship' | 'Contracts';
  title: string;
  when: string;
  body: string;
  /** Fields the reader should replace. */
  fields: string[];
}

export const LIBRARY: LibraryScript[] = [
  {
    id: 'quick-favor',
    category: 'Boundaries',
    title: 'The “quick favor” reply',
    when: 'A client slips in extra work with the word “quick”. You want to say yes without resetting the baseline.',
    fields: ['Client name', 'the ask', 'hours', 'fee'],
    body: `Hi [Client name],

Happy to help with [the ask]. It's outside what we scoped, so I'll flag it rather than let it disappear into the project: roughly [hours] of work, about [fee] at my rate.

I can do it this once as a one-off and protect the delivery date by moving [lower-priority item] to a follow-up, or I can quote it properly as a change order. Which do you prefer?

One-off favours are fine — I just keep a limit of one per project so the plan stays honest.

Thanks,
[You]`,
  },
  {
    id: 'scope-reset',
    category: 'Boundaries',
    title: 'The friendly scope reset',
    when: 'A project has drifted and nobody has named it. Best sent before an invoice, not after a fight.',
    fields: ['Client name', 'project', 'what changed'],
    body: `Hi [Client name],

Quick reset so we're working from the same map on [project].

When we started, the agreement covered [original deliverables]. Since then we've added [what changed]. I'm glad to keep going — I just want it written down before the next round.

Here's what I suggest: [in-scope remainders] stay as agreed for [fee]. The additions become a separate change order at [fee], or we park them for the next phase.

If that works, reply "agreed" and I'll send the updated one-pager today.

Thanks,
[You]`,
  },
  {
    id: 'revision-cap',
    category: 'Revisions',
    title: 'The revision cap',
    when: 'You are on revision round four of two. This is the sentence that stops the spiral.',
    fields: ['Client name', 'rounds included', 'extra round price'],
    body: `Hi [Client name],

We've now completed the [rounds included] revision rounds included in the agreement, and the work is at the approved direction.

I'm happy to do another round — each additional round is [extra round price], billed before I start so nobody is surprised at the end.

If it helps, send the feedback as one consolidated list and I'll treat it as a single round.

Thanks,
[You]`,
  },
  {
    id: 'rush-fee',
    category: 'Pricing',
    title: 'The rush fee, said without apology',
    when: 'A deadline gets pulled forward. Rush is a scheduling decision, not a mood.',
    fields: ['Client name', 'new date', 'rush fee'],
    body: `Hi [Client name],

I can hit [new date], but it means re-sequencing everything else on my schedule this week.

Rush work is billed at [rush fee] on top of the agreed fee, and it's payable up front.

If the date is flexible, the standard rate still applies and I'll keep the original slot. Either way, tell me today and I'll lock it in.

Thanks,
[You]`,
  },
  {
    id: 'additional-deliverable',
    category: 'Pricing',
    title: 'The additional deliverable quote',
    when: 'A new page, screen, or asset appears mid-project. Price it before you touch the file.',
    fields: ['Client name', 'deliverable', 'hours', 'fee', 'timeline'],
    body: `Hi [Client name],

[Deliverable] isn't in the current scope, so here's a clean quote rather than a surprise invoice later:

• Work: [deliverable]
• Estimate: [hours] at my standard rate
• Fee: [fee]
• Timeline impact: [timeline]

If you approve by reply, I'll start on [date] and send the updated schedule. If now isn't the right time, we can queue it for phase two.

Thanks,
[You]`,
  },
  {
    id: 'free-work-boundary',
    category: 'Contracts',
    title: 'Scope & change request clause',
    when: 'Put this in every proposal. It makes every later conversation easier.',
    fields: ['Revision rounds', 'hourly rate'],
    body: `Scope and changes

This proposal covers only the deliverables listed above, including [revision rounds] rounds of revisions per deliverable.

Any request that adds, removes, or changes deliverables — including new pages, new formats, extra revision rounds, or a change in direction after approval — is handled as a written change order. Change orders state the additional fee and the impact on the delivery date, and work begins once the change order is approved in writing.

Additional work is billed at [hourly rate] per hour unless a fixed fee is agreed in the change order. Requests received outside business hours are scheduled for the next business day unless a rush fee is agreed in advance.

Nothing in this section prevents me from choosing to absorb a small request as a one-off; it simply means no additional work is assumed to be free.`,
  },
  {
    id: 'feedback-consolidation',
    category: 'Relationship',
    title: 'Consolidating feedback',
    when: 'Feedback arrives in fourteen Slack messages. Consolidation is a professional ask, not a demand.',
    fields: ['Client name', 'deadline'],
    body: `Hi [Client name],

To make the next round count, could you gather everyone's feedback into one list by [deadline]?

Grouping it by page or section works well, and noting which points are must-fix vs nice-to-have helps me spend the round on the right things. I'll work through the consolidated list in one pass so the changes stay coherent.

Thanks,
[You]`,
  },
  {
    id: 'good-news-no',
    category: 'Relationship',
    title: 'The warm no that keeps the client',
    when: 'You need to decline without damaging the relationship.',
    fields: ['Client name', 'request', 'alternative'],
    body: `Hi [Client name],

Thanks for thinking of me for [request]. I'm going to pass on it — it's outside what I can do well inside this project, and I'd rather tell you that than deliver something half-considered.

What I can do: [alternative]. That keeps [project] on schedule and gives the request the attention it deserves.

If it's urgent, I'm glad to introduce you to someone who does this properly.

Thanks,
[You]`,
  },
];
