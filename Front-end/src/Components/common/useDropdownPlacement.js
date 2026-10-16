import { useLayoutEffect, useState } from 'react';

const BELOW = { up: false, maxHeight: undefined };

/**
 * Collision-aware placement for absolutely-positioned dropdown menus
 * (CustomSelect / ComboSelect / TagInput).
 *
 * The menus are `position:absolute` under their trigger, so near the bottom of
 * the viewport — or of a scrolling/clipping ancestor such as the Modal body —
 * they used to run off-screen or get clipped. After the menu renders (layout
 * effect, so there is no flash) this measures the room above/below the trigger
 * and either flips the menu upward or caps its height to the room available.
 *
 * Returns `{ up, maxHeight }`. Apply as:
 *   style = up ? { top:'auto', bottom:'calc(100% + 8px)', maxHeight } : { maxHeight }
 *
 * @param {boolean} open        whether the menu is rendered
 * @param {React.RefObject} rootRef  the positioned wrapper (trigger + menu)
 * @param {React.RefObject} menuRef  the menu element
 * @param {*} dep               anything that changes the menu height (e.g. filtered length)
 */
export default function useDropdownPlacement(open, rootRef, menuRef, dep) {
  const [placement, setPlacement] = useState(BELOW);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const menu = menuRef.current;
    if (!open || !root || !menu) {
      setPlacement((prev) => (prev === BELOW ? prev : BELOW));
      return;
    }

    const rect = root.getBoundingClientRect();
    let bottomEdge = window.visualViewport?.height ?? window.innerHeight;
    let topEdge = 0;

    // The nearest scrolling / clipping ancestor (e.g. `.sk-modal__body`) also
    // bounds where the menu can be seen.
    for (let el = root.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      const overflowY = getComputedStyle(el).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden' || overflowY === 'clip') {
        const bounds = el.getBoundingClientRect();
        bottomEdge = Math.min(bottomEdge, bounds.bottom);
        topEdge = Math.max(topEdge, bounds.top);
        break;
      }
    }

    const MARGIN = 12;
    const need = menu.offsetHeight + 8;
    const below = bottomEdge - rect.bottom - MARGIN;
    const above = rect.top - topEdge - MARGIN;

    let next = BELOW;
    if (below >= need) {
      next = BELOW;
    } else if (above > below) {
      next = { up: true, maxHeight: above >= need ? undefined : Math.max(120, above) };
    } else {
      next = { up: false, maxHeight: Math.max(120, below) };
    }

    setPlacement((prev) => (prev.up === next.up && prev.maxHeight === next.maxHeight ? prev : next));
  }, [open, rootRef, menuRef, dep]);

  return placement;
}

/** Inline style for a menu given the result of useDropdownPlacement. */
export const placementStyle = ({ up, maxHeight }) => {
  if (!up && maxHeight === undefined) return undefined;
  return {
    ...(up ? { top: 'auto', bottom: 'calc(100% + 8px)' } : null),
    ...(maxHeight !== undefined ? { maxHeight } : null),
  };
};
