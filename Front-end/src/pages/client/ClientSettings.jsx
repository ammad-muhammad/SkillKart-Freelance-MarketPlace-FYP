import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClient } from '../../context/ClientContext';
import { authAPI } from '../../api/auth';
import Modal from '../freelancer/components/Modal';
import { clientsAPI } from '../../api/clients';

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
  const [emailModal, setEmailModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Recovery Email Change State
  const [recoveryEmailModal, setRecoveryEmailModal] = useState(false);
  const [recoveryEmailOtp, setRecoveryEmailOtp] = useState('');
  const [recoveryEmailLoading, setRecoveryEmailLoading] = useState(false);

  const handleRequestEmailChange = async () => {
    if (!account.newEmail || account.newEmail === profile?.personalInfo?.email) return;
    
    setEmailLoading(true);
    try {
      await authAPI.requestEmailChange(account.newEmail);
      setEmailModal(true);
      showToast('OTP sent to new email address.');
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot change email.', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!emailOtp) return;
    setEmailLoading(true);
    try {
      await authAPI.confirmEmailChange(emailOtp);
      showToast('Email updated successfully.', 'success');
      setEmailModal(false);
      setEmailOtp('');
      // update context locally
      updateProfile('personalInfo', { email: account.newEmail }, false, false);
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP.', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRequestRecoveryEmailChange = async () => {
    if (!account.recoveryEmail || account.recoveryEmail === profile?.securitySettings?.recoveryEmail) return;
    
    setRecoveryEmailLoading(true);
    try {
      await authAPI.requestRecoveryEmailChange(account.recoveryEmail);
      setRecoveryEmailModal(true);
      showToast('OTP sent to new recovery email.');
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot change recovery email.', 'error');
    } finally {
      setRecoveryEmailLoading(false);
    }
  };

  const handleConfirmRecoveryEmailChange = async () => {
    if (!recoveryEmailOtp) return;
    setRecoveryEmailLoading(true);
    try {
      await authAPI.confirmRecoveryEmailChange(recoveryEmailOtp);
      showToast('Recovery email updated successfully.', 'success');
      setRecoveryEmailModal(false);
      setRecoveryEmailOtp('');
      // update context locally
      updateProfile('securitySettings', { ...profile.securitySettings, recoveryEmail: account.recoveryEmail }, false, false);
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP.', 'error');
    } finally {
      setRecoveryEmailLoading(false);
    }
  };

  const saveAccount = async () => {
    setErrors({});
    // Validate username uniqueness if changed
    if (account.newUsername?.trim() && account.newUsername?.trim() !== profile?.personalInfo?.username) {
      try {
        const res = await clientsAPI.checkUsername(account.newUsername.trim());
        if (res.data?.data?.exists) {
          setErrors(prev => ({ ...prev, newUsername: 'Username is already taken' }));
          return;
        }
      } catch (err) {
        console.error('Username check failed', err);
        setErrors(prev => ({ ...prev, newUsername: 'Unable to verify username' }));
        return;
      }
    }

    const updates = {
      personalInfo: { username: account.newUsername?.trim() || profile?.personalInfo?.username },
      securitySettings: { recoveryPhone: account.recoveryPhone }
    };
    // Persist changes and refresh profile to reflect updated username
    await updateMultipleSections(updates, false, true);
    // Errors are handled via updateMultipleSections/showToast
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
          <button className="cl-btn cl-btn--primary cl-btn--sm" style={{ marginTop: '1rem' }} onClick={handleRequestEmailChange} disabled={emailLoading || account.newEmail === profile?.personalInfo?.email}>
            {emailLoading ? 'Sending OTP...' : 'Update Email'}
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
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="cl-btn cl-btn--primary cl-btn--sm" onClick={handleRequestRecoveryEmailChange} disabled={recoveryEmailLoading || account.recoveryEmail === profile?.securitySettings?.recoveryEmail}>
                {recoveryEmailLoading ? 'Sending OTP...' : 'Update Recovery Email'}
              </button>
              <button className="cl-btn cl-btn--secondary cl-btn--sm" onClick={saveAccount}>
                Save Recovery Phone
              </button>
            </div>
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
      <Modal open={emailModal} title="Verify Email Change" onClose={() => setEmailModal(false)}>
        <p style={{ marginBottom: '1rem' }}>
          Please enter the OTP sent to <strong>{account.newEmail}</strong> to confirm your new email address.
        </p>
        <div className="cl-form-group">
          <input
            className="cl-input"
            placeholder="Enter OTP"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
          />
        </div>
        <div className="cl-actions" style={{ marginTop: '1rem' }}>
          <button
            className={`cl-btn cl-btn--primary${emailLoading ? ' cl-btn--loading' : ''}`}
            onClick={handleConfirmEmailChange}
            disabled={emailLoading || !emailOtp}
          >
            {emailLoading ? 'Verifying...' : 'Verify and Update'}
          </button>
          <button className="cl-btn cl-btn--ghost" onClick={() => setEmailModal(false)}>Cancel</button>
        </div>
      </Modal>
      <Modal open={recoveryEmailModal} title="Verify Recovery Email" onClose={() => setRecoveryEmailModal(false)}>
        <p style={{ marginBottom: '1rem' }}>
          Please enter the OTP sent to <strong>{account.recoveryEmail}</strong> to confirm your new recovery email address.
        </p>
        <div className="cl-form-group">
          <input
            className="cl-input"
            placeholder="Enter OTP"
            value={recoveryEmailOtp}
            onChange={(e) => setRecoveryEmailOtp(e.target.value)}
          />
        </div>
        <div className="cl-actions" style={{ marginTop: '1rem' }}>
          <button
            className={`cl-btn cl-btn--primary${recoveryEmailLoading ? ' cl-btn--loading' : ''}`}
            onClick={handleConfirmRecoveryEmailChange}
            disabled={recoveryEmailLoading || !recoveryEmailOtp}
          >
            {recoveryEmailLoading ? 'Verifying...' : 'Verify and Update'}
          </button>
          <button className="cl-btn cl-btn--ghost" onClick={() => setRecoveryEmailModal(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default ClientSettings;
