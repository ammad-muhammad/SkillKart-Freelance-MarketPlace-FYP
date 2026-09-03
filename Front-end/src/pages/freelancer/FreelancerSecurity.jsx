import { useState, useContext, useEffect } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { validatePassword } from '../../utils/validation';
import { Key, Save, Shield, Bell, Lock, AlertCircle } from 'lucide-react';
import Modal from './components/Modal';
import './FreelancerDashboard.css';
import { log } from "../../utils/logger";

const FreelancerSecurity = () => {
  const { profile, updateProfile, showToast } = useFreelancer();
  const { user } = useContext(AuthContext);
  const isSupabaseUser = !!user?.supabaseId || (user?.authProvider && user?.authProvider !== 'email');
  const sec = profile?.securitySettings || {};

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [twoFactor, setTwoFactor] = useState(!!sec.twoFactorEnabled);
  const [loginAlerts, setLoginAlerts] = useState(!!sec.loginAlerts);
  const [passwordAlerts, setPasswordAlerts] = useState(!!sec.passwordChangeAlerts);
  
  const [otpPending, setOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [updating, setUpdating] = useState({});

  // Sync state with profile data
  useEffect(() => {
    setTwoFactor(!!profile?.securitySettings?.twoFactorEnabled);
    setLoginAlerts(!!profile?.securitySettings?.loginAlerts);
    setPasswordAlerts(!!profile?.securitySettings?.passwordChangeAlerts);
  }, [profile?.securitySettings]);

  const validatePw = () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    const pwErr = validatePassword(pwForm.newPassword);
    if (pwErr) errs.newPassword = pwErr;
    if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const changePassword = async () => {
    const errs = validatePw();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setSaving(true);
    try {
      // Step 1: Request OTP (Backend verifies current password first)
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword
      });
      
      setOtpPending(true);
      setOtpTimer(60); // 60 seconds resend timer
      showToast('Verification code sent to your email');
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrs = {};
        error.response.data.errors.forEach(err => {
          backendErrs[err.field] = err.message;
        });
        setPwErrors(backendErrs);
      }
      showToast(error.response?.data?.message || 'Failed to request password change', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmPasswordChange = async () => {
    if (!otpCode || otpCode.length !== 6) {
      showToast('Please enter a valid 6-digit code', 'error');
      return;
    }
    setVerifying(true);
    try {
      await authAPI.confirmChangePassword({
        otp: otpCode,
        newPassword: pwForm.newPassword
      });
      
      setOtpPending(false);
      setOtpCode('');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
      showToast('Password updated successfully!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword
      });
      setOtpTimer(60);
      showToast('New verification code sent');
    } catch {
      showToast('Failed to resend code', 'error');
    }
  };

  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const toggleSecurity = async (key, value) => {
    // 1. Log payload
    log(`[Security Toggle] Payload for ${key}:`, value);

    setUpdating(prev => ({ ...prev, [key]: true }));

    // Determine the state setter and the previous value for reverting
    let setter;
    let previousValue;
    if (key === 'twoFactorEnabled') {
      setter = setTwoFactor;
      previousValue = twoFactor;
    } else if (key === 'loginAlerts') {
      setter = setLoginAlerts;
      previousValue = loginAlerts;
    } else if (key === 'passwordChangeAlerts') {
      setter = setPasswordAlerts;
      previousValue = passwordAlerts;
    }

    // Optimistically update the state
    if (setter) setter(value);

    try {
      // call updateProfile with silent = true (third param) to avoid duplicate success toasts
      const res = await updateProfile('securitySettings', { [key]: value }, true, true);
      
      // 2. Log API response
      log(`[Security Toggle] API response for ${key}:`, res);

      if (res && res.success) {
        showToast('Security settings updated successfully.');
      } else {
        // Revert optimistic update
        if (setter) setter(previousValue);
        showToast(res?.message || 'Failed to update security settings.', 'error');
      }
    } catch (error) {
      console.error(`[Security Toggle] Error updating ${key}:`, error);
      // Revert optimistic update
      if (setter) setter(previousValue);
      showToast('Failed to update security settings.', 'error');
    } finally {
      setUpdating(prev => ({ ...prev, [key]: false }));
    }
  };

  const sendForgot = async () => {
    setSaving(true);
    try {
      await authAPI.requestPasswordReset({ email: profile?.personalInfo?.email });
      setForgotSent(true);
      showToast('OTP sent to your email!');
    } catch {
      showToast('Failed to send reset link', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="fl-page-header">
        <h1 className="fl-page-title">Security Settings</h1>
        <p className="fl-page-sub">Manage your password and security preferences.</p>
      </div>

      {/* Change Password */}
      {isSupabaseUser ? (
        <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
          <h3 className="fl-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={18} /> Account Information</h3>
          <div className="fl-form-grid">
            <div className="fl-form-group">
              <label className="fl-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="fl-input"
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
      <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="fl-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={18} /> Change Password</h3>
        <div className="fl-form-grid">
          <div className="fl-form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-label">Current Password</label>
              <button
                type="button"
                onClick={() => setForgotModal(true)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className={`fl-input${pwErrors.currentPassword ? ' fl-input--error' : ''}`}
                value={pwForm.currentPassword}
                onChange={(e) => { setPwForm((p) => ({ ...p, currentPassword: e.target.value })); setPwErrors((e2) => ({ ...e2, currentPassword: '' })); }}
                placeholder="••••••••"
              />
              {pwErrors.currentPassword && <span className="fl-error">{pwErrors.currentPassword}</span>}
            </div>
          </div>
          <div className="fl-form-group" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="fl-form-group" style={{ margin: 0 }}>
              <label className="fl-label">New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className={`fl-input${pwErrors.newPassword ? ' fl-input--error' : ''}`}
                value={pwForm.newPassword}
                onChange={(e) => { setPwForm((p) => ({ ...p, newPassword: e.target.value })); setPwErrors((e2) => ({ ...e2, newPassword: '' })); }}
                placeholder="Min 8 characters"
              />
              {pwErrors.newPassword && <span className="fl-error">{pwErrors.newPassword}</span>}
              {pwForm.newPassword && (
                <div className="fl-pw-strength">
                  <div
                    className="fl-pw-strength__bar"
                    style={{
                      width: `${Math.min(100, pwForm.newPassword.length * 10)}%`,
                      background: pwForm.newPassword.length >= 12 ? '#10b981' : pwForm.newPassword.length >= 8 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                  <span className="fl-pw-strength__label">
                    {pwForm.newPassword.length >= 12 ? 'Strong' : pwForm.newPassword.length >= 8 ? 'Good' : 'Weak'}
                  </span>
                </div>
              )}
            </div>
            <div className="fl-form-group" style={{ margin: 0 }}>
              <label className="fl-label">Confirm New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className={`fl-input${pwErrors.confirmPassword ? ' fl-input--error' : ''}`}
                value={pwForm.confirmPassword}
                onChange={(e) => { setPwForm((p) => ({ ...p, confirmPassword: e.target.value })); setPwErrors((e2) => ({ ...e2, confirmPassword: '' })); }}
                placeholder="••••••••"
              />
              {pwErrors.confirmPassword && <span className="fl-error">{pwErrors.confirmPassword}</span>}
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
            {saving ? 'Updating...' : <><Save size={18} style={{ marginRight: '8px' }} /> Update Password</>}
          </button>
        </div>
      </div>
      )}

      {/* Security Options */}
      <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="fl-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={18} /> Security Options</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Available for ALL users */}
          <div className="fl-toggle">
            <div className="fl-toggle__info">
              <span className="fl-toggle__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bell size={18} /> Login Alerts</span>
              <span className="fl-toggle__desc">Get notified whenever someone logs into your account.</span>
            </div>
            <div
              className={`fl-toggle__switch${loginAlerts ? ' fl-toggle__switch--on' : ''}${updating['loginAlerts'] ? ' fl-toggle__switch--loading' : ''}`}
              onClick={() => !updating['loginAlerts'] && toggleSecurity('loginAlerts', !loginAlerts)}
            />
          </div>

          {/* ONLY for Email/Password users */}
          {!isSupabaseUser && (
            <>
              <div className="fl-toggle">
                <div className="fl-toggle__info">
                  <span className="fl-toggle__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={18} /> Two-Factor Authentication</span>
                  <span className="fl-toggle__desc">Add an extra layer of security to your account.</span>
                </div>
                <div
                  className={`fl-toggle__switch${twoFactor ? ' fl-toggle__switch--on' : ''}${updating['twoFactorEnabled'] ? ' fl-toggle__switch--loading' : ''}`}
                  onClick={() => !updating['twoFactorEnabled'] && toggleSecurity('twoFactorEnabled', !twoFactor)}
                />
              </div>
              <div className="fl-toggle">
                <div className="fl-toggle__info">
                  <span className="fl-toggle__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={18} /> Password Change Alerts</span>
                  <span className="fl-toggle__desc">Get notified immediately if your password is changed.</span>
                </div>
                <div
                  className={`fl-toggle__switch${passwordAlerts ? ' fl-toggle__switch--on' : ''}${updating['passwordChangeAlerts'] ? ' fl-toggle__switch--loading' : ''}`}
                  onClick={() => !updating['passwordChangeAlerts'] && toggleSecurity('passwordChangeAlerts', !passwordAlerts)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <Modal title="Reset Password" onClose={() => setForgotModal(false)}>
          {forgotSent ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}><Lock size={40} /></div>
              <p>We've sent a password reset link to your email address.</p>
              <button className="fl-btn fl-btn--primary" style={{ marginTop: '1rem' }} onClick={() => setForgotModal(false)}>Close</button>
            </div>
          ) : (
            <div style={{ padding: '0.5rem' }}>
              <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-mid)' }}>Click below to receive a password reset link at your registered email.</p>
              <button className={`fl-btn fl-btn--primary${saving ? ' fl-btn--loading' : ''}`} disabled={saving} onClick={sendForgot}>
                {saving ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* OTP Verification Modal for Password Change */}
      <Modal open={otpPending} title="Verify Password Change" onClose={() => {}}>
          <div style={{ padding: '0.5rem' }}>
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-mid)' }}>
              A 6-digit verification code was sent to your email. Enter it below to finalize your password change.
            </p>
            <div className="fl-form-group">
              <label className="fl-label">Verification Code</label>
              <input
                type="text"
                className="fl-input"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <button
                className={`fl-btn fl-btn--primary${verifying ? ' fl-btn--loading' : ''}`}
                disabled={verifying || otpCode.length !== 6}
                onClick={confirmPasswordChange}
              >
                {verifying ? 'Verifying...' : 'Finalize Change'}
              </button>
              <button
                className="fl-btn fl-btn--ghost"
                disabled={otpTimer > 0}
                onClick={handleResendOtp}
                style={{ fontSize: '0.85rem' }}
              >
                {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend Code'}
              </button>
            </div>
          </div>
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
