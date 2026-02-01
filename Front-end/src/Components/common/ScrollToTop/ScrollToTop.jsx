import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Native Scroll Reset
    window.scrollTo(0, 0);

    // 2. Lenis Scroll Reset (if available)
    if (window.mainScroller) {
      window.mainScroller.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
