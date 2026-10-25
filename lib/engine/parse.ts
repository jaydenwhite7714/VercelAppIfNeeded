/**
 * Deterministic message parsing.
 *
 * The goal is not to understand language perfectly — it is to make sure no
 * request hides inside a friendly paragraph. Everything downstream is
 * editable by the user, so recall matters more than precision here.
 */

export interface ParsedAsk {
  title: string;
  text: string;
  rush: boolean;
  newWorkLanguage: boolean;
}

const RUSH_PATTERN =
  /\b(asap|urgent|urgently|today|tonight|by tomorrow|tomorrow morning|end of day|eod|this afternoon|this morning|before the weekend|by friday|right away|immediately|on a tight (deadline|timeline)|rush)\b/i;

const NEW_WORK_PATTERN =
  /\b(another|additional|extra|one more|new|also|as well|too|plus|second|third|from scratch|different direction|instead of|swap|swap out|replace|change direction|going forward)\b/i;

const REQUEST_LEAD =
  /^(hey|hi|hello|ok|okay|so|and|but|oh|also|plus|then|quick (one|question|thing|note|favor|ask)|one (more|last) thing|last thing|while (you'?re|we'?re) at it|while i have you|when you (get|have) a (chance|sec|minute)|if you (can|could)|if possible|no rush but|sorry to ask,? but)[\s,:-]*/i;

const LIST_INTRO =
  /^(a few (small )?(things|tweaks|notes|changes|asks|favou?rs)|a couple of (small )?(things|notes|tweaks)|some (small )?(things|tweaks|notes|changes)|few (small )?(things|notes|tweaks)|small (things|tweaks|notes)|last (thing|bit)|one more (thing|ask))\s*[:,-]\s*/i;

const FILLER_PREFIX =
  /^(can|could|would|will) (you|we|i)\s+(please\s+)?(possibly\s+)?(also\s+)?(just\s+)?(go ahead and\s+)?(kindly\s+)?/i;

const POLITE_PREFIX =
  /^(do you (think you could|mind)|would it be possible to|is it possible to|any chance (you|we) could|i was wondering if (you|we) could|i'?d (like|love) (you |us )?to|i want (you )?to|we (need|want|would like)( you)? to|let'?s|let us|we'?d love( for you)? to|i need|we need|please|kindly|just|also|and|plus|then|so|quickly|maybe|honestly|actually)\b[\s,]*/i;

const REQUEST_VERBS = [
  'add','added','adding','change','changed','changing','update','updated','updating','make','making','create','creating',
  'design','designing','build','building','write','writing','draft','drafting','include','including','remove','removing',
  'delete','deleting','swap','swapping','replace','replacing','move','moving','resize','resizing','tweak','tweaking',
  'adjust','adjusting','fix','fixing','revise','revising','redo','redoing','rework','reworking','extend','extending',
  'expand','expanding','shorten','shortening','translate','translating','integrate','integrating','set up','setup',
  'install','installing','deploy','deploying','test','testing','review','reviewing','send','sending','export','exporting',
  'upload','uploading','rename','renaming','reorder','reordering','crop','cropping','align','aligning','animate',
  'animating','edit','editing','proofread','proofreading','mock','mockup','wireframe','optimize','optimising','migrate',
  'migrating','connect','connecting','configure','configure','schedule','scheduling','prepare','preparing','tidy',
  'polish','polishing','bump','duplicate','duplicating','pull','pulling','plug','plugging','throw in','come up with',
  'put together','refresh','refreshing','rebrand','rebuilding','rebuild','recreate','recreating','split','combine',
  'condense','punch up','tighten','reorganize','reorganise','restructure','add on','amend','tune','tuning','redo',
  'match','matching','apply','applying','implement','implementing','install','enable','disable','remove','restore','translated','translate','convert','localize','localise',
  'bring','bring in','ship','shipping','launch','launching','deliver','delivering','submit','submitting','include',
];

const NOISE_PATTERN =
  /^(thanks|thank you|great|awesome|perfect|sounds good|looks good|love it|nice work|appreciate it|got it|sure|okay|ok|cool|no rush|hope you('| a)?re well|how are you|happy (monday|friday|weekend)|cheers|best|regards|talk soon|see you|let me know|lmk|fyi|for your reference|quick question|question for you|following up|just checking in|checking in)\b/i;

const PASSIVE_REVIEW =
  /^(the |our |my |their |his |her )?[\w\s]{0,24}(wants?|would like|needs?|is going|are going|plans?) to (review|see|look at|check|read|sign|approve) (it|them|this|that|these)\b/i;

const THANKS_ONLY =
  /^(thanks|thank you|cheers|great work|looks great|love it|perfect|awesome|amazing|nice|appreciate (it|you)|that works|sounds good|got it|no worries|all good)[.!,\s]*$/i;

export function normalize(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripSignature(text: string): string {
  const cut = text.search(/\n(--\s*\n|sent from my|best regards,|kind regards,|thanks,\n)/i);
  return cut > 40 ? text.slice(0, cut) : text;
}

/** Break a message into candidate clauses that might each be a separate request. */
function splitClauses(text: string): string[] {
  const prepared = text
    .replace(/(^|\n)\s*([-*•—]|\d+[.)])\s+/g, '\n• ')
    .replace(/\s+(and also|also|plus|additionally|on top of that|one more thing|oh and|while you'?re at it|as well as|and then|then also)\s+/gi, '\n• ')
    .replace(/([.!?;])\s+/g, '$1\n')
    .replace(/,?\s+(?:and|then|plus)\s+(?=(?:also\s+)?(?:add|swap|remove|write|create|design|build|insert|replace|include|set ?up|rename|delete|draft|export|translate|duplicate|rework|redo|order)\b)/gi, '\n')
    .split('\n')
    .flatMap((line) =>
      line
        .split(/,\s*(?=(?:and\s+)?(?:add|change|make|update|swap|remove|write|create|design|build|move|resize|insert|replace|include|set ?up|turn|bump|rename|delete|fix|tweak|adjust|put|draft|translate|duplicate|rework|redo)\b)/i)
        .map((part) => part.trim()),
    )
    .join('\n');

  return prepared
    .split('\n')
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);
}

function looksLikeRequest(clause: string): boolean {
  const lower = clause.toLowerCase();
  if (clause.length < 3) return false;
  if (THANKS_ONLY.test(lower)) return false;
  if (NOISE_PATTERN.test(lower) && !REQUEST_VERBS.some((v) => lower.includes(v))) return false;
  if (PASSIVE_REVIEW.test(lower) && !REQUEST_VERBS.some((v) => new RegExp(`\\b${v}\\b`).test(lower))) return false;

  const hasVerb = REQUEST_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(lower));
  if (hasVerb) return true;

  // Noun-phrase asks: "one more round of revisions", "a pricing page too"
  if (NEW_WORK_PATTERN.test(lower) && /\b(page|revision|round|logo|banner|post|email|section|screen|slide|video|image|photo|asset|version|draft|option|page|feature|integration|report|deck|icon|illustration|animation|form|template)\b/.test(lower)) {
    return true;
  }
  if (/^(another|extra|additional|one more|new)\b/i.test(lower)) return true;
  return false;
}

export function cleanTitle(clause: string): string {
  let text = clause.trim().replace(/\s+/g, ' ');
  for (let i = 0; i < 4; i += 1) {
    const before = text;
    text = text
      .replace(REQUEST_LEAD, '')
      .replace(LIST_INTRO, '')
      .replace(FILLER_PREFIX, '')
      .replace(POLITE_PREFIX, '')
      .replace(/^(that|this|it)\s+/i, '')
      .trim();
    if (before === text) break;
  }

  text = text.replace(/[.!?;:,]+$/, '').replace(/^["'“(]+|["'”)]+$/g, '').trim();
  if (!text) return clause.trim().slice(0, 120);

  const words = text.split(' ');
  if (words.length > 16) text = `${words.slice(0, 16).join(' ')}…`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function parseMessage(message: string): { asks: ParsedAsk[]; ignored: string[] } {
  const normalized = stripSignature(normalize(message));
  if (!normalized) return { asks: [], ignored: [] };

  const clauses = splitClauses(normalized);
  const asks: ParsedAsk[] = [];
  const ignored: string[] = [];

  for (const clause of clauses) {
    if (!looksLikeRequest(clause)) {
      if (clause.split(' ').length > 3) ignored.push(clause);
      continue;
    }
    const askText = clause.trim();
    asks.push({
      title: cleanTitle(askText),
      text: askText,
      rush: RUSH_PATTERN.test(askText),
      newWorkLanguage: NEW_WORK_PATTERN.test(askText),
    });
  }

  // De-duplicate near-identical titles (common when a sentence repeats across paragraphs).
  const seen = new Set<string>();
  const unique = asks.filter((ask) => {
    const key = ask.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { asks: unique.slice(0, 12), ignored };
}

export const SAMPLE_MESSAGES = [
  {
    label: 'The "quick favor" email',
    text: `Hi! The homepage is looking amazing, the client loved it.

Quick thing — could you also add a pricing page before launch? Should be fast since we have the components.

Also, can you swap the hero photo for the one I sent on Slack? And one more round of revisions on the logo feels needed — the CEO wants to see "something bolder".

We go live Friday, so this is urgent. Thanks!`,
  },
  {
    label: 'The friendly scope reset',
    text: `Hey, hope the launch went well!

The board asked for a short explainer video for the investor update, maybe 60 seconds. Nothing fancy.

Could you also set up analytics on the new site? And while you're at it, our old logo needs to be updated on the business cards — just a quick export.

Let me know what you need from us.`,
  },
  {
    label: 'The "small tweaks" message',
    text: `Thanks for sending the deck over — it looks great.

A few small things: make the title bigger, change the colour of slide 4 to our new green, and add two more case study slides.

Also, could we get a version translated into Spanish? The team in Madrid wants to review it.`,
  },
];
