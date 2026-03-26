import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import './AboutSection.css';
import AnimatedCounter from '../AnimatedCounter/AnimatedCounter';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    id: 1,
    icon: '🛡️',
    color: 'blue',
    tag: 'Module 01',
    title: 'AI-Driven Verification',
    desc: 'Our advanced AI authenticates your certificates, qualifications, and project portfolios. Clients see a verified badge — you get trusted instantly.',
    bullets: [
      'Certificate & CV authentication',
      'Skill gap analysis & suggestions',
      'Trusted freelancer badges',
    ],
  },
  {
    id: 2,
    icon: '🤖',
    color: 'accent',
    tag: 'Module 02',
    title: 'Buddy AI Assistant',
    desc: 'Your intelligent work companion — analyzes your portfolio, estimates project costs, suggests winning bid strategies, and provides real-time guidance.',
    bullets: [
      'Portfolio & online presence analysis',
      'Smart bidding & cost estimation',
      'Personalized opportunity alerts',
    ],
  },
  {
    id: 3,
    icon: '⚙️',
    color: 'dark',
    tag: 'Module 03',
    title: 'Smart CMS Platform',
    desc: 'A complete project management ecosystem — from posting gigs to tracking milestones and completing secure transactions, all in one place.',
    bullets: [
      'End-to-end project management',
      'Secure payment transactions',
      'Admin analytics dashboard',
    ],
  },
];

const NUMBERS = [
  { value: '50K+', label: 'Verified Profiles' },
  { value: '12K+', label: 'Projects Done' },
  { value: '98%', label: 'Success Rate' },
  { value: '120+', label: 'Skill Categories' },
];

export default function AboutSection() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef(null);
  const numbersRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* ── Header ── */
      gsap.fromTo([headerRef.current.querySelector('.about__header-content').children, headerRef.current.querySelector('.about__header-visual')],
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 85%' },
        }
      );

      /* ── Feature cards ── */
      gsap.fromTo(cardsRef.current.children,
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: cardsRef.current, start: 'top 80%' },
        }
      );

      /* ── Numbers counter animation ── */
      gsap.fromTo(numbersRef.current.children,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: numbersRef.current, start: 'top 85%' },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="about">
      {/* ── Header ── */}
      <div className="container">
        <div ref={headerRef} className="about__header-row">
          <div className="about__header-content">
            <div className="section-tag">
              <span>✨</span> What Makes Us Different
            </div>
            <h2 className="section-title">
              Built for Students. <br />
              Powered by <span className="about__highlight">Artificial Intelligence.</span>
            </h2>
            <p className="section-subtitle">
              SkillKart isn't just another freelancing platform. We've engineered a full
              AI ecosystem that verifies your potential, guides your career, and connects
              you with opportunities perfectly suited for your skillset.
            </p>
            <div className="about__header-btns">
              <Link to="/registration" className="btn-primary">Get Started</Link>
              <Link to="/about" className="btn-secondary">Learn More</Link>
            </div>
          </div>

          <div className="about__header-visual">
            <div className="about__visual-box">
              <img
                src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
                alt="AI Ecosystem"
                className="about__visual-img"
              />
              <div className="about__floating-badge about__floating-badge--1">
                <div className="badge-icon">🤖</div>
                <div className="badge-text">
                  <span>Buddy AI</span>
                  <p>Always Active</p>
                </div>
              </div>
              <div className="about__floating-badge about__floating-badge--2">
                <div className="badge-icon">✅</div>
                <div className="badge-text">
                  <span>Verified</span>
                  <p>Profiles Only</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature Cards ── */}
        <div ref={cardsRef} className="about__cards">
          {FEATURES.map(f => (
            <div key={f.id} className={`about__card about__card--${f.color}`}>
              <div className="about__card-top">
                <div className="about__card-icon">{f.icon}</div>
                <span className="about__card-tag">{f.tag}</span>
              </div>
              <h3 className="about__card-title">{f.title}</h3>
              <p className="about__card-desc">{f.desc}</p>
              <ul className="about__card-bullets">
                {f.bullets.map(b => (
                  <li key={b}>
                    <span className="about__bullet-check">✓</span> {b}
                  </li>
                ))}
              </ul>
              <a href="#" className="about__card-link">
                Learn more
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          ))}
        </div>

        <div ref={numbersRef} className="about__numbers">
          {NUMBERS.map(n => (
            <div key={n.label} className="about__number-item">
              <AnimatedCounter value={n.value} />
              <span className="about__number-lbl">{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
