# Deployment Guide — SkillKart

This guide walks through deploying SkillKart to production:

- **Backend** (Express API) → **Railway** or **Render**
- **Frontend** (React + Vite SPA) → **Vercel**

The two apps deploy **separately**. Deploy the **backend first**, get its public URL, then deploy the frontend pointed at that URL, and finally come back and lock down the backend's CORS to the frontend URL.

> The monorepo has two app roots — `Backend/` and `Front-end/`. On every platform you must set the **root/base directory** to the correct sub-folder.

---

## Table of Contents

1. [Before You Start](#1-before-you-start)
2. [Required Code Changes](#2-required-code-changes-do-these-first)
3. [Provision External Services](#3-provision-external-services)
4. [Deploy the Backend — Railway](#4-deploy-the-backend--railway)
5. [Deploy the Backend — Render](#5-deploy-the-backend--render-alternative)
6. [Deploy the Frontend — Vercel](#6-deploy-the-frontend--vercel)
7. [Wire the Two Together (CORS)](#7-wire-the-two-together-cors)
8. [Post-Deploy Checklist](#8-post-deploy-checklist)
9. [Environment Variable Reference](#9-environment-variable-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Before You Start

You need accounts for:

| Service | Purpose | Free tier? |
|---------|---------|-----------|
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Database (**required**) | ✅ M0 |
| [Railway](https://railway.app) **or** [Render](https://render.com) | Backend host | ✅ (limited) |
| [Vercel](https://vercel.com) | Frontend host | ✅ |
| [Stripe](https://stripe.com) | Payments (optional — can run in dummy mode) | ✅ test mode |
| [Supabase](https://supabase.com) | Social OAuth (optional) | ✅ |
| An AI key (Gemini / Qwen / Groq / Anthropic) | AI features (optional) | ✅ (Gemini/Groq) |

Push the repo to GitHub — all three platforms deploy from a Git repo.

---

## 2. Required Code Changes (do these first)

These are **mandatory** for a working production deploy. Do them, commit, and push before deploying.

### 2.1 Backend `start` script must not use nodemon ⚠️

`Backend/package.json` currently starts the server with **nodemon**, which is a dev tool and is a `devDependency`. In production it either won't be installed or will keep the process in watch mode. Change it:

```jsonc
// Backend/package.json
"scripts": {
  "start": "node src/server.js",      // ← was: "nodemon src/server.js"
  "dev": "nodemon src/server.js",     // keep dev as-is
  ...
}
```

> Railway/Render run `npm start` by default, so `start` **must** be `node src/server.js`.

### 2.2 CORS accepts a single origin — set it exactly

The backend builds its allow-list from `CORS_ORIGIN` (one value) + `FRONTEND_URL`. It does **not** split a comma-separated list. So each of `CORS_ORIGIN` and `FRONTEND_URL` must be a **single, exact origin** — your Vercel URL, **no trailing slash**:

```
CORS_ORIGIN=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

*(If you later need multiple frontend origins, update the allow-list logic in `Backend/src/app.js` to `CORS_ORIGIN.split(',')` — currently it takes one.)*

### 2.3 SuperAdmin credentials are ephemeral on cloud hosts

`npm run setup:superadmin` writes an encrypted file under `Backend/secure/`, which is **gitignored** and lives on the container's ephemeral disk. On Railway/Render free tiers this disk resets on every redeploy, so **re-run `setup:superadmin` after each deploy** (or attach a persistent volume). This only affects the SuperAdmin login, not normal users (they're in MongoDB).

### 2.4 Frontend needs a SPA rewrite (Vercel)

The app uses `BrowserRouter`, so deep links like `/freelancer/dashboard` must fall back to `index.html`. This is handled by the `vercel.json` in [step 6](#6-deploy-the-frontend--vercel) — don't skip it, or refreshing any non-root route returns 404.

---

## 3. Provision External Services

### MongoDB Atlas (required)

1. Create a free **M0** cluster.
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Railway/Render use dynamic IPs).
4. **Connect** → *Drivers* → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/skillkart?retryWrites=true&w=majority
   ```
   Add a database name (`/skillkart`) before the `?`. This is your `MONGODB_URI`.

### Stripe (optional)

- For a demo you can skip Stripe entirely: set `STRIPE_DUMMY=true` and leave the keys blank.
- For real payments: copy your **test** (or live) `STRIPE_SECRET_KEY`. After the backend is live, add a webhook endpoint pointing at `https://<backend-url>/webhooks/stripe` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### Supabase (optional — social OAuth only)

Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`. Email/OTP auth works without Supabase.

### AI (optional)

Get at least one key (Gemini and Groq have generous free tiers). The provider fallback order is env-driven — see the [env reference](#9-environment-variable-reference).

---

## 4. Deploy the Backend — Railway

1. **New Project → Deploy from GitHub repo** → pick this repo.
2. **Settings → Root Directory** → set to `Backend`.
3. Railway auto-detects Node via Nixpacks. Confirm:
   - **Build command**: `npm install` (default).
   - **Start command**: `npm start` (which is now `node src/server.js`).
4. **Do NOT set `PORT`** — Railway injects it, and the server already reads `process.env.PORT`.
5. **Variables** → add every backend env var from the [reference](#9-environment-variable-reference). At minimum:
   - `NODE_ENV=production`
   - `MONGODB_URI=...`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` (32+ random chars each)
   - `ENCRYPTION_KEY` (32+ chars)
   - `STRIPE_DUMMY=true` (or real Stripe keys)
   - AI keys + `AI_PRIORITY_*` (optional)
   - Leave `CORS_ORIGIN` / `FRONTEND_URL` as placeholders for now — you'll set them in [step 7](#7-wire-the-two-together-cors).
6. **Deploy**. When it's live, open **Settings → Networking → Generate Domain** to get a public URL like `https://skillkart-backend-production.up.railway.app`.
7. Verify: open `https://<backend-url>/health` — you should get a JSON `{ status: 'ok' ... }`.
8. **One-time setup** — run in Railway's shell (or locally against the prod DB):
   ```bash
   npm run setup:superadmin   # creates the SuperAdmin
   npm run seed:demo          # OPTIONAL — populate demo data
   ```

> **Optional** — commit a `Backend/nixpacks.toml` to pin Node:
> ```toml
> [phases.setup]
> nixPkgs = ["nodejs_18"]
> ```

---

## 5. Deploy the Backend — Render (alternative)

1. **New → Web Service** → connect the repo.
2. **Root Directory**: `Backend`
3. **Runtime**: Node
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Instance Type**: Free (fine for a demo — note it sleeps after inactivity and cold-starts).
7. **Environment** → add all backend env vars (same list as Railway). Render injects `PORT` automatically.
8. Deploy → your URL is `https://skillkart-backend.onrender.com`.
9. Verify `https://<backend-url>/health`, then run `setup:superadmin` (Render **Shell** tab).

> **Optional** — commit `render.yaml` at the repo root for one-click infra-as-code:
> ```yaml
> services:
>   - type: web
>     name: skillkart-backend
>     runtime: node
>     rootDir: Backend
>     buildCommand: npm install
>     startCommand: npm start
>     healthCheckPath: /health
>     envVars:
>       - key: NODE_ENV
>         value: production
>       # add the rest via the dashboard (secrets)
> ```

---

## 6. Deploy the Frontend — Vercel

1. **Add New → Project** → import the repo.
2. **Root Directory**: `Front-end`
3. Vercel auto-detects **Vite**. Confirm:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Environment Variables** — add:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://<your-backend-url>/api/v1` |
   | `VITE_SUPABASE_URL` | *(optional)* |
   | `VITE_SUPABASE_ANON_KEY` | *(optional)* |

   > ⚠️ `VITE_*` vars are **baked in at build time**. If you change `VITE_API_URL` later you must **redeploy**.
5. **Add SPA rewrite** — create `Front-end/vercel.json` so client-side routes resolve:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
6. **Deploy**. Your frontend is at `https://your-app.vercel.app`.

---

## 7. Wire the Two Together (CORS)

Now that the frontend has a URL, go back to the **backend** host (Railway/Render) and set:

```
CORS_ORIGIN=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

(No trailing slash — must match the browser's `Origin` header exactly.) **Redeploy the backend** so the new values take effect.

If you later add a custom domain on Vercel, update these to the custom domain and redeploy the backend again.

---

## 8. Post-Deploy Checklist

- [ ] `GET https://<backend>/health` → 200 JSON
- [ ] `GET https://<backend>/api/v1/docs` → Swagger UI loads
- [ ] Frontend loads at the Vercel URL; **hard-refresh a deep link** (e.g. `/browse-freelancers`) — no 404 (confirms the SPA rewrite)
- [ ] Register / log in from the frontend — no CORS error in the browser console
- [ ] Deep features work: browse gigs, post a job (confirms DB writes)
- [ ] `setup:superadmin` was run → SuperAdmin login works
- [ ] Admin panel reachable at `https://your-app.vercel.app/admin-panel/login` and login succeeds
- [ ] If using Stripe: webhook shows deliveries in the Stripe dashboard
- [ ] AI tools show results **or** degrade gracefully to "AI is temporarily out of service" (never a crash)

> **Admin dashboard access.** The admin panel has an isolated login at **`/admin-panel/login`**. Credentials are not shipped — **set your own** in the backend environment:
>
> - `ADMIN_EMAIL` — your chosen admin email.
> - `ADMIN_PASSWORD_HASH` — the **bcrypt hash** of your chosen password (never the plaintext). Generate it with:
>   ```bash
>   node -e "console.log(require('bcryptjs').hashSync('YourStrongPassword', 12))"
>   ```
> - `ADMIN_JWT_SECRET` — a secret that is completely different from `JWT_SECRET`.
>
> ⚠️ Use a **strong, unique** admin password and never commit it.

---

## 9. Environment Variable Reference

### Backend (Railway / Render)

Full documented list in [`Backend/.env.example`](../Backend/.env.example). Production essentials:

| Variable | Required | Notes |
|----------|:---:|-------|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ❌ | **Do not set** — the platform injects it |
| `MONGODB_URI` | ✅ | Atlas connection string |
| `JWT_SECRET` | ✅ | 32+ random chars |
| `JWT_REFRESH_SECRET` | ✅ | 32+ random chars (different from above) |
| `JWT_EXPIRE` / `JWT_REFRESH_EXPIRE` | ❌ | defaults `7d` / `30d` |
| `ENCRYPTION_KEY` | ✅ | 32+ chars — encrypts SuperAdmin creds |
| `CORS_ORIGIN` | ✅ | Single frontend origin, no trailing slash |
| `FRONTEND_URL` | ✅ | Same as `CORS_ORIGIN` |
| `STRIPE_DUMMY` | ✅ | `true` to simulate payments, else `false` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | ⬤ | needed only if `STRIPE_DUMMY=false` |
| `EMAIL_PROVIDER` | ❌ | `smtp` (default) or `gmail`. Unknown values fail at startup |
| `EMAIL_ENABLED` | ❌ | `false` disables all sending; defaults `true` |
| `EMAIL_SANDBOX` / `EMAIL_SANDBOX_RECIPIENT` | ❌ | staging only — redirects all mail to one inbox |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` | ⬤ | SMTP — needed for OTP emails. Legacy `EMAIL_*` names still work |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `GOOGLE_EMAIL` | ⬤ | only if `EMAIL_PROVIDER=gmail`. Generate the token locally (`npm run gmail:token`) and paste the same value here — it is not machine-bound, and `GOOGLE_REDIRECT_URI` is not needed in production. **Railway blocks outbound SMTP (465/587)**, so Gmail is the working transport there — but a Testing-mode consent screen expires refresh tokens after **7 days**, and the SMTP fallback cannot save you on Railway. See [Backend README → Email](../Backend/README.md#email). Not related to Supabase Google sign-in |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` | ⬤ | social OAuth only |
| `REDIS_URL` | ❌ | optional cache; leave blank / `ENABLE_REDIS_CACHE=false` |
| `GEMINI_API_KEY` / `QWEN_API_KEY` / `GROQ_API_KEY` / `ANTHROPIC_API_KEY` | ⬤ | AI provider keys |
| `QWEN_BASE_URL` / `QWEN_MODEL` | ❌ | Qwen endpoint + model (defaults provided) |
| `AI_PRIORITY_GEMINI` … `AI_PRIORITY_OLLAMA` | ❌ | fallback order (0 = first; `-1` disables) |

✅ required · ⬤ conditionally required · ❌ optional

### Frontend (Vercel)

| Variable | Required | Notes |
|----------|:---:|-------|
| `VITE_API_URL` | ✅ | `https://<backend>/api/v1` — baked in at build time |
| `VITE_SUPABASE_URL` | ❌ | social OAuth client |
| `VITE_SUPABASE_ANON_KEY` | ❌ | social OAuth client |

### Generating secrets

```bash
# 32-byte random hex — use for JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 10. Troubleshooting

| Symptom | Cause & Fix |
|---------|-------------|
| **CORS error** in browser console | `CORS_ORIGIN` / `FRONTEND_URL` don't exactly match the frontend origin. Check for a trailing slash, `http` vs `https`, or `www`. Redeploy backend after changing. |
| Backend build/start hangs or restarts | `start` still runs `nodemon`. Set it to `node src/server.js` (see [2.1](#21-backend-start-script-must-not-use-nodemon-)). |
| `MongoServerError: bad auth` / timeout | Wrong `MONGODB_URI` password, or Atlas **Network Access** doesn't include `0.0.0.0/0`. |
| Refreshing a route (e.g. `/dashboard`) → 404 on Vercel | Missing `Front-end/vercel.json` SPA rewrite (see [step 6](#6-deploy-the-frontend--vercel)). |
| Frontend calls `localhost:5000` in production | `VITE_API_URL` wasn't set at build time, or you changed it without redeploying (Vite bakes env vars into the build). |
| SuperAdmin login fails after a redeploy | Ephemeral filesystem wiped `secure/`. Re-run `npm run setup:superadmin`, or attach a persistent volume. |
| OTP emails never arrive | Check the startup log for `✅ Email Provider: …` and **Admin → Monitoring → Email** for the failure reason. Gmail SMTP needs an **app password**, not the account password. If the host blocks outbound `465`/`587`, switch to `EMAIL_PROVIDER=gmail` (sends over HTTPS). Full table: [Backend README → Email](../Backend/README.md#troubleshooting). |
| AI tools always say "out of service" | No valid AI key set, or all keys invalid/rate-limited. Add a `GEMINI_API_KEY` or `GROQ_API_KEY`. This is expected, non-fatal behavior — the app never crashes on an AI outage. |
| Render service slow to respond | Free instances sleep after inactivity and cold-start (~30s). Upgrade or use a keep-alive ping. |

---

<sub>Deploy backend → get URL → deploy frontend with that URL → set backend CORS to the frontend URL → redeploy backend. That loop is the whole thing.</sub>
