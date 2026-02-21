import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './TrendingSkills.css';

gsap.registerPlugin(ScrollTrigger);

const TRENDING = [
  {
    name: 'AI & Prompt Engineering',
    icon: '🤖',
    trend: '+148%',
    avg: '$85/hr',
    level: 'Advanced',
    tags: ['OpenAI', 'LangChain', 'GPT-4'],
    hot: true,
  },
  {
    name: 'Full-Stack Web Dev',
    icon: '💻',
    trend: '+67%',
    avg: '$65/hr',
    level: 'Mid-Senior',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    hot: true,
  },
  {
    name: 'UI/UX Product Design',
    icon: '🎨',
    trend: '+54%',
    avg: '$72/hr',
    level: 'Mid-Level',
    tags: ['Figma', 'Prototyping', 'Research'],
    hot: false,
  },
  {
    name: 'Data Science & Analytics',
    icon: '📊',
    trend: '+89%',
    avg: '$90/hr',
    level: 'Senior',
    tags: ['Python', 'TensorFlow', 'SQL'],
    hot: true,
  },
  {
    name: 'Mobile App Development',
    icon: '📱',
    trend: '+43%',
    avg: '$70/hr',
    level: 'Mid-Level',
    tags: ['Flutter', 'React Native', 'Swift'],
    hot: false,
  },
  {
    name: 'Cloud & DevOps',
    icon: '☁️',
    trend: '+112%',
    avg: '$95/hr',
    level: 'Advanced',
    tags: ['AWS', 'Docker', 'Kubernetes'],
    hot: true,
  },
  {
    name: 'SEO & Growth Marketing',
    icon: '📈',
    trend: '+38%',
    avg: '$55/hr',
    level: 'Entry-Mid',
    tags: ['SEMrush', 'GA4', 'Content'],
    hot: false,
  },
  {
    name: 'Cybersecurity',
    icon: '🔐',
    trend: '+130%',
    avg: '$110/hr',
    level: 'Expert',
    tags: ['Penetration Testing', 'SIEM', 'CTF'],
    hot: true,
  },
  {
    name: 'Video Editing & Motion',
    icon: '🎬',
    trend: '+29%',
    avg: '$48/hr',
    level: 'Entry-Mid',
    tags: ['Premiere Pro', 'After Effects', '4K'],
    hot: false,
  },
];

const LEVEL_COLORS = {
  'Advanced': { bg: '#fef3e8', color: '#c05621' },
  'Mid-Senior': { bg: '#e8f4fd', color: '#1a6fa8' },
  'Mid-Level': { bg: '#edf9f0', color: '#276749' },
  'Senior': { bg: '#f3f0fd', color: '#553c9a' },
  'Expert': { bg: '#fef0f0', color: '#c53030' },
  'Entry-Mid': { bg: '#f0fdf4', color: '#276749' },
};

export default function TrendingSkills() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headerRef.current.children,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 85%' },
        }
      );

      gsap.fromTo(gridRef.current.children,
        { y: 30, opacity: 0, scale: 0.98 },
        {
          y: 0, opacity: 1, scale: 1,
          stagger: 0.1,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 95%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="trending">
      <div className="container">
        <div ref={headerRef} className="trending__header">
          <div className="section-tag">
            <span>🔥</span> What's Trending Now
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
            <a href="#" className="btn-primary trending__cta-desktop">
              Explore All Skills
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Grid ── */}
        <div ref={gridRef} className="trending__grid">
          {TRENDING.map((skill) => {
            const levelStyle = LEVEL_COLORS[skill.level] || { bg: '#f0f4f8', color: '#4a5568' };
            return (
              <div key={skill.name} className={`trending__card${skill.hot ? ' trending__card--hot' : ''}`}>
                <div className="trending__card-header">
                  <div className="trending__card-icon">{skill.icon}</div>
                  <div className="trending__card-indicators">
                    {skill.hot && (
                      <div className="trending__hot-badge">🔥 Hot</div>
                    )}
                    <div className="trending__card-trend">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M17 6h6v6" stroke="currentColor"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {skill.trend}
                    </div>
                  </div>
                </div>

                <h3 className="trending__card-name">{skill.name}</h3>

                <div className="trending__card-meta">
                  <span className="trending__card-avg">{skill.avg}</span>
                  <span
                    className="trending__card-level"
                    style={{ background: levelStyle.bg, color: levelStyle.color }}
                  >
                    {skill.level}
                  </span>
                </div>

                <div className="trending__card-tags">
                  {skill.tags.map(tag => (
                    <span key={tag} className="trending__tag">{tag}</span>
                  ))}
                </div>

                <a href="#" className="trending__card-btn">
                  Find Freelancers
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            );
          })}
        </div>

        {/* ── Mobile CTA ── */}
        <div className="trending__cta-mobile">
          <a href="#" className="btn-primary">Explore All Skills</a>
        </div>
      </div>
    </section>
  );
}
