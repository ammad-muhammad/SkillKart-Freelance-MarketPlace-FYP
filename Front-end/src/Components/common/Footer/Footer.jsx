import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Rocket, Trophy, Bot, Heart } from 'lucide-react';
import { safeToast as toast } from '../../../utils/safeToast';
import { publicAPI } from '../../../api/publicData';
import { isMobileApp } from '../../../utils/platform';
import './Footer.css';

gsap.registerPlugin(ScrollTrigger);

// Each link: { label, to } for internal routes, { label, href } for external/placeholder
const FOOTER_LINKS = [
  {
    heading: 'Platform',
    links: [
      { label: 'Browse Freelancers', to: '/browse-freelancers' },
      { label: 'Browse Projects', to: '/browse-projects' },
      { label: 'Post a Project', to: '/post-project' },
      { label: 'AI Matchmaking', to: '/ai-matchmaking' },
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
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) { toast.error('Please enter a valid email address.'); return; }
    
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

  useEffect(() => {
    // Returning null from render below means footerRef never attaches to a
    // DOM node on mobile — gsap.context() would crash trying to scope to a
    // null ref (footerRef.current.querySelectorAll(...) on null). Skip the
    // whole animation setup rather than just skipping the render output.
    if (isMobileApp()) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(footerRef.current.querySelectorAll('.footer__col'),
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: footerRef.current, start: 'top 90%' },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  // Sitemap-style marketing footer (Browse Freelancers, Post a Project,
  // Categories, ...) — none of those routes exist in the mobile build, and a
  // handful of otherwise-public pages that DO ship there (job/gig details,
  // browse-projects) don't need a full site footer under their content either.
  if (isMobileApp()) return null;

  return (
    <footer ref={footerRef} className="footer">
      {/* ── Newsletter bar ── */}
      <div className="footer__newsletter">
        <div className="container footer__newsletter-inner">
          <div>
            <h3 className="footer__newsletter-title">
              Stay ahead of the freelance market <Rocket size={16} style={{ display:'inline', verticalAlign:'middle', color:'#1a6fa8' }} />
            </h3>
            <p className="footer__newsletter-sub">
              Weekly AI tips, trending skills, and opportunities for students.
            </p>
          </div>
          <form className="footer__newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your university email"
              className="footer__newsletter-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="footer__newsletter-btn" disabled={loading}>
              {loading ? '...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Main footer ── */}
      <div className="footer__main">
        <div className="container">
          <div className="footer__grid">
            {/* Brand col */}
            <div className="footer__col footer__col--brand">
              <Link to="/" className="footer__logo">
                <span className="footer__logo-icon">
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="8" fill="#B7C9E2" />
                    <path d="M8 22L13 10l5 8 3-5 4 9" stroke="#042E4C" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="24" cy="10" r="2.5" fill="#042E4C" />
                  </svg>
                </span>
                <span className="footer__logo-text">
                  Skill<span>Kart</span>
                </span>
              </Link>
              <p className="footer__brand-desc">
                The AI-powered freelancing platform built exclusively for students
                and new graduates. Verify your skills, find your first client, and
                start earning today.
              </p>
              <div className="footer__badges">
                <div className="footer__badge"><Trophy size={13} /> FYP Project 2025</div>
                <div className="footer__badge"><Bot size={13} /> AI-Powered</div>
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_LINKS.map(col => (
              <div key={col.heading} className="footer__col">
                <h4 className="footer__col-heading">{col.heading}</h4>
                <ul className="footer__col-links">
                  {col.links.map(link => (
                    <li key={link.label}>
                      {link.to ? (
                        <Link to={link.to} className="footer__col-link">{link.label}</Link>
                      ) : (
                        <a href={link.href} className="footer__col-link">{link.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── Bottom bar ── */}
          <div className="footer__bottom">
            <p className="footer__copy">
              © {new Date().getFullYear()} SkillKart. All rights reserved. Built with <Heart size={13} style={{ display:'inline', verticalAlign:'middle', color:'#1a6fa8', fill:'#1a6fa8' }} /> as an FYP project.
            </p>
            <div className="footer__bottom-links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/cookies">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
