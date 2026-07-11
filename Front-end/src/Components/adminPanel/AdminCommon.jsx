/**
 * Shared admin panel utility components.
 * Import individually:
 *   import { AdminBadge, AdminLoader, AdminEmptyState, StatusBadge, AdminPagination } from './AdminCommon';
 */
import { useEffect, useState } from 'react';

// ─── AdminBadge ────────────────────────────────────────────────
export const AdminBadge = ({ children, variant = 'blue' }) => (
  <span className={`ap-badge ap-badge-${variant}`}>{children}</span>
);

// ─── StatusBadge — maps status strings to colour variants ────
const STATUS_MAP = {
  active:        'green',  open:         'green',  completed:    'green',
  released:      'green',  resolved:     'green',  verified:     'green',
  sent:          'green',  visible:      'green',  unfrozen:     'green',
  pending:       'yellow', investigating:'yellow', deposit_paid: 'yellow',
  in_revision:   'yellow', paused:       'yellow', queued:       'yellow',
  suspended:     'red',    blocked:      'red',    cancelled:    'red',
  refunded:      'red',    failed:       'red',    dismissed:    'red',
  hidden:        'red',    deleted:      'red',    frozen:       'red',
  critical:      'red',    warning:      'orange',
  deposit_pending:'gray',  under_review: 'gray',   pending_cancellation:'gray',
  info:          'blue',   processing:   'blue',   draft:        'gray',
  closed:        'gray',   rejected:     'gray'
};

export const StatusBadge = ({ status }) => {
  if (!status) return null;
  const variant = STATUS_MAP[status?.toLowerCase()] || 'gray';
  return (
    <span className={`ap-badge ap-badge-${variant}`}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// ─── AdminLoader ───────────────────────────────────────────────
export const AdminLoader = ({ message = 'Loading…' }) => (
  <div className="ap-loader-center">
    <div className="ap-spinner" />
    <span>{message}</span>
  </div>
);

// ─── AdminEmptyState ───────────────────────────────────────────
export const AdminEmptyState = ({ icon = '📭', title = 'Nothing here', desc, action }) => (
  <div className="ap-empty">
    <div className="ap-empty-icon">{icon}</div>
    <div className="ap-empty-title">{title}</div>
    {desc && <p className="ap-empty-desc">{desc}</p>}
    {action}
  </div>
);

// ─── AdminPagination ───────────────────────────────────────────
export const AdminPagination = ({ page, pages, total, limit, onPage }) => {
  if (pages <= 1) return null;

  const getPages = () => {
    const arr = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) arr.push(i);
      if (page < pages - 2) arr.push('…');
      arr.push(pages);
    }
    return arr;
  };

  return (
    <div className="ap-pagination">
      <span className="ap-pagination-info">
        {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} results
      </span>
      <div className="ap-pagination-controls">
        <button className="ap-page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
        {getPages().map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--ap-text-muted)', lineHeight: '32px' }}>…</span>
            : <button key={p} className={`ap-page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
        )}
        <button className="ap-page-btn" disabled={page === pages} onClick={() => onPage(page + 1)}>›</button>
      </div>
    </div>
  );
};

// ─── ConfirmDialog ─────────────────────────────────────────────
export const ConfirmDialog = ({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm',
  confirmClass = 'ap-btn-danger', loading = false, children
}) => {
  if (!open) return null;
  return (
    <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal" style={{ maxWidth: 420 }}>
        <div className="ap-modal-header">
          <h3 className="ap-modal-title">{title}</h3>
          <button className="ap-modal-close" onClick={onClose}>✕</button>
        </div>
        {message && <p style={{ color: 'var(--ap-text-secondary)', fontSize: '0.9rem', margin: '0 0 8px' }}>{message}</p>}
        {children}
        <div className="ap-modal-footer">
          <button className="ap-btn ap-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`ap-btn ${confirmClass}`} onClick={onConfirm} disabled={loading}>
            {loading ? <><span className="ap-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Working…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AdminModal ────────────────────────────────────────────────
export const AdminModal = ({ open, onClose, title, children, size = '', footer }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`ap-modal${size ? ` ap-modal-${size}` : ''}`}>
        <div className="ap-modal-header">
          <h3 className="ap-modal-title">{title}</h3>
          <button className="ap-modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="ap-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ─── ExportButtons ─────────────────────────────────────────────
export const ExportButtons = ({ onExport, loading = false }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {['csv', 'excel', 'pdf'].map(fmt => (
      <button
        key={fmt}
        className="ap-btn ap-btn-secondary ap-btn-sm"
        onClick={() => onExport(fmt)}
        disabled={loading}
        title={`Export as ${fmt.toUpperCase()}`}
      >
        {fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📑'} {fmt.toUpperCase()}
      </button>
    ))}
  </div>
);

// ─── AdminFilterBar ────────────────────────────────────────────
export const AdminFilterBar = ({ children }) => (
  <div className="ap-filters">{children}</div>
);

// ─── Skeleton rows ─────────────────────────────────────────────
export const SkeletonRow = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}>
        <div className="ap-skeleton" style={{ height: 14, width: `${60 + Math.random() * 30}%`, borderRadius: 4 }} />
      </td>
    ))}
  </tr>
);

export const SkeletonTable = ({ rows = 8, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
  </>
);

// ─── AdminUserAvatar ───────────────────────────────────────────
// Shows the user's profile picture when `src` is provided; falls back to
// coloured initials when there's no image or the image fails to load.
export const AdminUserAvatar = ({ email, firstName, lastName, src, size = 32 }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = firstName
    ? `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase()
    : (email?.[0] || 'U').toUpperCase();

  const hue = (email || '').split('').reduce((h, c) => h + c.charCodeAt(0), 0) % 360;

  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.1)'
  };

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={initials}
        onError={() => setImgFailed(true)}
        style={{ ...base, objectFit: 'cover', background: `hsl(${hue},60%,35%)` }}
      />
    );
  }

  return (
    <div style={{
      ...base,
      background: `hsl(${hue},60%,35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff'
    }}>
      {initials}
    </div>
  );
};

// ─── AdminTimeline ─────────────────────────────────────────────
export const AdminTimeline = ({ items = [] }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    {items.map((item, i) => (
      <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < items.length - 1 ? 16 : 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ap-blue)', border: '2px solid var(--ap-bg-card)', flexShrink: 0 }} />
          {i < items.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--ap-border)', marginTop: 4 }} />}
        </div>
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--ap-text-primary)', fontWeight: 500 }}>{item.title}</div>
          {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginTop: 2 }}>{item.description}</div>}
          {item.time && <div style={{ fontSize: '0.72rem', color: 'var(--ap-text-muted)', marginTop: 4 }}>{item.time}</div>}
        </div>
      </div>
    ))}
  </div>
);

// ─── Format helpers ────────────────────────────────────────────
export const fmt = {
  date:     (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
  datetime: (d) => d ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
  currency: (n, c = 'PKR') => n != null ? `${c} ${Number(n).toLocaleString()}` : '—',
  // Job budget is an embedded { min, max, type } object — render it as a range.
  budget: (b, c = 'PKR') => {
    if (b == null) return '—';
    if (typeof b === 'number') return `${c} ${b.toLocaleString()}`;
    const { min, max, type } = b;
    const suffix = type === 'hourly' ? '/hr' : '';
    if (min != null && max != null && min !== max) return `${c} ${Number(min).toLocaleString()}–${Number(max).toLocaleString()}${suffix}`;
    const val = max ?? min;
    return val != null ? `${c} ${Number(val).toLocaleString()}${suffix}` : '—';
  },
  number:   (n) => n != null ? Number(n).toLocaleString() : '—',
  percent:  (n) => n != null ? `${Number(n).toFixed(1)}%` : '—',
  relative: (d) => {
    if (!d) return '—';
    const ms = Date.now() - new Date(d).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
};
