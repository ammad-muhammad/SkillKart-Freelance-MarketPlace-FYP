import { useEffect, useState } from 'react';
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
const NetworkGate = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isMobileApp()) return undefined;

    let listenerHandle;

    Network.getStatus().then((status) => setIsOffline(!status.connected));

    Network.addListener('networkStatusChange', (status) => {
      setIsOffline(!status.connected);
    }).then((handle) => { listenerHandle = handle; });

    return () => { listenerHandle?.remove(); };
  }, []);

  if (!isMobileApp() || !isOffline) return children;

  const retry = async () => {
    setChecking(true);
    const status = await Network.getStatus();
    setIsOffline(!status.connected);
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
