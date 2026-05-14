import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClient } from '../../context/ClientContext';
import Modal from '../freelancer/components/Modal';
import './ClientDashboard.css';

const ClientSettings = () => {
  const { user } = useAuth();
  const { profile, updateProfile, updateMultipleSections, showToast } = useClient();
  const isEmailUser = user?.authProvider === 'email';
  const isSupabaseUser = !!user?.supabaseId || user?.authProvider !== 'email';
  const [account, setAccount] = useState({
    newUsername: profile?.personalInfo?.username || "",
    newEmail: profile?.personalInfo?.email || "",
    recoveryEmail: profile?.securitySettings?.recoveryEmail || "",
    recoveryPhone: profile?.securitySettings?.recoveryPhone || "",
  });
  const [notifications, setNotifications] = useState({ ...(profile?.notificationSettings || {}) });
  const [errors, setErrors] = useState({});

  // Sync state when profile is loaded/updated
  useEffect(() => {
    if (profile) {
      setAccount({
        newUsername: profile.personalInfo?.username || "",
        newEmail: profile.personalInfo?.email || "",
        recoveryEmail: profile.securitySettings?.recoveryEmail || "",
        recoveryPhone: profile.securitySettings?.recoveryPhone || "",
      });
      setNotifications({ ...(profile.notificationSettings || {}) });
    }
  }, [profile]);

  const [deleteModal, setDeleteModal] = useState(false);


  const saveAccount = async () => {
    setErrors({});
    try {
      const updates = {
        personalInfo: { 
          username: account.newUsername?.trim() || profile?.personalInfo?.username, 
          email: account.newEmail?.trim() || profile?.personalInfo?.email 
        },
        securitySettings: { recoveryEmail: account.recoveryEmail, recoveryPhone: account.recoveryPhone }
      };

      const res = await updateMultipleSections(updates, false, true, { skipFetch: true });
      
      const processErrors = (res, target) => {
        if (res && !res.success && res.errors) {
          if (Array.isArray(res.errors)) {
            res.errors.forEach(err => {
              if (typeof err === 'object' && err.field) target[err.field] = err.message;
              else if (typeof err === 'string') {
                const pathMatch = err.match(/at path \\"(.+)\\"/);
                target[pathMatch ? pathMatch[1] : 'global'] = err;
              }
            });
          } else if (typeof res.errors === 'object') {
            Object.assign(target, res.errors);
          }
        }
      };

      const combinedErrors = {};
      processErrors(res, combinedErrors);
      
      if (Object.keys(combinedErrors).length > 0) {
        setErrors(combinedErrors);
      }
    } catch (error) {
      console.error('Failed to save account settings:', error);
    }
  };

  const toggleNotif = async (key) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      // Call updateProfile with the newly calculated state and skip redundant re-fetch
      updateProfile('notificationSettings', updated, false, true, { skipFetch: true });
      return updated;
    });
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
            <input className={`cl-input${errors.newUsername ? ' cl-input--error' : ''}`} value={account.newUsername}
              onChange={(e) => setAccount((p) => ({ ...p, newUsername: e.target.value }))} />
            {errors.newUsername && <span className="cl-error">⚠ {errors.newUsername}</span>}
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
          {!isSupabaseUser && (
            <div className="cl-form-group">
              <label className="cl-label">New Email</label>
              <input type="email" className={`cl-input${errors.newEmail ? ' cl-input--error' : ''}`} value={account.newEmail}
                onChange={(e) => setAccount((p) => ({ ...p, newEmail: e.target.value }))} />
              {errors.newEmail && <span className="cl-error">⚠ {errors.newEmail}</span>}
            </div>
          )}
        </div>
        {!isSupabaseUser && (
          <button className="cl-btn cl-btn--primary cl-btn--sm" style={{ marginTop: '1rem' }} onClick={saveAccount}>
            Update Email
          </button>
        )}

        {isEmailUser && (
          <>
            <div className="cl-divider" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>🔁 Recovery Options</h4>
            <div className="cl-form-grid">
              <div className="cl-form-group">
                <label className="cl-label">Recovery Email</label>
                <input type="email" className={`cl-input${errors.recoveryEmail ? ' cl-input--error' : ''}`} value={account.recoveryEmail}
                  onChange={(e) => setAccount((p) => ({ ...p, recoveryEmail: e.target.value }))} />
                {errors.recoveryEmail && <span className="cl-error">⚠ {errors.recoveryEmail}</span>}
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Recovery Phone</label>
                <input className={`cl-input${errors.recoveryPhone ? ' cl-input--error' : ''}`} value={account.recoveryPhone}
                  onChange={(e) => setAccount((p) => ({ ...p, recoveryPhone: e.target.value }))} />
                {errors.recoveryPhone && <span className="cl-error">⚠ {errors.recoveryPhone}</span>}
              </div>
            </div>
            <button className="cl-btn cl-btn--primary cl-btn--sm" style={{ marginTop: '1rem' }} onClick={saveAccount}>
              Save Recovery Options
            </button>
          </>
        )}
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
