import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag, Mail, Shield, AlertTriangle, User, Bell,
  Check, Lock, Phone, AlertCircle, RefreshCw, ChevronRight, X
} from 'lucide-react';
import { useFreelancer } from '../../context/FreelancerContext';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../api/auth';
import { freelancersAPI } from '../../api/freelancers';
import Modal from '../../Components/common/Modal/Modal';
import Loader from '../../Components/common/Loader/Loader';
import Reveal from './components/Reveal';
import './FreelancerSettings.css';

export default function FreelancerSettings() {
  const { profile, updateProfile, showToast } = useFreelancer();
  const { user } = useAuth();
  const isSupabaseUser = !!user?.supabaseId || (user?.authProvider && user?.authProvider !== 'email');

  // Form State
  const [form, setForm] = useState({
    username: '',
    email: '',
    recoveryEmail: '',
    recoveryPhone: '',
  });

  const [initialForm, setInitialForm] = useState({
    username: '',
    email: '',
    recoveryEmail: '',
    recoveryPhone: '',
  });

  // Notification Toggles state
  const notifs = profile?.notificationSettings || {};
  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: notifs.emailNotifications ?? true,
    proposalAlerts: notifs.proposalAlerts ?? true,
    messageAlerts: notifs.messageAlerts ?? true,
  });

  const [notifSavedMsg, setNotifSavedMsg] = useState({});

  useEffect(() => {
    if (profile) {
      const data = {
        username: profile?.personalInfo?.username || '',
        email: profile?.personalInfo?.email || '',
        recoveryEmail: profile?.securitySettings?.recoveryEmail || '',
        recoveryPhone: profile?.securitySettings?.recoveryPhone || '',
      };
      setForm(data);
      setInitialForm(data);

      const n = profile?.notificationSettings || {};
      setNotifSettings({
        emailNotifications: n.emailNotifications ?? true,
        proposalAlerts: n.proposalAlerts ?? true,
        messageAlerts: n.messageAlerts ?? true,
      });
    }
  }, [profile]);

  // UI & Dialog States
  const [activeSection, setActiveSection] = useState('sec-username');
  const [savingSection, setSavingSection] = useState(null);
  const [usernameError, setUsernameError] = useState('');

  // Modals
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [deactivateOtp, setDeactivateOtp] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const [emailModal, setEmailModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [recoveryEmailModal, setRecoveryEmailModal] = useState(false);
  const [recoveryEmailOtp, setRecoveryEmailOtp] = useState('');
  const [recoveryEmailLoading, setRecoveryEmailLoading] = useState(false);

  // Field change helper
  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (key === 'username') setUsernameError('');
  };

  // Form dirty check
  const isDirty = form.username !== initialForm.username ||
    form.recoveryPhone !== initialForm.recoveryPhone;

  const handleDiscard = () => {
    setForm(initialForm);
    setUsernameError('');
  };

  // Scrollspy navigation
  const scrollTo = (secId) => {
    setActiveSection(secId);
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Save standard sections
  const saveSection = async (section, data, label) => {
    setSavingSection(label);
    setUsernameError('');

    if (label === 'Username' && data.username?.trim() && data.username.trim() !== profile?.personalInfo?.username) {
      try {
        const res = await freelancersAPI.checkUsername(data.username.trim());
        if (res.data?.data?.exists) {
          setUsernameError('Username is already taken');
          setSavingSection(null);
          return;
        }
      } catch {
        setUsernameError('Unable to verify username availability');
        setSavingSection(null);
        return;
      }
    }

    try {
      await updateProfile(section, data, false, true);
      setInitialForm((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.error(`Failed to save ${label}:`, error);
    } finally {
      setSavingSection(null);
    }
  };

  // Toggle notification preference instantly
  const toggleNotification = async (key, val) => {
    setNotifSettings((prev) => ({ ...prev, [key]: val }));
    try {
      await updateProfile('notificationSettings', { [key]: val }, true, true);
      setNotifSavedMsg((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setNotifSavedMsg((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      showToast('Could not update notification setting', 'error');
      setNotifSettings((prev) => ({ ...prev, [key]: !val }));
    }
  };

  // Email Change
  const handleRequestEmailChange = async () => {
    if (!form.email || form.email === profile?.personalInfo?.email) return;
    setEmailLoading(true);
    setSavingSection('Email');
    try {
      await authAPI.requestEmailChange(form.email);
      setEmailModal(true);
      showToast('Verification code sent to your new email.');
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot change email.', 'error');
    } finally {
      setEmailLoading(false);
      setSavingSection(null);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!emailOtp) return;
    setEmailLoading(true);
    try {
      await authAPI.confirmEmailChange(emailOtp);
      showToast('Email address updated successfully.', 'success');
      setEmailModal(false);
      setEmailOtp('');
      updateProfile('personalInfo', { email: form.email }, false, false);
      setInitialForm((prev) => ({ ...prev, email: form.email }));
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid or expired OTP.', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  // Recovery Email Change
  const handleRequestRecoveryEmailChange = async () => {
    if (!form.recoveryEmail || form.recoveryEmail === profile?.securitySettings?.recoveryEmail) return;
    setRecoveryEmailLoading(true);
    try {
      await authAPI.requestRecoveryEmailChange(form.recoveryEmail);
      setRecoveryEmailModal(true);
      showToast('Verification code sent to your backup email.');
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
      updateProfile('securitySettings', { ...profile.securitySettings, recoveryEmail: form.recoveryEmail }, false, false);
      setInitialForm((prev) => ({ ...prev, recoveryEmail: form.recoveryEmail }));
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid or expired OTP.', 'error');
    } finally {
      setRecoveryEmailLoading(false);
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

  return (
    <div className="fs-page-root">
      <div className="fs-container">

        {/* ─── SHARED PAGE HEADER ─── */}
        <header className="fs-shared-header">
          <div className="fs-header-left">
            <nav className="fs-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/freelancer/dashboard" className="fs-bc-link">Dashboard</Link>
              <span className="fs-bc-sep">/</span>
              <span className="fs-bc-curr">Settings</span>
            </nav>
            <h1 className="fs-page-title">Account Settings</h1>
            <p className="fs-page-subtitle">
              Manage your personal identifier, primary communication email, recovery credentials, and alert options.
            </p>
          </div>
        </header>

        {/* ─── 2-ZONE LAYOUT (Sub-nav + Cards Stack) ─── */}
        <div className="fs-layout-grid">

          {/* LEFT: Sticky Sub-nav Card */}
          <aside className="fs-subnav-col" aria-label="Settings Navigation">
            <div className="fs-subnav-card">
              <span className="fs-subnav-heading">SECTIONS</span>

              <button
                type="button"
                className={`fs-subnav-pill ${activeSection === 'sec-username' ? 'fs-subnav-pill--active' : ''}`}
                onClick={() => scrollTo('sec-username')}
              >
                <Tag size={15} />
                <span>Username</span>
              </button>

              <button
                type="button"
                className={`fs-subnav-pill ${activeSection === 'sec-email' ? 'fs-subnav-pill--active' : ''}`}
                onClick={() => scrollTo('sec-email')}
              >
                <Mail size={15} />
                <span>Email Address</span>
              </button>

              {!isSupabaseUser && (
                <button
                  type="button"
                  className={`fs-subnav-pill ${activeSection === 'sec-recovery' ? 'fs-subnav-pill--active' : ''}`}
                  onClick={() => scrollTo('sec-recovery')}
                >
                  <Shield size={15} />
                  <span>Recovery Info</span>
                </button>
              )}

              <button
                type="button"
                className={`fs-subnav-pill ${activeSection === 'sec-notifications' ? 'fs-subnav-pill--active' : ''}`}
                onClick={() => scrollTo('sec-notifications')}
              >
                <Bell size={15} />
                <span>Notifications</span>
              </button>

              <button
                type="button"
                className={`fs-subnav-pill fs-subnav-pill--danger ${activeSection === 'sec-danger' ? 'fs-subnav-pill--active' : ''}`}
                onClick={() => scrollTo('sec-danger')}
              >
                <AlertTriangle size={15} />
                <span>Danger Zone</span>
              </button>
            </div>
          </aside>

          {/* RIGHT: Stacked Cards */}
          <main className="fs-content-col">

            {/* SECTION 1: USERNAME */}
            <Reveal delay={0}>
              <section id="sec-username" className="fs-section-card">
                <div className="fs-section-hd">
                  <div className="fs-section-icon-box">
                    <Tag size={18} />
                  </div>
                  <div>
                    <h2 className="fs-section-title">Change Username</h2>
                    <p className="fs-section-desc">Your public handle across proposals, client chats, and search rankings.</p>
                  </div>
                </div>

                <div className="fs-fields-2col">
                  <div className="fs-field">
                    <label className="fs-field-label" htmlFor="fs-current-user">Current Username</label>
                    <input
                      id="fs-current-user"
                      className="fs-field-input fs-field-input--disabled"
                      value={profile?.personalInfo?.username || '—'}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="fs-field">
                    <label className="fs-field-label" htmlFor="fs-new-user">New Username</label>
                    <input
                      id="fs-new-user"
                      className={`fs-field-input ${usernameError ? 'fs-field-input--error' : ''}`}
                      value={form.username}
                      onChange={(e) => setField('username', e.target.value)}
                      placeholder="Enter new username"
                    />
                    {usernameError && <span className="fs-field-error-text">{usernameError}</span>}
                  </div>
                </div>

                <div className="fs-card-footer-row">
                  <button
                    type="button"
                    className="fs-btn-primary"
                    disabled={savingSection === 'Username' || form.username === profile?.personalInfo?.username || !form.username.trim()}
                    onClick={() => saveSection('personalInfo', { username: form.username }, 'Username')}
                  >
                    {savingSection === 'Username' ? 'Saving...' : 'Update Username'}
                  </button>
                </div>
              </section>
            </Reveal>

            {/* SECTION 2: EMAIL ADDRESS */}
            <Reveal delay={50}>
              <section id="sec-email" className="fs-section-card">
                <div className="fs-section-hd">
                  <div className="fs-section-icon-box">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h2 className="fs-section-title">
                      {isSupabaseUser ? 'Email Address' : 'Change Email Address'}
                    </h2>
                    <p className="fs-section-desc">Primary address for login alerts, security verifications, and contract updates.</p>
                  </div>
                </div>

                <div className="fs-fields-2col">
                  <div className="fs-field">
                    <label className="fs-field-label" htmlFor="fs-current-em">Current Email</label>
                    <input
                      id="fs-current-em"
                      className="fs-field-input fs-field-input--disabled"
                      value={profile?.personalInfo?.email || user?.email || '—'}
                      disabled
                      readOnly
                    />
                  </div>

                  {!isSupabaseUser && (
                    <div className="fs-field">
                      <label className="fs-field-label" htmlFor="fs-new-em">New Email</label>
                      <input
                        id="fs-new-em"
                        type="email"
                        className="fs-field-input"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        placeholder="new.email@example.com"
                      />
                    </div>
                  )}
                </div>

                {!isSupabaseUser ? (
                  <div className="fs-card-footer-row">
                    <button
                      type="button"
                      className="fs-btn-primary"
                      disabled={savingSection === 'Email' || form.email === profile?.personalInfo?.email || !form.email.trim()}
                      onClick={handleRequestEmailChange}
                    >
                      {savingSection === 'Email' ? 'Sending Code...' : 'Update Email'}
                    </button>
                  </div>
                ) : (
                  <div className="fs-notice-box">
                    <span>You signed in via an external OAuth provider. Email modifications must be managed through that provider.</span>
                  </div>
                )}
              </section>
            </Reveal>

            {/* SECTION 3: RECOVERY INFORMATION */}
            {!isSupabaseUser && (
              <Reveal delay={100}>
                <section id="sec-recovery" className="fs-section-card">
                  <div className="fs-section-hd">
                    <div className="fs-section-icon-box">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h2 className="fs-section-title">Recovery Information</h2>
                      <p className="fs-section-desc">Alternative backup channels to regain account access if your primary credentials are lost.</p>
                    </div>
                  </div>

                  <div className="fs-fields-2col">
                    <div className="fs-field">
                      <label className="fs-field-label" htmlFor="fs-rec-em">Backup Recovery Email</label>
                      <input
                        id="fs-rec-em"
                        type="email"
                        className="fs-field-input"
                        value={form.recoveryEmail}
                        onChange={(e) => setField('recoveryEmail', e.target.value)}
                        placeholder="backup@example.com"
                      />
                    </div>

                    <div className="fs-field">
                      <label className="fs-field-label" htmlFor="fs-rec-phone">Recovery Phone Number</label>
                      <input
                        id="fs-rec-phone"
                        type="tel"
                        className="fs-field-input"
                        value={form.recoveryPhone}
                        onChange={(e) => setField('recoveryPhone', e.target.value)}
                        placeholder="+92 300 0000000"
                      />
                    </div>
                  </div>

                  <div className="fs-card-footer-row">
                    <button
                      type="button"
                      className="fs-btn-secondary"
                      disabled={savingSection === 'Recovery Phone' || form.recoveryPhone === profile?.securitySettings?.recoveryPhone}
                      onClick={() => saveSection('securitySettings', { recoveryPhone: form.recoveryPhone }, 'Recovery Phone')}
                    >
                      {savingSection === 'Recovery Phone' ? 'Saving...' : 'Save Phone'}
                    </button>

                    <button
                      type="button"
                      className="fs-btn-primary"
                      disabled={recoveryEmailLoading || form.recoveryEmail === profile?.securitySettings?.recoveryEmail || !form.recoveryEmail.trim()}
                      onClick={handleRequestRecoveryEmailChange}
                    >
                      {recoveryEmailLoading ? 'Sending Code...' : 'Update Recovery Email'}
                    </button>
                  </div>
                </section>
              </Reveal>
            )}

            {/* SECTION 4: NOTIFICATION PREFERENCES */}
            <Reveal delay={150}>
              <section id="sec-notifications" className="fs-section-card">
                <div className="fs-section-hd">
                  <div className="fs-section-icon-box">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h2 className="fs-section-title">Notification Preferences</h2>
                    <p className="fs-section-desc">Select which alerts and delivery channels you want to receive in real-time.</p>
                  </div>
                </div>

                <div className="fs-toggles-list">
                  <div className="fs-toggle-row">
                    <div className="fs-toggle-info">
                      <span className="fs-toggle-label">Email Notifications</span>
                      <span className="fs-toggle-sub">Receive daily project digests, system announcements, and service notifications.</span>
                    </div>
                    <div className="fs-toggle-ctrl-col">
                      {notifSavedMsg.emailNotifications && <span className="fs-saved-badge">Saved ✓</span>}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifSettings.emailNotifications}
                        className={`fs-switch ${notifSettings.emailNotifications ? 'fs-switch--on' : ''}`}
                        onClick={() => toggleNotification('emailNotifications', !notifSettings.emailNotifications)}
                      >
                        <span className="fs-switch-thumb" />
                      </button>
                    </div>
                  </div>

                  <div className="fs-toggle-row">
                    <div className="fs-toggle-info">
                      <span className="fs-toggle-label">Proposal Alerts</span>
                      <span className="fs-toggle-sub">Immediate alerts whenever a client reviews, accepts, or declines your proposal.</span>
                    </div>
                    <div className="fs-toggle-ctrl-col">
                      {notifSavedMsg.proposalAlerts && <span className="fs-saved-badge">Saved ✓</span>}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifSettings.proposalAlerts}
                        className={`fs-switch ${notifSettings.proposalAlerts ? 'fs-switch--on' : ''}`}
                        onClick={() => toggleNotification('proposalAlerts', !notifSettings.proposalAlerts)}
                      >
                        <span className="fs-switch-thumb" />
                      </button>
                    </div>
                  </div>

                  <div className="fs-toggle-row">
                    <div className="fs-toggle-info">
                      <span className="fs-toggle-label">Client Message Alerts</span>
                      <span className="fs-toggle-sub">Instant ping when a prospective or active client sends a direct project inquiry.</span>
                    </div>
                    <div className="fs-toggle-ctrl-col">
                      {notifSavedMsg.messageAlerts && <span className="fs-saved-badge">Saved ✓</span>}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifSettings.messageAlerts}
                        className={`fs-switch ${notifSettings.messageAlerts ? 'fs-switch--on' : ''}`}
                        onClick={() => toggleNotification('messageAlerts', !notifSettings.messageAlerts)}
                      >
                        <span className="fs-switch-thumb" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </Reveal>

            {/* SECTION 5: DANGER ZONE */}
            <Reveal delay={200}>
              <section id="sec-danger" className="fs-section-card fs-section-card--danger">
                <div className="fs-section-hd">
                  <div className="fs-section-icon-box fs-section-icon-box--danger">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h2 className="fs-section-title fs-section-title--danger">Danger Zone</h2>
                    <p className="fs-section-desc">Irreversible or restrictive account actions.</p>
                  </div>
                </div>

                <div className="fs-danger-row">
                  <div className="fs-danger-info">
                    <span className="fs-danger-title">Deactivate Account</span>
                    <span className="fs-danger-desc">
                      Your profile and gigs will be hidden from the public talent directory. You can reactivate anytime by logging back in.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="fs-btn-danger"
                    onClick={() => { setDeactivateStep(1); setDeactivateOtp(''); setDeactivateModal(true); }}
                  >
                    Deactivate Account
                  </button>
                </div>
              </section>
            </Reveal>

          </main>
        </div>

        {/* ─── STICKY CARD-FOOTER FOR UNSAVED CHANGES ─── */}
        {isDirty && (
          <div className="fs-dirty-sticky-bar" role="region" aria-label="Unsaved Changes Notification">
            <div className="fs-dirty-bar-content">
              <div className="fs-dirty-label-row">
                <AlertCircle size={16} className="fs-dirty-icon" />
                <span>You have unsaved changes in your settings</span>
              </div>
              <div className="fs-dirty-actions-row">
                <button
                  type="button"
                  className="fs-dirty-discard-btn"
                  onClick={handleDiscard}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="fs-btn-primary fs-btn-primary--sm"
                  disabled={savingSection != null}
                  onClick={() => {
                    if (form.username !== initialForm.username) {
                      saveSection('personalInfo', { username: form.username }, 'Username');
                    }
                    if (form.recoveryPhone !== initialForm.recoveryPhone) {
                      saveSection('securitySettings', { recoveryPhone: form.recoveryPhone }, 'Recovery Phone');
                    }
                  }}
                >
                  {savingSection ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─── MODALS ─── */}

      {/* Deactivate Modal */}
      <Modal
        open={deactivateModal}
        title="Deactivate Account"
        onClose={() => setDeactivateModal(false)}
        danger
      >
        {deactivateStep === 1 ? (
          <div className="fs-modal-body">
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#334155' }}>
              Deactivating your account temporarily hides your public profile and active services from SkillKart.
              <strong> You cannot deactivate if you currently have in-progress milestone contracts.</strong>
            </p>
            <p style={{ margin: 0, color: '#EF4444', fontWeight: 600, fontSize: 13.5 }}>
              Are you sure you want to proceed with deactivation?
            </p>
            <div className="fs-modal-actions">
              <button type="button" className="fs-modal-btn-ghost" onClick={() => setDeactivateModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="fs-btn-danger"
                onClick={handleRequestDeactivate}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? 'Checking...' : 'Yes, Send OTP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="fs-modal-body">
            <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
              Enter the 6-digit confirmation code sent to your registered email to confirm deactivation.
            </p>
            <div className="fs-field">
              <input
                className="fs-field-input"
                aria-label="Enter Confirmation Code"
                placeholder="000000"
                value={deactivateOtp}
                onChange={(e) => setDeactivateOtp(e.target.value)}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.3em', fontWeight: 700 }}
              />
            </div>
            <div className="fs-modal-actions">
              <button type="button" className="fs-modal-btn-ghost" onClick={() => setDeactivateModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="fs-btn-danger"
                onClick={handleConfirmDeactivate}
                disabled={deactivateLoading || !deactivateOtp}
              >
                {deactivateLoading ? 'Processing...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Verification Modal */}
      <Modal
        open={emailModal}
        title="Verify Email Change"
        onClose={() => setEmailModal(false)}
      >
        <div className="fs-modal-body">
          <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
            Enter the 6-digit verification code sent to <strong>{form.email}</strong> to finalize updating your primary address.
          </p>
          <div className="fs-field">
            <input
              className="fs-field-input"
              aria-label="Enter Verification Code"
              placeholder="000000"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value)}
              maxLength={6}
              style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.3em', fontWeight: 700 }}
            />
          </div>
          <div className="fs-modal-actions">
            <button type="button" className="fs-modal-btn-ghost" onClick={() => setEmailModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="fs-btn-primary"
              onClick={handleConfirmEmailChange}
              disabled={emailLoading || !emailOtp}
            >
              {emailLoading ? 'Verifying...' : 'Verify & Update Email'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Recovery Email Verification Modal */}
      <Modal
        open={recoveryEmailModal}
        title="Verify Recovery Email"
        onClose={() => setRecoveryEmailModal(false)}
      >
        <div className="fs-modal-body">
          <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
            Enter the verification code sent to <strong>{form.recoveryEmail}</strong> to confirm your backup recovery email.
          </p>
          <div className="fs-field">
            <input
              className="fs-field-input"
              aria-label="Enter Verification Code"
              placeholder="000000"
              value={recoveryEmailOtp}
              onChange={(e) => setRecoveryEmailOtp(e.target.value)}
              maxLength={6}
              style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.3em', fontWeight: 700 }}
            />
          </div>
          <div className="fs-modal-actions">
            <button type="button" className="fs-modal-btn-ghost" onClick={() => setRecoveryEmailModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="fs-btn-primary"
              onClick={handleConfirmRecoveryEmailChange}
              disabled={recoveryEmailLoading || !recoveryEmailOtp}
            >
              {recoveryEmailLoading ? 'Verifying...' : 'Verify & Update'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
