/**
 * Admin panel DETAIL pages — one record per page, reached from the list tables.
 * These back the routes the list pages already navigate to
 * (/admin-panel/users/:id, /jobs/:id, /contracts/:id, /disputes/:id,
 *  /reports/:id, /chat/:conversationId) which previously 404'd.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AdminLoader, AdminEmptyState, StatusBadge, ConfirmDialog, AdminModal,
  AdminUserAvatar, AdminTimeline, fmt
} from '../../Components/adminPanel/AdminCommon';
import {
  adminUsers, adminJobs, adminContracts, adminDisputes,
  adminReports, adminChat, adminWallets, adminPayments
} from '../../api/adminPanel';
import { JOB_CATEGORIES } from '../../constants/jobCategories';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import { safeToast as toast } from '../../utils/safeToast';
import { downloadFile } from '../../utils/downloadFile';
import { openExternal } from '../../utils/externalLink';

// ─── Shared bits ───────────────────────────────────────────────
const BackButton = ({ to, label }) => {
  const navigate = useNavigate();
  return (
    <button
      className="ap-btn ap-btn-secondary ap-btn-sm"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      style={{ marginBottom: 16 }}
    >
      ← {label || 'Back'}
    </button>
  );
};

const DetailHeader = ({ icon, title, subtitle, actions }) => (
  <div className="ap-page-header">
    <div className="ap-page-header-left">
      <h1>{icon} {title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="ap-page-header-right" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

// key/value row list
const InfoRow = ({ label, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--ap-border)', fontSize: '0.85rem' }}>
    <span style={{ color: 'var(--ap-text-secondary)' }}>{label}</span>
    <span style={{ color: 'var(--ap-text-primary)', fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{children ?? '—'}</span>
  </div>
);

const Card = ({ title, right, children, style }) => (
  <div className="ap-card" style={style}>
    {title && (
      <div className="ap-card-header">
        <span className="ap-card-title">{title}</span>
        {right}
      </div>
    )}
    {children}
  </div>
);

const userLabel = (u) => u ? ([u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—') : '—';

// True when a URL points at an image — used to render attachments as thumbnails.
const isImage = (url = '') => /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url);

// Renders a list of attachment URLs: image URLs become thumbnails, the rest links.
const AttachmentGrid = ({ urls = [] }) => {
  if (!urls.length) return null;
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {urls.map((a, i) => {
        const url = typeof a === 'string' ? a : (a?.url || a?.path || '');
        const name = (typeof a === 'object' && a?.name) || `Attachment ${i + 1}`;
        if (isImage(url)) {
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer" title={name}>
              <img src={url} alt={name} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ap-border)' }} />
            </a>
          );
        }
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--ap-text-link)', wordBreak: 'break-all' }}>📎 {name}</a>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// USER DETAIL
// ═══════════════════════════════════════════════════════════════
export const UserDetailPage = () => {
  const { id } = useParams();
  const [data, setData]       = useState(null);   // { user, stats }
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab]         = useState('overview');
  const [tabData, setTabData] = useState({});      // { contracts, jobs, payments, wallet, reports, activity }
  const [tabLoading, setTabLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [walletTarget, setWalletTarget] = useState(null); // userId when adjusting wallet
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUsers.getById(id);
      if (res?.user) setData({ user: res.user, stats: res.stats });
      else setNotFound(true);
    } catch (e) {
      if (e?.status === 404) setNotFound(true);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // run a mutating action then refresh, surfacing errors
  const userAction = async (fn) => {
    setBusy(true);
    try { await fn(); await load(); }
    catch (e) { toast.error(e?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  // lazy-load each tab once
  const loadTab = useCallback(async (t) => {
    if (t === 'overview' || tabData[t]) { setTab(t); return; }
    setTab(t); setTabLoading(true);
    try {
      let res, key;
      if (t === 'contracts') { res = await adminUsers.getContracts(id); key = 'contracts'; }
      else if (t === 'jobs')     { res = await adminUsers.getJobs(id);     key = 'jobs'; }
      else if (t === 'payments') { res = await adminUsers.getPayments(id); key = 'payments'; }
      else if (t === 'wallet')   { res = await adminUsers.getWallet(id);   key = 'wallet'; }
      else if (t === 'reports')  { res = await adminUsers.getReports(id);  key = 'reports'; }
      else if (t === 'activity') { res = await adminUsers.getActivity(id); key = 'activity'; }
      setTabData(prev => ({ ...prev, [t]: res?.[key] ?? [] }));
    } catch { setTabData(prev => ({ ...prev, [t]: [] })); }
    finally { setTabLoading(false); }
  }, [id, tabData]);

  if (loading) return <AdminLoader message="Loading user…" />;
  if (notFound || !data) return (
    <div><BackButton to="/admin-panel/users" label="Back to Users" /><AdminEmptyState icon="👤" title="User not found" /></div>
  );

  const { user, stats } = data;
  const hasProfileRole = user.role === 'freelancer' || user.role === 'client';
  const TABS = ['overview',
    ...(hasProfileRole ? ['profile', 'verification'] : []),
    'contracts', 'jobs', 'payments', 'wallet', 'reports', 'activity'];

  return (
    <div>
      <BackButton to="/admin-panel/users" label="Back to Users" />
      <DetailHeader
        icon="👤"
        title={userLabel(user)}
        subtitle={user.email}
        actions={<>
          <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy} onClick={() => setEditOpen(true)}>✏️ Edit Account</button>
          {(user.role === 'freelancer' || user.role === 'client') &&
            <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy} onClick={() => setProfileEditOpen(true)}>📝 Edit Profile</button>}
          <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => setMessageOpen(true)}>💬 Message</button>
          <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => setWalletTarget(user._id)}>💰 Adjust Wallet</button>
          {user.isEmailVerified
            ? <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => userAction(() => adminUsers.verifyEmail(id, false))}>✉️ Unverify Email</button>
            : <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => userAction(() => adminUsers.verifyEmail(id, true))}>✅ Verify Email</button>}
          {user.isBlocked
            ? <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => userAction(() => adminUsers.unsuspend(id))}>✅ Unsuspend</button>
            : <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy} onClick={() => {
                const r = prompt('Reason for suspension? (min 5 chars)');
                if (r && r.trim().length >= 5) userAction(() => adminUsers.suspend(id, r.trim()));
                else if (r != null) toast.error('Reason must be at least 5 characters.');
              }}>⛔ Suspend</button>}
          {!user.deletedAt && <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy} onClick={() => {
            if (confirm(`Soft-delete ${user.email}? Data is preserved and reviewable in audit logs.`)) userAction(() => adminUsers.delete(id));
          }}>🗑 Delete</button>}
        </>}
      />

      {/* Summary strip */}
      <div className="ap-card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <AdminUserAvatar email={user.email} firstName={user.firstName} lastName={user.lastName} src={user.profilePicture} size={56} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`ap-badge ${user.role === 'freelancer' ? 'ap-badge-blue' : 'ap-badge-purple'}`}>{user.role}</span>
          <StatusBadge status={user.deletedAt ? 'deleted' : user.isBlocked ? 'suspended' : 'active'} />
          {!user.isEmailVerified && <span className="ap-badge ap-badge-yellow">Unverified</span>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Contracts', val: stats?.contractCount },
            { label: 'Jobs',      val: stats?.jobCount },
            { label: 'Payments',  val: stats?.paymentCount },
            { label: 'Reports',   val: stats?.reportCount }
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ap-text-primary)' }}>{s.val ?? 0}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ap-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="ap-tabs" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} className={`ap-tab${tab === t ? ' active' : ''}`} onClick={() => loadTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="ap-grid-2">
          <Card title="Account">
            <InfoRow label="First name">{user.firstName}</InfoRow>
            <InfoRow label="Last name">{user.lastName}</InfoRow>
            <InfoRow label="Username">{user.username}</InfoRow>
            <InfoRow label="Email">{user.email}</InfoRow>
            <InfoRow label="Phone">{user.phone}</InfoRow>
            <InfoRow label="Role">{user.role}</InfoRow>
            <InfoRow label="Email verified">{user.isEmailVerified ? 'Yes' : 'No'}</InfoRow>
            <InfoRow label="Joined">{fmt.datetime(user.createdAt)}</InfoRow>
            {user.isBlocked && <InfoRow label="Suspended reason">{user.suspendedReason || user.blockedReason}</InfoRow>}
            {user.deletedAt && <InfoRow label="Deleted at">{fmt.datetime(user.deletedAt)}</InfoRow>}
          </Card>
          <Card title="Profile">
            {user.profile ? (
              <>
                {user.role === 'freelancer' && <>
                  <InfoRow label="Title">{user.profile.title || user.profile.headline}</InfoRow>
                  <InfoRow label="Hourly rate">{user.profile.hourlyRate != null ? fmt.currency(user.profile.hourlyRate) : '—'}</InfoRow>
                  <InfoRow label="Rating">{user.profile.rating != null ? `${user.profile.rating} ★` : 'New'}</InfoRow>
                  <InfoRow label="Wallet balance">{fmt.currency(user.profile.walletBalance)}</InfoRow>
                  <InfoRow label="Total earnings">{fmt.currency(user.profile.totalEarnings)}</InfoRow>
                </>}
                {user.role === 'client' && <>
                  <InfoRow label="Company">{user.profile.companyName}</InfoRow>
                  <InfoRow label="Industry">{Array.isArray(user.profile.industry) ? user.profile.industry.join(', ') : user.profile.industry}</InfoRow>
                  <InfoRow label="Wallet balance">{fmt.currency(user.profile.walletBalance)}</InfoRow>
                  <InfoRow label="Total spent">{fmt.currency(user.profile.totalSpent)}</InfoRow>
                  <InfoRow label="Funding flags">
                    {user.profile.fundingFlags?.length > 0 ? (
                      <span className="ap-badge ap-badge-yellow" title={user.profile.fundingFlags.map(f => f.reason).filter(Boolean).join(' · ')}>
                        ⚠️ {user.profile.fundingFlags.length} — never funded a disputed milestone
                      </span>
                    ) : 'None'}
                  </InfoRow>
                </>}
                <InfoRow label="Wallet frozen">{user.profile.isFrozenWallet ? 'Yes' : 'No'}</InfoRow>
              </>
            ) : <AdminEmptyState icon="📭" title="No profile" desc="This user has not completed onboarding." />}
          </Card>
        </div>
      )}

      {tab === 'profile' && <ProfilePanel user={user} onEdit={() => setProfileEditOpen(true)} onAvatar={load} />}

      {tab === 'verification' && <VerificationPanel user={user} onChange={load} />}

      {!['overview', 'profile', 'verification'].includes(tab) && (
        <Card>
          {tabLoading ? <AdminLoader /> : (
            <SubResourceTable tab={tab} rows={tabData[tab]} onAdjustWallet={() => setWalletTarget(user._id)} />
          )}
        </Card>
      )}

      <EditUserModal open={editOpen} user={user} onClose={() => setEditOpen(false)} onSaved={load} />
      <EditProfileModal open={profileEditOpen} user={user} onClose={() => setProfileEditOpen(false)} onSaved={load} />
      <MessageUserModal open={messageOpen} user={user} onClose={() => setMessageOpen(false)} />
      <AdjustWalletModal
        open={!!walletTarget}
        userId={walletTarget}
        onClose={() => setWalletTarget(null)}
        onSaved={() => { setWalletTarget(null); load(); setTabData(prev => ({ ...prev, wallet: undefined })); }}
      />
    </div>
  );
};

// ─── Edit User modal ───────────────────────────────────────────
export const EditUserModal = ({ open, user, onClose, onSaved }) => {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  useEffect(() => {
    if (open && user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        role: user.role || 'client',
        isEmailVerified: !!user.isEmailVerified
      });
      setErr('');
    }
  }, [open, user]);

  const save = async () => {
    setErr('');
    setBusy(true);
    try {
      await adminUsers.edit(user._id, form);
      onSaved?.();
      onClose();
    } catch (e) { setErr(e?.message || 'Failed to update user'); }
    finally { setBusy(false); }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <AdminModal open={open} onClose={onClose} title="Edit User"
      footer={<>
        <button className="ap-btn ap-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ap-btn ap-btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
      </>}>
      {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">First name</label>
          <input className="ap-input" value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Last name</label>
          <input className="ap-input" value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} />
        </div>
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Phone</label>
        <input className="ap-input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Role</label>
        <CustomSelect
          value={form.role || 'client'}
          onChange={val => set('role', val)}
          options={['client', 'freelancer']}
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--ap-text-secondary)', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!form.isEmailVerified} onChange={e => set('isEmailVerified', e.target.checked)} />
        Email verified
      </label>
    </AdminModal>
  );
};

// ─── Adjust Wallet modal ───────────────────────────────────────
export const AdjustWalletModal = ({ open, userId, onClose, onSaved }) => {
  const [dir, setDir]     = useState('credit');   // credit | debit
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  useEffect(() => { if (open) { setDir('credit'); setAmount(''); setReason(''); setNotes(''); setErr(''); } }, [open]);

  const save = async () => {
    setErr('');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setErr('Enter an amount greater than zero.');
    if (reason.trim().length < 5) return setErr('Reason must be at least 5 characters.');
    setBusy(true);
    try {
      await adminWallets.adjust(userId, {
        amount: dir === 'debit' ? -Math.abs(amt) : Math.abs(amt),
        reason: reason.trim(),
        notes: notes.trim() || undefined
      });
      onSaved?.();
    } catch (e) { setErr(e?.message || 'Failed to adjust wallet'); }
    finally { setBusy(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Adjust Wallet"
      footer={<>
        <button className="ap-btn ap-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={`ap-btn ${dir === 'debit' ? 'ap-btn-danger' : 'ap-btn-success'}`} onClick={save} disabled={busy}>
          {busy ? 'Applying…' : dir === 'debit' ? 'Debit Wallet' : 'Credit Wallet'}
        </button>
      </>}>
      {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}
      <div className="ap-form-group">
        <label className="ap-label">Direction</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={`ap-btn ap-btn-sm ${dir === 'credit' ? 'ap-btn-success' : 'ap-btn-secondary'}`} onClick={() => setDir('credit')}>+ Credit</button>
          <button type="button" className={`ap-btn ap-btn-sm ${dir === 'debit' ? 'ap-btn-danger' : 'ap-btn-secondary'}`} onClick={() => setDir('debit')}>− Debit</button>
        </div>
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Amount (PKR)</label>
        <input className="ap-input" type="number" min="0" max="1000000" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Reason (required, min 5 chars)</label>
        <input className="ap-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Manual refund for dispute #123" />
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Internal notes (optional)</label>
        <textarea className="ap-textarea" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 60 }} />
      </div>
    </AdminModal>
  );
};

// ─── Message User modal (chat with a user as "SkillKart Support") ─
export const MessageUserModal = ({ open, user, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]  = useState('');

  // On open, find the existing support↔user thread (if any) and load it.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setMessages([]); setConversationId(null); setText(''); setErr(''); setLoading(true);
    adminChat.list({ userId: user._id, limit: 50 }).then(res => {
      if (cancelled) return;
      // find the support thread among this user's conversations
      const convos = res?.conversations || [];
      const support = convos.find(c => (c.participants || []).some(p => p?.email === 'support@skillkart.system'));
      if (support) {
        setConversationId(support._id);
        return adminChat.getMessages(support._id).then(m => { if (!cancelled) setMessages(m?.messages || []); });
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, user]);

  const send = async () => {
    if (!text.trim()) return;
    setErr(''); setBusy(true);
    try {
      const res = await adminChat.send(user._id, text.trim());
      setText('');
      const cid = res?.conversationId || conversationId;
      setConversationId(cid);
      if (cid) { const m = await adminChat.getMessages(cid); setMessages(m?.messages || []); }
    } catch (e) { setErr(e?.message || 'Failed to send'); }
    finally { setBusy(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title={`Message ${userLabel(user)}`} size="lg"
      footer={<button className="ap-btn ap-btn-secondary" onClick={onClose}>Close</button>}>
      <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginBottom: 12 }}>
        Sent as <strong>SkillKart Support</strong> — the user sees this in their normal inbox and can reply.
      </div>
      {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}

      <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--ap-border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        {loading ? <AdminLoader /> : messages.length === 0
          ? <AdminEmptyState icon="💬" title="No messages yet" desc="Start the conversation below." />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{messages.map(m => <MessageRow key={m._id} m={m} />)}</div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <textarea className="ap-textarea" style={{ minHeight: 44, flex: 1 }} placeholder="Type a message…"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="ap-btn ap-btn-primary" onClick={send} disabled={busy || !text.trim()}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
    </AdminModal>
  );
};

// ─── hook: load the full role profile for a user ───────────────
const useUserProfile = (userId, deps = []) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { const res = await adminUsers.getProfile(userId); setProfile(res?.profile || null); }
    catch { setProfile(null); }
    finally { setLoading(false); }
  }, [userId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload, ...deps]);
  return { profile, loading, reload };
};

// ─── Profile panel (read view of the full profile) ─────────────
export const ProfilePanel = ({ user, onEdit, onAvatar }) => {
  const { profile, loading } = useUserProfile(user._id);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const isFreelancer = user.role === 'freelancer';

  const setAvatar = async () => {
    const url = prompt('Avatar image URL (leave blank to remove):', user.profilePicture || '');
    if (url === null) return;
    setAvatarBusy(true);
    try { await adminUsers.updateAvatar(user._id, url.trim() || null); onAvatar?.(); }
    catch (e) { toast.error(e?.message || 'Failed to update avatar'); }
    finally { setAvatarBusy(false); }
  };

  if (loading) return <Card><AdminLoader /></Card>;
  if (!profile) return (
    <Card>
      <AdminEmptyState icon="📭" title="No profile yet" desc="This user hasn't completed onboarding. You can create it by clicking Edit Profile." />
      <div style={{ textAlign: 'center', marginTop: 12 }}><button className="ap-btn ap-btn-primary ap-btn-sm" onClick={onEdit}>📝 Edit / Create Profile</button></div>
    </Card>
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={onEdit}>📝 Edit Profile</button>
        <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={avatarBusy} onClick={setAvatar}>🖼 Update Avatar</button>
      </div>

      {isFreelancer ? (
        <>
          <div className="ap-grid-2" style={{ marginBottom: 20 }}>
            <Card title="Freelancer Details">
              <InfoRow label="Title">{profile.title}</InfoRow>
              <InfoRow label="Hourly rate">{profile.hourlyRate != null ? fmt.currency(profile.hourlyRate) : '—'}</InfoRow>
              <InfoRow label="Experience">{profile.experienceLevel}</InfoRow>
              <InfoRow label="Availability">{profile.availability}</InfoRow>
              <InfoRow label="Timezone">{profile.timezone}</InfoRow>
              <InfoRow label="Rating">{profile.rating ? `${profile.rating} ★` : 'New'}</InfoRow>
              <div style={{ paddingTop: 10 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 4 }}>Bio</div>
                <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{profile.bio || '—'}</div>
              </div>
            </Card>
            <Card title={`Skills (${profile.skills?.length || 0})`}>
              {profile.skills?.length ? profile.skills.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--ap-border)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{s.name} <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.75rem' }}>· {s.level}</span></span>
                  <span>{s.isVerified ? <StatusBadge status="verified" /> : <span className="ap-badge ap-badge-gray">unverified</span>}{s.verificationScore ? <span style={{ fontSize: '0.72rem', color: 'var(--ap-text-muted)', marginLeft: 6 }}>{s.verificationScore}%</span> : null}</span>
                </div>
              )) : <AdminEmptyState icon="🧩" title="No skills" />}
            </Card>
          </div>

          <div className="ap-grid-2">
            <Card title={`Portfolio (${profile.portfolio?.length || 0})`}>
              {profile.portfolio?.length ? profile.portfolio.map((p, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--ap-border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{p.description}</div>
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: 'var(--ap-text-link)' }}>{p.url}</a>}
                </div>
              )) : <AdminEmptyState icon="🎨" title="No portfolio" />}
            </Card>
            <Card title="Education & Languages">
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Education</div>
              {profile.education?.length ? profile.education.map((e, i) => (
                <div key={i} style={{ fontSize: '0.82rem', marginBottom: 6 }}>{e.degree} {e.field && `· ${e.field}`} — {e.institution}</div>
              )) : <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)', marginBottom: 10 }}>None</div>}
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', margin: '12px 0 6px' }}>Languages</div>
              {profile.languages?.length ? profile.languages.map((l, i) => (
                <span key={i} className="ap-badge ap-badge-gray" style={{ marginRight: 6 }}>{l.language} · {l.proficiency}</span>
              )) : <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>None</span>}
            </Card>
          </div>
        </>
      ) : (
        <div className="ap-grid-2">
          <Card title="Company">
            <InfoRow label="Company">{profile.companyName}</InfoRow>
            <InfoRow label="Type">{profile.companyType}</InfoRow>
            <InfoRow label="Size">{profile.companySize}</InfoRow>
            <InfoRow label="Industry">{Array.isArray(profile.industry) ? profile.industry.join(', ') : profile.industry}</InfoRow>
            <InfoRow label="Website">{profile.website}</InfoRow>
            <InfoRow label="Role at company">{profile.role}</InfoRow>
          </Card>
          <Card title="Details">
            <InfoRow label="Country">{profile.location?.country}</InfoRow>
            <InfoRow label="City">{profile.location?.city}</InfoRow>
            <InfoRow label="Budget range">{profile.budgetRange ? `${fmt.currency(profile.budgetRange.min)} – ${fmt.currency(profile.budgetRange.max)}` : '—'}</InfoRow>
            <InfoRow label="Timezone">{profile.timezone}</InfoRow>
            <div style={{ paddingTop: 10 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{profile.description || '—'}</div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

// ─── Verification panel (direct grants) ────────────────────────
export const VerificationPanel = ({ user, onChange }) => {
  const { profile, loading, reload } = useUserProfile(user._id);
  const [busy, setBusy] = useState(false);
  const isFreelancer = user.role === 'freelancer';

  const act = async (fn) => {
    setBusy(true);
    try { await fn(); await reload(); onChange?.(); }
    catch (e) { toast.error(e?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <Card><AdminLoader /></Card>;

  const vd = profile?.verificationDetails || {};
  const FLAGS = [
    ['identityVerified', 'Identity / KYC'],
    ['phoneVerified', 'Phone verified'],
    ['portfolioReviewed', 'Portfolio reviewed'],
    ['paymentMethodAdded', 'Payment method added']
  ];

  return (
    <>
      <Card title="Account Verification" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--ap-border)' }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Email verified</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--ap-text-muted)' }}>Bypass the OTP step and mark the email confirmed.</div>
          </div>
          {user.isEmailVerified
            ? <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => act(() => adminUsers.verifyEmail(user._id, false))}>Unverify</button>
            : <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => act(() => adminUsers.verifyEmail(user._id, true))}>✅ Verify now</button>}
        </div>

        {profile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Overall status</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--ap-text-muted)' }}>Force the aggregate verification status.</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <StatusBadge status={profile.verificationStatus} />
              <CustomSelect
                compact
                disabled={busy}
                value={profile.verificationStatus || 'unverified'}
                onChange={val => act(() => adminUsers.setVerification(user._id, { status: val }))}
                options={['unverified', 'pending', 'verified', ...(isFreelancer ? [] : ['rejected'])]}
              />
            </div>
          </div>
        )}
      </Card>

      {isFreelancer && profile && (
        <>
          <Card title="Verification Checklist" style={{ marginBottom: 20 }}>
            {FLAGS.map(([key, label]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--ap-border)' }}>
                <span style={{ fontSize: '0.85rem' }}>{label}</span>
                <button className={`ap-btn ap-btn-sm ${vd[key] ? 'ap-btn-success' : 'ap-btn-secondary'}`} disabled={busy}
                  onClick={() => act(() => adminUsers.setVerification(user._id, { flags: { [key]: !vd[key] } }))}>
                  {vd[key] ? '✅ Yes' : '⬜ No'}
                </button>
              </div>
            ))}
            <div style={{ fontSize: '0.74rem', color: 'var(--ap-text-muted)', marginTop: 8 }}>
              Auto-computed: email {vd.emailVerified ? '✓' : '✗'} · onboarding {vd.onboardingCompleted ? '✓' : '✗'} · profile {vd.profileCompleted ? '✓' : '✗'} · all skills passed {vd.allSkillTestsPassed ? '✓' : '✗'}
            </div>
          </Card>

          <Card title={`Skill Tests (${profile.skills?.length || 0})`}
            right={profile.skills?.length ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => act(() => adminUsers.verifySkill(user._id, { all: true, verified: true, score: 100 }))}>Pass all</button>
                <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => act(() => adminUsers.verifySkill(user._id, { all: true, verified: false }))}>Reset all</button>
              </div>
            ) : null}>
            {profile.skills?.length ? profile.skills.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--ap-border)' }}>
                <span style={{ fontSize: '0.85rem' }}>
                  {s.name} <span style={{ color: 'var(--ap-text-muted)', fontSize: '0.75rem' }}>· {s.level}{s.verificationScore ? ` · ${s.verificationScore}%` : ''}</span>
                </span>
                {s.isVerified
                  ? <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => act(() => adminUsers.verifySkill(user._id, { skill: s.name, verified: false }))}>Reset</button>
                  : <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy} onClick={() => { const sc = prompt(`Pass "${s.name}" with score % (default 100):`, '100'); if (sc !== null) act(() => adminUsers.verifySkill(user._id, { skill: s.name, verified: true, score: Number(sc) || 100 })); }}>✅ Pass test</button>}
              </div>
            )) : <AdminEmptyState icon="🧩" title="No skills to test" desc="Add skills via Edit Profile first." />}
          </Card>
        </>
      )}
    </>
  );
};

// ─── Edit Profile modal (role-aware full editor) ───────────────
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Expert'];
const PROFICIENCY = ['basic', 'conversational', 'fluent', 'native'];

export const EditProfileModal = ({ open, user, onClose, onSaved }) => {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');
  const isFreelancer = user?.role === 'freelancer';

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setForm(null); setErr('');
    adminUsers.getProfile(user._id).then(res => {
      if (cancelled) return;
      const p = res?.profile || {};
      if (isFreelancer) {
        setForm({
          bio: p.bio || '', title: p.title || '', phone: p.phone || '',
          hourlyRate: p.hourlyRate ?? '', experienceLevel: p.experienceLevel || 'Entry',
          availability: p.availability || 'full-time', timezone: p.timezone || '',
          skills: (p.skills || []).map(s => ({ name: s.name || '', level: s.level || 'Beginner' })),
          portfolioLinks: (p.portfolioLinks || []).join('\n'),
          socialLinks: { github: p.socialLinks?.github || '', linkedin: p.socialLinks?.linkedin || '', twitter: p.socialLinks?.twitter || '', website: p.socialLinks?.website || '' },
          languages: (p.languages || []).map(l => ({ language: l.language || '', proficiency: l.proficiency || 'conversational' }))
        });
      } else {
        setForm({
          companyName: p.companyName || '', companyType: p.companyType || 'Individual',
          companySize: p.companySize || '', website: p.website || '', phone: p.phone || '',
          description: p.description || '', role: p.role || '',
          industry: Array.isArray(p.industry) ? p.industry.join(', ') : (p.industry || ''),
          timezone: p.timezone || '',
          location: { country: p.location?.country || '', city: p.location?.city || '', address: p.location?.address || '' },
          budgetRange: { min: p.budgetRange?.min ?? '', max: p.budgetRange?.max ?? '' }
        });
      }
    }).catch(() => setForm(isFreelancer ? {} : {}));
    return () => { cancelled = true; };
  }, [open, user, isFreelancer]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setNested = (obj, k, v) => setForm(prev => ({ ...prev, [obj]: { ...prev[obj], [k]: v } }));

  // skills array editors
  const setSkill = (i, k, v) => setForm(prev => { const skills = [...prev.skills]; skills[i] = { ...skills[i], [k]: v }; return { ...prev, skills }; });
  const addSkill = () => setForm(prev => ({ ...prev, skills: [...(prev.skills || []), { name: '', level: 'Beginner' }] }));
  const removeSkill = (i) => setForm(prev => ({ ...prev, skills: prev.skills.filter((_, x) => x !== i) }));
  const setLang = (i, k, v) => setForm(prev => { const languages = [...prev.languages]; languages[i] = { ...languages[i], [k]: v }; return { ...prev, languages }; });
  const addLang = () => setForm(prev => ({ ...prev, languages: [...(prev.languages || []), { language: '', proficiency: 'conversational' }] }));
  const removeLang = (i) => setForm(prev => ({ ...prev, languages: prev.languages.filter((_, x) => x !== i) }));

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      let payload;
      if (isFreelancer) {
        payload = {
          bio: form.bio, title: form.title, phone: form.phone,
          hourlyRate: form.hourlyRate === '' ? undefined : Number(form.hourlyRate),
          experienceLevel: form.experienceLevel, availability: form.availability, timezone: form.timezone,
          // keep only skills with a name; new skills default to unverified (admin can grant via Verification tab)
          skills: (form.skills || []).filter(s => s.name.trim()).map(s => ({ name: s.name.trim(), level: s.level })),
          portfolioLinks: form.portfolioLinks.split('\n').map(l => l.trim()).filter(Boolean),
          socialLinks: form.socialLinks,
          languages: (form.languages || []).filter(l => l.language.trim())
        };
      } else {
        payload = {
          companyName: form.companyName, companyType: form.companyType, companySize: form.companySize,
          website: form.website, phone: form.phone, description: form.description, role: form.role,
          industry: form.industry.split(',').map(s => s.trim()).filter(Boolean),
          timezone: form.timezone, location: form.location,
          budgetRange: { min: Number(form.budgetRange.min) || 0, max: Number(form.budgetRange.max) || 0 }
        };
      }
      await adminUsers.updateProfile(user._id, payload);
      onSaved?.(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to save profile'); }
    finally { setBusy(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title={`Edit ${isFreelancer ? 'Freelancer' : 'Client'} Profile`} size="lg"
      footer={<>
        <button className="ap-btn ap-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ap-btn ap-btn-primary" onClick={save} disabled={busy || !form}>{busy ? 'Saving…' : 'Save Profile'}</button>
      </>}>
      {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}
      {!form ? <AdminLoader /> : isFreelancer ? (
        <>
          <div className="ap-form-group"><label className="ap-label">Professional title</label><input className="ap-input" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div className="ap-form-group"><label className="ap-label">Bio</label><textarea className="ap-textarea" value={form.bio} onChange={e => set('bio', e.target.value)} style={{ minHeight: 90 }} /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Hourly rate (PKR)</label><input className="ap-input" type="number" min="1" max="100000" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Phone</label><input className="ap-input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Experience</label>
              <CustomSelect value={form.experienceLevel} onChange={val => set('experienceLevel', val)} options={['Entry', 'Intermediate', 'Expert']} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Availability</label>
              <CustomSelect value={form.availability} onChange={val => set('availability', val)} options={['full-time', 'part-time', 'contract', 'not-available']} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Timezone</label><input className="ap-input" value={form.timezone} onChange={e => set('timezone', e.target.value)} /></div>
          </div>

          <div className="ap-form-group">
            <label className="ap-label">Skills</label>
            {form.skills.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="ap-input" style={{ flex: 2 }} placeholder="Skill name" value={s.name} onChange={e => setSkill(i, 'name', e.target.value)} />
                <CustomSelect className="ap-flex1" value={s.level} onChange={val => setSkill(i, 'level', val)} options={SKILL_LEVELS} />
                <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => removeSkill(i)} aria-label={`Remove skill${s.name ? `: ${s.name}` : ''}`}>✕</button>
              </div>
            ))}
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={addSkill}>+ Add skill</button>
            <div style={{ fontSize: '0.72rem', color: 'var(--ap-text-muted)', marginTop: 4 }}>New skills start unverified — grant a pass in the Verification tab.</div>
          </div>

          <div className="ap-form-group">
            <label className="ap-label">Languages</label>
            {(form.languages || []).map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="ap-input" style={{ flex: 2 }} placeholder="Language" value={l.language} onChange={e => setLang(i, 'language', e.target.value)} />
                <CustomSelect className="ap-flex1" value={l.proficiency} onChange={val => setLang(i, 'proficiency', val)} options={PROFICIENCY} />
                <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => removeLang(i)} aria-label={`Remove language${l.language ? `: ${l.language}` : ''}`}>✕</button>
              </div>
            ))}
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={addLang}>+ Add language</button>
          </div>

          <div className="ap-form-group"><label className="ap-label">Portfolio links (one per line)</label><textarea className="ap-textarea" value={form.portfolioLinks} onChange={e => set('portfolioLinks', e.target.value)} style={{ minHeight: 60 }} /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">GitHub</label><input className="ap-input" value={form.socialLinks.github} onChange={e => setNested('socialLinks', 'github', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">LinkedIn</label><input className="ap-input" value={form.socialLinks.linkedin} onChange={e => setNested('socialLinks', 'linkedin', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Twitter</label><input className="ap-input" value={form.socialLinks.twitter} onChange={e => setNested('socialLinks', 'twitter', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Website</label><input className="ap-input" value={form.socialLinks.website} onChange={e => setNested('socialLinks', 'website', e.target.value)} /></div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 2 }}><label className="ap-label">Company name</label><input className="ap-input" value={form.companyName} onChange={e => set('companyName', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Type</label>
              <CustomSelect value={form.companyType} onChange={val => set('companyType', val)} options={['Individual', 'Startup', 'SME', 'Enterprise']} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Company size</label><input className="ap-input" value={form.companySize} onChange={e => set('companySize', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Role at company</label><input className="ap-input" value={form.role} onChange={e => set('role', e.target.value)} /></div>
          </div>
          <div className="ap-form-group"><label className="ap-label">Industry (comma-separated)</label><input className="ap-input" value={form.industry} onChange={e => set('industry', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Website</label><input className="ap-input" value={form.website} onChange={e => set('website', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Phone</label><input className="ap-input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div className="ap-form-group"><label className="ap-label">Description</label><textarea className="ap-textarea" value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: 90 }} /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Country</label><input className="ap-input" value={form.location.country} onChange={e => setNested('location', 'country', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">City</label><input className="ap-input" value={form.location.city} onChange={e => setNested('location', 'city', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Timezone</label><input className="ap-input" value={form.timezone} onChange={e => set('timezone', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Budget min (PKR)</label><input className="ap-input" type="number" min="0" value={form.budgetRange.min} onChange={e => setNested('budgetRange', 'min', e.target.value)} /></div>
            <div className="ap-form-group" style={{ flex: 1 }}><label className="ap-label">Budget max (PKR)</label><input className="ap-input" type="number" min="0" value={form.budgetRange.max} onChange={e => setNested('budgetRange', 'max', e.target.value)} /></div>
          </div>
        </>
      )}
    </AdminModal>
  );
};

// renders each user sub-resource tab
const SubResourceTable = ({ tab, rows, onAdjustWallet }) => {
  const navigate = useNavigate();
  if (tab === 'wallet') {
    const w = rows; // wallet is an object, not array
    if (!w || Array.isArray(w)) return (
      <AdminEmptyState icon="👛" title="No wallet"
        action={onAdjustWallet && <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ marginTop: 12 }} onClick={onAdjustWallet}>💰 Adjust Wallet</button>} />
    );
    return (
      <div style={{ maxWidth: 480 }}>
        <InfoRow label="Balance">{fmt.currency(w.walletBalance)}</InfoRow>
        <InfoRow label="Total earnings">{w.totalEarnings != null ? fmt.currency(w.totalEarnings) : '—'}</InfoRow>
        <InfoRow label="Total spent">{w.totalSpent != null ? fmt.currency(w.totalSpent) : '—'}</InfoRow>
        <InfoRow label="Frozen">{w.isFrozenWallet ? 'Yes' : 'No'}</InfoRow>
        {w.isFrozenWallet && <InfoRow label="Frozen by">{w.walletFrozenBy}</InfoRow>}
        {onAdjustWallet && (
          <div style={{ marginTop: 16 }}>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={onAdjustWallet}>💰 Adjust Wallet</button>
          </div>
        )}
      </div>
    );
  }

  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return <AdminEmptyState icon="📭" title={`No ${tab}`} />;

  if (tab === 'contracts') return (
    <ClickTable columns={['Type', 'Status', 'Amount', 'Started', '']}
      rows={list.map(c => ({ id: c._id, onClick: () => navigate(`/admin-panel/contracts/${c._id}`), cells: [
        <span className="ap-badge ap-badge-blue">{c.type}</span>,
        <StatusBadge status={c.status} />,
        fmt.currency(c.fixedPrice || c.hourlyRate),
        fmt.date(c.startedAt || c.createdAt),
        <span style={{ color: 'var(--ap-text-link)' }}>View →</span>
      ] }))} />
  );
  if (tab === 'jobs') return (
    <ClickTable columns={['Title', 'Status', 'Budget', 'Posted', '']}
      rows={list.map(j => ({ id: j._id, onClick: () => navigate(`/admin-panel/jobs/${j._id}`), cells: [
        j.title, <StatusBadge status={j.status} />, fmt.budget(j.budget), fmt.date(j.createdAt),
        <span style={{ color: 'var(--ap-text-link)' }}>View →</span>
      ] }))} />
  );
  if (tab === 'payments') return (
    <ClickTable columns={['ID', 'Total', 'Fee', 'Status', 'Date']}
      rows={list.map(p => ({ id: p._id, cells: [
        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{p._id?.slice(-8)}</span>,
        fmt.currency(p.totalAmount, p.currency), fmt.currency(p.platformFee, p.currency),
        <StatusBadge status={p.status} />, fmt.date(p.createdAt)
      ] }))} />
  );
  if (tab === 'reports') return (
    <ClickTable columns={['Category', 'Status', 'Priority', 'Date', '']}
      rows={list.map(r => ({ id: r._id, onClick: () => navigate(`/admin-panel/reports/${r._id}`), cells: [
        <span className="ap-badge ap-badge-orange">{r.category}</span>,
        <StatusBadge status={r.status} />, r.priority, fmt.date(r.createdAt),
        <span style={{ color: 'var(--ap-text-link)' }}>View →</span>
      ] }))} />
  );
  if (tab === 'activity') return (
    <ClickTable columns={['Action', 'Severity', 'Admin', 'When']}
      rows={list.map(l => ({ id: l._id, cells: [
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.action}</span>,
        <span className={`ap-badge ap-badge-${l.severity === 'critical' ? 'red' : l.severity === 'warning' ? 'yellow' : 'blue'}`}>{l.severity}</span>,
        l.adminEmail, fmt.relative(l.createdAt)
      ] }))} />
  );
  return null;
};

// small clickable table used inside detail tabs
const ClickTable = ({ columns, rows }) => (
  <div className="ap-table-wrap">
    <table className="ap-table">
      <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} onClick={r.onClick} style={{ cursor: r.onClick ? 'pointer' : 'default' }}>
            {r.cells.map((cell, i) => <td key={i} style={{ fontSize: '0.83rem' }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// JOB DETAIL
// ═══════════════════════════════════════════════════════════════
export const JobDetailPage = () => {
  const { id } = useParams();
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [confirm, setConfirm] = useState(null);  // { type, title, message, run }
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminJobs.getById(id);
      if (res?.job) setJob(res.job); else setNotFound(true);
    } catch (e) { if (e?.status === 404) setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); await load(); setConfirm(null); }
    catch (e) { toast.error(e?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminLoader message="Loading job…" />;
  if (notFound || !job) return (
    <div><BackButton to="/admin-panel/jobs" label="Back to Jobs" /><AdminEmptyState icon="💼" title="Job not found" /></div>
  );

  const canClose  = ['open', 'in-progress'].includes(job.status);
  const canReopen = ['closed', 'cancelled', 'completed'].includes(job.status);

  return (
    <div>
      <BackButton to="/admin-panel/jobs" label="Back to Jobs" />
      <DetailHeader
        icon="💼" title={job.title}
        subtitle={<>Status: <StatusBadge status={job.status} /></>}
        actions={<>
          <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy} onClick={() => setEditOpen(true)}>✏️ Edit</button>
          {canClose && <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy}
            onClick={() => setConfirm({ title: 'Close Job', message: 'This job will be marked as closed.', confirmClass: 'ap-btn-danger', confirmLabel: 'Close', run: () => adminJobs.close(id) })}>Close</button>}
          {canReopen && <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy}
            onClick={() => run(() => adminJobs.reopen(id))}>Reopen</button>}
          <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy}
            onClick={() => setConfirm({ title: 'Delete Job', message: 'This soft-deletes the job (status → cancelled).', confirmClass: 'ap-btn-danger', confirmLabel: 'Delete', run: () => adminJobs.delete(id) })}>Delete</button>
        </>}
      />

      <div className="ap-grid-2">
        <Card title="Job Details">
          <InfoRow label="Title">{job.title}</InfoRow>
          <InfoRow label="Status"><StatusBadge status={job.status} /></InfoRow>
          <InfoRow label="Category">{job.category}</InfoRow>
          <InfoRow label="Subcategory">{job.subcategory}</InfoRow>
          <InfoRow label="Budget">{fmt.budget(job.budget)}</InfoRow>
          <InfoRow label="Experience">{job.experienceLevel}</InfoRow>
          <InfoRow label="Duration">{job.duration}</InfoRow>
          <InfoRow label="Source">{job.source}{job.gigTier ? ` · ${job.gigTier}` : ''}{job.customOfferId ? ' · custom offer' : ''}</InfoRow>
          {job.customOfferId && (
            <InfoRow label="Custom offer">
              {job.customOfferId.title} — {fmt.currency(job.customOfferId.price)}, {job.customOfferId.deliveryDays} day(s), {job.customOfferId.revisions ?? 0} revision(s)
            </InfoRow>
          )}
          <InfoRow label="Deadline">{fmt.date(job.deadline)}</InfoRow>
          <InfoRow label="Posted">{fmt.datetime(job.createdAt)}</InfoRow>
        </Card>
        <Card title="Parties & Description">
          <InfoRow label="Client">
            {job.clientId
              ? <Link to={`/admin-panel/users/${job.clientId._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(job.clientId)}</Link>
              : '—'}
          </InfoRow>
          <InfoRow label="Hired freelancer">
            {job.hiredFreelancer
              ? <Link to={`/admin-panel/users/${job.hiredFreelancer._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(job.hiredFreelancer)}</Link>
              : '—'}
          </InfoRow>
          <InfoRow label="Skills">{job.skills?.length ? job.skills.join(', ') : '—'}</InfoRow>
          <InfoRow label="Proposals">{job.proposals?.length ?? 0}</InfoRow>
          {job.contractId && <InfoRow label="Contract">
            <Link to={`/admin-panel/contracts/${job.contractId}`} style={{ color: 'var(--ap-text-link)' }}>View contract →</Link>
          </InfoRow>}
          <div style={{ paddingTop: 12 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ap-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{job.description || '—'}</div>
          </div>
          {job.attachments?.length > 0 && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Attachments</div>
              <AttachmentGrid urls={job.attachments} />
            </div>
          )}
          {job.source === 'gig' && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>
                Client requirements{job.requirements?.submittedAt ? ` (${fmt.datetime(job.requirements.submittedAt)})` : ''}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ap-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {job.requirements?.description || 'No requirements provided.'}
              </div>
              {job.requirements?.referenceLinks?.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.82rem' }}>
                  {job.requirements.referenceLinks.map((l) => (
                    <li key={l}>
                      <a href={l} onClick={(e) => { e.preventDefault(); openExternal(l); }} style={{ color: 'var(--ap-text-link)', wordBreak: 'break-all' }}>{l}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(confirm.run)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        confirmClass={confirm?.confirmClass}
        loading={busy}
      />

      <EditJobModal open={editOpen} job={job} onClose={() => setEditOpen(false)} onSaved={load} />
    </div>
  );
};

// ─── Edit Job modal (full field coverage) ──────────────────────
const JOB_STATUSES = ['draft', 'open', 'pending_payment', 'in-progress', 'completed', 'cancelled', 'closed', 'expired'];
const JOB_EXPERIENCE = ['entry', 'intermediate', 'expert'];
const JOB_DURATIONS = ['Less than 1 month', '1-3 months', '3-6 months', 'More than 6 months'];

export const EditJobModal = ({ open, job, onClose, onSaved }) => {
  const [form, setForm] = useState({});
  const [skillInput, setSkillInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  useEffect(() => {
    if (open && job) {
      const b = job.budget || {};
      setForm({
        title: job.title || '',
        description: job.description || '',
        status: job.status || 'open',
        category: job.category || '',
        subcategory: job.subcategory || '',
        experienceLevel: job.experienceLevel || '',
        duration: job.duration || '',
        skills: Array.isArray(job.skills) ? [...job.skills] : [],
        budgetMin: b.min ?? '',
        budgetMax: b.max ?? '',
        budgetType: b.type || 'fixed',
        deadline: job.deadline ? String(job.deadline).slice(0, 10) : '',
        attachments: (job.attachments || []).join('\n')
      });
      setSkillInput('');
      setErr('');
    }
  }, [open, job]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (!form.skills.some(x => x.toLowerCase() === s.toLowerCase())) {
      set('skills', [...form.skills, s]);
    }
    setSkillInput('');
  };
  const removeSkill = (i) => set('skills', form.skills.filter((_, x) => x !== i));

  const save = async () => {
    setErr('');
    if (!form.title?.trim()) return setErr('Title is required.');
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        status: form.status,
        category: form.category || undefined,
        subcategory: form.subcategory || undefined,
        experienceLevel: form.experienceLevel || undefined,
        duration: form.duration || undefined,
        skills: form.skills,
        budget: {
          min: form.budgetMin === '' ? undefined : Number(form.budgetMin),
          max: form.budgetMax === '' ? undefined : Number(form.budgetMax),
          type: form.budgetType
        },
        deadline: form.deadline || undefined,
        attachments: form.attachments.split('\n').map(l => l.trim()).filter(Boolean)
      };
      await adminJobs.edit(job._id, payload);
      onSaved?.();
      onClose();
    } catch (e) { setErr(e?.message || 'Failed to update job'); }
    finally { setBusy(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Edit Job" size="lg"
      footer={<>
        <button className="ap-btn ap-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ap-btn ap-btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
      </>}>
      {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}

      <div className="ap-form-group">
        <label className="ap-label">Title</label>
        <input className="ap-input" value={form.title || ''} onChange={e => set('title', e.target.value)} />
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Description</label>
        <textarea className="ap-textarea" value={form.description || ''} onChange={e => set('description', e.target.value)} style={{ minHeight: 120 }} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Category</label>
          <CustomSelect
            value={form.category || ''}
            onChange={val => set('category', val)}
            placeholder="— none —"
            options={JOB_CATEGORIES}
          />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Subcategory</label>
          <input className="ap-input" value={form.subcategory || ''} onChange={e => set('subcategory', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Status</label>
          <CustomSelect value={form.status || 'open'} onChange={val => set('status', val)} options={JOB_STATUSES} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Experience level</label>
          <CustomSelect
            value={form.experienceLevel || ''}
            onChange={val => set('experienceLevel', val)}
            placeholder="— none —"
            options={JOB_EXPERIENCE}
          />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Duration</label>
          <CustomSelect
            value={form.duration || ''}
            onChange={val => set('duration', val)}
            placeholder="— none —"
            options={JOB_DURATIONS}
          />
        </div>
      </div>

      <div className="ap-form-group">
        <label className="ap-label">Skills</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="ap-input" style={{ flex: 1 }} placeholder="Add a skill and press Enter"
            value={skillInput} onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
          <button type="button" className="ap-btn ap-btn-secondary ap-btn-sm" onClick={addSkill}>+ Add</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(form.skills || []).map((s, i) => (
            <span key={i} className="ap-badge ap-badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {s}
              <button type="button" onClick={() => removeSkill(i)} aria-label={`Remove skill: ${s}`} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1 }}>✕</button>
            </span>
          ))}
          {(!form.skills || form.skills.length === 0) && <span style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>No skills</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Budget type</label>
          <CustomSelect value={form.budgetType || 'fixed'} onChange={val => set('budgetType', val)} options={['fixed', 'hourly']} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Budget min (PKR)</label>
          <input className="ap-input" type="number" min="0" value={form.budgetMin ?? ''} onChange={e => set('budgetMin', e.target.value)} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Budget max (PKR)</label>
          <input className="ap-input" type="number" min="0" value={form.budgetMax ?? ''} onChange={e => set('budgetMax', e.target.value)} />
        </div>
      </div>

      <div className="ap-form-group">
        <label className="ap-label">Deadline</label>
        <input className="ap-input" type="date" value={form.deadline || ''} onChange={e => set('deadline', e.target.value)} />
      </div>

      <div className="ap-form-group">
        <label className="ap-label">Attachments (one URL per line)</label>
        <textarea className="ap-textarea" value={form.attachments || ''} onChange={e => set('attachments', e.target.value)} style={{ minHeight: 70 }} placeholder="https://…" />
      </div>
    </AdminModal>
  );
};

// ═══════════════════════════════════════════════════════════════
// CONTRACT DETAIL
// ═══════════════════════════════════════════════════════════════
export const ContractDetailPage = () => {
  const { id } = useParams();
  const [payload, setPayload] = useState(null);  // { contract, history, timeLogs, payment, deliveries }
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);   // { title, message, confirmClass, confirmLabel, run }
  const [reassignOpen, setReassignOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminContracts.getById(id);
      if (res?.contract) setPayload(res); else setNotFound(true);
    } catch (e) { if (e?.status === 404) setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try { await adminContracts.addNote(id, note.trim()); setNote(''); setNoteOpen(false); await load(); }
    catch (e) { toast.error(e?.message || 'Failed to add note'); }
    finally { setBusy(false); }
  };

  // run a confirmed lifecycle action, then refresh
  const runAction = async (fn) => {
    setBusy(true);
    try { await fn(); await load(); setConfirm(null); }
    catch (e) { toast.error(e?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminLoader message="Loading contract…" />;
  if (notFound || !payload) return (
    <div><BackButton to="/admin-panel/contracts" label="Back to Contracts" /><AdminEmptyState icon="📋" title="Contract not found" /></div>
  );

  const { contract, history = [], timeLogs = [], payments = [], deliveries = [] } = payload;
  const active   = ['active', 'in_revision', 'delivered', 'under_review'].includes(contract.status);
  const paused   = contract.status === 'paused';
  const closed   = ['completed', 'cancelled'].includes(contract.status);

  return (
    <div>
      <BackButton to="/admin-panel/contracts" label="Back to Contracts" />
      <DetailHeader
        icon="📋"
        title={contract.jobId?.title || `Contract ${contract._id?.slice(-6)}`}
        subtitle={<>Status: <StatusBadge status={contract.status} /></>}
        actions={<>
          <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy} onClick={() => setEditOpen(true)}>✏️ Edit</button>
          {!closed && active && <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy}
            onClick={() => { const r = prompt('Pause reason (optional):') ?? ''; setConfirm({ title: 'Pause Contract', message: 'Freelancer work will be paused.', confirmLabel: 'Pause', confirmClass: 'ap-btn-secondary', run: () => adminContracts.pause(id, r) }); }}>⏸ Pause</button>}
          {!closed && paused && <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy}
            onClick={() => runAction(() => adminContracts.resume(id, ''))}>▶ Resume</button>}
          {!closed && <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy}
            onClick={() => setConfirm({ title: 'Force Complete', message: 'Marks the contract completed and RELEASES escrow to the freelancer (minus platform fee). This moves money.', confirmLabel: 'Force Complete', confirmClass: 'ap-btn-success', run: () => { const r = prompt('Reason (optional):') ?? ''; return adminContracts.forceComplete(id, r); } })}>✅ Force Complete</button>}
          {!closed && <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => setReassignOpen(true)}>🔀 Reassign</button>}
          {!closed && <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy}
            onClick={() => setConfirm({ title: 'Cancel Contract', message: 'The contract will be cancelled. Escrow is NOT auto-refunded — use the payment refund action for that.', confirmLabel: 'Cancel Contract', confirmClass: 'ap-btn-danger', run: () => { const r = prompt('Cancellation reason (optional):') ?? ''; return adminContracts.cancel(id, r); } })}>✖ Cancel</button>}
          <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => setNoteOpen(true)}>+ Add Note</button>
        </>}
      />

      <div className="ap-grid-2" style={{ marginBottom: 20 }}>
        <Card title="Contract">
          <InfoRow label="Type"><span className="ap-badge ap-badge-blue">{contract.type}</span></InfoRow>
          <InfoRow label="Status"><StatusBadge status={contract.status} /></InfoRow>
          <InfoRow label="Fixed price">{contract.fixedPrice != null ? fmt.currency(contract.fixedPrice) : '—'}</InfoRow>
          <InfoRow label="Hourly rate">{contract.hourlyRate != null ? fmt.currency(contract.hourlyRate) : '—'}</InfoRow>
          <InfoRow label="Client">
            {contract.clientId ? <Link to={`/admin-panel/users/${contract.clientId._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(contract.clientId)}</Link> : '—'}
          </InfoRow>
          <InfoRow label="Freelancer">
            {contract.freelancerId ? <Link to={`/admin-panel/users/${contract.freelancerId._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(contract.freelancerId)}</Link> : '—'}
          </InfoRow>
          <InfoRow label="Started">{fmt.datetime(contract.startedAt)}</InfoRow>
          <InfoRow label="Completed">{fmt.datetime(contract.completedAt)}</InfoRow>
          {contract.jobId && <InfoRow label="Job"><Link to={`/admin-panel/jobs/${contract.jobId._id}`} style={{ color: 'var(--ap-text-link)' }}>View job →</Link></InfoRow>}
        </Card>
        <Card title={`Escrow Payment${payments.length > 1 ? 's' : ''}`}>
          {payments.length ? (
            payments.map((payment, i) => (
              <div key={payment._id} style={i > 0 ? { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--ap-border)' } : undefined}>
                {payments.length > 1 && <InfoRow label="Payment">{payment.type}</InfoRow>}
                <InfoRow label="Status"><StatusBadge status={payment.status} /></InfoRow>
                <InfoRow label="Total">{fmt.currency(payment.totalAmount, payment.currency)}</InfoRow>
                <InfoRow label="Deposit">{fmt.currency(payment.depositAmount, payment.currency)}</InfoRow>
                <InfoRow label="Platform fee">{fmt.currency(payment.platformFee, payment.currency)}</InfoRow>
                <InfoRow label="Freelancer payout">{fmt.currency(payment.freelancerPayout, payment.currency)}</InfoRow>
                <InfoRow label="Released at">{fmt.datetime(payment.releasedAt)}</InfoRow>
              </div>
            ))
          ) : <AdminEmptyState icon="💳" title="No escrow yet" />}
          {contract.dispute?.status && (
            <div className="ap-alert ap-alert-warning" style={{ marginTop: 16 }}>
              <span className="ap-alert-icon">⚠️</span>
              <div>
                Dispute: <StatusBadge status={contract.dispute.status} />
                {contract.dispute.status === 'pending' && (
                  <div style={{ marginTop: 8 }}>
                    <Link to={`/admin-panel/disputes/${contract._id}`} className="ap-btn ap-btn-primary ap-btn-sm">Resolve dispute →</Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Deliveries */}
      <Card title={`Deliveries (${deliveries.length})`} style={{ marginBottom: 20 }}>
        {deliveries.length === 0 ? <AdminEmptyState icon="📦" title="No deliveries submitted" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deliveries.map(d => (
              <div key={d._id} style={{ border: '1px solid var(--ap-border)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.85rem' }}>Version {d.version}</strong>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={d.status} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>{fmt.datetime(d.submittedAt || d.createdAt)}</span>
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{d.message}</div>
                {(d.files?.length > 0 || d.links?.length > 0) && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {d.files?.map((f, i) => <a key={`f${i}`} href={f} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: 'var(--ap-text-link)' }}>📎 File {i + 1}</a>)}
                    {d.links?.map((l, i) => <a key={`l${i}`} href={l} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: 'var(--ap-text-link)' }}>🔗 Link {i + 1}</a>)}
                  </div>
                )}
                {d.clientNotes && <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>Client notes: {d.clientNotes}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="ap-grid-2">
        <Card title={`History (${history.length})`}>
          {history.length === 0 ? <AdminEmptyState icon="📭" title="No history" /> : (
            <AdminTimeline items={history.map(h => ({
              title: h.notes || h.action,
              description: `by ${h.performedByAdmin || userLabel(h.performedBy) || 'system'}`,
              time: fmt.datetime(h.createdAt)
            }))} />
          )}
        </Card>
        <Card title={`Time Logs (${timeLogs.length})`}>
          {timeLogs.length === 0 ? <AdminEmptyState icon="⏱" title="No time logs" /> : (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Started</th><th>Duration</th><th>Note</th></tr></thead>
                <tbody>
                  {timeLogs.map(t => (
                    <tr key={t._id}>
                      <td style={{ fontSize: '0.8rem' }}>{fmt.datetime(t.startTime)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{fmt.duration(t.duration)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <AdminModal open={noteOpen} onClose={() => setNoteOpen(false)} title="Add Admin Note"
        footer={<>
          <button className="ap-btn ap-btn-secondary" onClick={() => setNoteOpen(false)} disabled={busy}>Cancel</button>
          <button className="ap-btn ap-btn-primary" onClick={addNote} disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Add Note'}</button>
        </>}>
        <div className="ap-form-group">
          <label className="ap-label">Note</label>
          <textarea className="ap-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Internal note added to the contract history…" style={{ minHeight: 90 }} />
        </div>
      </AdminModal>

      <EditContractModal open={editOpen} contract={contract} onClose={() => setEditOpen(false)} onSaved={load} />
      <ReassignContractModal open={reassignOpen} contractId={id} onClose={() => setReassignOpen(false)} onSaved={() => { setReassignOpen(false); load(); }} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => runAction(confirm.run)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        confirmClass={confirm?.confirmClass}
        loading={busy}
      />
    </div>
  );
};

// ─── Edit Contract modal ───────────────────────────────────────
const CONTRACT_STATUSES = ['active', 'paused', 'in_revision', 'delivered', 'completed', 'pending_cancellation', 'under_review', 'cancelled'];
const toDateInput = (d) => d ? String(d).slice(0, 10) : '';

export const EditContractModal = ({ open, contract, onClose, onSaved }) => {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  useEffect(() => {
    if (open && contract) {
      setForm({
        fixedPrice: contract.fixedPrice ?? '',
        hourlyRate: contract.hourlyRate ?? '',
        weeklyLimit: contract.weeklyLimit ?? '',
        agreedDeadline: toDateInput(contract.agreedDeadline),
        status: contract.status || 'active',
        revisionNote: contract.revisionNote || '',
        startedAt: toDateInput(contract.startedAt),
        completedAt: toDateInput(contract.completedAt)
      });
      setErr('');
    }
  }, [open, contract]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      const payload = { status: form.status, revisionNote: form.revisionNote };
      if (form.fixedPrice !== '') payload.fixedPrice = Number(form.fixedPrice);
      if (form.hourlyRate !== '') payload.hourlyRate = Number(form.hourlyRate);
      if (form.weeklyLimit !== '') payload.weeklyLimit = Number(form.weeklyLimit);
      if (form.agreedDeadline) payload.agreedDeadline = form.agreedDeadline;
      if (form.startedAt) payload.startedAt = form.startedAt;
      // allow clearing completedAt back to empty
      payload.completedAt = form.completedAt || null;
      await adminContracts.edit(contract._id, payload);
      onSaved?.(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to update contract'); }
    finally { setBusy(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Edit Contract" size="lg"
      footer={<>
        <button className="ap-btn ap-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ap-btn ap-btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
      </>}>
      {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Status</label>
          <CustomSelect
            value={form.status || 'active'}
            onChange={val => set('status', val)}
            options={CONTRACT_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Fixed price (PKR)</label>
          <input className="ap-input" type="number" min="1" value={form.fixedPrice ?? ''} onChange={e => set('fixedPrice', e.target.value)} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Hourly rate (PKR)</label>
          <input className="ap-input" type="number" min="1" value={form.hourlyRate ?? ''} onChange={e => set('hourlyRate', e.target.value)} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Weekly hour limit</label>
          <input className="ap-input" type="number" min="1" value={form.weeklyLimit ?? ''} onChange={e => set('weeklyLimit', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Started at</label>
          <input className="ap-input" type="date" value={form.startedAt ?? ''} onChange={e => set('startedAt', e.target.value)} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Completed at</label>
          <input className="ap-input" type="date" value={form.completedAt ?? ''} onChange={e => set('completedAt', e.target.value)} />
        </div>
        <div className="ap-form-group" style={{ flex: 1 }}>
          <label className="ap-label">Agreed deadline</label>
          <input className="ap-input" type="date" value={form.agreedDeadline ?? ''} onChange={e => set('agreedDeadline', e.target.value)} />
        </div>
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Revision note</label>
        <textarea className="ap-textarea" value={form.revisionNote ?? ''} onChange={e => set('revisionNote', e.target.value)} style={{ minHeight: 70 }} />
      </div>
    </AdminModal>
  );
};

// ─── Reassign Contract modal ───────────────────────────────────
export const ReassignContractModal = ({ open, contractId, onClose, onSaved }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // { _id, email, firstName, lastName }
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  useEffect(() => { if (open) { setQuery(''); setResults([]); setSelected(null); setReason(''); setErr(''); } }, [open]);

  // Debounced freelancer search (by email/name) via the users list endpoint.
  useEffect(() => {
    if (!open || selected || query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      adminUsers.list({ role: 'freelancer', search: query.trim(), limit: 8 })
        .then(res => { if (!cancelled) setResults(res?.users || []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open, selected]);

  const save = async () => {
    setErr('');
    if (!selected) return setErr('Search for and select a freelancer first.');
    setBusy(true);
    try {
      await adminContracts.reassign(contractId, { freelancerId: selected._id, reason: reason.trim() || undefined });
      onSaved?.();
    } catch (e) { setErr(e?.message || 'Failed to reassign'); }
    finally { setBusy(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Reassign Contract"
      footer={<>
        <button className="ap-btn ap-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="ap-btn ap-btn-primary" onClick={save} disabled={busy || !selected}>{busy ? 'Reassigning…' : 'Reassign'}</button>
      </>}>
      {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}
      <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)', marginTop: 0 }}>
        Moves this contract (and its job's hired freelancer) to a different freelancer.
      </p>

      <div className="ap-form-group">
        <label className="ap-label">New freelancer</label>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--ap-border)', borderRadius: 8 }}>
            <AdminUserAvatar email={selected.email} firstName={selected.firstName} lastName={selected.lastName} src={selected.profilePicture} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{userLabel(selected)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>{selected.email}</div>
            </div>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => { setSelected(null); setQuery(''); }}>Change</button>
          </div>
        ) : (
          <>
            <input className="ap-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search freelancers by name or email…" autoFocus />
            {query.trim().length >= 2 && (
              <div style={{ marginTop: 6, border: '1px solid var(--ap-border)', borderRadius: 8, overflow: 'hidden' }}>
                {searching ? <div style={{ padding: 12, fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>Searching…</div>
                  : results.length === 0 ? <div style={{ padding: 12, fontSize: '0.82rem', color: 'var(--ap-text-muted)' }}>No freelancers found.</div>
                  : results.map(u => (
                    <button key={u._id} onClick={() => setSelected(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderBottom: '1px solid var(--ap-border)', cursor: 'pointer', textAlign: 'left' }}>
                      <AdminUserAvatar email={u.email} firstName={u.firstName} lastName={u.lastName} src={u.profilePicture} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--ap-text-primary)' }}>{userLabel(u)}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--ap-text-muted)' }}>{u.email}</div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="ap-form-group">
        <label className="ap-label">Reason (optional)</label>
        <input className="ap-input" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
    </AdminModal>
  );
};

// ═══════════════════════════════════════════════════════════════
// DISPUTE DETAIL / RESOLVE
// ═══════════════════════════════════════════════════════════════
const RESOLVE_ACTIONS = {
  release_freelancer: { value: 'release_freelancer', label: 'Release to Freelancer', desc: 'Release full escrow to the freelancer and complete the contract.' },
  refund_client:      { value: 'refund_client',      label: 'Refund Client',         desc: 'Refund the deposit to the client and cancel the contract.' },
  split:              { value: 'split',              label: 'Split Escrow',          desc: 'Split escrow between both parties by a percentage.' },
  cancel_contract:    { value: 'cancel_contract',    label: 'Cancel Contract (Never Funded)', desc: 'No escrow was ever funded for this milestone — end the contract and flag the client for not funding it.' },
  resume:             { value: 'resume',             label: 'Resume Contract',       desc: 'Dismiss the dispute and set the contract back to active.' },
  reject:             { value: 'reject',             label: 'Reject Dispute',        desc: 'Mark the dispute resolved with no financial change.' }
};

// Fixed-price disputes can now be raised before a milestone is ever funded
// (a client stalling on funding) — there's no escrow in that case, so the
// release/refund/split actions don't apply; offer "Cancel Contract" instead.
const getResolveActions = (contract, hasEscrow) => (
  contract.type === 'fixed' && !hasEscrow
    ? [RESOLVE_ACTIONS.cancel_contract, RESOLVE_ACTIONS.resume, RESOLVE_ACTIONS.reject]
    : [RESOLVE_ACTIONS.release_freelancer, RESOLVE_ACTIONS.refund_client, RESOLVE_ACTIONS.split, RESOLVE_ACTIONS.resume, RESOLVE_ACTIONS.reject]
);

export const DisputeDetailPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);  // { contract, history, payment }
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [action, setAction]   = useState('');
  const [notes, setNotes]     = useState('');
  const [split, setSplit]     = useState(50);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');
  const [ctxTab, setCtxTab]   = useState('chat');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminDisputes.getById(contractId);
      if (res?.contract) setPayload(res); else setNotFound(true);
    } catch (e) { if (e?.status === 404) setNotFound(true); }
    finally { setLoading(false); }
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setErr('');
    if (!action) return setErr('Select a resolution action.');
    if (notes.trim().length < 10) return setErr('Resolution notes must be at least 10 characters.');
    if (action === 'split' && (split < 1 || split > 99)) return setErr('Split percentage must be between 1 and 99.');
    setBusy(true);
    try {
      const body = { action, notes: notes.trim() };
      if (action === 'split') body.splitPercentage = Number(split);
      await adminDisputes.resolve(contractId, body);
      navigate('/admin-panel/disputes');
    } catch (e) { setErr(e?.message || 'Failed to resolve dispute'); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminLoader message="Loading dispute…" />;
  if (notFound || !payload) return (
    <div><BackButton to="/admin-panel/disputes" label="Back to Disputes" /><AdminEmptyState icon="⚠️" title="Dispute not found" /></div>
  );

  const { contract, payment, history = [], deliveries = [], conversation, milestones = [], disputedMilestone, milestonePayment, timeLogs = [], gig } = payload;
  const messages = conversation?.messages || [];
  // Fixed-price disputes live on the milestone, not the contract.
  const dispute = (contract.type === 'fixed' ? disputedMilestone?.dispute : contract.dispute) || {};
  const isPending = dispute.status === 'pending';
  // A fixed-price contract has one Payment PER MILESTONE — the disputed
  // milestone's own escrow record is the relevant one here, not the
  // contract's first Payment row (ambiguous once there's more than one).
  const effectivePayment = contract.type === 'fixed' ? milestonePayment : payment;
  const resolveActions = getResolveActions(contract, !!effectivePayment);
  const neverFunded = contract.type === 'fixed' && !effectivePayment;

  return (
    <div>
      <BackButton to="/admin-panel/disputes" label="Back to Disputes" />
      <DetailHeader
        icon="⚠️"
        title={contract.jobId?.title || `Dispute ${contract._id?.slice(-6)}`}
        subtitle={<>Dispute status: <StatusBadge status={dispute.status} /></>}
      />

      <div className="ap-grid-2" style={{ marginBottom: 20 }}>
        <Card title="Dispute">
          <InfoRow label="Status"><StatusBadge status={dispute.status} /></InfoRow>
          <InfoRow label="Reason">{dispute.reason}</InfoRow>
          <InfoRow label="Raised at">{fmt.datetime(dispute.raisedAt)}</InfoRow>
          <InfoRow label="Resolved at">{fmt.datetime(dispute.resolvedAt)}</InfoRow>
          {dispute.description && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{dispute.description}</div>
            </div>
          )}
          {dispute.resolutionNotes && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Resolution notes</div>
              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{dispute.resolutionNotes}</div>
            </div>
          )}
        </Card>
        <Card title="Contract & Escrow">
          <InfoRow label="Contract"><Link to={`/admin-panel/contracts/${contract._id}`} style={{ color: 'var(--ap-text-link)' }}>View contract →</Link></InfoRow>
          <InfoRow label="Client">{userLabel(contract.clientId)}</InfoRow>
          <InfoRow label="Freelancer">{userLabel(contract.freelancerId)}</InfoRow>
          <InfoRow label="Contract status"><StatusBadge status={contract.status} /></InfoRow>
          {contract.type === 'fixed' && disputedMilestone && (
            <>
              <InfoRow label="Disputed milestone">{disputedMilestone.order}. {disputedMilestone.title}</InfoRow>
              <InfoRow label="Milestone amount">{fmt.currency(disputedMilestone.amount)}</InfoRow>
              <InfoRow label="Milestones">{milestones.filter(m => m.status === 'released').length}/{milestones.length} released</InfoRow>
            </>
          )}
          {contract.jobId?.source === 'gig' && (
            <>
              <InfoRow label="Source">🛍️ Gig order{contract.jobId?.gigTier ? ` — ${contract.jobId.gigTier} tier` : ''}</InfoRow>
              {gig && (
                <>
                  <InfoRow label="Gig listing">{gig.title}</InfoRow>
                  {contract.jobId?.gigTier && gig.pricing?.[contract.jobId.gigTier] && (
                    <>
                      <InfoRow label="Tier price">{fmt.currency(gig.pricing[contract.jobId.gigTier].price)}</InfoRow>
                      <InfoRow label="Tier delivery time">{gig.pricing[contract.jobId.gigTier].deliveryTime || '—'}</InfoRow>
                      <InfoRow label="Tier revisions">{gig.pricing[contract.jobId.gigTier].revisions ?? '—'}</InfoRow>
                      {gig.pricing[contract.jobId.gigTier].features?.length > 0 && (
                        <InfoRow label="Tier includes">{gig.pricing[contract.jobId.gigTier].features.join(', ')}</InfoRow>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
          {effectivePayment ? (
            <>
              <InfoRow label="Escrow status"><StatusBadge status={effectivePayment.status} /></InfoRow>
              <InfoRow label="Total held">{fmt.currency(effectivePayment.totalAmount, effectivePayment.currency)}</InfoRow>
              <InfoRow label="Deposit">{fmt.currency(effectivePayment.depositAmount, effectivePayment.currency)}</InfoRow>
            </>
          ) : <InfoRow label="Escrow">No payment record{neverFunded ? ' — this milestone was never funded' : ''}</InfoRow>}
        </Card>
      </div>

      {/* Full context — everything an admin needs before deciding */}
      <Card style={{ marginBottom: 20 }}>
        <div className="ap-tabs" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            ['chat', `💬 Chat (${messages.length})`],
            ['deliveries', `📦 Deliveries (${deliveries.length})`],
            ...(contract.type === 'hourly' ? [['timeLogs', `⏱ Time Logs (${timeLogs.length})`]] : []),
            ['history', `📜 Contract History (${history.length})`],
            ['payment', '💳 Payment']
          ].map(([k, label]) => (
            <button key={k} className={`ap-tab${ctxTab === k ? ' active' : ''}`} onClick={() => setCtxTab(k)}>{label}</button>
          ))}
        </div>

        {ctxTab === 'chat' && (
          messages.length === 0 ? <AdminEmptyState icon="💬" title="No conversation between the parties" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto' }}>
              {messages.map(m => <MessageRow key={m._id} m={m} />)}
            </div>
          )
        )}

        {ctxTab === 'deliveries' && (
          deliveries.length === 0 ? <AdminEmptyState icon="📦" title="No deliveries" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deliveries.map(d => {
                // Which milestone this delivery was submitted against — lets an
                // admin tell apart deliveries for the disputed milestone from
                // an earlier, already-released one on the same contract.
                const deliveryMilestone = contract.type === 'fixed'
                  ? milestones.find(m => String(m._id) === String(d.milestoneId))
                  : null;
                return (
                  <div key={d._id} style={{ border: '1px solid var(--ap-border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Version {d.version}</strong>
                        {deliveryMilestone && (
                          <span
                            className={`ap-badge ${String(deliveryMilestone._id) === String(disputedMilestone?._id) ? 'ap-badge-yellow' : 'ap-badge-blue'}`}
                          >
                            Milestone {deliveryMilestone.order}: {deliveryMilestone.title}
                          </span>
                        )}
                      </span>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <StatusBadge status={d.status} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>{fmt.datetime(d.submittedAt || d.createdAt)}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: '0.84rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{d.message}</div>
                    {(d.files?.length > 0 || d.links?.length > 0) && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {d.files?.map((f, i) => <a key={`f${i}`} href={f} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: 'var(--ap-text-link)' }}>📎 File {i + 1}</a>)}
                        {d.links?.map((l, i) => <a key={`l${i}`} href={l} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: 'var(--ap-text-link)' }}>🔗 Link {i + 1}</a>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {ctxTab === 'timeLogs' && (
          timeLogs.length === 0 ? <AdminEmptyState icon="⏱" title="No time logged on this contract" /> : (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Source</th><th>Status</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {timeLogs.map(t => (
                    <tr key={t._id}>
                      <td>{fmt.date(t.date)}</td>
                      <td>{fmt.datetime(t.startTime)}</td>
                      <td>{fmt.datetime(t.endTime)}</td>
                      <td>{fmt.duration(t.duration)}</td>
                      <td>{t.source}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}


        {ctxTab === 'history' && (
          history.length === 0 ? <AdminEmptyState icon="📜" title="No contract history" /> : (
            <AdminTimeline items={history.map(h => ({
              title: h.notes || h.action,
              description: `by ${h.performedByAdmin || userLabel(h.performedBy) || 'system'}`,
              time: fmt.datetime(h.createdAt)
            }))} />
          )
        )}

        {ctxTab === 'payment' && (
          effectivePayment ? (
            <div style={{ maxWidth: 520 }}>
              <InfoRow label="Status"><StatusBadge status={effectivePayment.status} /></InfoRow>
              <InfoRow label="Total">{fmt.currency(effectivePayment.totalAmount, effectivePayment.currency)}</InfoRow>
              <InfoRow label="Deposit">{fmt.currency(effectivePayment.depositAmount, effectivePayment.currency)}</InfoRow>
              <InfoRow label="Final">{fmt.currency(effectivePayment.finalAmount, effectivePayment.currency)}</InfoRow>
              <InfoRow label="Platform fee">{fmt.currency(effectivePayment.platformFee, effectivePayment.currency)}</InfoRow>
              <InfoRow label="Freelancer payout">{fmt.currency(effectivePayment.freelancerPayout, effectivePayment.currency)}</InfoRow>
              <InfoRow label="Deposit paid at">{fmt.datetime(effectivePayment.depositPaidAt)}</InfoRow>
              <InfoRow label="Released at">{fmt.datetime(effectivePayment.releasedAt)}</InfoRow>
            </div>
          ) : <AdminEmptyState icon="💳" title="No payment record" />
        )}
      </Card>

      {isPending ? (
        <Card title="Resolve Dispute">
          {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 16 }}><span>⛔</span><span>{err}</span></div>}
          <div className="ap-form-group" style={{ marginBottom: 16 }}>
            <label className="ap-label">Resolution action</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resolveActions.map(a => (
                <label key={a.value} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, border: `1px solid ${action === a.value ? 'var(--ap-blue)' : 'var(--ap-border)'}`, borderRadius: 8, cursor: 'pointer' }}>
                  <input type="radio" name="resolve-action" value={a.value} checked={action === a.value} onChange={e => setAction(e.target.value)} style={{ marginTop: 3 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--ap-text-primary)' }}>{a.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)' }}>{a.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {action === 'split' && (
            <div className="ap-form-group" style={{ marginBottom: 16, maxWidth: 260 }}>
              <label className="ap-label">Freelancer share (%)</label>
              <input className="ap-input" type="number" min={1} max={99} value={split} onChange={e => setSplit(e.target.value)} />
            </div>
          )}
          <div className="ap-form-group" style={{ marginBottom: 16 }}>
            <label className="ap-label">Resolution notes (required, min 10 chars)</label>
            <textarea className="ap-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain the decision…" style={{ minHeight: 90 }} />
          </div>
          <button className="ap-btn ap-btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Resolving…' : 'Resolve Dispute'}
          </button>
        </Card>
      ) : (
        <Card>
          <AdminEmptyState icon="✅" title="This dispute is already resolved"
            desc={dispute.resolutionNotes ? `Resolution: ${dispute.resolutionNotes}` : undefined} />
        </Card>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// REPORT DETAIL
// ═══════════════════════════════════════════════════════════════
export const ReportDetailPage = () => {
  const { id } = useParams();
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [modal, setModal]     = useState(null);  // 'resolve' | 'dismiss'
  const [text, setText]       = useState('');
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReports.getById(id);
      if (res?.report) setReport(res.report); else setNotFound(true);
    } catch (e) { if (e?.status === 404) setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const assign = async () => {
    setBusy(true);
    try { await adminReports.assign(id); await load(); }
    catch (e) { toast.error(e?.message || 'Failed to assign'); }
    finally { setBusy(false); }
  };

  const submitModal = async () => {
    setErr('');
    const min = modal === 'resolve' ? 10 : 5;
    if (text.trim().length < min) return setErr(`Please enter at least ${min} characters.`);
    setBusy(true);
    try {
      if (modal === 'resolve') await adminReports.resolve(id, { resolution: text.trim() });
      else await adminReports.dismiss(id, text.trim());
      setModal(null); setText(''); await load();
    } catch (e) { setErr(e?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminLoader message="Loading report…" />;
  if (notFound || !report) return (
    <div><BackButton to="/admin-panel/reports" label="Back to Reports" /><AdminEmptyState icon="🚩" title="Report not found" /></div>
  );

  const open = ['pending', 'investigating'].includes(report.status);

  return (
    <div>
      <BackButton to="/admin-panel/reports" label="Back to Reports" />
      <DetailHeader
        icon="🚩"
        title={<>Report · <span className="ap-badge ap-badge-orange">{report.category}</span></>}
        subtitle={<>Status: <StatusBadge status={report.status} /></>}
        actions={open && <>
          {report.status === 'pending' && <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={assign}>Assign to me</button>}
          <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={busy} onClick={() => { setModal('resolve'); setText(''); setErr(''); }}>Resolve</button>
          <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={busy} onClick={() => { setModal('dismiss'); setText(''); setErr(''); }}>Dismiss</button>
        </>}
      />

      <div className="ap-grid-2">
        <Card title="Report">
          <InfoRow label="Category"><span className="ap-badge ap-badge-orange">{report.category}</span></InfoRow>
          <InfoRow label="Priority">{report.priority}</InfoRow>
          <InfoRow label="Status"><StatusBadge status={report.status} /></InfoRow>
          <InfoRow label="Reported item">{report.reportedItem?.type || '—'}</InfoRow>
          <InfoRow label="Assigned to">{report.assignedTo}</InfoRow>
          <InfoRow label="Created">{fmt.datetime(report.createdAt)}</InfoRow>
          {report.resolvedAt && <InfoRow label="Resolved">{fmt.datetime(report.resolvedAt)} by {report.resolvedBy}</InfoRow>}
          <div style={{ paddingTop: 12 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{report.description}</div>
          </div>
          {report.resolution && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Resolution</div>
              <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{report.resolution}</div>
            </div>
          )}
        </Card>
        <Card title="Parties">
          <InfoRow label="Reported by">
            {report.reportedBy ? <Link to={`/admin-panel/users/${report.reportedBy._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(report.reportedBy)}</Link> : '—'}
          </InfoRow>
          <InfoRow label="Reported user">
            {report.reportedUser ? <Link to={`/admin-panel/users/${report.reportedUser._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(report.reportedUser)}</Link> : '—'}
          </InfoRow>
          {report.evidence?.length > 0 && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ap-text-secondary)', marginBottom: 6 }}>Evidence</div>
              {report.evidence.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ap-text-link)', wordBreak: 'break-all' }}>{url}</a>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AdminModal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
        footer={<>
          <button className="ap-btn ap-btn-secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
          <button className={`ap-btn ${modal === 'resolve' ? 'ap-btn-primary' : 'ap-btn-danger'}`} onClick={submitModal} disabled={busy}>
            {busy ? 'Working…' : modal === 'resolve' ? 'Resolve' : 'Dismiss'}
          </button>
        </>}>
        {err && <div className="ap-alert ap-alert-error" style={{ marginBottom: 12 }}><span>⛔</span><span>{err}</span></div>}
        <div className="ap-form-group">
          <label className="ap-label">{modal === 'resolve' ? 'Resolution notes (min 10 chars)' : 'Dismissal reason (min 5 chars)'}</label>
          <textarea className="ap-textarea" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 90 }} />
        </div>
      </AdminModal>
    </div>
  );
};

// ─── Shared message row (used by Chat detail + Dispute context) ─
// Message sender field is `sender` (populated), NOT `senderId`. An attachment is
// either a URL string or an object { url, name, type }; images render inline
// (see the module-level isImage helper).
export const MessageRow = ({ m }) => {
  const sender = m.sender || m.senderId; // tolerate either shape
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <AdminUserAvatar email={sender?.email} firstName={sender?.firstName} lastName={sender?.lastName} src={sender?.profilePicture} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.82rem', color: 'var(--ap-text-primary)' }}>{userLabel(sender)}</strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--ap-text-muted)' }}>{fmt.datetime(m.createdAt)}</span>
        </div>
        <div style={{ fontSize: '0.86rem', color: 'var(--ap-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5, marginTop: 2 }}>{m.content || m.text || ''}</div>
        {m.attachments?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {m.attachments.map((a, i) => {
              const url = typeof a === 'string' ? a : (a.url || a.path || '');
              const name = (typeof a === 'object' && a.name) || `Attachment ${i + 1}`;
              if (isImage(url)) {
                return <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={name} style={{ maxWidth: 160, maxHeight: 160, borderRadius: 6, border: '1px solid var(--ap-border)' }} /></a>;
              }
              return <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: 'var(--ap-text-link)' }}>📎 {name}</a>;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHAT / CONVERSATION DETAIL
// ═══════════════════════════════════════════════════════════════
export const ChatDetailPage = () => {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = await adminChat.getMessages(conversationId, q ? { q } : undefined);
      setMessages(res?.messages || []);          // backend now returns oldest-first
      setConversation(res?.conversation || null);
    } catch { setMessages([]); }
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try { await adminChat.reply(conversationId, reply.trim()); setReply(''); await load(); }
    catch (e) { toast.error(e?.message || 'Failed to send reply'); }
    finally { setSending(false); }
  };

  const participants = conversation?.participants || [];

  const download = () => {
    const lines = messages.map(m => {
      const s = m.sender || m.senderId;
      return `[${fmt.datetime(m.createdAt)}] ${userLabel(s)}: ${m.content || ''}`;
    });
    const header = `Conversation ${conversationId}\nParticipants: ${participants.map(userLabel).join(', ')}\n${'='.repeat(50)}\n\n`;
    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain' });
    downloadFile(blob, `conversation-${conversationId}.txt`);
  };

  return (
    <div>
      <BackButton to="/admin-panel/chat" label="Back to Chat" />
      <DetailHeader icon="💬" title="Conversation"
        subtitle={participants.length ? participants.map(userLabel).join(' ↔ ') : `${messages.length} messages`}
        actions={<button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={download} disabled={messages.length === 0}>⬇ Download</button>}
      />
      <div className="ap-filters" style={{ marginBottom: 16 }}>
        <input className="ap-input" style={{ maxWidth: 280 }} placeholder="Search messages…"
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(search.trim())} />
        <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => load(search.trim())}>Search</button>
        {search && <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => { setSearch(''); load(); }}>Clear</button>}
      </div>
      <Card>
        {loading ? <AdminLoader /> : messages.length === 0 ? <AdminEmptyState icon="💬" title="No messages" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map(m => <MessageRow key={m._id} m={m} />)}
          </div>
        )}
      </Card>

      {/* Reply as SkillKart Support — joins this thread and posts to participants */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--ap-text-muted)', marginBottom: 8 }}>
          Reply as <strong>SkillKart Support</strong> — visible to everyone in this conversation.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea className="ap-textarea" style={{ minHeight: 44, flex: 1 }} placeholder="Type a reply…"
            value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }} />
          <button className="ap-btn ap-btn-primary" onClick={sendReply} disabled={sending || !reply.trim()}>{sending ? 'Sending…' : 'Send'}</button>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PAYMENT DETAIL
// ═══════════════════════════════════════════════════════════════
export const PaymentDetailPage = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [confirm, setConfirm] = useState(null); // { title, message, confirmClass, confirmLabel, run }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminPayments.getById(id);
      if (res?.payment) setPayment(res.payment); else setNotFound(true);
    } catch (e) { if (e?.status === 404) setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (fn) => {
    setBusy(true);
    try { await fn(); await load(); setConfirm(null); }
    catch (e) { toast.error(e?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminLoader message="Loading payment…" />;
  if (notFound || !payment) return (
    <div><BackButton to="/admin-panel/payments" label="Back to Payments" /><AdminEmptyState icon="💳" title="Payment not found" /></div>
  );

  const canRelease = !['released', 'refunded'].includes(payment.status) && payment.freelancerId;
  const canRefund  = !['released', 'refunded'].includes(payment.status);

  return (
    <div>
      <BackButton to="/admin-panel/payments" label="Back to Payments" />
      <DetailHeader
        icon="💳"
        title={`Payment ${payment._id?.slice(-8)}`}
        subtitle={<>Status: <StatusBadge status={payment.status} /></>}
        actions={<>
          {canRelease && <button className="ap-btn ap-btn-success ap-btn-sm" disabled={busy}
            onClick={() => setConfirm({ title: 'Release Escrow', message: 'Releases the full amount (minus platform fee) to the freelancer’s wallet. This moves money and cannot be undone.', confirmLabel: 'Release', confirmClass: 'ap-btn-success', run: () => { const r = prompt('Reason (optional):') ?? ''; return adminPayments.release(id, r); } })}>✅ Release Escrow</button>}
          {canRefund && <button className="ap-btn ap-btn-danger ap-btn-sm" disabled={busy}
            onClick={() => setConfirm({ title: 'Refund to Client', message: 'Refunds the deposit to the client’s wallet and cancels the linked contract. This moves money and cannot be undone.', confirmLabel: 'Refund', confirmClass: 'ap-btn-danger', run: () => { const r = prompt('Reason (optional):') ?? ''; return adminPayments.refund(id, r); } })}>↩ Refund</button>}
        </>}
      />

      <div className="ap-grid-2">
        <Card title="Amounts">
          <InfoRow label="Status"><StatusBadge status={payment.status} /></InfoRow>
          <InfoRow label="Type">{payment.type}</InfoRow>
          <InfoRow label="Total">{fmt.currency(payment.totalAmount, payment.currency)}</InfoRow>
          {payment.type === 'job_escrow' && <>
            {/* The 50/50 deposit/final split only exists for the legacy Gig-order
                flow (Payment.type: 'job_escrow') — fixed-price milestones and
                hourly wallet-lock escrow are never split this way. */}
            <InfoRow label="Deposit (50%)">{fmt.currency(payment.depositAmount, payment.currency)}</InfoRow>
            <InfoRow label="Final (50%)">{fmt.currency(payment.finalAmount, payment.currency)}</InfoRow>
          </>}
          <InfoRow label="Fee rate">{payment.feeRate != null ? `${(payment.feeRate * 100).toFixed(2)}%` : '—'}</InfoRow>
          <InfoRow label="Platform fee">{fmt.currency(payment.platformFee, payment.currency)}</InfoRow>
          <InfoRow label="Freelancer payout">{fmt.currency(payment.freelancerPayout, payment.currency)}</InfoRow>
        </Card>
        <Card title="Parties & Timeline">
          <InfoRow label="Client">
            {payment.clientId ? <Link to={`/admin-panel/users/${payment.clientId._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(payment.clientId)}</Link> : '—'}
          </InfoRow>
          <InfoRow label="Freelancer">
            {payment.freelancerId ? <Link to={`/admin-panel/users/${payment.freelancerId._id}`} style={{ color: 'var(--ap-text-link)' }}>{userLabel(payment.freelancerId)}</Link> : '—'}
          </InfoRow>
          {payment.contractId && <InfoRow label="Contract"><Link to={`/admin-panel/contracts/${payment.contractId._id || payment.contractId}`} style={{ color: 'var(--ap-text-link)' }}>View contract →</Link></InfoRow>}
          {payment.jobId && <InfoRow label="Job"><Link to={`/admin-panel/jobs/${payment.jobId._id || payment.jobId}`} style={{ color: 'var(--ap-text-link)' }}>View job →</Link></InfoRow>}
          <InfoRow label="Created">{fmt.datetime(payment.createdAt)}</InfoRow>
          {payment.type === 'job_escrow' && <InfoRow label="Deposit paid at">{fmt.datetime(payment.depositPaidAt)}</InfoRow>}
          <InfoRow label="Released at">{fmt.datetime(payment.releasedAt)}</InfoRow>
          {payment.stripe?.simulated && <InfoRow label="Stripe">Simulated (test)</InfoRow>}
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => runAction(confirm.run)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        confirmClass={confirm?.confirmClass}
        loading={busy}
      />
    </div>
  );
};
