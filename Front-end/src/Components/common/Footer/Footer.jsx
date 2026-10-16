import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Trophy, Bot, ArrowRight } from 'lucide-react';
import { safeToast as toast } from '../../../utils/safeToast';
import { publicAPI } from '../../../api/publicData';
import { isMobileApp } from '../../../utils/platform';
import { generateNotchedPath, generateFooterSilhouettePath } from './notchedPath';
import './Footer.css';

// Each link: { label, to } for internal routes, { label, href } for external/placeholder
const FOOTER_LINKS = [
  {
    heading: 'Platform',
    links: [
      { label: 'Browse Freelancers', to: '/browse-freelancers' },
      { label: 'Browse Projects', to: '/browse-projects' },
      { label: 'Post a Project', to: '/post-project' },
      { label: 'AI Matchmaking', to: '/ai-matchmaking' },
      { label: 'Download Mobile App', href: '/#download-app' },
      { label: 'Categories', to: '/categories' },
    ],
  },
  {
    heading: 'For Freelancers',
    links: [
      { label: 'Create Profile', to: '/registration' },
      { label: 'Find Work', to: '/browse-projects' },
      { label: 'Buddy AI Assistant', to: '/ai/buddy' },
      { label: 'Cost Estimator', to: '/ai/cost-estimator' },
      { label: 'Help Center', to: '/help' },
    ],
  },
  {
    heading: 'AI Tools',
    links: [
      { label: 'Buddy AI Assistant', to: '/ai/buddy' },
      { label: 'Cost Estimator', to: '/ai/cost-estimator' },
      { label: 'AI Matchmaking', to: '/ai-matchmaking' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About SkillKart', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
    ],
  },
];

export default function Footer() {
  const footerRef = useRef(null);
  const panelRef = useRef(null);
  const [footerClip, setFooterClip] = useState('');
  const [panelClip, setPanelClip] = useState('');
  const [isEntered, setIsEntered] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await publicAPI.subscribeNewsletter(email.trim());
      toast.success("You're subscribed! Watch your inbox for weekly tips. 🚀");
      setEmail('');
    } catch {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Measure and compute SVG silhouette paths dynamically
  useEffect(() => {
    if (isMobileApp()) return;

    const measure = () => {
      if (footerRef.current) {
        const rect = footerRef.current.getBoundingClientRect();
        if (rect.width >= 768) {
          setFooterClip(generateFooterSilhouettePath(rect.width, rect.height, 64));
        } else {
          setFooterClip('');
        }
      }
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        if (rect.width >= 768) {
          setPanelClip(
            generateNotchedPath(rect.width, rect.height, {
              radius: 28,
              notchDepth: 26,
              topTabRatio: 0.46,
              botTabRatio: 0.24,
              chamfer: 24,
            })
          );
        } else {
          setPanelClip('');
        }
      }
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    if (footerRef.current) ro.observe(footerRef.current);
    if (panelRef.current) ro.observe(panelRef.current);

    return () => ro.disconnect();
  }, []);

  // Entrance trigger
  useEffect(() => {
    if (isMobileApp() || !footerRef.current) {
      setIsEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '50px' }
    );
    observer.observe(footerRef.current);

    // Guaranteed fallback
    const timer = setTimeout(() => setIsEntered(true), 600);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Sitemap-style marketing footer — none of those routes exist in the mobile build
  if (isMobileApp()) return null;

  return (
    <footer
      ref={footerRef}
      className={`footer ${isEntered ? 'is-entered' : ''}`}
      style={footerClip ? { clipPath: `path("${footerClip}")` } : undefined}
    >
      <div className="footer__body">
        <div className="footer__container">
          {/* ════ 1) INFO ROW (4 Brand / 8 Links) ════ */}
          <div className="footer__info-row">
            {/* Brand Column */}
            <div className="footer__info-brand">
              <Link to="/" className="footer__brand-logo">
                <span className="footer__brand-logo-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="8" fill="#10B981" />
                    <path
                      d="M8 22L13 10l5 8 3-5 4 9"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="24" cy="10" r="2.5" fill="#ffffff" />
                  </svg>
                </span>
                <span className="footer__brand-logo-text">
                  Skill<span className="footer__brand-logo-accent">Kart</span>
                </span>
              </Link>
              <p className="footer__brand-desc">
                The AI-powered freelancing platform built exclusively for students
                and new graduates. Verify your skills, find your first client, and
                start earning today.
              </p>
              <div className="footer__badges">
                <div className="footer__badge">
                  <Trophy size={13} className="footer__badge-icon" /> FYP Project 2026
                </div>
                <div className="footer__badge footer__badge--ai">
                  <Bot size={13} className="footer__badge-icon" /> AI-Powered
                </div>
              </div>
            </div>

            {/* Link Columns */}
            <div className="footer__info-nav">
              {FOOTER_LINKS.map((col) => (
                <div key={col.heading} className="footer__link-col">
                  <h4 className="footer__link-heading">{col.heading}</h4>
                  <ul className="footer__link-list">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {link.to ? (
                          <Link to={link.to} className="footer__nav-link">{link.label}</Link>
                        ) : (
                          <a href={link.href} className="footer__nav-link">{link.label}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* ════ 2) NOTCHED WHITE PANEL (Hero Element) ════ */}
          <div className="footer__notched-panel-wrapper">
            <span className="footer__notch-top-text">
             Built as an FYP Project 2026
            </span>

            <div
              ref={panelRef}
              className="footer__notched-panel"
              style={panelClip ? { clipPath: `path("${panelClip}")` } : undefined}
            >
              {/* Panel Row 1: Wordmark */}
              <div className="footer__panel-top-row">
                <div className="footer__giant-brand">
                  <span className="footer__giant-logo-icon">
                    <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
                      <rect width="32" height="32" rx="8" fill="#10B981" />
                      <path
                        d="M8 22L13 10l5 8 3-5 4 9"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="24" cy="10" r="2.5" fill="#ffffff" />
                    </svg>
                  </span>
                  <span className="footer__giant-text">
                    SkillKart<span className="footer__giant-accent">.</span>
                  </span>
                </div>
              </div>

              {/* Panel Row 2: Heading + Newsletter Field */}
              <div className="footer__panel-middle-row">
                <h3 className="footer__panel-heading">
                  Stay ahead of the freelance market{' '}
                  <Rocket size={20} className="footer__panel-rocket" />
                </h3>
                <form className="footer__panel-form" onSubmit={handleSubscribe}>
                  <input
                    type="email"
                    placeholder="Enter your university email..."
                    className="footer__panel-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" className="footer__panel-submit-btn" disabled={loading}>
                    {loading ? (
                      '...'
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <ArrowRight size={14} className="footer__submit-arrow" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Panel Row 3: Subtext + Legal Links */}
              <div className="footer__panel-bottom-row">
                <p className="footer__panel-sub">
                  Weekly AI tips, trending skills, and opportunities for students.
                </p>
                <div className="footer__panel-legal">
                  <Link to="/privacy" className="footer__legal-link">Privacy Policy</Link>
                  <span className="footer__legal-sep">•</span>
                  <Link to="/terms" className="footer__legal-link">Terms of Service</Link>
                  <span className="footer__legal-sep">•</span>
                  <Link to="/cookies" className="footer__legal-link">Cookie Policy</Link>
                </div>
              </div>
            </div>

            <span className="footer__notch-bottom-text">
              © 2026 SkillKart. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
