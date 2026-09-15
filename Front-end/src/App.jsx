import { useEffect, useRef, lazy, Suspense } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import ScrollToTop from "./Components/common/ScrollToTop/ScrollToTop";
import BuddyWidget from "./Components/common/BuddyWidget/BuddyWidget";
import NotificationBell from "./Components/common/NotificationBell/NotificationBell";
import CookieConsent from "./Components/common/CookieConsent/CookieConsent";
import NetworkGate from "./Components/common/NetworkGate/NetworkGate";
import MobileBootScreen from "./Components/common/MobileBootScreen/MobileBootScreen";
import Loader from "./Components/common/Loader/Loader";
import { useAuth } from './hooks/useAuth';
import useAndroidBackButton from './hooks/useAndroidBackButton';
import usePushNotifications from './hooks/usePushNotifications';
import SuspendedOverlay from './Components/common/SuspendedOverlay/SuspendedOverlay';
import { log, logStatus } from './utils/logger';
import { isMobileApp, isAdminApp } from './utils/platform';

// Lazy + picked by build target so the untaken tree is never fetched/parsed:
// the admin app (VITE_APP_TARGET=admin) never pulls in client/freelancer/
// public code, and vice versa. See AdminAppRoutes.jsx for what it contains.
const AppRoutes = lazy(() => import("./routes/AppRoutes"));
const AdminAppRoutes = lazy(() => import("./routes/AdminAppRoutes"));

function App() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const logged = useRef(false);

  useAndroidBackButton();
  usePushNotifications(isAuthenticated);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    log('💻 Frontend running on port 3001');
    logStatus({ debugMode: true, hotReloadWorking: true });
  }, []);

  // Mobile-only: match the status bar to the brand navy used by the splash
  // screen and auth pages — otherwise its icons/clock default to a style
  // meant for a light background and are nearly invisible on our dark one.
  useEffect(() => {
    if (!isMobileApp()) return;
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#042E4C' }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  }, []);

  // Mobile-only: block the whole app tree behind the boot screen until
  // AuthContext's initial session check resolves — otherwise the native
  // splash hides straight into a blank flash before we know whether to
  // route to /login or a dashboard. Web builds are unaffected: `loading`
  // already gates individual pages/ProtectedRoute there, as before.
  if (isMobileApp() && loading) {
    return <MobileBootScreen />;
  }

  return (
    <NetworkGate>
      {user?.isBlocked && <SuspendedOverlay reason={user.blockedReason} onLogout={() => logout()} />}
      <ScrollToTop />
      <Suspense fallback={<Loader fullScreen text="Loading..." />}>
        {isAdminApp() ? <AdminAppRoutes /> : <AppRoutes />}
      </Suspense>
      <BuddyWidget />
      <NotificationBell />
      {/* Web-only: cookies/localStorage consent isn't a meaningful concept
          inside the Capacitor WebView the same way, and the mobile build
          already omits the marketing/legal pages this links to. */}
      {!isMobileApp() && <CookieConsent />}
    </NetworkGate>
  );
}

export default App;
