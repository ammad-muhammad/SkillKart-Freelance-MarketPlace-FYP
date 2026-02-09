
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function CardStackScroll({ 
  title = "Legacy In The Making",
  cards = [],
  backgroundColor = "#f0f0f0"
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef(null);
  const triggerRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    const items = itemsRef.current;
    let animation;
    
    // GSAP ScrollTrigger animation for desktop
    if (window.innerWidth >= 1024) {
      animation = gsap.to(items, {
        yPercent: -120,
        rotate: -50,
        stagger: 1,
        ease: 'power2.inOut',
        duration: 3,
        scrollTrigger: {
          trigger: triggerRef.current,
          start: 'top 30%',
          end: 'bottom -50%',
          scrub: true,
        }
      });
    }

    return () => {
      // Only kill this specific animation and its scrollTrigger
      if (animation) {
        animation.kill();
        if (animation.scrollTrigger) animation.scrollTrigger.kill();
      }
    };
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % cards.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + cards.length) % cards.length);
  };

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-0" style={{ backgroundColor }}>
      <div className="w-full px-0">
        
        {/* Mobile Carousel */}
        <div className="w-full py-10 px-4 md:px-7 gap-y-3 md:gap-y-5 lg:hidden">
          <div className="flex justify-center mb-10">
            <h2 className="text-gray-900 text-5xl md:text-6xl font-medium tracking-tight">
              {title}
            </h2>
          </div>

          <div className="relative overflow-hidden" ref={carouselRef}>
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {cards.map((card) => (
                <div key={card.id} className="min-w-full px-2">
                  <div 
                    className="w-full flex items-center flex-col text-center rounded-2xl px-10 py-16 border-2 border-solid border-black"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <div className="rounded-full overflow-hidden w-26 aspect-[1/1] relative mb-3">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="flex flex-col items-center gap-y-3">
                      <h2 
                        className="text-2xl font-medium tracking-tight"
                        style={{ color: card.textColor }}
                      >
                        {card.title}
                      </h2>
                      <h6 
                        className="text-1xl uppercase font-medium tracking-tight"
                        style={{ color: card.textColor }}
                      >
                        {card.position}
                      </h6>
                      <p 
                        className="text-sm leading-normal"
                        style={{ color: card.textColor }}
                      >
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {cards.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1 rounded-full transition-all ${
                  idx === currentSlide ? 'w-8 bg-blue-800' : 'w-1 bg-gray-900'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Stacked Cards Animation */}
        <div 
          ref={triggerRef}
          className="w-full relative hidden lg:flex"
          style={{ height: '300vh' }}
        >
          <div className="w-full h-screen sticky top-0 left-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full flex justify-center mt-10 xl:mt-16">
              <h1 className="text-gray-900 text-3xl xl:text-4xl font-medium tracking-tight">
                {title}
              </h1>
            </div>

            {cards.map((card, index) => (
              <div
                key={card.id}
                ref={(el) => (itemsRef.current[index] = el)}
                className="w-full h-full absolute left-0 flex items-center justify-center top-8"
                style={{ zIndex: cards.length - index }}
              >
                <div 
                  className="w-full max-w-xs sm:max-w-sm xl:max-w-sm mt-10"
                  style={{ transform: `rotate(${card.rotate}deg)` }}
                >
                  <div 
                    className="w-full flex justify-between flex-col text-center rounded-3xl p-6 xl:p-8 aspect-square border-2 border-solid border-black"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <div className="rounded-full overflow-hidden w-26 xl:w-28 aspect-square relative mx-auto mb-4">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="flex flex-col items-center gap-y-3">
                      <h2 
                        className="text-2xl xl:text-3xl uppercase font-medium tracking-tight"
                        style={{ color: card.textColor }}
                      >
                        {card.title}
                      </h2>
                      <h6 
                        className="text-1xl xl:text-2xl uppercase font-medium tracking-tight"
                        style={{ color: card.textColor }}
                      >
                        {card.position}
                      </h6>
                      <p 
                        className="text-sm xl:text-base leading-normal"
                        style={{ color: card.textColor }}
                      >
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}