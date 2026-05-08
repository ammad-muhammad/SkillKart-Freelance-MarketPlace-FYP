import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { jobsAPI } from '../../api/jobs';
import { uploadJobAttachment } from '../../utils/uploadHelper';
import Stepper from '../freelancer/components/Stepper';
import TagInput from '../freelancer/components/TagInput';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import './ClientDashboard.css';
import './PostProject.css';

const STEPS = ['Basic Info', 'Budget & Timeline', 'Description', 'Media', 'Publish'];

const CATEGORIES = [
  'Web Development', 'Mobile App', 'Design', 'Content Writing', 'Marketing', 'Data Science', 'DevOps'
];

const PostProject = () => {
  const navigate = useNavigate();
  const { fetchProfile, showToast } = useClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // State for all form fields
  const [form, setForm] = useState({
    title: '',
    category: 'Web Development',
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
    attachments: { images: [], documents: [], links: [] }
  });

  const bannerRef = useRef(null);

  const updateForm = (updates) => setForm(prev => ({ ...prev, ...updates }));

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // FAQ handlers
  const addFaq = () => updateForm({ faqs: [...form.faqs, { question: '', answer: '' }] });
  const removeFaq = (i) => updateForm({ faqs: form.faqs.filter((_, idx) => idx !== i) });
  const updateFaq = (i, field, val) => {
    const newFaqs = [...form.faqs];
    newFaqs[i][field] = val;
    updateForm({ faqs: newFaqs });
  };

  // Reference Link handlers
  const addRefLink = () => updateForm({ referenceLinks: [...form.referenceLinks, ''] });
  const removeRefLink = (i) => updateForm({ referenceLinks: form.referenceLinks.filter((_, idx) => idx !== i) });
  const updateRefLink = (i, val) => {
    const newLinks = [...form.referenceLinks];
    newLinks[i] = val;
    updateForm({ referenceLinks: newLinks });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setSaving(true);
    try {
      const uploadPromises = files.map(file => uploadJobAttachment(file));
      const urls = await Promise.all(uploadPromises);
      updateForm({ 
        attachments: { 
          ...form.attachments, 
          images: [...form.attachments.images, ...urls] 
        } 
      });
      showToast(`${files.length} image(s) uploaded successfully!`);
    } catch (error) {
      showToast('Failed to upload images', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publish = async (isDraft = false) => {
    setSaving(true);
    try {
      // Map to backend schema
      const payload = {
        title: form.title,
        description: form.fullDescription || form.summary,
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
        attachments: form.attachments.images // URLs from Cloudinary
      };

      await jobsAPI.createJob(payload);
      showToast(isDraft ? 'Project saved as draft!' : 'Project published successfully!');
      
      // Refresh profile to update project count in dashboard
      await fetchProfile();
      
      navigate('/client/projects');
    } catch (error) {
      console.error('Publish failed:', error);
      showToast(error.response?.data?.message || 'Failed to publish project', 'error');
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
                  type="text" className="cl-input" 
                  placeholder="e.g. Build a Modern Landing Page for Tech Startup"
                  value={form.title}
                  onChange={e => updateForm({ title: e.target.value })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Category *</label>
                <CustomSelect 
                  options={CATEGORIES}
                  value={form.category}
                  onChange={val => updateForm({ category: val })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Subcategory</label>
                <input 
                  type="text" className="cl-input" 
                  placeholder="e.g. Frontend Development"
                  value={form.subcategory}
                  onChange={e => updateForm({ subcategory: e.target.value })}
                />
              </div>
              <div className="cl-form-group full">
                <label className="cl-label">Required Skills (press Enter) *</label>
                <TagInput 
                  tags={form.skills} 
                  onChange={tags => updateForm({ skills: tags })} 
                  placeholder="e.g. React, CSS, Figma"
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Experience Level Required</label>
                <CustomSelect 
                  options={['Entry', 'Intermediate', 'Expert']}
                  value={form.experienceLevel}
                  onChange={val => updateForm({ experienceLevel: val })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Project Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button 
                    className={`cl-btn cl-btn--sm ${form.projectType === 'fixed' ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                    onClick={() => updateForm({ projectType: 'fixed' })}
                  >Fixed Price</button>
                  <button 
                    className={`cl-btn cl-btn--sm ${form.projectType === 'hourly' ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                    onClick={() => updateForm({ projectType: 'hourly' })}
                  >Hourly Rate</button>
                </div>
              </div>
              <div className="cl-form-group full">
                <label className="cl-label">Short Summary *</label>
                <textarea 
                  className="cl-textarea" 
                  placeholder="A one-sentence summary for project listings..."
                  value={form.summary}
                  onChange={e => updateForm({ summary: e.target.value })}
                  style={{ minHeight: '60px' }}
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 2: Budget & Timeline</h3>
            <div className="cl-form-grid">
              <div className="cl-form-group">
                <label className="cl-label">Minimum Budget ($)</label>
                <input 
                  type="number" className="cl-input" 
                  value={form.budget.min}
                  onChange={e => updateForm({ budget: { ...form.budget, min: Number(e.target.value) } })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Maximum Budget ($)</label>
                <input 
                  type="number" className="cl-input" 
                  value={form.budget.max}
                  onChange={e => updateForm({ budget: { ...form.budget, max: Number(e.target.value) } })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Project Duration</label>
                <CustomSelect 
                  options={['Less than 1 month', '1-3 months', '3-6 months', 'More than 6 months']}
                  value={form.duration}
                  onChange={val => updateForm({ duration: val })}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Proposed Deadline</label>
                <input 
                  type="date" className="cl-input" 
                  value={form.deadline}
                  onChange={e => updateForm({ deadline: e.target.value })}
                />
              </div>
              <div className="cl-form-group full">
                <div className="cl-toggle">
                  <div className="cl-toggle__info">
                    <span className="cl-toggle__label">Milestone-based Payments</span>
                    <span className="cl-toggle__desc">Would you like to pay in installments based on deliverables?</span>
                  </div>
                  <div 
                    className={`cl-toggle__switch ${form.milestones ? 'cl-toggle__switch--on' : ''}`}
                    onClick={() => updateForm({ milestones: !form.milestones })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 3: Detailed Description</h3>
            <div className="cl-form-group full" style={{ marginBottom: '1rem' }}>
              <label className="cl-label">Full Project Description *</label>
              <textarea 
                className="cl-textarea" 
                placeholder="Include background, goals, and technical requirements..."
                value={form.fullDescription}
                onChange={e => updateForm({ fullDescription: e.target.value })}
              />
            </div>
            <div className="cl-form-grid">
              <div className="cl-form-group">
                <label className="cl-label">Key Responsibilities</label>
                <textarea 
                  className="cl-textarea" 
                  placeholder="What will the freelancer do?"
                  value={form.responsibilities}
                  onChange={e => updateForm({ responsibilities: e.target.value })}
                  style={{ minHeight: '80px' }}
                />
              </div>
              <div className="cl-form-group">
                <label className="cl-label">Deliverables</label>
                <textarea 
                  className="cl-textarea" 
                  placeholder="What will be the final output?"
                  value={form.deliverables}
                  onChange={e => updateForm({ deliverables: e.target.value })}
                  style={{ minHeight: '80px' }}
                />
              </div>
            </div>

            <div className="cl-divider" />
            <h4 className="cl-label" style={{ marginBottom: '1rem' }}>Reference Links</h4>
            {form.referenceLinks.map((link, i) => (
              <div key={i} className="cl-link-row">
                <input 
                  type="url" className="cl-input" value={link} placeholder="https://..."
                  onChange={e => updateRefLink(i, e.target.value)}
                />
                <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => removeRefLink(i)}>✕</button>
              </div>
            ))}
            <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={addRefLink}>＋ Add Link</button>

            <div className="cl-divider" />
            <h4 className="cl-label" style={{ marginBottom: '1rem' }}>Frequently Asked Questions</h4>
            {form.faqs.map((faq, i) => (
              <div key={i} className="cl-faq-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="cl-label">Question {i + 1}</span>
                  <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => removeFaq(i)}>✕</button>
                </div>
                <input 
                  className="cl-input" style={{ marginBottom: '0.5rem' }} value={faq.question} placeholder="Question..."
                  onChange={e => updateFaq(i, 'question', e.target.value)}
                />
                <textarea 
                  className="cl-textarea" style={{ minHeight: '60px' }} value={faq.answer} placeholder="Answer..."
                  onChange={e => updateFaq(i, 'answer', e.target.value)}
                />
              </div>
            ))}
            <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={addFaq}>＋ Add FAQ</button>
          </div>
        );
      case 4:
        return (
          <div className="cl-step-body animate-fade-in">
            <h3 className="cl-step-body__title">Step 4: Attachments</h3>
            <div className="cl-upload-section">
              <label className="cl-label">Project Images</label>
              <div className="cl-upload-zone" onClick={() => bannerRef.current?.click()}>
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
                      <button className="cl-image-thumb__remove" onClick={() => {
                        const newImgs = form.attachments.images.filter((_, idx) => idx !== i);
                        updateForm({ attachments: { ...form.attachments, images: newImgs } });
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cl-divider" />
            <div className="cl-upload-section">
              <label className="cl-label">Project Documents (UI Only)</label>
              <div className="cl-upload-zone" style={{ minHeight: '100px', background: '#fafafa' }}>
                <p style={{ fontSize: '0.8rem', color: '#999' }}>📁 Document upload simulation</p>
              </div>
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
                <p className="cl-review-meta">{form.category} · {form.subcategory}</p>
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
                <p className="cl-review-text">{form.fullDescription.slice(0, 250)}...</p>
              </div>

              <div className="cl-review-details">
                <p className="cl-review-label">Skills</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {form.skills.map(s => <span key={s} className="cl-tag">{s}</span>)}
                </div>
              </div>
            </div>

            <div className="cl-publish-actions">
              <button 
                className={`cl-btn cl-btn--primary ${saving ? 'cl-btn--loading' : ''}`}
                onClick={() => publish(false)}
                disabled={saving}
              >
                {saving ? 'Publishing...' : '🚀 Publish Project Now'}
              </button>
              <button 
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
        <Stepper currentStep={step} steps={STEPS} />
        
        <div className="cl-wizard-content">
          {renderStep()}
        </div>

        <div className="cl-wizard-nav">
          <button 
            className="cl-btn cl-btn--ghost" 
            onClick={prevStep}
            disabled={step === 1 || saving}
          >
            ← Previous
          </button>
          
          {step < 5 && (
            <button 
              className="cl-btn cl-btn--primary" 
              onClick={nextStep}
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
