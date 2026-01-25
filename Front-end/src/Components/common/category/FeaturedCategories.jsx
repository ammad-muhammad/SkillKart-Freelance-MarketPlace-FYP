import React, { useEffect, useRef, useState } from 'react';

const FeaturedCategories = () => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const rightColRef = useRef(null);
  const titleRefs = useRef([]);
  const descRefs = useRef([]);
  const navContainerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const projects = [
    { id: '01', title: 'SIXT', desc: 'Leading E Sim brand globally', date: '[2023-2025]', color: 'from-gray-800 to-black', img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800' },
    { id: '02', title: 'JD Sports', desc: 'Global Sportswear Leader', date: '[2024-2025]', color: 'from-gray-700 to-gray-900', img: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800' },
    { id: '03', title: 'Parkdean Resorts', desc: 'UK Holiday Parks', date: '[2025]', color: 'from-gray-800 to-black', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' },
    { id: '04', title: 'Apple', desc: 'Spatial Audio Tech', date: '[2025]', color: 'from-gray-700 to-gray-900', img: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800' },
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Dynamically load GSAP from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    script.async = true;
    
    script.onload = () => {
      const gsap = window.gsap;

      // Initial animation on mount
      if (titleRefs.current[0]) {
        gsap.fromTo(
          titleRefs.current[0],
          { opacity: 0, y: 30, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out' }
        );
      }

      if (descRefs.current[0]) {
        gsap.fromTo(
          descRefs.current[0],
          { opacity: 0, y: 20, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, delay: 0.2, ease: 'power2.out' }
        );
      }
    };

    document.head.appendChild(script);

    let ticking = false;

    const handleScroll = () => {
      if (isMobile) return; // Skip scroll animations on mobile
      
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateScrollAnimation();
          ticking = false;
        });
        ticking = true;
      }
    };

    const updateScrollAnimation = () => {
      if (!sectionRef.current || !contentRef.current || isMobile) return;

      const section = sectionRef.current;
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const windowHeight = window.innerHeight;

      if (sectionTop > 0 || sectionTop + sectionHeight < windowHeight) {
        return;
      }

      const scrollProgress = Math.abs(sectionTop) / (sectionHeight - windowHeight);
      const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

      const slideIndex = Math.min(
        Math.floor(clampedProgress * projects.length),
        projects.length - 1
      );

      if (slideIndex !== activeIndex) {
        setActiveIndex(slideIndex);
        
        if (window.gsap) {
          const gsap = window.gsap;
          
          if (titleRefs.current[slideIndex]) {
            gsap.fromTo(
              titleRefs.current[slideIndex],
              { opacity: 0, y: 30, filter: 'blur(10px)' },
              { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out' }
            );
          }

          if (descRefs.current[slideIndex]) {
            gsap.fromTo(
              descRefs.current[slideIndex],
              { opacity: 0, y: 20, filter: 'blur(8px)' },
              { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, delay: 0.1, ease: 'power2.out' }
            );
          }
        }
      }

      if (rightColRef.current) {
        const slideHeight = windowHeight * 0.8;
        const targetScroll = slideIndex * (slideHeight + 20);
        if (window.gsap) {
          window.gsap.to(rightColRef.current, {
            y: -targetScroll,
            duration: 0.8,
            ease: 'power2.out'
          });
        } else {
          rightColRef.current.style.transform = `translateY(-${targetScroll}px)`;
        }
      }

      if (contentRef.current) {
        if (window.gsap) {
          window.gsap.to(contentRef.current, {
            y: -clampedProgress * 80,
            duration: 0.5,
            ease: 'power2.out'
          });
        } else {
          contentRef.current.style.transform = `translateY(-${clampedProgress * 80}px)`;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    if (!isMobile) {
      updateScrollAnimation();
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeIndex, isMobile]);

  const handleLinkClick = (index) => {
    setActiveIndex(index);
    
    if (isMobile) {
      return; // Mobile uses snap scroll
    }

    if (!sectionRef.current) return;
    
    const section = sectionRef.current;
    const windowHeight = window.innerHeight;
    const sectionHeight = section.offsetHeight;
    const scrollRange = sectionHeight - windowHeight;
    const targetScroll = (index / projects.length) * scrollRange;
    
    window.scrollTo({
      top: section.offsetTop + targetScroll,
      behavior: 'smooth'
    });
  };

  const scrollNavToActive = (index) => {
    if (navContainerRef.current) {
      const activeButton = navContainerRef.current.children[index];
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  useEffect(() => {
    if (isMobile) {
      scrollNavToActive(activeIndex);
    }
  }, [activeIndex, isMobile]);

  return (
    <>
      <div 
        ref={sectionRef}
        className={isMobile ? "relative bg-gradient-to-b from-[#f0f0f0] via-slate-300 to-[#f0f0f0]" : "relative bg-gradient-to-b from-[#f0f0f0] via-slate-300 to-[#f0f0f0]"}
        style={!isMobile ? { height: `${projects.length * 100}vh` } : {}}
      >
        {/* DESKTOP VERSION */}
        {!isMobile && (
          <div className="sticky top-0 h-screen w-full overflow-hidden">
            <div className="relative flex h-full w-full items-center px-12 lg:px-24">
              
              {/* Background effects */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-400/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-300/20 rounded-full blur-[120px]"></div>
                <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-gray-400/10 rounded-full blur-[100px]"></div>
              </div>

              {/* Header */}
              <div className="absolute top-12 left-12 lg:left-24 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-[2px] bg-gradient-to-r from-black via-gray-600 to-transparent"></div>
                  <h1 className="font-bold text-sm text-black">Featured Categories</h1>
                </div>
              </div>

              {/* Scroll indicator */}
              <div className="absolute bottom-12 left-12 lg:left-24 z-20 opacity-60">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] tracking-widest uppercase text-black/70">Scroll</span>
                  <div className="w-[1px] h-12 bg-gradient-to-b from-black to-transparent"></div>
                </div>
              </div>

              {/* Left Column - Links */}
              <div className="w-full lg:w-[58%] z-10">
                <div ref={contentRef} className="flex flex-col gap-8 max-h-[100vh] sm:max-h-[50vh]">
                  {projects.map((project, index) => (
                    <div 
                      key={project.id} 
                      onClick={() => handleLinkClick(index)}
                      className="cursor-pointer group relative transition-all duration-700 ease-out"
                      style={{
                        opacity: index === activeIndex ? 1 : 0.15,
                        transform: index === activeIndex ? 'scale(1) translateX(0)' : 'scale(0.96) translateX(-20px)',
                        filter: index === activeIndex ? 'blur(0px)' : 'blur(2px)'
                      }}
                    >
                      {/* Number badge */}
                      <div 
                        className="absolute -left-16 top-8 transition-all duration-500"
                        style={{
                          opacity: index === activeIndex ? 1 : 0.3,
                          transform: index === activeIndex ? 'scale(1)' : 'scale(0.9)'
                        }}
                      >
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center backdrop-blur-md transition-all duration-500 ${index === activeIndex ? 'border-black bg-black/10 shadow-lg shadow-black/20' : 'border-black/20 bg-white/50'}`}>
                          <span className={`text-xs font-mono font-bold ${index === activeIndex ? 'text-black' : 'text-gray-500'}`}>{project.id}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="flex items-start gap-3 relative overflow-hidden">
                        <h3 
                          ref={(el) => titleRefs.current[index] = el}
                          className="text-[5.5rem] lg:text-[7.5vw] font-black leading-[1.3] tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-black via-black to-gray-800 transition-all duration-500 group-hover:tracking-tight"
                        >
                          {project.title}
                        </h3>
                        <span className={`text-[11px] font-mono ml-2 mt-2 px-3 py-1.5 rounded-full font-semibold backdrop-blur-md border transition-all duration-500 ${index === activeIndex ? 'bg-black/10 border-black/30 text-black' : 'bg-gray-200/50 border-gray-300 text-gray-600'}`}>{project.date}</span>
                      </div>
                      
                      {/* Description */}
                      <div 
                        className="overflow-hidden transition-all duration-600 ease-out"
                        style={{
                          maxHeight: index === activeIndex ? '500px' : '0',
                          opacity: index === activeIndex ? 1 : 0,
                          transform: index === activeIndex ? 'translateY(0)' : 'translateY(-10px)'
                        }}
                      >
                        <p 
                          ref={(el) => descRefs.current[index] = el}
                          className="text-[3.5rem] lg:text-[4.5vw] font-bold leading-[1.3] tracking-tight mt-4 bg-clip-text text-transparent bg-gradient-to-br from-gray-700 via-gray-800 to-black"
                        >
                          {project.desc}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-6 opacity-70 group-hover:opacity-100 transition-opacity">
                          <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></div>
                          <span className="text-[10px] tracking-widest uppercase text-gray-700 font-semibold">Explore Project</span>
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </div>

                      <div className={`h-[2px] w-0 bg-gradient-to-r from-black via-gray-600 to-transparent group-hover:w-full transition-all duration-700 mt-6 ${index === activeIndex ? 'opacity-100' : 'opacity-30'}`}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Images */}
              <div className="hidden lg:block w-[580px] h-[85vh] overflow-hidden rounded-3xl relative shadow-2xl border border-black/10">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none z-10 rounded-3xl"></div>
                
                <div ref={rightColRef} className="flex flex-col p-5 gap-5 pt-5 pb-5 bg-gray-950 backdrop-blur-md transition-transform duration-700 ease-out">
                  {projects.map((project) => (
                    <div key={project.id} className="h-[80vh] w-full rounded-2xl overflow-hidden relative group shadow-2xl border border-black/10 flex-shrink-0 transition-all duration-500">
                      <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-0 group-hover:opacity-30 transition-opacity duration-700 mix-blend-overlay z-10`}></div>
                      
                      <img 
                        src={project.img} 
                        alt={project.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                      />
                      
                      {/* Badge */}
                      <div className="absolute top-4 left-4 z-20">
                        <div className="bg-white/80 backdrop-blur-xl px-6 py-2.5 rounded-full border border-black/20 flex items-center gap-2.5 text-black font-semibold shadow-lg transition-all duration-500 group-hover:shadow-xl group-hover:bg-white/90">
                          <span className="text-[14px] font-bold">{project.id}</span>
                          <div className="w-2.5 h-2.5 rounded-full bg-black animate-pulse shadow-md"></div>
                        </div>
                      </div>

                      {/* View button */}
                      <div className="absolute cursor-pointer bottom-5 right-5 bg-white/80 backdrop-blur-xl px-6 py-3 rounded-full border border-black/20 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-y-0 translate-y-2 z-20 text-black shadow-lg font-semibold">
                        <div className="w-5 h-5 rounded-lg bg-black/10 flex items-center justify-center backdrop-blur-sm border border-black/20">
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <span className="text-[14px] uppercase tracking-[0.15em] font-bold">View Case</span>
                      </div>

                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/10 z-20">
                        <div className="h-full bg-gradient-to-r from-black via-gray-600 to-transparent w-0 group-hover:w-full transition-all duration-1000"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MOBILE VERSION */}
        {isMobile && (
          <div className="flex flex-col bg-gradient-to-b from-[#f0f0f0] via-slate-300 to-[#f0f0f0] pt-0  pb-10">
            
            {/* Header */}
            <div className="px-6 mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-[1.5px] bg-gradient-to-r from-black via-gray-600 to-transparent"></div>
                <h1 className="font-bold text-xs text-black">Featured Categories</h1>
              </div>
            </div>

            {/* Horizontal Nav Links - Scrollable */}
            <div className="px-6 mb-8 overflow-x-auto hide-scrollbar">
              <div ref={navContainerRef} className="flex gap-3 min-w-min">
                {projects.map((project, index) => (
                  <button
                    key={project.id}
                    onClick={() => handleLinkClick(index)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 flex-shrink-0 ${
                      index === activeIndex
                        ? 'bg-black text-white border border-black shadow-lg'
                        : 'bg-white/60 text-black border border-black/20 backdrop-blur-sm'
                    }`}
                  >
                    {project.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content - Stack */}
            <div className="px-6 flex-1">
              <div className="overflow-hidden">
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className={`transition-all duration-500 ${
                      index === activeIndex ? 'opacity-100 transform-none max-h-[auto]' : 'opacity-0 max-h-[0px]'
                    }`}
                  >
                    {/* Image */}
                    <div className="w-full h-64 rounded-2xl overflow-hidden relative mb-6 shadow-lg border border-black/10">
                      <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-0 group-hover:opacity-30 transition-opacity duration-700 mix-blend-overlay z-10`}></div>
                      <img 
                        src={project.img} 
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Badge */}
                      <div className="absolute top-3 left-3 z-20">
                        <div className="bg-white/80 backdrop-blur-xl px-4 py-1.5 rounded-full border border-black/20 flex items-center gap-2 text-black font-semibold text-xs shadow-lg">
                          <span className="font-bold">{project.id}</span>
                          <div className="w-2 h-2 rounded-full bg-black animate-pulse"></div>
                        </div>
                      </div>
                    </div>

                    {/* Title and Date */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 
                        ref={(el) => titleRefs.current[index] = el}
                        className="text-3xl font-black leading-tight bg-clip-text text-transparent bg-gradient-to-br from-black via-black to-gray-800"
                      >
                        {project.title}
                      </h3>
                      <span className="text-[10px] font-mono px-3 py-1.5 rounded-full font-semibold backdrop-blur-md border bg-black/10 border-black/30 text-black flex-shrink-0 whitespace-nowrap mt-1">
                        {project.date}
                      </span>
                    </div>

                    {/* Description - Show for active */}
                    {index === activeIndex && (
                      <div className="space-y-4 animate-in fade-in-50 duration-300">
                        <p 
                          ref={(el) => descRefs.current[index] = el}
                          className="text-xl font-bold leading-snug bg-clip-text text-transparent bg-gradient-to-br from-gray-700 via-gray-800 to-black"
                        >
                          {project.desc}
                        </p>
                        
                        <div className="flex items-center gap-2 opacity-70">
                          <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></div>
                          <span className="text-[9px] tracking-widest uppercase text-gray-700 font-semibold">Explore Project</span>
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>

                        <div className="h-[1px] w-full bg-gradient-to-r from-black via-gray-600 to-transparent mt-6"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <style>{`
              .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          </div>
        )}
      </div>
    </>
  );
};

export default FeaturedCategories;