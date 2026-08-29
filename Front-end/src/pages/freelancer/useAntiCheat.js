import { useEffect, useRef, useCallback } from 'react';

/**
 * useAntiCheat — proctoring guard for the skill test.
 *
 * While `active` is true it watches for cheating signals:
 *   - switching tabs / minimizing  (document visibilitychange → hidden)
 *   - blurring the window           (window blur — alt-tab, clicking elsewhere)
 *   - leaving fullscreen           (fullscreenchange with no fullscreen element)
 *   - opening dev tools / context menu / copy-cut (best-effort deterrents)
 *   - a 1s polling watchdog on document.hidden/document.hasFocus() as a
 *     backup for window-management interactions that don't reliably fire the
 *     events above in every OS/browser (e.g. snapping the window aside and
 *     focusing a different app)
 *
 * Policy: the FIRST violation calls `onWarn` (a single warning). The SECOND
 * violation calls `onAbort` — the caller then discards the attempt and starts a
 * brand-new test from scratch.
 *
 * The strike counter resets only when a NEW attempt begins (`attemptId` change),
 * never on incidental `active` toggles (e.g. a failed submit), so a strike can't
 * be wiped mid-test. A short grace window after arming ignores the focus churn
 * that entering fullscreen can produce, avoiding a spurious first violation.
 *
 * @param {object}   opts
 * @param {boolean}  opts.active     enable/disable the guard
 * @param {number}   opts.attemptId  bump this to start a fresh attempt (resets strikes)
 * @param {Function} opts.onWarn     called on the 1st violation (reason: string)
 * @param {Function} opts.onAbort    called on the 2nd violation (reason: string)
 * @returns {{ requestFullscreen: () => Promise<boolean>, exitFullscreen: () => void }}
 */
export default function useAntiCheat({ active, attemptId = 0, onWarn, onAbort }) {
  const violations = useRef(0);
  const armedAt = useRef(0);
  // A single user action (e.g. alt-tab) can fire blur + visibilitychange almost
  // together; we debounce so they count as one violation, not two.
  const lastTick = useRef(0);

  // Keep the latest callbacks in a ref so the listener effect can depend only on
  // `active` — otherwise inline callbacks would rebind all listeners every render.
  const cbRef = useRef({ onWarn, onAbort });
  useEffect(() => { cbRef.current = { onWarn, onAbort }; }, [onWarn, onAbort]);

  const handleViolation = useCallback((reason) => {
    if (!active) return;
    const now = Date.now();
    // Grace window: ignore the focus churn from entering fullscreen right after
    // the guard is armed.
    if (now - armedAt.current < 700) return;
    // Collapse multiple events from the same user action into one violation.
    if (now - lastTick.current < 800) return;
    lastTick.current = now;

    violations.current += 1;
    if (violations.current >= 2) {
      cbRef.current.onAbort?.(reason);
    } else {
      cbRef.current.onWarn?.(reason);
    }
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;

    const onVisibility = () => {
      if (document.hidden) handleViolation('You switched away from the test tab.');
    };
    const onBlur = () => handleViolation('The test window lost focus.');
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) handleViolation('You exited full-screen mode.');
    };
    const onContextMenu = (e) => { e.preventDefault(); };
    const onCopyCut = (e) => { e.preventDefault(); };
    // Block common cheat shortcuts: devtools, view-source, copy/cut, print.
    // IMPORTANT: skip when altKey is held — AltGr (Ctrl+Alt) is needed to type
    // many characters on non-US keyboards, so we must not swallow those.
    const onKeyDown = (e) => {
      if (e.altKey) return;
      const k = (e.key || '').toLowerCase();
      if (e.key === 'F12') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'u'].includes(k)) { e.preventDefault(); }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopyCut);
    document.addEventListener('cut', onCopyCut);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopyCut);
      document.removeEventListener('cut', onCopyCut);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, handleViolation]);

  // Backup watchdog, separate from the event listeners above. Some OS/browser
  // window-management interactions (snapping the window aside, then focusing
  // a different app) don't reliably fire `blur`/`visibilitychange` in every
  // environment — polling document.hasFocus()/document.hidden directly closes
  // that gap. Edge-triggered (flips a local flag) so one continued absence is
  // still only counted once, not once per poll tick.
  useEffect(() => {
    if (!active) return undefined;
    let wasAway = false;

    const poll = setInterval(() => {
      const away = document.hidden || !document.hasFocus();
      if (away && !wasAway) {
        wasAway = true;
        handleViolation('You switched away from the test window.');
      } else if (!away) {
        wasAway = false;
      }
    }, 1000);

    return () => clearInterval(poll);
  }, [active, handleViolation]);

  // Reset strikes only when a NEW attempt starts (attemptId changes) and the
  // guard is active. Not tied to incidental `active` toggles.
  useEffect(() => {
    if (active) {
      violations.current = 0;
      armedAt.current = Date.now();
    }
  }, [attemptId, active]);

  const requestFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return true;
      }
      return false;
    } catch {
      // Fullscreen may be blocked; the other guards still apply.
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  return { requestFullscreen, exitFullscreen };
}
