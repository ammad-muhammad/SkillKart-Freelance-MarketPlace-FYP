import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { Zap } from 'lucide-react';
import './Hero.css';
import FreelancerArcSlider from './FreelancerArcSlider';
import { TOP_FREELANCERS } from './topFreelancers';

export default function Hero() {
  const heroRef    = useRef(null);
  const headingRef = useRef(null);
  const subRef     = useRef(null);
  const btnRowRef  = useRef(null);

  /* ── GSAP entrance ── */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.1 });

    if (headingRef.current) {
      tl.fromTo(headingRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }
      );
    }

    tl.fromTo([subRef.current, btnRowRef.current],
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 }, '-=0.35'
    );
  }, []);

  return (
    <section ref={heroRef} className="hero2">
      {/* ── Ambient Background: 3 Blurred Gradient Blobs + Faint Grid ── */}
      <div className="hero2__bg" aria-hidden="true">
        <div className="hero2__blob hero2__blob--mint" />
        <div className="hero2__blob hero2__blob--cyan" />
        <div className="hero2__blob hero2__blob--blue" />
        <div className="hero2__grid" />
      </div>

      {/* ── Row 1: Content Block (Centered, Normal Flow, Zero Overlap) ── */}
      <div className="hero2__content-block">
        <h1 ref={headingRef} className="hero2__heading">
          <span className="hero2__heading-nowrap">Unlock the Future of Micro&#8209;Freelancing</span>{' '}
          <br className="hero2__desktop-br" />
          <span className="hero2__heading-line2">
            with <span className="hero2__accent">SkillKart.</span>
          </span>
        </h1>

        <p ref={subRef} className="hero2__sub">
          Connect, collaborate, and complete impactful micro-tasks.
          Seamless. Agile. Secure. Ready to deliver.
        </p>

        <div ref={btnRowRef} className="hero2__btns">
          <Link to="/registration" className="hero2__btn-primary">
            <Zap size={15} />
            Join as Talent
          </Link>
          <Link to="/browse-freelancers" className="hero2__btn-glass">
            Hire Experts
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Row 2: Curved Arc Slider Zone (Below Content, Zero Overlap, Fills 1fr) ── */}
      <FreelancerArcSlider freelancers={TOP_FREELANCERS} />
    </section>
  );
}
