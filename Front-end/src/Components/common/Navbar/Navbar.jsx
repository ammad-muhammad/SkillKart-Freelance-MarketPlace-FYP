import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './Navbar.css';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquareCode, UserSearch, Calculator, Newspaper, Users, HelpCircle, Search, FileEdit, Zap } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

/* ── Nav data ── */
const NAV_ITEMS = [
  {
    label: 'Find Talent',
    children: [
      { label: 'Browse Freelancers', sub: 'Explore verified profiles', href: '/browse-freelancers', icon: <Search size={18} /> },
      { label: 'Post a Project',     sub: 'Get proposals fast',        href: '/post-project',        icon: <FileEdit size={18} /> },
      { label: 'AI Matchmaking',     sub: 'Smart recommendations',     href: '/ai-matchmaking',      icon: <Zap size={18} /> },
    ],
  },
  {
    label: 'Find Work',
    isMega: true,
    sections: [
      {
        title: 'Admin & Support',
        categorySlug: 'admin-support',
        links: [
          { label: 'Virtual Assistant',  slug: 'virtual-assistant'  },
          { label: 'Data Entry',         slug: 'data-entry'         },
          { label: 'Project Management', slug: 'project-management' },
          { label: 'Customer Support',   slug: 'customer-support'   },
          { label: 'Transcription',      slug: 'transcription'      },
        ],
      },
      {
        title: 'Design & Creative',
        categorySlug: 'design-creative',
        links: [
          { label: 'Logo Design',     slug: 'logo-design'     },
          { label: 'Brand Identity',  slug: 'brand-identity'  },
          { label: 'UI / UX Design',  slug: 'ui-ux-design'    },
          { label: 'Illustration',    slug: 'illustration'    },
          { label: 'Motion Graphics', slug: 'motion-graphics' },
        ],
      },
      {
        title: 'Marketing',
        categorySlug: 'marketing',
        links: [
          { label: 'SEO Optimization',       slug: 'seo-optimization'       },
          { label: 'Social Media Marketing', slug: 'social-media-marketing' },
          { label: 'Email Marketing',        slug: 'email-marketing'        },
          { label: 'PPC Advertising',        slug: 'ppc-advertising'        },
          { label: 'Content Marketing',      slug: 'content-marketing'      },
        ],
      },
      {
        title: 'Writing & Content',
        categorySlug: 'writing-content',
        links: [
          { label: 'Blog Writing',      slug: 'blog-writing'      },
          { label: 'Copywriting',       slug: 'copywriting'       },
          { label: 'Technical Writing', slug: 'technical-writing' },
          { label: 'Ghostwriting',      slug: 'ghostwriting'      },
          { label: 'Proofreading',      slug: 'proofreading'      },
        ],
      },
      {
        title: 'AI & Emerging Tech',
        categorySlug: 'ai-emerging-tech',
        links: [
          { label: 'AI Development',      slug: 'ai-development'      },
          { label: 'Prompt Engineering',  slug: 'prompt-engineering'  },
          { label: 'Chatbot Development', slug: 'chatbot-development' },
          { label: 'Blockchain & Web3',   slug: 'blockchain'          },
          { label: 'Machine Learning',    slug: 'machine-learning'    },
        ],
      },
      {
        title: 'Development & Tech',
        categorySlug: 'development-tech',
        links: [
          { label: 'Web Development',   slug: 'web-development'        },
          { label: 'Mobile App Dev',    slug: 'mobile-app-development' },
          { label: 'WordPress',         slug: 'wordpress'              },
          { label: 'API Development',   slug: 'api-development'        },
          { label: 'DevOps & Cloud',    slug: 'devops'                 },
        ],
      },
      {
        title: 'Video, Audio & Animation',
        categorySlug: 'video-audio-animation',
        links: [
          { label: 'Video Editing',      slug: 'video-editing'      },
          { label: 'Animation',          slug: 'animation'          },
          { label: 'Voiceover',          slug: 'voiceover'          },
          { label: 'Podcast Production', slug: 'podcast-production' },
          { label: 'Music Composition',  slug: 'music-composition'  },
        ],
      },
      {
        isSpecial: true,
        links: [
          { label: 'Explore more',         href: '/skills/design-creative'  },
          { label: 'Ways to earn',         href: '/browse-freelancers'      },
          { label: 'Win work with ads',    href: '/ai-matchmaking'          },
          { label: 'Join Freelancer Plus', href: '/onboarding'              },
        ],
      },
    ],
  },
  {
    label: 'AI Tools',
    children: [
      { label: 'Verify Credentials', sub: 'AI-powered verification', href: '/ai/verify',            icon: <ShieldCheck size={18} /> },
      { label: 'Buddy AI Assistant', sub: 'Your smart work buddy',   href: '/ai/buddy',             icon: <MessageSquareCode size={18} /> },
      { label: 'Profile Analyzer',   sub: 'Get actionable insights', href: '/ai/profile-analyzer',  icon: <UserSearch size={18} /> },
      { label: 'Cost Estimator',     sub: 'Price your projects',     href: '/ai/cost-estimator',    icon: <Calculator size={18} /> },
    ],
  },
  {
    label: 'Resources',
    children: [
      { label: 'Blog',        sub: 'Tips & tutorials',  href: '/blog',      icon: <Newspaper size={18} /> },
      { label: 'Community',   sub: 'Connect with peers',href: '/community', icon: <Users size={18} /> },
      { label: 'Help Center', sub: 'Guides & support',  href: '/help',      icon: <HelpCircle size={18} /> },
    ],
  },
];

export default function Navbar() {
  const [visible, setVisible] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const { isAuthenticated, logout, user } = useAuth();
  const lastScrollY = useRef(0);

  const dashboardLink = user?.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';

  const navRef = useRef(null);
  const logoRef = useRef(null);
  const linksRef = useRef(null);
  const actionsRef = useRef(null);

  /* ── GSAP entrance animation ── */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 }
    )
      .fromTo(logoRef.current,
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5 },
        '-=0.4'
      )
      .fromTo(linksRef.current?.children ? Array.from(linksRef.current.children) : [],
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 },
        '-=0.4'
      )
      .fromTo(actionsRef.current,
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5 },
        '-=0.5'
      );
  }, []);

  /* ── Scroll shadow & Smart Sticky ── */
  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollY.current;
      
      // 1. At the very top: Show normal absolute navbar
      if (currentScrollY < 120) {
        setIsSticky(false);
        setVisible(true);
      } 
      // 2. Past the top: Show floating pill on SCROLL UP, Hide on SCROLL DOWN
      else {
        if (isScrollingUp) {
          setIsSticky(true);
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
      
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Trigger animation every time sticky reveal occurs ── */
  useEffect(() => {
    if (visible && isSticky) {
      gsap.fromTo(navRef.current,
        { 
          y: -100, 
          opacity: 0, 
          scale: 0.95,
          filter: "blur(4px)"
        },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1, 
          filter: "blur(0px)",
          duration: 0.8, 
          ease: "power4.out",
          clearProps: "filter"
        }
      );
    }
  }, [visible, isSticky]);

  /* ── Close mobile menu on resize ── */
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Lock body scroll when mobile menu open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* ── Dropdown Hover with Grace Period ── */
  const timeoutRef = useRef(null);
  const handleMouseEnter = (idx) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(idx);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const closeMobile = () => { setMobileOpen(false); setMobileExpanded(null); };
  const toggleMobile = (idx) => setMobileExpanded(prev => (prev === idx ? null : idx));

  const LogoSVG = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#B7C9E2" />
      <path d="M8 22L13 10l5 8 3-5 4 9" stroke="#042E4C" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="10" r="2.5" fill="#042E4C" />
    </svg>
  );

  return (
    <>
      <nav
        ref={navRef}
        className={`navbar ${!visible ? 'navbar--hidden' : ''} ${isSticky ? 'navbar--sticky' : ''} ${mobileOpen ? 'navbar--mobile-open' : ''}`}
      >
        <div className="container navbar__inner">

          {/* Logo */}
          <Link to="/" ref={logoRef} className="navbar__logo">
            <span className="navbar__logo-icon"><LogoSVG size={32} /></span>
            <span className="navbar__logo-text">Skill<span>Kart</span></span>
          </Link>

          {/* Desktop nav */}
          <ul ref={linksRef} className="navbar__links">
            {NAV_ITEMS.map((item, idx) => (
              <li
                key={item.label}
                className={`navbar__item${item.isMega ? ' navbar__item--mega' : ''}`}
                onMouseEnter={() => handleMouseEnter(idx)}
                onMouseLeave={handleMouseLeave}
              >
                <button className={`navbar__link${activeDropdown === idx ? ' navbar__link--active' : ''}`}>
                  {item.label}
                  <svg className="navbar__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Standard dropdown */}
                {!item.isMega && (
                  <div className={`navbar__dropdown${activeDropdown === idx ? ' navbar__dropdown--open' : ''}`}>
                    <div className="navbar__dropdown-inner">
                      {item.children.map(child => (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="navbar__dropdown-item"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {child.icon
                            ? <div className="navbar__dropdown-icon">{child.icon}</div>
                            : <span className="navbar__dropdown-dot" />}
                          <div className="navbar__dropdown-content">
                            <strong>{child.label}</strong>
                            <small>{child.sub}</small>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div ref={actionsRef} className="navbar__actions">
            {isAuthenticated ? (
              <>
                <Link to={dashboardLink} className="navbar__cta btn-secondary">Dashboard</Link>
                <button onClick={logout} className="navbar__cta btn-primary">Logout</button>
              </>
            ) : (
              <Link to="/login" className="navbar__cta btn-primary">Login</Link>
            )}
          </div>

          {/* Hamburger */}
          <button
            className={`navbar__hamburger${mobileOpen ? ' navbar__hamburger--open' : ''}`}
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* ── Mega Menus ── */}
        {NAV_ITEMS.map((item, idx) =>
          item.isMega ? (
            <div
              key={item.label}
              className={`navbar__mega${activeDropdown === idx ? ' navbar__mega--open' : ''}`}
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="container">
                <div className="navbar__mega-inner">
                  <div className="navbar__mega-grid">
                    {item.sections.map((sec, sIdx) => (
                      <div key={sIdx} className="navbar__mega-col">

                        {/* Category heading → category page */}
                        {sec.title && (
                          <Link
                            to={`/skills/${sec.categorySlug}`}
                            className="navbar__mega-title"
                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                            onClick={() => setActiveDropdown(null)}
                          >
                            {sec.title}
                          </Link>
                        )}

                        <ul className="navbar__mega-links">
                          {sec.links.map((link, lIdx) => (
                            <li key={lIdx}>
                              {sec.isSpecial ? (
                                <Link
                                  to={link.href}
                                  className="navbar__mega-link navbar__mega-link--special"
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  <span>{link.label}</span>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </Link>
                              ) : (
                                /* Skill link → skill page */
                                <Link
                                  to={`/skills/${sec.categorySlug}/${link.slug}`}
                                  className="navbar__mega-link"
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  {link.label}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null
        )}
      </nav>

      {/* ── Mobile drawer ── */}
      <div className={`navbar__mobile-drawer${mobileOpen ? ' navbar__mobile-drawer--open' : ''}`}>
        <div className="navbar__mobile-header">
          <Link to="/" className="navbar__logo" onClick={closeMobile}>
            <span className="navbar__logo-icon"><LogoSVG size={28} /></span>
            <span className="navbar__logo-text">Skill<span>Kart</span></span>
          </Link>
          <button className="navbar__mobile-close" onClick={closeMobile} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="navbar__mobile-inner">
          {NAV_ITEMS.map((item, idx) => (
            <div key={item.label} className="navbar__mobile-group">
              <button className="navbar__mobile-parent" onClick={() => toggleMobile(idx)}>
                {item.label}
                <svg
                  className={`navbar__chevron${mobileExpanded === idx ? ' navbar__chevron--rotated' : ''}`}
                  width="14" height="14" viewBox="0 0 12 12" fill="none"
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Standard dropdown (mobile) */}
              {mobileExpanded === idx && item.children && (
                <div className="navbar__mobile-sub">
                  {item.children.map(child => (
                    <Link key={child.label} to={child.href} className="navbar__mobile-child" onClick={closeMobile}>
                      {child.icon
                        ? <div className="navbar__mobile-icon">{child.icon}</div>
                        : <span className="navbar__dropdown-dot" />}
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Mega menu sections (mobile) */}
              {mobileExpanded === idx && item.isMega && (
                <div className="navbar__mobile-sub">
                  {item.sections.map((sec, sIdx) => (
                    <div key={sIdx}>
                      {/* Category header link */}
                      {sec.title && (
                        <Link
                          to={`/skills/${sec.categorySlug}`}
                          className="navbar__mobile-child"
                          style={{ fontWeight: 700, color: '#0d9488', paddingTop: sIdx === 0 ? 4 : 14 }}
                          onClick={closeMobile}
                        >
                          {sec.title}
                        </Link>
                      )}
                      {/* Skill links indented */}
                      {sec.links.map((link, lIdx) =>
                        sec.isSpecial ? (
                          <Link
                            key={lIdx}
                            to={link.href}
                            className="navbar__mobile-child"
                            onClick={closeMobile}
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <Link
                            key={lIdx}
                            to={`/skills/${sec.categorySlug}/${link.slug}`}
                            className="navbar__mobile-child"
                            style={{ paddingLeft: 28, fontSize: 13 }}
                            onClick={closeMobile}
                          >
                            {link.label}
                          </Link>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="navbar__mobile-actions">
            {!isAuthenticated && (
              <Link to="/registration" className="btn-secondary" style={{ justifyContent: 'center' }} onClick={closeMobile}>Register</Link>
            )}
            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <button onClick={() => { logout(); closeMobile(); }} className="btn-primary" style={{ justifyContent: 'center' }}>Logout</button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary" style={{ justifyContent: 'center' }} onClick={closeMobile}>Login</Link>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && <div className="navbar__overlay" onClick={closeMobile} />}
    </>
  );
}
