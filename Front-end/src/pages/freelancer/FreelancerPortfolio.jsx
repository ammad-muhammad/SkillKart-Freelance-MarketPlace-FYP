import { useState, useRef } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { Link } from 'react-router-dom';
import Modal from './components/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import './FreelancerDashboard.css';

const PortfolioProjectCard = ({ item, onEdit, onDelete }) => (
  <div className="fl-gig-card fl-portfolio-project-card">
    <div className="fl-gig-card__banner">
      {item.images?.[0] ? (
        <img src={item.images[0]} alt={item.title} className="fl-gig-card__img" />
      ) : (
        <div className="fl-gig-card__placeholder">
          <div className="fl-placeholder-icon">🖼️</div>
        </div>
      )}
      <div className="fl-gig-card__overlay">
        <div className="fl-p-card__actions">
          <button className="fl-action-btn fl-action-btn--edit" onClick={() => onEdit(item)} title="Edit Project">✏️</button>
          <button className="fl-action-btn fl-action-btn--delete" onClick={() => onDelete(item._id)} title="Delete Project">🗑️</button>
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
    } catch (error) {
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
        <button className="fl-btn fl-btn--primary" onClick={handleOpenAdd}>＋ Add Project</button>
      </div>

      {/* Main Portfolio Grid */}
      <div className="fl-portfolio-main-grid">
        {(profile?.portfolio || []).length === 0 ? (
          <div className="fl-empty-message">
            <div className="fl-empty-icon">📂</div>
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
          <h3 className="fl-section-title">📦 Service Gigs</h3>
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
                      <div className="fl-placeholder-icon">📦</div>
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
      <Modal open={isModalOpen} title={editTarget ? 'Edit Portfolio Project' : 'Add New Project'} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="fl-edit-form">
          <div className="fl-form-group">
            <label>Project Title</label>
            <input 
              type="text" 
              placeholder="e.g. E-Commerce Dashboard Design"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required 
            />
          </div>
          <div className="fl-form-group">
            <label>Description</label>
            <textarea 
              rows={4}
              placeholder="What did you build? What technologies did you use?"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required 
            />
          </div>
          <div className="fl-form-group">
            <label>Project URL (Optional)</label>
            <input 
              type="url" 
              placeholder="https://github.com/..."
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
            />
          </div>
          
          <div className="fl-form-group">
            <label>Project Image</label>
            <div 
              className="fl-p-upload-zone"
              onClick={() => !isUploading && fileInputRef.current.click()}
              style={{ opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
            >
              {formData.images?.[0] ? (
                <img src={formData.images[0]} alt="preview" />
              ) : (
                <div className="fl-p-upload-zone__content">
                  <span>{isUploading ? '⌛' : '📸'}</span>
                  <p>{isUploading ? 'Uploading Image...' : 'Click to upload (WEBP, PNG, JPG)'}</p>
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
              <button 
                type="button" 
                className="fl-btn fl-btn--sm fl-btn--ghost" 
                style={{ marginTop: '0.5rem' }}
                onClick={() => setFormData({...formData, images: []})}
              >
                Change Image
              </button>
            )}
          </div>

          <div className="fl-actions" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="fl-btn fl-btn--primary" disabled={isUploading}>
              {editTarget ? 'Update Project' : 'Save Project'}
            </button>
            <button type="button" className="fl-btn fl-btn--ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
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
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .fl-gig-card {
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.7);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          display: flex;
          flex-direction: column;
        }

        .fl-gig-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 32px rgba(4, 46, 76, 0.1);
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
          padding: 1.5rem;
          flex-grow: 1;
        }

        .fl-gig-card__category {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .fl-gig-card__title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--color-primary);
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .fl-gig-card__desc {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.6;
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
          border-radius: 20px;
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
          background: #f1f5f9;
        }

        .fl-placeholder-icon {
          font-size: 4rem;
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
};

export default FreelancerPortfolio;
