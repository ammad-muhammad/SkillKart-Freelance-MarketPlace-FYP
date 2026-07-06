import { Key, EyeOff, Eye, AlertCircle, Lock, Shield, Bell, AlertTriangle, Trash2, Mail } from 'lucide-react';
import { useState, useContext, useEffect } from 'react';
import { useClient } from '../../context/ClientContext';
import { LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { validatePassword } from '../../utils/validation';
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
  const { user, logout } = useContext(AuthContext);
  const isSupabaseUser = !!user?.supabaseId || user?.authProvider !== 'email';
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Revoke all sessions server-side (bumps tokenVersion), then sign out here.
  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await authAPI.logoutAllDevices();
      await logout('Signed out from all devices.');
    } catch {
      showToast('Could not sign out from all devices. Please try again.', 'error');
      setLoggingOutAll(false);
    }
  };
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
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
  const [loginAlerts, setLoginAlerts] = useState(!!profile?.securitySettings?.loginAlerts);
  const [passwordAlerts, setPasswordAlerts] = useState(!!profile?.securitySettings?.passwordChangeAlerts);
  
  // Password Change OTP State
  const [otpPending, setOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [updating, setUpdating] = useState({});
  
  useEffect(() => {
    setTwoFactor(!!profile?.securitySettings?.twoFactorEnabled);
    setLoginAlerts(!!profile?.securitySettings?.loginAlerts);
    setPasswordAlerts(!!profile?.securitySettings?.passwordChangeAlerts);
  }, [profile?.securitySettings]);

  const validate = () => {
    const e = {};
    if (!passwords.currentPassword) e.currentPassword = 'Current password is required';
    const pwErr = validatePassword(passwords.newPassword);
    if (pwErr) e.newPassword = pwErr;
    if (passwords.newPassword !== passwords.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const changePassword = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Step 1: Request OTP
      await authAPI.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword
      });
      
      setOtpPending(true);
      setOtpTimer(60);
      showToast('Verification code sent to your email');
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrs = {};
        error.response.data.errors.forEach(err => {
          backendErrs[err.field] = err.message;
        });
        setErrors(backendErrs);
      }
      showToast(error.response?.data?.message || 'Failed to request password change', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmPasswordChange = async () => {
    if (!otpCode || otpCode.length !== 6) {
      showToast('Please enter 6-digit code', 'error');
      return;
    }
    setVerifying(true);
    try {
      await authAPI.confirmChangePassword({
        otp: otpCode,
        newPassword: passwords.newPassword
      });
      
      setOtpPending(false);
      setOtpCode('');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
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
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword
      });
      setOtpTimer(60);
      showToast('New code sent');
    } catch (error) {
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

  const strength = getStrength(passwords.newPassword);
  const strengthInfo = strengthLabel(strength);

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

  const toggleSecurity = async (key, value) => {
    // 1. Log payload
    console.log(`[Security Toggle] Payload for ${key}:`, value);

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
      console.log(`[Security Toggle] API response for ${key}:`, res);

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

  // 3. Log rendered state
  console.log('[ClientSecurity] Rendered state:', {
    twoFactor,
    loginAlerts,
    passwordAlerts
  });

  return (
    <div>
      <div className="cl-page-header">
        <h1 className="cl-page-title">Security</h1>
        <p className="cl-page-sub">Manage your password and account security settings.</p>
      </div>

      {/* Change Password / Account Info */}
      {isSupabaseUser ? (
        <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="cl-section-title"><Key size={18} style={{ marginRight: '8px' }} /> Account Information</h3>
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
          <h3 className="cl-section-title"><Key size={18} style={{ marginRight: '8px' }} /> Change Password</h3>
          <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword', label: 'New Password' },
            { key: 'confirmPassword', label: 'Confirm New Password' },
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
                  {showPwd[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors[key] && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {errors[key]}</span>}
              {key === 'newPassword' && passwords.newPassword && (
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
                {saving ? 'Saving...' : <><Lock size={16} style={{ marginRight: '8px' }} /> Change Password</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Options */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title"><Shield size={18} style={{ marginRight: '8px' }} /> Security Options</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Available for ALL users */}
          <div className="cl-toggle">
            <div className="cl-toggle__info">
              <span className="cl-toggle__label"><Bell size={16} style={{ marginRight: '8px' }} /> Login Alerts</span>
              <span className="cl-toggle__desc">Get notified whenever someone logs into your account.</span>
            </div>
            <div
              className={`cl-toggle__switch${loginAlerts ? ' cl-toggle__switch--on' : ''}${updating['loginAlerts'] ? ' cl-toggle__switch--loading' : ''}`}
              onClick={() => !updating['loginAlerts'] && toggleSecurity('loginAlerts', !loginAlerts)}
            />
          </div>

          {/* ONLY for Email/Password users */}
          {!isSupabaseUser && (
            <>
              <div className="cl-toggle">
                <div className="cl-toggle__info">
                  <span className="cl-toggle__label"><Lock size={16} style={{ marginRight: '8px' }} /> Two-Factor Authentication</span>
                  <span className="cl-toggle__desc">Add an extra layer of security with 2FA</span>
                </div>
                <div
                  className={`cl-toggle__switch${twoFactor ? ' cl-toggle__switch--on' : ''}${updating['twoFactorEnabled'] ? ' cl-toggle__switch--loading' : ''}`}
                  onClick={() => !updating['twoFactorEnabled'] && toggleSecurity('twoFactorEnabled', !twoFactor)}
                />
              </div>
              <div className="cl-toggle">
                <div className="cl-toggle__info">
                  <span className="cl-toggle__label"><Shield size={16} style={{ marginRight: '8px' }} /> Password Change Alerts</span>
                  <span className="cl-toggle__desc">Get notified immediately if your password is changed.</span>
                </div>
                <div
                  className={`cl-toggle__switch${passwordAlerts ? ' cl-toggle__switch--on' : ''}${updating['passwordChangeAlerts'] ? ' cl-toggle__switch--loading' : ''}`}
                  onClick={() => !updating['passwordChangeAlerts'] && toggleSecurity('passwordChangeAlerts', !passwordAlerts)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="cl-card">
        <h3 className="cl-section-title" style={{ color: '#dc2626' }}><AlertTriangle size={18} style={{ marginRight: '8px' }} /> Danger Zone</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="cl-btn cl-btn--ghost" onClick={handleLogoutAll} disabled={loggingOutAll}>
            <LogOut size={16} /> {loggingOutAll ? 'Signing out…' : 'Logout from All Devices'}
          </button>
          <button className="cl-btn cl-btn--danger" onClick={() => { setDeactivateStep(1); setDeactivateOtp(''); setDeactivateModal(true); }}>
            <Trash2 size={16} style={{ marginRight: '8px' }} /> Deactivate Account
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
            <div style={{ color: 'var(--color-primary)' }}><Mail size={48} /></div>
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

      {/* Password Change OTP Modal */}
      <Modal open={otpPending} title="Verify Password Change" onClose={() => {}}>
        <div style={{ padding: '0.5rem' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-mid)', fontSize: '0.9rem' }}>
            A 6-digit verification code was sent to your email. Enter it below to finalize your password change.
          </p>
          <div className="cl-form-group">
            <label className="cl-label">Verification Code</label>
            <input
              type="text"
              className="cl-input"
              placeholder="000000"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button
              className={`cl-btn cl-btn--primary${verifying ? ' cl-btn--loading' : ''}`}
              disabled={verifying || otpCode.length !== 6}
              onClick={confirmPasswordChange}
            >
              {verifying ? 'Verifying...' : 'Finalize Change'}
            </button>
            <button
              className="cl-btn cl-btn--ghost"
              disabled={otpTimer > 0}
              onClick={handleResendOtp}
              style={{ fontSize: '0.85rem' }}
            >
              {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClientSecurity;
