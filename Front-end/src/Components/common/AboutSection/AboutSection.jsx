import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { Sparkles, Paperclip, MessageSquare, Send, Search, Edit3, Briefcase, Zap } from 'lucide-react';
import './AboutSection.css';
import AnimatedCounter from '../AnimatedCounter/AnimatedCounter';
import { publicAPI } from '../../../api/publicData';

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

export default function AboutSection() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef(null);
  const numbersRef = useRef(null);

  // Real platform numbers only — no fabricated fallbacks. A number is shown
  // only when it has a genuine value; otherwise it's omitted.
  const [numbers, setNumbers] = useState([]);

  useEffect(() => {
    let active = true;

    publicAPI.getStats()
      .then((res) => {
        if (!active) return;
        const s = res?.data?.data || {};
        const freelancers = Number(s.freelancers) || 0;
        const projectsDone = (Number(s.completedJobs) || 0) + (Number(s.openJobs) || 0);
        const categories = Number(s.categories) || 0;

        const real = [];
        if (freelancers > 0) real.push({ value: freelancers.toLocaleString(), label: 'Verified Profiles' });
        if (projectsDone > 0) real.push({ value: projectsDone.toLocaleString(), label: 'Projects Done' });
        if (s.successRate != null) real.push({ value: `${s.successRate}%`, label: 'Success Rate' });
        if (categories > 0) real.push({ value: String(categories), label: 'Skill Categories' });
        setNumbers(real);
      })
      .catch(() => { if (active) setNumbers([]); });

    return () => { active = false; };
  }, []);

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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  /* ── Numbers counter animation ── runs only once the real stats have loaded.
     Animating the children on mount (while empty) and then having React insert
     the counter divs into a GSAP-tracked node corrupts the reconciler and
     throws "Failed to execute 'insertBefore'". Keying on `numbers` means GSAP
     only touches the container after React has placed its children. */
  useEffect(() => {
    if (!numbers.length) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(numbersRef.current.children,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: numbersRef.current, start: 'top 85%' },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [numbers]);

  return (
    <section ref={sectionRef} className="about">
      <div className="container">
        {/* ── Split Layout: Editorial Narrative + Layered AI Preview ── */}
        <div ref={headerRef} className="about__split">
          <div className="about__content">
            <div className="section-tag about__tag">
              <span className="about__tag-spark">✨</span>
              <span>Intelligent Freelance Architecture</span>
            </div>

            <h2 className="section-title about__title">
              Built for Students. <br />
              Powered by <span className="about__highlight">Artificial Intelligence.</span>
            </h2>

            <p className="section-subtitle about__desc">
              SkillKart isn't a traditional bidding platform. We have built a specialized
              AI ecosystem that authenticates your real talent, guides your proposals, and connects
              you directly with clients seeking verified micro-deliverables.
            </p>

            <div className="about__btns">
              <Link to="/registration" className="about__btn-primary">
                <span>Start Freelancing</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link to="/about" className="about__btn-secondary">
                Learn Architecture
              </Link>
            </div>

            {/* Compact Platform Metrics Strip */}
            {numbers.length > 0 && (
              <div ref={numbersRef} className="about__metrics-strip">
                {numbers.map((n) => (
                  <div key={n.label} className="about__metric-col">
                    <span className="about__metric-val">
                      <AnimatedCounter value={n.value} />
                    </span>
                    <span className="about__metric-lbl">{n.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Exact Image 3 Composition (3D Robot Avatar + Buddy AI Assistant) */}
          <div className="about__preview-wrapper">
            <div className="about__buddy-stage">
              {/* Left Circular Mascot Badge matching Image 3 */}
              <div className="about__buddy-avatar-badge">
                <div className="about__buddy-avatar-ring">
                  <div className="about__buddy-avatar-status">
                    <span className="about__buddy-status-dot" />
                    <span>AI ACTIVE</span>
                    <Zap size={10} className="about__buddy-zap" />
                  </div>
                  <img
                    src="/assets/buddy-robot.png"
                    alt="Buddy AI Mascot"
                    className="about__buddy-robot-img"
                  />
                </div>
              </div>

              {/* Right Interactive Chatbot Card matching Image 3 */}
              <div className="about__buddy-chat-card">
                {/* Dark teal header */}
                <div className="about__buddy-head">
                  <div className="about__buddy-brand">
                    <div className="about__buddy-head-avatar">
                      <img src="/assets/buddy-robot.png" alt="Buddy" />
                    </div>
                    <div>
                      <h4 className="about__buddy-head-title">Buddy AI</h4>
                      <div className="about__buddy-head-status">
                        <span className="about__buddy-head-dot" />
                        <span>Online / Smart assistant</span>
                      </div>
                    </div>
                  </div>

                  <div className="about__buddy-head-right">
                    <span className="about__buddy-quick-pill">
                      <Sparkles size={11} /> Quick Actions
                    </span>
                    <span className="about__buddy-close-x">✕</span>
                  </div>
                </div>

                {/* 98% Match Ready meter */}
                <div className="about__buddy-meter">
                  <div className="about__buddy-meter-track">
                    <div className="about__buddy-meter-fill" style={{ width: '98%' }} />
                  </div>
                  <span className="about__buddy-meter-text">98% Match Ready</span>
                </div>

                {/* Chat feed */}
                <div className="about__buddy-feed">
                  <div className="about__buddy-bubble">
                    Hi! I'm Buddy 👋, your SkillKart AI assistant.
                  </div>

                  <div className="about__buddy-highlight-box">
                    🚀 AI Matching, Project Estimator & Proposals ready.
                  </div>

                  <div className="about__buddy-bubble">
                    Ask me about finding work, hiring, writing proposals, or pricing a project.
                  </div>

                  <div className="about__buddy-action-pill">
                    <span>Analyzing available gigs...</span>
                    <span className="about__buddy-dots">
                      <span /> <span /> <span />
                    </span>
                  </div>
                </div>

                {/* Quick prompt chips */}
                <div className="about__buddy-chips">
                  <span className="about__buddy-chip">
                    <Search size={11} /> How do I find work?
                  </span>
                  <span className="about__buddy-chip">
                    <Edit3 size={11} /> Help me write a proposal
                  </span>
                  <span className="about__buddy-chip">
                    <Briefcase size={11} /> How does hiring work?
                  </span>
                </div>

                {/* Input bar */}
                <div className="about__buddy-input-wrap">
                  <div className="about__buddy-input-bar">
                    <Paperclip size={15} className="about__buddy-input-icon" />
                    <MessageSquare size={15} className="about__buddy-input-icon" />
                    <input
                      type="text"
                      readOnly
                      placeholder="Ask Buddy anything... (try 'estimate my project')"
                      className="about__buddy-input"
                    />
                    <div className="about__buddy-send-btn">
                      <Send size={13} />
                    </div>
                  </div>

                  <div className="about__buddy-powered">
                    <Zap size={10} color="#F59E0B" />
                    <span>Powered by SkillKart AI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3 Layered Asymmetric Modules ── */}
        <div ref={cardsRef} className="about__modules-grid">
          {FEATURES.map((f) => (
            <div key={f.id} className={`about__module-card about__module-card--${f.color}`}>
              <div className="about__module-top">
                <div className="about__module-icon">{f.icon}</div>
                <span className="about__module-tag">{f.tag}</span>
              </div>
              <h3 className="about__module-title">{f.title}</h3>
              <p className="about__module-desc">{f.desc}</p>

              <ul className="about__module-bullets">
                {f.bullets.map((b) => (
                  <li key={b} className="about__module-bullet">
                    <span className="about__bullet-check">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <Link to="/about" className="about__module-link">
                <span>Explore capability</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
