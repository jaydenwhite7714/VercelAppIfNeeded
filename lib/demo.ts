import type { Project, ScopeItem } from './types';

/**
 * A realistic reference project used by the public demo and the sample
 * workspace. Keeping it outside the database module means the landing page can
 * show the engine working without loading IndexedDB.
 */
export const DEMO_SCOPE: ScopeItem[] = [
  { id: 's1', kind: 'deliverable', label: 'Homepage (1)', hours: 8 },
  { id: 's2', kind: 'deliverable', label: 'About, Menu and Contact pages (3)', hours: 4 },
  { id: 's3', kind: 'deliverable', label: 'Logo refresh: 2 concept directions', hours: 8 },
  { id: 's4', kind: 'included', label: '2 rounds of revisions per deliverable', hours: 2.5 },
  { id: 's5', kind: 'included', label: 'Mobile responsive layout', hours: 4 },
  { id: 's6', kind: 'included', label: 'Hero imagery and photo swaps', hours: 1 },
  { id: 's7', kind: 'included', label: 'Launch day deploy and DNS', hours: 2 },
  { id: 's8', kind: 'excluded', label: 'Copywriting and page content', hours: 2 },
  { id: 's9', kind: 'excluded', label: 'Paid ads and social content', hours: 2 },
];

export function demoProject(rate = 95): Project {
  const now = Date.now();
  return {
    id: 'demo-project',
    name: 'Halcyon Coffee — brand & site',
    clientName: 'Maya Chen',
    clientEmail: 'maya@halcyoncoffee.com',
    status: 'active',
    rate,
    budget: 7200,
    startDate: '2026-10-01',
    dueDate: '2026-11-10',
    revisionRounds: 2,
    scope: DEMO_SCOPE,
    createdAt: now,
    updatedAt: now,
  };
}

export const DEMO_MESSAGE = `Hi Sam! The homepage is looking amazing — the client loved it.

Quick thing: could you also add a pricing page before launch? Should be fast since we have the components.

Also, can you swap the hero photo for the one I sent on Slack? And one more round of revisions on the logo feels needed — the CEO wants to see something bolder.

We go live Friday, so this is urgent. Thanks!`;

export const DEMO_MESSAGE_ALT = `Hey, hope the launch went well!

The board asked for a short explainer video for the investor update, maybe 60 seconds. Nothing fancy.

Could you also set up analytics on the new site? And while you're at it, could you write the copy for the new pricing page?

Let me know what you need from us.`;

export const DEMO_MESSAGE_SHORT = `Could you add a contact form and translate the site into Spanish? Also our old logo needs to go on the business cards — just a quick export.`;
