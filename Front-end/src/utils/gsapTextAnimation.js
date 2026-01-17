import { gsap } from "gsap";
import SplitText from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export function animateSplitText({
    selector, // DOM element
    y = 50,
    stagger = 0.08,
    ease = "back.out(1.7)",
    duration = 1,
    delay = 0.3,
    blur = 10,
  } = {}) {
    document.fonts.ready.then(() => {
      // if selector is a string, convert to DOM element
      let el;
      if (typeof selector === "string") {
        el = document.querySelector(selector);
        if (!el) return; // bail if not found
      } else {
        el = selector; // assume already a DOM element
      }
  
      gsap.set(el, { opacity: 1 });
  
      const split = new SplitText(el, { type: "words", wordsClass: "word" });
  
      split.words.forEach((word, i) => {
        gsap.fromTo(
          word,
          { y, opacity: 0, filter: `blur(${blur}px)` },
          { y: 0, opacity: 1, filter: "blur(0px)", ease, duration, delay: delay + i * stagger }
        );
      });
  
      // animate images inside the element
      const images = el.querySelectorAll("img");
      images.forEach((img, i) => {
        gsap.fromTo(
          img,
          { y, opacity: 0, filter: `blur(${blur}px)` },
          { y: 0, opacity: 1, filter: "blur(0px)", ease, duration, delay: delay + i * stagger }
        );
      });
    });
  }