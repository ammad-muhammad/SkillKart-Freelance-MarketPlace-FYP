# SkillKart — Final Year Project Defense Presentation

**An AI-Powered Freelance Marketplace Platform**

> **Slide-by-slide outline for the FYP defense.** Target duration: **20–25 minutes**.
> Group of **3 students**. Each slide lists its content, key discussion points, the assigned presenter, and screenshot placeholders where relevant.

---

## Presenter Assignment Summary

| Presenter | Sections | Est. Time |
|-----------|----------|-----------|
| **Student 1** | Title, Introduction, Motivation, Problem Statement, Objectives, Scope, Existing System Analysis, Proposed System | ~7 min |
| **Student 2** | System Architecture, Frontend & Backend Architecture, Database Design, Technologies, Authentication & Security, AI Integration, Major Features/Modules, Mobile Application | ~10 min |
| **Student 3** | Marketplace Workflow, User Roles, Live Demo, Admin Panel, Testing, Results, Performance, Challenges, Future Work, Conclusion, Q&A | ~8 min |

> **Tip for slide design:** keep on-slide text to 4–6 bullet points. The detailed prose below is *speaker notes*, not slide text. Use the "Screenshot" placeholders to insert real captures from the running app.

---

## SLIDE 1 — Title Slide
**Presenter: Student 1**

**Content (on slide):**
- **SkillKart** — An AI-Powered Freelance Marketplace Platform
- Bachelor of Science in Computer Science (BSCS) — Final Year Project
- Group Members: *[Student 1], [Student 2], [Student 3]*
- Supervisor: *[Supervisor Name]*
- *[University Name] — [Department] — [Session]*

**Speaker notes:** Good [morning/afternoon], respected panel. We are presenting **SkillKart**, an AI-powered freelance marketplace we built end-to-end on the MERN stack. Over the next ~22 minutes we'll take you through the problem, our solution, the architecture, a live demo, and our results.

<table>
<tr>
<td width="100%" align="center"><img src="screenshots/web/01-public-home.png" width="600" alt="Public Home Page"><br><sub><i>The SkillKart marketing landing page for logged-out visitors, showing the logo and hero section.</i></sub></td>
</tr>
</table>

---

## SLIDE 2 — Presentation Agenda
**Presenter: Student 1**

**Content:**
- Introduction & Motivation
- Problem Statement & Objectives
- Existing Systems vs. Our Solution
- System & Database Architecture
- Technologies & AI Integration
- Live Demonstration
- Testing, Results & Future Work

**Key discussion points:** Set expectations — three of us will present, split by problem/solution, architecture/tech, and demo/results.

---

## SLIDE 3 — Project Introduction
**Presenter: Student 1**

**Content:**
- SkillKart is a **dual-sided digital marketplace** connecting **clients** who need work with **freelancers** who deliver it.
- Supports **two models**: custom **Jobs + Proposals** (Upwork-style) and pre-packaged **Gigs** (Fiverr-style).
- Adds an **AI layer**, a secure **escrow payment** flow, and a full-featured **admin panel**.
- Built on the **MERN stack** (MongoDB, Express, React, Node.js).

**Speaker notes:** SkillKart is not just a job board. It manages the *entire* engagement lifecycle — from discovery, to proposal, to a contract held in escrow, to delivery, review, and dispute resolution — with AI assisting at each step and administrators overseeing the whole platform.

<table>
<tr>
<td width="100%" align="center"><img src="screenshots/web/01-public-home.png" width="600" alt="Public Home Page"><br><sub><i>The SkillKart home page — hero section plus category/skill browsing entry points into Jobs, Gigs, and Freelancer discovery.</i></sub></td>
</tr>
</table>

---

## SLIDE 4 — Motivation
**Presenter: Student 1**

**Content:**
- Freelancing is a fast-growing part of the digital economy, especially for students and graduates.
- Existing platforms have **high fees**, **weak discovery**, and **little intelligent assistance**.
- New freelancers struggle to write proposals, price work, and get discovered.
- We wanted to build a platform that is **secure, intelligent, and beginner-friendly**.

**Key discussion points:** Our motivation was personal — as students entering the freelance market, we saw first-hand how hard onboarding and discovery are. AI can meaningfully lower that barrier.

---

## SLIDE 5 — Problem Statement
**Presenter: Student 1**

**Content:**
- **Freelancer discovery** is difficult — good talent is buried; taxonomy/search is weak.
- **No intelligent assistance** — users write proposals, price projects, and validate skills manually.
- **Payment risk** — freelancers fear non-payment; clients fear paying for poor work.
- **Weak verification** — fake profiles and unverified skills reduce trust.
- **Fragmented management** — contracts, disputes, and moderation are scattered or absent.

**Speaker notes:** These are five concrete pain points we designed directly against. Each maps to a feature we'll show: deterministic matchmaking (discovery), the Buddy assistant + AI tools (assistance), escrow (payment risk), skill tests + identity verification (trust), and a unified contract + dispute + admin system (management).

---

## SLIDE 6 — Objectives
**Presenter: Student 1**

**Content:**
1. Build a full-featured, dual-sided freelance marketplace (Jobs & Gigs).
2. Integrate **AI** for proposal drafting, cost estimation, and skill validation, plus a deterministic (rules-based, non-LLM) matchmaking engine for discovery.
3. Implement a **secure escrow payment** workflow with wallets and withdrawals.
4. Provide **multi-factor verification** — OTP, skill tests, and an admin-managed identity checklist.
5. Deliver a comprehensive **admin panel** for moderation and analytics.
6. Enforce **strong security** (JWT + RBAC, hashing, rate limiting, audit logs).

**Key discussion points:** Each objective is measurable and, as we'll show in Results, each was achieved and demonstrated in the live system.

---

## SLIDE 7 — Project Scope
**Presenter: Student 1**

**Content:**
- **In scope:** registration/onboarding, profiles, jobs, gigs, proposals, contracts, escrow payments, wallets, withdrawals, messaging, reviews, disputes, AI tools, admin panel, analytics.
- **User roles:** Guest, Freelancer, Client, Admin, SuperAdmin.
- **Out of scope (this phase):** live video calls, real-time WebSocket chat (we use efficient polling), an iOS build (Android ships this phase).

**Speaker notes:** We deliberately scoped a *complete web platform* rather than a thin prototype. What's out of scope is documented as future work, not gaps in the core lifecycle.

---

## SLIDE 8 — Existing System Analysis
**Presenter: Student 1**

**Content — comparison table:**

| Aspect | Fiverr | Upwork | Freelancer.com | **SkillKart** |
|--------|--------|--------|----------------|---------------|
| Model | Gigs | Jobs/Proposals | Both | **Both** |
| AI assistance | Limited | Limited | Minimal | **Built-in (Buddy, proposals, pricing) + deterministic matching** |
| Skill verification | Basic | Tests (paid) | Basic | **AI skill tests with camera-based anti-cheat proctoring + admin-managed identity checklist** |
| Fees | ~20% | ~10% + | ~10% | **Configurable, transparent** |
| Escrow | Yes | Yes | Yes | **Yes + wallet + admin oversight** |

**Speaker notes:** The incumbents are mature but generic. Our differentiator is the *integrated AI layer* and *transparent, admin-supervised* payment and verification — designed for the student/graduate segment.

---

## SLIDE 9 — Proposed System
**Presenter: Student 1**

**Content:**
- A unified platform combining the best of Fiverr (Gigs) and Upwork (Jobs).
- **AI-first**: an assistant + AI tools reduce friction for new freelancers.
- **Trust-first**: escrow, multi-step verification, reviews, and dispute resolution.
- **Admin-supervised**: a dedicated, isolated admin panel for full oversight.

**Key discussion points:** Hand off to Student 2 — "Now [Student 2] will explain how we engineered this."

<table>
<tr>
<td width="50%" align="center"><img src="screenshots/web/07-public-category-page.png" width="380" alt="Category Page"><br><sub><i>A skill/category landing page (Web Development) with related stats and talent — the freelancer-discovery side.</i></sub></td>
<td width="50%" align="center"><img src="screenshots/web/04-public-browse-projects.png" width="380" alt="Browse Jobs / Projects"><br><sub><i>Public listing of open custom jobs that clients have posted — the project-discovery side.</i></sub></td>
</tr>
</table>

---

## SLIDE 10 — System Architecture (Overview)
**Presenter: Student 2**

**Content — architecture diagram:**
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

**Speaker notes:** SkillKart is a **decoupled** system: a React single-page app talks to a stateless Express REST API over `/api/v1`. MongoDB is the single source of truth. Escrow is primarily **wallet-native** — per-milestone locks for fixed-price work and a balance-lock for hourly work — with Stripe used for wallet top-ups, freelancer payouts, and the separate Gig-order deposit flow. These integrations, plus an AI provider chain and optional Supabase OAuth, are isolated behind service modules, so the core is never coupled to any one vendor.

---

## SLIDE 11 — Frontend Architecture
**Presenter: Student 2**

**Content:**
- **React 19 + Vite 7** SPA; routing via **React Router 7** (`BrowserRouter`).
- State via **React Context** (Auth, Client, Freelancer, Notifications) + local state.
- Axios API layer with a **central interceptor** (token refresh, error toasts, request de-dup).
- **Role-based route guards** (`ProtectedRoute`) redirect by role.
- UI: custom CSS + Tailwind v4, **Framer Motion / GSAP** animation, **Chart.js** dashboards, **lucide-react** icons.

**Key discussion points:** ~128 components/pages organized by audience: `public/`, `client/`, `freelancer/`, `admin/`, `adminPanel/`. The Axios interceptor is a good example of centralized concerns — one place handles auth refresh, error surfacing, and duplicate-request suppression.

<table>
<tr>
<td width="100%" align="center"><img src="screenshots/web/20-freelancer-dashboard.png" width="600" alt="Freelancer Dashboard"><br><sub><i>The freelancer's home dashboard overview after logging in.</i></sub></td>
</tr>
</table>

---

## SLIDE 12 — Backend Architecture
**Presenter: Student 2**

**Content:**
- **Express 4** with a layered structure: **routes → middleware → controllers → services → models**.
- **23 route modules**, **24 controllers**, **27 service modules**, **39 Mongoose models**.
- **Middleware chain**: authentication, RBAC, request validation, rate limiting, sanitization, error handling.
- Cross-cutting: structured logging (Winston), Swagger API docs, scheduled cron jobs (billing, cleanup).

**Speaker notes:** The backend is strictly layered. Controllers stay thin — they validate and delegate. Business logic lives in services (`stripe.service`, `matchmaking.service`, `skillMatching.service`, `notification.service`, etc.), which keeps it testable and reusable. Around 28,000 lines of backend code.

<table>
<tr>
<td width="100%" align="center"><img src="screenshots/web/32-swagger-api-docs.png" width="600" alt="Swagger API Documentation"><br><sub><i>Live, interactive API documentation generated at /api/v1/docs, covering every route group (auth, admin, jobs, gigs, contracts, payments, and more).</i></sub></td>
</tr>
</table>

---

## SLIDE 13 — Database Design (Overview)
**Presenter: Student 2**

**Content:**
- **MongoDB** with **Mongoose** — 39 collections, referenced relationships (ObjectId refs), indexed for query performance.
- Core entities and their links:
```mermaid
erDiagram
    USER {
        string role "client, freelancer, admin, superadmin"
        string email
    }
    CONTRACT {
        string type "fixed, hourly"
        string status "active, delivered, completed, cancelled"
    }
    MILESTONE {
        number order
        number amount
        string status "pending_funding, funded, submitted, released"
    }
    PAYMENT {
        string type "job_escrow, hourly_escrow, hourly_invoice, wallet_deposit"
        string status "deposit_pending, deposit_paid, released, refunded"
    }
    USER ||--o| FREELANCER_PROFILE : has
    USER ||--o| CLIENT_PROFILE : has
    CLIENT_PROFILE ||--o{ JOB : posts
    JOB ||--o{ PROPOSAL : receives
    FREELANCER_PROFILE ||--o{ PROPOSAL : submits
    FREELANCER_PROFILE ||--o{ GIG : publishes
    PROPOSAL ||--o| CONTRACT : accepted_becomes
    JOB ||--o| CONTRACT : spawns
    CONTRACT ||--o{ MILESTONE : funds
    MILESTONE ||--o| PAYMENT : linked_escrow
    CONTRACT ||--o{ PAYMENT : hourly_lock_invoice
    CONTRACT ||--o{ DELIVERY : submitted_work
    CONTRACT ||--o{ REVIEW : mutual_rating
    USER ||--o{ WITHDRAWAL : requests
```

**Key discussion points:** Everything is interconnected — a job owns proposals; the accepted proposal spawns a contract; the contract drives payment, deliveries, chat, reviews, and (if needed) disputes. Referential integrity is enforced in the application layer. (Note: disputes are tracked in their own sub-document — per-milestone for fixed-price contracts, per-contract for hourly — rather than as a literal `Contract.status` value, which is why "disputed" isn't listed as a status enum above.)

---

## SLIDE 14 — Database Design (Key Collections)
**Presenter: Student 2**

**Content:**
- **User** — identity, role (superadmin/admin/freelancer/client/publicviewer), auth provider, verification flags.
- **Contract** — the lifecycle engine: `status` state machine (active → delivered → completed / cancelled / disputed), timer, `milestoneMode` (fixed-price), dispute sub-document (hourly).
- **Milestone** — (fixed-price) one funded phase: `order`, `amount`, `status` (pending_funding → funded → submitted → released), own dispute sub-document.
- **Payment** — escrow: `type` (job_escrow / wallet_deposit / hourly_escrow / hourly_invoice), `milestoneId` link, `status` (deposit_pending → deposit_paid → released / refunded), platform fee + payout split.
- **Gig / Job / Proposal / Review / Withdrawal / Testimonial** — marketplace records.
- **Admin-side:** AdminAuditLog, Report, PlatformSettings, ApiLog, ErrorLog.

**Speaker notes:** The **Contract**, **Milestone**, and **Payment** models are the heart of the system — all modeled as explicit state machines with enums, which is what makes the escrow flow safe and auditable even when a fixed-price project is split into several independently-funded phases.

---

## SLIDE 15 — Technologies Used
**Presenter: Student 2**

**Content — technology stack:**

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, Vite 7, React Router 7, React Hook Form, Framer Motion, GSAP, Chart.js, Tailwind v4, Axios |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB (Atlas) |
| Auth | JWT (access + refresh), bcrypt, OTP; optional Supabase OAuth |
| Payments | Stripe (Connect payouts, wallet top-ups, dummy/simulated mode for dev) |
| AI | Provider router — Gemini, DeepSeek, Qwen, Groq, Claude, Ollama |
| Email | Provider abstraction — **Google Gmail API** (production) / SMTP via Nodemailer (local) |
| Security | Helmet, express-rate-limit, express-validator, express-mongo-sanitize, **Google reCAPTCHA v3** |
| SEO / PWA | Dynamic XML sitemap, robots.txt, Web App Manifest, Open Graph cards |
| Tooling | ESLint, Prettier, Nodemon, Swagger, Winston |

**Key discussion points:** Every choice was deliberate — Vite for fast builds, Mongoose for schema discipline over MongoDB's flexibility, Stripe for payments with a dummy mode so we can demo without live money.

**Likely question — "Why the Gmail API instead of just SMTP?"** Two reasons. First, practical: our host (Railway) blocks outbound SMTP ports, so SMTP simply cannot deliver in production. Second, architectural: rather than hard-code either one, email sits behind a **provider registry** — `EMAIL_PROVIDER` selects the transport, and adding a future provider (SES, SendGrid) means one new file plus one registry line, with zero changes to controllers or business logic. SMTP remains the automatic fallback.

**Likely question — "Doesn't Supabase already give you Google access?"** No, and this is a common misconception worth stating precisely: Supabase's Google OAuth authenticates *end users*. Sending mail via the Gmail API requires the `gmail.send` scope on a mailbox we own, sending *as the platform* — to recipients who may never have used Google sign-in, at moments when no user session exists at all (e.g. a password-reset OTP). They are different concerns with different credentials, and we deliberately kept the email layer decoupled from authentication entirely.

---

## SLIDE 16 — Authentication & Session Model
**Presenter: Student 2**

**Content:**
- **Email + password** with **bcrypt** hashing (pre-save hook).
- **OTP-based 2FA** for login (email delivery).
- **JWT**: short-lived access token (kept in memory) + refresh token (obfuscated storage) → auto-refresh on reload.
- Optional **Supabase social OAuth** — Google, LinkedIn, and GitHub.
- **RBAC**: 5+ roles; every route guarded by role middleware; a separate, **encrypted SuperAdmin** credential store.

**Speaker notes:** We separated the access token (in memory, short-lived) from the refresh token (persisted, obfuscated) — a defense-in-depth pattern. The admin panel uses a *completely isolated* auth flow so the marketplace JWT never grants admin access.

<table>
<tr>
<td width="100%" align="center"><img src="screenshots/web/08-public-login.png" width="600" alt="Login Page"><br><sub><i>The shared login form for clients and freelancers. (The OTP step itself is a transient, one-time emailed code screen and isn't separately captured here — the same reason the admin panel's OTP step could only be captured up to the code-entry screen, see Slide 25.)</i></sub></td>
</tr>
</table>

---

## SLIDE 17 — Security Features
**Presenter: Student 2**

**Content:**
- **Password hashing** (bcrypt) + **OTP** verification.
- **JWT + RBAC** with strict role separation (marketplace vs. admin).
- **Rate limiting** (global + stricter on auth endpoints).
- **Google reCAPTCHA v3** — invisible, score-based bot mitigation on login, registration, and public forms.
- **Input validation** (express-validator) + **NoSQL-injection sanitization** (express-mongo-sanitize).
- **Helmet** security headers, **CORS** allow-list.
- **Audit logs** for every sensitive admin action; error & API logging.

**Key discussion points:** Security is layered end-to-end: transport (CORS/Helmet), authentication (JWT/OTP), authorization (RBAC), input (validation/sanitization), abuse (rate limiting + reCAPTCHA), and accountability (audit logs).

**Speaker notes — reCAPTCHA v3 specifics, if asked:**
- **Why v3, not v2?** v3 is invisible: no checkbox, no image grid. It returns a **0.0–1.0 score** instead of a pass/fail, which we compare against a configurable threshold (0.5). We chose it because friction at signup directly costs conversions on a student-facing marketplace.
- **Why keep rate limiting too?** They defend different axes: rate limiting bounds request *volume*, reCAPTCHA scores request *legitimacy*. A slow, patient bot defeats rate limiting alone; a determined human defeats reCAPTCHA alone. Layering covers both.
- **Replay protection:** each endpoint declares a distinct *action* name. Google reports a token minted for a *different* action as otherwise valid, so we verify the action explicitly — without that check, a token harvested from the public contact form could be replayed against login.
- **Deliberate trade-off (good defense answer):** verification **fails open** — if Google is unreachable or keys are unset, the request proceeds. We consciously chose availability over security at this one bounded point: a third-party bot-detection outage must never render our own login inoperable. Rate limiting still bounds the residual risk.

---

## SLIDE 18 — AI Integration (Architecture)
**Presenter: Student 2**

**Content:**
- A **provider router** with automatic fallback: **Gemini → DeepSeek → Qwen → Groq → Claude → Ollama (local)**.
- Order is **env-driven** by numbered priorities (`AI_PRIORITY_*`); any provider can be reordered or disabled.
- **Resilient by design:** if every provider fails, the API returns a clean `503` and the UI shows *"AI is temporarily out of service"* — the app **never crashes** on an AI outage.

**Speaker notes:** This is one of our proudest engineering pieces. Free-tier AI providers are unreliable and rate-limited, so we built a chained fallback with a local model as the last resort, and made every AI failure graceful.

```mermaid
flowchart LR
    REQ[AI request] --> GEM[Gemini]
    GEM -->|fail or rate-limited| DS[DeepSeek]
    DS -->|fail| QW[Qwen]
    QW -->|fail| GR[Groq]
    GR -->|fail| CL[Claude]
    CL -->|fail| OL[Ollama - local]
    OL -->|fail| ERR[Clean 503 response]
    GEM -->|success| RES[Response to user]
    DS -->|success| RES
    QW -->|success| RES
    GR -->|success| RES
    CL -->|success| RES
    OL -->|success| RES
```

---

## SLIDE 19 — AI Features
**Presenter: Student 2**

**Content:**
- **Buddy AI Assistant** — conversational help for finding work, hiring, and writing proposals.
- **AI Cost Estimator** — market-rate price estimate from a project brief.
- **AI Proposal Drafting** — generates a tailored proposal for a job.
- **AI Skill Validation & Tests** — validates/normalizes skills, auto-generates verification tests (`generateSkillTest`), and separately **evaluates/scores completed tests** (`evaluateSkillTest`).
- **AI CV Analysis** — parses a freelancer's CV, scores it, and auto-fills the profile.
- **AI Brief & Text Assist** — `suggestBrief` auto-fills a job/gig brief (category + skills) from a short description; `generateText` generates free-text fields (bio, portfolio description, FAQ answers, etc.).
- **AI Taxonomy & Categorization** — `recommendIndustry` (client onboarding), `recommendJobCategory`/`recommendJobSubcategory` (job posting), and `suggestTaxonomyNode` (proposing a new skill-graph node when a freelancer's skill isn't recognized).
- **AI Search Expansion** — `expandSearchSkills` broadens a search query to semantically related skills.
- **Skill-test anti-cheat / proctoring** — camera-based face tracking (`useProctoring.js`, Google MediaPipe Face Landmarker) flags a missing face, a second face, head turns, eyes looking away and body movement, alongside `useAntiCheat.js` detecting tab-switch, window-blur, and fullscreen-exit. The candidate sees every movement counted live; one backend setting (`SKILL_TEST_PROCTOR_STRICTNESS`, 0–1) controls how strict all of it is, and every strike is logged to the backend.
- **Matchmaking** — ranks freelancers for a project brief via a deterministic, rules-based scoring engine (not an LLM call, unlike the features above).

**Key discussion points:** AI is woven through the *whole* experience, not bolted on — onboarding (CV parse, industry recommendation), discovery (matchmaking, search expansion), posting (category/brief suggestion), bidding (proposal draft), pricing (estimator), and trust (skill tests + proctoring). Across the provider router this is **14 distinct LLM-backed capabilities** in total. Matchmaking is the one exception to the LLM-provider pattern: it's deliberately code-driven for instant, reproducible, auditable rankings.

<table>
<tr>
<td width="50%" align="center"><img src="screenshots/web/11-public-ai-buddy.png" width="380" alt="AI Buddy Assistant"><br><sub><i>The public AI Buddy chat assistant page for general marketplace questions.</i></sub></td>
<td width="50%" align="center"><img src="screenshots/web/12-public-cost-estimator.png" width="380" alt="AI Cost Estimator"><br><sub><i>The public AI-powered project cost estimator tool.</i></sub></td>
</tr>
</table>

---

## SLIDE 20 — Major Modules / Features
**Presenter: Student 2**

**Content:**
- **Auth & Onboarding** · **Freelancer & Client Dashboards** · **Jobs & Proposals**
- **Gigs (packaged services)** · **Contracts (lifecycle state machine)**
- **Wallet, Escrow Payments & Withdrawals** · **Messaging** · **Notifications**
- **Reviews & Ratings** · **Search & Categories** · **Disputes**
- **AI Tools** · **Admin Panel & Analytics**
- **Mobile Application** (two native Android apps via Capacitor — see next slide)
- **Content & Taxonomy Management** (versioned CMS content API, skill-graph/taxonomy curation via a dedicated `/admin/taxonomy` surface, newsletter & contact-message capture)
- **Transactional Email** (OTP, security alerts — Gmail API / SMTP, with retry + delivery logging)
- **Discoverability** (dynamic sitemap, robots policy, installable PWA, social share cards)

**Speaker notes:** The last two are the "invisible" modules — nobody clicks them, but without email nobody can even register, and without SEO nobody finds the platform at all. The mobile app is substantial enough that it gets its own slide next. On Content & Taxonomy: the skill-graph/taxonomy curation UI (`TaxonomyAdmin.jsx`) deliberately runs on ordinary marketplace RBAC at `/admin/taxonomy`, not the isolated admin panel — it's a content-editor concern, not an account-security one. The versioned CMS content model is currently backend-only (API + data model exist; no frontend page consumes it yet) — we're being upfront that it's infrastructure ahead of its UI, not a shipped end-user feature.

---

## SLIDE 21 — Mobile Application
**Presenter: Student 2**

**Content:**
- The same React codebase ships as **two independent native Android apps** via **Capacitor** — not a rewrite, not a stub.
- **Client/Freelancer app** (`android/`) — the full client, freelancer, and admin-panel experience; public marketing pages are excluded from the bundle and lazy-loaded on web instead, keeping both lean.
- **Standalone Admin app** (`android-admin/`) — a second, fully separate build (own `appId`, own signing key) that renders only the admin-panel route tree, for admins who need moderation on the go without installing the full app.
- **Native platform integration:** hardware back-button handling, status bar theming, a branded splash/icon, offline detection with a dedicated "No Internet Connection" screen, external links opened via Chrome Custom Tabs, **push notifications** (Firebase Cloud Messaging) wired into the same events (proposals, messages, payments, disputes) that drive the web notification center, and **social OAuth via custom URL-scheme deep link** (`skillkart://auth-callback`), working around the WebView's fixed origin that breaks normal OAuth redirects.

**Speaker notes:** This is a second, fully realized delivery surface built from the exact same codebase — not a thin WebView wrapper. Platform-specific engineering (offline handling, native back navigation, push) is layered on via feature flags, so the web and mobile builds never diverge in business logic. Hand off to Student 3 — "Now [Student 3] will walk you through the workflow and give a live demo."

**Content — build architecture:** one codebase, three build targets, picked at build time by a single env flag.

```mermaid
flowchart TD
    SRC["Front-end/src/ — one React codebase"]
    SRC -->|"vite build (default)"| WEB["dist/ → Vercel web app<br/>VITE_APP_TARGET unset"]
    SRC -->|"vite build --mode mobile"| MOBILE["synced into android/<br/>VITE_APP_TARGET=mobile"]
    SRC -->|"vite build --mode admin"| ADMIN["synced into android-admin/<br/>VITE_APP_TARGET=admin"]
    WEB --> WEBROUTES["AppRoutes.jsx<br/>full public site + dashboards"]
    MOBILE --> MOBILEROUTES["AppRoutes.jsx<br/>public routes skipped,<br/>client/freelancer dashboards only"]
    ADMIN --> ADMINROUTES["AdminAppRoutes.jsx<br/>admin panel only,<br/>zero marketplace code"]
```

<table>
<tr>
<td width="25%" align="center"><img src="screenshots/mobile/01-login.png" width="160" alt="Mobile Login"><br><sub><i>Login</i></sub></td>
<td width="25%" align="center"><img src="screenshots/mobile/17-freelancer-dashboard.png" width="160" alt="Freelancer Dashboard"><br><sub><i>Freelancer Dashboard</i></sub></td>
<td width="25%" align="center"><img src="screenshots/mobile/19-freelancer-job-detail.png" width="160" alt="Job Detail"><br><sub><i>Job Detail (Freelancer)</i></sub></td>
<td width="25%" align="center"><img src="screenshots/mobile/26-freelancer-nav-drawer.png" width="160" alt="Navigation Drawer"><br><sub><i>Navigation Drawer (Freelancer)</i></sub></td>
</tr>
</table>

---

## SLIDE 22 — User Roles
**Presenter: Student 3**

**Content:**
- **PublicViewer (Guest)** — browse freelancers, gigs, and jobs; use public AI tools (limited).
- **Freelancer** — profile, gigs, proposals, contracts, wallet, withdrawals, skill tests.
- **Client** — post jobs, buy gigs, hire, fund escrow, review.
- **ContentEditor** — CMS content management (create/update/publish pages), gated by ordinary RBAC, outside the isolated admin panel.
- **Admin** — moderate users, jobs, payments, disputes; view analytics.
- **SuperAdmin** — full control + encrypted credential store.

**Key discussion points:** Each role sees a tailored dashboard and a strictly guarded route set — a freelancer can never reach client-only or admin routes.

---

## SLIDE 23 — Marketplace Workflow
**Presenter: Student 3**

**Content — end-to-end lifecycle:**
```
Register → Onboard (verify) → Post Job (any wallet balance, even $0) / Publish Gig
   → Freelancer submits Proposal → Client accepts
      (wallet must now cover milestone 1 / one week's hourly estimate)
      OR Client rejects (optionally allows resubmission via allowResubmit)
         → Freelancer revises the proposal → resubmits → back to Client review
   → Contract created → escrow locks:
      fixed-price = milestone 1 funded instantly (later milestones funded one at a time)
      hourly = one week's estimated cost locked (billed automatically as hours are logged)
   → Freelancer delivers/logs time → Client approves (or 7-day auto-release if silent, fixed-price)
   → Escrow released (payout − platform fee) → Both leave Reviews
   → (if needed) Dispute on the milestone/contract → Admin resolves
```

**Speaker notes:** This is the core loop. A client isn't limited to a binary accept/reject — rejecting can explicitly `allowResubmit`, which flips the proposal back to a revisable state (`canResubmit: true`) so the freelancer can improve and resend it rather than starting over with a new proposal. Note the escrow model differs by contract type: wallet balance is never checked at posting — only when a proposal is accepted. For fixed-price jobs, only milestone 1's amount locks instantly; later milestones are funded sequentially as work progresses, and if the client goes quiet after delivery, escrow auto-releases after 7 days rather than trapping the freelancer's payment. For hourly contracts, accepting locks one week's estimated cost, and billing draws down automatically per logged hour — no separate client approval step — with any unused lock refunded when the contract ends. Disputes route to an admin who can release, refund, or split.

<table>
<tr>
<td width="100%" align="center"><img src="screenshots/web/15-client-projects-list.png" width="600" alt="My Jobs / Active Contracts"><br><sub><i>The client's jobs list, filtered to in-progress projects — shows escrow milestone status inline per contract.</i></sub></td>
</tr>
</table>

---

## SLIDE 24 — LIVE DEMO
**Presenter: Student 3**

**Content (demo script — on slide, keep short):**
1. Browse as a guest → open a gig/freelancer profile.
2. Log in as a **client** → post a job (with AI auto-fill).
3. Log in as a **freelancer** → submit a proposal (AI-drafted).
4. Client accepts → **contract** created → **milestone 1 escrow locked automatically** (hourly: one week's estimate locked).
5. Freelancer delivers → client approves → **escrow released** → review.
6. Try an **AI tool** (Cost Estimator / Buddy).

**Speaker notes:** *(Live)* Use the seeded demo accounts (`test.client0@skillkart.com`, `test.freelancer0@skillkart.com`, password `Pass123!@#`). Keep a backup screen-recording in case of network issues.

<table>
<tr>
<td width="33%" align="center"><img src="screenshots/web/14-client-post-job-form.png" width="380" alt="Post a Job Form"><br><sub><i>The multi-step "post a project" form, filled out (not submitted) for a realistic look.</i></sub></td>
<td width="33%" align="center"><img src="screenshots/web/22-freelancer-submit-proposal-form.png" width="380" alt="Submit a Proposal"><br><sub><i>A job detail page with the "Submit Proposal" form filled out (not submitted).</i></sub></td>
<td width="33%" align="center"><img src="screenshots/web/25-freelancer-contracts-work.png" width="380" alt="Active Contracts / Milestones"><br><sub><i>The freelancer's active contracts and gig orders, with delivery and milestone controls.</i></sub></td>
</tr>
</table>

---

## SLIDE 25 — Admin Panel
**Presenter: Student 3**

**Content:**
- **Isolated** admin app (`/admin-panel/*`) with its own auth — the marketplace JWT never grants admin access.
- Modules: **Dashboard, Users, Jobs, Contracts, Payments, Wallets, Withdrawals, Transactions, Reviews, Chats, Reports, Disputes, Monitoring, Audit Logs, Analytics, Settings.**
- Every sensitive action is written to an **audit log**.
- Separately, content/taxonomy moderation (skill-graph curation, CMS pages) runs on its own `/admin/taxonomy` surface under ordinary marketplace RBAC — deliberately **not** folded into the isolated admin panel above.

**Speaker notes:** The admin panel is a platform in itself — 16+ management pages. It was designed as a *separate* concern (isolated auth, scoped CSS) so it can never leak into or be reached from the public app.

<table>
<tr>
<td width="50%" align="center"><img src="screenshots/web/30-admin-login.png" width="380" alt="Admin Panel Login"><br><sub><i>The isolated admin panel login screen (credentials step).</i></sub></td>
<td width="50%" align="center"><img src="screenshots/web/31-admin-login-otp-step.png" width="380" alt="Admin Panel OTP Step"><br><sub><i>After credentials are accepted, the admin panel requires a one-time code emailed to the admin address (2FA) before granting access.</i></sub></td>
</tr>
</table>

> **Note:** only the login and OTP steps are shown here — deeper admin pages (Dashboard, Users, Contracts, etc.) require completing that real, emailed 2FA code and couldn't be captured programmatically. That's a direct, honest consequence of the isolated 2FA gate actually working as designed, not a documentation gap; those pages are demonstrated live instead (see Slide 24).

---

## SLIDE 26 — Testing
**Presenter: Student 3**

**Content:**
- **Manual & exploratory testing** across all user roles and flows — an ongoing practice throughout development, not a one-time pre-launch pass.
- **Integration testing** of the full contract → escrow → payout lifecycle, re-run whenever escrow logic changes.
- **Referential-integrity verification** on seeded data (no orphaned records).
- **Resilience testing** — forced AI/provider outages to confirm graceful degradation (503 + toast, no crash).
- **UI/responsiveness testing** across desktop and mobile (browser-automation screenshots), including real-device passes for native-only bugs a browser can't reproduce.

**Key discussion points:** We validated not just the happy path but failure modes — what happens when AI is down, when a role mismatch occurs, when a payment provider fails. Several bugs (Slide 29) were only caught by testing again after deployment or on a real Android device, which is why testing continued well past initial feature-complete rather than stopping there. A production-grade demo seeder (≈200 users, 320 jobs, 220 gigs, thousands of messages) let us test at realistic scale.

---

## SLIDE 27 — Results
**Presenter: Student 3**

**Content:**
- ✅ A **fully working, dual-sided** freelance marketplace (Jobs + Gigs).
- ✅ **14 LLM-backed AI capabilities** (CV analysis, proposal drafting, cost estimation, skill tests, Buddy chat, industry/category/subcategory recommendation, brief/text generation, taxonomy suggestion, search-skill expansion, and more) integrated with a resilient multi-provider fallback, plus a deterministic (non-LLM) matchmaking engine.
- ✅ Complete **escrow payment + wallet + withdrawal** flow.
- ✅ **16+ page admin panel** with analytics and audit logging.
- ✅ **Two native Android apps** shipped via Capacitor (client/freelancer/admin-panel + a standalone admin app), with push notifications and offline handling.
- ✅ **~70,000 lines** of code across 280+ files; 39 data models; 23 API route groups.
- ✅ All six project objectives **achieved and demonstrated**.

**Speaker notes:** Every objective from Slide 6 is met and shown live. The scale figures illustrate that this is a complete system, not a prototype.

---

## SLIDE 28 — Performance
**Presenter: Student 3**

**Content:**
- **Request de-duplication** on the client suppresses redundant GETs.
- **Indexed** MongoDB queries; server-side pagination on large lists.
- **Optional Redis caching** layer for hot data.
- **Batch inserts / bulk writes** for heavy operations (e.g. the demo seeder inserts thousands of records efficiently).
- **Code-split, minified** production build via Vite.

**Key discussion points:** We paid attention to real performance concerns — N+1 avoidance, pagination, caching hooks, and efficient bulk operations.

---

## SLIDE 29 — Challenges Faced
**Presenter: Student 3**

**Content:**
- **Unreliable free-tier AI** → solved with a chained multi-provider fallback + local model + graceful 503.
- **Escrow correctness** → modeled Contract & Payment as explicit state machines with enums.
- **Stale auth after role change** → forced a fresh auth refetch (bypassing a throttle) to prevent wrong redirects.
- **Modal/overlay CSS bug** (fixed element trapped in a transformed ancestor) → solved with React Portals.
- **Toast library incompatible with React 19** → built a dependency-free, crash-proof toast utility.
- **Email died in production, worked locally** → the host blocks outbound SMTP ports; refactored to a provider abstraction and an HTTPS-based Gmail API transport.
- **Admin login looped after deploy** → cross-site cookie (`SameSite=Strict` withheld it between Vercel and Railway); fixed with `SameSite=None; Secure` + `trust proxy`.
- **Mobile auth screens mis-centered/scrollable on real devices** → `100vh`/`100dvh` still over-reported the visible height on-device (no browser chrome to subtract, yet content still looked pinned to the top with dead space below); fixed by JS-measuring `window.innerHeight` into a `--app-vh` CSS custom property in `main.jsx` and using that instead of any viewport unit.
- **Animated login/register backgrounds janked on Android WebView** → continuous large-radius `filter: blur()` animations (3 blobs + mouse-glow + particles) that were smooth in a desktop browser recomposited badly in the native WebView; removed in favor of a static, painted-once background for the native build only (web is unaffected).
- **Social OAuth redirected to the website instead of back into the app** → the mobile WebView's fixed origin (`https://localhost`) breaks a normal OAuth redirect; solved with a Chrome Custom Tab plus a `skillkart://auth-callback` deep link back into the app (see Slide 21).

**Speaker notes:** These are real bugs we hit and fixed — each taught us something about CSS containing blocks, React 19 changes, auth race conditions, viewport units on real hardware, and designing for third-party failure.

**The middle three share a theme worth drawing out if asked:** all three worked perfectly on the web build and surfaced only in the native Android WebView, because each depends on an environment property the web build never exercises — SMTP egress rules, the browser's same-site vs. cross-site distinction, WebView viewport reporting, WebView compositing cost, and a fixed WebView origin. On one machine, frontend and backend are both `localhost`, so *every* request is same-site and the cookie bug is invisible; a desktop browser has a real compositor budget a WebView doesn't, so the animated background bug is invisible too. **A passing test on web (or localhost) is not evidence of correctness for behaviour defined by the deployment or runtime platform.** That insight changed how we validate: we now gate the cookie on the actual request protocol rather than an `NODE_ENV` label, and we test auth/visual behaviour on a real device before calling a mobile feature done — because an environment label is a claim about the environment, not a measurement of it.

---

## SLIDE 30 — Future Enhancements
**Presenter: Student 3**

**Content:**
- **iOS mobile app** — Android already ships (Capacitor); iOS reuses the same codebase.
- **Real-time chat & video calls** (WebSockets / WebRTC) — currently efficient polling.
- **Deeper AI matching** with embeddings/vector search.
- **Advanced analytics** and reporting dashboards.
- **Multi-language / i18n** support.
- **Expanded RBAC** (finance admin, content editor, etc.) and real-time collaboration.

**Key discussion points:** The architecture already anticipates these — e.g. RBAC roles and the AI router are extensible without refactoring.

---

## SLIDE 31 — Conclusion
**Presenter: Student 3**

**Content:**
- SkillKart delivers a **complete, secure, AI-assisted** freelance marketplace.
- It solves real discovery, assistance, payment-trust, and verification problems.
- It demonstrates strong software engineering: layered architecture, state machines, resilience, and security.
- Built end-to-end by three students on the MERN stack with modern AI integration.

**Speaker notes:** In summary, we set out to build more than a job board — a trustworthy, intelligent platform for the next generation of freelancers — and we delivered it, working and at scale.

---

## SLIDE 32 — Thank You / Q&A
**Presenter: All (led by Student 3)**

**Content:**
- **Thank You**
- Questions & Answers
- *[Team names + contact / GitHub]*

**Speaker notes:** Thank you for your time and attention. We'd be happy to answer any questions.

---

## Appendix — Backup Slides (optional, for Q&A)

- **A1. Deployment** — Backend on Railway/Render, Frontend on Vercel (see `docs/DEPLOYMENT.md`).
- **A2. AI provider priority config** — how `AI_PRIORITY_*` reorders the fallback chain.
- **A3. Full ER diagram** — all 39 collections and relationships.
- **A4. Contract state machine** — the full status transition diagram.
- **A5. Security matrix** — control vs. threat mapped.

---

<sub>Prepared for the SkillKart BSCS Final Year Project defense. Replace all `[bracketed]` placeholders and insert the marked screenshots before presenting.</sub>
