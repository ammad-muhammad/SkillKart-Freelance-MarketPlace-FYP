# SkillKart — Micro-Freelance Marketplace

A dual-sided freelance marketplace built on the MERN stack. SkillKart connects **clients** who need work done with **freelancers** who deliver it, backed by a wallet-native escrow payment model — 100% of a fixed-price job's budget locks the instant a proposal is accepted (optionally split into sequential, on-demand-funded milestones for larger projects), with a 7-day auto-release safety net and admin-mediated disputes scoped to the specific milestone in question. A full contract lifecycle (proposal → contract → delivery → review), in-app messaging, skill verification, an admin panel, and AI-assisted tooling round out the platform.

It supports both marketplace models:

- **Custom jobs** — clients post a job, freelancers submit proposals (Upwork-style).
- **Gigs** — freelancers publish pre-packaged service offerings clients can buy directly (Fiverr-style).

> **Business model:** commission-based. A configurable platform fee is deducted from the freelancer's payout when escrow is released.

---

## Table of Contents

- [Architecture](#architecture)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running the Apps](#running-the-apps)
- [Seeding Demo Data](#seeding-demo-data)
- [Available Scripts](#available-scripts)
- [Mobile App](#mobile-app)
- [Documentation](#documentation)

---

## Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients — one Front-end/src/ codebase, three build targets"]
        SRC["React 19 + Vite source"]
        SRC -->|"vite build<br/>(default)"| WEB["Web SPA<br/>(browser, Vercel)"]
        SRC -->|"vite build --mode mobile<br/>→ Capacitor sync"| CAP1["Capacitor<br/>(native WebView bridge)"]
        SRC -->|"vite build --mode admin<br/>→ Capacitor sync"| CAP2["Capacitor<br/>(native WebView bridge)"]
        CAP1 --> AND["Android App<br/>(client + freelancer + admin-panel)"]
        CAP2 --> ADMINAND["Admin Android App<br/>(admin panel only)"]
    end

    subgraph Backend["Backend — Express REST API"]
        API["/api/v1/* + /api/v1/admin-panel/*<br/>JWT auth + RBAC"]
    end

    WEB -->|HTTPS / REST| API
    AND -->|"HTTPS / REST<br/>(fixed origin https://localhost)"| API
    ADMINAND -->|"HTTPS / REST<br/>(fixed origin https://localhost)"| API

    API --> MONGO[("MongoDB<br/>source of truth")]

    subgraph External["External Services"]
        SUPA["Supabase<br/>(social OAuth only —<br/>no marketplace data)"]
        STRIPE["Stripe<br/>(wallet top-ups,<br/>gig deposits/payouts)"]
        AI["AI Provider Router<br/>Gemini → DeepSeek → Qwen →<br/>Groq → Claude → Ollama"]
        EMAIL["Email Provider Router<br/>SMTP / Gmail API"]
        CLOUD["Cloudinary<br/>(uploads)"]
        FIRE["Firebase<br/>(push notifications)"]
    end

    API --> SUPA
    API --> STRIPE
    API --> AI
    API --> EMAIL
    API --> CLOUD
    API --> FIRE
```

- **Capacitor** is a build-time wrapper, not a separate app: the exact same `Front-end/src/` React code is compiled once per target (`vite build`, `vite build --mode mobile`, `vite build --mode admin`) and the mobile/admin outputs are synced (`npx cap sync`) into two independent native Android projects (`Front-end/android/`, `Front-end/android-admin/`), each launching its own WebView pointed at that bundle. Neither native app is a rewrite or a fork of the web UI — same components, same API client, just gated by `VITE_APP_TARGET` (`isMobileApp()`/`isAdminApp()` in `platform.js`) to show a different route subset. See [Mobile App](#mobile-app) below and [Front-end README → Mobile App](Front-end/README.md#mobile-app-android--capacitor) for the full build/signing/platform-integration detail.
- **MongoDB** is the system of record for all marketplace data.
- **Supabase** provides optional social OAuth only; email/OTP auth is handled by the backend directly, and Supabase never holds marketplace data.
- **Stripe** powers wallet top-ups and the legacy deposit/final escrow flow (now used only by Gig orders), and can be fully bypassed with simulated payments via `STRIPE_DUMMY=true` for local development. Fixed-price jobs (100%-lock, milestone-based) and hourly contracts (wallet-lock, billed per logged hour) are both **wallet-native** — funded from the client's internal wallet balance directly, no Stripe Checkout involved.
- **AI features** (Buddy assistant, cost estimator, skill matching, CV analysis) route through a provider chain with automatic fallback across **Gemini, DeepSeek, Qwen, Groq, Claude, and Ollama** (local). Gemini and DeepSeek implement the full AI method set; the rest cover the core 6. The order is configurable via numbered env priorities (`AI_PRIORITY_*`, 0 = first). If every provider is down or rate-limited the API returns a clean `503` and the UI shows an "AI is temporarily out of service" notice instead of crashing.
- **Email** (OTP, transactional alerts) routes through the same provider-chain pattern — SMTP (Nodemailer) or Gmail API, selected via `EMAIL_PROVIDER`, falling back to SMTP if Gmail OAuth isn't configured.
- **Cloudinary** stores uploaded media (avatars, attachments, CVs); **Firebase** delivers push notifications to the native Android apps.
- **Redis** is wired at boot (optional — the app runs fine without it) for future caching; nothing in the codebase reads from it yet beyond the connection itself.

## Screenshots

A visual tour of SkillKart's web app and mobile app across every audience — public visitors, clients, freelancers, and admins.

### Website

#### Public

<table>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/01-public-home.png" width="380" alt="Public Home Page"><br><sub><i>The SkillKart marketing landing page for logged-out visitors.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/02-public-browse-gigs.png" width="380" alt="Browse Gigs"><br><sub><i>Public listing of pre-packaged freelancer gigs, filterable by category.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/03-public-gig-detail.png" width="380" alt="Gig Detail Page"><br><sub><i>A single gig listing showing pricing tiers, description, and the freelancer offering it.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/04-public-browse-projects.png" width="380" alt="Browse Jobs / Projects"><br><sub><i>Public listing of open custom jobs that clients have posted.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/05-public-job-detail.png" width="380" alt="Job Detail Page (Public)"><br><sub><i>Public view of a job posting, showing budget, description, and client info.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/06-public-freelancer-profile.png" width="380" alt="Public Freelancer Profile"><br><sub><i>A freelancer's public profile page with bio, skills, and portfolio.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/07-public-category-page.png" width="380" alt="Category Page"><br><sub><i>A skill/category landing page (Web Development) with related stats and talent.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/08-public-login.png" width="380" alt="Login Page"><br><sub><i>The shared login form for clients and freelancers.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/09-public-register.png" width="380" alt="Registration Page"><br><sub><i>The sign-up form for new clients or freelancers.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/10-public-about.png" width="380" alt="About Page"><br><sub><i>The About / how-SkillKart-works marketing page.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/11-public-ai-buddy.png" width="380" alt="AI Buddy Assistant"><br><sub><i>The public AI Buddy chat assistant page for general marketplace questions.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/12-public-cost-estimator.png" width="380" alt="AI Cost Estimator"><br><sub><i>The public AI-powered project cost estimator tool.</i></sub></td>
</tr>
</table>

#### Client

<table>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/13-client-dashboard.png" width="380" alt="Client Dashboard"><br><sub><i>The client's home dashboard overview after logging in.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/14-client-post-job-form.png" width="380" alt="Post a Job Form"><br><sub><i>The multi-step "post a project" form, filled out (not submitted) for a realistic look.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/15-client-projects-list.png" width="380" alt="My Jobs / Active Contracts"><br><sub><i>The client's jobs list, filtered to in-progress projects — shows escrow milestone status inline per contract.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/16-client-review-proposals.png" width="380" alt="Review Proposals"><br><sub><i>A job posting's received proposals, ready for the client to review and accept.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/17-client-messages.png" width="380" alt="Client Messages"><br><sub><i>The client's chat inbox with freelancers they're working with.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/18-client-wallet.png" width="380" alt="Client Wallet"><br><sub><i>The client's wallet/billing page showing balance and escrow-related transactions.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/19-client-profile.png" width="380" alt="Client Profile"><br><sub><i>The client's profile/settings page.</i></sub></td>
</tr>
</table>

#### Freelancer

<table>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/20-freelancer-dashboard.png" width="380" alt="Freelancer Dashboard"><br><sub><i>The freelancer's home dashboard overview after logging in.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/21-freelancer-browse-jobs.png" width="380" alt="Browse Jobs (as Freelancer)"><br><sub><i>The open-jobs listing as seen by a logged-in freelancer.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/22-freelancer-submit-proposal-form.png" width="380" alt="Submit a Proposal"><br><sub><i>A job detail page with the "Submit Proposal" form filled out (not submitted).</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/23-freelancer-gigs-list.png" width="380" alt="My Gigs"><br><sub><i>The freelancer's list of published gigs.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/24-freelancer-create-gig-form.png" width="380" alt="Create a Gig Form"><br><sub><i>The "create a new gig" form, filled out (not submitted) for a realistic look.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/25-freelancer-contracts-work.png" width="380" alt="Active Contracts / Milestones"><br><sub><i>The freelancer's active contracts and gig orders, with delivery and milestone controls.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/26-freelancer-messages.png" width="380" alt="Freelancer Messages"><br><sub><i>The freelancer's chat inbox with clients.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/27-freelancer-wallet.png" width="380" alt="Freelancer Wallet"><br><sub><i>The freelancer's wallet/earnings page.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/28-freelancer-profile.png" width="380" alt="Freelancer Profile"><br><sub><i>The freelancer's own profile/portfolio settings page.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/29-freelancer-portfolio.png" width="380" alt="Freelancer Portfolio"><br><sub><i>The freelancer's portfolio management page.</i></sub></td>
</tr>
</table>

#### Admin Panel

<table>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/web/30-admin-login.png" width="380" alt="Admin Panel Login"><br><sub><i>The isolated admin panel login screen (credentials step).</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/web/31-admin-login-otp-step.png" width="380" alt="Admin Panel OTP Step"><br><sub><i>After credentials are accepted, the admin panel requires a one-time code emailed to the admin address (2FA) before granting access.</i></sub></td>
</tr>
</table>

### Mobile App

These are captured by rendering the same React codebase in a mobile-viewport browser session — the same code the Capacitor Android app wraps — not from a physical device or emulator.

#### Public / Auth

<table>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/01-login.png" width="380" alt="Login"><br><sub><i>Mobile login screen with email/password form and social login options.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/02-registration.png" width="380" alt="Registration"><br><sub><i>Mobile sign-up screen for choosing a client or freelancer account and joining SkillKart.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/03-forgot-password.png" width="380" alt="Forgot Password"><br><sub><i>Password reset request screen.</i></sub></td>
</tr>
</table>

#### Client

<table>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/04-client-dashboard.png" width="380" alt="Client Dashboard"><br><sub><i>Client home screen with an overview of active projects, spend, and quick actions.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/05-client-browse-projects.png" width="380" alt="Browse Projects (Client)"><br><sub><i>Client-side browse view of posted jobs/projects.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/06-client-job-detail.png" width="380" alt="Job Detail (Client)"><br><sub><i>Job detail screen showing a posted project's brief and received proposals.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/07-client-browse-gigs.png" width="380" alt="Browse Gigs"><br><sub><i>Marketplace gig listing screen with freelancer-packaged offerings.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/08-client-gig-detail.png" width="380" alt="Gig Detail"><br><sub><i>Gig detail screen showing package pricing and the order CTA.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/09-client-browse-freelancers.png" width="380" alt="Browse Freelancers"><br><sub><i>Freelancer directory/browse screen.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/10-client-my-projects.png" width="380" alt="My Projects"><br><sub><i>Client's list of posted projects and their current status.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/11-client-wallet.png" width="380" alt="Client Wallet"><br><sub><i>Client wallet screen showing balance and top-up/payment history.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/12-client-messages.png" width="380" alt="Messages (Client)"><br><sub><i>Client's chat/messages inbox.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/13-client-profile.png" width="380" alt="Client Profile"><br><sub><i>Client profile/settings screen.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/14-client-saved-freelancers.png" width="380" alt="Saved Freelancers"><br><sub><i>Client's bookmarked/saved freelancers list.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/15-client-notifications.png" width="380" alt="Notifications (Client)"><br><sub><i>Client notifications screen.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/16-client-nav-drawer.png" width="380" alt="Navigation Drawer (Client)"><br><sub><i>Client-side navigation drawer/menu showing available sections.</i></sub></td>
</tr>
</table>

#### Freelancer

<table>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/17-freelancer-dashboard.png" width="380" alt="Freelancer Dashboard"><br><sub><i>Freelancer home screen with active contracts, earnings, and quick actions.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/18-freelancer-browse-projects.png" width="380" alt="Browse Projects (Freelancer)"><br><sub><i>Freelancer-side browse view of open jobs to apply to.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/19-freelancer-job-detail.png" width="380" alt="Job Detail (Freelancer)"><br><sub><i>Job detail screen as seen by a freelancer, with an apply/proposal entry point.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/21-freelancer-my-gigs.png" width="380" alt="My Gigs"><br><sub><i>Freelancer's list of published gigs/packages.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/22-freelancer-active-work.png" width="380" alt="Active Work"><br><sub><i>Freelancer's active contracts/milestones in progress.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/23-freelancer-wallet.png" width="380" alt="Freelancer Wallet"><br><sub><i>Freelancer wallet/earnings screen showing balance and withdrawal options.</i></sub></td>
</tr>
<tr>
<td width="33%" align="center"><img src="docs/screenshots/mobile/24-freelancer-messages.png" width="380" alt="Messages (Freelancer)"><br><sub><i>Freelancer's chat/messages inbox.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/25-freelancer-profile.png" width="380" alt="Freelancer Profile"><br><sub><i>Freelancer profile/portfolio screen.</i></sub></td>
<td width="33%" align="center"><img src="docs/screenshots/mobile/26-freelancer-nav-drawer.png" width="380" alt="Navigation Drawer (Freelancer)"><br><sub><i>Freelancer-side navigation drawer/menu showing available sections.</i></sub></td>
</tr>
</table>

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 19, Vite 7, React Router 7, React Hook Form, Framer Motion, GSAP, Chart.js, Tailwind v4, Axios |
| Backend   | Node.js (≥22.3), Express 4, Mongoose 8, JWT, Helmet, express-rate-limit, express-validator |
| Database  | MongoDB (Atlas or local) |
| Cache     | Redis (`ioredis`) — optional, connected at boot, not yet used for anything live |
| Auth      | JWT (access + refresh) with RBAC; Supabase OAuth (optional) |
| Payments  | Stripe (with dummy/simulated mode) |
| Realtime-ish | Polling-based in-app messaging |
| AI        | Provider router with env-ordered fallback — Gemini / DeepSeek / Qwen / Groq / Claude / Ollama (local) |
| Tooling   | ESLint, Prettier, Nodemon, Swagger (API docs) |
| Mobile    | Capacitor (Android) — two native wrappers of the same React codebase: the main client/freelancer/admin-panel app, and a separate standalone Admin app; Firebase Cloud Messaging for push |

## Repository Layout

```
.
├── Apk/                # Pre-built release APKs (main app + standalone Admin app)
├── Backend/            # Express REST API (see Backend/README.md)
│   ├── scripts/        operational scripts (demo seeder, superadmin setup, migrations)
│   └── src/
│       ├── config/         app configuration
│       ├── controllers/    request handlers
│       ├── middleware/      auth, RBAC, validation, error handling
│       ├── models/          Mongoose schemas (source of truth)
│       ├── routes/          API route definitions (/api/v1)
│       ├── services/        business logic (payments, skill matching, AI, ...)
│       ├── validators/      express-validator schemas
│       ├── webhooks/        Stripe / external webhooks
│       ├── scripts/         seedSkillGraph.js (taxonomy graph seed)
│       ├── app.js           Express app wiring
│       └── server.js        HTTP bootstrap
├── Front-end/          # React + Vite SPA (see Front-end/README.md)
│   ├── android/         Native Android project (Capacitor) — main client/freelancer/admin-panel app
│   ├── android-admin/   Native Android project (Capacitor) — separate standalone Admin app
│   ├── capacitor.config.json         Capacitor config for the main app
│   ├── capacitor.admin.config.json   Capacitor config for the standalone Admin app
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

- **Node.js ≥ 22.3** and **npm ≥ 9**
- **MongoDB** — a connection string (local `mongodb://localhost:27017/...` or MongoDB Atlas)
- *(Optional)* Stripe test keys — or leave `STRIPE_DUMMY=true` to simulate payments
- *(Optional)* Supabase project — for social OAuth
- *(Optional)* An AI provider key (Gemini / DeepSeek / Groq / Anthropic) — for AI features

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
| `EMAIL_PROVIDER` | `smtp` (default) or `gmail` — see [Backend README → Email](Backend/README.md#email) |
| `SMTP_*` / `GOOGLE_*` | Credentials for the selected email provider (OTP, alerts) |
| `REDIS_HOST` / `PORT` / `PASSWORD` / `DB` | Optional Redis connection — wired at boot for future caching, not yet used for anything live |
| `CORS_ORIGIN`, `FRONTEND_URL` | Allowed origins (CSV) |
| `PUBLIC_SITE_URL` | Canonical public origin for the sitemap/SEO |
| `RECAPTCHA_SECRET_KEY` | Optional reCAPTCHA v3 secret; blank = disabled |
| `FIREBASE_SERVICE_ACCOUNT_PATH` / `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional — mobile app push notifications; see [Backend README → Push Notifications](Backend/README.md#push-notifications) |
| `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` / `QWEN_API_KEY` / `GROQ_API_KEY` / `ANTHROPIC_API_KEY` | AI provider keys |
| `AI_PRIORITY_*` | Fallback order (numbered, 0 = first; `-1` disables a provider) |
| `SUPABASE_*` | Optional OAuth |

**Frontend** (`Front-end/.env`) — reference in [`Front-end/.env.example`](Front-end/.env.example):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api/v1`) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional Supabase client |
| `VITE_RECAPTCHA_SITE_KEY` | Optional reCAPTCHA v3 public site key; blank = disabled |
| `VITE_ENVIRONMENT` | `production` forces console silence in a dev-mode build |

> `VITE_`-prefixed vars ship in the client bundle and are publicly readable — never
> put a secret in one.

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

The seeder builds real `Milestone` documents for fixed-price contracts (with correctly-linked, per-milestone `Payment` rows) and a real wallet-lock `Payment` for hourly contracts — matching the live wallet-native escrow model exactly, not the legacy Stripe deposit/final split. Gig orders are still seeded as listings only (no order/purchase lifecycle yet).

**Demo accounts** (password `Pass123!@#`):

| Account | Role |
|---------|------|
| `test.freelancer0@skillkart.com` | Top-rated freelancer (~41 completed) |
| `test.freelancer1@skillkart.com` | Mid-level freelancer |
| `test.client0@skillkart.com` | SME client (many hires) |
| `test.client1@skillkart.com` | Startup client |

All other seeded users share the password `Demo123!@#`.

**Admin dashboard** — the admin panel has its own isolated login at **`/admin-panel/login`** (e.g. `http://localhost:3001/admin-panel/login`).

Admin credentials are **not shipped** — set your own in `Backend/.env`:

```bash
# 1. Pick an admin email
ADMIN_EMAIL=admin@yourdomain.com

# 2. Generate a bcrypt hash of your chosen password and put it in ADMIN_PASSWORD_HASH
node -e "console.log(require('bcryptjs').hashSync('YourStrongPassword', 12))"
# → ADMIN_PASSWORD_HASH=<the hash it prints>
```

> The admin password is stored only as a **bcrypt hash** (`ADMIN_PASSWORD_HASH`), never in plaintext. Use a strong, unique password.

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
| `npm run migrate:hourly-escrow` | One-time idempotent backfill that locks escrow for existing hourly contracts (dry run by default; `-- --apply` to write) |
| `npm run migrate:skill-verification` | One-time idempotent backfill that reconciles skill `isVerified` flags with verification records (dry run by default; `-- --apply` to write) |
| `npm run lint` / `npm run format` | Lint / format source |

**Frontend** (`cd Front-end`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3001) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint source |

## Mobile App

Two native Android apps ship from the same Front-end codebase via
[Capacitor](https://capacitorjs.com/) — neither is a separate rewrite.

- **Main app** (`Front-end/android/`) covers the client, freelancer, and
  admin-panel experiences (auth flow + dashboards); public marketing pages
  aren't part of the mobile build. Includes push notifications (Firebase
  Cloud Messaging), native back-button/status-bar/offline handling, and an
  external-browser fallback for outbound links.

  ```bash
  cd Front-end
  npm run cap:android   # builds, syncs, and opens the project in Android Studio
  ```

- **Admin app** (`Front-end/android-admin/`, appId `com.skillkart.admin`,
  app name "SkillKart Admin") is a separate standalone native build that
  mounts only the admin panel (`AdminAppRoutes.jsx`) — none of the rest of
  the marketplace code is bundled. It's built from its own env file
  (`Front-end/.env.admin` / `.env.admintest`) via `npm run build:admin`, and
  driven by `Front-end/scripts/cap-admin.cjs`, which temporarily swaps
  `capacitor.admin.config.json` in for `capacitor.config.json` before
  running the real `cap` command — Capacitor's CLI has no `--config` flag,
  so this is the only way to point `cap add/sync/open` at the
  `android-admin/` native project instead of the main one.

  ```bash
  cd Front-end
  npm run cap:admin:add    # first time only: adds the android-admin native project
  npm run cap:admin        # builds (admin mode) + syncs android-admin
  npm run cap:admin:open   # opens android-admin in Android Studio
  ```

Both apps talk to the same backend — admin auth/API is already namespaced
under `/api/v1/admin-panel/*`, so no separate deployment is needed — and share
the same push-notification, native back-button, and WebView-origin handling.

Full setup, environment variables, and platform-specific behavior:
[Front-end README → Mobile App](Front-end/README.md#mobile-app-android--capacitor).
Push notification server-side setup: [Backend README → Push Notifications](Backend/README.md#push-notifications).

## Documentation

- [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) — comprehensive platform guide (features, roles, lifecycle) for non-developers and developers alike.
- [`docs/PROFESSOR_EXPLANATION_ROMAN_URDU.md`](docs/PROFESSOR_EXPLANATION_ROMAN_URDU.md) — Roman Urdu walkthrough of the whole project (flow, architecture, business logic) for explaining it to a supervisor/viva.
- [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) — end-to-end user flows and business-logic blueprint.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — step-by-step production deployment (backend → Railway/Render, frontend → Vercel).
- [`docs/FYP_Final_Report.md`](docs/FYP_Final_Report.md) — Final Year Project report (submission-ready university document).
- [`docs/FYP_Presentation.md`](docs/FYP_Presentation.md) — FYP defense presentation outline (slide-by-slide, 3 presenters).
- **API reference** — Swagger UI at `http://localhost:5000/api/v1/docs` when the backend is running.

---

<sub>Built by the SkillKart team.</sub>
