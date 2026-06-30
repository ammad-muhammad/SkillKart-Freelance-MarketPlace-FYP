import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Inbox } from 'lucide-react';
import { toast } from 'react-toastify';
import { notificationsAPI } from '../../api/notifications';
import { useNotification } from '../../context/NotificationContext';
import './NotificationsPage.css';

const ICONS = {
  proposal_received: '📨', proposal_accepted: '🎉', proposal_rejected: '📋',
  gig_ordered: '🛍️', deposit_funded: '💰', work_delivered: '📦',
  revision_requested: '🔁', payment_released: '💸', project_completed: '✅',
  new_message: '💬',
};

const fmt = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Full notifications screen — shared by client and freelancer dashboards.
 * Lists all notifications, lets the user filter to unread, mark read, mark all
 * read, delete, and click through to the relevant page.
 */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState('all'); // all | unread
  const [loading, setLoading] = useState(true);
  const { markReadLocal, markAllReadLocal } = useNotification();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsAPI.list({ limit: 50, unread: filter === 'unread' ? 'true' : undefined });
      setItems(data?.data?.items || []);
      setUnread(data?.data?.unreadCount || 0);
    } catch { /* handled by the global error toast */ } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const open = async (n) => {
    if (!n.read) {
      try { await notificationsAPI.markRead(n._id); } catch { /* ignore */ }
      setItems((arr) => arr.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      markReadLocal(1);
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try { await notificationsAPI.markAllRead(); } catch { /* ignore */ }
    setItems((arr) => arr.map((x) => ({ ...x, read: true })));
    setUnread(0);
    markAllReadLocal();
    if (filter === 'unread') load();
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    try { await notificationsAPI.remove(id); } catch { /* ignore */ }
    setItems((arr) => arr.filter((x) => x._id !== id));
  };

  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await notificationsAPI.clearAll();
      setItems([]);
      setUnread(0);
      markAllReadLocal();
      toast.success('All notifications cleared.');
    } catch {
      toast.error('Failed to clear notifications.');
    }
  };

  return (
    <div className="np-page">
      <div className="np-header">
        <div>
          <h1 className="np-title"><Bell size={22} /> Notifications</h1>
          <p className="np-sub">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {unread > 0 && (
            <button className="np-markall" onClick={markAll}>
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button 
              className="np-markall" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} 
              onClick={clearAll}
            >
              <Trash2 size={16} /> Clear all
            </button>
          )}
        </div>
      </div>

      <div className="np-filters">
        {['all', 'unread'].map((f) => (
          <button key={f} className={`np-filter${filter === f ? ' np-filter--active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="np-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="np-empty">
          <Inbox size={48} />
          <h3>No notifications</h3>
          <p>{filter === 'unread' ? "You've read everything." : "You'll see updates about your projects, payments and messages here."}</p>
        </div>
      ) : (
        <div className="np-list">
          {items.map((n) => (
            <button key={n._id} className={`np-item${n.read ? '' : ' np-item--unread'}`} onClick={() => open(n)}>
              <span className="np-icon">{ICONS[n.type] || '🔔'}</span>
              <span className="np-body">
                <span className="np-item-title">{n.title}</span>
                <span className="np-item-msg">{n.message}</span>
                <span className="np-item-time">{fmt(n.createdAt)}</span>
              </span>
              {!n.read && <span className="np-dot" />}
              <span className="np-del" onClick={(e) => remove(e, n._id)} title="Delete">
                <Trash2 size={15} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
