import { useState } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import Modal from './components/Modal';
import './FreelancerDashboard.css';

const FreelancerSecurity = () => {
  const { profile, updateProfile, showToast } = useFreelancer();
  const sec = profile.securitySettings;

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [twoFactor, setTwoFactor] = useState(sec.twoFactorEnabled);
  const [emailVerified, setEmailVerified] = useState(sec.emailVerified);

  const validatePw = () => {
    const errs = {};
    if (!pwForm.current) errs.current = 'Current password is required';
    if (!pwForm.newPw || pwForm.newPw.length < 8) errs.newPw = 'At least 8 characters required';
    if (pwForm.newPw !== pwForm.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const changePassword = async () => {
    const errs = validatePw();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    updateProfile('securitySettings', { currentPassword: '', newPassword: '' });
    setPwForm({ current: '', newPw: '', confirm: '' });
    setPwErrors({});
    setSaving(false);
    showToast('Password changed successfully!');
  };

  const toggleTwoFactor = async () => {
    const next = !twoFactor;
    setTwoFactor(next);
    updateProfile('securitySettings', { twoFactorEnabled: next });
    showToast(`Two-factor authentication ${next ? 'enabled' : 'disabled'}.`, next ? 'success' : 'info');
  };

  const toggleEmailVerified = async () => {
    const next = !emailVerified;
    setEmailVerified(next);
    updateProfile('securitySettings', { emailVerified: next });
    showToast(`Email verification ${next ? 'enabled' : 'disabled'}.`, next ? 'success' : 'info');
  };

  const sendForgot = async () => {
    await new Promise((r) => setTimeout(r, 800));
    setForgotSent(true);
    showToast('Password reset link sent to your email!');
  };

  return (
    <div>
      <div className="fl-page-header">
        <h1 className="fl-page-title">Security Settings</h1>
        <p className="fl-page-sub">Manage your password and security preferences.</p>
      </div>

      {/* Change Password */}
      <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="fl-section-title">🔑 Change Password</h3>
        <div className="fl-form-grid">
          <div className="fl-form-group">
            <label className="fl-label">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className={`fl-input${pwErrors.current ? ' fl-input--error' : ''}`}
                value={pwForm.current}
                onChange={(e) => { setPwForm((p) => ({ ...p, current: e.target.value })); setPwErrors((e2) => ({ ...e2, current: '' })); }}
                placeholder="••••••••"
              />
            </div>
            {pwErrors.current && <span className="fl-error">{pwErrors.current}</span>}
          </div>
          <div className="fl-form-group" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="fl-form-group" style={{ margin: 0 }}>
              <label className="fl-label">New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className={`fl-input${pwErrors.newPw ? ' fl-input--error' : ''}`}
                value={pwForm.newPw}
                onChange={(e) => { setPwForm((p) => ({ ...p, newPw: e.target.value })); setPwErrors((e2) => ({ ...e2, newPw: '' })); }}
                placeholder="Min 8 characters"
              />
              {pwErrors.newPw && <span className="fl-error">{pwErrors.newPw}</span>}
              {pwForm.newPw && (
                <div className="fl-pw-strength">
                  <div
                    className="fl-pw-strength__bar"
                    style={{
                      width: `${Math.min(100, pwForm.newPw.length * 10)}%`,
                      background: pwForm.newPw.length >= 12 ? '#10b981' : pwForm.newPw.length >= 8 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                  <span className="fl-pw-strength__label">
                    {pwForm.newPw.length >= 12 ? 'Strong' : pwForm.newPw.length >= 8 ? 'Good' : 'Weak'}
                  </span>
                </div>
              )}
            </div>
            <div className="fl-form-group" style={{ margin: 0 }}>
              <label className="fl-label">Confirm New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className={`fl-input${pwErrors.confirm ? ' fl-input--error' : ''}`}
                value={pwForm.confirm}
                onChange={(e) => { setPwForm((p) => ({ ...p, confirm: e.target.value })); setPwErrors((e2) => ({ ...e2, confirm: '' })); }}
                placeholder="Repeat password"
              />
              {pwErrors.confirm && <span className="fl-error">{pwErrors.confirm}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
          <input type="checkbox" id="show-pw" checked={showPw} onChange={() => setShowPw(!showPw)} />
          <label htmlFor="show-pw" style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)', cursor: 'pointer' }}>Show password</label>
        </div>
        <div className="fl-actions">
          <button
            className={`fl-btn fl-btn--primary${saving ? ' fl-btn--loading' : ''}`}
            disabled={saving}
            onClick={changePassword}
          >
            {saving ? 'Updating...' : '🔒 Update Password'}
          </button>
          <button className="fl-btn fl-btn--ghost" onClick={() => setForgotModal(true)}>
            Forgot Password?
          </button>
        </div>
      </div>

      {/* 2FA / Toggles */}
      <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="fl-section-title">🛡️ Security Options</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="fl-toggle">
            <div className="fl-toggle__info">
              <span className="fl-toggle__label">🔐 Two-Factor Authentication</span>
              <span className="fl-toggle__desc">Add an extra layer of security to your account.</span>
            </div>
            <div
              className={`fl-toggle__switch${twoFactor ? ' fl-toggle__switch--on' : ''}`}
              onClick={toggleTwoFactor}
            />
          </div>
          <div className="fl-toggle">
            <div className="fl-toggle__info">
              <span className="fl-toggle__label">📧 Email Verification</span>
              <span className="fl-toggle__desc">Require email verification for account changes.</span>
            </div>
            <div
              className={`fl-toggle__switch${emailVerified ? ' fl-toggle__switch--on' : ''}`}
              onClick={toggleEmailVerified}
            />
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal open={forgotModal} title="Reset Password" onClose={() => { setForgotModal(false); setForgotSent(false); }}>
        {forgotSent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✉️</p>
            <p style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.4rem' }}>Reset Link Sent!</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)' }}>
              We've sent a password reset link to <strong>{profile.personalInfo.email}</strong>.
            </p>
            <button className="fl-btn fl-btn--primary" style={{ marginTop: '1.25rem' }} onClick={() => { setForgotModal(false); setForgotSent(false); }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              A password reset link will be sent to your registered email: <strong>{profile.personalInfo.email}</strong>
            </p>
            <div className="fl-actions" style={{ marginTop: 0 }}>
              <button className="fl-btn fl-btn--primary" onClick={sendForgot}>Send Reset Link</button>
              <button className="fl-btn fl-btn--ghost" onClick={() => setForgotModal(false)}>Cancel</button>
            </div>
          </>
        )}
      </Modal>

      <style>{`
        .fl-input--error { border-color: #ef4444 !important; }
        .fl-error { font-size: 0.75rem; color: #ef4444; margin-top: 0.25rem; font-weight: 600; }
        .fl-pw-strength { margin-top: 0.4rem; }
        .fl-pw-strength__bar {
          height: 4px; border-radius: 999px; background: #ef4444;
          transition: width 0.3s, background 0.3s; margin-bottom: 0.25rem;
        }
        .fl-pw-strength__label { font-size: 0.72rem; font-weight: 700; color: var(--color-text-mid); }
      `}</style>
    </div>
  );
};

export default FreelancerSecurity;
