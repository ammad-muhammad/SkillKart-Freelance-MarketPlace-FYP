import React, { useEffect, useRef, useState } from 'react';

const FeaturedCategories = () => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const rightColRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const projects = [
    { id: '01', title: 'SIXT', desc: 'Leading E Sim brand globally', date: '[2023-2025]', color: 'from-orange-600 to-red-700', img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800' },
    { id: '02', title: 'JD Sports', desc: 'Global Sportswear Leader', date: '[2024-2025]', color: 'from-blue-600 to-indigo-700', img: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800' },
    { id: '03', title: 'Parkdean Resorts', desc: 'UK Holiday Parks', date: '[2025]', color: 'from-green-600 to-teal-700', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' },
    { id: '04', title: 'Apple', desc: 'Spatial Audio Tech', date: '[2025]', color: 'from-purple-600 to-pink-700', img: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800' },
  ];

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateScrollAnimation();
          ticking = false;
        });
        ticking = true;
      }
    };

    const updateScrollAnimation = () => {
      if (!sectionRef.current || !contentRef.current) return;

      const section = sectionRef.current;
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Check if section is in view
      if (sectionTop > 0 || sectionTop + sectionHeight < windowHeight) {
        return;
      }

      // Calculate progress through the pinned section
      const scrollProgress = Math.abs(sectionTop) / (sectionHeight - windowHeight);
      const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

      // Determine active slide
      const slideIndex = Math.min(
        Math.floor(clampedProgress * projects.length),
        projects.length - 1
      );

      if (slideIndex !== activeIndex) {
        setActiveIndex(slideIndex);
      }

      // Animate right column
      if (rightColRef.current) {
        const slideHeight = windowHeight * 0.8;
        const targetScroll = slideIndex * (slideHeight + 20);
        rightColRef.current.style.transform = `translateY(-${targetScroll}px)`;
      }

      // Parallax on content
      if (contentRef.current) {
        contentRef.current.style.transform = `translateY(-${clampedProgress * 80}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollAnimation();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeIndex]);

  const handleLinkClick = (index) => {
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

  return (
    <>
      {/* Main pinned section */}
      <div 
        ref={sectionRef}
        className="relative bg-gradient-to-b from-gray-900 via-black to-gray-900"
        style={{ height: `${projects.length * 100}vh` }}
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <div className="relative flex h-full w-full items-center px-12 lg:px-24">
            
            {/* Background effects */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]"></div>
            </div>

            {/* Header */}
            <div className="absolute top-12 left-12 lg:left-24 z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-[1px] bg-gradient-to-r from-white/60 to-transparent"></div>
                <h2 className="font-bold  opacity-80 text-white/90">Featured Categories</h2>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-12 left-12 lg:left-24 z-20 opacity-60">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] tracking-widest uppercase">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-white/60 to-transparent"></div>
              </div>
            </div>

            {/* Left Column - Links */}
            <div className="w-full lg:w-[58%] z-10">
              <div ref={contentRef} className="flex flex-col gap-4 transition-transform duration-300 ease-out">
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
                      <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-xs font-mono text-white">{project.id}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="flex items-start gap-3 relative">
                      <h3 className="text-[5.5rem] lg:text-[7.5vw] font-bold leading-[0.85] tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/70 transition-all duration-500 group-hover:tracking-tight">
                        {project.title}
                      </h3>
                      <span className="text-[11px] font-mono ml-2 mt-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 backdrop-blur-sm opacity-70 text-white">{project.date}</span>
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
                      <p className="text-[3.5rem] lg:text-[4.5vw] font-bold leading-[0.95] tracking-tight mt-2 text-white/60">
                        {project.desc}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-6 opacity-70">
                        <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                        <span className="text-[10px] tracking-widest uppercase text-white">Explore Project</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round"  stroke={"white"} strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>

                    <div className="h-[1px] w-0 bg-gradient-to-r from-white/60 to-transparent group-hover:w-full transition-all duration-700 mt-4"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Images */}
            <div className="hidden lg:block w-[580px] h-[85vh] overflow-hidden rounded-3xl relative shadow-2xl border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none z-10 rounded-3xl"></div>
              
              <div ref={rightColRef} className="flex flex-col p-5 gap-5 bg-black/40 backdrop-blur-md transition-transform duration-700 ease-out">
                {projects.map((project) => (
                  <div key={project.id} className="h-[80vh] w-full rounded-2xl overflow-hidden relative group shadow-xl border border-white/10 flex-shrink-0">
                    <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-0 group-hover:opacity-30 transition-opacity duration-700 mix-blend-overlay z-10`}></div>
                    
                    <img 
                      src={project.img} 
                      alt={project.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-4 left-4 z-20">
                      <div className="bg-white/60 backdrop-blur-xl px-6 py-2 rounded-full border border-white/20 flex items-center gap-2 text-black">
                        <span className="text-[14px] font-bold  opacity-80">{project.id}</span>
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      </div>
                    </div>

                    {/* View button */}
                    <div className="absolute cursor-pointer bottom-5 right-5 bg-white/60 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-y-0 translate-y-2 z-20 text-black">
                      <div className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <span className="text-[14px] uppercase tracking-[0.15em] font-semibold">View Case</span>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20">
                      <div className="h-full bg-gradient-to-r from-white/60 to-white/20 w-0 group-hover:w-full transition-all duration-1000"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default FeaturedCategories;