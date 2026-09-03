import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuth } from '../api/adminPanel';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin]       = useState(null);   // { email, role, permissions, loginAt, expiresAt }
  const [loading, setLoading]   = useState(true);   // initial session check
  const [ready, setReady]       = useState(false);  // true once first check done

  // ─── Restore session on mount ──────────────────────────────────────────────
  // This provider wraps the whole app, but the admin session only matters inside
  // the admin panel. Skip the getSession() probe entirely on the public site /
  // marketplace so normal visitors don't fire a guaranteed-401 request on every
  // page load (and can never be bounced to the admin login).
  useEffect(() => {
    const inAdminPanel = window.location.pathname.startsWith('/admin-panel');
    if (!inAdminPanel) {
      setLoading(false);
      setReady(true);
      return;
    }

    let cancelled = false;

    const restore = async () => {
      try {
        const res = await adminAuth.getSession();
        if (!cancelled && res?.session) {
          setAdmin(res.session);
        }
      } catch {
        // 401 → not logged in; interceptor handles redirect if needed
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    };

    restore();
    return () => { cancelled = true; };
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    const res = await adminAuth.login({ email, password });
    return res; // returns { success, message } — OTP step
  }, []);

  const verifyOtp = useCallback(async (otp) => {
    const res = await adminAuth.verifyOtp({ otp });
    if (res?.admin) {
      setAdmin(res.admin);
    }
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminAuth.logout();
    } catch {
      // swallow
    } finally {
      setAdmin(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await adminAuth.getSession();
      if (res?.session) setAdmin(res.session);
    } catch {
      setAdmin(null);
    }
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const isAuthenticated = !!admin;

  const hasPermission = (permission) => {
    if (!admin) return false;
    return admin.role === 'super_admin' || admin.permissions?.includes(permission);
  };

  const value = {
    admin,
    loading,
    ready,
    isAuthenticated,
    hasPermission,
    login,
    verifyOtp,
    logout,
    refreshSession
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
};

export default AdminAuthContext;
