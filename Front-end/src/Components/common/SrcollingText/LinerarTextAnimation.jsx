import React, { useEffect, useRef } from 'react';

const LinerarTextAnimation = ({ items = [] }) => {
    const containerRef = useRef(null);
    const scrollingRef = useRef(null);
    const animationRef = useRef(null);
    const scrollVelocityRef = useRef(0);
    const lastScrollY = useRef(0);

    // Default items if none provided
    const defaultItems = [
        { text: 'Chasing Consumers', image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop' },
        { text: 'Not Algorithms', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop' },
        { text: 'Chasing Consumers', image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop' },
        { text: 'Not Algorithms', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop' },
    ];

    const displayItems = items.length > 0 ? items : defaultItems;

    useEffect(() => {
        const scrollingElement = scrollingRef.current;
        if (!scrollingElement) return;

        // Wait for images to load to get accurate width
        const initAnimation = () => {
            const itemWidth = scrollingElement.children[0]?.offsetWidth || 0;
            const totalWidth = itemWidth * displayItems.length;

            // Start from 40% position for true infinite feel
            let currentX = -(totalWidth * 0.4);

            // Base animation (continuous forward scroll)
            const baseSpeed = 0.5; // pixels per frame

            const animate = () => {
                // Apply scroll velocity influence
                currentX -= baseSpeed + scrollVelocityRef.current * 0.3;

                // Gradually reduce scroll velocity (momentum effect)
                scrollVelocityRef.current *= 0.95;

                // Loop seamlessly - reset when we've scrolled one full set
                if (currentX <= -totalWidth) {
                    currentX += totalWidth;
                } else if (currentX > 0) {
                    currentX -= totalWidth;
                }

                scrollingElement.style.transform = `translateX(${currentX}px)`;
                animationRef.current = requestAnimationFrame(animate);
            };

            animationRef.current = requestAnimationFrame(animate);
        };

        // Small delay to ensure DOM is ready
        setTimeout(initAnimation, 100);

        // Handle scroll events
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollY.current;

            // Update velocity based on scroll direction
            scrollVelocityRef.current = delta * 0.5;
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            window.removeEventListener('scroll', handleScroll);
        };
    }, [displayItems]);

    return (
        <div className="bg-[#f0f0f0]">
            {/* Scrolling section */}
            <div
                ref={containerRef}
                className="w-full overflow-hidden pt-4 pb-14 lg:pt-14 lg:pb-14"
            >
                <div
                    ref={scrollingRef}
                    className="flex items-center gap-4 lg:gap-10 px-2 lg:px-5 whitespace-nowrap"
                >
                    {/* Render items three times for truly seamless infinite loop */}
                    {[...displayItems, ...displayItems, ...displayItems].map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 lg:gap-6 flex-shrink-0"
                        >
                            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-gray-900">
                                {item.text}
                            </h1>
                            <div className="w-24 h-24 md:w-32 md:h-32 lg:w-24 lg:h-24 rounded-2xl lg:rounded-2xl overflow-hidden flex-shrink-0">
                                <img
                                    src={item.image}
                                    alt={item.text}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LinerarTextAnimation;