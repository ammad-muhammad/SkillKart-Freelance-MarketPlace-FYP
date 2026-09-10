import { useEffect, useRef } from 'react';
import AppRoutes from "./routes/AppRoutes";
import ScrollToTop from "./Components/common/ScrollToTop/ScrollToTop";
import BuddyWidget from "./Components/common/BuddyWidget/BuddyWidget";
import NotificationBell from "./Components/common/NotificationBell/NotificationBell";
import NetworkGate from "./Components/common/NetworkGate/NetworkGate";
import MobileBootScreen from "./Components/common/MobileBootScreen/MobileBootScreen";
import { useAuth } from './hooks/useAuth';
import SuspendedOverlay from './Components/common/SuspendedOverlay/SuspendedOverlay';
import { log, logStatus } from './utils/logger';
import { isMobileApp } from './utils/platform';

function App() {
  const { user, loading, logout } = useAuth();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    log('💻 Frontend running on port 3001');
    logStatus({ debugMode: true, hotReloadWorking: true });
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
      {user?.isBlocked && <SuspendedOverlay reason={user.blockedReason} onLogout={logout} />}
      <ScrollToTop />
      <AppRoutes />
      <BuddyWidget />
      <NotificationBell />
    </NetworkGate>
  );
}

export default App;
