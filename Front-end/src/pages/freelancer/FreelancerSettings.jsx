import { useState, useEffect } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../api/auth';
import { freelancersAPI } from '../../api/freelancers';
import { Tag, Mail, Shield, AlertTriangle } from 'lucide-react';
import Modal from './components/Modal';
import './FreelancerDashboard.css';

const FreelancerSettings = () => {
  const { profile, updateProfile, showToast } = useFreelancer();
  const { user } = useAuth();
  const isSupabaseUser = !!user?.supabaseId || user?.authProvider !== 'email';
  const [form, setForm] = useState({
    username: "",
    email: "",
    recoveryEmail: "",
    recoveryPhone: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile?.personalInfo?.username || "",
        email: profile?.personalInfo?.email || "",
        recoveryEmail: profile?.securitySettings?.recoveryEmail || "",
        recoveryPhone: profile?.securitySettings?.recoveryPhone || "",
      });
    }
  }, [profile]);

  const [saving, setSaving] = useState(null);
  const [usernameError, setUsernameError] = useState('');
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [deactivateOtp, setDeactivateOtp] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Email Change State
  const [emailModal, setEmailModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Recovery Email Change State
  const [recoveryEmailModal, setRecoveryEmailModal] = useState(false);
  const [recoveryEmailOtp, setRecoveryEmailOtp] = useState('');
  const [recoveryEmailLoading, setRecoveryEmailLoading] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const saveSection = async (section, data, label) => {
    setSaving(label);
    setUsernameError('');

    if (label === 'Username' && data.username?.trim() && data.username.trim() !== profile?.personalInfo?.username) {
      try {
        const res = await freelancersAPI.checkUsername(data.username.trim());
        if (res.data?.data?.exists) {
          setUsernameError('Username is already taken');
          setSaving(null);
          return;
        }
      } catch (err) {
        console.error('Username check failed', err);
        setUsernameError('Unable to verify username');
        setSaving(null);
        return;
      }
    }

    try {
      await updateProfile(section, data, false, true);
    } catch (error) {
      console.error(`Failed to save ${label}:`, error);
    } finally {
      setSaving(null);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!form.email || form.email === profile?.personalInfo?.email) return;
    
    setEmailLoading(true);
    setSaving('Email');
    try {
      await authAPI.requestEmailChange(form.email);
      setEmailModal(true);
      showToast('OTP sent to new email address.');
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot change email.', 'error');
    } finally {
      setEmailLoading(false);
      setSaving(null);
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
      // update frontend state
      updateProfile('personalInfo', { email: form.email }, false, false);
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP.', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRequestRecoveryEmailChange = async () => {
    if (!form.recoveryEmail || form.recoveryEmail === profile?.securitySettings?.recoveryEmail) return;
    
    setRecoveryEmailLoading(true);
    try {
      await authAPI.requestRecoveryEmailChange(form.recoveryEmail);
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
      updateProfile('securitySettings', { ...profile.securitySettings, recoveryEmail: form.recoveryEmail }, false, false);
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP.', 'error');
    } finally {
      setRecoveryEmailLoading(false);
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

  return (
    <div>
      <div className="fl-page-header">
        <h1 className="fl-page-title">Account Settings</h1>
        <p className="fl-page-sub">Manage your account preferences.</p>
      </div>

      {/* Change Username */}
      <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="fl-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={18} /> Change Username</h3>
        <div className="fl-form-grid">
          <div className="fl-form-group">
            <label className="fl-label">Current Username</label>
            <input className="fl-input" value={profile?.personalInfo?.username || ""} disabled />
          </div>
          <div className="fl-form-group">
            <label className="fl-label">New Username</label>
            <input
              className="fl-input"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="Enter new username"
            />
            {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
          </div>
        </div>
        <div className="fl-actions">
          <button
            className={`fl-btn fl-btn--primary${saving === 'Username' ? ' fl-btn--loading' : ''}`}
            disabled={saving === 'Username' || form.username === profile?.personalInfo?.username}
            onClick={() => saveSection('personalInfo', { username: form.username }, 'Username')}
          >
            {saving === 'Username' ? 'Saving...' : 'Update Username'}
          </button>
        </div>
      </div>

      {/* Change Email */}
      <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="fl-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={18} /> {isSupabaseUser ? "Email Address" : "Change Email"}</h3>
        <div className="fl-form-grid">
          <div className="fl-form-group">
            <label className="fl-label">Current Email</label>
            <input className="fl-input" value={profile?.personalInfo?.email || ""} disabled />
          </div>
          {!isSupabaseUser && (
            <div className="fl-form-group">
              <label className="fl-label">New Email</label>
              <input
                type="email"
                className="fl-input"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="Enter new email"
              />
            </div>
          )}
        </div>
        {!isSupabaseUser && (
          <div className="fl-actions">
            <button
              className={`fl-btn fl-btn--primary${saving === 'Email' ? ' fl-btn--loading' : ''}`}
              disabled={saving === 'Email' || form.email === profile?.personalInfo?.email}
              onClick={handleRequestEmailChange}
            >
              {saving === 'Email' ? 'Sending OTP...' : 'Update Email'}
            </button>
          </div>
        )}
      </div>

      {/* Recovery Info */}
      {!isSupabaseUser && (
        <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
          <h3 className="fl-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={18} /> Recovery Information</h3>
          <div className="fl-form-grid">
            <div className="fl-form-group">
              <label className="fl-label">Recovery Email</label>
              <input
                type="email"
                className="fl-input"
                value={form.recoveryEmail}
                onChange={(e) => set('recoveryEmail', e.target.value)}
                placeholder="backup@email.com"
              />
            </div>
            <div className="fl-form-group">
              <label className="fl-label">Recovery Phone Number</label>
              <input
                type="tel"
                className="fl-input"
                value={form.recoveryPhone}
                onChange={(e) => set('recoveryPhone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          <div className="fl-actions" style={{ display: 'flex', gap: '1rem' }}>
            <button
              className={`fl-btn fl-btn--primary${recoveryEmailLoading ? ' fl-btn--loading' : ''}`}
              disabled={recoveryEmailLoading || form.recoveryEmail === profile?.securitySettings?.recoveryEmail}
              onClick={handleRequestRecoveryEmailChange}
            >
              {recoveryEmailLoading ? 'Sending OTP...' : 'Update Recovery Email'}
            </button>
            <button
              className={`fl-btn fl-btn--secondary${saving === 'Recovery' ? ' fl-btn--loading' : ''}`}
              disabled={saving === 'Recovery'}
              onClick={() =>
                saveSection('securitySettings', {
                  recoveryPhone: form.recoveryPhone,
                }, 'Recovery')
              }
            >
              {saving === 'Recovery' ? 'Saving...' : 'Save Recovery Phone'}
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="fl-card">
        <h3 className="fl-section-title" style={{ color: '#dc2626', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> Danger Zone</h3>
        <div className="fl-danger-zone">
          <p className="fl-danger-zone__title">Deactivate Account</p>
          <p className="fl-danger-zone__desc">
            Temporarily disable your account. Your profile will not be shown to any user. You can reactivate it later by logging in and verifying your email.
          </p>
          <button className="fl-btn fl-btn--danger" onClick={() => { setDeactivateStep(1); setDeactivateOtp(''); setDeactivateModal(true); }}>
            Deactivate My Account
          </button>
        </div>
      </div>

      <Modal open={deactivateModal} title="Deactivate Account" onClose={() => setDeactivateModal(false)} danger>
        {deactivateStep === 1 ? (
          <>
            <p style={{ marginBottom: '1rem' }}>
              Deactivating your account will hide your profile from clients and other freelancers.
              <strong> You cannot deactivate if you have active in-progress jobs.</strong>
            </p>
            <p style={{ marginBottom: '1.25rem', color: '#dc2626', fontWeight: 600 }}>
              Are you sure you want to deactivate your account?
            </p>
            <div className="fl-actions" style={{ marginTop: 0 }}>
              <button
                className={`fl-btn fl-btn--danger${deactivateLoading ? ' fl-btn--loading' : ''}`}
                onClick={handleRequestDeactivate}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? 'Checking...' : 'Yes, Send OTP'}
              </button>
              <button className="fl-btn fl-btn--ghost" onClick={() => setDeactivateModal(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '1rem' }}>
              Please enter the OTP sent to your email to confirm deactivation.
            </p>
            <div className="fl-form-group">
              <input
                className="fl-input"
                placeholder="Enter OTP"
                value={deactivateOtp}
                onChange={(e) => setDeactivateOtp(e.target.value)}
              />
            </div>
            <div className="fl-actions" style={{ marginTop: '1rem' }}>
              <button
                className={`fl-btn fl-btn--danger${deactivateLoading ? ' fl-btn--loading' : ''}`}
                onClick={handleConfirmDeactivate}
                disabled={deactivateLoading || !deactivateOtp}
              >
                {deactivateLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
              <button className="fl-btn fl-btn--ghost" onClick={() => setDeactivateModal(false)}>Cancel</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={emailModal} title="Verify Email Change" onClose={() => setEmailModal(false)}>
        <p style={{ marginBottom: '1rem' }}>
          Please enter the OTP sent to <strong>{form.email}</strong> to confirm your new email address.
        </p>
        <div className="fl-form-group">
          <input
            className="fl-input"
            placeholder="Enter OTP"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
          />
        </div>
        <div className="fl-actions" style={{ marginTop: '1rem' }}>
          <button
            className={`fl-btn fl-btn--primary${emailLoading ? ' fl-btn--loading' : ''}`}
            onClick={handleConfirmEmailChange}
            disabled={emailLoading || !emailOtp}
          >
            {emailLoading ? 'Verifying...' : 'Verify and Update Email'}
          </button>
          <button className="fl-btn fl-btn--ghost" onClick={() => setEmailModal(false)}>Cancel</button>
        </div>
      </Modal>
      <Modal open={recoveryEmailModal} title="Verify Recovery Email" onClose={() => setRecoveryEmailModal(false)}>
        <p style={{ marginBottom: '1rem' }}>
          Please enter the OTP sent to <strong>{form.recoveryEmail}</strong> to confirm your new recovery email address.
        </p>
        <div className="fl-form-group">
          <input
            className="fl-input"
            placeholder="Enter OTP"
            value={recoveryEmailOtp}
            onChange={(e) => setRecoveryEmailOtp(e.target.value)}
          />
        </div>
        <div className="fl-actions" style={{ marginTop: '1rem' }}>
          <button
            className={`fl-btn fl-btn--primary${recoveryEmailLoading ? ' fl-btn--loading' : ''}`}
            onClick={handleConfirmRecoveryEmailChange}
            disabled={recoveryEmailLoading || !recoveryEmailOtp}
          >
            {recoveryEmailLoading ? 'Verifying...' : 'Verify and Update'}
          </button>
          <button className="fl-btn fl-btn--ghost" onClick={() => setRecoveryEmailModal(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default FreelancerSettings;
