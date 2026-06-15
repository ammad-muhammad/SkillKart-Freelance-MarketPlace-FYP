import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useFreelancer } from '../../../context/FreelancerContext';
import { useAuth } from '../../../hooks/useAuth';
import UserAvatar from '../../../Components/common/UserAvatar/UserAvatar';
import './FreelancerSidebar.css';

const NAV_ITEMS = [
  { to: '/freelancer/dashboard', icon: '⚡', label: 'Dashboard' },
  { to: '/browse-projects', icon: '🔍', label: 'Find Work' },
  { to: '/freelancer/profile', icon: '👤', label: 'My Profile' },
  { to: '/freelancer/gigs', icon: '📦', label: 'My Gigs' },
  { to: '/freelancer/gigs/create', icon: '✚', label: 'Create New Gig' },
  { to: '/freelancer/portfolio', icon: '🗂️', label: 'Portfolio' },
  { to: '/freelancer/proposals', icon: '📋', label: 'My Proposals' },
  { to: '/freelancer/saved', icon: '📑', label: 'Saved Projects' },
  { to: '/freelancer/messages', icon: '💬', label: 'Messages' },
  { to: '/freelancer/settings', icon: '⚙️', label: 'Settings' },
  { to: '/freelancer/security', icon: '🔒', label: 'Security' },
];

const FreelancerSidebar = () => {
  const [open, setOpen] = useState(false);
  const { profile } = useFreelancer();
  const { logout } = useAuth();
  const { fullName, title, avatar } = profile.personalInfo;

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
          <div className="fl-sidebar__avatar">
            <UserAvatar 
              src={avatar}
              fullName={fullName}
            />
            <span className="fl-sidebar__online-dot" />
          </div>
          <div className="fl-sidebar__user-info">
            <p className="fl-sidebar__name">
              {fullName}
              {profile.verificationStatus === 'verified' && (
                <span className="fl-verified-badge" title="Verified Expert">✓</span>
              )}
            </p>
            <p className="fl-sidebar__title">{title}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="fl-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `fl-sidebar__link${isActive ? ' fl-sidebar__link--active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              <span className="fl-sidebar__icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="fl-sidebar__footer">
          <button
            className="fl-sidebar__logout"
            onClick={() => { setOpen(false); logout(); }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default FreelancerSidebar;
