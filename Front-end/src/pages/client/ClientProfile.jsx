import { useState, useRef } from 'react';
import { useClient } from '../../context/ClientContext';
import { useAuth } from '../../hooks/useAuth';
import { uploadAvatar as apiUploadAvatar } from '../../utils/uploadHelper';
import TagInput from '../freelancer/components/TagInput';
import Modal from '../freelancer/components/Modal';
import './ClientDashboard.css';

const MAX_BIO = 600;
const PROJECT_TYPES = ['Web Development', 'Mobile App', 'Design', 'Content Writing', 'Marketing', 'Data Science', 'DevOps'];

const ClientProfile = () => {
  const { profile, saveProfile, showToast } = useClient();
  const { user } = useAuth();
  const isSupabaseUser = !!user?.supabaseId || user?.authProvider !== 'email';
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...(profile?.personalInfo || {}) });
  const [prefSkills, setPrefSkills] = useState(Array.isArray(profile?.preferences?.preferredSkills) ? [...profile.preferences.preferredSkills] : []);
  const [projTypes, setProjTypes] = useState(Array.isArray(profile?.preferences?.projectTypes) ? [...profile.preferences.projectTypes] : []);
  const [budgetRange, setBudgetRange] = useState({ ...(profile?.preferences?.budgetRange || {}) });
  const [remoteOnly, setRemoteOnly] = useState(!!profile?.preferences?.remoteOnly);
  const [errors, setErrors] = useState({});
  const avatarRef = useRef(null);
  const logoRef = useRef(null);

  const startEdit = () => {
    setForm({ ...profile.personalInfo });
    setPrefSkills(Array.isArray(profile.preferences.preferredSkills) ? [...profile.preferences.preferredSkills] : []);
    setProjTypes(Array.isArray(profile.preferences.projectTypes) ? [...profile.preferences.projectTypes] : []);
    setBudgetRange({ ...profile.preferences.budgetRange });
    setRemoteOnly(profile.preferences.remoteOnly);
    setErrors({});
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updatedProfile = {
        ...profile,
        personalInfo: { ...profile.personalInfo, ...form },
        preferences: {
          ...profile.preferences,
          preferredSkills: [...prefSkills],
          projectTypes: [...projTypes],
          budgetRange: { ...budgetRange },
          remoteOnly,
        },
      };

      if (budgetRange.min > budgetRange.max && budgetRange.max !== 0) {
        showToast('Minimum budget cannot be greater than maximum budget', 'error');
        setSaving(false);
        return;
      }


      const result = await saveProfile(updatedProfile);
      if (result.success) {
        setEditing(false);
        setErrors({});
      } else if (result.errors) {
        // Map backend errors to local state
        const newErrors = {};
        if (Array.isArray(result.errors)) {
          result.errors.forEach(err => {
            if (typeof err === 'object' && err.field) {
              // Structured validation error from express-validator
              newErrors[err.field] = err.message;
            } else if (typeof err === 'string') {
              // Raw string error (e.g. Mongoose CastError)
              const pathMatch = err.match(/at path \\"(.+)\\"/);
              if (pathMatch) {
                newErrors[pathMatch[1]] = err;
              } else {
                newErrors.global = err;
              }
            }
          });
        } else if (typeof result.errors === 'object') {
          // Direct object mapping
          Object.assign(newErrors, result.errors);
        }
        setErrors(newErrors);
      }
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    try {
      // For avatar, use 'client' role
      const url = await apiUploadAvatar(file, 'client');
      setForm((p) => ({ ...p, [field]: url }));
      showToast('Image uploaded! Save profile to persist.');
    } catch (error) {
      showToast('Upload failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleProjType = (type) => {
    setProjTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const initials = (profile?.personalInfo?.fullName || 'CL')
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const data = editing ? form : profile.personalInfo;

  return (
    <div>
      <div className="cl-page-header">
        <h1 className="cl-page-title">My Profile</h1>
        <p className="cl-page-sub">Manage your public client profile and project preferences.</p>
      </div>

      {/* Profile Hero */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <div className="cl-profile-hero">
          <div className="cl-profile-hero__avatars">
            {/* Profile Avatar */}
            <div>
              <p className="cl-label" style={{ marginBottom: '0.5rem' }}>Profile Photo</p>
              <div className="cl-avatar-circle">
                {(editing ? form.avatar : profile?.personalInfo?.avatar) ? (
                  <img src={editing ? form.avatar : profile?.personalInfo?.avatar} alt="avatar" />
                ) : <span>{initials}</span>}
              </div>
              {editing && (
                <>
                  <button className="cl-btn cl-btn--ghost cl-btn--sm" style={{ marginTop: '0.5rem' }} onClick={() => avatarRef.current?.click()}>
                    📷 Change
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'avatar')} />
                </>
              )}
            </div>
            {/* Company Logo */}
            <div>
              <p className="cl-label" style={{ marginBottom: '0.5rem' }}>Company Logo</p>
              <div className="cl-logo-box">
                {(editing ? form.companyLogo : profile?.personalInfo?.companyLogo) ? (
                  <img src={editing ? form.companyLogo : profile?.personalInfo?.companyLogo} alt="logo" />
                ) : <span style={{ fontSize: '2rem' }}>🏢</span>}
              </div>
              {editing && (
                <>
                  <button className="cl-btn cl-btn--ghost cl-btn--sm" style={{ marginTop: '0.5rem' }} onClick={() => logoRef.current?.click()}>
                    📷 Upload
                  </button>
                  <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'companyLogo')} />
                </>
              )}
            </div>
          </div>

          <div className="cl-profile-hero__info">
            <h2 className="cl-profile-hero__name">{data.fullName}</h2>
            <p className="cl-profile-hero__company">🏢 {data.companyName} · {data.industry}</p>
            <div className="cl-profile-hero__meta">
              <span>📍 {data.location}</span>
              <span>🗓️ {data.memberSince}</span>
              {data.website && <a href={data.website} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>🌐 Website</a>}
            </div>
          </div>

          {!editing && (
            <button className="cl-btn cl-btn--primary" onClick={startEdit}>✏ Edit Profile</button>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title">👤 Personal Information</h3>
        <div className="cl-form-grid">
          {[
            { key: 'fullName', label: 'Full Name' },
            { key: 'username', label: 'Username' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
            { key: 'companyName', label: 'Company Name' },
            { key: 'industry', label: 'Industry' },
            { key: 'website', label: 'Website', type: 'url' },
            { key: 'location', label: 'Location' },
          ].map(({ key, label, type }) => (
            <div key={key} className="cl-form-group">
              <label className="cl-label">{label}</label>
              <input
                type={type || 'text'}
                className={`cl-input${errors[key] ? ' cl-input--error' : ''}`}
                value={editing ? form[key] || '' : profile?.personalInfo?.[key] || ''}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                disabled={!editing || (key === 'email' && isSupabaseUser)}
              />
              {editing && errors[key] && <span className="cl-error">⚠ {errors[key]}</span>}
            </div>
          ))}
          <div className="cl-form-group full">
            <label className="cl-label">Bio</label>
            <textarea
              className="cl-textarea"
              maxLength={MAX_BIO}
              rows={4}
              value={editing ? form.bio || '' : profile?.personalInfo?.bio || ''}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              disabled={!editing}
            />
            {editing && <span className="cl-char-count">{(form.bio || '').length}/{MAX_BIO}</span>}
          </div>
        </div>
      </div>

      {/* Project Preferences */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title">🎯 Project Preferences</h3>

        <div className="cl-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="cl-label">Preferred Skills</label>
          {editing ? (
            <TagInput tags={prefSkills} onChange={setPrefSkills} placeholder="e.g. React, Design..." />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
              {(Array.isArray(profile?.preferences?.preferredSkills) ? profile.preferences.preferredSkills : []).map((s) => (
                <span key={s} className="cl-tag">{s}</span>
              ))}
            </div>
          )}
        </div>

        <div className="cl-form-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="cl-form-group">
            <label className="cl-label">Budget Range (Min $)</label>
            <input
              type="number" className={`cl-input${errors.budgetRange ? ' cl-input--error' : ''}`}
              value={editing ? budgetRange.min : profile?.preferences?.budgetRange?.min || 0}
              onChange={(e) => setBudgetRange((p) => ({ ...p, min: Number(e.target.value) }))}
              disabled={!editing}
            />
          </div>
          <div className="cl-form-group">
            <label className="cl-label">Budget Range (Max $)</label>
            <input
              type="number" className={`cl-input${errors.budgetRange ? ' cl-input--error' : ''}`}
              value={editing ? budgetRange.max : profile?.preferences?.budgetRange?.max || 0}
              onChange={(e) => setBudgetRange((p) => ({ ...p, max: Number(e.target.value) }))}
              disabled={!editing}
            />
          </div>
          {editing && errors.budgetRange && <div className="cl-error" style={{ gridColumn: 'span 2' }}>⚠ {errors.budgetRange}</div>}
        </div>

        <div className="cl-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="cl-label">Project Types</label>
          <div className="cl-checkbox-group" style={{ marginTop: '0.4rem' }}>
            {PROJECT_TYPES.map((type) => {
              const checked = (editing ? projTypes : (profile?.preferences?.projectTypes || [])).includes(type);
              return (
                <span
                  key={type}
                  className={`cl-checkbox-pill${checked ? ' cl-checkbox-pill--checked' : ''}`}
                  onClick={() => editing && toggleProjType(type)}
                  style={{ cursor: editing ? 'pointer' : 'default' }}
                >
                  {checked ? '✓ ' : ''}{type}
                </span>
              );
            })}
          </div>
        </div>

        <div className="cl-toggle" style={{ maxWidth: '400px' }}>
          <div className="cl-toggle__info">
            <span className="cl-toggle__label">🌍 Remote Only</span>
            <span className="cl-toggle__desc">Only accept remote freelancer applications</span>
          </div>
          <div
            className={`cl-toggle__switch${(editing ? remoteOnly : !!profile?.preferences?.remoteOnly) ? ' cl-toggle__switch--on' : ''}`}
            onClick={() => editing && setRemoteOnly((v) => !v)}
            style={{ cursor: editing ? 'pointer' : 'default' }}
          />
        </div>

        {editing && errors.global && (
          <div className="cl-error-banner" style={{ marginTop: '1rem' }}>
            ⚠ {errors.global}
          </div>
        )}
      </div>

      {/* Actions */}
      {editing && (
        <div className="cl-actions">
          <button
            className={`cl-btn cl-btn--primary${saving ? ' cl-btn--loading' : ''}`}
            onClick={save} disabled={saving}
          >
            {saving ? 'Saving...' : '✔ Save Changes'}
          </button>
          <button className="cl-btn cl-btn--ghost" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}



      <style>{`
        .cl-profile-hero { display: flex; align-items: flex-start; gap: 1.75rem; flex-wrap: wrap; }
        .cl-profile-hero__avatars { display: flex; gap: 1.5rem; flex-shrink: 0; flex-wrap: wrap; }
        .cl-avatar-circle {
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--gradient-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; font-weight: 800; color: #fff;
          border: 3px solid rgba(183,201,226,0.5); overflow: hidden;
        }
        .cl-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
        .cl-logo-box {
          width: 80px; height: 80px; border-radius: 14px;
          background: #f0f4f8; border: 2px solid #e5edf5;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .cl-logo-box img { width: 100%; height: 100%; object-fit: contain; }
        .cl-profile-hero__info { flex: 1; min-width: 0; }
        .cl-profile-hero__name { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: var(--color-primary); }
        .cl-profile-hero__company { color: var(--color-text-mid); font-size: 0.875rem; margin: 0.2rem 0; }
        .cl-profile-hero__meta { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.3rem; }
      `}</style>
    </div>
  );
};

export default ClientProfile;
