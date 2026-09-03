import { useState, useEffect, useRef } from 'react';

/**
 * AnimatedCounter Component
 * Animates a numeric value from 0 to the target value when it enters the viewport.
 */
const AnimatedCounter = ({ value }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef(null);

  // Parse the number and suffix (e.g., "50K+" -> { number: 50, suffix: "K+" })
  const match = value.match(/^([\d.]+)([^\d]*)$/);
  const targetNumber = match ? parseFloat(match[1]) : 0;
  const suffix = match ? match[2] : '';

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Power3.out easing
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentCount = easedProgress * targetNumber;
      
      if (targetNumber % 1 === 0) {
        setCount(Math.floor(currentCount));
      } else {
        setCount(currentCount.toFixed(1));
      }

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };

    requestAnimationFrame(updateCount);
  }, [hasStarted, targetNumber]);

  return (
    <span ref={elementRef} className="about__number-val">
      {count}{suffix}
    </span>
  );
};

export default AnimatedCounter;
