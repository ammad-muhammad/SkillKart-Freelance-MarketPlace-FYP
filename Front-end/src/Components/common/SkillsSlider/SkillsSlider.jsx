import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import {
  Globe, Palette, Bot, BarChart2, Smartphone, PenLine,
  Film, TrendingUp, ShieldCheck, CloudCog, Link as LinkIcon, Sparkles, ArrowRight
} from 'lucide-react';
import { publicAPI } from '../../../api/publicData';
import './SkillsSlider.css';

gsap.registerPlugin(ScrollTrigger);

// Maps each category card to the backend category for real count
const COUNT_CATEGORY = {
  'Web Development': 'Web Development',
  'UI/UX Design': 'UI Design',
  'AI & Machine Learning': 'AI & Machine Learning',
  'Data Science': 'Data Science',
  'Mobile Development': 'Mobile Development',
  'Content Writing': 'Content Writing',
  'Video Editing': 'Video Editing',
  'SEO & Marketing': 'SEO',
  'Cybersecurity': 'Cybersecurity',
  'Cloud Computing': 'DevOps & Cloud',
  'Blockchain': 'Blockchain',
};

// 8 Orbiting Skills positioned around the central heading matching the visual reference
const ORBIT_SKILLS = [
  {
    id: 'web-dev',
    name: 'Web Development',
    shortName: 'Web Development',
    Icon: Globe,
    slug: 'web-development',
    pos: 'top-left',
    floatDelay: '0s',
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    shortName: 'AI & Machine …',
    Icon: Bot,
    slug: 'ai-and-machine-learning',
    pos: 'mid-left-in',
    floatDelay: '1.2s',
  },
  {
    id: 'seo-mkt',
    name: 'SEO & Marketing',
    shortName: 'SEO & Market…',
    Icon: TrendingUp,
    slug: 'seo',
    pos: 'bot-left-out',
    floatDelay: '2.4s',
  },
  {
    id: 'cybersec',
    name: 'Cybersecurity',
    shortName: 'Cybersecurity',
    Icon: ShieldCheck,
    slug: 'cybersecurity',
    pos: 'bot-left-in',
    floatDelay: '0.8s',
  },
  {
    id: 'ui-ux',
    name: 'UI/UX Design',
    shortName: 'UI/UX Design',
    Icon: Palette,
    slug: 'ui-design',
    pos: 'top-right',
    floatDelay: '1.8s',
  },
  {
    id: 'cloud',
    name: 'Cloud Computing',
    shortName: 'Cloud Comput…',
    Icon: CloudCog,
    slug: 'devops-and-cloud',
    pos: 'mid-right-in',
    floatDelay: '0.4s',
  },
  {
    id: 'blockchain',
    name: 'Blockchain',
    shortName: 'Blockchain',
    Icon: LinkIcon,
    slug: 'blockchain',
    pos: 'bot-right-out',
    floatDelay: '2.1s',
  },
  {
    id: 'data-sci',
    name: 'Data Science',
    shortName: 'Data Science',
    Icon: BarChart2,
    slug: 'data-science',
    pos: 'bot-right-in',
    floatDelay: '1.5s',
  },
];

// Live activity ticker items
const TICKER_ACTIVITIES = [
  'Maya completed API Script • +$180',
  'Alex designed Logo • +$95',
  'Dev built Landing Page • +$320',
  'Sara deployed Bot • +$150',
  'Bilal audited Smart Contract • +$220',
  'Hamza fine-tuned LLaMA-3 • +$400',
  'Zain created Figma Prototype • +$130',
];

export default function SkillsSlider() {
  const sectionRef = useRef(null);
  const centerRef = useRef(null);
  const cardsRef = useRef(null);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let active = true;
    publicAPI.getCategories()
      .then((res) => {
        if (!active) return;
        const map = {};
        (res.data?.data?.categories || []).forEach((c) => {
          map[c.name] = c.totalServices;
        });
        setCounts(map);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const getCountLabel = (skill) => {
    const cat = COUNT_CATEGORY[skill.name];
    const n = cat ? counts[cat] : undefined;
    if (n && n > 0) return `${n.toLocaleString()} gigs →`;
    if (skill.name === 'Web Development') return '24 gigs →';
    if (skill.name === 'Cloud Computing') return '7 gigs';
    return 'Explore →';
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (centerRef.current) {
        gsap.fromTo(centerRef.current.children,
          { y: 30, opacity: 0 },
          {
            y: 0, opacity: 1, stagger: 0.1, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: centerRef.current, start: 'top 85%' },
          }
        );
      }
      if (cardsRef.current) {
        gsap.fromTo(cardsRef.current.querySelectorAll('.orbit-card'),
          { scale: 0.88, opacity: 0 },
          {
            scale: 1, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'back.out(1.4)',
            scrollTrigger: { trigger: cardsRef.current, start: 'top 85%' },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="orbit-section">
      {/* ── Background Subtle Grid & Sparkles ── */}
      <div className="orbit-grid-bg" aria-hidden="true" />

      {/* Decorative Sparkles */}
      <span className="orbit-sparkle orbit-sparkle--1" aria-hidden="true">✦</span>
      <span className="orbit-sparkle orbit-sparkle--2" aria-hidden="true">✦</span>
      <span className="orbit-sparkle orbit-sparkle--3" aria-hidden="true">✦</span>
      <span className="orbit-sparkle orbit-sparkle--4" aria-hidden="true">✦</span>

      <div className="container orbit-arena">
        {/* ── SVG Elliptical Orbit Track Lines ── */}
        <div className="orbit-rings" aria-hidden="true">
          <svg className="orbit-svg" viewBox="0 0 1200 640" preserveAspectRatio="none">
            {/* Outer Orbit Ellipse */}
            <ellipse
              cx="600"
              cy="310"
              rx="560"
              ry="260"
              fill="none"
              stroke="#D1FAE5"
              strokeWidth="1.6"
              strokeDasharray="4 4"
            />
            {/* Inner Orbit Ellipse */}
            <ellipse
              cx="600"
              cy="310"
              rx="420"
              ry="180"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            />
          </svg>
        </div>

        {/* ── Center Stage Content ── */}
        <div ref={centerRef} className="orbit-center">
          <div className="orbit-badge">
            <Sparkles size={13} className="orbit-badge-icon" />
            <span>BROWSE BY CATEGORY</span>
          </div>

          <h2 className="orbit-title">
            Find Experts <br />
            Across All <span className="orbit-highlight">Skills</span>
          </h2>

          <p className="orbit-subtitle">
            From cutting-edge AI to classic design, discover verified student
            freelancers ready to bring your projects to life.
          </p>

          <Link to="/categories" className="orbit-cta-btn">
            <span>Browse All Categories</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* ── 8 Orbiting Floating Category Cards ── */}
        <div ref={cardsRef} className="orbit-cards-container">
          {ORBIT_SKILLS.map((skill) => (
            <Link
              key={skill.id}
              to={`/skills/${skill.slug}`}
              className={`orbit-card orbit-card--${skill.pos}`}
              style={{ animationDelay: skill.floatDelay }}
            >
              <div className="orbit-card__icon-box">
                <skill.Icon size={18} />
              </div>
              <div className="orbit-card__info">
                <h3 className="orbit-card__title" title={skill.name}>
                  {skill.shortName}
                </h3>
                <span className="orbit-card__count">{getCountLabel(skill)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Full-Width Live Activity Ticker Strip ── */}
      <div className="orbit-ticker-strip">
        <div className="orbit-ticker-badge">
          <span className="orbit-ticker-dot" />
          <span>LIVE ACTIVITY TICKER</span>
        </div>

        <div className="orbit-ticker-marquee">
          <div className="orbit-ticker-track">
            {[...TICKER_ACTIVITIES, ...TICKER_ACTIVITIES].map((item, idx) => (
              <span key={idx} className="orbit-ticker-item">
                <span className="orbit-ticker-bullet">•</span> {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
