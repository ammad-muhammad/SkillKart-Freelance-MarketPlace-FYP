import { useState, useRef } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Edit2, Trash2, Eye, Plus, FolderOpen, Package, Loader } from 'lucide-react';
import Modal from './components/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import './FreelancerDashboard.css';

const PortfolioProjectCard = ({ item, onEdit, onDelete }) => (
  <div className="fl-gig-card fl-portfolio-project-card">
    <div className="fl-gig-card__banner">
      {item.images?.[0] ? (
        <img src={item.images[0]} alt={item.title} className="fl-gig-card__img" />
      ) : (
        <div className="fl-gig-card__placeholder">
          <ImageIcon size={40} className="fl-placeholder-icon" />
        </div>
      )}
      <div className="fl-gig-card__overlay">
        <div className="fl-p-card__actions">
          <button className="fl-action-btn fl-action-btn--edit" onClick={() => onEdit(item)} title="Edit Project"><Edit2 size={14} /></button>
          <button className="fl-action-btn fl-action-btn--delete" onClick={() => onDelete(item._id)} title="Delete Project"><Trash2 size={14} /></button>
        </div>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="fl-p-card__link-btn">
            View Live Project ↗
          </a>
        )}
      </div>
    </div>
    <div className="fl-gig-card__body">
      <div className="fl-gig-card__category">Portfolio Project</div>
      <h3 className="fl-gig-card__title">{item.title}</h3>
      <p className="fl-gig-card__desc">{item.description}</p>
    </div>
  </div>
);

const FreelancerPortfolio = () => {
  const { profile, gigs, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, showToast } = useFreelancer();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    images: []
  });

  const handleOpenAdd = () => {
    setEditTarget(null);
    setFormData({ title: '', description: '', url: '', images: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditTarget(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      url: item.url || '',
      images: item.images || []
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { uploadPortfolioImage } = await import('../../utils/uploadHelper');
      const url = await uploadPortfolioImage(file);
      setFormData(prev => ({ ...prev, images: [url] }));
      showToast('Image uploaded successfully!');
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editTarget) {
      await updatePortfolioItem(editTarget._id, formData);
    } else {
      await addPortfolioItem(formData);
    }
    setIsModalOpen(false);
  };

  const [deletingBusy, setDeletingBusy] = useState(false);
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeletingBusy(true);
    const result = await deletePortfolioItem(deletingId);
    setDeletingBusy(false);
    // deletePortfolioItem returns true on success (legacy boolean) — close then.
    if (result !== false) setDeletingId(null);
  };

  return (
    <div>
      <div className="fl-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="fl-page-title">Portfolio Projects</h1>
          <p className="fl-page-sub">Showcase your best professional work and side projects.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link 
            to={`/freelancers/${user?._id || user?.id}`} 
            className="fl-btn fl-btn--outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Eye size={14} /> View Public Profile
          </Link>
          <button className="fl-btn fl-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={handleOpenAdd}><Plus size={14} /> Add Project</button>
        </div>
      </div>

      {/* Main Portfolio Grid */}
      <div className="fl-portfolio-main-grid">
        {(profile?.portfolio || []).length === 0 ? (
          <div className="fl-empty-message">
            <div className="fl-empty-icon"><FolderOpen size={48} /></div>
            <h3>Your Portfolio is Empty</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px', marginInline: 'auto' }}>
              Adding projects with descriptions and images helps you get noticed by clients.
            </p>
            <button className="fl-btn fl-btn--primary" onClick={handleOpenAdd}>Add Your First Project</button>
          </div>
        ) : (
          <div className="fl-gig-grid">
            {(profile?.portfolio || []).map((item) => (
              <PortfolioProjectCard 
                key={item._id} 
                item={item} 
                onEdit={handleOpenEdit} 
                onDelete={setDeletingId} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Service Gigs (Secondary) */}
      <div className="fl-service-gigs-section" style={{ marginTop: '3rem' }}>
        <div className="fl-section-header">
          <h3 className="fl-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={18} /> Service Gigs</h3>
          <p className="fl-section-sub">Quick view of your active freelance services.</p>
        </div>
        {gigs.length === 0 ? (
          <p className="fl-no-data">No active gigs yet.</p>
        ) : (
          <div className="fl-gig-grid">
            {gigs.map((gig) => (
              <div key={gig._id} className="fl-gig-card">
                <div className="fl-gig-card__banner">
                  {gig.media?.banner ? (
                    <img src={gig.media.banner} alt={gig.title} className="fl-gig-card__img" />
                  ) : (
                    <div className="fl-gig-card__placeholder">
                      <Package size={40} className="fl-placeholder-icon" />
                    </div>
                  )}
                </div>
                <div className="fl-gig-card__body">
                  <div className="fl-gig-card__category">{gig.category}</div>
                  <h3 className="fl-gig-card__title">{gig.title}</h3>
                  <p className="fl-gig-card__desc">{gig.shortDescription}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={isModalOpen} title={editTarget ? 'Edit Portfolio Project' : 'Add New Project'} onClose={() => setIsModalOpen(false)} size="lg">
        <form onSubmit={handleSubmit} className="fl-edit-form">
          <div className="fl-edit-form__scroll" style={{ paddingRight: '0.75rem', marginRight: '-0.75rem' }}>
            
            <div className="fl-form-group">
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '0.5rem', display: 'block' }}>Project Title</label>
              <input 
                type="text" 
                placeholder="e.g. E-Commerce Dashboard Design"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required 
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--color-secondary)', fontSize: '1rem', background: '#f8fafc', transition: 'all 0.2s' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(4,46,76,0.05)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div className="fl-form-group" style={{ marginTop: '1.25rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '0.5rem', display: 'block' }}>Description & Technologies</label>
              <textarea 
                rows={5}
                placeholder="What did you build? What technologies did you use?"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required 
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--color-secondary)', fontSize: '0.95rem', background: '#f8fafc', resize: 'vertical', transition: 'all 0.2s' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(4,46,76,0.05)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
              />
              <AiGenerateText
                className="fl-ai-generate"
                fieldLabel="a portfolio project description on a freelancer's profile — what they built and what technologies they used"
                getContext={() => ({ title: formData.title, url: formData.url })}
                getExistingText={() => formData.description}
                onGenerated={(text) => setFormData({ ...formData, description: text })}
              />
            </div>

            <div className="fl-form-group" style={{ marginTop: '1.25rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '0.5rem', display: 'block' }}>Project URL (Optional)</label>
              <input 
                type="url" 
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--color-secondary)', fontSize: '0.95rem', background: '#f8fafc', transition: 'all 0.2s' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(4,46,76,0.05)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            
            <div className="fl-form-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '0.5rem', display: 'block' }}>Project Cover Image</label>
              <div 
                className="fl-p-upload-zone"
                onClick={() => !isUploading && fileInputRef.current.click()}
                style={{ 
                  height: '220px', 
                  border: '2px dashed var(--color-primary-light)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  overflow: 'hidden',
                  background: 'rgba(4,46,76,0.02)',
                  opacity: isUploading ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => !isUploading && (e.currentTarget.style.background = 'rgba(4,46,76,0.05)')}
                onMouseOut={e => !isUploading && (e.currentTarget.style.background = 'rgba(4,46,76,0.02)')}
              >
                {formData.images?.[0] ? (
                  <img src={formData.images[0]} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="fl-p-upload-zone__content" style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                    <div style={{ marginBottom: '0.75rem', opacity: 0.8 }}>{isUploading ? <Loader className="spin" size={40} /> : <ImageIcon size={40} />}</div>
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>{isUploading ? 'Uploading Image...' : 'Click to upload a cover image'}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>(WEBP, PNG, JPG accepted)</p>
                  </div>
                )}
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                hidden 
                onChange={handleImageUpload} 
              />
              {formData.images?.[0] && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="fl-btn fl-btn--outline fl-btn--sm" 
                    onClick={(e) => { e.stopPropagation(); setFormData({...formData, images: []}); }}
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="fl-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-secondary)' }}>
            <button type="button" className="fl-btn fl-btn--ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="fl-btn fl-btn--primary" disabled={isUploading}>
              {editTarget ? 'Update Project' : 'Save Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        title="Remove Project?"
        message="Are you sure you want to remove this project from your portfolio? This cannot be undone."
        confirmLabel="Delete Project"
        loading={deletingBusy}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />

      <style>{`
        .fl-portfolio-main-grid { margin-top: 2rem; }
        
        .fl-gig-grid {
          display: grid;
          /* min(100%, 320px) lets a column shrink to the available width when
             320px won't fit — so the card never overflows a narrow container. */
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
          gap: 2rem;
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
          height: 190px;
          position: relative;
          background: #f8fafc;
          overflow: hidden;
        }

        .fl-gig-card__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .fl-gig-card:hover .fl-gig-card__img {
          transform: scale(1.05);
        }

        .fl-gig-card__overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(4, 46, 76, 0.4);
          backdrop-filter: blur(2px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .fl-gig-card:hover .fl-gig-card__overlay {
          opacity: 1;
        }

        .fl-p-card__actions {
          display: flex;
          gap: 0.75rem;
        }

        .fl-action-btn {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.2s;
        }

        .fl-action-btn:hover {
          transform: scale(1.1);
          background: var(--color-primary);
          color: #fff;
        }

        .fl-action-btn--delete:hover {
          background: #dc2626;
        }

        .fl-p-card__link-btn {
          background: #fff;
          color: var(--color-primary);
          padding: 0.6rem 1.25rem;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.2s;
        }

        .fl-p-card__link-btn:hover {
          transform: scale(1.05);
          background: var(--color-primary);
          color: #fff;
        }

        .fl-gig-card__body {
          padding: var(--space-5);
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }

        .fl-gig-card__category {
          font-size: 0.65rem;
          font-weight: var(--fw-bold);
          color: var(--color-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--space-2);
        }

        .fl-gig-card__title {
          font-family: var(--font-heading);
          font-size: var(--fs-md);
          font-weight: var(--fw-bold);
          color: var(--color-primary-dark);
          margin-bottom: var(--space-2);
          line-height: var(--lh-snug);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.2s;
        }

        .fl-gig-card:hover .fl-gig-card__title { color: var(--color-primary-light); }

        .fl-gig-card__desc {
          font-size: var(--fs-sm);
          color: var(--color-text-mid);
          margin-bottom: var(--space-3);
          line-height: var(--lh-normal);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mini Gig Section Enhancement */
        .fl-service-gigs-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 2.5rem;
          border-radius: 32px;
        }

        .fl-section-header { margin-bottom: 2rem; }
        .fl-section-title { font-size: 1.5rem; font-weight: 800; color: var(--color-primary); }
        .fl-section-sub { font-size: 0.9rem; color: #64748b; }

        .fl-empty-message {
          padding: 5rem 2rem;
          text-align: center;
          background: #fff;
          border-radius: 32px;
          border: 2px dashed #e2e8f0;
        }

        .fl-empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }

        .fl-p-upload-zone {
          border: 2px dashed #cbd5e1;
          border-radius: var(--radius-xl);
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          transition: all 0.2s;
          overflow: hidden;
        }

        .fl-p-upload-zone:hover {
          border-color: var(--color-primary);
          background: #f0f4f8;
        }

        .fl-p-upload-zone img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .fl-p-upload-zone__content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-mid);
        }

        .fl-p-upload-zone__content span { font-size: 2rem; }
        .fl-p-upload-zone__content p { font-size: var(--fs-sm); font-weight: var(--fw-medium); }

        .fl-placeholder-icon {
          font-size: 4rem;
          opacity: 0.4;
        }

        .fl-gig-card__placeholder {
          width: 100%; 
          height: 100%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background: rgba(0, 0, 0, 0.02);
          color: var(--color-primary);
        }

        /* ── Mobile ──────────────────────────────────────────────
           The Service Gigs section's 2.5rem padding left too little room for the
           gig card inside on phones. Trim the padding (and the grid gap) so the
           card fits comfortably. */
        @media (max-width: 640px) {
          .fl-service-gigs-section { padding: 1.25rem; border-radius: 20px; }
          .fl-gig-grid { gap: 1.25rem; }
          .fl-section-title { font-size: 1.15rem; }
        }
        @media (max-width: 400px) {
          .fl-service-gigs-section { padding: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default FreelancerPortfolio;
