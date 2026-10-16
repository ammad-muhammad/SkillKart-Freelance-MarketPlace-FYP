import { useState, useRef, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { uploadAvatar as apiUploadAvatar, uploadCompanyLogo as apiUploadCompanyLogo, uploadClientCover as apiUploadCover, validateFile } from '../../utils/uploadHelper';
import TagInput from '../../Components/common/TagInput/TagInput';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import UserAvatar from '../../Components/common/UserAvatar/UserAvatar';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import { openExternal } from '../../utils/externalLink';
import { LANGUAGES } from '../../data/languages';
import {
  Camera, Building2, Image as ImageIcon, User, MapPin, Calendar, Globe,
  Edit2, AlertTriangle, Target, Check, Plus, Trash2, Zap, Clock, Search,
  CheckCircle2, Sparkles, ShieldCheck, ChevronRight, Layers, Award, Briefcase
} from 'lucide-react';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { timezones } from '../../utils/timezones';
import { clientsAPI } from '../../api/clients';
import Reveal from '../freelancer/components/Reveal';
import '../freelancer/FreelancerProfile.css';
import './ClientResponsive.css';

const MAX_BIO = 600;

const COMPANY_TYPES = ['Individual', 'Startup', 'SME', 'Enterprise'];
const COMPANY_TYPE_OPTIONS = COMPANY_TYPES.map(t => ({ value: t, label: t }));

const PROFICIENCY_SELECT_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'native', label: 'Native' }
];

const ENGAGEMENT_OPTIONS = [
  { value: 'One-time Project', label: 'One-time Project' },
  { value: 'Monthly Retainer', label: 'Monthly Retainer' },
  { value: 'Full-time Dedicated', label: 'Full-time Dedicated' },
  { value: 'Part-time Support', label: 'Part-time Support' }
];

const URGENCY_OPTIONS = [
  { value: 'Immediate', label: 'ASAP / Immediate' },
  { value: 'Exploring', label: 'Exploring / Planning' },
  { value: 'Flexible', label: 'Flexible / Slower' }
];

const EXECUTIVE_ROLES = ['Founder', 'Product Lead', 'CTO', 'Engineering Manager', 'Marketing Head', 'Design Director'];

export default function ClientProfile() {
  const { profile, saveProfile, projects = [], showToast } = useClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('flp-personal');

  // Local Form state
  const [form, setForm] = useState({
    ...(profile?.personalInfo || {}),
    industry: Array.isArray(profile?.personalInfo?.industry)
      ? [...profile.personalInfo.industry]
      : (profile?.personalInfo?.industry ? [profile.personalInfo.industry] : [])
  });

  const [prefSkills, setPrefSkills] = useState(Array.isArray(profile?.preferences?.preferredSkills) ? [...profile.preferences.preferredSkills] : []);
  const [budgetRange, setBudgetRange] = useState({ ...(profile?.preferences?.budgetRange || { min: 0, max: 0 }) });
  const [languages, setLanguages] = useState(Array.isArray(profile?.personalInfo?.languages) ? [...profile.personalInfo.languages] : []);

  const [hiringFrequency, setHiringFrequency] = useState(profile?.preferences?.hiringFrequency || '');
  const [technicalUnderstanding, setTechnicalUnderstanding] = useState(profile?.preferences?.technicalUnderstanding || 5);
  const [urgency, setUrgency] = useState(profile?.preferences?.urgency || '');

  const [errors, setErrors] = useState({});
  const [newLangName, setNewLangName] = useState('');
  const [newLangLevel, setNewLangLevel] = useState('fluent');

  const avatarRef = useRef(null);
  const logoRef = useRef(null);
  const coverRef = useRef(null);
  const [cropTarget, setCropTarget] = useState(null);

  const countryOptions = useMemo(() => countryList().getData(), []);
  const languageOptions = useMemo(() => LANGUAGES.map(lang => ({ value: lang, label: lang })), []);
  const timezoneOptions = useMemo(() => timezones.map(t => ({ value: t.value, label: `${t.label} (${t.value})` })), []);

  const currentTimezoneOption = useMemo(() => {
    if (!form.timezone) return null;
    const match = timezones.find(t =>
      t.value === form.timezone ||
      t.label === form.timezone ||
      String(form.timezone).includes(t.value)
    );
    if (match) {
      return { value: match.value, label: `${match.label} (${match.value})` };
    }
    return { value: form.timezone, label: form.timezone };
  }, [form.timezone]);

  const data = editing ? form : (profile?.personalInfo || {});

  // Profile strength calculation
  const completionStats = useMemo(() => {
    const checks = [
      { id: 'avatar', label: 'Profile Photo', done: Boolean(data.avatar || profile?.personalInfo?.avatar) },
      { id: 'name', label: 'Full Name', done: Boolean(data.fullName?.trim()) },
      { id: 'org', label: 'Organization Type', done: Boolean(data.companyType) },
      { id: 'bio', label: 'Company Bio', done: Boolean(data.bio?.trim() && data.bio.trim().length >= 25) },
      { id: 'skills', label: 'Desired Skills', done: prefSkills.length > 0 },
      { id: 'languages', label: 'Languages', done: languages.length > 0 },
    ];
    const completedCount = checks.filter(c => c.done).length;
    const percentage = Math.round((completedCount / checks.length) * 100);
    return { checks, percentage };
  }, [data, profile, prefSkills, languages]);

  const scrollToSection = (secId) => {
    setActiveTab(secId);
    const target = document.getElementById(secId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      background: "#FFFFFF",
      borderColor: state.isFocused ? "#10B981" : "#E2E8F0",
      borderRadius: "12px",
      minHeight: "44px",
      color: "#0B2942",
      fontSize: "13.5px",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(16, 185, 129, 0.15)" : "none",
      transition: "all 0.2s ease",
      cursor: "pointer",
      "&:hover": {
        borderColor: state.isFocused ? "#10B981" : "#CBD5E1"
      }
    }),
    menu: (base) => ({
      ...base,
      background: "#FFFFFF",
      border: "1px solid #DDEFE6",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(11, 41, 66, 0.12)",
      zIndex: 9999
    }),
    menuList: (base) => ({
      ...base,
      padding: "4px",
      maxHeight: "220px",
      scrollbarWidth: "none",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    }),
    option: (base, state) => ({
      ...base,
      background: state.isSelected
        ? "#10B981"
        : state.isFocused
          ? "#EAFBF4"
          : "transparent",
      color: state.isSelected ? "#FFFFFF" : "#0B2942",
      cursor: "pointer",
      borderRadius: "8px",
      margin: "2px 0",
      padding: "8px 12px",
      fontSize: "13px",
      fontWeight: state.isSelected ? "700" : "500"
    }),
    singleValue: (base) => ({
      ...base,
      color: "#0B2942",
      fontWeight: "600",
      fontSize: "13.5px"
    }),
    placeholder: (base) => ({
      ...base,
      color: "#94A3B8",
      fontSize: "13.5px"
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "#64748B"
    }),
    indicatorSeparator: () => ({ display: "none" })
  };

  const budgetOptions = [
    { value: '<Rs. 5k', label: 'Startup (Up to Rs. 5,000)', min: 0, max: 5000 },
    { value: 'Rs. 5k-Rs. 20k', label: 'Growth (Rs. 5,000 - Rs. 20,000)', min: 5000, max: 20000 },
    { value: 'Rs. 20k+', label: 'Enterprise (Rs. 20,000+)', min: 20000, max: 0 }
  ];

  const currentBudgetOption = budgetOptions.find(
    opt => opt.min === budgetRange.min && opt.max === budgetRange.max
  ) || null;

  const startEdit = () => {
    setForm({
      ...profile.personalInfo,
      industry: Array.isArray(profile.personalInfo?.industry)
        ? [...profile.personalInfo.industry]
        : (profile.personalInfo?.industry ? [profile.personalInfo.industry] : [])
    });
    setPrefSkills(Array.isArray(profile.preferences?.preferredSkills) ? [...profile.preferences.preferredSkills] : []);
    setBudgetRange({ ...(profile.preferences?.budgetRange || { min: 0, max: 0 }) });
    setLanguages(Array.isArray(profile.personalInfo?.languages) ? [...profile.personalInfo.languages] : []);
    setHiringFrequency(profile.preferences?.hiringFrequency || '');
    setTechnicalUnderstanding(profile.preferences?.technicalUnderstanding || 5);
    setUrgency(profile.preferences?.urgency || '');
    setErrors({});
    setEditing(true);
  };

  const handleDiscard = () => {
    setEditing(false);
    setErrors({});
  };

  const handleAddLanguage = () => {
    const trimmed = newLangName.trim();
    if (!trimmed) return;
    const exists = languages.some(l => {
      const name = typeof l.language === 'object' ? (l.language.name || l.language.language || '') : l.language;
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

  const validate = () => {
    const newErrors = {};
    if (!form.fullName || !form.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!form.companyType) newErrors.companyType = 'Organization type is required';
    if (form.companyType && form.companyType !== 'Individual' && (!form.companyName || !form.companyName.trim())) {
      newErrors.companyName = 'Company name is required';
    }
    if (languages.length === 0) newErrors.languages = 'At least one language is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      showToast('Please fix the errors before saving', 'error');
      return;
    }
    setSaving(true);
    try {
      const isIndiv = form.companyType === 'Individual';
      const updatedProfile = {
        personalInfo: {
          ...form,
          companyName: isIndiv ? '' : form.companyName,
          companyLogo: isIndiv ? '' : form.companyLogo,
          website: isIndiv ? '' : form.website,
          role: isIndiv ? '' : form.role,
          industry: isIndiv ? [] : (Array.isArray(form.industry) ? form.industry : [form.industry].filter(Boolean)),
          languages: languages.map(l => ({
            language: typeof l.language === 'object' ? (l.language.name || l.language.language || "") : l.language,
            proficiency: l.proficiency
          }))
        },
        preferences: {
          ...profile.preferences,
          preferredSkills: [...prefSkills],
          budgetRange: { ...budgetRange },
          hiringFrequency,
          technicalUnderstanding,
          urgency
        },
      };

      const result = await saveProfile(updatedProfile);
      if (result.success) {
        setEditing(false);
        setErrors({});
        showToast('Profile updated successfully!', 'success');
      } else if (result.errors) {
        const newErrors = {};
        if (Array.isArray(result.errors)) {
          const FIELD_ALIASES = { industryType: 'industry', description: 'bio', 'socialLinks.linkedin': 'linkedin' };
          result.errors.forEach(err => {
            if (typeof err === 'object' && err.field) {
              newErrors[FIELD_ALIASES[err.field] || err.field] = err.message;
            } else if (typeof err === 'string') {
              const pathMatch = err.match(/at path "(.+)"/);
              if (pathMatch) newErrors[pathMatch[1]] = err;
              else newErrors.global = err;
            }
          });
        } else if (typeof result.errors === 'object') {
          Object.assign(newErrors, result.errors);
        }
        setErrors(newErrors);
      }
    } catch {
      showToast('Update failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const CROP_CONFIG = {
    avatar: { aspect: 1, cropShape: 'round', title: 'Adjust Profile Photo' },
    companyLogo: { aspect: 1, cropShape: 'rect', title: 'Adjust Company Logo' },
    coverPhoto: { aspect: 4 / 1, cropShape: 'rect', title: 'Adjust Cover Banner' },
  };

  const handleImage = (e, field) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const check = validateFile(file);
    if (!check.valid) {
      showToast(check.error, 'error');
      return;
    }
    setCropTarget({ file, field });
  };

  const handleCropConfirm = async (finalFile) => {
    const field = cropTarget?.field;
    setCropTarget(null);
    setSaving(true);
    try {
      let url;
      if (field === 'companyLogo') {
        url = await apiUploadCompanyLogo(finalFile);
      } else if (field === 'coverPhoto') {
        url = await apiUploadCover(finalFile);
      } else {
        url = await apiUploadAvatar(finalFile);
      }
      setForm(prev => ({ ...prev, [field]: url }));
      showToast(`${field === 'avatar' ? 'Profile photo' : field === 'companyLogo' ? 'Company logo' : 'Banner'} uploaded!`, 'success');
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getBudgetLabel = (range) => {
    if (!range) return 'N/A';
    if (range.min === 0 && range.max === 5000) return 'Startup (Up to Rs. 5,000)';
    if (range.min === 5000 && range.max === 20000) return 'Growth (Rs. 5,000 - Rs. 20,000)';
    if (range.min === 20000 && range.max === 0) return 'Enterprise (Rs. 20,000+)';
    return `Rs. ${range.min} - Rs. ${range.max}`;
  };

  return (
    <div className="flp-page cl-profile-page">
      {/* ─── Breadcrumb & Top Page Header ─── */}
      <header className="flp-header">
        <div className="flp-header__left">
          <nav className="flp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/client/dashboard">Dashboard</Link>
            <span className="flp-breadcrumb__sep">/</span>
            <span className="flp-breadcrumb__curr">My Profile</span>
          </nav>
          <h1 className="flp-header__title">Client Profile</h1>
          <p className="flp-header__sub">
            {editing
              ? 'Update your organization, hiring preferences, contact points, and company bio.'
              : 'Review how your profile appears to freelancers, top candidates, and applicants.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flp-hero-actions">
          {!editing ? (
            <button
              type="button"
              className="flp-btn-navy"
              onClick={startEdit}
              title="Edit your profile details"
            >
              <Edit2 size={15} />
              <span>Edit Profile</span>
            </button>
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
              backgroundImage: (editing ? form.coverPhoto : profile?.personalInfo?.coverPhoto)
                ? `url(${editing ? form.coverPhoto : profile?.personalInfo?.coverPhoto})`
                : 'linear-gradient(135deg, #0B2942 0%, #0F3E63 50%, #10B981 100%)'
            }}
          >
            <div className="flp-hero-cover__overlay" />
            {editing && (
              <>
                <button
                  type="button"
                  className="flp-update-cover-btn"
                  onClick={() => coverRef.current?.click()}
                >
                  <Camera size={14} />
                  <span>Change Banner</span>
                </button>
                <ImageSourcePicker ref={coverRef} accept="image/*" onChange={(e) => handleImage(e, 'coverPhoto')} />
              </>
            )}
          </div>

          <div className="flp-hero-body">
            {/* Avatar Wrap */}
            <div className="flp-avatar-wrap">
              <UserAvatar
                src={editing ? form.avatar : profile?.personalInfo?.avatar}
                fullName={data.fullName}
                size="lg"
              />
              {editing && (
                <>
                  <button
                    type="button"
                    className="flp-avatar-cam-btn"
                    onClick={() => avatarRef.current?.click()}
                    title="Change profile photo"
                  >
                    <Camera size={14} />
                  </button>
                  <ImageSourcePicker ref={avatarRef} accept="image/*" facing="user" onChange={(e) => handleImage(e, 'avatar')} />
                </>
              )}
            </div>

            {/* Client Info Main */}
            <div className="flp-hero-main">
              <div className="flp-name-row">
                <h2 className="flp-user-name">{data.fullName || 'New Client'}</h2>
                <div className="flp-verified-badge">
                  <CheckCircle2 size={12} />
                  <span>Verified Client</span>
                </div>
              </div>

              <p className="flp-user-title">
                {data.companyType === 'Individual' ? (
                  'Individual Client & Hiring Manager'
                ) : (
                  `${data.companyName || 'Company'} • ${Array.isArray(data.industry) ? data.industry.join(', ') : (data.industry || 'Tech & Services')}`
                )}
              </p>

              <div className="flp-chips-row">
                <span className="flp-chip">
                  <MapPin size={13} style={{ color: '#10B981' }} />
                  <span>{data.location || 'Location Not Specified'}</span>
                </span>
                <span className="flp-chip">
                  <Calendar size={13} style={{ color: '#10B981' }} />
                  <span>Member Since: {data.memberSince || '2024'}</span>
                </span>
                {data.website && (
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flp-chip"
                    style={{ textDecoration: 'none' }}
                    onClick={(e) => { e.preventDefault(); openExternal(data.website); }}
                  >
                    <Globe size={13} style={{ color: '#10B981' }} />
                    <span style={{ color: '#0B2942', fontWeight: 700 }}>Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Profile Strength Bar */}
          {completionStats.percentage < 100 && (
            <div className="flp-completion-strip">
              <div className="flp-completion-strip__left">
                <span className="flp-completion-label">Client Trust Score:</span>
                <div className="flp-completion-track">
                  <div
                    className="flp-completion-fill"
                    style={{ width: `${completionStats.percentage}%` }}
                  />
                </div>
                <span className="flp-completion-pct">{completionStats.percentage}%</span>
              </div>
              <span className="flp-completion-hint">
                Complete company info to receive proposals from top 1% verified freelancers.
              </span>
            </div>
          )}
        </section>
      </Reveal>

      {/* ─── B) STICKY SECTION TABS ─── */}
      <nav className="flp-sticky-tabs" aria-label="Profile Sections Navigation">
        {[
          { id: 'flp-personal', label: 'Personal & Org Info', complete: Boolean(data.fullName?.trim() && data.companyType) },
          { id: 'flp-company', label: 'Company Bio & Role', complete: Boolean(data.bio?.trim() && data.bio.length >= 25) },
          { id: 'flp-preferences', label: 'Hiring Preferences', complete: prefSkills.length > 0 },
          { id: 'flp-languages', label: 'Languages', complete: languages.length > 0 },
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

        {/* ════════ LEFT COLUMN: Main Stack (8 cols) ════════ */}
        <main className="flp-col-main">

          {/* 1) PERSONAL & ORGANIZATION INFORMATION */}
          <Reveal delay={40}>
            <section id="flp-personal" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="flp-sec-title">Personal & Organization Info</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                      Primary contact information and organization structure.
                    </p>
                  </div>
                </div>
              </div>

              {!editing ? (
                <div className="flp-view-grid">
                  <div className="flp-view-item">
                    <span className="flp-view-label">Full Name</span>
                    <strong className="flp-view-value">{data.fullName || '—'}</strong>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Username</span>
                    <strong className="flp-view-value">@{profile?.personalInfo?.username || '—'}</strong>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Email Address</span>
                    <strong className="flp-view-value">{profile?.personalInfo?.email || '—'}</strong>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Phone Number</span>
                    <strong className="flp-view-value">{data.phone || '—'}</strong>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Organization Type</span>
                    <strong className="flp-view-value">{data.companyType || 'Individual'}</strong>
                  </div>
                  {data.companyType !== 'Individual' && (
                    <div className="flp-view-item">
                      <span className="flp-view-label">Company Name</span>
                      <strong className="flp-view-value">{data.companyName || '—'}</strong>
                    </div>
                  )}
                  <div className="flp-view-item">
                    <span className="flp-view-label">Location / Country</span>
                    <strong className="flp-view-value">{data.location || '—'}</strong>
                  </div>
                  <div className="flp-view-item">
                    <span className="flp-view-label">Timezone</span>
                    <strong className="flp-view-value">
                      {timezones.find(t => t.value === data.timezone || t.label === data.timezone)?.label || data.timezone || 'UTC+05:00'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
                  <div className="fsec-field">
                    <label className="fsec-field-label" htmlFor="cp-full-name">Full Name*</label>
                    <input
                      id="cp-full-name"
                      type="text"
                      className={`fsec-field-input ${errors.fullName ? 'fsec-field-input--error' : ''}`}
                      value={form.fullName || ''}
                      onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                      placeholder="e.g. John Doe"
                    />
                    {errors.fullName && <span className="fsec-field-err">{errors.fullName}</span>}
                  </div>

                  <div className="fsec-field">
                    <label className="fsec-field-label" htmlFor="cp-username">Username (Immutable)</label>
                    <input
                      id="cp-username"
                      type="text"
                      className="fsec-field-input"
                      value={profile?.personalInfo?.username || ''}
                      disabled
                    />
                  </div>

                  <div className="fsec-field">
                    <label className="fsec-field-label" htmlFor="cp-email">Email (Immutable)</label>
                    <input
                      id="cp-email"
                      type="email"
                      className="fsec-field-input"
                      value={profile?.personalInfo?.email || ''}
                      disabled
                    />
                  </div>

                  <div className="fsec-field">
                    <label className="fsec-field-label" htmlFor="cp-phone">Phone Number</label>
                    <input
                      id="cp-phone"
                      type="text"
                      className="fsec-field-input"
                      value={form.phone || ''}
                      onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+92 300 1234567"
                    />
                  </div>

                  <div className="fsec-field">
                    <label className="fsec-field-label" htmlFor="cp-org-type">Organization Type*</label>
                    <Select
                      inputId="cp-org-type"
                      options={COMPANY_TYPE_OPTIONS}
                      value={COMPANY_TYPE_OPTIONS.find(o => o.value === form.companyType) || null}
                      onChange={(val) => {
                        const selected = val ? val.value : '';
                        setForm(p => ({
                          ...p,
                          companyType: selected,
                          companyName: selected === 'Individual' ? '' : p.companyName,
                          companyLogo: selected === 'Individual' ? '' : p.companyLogo,
                          website: selected === 'Individual' ? '' : p.website,
                          role: selected === 'Individual' ? '' : p.role,
                          industry: selected === 'Individual' ? [] : p.industry,
                        }));
                      }}
                      styles={customSelectStyles}
                      placeholder="Select Organization Type"
                      menuPortalTarget={document.body}
                    />
                    {errors.companyType && <span className="fsec-field-err">{errors.companyType}</span>}
                  </div>

                  {form.companyType !== 'Individual' && (
                    <div className="fsec-field">
                      <label className="fsec-field-label" htmlFor="cp-company-name">Company Name*</label>
                      <input
                        id="cp-company-name"
                        type="text"
                        className={`fsec-field-input ${errors.companyName ? 'fsec-field-input--error' : ''}`}
                        value={form.companyName || ''}
                        onChange={(e) => setForm(p => ({ ...p, companyName: e.target.value }))}
                        placeholder="e.g. Acme Corp"
                      />
                      {errors.companyName && <span className="fsec-field-err">{errors.companyName}</span>}
                    </div>
                  )}

                  <div className="fsec-field">
                    <label className="fsec-field-label" htmlFor="cp-location">Location / Country</label>
                    <Select
                      inputId="cp-location"
                      options={countryOptions}
                      value={countryOptions.find(c => c.label === form.location) || null}
                      onChange={(val) => setForm(p => ({ ...p, location: val ? val.label : '' }))}
                      styles={customSelectStyles}
                      placeholder="Select Country"
                      menuPortalTarget={document.body}
                    />
                  </div>

                  <div className="fsec-field">
                    <label className="fsec-field-label" htmlFor="cp-timezone">Timezone</label>
                    <Select
                      inputId="cp-timezone"
                      options={timezoneOptions}
                      value={currentTimezoneOption}
                      onChange={(val) => setForm(p => ({ ...p, timezone: val ? val.value : '' }))}
                      styles={customSelectStyles}
                      placeholder="Select Timezone"
                      menuPortalTarget={document.body}
                    />
                  </div>
                </div>
              )}
            </section>
          </Reveal>

          {/* 2) COMPANY BIO & ROLE */}
          <Reveal delay={80}>
            <section id="flp-company" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h2 className="flp-sec-title">About Company & Executive Role</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                      Tell freelancers about your projects, mission, and company background.
                    </p>
                  </div>
                </div>
              </div>

              {!editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ margin: 0, fontSize: 14.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {data.bio || 'No company bio provided yet. Add an overview to attract high-caliber freelancers.'}
                  </p>
                  {data.companyType !== 'Individual' && (
                    <div className="flp-view-grid" style={{ paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                      <div className="flp-view-item">
                        <span className="flp-view-label">Your Executive Role</span>
                        <strong className="flp-view-value">{data.role || '—'}</strong>
                      </div>
                      <div className="flp-view-item">
                        <span className="flp-view-label">Website</span>
                        <strong className="flp-view-value">{data.website || '—'}</strong>
                      </div>
                      <div className="flp-view-item">
                        <span className="flp-view-label">LinkedIn</span>
                        <strong className="flp-view-value">{data.socialLinks?.linkedin || '—'}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="fsec-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="fsec-field-label" htmlFor="cp-bio" style={{ margin: 0 }}>Company Bio / Mission</label>
                      <span style={{ fontSize: 12, color: (form.bio?.length || 0) > MAX_BIO ? '#EF4444' : '#64748B', fontWeight: 600 }}>
                        {form.bio?.length || 0} / {MAX_BIO}
                      </span>
                    </div>

                    <textarea
                      id="cp-bio"
                      className="fsec-field-input"
                      rows={5}
                      maxLength={MAX_BIO}
                      value={form.bio || ''}
                      onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Introduce your company and why skilled freelancers should partner with you..."
                      style={{ height: 'auto', padding: 12, lineHeight: 1.5 }}
                    />

                    <div style={{ marginTop: 8 }}>
                      <AiGenerateText
                        prompt={`Generate a concise, professional client/company bio for ${form.companyName || 'our business'}, an organization hiring skilled software and creative freelancers.`}
                        onGenerated={(text) => setForm(p => ({ ...p, bio: text.slice(0, MAX_BIO) }))}
                        buttonLabel="Enhance with AI"
                        buttonClassName="flp-add-pill-btn"
                      />
                    </div>
                  </div>

                  {form.companyType !== 'Individual' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
                      <div className="fsec-field">
                        <label className="fsec-field-label" htmlFor="cp-role">Your Role / Title</label>
                        <Select
                          inputId="cp-role"
                          options={EXECUTIVE_ROLES.map(r => ({ value: r, label: r }))}
                          value={EXECUTIVE_ROLES.includes(form.role) ? { value: form.role, label: form.role } : (form.role ? { value: form.role, label: form.role } : null)}
                          onChange={(val) => setForm(p => ({ ...p, role: val ? val.value : '' }))}
                          styles={customSelectStyles}
                          placeholder="Select role"
                          menuPortalTarget={document.body}
                        />
                      </div>

                      <div className="fsec-field">
                        <label className="fsec-field-label" htmlFor="cp-website">Company Website</label>
                        <input
                          id="cp-website"
                          type="url"
                          className="fsec-field-input"
                          value={form.website || ''}
                          onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))}
                          placeholder="https://example.com"
                        />
                      </div>

                      <div className="fsec-field">
                        <label className="fsec-field-label" htmlFor="cp-linkedin">LinkedIn Profile URL</label>
                        <input
                          id="cp-linkedin"
                          type="url"
                          className="fsec-field-input"
                          value={form.socialLinks?.linkedin || ''}
                          onChange={(e) => setForm(p => ({ ...p, socialLinks: { ...(p.socialLinks || {}), linkedin: e.target.value } }))}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </Reveal>

          {/* 3) HIRING PREFERENCES */}
          <Reveal delay={120}>
            <section id="flp-preferences" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <Target size={18} />
                  </div>
                  <div>
                    <h2 className="flp-sec-title">Hiring & Project Preferences</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                      Standard budget ranges, engagement models, and desired skill stacks.
                    </p>
                  </div>
                </div>
              </div>

              {!editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <span className="flp-view-label" style={{ display: 'block', marginBottom: 8 }}>Frequently Hired Skills</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(Array.isArray(profile?.preferences?.preferredSkills) ? profile.preferences.preferredSkills : []).map(skill => (
                        <span key={skill} className="flp-chip flp-chip--emerald">
                          {skill}
                        </span>
                      ))}
                      {(!profile?.preferences?.preferredSkills || profile.preferences.preferredSkills.length === 0) && (
                        <span style={{ fontSize: 13.5, color: '#94A3B8' }}>No preferred skills configured.</span>
                      )}
                    </div>
                  </div>

                  <div className="flp-view-grid" style={{ paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                    <div className="flp-view-item">
                      <span className="flp-view-label">Typical Budget Tier</span>
                      <strong className="flp-view-value">{getBudgetLabel(profile?.preferences?.budgetRange)}</strong>
                    </div>
                    <div className="flp-view-item">
                      <span className="flp-view-label">Engagement Model</span>
                      <strong className="flp-view-value">{profile?.preferences?.hiringFrequency || 'Flexible'}</strong>
                    </div>
                    <div className="flp-view-item">
                      <span className="flp-view-label">Project Urgency</span>
                      <strong className="flp-view-value">{profile?.preferences?.urgency || 'Exploring'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="fsec-field">
                    <label className="fsec-field-label">Required Skills (Tags)</label>
                    <TagInput tags={prefSkills} onChange={setPrefSkills} placeholder="e.g. React, UI/UX, Python..." />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
                    <div className="fsec-field">
                      <label className="fsec-field-label" htmlFor="cp-budget">Budget Tier</label>
                      <Select
                        inputId="cp-budget"
                        options={budgetOptions}
                        value={currentBudgetOption}
                        onChange={(opt) => setBudgetRange({ min: opt ? opt.min : 0, max: opt ? opt.max : 0 })}
                        styles={customSelectStyles}
                        placeholder="Select Budget"
                        menuPortalTarget={document.body}
                      />
                    </div>

                    <div className="fsec-field">
                      <label className="fsec-field-label" htmlFor="cp-engagement">Engagement Model</label>
                      <Select
                        inputId="cp-engagement"
                        options={ENGAGEMENT_OPTIONS}
                        value={ENGAGEMENT_OPTIONS.find(o => o.value === hiringFrequency) || null}
                        onChange={(val) => setHiringFrequency(val ? val.value : '')}
                        styles={customSelectStyles}
                        placeholder="Select Model"
                        menuPortalTarget={document.body}
                      />
                    </div>

                    <div className="fsec-field">
                      <label className="fsec-field-label" htmlFor="cp-urgency">Hiring Urgency</label>
                      <Select
                        inputId="cp-urgency"
                        options={URGENCY_OPTIONS}
                        value={URGENCY_OPTIONS.find(o => o.value === urgency) || null}
                        onChange={(val) => setUrgency(val ? val.value : '')}
                        styles={customSelectStyles}
                        placeholder="Select Urgency"
                        menuPortalTarget={document.body}
                      />
                    </div>
                  </div>

                  <div className="fsec-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="fsec-field-label" htmlFor="cp-tech" style={{ margin: 0 }}>Technical Complexity Awareness</label>
                      <strong style={{ color: '#10B981', fontSize: 13 }}>{technicalUnderstanding} / 10</strong>
                    </div>
                    <input
                      id="cp-tech"
                      type="range"
                      min="1"
                      max="10"
                      value={technicalUnderstanding}
                      onChange={(e) => setTechnicalUnderstanding(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#10B981' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      <span>Non-technical / High-level</span>
                      <span>Deep Engineering</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </Reveal>

        </main>

        {/* ════════ RIGHT COLUMN: Sidebar (4 cols) ════════ */}
        <aside className="flp-col-side">

          {/* 4) TRUST & VERIFICATION STATS */}
          <Reveal delay={160}>
            <section className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="flp-sec-title">Client Trust Stats</h3>
                    <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>Verified market footprint</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Total Projects</span>
                  <strong style={{ fontSize: 15, color: '#0B2942' }}>{projects.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Payment Method</span>
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 700, background: '#EAFBF4', padding: '3px 8px', borderRadius: 6 }}>Verified</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Security Score</span>
                  <strong style={{ fontSize: 15, color: '#10B981' }}>100%</strong>
                </div>
              </div>
            </section>
          </Reveal>

          {/* 5) COMPANY LOGO BRAND ASSET */}
          {data.companyType !== 'Individual' && (
            <Reveal delay={180}>
              <section className="flp-section-card">
                <div className="flp-sec-header">
                  <div className="flp-sec-title-group">
                    <div className="flp-sec-icon-circle">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h3 className="flp-sec-title">Company Logo</h3>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>
                        Displayed next to job postings.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 100,
                    height: 100,
                    borderRadius: 20,
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(11, 41, 66, 0.05)'
                  }}>
                    {(editing ? form.companyLogo : profile?.personalInfo?.companyLogo) ? (
                      <img
                        src={editing ? form.companyLogo : profile?.personalInfo?.companyLogo}
                        alt="Company Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                      />
                    ) : (
                      <Building2 size={36} style={{ color: '#94A3B8' }} />
                    )}
                  </div>

                  {editing && (
                    <>
                      <button
                        type="button"
                        className="flp-add-pill-btn"
                        onClick={() => logoRef.current?.click()}
                      >
                        <ImageIcon size={13} />
                        <span>Upload Logo</span>
                      </button>
                      <ImageSourcePicker ref={logoRef} accept="image/*" onChange={(e) => handleImage(e, 'companyLogo')} />
                    </>
                  )}
                </div>
              </section>
            </Reveal>
          )}

          {/* 6) LANGUAGES SPOKEN */}
          <Reveal delay={200}>
            <section id="flp-languages" className="flp-section-card">
              <div className="flp-sec-header">
                <div className="flp-sec-title-group">
                  <div className="flp-sec-icon-circle">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="flp-sec-title">Languages Spoken</h3>
                    <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>
                      Primary communication languages.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {languages.map((l, idx) => {
                  const langName = typeof l.language === 'object' ? (l.language.name || l.language.language || '') : l.language;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: '#F8FAFC',
                        borderRadius: 12,
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: 13.5, color: '#0B2942' }}>{langName}</strong>
                        <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700, textTransform: 'capitalize' }}>
                          {l.proficiency || 'Fluent'}
                        </span>
                      </div>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLanguage(idx)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                          title="Remove language"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {languages.length === 0 && (
                  <p style={{ fontSize: 13, color: '#EF4444', margin: '4px 0' }}>
                    <AlertTriangle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    At least one language is required.
                  </p>
                )}

                {editing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, padding: 12, background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0' }}>
                    <Select
                      options={languageOptions}
                      value={languageOptions.find(opt => opt.value === newLangName) || (newLangName ? { value: newLangName, label: newLangName } : null)}
                      onChange={(opt) => setNewLangName(opt ? opt.value : '')}
                      styles={customSelectStyles}
                      placeholder="Select Language..."
                      menuPortalTarget={document.body}
                    />

                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        className="fsec-field-input"
                        value={newLangLevel}
                        onChange={(e) => setNewLangLevel(e.target.value)}
                        style={{ height: 38, fontSize: 12.5 }}
                      >
                        {PROFICIENCY_SELECT_OPTIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="flp-add-lang-btn"
                        onClick={handleAddLanguage}
                        disabled={!newLangName.trim()}
                        style={{ height: 38, padding: '0 14px', fontSize: 12.5 }}
                      >
                        <Plus size={13} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </Reveal>

        </aside>
      </div>

      {/* ─── STICKY BOTTOM ACTION BAR (Edit Mode Only) ─── */}
      {editing && (
        <div className="flp-sticky-action-bar">
          <div className="flp-bar-left">
            <span className="flp-unsaved-chip">
              <span className="flp-unsaved-dot" />
              <span>Editing Client Profile</span>
            </span>
          </div>
          <div className="flp-bar-right">
            <button
              type="button"
              className="flp-btn-cancel-ghost"
              onClick={handleDiscard}
              disabled={saving}
            >
              Discard
            </button>
            <button
              type="button"
              className="flp-btn-save-pill"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      <ImageCropModal
        file={cropTarget?.file || null}
        aspect={CROP_CONFIG[cropTarget?.field]?.aspect || 1}
        cropShape={CROP_CONFIG[cropTarget?.field]?.cropShape || 'rect'}
        title={CROP_CONFIG[cropTarget?.field]?.title || 'Adjust Image'}
        onCancel={() => setCropTarget(null)}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
