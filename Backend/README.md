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

## API Documentation

Interactive Swagger docs are served at `/api/v1/docs` while the server is running.

## Email Providers

SkillKart sends transactional email (OTP, welcome, security alerts, contact/newsletter) through a **multi-provider system**. The active provider is chosen with a single env var — no code changes required.

### Architecture

```
Controllers/Services  →  email.service.js (frozen public API)
                             │
                             ├─ templates/renderer.js  → pure (subject, html, text)
                             ├─ EMAIL_ENABLED / EMAIL_SANDBOX checks
                             ├─ retry.util.js  → exponential backoff on transient errors
                             ├─ email.factory.js → provider singleton (from registry)
                             │      └─ providers/{smtp,resend}.provider.js
                             ├─ email.metrics.js → in-memory counters
                             └─ EmailLog (Mongo audit trail)
```

The public API in `services/email.service.js` (`sendEmail`, `sendOTPEmail`, `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendLoginAlertEmail`, `sendPasswordChangeAlertEmail`) is unchanged — callers never know which provider is active.

### Supported providers

| Provider | `EMAIL_PROVIDER` | Best for |
|----------|------------------|----------|
| SMTP (Nodemailer) | `smtp` | Local dev, Gmail app-passwords, Mailtrap, custom SMTP |
| Resend | `resend` | Production & hosts that block SMTP ports (e.g. Railway) |

### Switching providers

```env
EMAIL_PROVIDER=smtp     # or: resend
```

Everything else is provider-specific config (below). Restart the server to apply.

### SMTP setup

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password      # Gmail → Account → Security → App Passwords
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=SkillKart
```

Legacy `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` / `EMAIL_FROM_NAME` are still honoured as fallbacks (a deprecation warning is printed at startup). Prefer the `SMTP_*` names.

### Resend setup

1. Create an API key at <https://resend.com/api-keys>.
2. Verify a sending domain at <https://resend.com/domains> and set `RESEND_FROM_EMAIL` to an address on that domain.
3. For quick testing without a domain, use the built-in `onboarding@resend.dev` sender — but note Resend **only delivers those to your own Resend account email**; other recipients return a `403 validation_error`.

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=SkillKart
# RESEND_REPLY_TO=support@yourdomain.com
```

### Feature flags & sandbox mode

| Var | Effect |
|-----|--------|
| `EMAIL_ENABLED=false` | Log every send but skip actual delivery (an EmailLog row with `status: 'skipped'` is still written). |
| `EMAIL_SANDBOX=true` | Redirect **all** outgoing mail to `EMAIL_SANDBOX_RECIPIENT`; the real recipient is preserved in the log's `originalRecipient`. |
| `EMAIL_SANDBOX_RECIPIENT` | Required when sandbox is on. |

### Railway deployment

Railway (and several other PaaS hosts) **block outbound SMTP ports (25/465/587)**, so Gmail/SMTP silently fails there. Use **Resend** in production:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@yourverifieddomain.com
```

### Adding a new provider (3 steps)

1. Create `src/services/email/providers/<name>.provider.js` extending `EmailProvider` and implement `send()` + `verify()`.
2. Register it in `src/services/email/email.registry.js`: `registerProvider('<name>', require('./providers/<name>.provider'))`.
3. Add its config to `email.config.js` (reader + validation) and set `EMAIL_PROVIDER=<name>`.

No controller, service, or template changes are needed.

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing RESEND_API_KEY` / `Missing SMTP_HOST` at startup | Set the named variable for the selected provider. |
| `Invalid EMAIL_PROVIDER "x"` | Value must be one of `smtp`, `resend`. |
| Resend `403 You can only send testing emails to your own email address` | You're using `onboarding@resend.dev`. Verify a domain and switch `RESEND_FROM_EMAIL`. |
| Resend `verify() failed: This API key is restricted to only send emails` | Harmless — a send-only key can't list domains; sending still works (treated as verified). |
| SMTP timeouts on Railway/Render | Outbound SMTP is blocked; switch to `EMAIL_PROVIDER=resend`. |
| Emails not arriving but logs say "sent" | Check spam; verify the `from` domain's SPF/DKIM (Resend domain dashboard). |
| Transient 429/5xx | Retried automatically with exponential backoff (up to 3 attempts). |

## Notes

- Never commit `.env`. Only `.env.example` is tracked; `secure/` and logs are gitignored.
- For local development you can run entirely without Stripe or Supabase by setting `STRIPE_DUMMY=true` and leaving the Supabase keys blank.
