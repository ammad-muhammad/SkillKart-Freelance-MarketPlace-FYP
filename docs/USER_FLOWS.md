# Complete User Flows & Business Logic

This document serves as the master business blueprint for the SkillKart marketplace. It details the complete journey, logic, and state management for every type of user interacting with the platform. Every feature described here is currently fully functional in the backend and frontend.

---

## 1. Platform Overview

- **What SkillKart is:** A secure, dual-sided digital marketplace connecting skilled freelancers with clients seeking on-demand talent.
- **Marketplace Type:** B2B / B2C Service Marketplace. It operates on a hybrid model supporting both Custom Job Postings (Upwork model) and pre-packaged Gigs (Fiverr model).
- **Business Model:** Commission-based. The platform charges a variable percentage fee (default 10%) on all successfully completed contracts, deducted from the freelancer's final payout upon Escrow release.
- **Core Objectives:**
  - Facilitate trustworthy connections through skill verification.
  - Guarantee payment security via an Escrow funding model.
  - Streamline the negotiation, delivery, and approval lifecycle into rigid, predictable state machines.
- **Supported Workflows:** Custom Job Contracts, Pre-Packaged Gig Purchases, Wallet Funding & Withdrawals, Asynchronous Messaging, and 2FA Security.

---

## 2. User Personas

### Guest
- **Goals:** Understand the platform, assess available talent/jobs, and decide whether to register.
- **Permissions:** Can browse public freelancer profiles, view active Gigs, read open Job descriptions, and use the search engine.
- **Restrictions:** Cannot apply to jobs, purchase gigs, view private attachments, message users, or see contract history.
- **Typical Journey:** Lands on homepage → Views public listings → Uses search filters → Reaches Registration wall.

### Freelancer
- **Goals:** Find work, sell pre-packaged services, build a reputation, and earn money safely.
- **Permissions:** Can create a profile, upload a CV, post Gigs, submit Proposals to open jobs, save jobs to their profile, message contracted clients, change passwords, enable/disable 2FA, and request wallet withdrawals.
- **Restrictions:** Cannot post jobs, hire others, or message clients without an active proposal/contract (prevents spam). Must pass automated skill tests before posting Gigs matching those categories.
- **Typical Journey:** Registers → Verifies email → Completes onboarding → Passes skill tests → Creates Gigs / Saves & Browses Jobs → Submits Proposals → Negotiates via chat → Delivers work → Earns funds → Withdraws to external account.

### Client
- **Goals:** Hire vetted talent quickly, ensure funds are protected until work is satisfactory, and manage projects.
- **Permissions:** Can post jobs, review proposals, purchase Gigs, fund Escrow via Stripe, request revisions, release payments, change passwords, and toggle 2FA.
- **Restrictions:** Cannot submit proposals, withdraw funds (can only receive refunds), or view other clients' private data.
- **Typical Journey:** Registers → Verifies email → Creates Company Profile → Posts a Job → Reviews incoming proposals → Hires a freelancer → Pays Escrow deposit → Communicates requirements → Reviews delivered work → Approves work (releases funds).

---

## 3. Complete User Journey (Macro Level)

Guest 
↓ *Views Platform*
Registration (Selects Role)
↓ *Security Check*
Email OTP Verification
↓ *Data Collection*
Onboarding & Profile Setup
↓ *Discovery*
Client Posts Job / Freelancer Searches & Saves Jobs
↓ *Connection*
Freelancer Submits Proposal
↓ *Evaluation*
Client Reviews & Accepts Proposal
↓ *Commitment*
100% Escrow Locked Instantly (from Client's wallet — optionally split into sequential Milestones)
↓ *Execution*
Freelancer works & communicates via Messaging
↓ *Submission*
Freelancer Delivers Work (Links/Files)
↓ *Review*
Client Reviews Delivery
↓ *Alternative Flow: Client Requests Revision → Freelancer re-delivers*
Client Approves Work
↓ *Financial Transfer*
Escrow Released to Freelancer Wallet
↓ *Closure*
Both Parties Submit Reviews
↓ *Extraction*
Freelancer Requests Withdrawal

---

## 4. Freelancer Journey (Micro Level)

1. **Registration:** Inputs email/password or utilizes OAuth (via Supabase). DB creates `User` (`role: freelancer`).
2. **Email Verification:** System emails a 6-digit OTP. DB sets `isEmailVerified = true`.
3. **Onboarding:** User selects skills, languages, hourly rate, and location. DB creates `FreelancerProfile`.
4. **Profile Setup & Security:** 
   - **Avatar & CV Upload:** Uploads files. Proxied securely through Cloudinary middleware.
   - **Portfolio:** Adds past project links/images.
   - **Security:** Toggles Two-Factor Authentication (2FA) or updates password.
5. **Skill Verification:** Takes a multiple-choice quiz. If passed, the skill is flagged as `verified` on their profile.
6. **Browsing Jobs:** Uses filters (category, budget, experience level) to query `status: open` jobs. Can save jobs to their profile via the `/saved-jobs` endpoint.
7. **Applying:** Submits a cover letter and rate. Backend blocks duplicate applications to the same job. Proposal created as `pending`.
8. **Hiring Notification:** Client accepts. Proposal changes to `accepted`.
9. **Working:** Freelancer receives an `Escrow Funded` notification once the current milestone (or the whole price, if not split) is 100% locked. The backend actually enforces this — a delivery cannot be submitted while the current milestone is unfunded, so "safe to work" is a real guarantee, not just copy.
10. **Messaging:** Chat channel opens via the active contract.
11. **Delivery:** Freelancer clicks "Deliver Work". Job state shifts to `delivered`.
12. **Revisions:** Client may reject the delivery. State shifts back to `in-progress`. Freelancer must re-deliver.
13. **Approval:** Client approves. Backend deducts platform fee, and adds net amount to `FreelancerProfile.walletBalance`.
14. **Withdrawal:** Freelancer requests payout. DB creates a `Withdrawal` request, and deducts the balance immediately.
15. **Reviews:** Leaves a 1-5 star rating for the client.

---

## 5. Client Journey (Micro Level)

1. **Registration & Verification:** Same base flow as Freelancer.
2. **Company Onboarding:** Inputs Company Name, Industry, and Size. DB creates `ClientProfile`.
3. **Security:** Toggles 2FA or changes password.
4. **Create Job:** Fills out title, budget, category. State published as `open`.
5. **Editing Jobs:** Can edit jobs only if they remain `open`.
6. **Reviewing Proposals:** Views applications. Strict IDOR protection ensures clients only see their own job proposals.
7. **Hiring:** Accepts proposal. Job `hiredFreelancer` is set, state shifts to `in-progress`. All competing proposals are automatically marked `rejected`.
8. **Escrow Funding:** For fixed-price jobs, **100% of the agreed price is debited from the client's wallet automatically** the instant the proposal is accepted — no separate checkout step. The client may optionally split the price into sequential **Milestones** at accept-time; only the first is funded upfront, and later milestones are funded on demand once the previous one releases. (Hourly contracts and Gig orders keep the original Stripe-Checkout deposit flow.)
9. **Messaging:** Chats with hired freelancer.
10. **Delivery Review:** Job shifts to `delivered`. If the client doesn't act within a configurable window (default **7 days**), the milestone **auto-releases** to the freelancer.
11. **Approving Work:** Approves delivery, releasing that milestone's Escrow. If it was the last (or only) milestone, the Job state shifts to `completed`; otherwise the contract advances to the next milestone, which the client funds when ready.
12. **Disputing:** If something's wrong with the delivered work, the client can raise a **dispute** scoped to that specific milestone — it locks only that milestone (not the whole multi-phase project) pending admin review.
13. **Reviews:** Rates the freelancer, influencing their aggregate profile score.

*(Note: Clients cannot arbitrarily cancel jobs that have already been `delivered` to prevent work-theft. Also note: posting a new job at all requires the client's wallet balance to already cover its minimum budget — a "proof of funds" gate enforced before the job is even listed.)*

---

## 6. Gig Marketplace Flow

Freelancer Creates Gig
↓ *Defines Basic, Standard, and Premium packages (price, delivery time, revisions)*
Skill Gating
↓ *Backend verifies the freelancer has passed tests for the gig's required skills. Blocks publication if unverified.*
Publish (State: `active`)
↓
Client Browses & Filters Gigs
↓ 
Orders Package
↓ *Selects Tier (e.g. "Standard for $50")*
Job Conversion
↓ *Backend instantly creates a `Job` (source = 'gig') locked to the Tier pricing. Skips the Proposal phase entirely.*
Escrow Funding
↓ *Client pays deposit via Stripe — Gig orders still use the original deposit/final Stripe-Checkout flow, not the newer wallet-based Milestone escrow used by custom Jobs.*
Work & Delivery Lifecycle
↓ *Follows identical lifecycle to standard custom jobs.*

---

## 7. Authentication & Security Flow

- **Registration:** Passwords hashed via Bcrypt (12 rounds).
- **Bot Screening:** Login, registration, and the public contact/newsletter forms are screened by Google reCAPTCHA v3 before any handler runs. It is invisible — legitimate users see no challenge and no extra step in the flows above.
- **OTP Verification:** 6-digit codes stored temporarily, delivered by email (Gmail API in production, SMTP locally).
- **Login:** Returns stateless JWTs.
- **Two-Factor Authentication (2FA):** Optional. If enabled, Login requires a secondary OTP sent to the verified email.
- **Refresh Token Flow:** Access token expires (e.g., 15m). The frontend silently hits `/auth/refresh` with the stored refresh token to mint a new one. Marketplace tokens are held in browser storage and sent as `Authorization: Bearer` headers; the **admin panel** is separate, using an HTTP-only `admin_token` cookie (`SameSite=None; Secure` in production, since the SPA and API are on different domains).
- **Password Updates:** Fully supported via `changePassword` endpoints.
- **File Uploads:** Memory buffer whitelisting strictly prevents payload manipulation before syncing to Cloudinary.

---

## 8. Messaging Flow

- **Permissions:** Gated. You cannot message users without an active connection (e.g., pending proposal, active contract).
- **Delivery:** Currently relies on RESTful polling. The frontend fetches `/messages/conversation/:id` periodically.
- **Limitations:** No true real-time WebSockets. No read receipts.

---

## 9. Wallet & Payment Flow

- **Stripe Checkout:** Hosts the payment session for topping up a wallet, and for the legacy deposit/final flow still used by Gig orders and hourly contracts. Injects custom metadata (`userId`, `jobId`).
- **Escrow Integrity (legacy/gig/hourly path):** Managed by async Webhooks (`stripe.webhook.js`).
- **Idempotency:** Replay attacks are blocked via the `processedSessions` array.
- **Refunds:** If an `in-progress` contract cancels, the Escrow is deposited into the Client's `walletBalance`.
- **Withdrawals:** Freelancer requests payout. The internal `walletBalance` is immediately deducted, queueing a `Withdrawal` database record for manual admin processing.

### 9a. Fixed-Price Milestone Escrow (custom Jobs)

Custom fixed-price jobs use a newer, wallet-native escrow model — no Stripe Checkout redirect at all for funding a milestone:

- **Post-Project Gate:** A client cannot even *post* a job unless their wallet balance already covers its minimum budget. Enforced in `job.controller.js` on both job creation and on publishing a draft.
- **100% Lock at Hire:** Accepting a proposal debits the client's wallet for the full agreed price (or, if split, the first milestone's amount) and creates the `Contract` + `Milestone`(s) + `Payment` record(s) atomically — checked *before* any writes, so an insufficient balance leaves nothing half-created.
- **Sequential Milestones:** A client may split the price into up to a few milestones at accept-time. Only milestone 1 auto-funds; milestone 2+ requires the client to explicitly click "Fund Milestone N" once ready (`POST /payments/milestones/:id/fund`) — capital isn't parked for work that hasn't started.
- **Submit Gate:** The freelancer can only submit a delivery once the current milestone's status is `funded` (or `in_revision`) — enforced server-side, not just in the UI.
- **7-Day Auto-Release:** An hourly cron job (`cron.service.js`) scans milestones stuck in `submitted` past their `reviewDeadline` (default 7 days, configurable via admin `SystemSettings`) and releases them automatically, notifying both parties. A milestone under an active dispute is excluded.
- **Milestone Disputes:** Either party can raise a dispute on the *current* milestone (must be `submitted`/`in_revision`); this locks that milestone and flips the contract to `under_review`, without touching any other milestone. Admins resolve via the same actions as hourly disputes (release / refund / split / resume / reject), scoped to that one milestone's own `Payment` record.

---

## 10. Marketplace State Machines

```mermaid
stateDiagram-v2
    direction LR
    %% Job States
    state "Job Lifecycle" as Job {
        [*] --> open
        open --> in_progress : Hired
        in_progress --> delivered : Work Submitted
        delivered --> in_progress : Revision Requested
        delivered --> completed : Client Approves
        open --> cancelled
        in_progress --> cancelled
    }
```

```mermaid
stateDiagram-v2
    direction LR
    %% Proposal States
    state "Proposal Lifecycle" as Prop {
        [*] --> pending
        pending --> accepted : Client Hires
        pending --> rejected : Another Hired
        pending --> withdrawn : Freelancer Pulls Out
    }
```

```mermaid
stateDiagram-v2
    direction LR
    %% Milestone States (fixed-price jobs)
    state "Milestone Lifecycle" as Milestone {
        [*] --> pending_funding
        pending_funding --> funded : Client Funds (wallet debit)
        funded --> submitted : Freelancer Delivers
        submitted --> in_revision : Client Requests Changes
        in_revision --> submitted : Freelancer Re-delivers
        submitted --> disputed : Either Party Disputes
        submitted --> released : Client Approves OR 7-day Auto-Release
        disputed --> released : Admin Resolves (release/split)
        disputed --> refunded : Admin Resolves (refund)
        disputed --> submitted : Admin Resolves (resume/reject)
    }
```

---

## 11. Feature Matrix

This matrix is the definitive source of truth for the platform's current capabilities.

### Fully Implemented
- **Registration & Login** (Email/Password, Supabase OAuth)
- **OTP Email Verification**
- **Two-Factor Authentication (2FA)**
- **Password Change / Reset**
- **Role-Based Profiles** (Client, Freelancer)
- **Skill Gating & Assessments**
- **Custom Job Postings**
- **Job Proposal Submission & Bidding**
- **Gig Creation with Tiered Packages** (Basic, Standard, Premium)
- **Gig Ordering (Direct Purchase)**
- **Saved Jobs** (Freelancers can bookmark jobs)
- **Secure File Uploads** (Cloudinary Integration)
- **Stripe Checkout Escrow Funding** (wallet top-ups, and the legacy deposit/final flow for Gig orders & hourly contracts)
- **100% Escrow Lock at Hire** (fixed-price custom Jobs — wallet debit, no checkout redirect)
- **Multi-Milestone Contracts:** Fixed-price jobs can be split into sequential milestones, each funded only when the client is ready to start that phase.
- **7-Day Auto-Release:** Milestones the client hasn't reviewed in time (default 7 days, admin-configurable) release automatically to the freelancer.
- **Post-Project Wallet Gate:** A job can't be posted (or a draft published) unless the client's wallet already covers its minimum budget.
- **Fixed-Price Milestone Disputes:** Either party can dispute the current milestone specifically; admins resolve via release / refund / split / resume / reject, scoped to that milestone only.
- **Idempotency Payment Protection**
- **Delivery & Revision Cycles**
- **Payment Release & Internal Wallet Ledgers**
- **Withdrawal Requests**
- **In-App Notifications**
- **Job & Freelancer Search / Filtering**
- **Mutual Review & Rating System**

### Partially Implemented
- **Messaging:** Functional, but relies on RESTful interval polling rather than true WebSockets.
- **Refunds:** If a job cancels, funds go to the client's internal `walletBalance` rather than automatically refunding to their credit card via Stripe API.
- **Dispute Mediation:** Fully implemented for hourly contracts and fixed-price milestones (raise → auto-freeze → admin resolves with release/refund/split/resume/reject) — the gap is only that Gig orders don't yet have their own dispute entry point.

### Planned (Future Enhancements)
- **Automated Payouts:** Using Stripe Connect to auto-route freelancer withdrawals to their bank without Admin intervention.
- **Real-Time WebSockets:** Upgrading chat to Socket.io.
- **Gig Order Disputes:** Extending milestone-style disputes to Gig orders (currently only custom Jobs and hourly contracts support disputing).

### Not Implemented (Missing Features)
- **Account Deletion:** Users cannot delete their accounts programmatically.
- **Identity Verification (KYC):** No passport/ID verification integration (e.g., Onfido).
- **Wishlists:** Clients cannot "save" freelancers or gigs for later.
- **Email Change Verification:** Changing email addresses is restricted.
