import type { Ask, AskReason, Project, ScopeItem, Verdict } from '../types';
import { estimateWork, isRush } from './estimate';
import { parseMessage, type ParsedAsk } from './parse';

const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','so','to','of','in','on','for','with','at','by','from','as','is','are','was','were',
  'be','been','being','it','its','this','that','these','those','i','we','you','they','he','she','my','our','your','their',
  'me','us','them','can','could','would','should','will','just','also','please','thanks','thank','hi','hey','hello','some',
  'any','all','more','most','very','really','actually','maybe','okay','ok','lot','bit','little','get','got','make','need',
  'want','like','love','think','know','let','lets','do','does','did','done','have','has','had','there','here','what','when',
  'where','how','why','who','which','about','into','over','after','before','again','still','only','even','much','many','up',
  'out','off','down','then','than','now','new','one','two','three','few','couple','nice','great','good','quick','quickly',
  'small','minor','tiny','fast','easy','simple','sure','thing','things','stuff','something','anything','way','time','now',
  'going','gonna','forward','direction','instead','well','too','plus','additional','extra','another','other','second',
  'version','round','rounds','revision','revisions','change','changes','update','updates','add','adds','adding','swap',
  'swapping','replace','replacing','remove','removing','move','moving','resize','resizing','tweak','tweaking','adjust',
  'adjusting','fix','fixing','revise','revising','redo','rework','extend','extending','expand','expanding','shorten',
  'translate','translating','integrate','integrating','create','creating','design','designing','build','building','write',
  'writing','draft','drafting','include','including','send','sending','export','exporting','upload','uploading','rename',
  'renaming','reorder','reordering','crop','cropping','align','aligning','animate','animating','edit','editing','polish',
  'polishing','refresh','refreshing','rebrand','rebuilding','recreate','recreating','split','combine','condense','tune',
  'apply','applying','implement','implementing','enable','disable','restore','bring','ship','launch','deliver','submit',
]);

/** Words that mean the same thing for scope-matching purposes. */
const SYNONYMS: Record<string, string> = {
  photo: 'image', photos: 'image', picture: 'image', pictures: 'image', visual: 'image', graphics: 'image', graphic: 'image',
  homepage: 'page', homepagee: 'page', subpage: 'page', webpage: 'page', view: 'screen', mockup: 'screen', mockups: 'screen',
  wordmark: 'logo', logomark: 'logo', mark: 'logo', logotype: 'logo',
  iteration: 'revision', pass: 'revision', feedback: 'revision',
  copywriting: 'copy', text: 'copy', content: 'copy', headline: 'copy', tagline: 'copy',
  reel: 'video', clip: 'video', footage: 'video', montage: 'video',
  colour: 'color', colours: 'color', palette: 'color', colors: 'color',
  font: 'typography', fonts: 'typography', typeface: 'typography', type: 'typography',
  slide: 'deck', slides: 'deck', presentation: 'deck', pitch: 'deck', powerpoint: 'deck',
  icon: 'icon', icons: 'icon', glyph: 'icon',
  cms: 'cms', website: 'site', web: 'site', webpages: 'page',
  translation: 'translation', spanish: 'translation', french: 'translation', german: 'translation',
};

const DOMAIN_NOUNS = new Set([
  'page','screen','section','deck','email','post','logo','banner','icon','illustration','video','image','revision','form',
  'integration','api','dashboard','report','template','animation','module','component','landing','site','chart','table','menu',
  'copy','audit','plan','strategy','identity','palette','typography','print','pdf','flyer','poster','card','sticker','merch',
  'sequence','newsletter','article','blog','testimonial','case','study','wireframe','prototype','flow','checkout','payment',
  'login','auth','search','filter','map','chatbot','automation','workflow','analytics','tracking','translation','research',
  'moodboard','audit','naming','keyword','metadata','docs','documentation','spec','summary','brand','guideline','subpage',
  'packaging','thumbnail','reel','story','carousel','ad','banner','domain','hosting','deploy','bug','fix','call','meeting',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(stem)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return SYNONYMS[w] ?? w;
}

function nouns(tokens: string[]): string[] {
  return tokens.filter((token) => DOMAIN_NOUNS.has(token));
}

function modifiers(tokens: string[], headIndex: number): string[] {
  const start = Math.max(0, headIndex - 2);
  return tokens.slice(start, headIndex);
}

function countUnits(label: string, qty?: number): number | null {
  if (typeof qty === 'number' && qty > 0) return qty;
  const listed = label
    .replace(/\(.*?\)/g, (match) => match) // keep parentheses, they often hold the list
    .split(/[,/•+]|\band\b/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !/^\d+$/.test(part));
  if (listed.length > 1) return listed.length;
  return null;
}

interface MatchResult {
  item: ScopeItem;
  strength: 'strong' | 'medium';
  sharedNoun?: string;
  modifiersDiffer: boolean;
}

function matchScope(askTokens: string[], scope: ScopeItem[]): MatchResult | null {
  const askNouns = nouns(askTokens);
  let best: (MatchResult & { score: number }) | null = null;

  for (const item of scope) {
    const itemTokens = tokenize(item.label);
    if (itemTokens.length === 0) continue;
    const itemNouns = nouns(itemTokens);
    const overlap = askTokens.filter((token) => itemTokens.includes(token));
    const sharedNoun = askNouns.find((noun) => itemNouns.includes(noun));

    let score = overlap.length / Math.max(2, itemTokens.length);
    if (sharedNoun) score += 0.55;

    if (sharedNoun && overlap.length >= 1) {
      const headIndex = Math.max(0, itemTokens.indexOf(sharedNoun));
      const itemMods = modifiers(itemTokens, headIndex);
      const askHead = Math.max(0, askTokens.indexOf(sharedNoun));
      const askMods = modifiers(askTokens, askHead).filter((mod) => !itemTokens.includes(mod));
      const itemModsMatched = itemMods.length > 0 && itemMods.some((mod) => askTokens.includes(mod));
      // A different qualifier in front of the same noun is usually different work:
      // "landing page" vs "pricing page", "brand logo" vs "event logo".
      const modifiersDiffer = itemMods.length > 0 ? !itemModsMatched : askMods.length > 0;
      const candidate = {
        item,
        score,
        sharedNoun,
        modifiersDiffer,
        strength: (score >= 0.6 ? 'strong' : 'medium') as 'strong' | 'medium',
      };
      if (!best || candidate.score > best.score) best = candidate;
      continue;
    }

    if (overlap.length >= 1) {
      const candidate = {
        item,
        score,
        sharedNoun: undefined,
        modifiersDiffer: false,
        strength: (score >= 0.5 ? 'strong' : 'medium') as 'strong' | 'medium',
      };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  if (!best || best.score < 0.12) return null;
  return { item: best.item, strength: best.strength, sharedNoun: best.sharedNoun, modifiersDiffer: best.modifiersDiffer };
}

const REVISION_PATTERN = /\b(revision|round|feedback|iteration|another (pass|version|look)|tweaks?)\b/i;

export interface AnalyzeOptions {
  project: Project;
  existingAsks?: Ask[];
  rate: number;
  rushMultiplier: number;
}

export interface AnalyzedAsk {
  title: string;
  text: string;
  verdict: Verdict;
  confidence: number;
  reasons: AskReason[];
  matchedScopeId?: string;
  hours: number;
  value: number;
  rush: boolean;
  workLabel: string;
}

export function analyzeAsk(ask: ParsedAsk, options: AnalyzeOptions): AnalyzedAsk {
  const { project, existingAsks = [], rate, rushMultiplier } = options;
  const estimate = estimateWork(ask.text);
  const tokens = tokenize(ask.text);
  const match = matchScope(tokens, project.scope);
  const reasons: AskReason[] = [];
  let verdict: Verdict;
  let confidence: number;

  const revisionsUsed = existingAsks.filter(
    (existing) => existing.projectId === project.id && REVISION_PATTERN.test(existing.title) && existing.status !== 'declined',
  ).length;
  const isRevisionAsk = estimate.ruleId === 'revision' || REVISION_PATTERN.test(ask.title);

  if (match?.item.kind === 'excluded') {
    verdict = 'extra';
    confidence = 0.94;
    reasons.push({
      tone: 'bad',
      text: `Your scope explicitly leaves this out: “${match.item.label}”.`,
    });
  } else if (match && match.strength === 'strong') {
    if (match.modifiersDiffer) {
      verdict = 'extra';
      confidence = 0.8;
      reasons.push({
        tone: 'bad',
        text: `Your scope covers “${match.item.label}” — this is a different ${match.sharedNoun ?? 'item'}.`,
      });
    } else {
      const capacity = countUnits(match.item.label, match.item.qty);
      const alreadyRequested = existingAsks.filter((existing) => existing.matchedScopeId === match.item.id).length;
      if (capacity !== null && alreadyRequested + 1 > capacity) {
        verdict = 'extra';
        confidence = 0.86;
        reasons.push({
          tone: 'bad',
          text: `Your scope covers ${capacity} ${match.sharedNoun ?? 'unit'}${capacity === 1 ? '' : 's'} — this request is number ${alreadyRequested + 2}.`,
        });
      } else {
        verdict = 'covered';
        confidence = 0.88;
        reasons.push({
          tone: 'good',
          text: `Covered by “${match.item.label}” in your agreed scope.`,
        });
        if (capacity !== null) {
          reasons.push({
            tone: 'neutral',
            text: `${Math.max(capacity - alreadyRequested - 1, 0)} of ${capacity} included remaining after this.`,
          });
        }
      }
    }
  } else if (match) {
    verdict = ask.newWorkLanguage ? 'extra' : 'gray';
    confidence = 0.55;
    reasons.push({
      tone: 'neutral',
      text: `Related to “${match.item.label}”, but your scope does not spell this out.`,
    });
  } else {
    // Effort estimates do not establish whether a contract includes something.
    // Without a direct scope match, only explicit new-work wording suggests Extra;
    // all other requests stay Gray for the freelancer to review.
    verdict = ask.newWorkLanguage ? 'extra' : 'gray';
    confidence = ask.newWorkLanguage ? 0.62 : 0.5;
    reasons.push({
      tone: 'neutral',
      text: estimate.hours >= 4
        ? 'No matching scope item. The rule-based engine can estimate effort, but cannot infer whether your agreement includes it — review the scope before deciding.'
        : 'Not mentioned in your scope either way. Review the agreement before deciding.',
    });
  }

  if (isRevisionAsk && project.revisionRounds > 0) {
    if (revisionsUsed >= project.revisionRounds) {
      if (verdict === 'covered') {
        verdict = 'extra';
        confidence = Math.max(confidence, 0.9);
        reasons.length = 0;
      }
      reasons.push({
        tone: 'bad',
        text: `Your agreement includes ${project.revisionRounds} revision round${project.revisionRounds === 1 ? '' : 's'}. You have already used ${revisionsUsed}.`,
      });
    } else {
      reasons.push({
        tone: 'good',
        text: `Revision ${revisionsUsed + 1} of ${project.revisionRounds} included in your agreement.`,
      });
    }
  }

  if (ask.newWorkLanguage && verdict !== 'covered') {
    reasons.push({ tone: 'bad', text: 'The message uses new-work language (“also”, “another”, “extra”, “new”).' });
  }
  if (ask.rush) {
    reasons.push({ tone: 'bad', text: 'A compressed deadline is attached — that carries a premium.' });
  }
  if (estimate.ruleId === 'tweak' && verdict !== 'covered') {
    reasons.push({ tone: 'neutral', text: 'Small requests still have setup, context-switch, and revision cost.' });
  }
  for (const note of estimate.notes.slice(0, 2)) {
    if (!reasons.some((reason) => reason.text === note)) reasons.push({ tone: 'neutral', text: note });
  }

  const rush = ask.rush || isRush(ask.text);
  const multiplier = rush ? Math.max(1, rushMultiplier) : 1;
  const value = Math.round(estimate.hours * rate * multiplier);

  return {
    title: ask.title,
    text: ask.text,
    verdict,
    confidence,
    reasons: reasons.slice(0, 4),
    matchedScopeId: match?.item.id,
    hours: estimate.hours,
    value,
    rush,
    workLabel: estimate.ruleLabel,
  };
}

export function analyzeMessage(message: string, options: AnalyzeOptions): { asks: AnalyzedAsk[]; ignored: string[] } {
  const { asks, ignored } = parseMessage(message);
  return {
    asks: asks.map((ask) => analyzeAsk(ask, options)),
    ignored,
  };
}
