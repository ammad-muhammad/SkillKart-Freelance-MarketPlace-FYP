import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Mail, Shield, AlertTriangle, Bell, RefreshCw, AlertCircle, Trash2, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useClient } from '../../context/ClientContext';
import { authAPI } from '../../api/auth';
import Modal from '../../Components/common/Modal/Modal';
import { clientsAPI } from '../../api/clients';
import Reveal from '../freelancer/components/Reveal';
import '../freelancer/FreelancerSettings.css';
import './ClientResponsive.css';

export default function ClientSettings() {
  const { user, logout } = useAuth();
  const { profile, updateProfile, updateMultipleSections, showToast } = useClient();
  const isEmailUser = user?.authProvider === 'email';
  const isSupabaseUser = !!user?.supabaseId || (user?.authProvider && user?.authProvider !== 'email');

  const [activeSection, setActiveSection] = useState('sec-username');
  const [form, setForm] = useState({
    username: profile?.personalInfo?.username || "",
    email: profile?.personalInfo?.email || "",
    recoveryEmail: profile?.securitySettings?.recoveryEmail || "",
    recoveryPhone: profile?.securitySettings?.recoveryPhone || "",
  });
  const [initialForm, setInitialForm] = useState({
    username: profile?.personalInfo?.username || "",
    email: profile?.personalInfo?.email || "",
    recoveryEmail: profile?.securitySettings?.recoveryEmail || "",
    recoveryPhone: profile?.securitySettings?.recoveryPhone || "",
  });

  const [notifications, setNotifications] = useState({ ...(profile?.notificationSettings || {}) });
  const [notifSavedMsg, setNotifSavedMsg] = useState({});
  const [errors, setErrors] = useState({});
  const [savingSection, setSavingSection] = useState(null);

  // Sync state when profile is loaded/updated
  useEffect(() => {
    if (profile) {
      const data = {
        username: profile.personalInfo?.username || "",
        email: profile.personalInfo?.email || "",
        recoveryEmail: profile.securitySettings?.recoveryEmail || "",
        recoveryPhone: profile.securitySettings?.recoveryPhone || "",
      };
      setForm(data);
      setInitialForm(data);
      setNotifications({ ...(profile.notificationSettings || {}) });
    }
  }, [profile]);

  // Modals state
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState('confirm'); // 'confirm' | 'otp'
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [emailModal, setEmailModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [recoveryEmailModal, setRecoveryEmailModal] = useState(false);
  const [recoveryEmailOtp, setRecoveryEmailOtp] = useState('');
  const [recoveryEmailLoading, setRecoveryEmailLoading] = useState(false);

  // Dirty check
  const isDirty = form.username !== initialForm.username ||
    form.recoveryPhone !== initialForm.recoveryPhone;

  const handleDiscard = () => {
    setForm(initialForm);
    setErrors({});
  };

  const scrollTo = (secId) => {
    setActiveSection(secId);
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRequestEmailChange = async () => {
    if (!form.email || form.email === profile?.personalInfo?.email) return;

    setEmailLoading(true);
    setSavingSection('Email');
    try {
      await authAPI.requestEmailChange(form.email);
      setEmailModal(true);
      showToast('OTP sent to new email address.');
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
      showToast('Email updated successfully.', 'success');
      setEmailModal(false);
      setEmailOtp('');
      updateProfile('personalInfo', { email: form.email }, false, false);
      setInitialForm(prev => ({ ...prev, email: form.email }));
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP.', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRequestRecoveryEmailChange = async () => {
    if (!form.recoveryEmail || form.recoveryEmail === profile?.securitySettings?.recoveryEmail) return;

    setRecoveryEmailLoading(true);
    setSavingSection('RecoveryEmail');
    try {
      await authAPI.requestRecoveryEmailChange(form.recoveryEmail);
      setRecoveryEmailModal(true);
      showToast('OTP sent to new recovery email.');
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot change recovery email.', 'error');
    } finally {
      setRecoveryEmailLoading(false);
      setSavingSection(null);
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
      setInitialForm(prev => ({ ...prev, recoveryEmail: form.recoveryEmail }));
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP.', 'error');
    } finally {
      setRecoveryEmailLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    setErrors(prev => ({ ...prev, username: null }));
    if (!form.username?.trim()) return;

    if (form.username.trim() !== profile?.personalInfo?.username) {
      setSavingSection('Username');
      try {
        const res = await clientsAPI.checkUsername(form.username.trim());
        if (res.data?.data?.exists) {
          setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
          setSavingSection(null);
          return;
        }
      } catch (err) {
        setErrors(prev => ({ ...prev, username: 'Unable to verify username' }));
        setSavingSection(null);
        return;
      }
    }

    setSavingSection('Username');
    try {
      await updateMultipleSections({
        personalInfo: { username: form.username.trim() }
      }, false, true);
      setInitialForm(prev => ({ ...prev, username: form.username.trim() }));
      showToast('Username updated successfully', 'success');
    } catch {
      // Handled via context
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveRecoveryPhone = async () => {
    setSavingSection('Phone');
    try {
      await updateMultipleSections({
        securitySettings: { recoveryPhone: form.recoveryPhone }
      }, false, true);
      setInitialForm(prev => ({ ...prev, recoveryPhone: form.recoveryPhone }));
      showToast('Recovery phone updated successfully', 'success');
    } finally {
      setSavingSection(null);
    }
  };

  const toggleNotif = async (key) => {
    const updatedVal = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: updatedVal }));
    try {
      await updateProfile('notificationSettings', { [key]: updatedVal }, false, true, { skipFetch: true });
      setNotifSavedMsg(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setNotifSavedMsg(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      setNotifications(prev => ({ ...prev, [key]: !updatedVal }));
      showToast('Could not update notification setting', 'error');
    }
  };

  const requestDelete = async () => {
    setDeleteLoading(true);
    try {
      await authAPI.requestDeletion();
      setDeleteStep('otp');
      showToast('A confirmation code was sent to your email.', 'info');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not start account deletion.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteOtp.trim()) { showToast('Enter the confirmation code.', 'error'); return; }
    setDeleteLoading(true);
    try {
      await authAPI.confirmDeletion(deleteOtp.trim());
      setDeleteModal(false);
      await logout('Your account has been permanently deleted.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid or expired code.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal(false);
    setDeleteStep('confirm');
    setDeleteOtp('');
  };

  return (
    <div className="fs-page-root cl-settings-page">
      <div className="fs-container">

        {/* ─── SHARED PAGE HEADER ─── */}
        <header className="fs-shared-header">
          <div className="fs-header-left">
            <nav className="fs-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/client/dashboard" className="fs-bc-link">Dashboard</Link>
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

              {isEmailUser && (
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

          {/* RIGHT: Stacked Section Cards */}
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
                    <p className="fs-section-desc">Your public handle across proposals, project chats, and hiring listings.</p>
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
                      className={`fs-field-input ${errors.username ? 'fs-field-input--error' : ''}`}
                      value={form.username}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, username: e.target.value }));
                        setErrors(prev => ({ ...prev, username: null }));
                      }}
                      placeholder="Enter new username"
                    />
                    {errors.username && <span className="fs-field-error-text">{errors.username}</span>}
                  </div>
                </div>

                <div className="fs-card-footer-row">
                  <button
                    type="button"
                    className="fs-btn-primary"
                    disabled={savingSection === 'Username' || form.username === profile?.personalInfo?.username || !form.username?.trim()}
                    onClick={handleSaveUsername}
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
                    <p className="fs-section-desc">Primary address for login alerts, project contracts, and invoice receipts.</p>
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
                        className={`fs-field-input ${errors.email ? 'fs-field-input--error' : ''}`}
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="new.email@example.com"
                      />
                      {errors.email && <span className="fs-field-error-text">{errors.email}</span>}
                    </div>
                  )}
                </div>

                {!isSupabaseUser ? (
                  <div className="fs-card-footer-row">
                    <button
                      type="button"
                      className="fs-btn-primary"
                      disabled={savingSection === 'Email' || form.email === profile?.personalInfo?.email || !form.email?.trim()}
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
            {isEmailUser && (
              <Reveal delay={100}>
                <section id="sec-recovery" className="fs-section-card">
                  <div className="fs-section-hd">
                    <div className="fs-section-icon-box">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h2 className="fs-section-title">Recovery Information</h2>
                      <p className="fs-section-desc">Alternative backup channels to regain account access if primary credentials are lost.</p>
                    </div>
                  </div>

                  <div className="fs-fields-2col">
                    <div className="fs-field">
                      <label className="fs-field-label" htmlFor="fs-recov-em">Backup Recovery Email</label>
                      <input
                        id="fs-recov-em"
                        type="email"
                        className={`fs-field-input ${errors.recoveryEmail ? 'fs-field-input--error' : ''}`}
                        value={form.recoveryEmail}
                        onChange={(e) => setForm((p) => ({ ...p, recoveryEmail: e.target.value }))}
                        placeholder="backup@example.com"
                      />
                      {errors.recoveryEmail && <span className="fs-field-error-text">{errors.recoveryEmail}</span>}
                    </div>

                    <div className="fs-field">
                      <label className="fs-field-label" htmlFor="fs-recov-ph">Recovery Phone Number</label>
                      <input
                        id="fs-recov-ph"
                        type="tel"
                        className={`fs-field-input ${errors.recoveryPhone ? 'fs-field-input--error' : ''}`}
                        value={form.recoveryPhone}
                        onChange={(e) => setForm((p) => ({ ...p, recoveryPhone: e.target.value }))}
                        placeholder="+92 300 1234567"
                      />
                      {errors.recoveryPhone && <span className="fs-field-error-text">{errors.recoveryPhone}</span>}
                    </div>
                  </div>

                  <div className="fs-card-footer-row" style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="fs-btn-primary"
                      disabled={savingSection === 'RecoveryEmail' || form.recoveryEmail === profile?.securitySettings?.recoveryEmail || !form.recoveryEmail?.trim()}
                      onClick={handleRequestRecoveryEmailChange}
                    >
                      {savingSection === 'RecoveryEmail' ? 'Sending Code...' : 'Update Recovery Email'}
                    </button>
                    <button
                      type="button"
                      className="fs-btn-secondary"
                      disabled={savingSection === 'Phone' || form.recoveryPhone === profile?.securitySettings?.recoveryPhone}
                      onClick={handleSaveRecoveryPhone}
                    >
                      {savingSection === 'Phone' ? 'Saving...' : 'Save Recovery Phone'}
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
                        aria-checked={notifications.emailNotifications}
                        className={`fs-switch ${notifications.emailNotifications ? 'fs-switch--on' : ''}`}
                        onClick={() => toggleNotif('emailNotifications')}
                      >
                        <span className="fs-switch-thumb" />
                      </button>
                    </div>
                  </div>

                  <div className="fs-toggle-row">
                    <div className="fs-toggle-info">
                      <span className="fs-toggle-label">Proposal Alerts</span>
                      <span className="fs-toggle-sub">Immediate alerts whenever a top freelancer applies to your job post.</span>
                    </div>
                    <div className="fs-toggle-ctrl-col">
                      {notifSavedMsg.proposalAlerts && <span className="fs-saved-badge">Saved ✓</span>}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifications.proposalAlerts}
                        className={`fs-switch ${notifications.proposalAlerts ? 'fs-switch--on' : ''}`}
                        onClick={() => toggleNotif('proposalAlerts')}
                      >
                        <span className="fs-switch-thumb" />
                      </button>
                    </div>
                  </div>

                  <div className="fs-toggle-row">
                    <div className="fs-toggle-info">
                      <span className="fs-toggle-label">Freelancer Message Alerts</span>
                      <span className="fs-toggle-sub">Instant ping when a prospective freelancer sends a message or submits work.</span>
                    </div>
                    <div className="fs-toggle-ctrl-col">
                      {notifSavedMsg.messageAlerts && <span className="fs-saved-badge">Saved ✓</span>}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifications.messageAlerts}
                        className={`fs-switch ${notifications.messageAlerts ? 'fs-switch--on' : ''}`}
                        onClick={() => toggleNotif('messageAlerts')}
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
                    <span className="fs-danger-title">Delete Client Account</span>
                    <span className="fs-danger-desc">
                      Closing your account will remove all your posted jobs, hiring history, invoices, and active contracts.
                      This action is permanent and cannot be undone.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="fs-btn-danger"
                    onClick={() => setDeleteModal(true)}
                  >
                    Delete Account
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
                      handleSaveUsername();
                    }
                    if (form.recoveryPhone !== initialForm.recoveryPhone) {
                      handleSaveRecoveryPhone();
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

      {/* Delete Account Modal */}
      <Modal open={deleteModal} title="Delete Account" onClose={closeDeleteModal} danger>
        {deleteStep === 'confirm' ? (
          <>
            <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
              This will <strong>permanently delete</strong> your account, profile, and all your job postings and contracts. This action cannot be reversed. We will email you a 6-digit confirmation code.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="fs-btn-outline" onClick={closeDeleteModal} disabled={deleteLoading}>Cancel</button>
              <button className="fs-btn-danger" onClick={requestDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Sending code…' : 'Send confirmation code'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
              Enter the 6-digit confirmation code sent to <strong>{profile?.personalInfo?.email || user?.email}</strong>.
            </p>
            <div className="fs-field">
              <input
                className="fs-field-input"
                aria-label="6-digit confirmation code"
                placeholder="Enter 6-digit code"
                value={deleteOtp}
                onChange={e => setDeleteOtp(e.target.value)}
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: 18, fontWeight: 700 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="fs-btn-outline" onClick={closeDeleteModal} disabled={deleteLoading}>Cancel</button>
              <button className="fs-btn-danger" onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting…' : 'Permanently delete account'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Email Change Modal */}
      <Modal open={emailModal} title="Verify Email Change" onClose={() => setEmailModal(false)}>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
          Please enter the OTP sent to <strong>{form.email}</strong> to confirm your new email address.
        </p>
        <div className="fs-field">
          <input
            className="fs-field-input"
            aria-label="Enter OTP"
            placeholder="6-digit code"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
            style={{ textAlign: 'center', letterSpacing: '4px', fontSize: 18, fontWeight: 700 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="fs-btn-outline" onClick={() => setEmailModal(false)}>Cancel</button>
          <button
            className="fs-btn-primary"
            onClick={handleConfirmEmailChange}
            disabled={emailLoading || !emailOtp}
          >
            {emailLoading ? 'Verifying...' : 'Verify and Update'}
          </button>
        </div>
      </Modal>

      {/* Recovery Email Modal */}
      <Modal open={recoveryEmailModal} title="Verify Recovery Email" onClose={() => setRecoveryEmailModal(false)}>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
          Please enter the OTP sent to <strong>{form.recoveryEmail}</strong> to confirm your new recovery email address.
        </p>
        <div className="fs-field">
          <input
            className="fs-field-input"
            aria-label="Enter OTP"
            placeholder="6-digit code"
            value={recoveryEmailOtp}
            onChange={(e) => setRecoveryEmailOtp(e.target.value)}
            style={{ textAlign: 'center', letterSpacing: '4px', fontSize: 18, fontWeight: 700 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="fs-btn-outline" onClick={() => setRecoveryEmailModal(false)}>Cancel</button>
          <button
            className="fs-btn-primary"
            onClick={handleConfirmRecoveryEmailChange}
            disabled={recoveryEmailLoading || !recoveryEmailOtp}
          >
            {recoveryEmailLoading ? 'Verifying...' : 'Verify and Update'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
