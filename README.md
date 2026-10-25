# Unbilled — the free-work ledger for freelancers

> Every favor has a price. Now you can see it.

Unbilled is a local-first web app for freelancers and small studios. Paste the client message; it splits the message into
individual requests, checks each one against the scope you actually agreed to, prices it at your rate, and writes the
reply — absorb it with a cap, bill it as a change order, decline it warmly, or hold it until the client decides.

The product exists because scope creep is not a contract problem, it is a thirty-second social problem. Most freelancers
lose money in the moment after “could you just…”, when saying yes is easier than pricing the work. Unbilled makes that
moment visible and gives you the sentence.

**Live features shipped in this repository**

| Area | What works |
| --- | --- |
| Scope check | Deterministic parser + matcher + pricing engine. Splits emails into requests, matches deliverables, inclusions and exclusions, counts revision rounds, applies quantity and rush logic, shows its reasoning. |
| Ledger | Every request is a line item: absorbed, billed, declined, or held. Monthly totals, leak rate, per-project scope tax. |
| Replies | Four decisions × three tones, generated with the real project, client, hours and fee filled in. Editable before copying or emailing. |
| Change orders | Itemised document, PDF export, self-contained approval link, client-side approval receipt with checksum, receipt verification, status tracking. |
| Leak report | Six-month chart, per-client breakdown, share card exported as PNG, copy-ready summary. |
| Library | Eight reply scripts in-app, ten contract clauses publicly, plus change order and scope-of-work templates. |
| Data | IndexedDB persistence, JSON export/import, sample workspace, full reset. |

## Why local-first

There is no account, no database, no AI vendor and no analytics. Client names, budgets and messages stay in the
browser's IndexedDB. Change order links carry the entire document in the URL **fragment** (`#…`), which browsers never
transmit to a server. This is a product decision, not a shortcut: it makes the tool instant, free to run, and safe to
open next to a signed contract.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) — deployed on Vercel
- **Tailwind CSS v4** with a custom design system (warm paper, ink, vermillion; Fraunces + Inter Tight + JetBrains Mono)
- **Dexie / IndexedDB** for persistence, **dexie-react-hooks** for live queries
- **framer-motion** for transitions, **lucide-react** for icons
- **fflate** for URL-safe payload compression, **jsPDF** for documents, **html-to-image** for share cards
- **Vitest** + **fake-indexeddb** for engine, codec and persistence tests

No environment variables, API keys, or external services are required.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm start          # serve the production build
npm run lint       # eslint (flat config, typescript-eslint + react-hooks)
npm run typecheck  # tsc --noEmit
npm test           # vitest run
```

## Project structure

```
app/
  page.tsx                     landing page with a live scope-check demo
  onboarding/                  3-step local setup (profile, rate, voice)
  app/                         authenticated-feeling workspace (gated by local settings)
    page.tsx                   ledger dashboard
    requests/                  message checker + request queue
    projects/                  scope library, project detail with scope editor
    change-orders/             list + document, share link, PDF, receipts
    reports/                   monthly leak report + share card
    library/                   reply scripts
    settings/                  defaults, data export/import/reset
  c/                           public, serverless change order approval page
  scope-clauses/               public clause library (SEO)
  templates/change-order/      public template (SEO)
  templates/scope-of-work/     public template (SEO)
  library/                     public reply library
  privacy/                     data policy
components/                    design system + app + marketing components
lib/
  engine/parse.ts              request extraction from unstructured messages
  engine/estimate.ts           work-type → hours pricing table
  engine/analyze.ts            scope matching, verdicts, confidence, reasons
  scripts.ts                   tone-calibrated reply generation
  clauses.ts                   contract clauses
  db.ts                        Dexie schema + all mutations, export/import, sample data
  codec.ts                     compressed share payloads, checksums, approval receipts
  pdf.ts                       change order PDF layout
  hooks.ts                     live queries + ledger metrics
tests/                         engine, codec and real IndexedDB persistence tests
```

## The scope engine

Fully deterministic — no model, no network:

1. **Parse** — normalise the message, strip quoted replies and signatures, split on sentences, bullets, list commas, and
   request-introducing conjunctions, drop pleasantries, clean titles.
2. **Estimate** — 50 work-type rules (page, revision round, integration, video edit, icon set…), quantity detection,
   scope-up modifiers for “from scratch” or “redesign”, rush detection, and notes such as “quick is not a scope”.
3. **Match** — tokenise and stem, canonicalise synonyms (photo/image, slide/deck, logo/wordmark), find the head noun, then
   check modifiers, capacity (“3 pages”), and exclusion clauses. Different qualifiers on the same noun are treated as
   different work (`landing page` ≠ `pricing page`), and revision requests are counted against the project's included
   rounds.
4. **Verdict** — `covered` / `gray` / `extra` with a confidence score and human-readable reasons. Every result is
   editable, and the user can override the verdict.

## Testing

```bash
npm test
```

29 tests cover parsing, estimation, scope matching (including exclusions, quantity, modifiers, revision limits and rush
premiums), share payload encoding/tampering detection, approval-receipt parsing, reply generation across decisions and
tones, real IndexedDB CRUD, change-order numbering, metrics, and full workspace export/import.

What is **not** covered by automated tests: browser-only interactions (modals, clipboard, PNG export, PDF download,
IndexedDB quota errors). Those were implemented against documented platform APIs and should be smoke-tested once in a
real browser.

## Deploying to Vercel

Everything needed is already configured (`next.config.ts`, Tailwind v4 PostCSS, no env vars).

```bash
npm i -g vercel
vercel            # preview deployment
vercel --prod     # production deployment
```

Or import the repository in the Vercel dashboard: framework preset **Next.js**, build command `next build`, output
`.next`, Node 20+. No environment variables are required.

### Manual steps that require you

- **Custom domain** — not configured. Add it in Vercel, then update `metadataBase`, `robots.ts` and `sitemap.ts` from
  `https://unbilled.app` to your domain.
- **Analytics / email** — deliberately absent. If you add a provider, keep the local-first privacy promise in mind.

## Deliberate limitations

- **No accounts or cloud sync** — data is per-browser, by design. JSON export/import is the transfer path.
- **Client approval is client-side** — the approval page produces a signed-checksum receipt for the client to send back;
  the freelancer verifies it in the ledger. A hosted approval API would be the next step if multi-party sync is wanted.
- **Estimates are heuristics** — market medians per unit of work, not a prediction for a specific project.
- **Not legal advice** — the clause library is plain-language starter text, not a reviewed contract.

## Roadmap ideas

1. Optional encrypted sync (passphrase-derived key, no server-side plaintext) so one ledger spans devices.
2. Email forwarding address that returns a scope-check reply.
3. Team workspaces for studios, with per-client scopes and shared change-order numbering.
4. Templates by discipline that write the exclusions for you.
5. Native share sheet + “leak report” publishing for organic growth.
