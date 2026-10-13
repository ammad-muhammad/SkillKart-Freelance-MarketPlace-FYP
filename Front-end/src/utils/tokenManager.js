const ACCESS_TOKEN_KEY = 'at';
const REFRESH_TOKEN_KEY = 'rt';

// Lightweight obfuscation for the refresh token at rest in localStorage — not
// real encryption (the key ships in the same JS bundle, so it can't stop an
// attacker who already has code execution via XSS), but it does stop the
// much more common case of a casual script/extension that just greps
// Web Storage for anything JWT-shaped. Real damage limitation comes from
// pairing this with a short-lived token + tokenVersion invalidation on
// password change (see Backend auth.service.js), not from obfuscation alone.
const OBFUSCATION_KEY = 'skillkart-rt-v1';
const xorObfuscate = (str, key) => {
  const xored = str.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
  return btoa(xored);
};
const xorDeobfuscate = (encoded, key) => {
  try {
    const xored = atob(encoded);
    return xored.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
  } catch {
    return null;
  }
};

class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenRefreshTimeout = null;
    this.logoutCallbacks = []; // ✅ Store logout callbacks (init before any restore)

    // Restore the access token from sessionStorage so a page reload does not
    // lose the session and force a /auth/refresh round-trip before the user
    // can be hydrated. Refresh token is already persisted (key 'rt').
    this.accessToken = this.restoreAccessToken();
  }

  // Restore the access token from sessionStorage
  restoreAccessToken() {
    try {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return null;
      // A valid JWT has two dots; reject anything that is completely malformed.
      return token.split('.').length === 3 ? token : null;
    } catch {
      return null;
    }
  }

  // ✅ Register logout callback
  onLogout(callback) {
    this.logoutCallbacks.push(callback);
  }

  // ✅ Trigger all logout callbacks
  triggerLogout(reason = 'Session expired') {
    this.clearTokens();
    this.logoutCallbacks.forEach(callback => callback(reason));
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;

    if (accessToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }

    if (refreshToken) {
      // Refresh token goes in localStorage so a full-page reload (or a Vercel
      // deep-link reload) does NOT destroy the session. sessionStorage is wiped
      // on reload/tab-close, which was bouncing users back to /login after OTP.
      // On reload, checkAuth() mints a fresh access token from this.
      // Stored obfuscated (see xorObfuscate doc comment above) rather than raw.
      localStorage.setItem(REFRESH_TOKEN_KEY, xorObfuscate(refreshToken, OBFUSCATION_KEY));
    }

    this.scheduleTokenRefresh();
  }

  getAccessToken() {
    // Fall back to the persisted copy in case this instance was re-created
    // (e.g. HMR) without setTokens having run this session.
    if (!this.accessToken) {
      this.accessToken = this.restoreAccessToken();
    }
    return this.accessToken;
  }

  getRefreshToken() {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!stored) return null;
    const deobfuscated = xorDeobfuscate(stored, OBFUSCATION_KEY);
    // A valid JWT has two dots — if de-obfuscation produces garbage (e.g. a
    // raw, pre-obfuscation token from a session written before this change),
    // fall back to treating the stored value as already-plaintext so
    // existing sessions aren't force-logged-out by this change.
    if (deobfuscated && deobfuscated.split('.').length === 3) return deobfuscated;
    return stored.split('.').length === 3 ? stored : null;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    sessionStorage.clear();
    localStorage.clear();
    
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }



  scheduleTokenRefresh() {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }
    
    const refreshTime = 55 * 60 * 1000;
    
    this.tokenRefreshTimeout = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        this.triggerLogout('Token refresh failed'); // ✅ Auto-logout on refresh failure
      }
    }, refreshTime);
  }

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Deliberately a raw fetch() rather than importing api/client.js's axios
    // instance: that module imports tokenManager (for attaching the auth
    // header / handling 401s), so importing it back here would create a
    // circular dependency between the two modules.
    const baseURL = import.meta.env.VITE_API_URL;
    const res = await fetch(`${baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('Token refresh failed');

    const body = await res.json();
    const newAccessToken = body?.data?.accessToken;
    const newRefreshToken = body?.data?.refreshToken;
    if (!newAccessToken) throw new Error('Token refresh response missing accessToken');

    this.accessToken = newAccessToken;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
    // The backend rotates the refresh token on every use — the old one is
    // invalidated server-side, so the new one MUST replace it here or the
    // next refresh attempt will fail (treated as reuse of a rotated token).
    if (newRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, xorObfuscate(newRefreshToken, OBFUSCATION_KEY));
    }
    return newAccessToken;
  }

  hasValidToken() {
    return !!(this.accessToken || this.getRefreshToken());
  }
}

export const tokenManager = new TokenManager();