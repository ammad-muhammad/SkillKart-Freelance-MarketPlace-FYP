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

> Vite only exposes variables prefixed with `VITE_` to the client.

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

## Notes

- **Toasts** — use `showSafeToast` / `safeToast` from [`src/utils/safeToast.js`](src/utils/safeToast.js). It renders a plain DOM node and can't crash the tree the way `react-toastify@9` does under React 19.
- **AI failures** — any AI request failure (a `503`, a timeout, or a network error on `/ai/*` and `/matchmaking`) is caught centrally in [`src/api/client.js`](src/api/client.js) and surfaces a single "AI is temporarily out of service" toast. Individual AI features (Buddy, Cost Estimator, Matchmaking, CV parsing) also degrade gracefully in-place — they never crash the page.
