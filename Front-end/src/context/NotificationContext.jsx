import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../api/notifications';
import { useAuth } from '../hooks/useAuth';

const NotificationContext = createContext(null);

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
    } catch (error) {
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

  const value = {
    unreadCount,
    setUnreadCount,
    fetchUnreadCount,
    markReadLocal,
    markAllReadLocal
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
