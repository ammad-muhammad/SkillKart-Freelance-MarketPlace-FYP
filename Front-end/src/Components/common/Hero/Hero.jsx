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

// Proper unbiased Fisher-Yates shuffle. `array.sort(() => Math.random() - 0.5)`
// is a well-known anti-pattern — most engines' sort implementations leave
// elements disproportionately close to their original position, so the
// "random" picks end up repeating the same few faces far more than chance.
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Compact PKR amount for the small dashboard stat card, e.g. 1684652 -> "1.7M".
const formatCompactAmount = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return `${Math.round(v)}`;
};

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
  const [topFreelancers, setTopFreelancers] = useState([]); // real top-rated freelancers for trust avatars
  const [showcaseFreelancer, setShowcaseFreelancer] = useState(null); // real freelancer for the dashboard mock-up

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

    // Real top-rated freelancers → the trust-strip avatars. Pull a wider pool
    // and pick 4 at random each load so the strip feels fresh on every visit.
    publicAPI.getTopFreelancers(12)
      .then((res) => {
        if (!active) return;
        const list = res?.data?.data?.freelancers || [];
        const withAvatar = list.filter(f => f?.avatar); // prefer real photos
        const pool = withAvatar.length >= 4 ? withAvatar : list;
        const four = shuffle(pool).slice(0, 4);
        setTopFreelancers(four);

        // Dashboard mock-up: showcase a random *proven* freelancer each load —
        // "good" means a real track record (completed projects, strong
        // rating), not just whoever happens to be highest-rated with 0
        // projects yet. Falls back to a looser bar only if nobody qualifies.
        const proven = list.filter(f => (f.completedProjects || 0) > 0 && (f.rating || 0) >= 4.5);
        const decent = list.filter(f => (f.completedProjects || 0) > 0);
        const showcasePool = proven.length ? proven : (decent.length ? decent : list);
        if (showcasePool.length) {
          setShowcaseFreelancer(showcasePool[Math.floor(Math.random() * showcasePool.length)]);
        }
      })
      .catch(() => { if (active) setTopFreelancers([]); });

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
              <span key={i} className="hero__word">{w}&nbsp;</span>
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
                {(topFreelancers.length ? topFreelancers : [null, null, null, null]).map((fl, i) => {
                  const initials = fl?.name
                    ? fl.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                    : String.fromCharCode(65 + i);
                  return (
                    <div
                      key={fl?.id || i}
                      className="hero__avatar"
                      style={{ background: `hsl(${200 + i * 20}, 50%, ${40 + i * 5}%)` }}
                      title={fl?.name || undefined}
                    >
                      {/* initials sit underneath; the photo overlays and, if it
                          fails to load, hides itself to reveal the initials */}
                      <span className="hero__avatar-initials">{initials}</span>
                      {fl?.avatar && (
                        <img
                          src={fl.avatar}
                          alt={fl.name}
                          className="hero__avatar-img"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  );
                })}
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
              {/* Profile row — a real freelancer, picked as the top-rated
                  pool member with the most completed projects (no fabricated
                  fallback: the whole row is skipped until real data loads). */}
              {showcaseFreelancer && (
                <div className="hero__db-profile">
                  <div className="hero__db-avatar">
                    {showcaseFreelancer.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="hero__db-name">{showcaseFreelancer.name}</div>
                    <div className="hero__db-role">
                      {showcaseFreelancer.role || 'Freelancer'}
                      {showcaseFreelancer.rating > 0 && ` · ⭐ ${Number(showcaseFreelancer.rating).toFixed(1)}`}
                    </div>
                  </div>
                  <div className="hero__db-badge">Verified ✓</div>
                </div>
              )}

              {/* Stats mini row — real completed projects / earnings / reviews */}
              {showcaseFreelancer && (
                <div className="hero__db-stats">
                  {[
                    { label: 'Projects', value: `${showcaseFreelancer.completedProjects || 0}` },
                    { label: 'Earnings', value: `Rs. ${formatCompactAmount(showcaseFreelancer.totalEarnings)}` },
                    { label: 'Reviews', value: `${showcaseFreelancer.reviewCount || 0}` },
                  ].map(s => (
                    <div key={s.label} className="hero__db-stat">
                      <strong>{s.value}</strong>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI insight card (illustrative — Buddy AI's real per-user
                  guidance lives inside the actual dashboard, not this
                  marketing preview) */}
              <div className="hero__db-ai">
                <div className="hero__db-ai-icon"><Bot size={20} /></div>
                <div>
                  <div className="hero__db-ai-title">Buddy AI Insight</div>
                  <div className="hero__db-ai-text">
                    Get personalized skill recommendations and unlock new opportunities as you grow.
                  </div>
                </div>
              </div>

              {/* Progress bars — real verified skill-test scores */}
              {showcaseFreelancer?.testedSkills?.length > 0 && (
              <div className="hero__db-skills">
                {showcaseFreelancer.testedSkills.map(s => (
                  <div key={s.name} className="hero__db-skill-row">
                    <div className="hero__db-skill-header">
                      <span>{s.name}</span>
                      <span>{Math.round(s.score)}%</span>
                    </div>
                    <div className="hero__db-bar">
                      <div className="hero__db-bar-fill" style={{ width: `${Math.round(s.score)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              )}
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
