# SkillKart — Micro-Freelance Marketplace

A dual-sided freelance marketplace built on the MERN stack. SkillKart connects **clients** who need work done with **freelancers** who deliver it, backed by an escrow payment model, a full contract lifecycle (proposal → contract → delivery → review), in-app messaging, skill verification, an admin panel, and AI-assisted tooling.

It supports both marketplace models:

- **Custom jobs** — clients post a job, freelancers submit proposals (Upwork-style).
- **Gigs** — freelancers publish pre-packaged service offerings clients can buy directly (Fiverr-style).

> **Business model:** commission-based. A configurable platform fee is deducted from the freelancer's payout when escrow is released.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running the Apps](#running-the-apps)
- [Seeding Demo Data](#seeding-demo-data)
- [Available Scripts](#available-scripts)
- [Documentation](#documentation)

---

## Architecture

```
┌──────────────────────┐        HTTPS / REST         ┌──────────────────────┐
│   Front-end (Vite)   │  ───────────────────────►   │   Backend (Express)  │
│   React 19 SPA       │   /api/v1/*                 │   REST API + JWT     │
│   localhost:3001     │  ◄───────────────────────   │   localhost:5000     │
└──────────────────────┘                             └──────────┬───────────┘
                                                                │
                                    ┌───────────────────────────┼───────────────────────┐
                                    │                           │                       │
                              ┌─────▼─────┐              ┌───────▼──────┐         ┌──────▼──────┐
                              │  MongoDB  │              │   Supabase   │         │   Stripe    │
                              │ (source   │              │  (OAuth,     │         │  (escrow /  │
                              │ of truth) │              │  optional)   │         │  payments)  │
                              └───────────┘              └──────────────┘         └─────────────┘
```

- **MongoDB** is the system of record for all marketplace data.
- **Supabase** provides optional social OAuth; email/OTP auth is handled by the backend directly.
- **Stripe** powers escrow and payouts, and can be fully bypassed with simulated payments via `STRIPE_DUMMY=true` for local development.
- **AI features** (Buddy assistant, cost estimator, skill matching, CV analysis) route through a provider chain with automatic fallback — **Gemini → Groq → Claude → Ollama** (local). If every provider is down or rate-limited the API returns a clean `503` and the UI shows an "AI is temporarily out of service" notice instead of crashing.

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 19, Vite 7, React Router 7, React Hook Form, Framer Motion, GSAP, Chart.js, Tailwind v4, Axios |
| Backend   | Node.js (≥18), Express 4, Mongoose 8, JWT, Helmet, express-rate-limit, express-validator |
| Database  | MongoDB (Atlas or local) |
| Auth      | JWT (access + refresh) with RBAC; Supabase OAuth (optional) |
| Payments  | Stripe (with dummy/simulated mode) |
| Realtime-ish | Polling-based in-app messaging |
| AI        | Provider router with fallback — Gemini / Groq / Claude / Ollama (local) |
| Tooling   | ESLint, Prettier, Nodemon, Swagger (API docs) |

## Repository Layout

```
.
├── Backend/            # Express REST API (see Backend/README.md)
│   └── src/
│       ├── config/         app configuration
│       ├── controllers/    request handlers
│       ├── middleware/      auth, RBAC, validation, error handling
│       ├── models/          Mongoose schemas (source of truth)
│       ├── routes/          API route definitions (/api/v1)
│       ├── services/        business logic (payments, skill matching, AI, ...)
│       ├── validators/      express-validator schemas
│       ├── webhooks/        Stripe / external webhooks
│       ├── scripts/         operational scripts (seed, superadmin)
│       ├── app.js           Express app wiring
│       └── server.js        HTTP bootstrap
├── Front-end/          # React + Vite SPA (see Front-end/README.md)
│   └── src/
│       ├── pages/          public, client, freelancer, admin, adminPanel
│       ├── Components/     shared UI components
│       ├── context/        React Context state (auth, ...)
│       ├── api/            Axios API clients
│       ├── layouts/        route layouts
│       └── routes/         route configuration
├── docs/               # Product & business documentation
├── package.json        # Root — runs both apps concurrently
└── README.md
```

## Prerequisites

- **Node.js ≥ 18** and **npm ≥ 9**
- **MongoDB** — a connection string (local `mongodb://localhost:27017/...` or MongoDB Atlas)
- *(Optional)* Stripe test keys — or leave `STRIPE_DUMMY=true` to simulate payments
- *(Optional)* Supabase project — for social OAuth
- *(Optional)* An AI provider key (Gemini / Groq / Anthropic) — for AI features

## Quick Start

```bash
# 1. Clone and install everything (root + both apps)
git clone <repo-url>
cd Skill-Kart----Micro-Freelance-Platform
npm run install:all

# 2. Configure environment
cp Backend/.env.example    Backend/.env
cp Front-end/.env.example  Front-end/.env
#   → edit both .env files (at minimum set MONGODB_URI and the JWT secrets)

# 3. (Optional) Create the SuperAdmin account
npm --prefix Backend run setup:superadmin

# 4. (Optional) Seed realistic demo data
npm --prefix Backend run seed:demo

# 5. Run both apps together
npm start
```

- Frontend → http://localhost:3001
- Backend API → http://localhost:5000/api/v1
- API health check → http://localhost:5000/health
- Swagger API docs → http://localhost:5000/api/v1/docs

## Environment Variables

Each app has its own `.env`. Never commit real `.env` files — only `.env.example` is tracked.

**Backend** (`Backend/.env`) — full reference in [`Backend/.env.example`](Backend/.env.example). Essentials:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (**required**) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets, 32+ chars (**required**) |
| `PORT` | API port (default `5000`) |
| `STRIPE_SECRET_KEY`, `STRIPE_DUMMY` | Payments; set `STRIPE_DUMMY=true` to simulate |
| `EMAIL_*` | SMTP for OTP / notification emails |
| `CORS_ORIGIN`, `FRONTEND_URL` | Allowed origins |
| `AI_PROVIDER` + `GEMINI_API_KEY` / `GROQ_API_KEY` / `ANTHROPIC_API_KEY` | AI features |
| `SUPABASE_*` | Optional OAuth |

**Frontend** (`Front-end/.env`) — reference in [`Front-end/.env.example`](Front-end/.env.example):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api/v1`) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional Supabase client |

## Running the Apps

| Command | Runs |
|---------|------|
| `npm start` (root) | Backend + Frontend concurrently |
| `npm --prefix Backend run dev` | Backend only (nodemon, port 5000) |
| `npm --prefix Front-end run dev` | Frontend only (Vite, port 3001) |
| `npm --prefix Front-end run build` | Production build → `Front-end/dist/` |

## Seeding Demo Data

The backend ships a production-grade seeder that populates a realistic, fully-interconnected marketplace (users → jobs/gigs → proposals → contracts → payments → deliveries → messages → reviews → testimonials → disputes), spread across the last ~12 months. Gigs cover **every** marketplace category so the public `/categories` page never shows an empty one, and users have realistic (Pakistani) names.

```bash
npm --prefix Backend run seed:demo          # full dataset (~200 users, 320 jobs, ~220 gigs, ~230 contracts, ~3,400 messages, ~24 testimonials, ~38 disputes)
npm --prefix Backend run seed:demo:small    # small dataset for a quick smoke run
```

> ⚠️ The full seed **clears** the marketplace collections first. Pass `--keep` to append instead of resetting.

**Demo accounts** (password `Pass123!@#`):

| Account | Role |
|---------|------|
| `test.freelancer0@skillkart.com` | Top-rated freelancer (~41 completed) |
| `test.freelancer1@skillkart.com` | Mid-level freelancer |
| `test.client0@skillkart.com` | SME client (many hires) |
| `test.client1@skillkart.com` | Startup client |

All other seeded users share the password `Demo123!@#`.

## Available Scripts

**Root**

| Script | Description |
|--------|-------------|
| `npm start` / `npm run dev` | Run Backend + Frontend together |
| `npm run install:all` | Install root, Backend, and Frontend dependencies |

**Backend** (`cd Backend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm run setup:superadmin` | Create the encrypted SuperAdmin account |
| `npm run seed:demo` / `seed:demo:small` | Seed demo data |
| `npm run lint` / `npm run format` | Lint / format source |

**Frontend** (`cd Front-end`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3001) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint source |

## Documentation

- [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) — comprehensive platform guide (features, roles, lifecycle) for non-developers and developers alike.
- [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) — end-to-end user flows and business-logic blueprint.
- **API reference** — Swagger UI at `http://localhost:5000/api/v1/docs` when the backend is running.

---

<sub>Built by the SkillKart team.</sub>
