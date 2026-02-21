import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './Navbar.css';

/* ── Nav data ── */
const NAV_ITEMS = [
  {
    label: 'Find Talent',
    children: [
      { label: 'Browse Freelancers', sub: 'Explore verified profiles' },
      { label: 'Post a Project', sub: 'Get proposals fast' },
      { label: 'AI Matchmaking', sub: 'Smart recommendations' },
    ],
  },
  {
    label: 'Find Work',
    isMega: true,
    sections: [
      {
        title: 'Admin & support jobs',
        links: ['Chat support jobs', 'Cold calling jobs', 'Content moderation jobs', 'Lead generation jobs', 'Virtual assistant jobs'],
      },
      {
        title: 'Design & creative jobs',
        links: ['Canva jobs', 'Graphic design jobs', 'Illustration jobs', 'Logo design jobs', 'Web design jobs'],
      },
      {
        title: 'Marketing jobs',
        links: ['Digital marketing jobs', 'Email marketing jobs', 'Google Ads jobs', 'SEO jobs', 'Social media management jobs'],
      },
      {
        title: 'Writing & content jobs',
        links: ['Book editing jobs', 'Content writing jobs', 'Copywriting jobs', 'Email copywriting jobs', 'Ghostwriting jobs'],
      },
      {
        title: 'AI & emerging tech jobs',
        links: ['AI app development jobs', 'Chatbot development jobs', 'Ethical hacking jobs', 'Machine learning jobs', 'OpenAI jobs'],
      },
      {
        title: 'Development & tech jobs',
        links: ['Mobile app development jobs', 'Python jobs', 'Software development jobs', 'Web development jobs', 'WordPress jobs'],
      },
      {
        title: 'Video, audio & animation jobs',
        links: ['Animation jobs', 'Audio editing jobs', 'Music production jobs', 'Video editing jobs', 'Voice over jobs'],
      },
      {
        isSpecial: true,
        links: [
          { label: 'Explore more', icon: true },
          { label: 'Ways to earn', icon: true },
          { label: 'Win work with ads', icon: true },
          { label: 'Join Freelancer Plus', icon: true },
        ],
      },
    ],
  },
  {
    label: 'AI Tools',
    children: [
      { label: 'Verify Credentials', sub: 'AI-powered verification' },
      { label: 'Buddy AI Assistant', sub: 'Your smart work buddy' },
      { label: 'Profile Analyzer', sub: 'Get actionable insights' },
      { label: 'Cost Estimator', sub: 'Price your projects' },
    ],
  },
  {
    label: 'Resources',
    children: [
      { label: 'Blog', sub: 'Tips & tutorials' },
      { label: 'Community', sub: 'Connect with peers' },
      { label: 'Help Center', sub: 'Guides & support' },
    ],
  },
];

export default function Navbar() {
  const [visible, setVisible] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const lastScrollY = useRef(0);

  const navRef = useRef(null);
  const logoRef = useRef(null);
  const linksRef = useRef(null);
  const actionsRef = useRef(null);

  /* ── GSAP entrance animation ── */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Ensure navbar starts from a known state and ends at visible state
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

      // Determine if sticky (crystal mode)
      // Trigger only after leaving Hero (approx 800px)
      setIsSticky(currentScrollY > 800);

      // Smart hide/show logic
      // Only hide if scrolled past hero (approx 600px) and scrolling down
      if (currentScrollY > 600) {
        if (currentScrollY > lastScrollY.current) {
          setVisible(false); // Scrolling down
        } else {
          setVisible(true); // Scrolling up
        }
      } else {
        setVisible(true); // Always show near the top
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  /* ── Dropdown Hover Logic with Grace Period ── */
  const timeoutRef = useRef(null);

  const handleMouseEnter = (idx) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(idx);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150); // 150ms grace period
  };

  const toggleMobile = (idx) =>
    setMobileExpanded(prev => (prev === idx ? null : idx));

  return (
    <>
      <nav
        ref={navRef}
        className={`navbar ${!visible ? 'navbar--hidden' : ''} ${isSticky ? 'navbar--sticky' : ''} ${mobileOpen ? 'navbar--mobile-open' : ''}`}
      >
        <div className="container navbar__inner">

          {/* ── Logo ── */}
          <a href="#" ref={logoRef} className="navbar__logo">
            <span className="navbar__logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#B7C9E2" />
                <path d="M8 22L13 10l5 8 3-5 4 9" stroke="#042E4C" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="24" cy="10" r="2.5" fill="#042E4C" />
              </svg>
            </span>
            <span className="navbar__logo-text">
              Skill<span>Kart</span>
            </span>
          </a>

          {/* ── Desktop nav links ── */}
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
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Standard Dropdown */}
                {!item.isMega && (
                  <div className={`navbar__dropdown${activeDropdown === idx ? ' navbar__dropdown--open' : ''}`}>
                    <div className="navbar__dropdown-inner">
                      {item.children.map(child => (
                        <a key={child.label} href="#" className="navbar__dropdown-item">
                          <span className="navbar__dropdown-dot" />
                          <span>
                            <strong>{child.label}</strong>
                            <small>{child.sub}</small>
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* ── CTA buttons ── */}
          <div ref={actionsRef} className="navbar__actions">
            <a href="#" className="navbar__signin">Sign In</a>
            <a href="#" className="navbar__cta btn-primary">Get Started</a>
          </div>

          {/* ── Hamburger ── */}
          <button
            className={`navbar__hamburger${mobileOpen ? ' navbar__hamburger--open' : ''}`}
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* ── Mega Menus (Rendered outside inner container for true full-width) ── */}
        {NAV_ITEMS.map((item, idx) => (
          item.isMega && (
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
                        {sec.title && <h4 className="navbar__mega-title">{sec.title}</h4>}
                        <ul className="navbar__mega-links">
                          {sec.links.map((link, lIdx) => (
                            <li key={lIdx}>
                              {sec.isSpecial ? (
                                <a href="#" className="navbar__mega-link navbar__mega-link--special">
                                  <span>{link.label}</span>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </a>
                              ) : (
                                <a href="#" className="navbar__mega-link">{link}</a>
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
          )
        ))}
      </nav>

      {/* ── Mobile drawer ── */}
      <div className={`navbar__mobile-drawer${mobileOpen ? ' navbar__mobile-drawer--open' : ''}`}>
        <div className="navbar__mobile-inner">
          {NAV_ITEMS.map((item, idx) => (
            <div key={item.label} className="navbar__mobile-group">
              <button
                className="navbar__mobile-parent"
                onClick={() => toggleMobile(idx)}
              >
                {item.label}
                <svg
                  className={`navbar__chevron${mobileExpanded === idx ? ' navbar__chevron--rotated' : ''}`}
                  width="14" height="14" viewBox="0 0 12 12" fill="none"
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {mobileExpanded === idx && (
                <div className="navbar__mobile-sub">
                  {item.children.map(child => (
                    <a key={child.label} href="#" className="navbar__mobile-child">
                      <span className="navbar__dropdown-dot" />
                      {child.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="navbar__mobile-actions">
            <a href="#" className="btn-secondary" style={{ justifyContent: 'center' }}>Sign In</a>
            <a href="#" className="btn-primary" style={{ justifyContent: 'center' }}>Get Started</a>
          </div>
        </div>
      </div>

      {/* ── Overlay ── */}
      {mobileOpen && (
        <div className="navbar__overlay" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
