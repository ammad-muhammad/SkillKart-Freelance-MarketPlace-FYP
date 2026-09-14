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
| An AI key (Gemini / DeepSeek / Qwen / Groq / Anthropic) | AI features (optional) | ✅ (Gemini/Groq) |

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

### 2.2 CORS — comma-separated origins, each exact (no trailing slash)

The backend builds its allow-list from `CORS_ORIGIN` + `FRONTEND_URL`, both split on
commas and `.trim()`-cleaned (`Backend/src/app.js`), plus hardcoded local dev origins.
Each entry must match the request's `Origin` header **exactly** — scheme, host, and
no trailing slash:

```
CORS_ORIGIN=https://your-app.vercel.app,https://localhost
FRONTEND_URL=https://your-app.vercel.app
```

`https://localhost` is the [mobile app's](../Front-end/README.md#mobile-app-android--capacitor)
fixed WebView origin (Capacitor's `androidScheme: "https"`) — include it in
`CORS_ORIGIN` if the mobile build needs to reach this backend, or every request from
the app gets blocked.

### 2.3 SuperAdmin credentials are ephemeral on cloud hosts

`npm run setup:superadmin` writes an encrypted file under `Backend/secure/`, which is **gitignored** and lives on the container's ephemeral disk. On Railway/Render free tiers this disk resets on every redeploy, so **re-run `setup:superadmin` after each deploy** (or attach a persistent volume). This only affects the SuperAdmin login, not normal users (they're in MongoDB).

### 2.4 Frontend needs a SPA rewrite (Vercel)

The app uses `BrowserRouter`, so deep links like `/freelancer/dashboard` must fall back to `index.html`. This is handled by the `vercel.json` in [step 6](#6-deploy-the-frontend--vercel) — don't skip it, or refreshing any non-root route returns 404.

Two things depend on that file existing, not just deep links:

- **Auth.** Without the rewrite, a deep-link 404 forces a full-document reload. That reload previously wiped the refresh token and bounced users back to `/login` after OTP. The token now lives in `localStorage` to survive it, but the rewrite is still what stops the reload happening at all.
- **The sitemap.** Its `/sitemap.xml` → backend proxy lives in the same file.

### 2.5 Deploy order: backend first ⚠️

**Deploy Railway (backend) before Vercel (frontend).** The frontend proxies `/sitemap.xml` to the backend, so if the backend doesn't yet serve that route, `https://<frontend>/sitemap.xml` returns a 404 from the API rather than a sitemap.

This is only a *transient* problem — deploying the backend afterwards fixes it with no frontend change — but if you submit the sitemap to Google Search Console in that window, it will be rejected.

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
   - **`EMAIL_PROVIDER=gmail`** + `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `GOOGLE_EMAIL` — **not optional in practice**: Railway blocks outbound SMTP ports, so `smtp` cannot deliver here and OTP-gated registration breaks entirely. Generate the refresh token once via [Google's OAuth Playground](https://developers.google.com/oauthplayground/) (see Backend/README.md → Email) and paste the same value here (it isn't machine-bound). `GOOGLE_REDIRECT_URI` is **not** needed in production — it's only used during that one-time consent.
   - `PUBLIC_SITE_URL=https://<your-frontend>` — the canonical domain for the sitemap. Without it the sitemap advertises whichever origin happens to be first in `FRONTEND_URL`.
   - `RECAPTCHA_SECRET_KEY` (optional; blank = bot protection off, requests still pass)
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
   | `VITE_RECAPTCHA_SITE_KEY` | *(optional — public site key; blank disables reCAPTCHA)* |

   > ⚠️ `VITE_*` vars are **baked in at build time**. If you change one later you must **redeploy** — editing it in the dashboard alone changes nothing.
5. **`Front-end/vercel.json`** is already committed. It does two things:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/sitemap.xml",
         "destination": "https://<your-backend-url>/sitemap.xml"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   - **`/sitemap.xml` → backend proxy.** The sitemap is generated live from MongoDB, so it can't be a static file here. This makes the canonical URL same-origin with the pages it lists.
   - **`/(.*)` → `index.html`.** The SPA rewrite: without it, refreshing any deep link 404s.

   > ⚠️ **Order is load-bearing** — first match wins. If `/(.*)` is moved above `/sitemap.xml`, the sitemap silently returns your React app as HTML instead of XML.
   >
   > ⚠️ The proxy **hardcodes the backend host**. If the Railway/Render URL changes, update it here or `/sitemap.xml` breaks.
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
- [ ] Backend startup log shows `✅ Email Provider: Gmail API` — **not** `SMTP`. Railway blocks outbound SMTP ports, so an SMTP fallback there means OTP emails silently fail and nobody can register.
- [ ] Frontend loads at the Vercel URL; **hard-refresh a deep link** (e.g. `/browse-freelancers`) — no 404 (confirms the SPA rewrite)
- [ ] Register / log in from the frontend — no CORS error in the browser console
- [ ] **Log in, then hard-refresh** — you stay logged in (confirms the refresh token survives the reload; if you bounce to `/login`, see §10)
- [ ] Deep features work: browse gigs, post a job (confirms DB writes)
- [ ] `setup:superadmin` was run → SuperAdmin login works
- [ ] Admin panel reachable at `https://your-app.vercel.app/admin-panel/login`, and **OTP login lands on the dashboard** (confirms the cross-site `admin_token` cookie — see §10 if it bounces back to login)
- [ ] If using Stripe: webhook shows deliveries in the Stripe dashboard
- [ ] AI tools show results **or** degrade gracefully to "AI is temporarily out of service" (never a crash)

### SEO endpoints

```bash
# Must return: content-type: application/xml  (NOT text/html)
curl -sI https://<frontend>/sitemap.xml | grep -i content-type

# Should list your live jobs/gigs/profiles, not just static pages
curl -s https://<frontend>/sitemap.xml | grep -c "<url>"

# Must point at the frontend domain, and be reachable
curl -s https://<frontend>/robots.txt | grep Sitemap
```

- [ ] `/sitemap.xml` returns **`application/xml`**. `text/html` means the proxy didn't take effect — the SPA is answering instead. Check the rewrite order in `vercel.json`.
- [ ] The URL count is > the ~15 static routes (proves it's reading the database).
- [ ] The URLs use your **canonical** domain — if they show the long auto-generated `*.vercel.app` host, `PUBLIC_SITE_URL` isn't set on Railway.
- [ ] Submit `https://<frontend>/sitemap.xml` in [Google Search Console](https://search.google.com/search-console). Do this **after** confirming the two checks above.
- [ ] Share a link on WhatsApp/LinkedIn — a preview card renders (confirms the absolute `og:image`).

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
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `GOOGLE_EMAIL` | ⬤ | only if `EMAIL_PROVIDER=gmail`. Generate the token once via [Google's OAuth Playground](https://developers.google.com/oauthplayground/) and paste the same value here — it is not machine-bound, and `GOOGLE_REDIRECT_URI` is not needed in production. **Railway blocks outbound SMTP (465/587)**, so Gmail is the working transport there — but a Testing-mode consent screen expires refresh tokens after **7 days**, and the SMTP fallback cannot save you on Railway. See [Backend README → Email](../Backend/README.md#email). Not related to Supabase Google sign-in |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` | ⬤ | social OAuth only |
| `REDIS_URL` | ❌ | optional cache; leave blank / `ENABLE_REDIS_CACHE=false` |
| `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` / `QWEN_API_KEY` / `GROQ_API_KEY` / `ANTHROPIC_API_KEY` | ⬤ | AI provider keys. Gemini and DeepSeek implement the full AI feature set; the rest cover only the core 6 methods |
| `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL_LITE` / `DEEPSEEK_MODEL_HEAVY` / `DEEPSEEK_THINKING` | ❌ | DeepSeek endpoint + model tiers (default `deepseek-v4-flash`, thinking disabled). `deepseek-chat`/`deepseek-reasoner` were retired 2026-07-24 |
| `QWEN_BASE_URL` / `QWEN_MODEL` | ❌ | Qwen endpoint + model (defaults provided) |
| `AI_PRIORITY_GEMINI` … `AI_PRIORITY_OLLAMA` | ❌ | fallback order (0 = first; `-1` disables) |
| `PUBLIC_SITE_URL` | ⬤ | Canonical public origin for the sitemap, e.g. `https://skillkart-fuuast.vercel.app`. **Not** `FRONTEND_URL` — that's a CSV of CORS origins whose first entry may be the wrong domain to advertise to Google. Defaults to the first `FRONTEND_URL` entry if unset |
| `RECAPTCHA_SECRET_KEY` | ❌ | reCAPTCHA v3 secret. **Blank = verification disabled** (fails open) |
| `RECAPTCHA_MIN_SCORE` | ❌ | Reject below this score; defaults `0.5` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ❌ | Mobile app push notifications — paste the whole Firebase service account JSON file's contents as this one var (Railway has no persistent disk for `FIREBASE_SERVICE_ACCOUNT_PATH`'s file-path form). Blank = push disabled, in-app notifications still work. See [Backend README → Push Notifications](../Backend/README.md#push-notifications) |

✅ required · ⬤ conditionally required · ❌ optional

### Frontend (Vercel)

| Variable | Required | Notes |
|----------|:---:|-------|
| `VITE_API_URL` | ✅ | `https://<backend>/api/v1` — baked in at build time |
| `VITE_SUPABASE_URL` | ❌ | social OAuth client |
| `VITE_SUPABASE_ANON_KEY` | ❌ | social OAuth client |
| `VITE_RECAPTCHA_SITE_KEY` | ❌ | reCAPTCHA v3 **public** site key. Blank = no script loads, no token sent |
| `VITE_ENVIRONMENT` | ❌ | `production` forces console silence even in a dev-mode build |

> Everything in a `VITE_` var ships in the client bundle and is publicly readable —
> never put a secret there. Vars are **baked in at build time**, so changing one in
> the Vercel dashboard requires a redeploy to take effect.

### SEO after deploy

- The sitemap is generated by the **backend** (live from Mongo) and proxied onto the
  frontend domain by `Front-end/vercel.json`, so `https://<frontend>/sitemap.xml` is
  the canonical URL. **If the backend domain changes, update the proxy destination in
  `vercel.json`** — it is hardcoded. The `/sitemap.xml` rewrite must stay **above**
  the SPA catch-all `/(.*)`, or it falls through to `index.html`.
- Locally the Vercel proxy doesn't apply — use `http://localhost:5000/sitemap.xml`
  (the backend). `localhost:3001/sitemap.xml` will 404 to the SPA's 404 page.
- Set `PUBLIC_SITE_URL` on Railway to the domain you want indexed, or the sitemap
  will advertise whichever origin happens to be first in `FRONTEND_URL`.
- `index.html` hardcodes the canonical/`og:url`/`og:image` origin. Update those
  three tags if the public domain changes, or previews and canonicalisation break.
- Submit `https://<backend>/sitemap.xml` in
  [Google Search Console](https://search.google.com/search-console) once live.

### Generating secrets

```bash
# 32-byte random hex — use for JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 10. Troubleshooting

| Symptom | Cause & Fix |
|---------|-------------|
| **CORS error** in browser console | `CORS_ORIGIN` / `FRONTEND_URL` don't exactly match the frontend origin. Check for a trailing slash, `http` vs `https`, or `www`. Both support comma-separated values — redeploy backend after changing. |
| Mobile app can't reach the backend at all (every request fails) | `CORS_ORIGIN` is missing `https://localhost` — the Capacitor app's fixed WebView origin. See [§2.2](#22-cors--comma-separated-origins-each-exact-no-trailing-slash). |
| Mobile app login/register always fails with "Security verification failed" | Production has a real `RECAPTCHA_SECRET_KEY` configured, and reCAPTCHA v3 is unreliable inside the app's embedded WebView. The backend should already exempt the `https://localhost` origin (`Backend/src/middleware/recaptcha.middleware.js`) — if this regresses, that's the fix, not a key/config issue. |
| Backend build/start hangs or restarts | `start` still runs `nodemon`. Set it to `node src/server.js` (see [2.1](#21-backend-start-script-must-not-use-nodemon)). |
| `MongoServerError: bad auth` / timeout | Wrong `MONGODB_URI` password, or Atlas **Network Access** doesn't include `0.0.0.0/0`. |
| Refreshing a route (e.g. `/dashboard`) → 404 on Vercel | Missing `Front-end/vercel.json` SPA rewrite (see [step 6](#6-deploy-the-frontend--vercel)). |
| Frontend calls `localhost:5000` in production | `VITE_API_URL` wasn't set at build time, or you changed it without redeploying (Vite bakes env vars into the build). |
| SuperAdmin login fails after a redeploy | Ephemeral filesystem wiped `secure/`. Re-run `npm run setup:superadmin`, or attach a persistent volume. |
| OTP emails never arrive | Check the startup log for `✅ Email Provider: …` and **Admin → Monitoring → Email** for the failure reason. Gmail SMTP needs an **app password**, not the account password. If the host blocks outbound `465`/`587`, switch to `EMAIL_PROVIDER=gmail` (sends over HTTPS). Full table: [Backend README → Email](../Backend/README.md#troubleshooting). |
| AI tools always say "out of service" | No valid AI key set, or all keys invalid/rate-limited. Add a `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, or `GROQ_API_KEY`. This is expected, non-fatal behavior — the app never crashes on an AI outage. |
| Render service slow to respond | Free instances sleep after inactivity and cold-start (~30s). Upgrade or use a keep-alive ping. |
| **Admin OTP login bounces back to `/admin-panel/login`** ("missing token"), but works locally | The `admin_token` cookie is cross-site (Vercel → Railway) and needs `SameSite=None; Secure`. Requires `app.set('trust proxy', 1)` — without it Express sees the proxy's plain HTTP and never marks the cookie `Secure`, so the browser drops it. Both are in the code; if it recurs, confirm they survived a revert. |
| **Logged in, then a refresh kicks you to `/login`** | The refresh token isn't persisting. It must be written to `localStorage` (not `sessionStorage`, which a full reload wipes) in `Front-end/src/utils/tokenManager.js`. Also confirm `vercel.json` exists — without the SPA rewrite, deep links 404 and force the reload that triggers this. |
| **`/sitemap.xml` returns HTML** (or your React app) | The proxy isn't matching. In `vercel.json`, `/sitemap.xml` must appear **before** the `/(.*)` catch-all — first match wins. Redeploy the frontend after fixing. |
| **`/sitemap.xml` returns `{"success":false,"message":"Route not found"}`** | The proxy reached the backend, but that backend is running code without the sitemap route. Deploy the backend (see [2.5](#25-deploy-order-backend-first)). |
| Sitemap lists the wrong domain | `PUBLIC_SITE_URL` isn't set on the backend, so it fell back to the first entry of the `FRONTEND_URL` CSV — which may be the long auto-generated Vercel host, not your canonical domain. |
| Sitemap only has ~15 URLs | Only the static routes are listed; the database queries returned nothing. Check the backend logs for `[sitemap] skipped …` warnings — each source is guarded, so a failing query degrades that section silently rather than erroring. |
| **Login returns 403 "Security verification failed"** | reCAPTCHA rejected the request. Most likely the domain isn't registered on the key — add every live domain (and `localhost` for dev) at [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin); an unlisted domain is silently rejected. Also check `VITE_RECAPTCHA_SITE_KEY` (frontend) and `RECAPTCHA_SECRET_KEY` (backend) are from the **same** key pair. |
| Social links show no preview card | `og:image` must be an **absolute** URL — crawlers don't resolve relative paths. Check the hardcoded origin in `Front-end/index.html` matches the live domain. |

---

<sub>Deploy backend → get URL → deploy frontend with that URL → set backend CORS to the frontend URL → redeploy backend. That loop is the whole thing. Backend always goes first: the frontend proxies `/sitemap.xml` to it.</sub>
