import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../../../api/notifications';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import './NotificationBell.css';

const ICONS = {
  proposal_received: '📨', proposal_accepted: '🎉', proposal_rejected: '📋',
  gig_ordered: '🛍️', deposit_funded: '💰', work_delivered: '📦',
  custom_offer_received: '📦', custom_offer_accepted: '🤝', custom_offer_declined: '✖️',
  revision_requested: '🔁', payment_released: '💸', project_completed: '✅',
  new_message: '💬',
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); return dd === 1 ? 'yesterday' : `${dd}d ago`;
};

/**
 * Floating notification bell (top-right) shown across the logged-in dashboards.
 * Polls the unread count, opens a dropdown of recent notifications, and links to
 * the full notifications page. Self-contained so it works in both the client and
 * freelancer layouts without restructuring either.
 */
export default function NotificationBell() {
  const { isAuthenticated, user } = useAuth();
  const { unreadCount: unread, markReadLocal, markAllReadLocal, fetchUnreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Only show inside the authenticated client/freelancer areas.
  const inDashboard = location.pathname.startsWith('/client') || location.pathname.startsWith('/freelancer');
  const notifPath = user?.role === 'freelancer' ? '/freelancer/notifications' : '/client/notifications';
  // Redundant (and, on mobile, visually overlapping) on the full notifications
  // page itself — you're already looking at the list this button opens.
  const onNotificationsPage = location.pathname === notifPath;
  // On phones the bell relocates to bottom-left (below) to clear the top
  // hamburger — which then sits directly on top of the Buddy chat page's
  // input row. Hide it there rather than fight the overlap with padding.
  const buddyPath = user?.role === 'freelancer' ? '/freelancer/buddy' : '/client/buddy';
  const onBuddyPage = location.pathname === buddyPath;

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const loadList = async () => {
    setLoading(true);
    try {
      const { data } = await notificationsAPI.list({ limit: 8 });
      setItems(data?.data?.items || []);
      // Sync global state since we just got fresh unread count in this payload
      if (data?.data?.unreadCount !== undefined && data.data.unreadCount !== unread) {
         fetchUnreadCount(); 
      }
    } catch { /* handled globally */ } finally { setLoading(false); }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const openItem = async (n) => {
    if (!n.read) {
      try { await notificationsAPI.markRead(n._id); } catch { /* ignore */ }
      markReadLocal(1);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try { await notificationsAPI.markAllRead(); } catch { /* ignore */ }
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    markAllReadLocal();
  };

  if (!isAuthenticated || !inDashboard || onNotificationsPage || onBuddyPage) return null;

  return (
    <div className="notif-bell" ref={ref}>
      <button className="notif-bell__btn" onClick={toggle} aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel">
          <div className="notif-bell__head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="notif-bell__markall" onClick={markAll}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-bell__list">
            {loading ? (
              <div className="notif-bell__empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="notif-bell__empty">You're all caught up 🎉</div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  className={`notif-bell__item${n.read ? '' : ' notif-bell__item--unread'}`}
                  onClick={() => openItem(n)}
                >
                  <span className="notif-bell__icon">{ICONS[n.type] || '🔔'}</span>
                  <span className="notif-bell__body">
                    <span className="notif-bell__title">{n.title}</span>
                    <span className="notif-bell__msg">{n.message}</span>
                    <span className="notif-bell__time">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="notif-bell__dot" />}
                </button>
              ))
            )}
          </div>

          <button className="notif-bell__viewall" onClick={() => { setOpen(false); navigate(notifPath); }}>
            <Check size={14} /> View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
