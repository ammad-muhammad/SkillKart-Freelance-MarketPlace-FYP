import { useEffect, useRef } from 'react';

/**
 * useAdminPolling
 * Lightweight 30-second polling hook for admin dashboard data.
 * Stops when the tab is hidden; resumes when it becomes visible again.
 *
 * @param {Function} fn       - async function to call on each tick
 * @param {number}   interval - polling interval in ms (default: 30 000)
 * @param {boolean}  enabled  - pause polling when false
 */
const useAdminPolling = (fn, interval = 30_000, enabled = true) => {
  const timerRef    = useRef(null);
  const fnRef       = useRef(fn);
  const mountedRef  = useRef(true);

  // Keep fnRef up-to-date without re-creating the effect
  fnRef.current = fn;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (!mountedRef.current || document.hidden) return;
      try {
        await fnRef.current();
      } catch {
        // Swallow errors — polling should never crash the page
      }
    };

    // Run immediately on mount
    tick();

    timerRef.current = setInterval(tick, interval);

    // Pause when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [interval, enabled]);
};

export default useAdminPolling;
