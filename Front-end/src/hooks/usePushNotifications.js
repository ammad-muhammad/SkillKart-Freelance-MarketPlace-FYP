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
 * Gated on VITE_PUSH_NOTIFICATIONS_ENABLED, NOT just try/catch: calling
 * PushNotifications.register() before google-services.json has been added to
 * the Android project throws a native `FirebaseApp is not initialized`
 * exception on a background thread that Capacitor's bridge doesn't convert
 * into a rejected promise — it's an uncaught crash that takes the whole app
 * down, invisible to a JS try/catch here. Set the env var once
 * google-services.json is actually in android/app/ — see Front-end/README.md
 * → Mobile App → Push notifications.
 */
export default function usePushNotifications(isAuthenticated) {
  const navigate = useNavigate();
  const tokenRef = useRef(null);
  const enabled = import.meta.env.VITE_PUSH_NOTIFICATIONS_ENABLED === 'true';

  useEffect(() => {
    if (!isMobileApp() || !isAuthenticated || !enabled) return undefined;

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
  }, [isAuthenticated, navigate, enabled]);
}
