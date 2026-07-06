import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useFreelancer } from '../../../context/FreelancerContext';
import { useAuth } from '../../../hooks/useAuth';
import UserAvatar from '../../../Components/common/UserAvatar/UserAvatar';
import { useNotification } from '../../../context/NotificationContext';
import {
  Zap,
  Search,
  User,
  Eye,
  Package,
  PlusSquare,
  Briefcase,
  CreditCard,
  Layers,
  ClipboardList,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Lock,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import './FreelancerSidebar.css';

const NAV_ITEMS = [
  { to: '/freelancer/dashboard', icon: <Zap size={20} />, label: 'Dashboard' },
  { to: '/browse-projects', icon: <Search size={20} />, label: 'Find Work' },
  { to: '/freelancer/profile', icon: <User size={20} />, label: 'My Profile' },
  { to: '__public_profile__', icon: <Eye size={20} />, label: 'View Public Profile' },
  { to: '/freelancer/gigs', icon: <Package size={20} />, label: 'My Gigs' },
  { to: '/freelancer/gigs/create', icon: <PlusSquare size={20} />, label: 'Create New Gig' },
  { to: '/freelancer/work', icon: <Briefcase size={20} />, label: 'My Work' },
  { to: '/freelancer/wallet', icon: <CreditCard size={20} />, label: 'Wallet & Earnings' },
  { to: '/freelancer/portfolio', icon: <Layers size={20} />, label: 'Portfolio' },
  { to: '/freelancer/proposals', icon: <ClipboardList size={20} />, label: 'My Proposals' },
  { to: '/freelancer/saved', icon: <FileText size={20} />, label: 'Saved Projects' },
  { to: '/freelancer/messages', icon: <MessageSquare size={20} />, label: 'Messages' },
  { to: '/freelancer/notifications', icon: <Bell size={20} />, label: 'Notifications' },
  { to: '/freelancer/settings', icon: <Settings size={20} />, label: 'Settings' },
  { to: '/freelancer/security', icon: <Lock size={20} />, label: 'Security' },
];

const FreelancerSidebar = () => {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotification();
  const { profile } = useFreelancer();
  const { logout, user } = useAuth();
  const { fullName, title, avatar } = profile.personalInfo;
  const userId = user?._id || user?.id;

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="fl-mobile-header">
        <button 
          className={`fl-hamburger${open ? ' fl-hamburger--open' : ''}`} 
          onClick={() => setOpen(!open)} 
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span /><span /><span />
        </button>
        <span className="fl-mobile-logo">SkillKart</span>
      </div>

      {/* Overlay */}
      {open && <div className="fl-overlay" onClick={() => setOpen(false)} />}

      <aside className={`fl-sidebar${open ? ' fl-sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="fl-sidebar__brand">
          <span className="fl-sidebar__logo">SkillKart</span>
          <button className="fl-sidebar__close" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
        </div>

        {/* Avatar */}
        <div className="fl-sidebar__avatar-wrap">
          <div className="fl-sidebar__avatar-container" style={{ position: 'relative', display: 'flex' }}>
            <div className="fl-sidebar__avatar">
              <UserAvatar 
                src={avatar}
                fullName={fullName}
              />
            </div>
            <span className="fl-sidebar__online-dot" />
          </div>
          <div className="fl-sidebar__user-info">
            <p className="fl-sidebar__name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</span>
              {profile.verificationStatus === 'verified' && (
                <span className="fl-verified-badge" style={{ flexShrink: 0 }} title="Verified Expert">
                  <CheckCircle2 size={14} color="var(--fl-accent-primary)" style={{ marginLeft: 4 }} />
                </span>
              )}
            </p>
            <p className="fl-sidebar__title">{title}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="fl-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const to = item.to === '__public_profile__' ? `/freelancers/${userId}` : item.to;
            return (
              <NavLink
                key={item.to}
                to={to}
                className={({ isActive }) =>
                  `fl-sidebar__link${isActive ? ' fl-sidebar__link--active' : ''}`
                }
                onClick={() => setOpen(false)}
              >
                <span className="fl-sidebar__icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.to === '/freelancer/notifications' && unreadCount > 0 && (
                  <span className="fl-sidebar__notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="fl-sidebar__footer">
          <button
            className="fl-sidebar__logout"
            onClick={() => { setOpen(false); logout(); }}
          >
            <span className="fl-sidebar__icon"><LogOut size={20} /></span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default FreelancerSidebar;
