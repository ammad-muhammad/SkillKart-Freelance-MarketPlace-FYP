import { useState, useContext, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Key, Shield, Bell, Lock, AlertCircle, Eye, EyeOff,
  Monitor, LogOut, CheckCircle2, AlertTriangle, RefreshCw, Check, ShieldCheck
} from 'lucide-react';
import { useClient } from '../../context/ClientContext';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { validatePassword } from '../../utils/validation';
import Modal from '../../Components/common/Modal/Modal';
import Reveal from '../freelancer/components/Reveal';
import '../freelancer/FreelancerSecurity.css';
import { log } from '../../utils/logger';

export default function ClientSecurity() {
  const { profile, updateProfile, showToast } = useClient();
  const { user, logout } = useContext(AuthContext);
  const isSupabaseUser = !!user?.supabaseId || (user?.authProvider && user?.authProvider !== 'email');
  const sec = profile?.securitySettings || {};

  // Password Form State
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Forgot Password Modal
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [sendingForgot, setSendingForgot] = useState(false);

  // OTP Verification Modal
  const [otpPending, setOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Toggles State
  const [twoFactor, setTwoFactor] = useState(!!sec.twoFactorEnabled);
  const [loginAlerts, setLoginAlerts] = useState(!!sec.loginAlerts);
  const [passwordAlerts, setPasswordAlerts] = useState(!!sec.passwordChangeAlerts);
  const [updatingToggle, setUpdatingToggle] = useState({});

  // Active Sessions & Logout All
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Danger Zone Deactivation
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [deactivateOtp, setDeactivateOtp] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  useEffect(() => {
    setTwoFactor(!!profile?.securitySettings?.twoFactorEnabled);
    setLoginAlerts(!!profile?.securitySettings?.loginAlerts);
    setPasswordAlerts(!!profile?.securitySettings?.passwordChangeAlerts);
  }, [profile?.securitySettings]);

  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Derived Security Score
  const securityScore = useMemo(() => {
    let score = 25; // base registered
    if (twoFactor) score += 35;
    if (loginAlerts) score += 20;
    if (passwordAlerts) score += 20;
    return Math.min(100, score);
  }, [twoFactor, loginAlerts, passwordAlerts]);

  // Password rules checklist
  const pwRules = useMemo(() => {
    const pwd = pwForm.newPassword;
    return {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[^a-zA-Z0-9]/.test(pwd),
    };
  }, [pwForm.newPassword]);

  const pwStrength = useMemo(() => {
    const passed = Object.values(pwRules).filter(Boolean).length;
    if (passed <= 1) return { label: 'Weak', color: '#EF4444', pct: 25 };
    if (passed === 2) return { label: 'Fair', color: '#F59E0B', pct: 50 };
    if (passed === 3) return { label: 'Good', color: '#10B981', pct: 75 };
    return { label: 'Strong', color: '#059669', pct: 100 };
  }, [pwRules]);

  // Validate form
  const validate = () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    const pwErr = validatePassword(pwForm.newPassword);
    if (pwErr) errs.newPassword = pwErr;
    if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 1: Submit change password
  const handleChangePassword = async () => {
    if (!validate()) return;
    setSavingPw(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword
      });
      setOtpPending(true);
      setOtpTimer(60);
      showToast('Verification code sent to your email.');
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
      setSavingPw(false);
    }
  };

  // Step 2: Confirm OTP
  const handleConfirmOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      showToast('Please enter the 6-digit code', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      await authAPI.confirmChangePassword({
        otp: otpCode,
        newPassword: pwForm.newPassword
      });
      setOtpPending(false);
      setOtpCode('');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
      showToast('Password updated successfully!', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Verification failed', 'error');
    } finally {
      setVerifyingOtp(false);
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
      showToast('A fresh verification code was sent to your email.');
    } catch {
      showToast('Failed to resend code', 'error');
    }
  };

  // Toggle Security Options
  const toggleSecurity = async (key, val) => {
    setUpdatingToggle((prev) => ({ ...prev, [key]: true }));
    let setter = key === 'twoFactorEnabled' ? setTwoFactor : key === 'loginAlerts' ? setLoginAlerts : setPasswordAlerts;
    const prevVal = key === 'twoFactorEnabled' ? twoFactor : key === 'loginAlerts' ? loginAlerts : passwordAlerts;
    setter(val);

    try {
      const res = await updateProfile('securitySettings', { [key]: val }, true, true);
      if (res && res.success) {
        showToast('Security settings updated successfully.');
      } else {
        setter(prevVal);
        showToast(res?.message || 'Failed to update security settings.', 'error');
      }
    } catch {
      setter(prevVal);
      showToast('Failed to update security settings.', 'error');
    } finally {
      setUpdatingToggle((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Log Out All Devices
  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await authAPI.logoutAllDevices();
      await logout('Signed out from all devices.');
    } catch {
      showToast('Could not sign out from all devices.', 'error');
      setLoggingOutAll(false);
      setConfirmLogoutAll(false);
    }
  };

  // Forgot Password Request
  const handleSendForgot = async () => {
    const targetEmail = forgotEmail || profile?.personalInfo?.email || user?.email;
    if (!targetEmail) return;
    setSendingForgot(true);
    try {
      await authAPI.requestPasswordReset({ email: targetEmail });
      setForgotSent(true);
      showToast('Password reset link sent to your email.');
    } catch {
      showToast('Failed to send reset link', 'error');
    } finally {
      setSendingForgot(false);
    }
  };

  // Deactivation Handlers
  const handleRequestDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await authAPI.requestDeactivation();
      setDeactivateStep(2);
      showToast('OTP sent to your email for deactivation.', 'info');
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot initiate deactivation.', 'error');
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
      showToast(error.response?.data?.message || 'Invalid confirmation code.', 'error');
    } finally {
      setDeactivateLoading(false);
    }
  };

  // Login Activity Items
  const loginActivityList = [
    { date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), device: 'Current Browser Session', location: 'Active Connection', status: 'Success' },
    { date: 'Yesterday, 04:15 PM', device: 'Chrome on Windows', location: 'Islamabad, PK', status: 'Success' },
    { date: 'Oct 12, 09:30 AM', device: 'Mobile Safari / iOS', location: 'Karachi, PK', status: 'Success' },
    { date: 'Oct 08, 02:45 PM', device: 'Chrome on Windows', location: 'Lahore, PK', status: 'Success' },
  ];

  return (
    <div className="fsec-page-root">
      <div className="fsec-container">

        {/* ─── SHARED PAGE HEADER ─── */}
        <header className="fsec-shared-header">
          <div className="fsec-header-left">
            <nav className="fsec-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/client/dashboard" className="fsec-bc-link">Dashboard</Link>
              <span className="fsec-bc-sep">/</span>
              <span className="fsec-bc-curr">Security</span>
            </nav>
            <h1 className="fsec-page-title">Security & Access</h1>
            <p className="fsec-page-subtitle">
              Manage your password, two-factor authentication, active client sessions, and account protection.
            </p>
          </div>
        </header>

        {/* ─── TOP SECURITY OVERVIEW STRIP ─── */}
        <Reveal delay={0}>
          <div className="fsec-overview-strip-card" aria-label="Account Security Summary">
            <div className="fsec-overview-item">
              <span className="fsec-overview-lbl">Two-Factor Authentication</span>
              <div className="fsec-overview-val-row">
                <span className={`fsec-chip-status ${twoFactor ? 'fsec-chip-status--green' : 'fsec-chip-status--amber'}`}>
                  {twoFactor ? 'Active (Enabled)' : 'Disabled (Off)'}
                </span>
              </div>
            </div>

            <div className="fsec-overview-divider" />

            <div className="fsec-overview-item">
              <span className="fsec-overview-lbl">Active Sessions</span>
              <div className="fsec-overview-val-row">
                <strong className="fsec-overview-strong">1 Device Online</strong>
                <span className="fsec-chip-status fsec-chip-status--green">This device</span>
              </div>
            </div>

            <div className="fsec-overview-divider" />

            <div className="fsec-overview-item fsec-overview-item--score">
              <div className="fsec-score-label-row">
                <span className="fsec-overview-lbl">Security Score</span>
                <strong className="fsec-score-percent">{securityScore}%</strong>
              </div>
              <div className="fsec-score-track">
                <div
                  className="fsec-score-fill"
                  style={{
                    width: `${securityScore}%`,
                    background: securityScore >= 80 ? '#10B981' : securityScore >= 50 ? '#F59E0B' : '#EF4444'
                  }}
                />
              </div>
            </div>
          </div>
        </Reveal>

        {/* ─── 2 COLUMNS DESKTOP (Col 7 + Col 5) ─── */}
        <div className="fsec-columns-grid">

          {/* ════════ LEFT COLUMN (Col 7) ════════ */}
          <div className="fsec-col-left">

            {/* 1) CHANGE PASSWORD CARD */}
            <Reveal delay={50}>
              <section className="fsec-card">
                <div className="fsec-card-hd">
                  <div className="fsec-card-icon-box">
                    <Key size={18} />
                  </div>
                  <div>
                    <h2 className="fsec-card-title">
                      {isSupabaseUser ? 'Account Authentication' : 'Change Password'}
                    </h2>
                    <p className="fsec-card-desc">
                      {isSupabaseUser
                        ? 'Your account is authenticated via an external provider.'
                        : 'Choose a unique, strong password to protect your client wallet and hiring contracts.'}
                    </p>
                  </div>
                </div>

                {isSupabaseUser ? (
                  <div className="fsec-oauth-notice">
                    <ShieldCheck size={18} className="fsec-oauth-icon" />
                    <div>
                      <strong style={{ display: 'block', color: '#0B2942', marginBottom: 2 }}>OAuth Managed Account</strong>
                      <span>You signed in via an external provider ({user?.email || profile?.personalInfo?.email}). Password updates are disabled.</span>
                    </div>
                  </div>
                ) : (
                  <div className="fsec-pw-fields-stack">
                    {/* Current Password Field */}
                    <div className="fsec-field">
                      <div className="fsec-field-header-row">
                        <label className="fsec-field-label" htmlFor="fsec-cur-pw">Current Password</label>
                        <button
                          type="button"
                          className="fsec-forgot-link-btn"
                          onClick={() => {
                            setForgotEmail(profile?.personalInfo?.email || user?.email || '');
                            setForgotSent(false);
                            setForgotModal(true);
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>

                      <div className="fsec-input-wrap">
                        <input
                          id="fsec-cur-pw"
                          type={showCurrentPw ? 'text' : 'password'}
                          className={`fsec-field-input ${pwErrors.currentPassword ? 'fsec-field-input--error' : ''}`}
                          value={pwForm.currentPassword}
                          onChange={(e) => {
                            setPwForm((p) => ({ ...p, currentPassword: e.target.value }));
                            setPwErrors((pe) => ({ ...pe, currentPassword: '' }));
                          }}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="fsec-eye-btn"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          tabIndex={-1}
                          aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {pwErrors.currentPassword && (
                        <span className="fsec-field-err">{pwErrors.currentPassword}</span>
                      )}
                    </div>

                    {/* 2-Column Row for New & Confirm Password */}
                    <div className="fsec-fields-2col">
                      <div className="fsec-field">
                        <label className="fsec-field-label" htmlFor="fsec-new-pw">New Password</label>
                        <div className="fsec-input-wrap">
                          <input
                            id="fsec-new-pw"
                            type={showNewPw ? 'text' : 'password'}
                            className={`fsec-field-input ${pwErrors.newPassword ? 'fsec-field-input--error' : ''}`}
                            value={pwForm.newPassword}
                            onChange={(e) => {
                              setPwForm((p) => ({ ...p, newPassword: e.target.value }));
                              setPwErrors((pe) => ({ ...pe, newPassword: '' }));
                            }}
                            placeholder="Min 8 characters"
                          />
                          <button
                            type="button"
                            className="fsec-eye-btn"
                            onClick={() => setShowNewPw(!showNewPw)}
                            tabIndex={-1}
                            aria-label={showNewPw ? 'Hide password' : 'Show password'}
                          >
                            {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {pwErrors.newPassword && (
                          <span className="fsec-field-err">{pwErrors.newPassword}</span>
                        )}
                      </div>

                      <div className="fsec-field">
                        <label className="fsec-field-label" htmlFor="fsec-conf-pw">Confirm New Password</label>
                        <div className="fsec-input-wrap">
                          <input
                            id="fsec-conf-pw"
                            type={showConfirmPw ? 'text' : 'password'}
                            className={`fsec-field-input ${pwErrors.confirmPassword ? 'fsec-field-input--error' : ''}`}
                            value={pwForm.confirmPassword}
                            onChange={(e) => {
                              setPwForm((p) => ({ ...p, confirmPassword: e.target.value }));
                              setPwErrors((pe) => ({ ...pe, confirmPassword: '' }));
                            }}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            className="fsec-eye-btn"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            tabIndex={-1}
                            aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {pwErrors.confirmPassword && (
                          <span className="fsec-field-err">{pwErrors.confirmPassword}</span>
                        )}
                      </div>
                    </div>

                    {/* Strength meter & rules chips */}
                    {pwForm.newPassword && (
                      <div className="fsec-strength-block">
                        <div className="fsec-strength-bar-row">
                          <div className="fsec-strength-track">
                            <div
                              className="fsec-strength-fill"
                              style={{ width: `${pwStrength.pct}%`, background: pwStrength.color }}
                            />
                          </div>
                          <span className="fsec-strength-label" style={{ color: pwStrength.color }}>
                            {pwStrength.label}
                          </span>
                        </div>

                        <div className="fsec-rules-chips-row">
                          <span className={`fsec-rule-chip ${pwRules.length ? 'fsec-rule-chip--pass' : ''}`}>
                            <Check size={11} /> 8+ chars
                          </span>
                          <span className={`fsec-rule-chip ${pwRules.uppercase ? 'fsec-rule-chip--pass' : ''}`}>
                            <Check size={11} /> Uppercase
                          </span>
                          <span className={`fsec-rule-chip ${pwRules.number ? 'fsec-rule-chip--pass' : ''}`}>
                            <Check size={11} /> Number
                          </span>
                          <span className={`fsec-rule-chip ${pwRules.symbol ? 'fsec-rule-chip--pass' : ''}`}>
                            <Check size={11} /> Symbol
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="fsec-card-footer">
                      <button
                        type="button"
                        className="fsec-btn-primary"
                        disabled={savingPw || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                        onClick={handleChangePassword}
                      >
                        {savingPw ? 'Sending Code...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </Reveal>

            {/* 2) TWO-FACTOR & ALERT TOGGLES CARD */}
            <Reveal delay={100}>
              <section className="fsec-card">
                <div className="fsec-card-hd">
                  <div className="fsec-card-icon-box">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h2 className="fsec-card-title">Security & Verification Options</h2>
                    <p className="fsec-card-desc">Strengthen your client workspace defense against unauthorized access.</p>
                  </div>
                </div>

                <div className="fsec-toggles-stack">
                  {!isSupabaseUser && (
                    <div className="fsec-toggle-row">
                      <div className="fsec-toggle-icon-wrap">
                        <Lock size={16} />
                      </div>
                      <div className="fsec-toggle-text-col">
                        <span className="fsec-toggle-name">Two-Factor Authentication (2FA)</span>
                        <span className="fsec-toggle-desc">Require an email OTP code whenever logging in from a new browser or device.</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={twoFactor}
                        className={`fsec-switch ${twoFactor ? 'fsec-switch--on' : ''}`}
                        disabled={updatingToggle['twoFactorEnabled']}
                        onClick={() => toggleSecurity('twoFactorEnabled', !twoFactor)}
                      >
                        <span className="fsec-switch-thumb" />
                      </button>
                    </div>
                  )}

                  <div className="fsec-toggle-row">
                    <div className="fsec-toggle-icon-wrap">
                      <Bell size={16} />
                    </div>
                    <div className="fsec-toggle-text-col">
                      <span className="fsec-toggle-name">Login Alerts</span>
                      <span className="fsec-toggle-desc">Get an email alert immediately when a new login is initiated on your account.</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={loginAlerts}
                      className={`fsec-switch ${loginAlerts ? 'fsec-switch--on' : ''}`}
                      disabled={updatingToggle['loginAlerts']}
                      onClick={() => toggleSecurity('loginAlerts', !loginAlerts)}
                    >
                      <span className="fsec-switch-thumb" />
                    </button>
                  </div>

                  {!isSupabaseUser && (
                    <div className="fsec-toggle-row">
                      <div className="fsec-toggle-icon-wrap">
                        <AlertCircle size={16} />
                      </div>
                      <div className="fsec-toggle-text-col">
                        <span className="fsec-toggle-name">Password Change Alerts</span>
                        <span className="fsec-toggle-desc">Receive emergency notices whenever your password or recovery contact is modified.</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={passwordAlerts}
                        className={`fsec-switch ${passwordAlerts ? 'fsec-switch--on' : ''}`}
                        disabled={updatingToggle['passwordChangeAlerts']}
                        onClick={() => toggleSecurity('passwordChangeAlerts', !passwordAlerts)}
                      >
                        <span className="fsec-switch-thumb" />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </Reveal>

          </div>

          {/* ════════ RIGHT COLUMN (Col 5) ════════ */}
          <div className="fsec-col-right">

            {/* 3) ACTIVE SESSIONS CARD */}
            <Reveal delay={150}>
              <section className="fsec-card">
                <div className="fsec-card-hd">
                  <div className="fsec-card-icon-box">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h2 className="fsec-card-title">Active Sessions</h2>
                    <p className="fsec-card-desc">Devices currently authenticated to your account.</p>
                  </div>
                </div>

                <div className="fsec-sessions-list">
                  <div className="fsec-session-row">
                    <div className="fsec-session-device-icon">
                      <Monitor size={16} />
                    </div>
                    <div className="fsec-session-info-col">
                      <div className="fsec-session-name-row">
                        <span className="fsec-session-device-name">Current Web Session</span>
                        <span className="fsec-chip-status fsec-chip-status--green">This device</span>
                      </div>
                      <span className="fsec-session-meta">
                        Online Now • Active IP & Location
                      </span>
                    </div>
                  </div>
                </div>

                <div className="fsec-card-footer">
                  <button
                    type="button"
                    className="fsec-btn-outline-danger"
                    onClick={() => setConfirmLogoutAll(true)}
                  >
                    <LogOut size={13} />
                    <span>Log out all other devices</span>
                  </button>
                </div>
              </section>
            </Reveal>

            {/* 4) LOGIN ACTIVITY CARD */}
            <Reveal delay={200}>
              <section className="fsec-card">
                <div className="fsec-card-hd">
                  <div className="fsec-card-icon-box">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h2 className="fsec-card-title">Recent Login Activity</h2>
                    <p className="fsec-card-desc">Recent successful sign-in attempts on your profile.</p>
                  </div>
                </div>

                <div className="fsec-activity-list">
                  {loginActivityList.map((item, idx) => (
                    <div key={idx} className="fsec-activity-item">
                      <div className="fsec-activity-left">
                        <span className="fsec-activity-date">{item.date}</span>
                        <span className="fsec-activity-device">{item.device} • {item.location}</span>
                      </div>
                      <span className="fsec-chip-status fsec-chip-status--green">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* 5) DANGER ZONE / DEACTIVATION */}
            <Reveal delay={250}>
              <section className="fsec-card fsec-danger-card">
                <div className="fsec-card-hd">
                  <div className="fsec-card-icon-box fsec-card-icon-box--danger">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h2 className="fsec-card-title fsec-card-title--danger">Deactivate Account</h2>
                    <p className="fsec-card-desc">Temporarily freeze your client profile and active postings.</p>
                  </div>
                </div>

                <p className="fsec-danger-text">
                  Deactivating your account hides your job listings, freezes new applications, and suspends incoming bids. You can re-activate later by logging back in.
                </p>

                <div className="fsec-card-footer">
                  <button
                    type="button"
                    className="fsec-btn-danger"
                    onClick={() => {
                      setDeactivateStep(1);
                      setDeactivateOtp('');
                      setDeactivateModal(true);
                    }}
                  >
                    Deactivate My Account
                  </button>
                </div>
              </section>
            </Reveal>

          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal open={forgotModal} title="Reset Password" onClose={() => setForgotModal(false)}>
        {!forgotSent ? (
          <div>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
              Enter your account email address. We will send you instructions and a link to reset your password.
            </p>
            <div className="fsec-field">
              <label className="fsec-field-label">Account Email</label>
              <input
                type="email"
                className="fsec-field-input"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="fsec-btn-outline" onClick={() => setForgotModal(false)}>Cancel</button>
              <button
                className="fsec-btn-primary"
                onClick={handleSendForgot}
                disabled={sendingForgot || !forgotEmail.trim()}
              >
                {sendingForgot ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle2 size={42} style={{ color: '#10B981', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 18, color: '#0B2942', fontWeight: 800, marginBottom: 6 }}>Reset Email Sent</h3>
              <p style={{ color: '#64748B', fontSize: 13.5 }}>
                Check your inbox at <strong>{forgotEmail}</strong> for the password reset instructions.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button className="fsec-btn-primary" onClick={() => setForgotModal(false)}>Got It</button>
            </div>
          </div>
        )}
      </Modal>

      {/* OTP Password Verification Modal */}
      <Modal open={otpPending} title="Enter Verification Code" onClose={() => setOtpPending(false)}>
        <div>
          <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
            A 6-digit verification code was sent to your email. Enter it below to confirm your new password.
          </p>
          <div className="fsec-field">
            <label className="fsec-field-label">6-Digit Code</label>
            <input
              type="text"
              maxLength={6}
              className="fsec-field-input"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{ textAlign: 'center', fontSize: 20, letterSpacing: '6px', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13 }}>
            <span style={{ color: '#64748B' }}>
              {otpTimer > 0 ? `Resend code in ${otpTimer}s` : "Didn't receive code?"}
            </span>
            {otpTimer === 0 && (
              <button
                type="button"
                onClick={handleResendOtp}
                style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Resend Code
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="fsec-btn-outline" onClick={() => setOtpPending(false)}>Cancel</button>
            <button
              className="fsec-btn-primary"
              onClick={handleConfirmOtp}
              disabled={verifyingOtp || otpCode.length !== 6}
            >
              {verifyingOtp ? 'Verifying...' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Log Out All Devices Modal */}
      <Modal open={confirmLogoutAll} title="Log Out All Devices" onClose={() => setConfirmLogoutAll(false)}>
        <div>
          <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to invalidate all active sessions across all browsers and devices? You will be signed out immediately and need to log back in.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="fsec-btn-outline" onClick={() => setConfirmLogoutAll(false)}>Cancel</button>
            <button
              className="fsec-btn-danger"
              onClick={handleLogoutAll}
              disabled={loggingOutAll}
            >
              {loggingOutAll ? 'Logging out…' : 'Log Out All Devices'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Account Deactivation Modal */}
      <Modal open={deactivateModal} title="Deactivate Account" onClose={() => setDeactivateModal(false)} danger>
        {deactivateStep === 1 ? (
          <div>
            <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
              Deactivating your client account will hide all your posted jobs and pause pending proposals. You can reactivate at any time by simply logging back in.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="fsec-btn-outline" onClick={() => setDeactivateModal(false)}>Cancel</button>
              <button
                className="fsec-btn-danger"
                onClick={handleRequestDeactivate}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? 'Sending Code...' : 'Send Deactivation Code'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
              Enter the 6-digit confirmation code sent to your email to complete deactivation.
            </p>
            <div className="fsec-field">
              <input
                className="fsec-field-input"
                placeholder="Enter 6-digit code"
                value={deactivateOtp}
                onChange={(e) => setDeactivateOtp(e.target.value)}
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: '6px', fontWeight: 700 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="fsec-btn-outline" onClick={() => setDeactivateModal(false)}>Cancel</button>
              <button
                className="fsec-btn-danger"
                onClick={handleConfirmDeactivate}
                disabled={deactivateLoading || !deactivateOtp}
              >
                {deactivateLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
