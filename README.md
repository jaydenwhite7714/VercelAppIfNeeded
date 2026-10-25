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
| Ledger | Every request is a line item: absorbed, approved, declined, or held. Monthly estimates and approved-order totals are reported separately; actual time and payments are not tracked. |
| Replies | Four decisions × three tones, generated with the real project, client, hours and fee filled in. Editable before copying or emailing. |
| Change orders | Itemised document, PDF export, self-contained approval link, client-side approval receipt with checksum, receipt verification, status tracking. |
| Client scope page | Share a read-only, plain-language scope (included / not included / revisions) as a private link, so the boundary is agreed before the work starts. |
| Leak report | Six-month chart, per-client breakdown, share card exported as PNG, copy-ready summary. |
| Library | Eight reply scripts in-app, ten contract clauses publicly, plus change order and scope-of-work templates. |
| Local data | IndexedDB persistence, JSON export/import, sample workspace, full reset. |
| Optional accounts | Email/password signup and verification via Supabase Auth; password recovery; manually saved private account snapshots in Supabase Postgres with RLS. No automatic sync and no account required for the local app. |

## Local-first and optional account backups

The working ledger remains in this browser's IndexedDB unless you explicitly choose a private account backup. Signup is
optional. Verified accounts use Supabase Auth and a single per-user JSON snapshot in Postgres, protected by row-level
security; upload, restore, replacement and deletion are manual, not continuous synchronization. Auth/email metadata and
opt-in workspace snapshots therefore leave the browser when those features are used. The application does not use a
service-role key. Change-order links carry the document in the URL **fragment** (`#…`), which browsers do not transmit to
the link host. The public/client link can be reviewed without an account.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) — deployed on Vercel
- **Tailwind CSS v4** with a custom design system (warm paper, ink, vermillion; Fraunces + Inter Tight + JetBrains Mono)
- **Dexie / IndexedDB** for the local workspace, **dexie-react-hooks** for live queries
- **Supabase Auth + Postgres RLS** for optional email-verified accounts and manually saved private workspace snapshots
- **@supabase/ssr** for HttpOnly cookie sessions and server-side authentication
- **Vitest** + **fake-indexeddb** for engine, codec, auth-route and persistence tests

The local-only workspace runs without environment variables. Signup, verification email, sign-in, password recovery, and
private cloud backups remain disabled until the owner configures Supabase and email delivery; see **Account setup** below.
No secret/service-role key is used by the application.

## Getting started

```bash
npm ci
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Without Supabase variables, the guest/local workspace works normally and account features clearly remain unavailable.

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
  onboarding/                  local setup (profile, rate, voice)
  signup/ signin/               optional account registration and secure sign-in
  forgot-password/ verify-email/ recovery and verification retry
  auth/callback/ account/       auth callback, verified status, password update
  api/auth/                     server-side signup, sign-in, reset, resend, session handlers
  api/account/                  account status and authenticated private snapshot API
  app/                          local-first workspace (ledger, requests, projects, orders, reports, settings)
  c/ s/                         public client review and read-only scope pages
components/
  account/                      account status and explicit snapshot migration controls
  auth/                         responsive signup, sign-in, verification, recovery forms
  app/                          workspace UI and workflows
lib/
  auth/                         validation, bounded JSON request parsing, origin checks
  supabase/                     server-only cookie/session client
  workspace-schema.ts           shared validator for local and uploaded backups
  db.ts                         Dexie schema + local mutations, export/import, sample data
  engine/                       deterministic parsing, estimation and matching
  codec.ts                      compressed share payloads, checksums, approval receipts
supabase/
  migrations/                   profile uniqueness, workspace RLS and guarded snapshot RPCs
  templates/                    branded verification and password-reset email HTML
 tests/                         engine, codec, IndexedDB and provider-mocked account tests
```

## Account setup (owner action required)

No provider account or sender has been created from this session. Account routes fail closed until the following setup
is completed. Keep the Supabase project on its free plan; do not enable paid add-ons or enter billing details without
separate approval.

1. **Create a Supabase project** on the free plan. In **SQL Editor**, run
   `supabase/migrations/20261025000100_accounts_and_private_workspaces.sql`. It creates:
   - a `profiles` row for every new Auth user, with a database-enforced case-insensitive username uniqueness constraint;
   - a `user_workspaces` JSON snapshot table with RLS scoped to `auth.uid()`;
   - owner-bound compare-and-swap RPCs for saving/deleting snapshots; direct anon/authenticated write grants are revoked.
2. In **Authentication → Providers**, enable Email and turn on **Confirm email**. Set the provider minimum password length to
   **12** so direct use of Supabase's public Auth API cannot bypass the server-side app validation. Supabase Auth applies
   its own password hashing, verification token expiry/use rules, session management and Auth rate limits.
3. In **Authentication → URL Configuration**, set the Site URL to your actual app origin and allow the exact callback URLs
   `/auth/callback` for that origin plus local development `http://localhost:3000/auth/callback`. Add the intended Vercel
   Preview URL pattern only if you need preview auth. Do not use an untrusted open redirect.
4. In **Authentication → Email Templates**, paste `supabase/templates/confirm-signup.html` into the confirmation template
   and `supabase/templates/reset-password.html` into the password recovery template. Both use Supabase's secure
   `{{ .ConfirmationURL }}` token and `{{ .SiteURL }}` variables.
5. **Email delivery:** Supabase Auth's built-in email sender is suitable only for limited testing and may restrict recipients
   or rate. For general use, configure a custom SMTP sender in Supabase Auth using a sender/domain you already control.
   Verify its sender/domain with that provider, test both confirmation and reset emails, and keep SMTP credentials only in
   the Supabase dashboard. Do not use a personal Gmail password, do not buy a domain, and verify the sender's free-tier
   limits before using it. The app uses Supabase Auth's signup/resend/reset APIs; it does not send mail itself.
6. Copy only the Supabase **Project URL** and **anon/publishable key** (not service-role/secret keys) to `.env.local` and the
   intended Vercel environment:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   NEXT_PUBLIC_APP_URL=https://YOUR_ACTUAL_APP_ORIGIN
   SUPABASE_AUTH_SCHEMA_READY=true
   SUPABASE_EMAIL_DELIVERY_READY=true
   ```

   Set each readiness flag only after the migration or email delivery is truly configured and tested. For local development,
   use `NEXT_PUBLIC_APP_URL=http://localhost:3000`. The public key is intentionally public; **never set or expose a service-role
   key**. Add Vercel variables yourself only after review; production settings were not changed here.
7. Register an account, verify its email, sign in, then use Settings → **Account & private backup** to save/restore a
   snapshot. The first upload leaves local data in place. Restore downloads a JSON copy of the current browser workspace
   before replacing it. Concurrent overwrites are rejected. Sign-out does not delete local IndexedDB data. Account deletion
   is not self-service yet; the project owner must remove the account in Supabase Auth.

The app never displays “Email sent”. A successful Auth API response is described as a conditional verification/reset
request; SMTP acceptance does not prove mailbox delivery. Provider errors are surfaced, and retry links are available.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

Account tests mock Supabase's Auth and PostgREST boundaries and inspect the migration's constraints/RLS rules. They verify
validation, normalization, username conflict handling (including simultaneous requests at the route boundary),
verification callback handling, unverified/verified sign-in, reset/resend failure behavior, authorization scoping, and
provider retry messaging. They do **not** contact a live Supabase project or deliver a real email. Live-provider smoke tests
must be completed after the owner configures Supabase and SMTP. Existing IndexedDB tests continue to cover JSON backup and
restore behavior.

Browser-only interactions (modal flows, clipboard, PDF/PNG export, IndexedDB quota errors, and responsive account forms)
should also be tested in a real desktop and mobile browser before launch.

## Deploying to Vercel

The local-only app still builds without provider configuration. Account features require the environment variables above.
Do not use `vercel --prod` without explicit production-deployment approval.

```bash
npm run build
```

Or import the repository in the Vercel dashboard: framework preset **Next.js**, build command `next build`, output `.next`,
Node 20+. Configure account variables for Preview first, test there, and only add Production variables after owner approval.

### Other manual steps

- **Custom domain** — not configured. Add it in Vercel only if already owned/approved, then update `metadataBase`, `robots.ts`
  and `sitemap.ts` from `https://unbilled.app` to the chosen domain.
- **Email sender** — requires an owner-configured SMTP provider and verified sender identity for general delivery; no sender
  credentials or payment service are included in the repository.

## Deliberate limitations

- **No automatic cloud sync** — the active ledger remains local. Cloud data is a manual, per-user snapshot; different users
  cannot read another account's row under the supplied RLS policies.
- **Local browser data is not account-isolated at rest** — anyone using the same browser profile can inspect that local
  workspace. Sign-out intentionally leaves it intact; export and clear it on shared devices.
- **Account deletion is not self-service** — deleting a cloud snapshot is available, but removing the Supabase Auth identity
  requires owner action in the Supabase dashboard.
- **Client approval is client-side** — the approval page creates a text receipt with a lightweight checksum for the client to
  send back manually. The checksum is not a cryptographic signature and does not prove identity/approval or payment.
- **No time or payment tracking** — hours and absorbed-work values are estimates; approved orders are statuses, not confirmed
  invoices or payment.
- **Estimates are heuristics** — market medians per unit of work, not a prediction for a specific project.
- **Not legal advice** — the clause library is plain-language starter text, not a reviewed contract.
