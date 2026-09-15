import { Capacitor } from '@capacitor/core';

// Three signals, either of the first two is sufficient:
//  - VITE_APP_TARGET=mobile|admin — set at build time per Capacitor bundle
//    (see package.json's build:mobile/build:admin + .env.mobile/.env.admin).
//    Lets AppRoutes.jsx (mobile) / AdminAppRoutes.jsx (admin) each register
//    only their own routes for that build.
//  - Capacitor.isNativePlatform() — a runtime fallback so the same check
//    is still correct if the build-time env var isn't set for some reason;
//    returns false in a plain browser tab, so it never affects the
//    Vercel-hosted web app.
// Both native targets share every existing isMobileApp()-gated behavior
// (status bar color, hardware back button, offline network gate, splash/
// boot-screen dismissal, native scrollbar/backdrop-filter CSS fixes) — only
// isAdminApp() below decides which route tree/nav actually renders.
export const isMobileApp = () =>
  ['mobile', 'admin'].includes(import.meta.env.VITE_APP_TARGET) || Capacitor.isNativePlatform();

export const isAdminApp = () => import.meta.env.VITE_APP_TARGET === 'admin';
