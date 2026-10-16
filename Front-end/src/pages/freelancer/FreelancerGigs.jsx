import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import ImageSourcePicker from '../../Components/common/ImageSourcePicker/ImageSourcePicker';
import Loader from '../../Components/common/Loader/Loader';
import GigCard from '../../Components/common/GigCard/GigCard';
import useFocusTrap from '../../hooks/useFocusTrap';
import { validateFile } from '../../utils/uploadHelper';
import { aiAPI } from '../../api/ai';
import {
  Plus, X, Upload, Trash2, Eye, Star, Pause, Play, Edit2,
  Package, LayoutGrid, List, Search, ShoppingBag, Clock, RefreshCw,
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, ArrowLeft,
  FileText, AlignLeft, Image as ImageIcon, Zap, HelpCircle,
  ShieldAlert, Check, CheckSquare
} from 'lucide-react';
import { JOB_CATEGORIES, GIG_SUBCATEGORIES } from '../../constants/jobCategories';
import { Field, Input, Textarea, Select } from '../../Components/common/Field/Field';
import './CreateGig.css';
import './FreelancerGigs.css';

const CATEGORIES = JOB_CATEGORIES;
const SUBCATEGORIES = GIG_SUBCATEGORIES;

const SUGGESTED_FEATURES = [
  'Source Code', 'Responsive Design', 'Content Upload',
  'Design Customization', 'Database Setup', 'API Integration',
  'Speed Optimization', 'SEO Friendly'
];

const TIERS_CONFIG = [
  { tier: 'basic', label: 'Basic', badge: '🥉', accentClass: 'fl-tier-card--basic' },
  { tier: 'standard', label: 'Standard', badge: '🥈', ribbon: 'Most Popular', accentClass: 'fl-tier-card--standard' },
  { tier: 'premium', label: 'Premium', badge: '🥇', accentClass: 'fl-tier-card--premium' }
];

/* ─── Shared Pricing Tier Card for Full-Page Editor ─── */
const PricingTierEditCard = ({
  tier,
  label,
  badge,
  ribbon,
  accentClass,
  data = {},
  onChange,
  onAiFillTier,
  aiLoading
}) => {
  const [featureInput, setFeatureInput] = useState('');

  const handleAddFeature = (featText) => {
    const text = (featText || featureInput).trim();
    if (!text) return;
    const current = Array.isArray(data.features) ? data.features : [];
    const normalized = current.map(f => (typeof f === 'string' ? f : f?.text || ''));
    if (!normalized.includes(text)) {
      onChange({ ...data, features: [...normalized, text] });
    }
    setFeatureInput('');
  };

  const removeFeature = (idx) => {
    const current = Array.isArray(data.features) ? data.features : [];
    const normalized = current.map(f => (typeof f === 'string' ? f : f?.text || ''));
    onChange({ ...data, features: normalized.filter((_, i) => i !== idx) });
  };

  const getFeatureText = (f) => (typeof f === 'string' ? f : f?.text || '');

  return (
    <div className={`fl-tier-card ${accentClass || ''}`}>
      <div className="fl-tier-card__header-bar">
        <div className="fl-tier-card__title-group">
          <span className="fl-tier-card__badge-icon">{badge}</span>
          <h4 className="fl-tier-card__name">{label} Package</h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {ribbon && <span className="fl-tier-ribbon">{ribbon}</span>}
          <button
            type="button"
            className="fl-tier-ai-fill-btn"
            onClick={() => onAiFillTier?.(tier)}
            title={`Auto-fill ${label} tier with AI`}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader size={11} color="#065F46" /> : <Sparkles size={11} />}
            <span>AI fill</span>
          </button>
        </div>
      </div>

      <div className="fl-tier-card__body">
        {/* Package Title */}
        <Field label="Package Title" required>
          <Input
            value={data.title || ''}
            onChange={e => onChange({ ...data, title: e.target.value })}
            placeholder={
              tier === 'basic'
                ? 'e.g. Starter Setup'
                : tier === 'standard'
                ? 'e.g. Standard App'
                : 'e.g. Complete Enterprise'
            }
          />
        </Field>

        {/* Description */}
        <Field label="Description" required>
          <Textarea
            style={{ minHeight: 80, fontSize: 13 }}
            maxLength={200}
            value={data.description || ''}
            onChange={e => onChange({ ...data, description: e.target.value })}
            placeholder={`Deliverables included in the ${label} tier...`}
          />
        </Field>

        {/* Delivery + Revisions in 2-col */}
        <div className="sk-grid-2col">
          <Field label="Delivery" icon={<Clock size={13} />} required>
            <Input
              type="number"
              min={1}
              value={data.deliveryTime != null ? data.deliveryTime : (data.deliveryDays || '')}
              onChange={e => onChange({ ...data, deliveryTime: e.target.value, deliveryDays: e.target.value })}
              placeholder="Days (e.g. 3)"
            />
          </Field>

          <Field label="Revisions" icon={<RefreshCw size={13} />}>
            <Input
              type="number"
              min={0}
              max={100}
              value={data.revisions ?? ''}
              onChange={e => onChange({ ...data, revisions: e.target.value })}
              placeholder="e.g. 2"
            />
          </Field>
        </div>

        {/* Price (PKR) with inside Rs. prefix */}
        <Field label="Price (PKR)" required prefix="Rs.">
          <Input
            type="number"
            min={1}
            hasPrefix
            value={data.price || ''}
            onChange={e => onChange({ ...data, price: e.target.value })}
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
                <span>✓ {getFeatureText(feat)}</span>
                <button
                  type="button"
                  onClick={() => removeFeature(idx)}
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
              onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => {
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
            {SUGGESTED_FEATURES.filter(f => !(data.features || []).map(getFeatureText).includes(f))
              .slice(0, 3)
              .map(f => (
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

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: FreelancerGigs
   ══════════════════════════════════════════════════════════════════════════ */
export default function FreelancerGigs() {
  const {
    gigs, loading,
    updateGig, deleteGig, toggleGigStatus,
    addToast
  } = useFreelancer();

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Full-Page Editor State
  const [editingGig, setEditingGig] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [editActiveSection, setEditActiveSection] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [aiSectionLoading, setAiSectionLoading] = useState(false);
  const [tierAiLoading, setTierAiLoading] = useState({});
  const editSheetRef = useRef(null);
  const editorScrollRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Delete Confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Image Upload / Crop in Edit Sheet
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImage, setRawImage] = useState(null);

  // Counts & Stats
  const activeCount = gigs.filter(g => g.status === 'active').length;
  const pausedCount = gigs.filter(g => g.status === 'paused').length;
  const totalViews = gigs.reduce((sum, g) => sum + (g.stats?.views || 0), 0);
  const totalOrders = gigs.reduce((sum, g) => sum + (g.stats?.ordersCompleted || g.stats?.orders || 0), 0);

  // Filtered & Sorted Gigs
  const filteredGigs = useMemo(() => {
    return gigs
      .filter(g => {
        if (tab === 'active' && g.status !== 'active') return false;
        if (tab === 'paused' && g.status !== 'paused') return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const title = (g.title || '').toLowerCase();
          const cat = (g.category || '').toLowerCase();
          const skills = Array.isArray(g.skills) ? g.skills.join(' ').toLowerCase() : '';
          return title.includes(q) || cat.includes(q) || skills.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'views') return (b.stats?.views || 0) - (a.stats?.views || 0);
        if (sortBy === 'orders') return (b.stats?.ordersCompleted || 0) - (a.stats?.ordersCompleted || 0);
        if (sortBy === 'price') {
          const pA = a.pricing?.basic?.price || a.startingPrice || 0;
          const pB = b.pricing?.basic?.price || b.startingPrice || 0;
          return pB - pA;
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [gigs, tab, search, sortBy]);

  // Open Full-Page Editor
  const openEdit = (gig) => {
    setEditingGig(gig);
    const initialForm = {
      title: gig.title || '',
      category: gig.category || '',
      subcategory: gig.subcategory || '',
      shortDescription: gig.shortDescription || '',
      fullDescription: gig.fullDescription || '',
      skills: Array.isArray(gig.skills) ? [...gig.skills] : [],
      pricing: {
        basic: {
          title: gig.pricing?.basic?.title || 'Basic Package',
          description: gig.pricing?.basic?.description || '',
          price: gig.pricing?.basic?.price != null ? String(gig.pricing.basic.price) : '',
          deliveryTime: gig.pricing?.basic?.deliveryTime != null ? String(gig.pricing.basic.deliveryTime) : (gig.pricing?.basic?.deliveryDays != null ? String(gig.pricing.basic.deliveryDays) : '3'),
          revisions: gig.pricing?.basic?.revisions != null ? String(gig.pricing.basic.revisions) : '1',
          features: Array.isArray(gig.pricing?.basic?.features)
            ? gig.pricing.basic.features.map(f => (typeof f === 'string' ? f : f?.text || ''))
            : []
        },
        standard: {
          title: gig.pricing?.standard?.title || 'Standard Package',
          description: gig.pricing?.standard?.description || '',
          price: gig.pricing?.standard?.price != null ? String(gig.pricing.standard.price) : '',
          deliveryTime: gig.pricing?.standard?.deliveryTime != null ? String(gig.pricing.standard.deliveryTime) : (gig.pricing?.standard?.deliveryDays != null ? String(gig.pricing.standard.deliveryDays) : '5'),
          revisions: gig.pricing?.standard?.revisions != null ? String(gig.pricing.standard.revisions) : '3',
          features: Array.isArray(gig.pricing?.standard?.features)
            ? gig.pricing.standard.features.map(f => (typeof f === 'string' ? f : f?.text || ''))
            : []
        },
        premium: {
          title: gig.pricing?.premium?.title || 'Premium Package',
          description: gig.pricing?.premium?.description || '',
          price: gig.pricing?.premium?.price != null ? String(gig.pricing.premium.price) : '',
          deliveryTime: gig.pricing?.premium?.deliveryTime != null ? String(gig.pricing.premium.deliveryTime) : (gig.pricing?.premium?.deliveryDays != null ? String(gig.pricing.premium.deliveryDays) : '7'),
          revisions: gig.pricing?.premium?.revisions != null ? String(gig.pricing.premium.revisions) : '5',
          features: Array.isArray(gig.pricing?.premium?.features)
            ? gig.pricing.premium.features.map(f => (typeof f === 'string' ? f : f?.text || ''))
            : []
        },
      },
      faqs: Array.isArray(gig.faqs)
        ? gig.faqs.map(f => ({ question: f.question || '', answer: f.answer || '' }))
        : [],
    };
    setEditForm(initialForm);
    setInitialSnapshot(JSON.stringify(initialForm));
    setBannerPreview(gig.media?.banner || null);
    setBannerFile(null);
    setGalleryFiles([]);
    setGalleryPreviews(Array.isArray(gig.media?.images) ? [...gig.media.images] : []);
    setEditActiveSection('basic');
    setPreviewDrawerOpen(false);
  };

  const closeEditSheet = () => {
    setEditingGig(null);
    setEditForm(null);
    setShowExitConfirm(false);
    setPreviewDrawerOpen(false);
    setInitialSnapshot('');
  };

  // Body & document scroll locking when editor is open (eradicates double scrollbars)
  useEffect(() => {
    if (editingGig) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevBodyHeight = document.body.style.height;
      const prevHtmlHeight = document.documentElement.style.height;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.documentElement.style.height = '100%';
      document.body.classList.add('fl-editor-locked');
      document.documentElement.classList.add('fl-editor-locked');

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.height = prevBodyHeight;
        document.documentElement.style.height = prevHtmlHeight;
        document.body.classList.remove('fl-editor-locked');
        document.documentElement.classList.remove('fl-editor-locked');
      };
    }
  }, [editingGig]);

  // Dirty State Detection
  const isDirty = useMemo(() => {
    if (!editForm || !initialSnapshot) return false;
    if (bannerFile) return true;
    if (galleryFiles.length > 0) return true;
    if (bannerPreview !== (editingGig?.media?.banner || null)) return true;
    return JSON.stringify(editForm) !== initialSnapshot;
  }, [editForm, initialSnapshot, bannerFile, galleryFiles, bannerPreview, editingGig]);

  // Per-Section Status (complete, dirty)
  const sectionStatus = useMemo(() => {
    if (!editForm || !initialSnapshot) return { basic: {}, pricing: {}, description: {}, media: {} };
    let initialObj = {};
    try {
      initialObj = JSON.parse(initialSnapshot);
    } catch {
      initialObj = {};
    }

    const basicDirty = (
      editForm.title !== initialObj.title ||
      editForm.category !== initialObj.category ||
      editForm.subcategory !== initialObj.subcategory ||
      editForm.shortDescription !== initialObj.shortDescription ||
      JSON.stringify(editForm.skills) !== JSON.stringify(initialObj.skills)
    );
    const basicComplete = (
      editForm.title.trim().length >= 5 &&
      Boolean(editForm.category) &&
      editForm.shortDescription.trim().length > 0 &&
      editForm.skills.length > 0
    );

    const pricingDirty = JSON.stringify(editForm.pricing) !== JSON.stringify(initialObj.pricing);
    const basicPrice = Number(editForm.pricing?.basic?.price);
    const pricingComplete = (
      basicPrice > 0 &&
      Boolean(editForm.pricing?.basic?.description?.trim())
    );

    const descDirty = (
      editForm.fullDescription !== initialObj.fullDescription ||
      JSON.stringify(editForm.faqs) !== JSON.stringify(initialObj.faqs)
    );
    const descComplete = editForm.fullDescription.trim().length >= 20;

    const mediaDirty = (
      Boolean(bannerFile) ||
      galleryFiles.length > 0 ||
      bannerPreview !== (editingGig?.media?.banner || null)
    );
    const mediaComplete = Boolean(bannerPreview);

    return {
      basic: { dirty: basicDirty, complete: basicComplete },
      pricing: { dirty: pricingDirty, complete: pricingComplete },
      description: { dirty: descDirty, complete: descComplete },
      media: { dirty: mediaDirty, complete: mediaComplete }
    };
  }, [editForm, initialSnapshot, bannerFile, galleryFiles, bannerPreview, editingGig]);

  // Scrollspy: updates active tab as user scrolls through sections
  useEffect(() => {
    if (!editingGig) return;
    const scrollContainer = editorScrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const sections = ['basic', 'pricing', 'description', 'media'];
      const scrollY = scrollContainer.scrollTop + 140;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(`fl-edit-sec-${sections[i]}`);
        if (el && el.offsetTop <= scrollY) {
          setEditActiveSection(sections[i]);
          break;
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [editingGig]);

  const scrollToSection = (secId) => {
    setEditActiveSection(secId);
    const el = document.getElementById(`fl-edit-sec-${secId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Keyboard trap & Esc handling for full-page editor
  const handleSheetEsc = useCallback(() => {
    if (previewDrawerOpen) {
      setPreviewDrawerOpen(false);
      return;
    }
    if (showImageSourcePicker) {
      setShowImageSourcePicker(false);
      return;
    }
    if (showCropModal) {
      setShowCropModal(false);
      return;
    }
    if (editingGig) {
      if (isDirty) {
        setShowExitConfirm(true);
      } else {
        closeEditSheet();
      }
    }
  }, [previewDrawerOpen, showImageSourcePicker, showCropModal, editingGig, isDirty]);

  useFocusTrap(editSheetRef, !!editingGig, handleSheetEsc);

  // AI Auto-Fill Section 1 (Basic Info)
  const handleAiFillSection1 = async () => {
    if (!editForm) return;
    setAiSectionLoading(true);
    try {
      const res = await aiAPI.suggestBrief(
        editForm.shortDescription || editForm.title || 'Professional digital freelance service',
        editForm.title || ''
      );
      const brief = res.data?.data;
      if (brief) {
        if (brief.category && CATEGORIES.includes(brief.category)) {
          setEditForm(f => ({ ...f, category: brief.category }));
        }
        if (Array.isArray(brief.skills) && brief.skills.length) {
          setEditForm(f => ({ ...f, skills: [...new Set([...f.skills, ...brief.skills])] }));
        }
      }

      if (!editForm.title.trim()) {
        const titleRes = await aiAPI.generateText(
          'a catchy freelance service gig title starting with "I will"',
          { category: editForm.category, skills: editForm.skills }
        );
        const titleText = titleRes.data?.data?.text;
        if (titleText) setEditForm(f => ({ ...f, title: titleText.replace(/^"|"$/g, '').slice(0, 80) }));
      }

      if (!editForm.shortDescription.trim()) {
        const descRes = await aiAPI.generateText(
          'a catchy one-sentence summary for marketplace card preview',
          { title: editForm.title, category: editForm.category, skills: editForm.skills }
        );
        const descText = descRes.data?.data?.text;
        if (descText) setEditForm(f => ({ ...f, shortDescription: descText.replace(/^"|"$/g, '').slice(0, 150) }));
      }

      addToast?.({ type: 'success', message: 'Basic info enriched with AI! ✨' });
    } catch {
      addToast?.({ type: 'error', message: 'AI suggestion unavailable. Please edit fields manually.' });
    } finally {
      setAiSectionLoading(false);
    }
  };

  // AI Auto-Fill All Pricing Tiers
  const handleAiFillAllTiers = async () => {
    if (!editForm) return;
    setAiSectionLoading(true);
    try {
      const cat = editForm.category || 'Web Development';
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

      setEditForm(f => ({ ...f, pricing: draftTiers }));
      addToast?.({ type: 'success', message: 'All 3 pricing packages structured with AI! ✨' });
    } catch {
      addToast?.({ type: 'error', message: 'Could not fill packages with AI.' });
    } finally {
      setAiSectionLoading(false);
    }
  };

  // AI Auto-Fill Single Pricing Tier
  const handleAiFillTier = async (targetTier) => {
    if (!editForm) return;
    setTierAiLoading(prev => ({ ...prev, [targetTier]: true }));
    try {
      const cat = editForm.category || 'Web Development';
      const basePrice = cat.toLowerCase().includes('design') ? 4000 : cat.toLowerCase().includes('writing') ? 3000 : 6000;

      const tierDrafts = {
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

      setEditForm(f => ({
        ...f,
        pricing: {
          ...f.pricing,
          [targetTier]: {
            ...f.pricing[targetTier],
            ...tierDrafts[targetTier]
          }
        }
      }));
      addToast?.({ type: 'success', message: `${targetTier.toUpperCase()} package drafted with AI! ✨` });
    } catch {
      addToast?.({ type: 'error', message: `Could not draft ${targetTier} tier with AI.` });
    } finally {
      setTierAiLoading(prev => ({ ...prev, [targetTier]: false }));
    }
  };

  // AI Auto-Generate FAQs
  const handleAiGenerateFaqs = async () => {
    if (!editForm) return;
    setAiSectionLoading(true);
    try {
      if (editForm.fullDescription.trim().length < 50) {
        const genDesc = await aiAPI.generateText(
          'a detailed comprehensive gig description including deliverables, workflow process, and guarantees',
          { title: editForm.title, category: editForm.category, skills: editForm.skills }
        );
        const descText = genDesc.data?.data?.text;
        if (descText) setEditForm(f => ({ ...f, fullDescription: descText.slice(0, 2000) }));
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
          answer: `Yes! You deposit into secure escrow to start, and funds are only released after you inspect and accept the completed deliverables.`
        }
      ];

      setEditForm(f => ({ ...f, faqs: [...(f.faqs || []), ...defaultFaqs] }));
      addToast?.({ type: 'success', message: 'FAQs and description generated with AI! ✨' });
    } catch {
      addToast?.({ type: 'error', message: 'Could not generate FAQs with AI.' });
    } finally {
      setAiSectionLoading(false);
    }
  };

  // Gallery file handler
  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const validFiles = [];
    const validPreviews = [];

    for (const f of files) {
      const err = validateFile(f, { maxSizeMB: 5, accept: ['image/jpeg', 'image/png', 'image/webp'] });
      if (err) {
        addToast?.({ type: 'error', message: `${f.name}: ${err}` });
      } else {
        validFiles.push(f);
        validPreviews.push(URL.createObjectURL(f));
      }
    }

    if (validFiles.length > 0) {
      setGalleryFiles(prev => [...prev, ...validFiles]);
      setGalleryPreviews(prev => [...prev, ...validPreviews]);
      addToast?.({ type: 'success', message: `Added ${validFiles.length} portfolio sample(s).` });
    }
  };

  const removeGalleryItem = (idx) => {
    setGalleryPreviews(prev => prev.filter((_, i) => i !== idx));
    setGalleryFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSetCover = (imgUrl) => {
    setBannerPreview(imgUrl);
    addToast?.({ type: 'info', message: 'Cover banner updated.' });
  };

  // Save Edit Changes
  const handleEditSave = async () => {
    if (!editingGig || !editForm) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title',            editForm.title);
      fd.append('category',         editForm.category);
      fd.append('subcategory',      editForm.subcategory);
      fd.append('shortDescription', editForm.shortDescription);
      fd.append('fullDescription',  editForm.fullDescription);
      fd.append('skills',           JSON.stringify(editForm.skills));
      fd.append('pricing',          JSON.stringify(editForm.pricing));
      if (Array.isArray(editForm.faqs)) {
        fd.append('faqs', JSON.stringify(editForm.faqs));
      }
      if (bannerFile) fd.append('banner', bannerFile);
      galleryFiles.forEach(f => fd.append('gallery', f));

      await updateGig(editingGig._id, fd);
      addToast?.({ type: 'success', message: 'Gig updated successfully! ✨' });
      closeEditSheet();
    } catch {
      addToast?.({ type: 'error', message: 'Failed to save gig.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Gig
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await deleteGig(deleteConfirmId);
      addToast?.({ type: 'info', message: 'Gig deleted successfully.' });
      setDeleteConfirmId(null);
    } catch {
      addToast?.({ type: 'error', message: 'Failed to delete gig.' });
    } finally {
      setDeleting(false);
    }
  };

  // Toggle Gig Status
  const handleToggle = async (id) => {
    try {
      await toggleGigStatus(id);
    } catch {
      addToast?.({ type: 'error', message: 'Failed to update gig status.' });
    }
  };

  if (loading) {
    return (
      <div className="fl-gigs-page">
        <Loader fullScreen text="Loading your gigs..." />
      </div>
    );
  }

  return (
    <div className="fl-gigs-page">
      {/* ─── Breadcrumb & Header ─── */}
      <div className="fl-gigs-header">
        <div className="fl-gigs-header__left">
          <nav className="fl-gigs-breadcrumb" aria-label="Breadcrumb">
            <Link to="/freelancer/dashboard">Dashboard</Link>
            <span className="fl-gigs-breadcrumb__sep">/</span>
            <span className="fl-gigs-breadcrumb__curr">My Gigs</span>
          </nav>
          <h1 className="fl-gigs-header__title">My Gigs</h1>
          <p className="fl-gigs-header__sub">
            {gigs.length} gig{gigs.length !== 1 ? 's' : ''} · {activeCount} active · {pausedCount} paused
          </p>
        </div>

        <Link to="/freelancer/gigs/create" className="fl-gigs-header__cta">
          <Plus size={16} />
          <span>Create New Gig</span>
        </Link>
      </div>

      {/* ─── Stats Strip (4 Compact Bento Cards) ─── */}
      <section className="fl-gigs-stats-grid" aria-label="Gigs Statistics">
        <div className="fl-gigs-stat-card">
          <div className="fl-gigs-stat-card__icon" style={{ background: '#EAFBF4', color: '#10B981' }}>
            <Package size={22} />
          </div>
          <div>
            <div className="fl-gigs-stat-card__val">{gigs.length}</div>
            <div className="fl-gigs-stat-card__label">Total Gigs</div>
          </div>
        </div>

        <div className="fl-gigs-stat-card">
          <div className="fl-gigs-stat-card__icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="fl-gigs-stat-card__val">{activeCount}</div>
            <div className="fl-gigs-stat-card__label">Active Gigs</div>
          </div>
        </div>

        <div className="fl-gigs-stat-card">
          <div className="fl-gigs-stat-card__icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
            <Eye size={22} />
          </div>
          <div>
            <div className="fl-gigs-stat-card__val">{totalViews.toLocaleString()}</div>
            <div className="fl-gigs-stat-card__label">Total Views</div>
          </div>
        </div>

        <div className="fl-gigs-stat-card">
          <div className="fl-gigs-stat-card__icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div className="fl-gigs-stat-card__val">{totalOrders.toLocaleString()}</div>
            <div className="fl-gigs-stat-card__label">Orders Completed</div>
          </div>
        </div>
      </section>

      {/* ─── Glass Toolbar ─── */}
      <div className="fl-gigs-toolbar">
        <div className="fl-gigs-toolbar__left">
          {/* Status Tabs */}
          <div className="fl-status-tabs-pill">
            {[
              { key: 'all',    label: 'All',    count: gigs.length },
              { key: 'active', label: 'Active', count: activeCount },
              { key: 'paused', label: 'Paused', count: pausedCount },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                className={`fl-status-tab-btn ${tab === t.key ? 'fl-status-tab-btn--active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <span>{t.label}</span>
                <span className="fl-status-tab-badge">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Search Pill */}
          <div className="fl-search-pill">
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search gigs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="fl-gigs-toolbar__right">
          {/* Sort Dropdown */}
          <select
            className="fl-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label="Sort gigs"
          >
            <option value="newest">Sort: Newest</option>
            <option value="views">Sort: Most Views</option>
            <option value="orders">Sort: Most Orders</option>
            <option value="price">Sort: Price</option>
          </select>

          {/* Grid / List Toggle */}
          <div className="fl-view-toggle">
            <button
              type="button"
              className={`fl-view-toggle-btn ${viewMode === 'grid' ? 'fl-view-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`fl-view-toggle-btn ${viewMode === 'list' ? 'fl-view-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              aria-label="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Gigs Display (Grid or List) ─── */}
      {filteredGigs.length === 0 ? (
        <div className="fl-gigs-empty-card">
          <div className="fl-gigs-empty-card__icon">
            <Package size={28} />
          </div>
          <h3 className="fl-gigs-empty-card__title">
            {search ? 'No gigs match your search' : `No ${tab !== 'all' ? tab : ''} gigs found`}
          </h3>
          <p className="fl-gigs-empty-card__sub">
            {search
              ? 'Try adjusting your search terms or clearing filters to see all your gigs.'
              : 'Create your first service gig to offer pre-packaged offerings to clients on SkillKart.'}
          </p>
          {search ? (
            <button
              type="button"
              className="fl-gigs-header__cta"
              onClick={() => { setSearch(''); setTab('all'); }}
            >
              Clear Filters
            </button>
          ) : (
            <Link to="/freelancer/gigs/create" className="fl-gigs-header__cta">
              <Plus size={15} />
              <span>Create Your First Gig</span>
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="fl-gigs-grid">
          {filteredGigs.map(gig => (
            <GigCard
              key={gig._id}
              gig={gig}
              variant="owner"
              onToggleStatus={handleToggle}
              onEdit={openEdit}
              onDelete={setDeleteConfirmId}
            />
          ))}
        </div>
      ) : (
        /* List View: Wide Row Cards */
        <div className="fl-gigs-list">
          {filteredGigs.map(gig => (
            <div key={gig._id} className="fl-gig-list-row">
              <div className="fl-gig-list-row__thumb">
                {gig.media?.banner ? (
                  <img src={gig.media.banner} alt={gig.title} loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                    <Package size={24} />
                  </div>
                )}
              </div>

              <div className="fl-gig-list-row__info">
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  {gig.category}{gig.subcategory ? ` • ${gig.subcategory}` : ''}
                </span>
                <h3 className="fl-gig-list-row__title" title={gig.title}>
                  {gig.title}
                </h3>
                <div className="fl-gig-list-row__meta">
                  <span>Starting at <strong>Rs. {gig.pricing?.basic?.price ? Number(gig.pricing.basic.price).toLocaleString() : '—'}</strong></span>
                  <span>•</span>
                  <span><Eye size={12} style={{ verticalAlign: 'middle' }} /> {gig.stats?.views || 0} views</span>
                  <span>•</span>
                  <span><Star size={12} fill="#F59E0B" color="#F59E0B" style={{ verticalAlign: 'middle' }} /> {(gig.stats?.rating || 0).toFixed(1)}</span>
                </div>
              </div>

              {/* Tiers summary */}
              <div className="fl-gig-list-row__tiers">
                {['basic', 'standard', 'premium'].map(tKey => (
                  <div key={tKey} className="fl-gig-list-tier-chip">
                    <span>{tKey}</span>
                    <strong>{gig.pricing?.[tKey]?.price ? `Rs. ${Number(gig.pricing[tKey].price).toLocaleString()}` : '—'}</strong>
                  </div>
                ))}
              </div>

              {/* Status Badge */}
              <span className={`sk-badge sk-badge--status-${gig.status === 'active' ? 'active' : 'paused'}`}>
                <span className="sk-badge__status-dot" />
                {gig.status === 'active' ? 'Active' : 'Paused'}
              </span>

              {/* Row Actions */}
              <div className="fl-gig-list-row__actions">
                <button
                  type="button"
                  className={`sk-icon-btn ${gig.status === 'active' ? 'sk-icon-btn--pause' : 'sk-icon-btn--play'}`}
                  onClick={() => handleToggle(gig._id)}
                  title={gig.status === 'active' ? 'Pause gig' : 'Activate gig'}
                >
                  {gig.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  type="button"
                  className="sk-pill-action-btn"
                  onClick={() => openEdit(gig)}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="sk-icon-btn sk-icon-btn--danger"
                  onClick={() => setDeleteConfirmId(gig._id)}
                  disabled={!!gig.activeOrders}
                  title={gig.activeOrders ? 'Has active orders — cannot delete' : 'Delete gig'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Delete Confirm Dialog ─── */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Delete this service gig?"
        message="This action cannot be undone. Your gig listing and historical views will be permanently removed."
        confirmLabel="Delete Gig"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmId(null)}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          FULL-PAGE GIG EDITOR (Edge-to-edge full screen layer)
          ══════════════════════════════════════════════════════════════════════ */}
      {editingGig && editForm && createPortal(
        <div
          ref={editSheetRef}
          className="fl-fullscreen-editor"
          role="dialog"
          aria-modal="true"
          aria-label={`Editing Gig: ${editForm.title || editingGig.title}`}
        >
          {/* ─── A) Top Header Bar (Sticky, 72px, White Glass) ─── */}
          <header className="fl-editor-topbar">
            <div className="fl-editor-topbar__left">
              <button
                type="button"
                className="fl-editor-back-btn"
                onClick={() => {
                  if (isDirty) setShowExitConfirm(true);
                  else closeEditSheet();
                }}
                aria-label="Back to My Gigs"
                title="Exit editor"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="fl-editor-gig-thumb">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Gig Thumbnail" />
                ) : (
                  <Package size={20} color="#94A3B8" />
                )}
              </div>

              <div className="fl-editor-title-group">
                <h2 className="fl-editor-gig-title" title={editForm.title || editingGig.title}>
                  {editForm.title || editingGig.title || 'Untitled Service Gig'}
                </h2>
                <div className="fl-editor-meta-row">
                  <span className={`fl-editor-status-pill fl-editor-status-pill--${editingGig.status === 'active' ? 'active' : 'paused'}`}>
                    <span className="fl-editor-status-dot" />
                    {editingGig.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                  {(editingGig.updatedAt || editingGig.createdAt) && (
                    <span className="fl-editor-last-edited">
                      Last edited {new Date(editingGig.updatedAt || editingGig.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="fl-editor-topbar__right">
              {isDirty && (
                <div className="fl-unsaved-badge" title="You have unsaved changes">
                  <span className="fl-unsaved-dot" />
                  <span className="fl-unsaved-text">Unsaved changes</span>
                </div>
              )}

              <button
                type="button"
                className="fl-preview-btn-pill"
                onClick={() => setPreviewDrawerOpen(true)}
                title="Preview how buyers see this gig"
              >
                <Eye size={15} />
                <span className="fl-btn-label-desktop">Preview</span>
              </button>

              <button
                type="button"
                className="fl-cancel-ghost-btn"
                onClick={() => {
                  if (isDirty) setShowExitConfirm(true);
                  else closeEditSheet();
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="fl-save-changes-pill"
                onClick={handleEditSave}
                disabled={!isDirty || saving}
                title={!isDirty ? 'No changes to save' : 'Save changes'}
              >
                {saving ? (
                  <>
                    <Loader size={14} color="#FFFFFF" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* ─── B) Section Navigation Bar (Sticky Under Header, Integrated Design) ─── */}
          <nav className="fl-editor-nav-bar" aria-label="Editor sections navigation">
            <div className="fl-editor-nav-inner">
              {[
                { id: 'basic', num: '01', label: 'Basic Info', icon: Sparkles, status: sectionStatus.basic },
                { id: 'pricing', num: '02', label: 'Pricing Packages', icon: ShoppingBag, status: sectionStatus.pricing },
                { id: 'description', num: '03', label: 'Description & FAQs', icon: AlignLeft, status: sectionStatus.description },
                { id: 'media', num: '04', label: 'Media Assets', icon: Upload, status: sectionStatus.media },
              ].map(tabItem => {
                const Icon = tabItem.icon;
                const isActive = editActiveSection === tabItem.id;
                const { dirty: isChanged, complete: isComplete } = tabItem.status;

                return (
                  <button
                    key={tabItem.id}
                    type="button"
                    className={`fl-editor-nav-tab ${isActive ? 'fl-editor-nav-tab--active' : ''}`}
                    onClick={() => scrollToSection(tabItem.id)}
                  >
                    <div className="fl-editor-nav-tab__left">
                      <span className="fl-editor-nav-tab__num">{tabItem.num}</span>
                      <Icon size={14} className="fl-editor-nav-tab__icon" />
                      <span className="fl-editor-nav-tab__title">{tabItem.label}</span>
                    </div>

                    <div className="fl-editor-nav-tab__right">
                      {isChanged ? (
                        <span className="fl-tab-badge fl-tab-badge--dirty" title="Unsaved modifications">
                          Edited
                        </span>
                      ) : isComplete ? (
                        <span className="fl-tab-badge fl-tab-badge--done" title="Section complete">
                          <Check size={11} strokeWidth={3} />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="fl-tab-badge fl-tab-badge--req" title="Required fields incomplete">
                          Required
                        </span>
                      )}
                    </div>

                    {isActive && <span className="fl-editor-nav-indicator" />}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ─── Scrollable Body Container ─── */}
          <div ref={editorScrollRef} className="fl-editor-scroll-body">
            {/* ─── C) Main Content: ONE Centered Column, Max-Width 960px ─── */}
            <main className="fl-editor-content-stack">
              {/* ─── SECTION 1: BASIC INFO ─── */}
              <section id="fl-edit-sec-basic" className="fl-section-card">
                <div className="fl-section-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="fl-sec-icon-circle">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="fl-section-card__title">Basic Information</h3>
                      <span className="fl-section-card__hint">Gig title, category classification, and verified skills</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="fl-ai-mint-pill"
                    onClick={handleAiFillSection1}
                    disabled={aiSectionLoading}
                    title="Enrich basic info with AI suggestions"
                  >
                    {aiSectionLoading ? <Loader size={12} color="#065F46" /> : <Sparkles size={12} />}
                    <span>AI fill section</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Gig Title: label row with counter, input full width, AI suggest directly UNDER input with 8px gap */}
                  <div>
                    <Field
                      id="edit-gig-title"
                      label="Gig Title"
                      required
                      counter={`${editForm.title.length}/80`}
                      helper="Keep it clear and specific. State the exact outcome you deliver."
                    >
                      <Input
                        id="edit-gig-title"
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        maxLength={80}
                        placeholder="I will build a modern responsive React web application..."
                      />
                    </Field>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <AiSuggestFill
                        getContext={() => ({ title: editForm.title, description: editForm.shortDescription, skills: editForm.skills })}
                        onCategory={(cat) => setEditForm(f => ({ ...f, category: cat }))}
                        onSkills={(fresh) => setEditForm(f => ({ ...f, skills: [...new Set([...f.skills, ...fresh])] }))}
                        allowedCategories={CATEGORIES}
                        label="AI suggest"
                      />
                    </div>
                  </div>

                  {/* Category & Subcategory 2-col grid */}
                  <div className="sk-grid-2col">
                    <Field label="Category" required>
                      <Select
                        value={editForm.category}
                        onChange={e => setEditForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </Field>

                    <Field label="Subcategory">
                      <ComboSelect
                        value={editForm.subcategory}
                        onChange={v => setEditForm(f => ({ ...f, subcategory: v }))}
                        options={(SUBCATEGORIES[editForm.category] || []).map(s => ({ value: s, label: s }))}
                        placeholder="Select or type subcategory..."
                        allowFreeText={true}
                      />
                    </Field>
                  </div>

                  {/* Required Skills Tag Input */}
                  <Field label="Required Skills" required helperText="Verified skills appear higher in client searches. Add up to 10 skills.">
                    <TagInput
                      tags={editForm.skills}
                      onChange={tags => setEditForm(f => ({ ...f, skills: tags }))}
                      placeholder="Type skill name and press Enter..."
                      maxTags={10}
                    />
                  </Field>

                  {/* Short Description: textarea, counter, Generate chip directly under */}
                  <div>
                    <Field
                      id="edit-short-desc"
                      label="Short Description"
                      required
                      counter={`${editForm.shortDescription.length}/150`}
                      helper="One-line summary displayed on search result cards across the marketplace."
                    >
                      <Textarea
                        id="edit-short-desc"
                        value={editForm.shortDescription}
                        onChange={e => setEditForm(f => ({ ...f, shortDescription: e.target.value }))}
                        maxLength={150}
                        rows={3}
                        style={{ minHeight: 90 }}
                        placeholder="Brief summary of your service (shown on search cards across the marketplace)..."
                      />
                    </Field>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <AiGenerateText
                        fieldLabel="a catchy short one-line gig summary for marketplace cards"
                        getContext={() => ({ title: editForm.title, category: editForm.category, skills: editForm.skills })}
                        getExistingText={() => editForm.shortDescription}
                        onGenerated={(text) => setEditForm(f => ({ ...f, shortDescription: text.slice(0, 150) }))}
                        label="Generate with AI"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── SECTION 2: PRICING ─── */}
              <section id="fl-edit-sec-pricing" className="fl-section-card">
                <div className="fl-section-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="fl-sec-icon-circle">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h3 className="fl-section-card__title">Pricing Packages</h3>
                      <span className="fl-section-card__hint">Three tier packages for starter, standard, and enterprise deliverables</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="fl-ai-mint-pill"
                    onClick={handleAiFillAllTiers}
                    disabled={aiSectionLoading}
                    title="Auto-fill all 3 tiers with market-aligned pricing"
                  >
                    {aiSectionLoading ? <Loader size={12} color="#065F46" /> : <Zap size={12} />}
                    <span>Fill all tiers with AI</span>
                  </button>
                </div>

                {/* 3 Tier Cards Side by Side (Equal height, stack under 900px) */}
                <div className="fl-tiers-grid">
                  {TIERS_CONFIG.map(({ tier, label, badge, ribbon, accentClass }) => (
                    <PricingTierEditCard
                      key={tier}
                      tier={tier}
                      label={label}
                      badge={badge}
                      ribbon={ribbon}
                      accentClass={accentClass}
                      data={editForm.pricing[tier]}
                      onChange={vals => setEditForm(f => ({
                        ...f,
                        pricing: {
                          ...f.pricing,
                          [tier]: { ...f.pricing[tier], ...vals }
                        }
                      }))}
                      onAiFillTier={handleAiFillTier}
                      aiLoading={tierAiLoading[tier]}
                    />
                  ))}
                </div>

                {/* Slim Price Comparison Strip */}
                <div className="fl-price-compare-strip">
                  <div className="fl-price-compare-col">
                    <span>🥉 Basic Package</span>
                    <strong>
                      {editForm.pricing.basic?.price
                        ? `Rs. ${Number(editForm.pricing.basic.price).toLocaleString()}`
                        : '—'}
                    </strong>
                    <small>{editForm.pricing.basic?.deliveryTime ? `${editForm.pricing.basic.deliveryTime} days delivery` : 'No delivery set'}</small>
                  </div>
                  <div className="fl-price-compare-col fl-price-compare-col--featured">
                    <span>🥈 Standard (Recommended)</span>
                    <strong>
                      {editForm.pricing.standard?.price
                        ? `Rs. ${Number(editForm.pricing.standard.price).toLocaleString()}`
                        : '—'}
                    </strong>
                    <small>{editForm.pricing.standard?.deliveryTime ? `${editForm.pricing.standard.deliveryTime} days delivery` : 'No delivery set'}</small>
                  </div>
                  <div className="fl-price-compare-col">
                    <span>🥇 Premium Package</span>
                    <strong>
                      {editForm.pricing.premium?.price
                        ? `Rs. ${Number(editForm.pricing.premium.price).toLocaleString()}`
                        : '—'}
                    </strong>
                    <small>{editForm.pricing.premium?.deliveryTime ? `${editForm.pricing.premium.deliveryTime} days delivery` : 'No delivery set'}</small>
                  </div>
                </div>
              </section>

              {/* ─── SECTION 3: DESCRIPTION & FAQ ─── */}
              <section id="fl-edit-sec-description" className="fl-section-card">
                <div className="fl-section-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="fl-sec-icon-circle">
                      <AlignLeft size={20} />
                    </div>
                    <div>
                      <h3 className="fl-section-card__title">Description & FAQs</h3>
                      <span className="fl-section-card__hint">Comprehensive overview and common client questions</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="fl-ai-mint-pill"
                    onClick={handleAiGenerateFaqs}
                    disabled={aiSectionLoading}
                    title="Generate description & FAQs with AI"
                  >
                    {aiSectionLoading ? <Loader size={12} color="#065F46" /> : <Sparkles size={12} />}
                    <span>Generate FAQs with AI</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Full Description: min 240px, counter, Generate chip directly under */}
                  <div>
                    <Field
                      id="edit-full-desc"
                      label="Comprehensive Description"
                      required
                      counter={`${editForm.fullDescription.length}/2000`}
                      helper="Detail your workflow, client deliverables, communication process, and guarantees."
                    >
                      <Textarea
                        id="edit-full-desc"
                        style={{ minHeight: 240 }}
                        maxLength={2000}
                        value={editForm.fullDescription}
                        onChange={e => setEditForm(f => ({ ...f, fullDescription: e.target.value }))}
                        placeholder="Describe your gig in detail. Include deliverables, workflow process, requirements, and why clients should choose you..."
                      />
                    </Field>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <AiGenerateText
                        fieldLabel="a detailed comprehensive gig description including deliverables, process, and reasons to choose you"
                        getContext={() => ({
                          title: editForm.title,
                          category: editForm.category,
                          skills: editForm.skills,
                          shortDescription: editForm.shortDescription,
                        })}
                        getExistingText={() => editForm.fullDescription}
                        onGenerated={text => setEditForm(f => ({ ...f, fullDescription: text.slice(0, 2000) }))}
                        label="Generate with AI"
                      />
                    </div>
                  </div>

                  {/* FAQs Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0B2942' }}>
                        Frequently Asked Questions ({(editForm.faqs || []).length})
                      </h4>
                      <button
                        type="button"
                        className="sk-pill-action-btn"
                        onClick={() => setEditForm(f => ({
                          ...f,
                          faqs: [...(f.faqs || []), { question: '', answer: '' }]
                        }))}
                      >
                        <Plus size={14} />
                        <span>Add FAQ</span>
                      </button>
                    </div>

                    {(!editForm.faqs || editForm.faqs.length === 0) ? (
                      <button
                        type="button"
                        className="fl-faq-empty-card"
                        onClick={() => setEditForm(f => ({
                          ...f,
                          faqs: [{ question: '', answer: '' }]
                        }))}
                      >
                        <HelpCircle size={24} color="#10B981" />
                        <strong style={{ color: '#0B2942' }}>No FAQs added yet</strong>
                        <span>Click here or use &quot;Generate FAQs with AI&quot; to answer questions on revisions, tools, and deliverables.</span>
                      </button>
                    ) : (
                      <div className="fl-faq-list">
                        {editForm.faqs.map((faq, i) => (
                          <div key={i} className="fl-faq-card">
                            <div className="fl-faq-card__head">
                              <span className="fl-faq-card__num">FAQ #{i + 1}</span>
                              <button
                                type="button"
                                onClick={() => setEditForm(f => ({
                                  ...f,
                                  faqs: f.faqs.filter((_, idx) => idx !== i)
                                }))}
                                className="fl-faq-card__remove"
                              >
                                Remove
                              </button>
                            </div>

                            <Field label="Question" required>
                              <Input
                                placeholder="e.g. Do you provide the Figma and source files?"
                                value={faq.question}
                                onChange={e => {
                                  const val = e.target.value;
                                  setEditForm(f => ({
                                    ...f,
                                    faqs: f.faqs.map((item, idx) => idx === i ? { ...item, question: val } : item)
                                  }));
                                }}
                              />
                            </Field>

                            <Field label="Answer" required>
                              <Textarea
                                style={{ minHeight: 80 }}
                                placeholder="Clear answer explaining how you handle this..."
                                value={faq.answer}
                                onChange={e => {
                                  const val = e.target.value;
                                  setEditForm(f => ({
                                    ...f,
                                    faqs: f.faqs.map((item, idx) => idx === i ? { ...item, answer: val } : item)
                                  }));
                                }}
                              />
                            </Field>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="fl-add-faq-dashed-btn"
                          onClick={() => setEditForm(f => ({
                            ...f,
                            faqs: [...(f.faqs || []), { question: '', answer: '' }]
                          }))}
                        >
                          <Plus size={15} />
                          <span>Add Another FAQ</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ─── SECTION 4: MEDIA ─── */}
              <section id="fl-edit-sec-media" className="fl-section-card">
                <div className="fl-section-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="fl-sec-icon-circle">
                      <Upload size={20} />
                    </div>
                    <div>
                      <h3 className="fl-section-card__title">Media & Visual Assets</h3>
                      <span className="fl-section-card__hint">High-resolution 16:9 cover banner and portfolio gallery samples</span>
                    </div>
                  </div>
                  {bannerPreview && (
                    <span className="fl-cover-badge">✓ Cover Active</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* 16:9 Cover Banner Dropzone */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="sk-field__label" style={{ fontWeight: 800, color: '#0B2942' }}>
                      Primary 16:9 Cover Banner <span style={{ color: '#EF4444' }}>*</span>
                    </label>

                    <div className="fl-media-dropzone" onClick={() => setShowImageSourcePicker(true)}>
                      {bannerPreview ? (
                        <div className="fl-banner-preview-box">
                          <img src={bannerPreview} alt="Cover Preview" className="fl-banner-preview-img" />
                          <div className="fl-banner-preview-actions">
                            <button
                              type="button"
                              className="fl-banner-change-btn"
                              onClick={(e) => { e.stopPropagation(); setShowImageSourcePicker(true); }}
                            >
                              Change Cover
                            </button>
                            <button
                              type="button"
                              className="fl-banner-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBannerFile(null);
                                setBannerPreview(null);
                              }}
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
                  </div>

                  {/* Portfolio Gallery Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <label className="sk-field__label" style={{ fontWeight: 800, color: '#0B2942' }}>
                          Portfolio Gallery Samples ({galleryPreviews.length}/5)
                        </label>
                        <span style={{ display: 'block', fontSize: 12, color: '#64748B' }}>
                          Add completed project deliverables or sample screenshots to build buyer trust
                        </span>
                      </div>
                      {galleryPreviews.length < 5 && (
                        <button
                          type="button"
                          className="sk-pill-action-btn"
                          onClick={() => galleryInputRef.current?.click()}
                        >
                          <Plus size={14} />
                          <span>Add Sample</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleGalleryUpload}
                    />

                    <div className="fl-gallery-grid">
                      {galleryPreviews.map((imgUrl, idx) => (
                        <div key={idx} className="fl-gallery-slot">
                          <img src={imgUrl} alt={`Sample ${idx + 1}`} className="fl-gallery-slot__img" />
                          {bannerPreview === imgUrl && (
                            <span className="fl-gallery-slot__badge">★ Cover</span>
                          )}
                          <div className="fl-gallery-slot__overlay">
                            {bannerPreview !== imgUrl && (
                              <button
                                type="button"
                                className="fl-gallery-cover-btn"
                                onClick={() => handleSetCover(imgUrl)}
                              >
                                Set as Cover
                              </button>
                            )}
                            <button
                              type="button"
                              className="fl-gallery-del-btn"
                              onClick={() => removeGalleryItem(idx)}
                              aria-label="Remove sample"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {galleryPreviews.length < 5 && (
                        <button
                          type="button"
                          className="fl-gallery-add-slot"
                          onClick={() => galleryInputRef.current?.click()}
                        >
                          <Plus size={22} />
                          <span>Add Sample</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── SECTION 5: DANGER & STATUS CARD ─── */}
              <section id="fl-edit-sec-danger" className="fl-section-card fl-section-card--danger">
                <div className="fl-section-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="fl-sec-icon-circle fl-sec-icon-circle--danger">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h3 className="fl-section-card__title">Status & Danger Zone</h3>
                      <span className="fl-section-card__hint">Pause marketplace visibility or permanently remove this service listing</span>
                    </div>
                  </div>
                </div>

                <div className="fl-danger-actions-row">
                  <div className="fl-danger-action-item">
                    <div>
                      <strong style={{ display: 'block', fontSize: 14, color: '#0B2942', fontWeight: 800 }}>
                        {editingGig.status === 'active' ? 'Pause Service Gig' : 'Activate Service Gig'}
                      </strong>
                      <span style={{ fontSize: 12.5, color: '#64748B' }}>
                        {editingGig.status === 'active'
                          ? 'Temporarily hides this gig from search results while preserving your reviews and ratings.'
                          : 'Makes this gig visible in marketplace searches and available for buyer orders.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`sk-pill-action-btn ${editingGig.status === 'active' ? 'sk-pill-action-btn--warning' : 'sk-pill-action-btn--success'}`}
                      onClick={() => handleToggle(editingGig._id)}
                    >
                      {editingGig.status === 'active' ? <><Pause size={14} /> Pause Gig</> : <><Play size={14} /> Activate Gig</>}
                    </button>
                  </div>

                  <div className="fl-danger-action-item fl-danger-action-item--delete">
                    <div>
                      <strong style={{ display: 'block', fontSize: 14, color: '#DC2626', fontWeight: 800 }}>
                        Delete Service Listing
                      </strong>
                      <span style={{ fontSize: 12.5, color: '#64748B' }}>
                        {editingGig.activeOrders
                          ? 'This gig currently has active client orders and cannot be deleted until orders are completed.'
                          : 'Permanently deletes this gig, packages, and historical view metrics. This action cannot be undone.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="fl-btn-danger-outline"
                      onClick={() => setDeleteConfirmId(editingGig._id)}
                      disabled={!!editingGig.activeOrders}
                    >
                      <Trash2 size={14} />
                      <span>Delete Gig</span>
                    </button>
                  </div>
                </div>
              </section>
            </main>
          </div>

          {/* ─── D) PREVIEW RIGHT DRAWER ─── */}
          {previewDrawerOpen && (
            <div className="fl-preview-drawer-backdrop" onClick={() => setPreviewDrawerOpen(false)}>
              <aside
                className="fl-preview-drawer"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Live Buyer Preview"
              >
                <div className="fl-preview-drawer__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="fl-sec-icon-circle" style={{ width: 34, height: 34 }}>
                      <Eye size={17} color="#10B981" />
                    </div>
                    <div>
                      <h3 className="fl-preview-drawer__title">Live Buyer Preview</h3>
                      <span style={{ fontSize: 12, color: '#64748B' }}>How buyers see your gig in search & cards</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="fl-preview-drawer__close"
                    onClick={() => setPreviewDrawerOpen(false)}
                    aria-label="Close preview"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Small Active/Paused Status Strip */}
                <div className="fl-preview-drawer__status-strip">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`sk-status-dot ${editingGig.status === 'active' ? 'sk-status-dot--active' : 'sk-status-dot--paused'}`} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0B2942' }}>
                      Status: {editingGig.status === 'active' ? 'Active in Marketplace' : 'Paused'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sk-pill-action-btn sk-pill-action-btn--xs"
                    onClick={() => handleToggle(editingGig._id)}
                  >
                    {editingGig.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                </div>

                <div className="fl-preview-drawer__body" style={{ padding: 20, overflowY: 'auto' }}>
                  <p className="fl-preview-drawer__note">
                    Real-time preview updated live as you edit package details and copy. The card below never clips and reflects exact buyer view:
                  </p>

                  <div style={{ width: '100%', overflow: 'visible' }}>
                    <GigCard
                      gig={{
                        ...editingGig,
                        ...editForm,
                        status: editingGig.status,
                        media: {
                          ...editingGig.media,
                          banner: bannerPreview,
                          images: [...(editingGig.media?.images || []), ...galleryPreviews]
                        },
                        startingPrice: editForm.pricing?.basic?.price || editingGig.startingPrice,
                        deliveryTime: editForm.pricing?.basic?.deliveryTime || editingGig.deliveryTime
                      }}
                      variant="public"
                    />
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Discard changes confirm */}
      <ConfirmDialog
        open={showExitConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes in your gig editor. Are you sure you want to close without saving?"
        confirmLabel="Discard & Close"
        danger={true}
        onConfirm={closeEditSheet}
        onClose={() => setShowExitConfirm(false)}
      />

      {/* Image Upload Modals */}
      {showImageSourcePicker && (
        <ImageSourcePicker
          onFileSelected={file => {
            const err = validateFile(file, { maxSizeMB: 5, accept: ['image/jpeg', 'image/png', 'image/webp'] });
            if (err) { addToast?.({ type: 'error', message: err }); return; }
            setRawImage(URL.createObjectURL(file));
            setShowImageSourcePicker(false);
            setShowCropModal(true);
          }}
          onClose={() => setShowImageSourcePicker(false)}
        />
      )}

      {showCropModal && rawImage && (
        <ImageCropModal
          src={rawImage}
          aspect={16 / 9}
          onCrop={(blob, url) => {
            setBannerFile(blob);
            setBannerPreview(url);
            setShowCropModal(false);
            setRawImage(null);
          }}
          onClose={() => { setShowCropModal(false); setRawImage(null); }}
        />
      )}
    </div>
  );
}
