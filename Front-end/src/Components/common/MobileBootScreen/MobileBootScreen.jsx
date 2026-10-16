import { useEffect } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { isMobileApp } from '../../../utils/platform';
import Loader from '../Loader/Loader';
import './MobileBootScreen.css';

/**
 * Shown only in the native app, only while AuthContext is still resolving
 * the stored session (checkAuth's `loading` flag) — i.e. between the native
 * splash screen (capacitor.config.json, `launchAutoHide: false`) hiding and
 * the router landing on /login or a dashboard. Without this, there'd be a
 * blank white flash the instant the native splash is dismissed, since the
 * very first render happens before we know if a session exists.
 *
 * Hides the native splash itself right as this mounts — capacitor.config.json
 * sets `launchAutoHide: false` specifically so that hide is driven by real
 * app-ready state, not a fixed timer that might fire before or long after
 * the JS bundle is actually interactive.
 */
const MobileBootScreen = () => {
  useEffect(() => {
    if (isMobileApp()) SplashScreen.hide();
  }, []);

  return (
    <div className="sk-boot-screen">
      <img src="/favicon.svg" alt="" className="sk-boot-screen__logo" />
      <Loader size="md" text="Loading" />
    </div>
  );
};

export default MobileBootScreen;
