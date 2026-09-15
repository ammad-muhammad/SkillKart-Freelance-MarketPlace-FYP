import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isMobileApp } from '../utils/platform';
import { log, warn } from '../utils/logger';

const CALLBACK_PREFIX = 'skillkart://auth-callback';

/**
 * Catches the system-browser redirect Supabase sends social login to on the
 * native app (see Login.jsx's handleSocialLogin, and the matching
 * AndroidManifest.xml intent-filter for the `skillkart://auth-callback`
 * scheme). Without this, that redirect targets `https://localhost` (the
 * WebView's fixed, unreachable origin) and Supabase silently falls back to
 * whatever Site URL is configured on its dashboard — stranding the user on
 * the public website instead of back in the app.
 *
 * Hands the token fragment off to the existing `/auth/consent` route rather
 * than re-implementing its token-parsing/backend-handshake/role-based
 * redirect logic here — same handling as the web OAuth flow, just reached
 * via a deep link instead of a normal browser navigation.
 */
export default function useGoogleAuthDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMobileApp()) return undefined;

    let handle;
    App.addListener('appUrlOpen', ({ url }) => {
      if (!url || !url.startsWith(CALLBACK_PREFIX)) return;

      log('🔐 Google auth deep link received');
      Browser.close().catch(() => {}); // dismiss the Chrome Custom Tab the OAuth flow ran in

      const hashIndex = url.indexOf('#');
      const fragment = hashIndex !== -1 ? url.slice(hashIndex + 1) : '';
      if (!fragment) {
        warn('[useGoogleAuthDeepLink] callback URL had no token fragment:', url);
        navigate('/login', { replace: true });
        return;
      }
      navigate(`/auth/consent#${fragment}`, { replace: true });
    }).then((h) => { handle = h; });

    return () => { handle?.remove(); };
  }, [navigate]);
}
