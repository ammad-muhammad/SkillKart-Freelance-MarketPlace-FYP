import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Bot, Monitor, Palette, BarChart2, Smartphone, Cloud,
  TrendingUp, ShieldCheck, Film, Flame, Briefcase
} from 'lucide-react';
import { publicAPI } from '../../../api/publicData';
import './TrendingSkills.css';

gsap.registerPlugin(ScrollTrigger);

const LEVEL_COLORS = {
  'Advanced': { bg: '#fef3e8', color: '#c05621' },
  'Mid-Senior': { bg: '#e8f4fd', color: '#1a6fa8' },
  'Mid-Level': { bg: '#edf9f0', color: '#276749' },
  'Senior': { bg: '#f3f0fd', color: '#553c9a' },
  'Expert': { bg: '#fef0f0', color: '#c53030' },
  'Entry-Mid': { bg: '#f0fdf4', color: '#276749' },
};

// Map a real trending skill { name, slug, gigs, avgPrice, avgRating } to a card shape.
function mapRealSkill(s) {
  const price = Number(s.avgPrice) || 0;
  return {
    real: true,
    name: s.name,
    slug: s.slug,
    Icon: Briefcase,
    gigs: Number(s.gigs) || 0,
    avg: price > 0 ? `From $${price}` : null,
    rating: Number(s.avgRating) || 0,
    hot: (Number(s.gigs) || 0) > 0,
  };
}

export default function TrendingSkills() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  // Real trending skills only (derived from actual gig demand). No fake data —
  // the whole section hides until there's real trending data.
  const [skills, setSkills] = useState(null); // null = loading

  useEffect(() => {
    let active = true;

    publicAPI.getTrending(9)
      .then((res) => {
        if (!active) return;
        setSkills((res?.data?.data?.skills || []).map(mapRealSkill));
      })
      .catch(() => { if (active) setSkills([]); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!skills || skills.length === 0) return undefined;
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(headerRef.current.children,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: headerRef.current, start: 'top 85%' } }
        );
      }
      if (gridRef.current) {
        gsap.fromTo(gridRef.current.children,
          { y: 30, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, stagger: 0.1, duration: 0.5, ease: 'power2.out',
            scrollTrigger: { trigger: gridRef.current, start: 'top 95%' } }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [skills]);

  // No real trending data yet → hide the section (no fabricated trends).
  if (!skills || skills.length === 0) return null;

  return (
    <section ref={sectionRef} className="trending">
      <div className="container">
        <div ref={headerRef} className="trending__header">
          <div className="section-tag">
            <Flame size={15} style={{ color: '#ef4444' }} /> What's Trending Now
          </div>
          <div className="trending__header-row">
            <div>
              <h2 className="section-title">
                Top In-Demand <span className="trending__highlight">Skills</span>
              </h2>
              <p className="section-subtitle">
                Real-time data on what clients are actively hiring for right now.
                Stay ahead of the market with SkillKart's AI trend insights.
              </p>
            </div>
            <Link to="/categories" className="btn-primary trending__cta-desktop">
              Explore All Skills
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Grid ── */}
        <div ref={gridRef} className="trending__grid">
          {skills.map((skill) => {
            // Real skill card (live data from /public/trending)
            return (
                <div key={skill.slug || skill.name} className={`trending__card${skill.hot ? ' trending__card--hot' : ''}`}>
                  <div className="trending__card-header">
                    <div className="trending__card-icon"><skill.Icon size={22} /></div>
                    <div className="trending__card-indicators">
                      {skill.hot && (
                        <div className="trending__hot-badge"><Flame size={11} /> Hot</div>
                      )}
                      <div className="trending__card-trend">
                        <Briefcase size={12} />
                        {skill.gigs} {skill.gigs === 1 ? 'gig' : 'gigs'}
                      </div>
                    </div>
                  </div>

                  <h3 className="trending__card-name">{skill.name}</h3>

                  <div className="trending__card-meta">
                    {skill.avg && <span className="trending__card-avg">{skill.avg}</span>}
                    {skill.rating > 0 && (
                      <span
                        className="trending__card-level"
                        style={{ background: '#fef3e8', color: '#c05621' }}
                      >
                        ⭐ {skill.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/browse-projects?q=${encodeURIComponent(skill.name)}`}
                    className="trending__card-btn"
                  >
                    Find Freelancers
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
            );
          })}
        </div>

        {/* ── Mobile CTA ── */}
        <div className="trending__cta-mobile">
          <Link to="/categories" className="btn-primary">Explore All Skills</Link>
        </div>
      </div>
    </section>
  );
}
