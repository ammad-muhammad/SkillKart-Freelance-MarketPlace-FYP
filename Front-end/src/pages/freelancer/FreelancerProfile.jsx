import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { 
  Plus, Trash2, Edit3, Briefcase, Award, GraduationCap, MapPin,
  Clock, Globe, Github, Linkedin, ExternalLink,
  ChevronDown, Calendar, FileText, Check, X, User, Link as LinkIcon, Camera, Image as ImageIcon, Sparkles, FolderOpen, AlertTriangle
} from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import { useFreelancer } from '../../context/FreelancerContext';
import { useAuth } from '../../hooks/useAuth';
import { uploadAvatar as apiUploadAvatar, uploadPortfolioImage as apiUploadCover, validateFile } from '../../utils/uploadHelper';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import { timezones } from '../../utils/timezones';
import { LANGUAGES } from '../../data/languages';
import TagInput from '../../Components/common/TagInput/TagInput';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import UserAvatar from '../../Components/common/UserAvatar/UserAvatar';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import Modal from './components/Modal';
import './FreelancerDashboard.css';

const MAX_BIO = 600;
const PROFICIENCY_OPTIONS = ["basic", "conversational", "fluent", "native"];

const FreelancerProfile = () => {
  const { profile, saveProfile, showToast } = useFreelancer();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  // Two-step OTP-secured account deletion (reuses the backend deletion flow).
  const [deleteStep, setDeleteStep] = useState(1); // 1 = confirm, 2 = enter OTP
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const requestDeleteOtp = async () => {
    setDeleteBusy(true);
    try {
      await authAPI.requestDeletion();
      setDeleteStep(2);
      showToast('We sent a verification code to your email.', 'info');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not start account deletion.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteOtp.trim()) { showToast('Enter the code from your email.', 'error'); return; }
    setDeleteBusy(true);
    try {
      await authAPI.confirmDeletion(deleteOtp.trim());
      showToast('Your account has been permanently deleted.', 'info');
      setDeleteModal(false);
      await logout('Account deleted.');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid or expired code.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteBusy) return;
    setDeleteModal(false);
    setDeleteStep(1);
    setDeleteOtp('');
  };
  const [form, setForm] = useState(profile?.personalInfo ? { ...profile.personalInfo } : {});
  const [skills, setSkills] = useState(Array.isArray(profile?.skills) ? [...profile.skills] : []);
  const [languages, setLanguages] = useState(Array.isArray(profile?.languages) ? [...profile.languages] : []);
  const [education, setEducation] = useState(Array.isArray(profile?.personalInfo?.education) ? [...profile.personalInfo.education] : []);
  const [certifications, setCertifications] = useState(Array.isArray(profile?.personalInfo?.certifications) ? [...profile.personalInfo.certifications] : []);
  const [portfolioLinks, setPortfolioLinks] = useState(Array.isArray(profile?.portfolioLinks) ? [...profile.portfolioLinks] : []);
  const [socialLinks, setSocialLinks] = useState(profile?.socialLinks ? { ...profile.socialLinks } : {});
  const fileRef = useRef(null);
  const coverRef = useRef(null);
  const [cropTarget, setCropTarget] = useState(null); // { file, kind: 'avatar'|'cover' } while the crop modal is open

  const startEdit = () => {
    setForm({ ...profile.personalInfo });
    setSkills(Array.isArray(profile.skills) ? [...profile.skills] : []);
    setLanguages(Array.isArray(profile.languages) ? [...profile.languages] : []);
    setEducation(Array.isArray(profile.personalInfo.education) ? [...profile.personalInfo.education] : []);
    setCertifications(Array.isArray(profile.personalInfo.certifications) ? [...profile.personalInfo.certifications] : []);
    setPortfolioLinks(Array.isArray(profile.portfolioLinks) ? [...profile.portfolioLinks] : []);
    setSocialLinks({ ...profile.socialLinks });
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    setSaving(true);
    try {
      if (skills.length < 1) {
        showToast('At least one skill is required', 'error');
        setSaving(false);
        return;
      }

      if (languages.length < 1) {
        showToast('At least one language is required', 'error');
        setSaving(false);
        return;
      }

      if (socialLinks.website?.trim()) {
        let validUrl = true;
        try {
          const url = new URL(socialLinks.website.trim());
          validUrl = /^https?:$/.test(url.protocol);
        } catch {
          validUrl = false;
        }
        if (!validUrl) {
          showToast('Please enter a valid website URL (e.g. https://example.com)', 'error');
          setSaving(false);
          return;
        }
      }

      const updatedProfile = {
        ...profile,
        personalInfo: { 
          ...profile.personalInfo, 
          ...form,
          education: [...education],
          certifications: [...certifications]
        },
        skills: [...skills],
        languages: languages.map(l => ({
          language: typeof l.language === 'object' ? (l.language.name || l.language.language || "") : l.language,
          proficiency: l.proficiency
        })),
        portfolioLinks: [...portfolioLinks],
        socialLinks: { ...profile.socialLinks, ...socialLinks }
      };

      const result = await saveProfile(updatedProfile);
      if (result?.success) {
        setEditing(false);
      } else {
        showToast(result?.message || 'Update failed. Please check your details and try again.', 'error');
      }
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Update failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pickFile = (e, kind) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    const check = validateFile(file);
    if (!check.valid) {
      showToast(check.error, 'error');
      return;
    }
    setCropTarget({ file, kind });
  };

  const handleAvatarChange = (e) => pickFile(e, 'avatar');
  const handleCoverChange = (e) => pickFile(e, 'cover');

  const handleCropConfirm = async (finalFile) => {
    const kind = cropTarget?.kind;
    setCropTarget(null);
    setSaving(true);
    try {
      if (kind === 'avatar') {
        const url = await apiUploadAvatar(finalFile, 'freelancer');
        setForm((p) => ({ ...p, avatar: url }));
        showToast('Photo uploaded! Save to persist changes.');
      } else {
        const url = await apiUploadCover(finalFile);
        setForm((p) => ({ ...p, coverPhoto: url }));
        showToast('Cover photo uploaded! Save to persist changes.');
      }
    } catch {
      showToast(kind === 'avatar' ? 'Upload failed' : 'Cover upload failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addPortfolioLink = () => setPortfolioLinks((prev) => [...prev, '']);
  const removePortfolioLink = (i) => setPortfolioLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updatePortfolioLink = (i, val) =>
    setPortfolioLinks((prev) => prev.map((l, idx) => (idx === i ? val : l)));

  const data = editing ? form : (profile?.personalInfo || {});

  return (
    <div>
      <div className="fl-page-header">
        <h1 className="fl-page-title">My Profile</h1>
        <p className="fl-page-sub">Manage your public freelancer profile.</p>
      </div>

      {/* Profile Hero */}
      <div className="fl-card" style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <div 
          className="fl-profile-cover" 
          style={{ 
            height: '120px', 
            background: data.coverPhoto ? `url(${data.coverPhoto}) center/cover no-repeat` : 'var(--gradient-primary)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            margin: '-1.5rem -1.5rem 1.5rem -1.5rem',
            position: 'relative',
            zIndex: 1
          }}
        >
          {editing && (
            <div style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}>
              <button 
                className="fl-btn" 
                style={{ 
                  background: '#ffffff', 
                  color: '#042E4C', 
                  border: '1px solid rgba(4,46,76,0.2)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
                onMouseEnter={(e) => { e.currentTarget.style.background = '#042E4C'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#042E4C'; }}
                onClick={() => coverRef.current?.click()}
              >
                <Camera size={14} /> Change Cover
              </button>
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={handleCoverChange} />
            </div>
          )}
        </div>
        <div className="fl-profile-hero" style={{ position: 'relative', zIndex: 2, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div className="fl-profile-hero__avatar-wrap" style={{ marginTop: '-4rem', marginLeft: '1rem' }}>
            <div className="fl-profile-hero__avatar" style={{ border: '4px solid var(--color-bg)' }}>
              <UserAvatar 
                src={editing ? form.avatar : profile?.personalInfo?.avatar}
                fullName={data.fullName}
                size="xl"
              />
            </div>
            {editing && (
              <>
                <button className="fl-btn fl-btn--ghost fl-btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => fileRef.current?.click()}>
                  <Camera size={14} /> Change Photo
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </>
            )}
          </div>

          {/* Info */}
          <div className="fl-profile-hero__info">
            <h2 className="fl-profile-hero__name">{data.fullName}</h2>
            <p className="fl-profile-hero__title">{data.title || 'Professional Freelancer'}</p>
            <div className="fl-profile-hero__meta">
              <span><MapPin size={14} /> {data.location || 'Remote'}</span>
              <span><PkrIcon size={14} /> Rs. {data.hourlyRate || '0'}/hr</span>
              <span><Clock size={14} /> {data.availability || 'Not Set'}</span>
            </div>
          </div>

          {!editing && (
            <button className="fl-btn fl-btn--primary" onClick={startEdit} style={{ gap: '8px', display: 'flex', alignItems: 'center' }}>
              <Edit3 size={16} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title"><User size={18} /> Personal Information</h3>
        <div className="fl-form-grid">
          {[
            { key: 'fullName', label: 'Full Name' },
            { key: 'username', label: 'Username' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
            { key: 'title', label: 'Professional Title' },
            { key: 'hourlyRate', label: 'Hourly Rate (PKR)', type: 'number' },
            { 
              key: 'location', 
              label: 'Location (Timezone)', 
              type: 'select', 
              opts: timezones.map(tz => tz.label)
            },
            { 
              key: 'availability', 
              label: 'Availability', 
              type: 'select', 
              opts: ['full-time', 'part-time', 'contract', 'not-available'] 
            },
            { key: 'experienceLevel', label: 'Experience Level', type: 'select', opts: ['Entry', 'Intermediate', 'Expert'] },
          ].map(({ key, label, type, opts }) => (
            <div key={key} className="fl-form-group">
              <label className="fl-label" htmlFor={`fp-${key}`}>{label}</label>
              {type === 'select' ? (
                <ComboSelect
                  id={`fp-${key}`}
                  options={opts}
                  value={editing ? form[key] : profile?.personalInfo?.[key]}
                  onChange={(val) => setForm((p) => ({ ...p, [key]: val }))}
                  disabled={!editing}
                  placeholder={editing ? `Type to search ${label.toLowerCase()}…` : ''}
                />
              ) : (
                <input
                  id={`fp-${key}`}
                  type={type || 'text'}
                  className="fl-input"
                  value={editing ? form[key] || '' : profile?.personalInfo?.[key] || ''}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  disabled={!editing || key === 'email'}
                  placeholder={label}
                />
              )}
            </div>
          ))}

          {/* Bio */}
          <div className="fl-form-group full">
            <label className="fl-label" htmlFor="fp-bio">Professional Bio</label>
            <textarea
              id="fp-bio"
              className="fl-textarea"
              maxLength={MAX_BIO}
              value={editing ? form.bio || '' : profile?.personalInfo?.bio || ''}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              disabled={!editing}
              rows={4}
              placeholder="Tell clients about your expertise..."
            />
            {editing && (
              <span className="fl-char-count">{(form.bio || '').length}/{MAX_BIO}</span>
            )}
            {editing && (
              <AiGenerateText
                className="fl-ai-generate"
                fieldLabel="a freelancer's professional bio for their marketplace profile"
                getContext={() => ({ title: form.title, experienceLevel: form.experienceLevel, skills: skills.map((s) => s?.name).filter(Boolean) })}
                getExistingText={() => form.bio}
                onGenerated={(text) => setForm((p) => ({ ...p, bio: text.slice(0, MAX_BIO) }))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Education Section */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="fl-section-title" style={{ marginBottom: 0 }}><GraduationCap size={18} /> Education</h3>
          {editing && (
            <button 
              className="fl-btn fl-btn--ghost fl-btn--sm" 
              onClick={() => setEducation([...education, { institution: '', degree: '', field: '', startDate: '', endDate: '', description: '' }])}
              style={{ gap: '6px', display: 'flex', alignItems: 'center' }}
            >
              <Plus size={14} /> Add Education
            </button>
          )}
        </div>

        <div className="fl-nested-list">
          {(editing ? education : (profile?.personalInfo?.education || [])).map((edu, i) => (
            <div key={`edu-${i}`} className="fl-nested-item">
              {editing ? (
                <div className="fl-form-grid">
                  <div className="fl-form-group">
                    <label className="fl-label" htmlFor={`fp-edu-institution-${i}`}>Institution</label>
                    <input id={`fp-edu-institution-${i}`} className="fl-input" value={edu.institution} onChange={(e) => {
                      const newEdu = [...education];
                      newEdu[i].institution = e.target.value;
                      setEducation(newEdu);
                    }} placeholder="University Name" />
                  </div>
                  <div className="fl-form-group">
                    <label className="fl-label" htmlFor={`fp-edu-degree-${i}`}>Degree</label>
                    <input id={`fp-edu-degree-${i}`} className="fl-input" value={edu.degree} onChange={(e) => {
                      const newEdu = [...education];
                      newEdu[i].degree = e.target.value;
                      setEducation(newEdu);
                    }} placeholder="Bachelor's, Master's, etc." />
                  </div>
                  <div className="fl-form-group">
                    <label className="fl-label" htmlFor={`fp-edu-field-${i}`}>Field of Study</label>
                    <input id={`fp-edu-field-${i}`} className="fl-input" value={edu.field} onChange={(e) => {
                      const newEdu = [...education];
                      newEdu[i].field = e.target.value;
                      setEducation(newEdu);
                    }} placeholder="Computer Science, Business, etc." />
                  </div>
                  <div className="fl-form-row">
                    <div className="fl-form-group">
                      <label className="fl-label" htmlFor={`fp-edu-start-${i}`}>Start Date</label>
                      <input id={`fp-edu-start-${i}`} type="date" className="fl-input" value={edu.startDate ? new Date(edu.startDate).toISOString().split('T')[0] : ''} onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[i].startDate = e.target.value;
                        setEducation(newEdu);
                      }} />
                    </div>
                    <div className="fl-form-group">
                      <label className="fl-label" htmlFor={`fp-edu-end-${i}`}>End Date</label>
                      <input id={`fp-edu-end-${i}`} type="date" className="fl-input" value={edu.endDate ? new Date(edu.endDate).toISOString().split('T')[0] : ''} onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[i].endDate = e.target.value;
                        setEducation(newEdu);
                      }} />
                    </div>
                  </div>
                  <div className="fl-form-group full">
                    <label className="fl-label" htmlFor={`fp-edu-desc-${i}`}>Description (Optional)</label>
                    <textarea id={`fp-edu-desc-${i}`} className="fl-textarea" rows={2} value={edu.description} onChange={(e) => {
                      const newEdu = [...education];
                      newEdu[i].description = e.target.value;
                      setEducation(newEdu);
                    }} placeholder="Describe your achievements..." />
                    <AiGenerateText
                      className="fl-ai-generate"
                      fieldLabel="a short description of achievements/coursework for one education entry on a freelancer's profile"
                      getContext={() => ({ institution: edu.institution, degree: edu.degree, field: edu.field })}
                      getExistingText={() => edu.description}
                      onGenerated={(text) => {
                        const newEdu = [...education];
                        newEdu[i].description = text;
                        setEducation(newEdu);
                      }}
                    />
                  </div>
                  <button className="fl-btn fl-btn--danger fl-btn--sm" onClick={() => setEducation(education.filter((_, idx) => idx !== i))} style={{ alignSelf: 'flex-start' }}>
                    <Trash2 size={14} /> Remove Entry
                  </button>
                </div>
              ) : (
                <div className="fl-display-item">
                  <div className="fl-display-item__icon"><GraduationCap size={20} /></div>
                  <div className="fl-display-item__content">
                    <h4 className="fl-display-item__title">{edu.degree} in {edu.field}</h4>
                    <p className="fl-display-item__subtitle">{edu.institution}</p>
                    <p className="fl-display-item__date">
                      <Calendar size={12} /> {edu.startDate ? new Date(edu.startDate).getFullYear() : ''} — {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                    </p>
                    {edu.description && <p className="fl-display-item__text">{edu.description}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
          {(editing ? education : (profile?.personalInfo?.education || [])).length === 0 && (
            <p className="fl-no-data">No education history added.</p>
          )}
        </div>
      </div>

      {/* Certifications Section */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="fl-section-title" style={{ marginBottom: 0 }}><Award size={18} /> Certifications</h3>
          {editing && (
            <button 
              className="fl-btn fl-btn--ghost fl-btn--sm" 
              onClick={() => setCertifications([...certifications, { name: '', issuer: '', issueDate: '', expiryDate: '', url: '', credentialId: '' }])}
              style={{ gap: '6px', display: 'flex', alignItems: 'center' }}
            >
              <Plus size={14} /> Add Certification
            </button>
          )}
        </div>

        <div className="fl-nested-list">
          {(editing ? certifications : (profile?.personalInfo?.certifications || [])).map((cert, i) => (
            <div key={`cert-${i}`} className="fl-nested-item">
              {editing ? (
                <div className="fl-form-grid">
                  <div className="fl-form-group">
                    <label className="fl-label" htmlFor={`fp-cert-name-${i}`}>Certification Name</label>
                    <input id={`fp-cert-name-${i}`} className="fl-input" value={cert.name} onChange={(e) => {
                      const newCert = [...certifications];
                      newCert[i].name = e.target.value;
                      setCertifications(newCert);
                    }} placeholder="e.g. AWS Certified Solutions Architect" />
                  </div>
                  <div className="fl-form-group">
                    <label className="fl-label" htmlFor={`fp-cert-issuer-${i}`}>Issuing Organization</label>
                    <input id={`fp-cert-issuer-${i}`} className="fl-input" value={cert.issuer} onChange={(e) => {
                      const newCert = [...certifications];
                      newCert[i].issuer = e.target.value;
                      setCertifications(newCert);
                    }} placeholder="e.g. Amazon Web Services" />
                  </div>
                  <div className="fl-form-row">
                    <div className="fl-form-group">
                      <label className="fl-label" htmlFor={`fp-cert-issue-date-${i}`}>Issue Date</label>
                      <input id={`fp-cert-issue-date-${i}`} type="date" className="fl-input" value={cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : ''} onChange={(e) => {
                        const newCert = [...certifications];
                        newCert[i].issueDate = e.target.value;
                        setCertifications(newCert);
                      }} />
                    </div>
                    <div className="fl-form-group">
                      <label className="fl-label" htmlFor={`fp-cert-expiry-date-${i}`}>Expiry Date (Optional)</label>
                      <input id={`fp-cert-expiry-date-${i}`} type="date" className="fl-input" value={cert.expiryDate ? new Date(cert.expiryDate).toISOString().split('T')[0] : ''} onChange={(e) => {
                        const newCert = [...certifications];
                        newCert[i].expiryDate = e.target.value;
                        setCertifications(newCert);
                      }} />
                    </div>
                  </div>
                  <div className="fl-form-group">
                    <label className="fl-label" htmlFor={`fp-cert-credential-${i}`}>Credential ID (Optional)</label>
                    <input id={`fp-cert-credential-${i}`} className="fl-input" value={cert.credentialId} onChange={(e) => {
                      const newCert = [...certifications];
                      newCert[i].credentialId = e.target.value;
                      setCertifications(newCert);
                    }} placeholder="Credential ID or Serial Number" />
                  </div>
                  <div className="fl-form-group">
                    <label className="fl-label" htmlFor={`fp-cert-url-${i}`}>Certificate URL (Optional)</label>
                    <input id={`fp-cert-url-${i}`} type="url" className="fl-input" value={cert.url} onChange={(e) => {
                      const newCert = [...certifications];
                      newCert[i].url = e.target.value;
                      setCertifications(newCert);
                    }} placeholder="https://..." />
                  </div>
                  <button className="fl-btn fl-btn--danger fl-btn--sm" onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))} style={{ alignSelf: 'flex-start' }}>
                    <Trash2 size={14} /> Remove Entry
                  </button>
                </div>
              ) : (
                <div className="fl-display-item">
                  <div className="fl-display-item__icon"><Award size={20} /></div>
                  <div className="fl-display-item__content">
                    <h4 className="fl-display-item__title">{cert.name}</h4>
                    <p className="fl-display-item__subtitle">{cert.issuer}</p>
                    <div className="fl-display-item__meta-row">
                      <span className="fl-display-item__date">
                        <Calendar size={12} /> Issued: {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : 'N/A'}
                      </span>
                      {cert.expiryDate && (
                        <span className="fl-display-item__date">
                          <Clock size={12} /> Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {cert.url && (
                      <a href={cert.url} target="_blank" rel="noopener noreferrer" className="fl-btn fl-btn--ghost fl-btn--xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <ExternalLink size={12} /> View Certificate
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {(editing ? certifications : (profile?.personalInfo?.certifications || [])).length === 0 && (
            <p className="fl-no-data">No certifications added.</p>
          )}
        </div>
      </div>

      {/* Skills & Languages */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title"><Sparkles size={18} style={{marginRight:6, verticalAlign:'middle'}} /> Skills & Languages</h3>
        <div className="fl-form-grid">
          <div className="fl-form-group">
            <label className="fl-label">Skills (press Enter to add)*</label>
            {editing ? (
              <>
                <TagInput tags={skills} onChange={setSkills} placeholder="e.g. React, Node.js" />
                {skills.length === 0 && <span className="fl-error" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={14} /> At least one skill is required</span>}
                {/* AI suggest — skills + experience level from the freelancer's title/bio */}
                <AiSuggestFill
                  label="Suggest skills & level (AI)"
                  getContext={() => ({
                    title: form.title || form.headline || '',
                    description: [form.title, form.bio].filter(Boolean).join('. '),
                    skills,
                  })}
                  existingSkills={skills}
                  onSkills={(newSkills) => setSkills((prev) => Array.from(new Set([...prev, ...newSkills])))}
                  onExperience={(level) => setForm((p) => ({ ...p, experienceLevel: level }))}
                />
              </>
            ) : (
              <div className="fl-tags-display">
                {(Array.isArray(profile.skills) ? profile.skills : []).map((s, idx) => {
                  const name = typeof s === 'string' ? s : s?.name;
                  if (!name) return null;
                  return <span key={`${name}-${idx}`} className="fl-tag">{name}</span>;
                })}
              </div>
            )}
          </div>
          <div className="fl-form-group fl-form-group--full">
            <label className="fl-label">Languages You Speak (press Enter to add)*</label>
            {editing ? (
              <>
                <TagInput 
                  tags={languages.map(l => typeof l === 'string' ? l : (l?.language || '')).filter(Boolean)} 
                  onChange={(newTags) => {
                    setLanguages(newTags.map(tag => ({ language: tag, proficiency: 'fluent' })));
                  }} 
                  options={LANGUAGES}
                  placeholder="Type or select languages (e.g. Urdu, English)…" 
                  showHint={false}
                />
                {languages.length === 0 && (
                  <p className="fl-error" style={{ margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangle size={14} /> At least one language is required
                  </p>
                )}
              </>
            ) : (
              <div className="fl-tags-display">
                {(Array.isArray(profile.languages) ? profile.languages : []).map((l, idx) => {
                  const name = typeof l === 'string' ? l : (l?.language || 'Unknown');
                  return (
                    <span key={idx} className="fl-tag fl-tag--alt">
                      {name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Projects (Rich) */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="fl-section-title" style={{ marginBottom: 0 }}><FolderOpen size={18} style={{marginRight:6, verticalAlign:'middle'}} /> Portfolio Projects</h3>
          <Link to="/freelancer/portfolio" className="fl-btn fl-btn--ghost fl-btn--sm">Manage All</Link>
        </div>
        
        {(profile?.portfolio || []).length === 0 ? (
          <p className="fl-no-data" style={{ padding: '1rem 0' }}>No portfolio projects added yet. Showcase your work in the Portfolio tab.</p>
        ) : (
          <div className="fl-mini-portfolio-grid">
            {profile.portfolio.slice(0, 3).map((item, i) => (
              <div key={item._id || i} className="fl-mini-p-card">
                <div className="fl-mini-p-card__img">
                  {item.images?.[0] ? <img src={item.images[0]} alt={item.title} /> : <span><ImageIcon size={24} color="#94a3b8" /></span>}
                </div>
                <div className="fl-mini-p-card__info">
                  <h4 className="fl-mini-p-card__title">{item.title}</h4>
                  <p className="fl-mini-p-card__desc">{item.description}</p>
                </div>
              </div>
            ))}
            {profile.portfolio.length > 3 && (
              <Link to="/freelancer/portfolio" className="fl-mini-p-card fl-mini-p-card--more">
                <span>+{profile.portfolio.length - 3} More</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Legacy Links & Socials */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title"><LinkIcon size={18} /> Portfolio & Social Links</h3>

        <div className="fl-form-group full">
          <label className="fl-label" style={{ marginBottom: '0.6rem' }}>External Portfolio Links</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(editing ? portfolioLinks : (profile?.portfolioLinks || [])).map((link, i) => (
              <div key={`portfolio-${i}`} className="fl-link-row">
                <input
                  type="url"
                  className="fl-input"
                  value={editing ? link : profile?.portfolioLinks?.[i] || ''}
                  onChange={(e) => updatePortfolioLink(i, e.target.value)}
                  disabled={!editing}
                  placeholder="https://behance.net/yourname"
                />
                {editing && (
                  <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={() => removePortfolioLink(i)}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
            {editing && (
              <button className="fl-btn fl-btn--ghost fl-btn--sm" style={{ alignSelf: 'flex-start', gap: '4px', display: 'flex', alignItems: 'center' }} onClick={addPortfolioLink}>
                <Plus size={14} /> Add Link
              </button>
            )}
          </div>
        </div>

        <div className="fl-divider" style={{ margin: '1.5rem 0' }} />

        <label className="fl-label" style={{ marginBottom: '1rem', display: 'block' }}>Social Profiles</label>
        <div className="fl-form-grid">
          {[
            { key: 'github', label: 'GitHub', Icon: Github },
            { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
            { key: 'website', label: 'Website', Icon: Globe },
          ].map(({ key, label, Icon }) => (
            <div key={key} className="fl-form-group">
              <label className="fl-label" htmlFor={`fp-social-${key}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon size={14} /> {label}</label>
              <input
                id={`fp-social-${key}`}
                type="url"
                className="fl-input"
                value={editing ? socialLinks[key] || '' : profile?.socialLinks?.[key] || ''}
                onChange={(e) => setSocialLinks((p) => ({ ...p, [key]: e.target.value }))}
                disabled={!editing}
                placeholder={`https://${key}.com/your-profile`}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .fl-mini-portfolio-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .fl-mini-p-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.2s;
        }
        .fl-mini-p-card__img {
          height: 100px;
          background: #edf2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .fl-mini-p-card__img img { width: 100%; height: 100%; object-fit: cover; }
        .fl-mini-p-card__info { padding: 0.75rem; }
        .fl-mini-p-card__title { font-size: 0.85rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.25rem; }
        .fl-mini-p-card__desc { font-size: 0.75rem; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .fl-mini-p-card--more {
          display: flex; align-items: center; justify-content: center;
          background: var(--gradient-primary); color: #fff;
          font-weight: 700; text-decoration: none;
        }
        .fl-mini-p-card--more:hover { transform: scale(1.02); opacity: 0.9; }
        
        .fl-link-row { display: flex; gap: 0.5rem; align-items: center; }
        .fl-divider { height: 1px; background: #edf2f7; }
        .fl-no-data { text-align: center; color: #94a3b8; font-size: 0.9rem; }

        .fl-nested-list { display: flex; flexDirection: column; gap: 1.25rem; }
        .fl-nested-item { 
          padding: 1.25rem; 
          background: #f8fafc; 
          border-radius: 16px; 
          border: 1px solid #e2e8f0; 
        }
        .fl-display-item { display: flex; gap: 1rem; }
        .fl-display-item__icon { 
          width: 40px; height: 40px; 
          border-radius: 10px; 
          background: #fff; 
          border: 1px solid #e2e8f0; 
          display: flex; align-items: center; justify-content: center; 
          color: var(--color-primary);
          flex-shrink: 0;
        }
        .fl-display-item__content { flex: 1; }
        .fl-display-item__title { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .fl-display-item__subtitle { font-size: 0.9rem; font-weight: 500; color: #475569; margin-bottom: 6px; }
        .fl-display-item__date { 
          font-size: 0.8rem; color: #64748b; 
          display: flex; align-items: center; gap: 4px; 
          margin-bottom: 8px;
        }
        .fl-display-item__meta-row { display: flex; gap: 1rem; }
        .fl-display-item__text { font-size: 0.875rem; color: #475569; line-height: 1.5; margin: 0; }

        .fl-section-title { display: flex; align-items: center; gap: 10px; }
        .fl-form-row { display: flex; gap: 1rem; }
        .fl-form-row .fl-form-group { flex: 1; }
      `}</style>

      {/* Actions */}
      {editing && (
        <div className="fl-actions">
          <button
            className={`fl-btn fl-btn--primary${saving ? ' fl-btn--loading' : ''}`}
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving...' : <><Check size={16} style={{marginRight:6}} /> Save Changes</>}
          </button>
          <button className="fl-btn fl-btn--ghost" onClick={cancel}>Cancel</button>
          <button className="fl-btn fl-btn--danger" style={{ marginLeft: 'auto' }} onClick={() => { setDeleteStep(1); setDeleteOtp(''); setDeleteModal(true); }}>
            <Trash2 size={16} style={{marginRight:6}} /> Delete Account
          </button>
        </div>
      )}

      {/* Delete Account — OTP-secured, cascade-deletes profile, gigs & proposals */}
      <Modal open={deleteModal} title="Delete Account" onClose={closeDeleteModal} danger>
        {deleteStep === 1 ? (
          <>
            <p>This permanently deletes your account, profile, gigs, and proposals. <strong>This cannot be undone.</strong> We'll email you a verification code to confirm.</p>
            <div className="fl-actions" style={{ marginTop: '1.25rem' }}>
              <button className={`fl-btn fl-btn--danger${deleteBusy ? ' fl-btn--loading' : ''}`} disabled={deleteBusy} onClick={requestDeleteOtp}>
                {deleteBusy ? 'Sending…' : 'Send verification code'}
              </button>
              <button className="fl-btn fl-btn--ghost" onClick={closeDeleteModal} disabled={deleteBusy}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p>Enter the verification code we sent to <strong>{user?.email}</strong> to permanently delete your account.</p>
            <input
              className="fl-input"
              style={{ marginTop: '0.75rem', letterSpacing: '0.3em', textAlign: 'center' }}
              placeholder="000000"
              value={deleteOtp}
              onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <div className="fl-actions" style={{ marginTop: '1.25rem' }}>
              <button className={`fl-btn fl-btn--danger${deleteBusy ? ' fl-btn--loading' : ''}`} disabled={deleteBusy} onClick={confirmDelete}>
                {deleteBusy ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button className="fl-btn fl-btn--ghost" onClick={closeDeleteModal} disabled={deleteBusy}>Cancel</button>
            </div>
          </>
        )}
      </Modal>

      <ImageCropModal
        file={cropTarget?.file || null}
        aspect={cropTarget?.kind === 'cover' ? 4 / 1 : 1}
        cropShape={cropTarget?.kind === 'cover' ? 'rect' : 'round'}
        title={cropTarget?.kind === 'cover' ? 'Adjust Cover Photo' : 'Adjust Profile Photo'}
        onCancel={() => setCropTarget(null)}
        onConfirm={handleCropConfirm}
      />

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

        /* ── Mobile ──────────────────────────────────────────────
           The hero is a flex row [avatar | info | Edit]. On phones the info
           column gets crushed to near-zero width (title wrapped one letter per
           line). Stack everything vertically and center it instead. */
        @media (max-width: 640px) {
          .fl-profile-hero {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1rem;
          }
          .fl-profile-hero__avatar-wrap {
            /* Center the avatar on the screen (override the inline marginLeft
               and the desktop -4rem pull-up which looked off-centre on mobile). */
            margin: 0 auto !important;
            align-self: center;
          }
          .fl-profile-hero__info {
            width: 100%;
            flex: none;
          }
          .fl-profile-hero__meta {
            justify-content: center;
          }
          .fl-profile-hero .fl-btn--primary {
            width: 100%;
            justify-content: center;
          }
          .fl-profile-hero__name { font-size: 1.6rem; line-height: 1.2; }
        }
      `}</style>
    </div>
  );
};

export default FreelancerProfile;
