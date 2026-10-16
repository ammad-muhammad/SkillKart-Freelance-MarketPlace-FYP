import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import { JOB_CATEGORIES, GIG_SUBCATEGORIES } from '../../constants/jobCategories';
import {
  FileText, AlignLeft, Image as ImageIcon, Rocket, Save, CheckCircle2,
  XCircle, Star, Zap, Crown, X, Plus, ChevronLeft, ChevronRight,
  Clock, RefreshCw, Upload, Eye, Check, AlertCircle, Sparkles, Trash2,
  HelpCircle, RotateCcw, ShieldCheck, CheckSquare, Layers
} from 'lucide-react';
import { Field, Input, Textarea, Select } from '../../Components/common/Field/Field';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import GigCard from '../../Components/common/GigCard/GigCard';
import Loader from '../../Components/common/Loader/Loader';
import { validateFile } from '../../utils/uploadHelper';
import { aiAPI } from '../../api/ai';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import './CreateGig.css';

const STEPS = [
  { title: 'Basic Info', sub: 'Title, category, skills' },
  { title: 'Pricing', sub: '3 tiers & features' },
  { title: 'Description', sub: 'Overview & FAQs' },
  { title: 'Media', sub: 'Cover & portfolio' },
  { title: 'Publish', sub: 'Review & launch' },
];

const CATEGORIES = JOB_CATEGORIES;
const SUBCATEGORIES = GIG_SUBCATEGORIES;

const EMPTY_GIG = {
  title: '',
  category: CATEGORIES[0] || 'Web Development',
  subcategory: '',
  skills: [],
  shortDescription: '',
  pricing: {
    basic: { title: '', description: '', price: '', deliveryTime: '', revisions: '', features: [] },
    standard: { title: '', description: '', price: '', deliveryTime: '', revisions: '', features: [] },
    premium: { title: '', description: '', price: '', deliveryTime: '', revisions: '', features: [] },
  },
  fullDescription: '',
  faqs: [],
  media: { banner: null, images: [], videoLink: '', portfolioLinks: [] },
  status: 'active',
};

const SUGGESTED_FEATURES = [
  'Source Code', 'Responsive Design', 'Content Upload',
  'Design Customization', 'Database Setup', 'API Integration',
  'Speed Optimization', 'SEO Friendly'
];

/* ──────────────────────── STEP 1: BASIC INFO ──────────────────────── */
const Step1 = ({
  gig,
  set,
  onCategoryChange,
  validatingCategory,
  passedSkills,
  onAiFill,
  aiLoading,
}) => (
  <div className="fl-step-stack">
    {/* Top AI Assistant Strip */}
    <div className="fl-ai-strip">
      <div className="fl-ai-strip__left">
        <div className="fl-ai-strip__icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h4 className="fl-ai-strip__title">AI Assistant</h4>
          <p className="fl-ai-strip__sub">
            Have a service in mind? AI can draft your title, categorize, and propose verified skills based on marketplace demand.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="fl-ai-strip__btn"
        onClick={onAiFill}
        disabled={aiLoading}
      >
        {aiLoading ? <Loader size={14} color="#065F46" /> : <Sparkles size={14} />}
        <span>Fill all with AI</span>
      </button>
    </div>

    {/* Section Card: Gig Identity */}
    <div className="fl-section-card">
      <div className="fl-section-card__header">
        <h4 className="fl-section-card__title">Gig Identity</h4>
        <span className="fl-section-card__hint">How your service will be named and categorized</span>
      </div>

      <Field
        id="cg-title"
        label="Gig Title"
        required
        counter={`${gig.title.length}/80`}
        helper="Keep it clear and specific. State the exact outcome you deliver."
        action={
          <AiSuggestFill
            getContext={() => ({ title: gig.title, description: gig.shortDescription, skills: gig.skills })}
            onCategory={(cat) => set('category', cat)}
            onSkills={(fresh) => set('skills', [...new Set([...gig.skills, ...fresh])])}
            allowedCategories={CATEGORIES}
            label="AI suggest"
          />
        }
      >
        <Input
          id="cg-title"
          maxLength={80}
          value={gig.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="I will build a modern responsive React web application..."
        />
      </Field>

      <div className="sk-grid-2col">
        <Field
          id="cg-category"
          label={`Category ${validatingCategory ? '(Validating with AI...)' : ''}`}
          required
        >
          <ComboSelect
            id="cg-category"
            options={CATEGORIES}
            value={gig.category}
            onChange={onCategoryChange}
            placeholder="Select or type category..."
            allowFreeText={true}
            disabled={validatingCategory}
          />
        </Field>

        <Field id="cg-subcategory" label="Subcategory">
          <ComboSelect
            id="cg-subcategory"
            options={(SUBCATEGORIES[gig.category] || []).map(s => ({ value: s, label: s }))}
            value={gig.subcategory}
            onChange={(v) => set('subcategory', v)}
            placeholder="Select or type subcategory..."
            allowFreeText={true}
          />
        </Field>
      </div>
    </div>

    {/* Section Card: Skills & Summary */}
    <div className="fl-section-card">
      <div className="fl-section-card__header">
        <h4 className="fl-section-card__title">Skills & Summary</h4>
        <span className="fl-section-card__hint">Tags and brief teaser for search results</span>
      </div>

      <Field
        label="Required Skills"
        required
        helper="Verified skills appear higher in client searches and increase orders."
      >
        <TagInput
          tags={gig.skills}
          onChange={(val) => set('skills', val)}
          options={passedSkills}
          placeholder={passedSkills.length ? 'Search verified skills...' : 'Type skill name...'}
        />
      </Field>

      <Field
        id="cg-short-desc"
        label="Short Description"
        required
        counter={`${gig.shortDescription.length}/150`}
        helper="One-line summary displayed on search result cards across the marketplace."
        action={
          <AiGenerateText
            fieldLabel="a catchy short one-line gig summary for marketplace cards"
            getContext={() => ({ title: gig.title, category: gig.category, skills: gig.skills })}
            getExistingText={() => gig.shortDescription}
            onGenerated={(text) => set('shortDescription', text.slice(0, 150))}
            label="Generate with AI"
          />
        }
      >
        <Textarea
          id="cg-short-desc"
          style={{ minHeight: 90 }}
          maxLength={150}
          value={gig.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          placeholder="Brief one-line summary displayed on cards across the marketplace..."
        />
      </Field>
    </div>
  </div>
);

/* ──────────────────────── STEP 2: PRICING ──────────────────────── */
const Step2TierCard = ({
  tier,
  label,
  ribbon,
  accentClass,
  data = {},
  onChange,
  onAiFillTier,
  aiLoading,
}) => {
  const [featureInput, setFeatureInput] = useState('');

  const handleAddFeature = (text) => {
    const clean = (text || featureInput).trim();
    if (!clean) return;
    const current = Array.isArray(data.features) ? data.features : [];
    if (!current.includes(clean)) {
      onChange({ ...data, features: [...current, clean] });
    }
    setFeatureInput('');
  };

  const handleRemoveFeature = (idx) => {
    const current = Array.isArray(data.features) ? data.features : [];
    onChange({ ...data, features: current.filter((_, i) => i !== idx) });
  };

  return (
    <div className={`fl-tier-card ${accentClass}`}>
      <div className="fl-tier-card__header-bar">
        <div className="fl-tier-card__title-group">
          <span className="fl-tier-card__badge-icon">
            {tier === 'basic' ? '🥉' : tier === 'standard' ? '🥈' : '🥇'}
          </span>
          <h4 className="fl-tier-card__name">{label} Package</h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {ribbon && <span className="fl-tier-ribbon">{ribbon}</span>}
          <button
            type="button"
            className="fl-tier-ai-fill-btn"
            onClick={() => onAiFillTier(tier)}
            title="Auto-fill this tier with AI"
            disabled={aiLoading}
          >
            <Sparkles size={11} />
            <span>AI fill</span>
          </button>
        </div>
      </div>

      <div className="fl-tier-card__body">
        {/* Package Title */}
        <Field label="Package Title" required>
          <Input
            value={data.title || ''}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder={
              tier === 'basic'
                ? 'e.g. Starter Setup'
                : tier === 'standard'
                ? 'e.g. Standard App'
                : 'e.g. Complete System'
            }
          />
        </Field>

        {/* Description */}
        <Field label="Description" required>
          <Textarea
            style={{ minHeight: 80, fontSize: 13 }}
            maxLength={200}
            value={data.description || ''}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder={`What deliverables are included in the ${label} tier...`}
          />
        </Field>

        {/* Delivery + Revisions in 2-col grid */}
        <div className="sk-grid-2col">
          <Field
            label="Delivery"
            icon={<Clock size={13} />}
            required
          >
            <Input
              type="number"
              min={1}
              value={data.deliveryTime || ''}
              onChange={(e) => onChange({ ...data, deliveryTime: e.target.value })}
              placeholder="Days (e.g. 3)"
            />
          </Field>

          <Field
            label="Revisions"
            icon={<RefreshCw size={13} />}
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={data.revisions ?? ''}
              onChange={(e) => onChange({ ...data, revisions: e.target.value })}
              placeholder="e.g. 2"
            />
          </Field>
        </div>

        {/* Price in PKR with inside prefix */}
        <Field label="Price (PKR)" required prefix="Rs.">
          <Input
            type="number"
            min={1}
            hasPrefix
            value={data.price || ''}
            onChange={(e) => onChange({ ...data, price: e.target.value })}
            placeholder="e.g. 5000"
            style={{ fontWeight: 700 }}
          />
        </Field>

        {/* Included Features */}
        <div className="fl-tier-features-section">
          <div className="sk-field__label-row">
            <label className="sk-field__label">
              Included Features
            </label>
            <span className="sk-field__counter">
              {(data.features || []).length} items
            </span>
          </div>

          <div className="fl-tier-chips-wrap">
            {(data.features || []).map((feat, idx) => (
              <span key={idx} className="fl-tier-chip">
                <span>✓ {feat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="fl-tier-chip__remove"
                  aria-label="Remove feature"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="fl-tier-add-feature-row">
            <input
              type="text"
              className="sk-field__input"
              style={{ height: 44, fontSize: 13 }}
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
              placeholder="Add feature..."
            />
            <button
              type="button"
              className="fl-tier-add-btn"
              onClick={() => handleAddFeature()}
            >
              + Add
            </button>
          </div>

          <div className="fl-tier-quick-chips">
            {SUGGESTED_FEATURES.filter(f => !(data.features || []).includes(f))
              .slice(0, 3)
              .map((f) => (
                <button
                  key={f}
                  type="button"
                  className="fl-tier-quick-chip"
                  onClick={() => handleAddFeature(f)}
                >
                  + {f}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Step2 = ({ gig, set, onAiFill, onAiFillTier, aiLoading }) => (
  <div className="fl-step-stack">
    {/* Top AI Assistant Strip */}
    <div className="fl-ai-strip">
      <div className="fl-ai-strip__left">
        <div className="fl-ai-strip__icon">
          <Zap size={18} />
        </div>
        <div>
          <h4 className="fl-ai-strip__title">AI Pricing Assistant</h4>
          <p className="fl-ai-strip__sub">
            Auto-generate 3 tiered packages (Basic, Standard ~2x, Premium ~3.5x) with standard delivery times, revisions, and feature deliverables.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="fl-ai-strip__btn"
        onClick={() => onAiFill()}
        disabled={aiLoading}
      >
        {aiLoading ? <Loader size={14} color="#065F46" /> : <Sparkles size={14} />}
        <span>Fill packages with AI</span>
      </button>
    </div>

    {/* 3 Tier Cards Side by Side (Equal Height) */}
    <div className="fl-tiers-grid">
      <Step2TierCard
        tier="basic"
        label="Basic"
        accentClass="fl-tier-card--basic"
        data={gig.pricing.basic}
        onChange={(val) => set('pricing', { ...gig.pricing, basic: val })}
        onAiFillTier={onAiFillTier}
        aiLoading={aiLoading}
      />
      <Step2TierCard
        tier="standard"
        label="Standard"
        ribbon="Most Popular"
        accentClass="fl-tier-card--standard"
        data={gig.pricing.standard}
        onChange={(val) => set('pricing', { ...gig.pricing, standard: val })}
        onAiFillTier={onAiFillTier}
        aiLoading={aiLoading}
      />
      <Step2TierCard
        tier="premium"
        label="Premium"
        accentClass="fl-tier-card--premium"
        data={gig.pricing.premium}
        onChange={(val) => set('pricing', { ...gig.pricing, premium: val })}
        onAiFillTier={onAiFillTier}
        aiLoading={aiLoading}
      />
    </div>

    {/* Slim Price Comparison Strip */}
    <div className="fl-price-compare-strip">
      <div className="fl-price-compare-col">
        <span>🥉 Basic Package</span>
        <strong>
          {gig.pricing.basic.price
            ? `Rs. ${Number(gig.pricing.basic.price).toLocaleString()}`
            : '—'}
        </strong>
        <small>{gig.pricing.basic.deliveryTime ? `${gig.pricing.basic.deliveryTime} days` : 'No delivery set'}</small>
      </div>
      <div className="fl-price-compare-col fl-price-compare-col--featured">
        <span>🥈 Standard (Recommended)</span>
        <strong>
          {gig.pricing.standard.price
            ? `Rs. ${Number(gig.pricing.standard.price).toLocaleString()}`
            : '—'}
        </strong>
        <small>{gig.pricing.standard.deliveryTime ? `${gig.pricing.standard.deliveryTime} days` : 'No delivery set'}</small>
      </div>
      <div className="fl-price-compare-col">
        <span>🥇 Premium Package</span>
        <strong>
          {gig.pricing.premium.price
            ? `Rs. ${Number(gig.pricing.premium.price).toLocaleString()}`
            : '—'}
        </strong>
        <small>{gig.pricing.premium.deliveryTime ? `${gig.pricing.premium.deliveryTime} days` : 'No delivery set'}</small>
      </div>
    </div>
  </div>
);

/* ──────────────────────── STEP 3: DESCRIPTION & FAQS ──────────────────────── */
const Step3 = ({ gig, set, onAiFill, aiLoading }) => {
  const addFaq = () => set('faqs', [...gig.faqs, { question: '', answer: '' }]);
  const removeFaq = (i) => set('faqs', gig.faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i, key, val) =>
    set('faqs', gig.faqs.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));

  return (
    <div className="fl-step-stack">
      {/* Top AI Assistant Strip */}
      <div className="fl-ai-strip">
        <div className="fl-ai-strip__left">
          <div className="fl-ai-strip__icon">
            <AlignLeft size={18} />
          </div>
          <div>
            <h4 className="fl-ai-strip__title">AI Content Assistant</h4>
            <p className="fl-ai-strip__sub">
              Draft comprehensive deliverables, workflow process, and add 3 standard client FAQs in one click.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="fl-ai-strip__btn"
          onClick={onAiFill}
          disabled={aiLoading}
        >
          {aiLoading ? <Loader size={14} color="#065F46" /> : <Sparkles size={14} />}
          <span>Auto-fill with AI</span>
        </button>
      </div>

      {/* Section Card: Full Description */}
      <div className="fl-section-card">
        <div className="fl-section-card__header">
          <h4 className="fl-section-card__title">Full Gig Description</h4>
          <span className="fl-section-card__hint">Comprehensive overview of what clients receive</span>
        </div>

        <Field
          id="cg-full-desc"
          label="Comprehensive Description"
          required
          counter={`${gig.fullDescription.length}/2000`}
          helper="Detail your workflow, client deliverables, communication process, and guarantees."
          action={
            <AiGenerateText
              fieldLabel="a detailed comprehensive gig description including deliverables, process, and reasons to choose you"
              getContext={() => ({
                title: gig.title,
                category: gig.category,
                skills: gig.skills,
                shortDescription: gig.shortDescription,
              })}
              getExistingText={() => gig.fullDescription}
              onGenerated={(text) => set('fullDescription', text.slice(0, 2000))}
              label="Generate with AI"
            />
          }
        >
          <Textarea
            id="cg-full-desc"
            style={{ minHeight: 240 }}
            maxLength={2000}
            value={gig.fullDescription}
            onChange={(e) => set('fullDescription', e.target.value)}
            placeholder="Describe your gig in detail. Include what the client will receive, your deliverables, your workflow process, requirements, and why they should choose you..."
          />
        </Field>
      </div>

      {/* Section Card: FAQs */}
      <div className="fl-section-card">
        <div className="fl-section-card__header">
          <div>
            <h4 className="fl-section-card__title">Frequently Asked Questions</h4>
            <span className="fl-section-card__hint">Clear up common client questions upfront</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="fl-faq-ai-btn"
              onClick={onAiFill}
              disabled={aiLoading}
            >
              <Sparkles size={13} />
              <span>Generate FAQs with AI</span>
            </button>
            <button
              type="button"
              className="sk-pill-action-btn"
              onClick={addFaq}
            >
              <Plus size={14} />
              <span>Add FAQ</span>
            </button>
          </div>
        </div>

        {gig.faqs.length === 0 ? (
          <button type="button" className="fl-faq-empty-card" onClick={addFaq}>
            <HelpCircle size={24} color="#10B981" />
            <strong style={{ color: '#0B2942' }}>No FAQs added yet</strong>
            <span>Click here or use &quot;Generate FAQs with AI&quot; to answer questions on revisions, tools, and deliverables.</span>
          </button>
        ) : (
          <div className="fl-faq-list">
            {gig.faqs.map((faq, i) => (
              <div key={i} className="fl-faq-card">
                <div className="fl-faq-card__head">
                  <span className="fl-faq-card__num">FAQ #{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(i)}
                    className="fl-faq-card__remove"
                  >
                    Remove
                  </button>
                </div>

                <Field label="Question" required>
                  <Input
                    placeholder="e.g. Do you provide the Figma and source files?"
                    value={faq.question}
                    onChange={(e) => updateFaq(i, 'question', e.target.value)}
                  />
                </Field>

                <Field label="Answer" required>
                  <Textarea
                    style={{ minHeight: 80 }}
                    placeholder="Clear answer explaining how you handle this..."
                    value={faq.answer}
                    onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                  />
                </Field>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────── STEP 4: MEDIA & PORTFOLIO ──────────────────────── */
const Step4 = ({ gig, set }) => {
  const bannerRef = useRef(null);
  const imagesRef = useRef(null);
  const [bannerCropFile, setBannerCropFile] = useState(null);
  const [imageQueue, setImageQueue] = useState([]);
  const [croppedImages, setCroppedImages] = useState([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleBanner = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const check = validateFile(file);
    if (!check.valid) return;
    setBannerCropFile(file);
  };

  const handleBannerCropConfirm = async (finalFile) => {
    setBannerCropFile(null);
    setUploadingBanner(true);
    try {
      const { uploadBanner } = await import('../../utils/uploadHelper');
      const url = await uploadBanner(finalFile);
      set('media', { ...gig.media, banner: url });
    } catch (error) {
      console.error('Banner upload failed:', error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files).filter((f) => validateFile(f).valid);
    e.target.value = '';
    if (!files.length) return;
    setImageQueue(files);
    setCroppedImages([]);
  };

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
    setUploadingImages(true);
    try {
      const { uploadPortfolioImage } = await import('../../utils/uploadHelper');
      const urls = await Promise.all(collected.map((file) => uploadPortfolioImage(file)));
      set('media', { ...gig.media, images: [...gig.media.images, ...urls].slice(0, 5) });
    } catch (error) {
      console.error('Images upload failed:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (i) =>
    set('media', { ...gig.media, images: gig.media.images.filter((_, idx) => idx !== i) });

  const setAsCover = (imgUrl) => {
    set('media', { ...gig.media, banner: imgUrl });
  };

  return (
    <div className="fl-step-stack">
      {/* Top AI Tip Strip (No generation needed) */}
      <div className="fl-ai-strip fl-ai-strip--tip">
        <div className="fl-ai-strip__left">
          <div className="fl-ai-strip__icon">
            <ImageIcon size={18} />
          </div>
          <div>
            <h4 className="fl-ai-strip__title">AI Visual Guidance</h4>
            <p className="fl-ai-strip__sub">
              Tip: Service packages with sharp 16:9 cover banners and at least 3 genuine project work samples convert 4x higher in buyer searches.
            </p>
          </div>
        </div>
      </div>

      {/* Section Card: Primary Cover Banner (16:9 Dropzone) */}
      <div className="fl-section-card">
        <div className="fl-section-card__header">
          <div>
            <h4 className="fl-section-card__title">Primary Cover Banner (16:9)</h4>
            <span className="fl-section-card__hint">Main thumbnail displayed across marketplace search cards</span>
          </div>
          {gig.media.banner && (
            <span className="fl-cover-badge">✓ Cover Active</span>
          )}
        </div>

        <div className="fl-media-dropzone" onClick={() => bannerRef.current?.click()}>
          {uploadingBanner ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 32 }}>
              <Loader text="Uploading banner image..." />
            </div>
          ) : gig.media.banner ? (
            <div className="fl-banner-preview-box">
              <img src={gig.media.banner} alt="Gig Cover" className="fl-banner-preview-img" />
              <div className="fl-banner-preview-actions">
                <button
                  type="button"
                  className="fl-banner-change-btn"
                  onClick={(e) => { e.stopPropagation(); bannerRef.current?.click(); }}
                >
                  Change Cover
                </button>
                <button
                  type="button"
                  className="fl-banner-delete-btn"
                  onClick={(e) => { e.stopPropagation(); set('media', { ...gig.media, banner: null }); }}
                  aria-label="Remove banner"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="fl-dropzone-prompt">
              <div className="fl-dropzone-icon">
                <Upload size={24} />
              </div>
              <strong className="fl-dropzone-title">Click to upload 16:9 Cover Banner</strong>
              <span className="fl-dropzone-sub">WEBP, PNG, JPG up to 5MB · Recommended 1200×675</span>
            </div>
          )}
        </div>
        <ImageSourcePicker id="cg-banner-input" ref={bannerRef} accept="image/*" onChange={handleBanner} />
      </div>

      {/* Section Card: Portfolio Gallery */}
      <div className="fl-section-card">
        <div className="fl-section-card__header">
          <div>
            <h4 className="fl-section-card__title">Portfolio Gallery (Up to 5)</h4>
            <span className="fl-section-card__hint">Deliverables and deliverables from previous projects</span>
          </div>
          {gig.media.images.length < 5 && (
            <button
              type="button"
              className="sk-pill-action-btn"
              onClick={() => imagesRef.current?.click()}
            >
              <Plus size={14} />
              <span>Add Samples</span>
            </button>
          )}
        </div>
        <ImageSourcePicker id="cg-images-input" ref={imagesRef} accept="image/*" multiple onChange={handleImages} />

        {uploadingImages && (
          <div style={{ padding: 18, textAlign: 'center' }}>
            <Loader text="Uploading portfolio deliverables..." />
          </div>
        )}

        <div className="fl-media-grid-4">
          {gig.media.images.map((img, i) => (
            <div key={i} className="fl-gallery-slot">
              <img src={img} alt={`Sample ${i + 1}`} />
              <div className="fl-gallery-slot__overlay">
                <button
                  type="button"
                  className="fl-gallery-slot__set-cover-btn"
                  onClick={() => setAsCover(img)}
                  title="Set as main cover"
                >
                  Set as Cover
                </button>
                <button
                  type="button"
                  className="fl-gallery-slot__del-btn"
                  onClick={() => removeImage(i)}
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {gig.media.images.length < 5 && (
            <button
              type="button"
              className="fl-gallery-add-slot"
              onClick={() => imagesRef.current?.click()}
            >
              <Plus size={20} />
              <span>Add Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Card: Video Walkthrough */}
      <div className="fl-section-card">
        <div className="fl-section-card__header">
          <h4 className="fl-section-card__title">Video Walkthrough (Optional)</h4>
          <span className="fl-section-card__hint">Link to a YouTube, Loom, or Vimeo demo of your work</span>
        </div>
        <Field id="cg-video-link" label="Video Demo URL">
          <Input
            id="cg-video-link"
            type="url"
            value={gig.media.videoLink || ''}
            onChange={(e) => set('media', { ...gig.media, videoLink: e.target.value })}
            placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
          />
        </Field>
      </div>

      {/* Modals for cropping */}
      <ImageCropModal
        file={bannerCropFile}
        aspect={16 / 9}
        cropShape="rect"
        title="Adjust Gig Cover Banner (16:9)"
        onCancel={() => setBannerCropFile(null)}
        onConfirm={handleBannerCropConfirm}
      />
      <ImageCropModal
        file={imageQueue[0] || null}
        aspect={16 / 9}
        cropShape="rect"
        title="Adjust Portfolio Image"
        onCancel={() => handleImageQueueAdvance(null)}
        onConfirm={handleImageQueueAdvance}
      />
    </div>
  );
};

/* ──────────────────────── STEP 5: REVIEW & PUBLISH ──────────────────────── */
const Step5 = ({ gig, onJumpToStep, termsAccepted, setTermsAccepted }) => {
  const isTitleOk = gig.title.trim().length >= 5;
  const isCategoryOk = !!gig.category;
  const isSkillsOk = Array.isArray(gig.skills) && gig.skills.length > 0;
  const isPricingOk = Number(gig.pricing.basic.price) > 0;
  const isDescOk = gig.fullDescription.trim().length >= 50;
  const isMediaOk = !!gig.media.banner;

  // AI Quality Review Checklist
  const reviewAudits = [
    {
      title: 'Title & Category Specificity',
      status: isTitleOk && isCategoryOk ? 'pass' : 'fail',
      text: isTitleOk ? `"${gig.title}" in ${gig.category}` : 'Title is missing or under 5 characters.',
      step: 0,
    },
    {
      title: 'Verified Skill Tagging',
      status: isSkillsOk ? 'pass' : 'fail',
      text: isSkillsOk ? `${gig.skills.length} skills selected (${gig.skills.slice(0, 3).join(', ')})` : 'Add at least one skill tag.',
      step: 0,
    },
    {
      title: 'Pricing Packages Configured',
      status: isPricingOk ? 'pass' : 'fail',
      text: isPricingOk
        ? `Basic: Rs. ${Number(gig.pricing.basic.price || 0).toLocaleString()} · Standard: Rs. ${Number(gig.pricing.standard.price || 0).toLocaleString()} · Premium: Rs. ${Number(gig.pricing.premium.price || 0).toLocaleString()}`
        : 'Set a valid price (> 0) for your basic package.',
      step: 1,
    },
    {
      title: 'Comprehensive Scope Description',
      status: isDescOk ? 'pass' : 'fail',
      text: isDescOk ? `${gig.fullDescription.trim().length} characters documented` : 'Description must be at least 50 characters.',
      step: 2,
    },
    {
      title: 'High-Contrast Cover Banner',
      status: isMediaOk ? 'pass' : 'warn',
      text: isMediaOk ? '16:9 Cover Banner active' : 'Recommended: Add a cover banner image to attract 4x more orders.',
      step: 3,
    },
  ];

  return (
    <div className="fl-step-stack">
      {/* Top AI Review Strip */}
      <div className="fl-ai-strip">
        <div className="fl-ai-strip__left">
          <div className="fl-ai-strip__icon">
            <Rocket size={18} />
          </div>
          <div>
            <h4 className="fl-ai-strip__title">AI Listing Quality Scan</h4>
            <p className="fl-ai-strip__sub">
              Your service gig has been audited across marketplace conversion benchmarks. Review summary cards below.
            </p>
          </div>
        </div>
      </div>

      {/* Completeness Checklist Card */}
      <div className="fl-section-card">
        <h4 className="fl-section-card__title" style={{ marginBottom: 12 }}>
          Pre-Launch Audit Checklist
        </h4>
        <div className="fl-checklist-stack">
          {reviewAudits.map((item, idx) => (
            <div
              key={idx}
              className={`fl-checklist-row ${
                item.status === 'pass'
                  ? 'fl-checklist-row--ok'
                  : item.status === 'warn'
                  ? 'fl-checklist-row--warn'
                  : 'fl-checklist-row--fail'
              }`}
            >
              <div className="fl-checklist-row__left">
                {item.status === 'pass' ? (
                  <CheckCircle2 size={18} color="#10B981" />
                ) : item.status === 'warn' ? (
                  <AlertCircle size={18} color="#F59E0B" />
                ) : (
                  <XCircle size={18} color="#EF4444" />
                )}
                <div>
                  <strong style={{ display: 'block', fontSize: 13.5, color: '#0B2942' }}>
                    {item.title}
                  </strong>
                  <span style={{ fontSize: 12.5, color: '#64748B' }}>
                    {item.text}
                  </span>
                </div>
              </div>
              {item.status !== 'pass' && (
                <button
                  type="button"
                  onClick={() => onJumpToStep(item.step)}
                  className="fl-checklist-row__edit-btn"
                >
                  Edit Step →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Summary Cards Grid */}
      <div className="fl-review-cards-grid">
        <div className="fl-review-card">
          <div className="fl-review-card__header">
            <strong>1. Basic Info</strong>
            <button type="button" onClick={() => onJumpToStep(0)} className="fl-review-card__edit">
              Edit
            </button>
          </div>
          <div className="fl-review-card__content">
            <div><span className="fl-review-label">Title:</span> <strong>{gig.title || '—'}</strong></div>
            <div><span className="fl-review-label">Category:</span> {gig.category} {gig.subcategory ? `· ${gig.subcategory}` : ''}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {gig.skills.map(s => (
                <span key={s} className="fl-review-skill-chip">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="fl-review-card">
          <div className="fl-review-card__header">
            <strong>2. Pricing Packages</strong>
            <button type="button" onClick={() => onJumpToStep(1)} className="fl-review-card__edit">
              Edit
            </button>
          </div>
          <div className="fl-review-pricing-cols">
            <div>
              <small>Basic</small>
              <strong>Rs. {Number(gig.pricing.basic.price || 0).toLocaleString()}</strong>
              <span>{gig.pricing.basic.deliveryTime || 3}d delivery</span>
            </div>
            <div>
              <small>Standard</small>
              <strong>Rs. {Number(gig.pricing.standard.price || 0).toLocaleString()}</strong>
              <span>{gig.pricing.standard.deliveryTime || 5}d delivery</span>
            </div>
            <div>
              <small>Premium</small>
              <strong>Rs. {Number(gig.pricing.premium.price || 0).toLocaleString()}</strong>
              <span>{gig.pricing.premium.deliveryTime || 7}d delivery</span>
            </div>
          </div>
        </div>

        <div className="fl-review-card">
          <div className="fl-review-card__header">
            <strong>3. Description & FAQs</strong>
            <button type="button" onClick={() => onJumpToStep(2)} className="fl-review-card__edit">
              Edit
            </button>
          </div>
          <div className="fl-review-card__content">
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              {gig.fullDescription ? `${gig.fullDescription.slice(0, 140)}...` : 'No full description provided.'}
            </p>
            <small style={{ color: '#10B981', fontWeight: 700, marginTop: 4, display: 'block' }}>
              ✓ {gig.faqs.length} Frequently Asked Questions
            </small>
          </div>
        </div>

        <div className="fl-review-card">
          <div className="fl-review-card__header">
            <strong>4. Media Assets</strong>
            <button type="button" onClick={() => onJumpToStep(3)} className="fl-review-card__edit">
              Edit
            </button>
          </div>
          <div className="fl-review-card__content">
            <div><span className="fl-review-label">Cover Banner:</span> {gig.media.banner ? <strong style={{ color: '#10B981' }}>Uploaded ✓</strong> : <span style={{ color: '#EF4444' }}>Missing</span>}</div>
            <div><span className="fl-review-label">Portfolio Samples:</span> <strong>{gig.media.images.length} deliverable(s)</strong></div>
          </div>
        </div>
      </div>

      {/* Terms & Escrow Agreement */}
      <div className="fl-section-card fl-terms-box">
        <label className="fl-terms-checkbox-label">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="fl-terms-checkbox"
          />
          <span>
            I agree to fulfill orders according to the deliverables, delivery timelines, and revision rounds stated in these service packages under SkillKart milestone escrow protection.
          </span>
        </label>
      </div>
    </div>
  );
};

/* ──────────────────────── MAIN WIZARD COMPONENT ──────────────────────── */
export default function CreateGig() {
  const { addGig, showToast, profile } = useFreelancer();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [gig, setGig] = useState(EMPTY_GIG);
  const [publishing, setPublishing] = useState(false);
  const [showSkillTestConfirm, setShowSkillTestConfirm] = useState(false);
  const [validatingCategory, setValidatingCategory] = useState(false);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Undo AI fill state
  const [undoVisible, setUndoVisible] = useState(false);
  const undoTimerRef = useRef(null);
  const snapshotRef = useRef(null);

  // Verified skills from profile
  const passedSkills = useMemo(() => {
    return profile?.verifiedSkills
      ?.filter(s => s.isVerified)
      ?.map(s => s.name) || [];
  }, [profile]);

  const set = (key, value) => {
    setGig(prev => ({ ...prev, [key]: value }));
  };

  const saveSnapshot = () => {
    snapshotRef.current = JSON.parse(JSON.stringify(gig));
  };

  const triggerUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoVisible(true);
    undoTimerRef.current = setTimeout(() => {
      setUndoVisible(false);
    }, 8000);
  };

  const handleUndo = () => {
    if (snapshotRef.current) {
      setGig(snapshotRef.current);
      showToast('AI fill undone!', 'info');
      setUndoVisible(false);
    }
  };

  const handleCategoryChange = async (val) => {
    if (CATEGORIES.includes(val)) {
      set('category', val);
      return;
    }
    setValidatingCategory(true);
    showToast('Checking category relevance with AI...', 'info');
    try {
      const res = await aiAPI.validateSkill(val);
      if (res.data?.data?.valid) {
        set('category', res.data.data.skill);
        showToast('Valid category recognized!', 'success');
      } else {
        showToast(`AI: ${res.data?.data?.message || 'Invalid category'}`, 'error');
      }
    } catch {
      showToast('Validation failed. Please select from dropdown.', 'error');
    } finally {
      setValidatingCategory(false);
    }
  };

  /* ─── AI Auto-Fill Handlers ─── */
  const handleAiFillStep1 = async () => {
    setAiLoading(true);
    saveSnapshot();
    try {
      const res = await aiAPI.suggestBrief(
        gig.shortDescription || gig.title || 'Professional digital freelance service',
        gig.title || ''
      );
      const brief = res.data?.data;
      if (brief) {
        if (brief.category && CATEGORIES.includes(brief.category)) {
          set('category', brief.category);
        }
        if (Array.isArray(brief.skills) && brief.skills.length) {
          set('skills', [...new Set([...gig.skills, ...brief.skills])]);
        }
      }

      // Propose title if empty
      if (!gig.title.trim()) {
        const titleRes = await aiAPI.generateText(
          'a catchy freelance service gig title starting with "I will"',
          { category: gig.category, skills: gig.skills }
        );
        const titleText = titleRes.data?.data?.text;
        if (titleText) set('title', titleText.replace(/^"|"$/g, '').slice(0, 80));
      }

      // Propose short description if empty
      if (!gig.shortDescription.trim()) {
        const descRes = await aiAPI.generateText(
          'a catchy one-sentence summary for marketplace card preview',
          { title: gig.title, category: gig.category, skills: gig.skills }
        );
        const descText = descRes.data?.data?.text;
        if (descText) set('shortDescription', descText.replace(/^"|"$/g, '').slice(0, 150));
      }

      showToast('Step 1 auto-filled with AI! ✨', 'success');
      triggerUndo();
    } catch {
      showToast('AI suggestion unavailable right now. Try typing manually.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFillStep2 = async (targetTier = null) => {
    setAiLoading(true);
    saveSnapshot();
    try {
      const cat = gig.category || 'Web Development';
      const basePrice = cat.toLowerCase().includes('design') ? 4000 : cat.toLowerCase().includes('writing') ? 3000 : 6000;

      const draftTiers = {
        basic: {
          title: `Starter Setup`,
          description: `Core delivery covering fundamental setup and essential requirements.`,
          price: String(basePrice),
          deliveryTime: '3',
          revisions: '1',
          features: ['Initial Setup & Consultation', 'Core Deliverable', 'Source Files']
        },
        standard: {
          title: `Complete Package`,
          description: `Full standard delivery with responsive design, optimizations, and revisions.`,
          price: String(basePrice * 2),
          deliveryTime: '5',
          revisions: '3',
          features: ['Everything in Basic', 'Custom Revisions', 'Performance Optimization', 'Documentation']
        },
        premium: {
          title: `Full Enterprise Solution`,
          description: `Comprehensive end-to-end package with priority support and complete handover.`,
          price: String(Math.round(basePrice * 3.5)),
          deliveryTime: '7',
          revisions: '5',
          features: ['Everything in Standard', 'Priority 24/7 Support', 'Deployment & Handover', 'Unlimited Revisions']
        }
      };

      if (targetTier) {
        set('pricing', {
          ...gig.pricing,
          [targetTier]: {
            ...gig.pricing[targetTier],
            ...draftTiers[targetTier]
          }
        });
        showToast(`${targetTier.toUpperCase()} package drafted with AI! ✨`, 'success');
      } else {
        set('pricing', draftTiers);
        showToast('All 3 pricing packages structured with AI! ✨', 'success');
      }
      triggerUndo();
    } catch {
      showToast('Could not fill packages with AI.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFillStep3 = async () => {
    setAiLoading(true);
    saveSnapshot();
    try {
      if (gig.fullDescription.trim().length < 50) {
        const genDesc = await aiAPI.generateText(
          'a detailed comprehensive gig description including deliverables, workflow process, and guarantees',
          { title: gig.title, category: gig.category, skills: gig.skills }
        );
        const descText = genDesc.data?.data?.text;
        if (descText) set('fullDescription', descText.slice(0, 2000));
      }

      const defaultFaqs = [
        {
          question: `What deliverables will I receive upon project completion?`,
          answer: `You will receive all source files, documentation, and the final tested deliverable ready for immediate deployment or use.`
        },
        {
          question: `How do milestone revisions and feedback work?`,
          answer: `Every package includes structured revision rounds where you can request tweaks or functional modifications before approving the escrow release.`
        },
        {
          question: `Is payment protected by SkillKart escrow?`,
          answer: `Yes! You deposit 50% into secure escrow to start, and the remaining balance is only released after you inspect and accept the completed work.`
        }
      ];
      set('faqs', [...gig.faqs, ...defaultFaqs]);
      showToast('Description and FAQs generated with AI! ✨', 'success');
      triggerUndo();
    } catch {
      showToast('Could not generate content.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const validateCurrentStep = () => {
    if (step === 0) {
      if (gig.title.trim().length < 5) {
        showToast('Gig title must be at least 5 characters.', 'error');
        return false;
      }
      if (!gig.shortDescription.trim()) {
        showToast('Short description is required.', 'error');
        return false;
      }
      if (!gig.category) {
        showToast('Please select a category.', 'error');
        return false;
      }
      if (!Array.isArray(gig.skills) || gig.skills.length === 0) {
        showToast('Add at least one required skill.', 'error');
        return false;
      }
    }
    if (step === 1) {
      const basicPrice = Number(gig.pricing.basic.price);
      if (!basicPrice || basicPrice <= 0) {
        showToast('Set a valid basic package price (greater than 0).', 'error');
        return false;
      }
    }
    if (step === 2) {
      const len = gig.fullDescription.trim().length;
      if (len < 50) {
        showToast(`Full description must be at least 50 characters (currently ${len}).`, 'error');
        return false;
      }
    }
    if (step === 4) {
      if (!termsAccepted) {
        showToast('Please accept the service fulfillment terms to publish.', 'error');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    setStep(s => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep(s => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const publishGig = async (isDraft = false) => {
    if (!isDraft && !validateCurrentStep()) return;

    setPublishing(true);
    const result = await addGig({ ...gig, status: isDraft ? 'draft' : 'active' });
    setPublishing(false);

    if (result?.success) {
      navigate('/freelancer/gigs');
    } else if (result?.skillTestRequired) {
      setShowSkillTestConfirm(true);
    }
  };

  return (
    <div className="fl-wizard-page">
      {/* ─── Breadcrumb & Top Bar ─── */}
      <div className="fl-wizard-top">
        <nav className="fl-wizard-breadcrumb" aria-label="Breadcrumb">
          <Link to="/freelancer/dashboard">Dashboard</Link>
          <span className="fl-wizard-breadcrumb__sep">/</span>
          <Link to="/freelancer/gigs">My Gigs</Link>
          <span className="fl-wizard-breadcrumb__sep">/</span>
          <span className="fl-wizard-breadcrumb__curr">Create Gig</span>
        </nav>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="fl-wizard-title">Create New Gig</h1>
            <p className="fl-wizard-subtitle">
              Package your skills into high-converting, fixed-price services with milestone escrow protection.
            </p>
          </div>
          <button
            type="button"
            className="fl-top-preview-trigger"
            onClick={() => setPreviewDrawerOpen(true)}
          >
            <Eye size={15} />
            <span>Live Buyer Preview</span>
          </button>
        </div>
      </div>

      {/* ─── Horizontal Stepper Card (Glass White, Radius 24px) ─── */}
      <div className="fl-stepper-horizontal-card">
        {/* Desktop Stepper */}
        <div className="fl-stepper-horizontal">
          {STEPS.map((st, idx) => {
            const isDone = idx < step;
            const isCurrent = idx === step;
            const isUpcoming = idx > step;

            return (
              <React.Fragment key={idx}>
                <div
                  className={`fl-step-node ${isDone ? 'fl-step-node--done' : ''} ${
                    isCurrent ? 'fl-step-node--current' : ''
                  } ${isUpcoming ? 'fl-step-node--upcoming' : ''}`}
                  onClick={() => {
                    if (isDone) setStep(idx);
                  }}
                  role={isDone ? 'button' : undefined}
                  tabIndex={isDone ? 0 : undefined}
                >
                  <div className="fl-step-node__circle">
                    {isDone ? <Check size={16} strokeWidth={3} /> : idx + 1}
                  </div>
                  <div className="fl-step-node__info">
                    <span className="fl-step-node__title">{st.title}</span>
                    <span className="fl-step-node__sub">{st.sub}</span>
                  </div>
                </div>

                {idx < STEPS.length - 1 && (
                  <div className="fl-stepper-line">
                    <div
                      className="fl-stepper-line__fill"
                      style={{ width: idx < step ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile Compact Progress Bar */}
        <div className="fl-stepper-mobile-bar">
          <div className="fl-stepper-mobile-info">
            <span className="fl-stepper-mobile-step">Step {step + 1} of 5</span>
            <span className="fl-stepper-mobile-title">{STEPS[step].title}</span>
          </div>
          <div className="fl-stepper-mobile-track">
            <div
              className="fl-stepper-mobile-fill"
              style={{ width: `${((step + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── 8-Second Undo AI Fill Banner ─── */}
      {undoVisible && (
        <div className="fl-undo-toast">
          <div className="fl-undo-toast__left">
            <Sparkles size={16} color="#10B981" />
            <span>AI fill applied to current fields.</span>
          </div>
          <button type="button" className="fl-undo-toast__btn" onClick={handleUndo}>
            <RotateCcw size={13} />
            <span>Undo AI fill</span>
          </button>
        </div>
      )}

      {/* ─── Centered Form Area (Max-Width 980px) ─── */}
      <main className="fl-wizard-form-wrap">
        <div className="fl-step-transition-container" key={step}>
          {step === 0 && (
            <Step1
              gig={gig}
              set={set}
              onCategoryChange={handleCategoryChange}
              validatingCategory={validatingCategory}
              passedSkills={passedSkills}
              onAiFill={handleAiFillStep1}
              aiLoading={aiLoading}
            />
          )}

          {step === 1 && (
            <Step2
              gig={gig}
              set={set}
              onAiFill={handleAiFillStep2}
              onAiFillTier={handleAiFillStep2}
              aiLoading={aiLoading}
            />
          )}

          {step === 2 && (
            <Step3
              gig={gig}
              set={set}
              onAiFill={handleAiFillStep3}
              aiLoading={aiLoading}
            />
          )}

          {step === 3 && (
            <Step4
              gig={gig}
              set={set}
            />
          )}

          {step === 4 && (
            <Step5
              gig={gig}
              onJumpToStep={setStep}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
            />
          )}

          {/* ─── In-Card Footer Row (Replaces Sticky Bottom Bar) ─── */}
          <div className="fl-card-footer">
            <div className="fl-card-footer__left">
              <button
                type="button"
                className="fl-btn-ghost-pill"
                onClick={prevStep}
                disabled={step === 0}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              <div className="fl-card-footer__hint">
                <AlertCircle size={15} color="#10B981" />
                <span>
                  {step === 4
                    ? 'Review complete. Publish to launch or save as draft.'
                    : 'Fields with red star are required to proceed.'}
                </span>
              </div>
            </div>

            <div className="fl-card-footer__right">
              <button
                type="button"
                className="fl-btn-outline-pill"
                onClick={() => publishGig(true)}
                disabled={publishing}
              >
                <Save size={15} />
                <span>Save Draft</span>
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  className="fl-btn-navy-pill"
                  onClick={nextStep}
                >
                  <span>{step === 3 ? 'Review Gig →' : 'Next Step →'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="fl-btn-publish-pill"
                  onClick={() => publishGig(false)}
                  disabled={publishing || !termsAccepted}
                >
                  {publishing ? 'Publishing...' : <><Rocket size={17} /> Publish Gig</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ─── Floating "Live preview" Pill Button (Bottom-LEFT to never clash with Buddy AI) ─── */}
      <button
        type="button"
        className="fl-live-preview-pill fl-live-preview-pill--bottom-left"
        onClick={() => setPreviewDrawerOpen(true)}
        aria-label="Open live buyer preview"
      >
        <Eye size={16} />
        <span>Live preview</span>
      </button>

      {/* ─── Right-Side Slide-Over Drawer with Live GigCard ─── */}
      {previewDrawerOpen && (
        <div className="fl-preview-drawer-backdrop" onClick={() => setPreviewDrawerOpen(false)}>
          <aside className="fl-preview-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="fl-preview-drawer__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} color="#10B981" />
                <h3 className="fl-preview-drawer__title">Live Buyer Preview</h3>
              </div>
              <button
                type="button"
                className="fl-preview-drawer__close"
                onClick={() => setPreviewDrawerOpen(false)}
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fl-preview-drawer__body">
              <p className="fl-preview-drawer__note">
                Real-time preview of how your gig appears in marketplace search results and public cards:
              </p>

              <GigCard
                gig={{
                  ...gig,
                  freelancerName: `${profile?.personalInfo?.fullName || 'You'}`,
                  freelancerAvatar: profile?.profilePicture || null,
                  startingPrice: gig.pricing?.basic?.price || null,
                  deliveryTime: gig.pricing?.basic?.deliveryTime || null
                }}
                variant="public"
              />
            </div>
          </aside>
        </div>
      )}

      {/* Skill test confirmation dialog */}
      <ConfirmDialog
        open={showSkillTestConfirm}
        title="Skill Verification Required"
        message="You must pass the SkillKart verification test for the skills listed on this gig before publishing. Would you like to take the test now?"
        confirmLabel="Take Skill Test"
        danger={false}
        onConfirm={() => {
          setShowSkillTestConfirm(false);
          navigate('/freelancer/skill-test');
        }}
        onClose={() => setShowSkillTestConfirm(false)}
      />
    </div>
  );
}
