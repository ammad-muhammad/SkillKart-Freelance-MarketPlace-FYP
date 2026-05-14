import { useState } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { useAuth } from '../../hooks/useAuth';
import Modal from './components/Modal';
import './FreelancerDashboard.css';

const FreelancerSettings = () => {
  const { profile, updateProfile, showToast } = useFreelancer();
  const { user } = useAuth();
  const isSupabaseUser = !!user?.supabaseId || user?.authProvider !== 'email';
  const [form, setForm] = useState({
    username: profile?.personalInfo?.username || "",
    email: profile?.personalInfo?.email || "",
    recoveryEmail: profile?.securitySettings?.recoveryEmail || "",
    recoveryPhone: profile?.securitySettings?.recoveryPhone || "",
  });
  const [saving, setSaving] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const saveSection = async (section, data, label) => {
    setSaving(label);
    try {
      await updateProfile(section, data, false, true);
    } catch (error) {
      console.error(`Failed to save ${label}:`, error);
    } finally {
      setSaving(null);
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
        <h3 className="fl-section-title">🏷️ Change Username</h3>
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
        <h3 className="fl-section-title">📧 {isSupabaseUser ? "Email Address" : "Change Email"}</h3>
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
              onClick={() => saveSection('personalInfo', { email: form.email }, 'Email')}
            >
              {saving === 'Email' ? 'Saving...' : 'Update Email'}
            </button>
          </div>
        )}
      </div>

      {/* Recovery Info */}
      <div className="fl-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="fl-section-title">🛡️ Recovery Information</h3>
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
        <div className="fl-actions">
          <button
            className={`fl-btn fl-btn--primary${saving === 'Recovery' ? ' fl-btn--loading' : ''}`}
            disabled={saving === 'Recovery'}
            onClick={() =>
              saveSection('securitySettings', {
                recoveryEmail: form.recoveryEmail,
                recoveryPhone: form.recoveryPhone,
              }, 'Recovery')
            }
          >
            {saving === 'Recovery' ? 'Saving...' : 'Save Recovery Info'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="fl-card">
        <h3 className="fl-section-title" style={{ color: '#dc2626', borderColor: '#fecaca' }}>⚠️ Danger Zone</h3>
        <div className="fl-danger-zone">
          <p className="fl-danger-zone__title">Delete Account</p>
          <p className="fl-danger-zone__desc">
            Permanently delete your account and all associated data. This action is irreversible.
          </p>
          <button className="fl-btn fl-btn--danger" onClick={() => setDeleteModal(true)}>
            🗑 Delete My Account
          </button>
        </div>
      </div>

      <Modal open={deleteModal} title="Delete Account" onClose={() => setDeleteModal(false)} danger>
        <p style={{ marginBottom: '1rem' }}>
          This will permanently delete your account and all your data including gigs, orders, and profile info.
          <strong> This cannot be undone.</strong>
        </p>
        <p style={{ marginBottom: '1.25rem', color: '#dc2626', fontWeight: 600 }}>
          Are you absolutely sure?
        </p>
        <div className="fl-actions" style={{ marginTop: 0 }}>
          <button
            className="fl-btn fl-btn--danger"
            onClick={() => { setDeleteModal(false); showToast('Account deletion simulated.', 'info'); }}
          >
            Yes, Delete Account
          </button>
          <button className="fl-btn fl-btn--ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default FreelancerSettings;
