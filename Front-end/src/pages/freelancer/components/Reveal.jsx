import { useEffect, useRef, useState } from 'react';

/**
 * useInView Hook — Fires once when element enters viewport
 */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const threshold = options.threshold ?? 0.1;
  const rootMargin = options.rootMargin ?? '0px 0px 40px 0px';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    let observer = null;
    let timer = null;

    const tryObserve = () => {
      const el = ref.current;
      if (!el) return false;

      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      }, { threshold, rootMargin });

      observer.observe(el);
      return true;
    };

    if (!tryObserve()) {
      // Check for node when it mounts after loader finishes
      let checks = 0;
      timer = setInterval(() => {
        checks++;
        if (tryObserve() || checks > 30) {
          clearInterval(timer);
          // Fallback: if element never observed after 1.5s, mark inView true so content is never blocked
          if (checks > 30) setInView(true);
        }
      }, 50);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (observer) observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return [ref, inView];
}

/**
 * Reveal Component — Lightweight scroll animation wrapper
 */
export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
  style = {}
}) {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`fl-reveal fl-reveal--${direction}${inView ? ' fl-reveal--visible' : ''} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        ...style
      }}
    >
      {children}
    </div>
  );
}
