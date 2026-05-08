import { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import Modal from '../freelancer/components/Modal';
import './ClientDashboard.css';

const strengthLabel = (score) => {
  if (score <= 1) return { text: 'Weak', color: '#ef4444' };
  if (score === 2) return { text: 'Fair', color: '#f59e0b' };
  if (score === 3) return { text: 'Good', color: '#3b82f6' };
  return { text: 'Strong', color: '#10b981' };
};

const getStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  return score;
};

const ClientSecurity = () => {
  const { profile, setProfile, showToast } = useClient();
  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [twoFactor, setTwoFactor] = useState(!!profile?.securitySettings?.twoFactorEnabled);
  const [emailVerified, setEmailVerified] = useState(!!profile?.securitySettings?.emailVerified);

  const validate = () => {
    const e = {};
    if (!passwords.current) e.current = 'Current password is required';
    if (passwords.newPwd.length < 8) e.newPwd = 'Minimum 8 characters';
    if (passwords.newPwd !== passwords.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const changePassword = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPasswords({ current: '', newPwd: '', confirm: '' });
    setSaving(false);
    showToast('Password changed successfully!');
  };

  const toggleSecurity = (key, value, setter) => {
    setter(value);
    setProfile((prev) => ({
      ...prev,
      securitySettings: { ...prev.securitySettings, [key]: value },
    }));
    showToast(`${key === 'twoFactorEnabled' ? '2FA' : 'Email verification'} ${value ? 'enabled' : 'disabled'}.`, 'info');
  };

  const strength = getStrength(passwords.newPwd);
  const strengthInfo = strengthLabel(strength);

  return (
    <div>
      <div className="cl-page-header">
        <h1 className="cl-page-title">Security</h1>
        <p className="cl-page-sub">Manage your password and account security settings.</p>
      </div>

      {/* Change Password */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title">🔑 Change Password</h3>
        <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'current', label: 'Current Password' },
            { key: 'newPwd', label: 'New Password' },
            { key: 'confirm', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key} className="cl-form-group">
              <label className="cl-label">{label}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd[key] ? 'text' : 'password'}
                  className={`cl-input${errors[key] ? ' cl-input--error' : ''}`}
                  value={passwords[key]}
                  onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--color-text-light)' }}
                  onClick={() => setShowPwd((p) => ({ ...p, [key]: !p[key] }))}
                >
                  {showPwd[key] ? '🙈' : '👁️'}
                </button>
              </div>
              {errors[key] && <span className="cl-error">⚠ {errors[key]}</span>}
              {key === 'newPwd' && passwords.newPwd && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1,2,3,4].map((i) => (
                      <div key={i} style={{
                        height: '4px', flex: 1, borderRadius: '99px',
                        background: i <= strength ? strengthInfo.color : '#e5edf5',
                        transition: 'background 0.3s'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: strengthInfo.color, fontWeight: 700, marginTop: '0.25rem', display: 'block' }}>
                    {strengthInfo.text}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className={`cl-btn cl-btn--primary${saving ? ' cl-btn--loading' : ''}`}
              onClick={changePassword} disabled={saving}
            >
              {saving ? 'Saving...' : '🔒 Change Password'}
            </button>
            <button className="cl-btn cl-btn--ghost" onClick={() => setForgotModal(true)}>
              Forgot Password?
            </button>
          </div>
        </div>
      </div>

      {/* Security Toggles */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title">🛡️ Security Options</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="cl-toggle">
            <div className="cl-toggle__info">
              <span className="cl-toggle__label">🔐 Two-Factor Authentication</span>
              <span className="cl-toggle__desc">Add an extra layer of security with 2FA</span>
            </div>
            <div
              className={`cl-toggle__switch${twoFactor ? ' cl-toggle__switch--on' : ''}`}
              onClick={() => toggleSecurity('twoFactorEnabled', !twoFactor, setTwoFactor)}
            />
          </div>
          <div className="cl-toggle">
            <div className="cl-toggle__info">
              <span className="cl-toggle__label">✉️ Email Verification</span>
              <span className="cl-toggle__desc">Verify your email for enhanced account security</span>
            </div>
            <div
              className={`cl-toggle__switch${emailVerified ? ' cl-toggle__switch--on' : ''}`}
              onClick={() => toggleSecurity('emailVerified', !emailVerified, setEmailVerified)}
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="cl-card">
        <h3 className="cl-section-title" style={{ color: '#dc2626' }}>⚠️ Danger Zone</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="cl-btn cl-btn--ghost" onClick={() => showToast('Logged out from all devices (simulated).', 'info')}>
            🚪 Logout from All Devices
          </button>
          <button className="cl-btn cl-btn--danger" onClick={() => setDeleteModal(true)}>
            🗑 Delete Account
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal open={forgotModal} title="Reset Password" onClose={() => { setForgotModal(false); setForgotSent(false); setForgotEmail(''); }}>
        {!forgotSent ? (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-mid)', marginBottom: '1rem' }}>
              Enter your email address to receive a password reset link.
            </p>
            <input
              type="email" className="cl-input"
              placeholder="your@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <div className="cl-actions" style={{ marginTop: '1rem' }}>
              <button className="cl-btn cl-btn--primary" onClick={() => { if (forgotEmail) setForgotSent(true); }}>
                Send Reset Link
              </button>
              <button className="cl-btn cl-btn--ghost" onClick={() => setForgotModal(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3rem' }}>📧</div>
            <h4 style={{ marginTop: '0.75rem', color: 'var(--color-primary)' }}>Reset Link Sent!</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-mid)', marginTop: '0.5rem' }}>
              A password reset link has been sent to <strong>{forgotEmail}</strong>.
            </p>
            <button className="cl-btn cl-btn--primary" style={{ marginTop: '1.25rem' }} onClick={() => { setForgotModal(false); setForgotSent(false); }}>
              Done
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} title="Delete Account" onClose={() => setDeleteModal(false)} danger>
        <p>Are you sure you want to permanently delete your account?</p>
        <div className="cl-actions" style={{ marginTop: '1.25rem' }}>
          <button className="cl-btn cl-btn--danger" onClick={() => { setDeleteModal(false); showToast('Account deletion simulated.', 'info'); }}>
            Yes, Delete
          </button>
          <button className="cl-btn cl-btn--ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default ClientSecurity;
