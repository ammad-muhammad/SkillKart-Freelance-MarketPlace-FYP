import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './TeamLegacy.css';

gsap.registerPlugin(ScrollTrigger);

const TEAM_MEMBERS = [
    {
        id: 0,
        name: 'Muhammad Ammad',
        position: 'Chief Executive Officer',
        tag: 'Visionary',
        image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=800',
        description: "Architecting the future of student-led innovation. We don't just follow trends; we set the narrative for the next decade.",
    },
    {
        id: 1,
        name: 'Sumair',
        position: 'Founder',
        tag: 'Pioneer',
        image: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=800',
        description: "Driving the core philosophy of SkillKart. Award-winning excellence is our baseline, not our ceiling.",
    },
    {
        id: 2,
        name: 'Sherry',
        position: 'Co-Founder',
        tag: 'Architect',
        image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=800',
        description: "Bridging the gap between human potential and AI efficiency. We build for people, not just algorithms.",
    },
    {
        id: 3,
        name: 'Shammer',
        position: 'Marketing Lead',
        tag: 'Growth',
        image: 'https://images.pexels.com/photos/837358/pexels-photo-837358.jpeg?auto=compress&cs=tinysrgb&w=800',
        description: "Spreading the legacy globally. We take ideas to results in record time, creating waves that others ride.",
    },
    {
        id: 4,
        name: 'Syed Obaid',
        position: 'Co-CEO',
        tag: 'Strategy',
        image: 'https://images.pexels.com/photos/775358/pexels-photo-775358.jpeg?auto=compress&cs=tinysrgb&w=800',
        description: "Masterminding strategic operations. Scaling the legacy through precision and relentless dedication.",
    },
    {
        id: 5,
        name: 'Lamiz Khan',
        position: 'QA Lead',
        tag: 'Quality',
        image: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=800',
        description: "Ensuring every detail fits the legacy. Perfection is in the process, and we own the standard.",
    },
];

const TeamLegacy = () => {
    const sectionRef = useRef(null);
    const scrollRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        // ── Interactive Neural Network Background ──
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null, radius: 150 };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
                if (this.y > canvas.height || this.y < 0) this.speedY *= -1;

                // Mouse reaction
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    if (mouse.x < this.x && this.x < canvas.width - 10) this.x += 2;
                    if (mouse.x > this.x && this.x > 10) this.x -= 2;
                    if (mouse.y < this.y && this.y < canvas.height - 10) this.y += 2;
                    if (mouse.y > this.y && this.y > 10) this.y -= 2;
                }
            }
            draw() {
                ctx.fillStyle = 'rgba(4, 46, 76, 0.2)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            particles = [];
            for (let i = 0; i < 100; i++) particles.push(new Particle());
        };

        const connect = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    let dx = particles[a].x - particles[b].x;
                    let dy = particles[a].y - particles[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        ctx.strokeStyle = `rgba(4, 46, 76, ${0.1 * (1 - distance / 100)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            connect();
            requestAnimationFrame(animate);
        };

        init();
        animate();

        // ── Horizontal Scroll Showcase ──
        // IMPORTANT: ScrollTrigger `pin: true` re-parents the pinned section into
        // a generated `.pin-spacer` div (a DOM mutation outside React's knowledge).
        // If we set this up on mount, sibling home sections that render their
        // async/API data a moment later mutate <main>'s children while React still
        // believes this <section> is a direct child of <main> — which throws
        // "Failed to execute 'insertBefore' ... not a child of this node" and
        // blanks the page. We defer pin setup to the next frame and scope every
        // trigger to a gsap.context so it tears down cleanly.
        let gsapCtx;
        const rafId = requestAnimationFrame(() => {
            const horizontalSections = scrollRef.current;
            if (!horizontalSections) return;

            gsapCtx = gsap.context(() => {
                const totalWidth = horizontalSections.scrollWidth - window.innerWidth;

                const scrollTween = gsap.fromTo(horizontalSections, 
                    { x: 0 },
                    {
                        x: -totalWidth,
                        ease: "none",
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: "top top",
                            end: `+=${totalWidth * 1.5}`,
                            pin: true,
                            pinSpacing: true,
                            invalidateOnRefresh: true,
                            scrub: 1,
                        }
                    }
                );

                // ── Reveal Animations for each slide ──
                const slides = horizontalSections.querySelectorAll('.legacy-showcase-item');
                slides.forEach(slide => {
                    gsap.fromTo(slide.querySelector('.showcase-content'),
                        { opacity: 0, x: 100 },
                        {
                            opacity: 1, x: 0,
                            scrollTrigger: {
                                trigger: slide,
                                containerAnimation: scrollTween,
                                start: "left center",
                                toggleActions: "play none none reverse",
                            }
                        }
                    );
                });
            }, sectionRef);

            // Recompute pin/scroll geometry once async sibling sections have settled.
            ScrollTrigger.refresh();
        });

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            gsapCtx?.revert();
        };
    }, []);

    return (
        <section ref={sectionRef} className="team-legacy-v2">
            <canvas ref={canvasRef} className="neural-bg" />

            <div className="legacy-intro">
                <div className="section-tag"><span>💎</span> The Foundation</div>
                <h2 className="legacy-title">Legacy in the <span className="highlight">Making.</span></h2>
            </div>

            <div ref={scrollRef} className="legacy-showcase-container">
                {TEAM_MEMBERS.map((member) => (
                    <div key={member.id} className="legacy-showcase-item">
                        <div className="showcase-card">
                            <div className="showcase-image-wrapper">
                                <img src={member.image} alt={member.name} className="showcase-img" />
                                <div className="showcase-img-overlay"></div>
                                <div className="showcase-member-tag">{member.tag}</div>
                            </div>

                            <div className="showcase-content">
                                <span className="showcase-pos">{member.position}</span>
                                <h3 className="showcase-name">{member.name}</h3>
                                <div className="showcase-line"></div>
                                <p className="showcase-desc">{member.description}</p>
                                <div className="showcase-footer">
                                    <span className="year">2025</span>
                                    <div className="dot"></div>
                                    <span className="brand">SKILLKART ORIGIN</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {/* Placeholder for end scroll padding */}
                <div className="showcase-padding"></div>
            </div>
        </section>
    );
};

export default TeamLegacy;
