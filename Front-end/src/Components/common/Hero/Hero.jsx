import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { Bot, Users, Star, CheckCircle2 } from 'lucide-react';
import './Hero.css';
import { publicAPI } from '../../../api/publicData';

/* ── Floating stat cards (real values only — populated from /public/stats) ── */
const STAT_DEFS = [
  { key: 'freelancers', label: 'Verified Freelancers', Icon: Users, fmt: (n) => `${n.toLocaleString()}+` },
  { key: 'successRate', label: 'Client Satisfaction',  Icon: Star, fmt: (n) => `${n}%` },
  { key: 'completedJobs', label: 'Projects Completed', Icon: CheckCircle2, fmt: (n) => `${n.toLocaleString()}+` },
];

/* ── Animated skill pills (decorative category labels) ── */
const SKILL_PILLS = [
  'React Developer', 'UI/UX Design', 'AI Engineer',
  'Data Science', 'Mobile App Dev', 'Content Writing',
  'Video Editing', 'SEO Expert',
];

export default function Hero() {
  const sectionRef = useRef(null);
  const tagRef = useRef(null);
  const headingRef = useRef(null);
  const subRef = useRef(null);
  const btnRowRef = useRef(null);
  const statsRef = useRef(null);
  const visualRef = useRef(null);
  const pillsRef = useRef(null);
  const bgRef = useRef(null);

  // Real platform stats only — no fabricated fallbacks. Cards with no real
  // value are simply not rendered.
  const [stats, setStats] = useState([]);
  const [trustCount, setTrustCount] = useState(null); // real user count, or null

  useEffect(() => {
    let active = true;

    publicAPI.getStats()
      .then((res) => {
        if (!active) return;
        const s = res?.data?.data || {};
        const totalUsers = Number(s.totalUsers) || 0;
        if (totalUsers > 0) setTrustCount(`${totalUsers.toLocaleString()}+`);

        // Only include a stat card when its real value exists (> 0 / non-null).
        const real = STAT_DEFS
          .map((def) => {
            const v = s[def.key];
            if (v == null || Number(v) <= 0) return null;
            return { label: def.label, Icon: def.Icon, value: def.fmt(Number(v)) };
          })
          .filter(Boolean);
        setStats(real);
      })
      .catch(() => { if (active) setStats([]); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    /* ── Entrance timeline ── */
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 });

    tl.fromTo(bgRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, ease: 'power2.inOut' }
    )
      .fromTo(tagRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }, '-=0.6')

      .fromTo(headingRef.current.querySelectorAll('.hero__word'),
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, duration: 0.7, ease: 'power4.out' }, '-=0.2')

      .fromTo(subRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')

      .fromTo(btnRowRef.current.children,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.12, duration: 0.5 }, '-=0.3')

      .fromTo(pillsRef.current?.children ? Array.from(pillsRef.current.children) : [],
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.06, duration: 0.4 }, '-=0.3')

      .fromTo(statsRef.current?.children ? Array.from(statsRef.current.children) : [],
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.12, duration: 0.5 }, '-=0.4')

      .fromTo(visualRef.current,
        { x: 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=1.2');

    /* ── Floating orbs parallax ── */
    const orbs = sectionRef.current.querySelectorAll('.hero__orb');
    const onMouseMove = (e) => {
      const { innerWidth: W, innerHeight: H } = window;
      const xPct = (e.clientX / W - 0.5) * 2;
      const yPct = (e.clientY / H - 0.5) * 2;
      orbs.forEach((orb, i) => {
        const depth = (i + 1) * 12;
        gsap.to(orb, {
          x: xPct * depth,
          y: yPct * depth,
          duration: 1.2,
          ease: 'power2.out',
        });
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  /* ── Split heading into words for staggered reveal ── */
  const headingWords = ['Find', 'Top', 'Talent,', 'Build', 'Your', 'Future.'];

  return (
    <section ref={sectionRef} className="hero">
      {/* ── Background ── */}
      <div ref={bgRef} className="hero__bg">
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />
        <div className="hero__grid-overlay" />
      </div>

      <div className="container hero__inner">
        {/* ── Left: Copy ── */}
        <div className="hero__copy">
          <div ref={tagRef} className="section-tag hero__tag" style={{ color: '#e3e5e8ff', borderColor: 'rgba(14, 14, 14, 0.35)', background: 'rgba(160, 168, 179, 0.1)' }}>
            <Bot size={15} /> AI-Powered Freelancing Platform
          </div>

          <h1 ref={headingRef} className="hero__heading">
            {headingWords.map((w, i) => (
              <span key={i} className="hero__word">
                {w}{i === 2 ? ' ' : ' '}
              </span>
            ))}
          </h1>

          {/* <p ref={subRef} className="hero__sub">
            SkillKart connects verified student freelancers with global clients using
            advanced AI smart matching, credential verification, and an intelligent
            Buddy AI that guides every step of your freelance journey.
          </p> */}

          {/* ── Skill pills ── */}
          <div ref={pillsRef} className="hero__pills">
            {SKILL_PILLS.map(skill => (
              <span key={skill} className="hero__pill">{skill}</span>
            ))}
          </div>




          {/* ── CTA row ── */}
          <div ref={btnRowRef} className="hero__btns">
            <Link to="/browse-freelancers" className="hero__btn-main">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              Find Talent
            </Link>
            <Link to="/browse-projects" className="hero__btn-outline">
              Start Freelancing
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* ── Social proof (only with a real member count) ── */}
          {trustCount && (
            <div className="hero__trust">
              <div className="hero__trust-avatars">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="hero__avatar" style={{ background: `hsl(${200 + i * 20}, 50%, ${40 + i * 5}%)` }}>
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="hero__trust-text">
                Trusted by <strong>{trustCount}</strong> students & graduates
              </span>
            </div>
          )}
        </div>

        {/* ── Right: Visual ── */}
        <div ref={visualRef} className="hero__visual">
          {/* ── Dashboard card ── */}
          <div className="hero__dashboard">
            <div className="hero__dashboard-header">
              <div className="hero__dashboard-dots">
                <span style={{ background: '#ff5f57' }} />
                <span style={{ background: '#febc2e' }} />
                <span style={{ background: '#28c840' }} />
              </div>
              <span className="hero__dashboard-title">SkillKart Dashboard</span>
            </div>
            <div className="hero__dashboard-body">
              {/* Profile row */}
              <div className="hero__db-profile">
                <div className="hero__db-avatar">SA</div>
                <div>
                  <div className="hero__db-name">Sarah Ahmed</div>
                  <div className="hero__db-role">UI/UX Designer · ⭐ 4.9</div>
                </div>
                <div className="hero__db-badge">Verified ✓</div>
              </div>

              {/* Stats mini row */}
              <div className="hero__db-stats">
                {[
                  { label: 'Projects', value: '28' },
                  { label: 'Earnings', value: '$4.2k' },
                  { label: 'Reviews', value: '47' },
                ].map(s => (
                  <div key={s.label} className="hero__db-stat">
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* AI insight card */}
              <div className="hero__db-ai">
                <div className="hero__db-ai-icon"><Bot size={20} /></div>
                <div>
                  <div className="hero__db-ai-title">Buddy AI Insight</div>
                  <div className="hero__db-ai-text">
                    Add Figma skills to boost your profile by 34% and unlock 12 new opportunities.
                  </div>
                </div>
              </div>

              {/* Progress bars */}
              <div className="hero__db-skills">
                {[
                  { name: 'UI Design', pct: 92 },
                  { name: 'Prototyping', pct: 78 },
                  { name: 'User Research', pct: 65 },
                ].map(s => (
                  <div key={s.name} className="hero__db-skill-row">
                    <div className="hero__db-skill-header">
                      <span>{s.name}</span>
                      <span>{s.pct}%</span>
                    </div>
                    <div className="hero__db-bar">
                      <div className="hero__db-bar-fill" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Floating stat cards ── */}
          {stats.map((stat, i) => (
            <div key={stat.label} className={`hero__stat-card hero__stat-card--${i + 1}`}>
              <span className="hero__stat-icon"><stat.Icon size={18} /></span>
              <div>
                <div className="hero__stat-val">{stat.value}</div>
                <div className="hero__stat-lbl">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom wave ── */}
      <div className="hero__wave">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
        </svg>
      </div>
    </section>
  );
}
