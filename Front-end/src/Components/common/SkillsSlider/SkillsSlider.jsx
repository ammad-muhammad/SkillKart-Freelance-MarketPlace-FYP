import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import {
  Globe, Palette, Bot, BarChart2, Smartphone, PenLine,
  Film, TrendingUp, Brush, ShieldCheck, CloudCog, Link as LinkIcon, Briefcase
} from 'lucide-react';
import './SkillsSlider.css';

gsap.registerPlugin(ScrollTrigger);

/* ── Skills data ── */
const SKILLS = [
  { name: 'Web Development',      Icon: Globe,       count: '2.4k freelancers', color: '#e8f4fd', slug: 'development-tech' },
  { name: 'UI/UX Design',         Icon: Palette,     count: '1.8k freelancers', color: '#fef3e8', slug: 'design-creative' },
  { name: 'AI & Machine Learning',Icon: Bot,         count: '950 freelancers',  color: '#edf9f0', slug: 'ai-emerging-tech' },
  { name: 'Data Science',         Icon: BarChart2,   count: '1.2k freelancers', color: '#f3f0fd', slug: 'ai-emerging-tech' },
  { name: 'Mobile Development',   Icon: Smartphone,  count: '1.5k freelancers', color: '#fef0f0', slug: 'development-tech' },
  { name: 'Content Writing',      Icon: PenLine,     count: '3.1k freelancers', color: '#fff8e8', slug: 'writing-content' },
  { name: 'Video Editing',        Icon: Film,        count: '870 freelancers',  color: '#f0f8f0', slug: 'video-audio-animation' },
  { name: 'SEO & Marketing',      Icon: TrendingUp,  count: '2.0k freelancers', color: '#e8f0fd', slug: 'marketing' },
  { name: 'Graphic Design',       Icon: Brush,       count: '2.6k freelancers', color: '#fdf0f8', slug: 'design-creative' },
  { name: 'Cybersecurity',        Icon: ShieldCheck, count: '640 freelancers',  color: '#f0fdf4', slug: 'development-tech' },
  { name: 'Cloud Computing',      Icon: CloudCog,    count: '780 freelancers',  color: '#e8f4f9', slug: 'development-tech' },
  { name: 'Blockchain',           Icon: LinkIcon,    count: '420 freelancers',  color: '#fdf8e8', slug: 'ai-emerging-tech' },
];

/* Double the array so the loop is seamless */
const SKILLS_DOUBLED = [...SKILLS, ...SKILLS];

export default function SkillsSlider() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const trackRef = useRef(null);
  const tweenRef = useRef(null);

  /* ── Section entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headerRef.current.children,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 85%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  /* ── Infinite scroll loop ── */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const totalWidth = track.scrollWidth / 2;

    tweenRef.current = gsap.to(track, {
      x: `-${totalWidth}px`,
      duration: 40,
      ease: 'none',
      repeat: -1,
    });

    /* Pause on hover */
    const pause = () => tweenRef.current.pause();
    const resume = () => tweenRef.current.resume();
    track.addEventListener('mouseenter', pause);
    track.addEventListener('mouseleave', resume);

    return () => {
      tweenRef.current?.kill();
      track.removeEventListener('mouseenter', pause);
      track.removeEventListener('mouseleave', resume);
    };
  }, []);

  return (
    <section ref={sectionRef} className="skills-slider">
      <div className="container">
        <div ref={headerRef} className="skills-slider__header">
          <div className="section-tag">
            <Briefcase size={15} /> Browse by Category
          </div>
          <h2 className="section-title">
            Find Experts Across <span className="highlight-text">All Skills</span>
          </h2>
          <p className="section-subtitle">
            From cutting-edge AI to classic design, discover verified student
            freelancers ready to bring your projects to life.
          </p>
        </div>
      </div>

      {/* ── Slider track ── */}
      <div className="skills-slider__viewport">
        {/* Left/right fade gradient overlays */}
        <div className="skills-slider__fade skills-slider__fade--left" />
        <div className="skills-slider__fade skills-slider__fade--right" />

        <div ref={trackRef} className="skills-slider__track">
          {SKILLS_DOUBLED.map((skill, idx) => (
            <Link 
              key={`${skill.name}-${idx}`} 
              to={`/skills/${skill.slug}`} 
              className="skills-slider__card"
            >
              <div className="skills-slider__card-icon" style={{ background: skill.color }}>
                <skill.Icon size={22} />
              </div>
              <div className="skills-slider__card-info">
                <h3>{skill.name}</h3>
                <p>{skill.count}</p>
              </div>
              <div className="skills-slider__card-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="skills-slider__footer container">
        <Link to="/categories" className="btn-primary">
          Browse All Categories
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
