import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { jobsAPI } from '../../api/jobs';
import { uploadJobAttachment, validateFile } from '../../utils/uploadHelper';
import { JOB_CATEGORIES } from '../../constants/jobCategories';
import Stepper from '../freelancer/components/Stepper';
import TagInput from '../../Components/common/TagInput/TagInput';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import './ClientDashboard.css';
import './PostProject.css';

const STEPS = ['Basic Info', 'Budget & Timeline', 'Description', 'Media', 'Publish'];

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

const FieldError = ({ message }) =>
  message ? <span className="cl-error">⚠ {message}</span> : null;

const attachmentUrl = (item) => (typeof item === 'string' ? item : item?.url);

const attachmentName = (item, index) =>
  (typeof item === 'object' && item?.name) ? item.name : `Document ${index + 1}`;

// Consume a brief drafted on the public Post-a-Project page (saved before sign-in).
// Returns partial form overrides, or null. Clears the draft once read.
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
  const [errors, setErrors] = useState({});

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
    milestones: false,
    fullDescription: '',
    responsibilities: '',
    deliverables: '',
    referenceLinks: [],
    faqs: [],
    attachments: { images: [], documents: [], links: [] },
    // Prefill from a public "Post a Project" brief if the user just signed up
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
    const descriptionText = (form.fullDescription || form.summary || '').trim();

    if (stepNum === 1) {
      if (!form.title.trim()) e.title = 'Project title is required';
      else if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
      if (!JOB_CATEGORIES.includes(form.category)) e.category = 'Please select a valid category';
      if (!form.skills.length) e.skills = 'Add at least one required skill';
      if (!form.summary.trim()) e.summary = 'Short summary is required';
    }
    if (stepNum === 2) {
      if (form.budget.min < 0) e.budgetMin = 'Minimum budget must be zero or more';
      if (form.budget.max < form.budget.min) e.budgetMax = 'Maximum budget must be greater than or equal to minimum';
      if (form.deadline) {
        const d = new Date(form.deadline);
        if (Number.isNaN(d.getTime()) || d <= new Date()) e.deadline = 'Deadline must be a future date';
      }
    }
    if (stepNum === 3) {
      if (descriptionText.length < 50) {
        e.fullDescription = 'Full description must be at least 50 characters (or expand your summary)';
      }
    }
    return e;
  };

  const validateStep = (stepNum) => {
    const e = collectStepErrors(stepNum);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(STEP_FOR_FIELD).forEach((k) => {
        if (STEP_FOR_FIELD[k] === stepNum) delete next[k];
      });
      return { ...next, ...e };
    });
    return Object.keys(e).length === 0;
  };

  const validateAll = () => {
    const merged = { ...collectStepErrors(1), ...collectStepErrors(2), ...collectStepErrors(3) };
    setErrors(merged);
    if (Object.keys(merged).length === 0) return true;
    const firstKey = Object.keys(merged)[0];
    setStep(STEP_FOR_FIELD[firstKey] || 1);
    return false;
  };

  const applyApiErrors = (apiErrors) => {
    if (!Array.isArray(apiErrors) || !apiErrors.length) return;

    const mapped = {};
    apiErrors.forEach(({ field, message }) => {
      const key = mapApiFieldToForm(field);
      mapped[key] = message;
    });

    setErrors((prev) => ({ ...prev, ...mapped }));

    const firstField = apiErrors[0]?.field;
    const targetStep = stepForApiField(firstField);
    setStep(targetStep);
  };

  const suggestCategory = async () => {
    const description = [form.summary, form.fullDescription].filter(Boolean).join('\n');
    if (!form.title.trim() && !description.trim() && !form.skills.length) {
      showToast('Add a title, summary, or skills before requesting a suggestion.', 'error');
      return;
    }

    setSuggestingCategory(true);
    try {
      const res = await jobsAPI.recommendCategory({
        title: form.title,
        description,
        skills: form.skills
      });
      const { category, suggestions } = res.data?.data || {};
      if (category && JOB_CATEGORIES.includes(category)) {
        updateForm({ category });
        clearError('category');
      }
      const validSuggestions = (suggestions || []).filter((s) => JOB_CATEGORIES.includes(s));
      setCategorySuggestions(validSuggestions);
      showToast('Category suggestion applied. You can change it if needed.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not suggest category', 'error');
    } finally {
      setSuggestingCategory(false);
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      showToast('Please fix the errors below before continuing.', 'error');
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const addFaq = () => updateForm({ faqs: [...form.faqs, { question: '', answer: '' }] });
  const removeFaq = (i) => updateForm({ faqs: form.faqs.filter((_, idx) => idx !== i) });
  const updateFaq = (i, field, val) => {
    const newFaqs = [...form.faqs];
    newFaqs[i][field] = val;
    updateForm({ faqs: newFaqs });
  };

  const addRefLink = () => updateForm({ referenceLinks: [...form.referenceLinks, ''] });
  const removeRefLink = (i) => updateForm({ referenceLinks: form.referenceLinks.filter((_, idx) => idx !== i) });
  const updateRefLink = (i, val) => {
    const newLinks = [...form.referenceLinks];
    newLinks[i] = val;
    updateForm({ referenceLinks: newLinks });
  };

  const MAX_IMAGES = 5;
  const MAX_DOCS = 5;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (form.attachments.images.length + files.length > MAX_IMAGES) {
      showToast(`You can attach up to ${MAX_IMAGES} images.`, 'error');
      e.target.value = '';
      return;
    }

    setSaving(true);
    clearError('attachments');
    try {
      const urls = [];
      for (const file of files) {
        const check = validateFile(file, { maxSizeMB: 5, allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] });
        if (!check.valid) {
          showToast(check.error, 'error');
          continue;
        }
        const uploaded = await uploadJobAttachment(file);
        urls.push(uploaded.url);
      }
      if (urls.length) {
        updateForm({
          attachments: {
            ...form.attachments,
            images: [...form.attachments.images, ...urls]
          }
        });
        showToast(`${urls.length} image(s) uploaded successfully!`);
      }
    } catch (error) {
      setErrors((prev) => ({ ...prev, attachments: 'Failed to upload images' }));
      showToast(error.response?.data?.message || 'Failed to upload images', 'error');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

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
        skills: form.skills,
        experienceLevel: form.experienceLevel.toLowerCase(),
        budget: {
          min: form.budget.min,
          max: form.budget.max,
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
        applyApiErrors(apiErrors);
        const firstMsg = apiErrors[0]?.message || 'Validation failed';
        showToast(firstMsg, 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to publish project', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 1: Basic Information</h3>
            <div className="cl-form-grid">
              <div className="cl-form-group full">
                <label className="cl-label">Project Title *</label>
                <input
                  type="text"
                  className={`cl-input${errors.title ? ' cl-input--error' : ''}`}
                  placeholder="e.g. Build a Modern Landing Page for Tech Startup"
                  value={form.title}
                  onChange={(e) => { updateForm({ title: e.target.value }); clearError('title'); }}
                />
                <FieldError message={errors.title} />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Category *</label>
                <TagInput
                  tags={form.category ? [form.category] : []}
                  onChange={(tags) => {
                    updateForm({ category: tags[0] || '' });
                    clearError('category');
                  }}
                  options={JOB_CATEGORIES}
                  maxTags={1}
                  placeholder="Type to search categories…"
                  showHint={false}
                  hintText="Type to filter, pick from the list, or press Enter. Use AI suggest below."
                />
                <FieldError message={errors.category} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className={`cl-btn cl-btn--ghost cl-btn--sm${suggestingCategory ? ' cl-btn--loading' : ''}`}
                    onClick={suggestCategory}
                    disabled={suggestingCategory || saving}
                  >
                    {suggestingCategory ? 'Analyzing…' : '✨ Suggest category (AI)'}
                  </button>
                </div>
                {categorySuggestions.length > 0 && (
                  <div className="cl-category-suggestions">
                    <span className="cl-label" style={{ marginBottom: '0.35rem', display: 'block' }}>Suggested:</span>
                    {categorySuggestions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`cl-btn cl-btn--sm ${form.category === cat ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                        onClick={() => { updateForm({ category: cat }); clearError('category'); }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Subcategory</label>
                <input
                  type="text"
                  className="cl-input"
                  placeholder="e.g. Frontend Development"
                  value={form.subcategory}
                  onChange={(e) => updateForm({ subcategory: e.target.value })}
                />
              </div>
              <div className="cl-form-group full">
                <label className="cl-label">Required Skills (press Enter) *</label>
                <TagInput
                  tags={form.skills}
                  onChange={(tags) => { updateForm({ skills: tags }); clearError('skills'); }}
                  placeholder="e.g. React, CSS, Figma"
                />
                <FieldError message={errors.skills} />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Experience Level Required</label>
                <CustomSelect
                  options={['Entry', 'Intermediate', 'Expert']}
                  value={form.experienceLevel}
                  onChange={(val) => updateForm({ experienceLevel: val })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Project Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className={`cl-btn cl-btn--sm ${form.projectType === 'fixed' ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                    onClick={() => updateForm({ projectType: 'fixed' })}
                  >Fixed Price</button>
                  <button
                    type="button"
                    className={`cl-btn cl-btn--sm ${form.projectType === 'hourly' ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                    onClick={() => updateForm({ projectType: 'hourly' })}
                  >Hourly Rate</button>
                </div>
              </div>
              <div className="cl-form-group full">
                <label className="cl-label">Short Summary *</label>
                <textarea
                  className={`cl-textarea${errors.summary ? ' cl-input--error' : ''}`}
                  placeholder="A one-sentence summary for project listings..."
                  value={form.summary}
                  onChange={(e) => { updateForm({ summary: e.target.value }); clearError('summary'); }}
                  style={{ minHeight: '60px' }}
                />
                <FieldError message={errors.summary} />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 2: Budget & Timeline</h3>
            <a
              href="/ai/cost-estimator"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem',
                fontSize: '0.82rem', fontWeight: 700, color: '#4338ca', textDecoration: 'none',
                background: '#eef2ff', padding: '6px 12px', borderRadius: '8px',
              }}
            >
              🤖 Not sure what to pay? Estimate a fair budget →
            </a>
            <div className="cl-form-grid">
              <div className="cl-form-group">
                <label className="cl-label">Minimum Budget ($)</label>
                <input
                  type="number"
                  className={`cl-input${errors.budgetMin ? ' cl-input--error' : ''}`}
                  value={form.budget.min}
                  onChange={(e) => {
                    updateForm({ budget: { ...form.budget, min: Number(e.target.value) } });
                    clearError('budgetMin');
                  }}
                />
                <FieldError message={errors.budgetMin} />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Maximum Budget ($)</label>
                <input
                  type="number"
                  className={`cl-input${errors.budgetMax ? ' cl-input--error' : ''}`}
                  value={form.budget.max}
                  onChange={(e) => {
                    updateForm({ budget: { ...form.budget, max: Number(e.target.value) } });
                    clearError('budgetMax');
                  }}
                />
                <FieldError message={errors.budgetMax} />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Project Duration</label>
                <CustomSelect
                  options={['Less than 1 month', '1-3 months', '3-6 months', 'More than 6 months']}
                  value={form.duration}
                  onChange={(val) => updateForm({ duration: val })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Proposed Deadline</label>
                <input
                  type="date"
                  className={`cl-input${errors.deadline ? ' cl-input--error' : ''}`}
                  value={form.deadline}
                  onChange={(e) => { updateForm({ deadline: e.target.value }); clearError('deadline'); }}
                />
                <FieldError message={errors.deadline} />
              </div>

            </div>
          </div>
        );
      case 3:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 3: Detailed Description</h3>
            <div className="cl-form-group full" style={{ marginBottom: '1rem' }}>
              <label className="cl-label">Full Project Description * (min. 50 characters)</label>
              <textarea
                className={`cl-textarea${errors.fullDescription ? ' cl-input--error' : ''}`}
                placeholder="Include background, goals, and technical requirements..."
                value={form.fullDescription}
                onChange={(e) => { updateForm({ fullDescription: e.target.value }); clearError('fullDescription'); }}
              />
              <FieldError message={errors.fullDescription} />
            </div>
            <div className="cl-form-grid">
              <div className="cl-form-group">
                <label className="cl-label">Key Responsibilities</label>
                <textarea
                  className="cl-textarea"
                  placeholder="What will the freelancer do?"
                  value={form.responsibilities}
                  onChange={(e) => updateForm({ responsibilities: e.target.value })}
                  style={{ minHeight: '80px' }}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Deliverables</label>
                <textarea
                  className="cl-textarea"
                  placeholder="What will be the final output?"
                  value={form.deliverables}
                  onChange={(e) => updateForm({ deliverables: e.target.value })}
                  style={{ minHeight: '80px' }}
                />
              </div>
            </div>

            <div className="cl-divider" />
            <h4 className="cl-label" style={{ marginBottom: '1rem' }}>Reference Links</h4>
            {form.referenceLinks.map((link, i) => (
              <div key={i} className="cl-link-row">
                <input
                  type="url"
                  className="cl-input"
                  value={link}
                  placeholder="https://..."
                  onChange={(e) => updateRefLink(i, e.target.value)}
                />
                <button type="button" className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => removeRefLink(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="cl-btn cl-btn--ghost cl-btn--sm" onClick={addRefLink}>＋ Add Link</button>

            <div className="cl-divider" />
            <h4 className="cl-label" style={{ marginBottom: '1rem' }}>Frequently Asked Questions</h4>
            {form.faqs.map((faq, i) => (
              <div key={i} className="cl-faq-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="cl-label">Question {i + 1}</span>
                  <button type="button" className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => removeFaq(i)}>✕</button>
                </div>
                <input
                  className="cl-input"
                  style={{ marginBottom: '0.5rem' }}
                  value={faq.question}
                  placeholder="Question..."
                  onChange={(e) => updateFaq(i, 'question', e.target.value)}
                />
                <textarea
                  className="cl-textarea"
                  style={{ minHeight: '60px' }}
                  value={faq.answer}
                  placeholder="Answer..."
                  onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                />
              </div>
            ))}
            <button type="button" className="cl-btn cl-btn--ghost cl-btn--sm" onClick={addFaq}>＋ Add FAQ</button>
          </div>
        );
      case 4:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 4: Attachments</h3>
            <FieldError message={errors.attachments} />
            <div className="cl-upload-section">
              <label className="cl-label">Project Images</label>
              <div className="cl-upload-zone" onClick={() => !saving && bannerRef.current?.click()}>
                <div className="cl-upload-zone__placeholder">
                  <span>📸</span>
                  <p>Click to upload project-related images or screenshots</p>
                  <small>JPG, PNG up to 5MB</small>
                </div>
                <input ref={bannerRef} type="file" multiple hidden accept="image/*" onChange={handleImageUpload} />
              </div>

              {form.attachments.images.length > 0 && (
                <div className="cl-images-grid">
                  {form.attachments.images.map((img, i) => (
                    <div key={i} className="cl-image-thumb">
                      <img src={img} alt="upload" />
                      <button
                        type="button"
                        className="cl-image-thumb__remove"
                        onClick={() => {
                          const newImgs = form.attachments.images.filter((_, idx) => idx !== i);
                          updateForm({ attachments: { ...form.attachments, images: newImgs } });
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cl-divider" />
            <div className="cl-upload-section">
              <label className="cl-label">Project Documents</label>
              <div
                className="cl-upload-zone"
                style={{ minHeight: '100px' }}
                onClick={() => !saving && documentsRef.current?.click()}
              >
                <div className="cl-upload-zone__placeholder">
                  <span>📁</span>
                  <p>Click to upload briefs, specs, or reference files</p>
                  <small>PDF, DOC, DOCX, TXT up to 10MB</small>
                </div>
                <input
                  ref={documentsRef}
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleDocumentUpload}
                />
              </div>

              {form.attachments.documents.length > 0 && (
                <ul className="cl-doc-list">
                  {form.attachments.documents.map((doc, i) => {
                    const url = attachmentUrl(doc);
                    const label = attachmentName(doc, i);
                    const isPdf = /\.pdf($|\?)/i.test(url) || (doc.mimeType === 'application/pdf');
                    return (
                      <li key={`${url}-${i}`} className="cl-doc-list__item">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cl-doc-list__link"
                          title={label}
                        >
                          {label}
                        </a>
                        <div className="cl-doc-list__actions">
                          <button
                            type="button"
                            className="cl-btn cl-btn--ghost cl-btn--sm"
                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                          >
                            Open
                          </button>
                          {isPdf && (
                            <a
                              href={url}
                              download={label}
                              className="cl-btn cl-btn--ghost cl-btn--sm"
                              style={{ textDecoration: 'none' }}
                            >
                              Download
                            </a>
                          )}
                          <button
                            type="button"
                            className="cl-btn cl-btn--ghost cl-btn--sm"
                            onClick={() => {
                              const docs = form.attachments.documents.filter((_, idx) => idx !== i);
                              updateForm({ attachments: { ...form.attachments, documents: docs } });
                            }}
                          >✕</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 5: Review & Publish</h3>
            <div className="cl-review-section">
              <div className="cl-review-header">
                <h4 className="cl-review-title">{form.title || 'Untitled Project'}</h4>
                <p className="cl-review-meta">{form.category} · {form.subcategory || '—'}</p>
              </div>

              <div className="cl-review-grid">
                <div className="cl-review-item">
                  <span className="cl-review-label">Type</span>
                  <span className="cl-review-value">{form.projectType === 'fixed' ? 'Fixed Price' : 'Hourly rate'}</span>
                </div>
                <div className="cl-review-item">
                  <span className="cl-review-label">Budget</span>
                  <span className="cl-review-value">${form.budget.min} – ${form.budget.max}</span>
                </div>
                <div className="cl-review-item">
                  <span className="cl-review-label">Duration</span>
                  <span className="cl-review-value">{form.duration}</span>
                </div>
                <div className="cl-review-item">
                  <span className="cl-review-label">Experience</span>
                  <span className="cl-review-value">{form.experienceLevel}</span>
                </div>
              </div>

              <div className="cl-review-details">
                <p className="cl-review-label">Description Preview</p>
                <p className="cl-review-text">
                  {(form.fullDescription || form.summary || 'No description yet').slice(0, 250)}
                  {(form.fullDescription || form.summary || '').length > 250 ? '…' : ''}
                </p>
              </div>

              <div className="cl-review-details">
                <p className="cl-review-label">Skills</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {form.skills.map((s) => <span key={s} className="cl-tag">{s}</span>)}
                </div>
              </div>

              {(form.attachments.images.length > 0 || form.attachments.documents.length > 0) && (
                <div className="cl-review-details">
                  <p className="cl-review-label">Attachments</p>
                  <p className="cl-review-text">
                    {form.attachments.images.length} image(s), {form.attachments.documents.length} document(s)
                  </p>
                </div>
              )}
            </div>

            <div className="cl-publish-actions">
              <button
                type="button"
                className={`cl-btn cl-btn--primary ${saving ? 'cl-btn--loading' : ''}`}
                onClick={() => publish(false)}
                disabled={saving}
              >
                {saving ? 'Publishing...' : '🚀 Publish Project Now'}
              </button>
              <button
                type="button"
                className="cl-btn cl-btn--ghost"
                onClick={() => publish(true)}
                disabled={saving}
              >
                💾 Save as Draft
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="cl-post-project">
      <div className="cl-page-header">
        <h1 className="cl-page-title">Post a New Project</h1>
        <p className="cl-page-sub">Fill out the details to reach world-class freelancers.</p>
      </div>

      <div className="cl-card animate-slide-up" style={{ maxWidth: '850px', margin: '0 auto' }}>
        <Stepper current={step - 1} steps={STEPS} />

        <div className="cl-wizard-content">
          {renderStep()}
        </div>

        <div className="cl-wizard-nav">
          <button
            type="button"
            className="cl-btn cl-btn--ghost"
            onClick={prevStep}
            disabled={step === 1 || saving}
          >
            ← Previous
          </button>

          {step < 5 && (
            <button
              type="button"
              className="cl-btn cl-btn--primary"
              onClick={nextStep}
              disabled={saving}
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostProject;
