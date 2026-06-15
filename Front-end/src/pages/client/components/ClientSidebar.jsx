import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useClient } from '../../../context/ClientContext';
import { useAuth } from '../../../hooks/useAuth';
import UserAvatar from '../../../Components/common/UserAvatar/UserAvatar';
import './ClientSidebar.css';

const NAV_ITEMS = [
  { to: '/client/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/browse-freelancers', icon: '🔍', label: 'Find Freelancers' },
  { to: '/client/profile', icon: '👤', label: 'My Profile' },
  { to: '/client/projects', icon: '📁', label: 'My Projects' },
  { to: '/client/projects/create', icon: '✚', label: 'Post New Project' },
  { to: '/client/saved', icon: '🔖', label: 'Saved Freelancers' },
  { to: '/client/messages', icon: '💬', label: 'Messages' },
  { to: '/client/settings', icon: '⚙️', label: 'Settings' },
  { to: '/client/security', icon: '🔒', label: 'Security' },
];

const ClientSidebar = () => {
  const [open, setOpen] = useState(false);
  const { profile } = useClient();
  const { logout } = useAuth();
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
          <button className="cl-sidebar__close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        {/* Avatar */}
        <div className="cl-sidebar__avatar-wrap">
          <div className="cl-sidebar__avatar">
            <UserAvatar 
              src={avatar}
              fullName={fullName}
            />
            <span className="cl-sidebar__online-dot" />
          </div>
          <div className="cl-sidebar__user-info">
            <p className="cl-sidebar__name">{fullName}</p>
            <p className="cl-sidebar__role">{companyName}</p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="cl-sidebar__badge-wrap">
          <span className="cl-sidebar__badge">🏢 Client Account</span>
        </div>

        {/* Navigation */}
        <nav className="cl-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `cl-sidebar__link${isActive ? ' cl-sidebar__link--active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              <span className="cl-sidebar__icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="cl-sidebar__footer">
          <button
            className="cl-sidebar__logout"
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

export default ClientSidebar;
