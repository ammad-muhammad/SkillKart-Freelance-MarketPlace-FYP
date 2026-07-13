import { useEffect, useRef } from 'react';
import AppRoutes from "./routes/AppRoutes";
import ScrollToTop from "./Components/common/ScrollToTop/ScrollToTop";
import BuddyWidget from "./Components/common/BuddyWidget/BuddyWidget";
import NotificationBell from "./Components/common/NotificationBell/NotificationBell";
import { useAuth } from './hooks/useAuth';
import SuspendedOverlay from './Components/common/SuspendedOverlay/SuspendedOverlay';
import { log, logStatus } from './utils/logger';

function App() {
  const { user, logout } = useAuth();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    log('💻 Frontend running on port 3001');
    logStatus({ debugMode: true, hotReloadWorking: true });
  }, []);

  return (
    <>
      {user?.isBlocked && <SuspendedOverlay reason={user.blockedReason} onLogout={logout} />}
      <ScrollToTop />
      <AppRoutes />
      <BuddyWidget />
      <NotificationBell />
    </>
  );
}

export default App;
