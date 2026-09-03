import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './Navbar.css';
import { Link } from 'react-router-dom';
import {
  MessageSquareCode, Calculator, HelpCircle, Search, FileEdit, Zap,
  Code, Globe, Smartphone, Palette, PenTool, BrainCircuit, Database,
  BarChart3, Megaphone, FileText, Video, Music, Camera, Cloud, Server,
  ShieldCheck, Briefcase, Cpu, Layers, Wrench, LayoutGrid,
} from 'lucide-react';
import PkrIcon from '../PkrIcon';
import { useAuth } from '../../../hooks/useAuth';
import { skillsAPI } from '../../../api/skills';
import { warn } from "../../../utils/logger";

/**
 * Map a taxonomy category to a proper lucide icon component.
 * The API only supplies emoji, so we resolve a real icon by keyword —
 * ordered most-specific first — falling back to a neutral grid icon.
 */
const CATEGORY_ICON_RULES = [
  [/web|frontend|front-end|html|css/, Globe],
  [/mobile|android|ios|app dev/, Smartphone],
  [/\bai\b|machine learning|deep learning|\bml\b|neural/, BrainCircuit],
  [/data sci|data analyt|analytics|big data/, BarChart3],
  [/database|\bsql\b|mongo|postgres/, Database],
  [/devops|cloud|aws|azure|kubernetes|docker/, Cloud],
  [/backend|back-end|server|\bapi\b|node/, Server],
  [/program|language|software|coding|develop/, Code],
  [/ui|ux|product design|interface/, PenTool],
  [/graphic|logo|brand|illustrat|design/, Palette],
  [/seo|search engine/, Search],
  [/market|advertis|social media|growth/, Megaphone],
  [/writ|content|copy|blog|article|translat/, FileText],
  [/video|film|motion|animation|editing/, Video],
  [/photo|camera/, Camera],
  [/audio|music|voice|sound|podcast/, Music],
  [/security|cyber|pentest/, ShieldCheck],
  [/finance|account|invest|legal|tax/, PkrIcon],
  [/business|consult|management|strategy/, Briefcase],
  [/engineer|architecture|cad|hardware/, Cpu],
  [/wordpress|cms|plugin|no-code/, Wrench],
  [/blockchain|web3|crypto/, Layers],
];

const iconForCategory = (name = '') => {
  const n = name.toLowerCase();
  for (const [re, Icon] of CATEGORY_ICON_RULES) {
    if (re.test(n)) return Icon;
  }
  return LayoutGrid;
};

// Base layout of static items
const BASE_NAV_ITEMS = [
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
    categories: [], // Populated dynamically from the live skill taxonomy
  },
  {
    label: 'AI Tools',
    children: [
      { label: 'Buddy AI Assistant', sub: 'Your smart work buddy',   href: '/ai/buddy',             icon: <MessageSquareCode size={18} /> },
      { label: 'Cost Estimator',     sub: 'Price your projects',     href: '/ai/cost-estimator',    icon: <Calculator size={18} /> },
    ],
  },
  {
    label: 'Resources',
    children: [
      { label: 'Help Center', sub: 'Guides & support',  href: '/help',      icon: <HelpCircle size={18} /> },
    ],
  },
];

export default function Navbar({ alwaysSticky = false }) {
  const [navItems, setNavItems] = useState(BASE_NAV_ITEMS);
  const [visible, setVisible] = useState(true);
  const [isSticky, setIsSticky] = useState(alwaysSticky);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [megaActiveCat, setMegaActiveCat] = useState(0); // selected category in the Find Work mega menu
  const [mobileCat, setMobileCat] = useState(null); // expanded category inside the mobile Find Work accordion
  const { isAuthenticated, logout, user } = useAuth();
  const lastScrollY = useRef(0);

  const dashboardLink = user?.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';

  useEffect(() => {
    skillsAPI.getTaxonomyTree()
      .then(res => {
        const tree = res.data?.data?.tree || [];

        // Case-insensitive alphabetical comparator, reused at every level so the
        // menu is deterministically sorted no matter what order the API returns.
        const byName = (a, b) =>
          (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });

        // Flatten the Industry → Category hierarchy into a single, dynamic list
        // of categories. Each category owns its sub-category groups + skills.
        const categories = [];
        tree.forEach(ind => {
          (ind.categories || []).forEach(cat => {
            const groups = [];

            (cat.children || []).forEach(child => {
              const isLeaf = !child.children || child.children.length === 0;

              if (isLeaf) {
                // A skill hanging directly off the category → "general" group.
                let generalGroup = groups.find(g => g.subtitle === '');
                if (!generalGroup) {
                  generalGroup = { subtitle: '', slug: cat.slug, links: [] };
                  groups.push(generalGroup);
                }
                generalGroup.links.push({ label: child.name, slug: child.slug, parentSlug: cat.slug });
              } else {
                // A sub-category with its own skills.
                groups.push({
                  subtitle: child.name,
                  slug: child.slug,
                  links: (child.children || [])
                    .map(g => ({ label: g.name, slug: g.slug, parentSlug: child.slug }))
                    .sort((a, b) => byName(a.label, b.label)),
                });
              }
            });

            // Sort links within every group; order groups with "general" first.
            groups.forEach(g => g.links.sort((a, b) => byName(a.label, b.label)));
            groups.sort((a, b) => {
              if (!a.subtitle) return -1;
              if (!b.subtitle) return 1;
              return byName(a.subtitle, b.subtitle);
            });

            const skillCount = groups.reduce((n, g) => n + g.links.length, 0);

            // Skip categories that have no skills to show — an empty panel is noise.
            if (skillCount === 0) return;

            categories.push({
              title: cat.name,
              categorySlug: cat.slug,
              Icon: iconForCategory(cat.name),
              industry: ind.industry,
              groups,
              skillCount,
            });
          });
        });

        // Keep only the top 6 categories (most skills = most gigs/services),
        // then present that rail alphabetically.
        const topCategories = [...categories]
          .sort((a, b) => b.skillCount - a.skillCount)
          .slice(0, 6)
          .sort((a, b) => byName(a.title, b.title));

        setNavItems(prev => prev.map(item =>
          item.label === 'Find Work' ? { ...item, categories: topCategories } : item
        ));
        setMegaActiveCat(0);
      })
      .catch(err => {
        warn('Failed to load dynamic Navbar taxonomy:', err);
      });
  }, []);

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
      if (currentScrollY < 120 && !alwaysSticky) {
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
  }, [alwaysSticky]);

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
            {navItems.map((item, idx) => (
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
        {navItems.map((item, idx) =>
          item.isMega ? (
            <div
              key={item.label}
              className={`navbar__mega${activeDropdown === idx ? ' navbar__mega--open' : ''}`}
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="container">
                {(() => {
                  const cats = item.categories || [];
                  if (cats.length === 0) return null;
                  const active = cats[Math.min(megaActiveCat, cats.length - 1)] || cats[0];
                  return (
                    <div className="navbar__mega-inner">
                      {/* ── Left rail: dynamic category list ── */}
                      <aside className="navbar__mega-rail">
                        <ul className="navbar__mega-catlist">
                          {cats.map((cat, cIdx) => (
                            <li key={cat.categorySlug || cIdx}>
                              <button
                                type="button"
                                className={`navbar__mega-cat${cIdx === megaActiveCat ? ' navbar__mega-cat--active' : ''}`}
                                onMouseEnter={() => setMegaActiveCat(cIdx)}
                                onFocus={() => setMegaActiveCat(cIdx)}
                              >
                                <span className="navbar__mega-cat-icon" aria-hidden="true"><cat.Icon size={18} strokeWidth={1.8} /></span>
                                <span className="navbar__mega-cat-label">{cat.title}</span>
                                <svg className="navbar__mega-cat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <Link to="/categories" className="navbar__mega-rail-all" onClick={() => setActiveDropdown(null)}>
                          Explore all categories
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      </aside>

                      {/* ── Right panel: selected category's sub-categories & skills ── */}
                      <div className="navbar__mega-panel">
                        <div className="navbar__mega-panel-head">
                          <Link
                            to={`/skills/${active.categorySlug}`}
                            className="navbar__mega-panel-title"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <span className="navbar__mega-panel-title-icon" aria-hidden="true"><active.Icon size={20} strokeWidth={1.8} /></span>
                            {active.title}
                          </Link>
                          <Link
                            to={`/skills/${active.categorySlug}`}
                            className="navbar__mega-panel-viewall"
                            onClick={() => setActiveDropdown(null)}
                          >
                            View all
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                        </div>

                        <div className="navbar__mega-panel-cols">
                          {active.groups.map((group, gIdx) => (
                            <div key={group.slug || gIdx} className="navbar__mega-group">
                              {group.subtitle
                                ? (
                                  <Link
                                    to={`/skills/${group.slug}`}
                                    className="navbar__mega-subtitle"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    {group.subtitle}
                                  </Link>
                                )
                                : <span className="navbar__mega-subtitle navbar__mega-subtitle--general">Popular</span>}
                              <ul className="navbar__mega-links">
                                {group.links.map((link, lIdx) => (
                                  <li key={link.slug || lIdx}>
                                    <Link
                                      to={`/skills/${link.parentSlug || active.categorySlug}/${link.slug}`}
                                      className="navbar__mega-link"
                                      onClick={() => setActiveDropdown(null)}
                                    >
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {/* Footer: quick search shortcuts */}
                        <div className="navbar__mega-footer">
                          <Link to="/browse-projects" className="navbar__mega-footer-link" onClick={() => setActiveDropdown(null)}>
                            <Search size={16} /> Browse all projects
                          </Link>
                          <Link to="/ai-matchmaking" className="navbar__mega-footer-link" onClick={() => setActiveDropdown(null)}>
                            <Zap size={16} /> AI Matchmaking
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
          {navItems.map((item, idx) => (
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

              {/* Mega menu — categories as a nested accordion (mobile) */}
              {mobileExpanded === idx && item.isMega && (
                <div className="navbar__mobile-sub">
                  {(item.categories || []).map((cat, cIdx) => {
                    const open = mobileCat === cIdx;
                    return (
                      <div key={cat.categorySlug || cIdx} className="navbar__mobile-cat">
                        <button
                          type="button"
                          className={`navbar__mobile-cat-btn${open ? ' navbar__mobile-cat-btn--open' : ''}`}
                          onClick={() => setMobileCat(open ? null : cIdx)}
                        >
                          <span className="navbar__mobile-cat-icon" aria-hidden="true"><cat.Icon size={18} strokeWidth={1.8} /></span>
                          <span className="navbar__mobile-cat-name">{cat.title}</span>
                          <svg
                            className={`navbar__chevron${open ? ' navbar__chevron--rotated' : ''}`}
                            width="14" height="14" viewBox="0 0 12 12" fill="none"
                          >
                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {open && (
                          <div className="navbar__mobile-cat-body">
                            <Link
                              to={`/skills/${cat.categorySlug}`}
                              className="navbar__mobile-child navbar__mobile-viewall"
                              onClick={closeMobile}
                            >
                              View all {cat.title}
                            </Link>
                            {cat.groups.map((group, gIdx) => (
                              <div key={group.slug || gIdx} className="navbar__mobile-grp">
                                {group.subtitle && (
                                  <Link
                                    to={`/skills/${group.slug}`}
                                    className="navbar__mobile-child navbar__mobile-grp-title"
                                    onClick={closeMobile}
                                  >
                                    {group.subtitle}
                                  </Link>
                                )}
                                {group.links.map((link, lIdx) => (
                                  <Link
                                    key={link.slug || lIdx}
                                    to={`/skills/${link.parentSlug || cat.categorySlug}/${link.slug}`}
                                    className="navbar__mobile-child navbar__mobile-skill"
                                    onClick={closeMobile}
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                <Link to={dashboardLink} className="btn-secondary" style={{ justifyContent: 'center' }} onClick={closeMobile}>Dashboard</Link>
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
