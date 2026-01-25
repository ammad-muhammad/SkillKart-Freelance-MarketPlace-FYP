import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useLenis = () => {
  useEffect(() => {
    // create Lenis instance
    const mainScroller = new Lenis({
      duration: 1,
      // easing: (t) => 1 - Math.pow(1 - t, 7.5),
      smooth: true,
      smoothTouch: true,
      direction: "vertical",
      gestureDirection: "vertical",
    });

    window.mainScroller = mainScroller;

    let isScrollPaused = false;

    function raf(time) {
      if (!isScrollPaused) {
        mainScroller.raf(time);
      }
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync with GSAP ScrollTrigger
    mainScroller.on("scroll", () => {
      ScrollTrigger.update();
    });

    // Refresh ScrollTrigger once on mount (optional)
    ScrollTrigger.refresh();

    return () => {
      mainScroller.destroy();
      ScrollTrigger.killAll();
    };
  }, []);
};

export default useLenis;
