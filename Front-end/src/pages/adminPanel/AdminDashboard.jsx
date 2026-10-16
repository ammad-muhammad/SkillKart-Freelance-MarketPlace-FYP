import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminDashboard } from '../../api/adminPanel';
import { AdminLoader, AdminEmptyState, StatusBadge, fmt } from '../../Components/adminPanel/AdminCommon';
import useAdminPolling from '../../hooks/useAdminPolling';

// ─── Stat Card ──────────────────────────────────────────────────
const StatCard = ({ label, value, icon, accent = 'var(--ap-blue)', delta, sub }) => (
  <div className="ap-stat-card" style={{ '--stat-accent': accent, '--stat-icon-bg': `${accent}20` }}>
    <div className="ap-stat-top">
      <div className="ap-stat-icon-wrap">{icon}</div>
      {delta != null && (
        <span className={`ap-stat-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString()}
        </span>
      )}
    </div>
    <div>
      <div className="ap-stat-label">{label}</div>
      <div className="ap-stat-value">{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  </div>
);

// ─── Mini Bar ────────────────────────────────────────────────────
const MiniBar = ({ label, value, total, color = 'var(--ap-blue)' }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--ap-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', color: 'var(--ap-text-primary)', fontWeight: 600 }}>{value?.toLocaleString()}</span>
    </div>
    <div style={{ height: 5, background: 'var(--ap-bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${total ? Math.min(100, (value / total) * 100) : 0}%`, background: color, borderRadius: 999, transition: 'width 0.8s ease' }} />
    </div>
  </div>
);

// ─── Activity Item ───────────────────────────────────────────────
const ActivityItem = ({ log }) => {
  const sev = log.severity;
  const color = sev === 'critical' ? 'var(--ap-red)' : sev === 'warning' ? 'var(--ap-yellow)' : 'var(--ap-blue)';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--ap-border)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.83rem', color: 'var(--ap-text-primary)', fontWeight: 500 }}>{log.action?.replace(/\./g, ' › ')}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)', marginTop: 2 }}>{log.notes} • {fmt.relative(log.createdAt)}</div>
      </div>
    </div>
  );
};

// ─── Health Item ─────────────────────────────────────────────────
const HealthRow = ({ label, value, ok }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ap-border)' }}>
    <span style={{ fontSize: '0.83rem', color: 'var(--ap-text-secondary)' }}>{label}</span>
    <span style={{ fontSize: '0.83rem', fontWeight: 600, color: ok == null ? 'var(--ap-text-primary)' : ok ? 'var(--ap-green)' : 'var(--ap-red)' }}>
      {ok != null && (ok ? '● ' : '● ')}{value}
    </span>
  </div>
);

// ─── Dashboard Page ──────────────────────────────────────────────
const AdminDashboard = () => {
  const [stats, setStats]       = useState(null);
  const [today, setToday]       = useState(null);
  const [activity, setActivity] = useState([]);
  const [health, setHealth]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, t, a, h] = await Promise.all([
        adminDashboard.getStats(),
        adminDashboard.getToday(),
        adminDashboard.getRecentActivity(),
        adminDashboard.getHealth()
      ]);
      setStats(s?.stats);
      setToday(t?.today);
      setActivity(a?.activity || []);
      setHealth(h?.health);
      setRefresh(new Date());
    } catch (err) {
      console.error('[Dashboard] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAdminPolling(load, 30_000);

  if (loading) return <AdminLoader message="Loading dashboard…" />;
  if (!stats)  return <AdminEmptyState icon="📭" title="No data available" />;

  const u = stats.users;
  const j = stats.jobs;
  const c = stats.contracts;
  const f = stats.finance;
  const d = stats.disputes;
  const m = stats.moderation;

  return (
    <div>
      {/* Page header */}
      <div className="ap-page-header">
        <div className="ap-page-header-left">
          <h1>Dashboard</h1>
          <p>Platform overview {lastRefresh && `· Last updated ${fmt.relative(lastRefresh)}`}</p>
        </div>
        <div className="ap-page-header-right">
          <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {/* Today's quick numbers */}
      {today && (
        <div className="ap-card" style={{ marginBottom: 20, padding: '14px 20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(11,41,66,0.04))', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ap-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today</span>
            {[
              { label: 'New Users',    val: today.newUsers,          icon: '👤' },
              { label: 'New Jobs',     val: today.newJobs,           icon: '💼' },
              { label: 'New Contracts',val: today.newContracts,      icon: '📋' },
              { label: 'Completed',    val: today.completedContracts,icon: '✅' },
              { label: 'Payments',     val: today.paymentsProcessed, icon: '💳' },
              { label: 'Withdrawals',  val: today.withdrawalsRequested,icon:'💸' },
              { label: 'Reports',      val: today.newReports,        icon: '🚩' }
            ].map(({ label, val, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span>{icon}</span>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ap-text-primary)', lineHeight: 1 }}>{val?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main stat cards */}
      <div className="ap-grid-5" style={{ marginBottom: 20 }}>
        <StatCard label="Total Users"      value={u.total?.toLocaleString()} icon="👥" accent="var(--ap-blue)"   delta={today?.newUsers} sub={`${u.active} online`} />
        <StatCard label="Active Jobs"      value={j.active?.toLocaleString()} icon="💼" accent="var(--ap-purple)" sub={`${j.total} total`} />
        <StatCard label="Active Contracts" value={c.active?.toLocaleString()} icon="📋" accent="var(--ap-teal)"  sub={`${c.completed} completed`} />
        <StatCard label="Platform Revenue" value={fmt.currency(f.platformRevenue)} icon="💰" accent="var(--ap-green)" sub={`${fmt.currency(f.platformFeesToday)} today`} />
        <StatCard label="Open Disputes"    value={d.open?.toLocaleString()} icon="⚠️"  accent={d.open > 0 ? 'var(--ap-red)' : 'var(--ap-green)'} sub={`${d.resolved} resolved`} />
      </div>

      {/* Second row */}
      <div className="ap-grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Freelancers"    value={u.freelancers?.toLocaleString()} icon="🧑‍💻" accent="var(--ap-blue)" />
        <StatCard label="Clients"        value={u.clients?.toLocaleString()}      icon="🏢" accent="var(--ap-purple)" />
        <StatCard label="Escrow Balance" value={fmt.currency(f.escrowBalance)}   icon="🔐" accent="var(--ap-yellow)" />
        <StatCard label="Pending Withdrawals" value={f.pendingWithdrawals?.toLocaleString()} icon="💸" accent={f.pendingWithdrawals > 5 ? 'var(--ap-orange)' : 'var(--ap-green)'} />
      </div>

      {/* 3-column detail row */}
      <div className="ap-grid-3" style={{ marginBottom: 24 }}>
        {/* User breakdown */}
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">👥 User Breakdown</span>
            <Link to="/admin-panel/users" style={{ fontSize: '0.78rem', color: 'var(--ap-text-link)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <MiniBar label="Freelancers" value={u.freelancers} total={u.total} color="var(--ap-blue)" />
          <MiniBar label="Clients"     value={u.clients}     total={u.total} color="var(--ap-purple)" />
          <MiniBar label="Active now"  value={u.active}      total={u.total} color="var(--ap-green)" />
        </div>

        {/* Contracts breakdown */}
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">📋 Contracts</span>
            <Link to="/admin-panel/contracts" style={{ fontSize: '0.78rem', color: 'var(--ap-text-link)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <MiniBar label="Active"    value={c.active}    total={c.active + c.completed + c.cancelled} color="var(--ap-green)" />
          <MiniBar label="Pending"   value={c.pending}   total={c.active + c.completed + c.cancelled} color="var(--ap-yellow)" />
          <MiniBar label="Completed" value={c.completed} total={c.active + c.completed + c.cancelled} color="var(--ap-blue)" />
          <MiniBar label="Cancelled" value={c.cancelled} total={c.active + c.completed + c.cancelled} color="var(--ap-red)" />
        </div>

        {/* Finance summary */}
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">💰 Finance</span>
            <Link to="/admin-panel/payments" style={{ fontSize: '0.78rem', color: 'var(--ap-text-link)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {[
            { label: 'Total Revenue', value: fmt.currency(f.platformRevenue) },
            { label: 'Escrow Held',   value: fmt.currency(f.escrowBalance) },
            { label: 'Wallet Balance',value: fmt.currency(f.totalWalletBalance) },
            { label: 'Pending Payout',value: `${f.pendingWithdrawals} requests` }
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--ap-border)', fontSize: '0.83rem' }}>
              <span style={{ color: 'var(--ap-text-secondary)' }}>{label}</span>
              <span style={{ color: 'var(--ap-text-primary)', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: activity + health */}
      <div className="ap-grid-2">
        {/* Recent activity */}
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">📜 Recent Activity</span>
            <Link to="/admin-panel/audit-logs" style={{ fontSize: '0.78rem', color: 'var(--ap-text-link)', textDecoration: 'none' }}>View logs →</Link>
          </div>
          {activity.length === 0
            ? <div style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>No recent activity</div>
            : activity.slice(0, 12).map(log => <ActivityItem key={log._id} log={log} />)
          }
        </div>

        {/* System health */}
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">📡 System Health</span>
            <Link to="/admin-panel/monitoring" style={{ fontSize: '0.78rem', color: 'var(--ap-text-link)', textDecoration: 'none' }}>Monitoring →</Link>
          </div>
          {health ? (
            <>
              <HealthRow label="Status"      value={health.status}               ok={health.status === 'ok'} />
              <HealthRow label="Database"    value={health.database?.status}     ok={health.database?.healthy} />
              <HealthRow label="Uptime"      value={health.uptimeFormatted}      ok={null} />
              <HealthRow label="Heap Used"   value={`${health.memory?.heapUsedMB} MB`} ok={null} />
              <HealthRow label="Heap Total"  value={`${health.memory?.heapTotalMB} MB`} ok={null} />
              <HealthRow label="Node"        value={health.nodeVersion}           ok={null} />
              <HealthRow label="Environment" value={health.environment}           ok={null} />
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                <span className="ap-badge ap-badge-green">
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                  All Systems Operational
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>Health data unavailable</div>
          )}

          {/* Open reports + disputes alert */}
          {(d.open > 0 || m.openReports > 0) && (
            <div className="ap-alert ap-alert-warning" style={{ marginTop: 16 }}>
              <span className="ap-alert-icon">⚠️</span>
              <div>
                {d.open > 0 && <div><strong>{d.open}</strong> open dispute{d.open !== 1 ? 's' : ''} require attention</div>}
                {m.openReports > 0 && <div><strong>{m.openReports}</strong> pending report{m.openReports !== 1 ? 's' : ''}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
