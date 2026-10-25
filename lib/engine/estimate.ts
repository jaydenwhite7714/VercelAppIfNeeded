/**
 * Time estimation for a single request.
 *
 * These are deliberately conservative market medians per unit of work, not
 * predictions. The point is to stop a request from feeling free — the user
 * can always override the number in one click.
 */

export interface Estimate {
  hours: number;
  ruleId: string;
  ruleLabel: string;
  quantity: number;
  unitHours: number;
  notes: string[];
}

interface Rule {
  id: string;
  label: string;
  pattern: RegExp;
  unitHours: number;
  countable?: boolean;
}

const RULES: Rule[] = [
  { id: 'revision', label: 'Revision round', pattern: /\b(another round|round of (revisions?|changes?|feedback)|more revisions|extra revisions?|one more revision|additional revisions?|another version|another pass|another iteration|revisions? round)\b/i, unitHours: 2.5 },
  { id: 'deck', label: 'Presentation', pattern: /\b(decks?|slides?|presentations?|pitch deck|keynote|powerpoint)\b/i, unitHours: 2, countable: true },
  { id: 'website', label: 'Full website build', pattern: /\b(full|whole|entire|complete)\s+(web ?site|site)\b|\bweb ?site from scratch\b|\bbuild (me |us )?a (new )?(web ?site|site)\b/i, unitHours: 40 },
  { id: 'audit', label: 'Audit / strategy review', pattern: /\b(audit|heuristic review|ux review|seo audit|accessibility audit|brand audit)\b/i, unitHours: 4 },
  { id: 'auth', label: 'Authentication flow', pattern: /\b(log ?in|sign ?in|sign ?up|auth(entication)?|oauth|sso|password reset|user accounts?)\b/i, unitHours: 10 },
  { id: 'payments', label: 'Payments / checkout', pattern: /\b(stripe|payment|checkout|billing|subscription|invoice system|paywall)\b/i, unitHours: 8 },
  { id: 'dashboard', label: 'Dashboard or app screen', pattern: /\b(dashboard|admin panel|back ?office|app screen|web app|saas (app|mvp))\b/i, unitHours: 8 },
  { id: 'api', label: 'API / integration', pattern: /\b(api|integration|integrate|webhook|zapier|shopify|salesforce|hubspot|airtable|notion api|crm)\b/i, unitHours: 6 },
  { id: 'cms', label: 'CMS setup', pattern: /\b(cms|contentful|sanity|wordpress|strapi|headless cms)\b/i, unitHours: 6 },
  { id: 'migration', label: 'Migration', pattern: /\b(migrate|migration|move (the|our) (site|content)|port (the|our) (site|content))\b/i, unitHours: 6 },
  { id: 'animation', label: 'Motion / animation', pattern: /\b(animation|animate|animated|motion graphics|micro-?interaction|transitions?)\b/i, unitHours: 3 },
  { id: 'responsive', label: 'Responsive / mobile pass', pattern: /\b(responsive|mobile (version|layout)|tablet (version|layout)|breakpoints?)\b/i, unitHours: 4 },
  { id: 'performance', label: 'Performance work', pattern: /\b(performance|page ?speed|lighthouse|optimis|optimiz|core web vitals)\b/i, unitHours: 4 },
  { id: 'seo', label: 'SEO setup', pattern: /\b(seo|sitemap|schema markup|meta tags?|search console)\b/i, unitHours: 3 },
  { id: 'analytics', label: 'Analytics setup', pattern: /\b(analytics|tracking|gtag|gtm|tag manager|mixpanel|posthog|plausible|pixel)\b/i, unitHours: 2 },
  { id: 'accessibility', label: 'Accessibility pass', pattern: /\b(accessib(le|ility)|wcag|aria|screen ?reader|contrast ratio)\b/i, unitHours: 4 },
  { id: 'deploy', label: 'Deploy / hosting', pattern: /\b(deploy|deployment|hosting|domain|dns|ssl|go ?live|launch (it|the site))\b/i, unitHours: 2 },
  { id: 'landing', label: 'Landing page', pattern: /\b(landing page|sales page|squeeze page|campaign page|microsite)\b/i, unitHours: 8, countable: true },
  { id: 'page', label: 'Web page', pattern: /\b(pages?|sub-?pages?|web ?pages?|template pages?)\b/i, unitHours: 4, countable: true },
  { id: 'screen', label: 'Product screen', pattern: /\b(screens?|views?|modals?|prototypes?|wireframes?|flows?)\b/i, unitHours: 5, countable: true },
  { id: 'section', label: 'Page section', pattern: /\b(sections?|blocks?|modules?|footer|header|banner strip|testimonial block)\b/i, unitHours: 2, countable: true },
  { id: 'component', label: 'Component', pattern: /\b(components?|widgets?|card layout|accordions?|carousels?|sliders?)\b/i, unitHours: 2, countable: true },
  { id: 'form', label: 'Form build', pattern: /\b(forms?|surveys?|questionnaires?|application form|checkout form|contact form)\b/i, unitHours: 3, countable: true },
  { id: 'email_sequence', label: 'Email sequence', pattern: /\b(email (sequence|series|campaign|flow)|drip|nurture sequence|welcome sequence)\b/i, unitHours: 6 },
  { id: 'email', label: 'Email design', pattern: /\b(email|newsletter|mailing|blast)\b/i, unitHours: 2, countable: true },
  { id: 'blog', label: 'Long-form article', pattern: /\b(blog post|article|case study|whitepaper|white paper|guide|ebook|e-book)\b/i, unitHours: 4, countable: true },
  { id: 'copy', label: 'Copywriting', pattern: /\b(copy|copywriting|headline|tagline|microcopy|body copy|wordsmith|proofread|proofreading|edit(ing)? text)\b/i, unitHours: 2 },
  { id: 'logo', label: 'Logo concept', pattern: /\b(logo|wordmark|logomark|monogram|brand mark)\b/i, unitHours: 4, countable: true },
  { id: 'brand_guide', label: 'Brand guidelines', pattern: /\b(brand (guidelines?|book|system)|style guide|design system|brand bible)\b/i, unitHours: 10 },
  { id: 'palette', label: 'Colour palette', pattern: /\b(colou?r (palette|scheme)|palette|brand colou?rs?)\b/i, unitHours: 2 },
  { id: 'typography', label: 'Type system', pattern: /\b(typography|type ?face|font pairing|fonts?)\b/i, unitHours: 2 },
  { id: 'illustration', label: 'Illustration', pattern: /\b(illustration|illustrated|drawing|character design|mascot)\b/i, unitHours: 4, countable: true },
  { id: 'icon', label: 'Icon set', pattern: /\b(icon|icons|glyph|pictogram)\b/i, unitHours: 3, countable: true },
  { id: 'social', label: 'Social asset', pattern: /\b(social (post|asset|graphic|template|banner|story|reel)|instagram|tiktok|linkedin (post|banner)|carousel|story template|thumbnail)\b/i, unitHours: 1.5, countable: true },
  { id: 'ad', label: 'Ad creative', pattern: /\b(ad creative|advert|ad set|display ad|meta ads?|google ads?|campaign creative|banner ad)\b/i, unitHours: 2, countable: true },
  { id: 'video', label: 'Video edit', pattern: /\b(video|reel|shorts?|explainer|motion piece|vlog|edit (the )?(video|footage))\b/i, unitHours: 5, countable: true },
  { id: 'photo', label: 'Photo work', pattern: /\b(photo|photograph|retouch|image retouch|image|picture|hero shot|stock image)\b/i, unitHours: 1, countable: true },
  { id: 'pdf', label: 'Print / PDF asset', pattern: /\b(pdf|print|flyer|poster|brochure|business card|packaging|sticker|signage|merch)\b/i, unitHours: 3, countable: true },
  { id: 'report', label: 'Report / documentation', pattern: /\b(report|documentation|docs|handover|spec|summary|findings)\b/i, unitHours: 3 },
  { id: 'translation', label: 'Translation / localisation', pattern: /\b(translat|localis|localiz|spanish|french|german|japanese|portuguese|language version)\b/i, unitHours: 4 },
  { id: 'naming', label: 'Naming', pattern: /\b(naming|name ideas|name the|brand name|tagline options)\b/i, unitHours: 3 },
  { id: 'research', label: 'Research', pattern: /\b(research|competitor analysis|market analysis|user interviews|personas?|moodboard|mood board)\b/i, unitHours: 3 },
  { id: 'tweak', label: 'Small tweak', pattern: /\b(tweaks?|nudges?|adjust(ment)?s?|small changes?|minor changes?|tiny changes?|quick changes?|swaps?|switch out|reorders?)\b/i, unitHours: 0.75, countable: true },
  { id: 'bug', label: 'Bug fix', pattern: /\b(bug|broken|not working|isn'?t working|error|glitch|fix)\b/i, unitHours: 1 },
  { id: 'automation', label: 'Automation', pattern: /\b(automation|automate|workflow|zap|make\.com|n8n)\b/i, unitHours: 4 },
  { id: 'chatbot', label: 'AI feature', pattern: /\b(chatbot|ai (feature|assistant)|gpt|llm|ai powered|ai-powered)\b/i, unitHours: 8 },
  { id: 'testimonial', label: 'Testimonial / case study', pattern: /\b(testimonial|case stud(y|ies)|reference call|review collection)\b/i, unitHours: 3, countable: true },
  { id: 'meeting', label: 'Call or meeting', pattern: /\b(call|meeting|sync|standup|stand-up|catch ?up|walkthrough|demo)\b/i, unitHours: 0.75, countable: true },
  { id: 'strategy', label: 'Consulting', pattern: /\b(strategy|consult|advice|opinion|thoughts on|brainstorm|workshop)\b/i, unitHours: 2 },
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  a: 1, an: 1, another: 1, single: 1, couple: 2, few: 3, dozen: 12,
};

const RUSH = /\b(asap|urgent|urgently|today|tonight|by tomorrow|tomorrow morning|end of day|eod|this afternoon|before the weekend|by friday|right away|immediately|rush(ed)?|tight deadline)\b/i;

const SCALE_UP = [
  { pattern: /\bfrom scratch\b|\bbrand new\b|\bground up\b/i, factor: 1.5, note: 'Built from scratch' },
  { pattern: /\b(redesign|rebrand|rework|overhaul|rethink|re-?do|different direction|start over)\b/i, factor: 1.4, note: 'Reworks existing work' },
  { pattern: /\b(full|entire|complete|end-to-end)\b/i, factor: 1.35, note: 'Full build, not a slice' },
];

const POLISH_WORDS = /\b(quick|quickly|small|tiny|minor|simple|just|fast|easy|little|nothing fancy|shouldn'?t take long)\b/i;

function parseQuantity(text: string): { quantity: number; matched: string | null } {
  const numeric = text.match(/\b(\d{1,2})\s+(?:\w+\s+){0,3}(pages?|slides?|screens?|sections?|posts?|emails?|logos?|icons?|illustrations?|videos?|images?|photos?|banners?|versions?|options?|rounds?|revisions?|templates?|forms?|articles?|decks?|cards?|assets?|animations?|integrations?|reports?|mockups?|slides?)\b/i);
  if (numeric) return { quantity: Math.max(1, Number(numeric[1])), matched: numeric[0] };

  const word = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a couple of|couple of|few|dozen|another)\s+(?:\w+\s+){0,3}(pages?|slides?|screens?|sections?|posts?|emails?|logos?|icons?|illustrations?|videos?|images?|photos?|banners?|versions?|options?|rounds?|revisions?|templates?|forms?|articles?|decks?|cards?|assets?|animations?|integrations?|reports?|mockups?)\b/i);
  if (word) {
    const raw = word[1].toLowerCase();
    const quantity = raw === 'a couple of' || raw === 'couple of' ? 2 : raw === 'dozen' ? 12 : NUMBER_WORDS[raw] ?? 1;
    return { quantity, matched: word[0] };
  }
  return { quantity: 1, matched: null };
}

export function estimateWork(text: string): Estimate {
  const notes: string[] = [];
  const rush = RUSH.test(text);
  const rule = RULES.find((candidate) => candidate.pattern.test(text));
  const parsedQuantity = parseQuantity(text);
  const base = rule ?? { id: 'general', label: 'Focused change', unitHours: 2, countable: true };

  let quantity = 1;
  if (parsedQuantity.matched && (base as Rule).countable !== false) {
    quantity = Math.min(parsedQuantity.quantity, 20);
    if (quantity > 1) notes.push(`Counted as ${quantity} × ${base.label.toLowerCase()}.`);
  }

  let hours = base.unitHours * quantity;

  for (const scale of SCALE_UP) {
    if (scale.pattern.test(text)) {
      hours *= scale.factor;
      notes.push(`${scale.note} (+${Math.round((scale.factor - 1) * 100)}%).`);
      break;
    }
  }

  if (rule?.id === 'revision') {
    notes.push('Revision rounds are the most common source of unpaid work.');
  }
  if (POLISH_WORDS.test(text)) {
    notes.push('“Quick” is not a scope — the work is priced as work.');
  }
  if (/\b(just|only|simple)\s+(a|one|an)\b/i.test(text)) {
    notes.push('The request is framed as small, but the deliverable is still real.');
  }
  if (rush) {
    notes.push('Deadline pressure detected — a rush premium applies.');
  }

  hours = Math.round(Math.min(hours, 240) * 4) / 4;

  return {
    hours,
    ruleId: base.id,
    ruleLabel: base.label,
    quantity,
    unitHours: base.unitHours,
    notes,
  };
}

export function isRush(text: string): boolean {
  return RUSH.test(text);
}

export const WORK_RULES = RULES;
