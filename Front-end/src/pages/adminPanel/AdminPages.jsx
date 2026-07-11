/**
 * All remaining admin panel pages — fully functional list/detail pattern.
 * Each page is exported individually and imported in AppRoutes.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AdminLoader, AdminEmptyState, StatusBadge, AdminPagination,
  ExportButtons, AdminFilterBar, SkeletonTable, ConfirmDialog, AdminModal, fmt
} from '../../Components/adminPanel/AdminCommon';
import {
  adminJobs, adminContracts, adminDisputes,
  adminPayments, adminWallets, adminWithdrawals, adminTransactions,
  adminChat, adminReviews, adminNotifications, adminReports,
  adminMonitoring, adminAuditLogs, adminAnalytics, adminSettings
} from '../../api/adminPanel';

// ─── Reusable page shell ───────────────────────────────────────
const PageShell = ({ title, desc, icon, headerRight, children }) => (
  <div>
    <div className="ap-page-header">
      <div className="ap-page-header-left">
        <h1>{icon} {title}</h1>
        <p>{desc}</p>
      </div>
      {headerRight && <div className="ap-page-header-right">{headerRight}</div>}
    </div>
    {children}
  </div>
);

// ─── Generic list table ────────────────────────────────────────
const ListTable = ({ loading, data, columns, renderRow, emptyIcon, emptyTitle, pagination, onPage }) => (
  <div className="ap-card" style={{ padding: 0 }}>
    <div className="ap-table-wrap">
      <table className="ap-table">
        <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {loading
            ? <SkeletonTable rows={8} cols={columns.length} />
            : data.length === 0
              ? <tr><td colSpan={columns.length}><AdminEmptyState icon={emptyIcon || '📭'} title={emptyTitle || 'No data'} /></td></tr>
              : data.map((item, i) => renderRow(item, i))
          }
        </tbody>
      </table>
    </div>
    {pagination && (
      <AdminPagination
        page={pagination.page} pages={pagination.pages}
        total={pagination.total} limit={pagination.limit}
        onPage={onPage}
      />
    )}
  </div>
);

// ─── useList hook ──────────────────────────────────────────────
const useList = (fetchFn, dataKey) => {
  const [data, setData]      = useState([]);
  const [pagination, setPag] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading]= useState(true);
  const [page, setPage]      = useState(1);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await fetchFn({ page, limit: 20, ...params });
      const key = dataKey || Object.keys(res || {}).find(k => Array.isArray(res[k]));
      setData(res?.[key] || []);
      if (res?.pagination) setPag(res.pagination);
    } catch { } finally { setLoading(false); }
  }, [page, fetchFn]);

  useEffect(() => { load(); }, [load]);

  return { data, setData, pagination, loading, page, setPage, load };
};

// ═══════════════════════════════════════════════════════════════
// JOBS
// ═══════════════════════════════════════════════════════════════
export const JobsPage = () => {
  const navigate = useNavigate();
  const { data, pagination, loading, page, setPage, load } = useList(adminJobs.list, 'jobs');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  return (
    <PageShell title="Jobs" desc="All platform job listings" icon="💼"
      headerRight={<ExportButtons onExport={fmt => window.open(`/api/v1/admin-panel/jobs/export?format=${fmt}`, '_blank')} />}>
      <AdminFilterBar>
        <input className="ap-input" style={{ maxWidth: 240 }} placeholder="Search title…"
          onKeyDown={e => e.key === 'Enter' && load({ search: e.target.value, page: 1 })}
          onChange={e => setSearch(e.target.value)} />
        <select className="ap-select" style={{ maxWidth: 160 }} value={status} onChange={e => { setStatus(e.target.value); load({ status: e.target.value, page: 1 }); }}>
          <option value="">All statuses</option>
          {['open','in-progress','completed','closed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} emptyIcon="💼" emptyTitle="No jobs found"
        columns={['Title','Client','Status','Budget','Posted','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(job) => (
          <tr key={job._id}>
            <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</td>
            <td style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>{job.postedBy?.email || '—'}</td>
            <td><StatusBadge status={job.status} /></td>
            <td style={{ fontSize: '0.85rem' }}>{fmt.currency(job.budget)}</td>
            <td style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>{fmt.date(job.createdAt)}</td>
            <td>
              <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => navigate(`/admin-panel/jobs/${job._id}`)}>👁</button>
            </td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════
export const ContractsPage = () => {
  const navigate = useNavigate();
  const { data, pagination, loading, page, setPage, load } = useList(adminContracts.list, 'contracts');

  return (
    <PageShell title="Contracts" desc="All platform contracts" icon="📋"
      headerRight={<ExportButtons onExport={fmt => window.open(`/api/v1/admin-panel/contracts/export?format=${fmt}`, '_blank')} />}>
      <ListTable loading={loading} data={data} emptyIcon="📋" emptyTitle="No contracts found"
        columns={['Type','Status','Client','Freelancer','Amount','Started','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(c) => (
          <tr key={c._id}>
            <td><span className="ap-badge ap-badge-blue">{c.type}</span></td>
            <td><StatusBadge status={c.status} /></td>
            <td style={{ fontSize: '0.82rem' }}>{c.clientId?.email || '—'}</td>
            <td style={{ fontSize: '0.82rem' }}>{c.freelancerId?.email || '—'}</td>
            <td style={{ fontSize: '0.85rem' }}>{fmt.currency(c.fixedPrice || c.hourlyRate)}</td>
            <td style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>{fmt.date(c.startedAt)}</td>
            <td><button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => navigate(`/admin-panel/contracts/${c._id}`)}>👁</button></td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// DISPUTES
// ═══════════════════════════════════════════════════════════════
export const DisputesPage = () => {
  const navigate = useNavigate();
  const { data, pagination, loading, page, setPage, load } = useList(adminDisputes.list, 'disputes');

  return (
    <PageShell title="Disputes" desc="All contract disputes requiring attention" icon="⚠️">
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 160 }} onChange={e => load({ status: e.target.value, page: 1 })}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} emptyIcon="⚠️" emptyTitle="No disputes found"
        columns={['Contract','Status','Raised By','Raised At','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(c) => (
          <tr key={c._id}>
            <td style={{ fontWeight: 500 }}>{c.jobId?.title || c._id?.slice(-6)}</td>
            <td><StatusBadge status={c.dispute?.status} /></td>
            <td style={{ fontSize: '0.82rem' }}>{c.clientId?.email || '—'}</td>
            <td style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>{fmt.datetime(c.dispute?.raisedAt)}</td>
            <td>
              <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => navigate(`/admin-panel/disputes/${c._id}`)}>
                Resolve
              </button>
            </td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════
export const PaymentsPage = () => {
  const { data, pagination, loading, page, setPage, load } = useList(adminPayments.list, 'payments');

  return (
    <PageShell title="Payments" desc="All escrow and payment records" icon="💳"
      headerRight={<ExportButtons onExport={fmt => window.open(`/api/v1/admin-panel/payments/export?format=${fmt}`, '_blank')} />}>
      <ListTable loading={loading} data={data} emptyIcon="💳" emptyTitle="No payments found"
        columns={['ID','Client','Freelancer','Total','Fee','Status','Date']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(p) => (
          <tr key={p._id}>
            <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{p._id?.slice(-8)}</td>
            <td style={{ fontSize: '0.82rem' }}>{p.clientId?.email || '—'}</td>
            <td style={{ fontSize: '0.82rem' }}>{p.freelancerId?.email || '—'}</td>
            <td style={{ fontWeight: 600 }}>{fmt.currency(p.totalAmount, p.currency)}</td>
            <td style={{ color: 'var(--ap-green)', fontSize: '0.82rem' }}>{fmt.currency(p.platformFee, p.currency)}</td>
            <td><StatusBadge status={p.status} /></td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.date(p.createdAt)}</td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// WALLETS
// ═══════════════════════════════════════════════════════════════
export const WalletsPage = () => {
  const { data, loading, load } = useList(adminWallets.list, 'wallets');

  return (
    <PageShell title="Wallets" desc="All user wallet balances" icon="👛">
      <ListTable loading={loading} data={data} emptyIcon="👛" emptyTitle="No wallets found"
        columns={['User','Type','Balance','Frozen','Actions']}
        renderRow={(w) => (
          <tr key={w._id}>
            <td style={{ fontSize: '0.83rem' }}>{w.userId?.email || '—'}</td>
            <td><span className={`ap-badge ${w.userType === 'freelancer' ? 'ap-badge-blue' : 'ap-badge-purple'}`}>{w.userType}</span></td>
            <td style={{ fontWeight: 600, color: 'var(--ap-green)' }}>{fmt.currency(w.walletBalance)}</td>
            <td>{w.isFrozenWallet ? <StatusBadge status="frozen" /> : <StatusBadge status="active" />}</td>
            <td>
              {w.isFrozenWallet
                ? <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => adminWallets.unfreeze(w.userId?._id).then(() => load())}>Unfreeze</button>
                : <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => { const r = prompt('Reason?'); if (r) adminWallets.freeze(w.userId?._id, r).then(() => load()); }}>Freeze</button>
              }
            </td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════════════════════════
export const WithdrawalsPage = () => {
  const { data, pagination, loading, page, setPage, load } = useList(adminWithdrawals.list, 'withdrawals');
  const [busy, setBusy] = useState(false);

  const act = async (id, action) => {
    setBusy(true);
    try {
      if (action === 'approve') await adminWithdrawals.approve(id);
      else if (action === 'reject') {
        const r = prompt('Rejection reason?');
        if (r) await adminWithdrawals.reject(id, r);
      }
      load();
    } finally { setBusy(false); }
  };

  return (
    <PageShell title="Withdrawals" desc="Pending and processed withdrawal requests" icon="💸"
      headerRight={<ExportButtons onExport={fmt => window.open(`/api/v1/admin-panel/withdrawals/export?format=${fmt}`, '_blank')} />}>
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 160 }} onChange={e => load({ status: e.target.value, page: 1 })}>
          <option value="">All statuses</option>
          {['pending','completed','failed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} emptyIcon="💸" emptyTitle="No withdrawals found"
        columns={['User','Amount','Method','Status','Requested','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(w) => (
          <tr key={w._id}>
            <td style={{ fontSize: '0.82rem' }}>{w.userId?.email || '—'}</td>
            <td style={{ fontWeight: 600 }}>{fmt.currency(w.amount)}</td>
            <td><span className="ap-badge ap-badge-gray">{w.method}</span></td>
            <td><StatusBadge status={w.status} /></td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.date(w.createdAt)}</td>
            <td>
              {w.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => act(w._id, 'approve')}>✅ Approve</button>
                  <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy} onClick={() => act(w._id, 'reject')}>❌ Reject</button>
                </div>
              )}
            </td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════
export const TransactionsPage = () => {
  const { data, loading, load } = useList(adminTransactions.list, 'transactions');

  return (
    <PageShell title="Transactions" desc="Unified view of payments and withdrawals" icon="↕️"
      headerRight={<ExportButtons onExport={fmt => window.open(`/api/v1/admin-panel/transactions/export?format=${fmt}`, '_blank')} />}>
      <ListTable loading={loading} data={data} emptyIcon="↕️" emptyTitle="No transactions"
        columns={['Type','Amount','Status','Date']}
        renderRow={(t, i) => (
          <tr key={`${t._id}-${i}`}>
            <td><span className={`ap-badge ${t.transactionType === 'payment' ? 'ap-badge-blue' : 'ap-badge-purple'}`}>{t.transactionType}</span></td>
            <td style={{ fontWeight: 600 }}>{fmt.currency(t.totalAmount || t.amount)}</td>
            <td><StatusBadge status={t.status} /></td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.date(t.createdAt)}</td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════
export const ChatPage = () => {
  const { data, pagination, loading, page, setPage, load } = useList(adminChat.list, 'conversations');

  return (
    <PageShell title="Chat Moderation" desc="Monitor all platform conversations" icon="💬">
      <ListTable loading={loading} data={data} emptyIcon="💬" emptyTitle="No conversations"
        columns={['Participants','Messages','Last Activity','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(conv) => (
          <tr key={conv._id}>
            <td style={{ fontSize: '0.83rem' }}>{conv.participants?.map(p => p.email).join(', ') || '—'}</td>
            <td>{conv.messageCount || '—'}</td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.relative(conv.updatedAt)}</td>
            <td><button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => window.open(`/admin-panel/chat/${conv._id}`, '_blank')}>View</button></td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════
export const ReviewsPage = () => {
  const { data, pagination, loading, page, setPage, load } = useList(adminReviews.list, 'reviews');
  const [busy, setBusy] = useState(false);

  const doHide = async (id) => {
    const reason = prompt('Reason for hiding this review?');
    if (!reason) return;
    setBusy(true);
    try { await adminReviews.hide(id, reason); load(); } finally { setBusy(false); }
  };
  const doRestore = async (id) => { setBusy(true); try { await adminReviews.restore(id); load(); } finally { setBusy(false); } };
  const doDelete  = async (id) => { if (!confirm('Permanently delete this review?')) return; setBusy(true); try { await adminReviews.delete(id); load(); } finally { setBusy(false); } };

  return (
    <PageShell title="Reviews" desc="Manage user reviews and ratings" icon="⭐">
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 160 }} onChange={e => load({ isHidden: e.target.value, page: 1 })}>
          <option value="">All</option>
          <option value="false">Visible</option>
          <option value="true">Hidden</option>
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} emptyIcon="⭐" emptyTitle="No reviews found"
        columns={['Reviewer','Reviewee','Rating','Status','Date','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(r) => (
          <tr key={r._id}>
            <td style={{ fontSize: '0.82rem' }}>{r.reviewerId?.email || '—'}</td>
            <td style={{ fontSize: '0.82rem' }}>{r.revieweeId?.email || '—'}</td>
            <td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
            <td><StatusBadge status={r.isHidden ? 'hidden' : 'visible'} /></td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.date(r.createdAt)}</td>
            <td>
              <div style={{ display: 'flex', gap: 6 }}>
                {r.isHidden
                  ? <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => doRestore(r._id)}>Restore</button>
                  : <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy} onClick={() => doHide(r._id)}>Hide</button>
                }
                <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy} onClick={() => doDelete(r._id)}>🗑</button>
              </div>
            </td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
export const NotificationsPage = () => {
  const [target, setTarget]  = useState('all');
  const [title, setTitle]    = useState('');
  const [message, setMessage]= useState('');
  const [busy, setBusy]      = useState(false);
  const [sent, setSent]      = useState(null);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await adminNotifications.broadcast({ target, title, message });
      setSent(res?.message || 'Notification sent!');
      setTitle(''); setMessage('');
    } catch (err) {
      alert(err?.message || 'Failed to send');
    } finally { setBusy(false); }
  };

  return (
    <PageShell title="Notifications" desc="Broadcast notifications to users" icon="🔔">
      <div className="ap-card" style={{ maxWidth: 560 }}>
        <div className="ap-card-header"><span className="ap-card-title">Broadcast Notification</span></div>
        {sent && <div className="ap-alert ap-alert-success" style={{ marginBottom: 16 }}><span>✅</span><span>{sent}</span></div>}
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ap-form-group">
            <label className="ap-label">Target Audience</label>
            <select className="ap-select" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="all">All Users</option>
              <option value="freelancer">Freelancers Only</option>
              <option value="client">Clients Only</option>
            </select>
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Title</label>
            <input className="ap-input" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title…" />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Message</label>
            <textarea className="ap-textarea" required value={message} onChange={e => setMessage(e.target.value)} placeholder="Notification body…" />
          </div>
          <button type="submit" className="ap-btn ap-btn-primary" disabled={busy}>
            {busy ? 'Sending…' : '📤 Send Notification'}
          </button>
        </form>
      </div>
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
export const ReportsPage = () => {
  const { data, pagination, loading, page, setPage, load } = useList(adminReports.list, 'reports');
  const [busy, setBusy] = useState(false);

  const resolve = async (id) => {
    const resolution = prompt('Resolution notes?');
    if (!resolution) return;
    setBusy(true);
    try { await adminReports.resolve(id, { resolution }); load(); } finally { setBusy(false); }
  };
  const dismiss = async (id) => {
    const reason = prompt('Dismissal reason?');
    if (!reason) return;
    setBusy(true);
    try { await adminReports.dismiss(id, reason); load(); } finally { setBusy(false); }
  };

  return (
    <PageShell title="Reports" desc="User-submitted reports and flags" icon="🚩">
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 160 }} onChange={e => load({ status: e.target.value, page: 1 })}>
          <option value="">All</option>
          {['pending','investigating','resolved','dismissed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} emptyIcon="🚩" emptyTitle="No reports found"
        columns={['Reporter','Reported User','Category','Status','Date','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(r) => (
          <tr key={r._id}>
            <td style={{ fontSize: '0.82rem' }}>{r.reportedBy?.email || '—'}</td>
            <td style={{ fontSize: '0.82rem' }}>{r.reportedUser?.email || '—'}</td>
            <td><span className="ap-badge ap-badge-orange">{r.category}</span></td>
            <td><StatusBadge status={r.status} /></td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.date(r.createdAt)}</td>
            <td>
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy} onClick={() => resolve(r._id)}>Resolve</button>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => dismiss(r._id)}>Dismiss</button>
                </div>
              )}
            </td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// MONITORING
// ═══════════════════════════════════════════════════════════════
export const MonitoringPage = () => {
  const [tab, setTab] = useState('errors');
  const [data, setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'errors') res = await adminMonitoring.getErrorLogs({ limit: 50 });
      else if (tab === 'api') res = await adminMonitoring.getApiLogs({ limit: 50 });
      else if (tab === 'email') res = await adminMonitoring.getEmailLogs({ limit: 50 });
      const key = Object.keys(res || {}).find(k => Array.isArray(res[k]));
      setData(res?.[key] || []);
    } catch { setData([]); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <PageShell title="Monitoring" desc="System logs, API logs, and error tracking" icon="📡">
      <div className="ap-tabs" style={{ marginBottom: 16 }}>
        {['errors','api','email'].map(t => (
          <button key={t} className={`ap-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'errors' ? '🔴 Errors' : t === 'api' ? '📡 API Logs' : '📧 Email Logs'}
          </button>
        ))}
      </div>
      <div className="ap-card" style={{ padding: 0 }}>
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                {tab === 'errors' && <><th>Type</th><th>Message</th><th>Resolved</th><th>Time</th><th>Actions</th></>}
                {tab === 'api' && <><th>Method</th><th>Path</th><th>Status</th><th>Duration</th><th>Time</th></>}
                {tab === 'email' && <><th>To</th><th>Subject</th><th>Status</th><th>Sent</th></>}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonTable rows={8} cols={5} /> : data.length === 0 ? (
                <tr><td colSpan={5}><AdminEmptyState icon="📭" title="No logs found" /></td></tr>
              ) : data.map((log, i) => (
                <tr key={i}>
                  {tab === 'errors' && <>
                    <td><span className="ap-badge ap-badge-red">{log.type || 'Error'}</span></td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                    <td><StatusBadge status={log.resolved ? 'resolved' : 'pending'} /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.relative(log.timestamp)}</td>
                    <td>{!log.resolved && <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => adminMonitoring.resolveError(log._id).then(() => load())}>✓</button>}</td>
                  </>}
                  {tab === 'api' && <>
                    <td><span className={`ap-badge ${log.method === 'GET' ? 'ap-badge-blue' : log.method === 'POST' ? 'ap-badge-green' : 'ap-badge-yellow'}`}>{log.method}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{log.path}</td>
                    <td><span className={`ap-badge ${log.statusCode < 400 ? 'ap-badge-green' : 'ap-badge-red'}`}>{log.statusCode}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{log.duration}ms</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.relative(log.timestamp)}</td>
                  </>}
                  {tab === 'email' && <>
                    <td style={{ fontSize: '0.82rem' }}>{log.to}</td>
                    <td style={{ fontSize: '0.82rem' }}>{log.subject}</td>
                    <td><StatusBadge status={log.status} /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.relative(log.sentAt)}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════
export const AuditLogsPage = () => {
  const { data, pagination, loading, page, setPage, load } = useList(adminAuditLogs.list, 'logs');

  const SEV_COLOR = { info: 'blue', warning: 'yellow', critical: 'red' };

  return (
    <PageShell title="Audit Logs" desc="Immutable record of all admin actions" icon="📜">
      <ListTable loading={loading} data={data} emptyIcon="📜" emptyTitle="No audit logs"
        columns={['Action','Category','Severity','Admin','Resource','Time']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(log) => (
          <tr key={log._id}>
            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.action}</td>
            <td><span className="ap-badge ap-badge-gray">{log.category}</span></td>
            <td><span className={`ap-badge ap-badge-${SEV_COLOR[log.severity] || 'gray'}`}>{log.severity}</span></td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{log.adminEmail}</td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{log.resource}</td>
            <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.relative(log.createdAt)}</td>
          </tr>
        )}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
export const AnalyticsPage = () => {
  const [data, setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAnalytics.get().then(res => { setData(res?.analytics); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLoader message="Loading analytics…" />;

  return (
    <PageShell title="Analytics" desc="Platform growth and performance insights" icon="📊">
      <div className="ap-grid-2" style={{ marginBottom: 24 }}>
        {/* Users by role */}
        <div className="ap-card">
          <div className="ap-card-header"><span className="ap-card-title">Users by Role</span></div>
          {data?.usersByRole?.map(r => (
            <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ap-border)' }}>
              <span style={{ color: 'var(--ap-text-secondary)', fontSize: '0.85rem' }}>{r._id}</span>
              <strong style={{ color: 'var(--ap-text-primary)' }}>{r.count?.toLocaleString()}</strong>
            </div>
          ))}
        </div>

        {/* Jobs by status */}
        <div className="ap-card">
          <div className="ap-card-header"><span className="ap-card-title">Jobs by Status</span></div>
          {data?.jobsByStatus?.map(j => (
            <div key={j._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ap-border)' }}>
              <StatusBadge status={j._id} />
              <strong style={{ color: 'var(--ap-text-primary)' }}>{j.count?.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by month */}
      <div className="ap-card" style={{ marginBottom: 24 }}>
        <div className="ap-card-header"><span className="ap-card-title">Revenue by Month</span></div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 160, padding: '8px 0', overflow: 'hidden' }}>
          {data?.revenueByMonth?.map(r => {
            const maxRev = Math.max(...(data.revenueByMonth?.map(x => x.revenue) || [1]));
            const pct = maxRev > 0 ? (r.revenue / maxRev) * 100 : 0;
            return (
              <div key={r._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--ap-text-muted)' }}>{fmt.currency(r.revenue)}</div>
                <div style={{ width: '100%', height: `${pct}%`, background: 'linear-gradient(to top, var(--ap-blue), var(--ap-purple))', borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.6s ease' }} />
                <div style={{ fontSize: '0.68rem', color: 'var(--ap-text-muted)', whiteSpace: 'nowrap' }}>{r._id}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top freelancers */}
      <div className="ap-card">
        <div className="ap-card-header"><span className="ap-card-title">🏆 Top Earning Freelancers</span></div>
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead><tr><th>#</th><th>Freelancer</th><th>Total Earnings</th><th>Jobs Completed</th></tr></thead>
            <tbody>
              {data?.topFreelancers?.map((f, i) => (
                <tr key={f._id}>
                  <td style={{ color: i < 3 ? 'var(--ap-yellow)' : 'var(--ap-text-muted)', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ fontSize: '0.85rem' }}>{f.email || '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--ap-green)' }}>{fmt.currency(f.totalEarnings)}</td>
                  <td>{f.jobCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
export const SettingsPage = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState({});  // { key: newValue }
  const [busy, setBusy]         = useState(false);
  const [saved, setSaved]       = useState('');

  useEffect(() => {
    adminSettings.list().then(res => { setSettings(res?.settings || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const save = async (key) => {
    setBusy(true);
    try {
      await adminSettings.update(key, editing[key]);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: editing[key] } : s));
      const e = { ...editing }; delete e[key]; setEditing(e);
      setSaved(`"${key}" updated`);
      setTimeout(() => setSaved(''), 3000);
    } catch (err) { alert(err?.message); } finally { setBusy(false); }
  };

  if (loading) return <AdminLoader />;

  const byCategory = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const CATEGORY_ICONS = { fees: '💰', security: '🔐', email: '📧', features: '⚙️', general: '🌐', maintenance: '🔧' };

  return (
    <PageShell title="Settings" desc="Platform configuration and feature flags" icon="⚙️">
      {saved && <div className="ap-alert ap-alert-success" style={{ marginBottom: 16 }}><span>✅</span><span>{saved}</span></div>}
      {Object.entries(byCategory).map(([cat, catSettings]) => (
        <div key={cat} className="ap-card" style={{ marginBottom: 16 }}>
          <div className="ap-card-header">
            <span className="ap-card-title">{CATEGORY_ICONS[cat] || '•'} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
          </div>
          {catSettings.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--ap-border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--ap-blue-light)', marginBottom: 2 }}>{s.key}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{s.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.valueType === 'boolean' ? (
                  <button
                    className={`ap-btn ap-btn-sm ${s.value ? 'ap-btn-success' : 'ap-btn-secondary'}`}
                    disabled={busy}
                    onClick={() => adminSettings.update(s.key, !s.value).then(() => setSettings(prev => prev.map(x => x.key === s.key ? { ...x, value: !s.value } : x)))}
                  >
                    {s.value ? '✅ Enabled' : '⬜ Disabled'}
                  </button>
                ) : (
                  <>
                    <input
                      className="ap-input"
                      style={{ width: 120, textAlign: 'right' }}
                      type={s.valueType === 'number' ? 'number' : 'text'}
                      defaultValue={s.value}
                      onChange={e => setEditing(prev => ({ ...prev, [s.key]: s.valueType === 'number' ? Number(e.target.value) : e.target.value }))}
                    />
                    {editing[s.key] !== undefined && (
                      <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy} onClick={() => save(s.key)}>Save</button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </PageShell>
  );
};
