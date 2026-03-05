import { useState, useRef } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import TagInput from './components/TagInput';
import Modal from './components/Modal';
import './FreelancerDashboard.css';

const MAX_BIO = 600;

const FreelancerProfile = () => {
  const { profile, setProfile, showToast } = useFreelancer();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [form, setForm] = useState(profile?.personalInfo ? { ...profile.personalInfo } : {});
  const [skills, setSkills] = useState(Array.isArray(profile?.skills) ? [...profile.skills] : []);
  const [languages, setLanguages] = useState(Array.isArray(profile?.languages) ? [...profile.languages] : []);
  const [portfolioLinks, setPortfolioLinks] = useState(Array.isArray(profile?.portfolioLinks) ? [...profile.portfolioLinks] : []);
  const [socialLinks, setSocialLinks] = useState(profile?.socialLinks ? { ...profile.socialLinks } : {});
  const fileRef = useRef(null);

  const startEdit = () => {
    setForm({ ...profile.personalInfo });
    setSkills(Array.isArray(profile.skills) ? [...profile.skills] : []);
    setLanguages(Array.isArray(profile.languages) ? [...profile.languages] : []);
    setPortfolioLinks(Array.isArray(profile.portfolioLinks) ? [...profile.portfolioLinks] : []);
    setSocialLinks({ ...profile.socialLinks });
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      // Use the functional update to ensure we have the most recent 'prev' state
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          personalInfo: { ...(prev.personalInfo || {}), ...(form || {}) },
          skills: Array.isArray(skills) ? [...skills] : [],
          languages: Array.isArray(languages) ? [...languages] : [],
          portfolioLinks: Array.isArray(portfolioLinks) ? [...portfolioLinks] : [],
          socialLinks: { ...(prev.socialLinks || {}), ...(socialLinks || {}) },
        };
      });
      showToast('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Update failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((p) => ({ ...p, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const addPortfolioLink = () => setPortfolioLinks((prev) => [...prev, '']);
  const removePortfolioLink = (i) => setPortfolioLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updatePortfolioLink = (i, val) =>
    setPortfolioLinks((prev) => prev.map((l, idx) => (idx === i ? val : l)));

  const initials = (profile.personalInfo.fullName || 'FL')
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const data = editing ? form : profile.personalInfo;

  return (
    <div>
      <div className="fl-page-header">
        <h1 className="fl-page-title">My Profile</h1>
        <p className="fl-page-sub">Manage your public freelancer profile.</p>
      </div>

      {/* Profile Hero */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <div className="fl-profile-hero">
          {/* Avatar */}
          <div className="fl-profile-hero__avatar-wrap">
            <div className="fl-profile-hero__avatar">
              {(editing ? form.avatar : profile.personalInfo.avatar) ? (
                <img src={editing ? form.avatar : profile.personalInfo.avatar} alt="avatar" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {editing && (
              <>
                <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={() => fileRef.current?.click()}>
                  📷 Change Photo
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </>
            )}
          </div>

          {/* Info */}
          <div className="fl-profile-hero__info">
            <h2 className="fl-profile-hero__name">{data.fullName}</h2>
            <p className="fl-profile-hero__title">{data.title}</p>
            <div className="fl-profile-hero__meta">
              <span>📍 {data.location}</span>
              <span>🗓️ {data.memberSince}</span>
              <span>⭐ 4.9 (47 reviews)</span>
            </div>
          </div>

          {!editing && (
            <button className="fl-btn fl-btn--primary" onClick={startEdit}>✏ Edit Profile</button>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title">👤 Personal Information</h3>
        <div className="fl-form-grid">
          {[
            { key: 'fullName', label: 'Full Name' },
            { key: 'username', label: 'Username' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
            { key: 'title', label: 'Professional Title' },
            { key: 'location', label: 'Location' },
            { key: 'experienceLevel', label: 'Experience Level', type: 'select', opts: ['Entry', 'Intermediate', 'Expert'] },
            { key: 'education', label: 'Education' },
            { key: 'certifications', label: 'Certifications' },
          ].map(({ key, label, type, opts }) => (
            <div key={key} className="fl-form-group">
              <label className="fl-label">{label}</label>
              {type === 'select' ? (
                <CustomSelect
                  options={opts}
                  value={editing ? form[key] : profile.personalInfo[key]}
                  onChange={(val) => setForm((p) => ({ ...p, [key]: val }))}
                  disabled={!editing}
                />
              ) : (
                <input
                  type={type || 'text'}
                  className="fl-input"
                  value={editing ? form[key] || '' : profile.personalInfo[key] || ''}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  disabled={!editing}
                />
              )}
            </div>
          ))}

          {/* Bio */}
          <div className="fl-form-group full">
            <label className="fl-label">Bio</label>
            <textarea
              className="fl-textarea"
              maxLength={MAX_BIO}
              value={editing ? form.bio || '' : profile.personalInfo.bio || ''}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              disabled={!editing}
              rows={4}
            />
            {editing && (
              <span className="fl-char-count">{(form.bio || '').length}/{MAX_BIO}</span>
            )}
          </div>
        </div>
      </div>

      {/* Skills & Languages */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title">🛠️ Skills & Languages</h3>
        <div className="fl-form-grid">
          <div className="fl-form-group">
            <label className="fl-label">Skills (press Enter to add)</label>
            {editing ? (
              <TagInput tags={skills} onChange={setSkills} placeholder="e.g. React, Node.js" />
            ) : (
              <div className="fl-tags-display">
                {(Array.isArray(profile.skills) ? profile.skills : []).map((s) => <span key={s} className="fl-tag">{s}</span>)}
              </div>
            )}
          </div>
          <div className="fl-form-group">
            <label className="fl-label">Languages</label>
            {editing ? (
              <TagInput tags={languages} onChange={setLanguages} placeholder="e.g. English" />
            ) : (
              <div className="fl-tags-display">
                {(Array.isArray(profile.languages) ? profile.languages : []).map((l) => <span key={l} className="fl-tag">{l}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Links */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title">🗂️ Portfolio & Social Links</h3>

        <label className="fl-label" style={{ marginBottom: '0.6rem', display: 'block' }}>Portfolio Links</label>
        {(editing ? portfolioLinks : profile.portfolioLinks).map((link, i) => (
          <div key={i} className="fl-link-row">
            <input
              type="url"
              className="fl-input"
              value={editing ? link : profile.portfolioLinks[i] || ''}
              onChange={(e) => updatePortfolioLink(i, e.target.value)}
              disabled={!editing}
              placeholder="https://yourproject.com"
            />
            {editing && (
              <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={() => removePortfolioLink(i)}>✕</button>
            )}
          </div>
        ))}
        {editing && (
          <button className="fl-btn fl-btn--ghost fl-btn--sm" style={{ marginTop: '0.5rem' }} onClick={addPortfolioLink}>
            ＋ Add Portfolio Link
          </button>
        )}

        <div className="fl-divider" />

        <label className="fl-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Social Links</label>
        <div className="fl-form-grid">
          {[
            { key: 'github', label: 'GitHub', icon: '🐙' },
            { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
            { key: 'website', label: 'Website', icon: '🌐' },
          ].map(({ key, label, icon }) => (
            <div key={key} className="fl-form-group">
              <label className="fl-label">{icon} {label}</label>
              <input
                type="url"
                className="fl-input"
                value={editing ? socialLinks[key] || '' : profile.socialLinks[key] || ''}
                onChange={(e) => setSocialLinks((p) => ({ ...p, [key]: e.target.value }))}
                disabled={!editing}
                placeholder={`https://${key}.com/...`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {editing && (
        <div className="fl-actions">
          <button
            className={`fl-btn fl-btn--primary${saving ? ' fl-btn--loading' : ''}`}
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving...' : '✔ Save Changes'}
          </button>
          <button className="fl-btn fl-btn--ghost" onClick={cancel}>Cancel</button>
          <button className="fl-btn fl-btn--danger" style={{ marginLeft: 'auto' }} onClick={() => setDeleteModal(true)}>
            🗑 Delete Profile
          </button>
        </div>
      )}

      {/* Delete Modal */}
      <Modal open={deleteModal} title="Delete Profile" onClose={() => setDeleteModal(false)} danger>
        <p>Are you sure you want to permanently delete your profile? This action cannot be undone.</p>
        <div className="fl-actions" style={{ marginTop: '1.25rem' }}>
          <button className="fl-btn fl-btn--danger" onClick={() => { setDeleteModal(false); showToast('Profile deletion simulated.', 'info'); }}>
            Yes, Delete
          </button>
          <button className="fl-btn fl-btn--ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
        </div>
      </Modal>

      <style>{`
        .fl-profile-hero {
          display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
        }
        .fl-profile-hero__avatar-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex-shrink: 0;
        }
        .fl-profile-hero__avatar {
          width: 90px; height: 90px; border-radius: 50%;
          background: var(--gradient-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; font-weight: 800; color: #fff;
          border: 3px solid rgba(183,201,226,0.5); overflow: hidden;
        }
        .fl-profile-hero__avatar img { width: 100%; height: 100%; object-fit: cover; }
        .fl-profile-hero__info { flex: 1; min-width: 0; }
        .fl-profile-hero__name {
          font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700; color: var(--color-primary);
        }
        .fl-profile-hero__title { color: var(--color-text-mid); margin: 0.2rem 0; }
        .fl-profile-hero__meta {
          display: flex; flex-wrap: wrap; gap: 1rem;
          font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.4rem;
        }
        .fl-tags-display { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      `}</style>
    </div>
  );
};

export default FreelancerProfile;
