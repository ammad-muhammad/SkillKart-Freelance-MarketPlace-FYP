import { useState, useRef, useMemo, useEffect } from 'react';
import { useClient } from '../../context/ClientContext';
import { uploadAvatar as apiUploadAvatar, uploadCompanyLogo as apiUploadCompanyLogo, uploadClientCover as apiUploadCover, validateFile } from '../../utils/uploadHelper';
import TagInput from '../../Components/common/TagInput/TagInput';
import IndustryInput from '../../Components/common/IndustryInput/IndustryInput';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import UserAvatar from '../../Components/common/UserAvatar/UserAvatar';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import { openExternal } from '../../utils/externalLink';

import { LANGUAGES } from '../../data/languages';
import { Camera, Building2, Image as ImageIcon, User, MapPin, Calendar, Globe, Edit2, AlertTriangle, Target, Check, Plus, Trash2, Zap, Clock, Search, Lightbulb, Sparkles } from 'lucide-react';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { timezones } from '../../utils/timezones';
import { clientsAPI } from '../../api/clients';
import './ClientDashboard.css';

const MAX_BIO = 600;
const PROFICIENCY_OPTIONS = ["basic", "conversational", "fluent", "native"];

const COMPANY_TYPES = ['Individual', 'Startup', 'SME', 'Enterprise'];
const COMPANY_TYPE_OPTIONS = COMPANY_TYPES.map(t => ({ value: t, label: t }));

const HIRING_EXP_OPTIONS = [
  { value: 'Yes', label: 'Fresh Client (First time hiring)' },
  { value: 'No', label: 'Experienced (I have hired before)' }
];

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

const INDUSTRY_OPTIONS = [
  { value: 'Accounting & Finance', label: 'Accounting & Finance' },
  { value: 'Advertising & PR', label: 'Advertising & PR' },
  { value: 'Architecture & Design', label: 'Architecture & Design' },
  { value: 'Automotive', label: 'Automotive' },
  { value: 'Aviation & Aerospace', label: 'Aviation & Aerospace' },
  { value: 'Banking', label: 'Banking' },
  { value: 'Biotechnology', label: 'Biotechnology' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'Education & EdTech', label: 'Education & EdTech' },
  { value: 'Energy & Utilities', label: 'Energy & Utilities' },
  { value: 'Entertainment & Media', label: 'Entertainment & Media' },
  { value: 'FinTech', label: 'FinTech' },
  { value: 'Food & Beverage', label: 'Food & Beverage' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Government & Public Sector', label: 'Government & Public Sector' },
  { value: 'Healthcare & HealthTech', label: 'Healthcare & HealthTech' },
  { value: 'Hospitality & Tourism', label: 'Hospitality & Tourism' },
  { value: 'Human Resources', label: 'Human Resources' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'NGO & Non-profit', label: 'NGO & Non-profit' },
  { value: 'Real Estate & PropTech', label: 'Real Estate & PropTech' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Software & IT Services', label: 'Software & IT Services' },
  { value: 'Telecommunications', label: 'Telecommunications' }
];

const EXECUTIVE_ROLES = ['Founder', 'Product Lead', 'CTO', 'Engineering Manager', 'Marketing Head', 'Design Director'];



const ClientProfile = () => {
  const { profile, saveProfile, showToast } = useClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Local Form state
  const [form, setForm] = useState({
    ...(profile?.personalInfo || {}),
    industry: Array.isArray(profile?.personalInfo?.industry)
      ? [...profile.personalInfo.industry]
      : (profile?.personalInfo?.industry ? [profile.personalInfo.industry] : [])
  });

  
  // Custom arrays and fields matching preferences and personalInfo
  const [prefSkills, setPrefSkills] = useState(Array.isArray(profile?.preferences?.preferredSkills) ? [...profile.preferences.preferredSkills] : []);
  const [budgetRange, setBudgetRange] = useState({ ...(profile?.preferences?.budgetRange || { min: 0, max: 0 }) });
  const [languages, setLanguages] = useState(Array.isArray(profile?.personalInfo?.languages) ? [...profile.personalInfo.languages] : []);
  
  // Added fields for onboarding alignment
  const [hiringFrequency, setHiringFrequency] = useState(profile?.preferences?.hiringFrequency || '');
  const [technicalUnderstanding, setTechnicalUnderstanding] = useState(profile?.preferences?.technicalUnderstanding || 5);
  const [urgency, setUrgency] = useState(profile?.preferences?.urgency || '');
  
  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  
  const [errors, setErrors] = useState({});


  const avatarRef = useRef(null);
  const logoRef = useRef(null);
  const coverRef = useRef(null);
  const [cropTarget, setCropTarget] = useState(null); // { file, field } while the crop modal is open

  const countryOptions = useMemo(() => countryList().getData(), []);
  const languageOptions = useMemo(() => LANGUAGES.map(lang => ({ value: lang, label: lang })), []);

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      background: "var(--color-white)",
      borderColor: state.isFocused ? "var(--color-primary)" : "#d1d9e6",
      borderRadius: "12px",
      minHeight: "48px",
      color: "var(--color-text-dark)",
      fontSize: "0.875rem",
      fontFamily: "var(--font-body)",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(4,46,76,0.08)" : "none",
      transition: "all 0.2s ease",
      cursor: "pointer",
      "&:hover": {
        borderColor: state.isFocused ? "var(--color-primary)" : "var(--color-accent)"
      }
    }),
    menu: (base) => ({
      ...base,
      background: "var(--color-white)",
      border: "1px solid rgba(183, 201, 226, 0.35)",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(4, 46, 76, 0.12)",
      zIndex: 9999
    }),
    menuList: (base) => ({
      ...base,
      padding: "4px",
      maxHeight: "220px",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      "&::-webkit-scrollbar": {
        display: "none"
      }
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    }),
    option: (base, state) => ({
      ...base,
      background: state.isSelected
        ? "var(--color-primary)"
        : state.isFocused
          ? "rgba(4, 46, 76, 0.06)"
          : "transparent",
      color: state.isSelected ? "var(--color-white)" : "var(--color-text-dark)",
      cursor: "pointer",
      borderRadius: "8px",
      margin: "2px 0",
      padding: "8px 12px",
      transition: "all 0.15s ease",
      fontWeight: state.isSelected ? "700" : "500"
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--color-text-dark)",
      fontWeight: "500"
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--color-text-light)"
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "var(--color-text-light)"
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

  const fetchAISuggestions = async () => {
    if (!form.companyName && !form.bio && (!prefSkills || prefSkills.length === 0)) {
      return;
    }
    setFetchingSuggestions(true);
    try {
      const res = await clientsAPI.recommendIndustry({
        companyName: form.companyName || '',
        bio: form.bio || '',
        techStack: prefSkills,
        website: form.website || ''
      });
      if (res.data?.success && res.data?.data?.recommendations) {
        setAiSuggestions(res.data.data.recommendations);
      }
    } catch (error) {
      console.error("Error getting industry recommendations:", error);
    } finally {
      setFetchingSuggestions(false);
    }
  };

  useEffect(() => {
    if (editing && form.companyType !== 'Individual') {
      fetchAISuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, form.companyType]);

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

  const validate = () => {
    const newErrors = {};
    if (!form.fullName?.trim()) newErrors.fullName = 'Full Name is required';
    if (!form.bio || form.bio.trim().length < 20) {
      newErrors.bio = 'Please provide a descriptive Bio (minimum 20 characters)';
    }
    if (languages.length === 0) {
      newErrors.languages = 'At least one language is required';
    }
    if (form.companyType !== 'Individual') {
      if (!form.companyName?.trim()) newErrors.companyName = 'Company Name is required';
      if (!form.industry || (Array.isArray(form.industry) && form.industry.length === 0)) {
        newErrors.industry = 'Please select your Industry';
      }
      if (form.website?.trim()) {
        try {
          const url = new URL(form.website.trim());
          if (!/^https?:$/.test(url.protocol)) throw new Error('invalid protocol');
        } catch {
          newErrors.website = 'Please enter a valid URL (e.g. https://company.com)';
        }
      }
    }
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
        ...profile,
        personalInfo: { 
          ...profile.personalInfo, 
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
      } else if (result.errors) {
        const newErrors = {};
        if (Array.isArray(result.errors)) {
          result.errors.forEach(err => {
            if (typeof err === 'object' && err.field) {
              newErrors[err.field] = err.message;
            } else if (typeof err === 'string') {
              const pathMatch = err.match(/at path "(.+)"/);
              if (pathMatch) {
                newErrors[pathMatch[1]] = err;
              } else {
                newErrors.global = err;
              }
            }
          });
        } else if (typeof result.errors === 'object') {
          Object.assign(newErrors, result.errors);
        }
        setErrors(newErrors);
      }
    } catch (error) {
      console.error('Update failed:', error);
      showToast('Update failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Per-field crop framing: avatar is a circle, logo is a square box, cover is a wide banner.
  const CROP_CONFIG = {
    avatar: { aspect: 1, cropShape: 'round', title: 'Adjust Profile Photo' },
    companyLogo: { aspect: 1, cropShape: 'rect', title: 'Adjust Company Logo' },
    coverPhoto: { aspect: 4 / 1, cropShape: 'rect', title: 'Adjust Cover Photo' },
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
        url = await apiUploadAvatar(finalFile, 'client');
      }
      setForm((p) => ({ ...p, [field]: url }));
      showToast('Image uploaded! Save profile to persist.');
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getBudgetLabel = (br) => {
    if (!br) return 'N/A';
    if (br.min === 0 && br.max === 5000) return 'Startup (Up to Rs. 5,000)';
    if (br.min === 5000 && br.max === 20000) return 'Growth (Rs. 5,000 - Rs. 20,000)';
    if (br.min === 20000 && br.max === 0) return 'Enterprise (Rs. 20,000+)';
    if (br.min || br.max) return `Rs. ${br.min || 0} - Rs. ${br.max || 'unlimited'}`;
    return 'N/A';
  };

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
                <UserAvatar 
                  src={editing ? form.avatar : profile?.personalInfo?.avatar}
                  fullName={data.fullName}
                  size="lg"
                />
              </div>
              {editing && (
                <>
                  <button className="cl-btn cl-btn--ghost cl-btn--sm" style={{ marginTop: '0.5rem', width: 'auto' }} onClick={() => avatarRef.current?.click()}>
                    <Camera size={14} style={{ marginRight: 6 }} /> Change
                  </button>
                  <ImageSourcePicker ref={avatarRef} accept="image/*" facing="user" onChange={(e) => handleImage(e, 'avatar')} />
                </>
              )}
            </div>
            {/* Company Logo - Hidden for Individuals */}
            {data.companyType !== 'Individual' && (
              <div>
                <p className="cl-label" style={{ marginBottom: '0.5rem' }}>Company Logo</p>
                <div className="cl-logo-box">
                  {(editing ? form.companyLogo : profile?.personalInfo?.companyLogo) ? (
                    <img src={editing ? form.companyLogo : profile?.personalInfo?.companyLogo} alt="logo" />
                  ) : <span style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' }}><Building2 size={32} /></span>}
                </div>
                {editing && (
                  <>
                    <button className="cl-btn cl-btn--ghost cl-btn--sm" style={{ marginTop: '0.5rem', width: 'auto' }} onClick={() => logoRef.current?.click()}>
                      <ImageIcon size={14} style={{ marginRight: 6 }} /> Upload
                    </button>
                    <ImageSourcePicker ref={logoRef} accept="image/*" onChange={(e) => handleImage(e, 'companyLogo')} />
                  </>
                )}
              </div>
            )}
            
            {/* Cover Photo */}
            <div>
              <p className="cl-label" style={{ marginBottom: '0.5rem' }}>Cover Photo</p>
              <div className="cl-logo-box" style={{ width: '160px', border: '1px dashed rgba(183, 201, 226, 0.6)' }}>
                {(editing ? form.coverPhoto : profile?.personalInfo?.coverPhoto) ? (
                  <img src={editing ? form.coverPhoto : profile?.personalInfo?.coverPhoto} alt="cover" style={{ objectFit: 'cover' }} />
                ) : <span style={{ fontSize: '1.5rem', color: 'var(--color-text-light)' }}><ImageIcon size={24} /></span>}
              </div>
              {editing && (
                <>
                  <button className="cl-btn cl-btn--ghost cl-btn--sm" style={{ marginTop: '0.5rem', width: 'auto' }} onClick={() => coverRef.current?.click()}>
                    <ImageIcon size={14} style={{ marginRight: 6 }} /> Upload
                  </button>
                  <ImageSourcePicker ref={coverRef} accept="image/*" onChange={(e) => handleImage(e, 'coverPhoto')} />
                </>
              )}
            </div>
          </div>

          <div className="cl-profile-hero__info">
            <h2 className="cl-profile-hero__name">{data.fullName || 'New Client'}</h2>
            <div className="cl-prof-header-meta" style={{ marginTop: '0.4rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {data.companyType === 'Individual' ? (
                  <><User size={16} /> Individual Client</>
                ) : (
                  <><Building2 size={16} /> {data.companyName || 'No Company'} <span style={{ color: 'rgba(183, 201, 226, 0.6)' }}>•</span> {data.industry || 'No Industry Specified'}</>
                )}
              </div>
              <div className="cl-prof-header-stats" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-mid)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MapPin size={15} /> {data.location || 'Location Not Specified'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={15} /> Member Since: {data.memberSince || 'N/A'}</span>
                {data.website && (
                  <a href={data.website} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }} onClick={(e) => { e.preventDefault(); openExternal(data.website); }}>
                    <Globe size={15} /> Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {!editing && (
            <div className="cl-prof-actions">
              <button className="cl-btn cl-btn--primary" style={{ width: 'auto' }} onClick={startEdit}>
                <Edit2 size={14} style={{marginRight: 6}} /> Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title"><User size={18} style={{marginRight:6, verticalAlign:'middle'}} /> Personal Information</h3>
        <div className="cl-form-grid">
          {/* Full Name */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-full-name">Full Name*</label>
            <input
              id="cp-full-name"
              type="text"
              className={`cl-input${errors.fullName ? ' cl-input--error' : ''}`}
              value={editing ? form.fullName || '' : profile?.personalInfo?.fullName || ''}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              disabled={!editing}
              placeholder="e.g. John Doe"
            />
            {editing && errors.fullName && <span className="cl-error"><AlertTriangle size={12} /> {errors.fullName}</span>}
          </div>

          {/* Username */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-username">Username</label>
            <input
              id="cp-username"
              type="text"
              className="cl-input"
              value={editing ? form.username || '' : profile?.personalInfo?.username || ''}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              disabled={true}
            />
          </div>

          {/* Email */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-email">Email (Immutable)</label>
            <input
              id="cp-email"
              type="email"
              className="cl-input"
              value={profile?.personalInfo?.email || ''}
              disabled={true}
            />
          </div>

          {/* Phone */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-phone">Phone</label>
            <input
              id="cp-phone"
              type="text"
              className="cl-input"
              value={editing ? form.phone || '' : profile?.personalInfo?.phone || ''}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              disabled={!editing}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Organization Type */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-org-type">Organization Type*</label>
            {editing ? (
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
                    industry: selected === 'Individual' ? '' : p.industry,
                  }));
                }}
                styles={customSelectStyles}
                placeholder="Select Organization Type"
                classNamePrefix="skillkart-select"
                menuPortalTarget={document.body}
              />
            ) : (
              <div className="cl-input" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)' }}>
                {profile?.personalInfo?.companyType || 'N/A'}
              </div>
            )}
          </div>

          {/* Company Name - Hidden for Individuals */}
          {data.companyType !== 'Individual' && (
            <div className="cl-form-group">
              <label className="cl-label" htmlFor="cp-company-name">Company Name*</label>
              <input
                id="cp-company-name"
                type="text"
                className={`cl-input${errors.companyName ? ' cl-input--error' : ''}`}
                value={editing ? form.companyName || '' : profile?.personalInfo?.companyName || ''}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                disabled={!editing}
                placeholder="e.g. Acme Corp"
              />
              {editing && errors.companyName && <span className="cl-error"><AlertTriangle size={12} /> {errors.companyName}</span>}
            </div>
          )}

          {/* Industry - Hidden for Individuals */}
          {data.companyType !== 'Individual' && (
            <div className="cl-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="cl-label">Industry*</label>
              {editing ? (
                <>
                  <IndustryInput
                    value={form.industry}
                    onChange={(val) => setForm(p => ({ ...p, industry: val }))}
                    placeholder="Type to search industry (e.g. software, design)..."
                  />


                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={13} style={{ color: 'var(--color-warning)' }} /> AI Recommended:
                      </span>
                      {fetchingSuggestions && <span style={{ fontSize: '11px', color: 'var(--color-text-mid)', fontStyle: 'italic' }}>analyzing profile...</span>}
                      {!fetchingSuggestions && (
                        <button 
                          type="button" 
                          onClick={fetchAISuggestions}
                          style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '0 4px', textDecoration: 'underline' }}
                        >
                          re-analyze
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {aiSuggestions.length > 0 ? (
                        aiSuggestions.map(rec => (
                          <button
                            key={rec}
                            type="button"
                            className={`cl-checkbox-pill${form.industry?.includes(rec) ? ' cl-checkbox-pill--checked' : ''}`}
                            style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', margin: 0, borderRadius: '8px', cursor: 'pointer' }}
                            onClick={() => {
                              const current = Array.isArray(form.industry) ? form.industry : [form.industry].filter(Boolean);
                              const updated = current.includes(rec)
                                ? current.filter(x => x !== rec)
                                : [...current, rec];
                              setForm(p => ({ ...p, industry: updated }));
                            }}
                          >
                            {rec}
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Provide company info or bio details to trigger recommendations.</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="cl-input" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)' }}>
                  {Array.isArray(profile?.personalInfo?.industry)
                    ? (profile.personalInfo.industry.join(', ') || 'N/A')
                    : (profile?.personalInfo?.industry || 'N/A')}
                </div>
              )}
              {editing && errors.industry && <span className="cl-error"><AlertTriangle size={12} /> {errors.industry}</span>}
            </div>
          )}

          {/* Country */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-country">Country / Location*</label>
            {editing ? (
              <Select
                inputId="cp-country"
                options={countryOptions}
                value={form.location ? countryOptions.find(opt => opt.label === form.location) : null}
                onChange={(val) => setForm(p => ({ ...p, location: val ? val.label : '' }))}
                styles={customSelectStyles}
                placeholder="Select Country"
                classNamePrefix="skillkart-select"
                isSearchable={true}
                maxMenuHeight={220}
                menuPortalTarget={document.body}
              />
            ) : (
              <div className="cl-input" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)' }}>
                {profile?.personalInfo?.location || 'N/A'}
              </div>
            )}
          </div>

          {/* Timezone */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-timezone">Timezone / Base Location</label>
            {editing ? (
              <Select
                inputId="cp-timezone"
                options={timezones}
                value={form.timezone ? timezones.find(t => t.label === form.timezone) : null}
                onChange={(val) => setForm(p => ({ ...p, timezone: val ? val.label : '' }))}
                styles={customSelectStyles}
                placeholder="Select Timezone"
                classNamePrefix="skillkart-select"
                isSearchable={true}
                maxMenuHeight={220}
                menuPortalTarget={document.body}
              />
            ) : (
              <div className="cl-input" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)' }}>
                {profile?.personalInfo?.timezone || 'N/A'}
              </div>
            )}
          </div>

          {/* LinkedIn Profile */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-linkedin">LinkedIn Profile (Optional)</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--color-text-light)' }}><Building2 size={16} /></div>
              <input
                id="cp-linkedin"
                type="text"
                className="cl-input"
                style={{ paddingLeft: '38px' }}
                value={editing ? form.linkedin || '' : profile?.personalInfo?.linkedin || ''}
                onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
                disabled={!editing}
                placeholder="linkedin.com/in/username"
              />
            </div>
          </div>

          {/* Website - Hidden for Individuals */}
          {data.companyType !== 'Individual' && (
            <div className="cl-form-group">
              <label className="cl-label" htmlFor="cp-website">Website</label>
              <input
                id="cp-website"
                type="url"
                className={`cl-input${errors.website ? ' cl-input--error' : ''}`}
                value={editing ? form.website || '' : profile?.personalInfo?.website || ''}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                disabled={!editing}
                placeholder="https://company.com"
              />
              {editing && errors.website && <span className="cl-error"><AlertTriangle size={12} /> {errors.website}</span>}
            </div>
          )}

          {/* Hiring Experience */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-hiring-exp">Hiring Experience*</label>
            {editing ? (
              <Select
                inputId="cp-hiring-exp"
                options={HIRING_EXP_OPTIONS}
                value={HIRING_EXP_OPTIONS.find(o => o.value === form.isNewToHiring) || null}
                onChange={(val) => setForm(p => ({ ...p, isNewToHiring: val ? val.value : '' }))}
                styles={customSelectStyles}
                placeholder="Select Hiring Experience"
                classNamePrefix="skillkart-select"
                menuPortalTarget={document.body}
              />
            ) : (
              <div className="cl-input" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)' }}>
                {profile?.personalInfo?.isNewToHiring === 'Yes' ? 'Fresh Client (First time hiring)' : profile?.personalInfo?.isNewToHiring === 'No' ? 'Experienced (I have hired before)' : 'N/A'}
              </div>
            )}
          </div>

          {/* Executive Role - Hidden for Individuals */}
          {data.companyType !== 'Individual' && (
            <div className="cl-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="cl-label">Your Executive Role</label>
              {editing ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '4px' }}>
                  {EXECUTIVE_ROLES.map(r => (
                    <span
                      key={r}
                      className={`cl-checkbox-pill${form.role === r ? ' cl-checkbox-pill--checked' : ''}`}
                      onClick={() => setForm(p => ({ ...p, role: r }))}
                      style={{ cursor: 'pointer' }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="cl-input" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)' }}>
                  {profile?.personalInfo?.role || 'N/A'}
                </div>
              )}
            </div>
          )}

          {/* Bio */}
          <div className="cl-form-group full">
            <label className="cl-label" htmlFor="cp-bio">Bio / About yourself*</label>
            <textarea
              id="cp-bio"
              className={`cl-textarea${errors.bio ? ' cl-input--error' : ''}`}
              maxLength={MAX_BIO}
              rows={4}
              value={editing ? form.bio || '' : profile?.personalInfo?.bio || ''}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              disabled={!editing}
              placeholder="Describe your goals, team size, company mission, or what you plan to accomplish..."
            />
            {editing && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                {errors.bio ? <span className="cl-error"><AlertTriangle size={12} /> {errors.bio}</span> : <span />}
                <span className="cl-char-count">{(form.bio || '').length}/{MAX_BIO}</span>
              </div>
            )}
            {editing && (
              <AiGenerateText
                className="cl-ai-generate"
                fieldLabel="a client company's bio/about section on their freelance-marketplace profile — goals, team, and mission"
                getContext={() => ({ companyName: form.companyName, companyType: form.companyType, industry: form.industry })}
                getExistingText={() => form.bio}
                onGenerated={(text) => setForm((p) => ({ ...p, bio: text.slice(0, MAX_BIO) }))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Languages */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="cl-section-title" style={{ marginBottom: 0 }}><Globe size={18} style={{marginRight:6, verticalAlign:'middle'}} /> Languages Spoken</h3>
          {editing && (
            <button 
              className="cl-btn cl-btn--ghost cl-btn--sm" 
              style={{ width: 'auto' }}
              onClick={() => setLanguages([...languages, { language: '', proficiency: 'fluent' }])}
            >
              <Plus size={14} /> Add Language
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {languages.map((lang, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 1fr auto' : '1fr 1fr', gap: '1rem', alignItems: 'end', background: 'var(--color-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(183, 201, 226, 0.35)' }}>
              <div className="cl-form-group" style={{ marginBottom: 0 }}>
                <label className="cl-label" htmlFor={`cp-lang-${idx}`}>Language</label>
                {editing ? (
                  <Select
                    inputId={`cp-lang-${idx}`}
                    options={languageOptions}
                    value={lang.language ? { value: lang.language, label: lang.language } : null}
                    onChange={(selected) => {
                      const newList = [...languages];
                      newList[idx].language = selected?.value || '';
                      setLanguages(newList);
                    }}
                    placeholder="Select language"
                    styles={customSelectStyles}
                    classNamePrefix="skillkart-select"
                    menuPortalTarget={document.body}
                  />
                ) : <div className="cl-tag" style={{ background: 'var(--color-white)' }}>{typeof lang === 'string' ? lang : (lang?.language || 'Unknown')}</div>}
              </div>
              <div className="cl-form-group" style={{ marginBottom: 0 }}>
                <label className="cl-label" htmlFor={`cp-prof-${idx}`}>Proficiency</label>
                {editing ? (
                  <Select
                    inputId={`cp-prof-${idx}`}
                    options={PROFICIENCY_SELECT_OPTIONS}
                    value={PROFICIENCY_SELECT_OPTIONS.find(o => o.value.toLowerCase() === (lang.proficiency || 'fluent').toLowerCase()) || PROFICIENCY_SELECT_OPTIONS[2]}
                    onChange={(selected) => {
                      const newList = [...languages];
                      newList[idx].proficiency = selected?.value || 'fluent';
                      setLanguages(newList);
                    }}
                    placeholder="Select proficiency"
                    styles={customSelectStyles}
                    classNamePrefix="skillkart-select"
                    menuPortalTarget={document.body}
                  />
                ) : <div className="cl-tag" style={{ background: 'var(--color-white)' }}>{typeof lang === 'string' ? 'fluent' : (lang?.proficiency || 'fluent')}</div>}
              </div>
              {editing && (
                <button 
                  className="cl-btn cl-btn--ghost cl-btn--sm" 
                  style={{ color: 'var(--color-error)', height: '42px', border: '1px solid rgba(220, 38, 38, 0.25)', background: 'var(--color-error-tint)', width: 'auto' }}
                  onClick={() => setLanguages(languages.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {languages.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}><AlertTriangle size={12} /> No languages added. At least one is required.</p>}
          {editing && errors.languages && <span className="cl-error"><AlertTriangle size={12} /> {errors.languages}</span>}
        </div>
      </div>

      {/* Project Preferences */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title"><Target size={18} style={{marginRight:6, verticalAlign:'middle'}} /> Project Preferences</h3>

        {/* Preferred Skills */}
        <div className="cl-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="cl-label">Skills Required*</label>
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
          {/* Budget Allocation */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-budget">Budget Allocation</label>
            {editing ? (
              <Select
                inputId="cp-budget"
                options={budgetOptions}
                value={currentBudgetOption}
                onChange={(opt) => setBudgetRange({ min: opt ? opt.min : 0, max: opt ? opt.max : 0 })}
                styles={customSelectStyles}
                placeholder="Select Budget Allocation"
                menuPortalTarget={document.body}
              />
            ) : (
              <div className="cl-tag" style={{ marginTop: '4px', alignSelf: 'flex-start' }}>{getBudgetLabel(profile?.preferences?.budgetRange)}</div>
            )}
          </div>

          {/* Engagement Type */}
          <div className="cl-form-group">
            <label className="cl-label" htmlFor="cp-engagement">Engagement Type</label>
            {editing ? (
              <Select
                inputId="cp-engagement"
                options={ENGAGEMENT_OPTIONS}
                value={ENGAGEMENT_OPTIONS.find(o => o.value === hiringFrequency) || null}
                onChange={(val) => setHiringFrequency(val ? val.value : '')}
                styles={customSelectStyles}
                placeholder="Select Engagement Type..."
                classNamePrefix="skillkart-select"
                menuPortalTarget={document.body}
              />
            ) : (
              <div className="cl-tag" style={{ marginTop: '4px', alignSelf: 'flex-start' }}>{profile?.preferences?.hiringFrequency || 'N/A'}</div>
            )}
          </div>
        </div>

        {/* Technical Complexity Awareness */}
        <div className="cl-form-group" style={{ marginBottom: '1.5rem' }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="cl-label" htmlFor="cp-tech-understanding">Technical Complexity Awareness</label>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>{technicalUnderstanding}/10</span>
              </div>
              <input
                id="cp-tech-understanding"
                type="range"
                min="1"
                max="10"
                value={technicalUnderstanding}
                onChange={(e) => setTechnicalUnderstanding(parseInt(e.target.value))}
                className="onboarding__slider"
                style={{ background: `linear-gradient(to right, var(--color-primary) ${((technicalUnderstanding - 1) / 9) * 100}%, rgba(183, 201, 226, 0.35) ${((technicalUnderstanding - 1) / 9) * 100}%)`, width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-mid)' }}>
                <span>Conceptual</span>
                <span>Deep Tech</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="cl-label" style={{ marginBottom: '0.5rem' }}>Technical Complexity Awareness</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '8px', background: 'rgba(183, 201, 226, 0.35)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(profile?.preferences?.technicalUnderstanding || 5) * 10}%`, height: '100%', background: 'var(--color-primary)' }} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{profile?.preferences?.technicalUnderstanding || 5}/10</span>
              </div>
            </div>
          )}
        </div>

        {/* Project Urgency */}
        <div className="cl-form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="cl-label" htmlFor="cp-urgency">Project Urgency</label>
          {editing ? (
            <Select
              inputId="cp-urgency"
              options={URGENCY_OPTIONS}
              value={URGENCY_OPTIONS.find(o => o.value === urgency) || null}
              onChange={(val) => setUrgency(val ? val.value : '')}
              styles={customSelectStyles}
              placeholder="Select Urgency..."
              classNamePrefix="skillkart-select"
              menuPortalTarget={document.body}
            />
          ) : (
            <div className="cl-tag" style={{ marginTop: '4px', alignSelf: 'flex-start' }}>{profile?.preferences?.urgency || 'N/A'}</div>
          )}
        </div>

        {editing && errors.global && (
          <div className="cl-error-banner" style={{ marginTop: '1rem' }}>
            <AlertTriangle size={16} /> {errors.global}
          </div>
        )}
      </div>

      {/* Actions */}
      {editing && (
        <div className="cl-actions">
          <button
            className={`cl-btn cl-btn--primary${saving ? ' cl-btn--loading' : ''}`}
            onClick={save} disabled={saving}
            style={{ width: 'auto' }}
          >
            {saving ? 'Saving...' : <><Check size={16} style={{marginRight:6}} /> Save Changes</>}
          </button>
          <button className="cl-btn cl-btn--ghost" style={{ width: 'auto' }} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}

      <style>{`
        .cl-profile-hero { display: flex; align-items: flex-start; gap: 1.75rem; flex-wrap: wrap; }
        .cl-profile-hero__avatars { display: flex; gap: 1.5rem; flex-shrink: 0; flex-wrap: wrap; }
        .cl-avatar-circle {
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--gradient-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; font-weight: 800; color: var(--color-white);
          border: 3px solid rgba(183,201,226,0.5); overflow: hidden;
        }
        .cl-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
        .cl-logo-box {
          width: 80px; height: 80px; border-radius: 14px;
          background: var(--color-secondary); border: 2px solid rgba(183, 201, 226, 0.35);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .cl-logo-box img { width: 100%; height: 100%; object-fit: contain; }
        .cl-profile-hero__info { flex: 1; min-width: 0; }
        .cl-profile-hero__name { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: var(--color-primary); }
        .cl-profile-hero__company { color: var(--color-text-mid); font-size: 0.875rem; margin: 0.2rem 0; }
        .cl-profile-hero__meta { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.3rem; }

        /* ── Mobile ──────────────────────────────────────────────
           The image row (avatar 80 + logo 80 + cover 160 + gaps) is wider than a
           phone, so "Cover Photo" clipped. Tighten gaps, shrink the cover, and
           center the hero so the name/company block reads cleanly. */
        @media (max-width: 640px) {
          .cl-profile-hero { flex-direction: column; align-items: center; text-align: center; }
          /* Center the image row block on the screen. */
          .cl-profile-hero__avatars { gap: 1rem; justify-content: center; align-self: center; margin: 0 auto; }
          .cl-profile-hero__avatars > div { display: flex; flex-direction: column; align-items: center; }
          .cl-profile-hero__info { width: 100%; flex: none; }
          .cl-profile-hero__name { font-size: 1.6rem; line-height: 1.2; }
          .cl-profile-hero__meta { justify-content: center; }
          /* Cover box: cap to what fits a phone row alongside the two 80px tiles. */
          .cl-logo-box[style*="160px"] { width: 120px !important; }
          /* Header meta: center the company line and let it wrap on one flow
             instead of splitting into two ragged columns. */
          .cl-prof-header-meta > div:first-child {
            flex-wrap: wrap;
            justify-content: center;
          }
          .cl-prof-header-stats {
            justify-content: center;
          }
          /* Force single-column form fields on mobile. A prior attempt set
             grid-template-columns: 1fr !important here, which — empirically,
             verified via Playwright — did NOT reliably resolve to a single
             324px-wide track; getComputedStyle kept reporting two resolved
             tracks from the base repeat(auto-fit, minmax(min(100%,260px),1fr))
             rule even with this exact property forced via JS with maximum
             priority. Dropping display:grid entirely for display:block sidesteps
             whatever auto-fit/minmax recalculation quirk that was — confirmed
             this DOES stack children full-width, one per line (each
             .cl-form-group is its own flex-column box regardless, so this
             doesn't change their own internal label/input layout). */
          .cl-form-grid {
            display: block !important;
          }
          .cl-form-grid > .cl-form-group {
            margin-bottom: 1.25rem;
          }
          .cl-form-grid > .cl-form-group:last-child {
            margin-bottom: 0;
          }
        }

        .onboarding__slider {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 6px;
          background: rgba(183, 201, 226, 0.35);
          outline: none;
          transition: background 0.3s;
        }
        .onboarding__slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-primary);
          cursor: pointer;
          border: 2px solid var(--color-white);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: transform 0.1s;
        }
        .onboarding__slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>

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
};

export default ClientProfile;
