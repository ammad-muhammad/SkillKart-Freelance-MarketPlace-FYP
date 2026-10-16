import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFreelancer } from '../../../context/FreelancerContext';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import UserAvatar from '../../../Components/common/UserAvatar/UserAvatar';
import {
  Search, Bell, Bot, User, Settings, LogOut, ChevronRight, X
} from 'lucide-react';

// Breadcrumb map
const BREADCRUMB_MAP = {
  '/freelancer/dashboard':   ['Dashboard'],
  '/browse-projects':        ['Find Work'],
  '/freelancer/buddy':       ['Buddy AI'],
  '/freelancer/profile':     ['My Profile'],
  '/freelancer/portfolio':   ['Portfolio'],
  '/freelancer/gigs':        ['My Gigs'],
  '/freelancer/gigs/create': ['My Gigs', 'Create New Gig'],
  '/freelancer/work':        ['My Work'],
  '/freelancer/proposals':   ['My Proposals'],
  '/freelancer/saved':       ['Saved Projects'],
  '/freelancer/wallet':      ['Wallet & Earnings'],
  '/freelancer/messages':    ['Messages'],
  '/freelancer/notifications':['Notifications'],
  '/freelancer/settings':    ['Settings'],
  '/freelancer/security':    ['Security'],
};

const FreelancerTopbar = ({ collapsed }) => {
  const location = useLocation();
  const { profile } = useFreelancer();
  const { logout, user } = useAuth();
  const { unreadCount } = useNotification();

  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const notifRef = useRef(null);
  const avatarRef = useRef(null);

  const { fullName, avatar } = profile?.personalInfo || {};
  const userId = user?._id || user?.id;
  const initials = (fullName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Breadcrumb
  const crumbs = BREADCRUMB_MAP[location.pathname] ||
    location.pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <header className={`fl2-topbar${collapsed ? ' fl2-topbar--col' : ''}`}>
      {/* Breadcrumb */}
      <nav className="fl2-breadcrumb" aria-label="Breadcrumb">
        <Link to="/freelancer/dashboard">Dashboard</Link>
        {crumbs.length > 1 && (
          <>
            <ChevronRight size={13} className="fl2-breadcrumb__sep" />
            <span className="fl2-breadcrumb__cur">{crumbs[crumbs.length - 1]}</span>
          </>
        )}
        {crumbs.length === 1 && (
          <span className="fl2-breadcrumb__cur">{crumbs[0]}</span>
        )}
      </nav>

      {/* Search */}
      <div className="fl2-topbar__search">
        <Search size={15} className="fl2-topbar__search-icon" />
        <input
          className="fl2-topbar__search-input"
          placeholder="Search gigs, projects, proposals…"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          aria-label="Global search"
        />
        <span className="fl2-topbar__search-kbd">⌘K</span>
      </div>

      {/* Right actions */}
      <div className="fl2-topbar__right">
        {/* Buddy AI quick btn */}
        <Link
          to="/freelancer/buddy"
          className="fl2-topbar__btn"
          style={{ width: 'auto', padding: '0 12px', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fl-accent)' }}
          title="Ask Buddy AI"
        >
          <Bot size={16} strokeWidth={1.75} />
          <span>Buddy AI</span>
        </Link>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="fl2-topbar__btn"
            onClick={() => { setNotifOpen(o => !o); setAvatarOpen(false); }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={notifOpen}
          >
            <Bell size={17} strokeWidth={1.75} />
            {unreadCount > 0 && <span className="fl2-topbar__dot" aria-hidden="true" />}
          </button>

          {notifOpen && (
            <div className="fl2-topbar__dropdown" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320, background: 'var(--fl-bg-surface)',
              border: '1px solid var(--fl-border)', borderRadius: 'var(--fl-r-lg)',
              boxShadow: 'var(--fl-shadow-drop)', zIndex: 2000, overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--fl-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fl-font-h)', fontWeight: 700, fontSize: 14, color: 'var(--fl-text-strong)' }}>Notifications</span>
                <Link
                  to="/freelancer/notifications"
                  style={{ fontSize: 12, color: 'var(--fl-accent)', textDecoration: 'none', fontWeight: 600 }}
                  onClick={() => setNotifOpen(false)}
                >
                  View all
                </Link>
              </div>
              <div style={{ padding: '8px 0' }}>
                {unreadCount === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--fl-text-muted)', fontSize: 13 }}>
                    You're all caught up!
                  </div>
                ) : (
                  <Link
                    to="/freelancer/notifications"
                    style={{ display: 'block', padding: '10px 16px', textDecoration: 'none', fontSize: 13, color: 'var(--fl-text-body)' }}
                    onClick={() => setNotifOpen(false)}
                  >
                    You have <strong style={{ color: 'var(--fl-primary)' }}>{unreadCount}</strong> unread notification{unreadCount !== 1 ? 's' : ''}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar dropdown */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          <button
            className="fl2-topbar__av"
            onClick={() => { setAvatarOpen(o => !o); setNotifOpen(false); }}
            aria-label="Account menu"
            aria-expanded={avatarOpen}
          >
            {avatar
              ? <img src={avatar} alt={fullName} />
              : <span>{initials}</span>
            }
          </button>

          {avatarOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 200, background: 'var(--fl-bg-surface)',
              border: '1px solid var(--fl-border)', borderRadius: 'var(--fl-r-lg)',
              boxShadow: 'var(--fl-shadow-drop)', zIndex: 2000, overflow: 'hidden', padding: '8px 0'
            }}>
              {[
                { to: '/freelancer/profile', icon: User, label: 'My Profile' },
                { to: '/freelancer/settings', icon: Settings, label: 'Settings' },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setAvatarOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 16px', textDecoration: 'none',
                    fontSize: 13.5, color: 'var(--fl-text-body)', fontWeight: 500,
                    transition: 'background .1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--fl-bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {label}
                </Link>
              ))}
              <div style={{ height: 1, background: 'var(--fl-border)', margin: '4px 0' }} />
              <button
                onClick={() => { setAvatarOpen(false); logout(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', width: '100%', border: 'none',
                  background: 'transparent', fontSize: 13.5, color: 'var(--fl-danger)',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fl-font-b)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--fl-danger-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={15} strokeWidth={1.75} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default FreelancerTopbar;
