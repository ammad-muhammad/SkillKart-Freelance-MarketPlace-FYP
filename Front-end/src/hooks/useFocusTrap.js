import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Traps Tab focus inside `containerRef` while `isOpen`, focuses the first
// focusable element on open, restores whatever had focus before on close,
// and calls `onClose` on Escape. `onClose` should itself no-op while a
// submit/action is in flight, matching each modal's own close-button guard.
export default function useFocusTrap(containerRef, isOpen, onClose) {
  const previousFocusRef = useRef(null);
  // Read through a ref rather than depending on `onClose` directly — most
  // callers pass a fresh inline arrow on every render, which would otherwise
  // re-run this effect (and re-steal focus to the first focusable element)
  // on every keystroke in any input/textarea inside the modal.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const container = containerRef.current;
    const getFocusable = () =>
      container ? Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => !el.disabled) : [];

    const initial = getFocusable();
    (initial[0] || container)?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !container) return;
      const nodes = getFocusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, containerRef]);
}
