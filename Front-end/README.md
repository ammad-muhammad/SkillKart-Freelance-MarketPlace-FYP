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

## Mobile App (Android / Capacitor)

The same React codebase ships as a native Android app via [Capacitor](https://capacitorjs.com/) — no separate mobile codebase or rewrite. `capacitor.config.json` sets `androidScheme: "https"`, so the WebView's requests present a fixed origin of `https://localhost` (not a real host — nothing is ever served there; it's purely a CORS identity).

### Building it

```bash
npm run build:mobile   # vite build --mode mobile — loads .env.mobile instead of .env
npm run cap:sync       # build:mobile, then `npx cap sync` copies dist/ into android/
npm run cap:android    # cap:sync, then opens the project in Android Studio
```

`.env.mobile` needs real, live values — this build talks to your **deployed** backend,
not localhost:

| Variable | Notes |
|----------|-------|
| `VITE_APP_TARGET=mobile` | Tells `AppRoutes.jsx` this is the native build (see below) |
| `VITE_API_URL` | The **production** backend URL (e.g. Railway), not `localhost:5000` |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Same as `.env.prod` |
| `VITE_RECAPTCHA_SITE_KEY` | **Deliberately left unset** — see reCAPTCHA note below |

Building the actual `.apk`, once `cap:sync` has run:

```bash
cd android
JAVA_HOME="<path to a JDK Gradle 8.x supports>" ./gradlew.bat assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

> ⚠️ **JDK version gotcha.** Android Studio's bundled JDK (`Android Studio/jbr`) can
> silently auto-update itself past what the project's pinned Gradle version
> supports — a JDK 25 JBR broke a Gradle 8.14.3 build outright
> (`Unsupported class file major version 69`) mid-project with no code changes
> involved. If Gradle suddenly can't even evaluate `settings.gradle`, check
> `java -version` for whatever `JAVA_HOME` points at first. A cached older JBR
> under `~/.jdks/` (left behind by a previous Android Studio/IntelliJ version) is
> often a quick fix — point `JAVA_HOME` at that instead of the current bundled one.

### What's mobile-only

`isMobileApp()` (`src/utils/platform.js`) is true when `VITE_APP_TARGET=mobile` (this
build) **or** `Capacitor.isNativePlatform()` (a runtime fallback, harmless on web).
`AppRoutes.jsx` uses it to skip registering every public-marketing route entirely in
this build — there's no landing page, no `/browse-projects`, no public profiles, just
the auth flow plus the client/freelancer/admin-panel dashboards. Those excluded pages
(`About`, `BrowseProjects`, `JobDetails`, `GigDetail`, the AI Tools pages, the Skills
pages, both public profile pages, all four legal pages) are `React.lazy()`-loaded —
their code (and assets, including a large hero image on `About`) is fetched only when
a **web** visitor actually navigates there, never bundled into what the mobile app
parses at startup.

Two links that point at now-excluded routes (client onboarding's "Service Agreement"
checkbox, and the client dashboard's "Cost Estimator" link in Post Project) detect
`isMobileApp()` and open the live website in an external browser tab instead of
404ing against a route that was never registered.

### CORS

The mobile app's fixed origin (`https://localhost`) must be in the backend's
`CORS_ORIGIN` env var, or every request gets blocked. This is a real origin string
someone could also send from a raw script — it isn't unique to genuine app traffic —
so it's not a security boundary on its own; normal auth + rate limiting still apply.

### reCAPTCHA

`VITE_RECAPTCHA_SITE_KEY` is deliberately **unset** in `.env.mobile`
(`src/utils/recaptcha.js` no-ops entirely with no site key — no script load, no
console errors). Google's reCAPTCHA v3 script is a browser-page product and is
unreliable inside an embedded WebView; rather than fight that, the backend's
`verifyRecaptcha` middleware exempts requests whose `Origin` is `https://localhost`
outright (`Backend/src/middleware/recaptcha.middleware.js`) — the mobile app was
otherwise hard-failing every login/register with `RECAPTCHA_FAILED` once a real
`RECAPTCHA_SECRET_KEY` was configured in production. Rate limiting + account lockout
remain the actual anti-abuse gate for this origin.

### External links

A plain `<a target="_blank">` or `window.open()` inside a Capacitor WebView has no
tab to open — it just navigates the app itself away, with no browser chrome and no
way back. `src/utils/externalLink.js`'s `openExternal(url)` opens a **Chrome Custom
Tab** instead (`@capacitor/browser`) on mobile, and falls back to normal
`window.open` on web. Used for message/document attachments, portfolio and
certificate links, and profile website links.

### Hardware back button

Unhandled, Android's back button either pops WebView history or exits the process
outright — the latter happens the instant there's no history to pop, e.g. right
after login lands on a dashboard with a fresh history stack.
`src/hooks/useAndroidBackButton.js` wires `@capacitor/app`'s `backButton` event to
React Router's `navigate(-1)` instead, and minimizes the app (rather than exiting)
on root screens (`/login`, the two dashboards, admin-panel dashboard) where there's
nowhere sensible to navigate back to.

### Status bar & app chrome

`App.jsx` styles the status bar to the brand navy with light icons
(`@capacitor/status-bar`) — left at its default, icons meant for a light background
are nearly invisible against the app's dark screens. The app icon and splash screen
are generated from `Front-end/assets/{icon,icon-foreground,splash}.png` via:

```bash
npx @capacitor/assets generate --android \
  --iconBackgroundColor "#042E4C" --iconBackgroundColorDark "#042E4C" \
  --splashBackgroundColor "#042E4C" --splashBackgroundColorDark "#042E4C"
```

Re-run this (then `cap:sync` and rebuild) whenever the brand mark changes — it
overwrites every density bucket under `android/app/src/main/res/`.

### Offline detection

`src/Components/common/NetworkGate/NetworkGate.jsx` shows a dedicated "No Internet
Connection" screen (mobile only) via `@capacitor/network`. It both listens for the
native `networkStatusChange` event **and** polls `Network.getStatus()` every 5
seconds as a backstop — the native event doesn't fire reliably on every Android OEM
skin (aggressive battery optimization can suspend it), so relying on it alone can
miss going offline.

`Network.getStatus()` itself isn't fully trustworthy either — confirmed on at least
one Android emulator image, it reported `connected: false` continuously while the
emulator's actual network (verified with a raw `ping`) was fine, which flipped the
whole app between itself and the offline screen every ~5s (visually: bad flickering).
The gate now requires 3 **consecutive** offline readings before it actually shows
(`OFFLINE_CONFIRM_THRESHOLD`) — any single online reading clears it immediately, so
recovery is still instant but a lone bad reading can't take over the screen.

### Native-only styling

`src/styles/native-app.css` applies only under `html.is-native-app` (the class
`main.jsx` adds when `isMobileApp()` is true) and:
- Disables `backdrop-filter` everywhere — a severe, well-documented jank source on
  Android's WebView, and this app uses it in ~40 files (every modal, dropdown, and
  sidebar).
- Hides the desktop-style scrollbar — a persistent visible scrollbar reads as
  distinctly non-native on a touchscreen; touch scrolling itself is unaffected.

`android/app/src/main/AndroidManifest.xml`'s `MainActivity` also sets
`android:windowSoftInputMode="adjustResize"` — without it, the on-screen keyboard is
unreliable on modern Android WebViews (fails to open, or fights the layout instead
of resizing it).

### Push notifications

See [Backend README → Push Notifications](../Backend/README.md#push-notifications)
for the full setup (Firebase project, service account credential,
`google-services.json`). Client-side registration is
`src/hooks/usePushNotifications.js`.

> ⚠️ **Gated behind `VITE_PUSH_NOTIFICATIONS_ENABLED=true`, and deliberately not
> just try/catch.** Calling `PushNotifications.register()` before
> `android/app/google-services.json` exists throws a native
> `FirebaseApp is not initialized` exception on a background thread —
> Capacitor's bridge doesn't convert it into a rejected promise there, so it's
> an **uncaught crash that takes the whole app down**, invisible to a JS
> try/catch. Leave the env var unset (default) until `google-services.json` is
> actually in place and you've resynced/rebuilt since adding it.

## Notes

- **Toasts** — use `showSafeToast` / `safeToast` from [`src/utils/safeToast.js`](src/utils/safeToast.js). It renders a plain DOM node and can't crash the tree the way `react-toastify@9` does under React 19.
- **Console output** — use `log` / `warn` / `error` from [`src/utils/logger.js`](src/utils/logger.js), never bare `console.*`. Production builds compile `log`/`warn`/`info`/`debug` to a no-op (gated on Vite's `import.meta.env.DEV`, with `VITE_ENVIRONMENT=production` as an explicit override); `error` always survives so real failures stay diagnosable.
- **404** — unknown routes redirect to `/404` ([`src/pages/public/NotFound/`](src/pages/public/NotFound/)), passing the attempted path in history state so the page can show what was requested.
- **AI failures** — any AI request failure (a `503`, a timeout, or a network error on `/ai/*`) is caught centrally in [`src/api/client.js`](src/api/client.js) and surfaces a single "AI is temporarily out of service" toast. Individual AI features (Buddy, Cost Estimator, CV parsing) also degrade gracefully in-place — they never crash the page. **AI Matchmaking is not actually an AI-provider call** — it's a deterministic, code-driven scoring engine (`Backend/src/services/matchmaking.service.js`) — so its API calls pass `{ suppressErrorToast: true }` and [`AiMatchmaking.jsx`](src/pages/public/AiMatchmaking/AiMatchmaking.jsx) shows its own accurate inline error instead of the generic "AI is out of service" copy.
