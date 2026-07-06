import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Rocket, Trophy, Bot, Heart } from 'lucide-react';
import { toast } from 'react-toastify';
import { publicAPI } from '../../../api/publicData';
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
      { label: 'Careers', to: '/careers' },
      { label: 'Press Kit', to: '/press' },
      { label: 'Contact Us', to: '/contact' },
    ],
  },
];

const SOCIAL = [
  {
    name: 'LinkedIn',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    name: 'Twitter',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
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
    } catch (err) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
              <div className="footer__social">
                {SOCIAL.map(s => (
                  <Link key={s.name} to="/contact" className="footer__social-link" aria-label={`${s.name} — contact us`}>
                    {s.icon}
                  </Link>
                ))}
              </div>
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
