import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import Modal from './components/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import { Plus, X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
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
          <span>📦</span>
        </div>
      )}
      <div className="fl-gig-card__badges">
        <span className={`fl-badge fl-badge--${gig.status}`}>
          {gig.status === 'active' ? '● Active' : '⏸ Paused'}
        </span>
      </div>
      <div className="fl-gig-card__stats-overlay">
        <div className="fl-stat-chip">👁 {gig.stats?.views || 0}</div>
        <div className="fl-stat-chip">⭐ {gig.stats?.rating?.toFixed(1) || '0.0'}</div>
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
          <strong>${gig.pricing?.basic?.price || '—'}</strong>
        </div>
        <div className="fl-tier-preview">
          <span>Standard</span>
          <strong>${gig.pricing?.standard?.price || '—'}</strong>
        </div>
        <div className="fl-tier-preview">
          <span>Premium</span>
          <strong>${gig.pricing?.premium?.price || '—'}</strong>
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
            {gig.status === 'active' ? '⏸' : '▶'}
          </button>
          <button className="fl-btn fl-btn--sm fl-btn--outline" onClick={() => onEdit(gig)}>
            ✏
          </button>
          <button className="fl-btn fl-btn--sm fl-btn--danger" onClick={() => onDelete(gig._id)}>
            🗑
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
      basic: { price: 0, delivery: 1, revisions: 1 },
      standard: { price: 0, delivery: 1, revisions: 1 },
      premium: { price: 0, delivery: 1, revisions: 1 }
    },
    media: { banner: null, images: [], videoLink: '', portfolioLinks: [] },
    faqs: []
  });

  const [uploading, setUploading] = useState(false);
  const bannerRef = useRef(null);
  const imagesRef = useRef(null);

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
          delivery: gig.pricing?.basic?.delivery || 1,
          revisions: gig.pricing?.basic?.revisions || 1
        },
        standard: { 
          price: gig.pricing?.standard?.price || 0,
          delivery: gig.pricing?.standard?.delivery || 1,
          revisions: gig.pricing?.standard?.revisions || 1
        },
        premium: { 
          price: gig.pricing?.premium?.price || 0,
          delivery: gig.pricing?.premium?.delivery || 1,
          revisions: gig.pricing?.premium?.revisions || 1
        }
      },
      media: gig.media || { banner: null, images: [], videoLink: '', portfolioLinks: [] },
      faqs: gig.faqs || []
    });
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { uploadBanner } = await import('../../utils/uploadHelper');
      const url = await uploadBanner(file);
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

  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { uploadPortfolioImage } = await import('../../utils/uploadHelper');
      const uploadPromises = files.map(file => uploadPortfolioImage(file));
      const urls = await Promise.all(uploadPromises);
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
          <p style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</p>
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
      <Modal open={!!editTarget} title="Edit Gig Details" onClose={() => setEditTarget(null)}>
        <form onSubmit={handleUpdate} className="fl-edit-form">
          <div className="fl-edit-form__scroll">
            <h4 className="fl-edit-section-title">General Info</h4>
            <div className="fl-form-group">
              <label>Gig Title</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required 
              />
            </div>
            {/* AI suggest & fill — category + skills from the gig title/description */}
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

            <div className="fl-form-grid">
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
            </div>
            <div className="fl-form-group">
              <label>Short Description (for cards)</label>
              <textarea 
                value={formData.shortDescription}
                onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
                rows={2}
                required 
              />
            </div>
            <div className="fl-form-group">
              <label>Full Description</label>
              <textarea 
                value={formData.fullDescription}
                onChange={(e) => setFormData({...formData, fullDescription: e.target.value})}
                rows={5}
                required 
              />
            </div>
            <div className="fl-form-group">
              <label>Skills</label>
              <TagInput 
                tags={formData.skills} 
                onChange={(tags) => setFormData({...formData, skills: tags})} 
                placeholder="e.g. React, Node.js" 
              />
            </div>

            <h4 className="fl-edit-section-title" style={{ marginTop: '1.5rem' }}>Media & Portfolio</h4>
            
            <div className="fl-form-group">
              <label>Banner Image</label>
              <div 
                className="fl-upload-box" 
                onClick={() => bannerRef.current?.click()}
                style={{ 
                  height: '140px', 
                  border: '2px dashed #e2e8f0', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  background: '#f8fafc'
                }}
              >
                {formData.media?.banner ? (
                  <img src={formData.media.banner} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={24} style={{ marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.75rem' }}>Click to upload banner</p>
                  </div>
                )}
              </div>
              <input ref={bannerRef} type="file" hidden onChange={handleBannerUpload} accept="image/*" />
            </div>

            <div className="fl-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Portfolio Images (Max 5)</label>
                <button type="button" className="fl-btn fl-btn--ghost fl-btn--xs" onClick={() => imagesRef.current?.click()}>
                  <Plus size={12} /> Add
                </button>
              </div>
              <input ref={imagesRef} type="file" hidden multiple onChange={handleImagesUpload} accept="image/*" />
              <div className="fl-edit-images-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {(formData.media?.images || []).map((img, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, media: { ...p.media, images: p.media.images.filter((_, idx) => idx !== i) } }))}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(255,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ✕
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Portfolio Links</label>
                <button type="button" className="fl-btn fl-btn--ghost fl-btn--xs" onClick={() => setFormData(p => ({ ...p, media: { ...p.media, portfolioLinks: [...(p.media.portfolioLinks || []), ''] } }))}>
                  <Plus size={12} /> Add Link
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
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <h4 className="fl-edit-section-title" style={{ marginTop: '1.5rem' }}>Frequently Asked Questions</h4>
            <div className="fl-faqs-edit-list">
              {formData.faqs.map((faq, i) => (
                <div key={i} className="fl-faq-edit-item" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>FAQ #{i + 1}</span>
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
                    <label>Price ($)</label>
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
                      value={formData.pricing[tier].delivery}
                      onChange={(e) => setFormData({
                        ...formData, 
                        pricing: {
                          ...formData.pricing,
                          [tier]: { ...formData.pricing[tier], delivery: e.target.value }
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
          </div>

          <div className="fl-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
            <button type="submit" className="fl-btn fl-btn--primary">Save Full Gig</button>
            <button type="button" className="fl-btn fl-btn--ghost" onClick={() => setEditTarget(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

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
          background: #fff; padding: 0.35rem;
          border-radius: 12px; border: 1px solid rgba(183,201,226,0.35);
          width: fit-content;
        }
        .fl-gig-tab {
          padding: 0.45rem 1rem; border-radius: 8px;
          font-size: 0.82rem; font-weight: 600; color: var(--color-text-mid);
          transition: all 0.2s;
        }
        .fl-gig-tab:hover { background: #f0f4f8; color: var(--color-text-dark); }
        .fl-gig-tab--active { background: var(--color-primary); color: #fff; }
        
        .fl-gig-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        
        .fl-gig-card {
          background: #fff; border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(183,201,226,0.35);
          box-shadow: 0 2px 12px rgba(4,46,76,0.07);
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex; flex-direction: column;
        }
        .fl-gig-card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(4,46,76,0.14); }
        
        .fl-gig-card__banner {
          height: 160px; background: var(--gradient-primary);
          position: relative; overflow: hidden;
        }
        .fl-gig-card__banner img { width: 100%; height: 100%; object-fit: cover; }
        .fl-gig-card__placeholder {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          font-size: 3.5rem; opacity: 0.5;
        }
        
        .fl-gig-card__badges { position: absolute; top: 0.75rem; right: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .fl-gig-card__stats-overlay {
          position: absolute; bottom: 0.75rem; left: 0.75rem; right: 0.75rem;
          display: flex; justify-content: space-between; pointer-events: none;
        }
        .fl-stat-chip {
          background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);
          padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; color: var(--color-primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .fl-gig-card__body { padding: 1.25rem; flex-grow: 1; display: flex; flex-direction: column; }
        .fl-gig-card__category { font-size: 0.7rem; font-weight: 800; color: var(--color-text-light); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
        .fl-gig-card__title {
          font-family: var(--font-heading); font-size: 1rem; font-weight: 700;
          color: var(--color-primary); margin-bottom: 0.5rem;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fl-gig-card__desc {
          font-size: 0.85rem; color: var(--color-text-mid); margin-bottom: 0.5rem; 
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fl-gig-card__full-desc-preview {
          font-size: 0.75rem; color: var(--color-text-light); font-style: italic;
          margin-bottom: 0.75rem; line-height: 1.4; flex-grow: 1;
        }
        
        .fl-gig-card__tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
        
        .fl-gig-card__pricing-tiers {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
          margin-bottom: 1.25rem; background: #f8fafc; padding: 0.75rem; border-radius: 12px;
        }
        .fl-tier-preview { text-align: center; display: flex; flex-direction: column; gap: 0.15rem; }
        .fl-tier-preview span { font-size: 0.6rem; color: var(--color-text-light); text-transform: uppercase; font-weight: 700; }
        .fl-tier-preview strong { font-size: 0.9rem; color: var(--color-primary); }

        .fl-gig-card__footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 1rem; border-top: 1px solid #f1f5f9; margin-top: auto;
        }
        .fl-gig-card__orders { font-size: 0.75rem; color: var(--color-text-mid); }
        .fl-gig-card__orders strong { color: var(--color-primary); font-weight: 700; }
        .fl-gig-card__actions { display: flex; gap: 0.5rem; }

        /* Edit Form Styles */
        .fl-edit-form__scroll { max-height: 60vh; overflow-y: auto; padding-right: 0.75rem; }
        .fl-edit-form__scroll::-webkit-scrollbar { width: 5px; }
        .fl-edit-form__scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .fl-edit-section-title { 
          font-size: 0.8rem; font-weight: 800; color: var(--color-primary); 
          text-transform: uppercase; border-bottom: 2px solid #f1f5f9; 
          padding-bottom: 0.5rem; margin-bottom: 1.25rem; 
        }
        .fl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .fl-pricing-edit-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .fl-tier-edit { background: #f8fafc; padding: 1.25rem; border-radius: 14px; border: 1px solid #e2e8f0; }
        .fl-tier-edit--basic { border-left: 5px solid #cd7f32; }
        .fl-tier-edit--standard { border-left: 5px solid #94a3b8; }
        .fl-tier-edit--premium { border-left: 5px solid #fbbf24; }
        .fl-tier-edit__label { font-size: 0.85rem; font-weight: 800; margin-bottom: 1rem; color: var(--color-primary); }
        
        .fl-form-group { margin-bottom: 1.25rem; }
        .fl-form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text-mid); margin-bottom: 0.5rem; }
        .fl-form-group input, .fl-form-group textarea {
          width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid #e2e8f0;
          font-size: 0.9rem; transition: all 0.2s;
        }
        .fl-form-group input:focus, .fl-form-group textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(4,46,76,0.05); }
        
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
