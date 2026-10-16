import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useFreelancer } from '../../../context/FreelancerContext';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import { isMobileApp } from '../../../utils/platform';
import UserAvatar from '../../../Components/common/UserAvatar/UserAvatar';
import {
  LayoutDashboard, Search, Bot, User, Eye, Package, PlusSquare,
  Briefcase, ClipboardList, FolderOpen, FileText, MessageSquare,
  Bell, Settings, Lock, CreditCard, LogOut, CheckCircle2,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'MAIN',
    items: [
      { to: '/freelancer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/browse-projects',       icon: Search,           label: 'Find Work' },
      { to: '/freelancer/buddy',      icon: Bot,              label: 'Buddy AI' },
    ],
  },
  {
    label: 'PROFILE',
    items: [
      { to: '/freelancer/profile', icon: User, label: 'My Profile' },
      { to: '__public__',          icon: Eye,  label: 'View Public Profile', mobileHidden: true },
      { to: '/freelancer/portfolio', icon: FolderOpen, label: 'Portfolio' },
    ],
  },
  {
    label: 'WORK',
    items: [
      { to: '/freelancer/gigs',         icon: Package,       label: 'My Gigs' },
      { to: '/freelancer/gigs/create',  icon: PlusSquare,    label: 'Create New Gig' },
      { to: '/freelancer/work',         icon: Briefcase,     label: 'My Work' },
      { to: '/freelancer/proposals',    icon: ClipboardList, label: 'My Proposals' },
      { to: '/freelancer/saved',        icon: FileText,      label: 'Saved Projects' },
    ],
  },
  {
    label: 'MONEY',
    items: [
      { to: '/freelancer/wallet', icon: CreditCard, label: 'Wallet & Earnings' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { to: '/freelancer/messages',      icon: MessageSquare, label: 'Messages' },
      { to: '/freelancer/notifications', icon: Bell,          label: 'Notifications', badge: true },
      { to: '/freelancer/settings',      icon: Settings,      label: 'Settings' },
      { to: '/freelancer/security',      icon: Lock,          label: 'Security' },
    ],
  },
];

const FreelancerSidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { unreadCount } = useNotification();
  const { profile } = useFreelancer();
  const { logout, user } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const { fullName, title, avatar } = profile?.personalInfo || {};
  const userId = user?._id || user?.id;
  const initials = (fullName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isVerified = profile?.verificationStatus === 'verified';

  const handleLogout = () => {
    if (confirmLogout) {
      setMobileOpen?.(false);
      logout();
    } else {
      setConfirmLogout(true);
      setTimeout(() => setConfirmLogout(false), 3000);
    }
  };

  const sidebarClass = [
    'fl2-sidebar',
    collapsed ? 'fl2-sidebar--col' : '',
    mobileOpen ? 'fl2-sidebar--mob-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fl2-mob-overlay" onClick={() => setMobileOpen?.(false)} />
      )}

      <aside className={sidebarClass} aria-label="Freelancer navigation">
        {/* Brand row */}
        <div className="fl2-sidebar__brand">
          <span className="fl2-sidebar__logo">SkillKart</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Mobile close */}
            {mobileOpen && (
              <button
                className="fl2-sidebar__col-btn"
                onClick={() => setMobileOpen?.(false)}
                aria-label="Close menu"
              >
                <X size={15} />
              </button>
            )}
            {/* Desktop collapse */}
            {!mobileOpen && (
              <button
                className="fl2-sidebar__col-btn"
                onClick={() => setCollapsed?.(!collapsed)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* Profile card */}
        <div className="fl2-sidebar__profile">
          <div className="fl2-sidebar__av-wrap">
            <div className="fl2-sidebar__av">
              {avatar
                ? <img src={avatar} alt={fullName} />
                : <UserAvatar src={avatar} fullName={fullName} size={40} />
              }
            </div>
            <span className="fl2-sidebar__online" title="Online" />
          </div>
          <div className="fl2-sidebar__user">
            <div className="fl2-sidebar__name">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName || 'Freelancer'}
              </span>
              {isVerified && (
                <CheckCircle2 size={13} className="fl2-verified" title="Verified Expert" />
              )}
            </div>
            <div className="fl2-sidebar__role">Freelancer</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="fl2-sidebar__nav">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div className="fl2-nav-group">{group.label}</div>
              {group.items
                .filter(item => !item.mobileHidden || !isMobileApp())
                .map(item => {
                  const to = item.to === '__public__' ? `/freelancers/${userId}` : item.to;
                  const Icon = item.icon;
                  const isEnd = [
                    '/freelancer/dashboard',
                    '/freelancer/profile',
                    '/freelancer/gigs',
                  ].includes(item.to);

                  return (
                    <NavLink
                      key={item.to}
                      to={to}
                      end={isEnd}
                      className={({ isActive }) =>
                        `fl2-nav-link${isActive ? ' fl2-nav-link--active' : ''}`
                      }
                      onClick={() => setMobileOpen?.(false)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="fl2-nav-link__icon">
                        <Icon size={17} strokeWidth={1.75} />
                      </span>
                      <span className="fl2-nav-link__label">{item.label}</span>
                      {item.badge && unreadCount > 0 && (
                        <span className="fl2-nav-badge">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Footer / Logout */}
        <div className="fl2-sidebar__foot">
          <button
            className={`fl2-nav-link${confirmLogout ? ' fl2-nav-link--logout-confirm' : ''}`}
            onClick={handleLogout}
            style={{ color: confirmLogout ? 'var(--fl-danger)' : undefined }}
            title={collapsed ? (confirmLogout ? 'Click again to confirm' : 'Logout') : undefined}
          >
            <span className="fl2-nav-link__icon">
              <LogOut size={17} strokeWidth={1.75} />
            </span>
            <span className="fl2-nav-link__label">
              {confirmLogout ? 'Confirm logout?' : 'Logout'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default FreelancerSidebar;
