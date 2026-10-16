import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown, Search, Bot, Bell, Check, X,
  LogOut, CheckCircle2, Menu, Sparkles, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import { notificationsAPI } from '../../../api/notifications';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import { getNavConfig } from './navConfig';
import './AppNavbar.css';

const LogoSVG = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
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
);

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount, markReadLocal } = useNotification();

  const role = user?.role || 'freelancer';
  const navConfig = getNavConfig(role, user);
  const dashboardLink = role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';

  // Navigation Dropdowns
  const [openDropdown, setOpenDropdown] = useState(null); // 'work' | 'profile' | 'hiring' | null
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  // Search Modal
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileAccordions, setMobileAccordions] = useState({ work: true, profile: true, hiring: true });

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navRef = useRef(null);
  const dropdownTimerRef = useRef(null);
  const avatarTimerRef = useRef(null);

  // Desktop Hover Handlers with ~150ms grace delay
  const handleDropdownMouseEnter = (id) => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
      if (avatarTimerRef.current) clearTimeout(avatarTimerRef.current);
      setOpenDropdown(id);
      setAvatarOpen(false);
      setBellOpen(false);
    }
  };

  const handleDropdownMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
      dropdownTimerRef.current = setTimeout(() => {
        setOpenDropdown(null);
      }, 150);
    }
  };

  const handleAvatarMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
      if (avatarTimerRef.current) clearTimeout(avatarTimerRef.current);
      setAvatarOpen(true);
      setOpenDropdown(null);
      setBellOpen(false);
    }
  };

  const handleAvatarMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (avatarTimerRef.current) clearTimeout(avatarTimerRef.current);
      avatarTimerRef.current = setTimeout(() => {
        setAvatarOpen(false);
      }, 150);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setAvatarOpen(false);
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setAvatarOpen(false);
        setBellOpen(false);
        setSearchModalOpen(false);
        setMobileDrawerOpen(false);
      }
      // ⌘K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setOpenDropdown(null);
    setAvatarOpen(false);
    setBellOpen(false);
    setSearchModalOpen(false);
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer or search modal is open
  useEffect(() => {
    if (mobileDrawerOpen || searchModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen, searchModalOpen]);

  // Fetch recent notifications when bell dropdown opens
  const handleToggleBell = async () => {
    const nextState = !bellOpen;
    setBellOpen(nextState);
    setAvatarOpen(false);
    setOpenDropdown(null);

    if (nextState) {
      setNotifsLoading(true);
      try {
        const { data } = await notificationsAPI.list({ limit: 5 });
        setRecentNotifs(data?.data?.items || []);
      } catch {
        // Handled silently
      } finally {
        setNotifsLoading(false);
      }
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationsAPI.markRead(notif._id);
        markReadLocal(1);
      } catch {
        // Handled silently
      }
    }
    setBellOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const toggleDropdown = (id) => {
    setOpenDropdown(prev => (prev === id ? null : id));
    setAvatarOpen(false);
    setBellOpen(false);
  };

  const toggleAvatar = () => {
    setAvatarOpen(prev => !prev);
    setBellOpen(false);
    setOpenDropdown(null);
  };

  const toggleAccordion = (id) => {
    setMobileAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  // Collect all distinct navigation hrefs across directLinks, dropdowns, and avatarMenu
  const allNavHrefs = useMemo(() => {
    const list = [];
    (navConfig.directLinks || []).forEach(l => l?.href && list.push(l.href));
    (navConfig.dropdowns || []).forEach(d => (d.items || []).forEach(i => i?.href && list.push(i.href)));
    (navConfig.avatarMenu || []).forEach(m => m?.href && list.push(m.href));
    return Array.from(new Set(list));
  }, [navConfig]);

  // Find the SINGLE best matching active href (exact match first, then longest matching prefix)
  const activeHref = useMemo(() => {
    const current = location.pathname;
    if (!current) return null;

    // 1. Exact path match takes absolute priority
    const exact = allNavHrefs.find(h => h === current);
    if (exact) return exact;

    // 2. Otherwise find candidate prefix matches (separated by /)
    const prefixMatches = allNavHrefs.filter(h => {
      if (h === '/' || h === dashboardLink) return current === h;
      return current.startsWith(h.endsWith('/') ? h : `${h}/`);
    });

    if (prefixMatches.length === 0) return null;

    // 3. Select the single longest matching prefix
    prefixMatches.sort((a, b) => b.length - a.length);
    return prefixMatches[0];
  }, [location.pathname, allNavHrefs, dashboardLink]);

  // Shared active helper: exactly one link matches
  const isPathActive = useCallback((href) => {
    return Boolean(href && href === activeHref);
  }, [activeHref]);

  // Dropdown helper: active only if it contains the best active item
  const isDropdownActive = useCallback((items) => {
    return (items || []).some(item => item.href === activeHref);
  }, [activeHref]);

  // User display info
  const fullName = user?.name || user?.personalInfo?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const email = user?.email || user?.personalInfo?.email || '';
  const avatarUrl = user?.profilePicture || user?.personalInfo?.avatar;
  const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SK';
  const isVerified = user?.verificationStatus === 'verified' || user?.isVerified;

  // Search quick options
  const searchQuickLinks = role === 'client' ? [
    { title: 'Find Freelancers', sub: 'Search verified freelance experts', href: '/browse-freelancers' },
    { title: 'Post a New Project', sub: 'Get proposals within hours', href: '/client/projects/create' },
    { title: 'My Job Postings', sub: 'Manage existing contracts and jobs', href: '/client/projects' },
    { title: 'Payments & Wallet', sub: 'Escrow and transaction history', href: '/client/wallet' },
  ] : [
    { title: 'Browse Client Projects', sub: 'Find freelance jobs matching your skills', href: '/browse-projects' },
    { title: 'Create a New Gig', sub: 'Publish a pre-packaged service', href: '/freelancer/gigs/create' },
    { title: 'My Proposals', sub: 'Track your pending and accepted bids', href: '/freelancer/proposals' },
    { title: 'Wallet & Earnings', sub: 'Check escrow and withdraw funds', href: '/freelancer/wallet' },
    { title: 'Direct Messages', sub: 'Chat with your clients', href: '/freelancer/messages' },
  ];

  const filteredSearchResults = searchQuickLinks.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="app-nav" ref={navRef}>
        <div className="app-nav__container">
          {/* ── Left: Logo (Clean, No Role Tag) ── */}
          <div className="app-nav__left">
            <Link to={dashboardLink} className="app-nav__logo" aria-label="SkillKart Dashboard">
              <LogoSVG size={32} />
              <span className="app-nav__logo-text">Skill<span>Kart</span></span>
            </Link>
          </div>

          {/* ── Center: Desktop Navigation ── */}
          <nav className="app-nav__center" aria-label="Main Application Navigation">
            {/* Direct Links */}
            {navConfig.directLinks.map((link) => {
              const active = isPathActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`app-nav__link${active ? ' app-nav__link--active' : ''}`}
                >
                  <link.icon size={16} strokeWidth={1.75} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Dropdown Groups (Hover on Desktop with 150ms delay, Click toggle, Keyboard navigation) */}
            {navConfig.dropdowns.map((dropdown) => {
              const isOpen = openDropdown === dropdown.id;
              const hasActiveChild = isDropdownActive(dropdown.items);

              return (
                <div
                  key={dropdown.id}
                  className="app-nav__dropdown-wrap"
                  onMouseEnter={() => handleDropdownMouseEnter(dropdown.id)}
                  onMouseLeave={handleDropdownMouseLeave}
                >
                  <button
                    type="button"
                    className={`app-nav__link${hasActiveChild ? ' app-nav__link--active' : ''}`}
                    onClick={() => toggleDropdown(dropdown.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        toggleDropdown(dropdown.id);
                      }
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                  >
                    <span>{dropdown.label}</span>
                    <ChevronDown size={14} className={`app-nav__chevron${isOpen ? ' app-nav__chevron--open' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="app-nav__dropdown-menu" role="menu">
                      {dropdown.items.map((item) => {
                        const itemActive = isPathActive(item.href);
                        const ItemIcon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={`app-nav__dropdown-item${itemActive ? ' app-nav__dropdown-item--active' : ''}`}
                            role="menuitem"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="app-nav__item-icon-box">
                                <ItemIcon size={16} strokeWidth={1.8} />
                              </div>
                              <div className="app-nav__item-content">
                                <div className="app-nav__item-title">{item.label}</div>
                                {item.sub && <div className="app-nav__item-sub">{item.sub}</div>}
                              </div>
                            </div>
                            {itemActive && (
                              <Check size={16} className="app-nav__item-check" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* ── Right Cluster: Search, Exactly ONE Bell, Avatar Dropdown (Clean & Uncrowded) ── */}
          <div className="app-nav__right">
            {/* Search Pill (Full on desktop >1280px) */}
            <button
              type="button"
              className="app-nav__search-btn"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search"
            >
              <Search size={14} />
              <span>Search gigs, projects...</span>
              <kbd className="app-nav__search-kbd">⌘K</kbd>
            </button>

            {/* Collapsed Search Icon (1024px - 1280px) */}
            <button
              type="button"
              className="app-nav__search-icon-btn"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            {/* Quick Messages Icon */}
            <Link
              to={role === 'client' ? '/client/messages' : '/freelancer/messages'}
              className={`app-nav__icon-btn${isPathActive(role === 'client' ? '/client/messages' : '/freelancer/messages') ? ' app-nav__icon-btn--active' : ''}`}
              aria-label="Direct Messages"
              title="Direct Messages"
            >
              <MessageSquare size={18} strokeWidth={1.8} />
            </Link>

            {/* Exactly ONE Notification Bell */}
            <div className="app-nav__bell-wrap">
              <button
                type="button"
                className="app-nav__icon-btn"
                onClick={handleToggleBell}
                aria-label={`Notifications (${unreadCount} unread)`}
                aria-expanded={bellOpen}
              >
                <Bell size={18} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className="app-nav__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>

              {bellOpen && (
                <div className="app-nav__notif-menu">
                  <div className="app-nav__notif-head">
                    <h4 className="app-nav__notif-title">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="fl2-badge fl2-badge--primary" style={{ fontSize: 10 }}>
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  <div className="app-nav__notif-list">
                    {notifsLoading ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#64748B' }}>
                        Loading notifications…
                      </div>
                    ) : recentNotifs.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                        No new notifications right now.
                      </div>
                    ) : (
                      recentNotifs.map((n) => (
                        <div
                          key={n._id}
                          className={`app-nav__notif-item${!n.read ? ' app-nav__notif-item--unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div style={{ flex: 1 }}>
                            <div className="app-nav__notif-msg">{n.message || n.title}</div>
                            <div className="app-nav__notif-time">
                              {n.createdAt ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                            </div>
                          </div>
                          {!n.read && (
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0, marginTop: 4 }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="app-nav__notif-foot">
                    <Link
                      to={role === 'client' ? '/client/notifications' : '/freelancer/notifications'}
                      onClick={() => setBellOpen(false)}
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Dropdown (Hover on Desktop with 150ms delay, Click toggle) */}
            <div
              className="app-nav__avatar-wrap"
              onMouseEnter={handleAvatarMouseEnter}
              onMouseLeave={handleAvatarMouseLeave}
            >
              <button
                type="button"
                className="app-nav__avatar-btn"
                onClick={toggleAvatar}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    toggleAvatar();
                  }
                }}
                aria-expanded={avatarOpen}
                aria-haspopup="true"
                aria-label="User Account Menu"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="app-nav__avatar-img" />
                ) : (
                  <div className="app-nav__avatar-initials">{initials}</div>
                )}
                <ChevronDown size={14} className={`app-nav__chevron${avatarOpen ? ' app-nav__chevron--open' : ''}`} />
              </button>

              {avatarOpen && (
                <div className="app-nav__user-menu" role="menu">
                  {/* User Profile Card Header */}
                  <div className="app-nav__user-card">
                    <div className="app-nav__user-name">
                      <span>{fullName}</span>
                      {isVerified && <CheckCircle2 size={14} color="#10B981" />}
                    </div>
                    {email && <div className="app-nav__user-email">{email}</div>}
                    <div className="app-nav__user-badges">
                      <span className="app-nav__role-pill">{role}</span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  {navConfig.avatarMenu.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="app-nav__menu-item"
                        role="menuitem"
                        onClick={() => setAvatarOpen(false)}
                      >
                        <ItemIcon size={16} color="#64748B" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  <div className="app-nav__menu-divider" />

                  {/* Logout Button */}
                  <button
                    type="button"
                    className="app-nav__menu-item app-nav__menu-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setAvatarOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="app-nav__hamburger"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open Mobile Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile & Tablet Drawer ── */}
      {mobileDrawerOpen && (
        <div className="app-drawer-overlay" onClick={() => setMobileDrawerOpen(false)}>
          <div className="app-drawer" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Mobile Navigation Drawer">
            <div className="app-drawer__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LogoSVG size={28} />
                <span className="app-nav__logo-text" style={{ fontSize: '1.15rem' }}>Skill<span>Kart</span></span>
              </div>
              <button
                type="button"
                className="fl2-icon-btn fl2-icon-btn--sm"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="app-drawer__body">
              {/* User Card */}
              <div className="app-drawer__user-card">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="app-nav__avatar-initials" style={{ width: 44, height: 44, fontSize: 16 }}>{initials}</div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--app-navy-deep)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</span>
                    {isVerified && <CheckCircle2 size={14} color="#10B981" />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'capitalize', marginTop: 3, display: 'inline-block' }}>
                    {role} Account
                  </span>
                </div>
              </div>

              {/* Drawer Search */}
              <div className="app-drawer__search">
                <Search size={16} className="app-drawer__search-icon" />
                <input
                  type="text"
                  placeholder="Search gigs, jobs, proposals…"
                  className="app-drawer__search-input"
                  onFocus={() => {
                    setMobileDrawerOpen(false);
                    setSearchModalOpen(true);
                  }}
                  readOnly
                />
              </div>

              {/* Direct Links */}
              <div>
                <div className="app-drawer__section-title">Main</div>
                {navConfig.directLinks.map((link) => {
                  const active = isPathActive(link.href);
                  const LinkIcon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`app-drawer__link${active ? ' app-drawer__link--active' : ''}`}
                      onClick={() => setMobileDrawerOpen(false)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <LinkIcon size={18} color={active ? '#10B981' : '#64748B'} />
                        <span>{link.label}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Dropdown Groups as Accordions */}
              {navConfig.dropdowns.map((dropdown) => {
                const isExpanded = !!mobileAccordions[dropdown.id];

                return (
                  <div key={dropdown.id}>
                    <button
                      type="button"
                      className="app-drawer__accordion-btn"
                      onClick={() => toggleAccordion(dropdown.id)}
                    >
                      <span>{dropdown.label}</span>
                      <ChevronDown size={16} className={`app-nav__chevron${isExpanded ? ' app-nav__chevron--open' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="app-drawer__accordion-content">
                        {dropdown.items.map((item) => {
                          const active = isPathActive(item.href);
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              className={`app-drawer__link${active ? ' app-drawer__link--active' : ''}`}
                              onClick={() => setMobileDrawerOpen(false)}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <ItemIcon size={16} color={active ? '#10B981' : '#64748B'} />
                                <span>{item.label}</span>
                              </span>
                              {active && <Check size={14} color="#10B981" />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Account Section */}
              <div>
                <div className="app-drawer__section-title">Account</div>
                {navConfig.avatarMenu.map((item) => {
                  const active = isPathActive(item.href);
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`app-drawer__link${active ? ' app-drawer__link--active' : ''}`}
                      onClick={() => setMobileDrawerOpen(false)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ItemIcon size={18} color={active ? '#10B981' : '#64748B'} />
                        <span>{item.label}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer with Clean Logout & Buddy Assistant link */}
            <div className="app-drawer__foot">
              <Link
                to={role === 'client' ? '/client/buddy' : '/freelancer/buddy'}
                className="fl-pill-btn fl-pill-btn--outline"
                style={{ justifyContent: 'center', padding: '10px 16px', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                onClick={() => setMobileDrawerOpen(false)}
              >
                <Bot size={15} color="#10B981" />
                <span>Buddy AI Assistant</span>
              </Link>

              <button
                type="button"
                className="fl2-btn fl2-btn--danger"
                style={{ justifyContent: 'center', padding: '10px' }}
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setShowLogoutConfirm(true);
                }}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ⌘K Search Modal ── */}
      {searchModalOpen && (
        <div className="app-search-overlay" onClick={() => setSearchModalOpen(false)}>
          <div className="app-search-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Quick Search">
            <div className="app-search-input-wrap">
              <Search size={20} color="#10B981" />
              <input
                type="text"
                className="app-search-input"
                placeholder="Type to search gigs, proposals, jobs, or sections…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <button
                type="button"
                className="fl2-icon-btn fl2-icon-btn--sm"
                onClick={() => setSearchModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="app-search-results">
              {filteredSearchResults.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13.5 }}>
                  No matches found for "{searchQuery}".
                </div>
              ) : (
                filteredSearchResults.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="app-search-item"
                    onClick={() => setSearchModalOpen(false)}
                  >
                    <div className="app-nav__item-icon-box" style={{ width: 32, height: 32 }}>
                      <Search size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{link.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>{link.sub}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="app-search-foot">
              <span>Quick navigation across your workspace</span>
              <span>Press <kbd style={{ padding: '2px 5px', background: '#E2E8F0', borderRadius: 4, fontWeight: 700 }}>ESC</kbd> to exit</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Confirmation Dialog ── */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to log out of SkillKart?"
        confirmLabel="Yes, Log Out"
        cancelLabel="Stay Logged In"
        danger={true}
        onConfirm={handleLogout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
