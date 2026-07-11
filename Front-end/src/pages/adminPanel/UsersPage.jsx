import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminUsers } from '../../api/adminPanel';
import {
  AdminLoader, AdminEmptyState, StatusBadge, AdminPagination,
  ConfirmDialog, ExportButtons, AdminFilterBar, SkeletonTable, AdminUserAvatar, fmt
} from '../../Components/adminPanel/AdminCommon';

const ROLES = ['all', 'freelancer', 'client'];

const UsersPage = () => {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // ── State ──────────────────────────────────────────────────────
  const [users, setUsers]       = useState([]);
  const [pagination, setPag]    = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);

  // Filters
  const [role, setRole]         = useState(sp.get('role') || 'all');
  const [search, setSearch]     = useState(sp.get('search') || '');
  const [isBlocked, setBlocked] = useState(sp.get('isBlocked') || '');
  const [page, setPage]         = useState(Number(sp.get('page')) || 1);

  // Modals
  const [suspendTarget, setSuspendTarget] = useState(null); // user obj
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteTarget, setDeleteTarget]   = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const load = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const p = {
        role: params.role ?? role,
        search: params.search ?? search,
        isBlocked: params.isBlocked ?? isBlocked,
        page: params.page ?? page,
        limit: 20,
        sortBy: 'createdAt', order: 'desc'
      };
      // Remove empty filters
      Object.keys(p).forEach(k => (p[k] === '' || p[k] === 'all') && delete p[k]);

      const res = await adminUsers.list(p);
      setUsers(res?.users || []);
      setPag(res?.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
    } catch (err) {
      console.error('[Users] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [role, search, isBlocked, page]);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ────────────────────────────────────────────────────
  const changeRole = (r) => { setRole(r); setPage(1); };
  const handleSearch = (e) => { if (e.key === 'Enter') { setPage(1); load({ search: e.target.value, page: 1 }); } };

  const doSuspend = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      if (suspendTarget.isBlocked) {
        await adminUsers.unsuspend(suspendTarget._id);
      } else {
        await adminUsers.suspend(suspendTarget._id, suspendReason);
      }
      setSuspendTarget(null); setSuspendReason('');
      load();
    } catch (err) {
      alert(err?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await adminUsers.delete(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = (format) => {
    const params = new URLSearchParams({ format });
    if (role && role !== 'all') params.set('role', role);
    if (search) params.set('search', search);
    window.open(`/api/v1/admin-panel/users/export?${params}`, '_blank');
  };

  return (
    <div>
      {/* Page header */}
      <div className="ap-page-header">
        <div className="ap-page-header-left">
          <h1>Users</h1>
          <p>Manage all platform users — freelancers, clients</p>
        </div>
        <div className="ap-page-header-right">
          <ExportButtons onExport={handleExport} />
        </div>
      </div>

      {/* Role tabs */}
      <div className="ap-tabs" style={{ marginBottom: 16 }}>
        {ROLES.map(r => (
          <button
            key={r}
            className={`ap-tab${role === r ? ' active' : ''}`}
            onClick={() => changeRole(r)}
          >
            {r === 'all' ? '🌐 All' : r === 'freelancer' ? '🧑‍💻 Freelancers' : '🏢 Clients'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <AdminFilterBar>
        <input
          className="ap-input"
          style={{ maxWidth: 260 }}
          placeholder="Search email, name…"
          defaultValue={search}
          onKeyDown={handleSearch}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="ap-select"
          style={{ maxWidth: 160 }}
          value={isBlocked}
          onChange={e => { setBlocked(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
        <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => load()}>
          🔄 Refresh
        </button>
      </AdminFilterBar>

      {/* Table */}
      <div className="ap-card" style={{ padding: 0 }}>
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={8} cols={5} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <AdminEmptyState icon="👥" title="No users found" desc="Try adjusting your search or filters" />
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AdminUserAvatar email={user.email} firstName={user.firstName} lastName={user.lastName} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ap-text-primary)' }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--ap-text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`ap-badge ${user.role === 'freelancer' ? 'ap-badge-blue' : 'ap-badge-purple'}`}>
                      {user.role === 'freelancer' ? '🧑‍💻' : '🏢'} {user.role}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={user.isBlocked ? 'suspended' : user.deletedAt ? 'deleted' : 'active'} />
                    {!user.isEmailVerified && <span className="ap-badge ap-badge-yellow" style={{ marginLeft: 6 }}>Unverified</span>}
                  </td>
                  <td style={{ color: 'var(--ap-text-muted)', fontSize: '0.82rem' }}>
                    {fmt.date(user.createdAt)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="ap-btn ap-btn-secondary ap-btn-sm"
                        onClick={() => navigate(`/admin-panel/users/${user._id}`)}
                        title="View details"
                      >
                        👁
                      </button>
                      <button
                        className={`ap-btn ap-btn-sm ${user.isBlocked ? 'ap-btn-success' : 'ap-btn-danger'}`}
                        onClick={() => setSuspendTarget(user)}
                        title={user.isBlocked ? 'Unsuspend' : 'Suspend'}
                      >
                        {user.isBlocked ? '✅' : '⛔'}
                      </button>
                      {!user.deletedAt && (
                        <button
                          className="ap-btn ap-btn-danger ap-btn-sm"
                          onClick={() => setDeleteTarget(user)}
                          title="Delete"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <AdminPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          onPage={(p) => { setPage(p); load({ page: p }); }}
        />
      </div>

      {/* Suspend / Unsuspend dialog */}
      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => { setSuspendTarget(null); setSuspendReason(''); }}
        onConfirm={doSuspend}
        title={suspendTarget?.isBlocked ? 'Unsuspend User' : 'Suspend User'}
        confirmLabel={suspendTarget?.isBlocked ? 'Unsuspend' : 'Suspend'}
        confirmClass={suspendTarget?.isBlocked ? 'ap-btn-success' : 'ap-btn-danger'}
        loading={busy}
      >
        {suspendTarget && (
          <>
            <p style={{ color: 'var(--ap-text-secondary)', fontSize: '0.88rem', margin: '0 0 12px' }}>
              {suspendTarget.isBlocked ? 'This will restore access for' : 'This will block access for'}{' '}
              <strong style={{ color: 'var(--ap-text-primary)' }}>{suspendTarget.email}</strong>
            </p>
            {!suspendTarget.isBlocked && (
              <div className="ap-form-group">
                <label className="ap-label">Reason (required)</label>
                <textarea
                  className="ap-textarea"
                  style={{ minHeight: 70 }}
                  placeholder="Enter reason for suspension…"
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  required
                />
              </div>
            )}
          </>
        )}
      </ConfirmDialog>

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete User"
        message={`This will soft-delete ${deleteTarget?.email}. Their data is preserved. This action can be reviewed in audit logs.`}
        confirmLabel="Delete"
        loading={busy}
      />
    </div>
  );
};

export default UsersPage;
