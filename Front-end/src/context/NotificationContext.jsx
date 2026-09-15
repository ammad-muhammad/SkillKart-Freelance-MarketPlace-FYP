import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { notificationsAPI } from '../api/notifications';
import { useAuth } from '../hooks/useAuth';

const NotificationContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used inside NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationsAPI.unreadCount();
      setUnreadCount(data?.data?.unreadCount || 0);
    } catch {
      // Ignore network errors in background polling
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const markReadLocal = useCallback((countToSubtract = 1) => {
    setUnreadCount(prev => Math.max(0, prev - countToSubtract));
  }, []);

  const markAllReadLocal = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // NotificationBell + both sidebars (badge count) all consume this — an
  // unmemoized object literal here would hand them a new `value` reference
  // (and force a re-render) on every render of whatever wraps the provider,
  // not just on an actual unreadCount change.
  const value = useMemo(() => ({
    unreadCount,
    setUnreadCount,
    fetchUnreadCount,
    markReadLocal,
    markAllReadLocal
  }), [unreadCount, fetchUnreadCount, markReadLocal, markAllReadLocal]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
