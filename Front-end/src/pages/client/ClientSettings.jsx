import { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import Modal from '../freelancer/components/Modal';
import './ClientDashboard.css';

const ClientSettings = () => {
  const { profile, setProfile, showToast } = useClient();
  const [account, setAccount] = useState({
    newUsername: profile?.personalInfo?.username || "",
    newEmail: profile?.personalInfo?.email || "",
    recoveryEmail: profile?.securitySettings?.recoveryEmail || "",
    recoveryPhone: profile?.securitySettings?.recoveryPhone || "",
  });
  const [notifications, setNotifications] = useState({ ...(profile?.notificationSettings || {}) });
  const [deleteModal, setDeleteModal] = useState(false);

  const saveAccount = () => {
    setProfile((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, username: account.newUsername, email: account.newEmail },
      securitySettings: { ...prev.securitySettings, recoveryEmail: account.recoveryEmail, recoveryPhone: account.recoveryPhone },
    }));
    showToast('Account settings updated!');
  };

  const toggleNotif = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setProfile((prev) => ({ ...prev, notificationSettings: updated }));
    showToast(`${key === 'emailNotifications' ? 'Email notifications' : key === 'proposalAlerts' ? 'Proposal alerts' : 'Message alerts'} ${updated[key] ? 'enabled' : 'disabled'}.`, 'info');
  };

  return (
    <div>
      <div className="cl-page-header">
        <h1 className="cl-page-title">Account Settings</h1>
        <p className="cl-page-sub">Manage your account preferences and notification settings.</p>
      </div>

      {/* Account Settings */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title">🏷️ Account Information</h3>
        <div className="cl-form-grid">
          <div className="cl-form-group">
            <label className="cl-label">Current Username</label>
            <input className="cl-input" value={profile?.personalInfo?.username || ""} disabled />
          </div>
          <div className="cl-form-group">
            <label className="cl-label">New Username</label>
            <input className="cl-input" value={account.newUsername}
              onChange={(e) => setAccount((p) => ({ ...p, newUsername: e.target.value }))} />
          </div>
        </div>
        <button className="cl-btn cl-btn--primary cl-btn--sm" style={{ marginTop: '1rem' }} onClick={saveAccount}>
          Update Username
        </button>

        <div className="cl-divider" />

        <div className="cl-form-grid">
          <div className="cl-form-group">
            <label className="cl-label">Current Email</label>
            <input className="cl-input" value={profile?.personalInfo?.email || ""} disabled />
          </div>
          <div className="cl-form-group">
            <label className="cl-label">New Email</label>
            <input type="email" className="cl-input" value={account.newEmail}
              onChange={(e) => setAccount((p) => ({ ...p, newEmail: e.target.value }))} />
          </div>
        </div>
        <button className="cl-btn cl-btn--primary cl-btn--sm" style={{ marginTop: '1rem' }} onClick={saveAccount}>
          Update Email
        </button>

        <div className="cl-divider" />

        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>🔁 Recovery Options</h4>
        <div className="cl-form-grid">
          <div className="cl-form-group">
            <label className="cl-label">Recovery Email</label>
            <input type="email" className="cl-input" value={account.recoveryEmail}
              onChange={(e) => setAccount((p) => ({ ...p, recoveryEmail: e.target.value }))} />
          </div>
          <div className="cl-form-group">
            <label className="cl-label">Recovery Phone</label>
            <input className="cl-input" value={account.recoveryPhone}
              onChange={(e) => setAccount((p) => ({ ...p, recoveryPhone: e.target.value }))} />
          </div>
        </div>
        <button className="cl-btn cl-btn--primary cl-btn--sm" style={{ marginTop: '1rem' }} onClick={saveAccount}>
          Save Recovery Options
        </button>
      </div>

      {/* Notification Settings */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title">🔔 Notification Settings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive project and platform updates via email' },
            { key: 'proposalAlerts', label: 'Proposal Alerts', desc: 'Get notified when a freelancer submits a proposal' },
            { key: 'messageAlerts', label: 'Message Alerts', desc: 'Get notified when you receive a new message' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="cl-toggle">
              <div className="cl-toggle__info">
                <span className="cl-toggle__label">{label}</span>
                <span className="cl-toggle__desc">{desc}</span>
              </div>
              <div
                className={`cl-toggle__switch${notifications[key] ? ' cl-toggle__switch--on' : ''}`}
                onClick={() => toggleNotif(key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="cl-card">
        <h3 className="cl-section-title" style={{ color: '#dc2626' }}>⚠️ Danger Zone</h3>
        <div className="cl-danger-zone">
          <div className="cl-danger-zone__title">Delete Account</div>
          <div className="cl-danger-zone__desc">
            Permanently delete your account and all associated projects. This action cannot be undone.
          </div>
          <button className="cl-btn cl-btn--danger cl-btn--sm" onClick={() => setDeleteModal(true)}>
            🗑 Delete My Account
          </button>
        </div>
      </div>

      <Modal open={deleteModal} title="Delete Account" onClose={() => setDeleteModal(false)} danger>
        <p>This will permanently delete your account and all projects. Are you sure?</p>
        <div className="cl-actions" style={{ marginTop: '1.25rem' }}>
          <button className="cl-btn cl-btn--danger" onClick={() => { setDeleteModal(false); showToast('Account deletion simulated.', 'info'); }}>
            Yes, Delete Everything
          </button>
          <button className="cl-btn cl-btn--ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default ClientSettings;
