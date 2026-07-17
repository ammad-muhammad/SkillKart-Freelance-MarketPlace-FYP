# SkillKart — Backend API

Express + MongoDB REST API powering the SkillKart marketplace: authentication, RBAC, jobs, gigs, proposals, contracts, escrow payments, messaging, reviews, disputes, an admin panel, and AI-assisted tooling.

> Part of the [SkillKart monorepo](../README.md). For full-stack setup, start there.

## Features

- **Authentication** — email/password + OTP, JWT access & refresh tokens, optional Supabase social OAuth.
- **RBAC** — role-based access control (guest, freelancer, client, admin roles) with an encrypted SuperAdmin.
- **Marketplace** — jobs, gigs, proposals, and a strict contract lifecycle (proposal → contract → delivery → review) modelled as state machines.
- **Payments** — Stripe-backed escrow with a simulated/dummy mode for local development; wallet balances, payouts, and withdrawals.
- **Messaging** — conversation-based in-app messaging tied to contracts.
- **Reviews & disputes** — two-way reviews and an admin-mediated dispute workflow.
- **Skill verification** — skill taxonomy, matching, and test attempts.
- **Admin panel API** — isolated auth and endpoints under an admin prefix.
- **AI services** — Buddy assistant, cost estimation, skill matching, and CV analysis via a provider router with automatic fallback across **Gemini, Qwen, Groq, Claude, and Ollama** (local). The chain order is env-driven by numbered priorities (`AI_PRIORITY_<NAME>`, 0 = first; `-1` disables a provider). When all providers fail it returns a clean `503` ("AI temporarily out of service") rather than a 500 — the app never crashes on an AI outage.
- **Hardening** — Helmet, rate limiting, request validation, sanitization, structured logging (Winston), Swagger API docs, and an `unhandledRejection` guard that keeps operational errors from taking down the server.

## Prerequisites

- Node.js ≥ 18, npm ≥ 9
- A MongoDB connection string (local or Atlas)

## Setup

```bash
npm install
cp .env.example .env      # then edit — at minimum set MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm run setup:superadmin  # optional: create the SuperAdmin account
npm run dev
```

Once running:

- API base → `http://localhost:5000/api/v1`
- Health check → `http://localhost:5000/health`
- Swagger docs → `http://localhost:5000/api/v1/docs`

See [`.env.example`](.env.example) for the full, documented list of environment variables.

## Project Structure

```
src/
├── config/         Application configuration (env, DB, integrations)
├── controllers/    HTTP request handlers
├── middleware/     Auth, RBAC, validation, error handling, rate limiting
├── models/         Mongoose schemas — the source of truth
├── routes/         API route definitions (mounted under /api/v1)
├── services/       Business logic (payments, AI, skill matching, ...)
├── validators/     express-validator request schemas
├── webhooks/       Stripe / external webhook handlers
├── utils/          Shared helpers
├── scripts/        Operational scripts (see below)
├── app.js          Express app assembly
└── server.js       HTTP server bootstrap
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the API with nodemon (auto-reload) |
| `npm start` | Start the API (nodemon) |
| `npm run setup:superadmin` | Create/rotate the encrypted SuperAdmin credentials |
| `npm run seed:demo` | Seed a full, realistic, interconnected demo dataset |
| `npm run seed:demo:small` | Seed a small dataset for a quick smoke run |
| `npm run gmail:token` | One-time: obtain a `GOOGLE_REFRESH_TOKEN` for the Gmail API provider |
| `npm run lint` | Lint `src/` with ESLint |
| `npm run format` | Format `src/` with Prettier |

### Demo data

`scripts/seedDemoData.js` populates the existing models with a coherent marketplace — users (realistic Pakistani names), jobs, gigs (covering every category), proposals, contracts, payments, deliveries, messages, reviews, testimonials, disputes, notifications — spread across the last ~12 months, with full referential integrity (no orphaned records).

```bash
npm run seed:demo            # full dataset (clears marketplace collections first)
npm run seed:demo -- --keep  # append instead of clearing
npm run seed:demo:small      # smaller dataset
```

Demo logins (including the **admin dashboard** at `/admin-panel/login`) are documented in the [root README](../README.md#seeding-demo-data). The admin credentials come from `ADMIN_EMAIL` in `.env` — change them for any real deployment.

## Email

Transactional email (OTP, security alerts, contact form) runs on a pluggable
provider architecture. The active transport is chosen with **one variable**:

```bash
EMAIL_PROVIDER=smtp    # or: gmail
```

Controllers and services never know which provider is active — they call
`email.service.js` and the factory resolves the transport.

| Provider | Value | Auth | Use when |
|----------|-------|------|----------|
| SMTP (Nodemailer) | `smtp` | Host + app password | Default. Simplest; works everywhere. |
| Gmail API | `gmail` | OAuth refresh token | Better deliverability/quota visibility than Gmail SMTP. |

### How it fits together

```
EMAIL_PROVIDER → registry → factory → provider.send() → SMTP | Gmail API
                                ↑
                     email.service.js  (stable public API)
```

```
src/services/email/
├── providers/
│   ├── provider.interface.js   Base class: send / verify / capabilities / defaults
│   ├── smtp.provider.js        Nodemailer transport
│   ├── gmail.provider.js       Gmail REST API + MIME builder
│   ├── registry.js             Declares available providers  ← add new ones here
│   └── factory.js              Selects provider, falls back to SMTP
├── templates/                  Provider-agnostic { subject, html } renderers
├── email.retry.js              Exponential backoff + error classification
└── email.metrics.js            In-process counters (sent/failed/retries/duration)
```

**Adding a provider** (SES, Brevo, Mailgun, …): create `providers/<name>.provider.js`
extending `EmailProvider`, add one line to `registry.js`. No other file changes.

### Settings

| Variable | Default | Purpose |
|----------|---------|---------|
| `EMAIL_PROVIDER` | `smtp` | `smtp` \| `gmail`. An unknown value fails at startup. |
| `EMAIL_ENABLED` | `true` | `false` skips all sends (still logged as `queued`). |
| `EMAIL_SANDBOX` | `false` | Redirects **all** mail to `EMAIL_SANDBOX_RECIPIENT`. |
| `EMAIL_SANDBOX_RECIPIENT` | — | Required when sandbox is on. |

SMTP uses `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` /
`SMTP_FROM_EMAIL` / `SMTP_FROM_NAME`. The older `EMAIL_HOST` / `EMAIL_PORT` /
`EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` names still work as
fallbacks, so existing deployments need no changes. Port `465` requires
`SMTP_SECURE=true`; port `587` requires `SMTP_SECURE=false`.

### Gmail API setup

> **This is not Supabase's Google sign-in.** Supabase Google OAuth authenticates
> *users*. This authorises **one dedicated platform mailbox** to send transactional
> mail on the app's behalf — a separate concern with separate credentials. The app
> performs no OAuth flow at runtime: it exchanges a long-lived refresh token for
> access tokens, and `googleapis` handles that internally.

1. **Google Cloud Console** → create (or pick) a project.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → OAuth consent screen**
   - User type: **External**, publishing status: **Testing**.
   - Add the platform Gmail account under **Test users**.
   - Add scope `https://www.googleapis.com/auth/gmail.send`.
   - Staying in *Testing* avoids Google's restricted-scope security assessment.
     Refresh tokens for test users expire after **7 days** — for a long-lived
     production sender, either complete verification or use SMTP.
4. **Credentials → Create credentials → OAuth client ID**
   - Type: **Web application**.
   - Authorised redirect URI: `http://localhost:5000/oauth2callback`
     (must match `GOOGLE_REDIRECT_URI` exactly).
5. Put the client ID/secret in `Backend/.env`, then run:

   ```bash
   npm run gmail:token
   ```

   Open the printed URL, sign in **as the platform account**, approve. The script
   prints `GOOGLE_REFRESH_TOKEN` and `GOOGLE_EMAIL` — paste both into `.env`.
6. Set `EMAIL_PROVIDER=gmail` and restart. Startup should log:

   ```
   📧 Initializing Email Provider...
   ✅ Email Provider: Gmail API
   ```

**Scope:** only `gmail.send` is requested — the provider sends and never reads the
mailbox. That's why `verify()` proves the credentials by refreshing the access token
rather than calling a Gmail read endpoint (which would need a broader scope).

**Quota:** ~500 recipients/day for consumer Gmail, ~2,000/day for Workspace.

### Deploying Gmail to Railway

The refresh token is **not** machine-bound — generate it once locally and copy the
same value into Railway. `GOOGLE_REDIRECT_URI` is only used during the one-time
consent; production never contacts it, so it isn't needed as a Railway variable.

Set on Railway: `EMAIL_PROVIDER=gmail`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REFRESH_TOKEN`, `GOOGLE_EMAIL`.

> ⚠️ **7-day expiry while the consent screen is in Testing.** Google expires refresh
> tokens after a week for unpublished apps, so Gmail sending stops ~7 days after each
> authorization until you re-run `npm run gmail:token` and redeploy. The app falls
> back to SMTP automatically — but **Railway blocks outbound SMTP ports (465/587)**,
> so on Railway there is nothing to fall back to. For anything long-running there,
> either publish the consent screen (requires Google's restricted-scope review) or
> use an API-key provider (SendGrid/Brevo/Mailgun — one new file in `providers/`).
> Regenerating the **client secret** also invalidates existing refresh tokens.

### Behaviour

- **Startup verification** — the provider is health-checked at boot, so bad config
  surfaces immediately instead of on the first OTP.
- **Fallback** — if `EMAIL_PROVIDER=gmail` but the OAuth vars are missing or fail
  verification, the app logs a warning and runs on SMTP rather than refusing to boot.
- **Retry** — transient failures (network, timeout, `429`, `5xx`, SMTP `4yz`) retry
  with exponential backoff + jitter. Permanent ones (`invalid_grant`, bad auth,
  invalid recipient, malformed request, SMTP `5yz`) fail immediately — retrying a
  revoked token just burns quota.
- **Logging** — every attempt is written to `EmailLog` (`provider`, `template`,
  `status`, `durationMs`, `attempts`) and surfaced in **Admin → Monitoring → Email**,
  filterable by `status` and `provider`.

### Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `Email Provider: SMTP` when you set `gmail` | Fallback kicked in — the log line names the missing vars or the OAuth error. |
| `invalid_grant: Token has been expired or revoked` | Refresh token dead. Common cause: consent screen in *Testing* (7-day expiry). Re-run `npm run gmail:token`. |
| `npm run gmail:token` prints "No refresh token returned" | Account already granted access. Revoke at [myaccount.google.com/permissions](https://myaccount.google.com/permissions), re-run. |
| `redirect_uri_mismatch` | `GOOGLE_REDIRECT_URI` ≠ the URI registered on the OAuth client. They must match character for character. |
| `Gmail API has not been used in project … before or it is disabled` | Step 2 skipped — enable the Gmail API. |
| `403 Request had insufficient authentication scopes` | Something asked Gmail for more than `gmail.send` grants. The provider only ever sends — it never reads the mailbox, so `verify()` checks the token by refreshing it, not by calling a Gmail read endpoint. If you add a call like `users.getProfile`, it will fail with this. |
| SMTP `EAUTH` / `Username and Password not accepted` | Gmail needs an **app password** (2FA required), not the account password. |
| SMTP connects locally, times out on Railway | Some hosts block outbound `465`/`587`. Switch to `EMAIL_PROVIDER=gmail` (HTTPS). |
| OTP emails never arrive | Check **Admin → Monitoring → Email** for the row: `failed` shows the provider error; no row at all means the send was never attempted. |

## API Documentation

Interactive Swagger docs are served at `/api/v1/docs` while the server is running.

## Notes

- Never commit `.env`. Only `.env.example` is tracked; `secure/` and logs are gitignored.
- For local development you can run entirely without Stripe or Supabase by setting `STRIPE_DUMMY=true` and leaving the Supabase keys blank.
