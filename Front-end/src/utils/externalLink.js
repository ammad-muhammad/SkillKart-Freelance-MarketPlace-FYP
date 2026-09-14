import { Browser } from '@capacitor/browser';
import { isMobileApp } from './platform';
import { warn } from './logger';

/**
 * Opens an external URL. A plain `window.open(url, '_blank')` / `<a target="_blank">`
 * inside the Capacitor WebView has no tabs to open a new one in — it just
 * navigates the app itself away to that URL with no way back (no browser
 * chrome, no in-app back button equivalent). On the native app this opens a
 * Chrome Custom Tab instead (its own back/close controls, layered over the
 * app); on web it's the normal new-tab behavior.
 */
export const openExternal = async (url) => {
  if (!url) return;
  if (isMobileApp()) {
    try {
      await Browser.open({ url });
      return;
    } catch (err) {
      warn('[externalLink] Browser.open failed, falling back to window.open:', err.message);
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};
