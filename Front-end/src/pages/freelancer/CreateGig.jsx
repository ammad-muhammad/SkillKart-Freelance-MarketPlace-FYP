import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import Stepper from './components/Stepper';
import TagInput from '../../Components/common/TagInput/TagInput';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import './FreelancerDashboard.css';
import './CreateGig.css';

const STEPS = ['Basic Info', 'Pricing', 'Description', 'Media', 'Publish'];

const CATEGORIES = [
  'Web Development', 'Mobile Development', 'Design', 'Writing & Translation',
  'Digital Marketing', 'Video & Animation', 'Music & Audio', 'Programming & Tech',
  'Business', 'Data', 'Photography', 'Other',
];

const SUBCATEGORIES = {
  'Web Development': ['Full Stack', 'Frontend', 'Backend', 'E-Commerce', 'WordPress'],
  'Mobile Development': ['iOS', 'Android', 'React Native', 'Flutter'],
  'Design': ['UI/UX Design', 'Logo Design', 'Brand Identity', 'Graphic Design'],
  'Writing & Translation': ['Article Writing', 'Copywriting', 'Translation', 'Proofreading'],
  'Digital Marketing': ['SEO', 'Social Media', 'Email Marketing', 'PPC'],
  'Video & Animation': ['Video Editing', '2D Animation', '3D Animation', 'Whiteboard'],
  'Music & Audio': ['Voice Over', 'Mixing', 'Composing', 'Podcast'],
  'Programming & Tech': ['AI/ML', 'DevOps', 'Cybersecurity', 'Automation'],
  'Business': ['Virtual Assistant', 'Data Entry', 'Market Research'],
  'Data': ['Data Analysis', 'Data Visualization', 'Excel', 'SQL'],
  'Photography': ['Product Photography', 'Portrait', 'Editing'],
  'Other': ['Other'],
};

const EMPTY_GIG = {
  title: '',
  category: CATEGORIES[0],
  subcategory: SUBCATEGORIES[CATEGORIES[0]][0],
  skills: [],
  shortDescription: '',
  pricing: {
    basic: { price: '', delivery: '', revisions: '' },
    standard: { price: '', delivery: '', revisions: '' },
    premium: { price: '', delivery: '', revisions: '' },
  },
  fullDescription: '',
  faqs: [],
  media: { banner: null, images: [], videoLink: '', portfolioLinks: [] },
  status: 'active',
};

/* ──────────────────────── STEP COMPONENTS ──────────────────────── */

const Step1 = ({ gig, set }) => (
  <div className="fl-step-body">
    <h2 className="fl-step-body__title">Step 1: Basic Information</h2>

    <div className="fl-form-group full" style={{ marginBottom: '1.25rem' }}>
      <label className="fl-label">Gig Title *</label>
      <input
        className="fl-input"
        maxLength={80}
        value={gig.title}
        onChange={(e) => set('title', e.target.value)}
        placeholder="I will create a professional React web application..."
      />
      <span className="fl-char-count">{gig.title.length}/80</span>
    </div>

    <div className="fl-form-grid" style={{ marginBottom: '1.25rem' }}>
      <div className="fl-form-group">
        <label className="fl-label">Category *</label>
        <CustomSelect
          options={CATEGORIES}
          value={gig.category}
          onChange={(val) => set('category', val, val)}
        />
      </div>
      <div className="fl-form-group">
        <label className="fl-label">Subcategory</label>
        <CustomSelect
          options={SUBCATEGORIES[gig.category] || ['Other']}
          value={gig.subcategory}
          onChange={(val) => set('subcategory', val)}
        />
      </div>
    </div>

    <div className="fl-form-group full" style={{ marginBottom: '1.25rem' }}>
      <label className="fl-label">Required Skills (press Enter)</label>
      <TagInput tags={gig.skills} onChange={(val) => set('skills', val)} placeholder="e.g. React, Node.js..." />
    </div>

    <div className="fl-form-group full">
      <label className="fl-label">Short Description *</label>
      <textarea
        className="fl-textarea"
        maxLength={150}
        rows={3}
        value={gig.shortDescription}
        onChange={(e) => set('shortDescription', e.target.value)}
        placeholder="Briefly describe what you offer (shown in gig cards)..."
      />
      <span className="fl-char-count">{gig.shortDescription.length}/150</span>
    </div>
  </div>
);

const PricingTierCard = ({ tier, label, data, onChange }) => (
  <div className={`fl-pricing-tier fl-pricing-tier--${tier}`}>
    <div className="fl-pricing-tier__header">
      <span className="fl-pricing-tier__icon">
        {tier === 'basic' ? '🥉' : tier === 'standard' ? '🥈' : '🥇'}
      </span>
      <span className="fl-pricing-tier__label">{label}</span>
    </div>
    <div className="fl-form-group" style={{ marginBottom: '0.75rem' }}>
      <label className="fl-label">Price ($)</label>
      <input
        type="number"
        className="fl-input"
        min={1}
        value={data.price}
        onChange={(e) => onChange({ ...data, price: e.target.value })}
        placeholder="e.g. 150"
      />
    </div>
    <div className="fl-form-group" style={{ marginBottom: '0.75rem' }}>
      <label className="fl-label">Delivery (days)</label>
      <input
        type="number"
        className="fl-input"
        min={1}
        value={data.delivery}
        onChange={(e) => onChange({ ...data, delivery: e.target.value })}
        placeholder="e.g. 7"
      />
    </div>
    <div className="fl-form-group">
      <label className="fl-label">Revisions</label>
      <input
        type="text"
        className="fl-input"
        value={data.revisions}
        onChange={(e) => onChange({ ...data, revisions: e.target.value })}
        placeholder="e.g. 2 or Unlimited"
      />
    </div>
  </div>
);

const Step2 = ({ gig, set }) => (
  <div className="fl-step-body">
    <h2 className="fl-step-body__title">Step 2: Pricing Packages</h2>
    <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
      Define three pricing tiers for your gig to give buyers options.
    </p>
    <div className="fl-pricing-grid">
      {[
        { tier: 'basic', label: 'Basic' },
        { tier: 'standard', label: 'Standard' },
        { tier: 'premium', label: 'Premium' },
      ].map(({ tier, label }) => (
        <PricingTierCard
          key={tier}
          tier={tier}
          label={label}
          data={gig.pricing[tier]}
          onChange={(val) => set('pricing', { ...gig.pricing, [tier]: val })}
        />
      ))}
    </div>
  </div>
);

const Step3 = ({ gig, set }) => {
  const addFaq = () => set('faqs', [...gig.faqs, { question: '', answer: '' }]);
  const removeFaq = (i) => set('faqs', gig.faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i, key, val) =>
    set('faqs', gig.faqs.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));

  return (
    <div className="fl-step-body">
      <h2 className="fl-step-body__title">Step 3: Description & FAQs</h2>

      <div className="fl-form-group full" style={{ marginBottom: '1.5rem' }}>
        <label className="fl-label">Full Description *</label>
        <textarea
          className="fl-textarea"
          rows={8}
          maxLength={2000}
          value={gig.fullDescription}
          onChange={(e) => set('fullDescription', e.target.value)}
          placeholder="Describe your gig in detail. Include what the buyer will receive, your process, requirements, and why they should choose you..."
        />
        <span className="fl-char-count">{gig.fullDescription.length}/2000</span>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <label className="fl-label">FAQs (Optional)</label>
          <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={addFaq}>＋ Add FAQ</button>
        </div>
        {gig.faqs.length === 0 && (
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.82rem' }}>No FAQs added. Click "Add FAQ" to add a question and answer.</p>
        )}
        {gig.faqs.map((faq, i) => (
          <div key={i} className="fl-faq-item">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>FAQ #{i + 1}</span>
              <button className="fl-btn fl-btn--sm fl-btn--ghost" onClick={() => removeFaq(i)}>✕ Remove</button>
            </div>
            <div className="fl-form-group" style={{ marginBottom: '0.6rem' }}>
              <label className="fl-label">Question</label>
              <input
                className="fl-input"
                value={faq.question}
                onChange={(e) => updateFaq(i, 'question', e.target.value)}
                placeholder="e.g. What tools do you use?"
              />
            </div>
            <div className="fl-form-group">
              <label className="fl-label">Answer</label>
              <textarea
                className="fl-textarea"
                rows={2}
                value={faq.answer}
                onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                placeholder="Your answer..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Step4 = ({ gig, set }) => {
  const bannerRef = useRef(null);
  const imagesRef = useRef(null);

  const handleBanner = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { uploadBanner } = await import('../../utils/uploadHelper');
      const url = await uploadBanner(file);
      set('media', { ...gig.media, banner: url });
    } catch (error) {
      console.error('Banner upload failed:', error);
    }
  };

  const handleImages = async (e) => {
    const files = Array.from(e.target.files);
    try {
      const { uploadPortfolioImage } = await import('../../utils/uploadHelper');
      const uploadPromises = files.map(file => uploadPortfolioImage(file));
      const urls = await Promise.all(uploadPromises);
      set('media', { ...gig.media, images: [...gig.media.images, ...urls].slice(0, 5) });
    } catch (error) {
      console.error('Images upload failed:', error);
    }
  };

  const removeImage = (i) =>
    set('media', { ...gig.media, images: gig.media.images.filter((_, idx) => idx !== i) });

  const addPortfolioLink = () =>
    set('media', { ...gig.media, portfolioLinks: [...gig.media.portfolioLinks, ''] });

  const updatePortfolioLink = (i, val) =>
    set('media', {
      ...gig.media,
      portfolioLinks: gig.media.portfolioLinks.map((l, idx) => (idx === i ? val : l)),
    });

  const removePortfolioLink = (i) =>
    set('media', { ...gig.media, portfolioLinks: gig.media.portfolioLinks.filter((_, idx) => idx !== i) });

  return (
    <div className="fl-step-body">
      <h2 className="fl-step-body__title">Step 4: Portfolio & Media</h2>

      {/* Banner */}
      <div className="fl-form-group full" style={{ marginBottom: '1.5rem' }}>
        <label className="fl-label">Banner Image</label>
        <div className="fl-upload-zone" onClick={() => bannerRef.current?.click()}>
          {gig.media.banner ? (
            <img src={gig.media.banner} alt="banner" className="fl-upload-zone__preview" />
          ) : (
            <div className="fl-upload-zone__placeholder">
              <span style={{ fontSize: '2.5rem' }}>🖼️</span>
              <p>Click to upload banner image</p>
              <span style={{ fontSize: '0.75rem' }}>WEBP, PNG, JPG up to 5MB · Recommended: 1200×628</span>
            </div>
          )}
        </div>
        <input ref={bannerRef} type="file" accept="image/*" hidden onChange={handleBanner} />
        {gig.media.banner && (
          <button
            className="fl-btn fl-btn--ghost fl-btn--sm"
            style={{ marginTop: '0.5rem' }}
            onClick={() => set('media', { ...gig.media, banner: null })}
          >
            ✕ Remove Banner
          </button>
        )}
      </div>

      {/* Multiple Images */}
      <div className="fl-form-group full" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label className="fl-label">Portfolio Images (max 5)</label>
          {gig.media.images.length < 5 && (
            <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={() => imagesRef.current?.click()}>
              ＋ Add Images
            </button>
          )}
        </div>
        <input ref={imagesRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
        <div className="fl-images-grid">
          {gig.media.images.map((img, i) => (
            <div key={i} className="fl-image-thumb">
              <img src={img} alt={`portfolio-${i}`} />
              <button className="fl-image-thumb__remove" onClick={() => removeImage(i)}>✕</button>
            </div>
          ))}
          {gig.media.images.length === 0 && (
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.82rem' }}>No images added yet.</p>
          )}
        </div>
      </div>

      {/* Video Link */}
      <div className="fl-form-group full" style={{ marginBottom: '1.5rem' }}>
        <label className="fl-label">Video Link (Optional)</label>
        <input
          type="url"
          className="fl-input"
          value={gig.media.videoLink}
          onChange={(e) => set('media', { ...gig.media, videoLink: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>

      {/* Portfolio Links */}
      <div className="fl-form-group full">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label className="fl-label">Portfolio Links (Optional)</label>
          <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={addPortfolioLink}>＋ Add Link</button>
        </div>
        {gig.media.portfolioLinks.map((link, i) => (
          <div key={i} className="fl-link-row">
            <input
              type="url"
              className="fl-input"
              value={link}
              onChange={(e) => updatePortfolioLink(i, e.target.value)}
              placeholder="https://your-project.com"
            />
            <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={() => removePortfolioLink(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Step5 = ({ gig, onPublish, onDraft, publishing }) => {
  const tiers = [
    { key: 'basic', label: 'Basic', icon: '🥉' },
    { key: 'standard', label: 'Standard', icon: '🥈' },
    { key: 'premium', label: 'Premium', icon: '🥇' },
  ];

  return (
    <div className="fl-step-body">
      <h2 className="fl-step-body__title">Step 5: Review & Publish</h2>
      <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Review your gig before publishing. Make sure everything looks right!
      </p>

      {/* Summary */}
      <div className="fl-review-section">
        <h4 className="fl-review-section__title">📋 Basic Info</h4>
        <div className="fl-review-row">
          <span>Title:</span> <strong>{gig.title || '—'}</strong>
        </div>
        <div className="fl-review-row">
          <span>Category:</span> <strong>{gig.category} › {gig.subcategory}</strong>
        </div>
        <div className="fl-review-row">
          <span>Skills:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {gig.skills.length > 0 ? gig.skills.map((s) => <span key={s} className="fl-tag">{s}</span>) : '—'}
          </div>
        </div>
        <div className="fl-review-row">
          <span>Short Desc:</span> <span style={{ color: 'var(--color-text-mid)' }}>{gig.shortDescription || '—'}</span>
        </div>
      </div>

      <div className="fl-review-section">
        <h4 className="fl-review-section__title">💰 Pricing</h4>
        <div className="fl-review-pricing">
          {tiers.map(({ key, label, icon }) => (
            <div key={key} className="fl-review-pricing__tier">
              <p className="fl-review-pricing__tier-label">{icon} {label}</p>
              <p className="fl-review-pricing__tier-val">${gig.pricing[key].price || '—'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                {gig.pricing[key].delivery || '—'} days · {gig.pricing[key].revisions || '—'} revisions
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="fl-review-section">
        <h4 className="fl-review-section__title">📝 Description</h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-mid)', whiteSpace: 'pre-wrap' }}>
          {gig.fullDescription || '(No description provided)'}
        </p>
        {gig.faqs.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--color-text-dark)' }}>FAQs: {gig.faqs.length}</strong>
          </div>
        )}
      </div>

      <div className="fl-review-section">
        <h4 className="fl-review-section__title">🖼️ Media</h4>
        <div className="fl-review-row">
          <span>Banner:</span> <strong>{gig.media.banner ? '✅ Uploaded' : '⬜ None'}</strong>
        </div>
        <div className="fl-review-row">
          <span>Images:</span> <strong>{gig.media.images.length} uploaded</strong>
        </div>
        <div className="fl-review-row">
          <span>Video Link:</span> <strong>{gig.media.videoLink || '—'}</strong>
        </div>
      </div>

      {/* Publish Actions */}
      <div className="fl-publish-actions">
        <button
          className={`fl-btn fl-btn--primary${publishing ? ' fl-btn--loading' : ''}`}
          onClick={onPublish}
          disabled={publishing}
          style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
        >
          {publishing ? 'Publishing...' : '🚀 Publish Gig'}
        </button>
        <button className="fl-btn fl-btn--outline" onClick={onDraft} disabled={publishing}>
          💾 Save as Draft
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────── MAIN WIZARD ──────────────────────── */

const CreateGig = () => {
  const { addGig, showToast } = useFreelancer();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gig, setGig] = useState(EMPTY_GIG);
  const [publishing, setPublishing] = useState(false);

  const set = (key, value, resetSub) => {
    setGig((prev) => {
      const next = { ...prev, [key]: value };
      if (resetSub && key === 'category') {
        next.subcategory = (SUBCATEGORIES[value] || ['Other'])[0];
      }
      return next;
    });
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep = () => {
    if (step === 0 && !gig.title.trim()) {
      showToast('Gig title is required.', 'error');
      return false;
    }
    if (step === 0 && !gig.shortDescription.trim()) {
      showToast('Short description is required.', 'error');
      return false;
    }
    if (step === 1 && !gig.pricing.basic.price) {
      showToast('At least set the basic package price.', 'error');
      return false;
    }
    if (step === 2 && !gig.fullDescription.trim()) {
      showToast('Full description is required.', 'error');
      return false;
    }
    return true;
  };

  const publish = async (isDraft = false) => {
    setPublishing(true);
    try {
      await addGig({ ...gig, status: isDraft ? 'draft' : 'active' });
      navigate('/freelancer/gigs');
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <div className="fl-page-header">
        <h1 className="fl-page-title">Create New Gig</h1>
        <p className="fl-page-sub">Follow the steps to create and publish your freelance service.</p>
      </div>

      <Stepper steps={STEPS} current={step} />

      <div className="fl-card fl-create-gig-card">
        {step === 0 && <Step1 gig={gig} set={set} />}
        {step === 1 && <Step2 gig={gig} set={set} />}
        {step === 2 && <Step3 gig={gig} set={set} />}
        {step === 3 && <Step4 gig={gig} set={set} />}
        {step === 4 && <Step5 gig={gig} onPublish={() => publish(false)} onDraft={() => publish(true)} publishing={publishing} />}

        {/* Navigation */}
        {step < 4 && (
          <div className="fl-wizard-nav">
            <button className="fl-btn fl-btn--ghost" onClick={back} disabled={step === 0}>← Back</button>
            <button className="fl-btn fl-btn--primary" onClick={next}>
              {step === 3 ? 'Review Gig →' : 'Next Step →'}
            </button>
          </div>
        )}
        {step === 4 && (
          <div className="fl-wizard-nav">
            <button className="fl-btn fl-btn--ghost" onClick={back}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateGig;
