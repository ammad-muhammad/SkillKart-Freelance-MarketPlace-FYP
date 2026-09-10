import { Capacitor } from '@capacitor/core';

// Two signals, either is sufficient:
//  - VITE_APP_TARGET=mobile — set at build time only for the Capacitor
//    bundle (see package.json's build:mobile / .env.mobile). Lets
//    AppRoutes.jsx skip registering public marketing routes entirely for
//    that build.
//  - Capacitor.isNativePlatform() — a runtime fallback so the same check
//    is still correct if the web-mode env var isn't set for some reason;
//    returns false in a plain browser tab, so it never affects the
//    Vercel-hosted web app.
export const isMobileApp = () =>
  import.meta.env.VITE_APP_TARGET === 'mobile' || Capacitor.isNativePlatform();
