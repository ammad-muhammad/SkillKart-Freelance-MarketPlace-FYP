import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import Modal from '../../Components/common/Modal/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import ImageCropModal from '../../Components/common/ImageCropModal/ImageCropModal';
import { validateFile } from '../../utils/uploadHelper';
import { Plus, X, Upload, Trash2, Image as ImageIcon, Eye, Star, Pause, Play, Edit2, Package } from 'lucide-react';
import { JOB_CATEGORIES, GIG_SUBCATEGORIES } from '../../constants/jobCategories';
import './FreelancerDashboard.css';

// Canonical platform taxonomy (matches backend) so edited gigs stay countable.
const CATEGORIES = JOB_CATEGORIES;
const SUBCATEGORIES = GIG_SUBCATEGORIES;

const GigCard = ({ gig, onDelete, onToggleStatus, onEdit }) => (
  <div className="fl-gig-card">
    <div className="fl-gig-card__banner">
      {gig.media?.banner ? (
        <img src={gig.media.banner} alt={gig.title} />
      ) : (
        <div className="fl-gig-card__placeholder">
          <Package size={40} style={{ color: 'var(--color-text-light)' }} />
        </div>
      )}
      <div className="fl-gig-card__badges">
        <span className={`fl-badge fl-badge--${gig.status}`}>
          {gig.status === 'active' ? '● Active' : '⏸ Paused'}
        </span>
      </div>
      <div className="fl-gig-card__stats-overlay">
        <div className="fl-stat-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Eye size={14} /> {gig.stats?.views || 0}</div>
        <div className="fl-stat-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Star size={14} /> {gig.stats?.rating?.toFixed(1) || '0.0'}</div>
      </div>
    </div>
    <div className="fl-gig-card__body">
      <p className="fl-gig-card__category">{gig.category} · {gig.subcategory}</p>
      <h3 className="fl-gig-card__title">{gig.title}</h3>
      <p className="fl-gig-card__desc">{gig.shortDescription}</p>
      
      <div className="fl-gig-card__full-desc-preview">
        {gig.fullDescription?.substring(0, 100)}...
      </div>

      <div className="fl-gig-card__tags">
        {gig.skills.slice(0, 4).map((s) => (
          <span key={s} className="fl-tag">{s}</span>
        ))}
      </div>

      <div className="fl-gig-card__pricing-tiers">
        <div className="fl-tier-preview">
          <span>Basic</span>
          <strong>Rs. {gig.pricing?.basic?.price || '—'}</strong>
        </div>
        <div className="fl-tier-preview">
          <span>Standard</span>
          <strong>Rs. {gig.pricing?.standard?.price || '—'}</strong>
        </div>
        <div className="fl-tier-preview">
          <span>Premium</span>
          <strong>Rs. {gig.pricing?.premium?.price || '—'}</strong>
        </div>
      </div>

      <div className="fl-gig-card__footer">
        <div className="fl-gig-card__orders">
          <strong>{gig.stats?.ordersCompleted || 0}</strong> orders
        </div>
        <div className="fl-gig-card__actions">
          <button
            className={`fl-btn fl-btn--sm fl-btn--${gig.status === 'active' ? 'ghost' : 'outline'}`}
            onClick={() => onToggleStatus(gig._id)}
            title={gig.status === 'active' ? 'Pause Gig' : 'Activate Gig'}
          >
            {gig.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button className="fl-btn fl-btn--sm fl-btn--outline" onClick={() => onEdit(gig)}>
            <Edit2 size={14} />
          </button>
          <button
            className="fl-btn fl-btn--sm fl-btn--danger"
            onClick={() => onDelete(gig._id)}
            disabled={!!gig.activeOrders}
            title={gig.activeOrders ? 'This gig has an active order and cannot be deleted' : 'Delete gig'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  </div>
);

const FreelancerGigs = () => {
  const { gigs, deleteGig, toggleGigStatus, updateGig } = useFreelancer();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [filter, setFilter] = useState('all');

  // Form state for full gig schema editing
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    category: '',
    subcategory: '',
    skills: [],
    pricing: {
      basic: { price: 0, deliveryTime: 1, revisions: 1 },
      standard: { price: 0, deliveryTime: 1, revisions: 1 },
      premium: { price: 0, deliveryTime: 1, revisions: 1 }
    },
    media: { banner: null, images: [], videoLink: '', portfolioLinks: [] },
    faqs: []
  });

  const [, setUploading] = useState(false);
  const bannerRef = useRef(null);
  const imagesRef = useRef(null);
  const [bannerCropFile, setBannerCropFile] = useState(null);
  const [imageQueue, setImageQueue] = useState([]); // remaining raw files awaiting their crop turn
  const [croppedImages, setCroppedImages] = useState([]); // results collected so far this batch

  const filtered = gigs.filter((g) => filter === 'all' || g.status === filter);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteGig(deleteTarget);
    if (result?.success) setDeleteTarget(null); // keep modal open on failure
  };

  const handleEditClick = (gig) => {
    setEditTarget(gig);
    setFormData({
      title: gig.title || '',
      shortDescription: gig.shortDescription || '',
      fullDescription: gig.fullDescription || '',
      category: gig.category || '',
      subcategory: gig.subcategory || '',
      skills: Array.isArray(gig.skills) ? gig.skills : [],
      pricing: {
        basic: {
          price: gig.pricing?.basic?.price || 0,
          deliveryTime: gig.pricing?.basic?.deliveryTime || 1,
          revisions: gig.pricing?.basic?.revisions || 1
        },
        standard: {
          price: gig.pricing?.standard?.price || 0,
          deliveryTime: gig.pricing?.standard?.deliveryTime || 1,
          revisions: gig.pricing?.standard?.revisions || 1
        },
        premium: {
          price: gig.pricing?.premium?.price || 0,
          deliveryTime: gig.pricing?.premium?.deliveryTime || 1,
          revisions: gig.pricing?.premium?.revisions || 1
        }
      },
      media: gig.media || { banner: null, images: [], videoLink: '', portfolioLinks: [] },
      faqs: gig.faqs || []
    });
  };

  const handleBannerUpload = (e) => {
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
    setUploading(true);
    try {
      const { uploadBanner } = await import('../../utils/uploadHelper');
      const url = await uploadBanner(finalFile);
      setFormData(prev => ({
        ...prev,
        media: { ...prev.media, banner: url }
      }));
    } catch (error) {
      console.error('Banner upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleImagesUpload = (e) => {
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
    setUploading(true);
    try {
      const { uploadPortfolioImage } = await import('../../utils/uploadHelper');
      const urls = await Promise.all(collected.map((file) => uploadPortfolioImage(file)));
      setFormData(prev => ({
        ...prev,
        media: { ...prev.media, images: [...prev.media.images, ...urls].slice(0, 5) }
      }));
    } catch (error) {
      console.error('Images upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const addFaq = () => setFormData(prev => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }));
  const removeFaq = (i) => setFormData(prev => ({ ...prev, faqs: prev.faqs.filter((_, idx) => idx !== i) }));
  const updateFaq = (i, key, val) => setFormData(prev => ({
    ...prev,
    faqs: prev.faqs.map((f, idx) => (idx === i ? { ...f, [key]: val } : f))
  }));

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Prepare nested data
    const updatedData = {
      title: formData.title,
      shortDescription: formData.shortDescription,
      fullDescription: formData.fullDescription,
      category: formData.category,
      subcategory: formData.subcategory,
      skills: formData.skills,
      pricing: formData.pricing,
      media: formData.media,
      faqs: formData.faqs
    };
    
    const result = await updateGig(editTarget._id, updatedData);
    if (result?.success) {
      setEditTarget(null); // keep edit modal open on failure
    }
  };

  return (
    <div>
      <div className="fl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="fl-page-title">My Gigs</h1>
          <p className="fl-page-sub">Manage all your freelance service offerings.</p>
        </div>
        <Link to="/freelancer/gigs/create" className="fl-btn fl-btn--primary">＋ Create New Gig</Link>
      </div>

      {/* Filter Tabs */}
      <div className="fl-gig-tabs">
        {['all', 'active', 'paused'].map((f) => (
          <button
            key={f}
            className={`fl-gig-tab${filter === f ? ' fl-gig-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${gigs.length})` : f === 'active' ? `Active (${gigs.filter(g => g.status === 'active').length})` : `Paused (${gigs.filter(g => g.status === 'paused').length})`}
          </button>
        ))}
      </div>

      {/* Gig Grid */}
      {filtered.length === 0 ? (
        <div className="fl-card fl-empty-message">
          <p style={{ marginBottom: '0.75rem' }}><Package size={48} style={{ color: 'var(--color-primary)' }} /></p>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            {filter === 'all' ? 'No Gigs Yet' : `No ${filter} gigs`}
          </h3>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            {filter === 'all' ? 'Create your first gig to start earning.' : `You have no ${filter} gigs at the moment.`}
          </p>
          {filter === 'all' && (
            <Link to="/freelancer/gigs/create" className="fl-btn fl-btn--primary">＋ Create Your First Gig</Link>
          )}
        </div>
      ) : (
        <div className="fl-gig-grid">
          {filtered.map((gig) => (
            <GigCard
              key={gig._id}
              gig={gig}
              onDelete={setDeleteTarget}
              onToggleStatus={toggleGigStatus}
              onEdit={handleEditClick}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editTarget} title="Edit Gig Details" onClose={() => setEditTarget(null)} size="xl">
        <form onSubmit={handleUpdate} className="fl-edit-form">
            <h4 className="fl-edit-section-title">General Info</h4>
            <div className="fl-form-grid">
              <div className="fl-form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Gig Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required 
                />
              </div>
              <div className="fl-form-group" style={{ gridColumn: '1 / -1' }}>
                <AiSuggestFill
                  label="Suggest category & skills (AI)"
                  getContext={() => ({
                    title: formData.title,
                    description: [formData.shortDescription, formData.fullDescription].filter(Boolean).join('\n'),
                    skills: formData.skills,
                  })}
                  allowedCategories={CATEGORIES}
                  existingSkills={formData.skills}
                  onCategory={(cat) => setFormData((p) => ({
                    ...p,
                    category: cat,
                    subcategory: (SUBCATEGORIES[cat] || ['Other'])[0],
                  }))}
                  onSkills={(newSkills) => setFormData((p) => ({
                    ...p,
                    skills: Array.from(new Set([...(p.skills || []), ...newSkills])),
                  }))}
                />
              </div>

              <div className="fl-form-group">
                <label>Category</label>
                <ComboSelect
                  options={CATEGORIES}
                  value={formData.category}
                  onChange={(val) => setFormData({
                    ...formData,
                    category: val,
                    subcategory: (SUBCATEGORIES[val] || ['Other'])[0]
                  })}
                  placeholder="Type to search categories…"
                />
              </div>
              <div className="fl-form-group">
                <label>Subcategory</label>
                <ComboSelect
                  options={SUBCATEGORIES[formData.category] || ['Other']}
                  value={formData.subcategory}
                  onChange={(val) => setFormData({...formData, subcategory: val})}
                  placeholder="Type to search subcategories…"
                />
              </div>
              <div className="fl-form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Short Description (for cards)</label>
                <textarea
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
                  rows={2}
                  required
                />
                <AiGenerateText
                  className="fl-ai-generate"
                  fieldLabel="a freelancer's short, catchy one-line gig description (pitching their own service) shown on gig cards in a freelance marketplace"
                  getContext={() => ({ title: formData.title, category: formData.category, skills: formData.skills })}
                  getExistingText={() => formData.shortDescription}
                  onGenerated={(text) => setFormData({ ...formData, shortDescription: text.slice(0, 150) })}
                />
              </div>
              <div className="fl-form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Full Description</label>
                <textarea
                  value={formData.fullDescription}
                  onChange={(e) => setFormData({...formData, fullDescription: e.target.value})}
                  rows={5}
                  required
                />
                <AiGenerateText
                  className="fl-ai-generate"
                  fieldLabel="a freelancer's detailed gig description — what the buyer receives, the process, requirements, and why to choose this freelancer"
                  getContext={() => ({ title: formData.title, category: formData.category, skills: formData.skills, shortDescription: formData.shortDescription })}
                  getExistingText={() => formData.fullDescription}
                  onGenerated={(text) => setFormData({ ...formData, fullDescription: text.slice(0, 2000) })}
                />
              </div>
              <div className="fl-form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Skills</label>
                <TagInput 
                  tags={formData.skills} 
                  onChange={(tags) => setFormData({...formData, skills: tags})} 
                  placeholder="e.g. React, Node.js" 
                />
              </div>
            </div>

            <h4 className="fl-edit-section-title" style={{ marginTop: '1.5rem' }}>Media & Portfolio</h4>
            
            <div className="fl-form-grid">
              <div className="fl-form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Banner Image</label>
                <div 
                  className="fl-upload-box" 
                  onClick={() => bannerRef.current?.click()}
                  style={{ 
                    height: '160px', 
                    border: '2px dashed var(--color-primary-light)', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: 'rgba(4,46,76,0.02)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(4,46,76,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(4,46,76,0.02)'}
                >
                  {formData.media?.banner ? (
                    <img src={formData.media.banner} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                      <Upload size={32} style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
                      <p style={{ fontSize: '0.9rem', fontWeight: 'var(--fw-medium)' }}>Click to upload banner image</p>
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" hidden onChange={handleBannerUpload} accept="image/*" />
              </div>

              <div className="fl-form-group" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <label style={{ margin: 0 }}>Portfolio Images (Max 5)</label>
                  <button type="button" className="fl-btn fl-btn--outline fl-btn--xs" onClick={() => imagesRef.current?.click()}>
                    <Plus size={14} /> Add Images
                  </button>
                </div>
                <input ref={imagesRef} type="file" hidden multiple onChange={handleImagesUpload} accept="image/*" />
                <div className="fl-edit-images-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {(formData.media?.images || []).map((img, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-secondary)' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, media: { ...p.media, images: p.media.images.filter((_, idx) => idx !== i) } }))}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(220,38,38,0.9)', color: 'var(--color-white)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', transition: 'transform 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fl-form-group">
                <label>Video Link (YouTube/Vimeo)</label>
                <input 
                  type="url" 
                  value={formData.media?.videoLink || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    media: { ...formData.media, videoLink: e.target.value }
                  })}
                  placeholder="https://..."
                />
              </div>

              <div className="fl-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <label style={{ margin: 0 }}>Portfolio Links</label>
                  <button type="button" className="fl-btn fl-btn--outline fl-btn--xs" onClick={() => setFormData(p => ({ ...p, media: { ...p.media, portfolioLinks: [...(p.media.portfolioLinks || []), ''] } }))}>
                    <Plus size={14} /> Add Link
                  </button>
                </div>
              <div className="fl-links-edit-list">
                {(formData.media?.portfolioLinks || []).map((link, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input 
                      type="url" 
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...formData.media.portfolioLinks];
                        newLinks[i] = e.target.value;
                        setFormData({...formData, media: { ...formData.media, portfolioLinks: newLinks }});
                      }}
                      placeholder="https://..."
                    />
                    <button type="button" className="fl-btn fl-btn--danger fl-btn--xs" onClick={() => setFormData(p => ({ ...p, media: { ...p.media, portfolioLinks: p.media.portfolioLinks.filter((_, idx) => idx !== i) } }))}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              </div>
            </div>
            
            <h4 className="fl-edit-section-title" style={{ marginTop: '1.5rem' }}>Frequently Asked Questions</h4>
            <div className="fl-faqs-edit-list">
              {formData.faqs.map((faq, i) => (
                <div key={i} className="fl-faq-edit-item" style={{ background: 'var(--color-secondary)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(183, 201, 226, 0.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-mid)' }}>FAQ #{i + 1}</span>
                    <button type="button" className="fl-btn fl-btn--danger fl-btn--xs" onClick={() => removeFaq(i)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="fl-form-group">
                    <input 
                      type="text" 
                      placeholder="Question" 
                      value={faq.question}
                      onChange={(e) => updateFaq(i, 'question', e.target.value)}
                      style={{ marginBottom: '0.5rem' }}
                    />
                    <textarea
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                      rows={2}
                    />
                    <AiGenerateText
                      className="fl-ai-generate"
                      fieldLabel="the answer to a freelancer-written FAQ on their gig listing"
                      getContext={() => ({ title: formData.title, category: formData.category, question: faq.question })}
                      getExistingText={() => faq.answer}
                      onGenerated={(text) => updateFaq(i, 'answer', text)}
                    />
                  </div>
                </div>
              ))}
              <button type="button" className="fl-btn fl-btn--ghost fl-btn--sm" onClick={addFaq} style={{ width: '100%' }}>
                <Plus size={14} /> Add New FAQ
              </button>
            </div>

            <h4 className="fl-edit-section-title" style={{ marginTop: '1.5rem' }}>Pricing Tiers</h4>
            <div className="fl-pricing-edit-grid">
              {['basic', 'standard', 'premium'].map((tier) => (
                <div key={tier} className={`fl-tier-edit fl-tier-edit--${tier}`}>
                  <h5 className="fl-tier-edit__label">{tier.charAt(0).toUpperCase() + tier.slice(1)}</h5>
                  <div className="fl-form-group">
                    <label>Price (PKR)</label>
                    <input 
                      type="number" 
                      value={formData.pricing[tier].price}
                      onChange={(e) => setFormData({
                        ...formData, 
                        pricing: {
                          ...formData.pricing,
                          [tier]: { ...formData.pricing[tier], price: e.target.value }
                        }
                      })}
                      required 
                    />
                  </div>
                  <div className="fl-form-group">
                    <label>Delivery (days)</label>
                    <input 
                      type="number" 
                      value={formData.pricing[tier].deliveryTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        pricing: {
                          ...formData.pricing,
                          [tier]: { ...formData.pricing[tier], deliveryTime: e.target.value }
                        }
                      })}
                      required 
                    />
                  </div>
                  <div className="fl-form-group">
                    <label>Revisions</label>
                    <input 
                      type="number" 
                      value={formData.pricing[tier].revisions}
                      onChange={(e) => setFormData({
                        ...formData, 
                        pricing: {
                          ...formData.pricing,
                          [tier]: { ...formData.pricing[tier], revisions: e.target.value }
                        }
                      })}
                      required 
                    />
                  </div>
                </div>
              ))}
            </div>

          <div className="fl-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-secondary)' }}>
            <button type="button" className="fl-btn fl-btn--ghost" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" className="fl-btn fl-btn--primary">Save Changes</button>
          </div>
        </form>
      </Modal>

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

      {/* Delete Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Gig"
        message="Are you sure you want to delete this gig? All associated data will be permanently removed."
        confirmLabel="Yes, Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <style>{`
        .fl-gig-tabs {
          display: flex; gap: 0.5rem; margin-bottom: 1.5rem;
          background: var(--color-white); padding: 0.35rem;
          border-radius: 12px; border: 1px solid rgba(183,201,226,0.35);
          width: fit-content;
        }
        .fl-gig-tab {
          padding: 0.45rem 1rem; border-radius: 8px;
          font-size: 0.82rem; font-weight: 600; color: var(--color-text-mid);
          transition: all 0.2s;
        }
        .fl-gig-tab:hover { background: var(--color-secondary); color: var(--color-text-dark); }
        .fl-gig-tab--active { background: var(--color-primary); color: var(--color-white); }
        
        .fl-gig-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        
        .fl-gig-card {
          background: var(--color-bg);
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 1px solid var(--color-secondary);
          box-shadow: var(--shadow-md);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .fl-gig-card:hover { 
          transform: translateY(-6px); 
          box-shadow: var(--shadow-lg); 
          border-color: var(--color-accent);
        }
        
        .fl-gig-card__banner {
          height: 160px; 
          background: var(--gradient-primary);
          position: relative; 
          overflow: hidden;
        }
        .fl-gig-card__banner img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
        .fl-gig-card:hover .fl-gig-card__banner img { transform: scale(1.08); }
        .fl-gig-card__placeholder {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          font-size: 3.5rem; opacity: 0.5;
        }
        
        .fl-gig-card__badges { position: absolute; top: 1rem; right: 1rem; display: flex; flex-direction: column; gap: 0.5rem; z-index: 2; }
        .fl-badge { box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .fl-gig-card__stats-overlay {
          position: absolute; bottom: 1rem; left: 1rem; right: 1rem;
          display: flex; justify-content: space-between; pointer-events: none; z-index: 2;
        }
        .fl-stat-chip {
          background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);
          padding: 0.2rem 0.5rem; border-radius: var(--radius-md); font-size: var(--fs-xs); font-weight: var(--fw-bold); color: var(--color-primary);
          box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 0.2rem;
        }
        
        .fl-gig-card__body { padding: var(--space-5); flex-grow: 1; display: flex; flex-direction: column; }
        .fl-gig-card__category { 
          font-size: 0.65rem; font-weight: var(--fw-bold); color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; 
          margin-bottom: var(--space-2);
        }
        .fl-gig-card__title {
          font-family: var(--font-heading); font-size: var(--fs-md); font-weight: var(--fw-bold);
          color: var(--color-primary-dark); margin-bottom: var(--space-2); line-height: var(--lh-snug);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          transition: color 0.2s;
        }
        .fl-gig-card:hover .fl-gig-card__title { color: var(--color-primary-light); }
        .fl-gig-card__desc {
          font-size: var(--fs-sm); color: var(--color-text-mid); margin-bottom: var(--space-3); line-height: var(--lh-normal);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fl-gig-card__full-desc-preview {
          display: none;
        }
        
        .fl-gig-card__tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: var(--space-4); }
        .fl-gig-card__tags .fl-tag { 
          font-size: var(--fs-xs); 
          padding: 0.25rem 0.6rem; 
          border-radius: var(--radius-xl); 
          background: var(--color-primary); 
          color: var(--color-white); 
          font-weight: var(--fw-bold);
        }
        
        .fl-gig-card__pricing-tiers {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
          margin-bottom: var(--space-4); background: var(--color-secondary); 
          padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-accent);
        }
        .fl-tier-preview { text-align: center; display: flex; flex-direction: column; gap: 0.2rem; }
        .fl-tier-preview span { font-size: 0.65rem; color: var(--color-text-mid); text-transform: uppercase; font-weight: var(--fw-bold); letter-spacing: 0.05em; }
        .fl-tier-preview strong { font-size: var(--fs-md); color: var(--color-primary-dark); font-weight: var(--fw-bold); }

        .fl-gig-card__footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: var(--space-4); border-top: 1px solid var(--color-secondary); margin-top: auto;
        }
        .fl-gig-card__orders { font-size: var(--fs-sm); color: var(--color-text-mid); display: flex; align-items: center; gap: 0.3rem; }
        .fl-gig-card__orders strong { color: var(--color-primary-dark); font-weight: var(--fw-bold); font-size: var(--fs-md); }
        .fl-gig-card__actions { display: flex; gap: var(--space-2); }

        /* Edit Form Styles */
        .fl-edit-section-title { 
          font-size: 0.8rem; font-weight: 800; color: var(--color-primary); 
          text-transform: uppercase; border-bottom: 2px solid rgba(183, 201, 226, 0.2);
          padding-bottom: 0.5rem; margin-bottom: 1.25rem; 
        }
        .fl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .fl-pricing-edit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
        @media (max-width: 800px) { .fl-pricing-edit-grid { grid-template-columns: 1fr; } }
        
        .fl-tier-edit {
          background: var(--color-white);
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid rgba(183, 201, 226, 0.35);
          box-shadow: 0 4px 12px rgba(4, 46, 76, 0.03);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .fl-tier-edit:hover {
          box-shadow: 0 8px 24px rgba(4, 46, 76, 0.08);
          transform: translateY(-2px);
          border-color: rgba(183, 201, 226, 0.6);
        }

        .fl-tier-edit::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 5px;
        }
        /* Tier progression uses one brand-navy family (light → dark) instead of
           unrelated amber/gray/green hues, so Basic/Standard/Premium read as a
           depth scale rather than three arbitrary colors. */
        .fl-tier-edit--basic { border-color: rgba(183, 201, 226, 0.5); }
        .fl-tier-edit--basic::before { background: linear-gradient(90deg, var(--color-accent), var(--color-primary-light)); }
        .fl-tier-edit--standard { border-color: rgba(10, 74, 115, 0.3); }
        .fl-tier-edit--standard::before { background: var(--color-primary-light); }
        .fl-tier-edit--premium { border-color: rgba(4, 46, 76, 0.35); }
        .fl-tier-edit--premium::before { background: var(--gradient-primary); }

        .fl-tier-edit__label {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.4rem 0.9rem;
          border-radius: 20px;
        }
        .fl-tier-edit--basic .fl-tier-edit__label { background: rgba(183, 201, 226, 0.25); color: var(--color-text-mid); }
        .fl-tier-edit--standard .fl-tier-edit__label { background: rgba(10, 74, 115, 0.1); color: var(--color-primary-light); }
        .fl-tier-edit--premium .fl-tier-edit__label { background: rgba(4, 46, 76, 0.1); color: var(--color-primary); }

        .fl-form-group { margin-bottom: 1.25rem; }
        .fl-form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text-mid); margin-bottom: 0.5rem; }
        .fl-form-group input:not(.cmbo__input):not(.fl-tag-input__field), .fl-form-group textarea {
          width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid rgba(183, 201, 226, 0.35);
          font-size: 0.9rem; transition: all 0.2s; background: var(--color-secondary);
        }
        .fl-form-group input:not(.cmbo__input):not(.fl-tag-input__field):focus, .fl-form-group textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(4,46,76,0.05); background: var(--color-white); }
        
        .fl-empty-message { text-align: center; padding: 4rem 2rem; }
        @media (max-width: 600px) {
          .fl-gig-grid { grid-template-columns: 1fr; }
          .fl-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default FreelancerGigs;
