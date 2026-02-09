import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpRight, Zap, TrendingUp, Users, Target, BarChart3, Search } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import IconButton from '../buttons/IconButton';


gsap.registerPlugin(ScrollTrigger);

const LgLinks = ({
  services,
  headerTitle,
  headerImage,
  viewAllLink,
  viewAllText,
  stats,
  onServiceClick,
  showStats = true
}) => {
  const [hoveredId, setHoveredId] = useState(null);
  const statsRef = useRef(null);
  const statRefs = useRef([]);

  // Animate stats when scrolled into view
  useEffect(() => {
    if (!showStats || !statsRef.current || !stats || stats.length === 0) return;

    const statElements = statRefs.current;
    
    // Store animations to clean up later
    const animations = [];

      statElements.forEach((el, index) => {
        if (!el) return;
  
        const valStr = stats[index].value;
        
        // Extract the first number found for animation base
        const match = valStr.match(/^(\d+)(.*)$/);
        
        if (!match) {
           // No number at start (or at all), just display text
           el.textContent = valStr;
           return;
        }
  
        const numericValue = parseInt(match[1]);
        const suffix = match[2]; // Everything after the initial number, e.g. "/7" or "%" or "+"
  
        // Create a counter object to animate
        const counter = { value: 0 };
  
        const anim = gsap.to(counter, {
          value: numericValue,
          duration: 2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          onUpdate: function () {
            el.textContent = Math.floor(counter.value) + suffix;
          }
        });
        animations.push(anim);
      });

    return () => {
      animations.forEach(anim => {
        if (anim) {
          anim.kill();
          if (anim.scrollTrigger) anim.scrollTrigger.kill();
        }
      });
    };
  }, [stats, showStats]);

  // Icon mapping
  const iconMap = {
    Zap, TrendingUp, Users, Target, BarChart3, Search
  };

  const handleServiceClick = (service) => {
    if (onServiceClick) {
      onServiceClick(service);
    } else if (service.link) {
      window.location.href = service.link;
    }
  };


  return (
    <section className="bg-[#f0f0f0] min-h-screen py-20 px-6 md:px-12 font-sans text-[#1a1a1a]">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
        <h1 className="text-6xl md:text-8xl font-medium flex items-center gap-4 tracking-tight">
          {(headerTitle || '').split(' ')[0]}
          <span className="aspect-square h-[3rem] md:h-[4rem] rounded-xl overflow-hidden inline-block shadow-sm">
            <img
              src={headerImage}
              className="w-full h-full object-cover"
              alt="team"
            />
          </span>
          {(headerTitle || '').split(' ').slice(1).join(' ')}
        </h1>

        <IconButton
          text={viewAllText}
          link={viewAllLink}
          variant="primary"
        />
      </div>

      {/* Services Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => {
          const Icon = iconMap[service.icon] || Target;
          return (
            <div
              key={service.id}
              onMouseEnter={() => setHoveredId(service.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleServiceClick(service)}
              className="group relative bg-white rounded-3xl p-8 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2 border-2 border-gray-200 hover:border-black overflow-hidden"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50/0 to-gray-100/0 group-hover:from-gray-50 group-hover:to-gray-100 transition-all duration-700 rounded-3xl"></div>

              {/* Number Badge */}
              <div className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 group-hover:bg-black group-hover:text-white transition-all duration-300 text-sm font-bold">
                0{service.id}
              </div>

              {/* Icon */}
              <div className="relative mb-6 w-16 h-16 flex items-center justify-center rounded-2xl bg-black group-hover:bg-white group-hover:border-2 group-hover:border-black transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Icon className="text-white group-hover:text-black transition-colors duration-500" size={32} strokeWidth={2} />
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="text-2xl font-bold mb-3 text-gray-900 transition-all duration-300">
                  {service.name}
                </h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                  {service.desc}
                </p>

                {/* CTA Arrow */}
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:gap-3 transition-all duration-300">
                  <span>Explore</span>
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 group-hover:bg-black transition-all duration-300 group-hover:scale-110">
                    <ArrowUpRight className="text-white" size={16} strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Corner Accent Line */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-black group-hover:w-full transition-all duration-500"></div>
            </div>
          );
        })}
      </div>

      {/* Bottom Stats Bar */}
      {showStats && (
        <div ref={statsRef} className="max-w-7xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-3xl bg-black text-white">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group cursor-default">
              <div
                ref={el => statRefs.current[index] = el}
                className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300"
              >
                0
              </div>
              <div className="text-sm text-gray-400 group-hover:text-white transition-colors duration-300">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default LgLinks;