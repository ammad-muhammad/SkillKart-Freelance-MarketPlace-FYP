import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import {
  Plus, Trash2, Edit3, Briefcase, Award, GraduationCap, MapPin,
  Clock, Globe, Github, Linkedin, ExternalLink,
  Calendar, Check, X, User, Link as LinkIcon, Camera,
  Image as ImageIcon, Sparkles, FolderOpen, AlertTriangle, Save,
  CheckCircle2, ArrowRight, ShieldAlert, AlertCircle, Share2
} from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import { openExternal } from '../../utils/externalLink';
import { useFreelancer } from '../../context/FreelancerContext';
import { useAuth } from '../../hooks/useAuth';
import { uploadAvatar as apiUploadAvatar, uploadPortfolioImage as apiUploadCover, validateFile } from '../../utils/uploadHelper';
import { timezones } from '../../utils/timezones';
import { LANGUAGES } from '../../data/languages';
import TagInput from '../../Components/common/TagInput/TagInput';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import UserAvatar from '../../Components/common/UserAvatar/UserAvatar';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import Modal from '../../Components/common/Modal/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import Loader from '../../Components/common/Loader/Loader';
import { Field, Input, Select, Textarea } from '../../Components/common/Field/Field';
import Reveal from './components/Reveal';
import './FreelancerProfile.css';

const MAX_BIO = 600;
const PROFICIENCY_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'native', label: 'Native or Bilingual' },
];

export default function FreelancerProfile() {
  const { profile, saveProfile, showToast } = useFreelancer();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Mode state: VIEW (default) vs EDIT
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Form State
  const [form, setForm] = useState(profile?.personalInfo ? { ...profile.personalInfo } : {});
  const [skills, setSkills] = useState(Array.isArray(profile?.skills) ? [...profile.skills] : []);
  const [languages, setLanguages] = useState(Array.isArray(profile?.languages) ? [...profile.languages] : []);
  const [education, setEducation] = useState(Array.isArray(profile?.personalInfo?.education) ? [...profile.personalInfo.education] : []);
  const [certifications, setCertifications] = useState(Array.isArray(profile?.personalInfo?.certifications) ? [...profile.personalInfo.certifications] : []);
  const [portfolioLinks, setPortfolioLinks] = useState(Array.isArray(profile?.portfolioLinks) ? [...profile.portfolioLinks] : []);
  const [socialLinks, setSocialLinks] = useState(profile?.socialLinks ? { ...profile.socialLinks } : {});
  const [initialSnapshot, setInitialSnapshot] = useState('');

  // Inline new language input state (edit mode)
  const [newLangName, setNewLangName] = useState('');
  const [newLangLevel, setNewLangLevel] = useState('fluent');

  // Delete Account Modal State
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  // File Upload refs & modal
  const fileRef = useRef(null);
  const coverRef = useRef(null);
  const [cropTarget, setCropTarget] = useState(null);

  // Sync state when profile loads initially
  useEffect(() => {
    if (profile?.personalInfo && !editing) {
      setForm({ ...profile.personalInfo });
      setSkills(Array.isArray(profile.skills) ? [...profile.skills] : []);
      setLanguages(Array.isArray(profile.languages) ? [...profile.languages] : []);
      setEducation(Array.isArray(profile.personalInfo.education) ? [...profile.personalInfo.education] : []);
      setCertifications(Array.isArray(profile.personalInfo.certifications) ? [...profile.personalInfo.certifications] : []);
      setPortfolioLinks(Array.isArray(profile.portfolioLinks) ? [...profile.portfolioLinks] : []);
      setSocialLinks(profile.socialLinks ? { ...profile.socialLinks } : {});
    }
  }, [profile, editing]);

  // Enter edit mode
  const startEdit = () => {
    const curForm = { ...profile?.personalInfo };
    const curSkills = Array.isArray(profile?.skills) ? [...profile.skills] : [];
    const curLangs = Array.isArray(profile?.languages) ? [...profile.languages] : [];
    const curEdu = Array.isArray(profile?.personalInfo?.education) ? [...profile.personalInfo.education] : [];
    const curCerts = Array.isArray(profile?.personalInfo?.certifications) ? [...profile.personalInfo.certifications] : [];
    const curPortLinks = Array.isArray(profile?.portfolioLinks) ? [...profile.portfolioLinks] : [];
    const curSocial = { ...profile?.socialLinks };

    setForm(curForm);
    setSkills(curSkills);
    setLanguages(curLangs);
    setEducation(curEdu);
    setCertifications(curCerts);
    setPortfolioLinks(curPortLinks);
    setSocialLinks(curSocial);

    setInitialSnapshot(JSON.stringify({
      form: curForm,
      skills: curSkills,
      languages: curLangs,
      education: curEdu,
      certifications: curCerts,
      portfolioLinks: curPortLinks,
      socialLinks: curSocial
    }));

    setEditing(true);
  };

  // Dirty detection
  const isDirty = useMemo(() => {
    if (!editing || !initialSnapshot) return false;
    const current = JSON.stringify({
      form,
      skills,
      languages,
      education,
      certifications,
      portfolioLinks,
      socialLinks
    });
    return current !== initialSnapshot;
  }, [editing, initialSnapshot, form, skills, languages, education, certifications, portfolioLinks, socialLinks]);

  // Cancel edit mode
  const cancelEdit = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setEditing(false);
    }
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    setEditing(false);
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && editing) {
        if (isDirty) {
          setShowDiscardConfirm(true);
        } else {
          setEditing(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, isDirty]);

  // Save handler
  const handleSave = async () => {
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
          ...profile?.personalInfo,
          ...form,
          education: [...education],
          certifications: [...certifications]
        },
        skills: [...skills],
        languages: languages.map(l => ({
          language: typeof l.language === 'object' ? (l.language.name || l.language.language || '') : l.language,
          proficiency: l.proficiency || 'fluent'
        })),
        portfolioLinks: [...portfolioLinks],
        socialLinks: { ...profile?.socialLinks, ...socialLinks }
      };

      const result = await saveProfile(updatedProfile);
      if (result?.success) {
        setEditing(false);
        showToast('Profile updated successfully!', 'success');
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

  // Image Upload / Crop
  const pickFile = (e, kind) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const check = validateFile(file);
    if (!check.valid) {
      showToast(check.error, 'error');
      return;
    }
    setCropTarget({ file, kind });
  };

  const handleAvatarChange = e => pickFile(e, 'avatar');
  const handleCoverChange = e => pickFile(e, 'cover');

  const handleCropConfirm = async (finalFile) => {
    const kind = cropTarget?.kind;
    setCropTarget(null);
    setSaving(true);
    try {
      if (kind === 'avatar') {
        const url = await apiUploadAvatar(finalFile, 'freelancer');
        setForm(p => ({ ...p, avatar: url }));
        showToast('Profile photo updated! Save changes to persist.', 'success');
      } else {
        const url = await apiUploadCover(finalFile);
        setForm(p => ({ ...p, coverPhoto: url }));
        showToast('Cover photo updated! Save changes to persist.', 'success');
      }
    } catch {
      showToast(kind === 'avatar' ? 'Photo upload failed' : 'Cover upload failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Education list handlers
  const addEducation = () => {
    setEducation(prev => [
      ...prev,
      { institution: '', degree: '', field: '', startDate: '', endDate: '', description: '' }
    ]);
  };
  const removeEducation = (idx) => {
    setEducation(prev => prev.filter((_, i) => i !== idx));
  };
  const updateEducation = (idx, fieldName, val) => {
    setEducation(prev => prev.map((item, i) => i === idx ? { ...item, [fieldName]: val } : item));
  };

  // Certification list handlers
  const addCertification = () => {
    setCertifications(prev => [
      ...prev,
      { name: '', issuer: '', issueDate: '', expiryDate: '', url: '', credentialId: '' }
    ]);
  };
  const removeCertification = (idx) => {
    setCertifications(prev => prev.filter((_, i) => i !== idx));
  };
  const updateCertification = (idx, fieldName, val) => {
    setCertifications(prev => prev.map((item, i) => i === idx ? { ...item, [fieldName]: val } : item));
  };

  // Portfolio Links handlers
  const addPortfolioLink = () => setPortfolioLinks(prev => [...prev, '']);
  const removePortfolioLink = i => setPortfolioLinks(prev => prev.filter((_, idx) => idx !== i));
  const updatePortfolioLink = (i, val) => setPortfolioLinks(prev => prev.map((l, idx) => idx === i ? val : l));

  // Language list handlers (inline add row in edit mode)
  const handleAddLanguage = () => {
    const trimmed = newLangName.trim();
    if (!trimmed) return;
    const exists = languages.some(l => {
      const name = typeof l === 'string' ? l : (l?.language || '');
      return name.toLowerCase() === trimmed.toLowerCase();
    });
    if (exists) {
      showToast('This language is already added', 'warning');
      return;
    }
    setLanguages(prev => [...prev, { language: trimmed, proficiency: newLangLevel }]);
    setNewLangName('');
    setNewLangLevel('fluent');
  };
  const handleRemoveLanguage = (idx) => {
    setLanguages(prev => prev.filter((_, i) => i !== idx));
  };

  // Delete Account OTP Flow (Preserving Existing Handler)
  const requestDeleteOtp = async () => {
    setDeleteBusy(true);
    try {
      await authAPI.requestDeletion();
      setDeleteStep(2);
      showToast('Verification code sent to your email.', 'info');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not start account deletion.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteOtp.trim()) {
      showToast('Enter the 6-digit code sent to your email.', 'error');
      return;
    }
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

  // Current active data
  const data = editing ? form : (profile?.personalInfo || {});
  const portfolioProjects = Array.isArray(profile?.portfolio) ? profile.portfolio : [];

  // Profile completion calculation
  const completionStats = useMemo(() => {
    const checks = [
      { id: 'avatar', label: 'Profile Photo', done: Boolean(data.avatar || profile?.personalInfo?.avatar) },
      { id: 'name', label: 'Full Name & Title', done: Boolean(data.fullName?.trim() && data.title?.trim()) },
      { id: 'bio', label: 'Professional Bio', done: Boolean(data.bio?.trim() && data.bio.trim().length >= 30) },
      { id: 'rate', label: 'Hourly Rate & Location', done: Boolean(Number(data.hourlyRate) > 0 && data.location?.trim()) },
      { id: 'skills', label: 'Skills (3+)', done: skills.length >= 3 },
      { id: 'languages', label: 'Languages', done: languages.length >= 1 },
      { id: 'education', label: 'Education / Certifications', done: education.length > 0 || certifications.length > 0 },
    ];
    const completedCount = checks.filter(c => c.done).length;
    const percentage = Math.round((completedCount / checks.length) * 100);
    return { checks, percentage };
  }, [data, skills, languages, education, certifications, profile]);

  // Scrollspy navigation handler
  const scrollToSection = (secId) => {
    setActiveTab(secId);
    const target = document.getElementById(secId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flp-page">
      {/* ─── Breadcrumb & Top Page Header ─── */}
      <header className="flp-header">
        <div className="flp-header__left">
          <nav className="flp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/freelancer/dashboard">Dashboard</Link>
            <span className="flp-breadcrumb__sep">/</span>
            <span className="flp-breadcrumb__curr">My Profile</span>
          </nav>
          <h1 className="flp-header__title">Freelancer Profile</h1>
          <p className="flp-header__sub">
            {editing
              ? 'Update your professional skills, rates, credentials, and portfolio showcase.'
              : 'Review how your profile appears to marketplace clients and prospective employers.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flp-hero-actions">
          {!editing ? (
            <>
              <Link
                to={`/freelancers/${user?._id || user?.id || ''}`}
                className="flp-btn-outline"
                title="View how clients see your profile"
              >
                <ExternalLink size={15} />
                <span>View Public Profile</span>
              </Link>

              <button
                type="button"
                className="flp-btn-navy"
                onClick={startEdit}
                title="Edit your profile details"
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            </>
          ) : (
            <div className="flp-chip flp-chip--amber" style={{ padding: '8px 16px', fontSize: 13.5 }}>
              <span className="flp-status-dot" />
              <span>Editing Mode Active</span>
            </div>
          )}
        </div>
      </header>

      {/* ─── A) HERO HEADER CARD ─── */}
      <Reveal delay={0}>
        <section className="flp-hero-card" aria-label="Profile Overview Header">
          {/* Cover photo */}
          <div
            className="flp-hero-cover"
            style={{
              backgroundImage: data.coverPhoto
                ? `url(${data.coverPhoto})`
                : 'linear-gradient(135deg, #0B2942 0%, #0F3E63 50%, #10B981 100%)'
            }}
          >
            <div className="flp-hero-cover__overlay" />
            {editing && (
              <button
                type="button"
                className="flp-update-cover-btn"
                onClick={() => coverRef.current?.click()}
                title="Upload or change cover banner photo"
              >
                <Camera size={14} />
                <span>Update Cover</span>
              </button>
            )}
            <ImageSourcePicker ref={coverRef} accept="image/*" onChange={handleCoverChange} />
          </div>

          {/* Profile row overlapping banner */}
          <div className="flp-hero-body">
            <div className="flp-avatar-wrap">
              {data.avatar ? (
                <img
                  src={data.avatar}
                  alt={data.fullName || 'User Avatar'}
                  className="flp-avatar-img"
                />
              ) : (
                <div className="flp-avatar-fallback">
                  {data.fullName ? data.fullName[0].toUpperCase() : 'F'}
                </div>
              )}

              {editing && (
                <button
                  type="button"
                  className="flp-avatar-cam-btn"
                  onClick={() => fileRef.current?.click()}
                  title="Change profile avatar"
                  aria-label="Change profile avatar"
                >
                  <Camera size={14} />
                </button>
              )}
              <ImageSourcePicker ref={fileRef} accept="image/*" facing="user" onChange={handleAvatarChange} />
            </div>

            <div className="flp-hero-main">
              <div className="flp-name-row">
                <h2 className="flp-user-name">{data.fullName || user?.firstName || 'Professional Freelancer'}</h2>
                {profile?.verificationStatus === 'verified' && (
                  <span className="flp-verified-badge" title="Verified SkillKart Talent">
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              <p className="flp-user-title">{data.title || 'Professional Freelancer'}</p>

              <div className="flp-chips-row">
                {data.location && (
                  <span className="flp-chip">
                    <MapPin size={13} color="#10B981" />
                    <span>{data.location}</span>
                  </span>
                )}
                <span className="flp-chip flp-chip--emerald">
                  <PkrIcon size={13} />
                  <span>Rs. {Number(data.hourlyRate || 0).toLocaleString()}/hr</span>
                </span>
                {data.availability && (
                  <span className="flp-chip">
                    <span className="flp-status-dot" style={{ color: data.availability === 'not-available' ? '#94A3B8' : '#10B981' }} />
                    <span style={{ textTransform: 'capitalize' }}>{data.availability.replace('-', ' ')}</span>
                  </span>
                )}
                {data.experienceLevel && (
                  <span className="flp-chip">
                    <span>{data.experienceLevel} Level</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile completion slim bar (shown if < 100%) */}
          {completionStats.percentage < 100 && (
            <div className="flp-completion-strip">
              <div className="flp-completion-strip__left">
                <span className="flp-completion-label">Profile Strength:</span>
                <div className="flp-completion-track">
                  <div
                    className="flp-completion-fill"
                    style={{ width: `${completionStats.percentage}%` }}
                  />
                </div>
                <span className="flp-completion-pct">{completionStats.percentage}%</span>
              </div>
              <span className="flp-completion-hint">
                Complete your profile to get up to 3x more client project invitations.
              </span>
            </div>
          )}
        </section>
      </Reveal>

      {/* ─── B) STICKY SECTION TABS ─── */}
      <nav className="flp-sticky-tabs" aria-label="Profile Sections Navigation">
        {[
          { id: 'flp-overview', label: 'Overview', complete: completionStats.checks[1].done && completionStats.checks[2].done },
          { id: 'flp-skills', label: 'Skills & Languages', complete: skills.length > 0 && languages.length > 0 },
          { id: 'flp-education', label: 'Education & Certs', complete: education.length > 0 || certifications.length > 0 },
          { id: 'flp-portfolio', label: 'Portfolio Projects', complete: portfolioProjects.length > 0 },
          { id: 'flp-links', label: 'Links & Socials', complete: portfolioLinks.length > 0 || Boolean(socialLinks.github || socialLinks.linkedin || socialLinks.website) },
        ].map(tabItem => (
          <button
            key={tabItem.id}
            type="button"
            className={`flp-tab-btn ${activeTab === tabItem.id ? 'flp-tab-btn--active' : ''}`}
            onClick={() => scrollToSection(tabItem.id)}
          >
            <span className={`flp-tab-dot ${tabItem.complete ? 'flp-tab-dot--green' : 'flp-tab-dot--amber'}`} />
            <span>{tabItem.label}</span>
          </button>
        ))}
      </nav>

      {/* ─── C) 12-COLUMN BODY GRID ─── */}
      <div className="flp-grid-layout">
        {/* LEFT COLUMN: Main Stack (8 cols) */}
        <main className="flp-col-main">

          {/* 1) PERSONAL INFORMATION */}
          <Reveal delay={40}>
            <section id="flp-overview" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <User size={18} />
                  </div>
                  <h3 className="flp-sec-title">Personal Information</h3>
                </div>
              </div>

              {!editing ? (
                /* VIEW MODE: Clean Display Text (NOT disabled grey inputs) */
                <div className="flp-view-grid">
                  <div className="flp-view-item">
                    <span className="flp-view-label">Full Name</span>
                    <span className="flp-view-value">{data.fullName || <span className="flp-view-value--empty">Not set</span>}</span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Username</span>
                    <span className="flp-view-value">{data.username || user?.username || <span className="flp-view-value--empty">Not set</span>}</span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Email Address</span>
                    <span className="flp-view-value">{data.email || user?.email || <span className="flp-view-value--empty">Not set</span>}</span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Phone Number</span>
                    <span className="flp-view-value">{data.phone || <span className="flp-view-value--empty">Not set</span>}</span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Professional Title</span>
                    <span className="flp-view-value">{data.title || <span className="flp-view-value--empty">Not set</span>}</span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Hourly Rate</span>
                    <span className="flp-view-value">Rs. {Number(data.hourlyRate || 0).toLocaleString()} / hr</span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Location / Timezone</span>
                    <span className="flp-view-value">{data.location || <span className="flp-view-value--empty">Not set</span>}</span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Availability</span>
                    <span className="flp-view-value" style={{ textTransform: 'capitalize' }}>
                      {data.availability ? data.availability.replace('-', ' ') : <span className="flp-view-value--empty">Not set</span>}
                    </span>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Experience Level</span>
                    <span className="flp-view-value">{data.experienceLevel || <span className="flp-view-value--empty">Not set</span>}</span>
                  </div>
                  <div className="flp-view-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="flp-view-label">Professional Bio</span>
                    <div className="flp-bio-box">
                      {data.bio || 'Tell clients about your professional background, expertise, and what sets your services apart.'}
                    </div>
                  </div>
                </div>
              ) : (
                /* EDIT MODE: Field System Inputs */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="flp-edit-grid-3">
                    <Field id="fp-fullName" label="Full Name" required>
                      <Input
                        id="fp-fullName"
                        value={form.fullName || ''}
                        onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                        placeholder="e.g. Alex Morgan"
                      />
                    </Field>

                    <Field id="fp-username" label="Username">
                      <Input
                        id="fp-username"
                        value={form.username || ''}
                        onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                        placeholder="alexmorgan"
                      />
                    </Field>

                    <Field id="fp-email" label="Email Address">
                      <Input
                        id="fp-email"
                        type="email"
                        value={form.email || user?.email || ''}
                        disabled
                        placeholder="alex@example.com"
                        title="Email cannot be changed directly"
                      />
                    </Field>

                    <Field id="fp-phone" label="Phone Number">
                      <Input
                        id="fp-phone"
                        value={form.phone || ''}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+92 300 1234567"
                      />
                    </Field>

                    <Field id="fp-title" label="Professional Title" required>
                      <Input
                        id="fp-title"
                        value={form.title || ''}
                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Senior Full-Stack Engineer"
                      />
                    </Field>

                    <Field id="fp-hourlyRate" label="Hourly Rate (PKR)" required>
                      <Input
                        id="fp-hourlyRate"
                        type="number"
                        min="0"
                        value={form.hourlyRate || ''}
                        onChange={e => setForm(p => ({ ...p, hourlyRate: e.target.value }))}
                        placeholder="e.g. 3500"
                      />
                    </Field>

                    {/* FIX: Location/timezone shows current value, placeholder 'Select timezone' if empty */}
                    <Field id="fp-location" label="Location / Timezone">
                      <Select
                        id="fp-location"
                        value={form.location || ''}
                        onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                      >
                        <option value="">Select timezone</option>
                        {timezones.map(tz => (
                          <option key={tz.value} value={tz.label}>
                            {tz.label}
                          </option>
                        ))}
                        {form.location && !timezones.some(tz => tz.label === form.location) && (
                          <option value={form.location}>{form.location}</option>
                        )}
                      </Select>
                    </Field>

                    <Field id="fp-availability" label="Availability">
                      <Select
                        id="fp-availability"
                        value={form.availability || 'full-time'}
                        onChange={e => setForm(p => ({ ...p, availability: e.target.value }))}
                      >
                        <option value="full-time">Full-time (40+ hrs/wk)</option>
                        <option value="part-time">Part-time (20 hrs/wk)</option>
                        <option value="contract">Open to Contracts</option>
                        <option value="not-available">Not Available</option>
                      </Select>
                    </Field>

                    <Field id="fp-experienceLevel" label="Experience Level">
                      <Select
                        id="fp-experienceLevel"
                        value={form.experienceLevel || 'Intermediate'}
                        onChange={e => setForm(p => ({ ...p, experienceLevel: e.target.value }))}
                      >
                        <option value="Entry">Entry Level</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Expert">Expert Level</option>
                      </Select>
                    </Field>
                  </div>

                  {/* Bio */}
                  <Field
                    id="fp-bio"
                    label="Professional Bio"
                    counter={`${(form.bio || '').length}/${MAX_BIO}`}
                    helper="Briefly highlight your years of experience, core achievements, and work style."
                    action={
                      <AiGenerateText
                        fieldLabel="a freelancer's professional bio for their marketplace profile"
                        getContext={() => ({
                          title: form.title,
                          experienceLevel: form.experienceLevel,
                          skills: skills.map(s => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
                        })}
                        getExistingText={() => form.bio}
                        onGenerated={text => setForm(p => ({ ...p, bio: text.slice(0, MAX_BIO) }))}
                      />
                    }
                  >
                    <Textarea
                      id="fp-bio"
                      value={form.bio || ''}
                      onChange={e => setForm(p => ({ ...p, bio: e.target.value.slice(0, MAX_BIO) }))}
                      rows={4}
                      maxLength={MAX_BIO}
                      placeholder="Tell clients about your background, key strengths, and what problems you solve best..."
                    />
                  </Field>
                </div>
              )}
            </section>
          </Reveal>

          {/* 2) SKILLS & LANGUAGES */}
          <Reveal delay={80}>
            <section id="flp-skills" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="flp-sec-title">Skills & Languages</h3>
                </div>
              </div>

              <div className="flp-skills-lang-container">
                {/* ─── Sub-Section 1: Core Competencies & Skills ─── */}
                <div className="flp-sub-section">
                  <div className="flp-sub-section-header">
                    <div className="flp-sub-section-title-wrap">
                      <span className="flp-view-label" style={{ fontSize: 14 }}>Core Competencies & Skills *</span>
                      <span className="flp-count-pill">
                        {skills.length} skill{skills.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {editing && (
                      <AiSuggestFill
                        label="Auto-suggest relevant skills (AI)"
                        getContext={() => ({
                          title: form.title || '',
                          description: [form.title, form.bio].filter(Boolean).join('. '),
                          skills
                        })}
                        existingSkills={skills}
                        onSkills={newSkills => setSkills(prev => Array.from(new Set([...prev, ...newSkills])))}
                        onExperience={level => setForm(p => ({ ...p, experienceLevel: level }))}
                      />
                    )}
                  </div>

                  {!editing ? (
                    <div className="flp-chips-cloud">
                      {skills.length === 0 ? (
                        <span className="flp-view-value--empty">No skills listed yet. Click "Edit Profile" to add your skills.</span>
                      ) : (
                        skills.map((sk, idx) => {
                          const name = typeof sk === 'string' ? sk : sk?.name;
                          if (!name) return null;
                          return (
                            <span key={`${name}-${idx}`} className="flp-skill-tag">
                              {name}
                            </span>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <TagInput
                        tags={skills}
                        onChange={setSkills}
                        placeholder="Type skill & press Enter (e.g. React, Python, UI Design)"
                      />
                      {skills.length === 0 && (
                        <span style={{ fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> At least one skill is required.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider between Skills and Languages */}
                <div className="flp-section-divider" />

                {/* ─── Sub-Section 2: Spoken Languages ─── */}
                <div className="flp-sub-section">
                  <div className="flp-sub-section-header">
                    <div className="flp-sub-section-title-wrap">
                      <span className="flp-view-label" style={{ fontSize: 14 }}>Spoken Languages *</span>
                      <span className="flp-count-pill">
                        {languages.length} language{languages.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="flp-sub-section-desc">
                      Select or type languages you can comfortably communicate with clients in
                    </span>
                  </div>

                  {!editing ? (
                    <div className="flp-chips-cloud">
                      {languages.length === 0 ? (
                        <span className="flp-view-value--empty">No languages listed.</span>
                      ) : (
                        languages.map((langItem, idx) => {
                          const name = typeof langItem === 'string' ? langItem : (langItem?.language || 'Unknown');
                          const level = typeof langItem === 'object' ? (langItem.proficiency || 'fluent') : 'fluent';
                          return (
                            <span key={idx} className="flp-lang-badge">
                              <Globe size={13} style={{ color: '#10B981', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600 }}>{name}</span>
                              <span className={`flp-lang-level flp-lang-level--${level}`}>
                                {level}
                              </span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Current languages chips with remove button */}
                      <div className="flp-chips-cloud">
                        {languages.length === 0 ? (
                          <span className="flp-view-value--empty" style={{ fontStyle: 'italic' }}>
                            No languages added yet. Add at least one below.
                          </span>
                        ) : (
                          languages.map((langItem, idx) => {
                            const name = typeof langItem === 'string' ? langItem : (langItem?.language || 'Unknown');
                            const level = typeof langItem === 'object' ? (langItem.proficiency || 'fluent') : 'fluent';
                            return (
                              <span key={idx} className="flp-lang-badge flp-lang-badge--editable">
                                <Globe size={13} style={{ color: '#10B981', flexShrink: 0 }} />
                                <span style={{ fontWeight: 600 }}>{name}</span>
                                <span className={`flp-lang-level flp-lang-level--${level}`}>
                                  {level}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLanguage(idx)}
                                  className="flp-lang-remove-btn"
                                  title={`Remove ${name}`}
                                  aria-label={`Remove ${name}`}
                                >
                                  <X size={13} />
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>

                      {/* Add language inline row with datalist suggestions */}
                      <div className="flp-add-lang-card">
                        <div className="flp-add-lang-field" style={{ flex: '2 1 200px' }}>
                          <label htmlFor="fp-add-lang-name">Language Name</label>
                          <Input
                            id="fp-add-lang-name"
                            list="flp-languages-list"
                            value={newLangName}
                            onChange={e => setNewLangName(e.target.value)}
                            placeholder="e.g. English, Urdu, Arabic, French..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddLanguage();
                              }
                            }}
                          />
                          <datalist id="flp-languages-list">
                            {LANGUAGES.map(lang => (
                              <option key={lang} value={lang} />
                            ))}
                          </datalist>
                        </div>

                        <div className="flp-add-lang-field" style={{ flex: '1 1 160px' }}>
                          <label htmlFor="fp-add-lang-level">Proficiency Level</label>
                          <Select
                            id="fp-add-lang-level"
                            value={newLangLevel}
                            onChange={e => setNewLangLevel(e.target.value)}
                          >
                            {PROFICIENCY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </Select>
                        </div>

                        <button
                          type="button"
                          className="flp-add-lang-btn"
                          onClick={handleAddLanguage}
                          disabled={!newLangName.trim()}
                        >
                          <Plus size={15} />
                          <span>Add Language</span>
                        </button>
                      </div>

                      {languages.length === 0 && (
                        <span style={{ fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> At least one spoken language is required.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </Reveal>

          {/* 3) EDUCATION */}
          <Reveal delay={120}>
            <section id="flp-education" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <GraduationCap size={18} />
                  </div>
                  <h3 className="flp-sec-title">Education History</h3>
                </div>
                {editing && (
                  <button type="button" className="flp-add-pill-btn" onClick={addEducation}>
                    <Plus size={13} />
                    <span>Add Education</span>
                  </button>
                )}
              </div>

              {!editing ? (
                /* VIEW MODE: Timeline list */
                education.length === 0 ? (
                  <div className="flp-view-value--empty" style={{ padding: '8px 0' }}>
                    No formal education entries recorded yet.
                  </div>
                ) : (
                  <div className="flp-timeline-list">
                    {education.map((edu, idx) => {
                      const startYr = edu.startDate ? new Date(edu.startDate).getFullYear() : '';
                      const endYr = edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present';
                      return (
                        <div key={`edu-${idx}`} className="flp-timeline-item">
                          <div className="flp-timeline-node">
                            <GraduationCap size={18} />
                          </div>
                          <div className="flp-timeline-content">
                            <h4 className="flp-timeline-title">
                              {edu.degree || 'Degree'} {edu.field ? `in ${edu.field}` : ''}
                            </h4>
                            <span className="flp-timeline-sub">{edu.institution || 'University / Institution'}</span>
                            {(startYr || endYr) && (
                              <span className="flp-timeline-date">
                                <Calendar size={12} />
                                <span>{startYr ? `${startYr} — ${endYr}` : endYr}</span>
                              </span>
                            )}
                            {edu.description && (
                              <p className="flp-timeline-desc">{edu.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* EDIT MODE: Inline Form Cards */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {education.length === 0 ? (
                    <div className="flp-view-value--empty" style={{ padding: '8px 0' }}>
                      Click "+ Add Education" to add degree and institution credentials.
                    </div>
                  ) : (
                    education.map((edu, idx) => (
                      <div key={`edu-edit-${idx}`} className="flp-inline-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="flp-view-label">Education Entry #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeEducation(idx)}
                            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700 }}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>

                        <div className="flp-edit-grid-3">
                          <Field label="Institution" required>
                            <Input
                              value={edu.institution || ''}
                              onChange={e => updateEducation(idx, 'institution', e.target.value)}
                              placeholder="e.g. Stanford University"
                            />
                          </Field>
                          <Field label="Degree" required>
                            <Input
                              value={edu.degree || ''}
                              onChange={e => updateEducation(idx, 'degree', e.target.value)}
                              placeholder="e.g. Bachelor of Science"
                            />
                          </Field>
                          <Field label="Field of Study">
                            <Input
                              value={edu.field || ''}
                              onChange={e => updateEducation(idx, 'field', e.target.value)}
                              placeholder="e.g. Software Engineering"
                            />
                          </Field>
                        </div>

                        <div className="flp-edit-grid-2">
                          <Field label="Start Date">
                            <Input
                              type="date"
                              value={edu.startDate ? new Date(edu.startDate).toISOString().split('T')[0] : ''}
                              onChange={e => updateEducation(idx, 'startDate', e.target.value)}
                            />
                          </Field>
                          <Field label="End Date (or expected)">
                            <Input
                              type="date"
                              value={edu.endDate ? new Date(edu.endDate).toISOString().split('T')[0] : ''}
                              onChange={e => updateEducation(idx, 'endDate', e.target.value)}
                            />
                          </Field>
                        </div>

                        <Field label="Description (Optional)">
                          <Textarea
                            rows={2}
                            value={edu.description || ''}
                            onChange={e => updateEducation(idx, 'description', e.target.value)}
                            placeholder="Notable achievements, research focus, or honors..."
                          />
                        </Field>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </Reveal>

          {/* 4) CERTIFICATIONS */}
          <Reveal delay={160}>
            <section id="flp-education" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <Award size={18} />
                  </div>
                  <h3 className="flp-sec-title">Licenses & Certifications</h3>
                </div>
                {editing && (
                  <button type="button" className="flp-add-pill-btn" onClick={addCertification}>
                    <Plus size={13} />
                    <span>Add Certification</span>
                  </button>
                )}
              </div>

              {!editing ? (
                /* VIEW MODE: Card Grid */
                certifications.length === 0 ? (
                  <div className="flp-view-value--empty" style={{ padding: '8px 0' }}>
                    No licenses or certifications added yet.
                  </div>
                ) : (
                  <div className="flp-timeline-list">
                    {certifications.map((cert, idx) => (
                      <div key={`cert-${idx}`} className="flp-timeline-item">
                        <div className="flp-timeline-node">
                          <Award size={18} />
                        </div>
                        <div className="flp-timeline-content">
                          <h4 className="flp-timeline-title">{cert.name || 'Certified Professional'}</h4>
                          <span className="flp-timeline-sub">{cert.issuer || 'Issuing Authority'}</span>
                          {cert.issueDate && (
                            <span className="flp-timeline-date">
                              <Calendar size={12} />
                              <span>Issued {new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                              {cert.expiryDate && (
                                <span> · Expires {new Date(cert.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                              )}
                            </span>
                          )}
                          {cert.url && (
                            <div style={{ marginTop: 6 }}>
                              <a
                                href={cert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => { e.preventDefault(); openExternal(cert.url); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}
                              >
                                <ExternalLink size={12} /> View Verified Credential
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* EDIT MODE: Inline Form Cards */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {certifications.length === 0 ? (
                    <div className="flp-view-value--empty" style={{ padding: '8px 0' }}>
                      Click "+ Add Certification" to record verified credentials.
                    </div>
                  ) : (
                    certifications.map((cert, idx) => (
                      <div key={`cert-edit-${idx}`} className="flp-inline-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="flp-view-label">Certification #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeCertification(idx)}
                            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700 }}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>

                        <div className="flp-edit-grid-2">
                          <Field label="Certification Name" required>
                            <Input
                              value={cert.name || ''}
                              onChange={e => updateCertification(idx, 'name', e.target.value)}
                              placeholder="e.g. AWS Certified Solutions Architect"
                            />
                          </Field>
                          <Field label="Issuing Organization" required>
                            <Input
                              value={cert.issuer || ''}
                              onChange={e => updateCertification(idx, 'issuer', e.target.value)}
                              placeholder="e.g. Amazon Web Services"
                            />
                          </Field>
                          <Field label="Issue Date">
                            <Input
                              type="date"
                              value={cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : ''}
                              onChange={e => updateCertification(idx, 'issueDate', e.target.value)}
                            />
                          </Field>
                          <Field label="Expiry Date (Optional)">
                            <Input
                              type="date"
                              value={cert.expiryDate ? new Date(cert.expiryDate).toISOString().split('T')[0] : ''}
                              onChange={e => updateCertification(idx, 'expiryDate', e.target.value)}
                            />
                          </Field>
                          <Field label="Credential ID">
                            <Input
                              value={cert.credentialId || ''}
                              onChange={e => updateCertification(idx, 'credentialId', e.target.value)}
                              placeholder="e.g. ABC-123456"
                            />
                          </Field>
                          <Field label="Credential URL">
                            <Input
                              type="url"
                              value={cert.url || ''}
                              onChange={e => updateCertification(idx, 'url', e.target.value)}
                              placeholder="https://..."
                            />
                          </Field>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </Reveal>

          {/* 5) PORTFOLIO PROJECTS */}
          <Reveal delay={200}>
            <section id="flp-portfolio" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <FolderOpen size={18} />
                  </div>
                  <h3 className="flp-sec-title">Portfolio Projects</h3>
                </div>
                <Link to="/freelancer/portfolio" className="flp-btn-outline" style={{ height: 34, fontSize: 12.5, padding: '0 14px' }}>
                  <span>Manage All Projects</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {portfolioProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: '#F8FAFC', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
                  <ImageIcon size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
                  <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0B2942' }}>No portfolio projects added yet</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                    Showcase your past deliverables and case studies in the Portfolio manager.
                  </p>
                </div>
              ) : (
                <div className="flp-portfolio-grid">
                  {portfolioProjects.slice(0, 6).map((proj, idx) => {
                    const cover = proj.images?.[0] || proj.coverImage || proj.image;
                    return (
                      <div key={proj._id || idx} className="flp-portfolio-card">
                        <div className="flp-portfolio-img-wrap">
                          {cover ? (
                            <img src={cover} alt={proj.title} className="flp-portfolio-img" />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', color: '#94A3B8' }}>
                              <ImageIcon size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flp-portfolio-body">
                          <h4 className="flp-portfolio-title">{proj.title}</h4>
                          {proj.description && (
                            <p className="flp-portfolio-desc">{proj.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </Reveal>

          {/* 6) LINKS & SOCIAL PROFILES */}
          <Reveal delay={240}>
            <section id="flp-links" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <LinkIcon size={18} />
                  </div>
                  <h3 className="flp-sec-title">Portfolio & Social Links</h3>
                </div>
                {editing && (
                  <button type="button" className="flp-add-pill-btn" onClick={addPortfolioLink}>
                    <Plus size={13} />
                    <span>Add Link</span>
                  </button>
                )}
              </div>

              {/* External Portfolio Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="flp-view-label">External Portfolio URLs (Behance, Dribbble, Medium)</span>
                {!editing ? (
                  portfolioLinks.length === 0 ? (
                    <span className="flp-view-value--empty">No external portfolio links listed.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {portfolioLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => { e.preventDefault(); openExternal(link); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}
                        >
                          <ExternalLink size={13} /> {link}
                        </a>
                      ))}
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {portfolioLinks.map((link, i) => (
                      <div key={`pl-${i}`} style={{ display: 'flex', gap: 8 }}>
                        <Input
                          type="url"
                          value={link}
                          onChange={e => updatePortfolioLink(i, e.target.value)}
                          placeholder="https://behance.net/yourname"
                        />
                        <button
                          type="button"
                          onClick={() => removePortfolioLink(i)}
                          style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '0 12px', color: '#DC2626', cursor: 'pointer' }}
                          title="Remove link"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Profiles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                <span className="flp-view-label">Social & Web Profiles</span>
                {!editing ? (
                  <div className="flp-social-pills-row">
                    {socialLinks.github ? (
                      <a
                        href={socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => { e.preventDefault(); openExternal(socialLinks.github); }}
                        className="flp-social-pill"
                      >
                        <Github size={15} />
                        <span>GitHub</span>
                        <ExternalLink size={11} color="#94A3B8" />
                      </a>
                    ) : null}

                    {socialLinks.linkedin ? (
                      <a
                        href={socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => { e.preventDefault(); openExternal(socialLinks.linkedin); }}
                        className="flp-social-pill"
                      >
                        <Linkedin size={15} color="#0A66C2" />
                        <span>LinkedIn</span>
                        <ExternalLink size={11} color="#94A3B8" />
                      </a>
                    ) : null}

                    {socialLinks.website ? (
                      <a
                        href={socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => { e.preventDefault(); openExternal(socialLinks.website); }}
                        className="flp-social-pill"
                      >
                        <Globe size={15} color="#10B981" />
                        <span>Personal Website</span>
                        <ExternalLink size={11} color="#94A3B8" />
                      </a>
                    ) : null}

                    {!socialLinks.github && !socialLinks.linkedin && !socialLinks.website && (
                      <span className="flp-view-value--empty">No social links configured.</span>
                    )}
                  </div>
                ) : (
                  <div className="flp-edit-grid-3">
                    <Field id="fp-social-github" label="GitHub Profile">
                      <Input
                        id="fp-social-github"
                        type="url"
                        value={socialLinks.github || ''}
                        onChange={e => setSocialLinks(p => ({ ...p, github: e.target.value }))}
                        placeholder="https://github.com/..."
                      />
                    </Field>

                    <Field id="fp-social-linkedin" label="LinkedIn Profile">
                      <Input
                        id="fp-social-linkedin"
                        type="url"
                        value={socialLinks.linkedin || ''}
                        onChange={e => setSocialLinks(p => ({ ...p, linkedin: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </Field>

                    <Field id="fp-social-website" label="Personal Website">
                      <Input
                        id="fp-social-website"
                        type="url"
                        value={socialLinks.website || ''}
                        onChange={e => setSocialLinks(p => ({ ...p, website: e.target.value }))}
                        placeholder="https://yoursite.com"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </section>
          </Reveal>
        </main>

        {/* RIGHT COLUMN: Checklist & Sticky Stats (4 cols) */}
        <aside className="flp-col-side" aria-label="Profile Checklist and Highlights">
          {/* Card 1: Checklist */}
          <div className="flp-side-card">
            <h4 className="flp-side-card__title">Profile Strength Checklist</h4>
            <div className="flp-checklist">
              {completionStats.checks.map(checkItem => (
                <div
                  key={checkItem.id}
                  className={`flp-check-item ${checkItem.done ? 'flp-check-item--done' : ''}`}
                >
                  <span>{checkItem.label}</span>
                  <div className="flp-check-circle">
                    {checkItem.done ? <Check size={12} strokeWidth={3} /> : '○'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Quick Highlights */}
          <div className="flp-side-card">
            <h4 className="flp-side-card__title">Profile Quick Stats</h4>
            <div className="flp-stat-tiles-grid">
              <div className="flp-stat-tile">
                <span className="flp-stat-tile__lbl">Rating</span>
                <span className="flp-stat-tile__val" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{(profile?.rating || 5.0).toFixed(1)}</span>
                  <span style={{ color: '#F59E0B', fontSize: 14 }}>★</span>
                </span>
              </div>

              <div className="flp-stat-tile">
                <span className="flp-stat-tile__lbl">Projects</span>
                <span className="flp-stat-tile__val">{profile?.completedProjects || portfolioProjects.length || 0}</span>
              </div>

              <div className="flp-stat-tile">
                <span className="flp-stat-tile__lbl">Availability</span>
                <span className="flp-stat-tile__val" style={{ fontSize: 14, textTransform: 'capitalize' }}>
                  {data.availability ? data.availability.replace('-', ' ') : 'Full-time'}
                </span>
              </div>

              <div className="flp-stat-tile">
                <span className="flp-stat-tile__lbl">Languages</span>
                <span className="flp-stat-tile__val">{languages.length || 1}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── STICKY ACTION BAR (EDIT MODE ONLY) ─── */}
      {editing && (
        <div className="flp-sticky-action-bar" role="region" aria-label="Editor controls">
          <div className="flp-bar-left">
            {/* Delete Account Button (uses existing handler) */}
            <button
              type="button"
              className="flp-btn-delete-ghost"
              onClick={() => { setDeleteStep(1); setDeleteOtp(''); setDeleteModal(true); }}
            >
              <Trash2 size={14} />
              <span>Delete Account</span>
            </button>
          </div>

          <div className="flp-bar-right">
            {isDirty && (
              <div className="flp-unsaved-chip" title="You have unsaved changes">
                <span className="flp-unsaved-dot" />
                <span>Unsaved changes</span>
              </div>
            )}

            <button
              type="button"
              className="flp-btn-cancel-ghost"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="flp-btn-save-pill"
              onClick={handleSave}
              disabled={!isDirty || saving}
              title={!isDirty ? 'No modifications to save' : 'Save profile changes'}
            >
              {saving ? (
                <>
                  <Loader size={14} color="#FFFFFF" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── DISCARD CHANGES CONFIRM MODAL ─── */}
      <ConfirmDialog
        open={showDiscardConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes in your profile. Are you sure you want to close without saving?"
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        danger={true}
        onConfirm={confirmDiscard}
        onClose={() => setShowDiscardConfirm(false)}
      />

      {/* ─── DELETE ACCOUNT MODAL (Preserving existing deletion workflow) ─── */}
      <Modal open={deleteModal} title="Delete Account" onClose={closeDeleteModal} danger>
        {deleteStep === 1 ? (
          <>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16, color: '#334155' }}>
              This permanently deletes your account, personal profile, active gigs, and ongoing proposals. <strong>This action cannot be undone.</strong> We will email a verification code to confirm ownership.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="flp-btn-outline" onClick={closeDeleteModal} disabled={deleteBusy}>Cancel</button>
              <button
                className="flp-btn-navy"
                style={{ background: '#DC2626' }}
                disabled={deleteBusy}
                onClick={requestDeleteOtp}
              >
                {deleteBusy ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 14, color: '#334155' }}>
              Enter the 6-digit verification code sent to <strong>{user?.email}</strong>:
            </p>
            <Input
              style={{ textAlign: 'center', fontSize: 22, letterSpacing: '0.3em', fontWeight: 800, height: 50 }}
              placeholder="000000"
              value={deleteOtp}
              maxLength={6}
              onChange={e => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="flp-btn-outline" onClick={closeDeleteModal} disabled={deleteBusy}>Cancel</button>
              <button
                className="flp-btn-navy"
                style={{ background: '#DC2626' }}
                disabled={deleteBusy || deleteOtp.length < 6}
                onClick={confirmDelete}
              >
                {deleteBusy ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ─── IMAGE CROP MODAL ─── */}
      <ImageCropModal
        file={cropTarget?.file || null}
        aspect={cropTarget?.kind === 'cover' ? 16 / 5 : 1}
        cropShape={cropTarget?.kind === 'cover' ? 'rect' : 'round'}
        title={cropTarget?.kind === 'cover' ? 'Adjust Cover Photo' : 'Adjust Profile Avatar'}
        onCancel={() => setCropTarget(null)}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
