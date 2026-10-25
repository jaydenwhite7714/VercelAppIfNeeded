import type { ScopeKind } from './types';

export interface ScopeTemplateItem {
  kind: ScopeKind;
  label: string;
  qty?: number;
  hours?: number;
}

export interface ScopeTemplate {
  id: string;
  name: string;
  blurb: string;
  projectName: string;
  revisionRounds: number;
  items: ScopeTemplateItem[];
}

export const SCOPE_TEMPLATES: ScopeTemplate[] = [
  {
    id: 'web',
    name: 'Website design',
    blurb: 'Page count, revisions, and the things clients assume are included.',
    projectName: 'Website redesign',
    revisionRounds: 2,
    items: [
      { kind: 'deliverable', label: 'Homepage (1)', qty: 1, hours: 8 },
      { kind: 'deliverable', label: 'Interior pages (4)', qty: 4, hours: 4 },
      { kind: 'deliverable', label: 'Mobile responsive layout', hours: 4 },
      { kind: 'included', label: '2 rounds of revisions per page', hours: 2.5 },
      { kind: 'included', label: 'Hero imagery and photo swaps', hours: 1 },
      { kind: 'included', label: 'Launch day deploy and DNS', hours: 2 },
      { kind: 'excluded', label: 'Copywriting and page content', hours: 2 },
      { kind: 'excluded', label: 'Photography and custom illustration', hours: 4 },
      { kind: 'excluded', label: 'SEO content and blog writing', hours: 3 },
      { kind: 'excluded', label: 'Ongoing maintenance after handover', hours: 2 },
    ],
  },
  {
    id: 'brand',
    name: 'Brand identity',
    blurb: 'Concept count, rounds, and the “one more direction” trap.',
    projectName: 'Brand identity',
    revisionRounds: 2,
    items: [
      { kind: 'deliverable', label: 'Logo concepts (3 directions)', qty: 3, hours: 4 },
      { kind: 'deliverable', label: 'Colour palette and type system', hours: 3 },
      { kind: 'deliverable', label: 'Brand guidelines (12 pages)', hours: 10 },
      { kind: 'included', label: '2 rounds of revisions per direction', hours: 2.5 },
      { kind: 'included', label: 'Final logo files (SVG, PNG, PDF)', hours: 1 },
      { kind: 'excluded', label: 'Trademark search and legal filing', hours: 2 },
      { kind: 'excluded', label: 'Packaging and print production', hours: 4 },
      { kind: 'excluded', label: 'Social templates and ongoing assets', hours: 2 },
      { kind: 'excluded', label: 'Additional logo directions beyond three', hours: 4 },
    ],
  },
  {
    id: 'dev',
    name: 'Product development',
    blurb: 'Features, environments, and the “small addition” that is a sprint.',
    projectName: 'Web app build',
    revisionRounds: 1,
    items: [
      { kind: 'deliverable', label: 'Authentication: email and password', hours: 10 },
      { kind: 'deliverable', label: 'Core app screens (6)', qty: 6, hours: 5 },
      { kind: 'included', label: '1 round of revisions per screen', hours: 2.5 },
      { kind: 'included', label: 'Staging and production deployment', hours: 2 },
      { kind: 'excluded', label: 'Third-party integrations and APIs', hours: 6 },
      { kind: 'excluded', label: 'Payments and checkout', hours: 8 },
      { kind: 'excluded', label: 'Native mobile apps', hours: 20 },
      { kind: 'excluded', label: 'Ongoing support and maintenance', hours: 2 },
    ],
  },
  {
    id: 'copy',
    name: 'Copywriting',
    blurb: 'Word count, rounds, and the research everyone forgets to bill.',
    projectName: 'Website copy',
    revisionRounds: 2,
    items: [
      { kind: 'deliverable', label: 'Homepage copy (up to 600 words)', hours: 4 },
      { kind: 'deliverable', label: 'Interior page copy (4 pages)', qty: 4, hours: 2 },
      { kind: 'included', label: '2 rounds of revisions', hours: 2 },
      { kind: 'included', label: 'One kickoff interview (45 minutes)', hours: 1 },
      { kind: 'excluded', label: 'Design, layout, or publishing in the CMS', hours: 2 },
      { kind: 'excluded', label: 'SEO keyword research and content strategy', hours: 3 },
      { kind: 'excluded', label: 'Additional pages beyond the five listed', hours: 2 },
      { kind: 'excluded', label: 'Email sequences and social copy', hours: 2 },
    ],
  },
  {
    id: 'video',
    name: 'Video production',
    blurb: 'Runtime, cuts, and the reshoot clause.',
    projectName: 'Brand video',
    revisionRounds: 2,
    items: [
      { kind: 'deliverable', label: '60-second edit', hours: 8 },
      { kind: 'deliverable', label: 'Vertical cuts for social (2)', qty: 2, hours: 2 },
      { kind: 'included', label: '2 rounds of revisions', hours: 2.5 },
      { kind: 'included', label: 'Licensed background music', hours: 0.5 },
      { kind: 'excluded', label: 'Additional footage or a second shoot day', hours: 8 },
      { kind: 'excluded', label: 'Scripting and storyboarding', hours: 4 },
      { kind: 'excluded', label: 'Motion graphics and 3D', hours: 5 },
      { kind: 'excluded', label: 'Subtitles in additional languages', hours: 2 },
    ],
  },
  {
    id: 'consulting',
    name: 'Consulting / strategy',
    blurb: 'Sessions, deliverables, and the “quick question” buffer.',
    projectName: 'Strategy engagement',
    revisionRounds: 0,
    items: [
      { kind: 'deliverable', label: 'Discovery workshop (2 hours)', hours: 2 },
      { kind: 'deliverable', label: 'Written recommendations (10 pages)', hours: 6 },
      { kind: 'deliverable', label: 'Roadmap review session', hours: 1.5 },
      { kind: 'included', label: 'Async questions by email within scope', hours: 1 },
      { kind: 'excluded', label: 'Implementation and project management', hours: 4 },
      { kind: 'excluded', label: 'Additional stakeholder interviews', hours: 2 },
      { kind: 'excluded', label: 'Ongoing advisory beyond the engagement', hours: 2 },
    ],
  },
];

export const ROLE_OPTIONS = [
  'Brand designer',
  'Web designer',
  'Product designer',
  'Developer',
  'Copywriter',
  'Photographer',
  'Videographer',
  'Illustrator',
  'Marketing consultant',
  'Fractional executive',
  'Other',
];

export const TONE_OPTIONS: { value: 'warm' | 'firm' | 'formal'; label: string; blurb: string }[] = [
  { value: 'warm', label: 'Warm', blurb: 'Keeps the relationship first. Best for long-term clients.' },
  { value: 'firm', label: 'Firm', blurb: 'Direct and clean. Best when the boundary has slipped before.' },
  { value: 'formal', label: 'Formal', blurb: 'Corporate and precise. Best for procurement and agencies.' },
];
