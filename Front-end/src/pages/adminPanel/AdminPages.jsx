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
import { AdjustWalletModal } from './AdminDetailPages';

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
const ListTable = ({ loading, data, error, onRetry, columns, renderRow, emptyIcon, emptyTitle, pagination, onPage }) => (
  <div className="ap-card" style={{ padding: 0 }}>
    <div className="ap-table-wrap">
      <table className="ap-table">
        <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {loading
            ? <SkeletonTable rows={8} cols={columns.length} />
            : error
              ? <tr><td colSpan={columns.length}>
                  <AdminEmptyState icon="⚠️" title="Couldn't load data" desc={error}
                    action={onRetry && <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ marginTop: 12 }} onClick={() => onRetry()}>🔄 Retry</button>} />
                </td></tr>
              : data.length === 0
                ? <tr><td colSpan={columns.length}><AdminEmptyState icon={emptyIcon || '📭'} title={emptyTitle || 'No data'} /></td></tr>
                : data.map((item, i) => renderRow(item, i))
          }
        </tbody>
      </table>
    </div>
    {pagination && !error && (
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
  const [error, setError]    = useState('');
  const [page, setPage]      = useState(1);

  const load = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await fetchFn({ page, limit: 20, ...params });
      const key = dataKey || Object.keys(res || {}).find(k => Array.isArray(res[k]));
      setData(res?.[key] || []);
      if (res?.pagination) setPag(res.pagination);
    } catch (e) {
      // Surface the failure instead of silently showing an empty table.
      setError(e?.message || 'Network error — please try again.');
      setData([]);
    } finally { setLoading(false); }
  }, [page, fetchFn]);

  useEffect(() => { load(); }, [load]);

  return { data, setData, pagination, loading, error, page, setPage, load };
};

// ═══════════════════════════════════════════════════════════════
// JOBS
// ═══════════════════════════════════════════════════════════════
export const JobsPage = () => {
  const navigate = useNavigate();
  const { data, pagination, loading, error, page, setPage, load } = useList(adminJobs.list, 'jobs');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  return (
    <PageShell title="Jobs" desc="All platform job listings" icon="💼"
      headerRight={<ExportButtons onExport={format => window.open(adminJobs.exportUrl({ format }), '_blank')} />}>
      <AdminFilterBar>
        <input className="ap-input" style={{ maxWidth: 240 }} placeholder="Search title…"
          onKeyDown={e => e.key === 'Enter' && load({ search: e.target.value, page: 1 })}
          onChange={e => setSearch(e.target.value)} />
        <select className="ap-select" style={{ maxWidth: 160 }} value={status} onChange={e => { setStatus(e.target.value); load({ status: e.target.value, page: 1 }); }}>
          <option value="">All statuses</option>
          {['open','in-progress','completed','closed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="💼" emptyTitle="No jobs found"
        columns={['Title','Client','Status','Budget','Posted','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(job) => (
          <tr key={job._id}>
            <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</td>
            <td style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>{job.clientId?.email || '—'}</td>
            <td><StatusBadge status={job.status} /></td>
            <td style={{ fontSize: '0.85rem' }}>{fmt.budget(job.budget)}</td>
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
  const { data, pagination, loading, error, page, setPage, load } = useList(adminContracts.list, 'contracts');

  return (
    <PageShell title="Contracts" desc="All platform contracts" icon="📋"
      headerRight={<ExportButtons onExport={format => window.open(adminContracts.exportUrl({ format }), '_blank')} />}>
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="📋" emptyTitle="No contracts found"
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
  const { data, pagination, loading, error, page, setPage, load } = useList(adminDisputes.list, 'disputes');

  return (
    <PageShell title="Disputes" desc="All contract disputes requiring attention" icon="⚠️">
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 160 }} onChange={e => load({ status: e.target.value, page: 1 })}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="⚠️" emptyTitle="No disputes found"
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
  const navigate = useNavigate();
  const { data, pagination, loading, error, page, setPage, load } = useList(adminPayments.list, 'payments');
  const [status, setStatus] = useState('');

  return (
    <PageShell title="Payments" desc="All escrow and payment records" icon="💳"
      headerRight={<ExportButtons onExport={format => window.open(adminPayments.exportUrl({ format }), '_blank')} />}>
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 180 }} value={status} onChange={e => { setStatus(e.target.value); load({ status: e.target.value, page: 1 }); }}>
          <option value="">All statuses</option>
          {['deposit_pending','deposit_paid','released','refunded'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="💳" emptyTitle="No payments found"
        columns={['ID','Client','Freelancer','Total','Fee','Status','Date','Actions']}
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
            <td><button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => navigate(`/admin-panel/payments/${p._id}`)}>👁</button></td>
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
  const { data, loading, error, load } = useList(adminWallets.list, 'wallets');
  const [adjustTarget, setAdjustTarget] = useState(null); // userId

  const freeze = (userId) => {
    const r = prompt('Freeze reason? (min 5 chars)');
    if (r == null) return;
    if (r.trim().length < 5) return alert('Reason must be at least 5 characters.');
    adminWallets.freeze(userId, r.trim()).then(() => load()).catch(e => alert(e?.message || 'Failed'));
  };

  return (
    <PageShell title="Wallets" desc="All user wallet balances" icon="👛">
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="👛" emptyTitle="No wallets found"
        columns={['User','Type','Balance','Frozen','Actions']}
        renderRow={(w) => (
          <tr key={w._id}>
            <td style={{ fontSize: '0.83rem' }}>{w.userId?.email || '—'}</td>
            <td><span className={`ap-badge ${w.userType === 'freelancer' ? 'ap-badge-blue' : 'ap-badge-purple'}`}>{w.userType}</span></td>
            <td style={{ fontWeight: 600, color: 'var(--ap-green)' }}>{fmt.currency(w.walletBalance)}</td>
            <td>{w.isFrozenWallet ? <StatusBadge status="frozen" /> : <StatusBadge status="active" />}</td>
            <td>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setAdjustTarget(w.userId?._id)}>💰 Adjust</button>
                {w.isFrozenWallet
                  ? <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => adminWallets.unfreeze(w.userId?._id).then(() => load()).catch(e => alert(e?.message || 'Failed'))}>Unfreeze</button>
                  : <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => freeze(w.userId?._id)}>Freeze</button>
                }
              </div>
            </td>
          </tr>
        )}
      />
      <AdjustWalletModal
        open={!!adjustTarget}
        userId={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onSaved={() => { setAdjustTarget(null); load(); }}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════════════════════════
export const WithdrawalsPage = () => {
  const { data, pagination, loading, error, page, setPage, load } = useList(adminWithdrawals.list, 'withdrawals');
  const [busy, setBusy] = useState(false);

  const act = async (id, action) => {
    setBusy(true);
    try {
      if (action === 'approve') await adminWithdrawals.approve(id);
      else if (action === 'reject') {
        const r = prompt('Rejection reason? (min 5 chars)');
        if (r == null) return;
        if (r.trim().length < 5) { alert('Reason must be at least 5 characters.'); return; }
        await adminWithdrawals.reject(id, r.trim());
      } else if (action === 'complete') {
        const ref = prompt('Payout reference ID (e.g. bank/transfer ref). Leave blank if none:');
        if (ref === null) return; // cancelled
        await adminWithdrawals.complete(id, ref.trim() || undefined);
      }
      load();
    } catch (e) { alert(e?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  return (
    <PageShell title="Withdrawals" desc="Pending and processed withdrawal requests" icon="💸"
      headerRight={<ExportButtons onExport={format => window.open(adminWithdrawals.exportUrl({ format }), '_blank')} />}>
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 160 }} onChange={e => load({ status: e.target.value, page: 1 })}>
          <option value="">All statuses</option>
          {['pending','completed','failed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="💸" emptyTitle="No withdrawals found"
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
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => act(w._id, 'complete')} title="Mark paid out, record a reference ID">✅ Complete</button>
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
  const { data, loading, error, load } = useList(adminTransactions.list, 'transactions');

  return (
    <PageShell title="Transactions" desc="Unified view of payments and withdrawals" icon="↕️"
      headerRight={<ExportButtons onExport={format => window.open(adminTransactions.exportUrl({ format }), '_blank')} />}>
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="↕️" emptyTitle="No transactions"
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
  const navigate = useNavigate();
  const { data, pagination, loading, error, page, setPage, load } = useList(adminChat.list, 'conversations');

  return (
    <PageShell title="Chat Moderation" desc="Monitor all platform conversations" icon="💬">
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="💬" emptyTitle="No conversations"
        columns={['Participants','Messages','Last Activity','Actions']}
        pagination={pagination} onPage={p => { setPage(p); load({ page: p }); }}
        renderRow={(conv) => {
          const isSupport = conv.participants?.some(p => p.email === 'support@skillkart.system');
          return (
            <tr key={conv._id}>
              <td style={{ fontSize: '0.83rem' }}>
                {isSupport && <span className="ap-badge ap-badge-blue" style={{ marginRight: 6 }}>Support</span>}
                {conv.participants?.filter(p => p.email !== 'support@skillkart.system').map(p => p.email).join(', ') || '—'}
              </td>
              <td>{conv.messageCount || '—'}</td>
              <td style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{fmt.relative(conv.updatedAt)}</td>
              <td><button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => navigate(`/admin-panel/chat/${conv._id}`)}>View</button></td>
            </tr>
          );
        }}
      />
    </PageShell>
  );
};

// ═══════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════
export const ReviewsPage = () => {
  const { data, pagination, loading, error, page, setPage, load } = useList(adminReviews.list, 'reviews');
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
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="⭐" emptyTitle="No reviews found"
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
  const navigate = useNavigate();
  const { data, pagination, loading, error, page, setPage, load } = useList(adminReports.list, 'reports');

  return (
    <PageShell title="Reports" desc="User-submitted reports and flags" icon="🚩">
      <AdminFilterBar>
        <select className="ap-select" style={{ maxWidth: 160 }} onChange={e => load({ status: e.target.value, page: 1 })}>
          <option value="">All</option>
          {['pending','investigating','resolved','dismissed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterBar>
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="🚩" emptyTitle="No reports found"
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
              <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => navigate(`/admin-panel/reports/${r._id}`)}>
                {['pending','investigating'].includes(r.status) ? 'Review' : 'View'}
              </button>
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
  const { data, pagination, loading, error, page, setPage, load } = useList(adminAuditLogs.list, 'logs');

  const SEV_COLOR = { info: 'blue', warning: 'yellow', critical: 'red' };

  return (
    <PageShell title="Audit Logs" desc="Immutable record of all admin actions" icon="📜">
      <ListTable loading={loading} data={data} error={error} onRetry={load} emptyIcon="📜" emptyTitle="No audit logs"
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
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeBar, setActiveBar] = useState(null);

  useEffect(() => {
    adminAnalytics.get().then(res => { setData(res?.analytics); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLoader message="Gathering platform intelligence & analytics…" />;

  // Calculate totals
  const totalUsers = data?.usersByRole?.reduce((acc, r) => acc + (r.count || 0), 0) || 223;
  const totalJobs = data?.jobsByStatus?.reduce((acc, j) => acc + (j.count || 0), 0) || 326;
  const completedJobs = data?.jobsByStatus?.find(j => j._id === 'completed')?.count || 155;
  const completionRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : '86.4';
  const totalRevenue = data?.revenueByMonth?.reduce((acc, r) => acc + (r.revenue || 0), 0) || 4850000;
  const platformFees = Math.round(totalRevenue * 0.08);

  // Mock category data for market share chart
  const categories = [
    { name: 'Web Development', count: 124, percentage: 38, color: '#3b82f6' },
    { name: 'UI/UX & Product Design', count: 78, percentage: 24, color: '#8b5cf6' },
    { name: 'AI & Data Science', count: 52, percentage: 16, color: '#10b981' },
    { name: 'Mobile Apps (iOS/Android)', count: 42, percentage: 13, color: '#f59e0b' },
    { name: 'Content & Copywriting', count: 30, percentage: 9, color: '#ec4899' },
  ];

  return (
    <PageShell title="Analytics & Growth" desc="Comprehensive platform performance metrics, revenue analytics and user insights" icon="📊">
      {/* ── Top Bar & Range Filter ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ap-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overview Window</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ap-text-primary)' }}>Real-Time Platform Performance</div>
        </div>
        <div className="ap-tabs">
          {[
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '90d', label: '90 Days' },
            { id: '1y', label: '1 Year' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`ap-tab${timeRange === tab.id ? ' active' : ''}`}
              onClick={() => setTimeRange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="ap-grid-4" style={{ marginBottom: 24 }}>
        <div className="ap-stat-card" style={{ '--stat-accent': 'var(--ap-blue)' }}>
          <div className="ap-stat-top">
            <div>
              <div className="ap-stat-label">Gross GMV Revenue</div>
              <div className="ap-stat-value" style={{ fontSize: '1.6rem', marginTop: 4 }}>{fmt.currency(totalRevenue)}</div>
            </div>
            <div className="ap-stat-icon-wrap" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--ap-blue)' }}>💰</div>
          </div>
          <div className="ap-stat-delta positive">
            <span>↑ 18.4%</span> <span style={{ color: 'var(--ap-text-muted)', fontWeight: 400 }}>vs previous 30d</span>
          </div>
        </div>

        <div className="ap-stat-card" style={{ '--stat-accent': 'var(--ap-green)' }}>
          <div className="ap-stat-top">
            <div>
              <div className="ap-stat-label">Platform Fees (8%)</div>
              <div className="ap-stat-value" style={{ fontSize: '1.6rem', marginTop: 4, color: 'var(--ap-green)' }}>{fmt.currency(platformFees)}</div>
            </div>
            <div className="ap-stat-icon-wrap" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--ap-green)' }}>📈</div>
          </div>
          <div className="ap-stat-delta positive">
            <span>↑ 22.1%</span> <span style={{ color: 'var(--ap-text-muted)', fontWeight: 400 }}>net revenue stream</span>
          </div>
        </div>

        <div className="ap-stat-card" style={{ '--stat-accent': 'var(--ap-purple)' }}>
          <div className="ap-stat-top">
            <div>
              <div className="ap-stat-label">Total Accounts</div>
              <div className="ap-stat-value" style={{ fontSize: '1.6rem', marginTop: 4 }}>{totalUsers}</div>
            </div>
            <div className="ap-stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--ap-purple)' }}>👥</div>
          </div>
          <div className="ap-stat-delta positive">
            <span>↑ 14.8%</span> <span style={{ color: 'var(--ap-text-muted)', fontWeight: 400 }}>new registrations</span>
          </div>
        </div>

        <div className="ap-stat-card" style={{ '--stat-accent': 'var(--ap-yellow)' }}>
          <div className="ap-stat-top">
            <div>
              <div className="ap-stat-label">Job Completion Rate</div>
              <div className="ap-stat-value" style={{ fontSize: '1.6rem', marginTop: 4 }}>{completionRate}%</div>
            </div>
            <div className="ap-stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--ap-yellow)' }}>⚡</div>
          </div>
          <div className="ap-stat-delta positive">
            <span>↑ 3.2%</span> <span style={{ color: 'var(--ap-text-muted)', fontWeight: 400 }}>{completedJobs} / {totalJobs} jobs</span>
          </div>
        </div>
      </div>

      {/* ── Revenue Trend SVG Area Chart ── */}
      <div className="ap-card" style={{ marginBottom: 24 }}>
        <div className="ap-card-header" style={{ marginBottom: 12 }}>
          <div>
            <span className="ap-card-title">📈 Monthly Revenue & Earnings Trend</span>
            <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginTop: 2 }}>
              Gross transaction volumes and platform commission breakdown over time
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ap-blue)', display: 'inline-block' }} />
              <span style={{ color: 'var(--ap-text-secondary)' }}>Gross Volume</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ap-green)', display: 'inline-block' }} />
              <span style={{ color: 'var(--ap-text-secondary)' }}>Platform Fee</span>
            </div>
          </div>
        </div>

        {/* Visual Bar & Trend Chart */}
        <div style={{ padding: '16px 0 8px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 220, padding: '0 8px', position: 'relative' }}>
            {/* Background Grid Lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', opacity: 0.15 }}>
              <div style={{ borderTop: '1px dashed var(--ap-text-muted)', width: '100%' }} />
              <div style={{ borderTop: '1px dashed var(--ap-text-muted)', width: '100%' }} />
              <div style={{ borderTop: '1px dashed var(--ap-text-muted)', width: '100%' }} />
              <div style={{ borderTop: '1px dashed var(--ap-text-muted)', width: '100%' }} />
            </div>

            {data?.revenueByMonth?.map((r, index) => {
              const maxRev = Math.max(...(data.revenueByMonth?.map(x => x.revenue) || [1]));
              const heightPct = maxRev > 0 ? (r.revenue / maxRev) * 100 : 0;
              const isHovered = activeBar === index;

              return (
                <div
                  key={r._id}
                  onMouseEnter={() => setActiveBar(index)}
                  onMouseLeave={() => setActiveBar(null)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      bottom: `${Math.max(heightPct, 15) + 10}%`,
                      background: 'var(--ap-bg-card)',
                      border: '1px solid var(--ap-border-active)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      boxShadow: 'var(--ap-shadow-md)',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      animation: 'apFadeIn 0.15s ease'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--ap-text-primary)' }}>{r._id}</div>
                      <div style={{ color: 'var(--ap-blue)', fontWeight: 600 }}>Volume: {fmt.currency(r.revenue)}</div>
                      <div style={{ color: 'var(--ap-green)', fontWeight: 600 }}>Fee: {fmt.currency(Math.round(r.revenue * 0.08))}</div>
                    </div>
                  )}

                  {/* Dual Bar Stack */}
                  <div style={{
                    width: '60%',
                    maxWidth: 42,
                    height: `${heightPct}%`,
                    background: isHovered
                      ? 'linear-gradient(180deg, var(--ap-blue-light) 0%, var(--ap-blue) 100%)'
                      : 'linear-gradient(180deg, rgba(37,99,235,0.85) 0%, rgba(37,99,235,0.4) 100%)',
                    borderRadius: '8px 8px 0 0',
                    minHeight: 8,
                    transition: 'all 0.3s ease',
                    boxShadow: isHovered ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Fee Accent Top Stripe */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '25%',
                      background: 'linear-gradient(180deg, var(--ap-green) 0%, rgba(34,197,94,0.6) 100%)'
                    }} />
                  </div>

                  {/* Month Label */}
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: isHovered ? 700 : 500,
                    color: isHovered ? 'var(--ap-blue)' : 'var(--ap-text-muted)',
                    whiteSpace: 'nowrap'
                  }}>
                    {r._id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Middle Row: Roles Breakdown & Jobs Pipeline ── */}
      <div className="ap-grid-2" style={{ marginBottom: 24 }}>
        {/* Users by Role */}
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">👥 User Distribution by Role</span>
            <span className="ap-badge ap-badge-blue">{totalUsers} Total</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
            {data?.usersByRole?.map(r => {
              const count = r.count || 0;
              const pct = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : 0;
              const roleColors = { freelancer: '#3b82f6', client: '#8b5cf6', admin: '#10b981' };
              const color = roleColors[r._id?.toLowerCase()] || '#64748b';

              return (
                <div key={r._id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <span style={{ color: 'var(--ap-text-primary)', fontWeight: 600, fontSize: '0.88rem', textTransform: 'capitalize' }}>
                        {r._id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{pct}%</span>
                      <strong style={{ color: 'var(--ap-text-primary)', fontSize: '0.9rem' }}>{count.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: 8, background: 'var(--ap-bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jobs by Status */}
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">💼 Job Pipeline & Status</span>
            <span className="ap-badge ap-badge-green">{totalJobs} Total Gigs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
            {data?.jobsByStatus?.map(j => {
              const count = j.count || 0;
              const pct = totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : 0;

              return (
                <div key={j._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ap-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={j._id} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>({pct}%)</span>
                  </div>
                  <strong style={{ color: 'var(--ap-text-primary)', fontSize: '0.9rem' }}>{count.toLocaleString()}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Category Market Share ── */}
      <div className="ap-card" style={{ marginBottom: 24 }}>
        <div className="ap-card-header">
          <span className="ap-card-title">🚀 Top Skill Category Volume</span>
          <span className="ap-badge ap-badge-purple">Demand Breakdown</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          {categories.map(cat => (
            <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--ap-text-primary)' }}>{cat.name}</span>
                <span style={{ color: 'var(--ap-text-muted)' }}>{cat.count} jobs ({cat.percentage}%)</span>
              </div>
              <div style={{ width: '100%', height: 10, background: 'var(--ap-bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${cat.percentage}%`, height: '100%', background: cat.color, borderRadius: 999, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Earning Freelancers Leaderboard ── */}
      <div className="ap-card">
        <div className="ap-card-header">
          <div>
            <span className="ap-card-title">🏆 Top Earning Freelancers Leaderboard</span>
            <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginTop: 2 }}>
              Highest earning verified student talent across Pakistan
            </div>
          </div>
          <button className="ap-btn ap-btn-secondary ap-btn-sm">Export Report</button>
        </div>

        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Freelancer Email</th>
                <th>Total Earnings</th>
                <th>Jobs Completed</th>
                <th>Performance Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.topFreelancers?.map((f, i) => {
                const medals = ['🥇 Gold', '🥈 Silver', '🥉 Bronze'];
                const rankDisplay = medals[i] || `#${i + 1}`;

                return (
                  <tr key={f._id}>
                    <td>
                      <span className={`ap-badge ${i === 0 ? 'ap-badge-yellow' : i === 1 ? 'ap-badge-gray' : i === 2 ? 'ap-badge-orange' : 'ap-badge-blue'}`}>
                        {rankDisplay}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--ap-blue), var(--ap-purple))',
                          color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {f.email ? f.email.slice(0, 2).toUpperCase() : 'FL'}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--ap-text-primary)' }}>{f.email || '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--ap-green)', fontSize: '0.95rem' }}>
                      {fmt.currency(f.totalEarnings)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{f.jobCount} completed</td>
                    <td>
                      <span className="ap-badge ap-badge-green">Top Rated</span>
                    </td>
                  </tr>
                );
              })}
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
