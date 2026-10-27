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
| Client scope page | Share a read-only, plain-language scope (included / not included / revisions) as a self-contained URL; anyone with the link can view it. |
| Leak report | Six-month chart, per-client breakdown, share card exported as PNG, copy-ready summary. |
| Library | Eight built-in reply scripts, ten public contract clauses, plus change-order and scope-of-work templates. Pro optionally adds personal cloud-saved reply playbooks when the owner configures test-mode billing. |
| Local data | IndexedDB persistence, JSON export/import, sample workspace, full reset. |
| Optional accounts | Google, Microsoft, and Apple OAuth plus email/password signup through Supabase Auth; password recovery; manually saved private account snapshots in Supabase Postgres with RLS. No automatic sync and no account required for local data. |

## Local-first and optional account backups

The working ledger remains in this browser's IndexedDB unless you explicitly choose a private account backup. Signup is
optional. Verified accounts use Supabase Auth and a single per-user JSON snapshot in Postgres, protected by row-level
security; upload, restore, replacement and deletion are manual, not continuous synchronization. Auth/email metadata and
opt-in workspace snapshots therefore leave the browser when those features are used. The normal account flows use the
public Supabase key; the optional billing webhook uses a privileged service key only on the server, never in browser code.
Change-order and scope links carry document data in the URL **fragment** (`#…`), which browsers do not
transmit in HTTP requests to the link host. The fragment is not encrypted or access-controlled: anyone with the full URL
can inspect the content, so share only with intended recipients. Client review does not notify the sender automatically;
any approval receipt must be returned by the client. Local JSON restores are schema-validated and capped at 5 MiB; invalid
files leave the existing workspace unchanged.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) — deployed on Vercel
- **Tailwind CSS v4** with a custom design system (warm paper, ink, vermillion; Fraunces + Inter Tight + JetBrains Mono)
- **Dexie / IndexedDB** for the local workspace, **dexie-react-hooks** for live queries
- **Supabase Auth + Postgres RLS** for optional email-verified accounts, manually saved private workspace snapshots, and server-enforced Pro playbooks
- **@supabase/ssr** for HttpOnly cookie sessions and server-side authentication
- **Vitest** + **fake-indexeddb** for engine, codec, auth-route and persistence tests

The local workspace runs without environment variables and starts with two successful guest actions. A successful scope
check, a committed ledger-add operation (one action per save, including a batch), or a newly saved request decision counts;
failed operations, navigation, opening records, and project setup do not. The allowance is stored client-side as a
lightweight trial prompt—not secure anti-abuse enforcement—and may be reset by someone who modifies browser storage.
Cross-tab updates are synchronized when browser storage events arrive. When the allowance is used, local work remains in
this browser. Google, Microsoft, and Apple OAuth require their Supabase provider setup, the profile migrations, and
Preview/Production redirect configuration; email/password signup and recovery additionally require verified email
delivery. Private cloud backups remain behind the existing database/readiness gates. See **Account setup** below. Stripe billing is
a separate, opt-in test-mode integration that uses a server-only service-role key for signed webhook persistence.

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

1. **Create a Supabase project** on the free plan. In **SQL Editor**, run all three migrations in order:
   `supabase/migrations/20261025000100_accounts_and_private_workspaces.sql`, then
   `supabase/migrations/20261025000200_google_oauth_profiles.sql`, then
   `supabase/migrations/20261025000300_apple_microsoft_oauth_profiles.sql`. If this project already has the first two
   migrations applied, apply only the new third migration. The first migration creates:
   - a `profiles` row for every new Auth user, with a database-enforced case-insensitive username uniqueness constraint;
   - a `user_workspaces` JSON snapshot table with RLS scoped to `auth.uid()`;
   - owner-bound compare-and-swap RPCs for saving/deleting snapshots; direct anon/authenticated write grants are revoked.
   The second migration keeps explicit username validation for email signups and assigns collision-safe usernames to Google OAuth users. The third extends that same profile trigger to Microsoft Azure and Apple sign-ins; it does not change RLS, account linking, or cloud workspace ownership.
2. In **Authentication → Providers**, enable Email and turn on **Confirm email**. Set the provider minimum password length to
   **12** so direct use of Supabase's public Auth API cannot bypass the server-side app validation. Supabase Auth applies
   its own password hashing, verification token expiry/use rules, session management and Auth rate limits.
3. In **Authentication → URL Configuration**, set the Site URL to your actual app origin and allow the exact app callback
   URLs `/auth/callback` for that origin plus local development `http://localhost:3000/auth/callback`. Preview callback
   hosts use Vercel's deployment URL (`VERCEL_URL`); allow only the exact branch/deployment hosts or a narrowly scoped
   wildcard for your Vercel project. Do not use an untrusted open redirect.
4. **Social OAuth providers:** the app uses one same-origin OAuth initiation route and the shared `/auth/callback`; the
   social providers do not need separate application callbacks. Each provider's developer console must point to Supabase's
   callback URL, normally `https://<project-ref>.supabase.co/auth/v1/callback` (copy the exact URL shown in Supabase
   **Authentication → Providers**). This is distinct from the app callback. In Supabase **Authentication → URL
   Configuration**, allow the exact app callback `/auth/callback` for local development, intended Preview hosts, and the
   actual Production origin. Keep provider client secrets in Supabase only—never in Git, app code, or `NEXT_PUBLIC_*`
   variables. Supabase's automatic identity linking is the only linking behavior used here; there is no application-side
   linking by email. Supabase is responsible for requiring a verified matching email before automatically linking
   identities. Do not enable a provider until its verification behavior and redirect have been tested.

   - **Google:** in Google Cloud Console, configure the OAuth consent screen and create an OAuth client with application
     type **Web application**. In **Authorized redirect URIs**, add the Supabase callback above. In Supabase
     **Authentication → Providers → Google**, enable the provider and enter the OAuth client ID and client secret. The
     app requests `openid email profile` and retains the existing account chooser/consent behavior.
   - **Microsoft:** in Supabase, enable **Azure** and enter the Microsoft Entra application (client) ID and client secret.
     In Entra **App registrations**, create an app registration, select the supported account types you intend to accept,
     add the Supabase callback above as a **Web** redirect URI, add the `email` scope/permission, and create a client secret
     (copy its value once into Supabase). Supabase's default tenant is `common` (work/school and personal accounts); use
     `consumers` for personal Microsoft accounts only, or the tenant-specific authorization URL
     `https://login.microsoftonline.com/<tenant-id>` to restrict sign-in to one organization. Configure the tenant in the
     Supabase Azure provider settings, not in the app callback. The app requests only the `email` scope. Entra can provide
     an unverified email claim in some configurations: configure the optional `xms_edov` claim in the Entra token
     configuration (ID token; include the access token if required by your Supabase setup), and test with accounts that
     do and do not have verified email. Supabase must remain responsible for verified-email automatic linking; never
     manually link on an email match alone.
   - **Apple:** web sign-in requires an Apple Developer account with Sign in with Apple configured, an App ID with the
     capability enabled, a **Services ID** for the web client, and a Sign in with Apple key. Register the Services ID's
     website domain and return URL as required by Apple; the return URL is Supabase's callback above. In Supabase's Apple
     provider settings, use the Services ID as the client ID and supply the Team ID, Key ID, and the client secret
     generated from the Apple private `.p8` key. The `.p8` key and generated secret stay private in Supabase; Apple's
     generated client secret expires and must be rotated at least every six months. The app requests `email`; Apple web
     OAuth does not provide a full name to this server-side flow, which is not needed for the generated profile username.
     Apple Developer Program membership currently costs USD $99 per year (regional pricing may vary; eligible entities
     may qualify for a fee waiver). Do not enroll or pay unless separately approved. If no suitable membership already
     exists, Apple sign-in cannot be fully configured or live-tested until the owner decides whether to enroll. If using
     Apple's private relay email, configure the sender domains in Apple's relay settings so Supabase verification and
     recovery email can reach those addresses.
5. In **Authentication → Email Templates**, paste `supabase/templates/confirm-signup.html` into the confirmation template
   and `supabase/templates/reset-password.html` into the password recovery template. Both use Supabase's secure
   `{{ .ConfirmationURL }}` token and `{{ .SiteURL }}` variables.
6. **Email delivery:** Supabase Auth's built-in email sender is suitable only for limited testing and may restrict recipients
   or rate. For general use, configure a custom SMTP sender in Supabase Auth using a sender/domain you already control.
   Verify its sender/domain with that provider, test both confirmation and reset emails, and keep SMTP credentials only in
   the Supabase dashboard. Do not use a personal Gmail password, do not buy a domain, and verify the sender's free-tier
   limits before using it. The app uses Supabase Auth's signup/resend/reset APIs; it does not send mail itself.
7. Copy only the Supabase **Project URL** and **anon/publishable key** (not service-role/secret keys) to `.env.local` and the
   intended Vercel environment:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   NEXT_PUBLIC_APP_URL=https://YOUR_ACTUAL_APP_ORIGIN
   SUPABASE_AUTH_SCHEMA_READY=false
   SUPABASE_EMAIL_DELIVERY_READY=false
   ```

   The readiness variables are explicit owner-controlled gates, not automatic database or SMTP health checks. The account
   status endpoint considers a gate ready only when its value is exactly the string `true`; unset values stay off. With the
   schema gate off, account routes remain paused. Signup, verification resend, and password reset also remain paused while
   the email gate is off. Set `SUPABASE_AUTH_SCHEMA_READY=true` only after applying and checking the migration; set
   `SUPABASE_EMAIL_DELIVERY_READY=true` only after a real test email has arrived and the verification/reset flow has been
   checked. Do not treat turning a gate on as proof that the provider is working. For local development, use
   `NEXT_PUBLIC_APP_URL=http://localhost:3000`. The public anon/publishable key is intentionally public. Never place `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*`, a
   client bundle, or the repository; the webhook needs it only as a private server secret. Add Vercel variables yourself
   only after review; no provider or Production settings were changed here.
8. Register with any enabled Google, Microsoft, or Apple provider, or with email, then use Settings → **Account & private backup** to save/restore a
   snapshot. The first upload leaves local data in place. Restore downloads a JSON copy of the current browser workspace
   before replacing it. Concurrent overwrites are rejected. Sign-out does not delete local IndexedDB data. Account deletion
   is not self-service yet; the project owner must remove the account in Supabase Auth.

The app never displays “Email sent”. A successful Auth API response is described as a conditional verification/reset
request; SMTP acceptance does not prove mailbox delivery. Provider errors are surfaced, and retry links are available.

## Stripe subscriptions and Pro (test mode only)

The integration accepts **Stripe test secret keys only** (`sk_test_…`) and rejects live-mode webhook events. Checkout is
hosted by Stripe; Unbilled never receives or stores card numbers. The proposed default is **$12 USD per month**, but the
actual recurring test Price ID is server-configured and the public label is separately configurable. The only paid
capability added here is personal cloud-saved reply playbooks. Free local ledger data, scope checks, backups, and built-in
scripts are not moved, synced, or deleted when a subscription expires. Pro access comes from a verified Supabase session,
a signed Stripe webhook, and Postgres RLS—not from browser state or Checkout return parameters.

No Stripe products or secrets were created, no Supabase database migration was applied, and no deployment settings were changed for this implementation.
To enable a non-production test environment, the owner should:

1. Review `supabase/migrations/202610260001_billing_and_pro_playbooks.sql`, then apply it to the intended Supabase project
   and verify the four billing/playbook tables, RLS policies, and `apply_stripe_subscription_event` function. This migration
   has not been applied by this code change.
2. In **Stripe Test mode** only, create a recurring USD monthly Price for the desired amount (initial proposal: $12 USD),
   and configure the Stripe Customer Portal to permit subscription management/cancellation. Copy its `price_…` ID. Keep
   that ID stable while subscriptions exist: webhook processing classifies only the configured Pro Price as Pro, so
   changing it without an explicit migration/reclassification plan can remove access for existing subscribers.
3. Configure these exact variables in a private, **non-production** server environment. Use the Preview environment in
   Vercel or a dedicated non-production Cloudflare Worker. Never share values in chat, commit them, or expose secrets in
   `NEXT_PUBLIC_*` variables.

   | Variable | Purpose |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | Stripe test secret only; must begin `sk_test_`. |
   | `STRIPE_PRO_PRICE_ID` | The recurring USD monthly test Price ID created above; never supplied by the browser. |
   | `STRIPE_WEBHOOK_SECRET` | Test-mode endpoint signing secret (`whsec_…`). |
   | `SUPABASE_SERVICE_ROLE_KEY` | Private server-only Supabase service-role/secret key used only by the webhook; never client-side. |
   | `BILLING_SCHEMA_READY` | Keep `false` until the billing migration and RLS are applied and reviewed; then the owner may set exact string `true` for the test deployment. |
   | `NEXT_PUBLIC_PRO_PRICE_LABEL` | Required public display label; `.env.example` proposes `$12 USD / month`. Keep it aligned with the configured Stripe Price. |
   | `NEXT_PUBLIC_APP_URL` | Canonical origin for that test deployment and Checkout redirects. |

   Keep the existing Supabase Project URL and anon/publishable key in their existing variables. For local development, use
   `.env.local` and an ignored `.dev.vars` for Worker-only secrets; `.env.example` lists names but contains no real keys.
   On Cloudflare, set secrets/vars only on the owner-selected non-production Worker environment. An unset
   `BILLING_SCHEMA_READY` fails closed; no Cloudflare/Vercel setting is changed by this repository update.
4. Register the test webhook endpoint at `https://YOUR_TEST_APP_ORIGIN/api/billing/webhook` and subscribe to
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_succeeded`, and `invoice.payment_failed`. Store only the endpoint's
   **test-mode** signing secret as `STRIPE_WEBHOOK_SECRET`. The endpoint verifies the exact raw request body and timestamp,
   rejects live events, fetches the current subscription from Stripe, and sends it to an idempotent database RPC. Repeated
   event IDs are ignored; older events cannot roll the stored subscription back. Configure webhook delivery before making
   a test Checkout transaction.
5. Test the full flow in that non-production deployment with a Stripe test transaction: hosted Checkout, signed webhook
   delivery, status refresh, playbook create/delete and cross-account denial, cancellation/expiry, and the Stripe Portal.
   Confirm that local IndexedDB records remain unchanged after Pro access ends. Verify webhook retries and out-of-order
   events in Stripe's test tooling. These repository tests use mocks; they do **not** prove a real Stripe transaction or
   provider configuration.

Do not create a live product, set live keys, configure Production secrets, or enable Production billing without separate
owner approval. Never set `BILLING_SCHEMA_READY=true` as a substitute for applying and verifying the migration. Test
Checkout transactions are not actual charges and are not proof of production readiness.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
WORKERS_CI=1 npm run build
npm audit
```

Tests mock Stripe/Supabase provider boundaries and inspect billing migration RLS, ownership, event de-duplication, and
out-of-order guards. They cover test-only configuration, raw-body signature/timestamp verification, invalid and cross-origin
requests, server-derived checkout identity/price, portal authorization, playbook validation/ownership, RLS denial, and local
workspace preservation after entitlement expiry. Existing account tests cover auth and snapshot behavior. None of these
tests contact Stripe or Supabase, complete an actual test transaction, or prove provider configuration; the owner must run
the documented test-mode transaction and webhook checks before considering the integration ready. The builds are not
Production deployments.

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
- **Email sender** — requires an owner-configured SMTP provider and verified sender identity for general delivery; no
  SMTP credentials are included in the repository.

## Deploying to Cloudflare Workers (OpenNext)

The Cloudflare adapter uses runtime Worker bindings for server secrets. Keep billing secrets out of `wrangler.jsonc`; use
an ignored local `.dev.vars` for local Worker development or the owner-selected non-production Worker environment's private
secret/variable settings. An unset `BILLING_SCHEMA_READY` fails closed. Do not deploy or change Production settings as part
of this setup.

```bash
WORKERS_CI=1 npm run build
```

This verifies the OpenNext/Cloudflare build path only; it does not deploy. Vercel/Next builds remain `npm run build`.

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
