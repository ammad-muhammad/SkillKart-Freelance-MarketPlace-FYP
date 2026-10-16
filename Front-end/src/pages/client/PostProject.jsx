import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Bot, X, Plus, Folder, Send, Save, ArrowLeft, ArrowRight,
  Check, ShieldCheck, Clock, Layers, TrendingUp, AlertCircle, Eye,
  FileText, CheckCircle2, DollarSign, Calendar, Upload, Trash2, HelpCircle
} from 'lucide-react';
import { useClient } from '../../context/ClientContext';
import { jobsAPI } from '../../api/jobs';
import { uploadJobAttachment, validateFile } from '../../utils/uploadHelper';
import { JOB_CATEGORIES, GIG_SUBCATEGORIES } from '../../constants/jobCategories';
import { Field, Input, Textarea } from '../../Components/common/Field/Field';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import { isMobileApp } from '../../utils/platform';
import { openExternal } from '../../utils/externalLink';
import '../freelancer/CreateGig.css';
import './PostProject.css';

const STEPS = [
  { title: 'Basic Info', sub: 'Title, category & skills' },
  { title: 'Budget & Timeline', sub: 'Pricing & deadline' },
  { title: 'Project Scope', sub: 'Description & deliverables' },
  { title: 'Media & Docs', sub: 'Specs & attachments' },
  { title: 'Review & Publish', sub: 'Final review & launch' },
];

const STEP_FOR_FIELD = {
  title: 1,
  category: 1,
  skills: 1,
  summary: 1,
  experienceLevel: 1,
  budgetMin: 2,
  budgetMax: 2,
  duration: 2,
  deadline: 2,
  fullDescription: 3,
  attachments: 4,
};

const mapApiFieldToForm = (field) => {
  if (field === 'description') return 'fullDescription';
  if (field === 'budget.min') return 'budgetMin';
  if (field === 'budget.max') return 'budgetMax';
  if (field?.startsWith('attachments')) return 'attachments';
  if (field === 'skills.0' || field?.startsWith('skills')) return 'skills';
  return field;
};

const stepForApiField = (field) => {
  const key = mapApiFieldToForm(field);
  return STEP_FOR_FIELD[key] || STEP_FOR_FIELD[field] || 1;
};

const attachmentUrl = (item) => (typeof item === 'string' ? item : item?.url);
const attachmentName = (item, index) =>
  (typeof item === 'object' && item?.name) ? item.name : `Document ${index + 1}`;

const consumePendingDraft = () => {
  try {
    const raw = sessionStorage.getItem('pendingProjectDraft');
    if (!raw) return null;
    sessionStorage.removeItem('pendingProjectDraft');
    const d = JSON.parse(raw);
    const min = Number(d.budgetMin) || 500;
    const max = Number(d.budgetMax) || Math.max(min * 2, 2000);
    return {
      title: d.title || '',
      category: JOB_CATEGORIES.includes(d.category) ? d.category : JOB_CATEGORIES[0],
      skills: Array.isArray(d.skills) ? d.skills : [],
      summary: d.description || '',
      fullDescription: d.description || '',
      projectType: d.budgetType === 'hourly' ? 'hourly' : 'fixed',
      budget: { min, max },
    };
  } catch {
    return null;
  }
};

const PostProject = () => {
  const navigate = useNavigate();
  const { fetchProfile, showToast } = useClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [suggestingSubcategory, setSuggestingSubcategory] = useState(false);
  const [subcategorySuggestions, setSubcategorySuggestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [form, setForm] = useState(() => ({
    title: '',
    category: JOB_CATEGORIES[0],
    subcategory: '',
    skills: [],
    experienceLevel: 'Intermediate',
    projectType: 'fixed',
    summary: '',
    budget: { min: 500, max: 2000 },
    duration: '1-3 months',
    deadline: '',
    milestones: true,
    fullDescription: '',
    responsibilities: '',
    deliverables: '',
    referenceLinks: [],
    faqs: [],
    attachments: { images: [], documents: [], links: [] },
    ...(consumePendingDraft() || {})
  }));

  const bannerRef = useRef(null);
  const documentsRef = useRef(null);

  const updateForm = (updates) => setForm((prev) => ({ ...prev, ...updates }));

  const clearError = (key) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const collectStepErrors = (stepNum) => {
    const e = {};
    if (stepNum === 1) {
      if (!form.title.trim()) e.title = 'Project title is required';
      else if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
      else if (form.title.trim().length > 100) e.title = 'Title must be under 100 characters';
      if (!JOB_CATEGORIES.includes(form.category)) e.category = 'Please select a valid category';
      if (!form.skills.length) e.skills = 'Add at least one required skill';
      if (!form.summary.trim()) e.summary = 'Short summary is required';
    }
    if (stepNum === 2) {
      if (!form.budget.min || form.budget.min < 1) e.budgetMin = 'Minimum budget must be at least 1';
      if (!form.budget.max || form.budget.max < 1) e.budgetMax = 'Maximum budget must be at least 1';
      else if (Number(form.budget.max) < Number(form.budget.min)) e.budgetMax = 'Maximum budget must be greater than or equal to minimum';
      if (!form.deadline) {
        e.deadline = 'Deadline is required';
      } else {
        const d = new Date(form.deadline);
        if (Number.isNaN(d.getTime()) || d <= new Date()) e.deadline = 'Deadline must be a future date';
      }
    }
    if (stepNum === 3) {
      const desc = (form.fullDescription || form.summary || '').trim();
      if (!desc) e.fullDescription = 'Project description is required';
      else if (desc.length < 30) e.fullDescription = 'Description must be at least 30 characters';
    }
    if (stepNum === 5) {
      if (!termsAccepted) e.terms = 'Please accept the service fulfillment terms.';
    }
    return e;
  };

  const validateCurrentStep = () => {
    const newErrors = collectStepErrors(step);
    setErrors((prev) => ({ ...prev, ...newErrors }));
    if (Object.keys(newErrors).length > 0) {
      const firstMsg = Object.values(newErrors)[0];
      showToast(firstMsg, 'error');
      return false;
    }
    return true;
  };

  const validateAll = () => {
    const e = {};
    for (let s = 1; s <= 5; s += 1) {
      Object.assign(e, collectStepErrors(s));
    }
    setErrors(e);
    const keys = Object.keys(e);
    if (keys.length > 0) {
      const firstField = keys[0];
      setStep(stepForApiField(firstField));
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const suggestCategory = async () => {
    if (!form.title.trim()) {
      showToast('Please enter a project title first', 'error');
      return;
    }
    setSuggestingCategory(true);
    try {
      const res = await jobsAPI.suggestCategory({
        title: form.title,
        description: form.summary || form.fullDescription
      });
      const cats = res.data?.data?.categories || [];
      setCategorySuggestions(cats);
      if (cats.length > 0) {
        updateForm({ category: cats[0] });
        clearError('category');
        showToast(`AI suggested category: ${cats[0]}`);
      }
    } catch {
      showToast('Could not fetch suggestions', 'error');
    } finally {
      setSuggestingCategory(false);
    }
  };

  const suggestSubcategory = async () => {
    if (!form.category) {
      showToast('Select a category first', 'error');
      return;
    }
    setSuggestingSubcategory(true);
    try {
      const res = await jobsAPI.suggestSubcategory({
        category: form.category,
        title: form.title
      });
      const subs = res.data?.data?.subcategories || [];
      setSubcategorySuggestions(subs);
      if (subs.length > 0) {
        updateForm({ subcategory: subs[0] });
        showToast(`AI suggested subcategory: ${subs[0]}`);
      }
    } catch {
      showToast('Could not fetch subcategories', 'error');
    } finally {
      setSuggestingSubcategory(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const MAX_DOCS = 5;
    if (form.attachments.documents.length + files.length > MAX_DOCS) {
      showToast(`You can attach up to ${MAX_DOCS} documents.`, 'error');
      e.target.value = '';
      return;
    }

    setSaving(true);
    clearError('attachments');
    try {
      const docs = [];
      const docTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      for (const file of files) {
        const check = validateFile(file, { maxSizeMB: 10, allowedTypes: docTypes });
        if (!check.valid) {
          showToast(`${file.name}: ${check.error}`, 'error');
          continue;
        }
        const uploaded = await uploadJobAttachment(file);
        docs.push({
          url: uploaded.url,
          name: uploaded.name || file.name,
          mimeType: uploaded.mimeType || file.type
        });
      }

      if (docs.length) {
        updateForm({
          attachments: {
            ...form.attachments,
            documents: [...form.attachments.documents, ...docs]
          }
        });
        showToast(`${docs.length} document(s) uploaded successfully!`);
      }
    } catch (error) {
      setErrors((prev) => ({ ...prev, attachments: 'Failed to upload documents' }));
      showToast(error.response?.data?.message || 'Failed to upload documents', 'error');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const MAX_IMAGES = 5;
    if (form.attachments.images.length + files.length > MAX_IMAGES) {
      showToast(`You can upload up to ${MAX_IMAGES} images.`, 'error');
      e.target.value = '';
      return;
    }

    setSaving(true);
    try {
      const images = [];
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

      for (const file of files) {
        const check = validateFile(file, { maxSizeMB: 5, allowedTypes: imageTypes });
        if (!check.valid) {
          showToast(`${file.name}: ${check.error}`, 'error');
          continue;
        }
        const uploaded = await uploadJobAttachment(file);
        images.push(uploaded.url);
      }

      if (images.length) {
        updateForm({
          attachments: {
            ...form.attachments,
            images: [...form.attachments.images, ...images]
          }
        });
        showToast(`${images.length} image(s) uploaded successfully!`);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to upload images', 'error');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const publish = async (isDraft = false) => {
    if (!isDraft && !validateAll()) {
      showToast('Please fix the highlighted fields before publishing.', 'error');
      return;
    }

    setSaving(true);
    try {
      const description = (form.fullDescription || form.summary || '').trim();
      const allAttachments = [
        ...form.attachments.images.map(attachmentUrl).filter(Boolean),
        ...form.attachments.documents.map(attachmentUrl).filter(Boolean)
      ];

      const payload = {
        title: form.title.trim(),
        description,
        category: form.category,
        subcategory: form.subcategory.trim(),
        skills: form.skills,
        experienceLevel: form.experienceLevel.toLowerCase(),
        budget: {
          min: Number(form.budget.min) || 1,
          max: Number(form.budget.max) || 1,
          type: form.projectType
        },
        duration: form.duration,
        deadline: form.deadline || null,
        status: isDraft ? 'draft' : 'open',
        attachments: allAttachments
      };

      await jobsAPI.createJob(payload);
      showToast(isDraft ? 'Project saved as draft!' : 'Project published successfully!');
      await fetchProfile();
      navigate('/client/projects');
    } catch (error) {
      console.error('Publish failed:', error);
      const apiErrors = error.response?.data?.errors;
      if (apiErrors?.length) {
        const firstMsg = apiErrors[0]?.message || 'Validation failed';
        showToast(firstMsg, 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to publish project', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fl-wizard-page">
      {/* ─── Breadcrumb & Top Bar ─── */}
      <div className="fl-wizard-top">
        <nav className="fl-wizard-breadcrumb" aria-label="Breadcrumb">
          <Link to="/client/dashboard">Dashboard</Link>
          <span className="fl-wizard-breadcrumb__sep">/</span>
          <Link to="/client/projects">My Projects</Link>
          <span className="fl-wizard-breadcrumb__sep">/</span>
          <span className="fl-wizard-breadcrumb__curr">Create Project</span>
        </nav>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="fl-wizard-title">Create New Project</h1>
            <p className="fl-wizard-subtitle">
              Define your project requirements, deliverables, budget, and timeline to hire verified freelancers with milestone escrow.
            </p>
          </div>
          <button
            type="button"
            className="fl-top-preview-trigger"
            onClick={() => setPreviewDrawerOpen(true)}
          >
            <Eye size={15} />
            <span>Live Freelancer Preview</span>
          </button>
        </div>
      </div>

      {/* ─── Horizontal Stepper Card ─── */}
      <div className="fl-stepper-horizontal-card">
        <div className="fl-stepper-horizontal">
          {STEPS.map((st, idx) => {
            const isDone = idx < step - 1;
            const isCurrent = idx === step - 1;
            const isUpcoming = idx > step - 1;
            return (
              <React.Fragment key={idx}>
                <button
                  type="button"
                  className={`fl-step-node ${isDone ? 'fl-step-node--done' : ''} ${isCurrent ? 'fl-step-node--current' : ''} ${isUpcoming ? 'fl-step-node--upcoming' : ''}`}
                  onClick={() => isDone && setStep(idx + 1)}
                >
                  <div className="fl-step-node__circle">
                    {isDone ? <Check size={16} strokeWidth={3} /> : idx + 1}
                  </div>
                  <div className="fl-step-node__info">
                    <span className="fl-step-node__title">{st.title}</span>
                    <span className="fl-step-node__sub">{st.sub}</span>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="fl-stepper-line">
                    <div className="fl-stepper-line__fill" style={{ width: isDone ? '100%' : '0%' }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile Compact Progress Bar */}
        <div className="fl-stepper-mobile-bar">
          <div className="fl-stepper-mobile-info">
            <span className="fl-stepper-mobile-step">Step {step} of 5</span>
            <span className="fl-stepper-mobile-title">{STEPS[step - 1].title}</span>
          </div>
          <div className="fl-stepper-mobile-track">
            <div className="fl-stepper-mobile-fill" style={{ width: `${(step / 5) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* ─── Main Form Steps ─── */}
      <main className="fl-wizard-form-wrap">
        <div className="fl-step-transition-container" key={step}>

          {/* ═══════════ STEP 1: BASIC INFO ═══════════ */}
          {step === 1 && (
            <div className="fl-step-stack">
              {/* AI Top Strip */}
              <div className="fl-ai-strip">
                <div className="fl-ai-strip__left">
                  <div className="fl-ai-strip__icon">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="fl-ai-strip__title">SkillKart AI Assistant</h4>
                    <p className="fl-ai-strip__sub">
                      Type your title and let AI suggest optimal industry taxonomy, category tags, and verified skills.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="fl-ai-strip__btn"
                  onClick={suggestCategory}
                  disabled={suggestingCategory || !form.title.trim()}
                >
                  <Sparkles size={14} />
                  <span>{suggestingCategory ? 'Analyzing…' : 'Suggest Category'}</span>
                </button>
              </div>

              {/* Section 1: Project Identity */}
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Project Identity</h4>
                  <span className="fl-section-card__hint">How freelancers will discover your job posting</span>
                </div>

                <Field
                  id="pp-title"
                  label="Project Title"
                  required
                  counter={`${form.title.length}/100`}
                  helper="Be specific. State the core goal and deliverable (e.g. 'Build a React & Node.js E-Commerce Web App')."
                  error={errors.title}
                >
                  <Input
                    id="pp-title"
                    maxLength={100}
                    value={form.title}
                    placeholder="e.g. Build a High-Converting SaaS Landing Page in Next.js"
                    onChange={(e) => { updateForm({ title: e.target.value }); clearError('title'); }}
                  />
                </Field>

                <div className="fl-fields-2col">
                  <Field
                    id="pp-category"
                    label="Primary Category"
                    required
                    helper="Broad domain of the project"
                    error={errors.category}
                  >
                    <ComboSelect
                      id="pp-category"
                      options={JOB_CATEGORIES}
                      value={form.category}
                      onChange={(val) => {
                        updateForm({ category: val, subcategory: '' });
                        clearError('category');
                      }}
                      placeholder="Select or search category..."
                      allowFreeText={false}
                      searchable={true}
                    />
                  </Field>

                  <Field
                    id="pp-subcategory"
                    label="Subcategory (Optional)"
                    helper="Specific discipline"
                  >
                    <ComboSelect
                      id="pp-subcategory"
                      options={(GIG_SUBCATEGORIES[form.category] || []).map((s) => ({ value: s, label: s }))}
                      value={form.subcategory}
                      onChange={(val) => updateForm({ subcategory: val })}
                      placeholder="Select or search subcategory (optional)..."
                      allowFreeText={true}
                      searchable={true}
                    />
                  </Field>
                </div>

                {categorySuggestions.length > 0 && (
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
                      AI SUGGESTED CATEGORIES:
                    </span>
                    <div className="fl-cat-chips">
                      {categorySuggestions.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`fl-cat-chip ${form.category === cat ? 'fl-cat-chip--active' : ''}`}
                          onClick={() => { updateForm({ category: cat }); clearError('category'); }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Candidate Requirements & Model */}
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Candidate Requirements & Model</h4>
                  <span className="fl-section-card__hint">Target skills and contract framework</span>
                </div>

                <Field
                  id="pp-skills"
                  label="Required Skills (Press Enter to Add)"
                  required
                  helper="Type a skill and press Enter. Add 2–8 key skills for best matchmaking."
                  error={errors.skills}
                >
                  <TagInput
                    tags={form.skills}
                    onChange={(tags) => { updateForm({ skills: tags }); clearError('skills'); }}
                    placeholder="e.g. React, Tailwind CSS, REST APIs, Figma"
                  />
                </Field>

                <div className="fl-fields-2col">
                  <Field label="Experience Level Required" helper="Desired seniority level">
                    <div className="fl-segmented-row">
                      {['Entry', 'Intermediate', 'Expert'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`fl-segmented-btn ${form.experienceLevel === lvl ? 'fl-segmented-btn--active' : ''}`}
                          onClick={() => updateForm({ experienceLevel: lvl })}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Pricing Framework" helper="Fixed price or hourly contract">
                    <div className="fl-segmented-row">
                      <button
                        type="button"
                        className={`fl-segmented-btn ${form.projectType === 'fixed' ? 'fl-segmented-btn--active' : ''}`}
                        onClick={() => updateForm({ projectType: 'fixed' })}
                      >
                        Fixed Price
                      </button>
                      <button
                        type="button"
                        className={`fl-segmented-btn ${form.projectType === 'hourly' ? 'fl-segmented-btn--active' : ''}`}
                        onClick={() => updateForm({ projectType: 'hourly' })}
                      >
                        Hourly Rate
                      </button>
                    </div>
                  </Field>
                </div>

                <Field
                  id="pp-summary"
                  label="Short Project Summary"
                  required
                  helper="A concise 1-2 sentence overview shown in job search previews."
                  error={errors.summary}
                  action={
                    <AiGenerateText
                      fieldLabel="a one-sentence project brief summary for a client hiring on SkillKart"
                      getContext={() => ({ title: form.title, category: form.category, skills: form.skills })}
                      getExistingText={() => form.summary}
                      onGenerated={(text) => { updateForm({ summary: text }); clearError('summary'); }}
                    />
                  }
                >
                  <Textarea
                    id="pp-summary"
                    rows={2}
                    placeholder="e.g. Looking for a senior React engineer to build and deploy a responsive SaaS dashboard with authentication and Stripe billing."
                    value={form.summary}
                    onChange={(e) => { updateForm({ summary: e.target.value }); clearError('summary'); }}
                  />
                </Field>
              </div>

              {/* In-Card Footer */}
              <div className="fl-card-footer">
                <div className="fl-card-footer__left">
                  <div className="fl-card-footer__hint">
                    <AlertCircle size={15} color="#10B981" />
                    <span>Step 1 of 5: Project foundation ready</span>
                  </div>
                </div>
                <div className="fl-card-footer__right">
                  <button type="button" className="fl-btn-outline-pill" onClick={() => publish(true)} disabled={saving}>
                    <Save size={14} />
                    <span>Save Draft</span>
                  </button>
                  <button type="button" className="fl-btn-navy-pill" onClick={nextStep} disabled={saving}>
                    <span>Next: Budget & Timeline</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 2: BUDGET & TIMELINE ═══════════ */}
          {step === 2 && (
            <div className="fl-step-stack">
              {/* Cost Estimator Strip */}
              <div className="fl-ai-strip fl-ai-strip--tip">
                <div className="fl-ai-strip__left">
                  <div className="fl-ai-strip__icon">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <h4 className="fl-ai-strip__title">SkillKart Cost Estimator</h4>
                    <p className="fl-ai-strip__sub">
                      Unsure what to budget? Use our interactive AI cost calculator to inspect standard market rates for {form.category || 'tech'} projects.
                    </p>
                  </div>
                </div>
                <a
                  href="/ai/cost-estimator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fl-ai-strip__btn"
                  onClick={(e) => {
                    if (isMobileApp()) {
                      e.preventDefault();
                      openExternal('https://skillkart-fuuast.vercel.app/ai/cost-estimator');
                    }
                  }}
                >
                  <span>Open Estimator</span>
                  <ArrowRight size={13} />
                </a>
              </div>

              {/* Section 1: Budget Specification */}
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Budget Range</h4>
                  <span className="fl-section-card__hint">State your anticipated investment (PKR)</span>
                </div>

                <div className="fl-fields-2col">
                  <Field
                    id="pp-budget-min"
                    label="Minimum Budget"
                    required
                    prefix="Rs."
                    helper="Starting project range"
                    error={errors.budgetMin}
                  >
                    <Input
                      id="pp-budget-min"
                      type="number"
                      min={1}
                      hasPrefix
                      value={form.budget.min}
                      onChange={(e) => {
                        updateForm({ budget: { ...form.budget, min: Number(e.target.value) } });
                        clearError('budgetMin');
                      }}
                    />
                  </Field>

                  <Field
                    id="pp-budget-max"
                    label="Maximum Budget"
                    required
                    prefix="Rs."
                    helper="Cap limit for proposals"
                    error={errors.budgetMax}
                  >
                    <Input
                      id="pp-budget-max"
                      type="number"
                      min={1}
                      hasPrefix
                      value={form.budget.max}
                      onChange={(e) => {
                        updateForm({ budget: { ...form.budget, max: Number(e.target.value) } });
                        clearError('budgetMax');
                      }}
                    />
                  </Field>
                </div>
              </div>

              {/* Section 2: Timeline & Milestones */}
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Timeline & Escrow Protection</h4>
                  <span className="fl-section-card__hint">Delivery schedule & milestone assurance</span>
                </div>

                <div className="fl-fields-2col">
                  <Field id="pp-duration" label="Estimated Project Duration" helper="Expected turnaround time">
                    <CustomSelect
                      id="pp-duration"
                      options={[
                        'Less than 1 week',
                        '1-4 weeks',
                        '1-3 months',
                        '3-6 months',
                        'More than 6 months'
                      ]}
                      value={form.duration}
                      onChange={(val) => updateForm({ duration: val })}
                      placeholder="Select duration..."
                    />
                  </Field>

                  <Field
                    id="pp-deadline"
                    label="Application Deadline"
                    required
                    helper="Last date to receive proposals"
                    error={errors.deadline}
                  >
                    <Input
                      id="pp-deadline"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={form.deadline}
                      onChange={(e) => { updateForm({ deadline: e.target.value }); clearError('deadline'); }}
                    />
                  </Field>
                </div>

                {/* Milestone Guarantee Banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #EAFBF4 0%, #F0FDF4 100%)',
                  border: '1px solid #A7F3D0'
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#10B981',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#065F46' }}>
                      Milestone Escrow Guaranteed
                    </h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#047857', lineHeight: 1.4 }}>
                      Posting is 100% free. Once you award this contract, funds remain locked in SkillKart escrow and are released only when deliverables are approved.
                    </p>
                  </div>
                </div>
              </div>

              {/* In-Card Footer */}
              <div className="fl-card-footer">
                <div className="fl-card-footer__left">
                  <button type="button" className="fl-btn-ghost-pill" onClick={prevStep}>
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                  <div className="fl-card-footer__hint">
                    <AlertCircle size={15} color="#10B981" />
                    <span>Budget & milestones configured</span>
                  </div>
                </div>
                <div className="fl-card-footer__right">
                  <button type="button" className="fl-btn-outline-pill" onClick={() => publish(true)} disabled={saving}>
                    <Save size={14} />
                    <span>Save Draft</span>
                  </button>
                  <button type="button" className="fl-btn-navy-pill" onClick={nextStep} disabled={saving}>
                    <span>Next: Project Scope</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 3: PROJECT SCOPE ═══════════ */}
          {step === 3 && (
            <div className="fl-step-stack">
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Scope & Specifications</h4>
                  <span className="fl-section-card__hint">Comprehensive requirements for bidding freelancers</span>
                </div>

                <Field
                  id="pp-fulldesc"
                  label="Detailed Project Description"
                  required
                  helper="Detail the problems you need solved, tech stack requirements, and success metrics."
                  error={errors.fullDescription}
                  action={
                    <AiGenerateText
                      fieldLabel="a full, professional freelance project description detailing background, goals, deliverables, and technical criteria"
                      getContext={() => ({ title: form.title, category: form.category, skills: form.skills })}
                      getExistingText={() => form.fullDescription}
                      onGenerated={(text) => { updateForm({ fullDescription: text }); clearError('fullDescription'); }}
                    />
                  }
                >
                  <Textarea
                    id="pp-fulldesc"
                    rows={6}
                    placeholder="Provide a full overview of your project requirements, target audience, deliverables, and expectations..."
                    value={form.fullDescription}
                    onChange={(e) => { updateForm({ fullDescription: e.target.value }); clearError('fullDescription'); }}
                  />
                </Field>

                <div className="fl-fields-2col">
                  <Field
                    id="pp-resp"
                    label="Key Responsibilities (Optional)"
                    helper="What the freelancer will handle daily"
                  >
                    <Textarea
                      id="pp-resp"
                      rows={4}
                      placeholder="• Develop reusable React components&#10;• Optimize API query speeds&#10;• Provide weekly sprint updates"
                      value={form.responsibilities}
                      onChange={(e) => updateForm({ responsibilities: e.target.value })}
                    />
                  </Field>

                  <Field
                    id="pp-deliv"
                    label="Expected Deliverables (Optional)"
                    helper="Exact handover items required"
                  >
                    <Textarea
                      id="pp-deliv"
                      rows={4}
                      placeholder="• Clean GitHub repository & documentation&#10;• Figma UI/UX source file&#10;• Deployment on Vercel/AWS"
                      value={form.deliverables}
                      onChange={(e) => updateForm({ deliverables: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              {/* In-Card Footer */}
              <div className="fl-card-footer">
                <div className="fl-card-footer__left">
                  <button type="button" className="fl-btn-ghost-pill" onClick={prevStep}>
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                  <div className="fl-card-footer__hint">
                    <AlertCircle size={15} color="#10B981" />
                    <span>Scope & deliverables specified</span>
                  </div>
                </div>
                <div className="fl-card-footer__right">
                  <button type="button" className="fl-btn-outline-pill" onClick={() => publish(true)} disabled={saving}>
                    <Save size={14} />
                    <span>Save Draft</span>
                  </button>
                  <button type="button" className="fl-btn-navy-pill" onClick={nextStep} disabled={saving}>
                    <span>Next: Media & Docs</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 4: MEDIA & DOCS ═══════════ */}
          {step === 4 && (
            <div className="fl-step-stack">
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Project Documentation & Specs</h4>
                  <span className="fl-section-card__hint">Upload PRDs, wireframes, or reference materials (Max 5 files)</span>
                </div>

                <div
                  className="fl-upload-zone"
                  onClick={() => documentsRef.current?.click()}
                >
                  <Folder size={32} color="#10B981" />
                  <strong style={{ fontSize: 14.5, color: '#0B2942' }}>Click to upload project documents</strong>
                  <span style={{ fontSize: 12, color: '#64748B' }}>PDF, DOCX, TXT files up to 10MB each</span>
                  <input
                    ref={documentsRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                    onChange={handleDocumentUpload}
                  />
                </div>

                {form.attachments.documents.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {form.attachments.documents.map((doc, idx) => (
                      <div key={idx} className="fl-attach-item">
                        <FileText size={16} color="#10B981" />
                        <span className="fl-attach-item__name">{attachmentName(doc, idx)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateForm({
                              attachments: {
                                ...form.attachments,
                                documents: form.attachments.documents.filter((_, i) => i !== idx)
                              }
                            });
                          }}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                          aria-label="Remove document"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Mockups */}
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Design Mockups & Screenshots</h4>
                  <span className="fl-section-card__hint">Visual references (PNG, JPG, WebP)</span>
                </div>

                <div
                  className="fl-upload-zone"
                  onClick={() => bannerRef.current?.click()}
                >
                  <Upload size={32} color="#10B981" />
                  <strong style={{ fontSize: 14.5, color: '#0B2942' }}>Click to upload image mockups</strong>
                  <span style={{ fontSize: 12, color: '#64748B' }}>PNG, JPG, or WEBP up to 5MB</span>
                  <input
                    ref={bannerRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                </div>

                {form.attachments.images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginTop: 12 }}>
                    {form.attachments.images.map((imgUrl, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0', aspectRatio: '16/9' }}>
                        <img src={imgUrl} alt={`Upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => {
                            updateForm({
                              attachments: {
                                ...form.attachments,
                                images: form.attachments.images.filter((_, i) => i !== idx)
                              }
                            });
                          }}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#EF4444',
                            color: '#FFFFFF',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          aria-label="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In-Card Footer */}
              <div className="fl-card-footer">
                <div className="fl-card-footer__left">
                  <button type="button" className="fl-btn-ghost-pill" onClick={prevStep}>
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                  <div className="fl-card-footer__hint">
                    <AlertCircle size={15} color="#10B981" />
                    <span>Media & files attached</span>
                  </div>
                </div>
                <div className="fl-card-footer__right">
                  <button type="button" className="fl-btn-outline-pill" onClick={() => publish(true)} disabled={saving}>
                    <Save size={14} />
                    <span>Save Draft</span>
                  </button>
                  <button type="button" className="fl-btn-navy-pill" onClick={nextStep} disabled={saving}>
                    <span>Next: Review & Publish</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 5: REVIEW & PUBLISH ═══════════ */}
          {step === 5 && (
            <div className="fl-step-stack">
              {/* Review Hero Banner */}
              <div className="fl-review-hero">
                <div className="fl-review-hero__top">
                  <span className="fl-review-hero__tag">
                    {form.category} {form.subcategory ? `• ${form.subcategory}` : ''}
                  </span>
                  <span style={{ fontSize: 12, color: '#A7F3D0', fontWeight: 600 }}>Ready to Publish</span>
                </div>
                <h3 className="fl-review-hero__title">
                  {form.title || 'Untitled Project Brief'}
                </h3>
                <div className="fl-review-hero__pills">
                  <span className="fl-review-pill fl-review-pill--emerald">
                    Rs. {Number(form.budget.min || 0).toLocaleString()} – Rs. {Number(form.budget.max || 0).toLocaleString()}
                  </span>
                  <span className="fl-review-pill">
                    <Clock size={13} style={{ color: '#A7F3D0' }} />
                    {form.duration}
                  </span>
                  <span className="fl-review-pill">
                    <Layers size={13} style={{ color: '#A7F3D0' }} />
                    {form.experienceLevel} Level
                  </span>
                  <span className="fl-review-pill">
                    <Calendar size={13} style={{ color: '#A7F3D0' }} />
                    Deadline: {form.deadline || 'None'}
                  </span>
                </div>
              </div>

              {/* Review Details Card */}
              <div className="fl-section-card">
                <div className="fl-section-card__header">
                  <h4 className="fl-section-card__title">Project Overview & Deliverables</h4>
                  <span className="fl-section-card__hint">How candidates will review your scope</span>
                </div>

                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Required Skills
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {form.skills.map((s) => (
                      <span key={s} style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: '#EAFBF4',
                        color: '#065F46',
                        fontSize: 12,
                        fontWeight: 700,
                        border: '1px solid #A7F3D0'
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Summary
                  </h5>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                    {form.summary}
                  </p>
                </div>

                {form.fullDescription && (
                  <div>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                      Full Specifications
                    </h5>
                    <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {form.fullDescription}
                    </p>
                  </div>
                )}

                {/* Terms Acceptance */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <input
                    type="checkbox"
                    id="pp-terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#10B981', cursor: 'pointer' }}
                  />
                  <label htmlFor="pp-terms" style={{ fontSize: 13, color: '#0B2942', fontWeight: 600, cursor: 'pointer' }}>
                    I understand that contract escrow deposits are required upon hiring, and funds are released only when deliverables are verified.
                  </label>
                </div>
              </div>

              {/* In-Card Footer */}
              <div className="fl-card-footer">
                <div className="fl-card-footer__left">
                  <button type="button" className="fl-btn-ghost-pill" onClick={prevStep}>
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                  <div className="fl-card-footer__hint">
                    <CheckCircle2 size={15} color="#10B981" />
                    <span>Review complete. Ready to publish!</span>
                  </div>
                </div>
                <div className="fl-card-footer__right">
                  <button type="button" className="fl-btn-outline-pill" onClick={() => publish(true)} disabled={saving}>
                    <Save size={14} />
                    <span>Save as Draft</span>
                  </button>
                  <button type="button" className="fl-btn-publish-pill" onClick={() => publish(false)} disabled={saving || !termsAccepted}>
                    <Send size={16} />
                    <span>{saving ? 'Publishing…' : 'Publish Project Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── Slide-Over Live Preview Drawer ─── */}
      {previewDrawerOpen && (
        <div className="fl-preview-drawer-backdrop" onClick={() => setPreviewDrawerOpen(false)}>
          <div className="fl-preview-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="fl-preview-drawer__header">
              <h4 className="fl-preview-drawer__title">Live Freelancer Preview</h4>
              <button
                type="button"
                className="fl-preview-drawer__close"
                onClick={() => setPreviewDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="fl-preview-drawer__body">
              <p className="fl-preview-drawer__note">
                This is an exact preview of how freelancers on SkillKart will view your job listing.
              </p>

              {/* Mock Job Card */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: 18,
                border: '1.5px solid #E2E8F0',
                padding: 20,
                boxShadow: '0 4px 18px rgba(11, 41, 66, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                    {form.category} {form.subcategory ? `• ${form.subcategory}` : ''}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>Just now</span>
                </div>

                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0B2942' }}>
                  {form.title || 'Untitled Project Brief'}
                </h4>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#065F46', background: '#EAFBF4', padding: '3px 8px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
                    Rs. {Number(form.budget.min || 0).toLocaleString()} – Rs. {Number(form.budget.max || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
                    {form.duration}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
                    {form.experienceLevel}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                  {form.summary || 'Summary will appear here...'}
                </p>

                {form.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {form.skills.map((s) => (
                      <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostProject;
