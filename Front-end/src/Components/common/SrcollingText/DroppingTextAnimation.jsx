
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, SplitText);

const DroppingTextAnimation = ({ text = "Ready to serve SkillKart?", id = "2250", className = "-mt-[20vh]" }) => {
  const triggerRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    const heading = headingRef.current;

    if (!trigger || !heading) return;

    const headingWidth = heading.offsetWidth;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let yStart = 100;
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
    // Animate heading position
    const headingAnim = gsap.to(heading, {
      x: () => -(headingWidth - window.innerWidth + (window.innerWidth * 0.1)), // Adjusted to ensure text doesn't scroll too far off
      y: yEnd, 
      ease: 'none',
      scrollTrigger: {
        trigger: trigger,
        start: 'top 70%',
        end: '+=' + (headingWidth * 1.2), // Based on text width for more consistent pacing
        scrub: 1,
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
    // Animate characters
    const charAnim = gsap.to(chars, {
      yPercent: 0,
      rotate: 0,
      ease: 'back.inOut(4)',
      stagger: 0.35,
      duration: 2.5,
      scrollTrigger: {
        trigger: trigger,
        start: 'top 72%',
        end: '+=' + (headingWidth * 1.2), // Match the heading's scroll distance
        scrub: 1,
      },
    });

    // Cleanup
    return () => {
      // Correctly kill only these instances
      if (headingAnim) {
        headingAnim.kill();
        if (headingAnim.scrollTrigger) headingAnim.scrollTrigger.kill();
      }
      if (charAnim) {
        charAnim.kill();
        if (charAnim.scrollTrigger) charAnim.scrollTrigger.kill();
      }
      splitText.revert();
    };
  }, [text, id]);

  return (
    <div className={`overflow-hidden hidden lg:block bg-[#f0f0f0] ${className}`}>
      <div 
        ref={triggerRef}
        className={`flex h-[35vh] lg:h-[125vh] js-trigger-${id}`}
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