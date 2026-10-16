import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import GlobalSearch from '../Components/adminPanel/GlobalSearch';
import './AdminPanelLayout.css';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin-panel/dashboard',    icon: '⬡', label: 'Dashboard' },
      { to: '/admin-panel/analytics',    icon: '📊', label: 'Analytics' },
    ]
  },
  {
    label: 'Platform',
    items: [
      { to: '/admin-panel/users',        icon: '👥', label: 'Users' },
      { to: '/admin-panel/jobs',         icon: '💼', label: 'Jobs' },
      { to: '/admin-panel/contracts',    icon: '📋', label: 'Contracts' },
      { to: '/admin-panel/disputes',     icon: '⚠️', label: 'Disputes' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { to: '/admin-panel/payments',     icon: '💳', label: 'Payments' },
      { to: '/admin-panel/wallets',      icon: '👛', label: 'Wallets' },
      { to: '/admin-panel/withdrawals',  icon: '💸', label: 'Withdrawals' },
      { to: '/admin-panel/transactions', icon: '↕️', label: 'Transactions' },
    ]
  },
  {
    label: 'Moderation',
    items: [
      { to: '/admin-panel/chat',          icon: '💬', label: 'Chat' },
      { to: '/admin-panel/reviews',       icon: '⭐', label: 'Reviews' },
      { to: '/admin-panel/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/admin-panel/reports',       icon: '🚩', label: 'Reports' },
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/admin-panel/monitoring',   icon: '📡', label: 'Monitoring' },
      { to: '/admin-panel/audit-logs',   icon: '📜', label: 'Audit Logs' },
      { to: '/admin-panel/settings',     icon: '⚙️', label: 'Settings' },
    ]
  }
];

const AdminPanelLayout = () => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Off-canvas drawer state (<1024px). On desktop the sidebar is always visible
  // and this flag has no visual effect.
  const [navOpen, setNavOpen] = useState(false);

  // Close the drawer whenever the route changes (tap a nav link -> navigate).
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  // Derive current page title from pathname
  const getPageTitle = () => {
    const seg = location.pathname.split('/').filter(Boolean).pop();
    if (!seg || seg === 'admin-panel') return 'Dashboard';
    return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin-panel/login', { replace: true });
  };

  // Email initials for avatar
  const initials = admin?.email
    ? admin.email.slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="admin-layout">
      {/* Scrim behind the off-canvas drawer (only rendered <1024px via CSS) */}
      <div
        className={`ap-scrim${navOpen ? ' open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        id="ap-sidebar"
        className={`ap-sidebar${navOpen ? ' open' : ''}`}
        aria-label="Admin navigation"
      >
        {/* Brand */}
        <div className="ap-sidebar-brand">
          <div className="ap-brand-icon">🛡️</div>
          <div className="ap-brand-text">
            <h2>SkillKart</h2>
            <span>Admin Panel</span>
          </div>
          <button
            type="button"
            className="ap-sidebar-close"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav sections */}
        <nav className="ap-sidebar-nav">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="ap-nav-section">
              <div className="ap-nav-section-label">{section.label}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `ap-nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <span className="ap-nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Admin badge */}
        <div className="ap-sidebar-footer">
          <div className="ap-admin-badge">
            <div className="ap-admin-avatar">{initials}</div>
            <div className="ap-admin-info">
              <strong title={admin?.email}>{admin?.email || 'Admin'}</strong>
              <small>{admin?.role?.replace(/_/g, ' ') || 'Super Admin'}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="ap-main-content">
        {/* Header */}
        <header className="ap-header">
          <div className="ap-header-left">
            <button
              type="button"
              className="ap-menu-btn"
              onClick={() => setNavOpen(o => !o)}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
              aria-controls="ap-sidebar"
            >
              ☰
            </button>
            <span className="ap-page-title">{getPageTitle()}</span>
            <GlobalSearch />
          </div>
          <div className="ap-header-right">
            {/* Health status dot */}
            <div className="ap-header-btn" data-tip="System Health" role="img" aria-label="System health" style={{ cursor: 'default' }}>
              <span style={{ color: 'var(--ap-green)', fontSize: '0.75rem' }}>●</span>
            </div>

            {/* Settings link */}
            <NavLink to="/admin-panel/settings" className="ap-header-btn" data-tip="Settings" aria-label="Settings">
              ⚙️
            </NavLink>

            {/* Logout */}
            <button
              className="ap-header-btn"
              onClick={handleLogout}
              data-tip="Logout"
              aria-label="Log out"
              style={{ cursor: 'pointer' }}
            >
              🚪
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="ap-page-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminPanelLayout;
