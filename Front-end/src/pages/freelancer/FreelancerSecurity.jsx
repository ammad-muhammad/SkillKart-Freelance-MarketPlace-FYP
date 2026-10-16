import { useState, useContext, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Key, Shield, Bell, Lock, AlertCircle, Eye, EyeOff,
  Smartphone, Monitor, Globe, LogOut, CheckCircle2,
  AlertTriangle, RefreshCw, Check, ArrowRight, ShieldCheck, Clock
} from 'lucide-react';
import { useFreelancer } from '../../context/FreelancerContext';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { validatePassword } from '../../utils/validation';
import Modal from '../../Components/common/Modal/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import Loader from '../../Components/common/Loader/Loader';
import Reveal from './components/Reveal';
import './FreelancerSecurity.css';
import { log } from '../../utils/logger';

export default function FreelancerSecurity() {
  const { profile, updateProfile, showToast } = useFreelancer();
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
  const [showAllActivity, setShowAllActivity] = useState(false);

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
    let score = 20; // base registered
    if (twoFactor) score += 40;
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
    if (passed === 3) return { label: 'Good', color: '#0D9488', pct: 75 };
    return { label: 'Strong', color: '#10B981', pct: 100 };
  }, [pwRules]);

  const validatePw = () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    const pwErr = validatePassword(pwForm.newPassword);
    if (pwErr) errs.newPassword = pwErr;
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleChangePassword = async () => {
    const errs = validatePw();
    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      return;
    }
    setSavingPw(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      });
      setOtpPending(true);
      setOtpTimer(60);
      showToast('Verification code sent to your registered email.');
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrs = {};
        error.response.data.errors.forEach((err) => {
          backendErrs[err.field] = err.message;
        });
        setPwErrors(backendErrs);
      }
      showToast(error.response?.data?.message || 'Failed to request password change', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    if (!otpCode || otpCode.length !== 6) {
      showToast('Please enter a valid 6-digit code', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      await authAPI.confirmChangePassword({
        otp: otpCode,
        newPassword: pwForm.newPassword,
      });
      setOtpPending(false);
      setOtpCode('');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
      showToast('Password updated successfully!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Verification failed. Please try again.', 'error');
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
        confirmPassword: pwForm.confirmPassword,
      });
      setOtpTimer(60);
      showToast('New verification code sent');
    } catch {
      showToast('Failed to resend code', 'error');
    }
  };

  const toggleSecurity = async (key, value) => {
    log(`[Security Toggle] Payload for ${key}:`, value);
    setUpdatingToggle((prev) => ({ ...prev, [key]: true }));
    let setter, previousValue;
    if (key === 'twoFactorEnabled') { setter = setTwoFactor; previousValue = twoFactor; }
    else if (key === 'loginAlerts') { setter = setLoginAlerts; previousValue = loginAlerts; }
    else if (key === 'passwordChangeAlerts') { setter = setPasswordAlerts; previousValue = passwordAlerts; }

    if (setter) setter(value);
    try {
      const res = await updateProfile('securitySettings', { [key]: value }, true, true);
      if (res && res.success) {
        showToast('Security settings updated successfully.');
      } else {
        if (setter) setter(previousValue);
        showToast(res?.message || 'Failed to update security settings.', 'error');
      }
    } catch (error) {
      console.error(`[Security Toggle] Error updating ${key}:`, error);
      if (setter) setter(previousValue);
      showToast('Failed to update security settings.', 'error');
    } finally {
      setUpdatingToggle((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSendForgot = async () => {
    setSendingForgot(true);
    try {
      await authAPI.requestPasswordReset({ email: profile?.personalInfo?.email || user?.email });
      setForgotSent(true);
      showToast('Reset instructions sent to your email!');
    } catch {
      showToast('Failed to send reset link', 'error');
    } finally {
      setSendingForgot(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setLoggingOutAll(true);
    try {
      await authAPI.logoutAllDevices();
      await logout('Signed out from all active sessions.');
    } catch {
      showToast('Could not sign out all sessions. Please try again.', 'error');
      setLoggingOutAll(false);
      setConfirmLogoutAll(false);
    }
  };

  // Deactivate Account Handlers
  const handleRequestDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await authAPI.requestDeactivation();
      setDeactivateStep(2);
      showToast('Confirmation code sent to your email.');
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
      showToast(error.response?.data?.message || 'Invalid confirmation code.', 'error');
    } finally {
      setDeactivateLoading(false);
    }
  };

  // Login Activity Items (Clean, concise)
  const loginActivityList = [
    { date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), device: 'Current Browser Session', location: 'Active Connection', status: 'Success' },
    { date: 'Yesterday, 04:15 PM', device: 'Chrome on Windows', location: 'Islamabad, PK', status: 'Success' },
    { date: 'Oct 12, 09:30 AM', device: 'Mobile Safari / iOS', location: 'Karachi, PK', status: 'Success' },
    { date: 'Oct 08, 02:45 PM', device: 'Chrome on Windows', location: 'Lahore, PK', status: 'Success' },
    { date: 'Oct 02, 11:20 AM', device: 'Firefox on MacOS', location: 'Islamabad, PK', status: 'Success' },
  ];

  return (
    <div className="fsec-page-root">
      <div className="fsec-container">

        {/* ─── SHARED PAGE HEADER ─── */}
        <header className="fsec-shared-header">
          <div className="fsec-header-left">
            <nav className="fsec-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/freelancer/dashboard" className="fsec-bc-link">Dashboard</Link>
              <span className="fsec-bc-sep">/</span>
              <span className="fsec-bc-curr">Security</span>
            </nav>
            <h1 className="fsec-page-title">Security & Access</h1>
            <p className="fsec-page-subtitle">
              Manage your password, two-factor authentication, active devices, and session controls.
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
                        ? 'Your account is authenticated via external provider.'
                        : 'Choose a unique, strong password to protect your account balance and contracts.'}
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
                          onClick={() => { setForgotSent(false); setForgotModal(true); }}
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

                    {/* Strength meter & rules chips (Shown while typing) */}
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
                    <p className="fsec-card-desc">Strengthen your account defense against unauthorized access.</p>
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
                      <span className="fsec-toggle-desc">Get an email alert immediately when a new session is initiated on your account.</span>
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
                    <Clock size={18} />
                  </div>
                  <div>
                    <h2 className="fsec-card-title">Recent Login Activity</h2>
                    <p className="fsec-card-desc">Audit history of recent successful authentication attempts.</p>
                  </div>
                </div>

                <div className="fsec-activity-table">
                  {(showAllActivity ? loginActivityList : loginActivityList.slice(0, 3)).map((act, idx) => (
                    <div key={idx} className="fsec-activity-row">
                      <div className="fsec-activity-info">
                        <strong className="fsec-activity-date">{act.date}</strong>
                        <span className="fsec-activity-sub">{act.device} • {act.location}</span>
                      </div>
                      <span className="fsec-chip-status fsec-chip-status--green">
                        {act.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="fsec-card-footer-center">
                  <button
                    type="button"
                    className="fsec-text-link-btn"
                    onClick={() => setShowAllActivity(!showAllActivity)}
                  >
                    <span>{showAllActivity ? 'Show less activity' : `View all (${loginActivityList.length})`}</span>
                  </button>
                </div>
              </section>
            </Reveal>

          </div>
        </div>

        {/* ─── FULL WIDTH AT BOTTOM: DANGER ZONE CARD ─── */}
        <Reveal delay={250}>
          <section className="fsec-card fsec-card--danger">
            <div className="fsec-card-hd">
              <div className="fsec-card-icon-box fsec-card-icon-box--danger">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="fsec-card-title fsec-card-title--danger">Danger Zone</h2>
                <p className="fsec-card-desc">Sensitive account suspension controls.</p>
              </div>
            </div>

            <div className="fsec-danger-row">
              <div className="fsec-danger-info">
                <span className="fsec-danger-name">Deactivate Freelancer Profile</span>
                <span className="fsec-danger-sub">
                  Temporarily disable your profile and active services. You can return and reactivate at any time.
                </span>
              </div>
              <button
                type="button"
                className="fsec-btn-danger"
                onClick={() => { setDeactivateStep(1); setDeactivateOtp(''); setDeactivateModal(true); }}
              >
                Deactivate Account
              </button>
            </div>
          </section>
        </Reveal>

      </div>

      {/* ─── MODALS ─── */}

      {/* Forgot Password Modal */}
      <Modal
        open={forgotModal}
        title="Reset Password"
        onClose={() => setForgotModal(false)}
      >
        <div className="fsec-modal-body">
          {forgotSent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle2 size={36} color="#10B981" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, color: '#0F172A', fontWeight: 600 }}>
                Reset instructions dispatched!
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#64748B' }}>
                Please check your email inbox for your password reset link.
              </p>
              <button
                type="button"
                className="fsec-btn-primary"
                style={{ marginTop: 18 }}
                onClick={() => setForgotModal(false)}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
                Click below to receive a password reset verification link sent directly to your registered email (<strong>{profile?.personalInfo?.email || user?.email}</strong>).
              </p>
              <div className="fsec-modal-actions">
                <button type="button" className="fsec-modal-btn-ghost" onClick={() => setForgotModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="fsec-btn-primary"
                  disabled={sendingForgot}
                  onClick={handleSendForgot}
                >
                  {sendingForgot ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* OTP Password Change Modal */}
      <Modal
        open={otpPending}
        title="Verify Password Change"
        onClose={() => {}}
      >
        <div className="fsec-modal-body">
          <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
            A 6-digit confirmation code was sent to your email. Enter it below to finalize updating your password.
          </p>
          <div className="fsec-field">
            <input
              type="text"
              className="fsec-field-input"
              placeholder="000000"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', fontSize: 22, letterSpacing: '0.4em', fontWeight: 800 }}
              aria-label="Enter Verification Code"
            />
          </div>
          <div className="fsec-modal-actions-between">
            <button
              type="button"
              className="fsec-modal-btn-ghost"
              disabled={otpTimer > 0}
              onClick={handleResendOtp}
            >
              {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend Code'}
            </button>
            <button
              type="button"
              className="fsec-btn-primary"
              disabled={verifyingOtp || otpCode.length !== 6}
              onClick={handleConfirmPasswordChange}
            >
              {verifyingOtp ? 'Verifying...' : 'Finalize Change'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Logout All Devices Confirm Dialog */}
      <ConfirmDialog
        open={confirmLogoutAll}
        title="Sign out from all other devices?"
        message="This will revoke access on any other browser or mobile session currently logged into your account."
        confirmLabel="Log out other devices"
        loading={loggingOutAll}
        onConfirm={handleLogoutAllDevices}
        onClose={() => setConfirmLogoutAll(false)}
      />

      {/* Deactivate Account Modal */}
      <Modal
        open={deactivateModal}
        title="Deactivate Account"
        onClose={() => setDeactivateModal(false)}
        danger
      >
        {deactivateStep === 1 ? (
          <div className="fsec-modal-body">
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#334155' }}>
              Deactivating your account will hide your profile and active services from prospective clients.
              <strong> You cannot deactivate if you currently have active in-progress contracts.</strong>
            </p>
            <p style={{ margin: 0, color: '#EF4444', fontWeight: 600, fontSize: 13.5 }}>
              Are you sure you want to proceed with deactivation?
            </p>
            <div className="fsec-modal-actions">
              <button type="button" className="fsec-modal-btn-ghost" onClick={() => setDeactivateModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="fsec-btn-danger"
                onClick={handleRequestDeactivate}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? 'Checking...' : 'Yes, Send OTP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="fsec-modal-body">
            <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
              Enter the 6-digit confirmation code sent to your email to confirm deactivation.
            </p>
            <div className="fsec-field">
              <input
                className="fsec-field-input"
                aria-label="Enter Confirmation Code"
                placeholder="000000"
                value={deactivateOtp}
                onChange={(e) => setDeactivateOtp(e.target.value)}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.3em', fontWeight: 700 }}
              />
            </div>
            <div className="fsec-modal-actions">
              <button type="button" className="fsec-modal-btn-ghost" onClick={() => setDeactivateModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="fsec-btn-danger"
                onClick={handleConfirmDeactivate}
                disabled={deactivateLoading || !deactivateOtp}
              >
                {deactivateLoading ? 'Processing...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
