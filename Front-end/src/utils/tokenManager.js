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
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
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
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
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
    return refreshToken;
  }

  hasValidToken() {
    return !!(this.accessToken || this.getRefreshToken());
  }
}

export const tokenManager = new TokenManager();