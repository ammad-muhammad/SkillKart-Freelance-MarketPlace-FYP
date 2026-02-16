class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenRefreshTimeout = null;
    this.logoutCallbacks = []; // ✅ Store logout callbacks
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
    
    if (refreshToken) {
      sessionStorage.setItem('rt', this.encryptToken(refreshToken));
    }
    
    this.scheduleTokenRefresh();
  }

  getAccessToken() {
    return this.accessToken;
  }

  getRefreshToken() {
    const encrypted = sessionStorage.getItem('rt');
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