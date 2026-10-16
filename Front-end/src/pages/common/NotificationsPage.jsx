import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, Inbox, Search, Check,
  Clock, ArrowRight, ExternalLink, FileText, DollarSign,
  MessageSquare, ShieldAlert, Sparkles, Filter, ChevronDown, MoreVertical
} from 'lucide-react';
import { safeToast as toast } from '../../utils/safeToast';
import { notificationsAPI } from '../../api/notifications';
import { useNotification } from '../../context/NotificationContext';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import Loader from '../../Components/common/Loader/Loader';
import Reveal from '../freelancer/components/Reveal';
import './NotificationsPage.css';

const TYPE_CONFIG = {
  proposal_received: { category: 'proposals', icon: FileText, color: '#2563EB', bg: '#EFF6FF', label: 'Proposal' },
  proposal_accepted: { category: 'proposals', icon: FileText, color: '#10B981', bg: '#ECFDF5', label: 'Proposal' },
  proposal_rejected: { category: 'proposals', icon: FileText, color: '#64748B', bg: '#F1F5F9', label: 'Proposal' },
  gig_ordered: { category: 'payments', icon: DollarSign, color: '#10B981', bg: '#ECFDF5', label: 'Order' },
  deposit_funded: { category: 'payments', icon: DollarSign, color: '#10B981', bg: '#ECFDF5', label: 'Deposit' },
  work_delivered: { category: 'proposals', icon: Sparkles, color: '#2563EB', bg: '#EFF6FF', label: 'Delivery' },
  custom_offer_received: { category: 'proposals', icon: FileText, color: '#2563EB', bg: '#EFF6FF', label: 'Offer' },
  custom_offer_accepted: { category: 'proposals', icon: FileText, color: '#10B981', bg: '#ECFDF5', label: 'Offer' },
  custom_offer_declined: { category: 'proposals', icon: FileText, color: '#64748B', bg: '#F1F5F9', label: 'Offer' },
  revision_requested: { category: 'proposals', icon: Clock, color: '#D97706', bg: '#FEF3C7', label: 'Revision' },
  payment_released: { category: 'payments', icon: DollarSign, color: '#10B981', bg: '#ECFDF5', label: 'Payment' },
  project_completed: { category: 'payments', icon: Sparkles, color: '#10B981', bg: '#ECFDF5', label: 'Completed' },
  new_message: { category: 'messages', icon: MessageSquare, color: '#0D9488', bg: '#F0FDFA', label: 'Message' },
};

const getCategory = (type) => TYPE_CONFIG[type]?.category || 'system';

const fmtTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const getGroup = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (itemDate.getTime() >= today.getTime()) return 'Today';
  if (itemDate.getTime() >= yesterday.getTime()) return 'Yesterday';
  return 'Earlier';
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // all | unread | proposals | payments | messages | system
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pageLimit, setPageLimit] = useState(25);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const { markReadLocal, markAllReadLocal } = useNotification();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsAPI.list({
        limit: 100,
        unread: activeTab === 'unread' ? 'true' : undefined
      });
      setItems(data?.data?.items || []);
      setUnread(data?.data?.unreadCount || 0);
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const openNotification = async (n) => {
    if (!n.read) {
      try {
        await notificationsAPI.markRead(n._id);
      } catch {
        // ignore error
      }
      setItems((arr) => arr.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      markReadLocal(1);
    }
    if (n.link) navigate(n.link);
  };

  const markSingleRead = async (e, n) => {
    e.stopPropagation();
    try {
      await notificationsAPI.markRead(n._id);
      setItems((arr) => arr.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      markReadLocal(1);
      toast.success('Marked as read');
    } catch {
      toast.error('Could not mark as read');
    }
  };

  const markAll = async () => {
    if (unread === 0) return;
    try {
      await notificationsAPI.markAllRead();
      setItems((arr) => arr.map((x) => ({ ...x, read: true })));
      setUnread(0);
      markAllReadLocal();
      toast.success('All notifications marked as read');
      if (activeTab === 'unread') load();
    } catch {
      toast.error('Could not mark all as read');
    }
  };

  const removeNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsAPI.remove(id);
      setItems((arr) => arr.filter((x) => x._id !== id));
      toast.success('Notification removed');
    } catch {
      toast.error('Could not remove notification');
    }
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      await notificationsAPI.clearAll();
      setItems([]);
      setUnread(0);
      markAllReadLocal();
      toast.success('All notifications cleared');
    } catch {
      toast.error('Failed to clear notifications');
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  // Dynamically determine which category tabs exist in the loaded data
  const availableTabs = useMemo(() => {
    const categoriesPresent = new Set();
    items.forEach((item) => {
      categoriesPresent.add(getCategory(item.type));
    });

    const tabs = [
      { id: 'all', label: 'All', count: items.length },
      { id: 'unread', label: 'Unread', count: unread },
    ];

    if (categoriesPresent.has('proposals')) {
      const c = items.filter((i) => getCategory(i.type) === 'proposals').length;
      tabs.push({ id: 'proposals', label: 'Proposals', count: c });
    }
    if (categoriesPresent.has('payments')) {
      const c = items.filter((i) => getCategory(i.type) === 'payments').length;
      tabs.push({ id: 'payments', label: 'Payments', count: c });
    }
    if (categoriesPresent.has('messages')) {
      const c = items.filter((i) => getCategory(i.type) === 'messages').length;
      tabs.push({ id: 'messages', label: 'Messages', count: c });
    }
    if (categoriesPresent.has('system')) {
      const c = items.filter((i) => getCategory(i.type) === 'system').length;
      tabs.push({ id: 'system', label: 'System', count: c });
    }

    return tabs;
  }, [items, unread]);

  // Filtered items based on activeTab and searchQuery
  const filteredItems = useMemo(() => {
    let result = items;

    if (activeTab === 'unread') {
      result = result.filter((i) => !i.read);
    } else if (activeTab !== 'all') {
      result = result.filter((i) => getCategory(i.type) === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.message || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, activeTab, searchQuery]);

  // Group items by "Today", "Yesterday", "Earlier"
  const groupedItems = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    const paged = filteredItems.slice(0, pageLimit);

    paged.forEach((item) => {
      const g = getGroup(item.createdAt);
      if (groups[g]) groups[g].push(item);
      else groups.Earlier.push(item);
    });

    return Object.entries(groups).filter(([, list]) => list.length > 0);
  }, [filteredItems, pageLimit]);

  return (
    <div className="notif-page-root">
      <div className="notif-container">

        {/* ─── SHARED PAGE HEADER ─── */}
        <header className="notif-shared-header">
          <div className="notif-header-left">
            <nav className="notif-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/freelancer/dashboard" className="notif-bc-link">Dashboard</Link>
              <span className="notif-bc-sep">/</span>
              <span className="notif-bc-curr">Notifications</span>
            </nav>
            <h1 className="notif-page-title">Notifications</h1>
            <p className="notif-page-subtitle">
              {unread > 0 ? `${unread} unread update${unread === 1 ? '' : 's'} waiting for you` : 'All caught up! No unread notifications'}
            </p>
          </div>

          <div className="notif-header-actions">
            <button
              type="button"
              className="notif-btn-outline"
              onClick={markAll}
              disabled={unread === 0}
              title="Mark all notifications as read"
            >
              <CheckCheck size={15} />
              <span>Mark all as read</span>
            </button>

            {items.length > 0 && (
              <button
                type="button"
                className="notif-btn-ghost-danger"
                onClick={() => setConfirmClear(true)}
                title="Clear all notifications"
              >
                <Trash2 size={15} />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </header>

        {/* ─── SINGLE TOOLBAR ROW (Glass, radius 20px) ─── */}
        <div className="notif-toolbar-card">
          <nav className="notif-tabs-slider" aria-label="Notification filters">
            {availableTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`notif-tab-pill ${activeTab === t.id ? 'notif-tab-pill--active' : ''}`}
                onClick={() => { setActiveTab(t.id); setPageLimit(25); }}
              >
                <span>{t.label}</span>
                <span className="notif-tab-count">{t.count}</span>
              </button>
            ))}
          </nav>

          <div className="notif-search-wrap">
            <Search size={14} className="notif-search-icon" />
            <input
              type="text"
              className="notif-search-input"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search notifications"
            />
          </div>
        </div>

        {/* ─── GROUPED NOTIFICATIONS LIST ─── */}
        {loading ? (
          <div className="notif-loading-box">
            <Loader size="lg" text="Loading notifications..." />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="notif-empty-state-card">
            <div className="notif-empty-icon-box">
              <Inbox size={28} />
            </div>
            <h3 className="notif-empty-title">
              {activeTab === 'unread' ? "You've read everything" : 'No notifications found'}
            </h3>
            <p className="notif-empty-desc">
              {activeTab === 'unread'
                ? 'Check back later for project updates, proposals, and milestone releases.'
                : searchQuery
                ? 'No notifications match your current search query.'
                : 'Updates about your projects, milestone payments, and client messages will appear here.'}
            </p>
          </div>
        ) : (
          <div className="notif-groups-stack">
            {groupedItems.map(([groupName, groupList], gIdx) => (
              <section key={groupName} className="notif-group-section">
                <div className="notif-group-label-sticky">
                  <span>{groupName}</span>
                </div>

                <div className="notif-group-card">
                  {groupList.map((n, idx) => {
                    const cfg = TYPE_CONFIG[n.type] || {
                      icon: Bell,
                      color: '#64748B',
                      bg: '#F1F5F9',
                      label: 'System'
                    };
                    const IconComp = cfg.icon;
                    const isUnread = !n.read;
                    const shouldAnimate = gIdx === 0 && idx < 12;

                    return (
                      <Reveal key={n._id} delay={shouldAnimate ? idx * 40 : 0}>
                        <div
                          className={`notif-item-row ${isUnread ? 'notif-item-row--unread' : ''}`}
                          onClick={() => openNotification(n)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openNotification(n);
                            }
                          }}
                          aria-label={`${n.title}. ${isUnread ? 'Unread' : 'Read'}`}
                        >
                          {/* Left Type Icon in Colored Soft Circle */}
                          <div
                            className="notif-icon-circle"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                            title={cfg.label}
                          >
                            <IconComp size={16} strokeWidth={2.2} />
                          </div>

                          {/* Middle Content */}
                          <div className="notif-content-col">
                            <div className="notif-title-row">
                              <span className={`notif-item-title ${isUnread ? 'notif-item-title--unread' : ''}`}>
                                {n.title}
                              </span>
                              {n.link && <ExternalLink size={12} className="notif-link-hint-icon" />}
                            </div>
                            <p className="notif-item-message">{n.message}</p>
                          </div>

                          {/* Right Metadata & Floating Actions */}
                          <div className="notif-meta-col">
                            <div className="notif-time-status-row">
                              <span className="notif-time-text">{fmtTime(n.createdAt)}</span>
                              {isUnread && <span className="notif-unread-dot" title="Unread" />}
                            </div>

                            {/* Row Action Buttons (revealed on hover) */}
                            <div className="notif-row-actions">
                              {isUnread && (
                                <button
                                  type="button"
                                  className="notif-action-btn"
                                  onClick={(e) => markSingleRead(e, n)}
                                  title="Mark as read"
                                  aria-label="Mark as read"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="notif-action-btn notif-action-btn--delete"
                                onClick={(e) => removeNotification(e, n._id)}
                                title="Delete notification"
                                aria-label="Delete notification"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Pagination / Load More */}
            {filteredItems.length > pageLimit && (
              <div className="notif-load-more-row">
                <button
                  type="button"
                  className="notif-load-more-btn"
                  onClick={() => setPageLimit((prev) => prev + 25)}
                >
                  <span>Load more notifications ({filteredItems.length - pageLimit} remaining)</span>
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmClear}
        title="Clear all notifications?"
        message="This will permanently remove all notifications from your account history. This action cannot be undone."
        confirmLabel="Clear all"
        loading={clearing}
        onConfirm={clearAll}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
