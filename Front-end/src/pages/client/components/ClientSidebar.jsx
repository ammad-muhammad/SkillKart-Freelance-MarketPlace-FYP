import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useClient } from '../../../context/ClientContext';
import { useAuth } from '../../../hooks/useAuth';
import UserAvatar from '../../../Components/common/UserAvatar/UserAvatar';
import { useNotification } from '../../../context/NotificationContext';
import { isMobileApp } from '../../../utils/platform';
import {
  LayoutDashboard,
  Search,
  User,
  Eye,
  FolderOpen,
  PlusSquare,
  CreditCard,
  Bookmark,
  MessageSquare,
  Bell,
  Settings,
  Lock,
  LogOut,
  Building,
  X
} from 'lucide-react';
import './ClientSidebar.css';

const NAV_ITEMS = [
  { to: '/client/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  // Both link to routes that aren't registered at all on the mobile build
  // (see AppRoutes.jsx) — filtered out below rather than left as dead links.
  { to: '/browse-freelancers', icon: <Search size={20} />, label: 'Find Freelancers', mobileHidden: true },
  { to: '/client/profile', icon: <User size={20} />, label: 'My Profile' },
  { to: '__public_profile__', icon: <Eye size={20} />, label: 'View Public Profile', mobileHidden: true },
  { to: '/client/projects', icon: <FolderOpen size={20} />, label: 'My Projects' },
  { to: '/client/projects/create', icon: <PlusSquare size={20} />, label: 'Post New Project' },
  { to: '/client/wallet', icon: <CreditCard size={20} />, label: 'Billing & Payments' },
  { to: '/client/saved', icon: <Bookmark size={20} />, label: 'Saved Freelancers' },
  { to: '/client/messages', icon: <MessageSquare size={20} />, label: 'Messages' },
  { to: '/client/notifications', icon: <Bell size={20} />, label: 'Notifications' },
  { to: '/client/settings', icon: <Settings size={20} />, label: 'Settings' },
  { to: '/client/security', icon: <Lock size={20} />, label: 'Security' },
];

const ClientSidebar = () => {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotification();
  const { profile } = useClient();
  const { user, logout } = useAuth();
  const { fullName, companyName, avatar } = profile.personalInfo;

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="cl-mobile-header">
        <button 
          className={`cl-hamburger${open ? ' cl-hamburger--open' : ''}`} 
          onClick={() => setOpen(!open)} 
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span /><span /><span />
        </button>
        <span className="cl-mobile-logo">SkillKart</span>
      </div>

      {open && <div className="cl-overlay" onClick={() => setOpen(false)} />}

      <aside className={`cl-sidebar${open ? ' cl-sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="cl-sidebar__brand">
          <span className="cl-sidebar__logo">SkillKart</span>
          <button className="cl-sidebar__close" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
        </div>

        {/* Avatar */}
        <div className="cl-sidebar__avatar-wrap">
          <div className="cl-sidebar__avatar-container" style={{ position: 'relative', display: 'flex' }}>
            <div className="cl-sidebar__avatar">
              <UserAvatar 
                src={avatar}
                fullName={fullName}
              />
            </div>
            <span className="cl-sidebar__online-dot" />
          </div>
          <div className="cl-sidebar__user-info" style={{ minWidth: 0 }}>
            <p className="cl-sidebar__name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</p>
            <p className="cl-sidebar__role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="cl-sidebar__badge-wrap">
          <span className="cl-sidebar__badge"><Building size={14} style={{ marginRight: '4px' }} /> Client Account</span>
        </div>

        {/* Navigation */}
        <nav className="cl-sidebar__nav">
          {NAV_ITEMS.filter((item) => !item.mobileHidden || !isMobileApp()).map((item) => {
            if (item.to === '__public_profile__' && !user?._id) return null;
            const to = item.to === '__public_profile__' ? `/clients/${user._id}` : item.to;
            return (
              <NavLink
                key={item.to}
                to={to}
                end={item.to === '/client/projects' || item.to === '/client/dashboard' || item.to === '/client/profile'}
                className={({ isActive }) =>
                  `cl-sidebar__link${isActive ? ' cl-sidebar__link--active' : ''}`
                }
                onClick={() => setOpen(false)}
              >
                <span className="cl-sidebar__icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.to === '/client/notifications' && unreadCount > 0 && (
                  <span className="cl-sidebar__notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="cl-sidebar__footer">
          <button
            className="cl-sidebar__logout"
            onClick={() => { setOpen(false); logout(); }}
          >
            <span className="cl-sidebar__icon"><LogOut size={20} /></span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default ClientSidebar;
