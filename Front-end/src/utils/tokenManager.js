const ACCESS_TOKEN_KEY = 'at';
const REFRESH_TOKEN_KEY = 'rt';

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

  // Decrypt without side effects — a corrupt/foreign stored token during
  // bootstrap should simply be ignored, never trigger a logout cascade.
  restoreAccessToken() {
    try {
      const encrypted = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (!encrypted) return null;
      const key = this.generateKey();
      const decoded = atob(encrypted)
        .split('')
        .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
        .join('');
      // A valid JWT has two dots; reject anything that didn't decrypt cleanly.
      return decoded && decoded.split('.').length === 3 ? decoded : null;
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

    // Persist the access token so it survives a full page reload (it used to
    // live in memory only, which is why reloading the dashboard dropped the
    // session and bounced the user to the home/login page).
    if (accessToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, this.encryptToken(accessToken));
    }

    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, this.encryptToken(refreshToken));
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
    const encrypted = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    return encrypted ? this.decryptToken(encrypted) : null;
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

  encryptToken(token) {
    const key = this.generateKey();
    return btoa(
      token.split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      ).join('')
    );
  }

  decryptToken(encrypted) {
    try {
      const key = this.generateKey();
      return atob(encrypted)
        .split('')
        .map((char, i) => 
          String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        )
        .join('');
    } catch (error) {
      console.error('Token decryption failed:', error);
      this.triggerLogout('Invalid session'); // ✅ Auto-logout on decrypt failure
      return null;
    }
  }

  generateKey() {
    return `${navigator.userAgent}-${window.location.hostname}`.slice(0, 50);
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
    return refreshToken;
  }

  hasValidToken() {
    return !!(this.accessToken || this.getRefreshToken());
  }
}

export const tokenManager = new TokenManager();