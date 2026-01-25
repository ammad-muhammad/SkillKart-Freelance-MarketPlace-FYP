
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, SplitText);

const DroppingTextAnimation = ({ text = "Ready to Rise at Seven?", id = "2250" }) => {
  const triggerRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    const heading = headingRef.current;

    if (!trigger || !heading) return;

    const headingWidth = heading.offsetWidth;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let yStart = 150;
    let yEnd = 400;
    let charyStart = -60;

    ScrollTrigger.matchMedia({
      '(max-width: 1023px)': () => {
        yStart = 100;
        yEnd = 200;
        charyStart = -60;
      }
    });

    // Set initial position
    gsap.set(heading, {
      y: yStart,
      x: headingWidth - windowWidth + windowWidth * 0.5,
    });

    // Animate heading position
    gsap.to(heading, {
      x: () => -(headingWidth - window.innerWidth + 1000),
      y: yEnd,
      ease: 'none',
      scrollTrigger: {
        trigger: trigger,
        start: 'top 70%',
        end: '+=' + (headingWidth - windowWidth + windowHeight * 0.35),
        scrub: true,
      },
    });

    // Split text into characters
    const splitText = new SplitText(heading, {
      type: 'chars',
    });

    const chars = splitText.chars;

    // Set initial character states
    chars.forEach((char) => {
      gsap.set(char, {
        yPercent: charyStart,
        rotate: 10
      });
    });

    // Animate characters
    gsap.to(chars, {
      yPercent: 0,
      rotate: 0,
      ease: 'back.inOut(4)',
      stagger: 0.35,
      duration: 2.5,
      scrollTrigger: {
        trigger: trigger,
        start: 'top 72%',
        end: '+=' + (headingWidth - windowWidth + 200),
        scrub: true,
      },
    });

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
      splitText.revert();
    };
  }, [text, id]);

  return (
    <div className="overflow-hidden hidden lg:block bg-[#f0f0f0] -mt-[20vh]">
      <div 
        ref={triggerRef}
        className={`flex h-[35vh] lg:h-[100vh] js-trigger-${id}`}
      >
        <div
          ref={headingRef}
          className={`shrink-0 text-[20vw] font-medium tracking-tight leading-tight lg:text-[16vw] 4xl:text-[14vw] js-heading-${id}`}
          aria-label={text}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

export default DroppingTextAnimation;