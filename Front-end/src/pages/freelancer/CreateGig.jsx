import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import { JOB_CATEGORIES } from '../../constants/jobCategories';
import { FileText, AlignLeft, Image as ImageIcon, Rocket, Save, CheckCircle2, XCircle, Star, Zap, Crown, X, Plus } from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import Stepper from '../../Components/common/Stepper/Stepper';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import { validateFile } from '../../utils/uploadHelper';
import { aiAPI } from '../../api/ai';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import './FreelancerDashboard.css';
import './CreateGig.css';

const STEPS = ['Basic Info', 'Pricing', 'Description', 'Media', 'Publish'];

// Canonical platform taxonomy so gigs save with countable category names.
const CATEGORIES = JOB_CATEGORIES;

const EMPTY_GIG = {
  title: '',
  category: CATEGORIES[0],
  skills: [],
  shortDescription: '',
  pricing: {
    basic: { price: '', deliveryTime: '', revisions: '' },
    standard: { price: '', deliveryTime: '', revisions: '' },
    premium: { price: '', deliveryTime: '', revisions: '' },
  },
  fullDescription: '',
  faqs: [],
  media: { banner: null, images: [], videoLink: '', portfolioLinks: [] },
  status: 'active',
};

/* ──────────────────────── STEP COMPONENTS ──────────────────────── */

const Step1 = ({ gig, set, onCategoryChange, validatingCategory, passedSkills }) => (
  <div className="fl-step-body">
    <h2 className="fl-step-body__title">Step 1: Basic Information</h2>

    <div className="fl-form-group full" style={{ marginBottom: '1.25rem' }}>
      <label className="fl-label" htmlFor="cg-title">Gig Title *</label>
      <input
        id="cg-title"
        className="fl-input"
        maxLength={80}
        value={gig.title}
        onChange={(e) => set('title', e.target.value)}
        placeholder="I will create a professional React web application..."
      />
      <span className="fl-char-count">{gig.title.length}/80</span>
    </div>



    <div className="fl-form-group full" style={{ marginBottom: '1.25rem', marginTop: '0.75rem' }}>
      <label className="fl-label" htmlFor="cg-category">Category * {validatingCategory && <span style={{fontSize: '0.8rem', color: 'var(--color-primary)'}}>(Validating by AI...)</span>}</label>
      <ComboSelect
        id="cg-category"
        options={CATEGORIES}
        value={gig.category}
        onChange={onCategoryChange}
        placeholder="Type to search categories or enter a new one…"
        allowFreeText={true}
        disabled={validatingCategory}
      />
    </div>

    <div className="fl-form-group full" style={{ marginBottom: '1.25rem' }}>
      <label className="fl-label">Required Skills</label>
      <TagInput 
        tags={gig.skills} 
        onChange={(val) => set('skills', val)} 
        options={passedSkills}
        placeholder={passedSkills.length ? "Search your verified skills..." : "Pass skill tests to add skills!"} 
      />
    </div>

    <div className="fl-form-group full">
      <label className="fl-label" htmlFor="cg-short-desc">Short Description *</label>
      <textarea
        id="cg-short-desc"
        className="fl-textarea"
        maxLength={150}
        rows={3}
        value={gig.shortDescription}
        onChange={(e) => set('shortDescription', e.target.value)}
        placeholder="Briefly describe what you offer (shown in gig cards)..."
      />
      <span className="fl-char-count">{gig.shortDescription.length}/150</span>
      <AiGenerateText
        className="fl-ai-generate"
        fieldLabel="a freelancer's short, catchy one-line gig description (pitching their own service) shown on gig cards in a freelance marketplace"
        getContext={() => ({ title: gig.title, category: gig.category, skills: gig.skills })}
        getExistingText={() => gig.shortDescription}
        onGenerated={(text) => set('shortDescription', text.slice(0, 150))}
      />
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
      <label className="fl-label" htmlFor={`cg-price-${tier}`}>Price (PKR)</label>
      <input
        id={`cg-price-${tier}`}
        type="number"
        className="fl-input"
        min={1}
        value={data.price}
        onChange={(e) => onChange({ ...data, price: e.target.value })}
        placeholder="e.g. 150"
      />
    </div>
    <div className="fl-form-group" style={{ marginBottom: '0.75rem' }}>
      <label className="fl-label" htmlFor={`cg-delivery-${tier}`}>Delivery (days)</label>
      <input
        id={`cg-delivery-${tier}`}
        type="number"
        className="fl-input"
        min={1}
        value={data.deliveryTime}
        onChange={(e) => onChange({ ...data, deliveryTime: e.target.value })}
        placeholder="e.g. 7"
      />
    </div>
    <div className="fl-form-group">
      <label className="fl-label" htmlFor={`cg-revisions-${tier}`}>Revisions</label>
      <input
        id={`cg-revisions-${tier}`}
        type="number"
        className="fl-input"
        min={0}
        max={100}
        value={data.revisions}
        onChange={(e) => onChange({ ...data, revisions: e.target.value })}
        placeholder="e.g. 2"
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
        <label className="fl-label" htmlFor="cg-full-desc">Full Description *</label>
        <textarea
          id="cg-full-desc"
          className="fl-textarea"
          rows={8}
          maxLength={2000}
          value={gig.fullDescription}
          onChange={(e) => set('fullDescription', e.target.value)}
          placeholder="Describe your gig in detail. Include what the buyer will receive, your process, requirements, and why they should choose you..."
        />
        <span className="fl-char-count">{gig.fullDescription.length}/2000</span>
        <AiGenerateText
          className="fl-ai-generate"
          fieldLabel="a freelancer's detailed gig description — what the buyer receives, the process, requirements, and why to choose this freelancer"
          getContext={() => ({ title: gig.title, category: gig.category, skills: gig.skills, shortDescription: gig.shortDescription })}
          getExistingText={() => gig.fullDescription}
          onGenerated={(text) => set('fullDescription', text.slice(0, 2000))}
        />
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
              <label className="fl-label" htmlFor={`cg-faq-q-${i}`}>Question</label>
              <input
                id={`cg-faq-q-${i}`}
                className="fl-input"
                value={faq.question}
                onChange={(e) => updateFaq(i, 'question', e.target.value)}
                placeholder="e.g. What tools do you use?"
              />
            </div>
            <div className="fl-form-group">
              <label className="fl-label" htmlFor={`cg-faq-a-${i}`}>Answer</label>
              <textarea
                id={`cg-faq-a-${i}`}
                className="fl-textarea"
                rows={2}
                value={faq.answer}
                onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                placeholder="Your answer..."
              />
              <AiGenerateText
                className="fl-ai-generate"
                fieldLabel="the answer to a freelancer-written FAQ on their gig listing"
                getContext={() => ({ title: gig.title, category: gig.category, question: faq.question })}
                getExistingText={() => faq.answer}
                onGenerated={(text) => updateFaq(i, 'answer', text)}
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
  const [bannerCropFile, setBannerCropFile] = useState(null);
  const [imageQueue, setImageQueue] = useState([]); // remaining raw files awaiting their crop turn
  const [croppedImages, setCroppedImages] = useState([]); // results collected so far this batch

  const handleBanner = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const check = validateFile(file);
    if (!check.valid) {
      console.error(check.error);
      return;
    }
    setBannerCropFile(file);
  };

  const handleBannerCropConfirm = async (finalFile) => {
    setBannerCropFile(null);
    try {
      const { uploadBanner } = await import('../../utils/uploadHelper');
      const url = await uploadBanner(finalFile);
      set('media', { ...gig.media, banner: url });
    } catch (error) {
      console.error('Banner upload failed:', error);
    }
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files).filter((f) => validateFile(f).valid);
    e.target.value = '';
    if (!files.length) return;
    setImageQueue(files);
    setCroppedImages([]);
  };

  // Walks the multi-file queue one crop at a time — `result` is the
  // cropped/original File on confirm, or null if that one image was
  // skipped (Cancel). Once the queue empties, uploads whatever was collected.
  const handleImageQueueAdvance = async (result) => {
    const remaining = imageQueue.slice(1);
    const collected = result ? [...croppedImages, result] : croppedImages;
    setImageQueue(remaining);

    if (remaining.length > 0) {
      setCroppedImages(collected);
      return;
    }

    setCroppedImages([]);
    if (collected.length === 0) return;
    try {
      const { uploadPortfolioImage } = await import('../../utils/uploadHelper');
      const urls = await Promise.all(collected.map((file) => uploadPortfolioImage(file)));
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
        <label className="fl-label" htmlFor="cg-banner-input">Banner Image</label>
        <div className="fl-upload-zone" onClick={() => bannerRef.current?.click()}>
          {gig.media.banner ? (
            <img src={gig.media.banner} alt="banner" className="fl-upload-zone__preview" />
          ) : (
            <div className="fl-upload-zone__placeholder">
              <ImageIcon size={40} style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }} />
              <p>Click to upload banner image</p>
              <span style={{ fontSize: '0.75rem' }}>WEBP, PNG, JPG up to 5MB · Recommended: 1200×628</span>
            </div>
          )}
        </div>
        <input id="cg-banner-input" ref={bannerRef} type="file" accept="image/*" hidden onChange={handleBanner} />
        {gig.media.banner && (
          <button
            className="fl-btn fl-btn--ghost fl-btn--sm"
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => set('media', { ...gig.media, banner: null })}
          >
            <X size={14} /> Remove Banner
          </button>
        )}
      </div>

      {/* Multiple Images */}
      <div className="fl-form-group full" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label className="fl-label" htmlFor="cg-images-input">Portfolio Images (max 5)</label>
          {gig.media.images.length < 5 && (
            <button className="fl-btn fl-btn--ghost fl-btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => imagesRef.current?.click()}>
              <Plus size={14} /> Add Images
            </button>
          )}
        </div>
        <input id="cg-images-input" ref={imagesRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
        <div className="fl-images-grid">
          {gig.media.images.map((img, i) => (
            <div key={i} className="fl-image-thumb">
              <img src={img} alt={`portfolio-${i}`} />
              <button className="fl-image-thumb__remove" onClick={() => removeImage(i)}><X size={14} /></button>
            </div>
          ))}
          {gig.media.images.length === 0 && (
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.82rem' }}>No images added yet.</p>
          )}
        </div>
      </div>

      {/* Video Link */}
      <div className="fl-form-group full" style={{ marginBottom: '1.5rem' }}>
        <label className="fl-label" htmlFor="cg-video-link">Video Link (Optional)</label>
        <input
          id="cg-video-link"
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
          <button className="fl-btn fl-btn--ghost fl-btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={addPortfolioLink}><Plus size={14} /> Add Link</button>
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
            <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={() => removePortfolioLink(i)}><X size={14} /></button>
          </div>
        ))}
      </div>

      <ImageCropModal
        file={bannerCropFile}
        aspect={16 / 9}
        cropShape="rect"
        title="Adjust Gig Banner"
        onCancel={() => setBannerCropFile(null)}
        onConfirm={handleBannerCropConfirm}
      />

      <ImageCropModal
        file={imageQueue[0] || null}
        aspect={16 / 9}
        cropShape="rect"
        title={imageQueue.length > 1 ? `Adjust Image (${croppedImages.length + 1} of ${croppedImages.length + imageQueue.length})` : 'Adjust Portfolio Image'}
        onCancel={() => handleImageQueueAdvance(null)}
        onConfirm={handleImageQueueAdvance}
      />
    </div>
  );
};

const Step5 = ({ gig, onPublish, onDraft, publishing }) => {
  const tiers = [
    { key: 'basic', label: 'Basic', icon: <Star size={16} /> },
    { key: 'standard', label: 'Standard', icon: <Zap size={16} /> },
    { key: 'premium', label: 'Premium', icon: <Crown size={16} /> },
  ];

  return (
    <div className="fl-step-body">
      <h2 className="fl-step-body__title">Step 5: Review & Publish</h2>
      <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Review your gig before publishing. Make sure everything looks right!
      </p>

      {/* Summary */}
      <div className="fl-review-section">
        <h4 className="fl-review-section__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Basic Info</h4>
        <div className="fl-review-row">
          <span>Title:</span> <strong>{gig.title || '—'}</strong>
        </div>
        <div className="fl-review-row">
          <span>Category:</span> <strong>{gig.category}</strong>
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
        <h4 className="fl-review-section__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PkrIcon size={18} /> Pricing</h4>
        <div className="fl-review-pricing">
          {tiers.map(({ key, label, icon }) => (
            <div key={key} className="fl-review-pricing__tier">
              <p className="fl-review-pricing__tier-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>{icon} {label}</p>
              <p className="fl-review-pricing__tier-val">Rs. {gig.pricing[key].price || '—'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                {gig.pricing[key].deliveryTime || '—'} days · {gig.pricing[key].revisions || '—'} revisions
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="fl-review-section">
        <h4 className="fl-review-section__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlignLeft size={18} /> Description</h4>
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
        <h4 className="fl-review-section__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ImageIcon size={18} /> Media</h4>
        <div className="fl-review-row">
          <span>Banner:</span> <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>{gig.media.banner ? <><CheckCircle2 size={14} className="text-success" /> Uploaded</> : <><XCircle size={14} className="text-muted" /> None</>}</strong>
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
          style={{ padding: '0.85rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {publishing ? 'Publishing...' : <><Rocket size={18} /> Publish Gig</>}
        </button>
        <button className="fl-btn fl-btn--outline" onClick={onDraft} disabled={publishing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Save size={18} /> Save as Draft
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────── MAIN WIZARD ──────────────────────── */

const CreateGig = () => {
  const { addGig, showToast, profile } = useFreelancer();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gig, setGig] = useState(EMPTY_GIG);
  const [publishing, setPublishing] = useState(false);
  const [validatingCategory, setValidatingCategory] = useState(false);

  // Only allow skills the freelancer has passed tests for (isVerified === true)
  const passedSkills = useMemo(() => {
    return profile?.verifiedSkills
      ?.filter(s => s.isVerified)
      ?.map(s => s.name) || [];
  }, [profile]);

  const handleCategoryChange = async (val) => {
    if (CATEGORIES.includes(val)) {
      set('category', val);
      return;
    }
    
    setValidatingCategory(true);
    showToast('Checking category relevance...', 'info');
    try {
      const res = await aiAPI.validateSkill(val);
      if (res.data?.data?.valid) {
        set('category', res.data.data.skill);
        showToast('Valid category added!', 'success');
      } else {
        const msg = res.data?.data?.message || 'Invalid category';
        showToast(`That doesn't seem to be a valid freelance service category. AI says: ${msg}`, 'error');
      }
    } catch (err) {
      const aiDown = err.response?.status === 503 || !err.response;
      showToast(aiDown
        ? 'AI is temporarily out of service. Please pick a category from the dropdown.'
        : 'Validation failed. Please select from the dropdown.', 'error');
    } finally {
      setValidatingCategory(false);
    }
  };

  const set = (key, value) => {
    setGig((prev) => {
      return { ...prev, [key]: value };
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
    if (step === 0) {
      // Mirror the backend's actual rules (Backend/src/validators/gig.validator.js)
      // so a mismatch surfaces here, on the field, instead of a generic
      // "Validation failed" toast when the final Publish call hits the API.
      if (gig.title.trim().length < 5) { showToast('Gig title must be at least 5 characters.', 'error'); return false; }
      if (!gig.shortDescription.trim()) { showToast('Short description is required.', 'error'); return false; }
      if (!gig.category) { showToast('Please select a category.', 'error'); return false; }
      if (gig.category.trim().length > 50) { showToast('Category name is too long (max 50 characters).', 'error'); return false; }
      if (!Array.isArray(gig.skills) || gig.skills.length === 0) {
        showToast('Add at least one skill.', 'error');
        return false;
      }
    }
    if (step === 1) {
      const basicPrice = Number(gig.pricing.basic.price);
      if (!basicPrice || basicPrice <= 0) {
        showToast('Set a valid basic package price (greater than 0).', 'error');
        return false;
      }
      // Any optional tier that's been started must also have a positive price.
      for (const tier of ['standard', 'premium']) {
        const t = gig.pricing[tier];
        const started = t.price || t.deliveryTime || t.revisions;
        if (started && (!Number(t.price) || Number(t.price) <= 0)) {
          showToast(`The ${tier} package needs a valid price.`, 'error');
          return false;
        }
      }
      // Revisions, when provided, must match the backend's isInt({min:0,max:100}).
      for (const tier of ['basic', 'standard', 'premium']) {
        const raw = gig.pricing[tier].revisions;
        if (raw === '' || raw === undefined || raw === null) continue;
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0 || n > 100) {
          showToast(`${tier[0].toUpperCase() + tier.slice(1)} revisions must be a whole number between 0 and 100.`, 'error');
          return false;
        }
      }
    }
    if (step === 2) {
      const len = gig.fullDescription.trim().length;
      if (len === 0) { showToast('Full description is required.', 'error'); return false; }
      if (len < 50) { showToast(`Full description must be at least 50 characters (currently ${len}).`, 'error'); return false; }
    }
    return true;
  };

  const publish = async (isDraft = false) => {
    setPublishing(true);
    // addGig handles its own error toast and returns { success }. Only navigate
    // away on success so a failed publish keeps the user on the form.
    const result = await addGig({ ...gig, status: isDraft ? 'draft' : 'active' });
    setPublishing(false);
    if (result?.success) {
      navigate('/freelancer/gigs');
    } else if (result?.skillTestRequired) {
      // Freelancer hasn't passed a skill test for this gig's skills. Send them to
      // the baseline skill test (covers their unverified profile skills). We
      // intentionally don't force ?skill= — a per-skill test requires that skill
      // to already be on their profile, which may not be the case yet.
      if (window.confirm('You must pass the skill test for this gig’s skills before publishing. Take the test now?')) {
        navigate('/freelancer/skill-test');
      }
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
        {step === 0 && <Step1 gig={gig} set={set} onCategoryChange={handleCategoryChange} validatingCategory={validatingCategory} passedSkills={passedSkills} />}
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
