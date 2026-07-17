# SkillKart — Frontend

The SkillKart single-page app: a React 19 + Vite client for the marketplace, covering public browsing, freelancer and client dashboards, the contract lifecycle, messaging, and the admin panel.

> Part of the [SkillKart monorepo](../README.md). For full-stack setup, start there.

## Tech Stack

- **React 19** with **Vite 7** (HMR, fast builds)
- **React Router 7** for routing
- **React Hook Form** for forms
- **Axios** for the API layer
- **Framer Motion** & **GSAP** for animation
- **Chart.js** (`react-chartjs-2`) for dashboards
- **Tailwind v4** + custom CSS
- **lucide-react** for icons; toast notifications via a small dependency-free `utils/safeToast.js` (react-toastify@9 is unreliable under React 19)

## Prerequisites

- Node.js ≥ 18, npm ≥ 9
- The [backend API](../Backend/README.md) running (default `http://localhost:5000/api/v1`)

## Setup

```bash
npm install
cp .env.example .env    # set VITE_API_URL to your backend, e.g. http://localhost:5000/api/v1
npm run dev
```

The dev server runs at **http://localhost:3001**.

## Environment Variables

See [`.env.example`](.env.example):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api/v1`) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional Supabase client for social OAuth |
| `VITE_RECAPTCHA_SITE_KEY` | Optional reCAPTCHA v3 **public** site key. Blank = disabled |
| `VITE_ENVIRONMENT` | Set to `production` to force console silence in a dev-mode build |

> Vite only exposes variables prefixed with `VITE_` to the client. Everything here
> ships in the bundle and is publicly readable — never put a secret in a `VITE_` var.
> (The reCAPTCHA *site* key is designed to be public; its *secret* lives in the backend.)

## Project Structure

```
src/
├── pages/          Route pages, grouped by audience:
│   ├── public/         landing, browse, categories, public profiles, AI tools
│   ├── client/         client dashboard & workflows
│   ├── freelancer/     freelancer dashboard & workflows
│   ├── admin/          admin views
│   ├── adminPanel/     isolated admin panel
│   └── common/         shared authenticated pages
├── Components/     Reusable UI components
├── layouts/        Route layouts (shells, sidebars)
├── context/        React Context providers (auth, ...)
├── api/            Axios API clients
├── hooks/          Custom React hooks
├── routes/         Route configuration & guards
├── styles/         Global styles
├── constants/      App constants
├── utils/          Helpers
├── App.jsx         Root component
└── main.jsx        Entry point
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server (port 3001) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint the source with ESLint |

## SEO & PWA assets

Static files in [`public/`](public/) are copied to `dist/` verbatim and served from
the site root:

| File | Purpose |
|------|---------|
| `robots.txt` | Crawl rules. Blocks auth flows, dashboards, `/admin-panel/`, transactional pages. Points crawlers at the **backend's** `/sitemap.xml` (see below) |
| `site.webmanifest` | PWA manifest — installable app, shortcuts, theme colour |
| `favicon.svg`, `favicon-16/32/48.png` | Browser tab icons |
| `apple-touch-icon.png` | iOS home screen (180×180) |
| `icon-192/512.png`, `icon-maskable-192/512.png` | PWA icons; maskable variants are full-bleed so Android can crop to any shape |
| `og-image.png` | 1200×630 social share card |

The marks are the same SVG the Navbar renders, in the brand palette
(`--color-accent` on `--color-primary`).

**The sitemap is not a file here** — public content (jobs, gigs, profiles) lives in
Mongo, so it's generated live by the API (see
[Backend README → SEO](../Backend/README.md#seo--sitemap--robots)). [`vercel.json`](vercel.json)
proxies `/sitemap.xml` to the backend so the canonical URL is still same-origin with
the pages it lists, which is simpler for crawlers than a cross-domain pointer.

> **Rewrite order matters.** The `/sitemap.xml` proxy must stay *above* the SPA
> catch-all `/(.*)` in `vercel.json` — first match wins, so reversing them sends the
> sitemap to `index.html`. The proxy destination hardcodes the backend host; update
> it if that changes. Locally the proxy doesn't apply, so use the backend directly:
> `http://localhost:5000/sitemap.xml`.

`index.html` carries the Open Graph / Twitter card tags. **`og:image`, `og:url` and
`canonical` must stay absolute URLs** — crawlers don't resolve relative paths, and a
relative `og:image` silently produces no preview card. They're also what stops
Vercel's auto-generated `*.vercel.app` domain from being indexed as a duplicate.
Per-page `<title>` is set at runtime by each page (`document.title`); the tag in
`index.html` is only the fallback.

## reCAPTCHA v3

Invisible bot mitigation. [`src/utils/recaptcha.js`](src/utils/recaptcha.js) mints a
token per protected action; [`src/api/client.js`](src/api/client.js) attaches it as
`x-recaptcha-token` via the request interceptor, so **call sites need no changes** —
add a path to `RECAPTCHA_ACTIONS` there and it's covered.

The script is loaded **lazily on first use**, not in `index.html`: it's ~300KB of
third-party JS plus a persistent badge, and most visitors never submit a protected
form. With no `VITE_RECAPTCHA_SITE_KEY` set, nothing loads at all.

`getRecaptchaToken()` resolves to `null` rather than throwing when reCAPTCHA is
unconfigured or blocked (ad blockers, offline). The backend fails open to match, so
a captcha problem can't lock users out. Action names must match the server's
`verifyRecaptcha(action)` exactly or the token is rejected as a replay.

> The v3 badge must stay visible unless you disclose reCAPTCHA in your UI text —
> Google's terms. `hideRecaptchaBadge()` exists for when that disclosure is added.

## Notes

- **Toasts** — use `showSafeToast` / `safeToast` from [`src/utils/safeToast.js`](src/utils/safeToast.js). It renders a plain DOM node and can't crash the tree the way `react-toastify@9` does under React 19.
- **Console output** — use `log` / `warn` / `error` from [`src/utils/logger.js`](src/utils/logger.js), never bare `console.*`. Production builds compile `log`/`warn`/`info`/`debug` to a no-op (gated on Vite's `import.meta.env.DEV`, with `VITE_ENVIRONMENT=production` as an explicit override); `error` always survives so real failures stay diagnosable.
- **404** — unknown routes redirect to `/404` ([`src/pages/public/NotFound/`](src/pages/public/NotFound/)), passing the attempted path in history state so the page can show what was requested.
- **AI failures** — any AI request failure (a `503`, a timeout, or a network error on `/ai/*` and `/matchmaking`) is caught centrally in [`src/api/client.js`](src/api/client.js) and surfaces a single "AI is temporarily out of service" toast. Individual AI features (Buddy, Cost Estimator, Matchmaking, CV parsing) also degrade gracefully in-place — they never crash the page.
