import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { isMobileApp } from '../utils/platform';

// Screens with nowhere sensible to go "back" to in-app — minimize instead of
// exiting the process (standard Android convention) or navigating into a
// blank/unauthenticated gap.
const ROOT_PATHS = ['/login', '/client/dashboard', '/freelancer/dashboard', '/admin-panel/dashboard'];

/**
 * Registering this listener disables Capacitor's default back-button
 * behaviour (immediate WebView history pop / process exit), which otherwise
 * quits the app the instant there's no WebView history entry to pop — e.g.
 * straight after login lands on a dashboard with a fresh history stack.
 */
export default function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);

  useEffect(() => {
    if (!isMobileApp()) return undefined;

    let handle;
    App.addListener('backButton', ({ canGoBack }) => {
      const isRoot = ROOT_PATHS.includes(locationRef.current.pathname);
      if (!isRoot && canGoBack) {
        navigate(-1);
      } else {
        App.minimizeApp();
      }
    }).then((h) => { handle = h; });

    return () => { handle?.remove(); };
  }, [navigate]);
}
