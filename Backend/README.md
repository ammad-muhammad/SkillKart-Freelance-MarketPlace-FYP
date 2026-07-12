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
- **AI services** — cost estimation, assistant, and skill matching via a provider router (Gemini / Groq / Claude).
- **Hardening** — Helmet, rate limiting, request validation, sanitization, structured logging (Winston), and Swagger API docs.

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

`scripts/seedDemoData.js` populates the existing models with a coherent marketplace — users, jobs, gigs, proposals, contracts, payments, deliveries, messages, reviews, disputes, notifications — spread across the last ~12 months, with full referential integrity.

```bash
npm run seed:demo            # full dataset (clears marketplace collections first)
npm run seed:demo -- --keep  # append instead of clearing
npm run seed:demo:small      # smaller dataset
```

Demo logins are documented in the [root README](../README.md#seeding-demo-data).

## API Documentation

Interactive Swagger docs are served at `/api/v1/docs` while the server is running.

## Notes

- Never commit `.env`. Only `.env.example` is tracked; `secure/` and logs are gitignored.
- For local development you can run entirely without Stripe or Supabase by setting `STRIPE_DUMMY=true` and leaving the Supabase keys blank.
