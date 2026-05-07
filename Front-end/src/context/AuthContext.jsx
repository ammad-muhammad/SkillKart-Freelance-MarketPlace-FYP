// src/context/AuthContext.jsx
import { createContext, useState, useEffect, useRef, useMemo } from 'react';
import { authAPI } from '../api/auth';
import { tokenManager } from '../utils/tokenManager';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimeout = useRef(null);
  const isCheckingAuth = useRef(false);

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
  }, []);

  const setupSecurityFeatures = () => {
    setupInactivityTimer();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      window.location.href = '/login';
    }
  };

  const handleOnline = async () => {
    console.log('Connection restored');
    if (tokenManager.hasValidToken()) {
      try {
        await authAPI.getCurrentUser();
      } catch (error) {
        logout('Session invalid after reconnection');
      }
    }
  };

  const handleOffline = () => {
    console.log('Connection lost - working offline');
    toast.warning('You are offline. Some features may not work.');
  };

  const handleBeforeUnload = () => {
    // Optional: Clear tokens on tab close for extra security
    // tokenManager.clearTokens();
  };

  const handleVisibilityChange = async () => {
    if (!document.hidden && tokenManager.hasValidToken()) {
      try {
        await authAPI.getCurrentUser();
      } catch (error) {
        logout('Session expired');
      }
    }
  };

  const handleAutoLogout = (reason) => {
    setUser(null);
    toast.error(reason);
    window.location.href = '/login';
  };

  const checkAuth = async () => {
    if (isCheckingAuth.current) {
      return;
    }
    
    isCheckingAuth.current = true;
    
    const refreshToken = tokenManager.getRefreshToken();
    
    if (!refreshToken) {
      setLoading(false);
      isCheckingAuth.current = false;
      return;
    }

    try {
      if (!tokenManager.getAccessToken()) {
        const { data } = await authAPI.refreshToken(refreshToken);
        tokenManager.setTokens(
          data.data.accessToken,
          refreshToken
        );
      }
      
      const { data } = await authAPI.getCurrentUser();
      setUser(data.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      
      if (error.response?.status === 401) {
        logout('Session expired');
      } else if (error.response?.status === 403) {
        logout('Access forbidden');
      } else {
        tokenManager.clearTokens();
      }
    } finally {
      setLoading(false);
      isCheckingAuth.current = false;
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const { data } = await authAPI.verifyOTP(email, otp);
      
      tokenManager.setTokens(
        data.data.tokens.accessToken,
        data.data.tokens.refreshToken
      );
      
      const userData = await authAPI.getCurrentUser();
      setUser(userData.data.data.user);
      
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
      console.log(supabaseAccessToken, supabaseRefreshToken)
      // Send Supabase tokens to YOUR backend
      const { data } = await authAPI.supabaseAuth(supabaseAccessToken, supabaseRefreshToken);
      
      // Store YOUR backend tokens
      tokenManager.setTokens(
        data.data.tokens.accessToken,
        data.data.tokens.refreshToken
      );
      
      setUser(data.data.user);
      
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
      tokenManager.clearTokens();
      setUser(null);
      
      // Notify other tabs to logout
      localStorage.setItem('logout-event', Date.now().toString());
      setTimeout(() => localStorage.removeItem('logout-event'), 100);
      
      toast.info(message);
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    verifyOtp,
    handleSupabaseOAuth,
    logout,
    isAuthenticated: !!user,
    getAccessToken: () => tokenManager.getAccessToken(),
    refreshAuth: checkAuth
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};