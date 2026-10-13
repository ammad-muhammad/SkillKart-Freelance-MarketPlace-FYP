import { useEffect, useRef, useState } from 'react';
import { Network } from '@capacitor/network';
import { WifiOff, RefreshCw } from 'lucide-react';
import { isMobileApp } from '../../../utils/platform';
import './NetworkGate.css';

/**
 * Full-screen "you're offline" gate for the mobile app. Web-only builds
 * render `children` straight through — the browser's own connectivity UX
 * (and per-page loading/error states) already covers that case there; this
 * is specifically for the native shell, which has no browser chrome to fall
 * back on if a request silently hangs with no network at all.
 *
 * Two distinct failure modes exist and this only covers the first:
 *  - Device has no network at all → this component catches it directly via
 *    @capacitor/network.
 *  - Device IS online but the Railway backend is unreachable/down → that's
 *    a normal per-request failure, already surfaced by api/client.js's
 *    existing error toasts; this gate doesn't (and shouldn't) blanket-block
 *    the whole app for that case, since large parts of a per-page failure
 *    are still recoverable without a full reload.
 */
// Android emulators (confirmed on at least one AVD image) can report
// Network.getStatus()'s `connected` as false when the device actually has
// working internet — the OS-level ConnectivityManager reading itself is
// wrong, not just slow to update. Trusting a single reading flipped the
// whole app between itself and the offline screen every ~5s (looked like
// flickering). Require CONSECUTIVE offline readings before believing it;
// any single online reading clears it immediately (fail-fast recovery,
// slow-to-trigger blocking).
const OFFLINE_CONFIRM_THRESHOLD = 3;

const NetworkGate = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const offlineStreak = useRef(0);

  useEffect(() => {
    if (!isMobileApp()) return undefined;

    let listenerHandle;
    let cancelled = false;
    const report = (connected) => {
      if (cancelled) return;
      if (connected) {
        offlineStreak.current = 0;
        setIsOffline(false);
        return;
      }
      offlineStreak.current += 1;
      if (offlineStreak.current >= OFFLINE_CONFIRM_THRESHOLD) setIsOffline(true);
    };
    const check = () => Network.getStatus().then((status) => report(status.connected));

    check();
    Network.addListener('networkStatusChange', (status) => report(status.connected))
      .then((handle) => { listenerHandle = handle; });

    // The native networkStatusChange event doesn't fire reliably on every
    // Android OEM build (some skins suspend plugin listeners under battery
    // optimization), so this alone can miss going offline. Poll as a backstop.
    const poll = setInterval(check, 5000);

    return () => { cancelled = true; listenerHandle?.remove(); clearInterval(poll); };
  }, []);

  if (!isMobileApp() || !isOffline) return children;

  const retry = async () => {
    setChecking(true);
    const status = await Network.getStatus();
    if (status.connected) {
      offlineStreak.current = 0;
      setIsOffline(false);
    }
    // A still-offline reading here doesn't force the gate to stay up on its
    // own (it's already up) — the background poll's confirm-threshold is
    // still what governs it, same as everywhere else.
    setChecking(false);
  };

  return (
    <div className="sk-network-gate">
      <WifiOff size={56} className="sk-network-gate__icon" />
      <h1>No Internet Connection</h1>
      <p>Check your Wi-Fi or mobile data, then try again.</p>
      <button type="button" onClick={retry} disabled={checking} className="sk-network-gate__retry">
        <RefreshCw size={18} className={checking ? 'spin' : ''} />
        {checking ? 'Checking…' : 'Retry'}
      </button>
    </div>
  );
};

export default NetworkGate;
