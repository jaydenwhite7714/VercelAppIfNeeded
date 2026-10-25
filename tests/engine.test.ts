import { describe, expect, it } from 'vitest';
import { parseMessage, SAMPLE_MESSAGES } from '@/lib/engine/parse';
import { estimateWork } from '@/lib/engine/estimate';
import { analyzeAsk, analyzeMessage } from '@/lib/engine/analyze';
import type { Ask, Project, ScopeItem } from '@/lib/types';

const scope: ScopeItem[] = [
  { id: 's1', kind: 'deliverable', label: 'Homepage (1)', hours: 8 },
  { id: 's2', kind: 'deliverable', label: 'About, Menu and Contact pages (3)', hours: 4 },
  { id: 's3', kind: 'deliverable', label: 'Logo refresh: 2 concept directions', hours: 8 },
  { id: 's4', kind: 'included', label: '2 rounds of revisions per deliverable', hours: 2.5 },
  { id: 's5', kind: 'included', label: 'Mobile responsive layout', hours: 4 },
  { id: 's5b', kind: 'included', label: 'Hero imagery and photo swaps', hours: 1 },
  { id: 's6', kind: 'excluded', label: 'Copywriting and page content', hours: 2 },
  { id: 's7', kind: 'excluded', label: 'Paid ads and social content', hours: 2 },
];

const project: Project = {
  id: 'p1',
  name: 'Halcyon Coffee',
  clientName: 'Maya Chen',
  status: 'active',
  rate: 95,
  budget: 7200,
  startDate: '2026-10-01',
  dueDate: '2026-11-10',
  revisionRounds: 2,
  scope,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const baseOptions = { project, rate: 95, rushMultiplier: 1.5 };

describe('parseMessage', () => {
  it('finds separate requests inside a friendly message', () => {
    const { asks } = parseMessage(SAMPLE_MESSAGES[0].text);
    const titles = asks.map((ask) => ask.title.toLowerCase());
    expect(titles.join(' | ')).toContain('pricing page');
    expect(titles.join(' | ')).toContain('hero photo');
    expect(asks.length).toBeGreaterThanOrEqual(3);
  });

  it('ignores pure pleasantries', () => {
    expect(parseMessage('Thanks so much — looks great! Talk tomorrow.').asks).toHaveLength(0);
    expect(parseMessage('Hope you are well. Let me know if you need anything.').asks).toHaveLength(0);
  });

  it('strips email quoting and signatures', () => {
    const message = `Hey Sam,

> can you redesign the whole site for free?

Could you update the footer address?
--
Sam Rivera
CEO`;
    const { asks } = parseMessage(message);
    expect(asks).toHaveLength(1);
    expect(asks[0].title.toLowerCase()).toContain('footer');
  });

  it('flags rush language', () => {
    const { asks } = parseMessage('Could you add a pricing page by tomorrow? It is urgent.');
    expect(asks[0]?.rush).toBe(true);
  });
});

describe('estimateWork', () => {
  it('prices a single page as real work', () => {
    const estimate = estimateWork('add a pricing page');
    expect(estimate.hours).toBeGreaterThanOrEqual(4);
    expect(estimate.ruleLabel).toBe('Web page');
  });

  it('multiplies countable work', () => {
    const estimate = estimateWork('add three more pages');
    expect(estimate.hours).toBeGreaterThanOrEqual(12);
  });

  it('does not discount something called quick', () => {
    const estimate = estimateWork('just a quick logo tweak');
    expect(estimate.hours).toBeGreaterThan(0);
    expect(estimate.notes.join(' ').toLowerCase()).toContain('quick');
  });

  it('scales up for from-scratch work', () => {
    const plain = estimateWork('build a landing page');
    const big = estimateWork('build a landing page from scratch');
    expect(big.hours).toBeGreaterThan(plain.hours);
  });
});

describe('analyzeAsk', () => {
  const analyze = (text: string, existingAsks: Ask[] = []) =>
    analyzeAsk(
      { title: text, text, rush: /urgent|tomorrow/i.test(text), newWorkLanguage: /also|another|extra|new/i.test(text) },
      { ...baseOptions, existingAsks },
    );

  it('flags a new page as outside scope', () => {
    const result = analyze('Could you also add a pricing page before launch?');
    expect(result.verdict).toBe('extra');
    expect(result.reasons.map((r) => r.text).join(' ')).toMatch(/scope/i);
  });

  it('treats a hero image swap as covered', () => {
    const result = analyze('Can you swap the hero photo for the one I sent on Slack?');
    expect(result.verdict).toBe('covered');
  });

  it('catches excluded work such as copywriting', () => {
    const result = analyze('Could you write the copy for the menu page?');
    expect(result.verdict).toBe('extra');
    expect(result.reasons.map((r) => r.text).join(' ')).toMatch(/leaves this out/i);
  });

  it('prices rush work higher', () => {
    const normal = analyze('add a pricing page');
    const rush = analyze('add a pricing page by tomorrow, urgent');
    expect(rush.value).toBeGreaterThan(normal.value);
  });

  it('escalates revision rounds beyond the agreement', () => {
    const used: Ask[] = [
      { id: 'a1', projectId: 'p1', sourceText: '', title: 'First revision round', status: 'absorbed', verdict: 'covered', confidence: 1, reasons: [], hours: 2, value: 190, rush: false, createdAt: Date.now() },
      { id: 'a2', projectId: 'p1', sourceText: '', title: 'Second revision round', status: 'absorbed', verdict: 'covered', confidence: 1, reasons: [], hours: 2, value: 190, rush: false, createdAt: Date.now() },
    ];
    const result = analyzeAsk(
      { title: 'One more round of revisions on the logo', text: 'One more round of revisions on the logo', rush: false, newWorkLanguage: true },
      { ...baseOptions, existingAsks: used },
    );
    expect(result.verdict).toBe('extra');
    expect(result.reasons.map((r) => r.text).join(' ')).toMatch(/revision round/i);
  });

  it('handles a whole message end to end', () => {
    const { asks } = analyzeMessage(SAMPLE_MESSAGES[0].text, baseOptions);
    expect(asks.length).toBeGreaterThanOrEqual(3);
    expect(asks.some((ask) => ask.verdict === 'extra')).toBe(true);
    expect(asks.every((ask) => ask.value > 0)).toBe(true);
  });
});
