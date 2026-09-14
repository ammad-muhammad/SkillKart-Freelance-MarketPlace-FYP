import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import { authAPI } from '../api/auth';
import { isMobileApp } from '../utils/platform';
import { warn } from '../utils/logger';

/**
 * Registers this device for FCM push notifications once the user is
 * authenticated, and deep-links into the app when a notification is tapped
 * (using the same `link` field the in-app NotificationBell already uses).
 *
 * Inert rather than broken until Firebase is configured: requestPermissions/
 * register still run against the native plugin, but registerPushToken() and
 * the backend's push.service.js both no-op without credentials — see
 * Backend/.env's FIREBASE_SERVICE_ACCOUNT_PATH.
 */
export default function usePushNotifications(isAuthenticated) {
  const navigate = useNavigate();
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!isMobileApp() || !isAuthenticated) return undefined;

    let handles = [];

    (async () => {
      try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        handles.push(await PushNotifications.addListener('registration', (token) => {
          tokenRef.current = token.value;
          authAPI.registerPushToken(token.value).catch(() => {});
        }));
        handles.push(await PushNotifications.addListener('registrationError', (err) => {
          warn('[push] registration failed:', err.error);
        }));
        handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const link = action.notification?.data?.link;
          if (link) navigate(link);
        }));

        await PushNotifications.register();
      } catch (err) {
        warn('[push] setup failed:', err.message);
      }
    })();

    return () => {
      handles.forEach((h) => h.remove());
      if (tokenRef.current) {
        authAPI.removePushToken(tokenRef.current).catch(() => {});
      }
    };
  }, [isAuthenticated, navigate]);
}
