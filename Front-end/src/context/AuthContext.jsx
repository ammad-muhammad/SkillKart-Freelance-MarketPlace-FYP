// src/context/AuthContext.jsx
import { createContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { tokenManager } from '../utils/tokenManager';
import { clearPushToken } from '../utils/pushToken';
import { normalizeAuthUser } from '../utils/user';
import { safeToast as toast } from '../utils/safeToast';
import { log } from "../utils/logger";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimeout = useRef(null);
  const isCheckingAuth = useRef(false);
  const lastCheckedAuth = useRef(0);
  const AUTH_CHECK_THROTTLE = 60 * 1000; // Only check once per minute on visibility/online

  const setAuthUser = useCallback((nextUser) => {
    setUser(normalizeAuthUser(nextUser));
  }, []);

  useEffect(() => {
    checkAuth();
    setupSecurityFeatures();
    
    tokenManager.onLogout((reason) => {
      handleAutoLogout(reason);
    });
    
    return () => {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
    };
    // Mount-only: checkAuth/setupSecurityFeatures are plain functions redefined
    // every render, not stable useCallback refs — adding them here would re-run
    // this setup (re-attaching all the window/document listeners) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupSecurityFeatures = () => {
    setupInactivityTimer();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('account-blocked', handleAccountBlocked);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('account-blocked', handleAccountBlocked);
    };
  };

  const handleAccountBlocked = (e) => {
    setUser(prev => prev ? { ...prev, isBlocked: true, blockedReason: e.detail } : null);
  };

  const setupInactivityTimer = () => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    const resetTimer = () => {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
      
      if (tokenManager.hasValidToken()) {
        inactivityTimeout.current = setTimeout(() => {
          logout('Session expired due to inactivity');
        }, INACTIVITY_TIMEOUT);
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();
  };

  const handleStorageChange = (e) => {
    if (e.key === 'logout-event') {
      tokenManager.clearTokens();
      setUser(null);
      toast.info('Logged out from another tab');
      // ProtectedRoutes will handle redirection gracefully without a hard reload.
    }
  };

  const handleOnline = async () => {
    log('Connection restored');
    const now = Date.now();
    if (tokenManager.hasValidToken() && (now - lastCheckedAuth.current > AUTH_CHECK_THROTTLE)) {
      try {
        await authAPI.getCurrentUser();
        lastCheckedAuth.current = now;
      } catch {
        logout('Session invalid after reconnection');
      }
    }
  };

  const handleOffline = () => {
    log('Connection lost - working offline');
    toast.warning('You are offline. Some features may not work.');
  };

  const handleBeforeUnload = () => {
    // Optional: Clear tokens on tab close for extra security
    // tokenManager.clearTokens();
  };

  const handleVisibilityChange = async () => {
    const now = Date.now();
    if (!document.hidden && tokenManager.hasValidToken() && (now - lastCheckedAuth.current > AUTH_CHECK_THROTTLE)) {
      try {
        await authAPI.getCurrentUser();
        lastCheckedAuth.current = now;
      } catch {
        logout('Session expired');
      }
    }
  };

  const handleAutoLogout = (reason) => {
    setUser(null);
    toast.error(reason);
    // ProtectedRoutes will handle redirection gracefully without a hard reload.
  };

  const checkAuth = async (force = false) => {
    // Re-entrancy guard. The previous version could `return` here while
    // leaving `loading === true` forever if a concurrent check was in flight
    // (StrictMode double-invoke, visibility/online handlers). That stuck the
    // ProtectedRoute on its loading screen / let a stale evaluation bounce the
    // user. We never early-return without also resolving `loading`.
    if (isCheckingAuth.current) {
      return;
    }

    const now = Date.now();
    if (!force && user && (now - lastCheckedAuth.current < AUTH_CHECK_THROTTLE)) {
      setLoading(false);
      return;
    }

    isCheckingAuth.current = true;

    const refreshToken = tokenManager.getRefreshToken();

    // No refresh token at all → genuinely unauthenticated. Resolve and stop.
    if (!refreshToken) {
      setUser(null);
      setLoading(false);
      isCheckingAuth.current = false;
      return;
    }

    try {
      // If the access token was lost (e.g. memory-only in a prior version, or
      // never persisted), mint a fresh one from the refresh token first so the
      // /auth/me call below is always authenticated.
      if (!tokenManager.getAccessToken()) {
        const { data } = await authAPI.refreshToken(refreshToken);
        // Keep the ROTATED refresh token the server just issued (same as the
        // 401 interceptor in api/client.js). Re-saving the old one made the
        // next fresh tab / browser restart replay an already-rotated token,
        // which the backend treats as theft and logs the user out everywhere.
        tokenManager.setTokens(data.data.accessToken, data.data.refreshToken || refreshToken);
      }

      const { data } = await authAPI.getCurrentUser();
      setAuthUser(data.data.user);
      lastCheckedAuth.current = Date.now();
    } catch (error) {
      console.error('Auth check failed:', error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token is invalid/expired → clear and treat as logged out, but do NOT
        // hard-redirect from here; let ProtectedRoute decide based on `user`.
        tokenManager.clearTokens();
        setUser(null);
      } else {
        // Network/transient error: keep tokens, just clear in-memory user.
        // The user can retry; we don't want a blip to destroy a valid session.
        setUser(null);
      }
    } finally {
      setLoading(false);
      isCheckingAuth.current = false;
    }
  };

  const handleLoginResponse = async (loginData) => {
    try {
      const { data } = loginData;
      
      // If 2FA is required, we don't have tokens yet
      if (data.requires2FA) {
        return { requires2FA: true, email: data.email };
      }

      // If direct login (2FA disabled), set tokens and user
      if (data.tokens) {
        tokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken
        );
        setAuthUser(data.user);
        toast.success(`Welcome back, ${data.user.firstName || data.user.email}!`);
        return { requires2FA: false };
      }
      
      return { requires2FA: false };
    } catch (error) {
      console.error('Error handling login response:', error);
      throw error;
    }
  };

  const verifyOtp = async (email, otp, purpose = 'email_verification') => {
    try {
      const { data } = await authAPI.verifyOTP(email, otp, purpose);
      
      tokenManager.setTokens(
        data.data.tokens.accessToken,
        data.data.tokens.refreshToken
      );
      
      const userData = await authAPI.getCurrentUser();
      setAuthUser(userData.data.data.user);
      
      toast.success('OTP Verified!');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP Verification Failed');
      throw error;
    }
  };

  // ✅ Handle Supabase OAuth (Google, GitHub, LinkedIn)
  const handleSupabaseOAuth = async (supabaseAccessToken, supabaseRefreshToken) => {
    try {
      // Send Supabase tokens to YOUR backend
      const { data } = await authAPI.supabaseAuth(supabaseAccessToken, supabaseRefreshToken);

      // Store YOUR backend tokens
      tokenManager.setTokens(
        data.data.tokens.accessToken,
        data.data.tokens.refreshToken
      );

      setAuthUser(data.data.user);
      lastCheckedAuth.current = Date.now(); // mark as freshly checked so passive re-checks throttle

      const userName = data.data.user.name || data.data.user.email;
      toast.success(`Welcome back, ${userName}!`);

      return data;
    } catch (error) {
      console.error('OAuth login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      throw error;
    }
  };

  const logout = async (message = 'Logged out successfully') => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearPushToken(); // the server unregistered this device in the logout call above
      tokenManager.clearTokens();
      setUser(null);
      // A stale redirect from a previous session (e.g. "Apply Now" set this
      // before the user wandered off and logged out instead) must not
      // silently redirect an unrelated future login.
      try { sessionStorage.removeItem('postLoginRedirect'); } catch { /* non-fatal */ }

      // Notify other tabs to logout
      localStorage.setItem('logout-event', Date.now().toString());
      setTimeout(() => localStorage.removeItem('logout-event'), 100);

      // `logout` is a common bare onClick={logout} target — React then calls
      // it with the click event as `message`, which used to render as
      // "[object Object]" in the toast instead of the intended default.
      toast.info(typeof message === 'string' ? message : 'Logged out successfully');
      navigate('/login');
    }
  };

  const refreshUser = async () => {
    const { data } = await authAPI.getCurrentUser();
    const freshUser = normalizeAuthUser(data.data.user);
    setAuthUser(freshUser);
    lastCheckedAuth.current = Date.now();
    return freshUser;
  };

  const value = useMemo(() => ({
    user,
    loading,
    verifyOtp,
    handleLoginResponse,
    handleSupabaseOAuth,
    logout,
    isAuthenticated: !!user,
    isClient: user?.role === 'client',
    isFreelancer: user?.role === 'freelancer',
    getAccessToken: () => tokenManager.getAccessToken(),
    // Explicit refreshAuth() calls always FORCE a fresh /auth/me fetch, bypassing
    // the visibility/online throttle. Callers use this right after mutating the
    // account (e.g. selecting a role) and must see the updated user immediately —
    // otherwise a throttled no-op leaves user.role stale and route guards bounce
    // the user to /unauthorized.
    refreshAuth: () => checkAuth(true),
    refreshUser
    // The handler functions below are plain (non-useCallback) closures redefined
    // every render, but they only ever read `user`/refs — never anything else
    // that changes independently — so memoizing on [user, loading] alone is safe
    // and avoids handing consumers a new `value` object (and re-render) every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};