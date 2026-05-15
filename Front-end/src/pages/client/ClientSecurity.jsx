import { useState, useContext, useEffect } from 'react';
import { useClient } from '../../context/ClientContext';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
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
  const { profile, updateProfile, showToast } = useClient();
  const { user } = useContext(AuthContext);
  const isSupabaseUser = !!user?.supabaseId || user?.authProvider !== 'email';
  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [deactivateOtp, setDeactivateOtp] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState(!!profile?.securitySettings?.twoFactorEnabled);
  const [emailVerified, setEmailVerified] = useState(!!profile?.securitySettings?.emailVerified);
  const [loginAlerts, setLoginAlerts] = useState(!!profile?.securitySettings?.loginAlerts);
  const [passwordAlerts, setPasswordAlerts] = useState(!!profile?.securitySettings?.passwordChangeAlerts);
  
  useEffect(() => {
    setTwoFactor(!!profile?.securitySettings?.twoFactorEnabled);
    setEmailVerified(!!profile?.securitySettings?.emailVerified);
    setLoginAlerts(!!profile?.securitySettings?.loginAlerts);
    setPasswordAlerts(!!profile?.securitySettings?.passwordChangeAlerts);
  }, [profile?.securitySettings]);

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
    try {
      await authAPI.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.newPwd
      });
      setPasswords({ current: '', newPwd: '', confirm: '' });
      showToast('Password changed successfully!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await authAPI.requestDeactivation();
      setDeactivateStep(2);
      showToast('OTP sent to your email for deactivation.');
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot deactivate account.', 'error');
      setDeactivateModal(false);
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateOtp) return;
    setDeactivateLoading(true);
    try {
      await authAPI.confirmDeactivation(deactivateOtp);
      showToast('Account deactivated successfully.', 'success');
      window.location.href = '/login';
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP.', 'error');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const toggleSecurity = async (key, value, setter) => {
    setter(value);
    await updateProfile('securitySettings', { [key]: value }, false, true);
  };

  const sendForgot = async () => {
    if (!forgotEmail) return;
    setSaving(true);
    try {
      await authAPI.requestPasswordReset({ email: forgotEmail });
      setForgotSent(true);
      showToast('OTP sent to your email!');
    } catch (error) {
      showToast('Failed to send reset link', 'error');
    } finally {
      setSaving(false);
    }
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
      {isSupabaseUser ? (
        <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="cl-section-title">🔑 Account Information</h3>
          <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="cl-form-group">
              <label className="cl-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="cl-input"
                  value={user?.email || profile?.personalInfo?.email || ''}
                  readOnly
                  disabled
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)', marginTop: '0.5rem' }}>
                You logged in via an external provider. Password updates are disabled.
              </p>
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Security Toggles */}
      {!isSupabaseUser && (
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
          <div className="cl-toggle">
            <div className="cl-toggle__info">
              <span className="cl-toggle__label">🔔 Login Alerts</span>
              <span className="cl-toggle__desc">Get notified whenever someone logs into your account.</span>
            </div>
            <div
              className={`cl-toggle__switch${loginAlerts ? ' cl-toggle__switch--on' : ''}`}
              onClick={() => toggleSecurity('loginAlerts', !loginAlerts, setLoginAlerts)}
            />
          </div>
          <div className="cl-toggle">
            <div className="cl-toggle__info">
              <span className="cl-toggle__label">🛡️ Password Change Alerts</span>
              <span className="cl-toggle__desc">Get notified immediately if your password is changed.</span>
            </div>
            <div
              className={`cl-toggle__switch${passwordAlerts ? ' cl-toggle__switch--on' : ''}`}
              onClick={() => toggleSecurity('passwordChangeAlerts', !passwordAlerts, setPasswordAlerts)}
            />
          </div>
        </div>
      </div>
      )}

      {/* Danger Zone */}
      <div className="cl-card">
        <h3 className="cl-section-title" style={{ color: '#dc2626' }}>⚠️ Danger Zone</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="cl-btn cl-btn--ghost" onClick={() => showToast('Logged out from all devices (simulated).', 'info')}>
            🚪 Logout from All Devices
          </button>
          <button className="cl-btn cl-btn--danger" onClick={() => { setDeactivateStep(1); setDeactivateOtp(''); setDeactivateModal(true); }}>
            🗑 Deactivate Account
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
              <button className="cl-btn cl-btn--primary" onClick={sendForgot}>
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

      {/* Deactivate Modal */}
      <Modal open={deactivateModal} title="Deactivate Account" onClose={() => setDeactivateModal(false)} danger>
        {deactivateStep === 1 ? (
          <>
            <p style={{ marginBottom: '1rem' }}>
              Deactivating your account will hide your profile from freelancers and the public.
              <strong> You cannot deactivate if you have open or active jobs.</strong>
            </p>
            <p style={{ marginBottom: '1.25rem', color: '#dc2626', fontWeight: 600 }}>
              Are you sure you want to deactivate your account?
            </p>
            <div className="cl-actions" style={{ marginTop: 0 }}>
              <button
                className={`cl-btn cl-btn--danger${deactivateLoading ? ' cl-btn--loading' : ''}`}
                onClick={handleRequestDeactivate}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? 'Checking...' : 'Yes, Send OTP'}
              </button>
              <button className="cl-btn cl-btn--ghost" onClick={() => setDeactivateModal(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '1rem' }}>
              Please enter the OTP sent to your email to confirm deactivation.
            </p>
            <div className="cl-form-group">
              <input
                className="cl-input"
                placeholder="Enter OTP"
                value={deactivateOtp}
                onChange={(e) => setDeactivateOtp(e.target.value)}
              />
            </div>
            <div className="cl-actions" style={{ marginTop: '1rem' }}>
              <button
                className={`cl-btn cl-btn--danger${deactivateLoading ? ' cl-btn--loading' : ''}`}
                onClick={handleConfirmDeactivate}
                disabled={deactivateLoading || !deactivateOtp}
              >
                {deactivateLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
              <button className="cl-btn cl-btn--ghost" onClick={() => setDeactivateModal(false)}>Cancel</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ClientSecurity;
