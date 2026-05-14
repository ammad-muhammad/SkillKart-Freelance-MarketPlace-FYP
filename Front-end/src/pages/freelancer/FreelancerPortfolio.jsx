import { useState, useRef } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { Link } from 'react-router-dom';
import Modal from './components/Modal';
import './FreelancerDashboard.css';

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
      setFormData(prev => ({ ...prev, images: [url] })); // Support single image for now
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

  const handleDelete = async () => {
    if (deletingId) {
      await deletePortfolioItem(deletingId);
      setDeletingId(null);
    }
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
          <div className="fl-card fl-empty-message">
            <p style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📂</p>
            <h3>Your Portfolio is Empty</h3>
            <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              Adding projects with descriptions and images helps you get noticed by clients.
            </p>
            <button className="fl-btn fl-btn--primary" onClick={handleOpenAdd}>Add Your First Project</button>
          </div>
        ) : (
          <div className="fl-portfolio-items">
            {(profile?.portfolio || []).map((item) => (
              <div key={item._id} className="fl-card fl-p-item">
                <div className="fl-p-item__image">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.title} />
                  ) : (
                    <div className="fl-p-item__placeholder">🖼️</div>
                  )}
                </div>
                <div className="fl-p-item__content">
                  <h3 className="fl-p-item__title">{item.title}</h3>
                  <p className="fl-p-item__desc">{item.description}</p>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="fl-p-item__link">
                      View Live Project ↗
                    </a>
                  )}
                  <div className="fl-p-item__actions">
                    <button className="fl-btn fl-btn--sm fl-btn--ghost" onClick={() => handleOpenEdit(item)}>Edit</button>
                    <button className="fl-btn fl-btn--sm fl-btn--danger-ghost" onClick={() => setDeletingId(item._id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legacy Links Section (Optional Cleanup) */}
      {(profile?.portfolioLinks || []).length > 0 && (
        <div className="fl-card" style={{ marginTop: '2rem' }}>
          <h4 className="fl-section-title">Other Links</h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {profile.portfolioLinks.map((link, i) => (
              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="fl-portfolio-link">
                🌐 {link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Gig Portfolio (Secondary) */}
      <div className="fl-card" style={{ marginTop: '2rem' }}>
        <h3 className="fl-section-title">📦 Service Gigs</h3>
        {gigs.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>No active gigs yet.</p>
        ) : (
          <div className="fl-portfolio-grid">
            {gigs.map((gig) => (
              <div key={gig._id} className="fl-portfolio-card">
                <div className="fl-portfolio-card__img">
                  {gig.media?.banner ? <img src={gig.media.banner} alt={gig.title} /> : <div className="fl-portfolio-card__placeholder">📦</div>}
                </div>
                <div className="fl-portfolio-card__info">
                  <span className="fl-portfolio-card__cat">{gig.category}</span>
                  <p className="fl-portfolio-card__title">{gig.title}</p>
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
                  <p>{isUploading ? 'Uploading Image...' : 'Click to upload project thumbnail'}</p>
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
      <Modal open={!!deletingId} title="Remove Project?" onClose={() => setDeletingId(null)} danger>
        <p style={{ marginBottom: '1.5rem' }}>Are you sure you want to remove this project from your portfolio? This cannot be undone.</p>
        <div className="fl-actions" style={{ marginTop: 0 }}>
          <button className="fl-btn fl-btn--danger" onClick={handleDelete}>Delete Project</button>
          <button className="fl-btn fl-btn--ghost" onClick={() => setDeletingId(null)}>Cancel</button>
        </div>
      </Modal>

      <style>{`
        .fl-portfolio-main-grid { margin-top: 1.5rem; }
        .fl-portfolio-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
        .fl-p-item { 
          display: flex; flex-direction: column; padding: 0; overflow: hidden;
          transition: transform 0.2s;
        }
        .fl-p-item:hover { transform: translateY(-4px); }
        .fl-p-item__image { height: 180px; background: #f1f5f9; position: relative; }
        .fl-p-item__image img { width: 100%; height: 100%; object-fit: cover; }
        .fl-p-item__placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .fl-p-item__content { padding: 1.25rem; }
        .fl-p-item__title { font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-bottom: 0.5rem; }
        .fl-p-item__desc { 
          font-size: 0.85rem; color: var(--color-text-mid); line-height: 1.5; margin-bottom: 1rem;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fl-p-item__link { font-size: 0.8rem; font-weight: 700; color: var(--color-primary); text-decoration: none; display: block; margin-bottom: 1.25rem; }
        .fl-p-item__link:hover { text-decoration: underline; }
        .fl-p-item__actions { display: flex; gap: 0.5rem; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
        
        .fl-p-upload-zone {
          border: 2px dashed #e2e8f0; border-radius: 12px; height: 150px;
          display: flex; align-items: center; justify-content: center; text-align: center;
          transition: all 0.2s;
        }
        .fl-p-upload-zone:hover { border-color: var(--color-primary); background: #f8fafc; }
        .fl-p-upload-zone img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
        .fl-p-upload-zone__content span { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
        .fl-p-upload-zone__content p { font-size: 0.75rem; color: var(--color-text-light); }

        .fl-btn--danger-ghost { color: #dc2626; background: transparent; font-size: 0.8rem; font-weight: 700; padding: 0.4rem 0.8rem; }
        .fl-btn--danger-ghost:hover { background: #fef2f2; }

        .fl-portfolio-link {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.5rem 0.85rem; border-radius: 8px;
          background: #f8fafc; border: 1px solid #e2e8f0;
          font-size: 0.75rem; color: var(--color-primary); font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default FreelancerPortfolio;
