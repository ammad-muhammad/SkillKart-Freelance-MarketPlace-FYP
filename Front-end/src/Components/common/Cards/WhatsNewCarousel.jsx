import React, { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import gsap from 'gsap';
import 'swiper/css';
import 'swiper/css/pagination';
import IconButton from '../buttons/IconButton';

const WhatsNewCarousel = ({ 
  posts = [],
  sectionTitle = "What's",
  sectionTitleHighlight = "New",
  decorativeImage,
  ctaText = "Explore More Thoughts",
  ctaLink = "#",
  className = ""
}) => {
  const headingRef = useRef(null);
  const decorativeImgRef = useRef(null);
  const [isHovered, setIsHovered] = useState(null);

  useEffect(() => {
    // Animate heading on mount
    if (headingRef.current) {
      gsap.fromTo(
        headingRef.current.children,
        { 
          opacity: 0, 
          y: 30,
          filter: 'blur(10px)'
        },
        { 
          opacity: 1, 
          y: 0,
          filter: 'blur(0px)',
          duration: 0.8,
          stagger: 0.1,
          ease: 'power2.out'
        }
      );
    }

    // Animate decorative image
    if (decorativeImgRef.current) {
      gsap.fromTo(
        decorativeImgRef.current,
        { 
          scale: 0,
          rotation: -180,
          opacity: 0
        },
        { 
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 1,
          delay: 0.2,
          ease: 'elastic.out(1, 0.5)'
        }
      );
    }
  }, []);

  const handleCardHover = (postId, isEntering) => {
    setIsHovered(isEntering ? postId : null);
  };

  return (
    <section className={`w-full pb-12 pt-10 xl:pt-0 xl:pb-24 bg-[#f0f0f0] ${className}`}>
      <div className="w-full px-0">
        <div className="grid grid-cols-12 gap-y-3 md:gap-y-7 gap-x-3 md:gap-x-5">
          
          {/* Header */}
          <div className="col-span-12 px-4 pb-6 xl:pb-0 md:px-7">
            <div className="grid grid-cols-12 md:border-b md:border-gray-200 md:pb-5 gap-y-3 md:gap-y-7 gap-x-3 md:gap-x-5">
              
              <div className="col-span-12 md:col-span-9 flex items-end">
                <h1 
                  ref={headingRef}
                  className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 flex flex-wrap items-center gap-3"
                >
                  <span>{sectionTitle}</span>
                  {decorativeImage && (
                    <span 
                      ref={decorativeImgRef}
                      className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg"
                    >
                      <img 
                        src={decorativeImage} 
                        alt="Decorative" 
                        className="w-full h-full object-cover"
                      />
                    </span>
                  )}
                  <span>{sectionTitleHighlight}</span>
                </h1>
              </div>

              <div className="col-span-12 md:col-span-3 md:items-center md:justify-end hidden md:flex">
                <IconButton 
                text={ctaText} 
                link={ctaLink} 
                variant="primary" 
              />
              </div>
            </div>
          </div>

          {/* Carousel */}
          <div className="col-span-12 lg:px-7">
            <Swiper
              modules={[Pagination]}
              slidesPerView={1.15}
              spaceBetween={15}
              loop={posts.length > 3}
              speed={700}
              pagination={{
                el: '.custom-pagination',
                type: 'progressbar',
              }}
              breakpoints={{
                768: {
                  slidesPerView: 2.15,
                },
                1024: {
                  loop: false,
                  slidesPerView: 3,
                  spaceBetween: 15,
                },
                1280: {
                  loop: false,
                  slidesPerView: 3,
                  spaceBetween: 20,
                }
              }}
              className="!py-2"
            >
              {posts.map((post) => (
                <SwiperSlide key={post.id}>
                  <a 
                    href={post.link || '#'}
                    className="block w-full"
                    onMouseEnter={() => handleCardHover(post.id, true)}
                    onMouseLeave={() => handleCardHover(post.id, false)}
                  >
                    <div 
                      className={`flex flex-col gap-y-5 transition-transform duration-300 ${
                        isHovered === post.id ? '-translate-y-2' : ''
                      }`}
                    >
                      {/* Image Container */}
                      <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden aspect-square group">
                        {/* Category Badge */}
                        {post.category && (
                          <div className="absolute top-3 left-3 z-20">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white backdrop-blur-sm ${
                              post.categoryBg || 'bg-purple-500'
                            } bg-opacity-80`}>
                              {post.category}
                            </span>
                          </div>
                        )}

                        {/* Blur Effect Layer */}
                        <div className="absolute inset-0 z-10">
                          <div 
                            className={`w-full h-full transition-all duration-1000 ${
                              isHovered === post.id ? 'blur-md scale-110' : ''
                            }`}
                          >
                            <img 
                              src={post.image} 
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Main Image */}
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover relative z-0"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex flex-col gap-y-3">
                        {/* Meta Info */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Author Badge */}
                          {(post.author || post.authors) && (
                            <div className="inline-flex items-center gap-x-2 px-3 py-1 rounded-full text-sm font-medium text-gray-700 bg-white border border-gray-200">
                              <div className="flex items-center -ml-1.5">
                                {post.authorImages ? (
                                  post.authorImages.map((img, idx) => (
                                    <div key={idx} className="w-5 h-5 rounded-full overflow-hidden -mr-1 border-2 border-white">
                                      <img src={img} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ))
                                ) : post.authorImage ? (
                                  <div className="w-5 h-5 rounded-full overflow-hidden -mr-1 border-2 border-white">
                                    <img src={post.authorImage} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ) : null}
                              </div>
                              <span className="text-sm">
                                {post.authors ? post.authors.join(', ') : post.author}
                              </span>
                            </div>
                          )}

                          {/* Read Time Badge */}
                          {post.readTime && (
                            <div className="inline-flex items-center gap-x-2 px-3 py-1 rounded-full text-sm font-medium text-gray-700 bg-white border border-gray-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{post.readTime}</span>
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl xl:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                          {post.title}
                        </h3>
                      </div>
                    </div>
                  </a>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Pagination */}
            <div className="w-full px-4 md:px-7 mt-5">
              <div className="custom-pagination !h-1 !bg-gray-200 !rounded-full overflow-hidden">
                <div className="swiper-pagination-progressbar-fill !bg-gray-900 !rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="col-span-12 md:hidden px-4 md:px-7 flex items-center justify-center">
          <IconButton 
                text={ctaText} 
                link={ctaLink} 
                variant="primary" 
              />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsNewCarousel;