import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import Modal from './components/Modal';
import './FreelancerDashboard.css';

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
      <span className={`fl-badge fl-badge--${gig.status}`} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
        {gig.status === 'active' ? '● Active' : '⏸ Paused'}
      </span>
    </div>
    <div className="fl-gig-card__body">
      <p className="fl-gig-card__category">{gig.category} · {gig.subcategory}</p>
      <h3 className="fl-gig-card__title">{gig.title}</h3>
      <p className="fl-gig-card__desc">{gig.shortDescription}</p>
      <div className="fl-gig-card__tags">
        {gig.skills.slice(0, 3).map((s) => (
          <span key={s} className="fl-tag">{s}</span>
        ))}
      </div>
      <div className="fl-gig-card__footer">
        <div className="fl-gig-card__price">
          <span className="fl-gig-card__price-label">Starting at</span>
          <span className="fl-gig-card__price-value">${gig.pricing.basic.price}</span>
        </div>
        <div className="fl-gig-card__actions">
          <button
            className={`fl-btn fl-btn--sm fl-btn--${gig.status === 'active' ? 'ghost' : 'outline'}`}
            onClick={() => onToggleStatus(gig._id)}
            title={gig.status === 'active' ? 'Pause Gig' : 'Activate Gig'}
          >
            {gig.status === 'active' ? '⏸' : '▶'}
          </button>
          <Link to={`/freelancer/gigs/edit/${gig._id}`} className="fl-btn fl-btn--sm fl-btn--outline">
            ✏
          </Link>
          <button className="fl-btn fl-btn--sm fl-btn--danger" onClick={() => onDelete(gig._id)}>
            🗑
          </button>
        </div>
      </div>
    </div>
  </div>
);

const FreelancerGigs = () => {
  const { gigs, deleteGig, toggleGigStatus } = useFreelancer();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = gigs.filter((g) => filter === 'all' || g.status === filter);

  const confirmDelete = () => {
    if (deleteTarget) { deleteGig(deleteTarget); setDeleteTarget(null); }
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
            />
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} title="Delete Gig" onClose={() => setDeleteTarget(null)} danger>
        <p style={{ marginBottom: '1.25rem' }}>
          Are you sure you want to delete this gig? All associated data will be permanently removed.
        </p>
        <div className="fl-actions" style={{ marginTop: 0 }}>
          <button className="fl-btn fl-btn--danger" onClick={confirmDelete}>Yes, Delete</button>
          <button className="fl-btn fl-btn--ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
        </div>
      </Modal>

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
        .fl-gig-tab--active {
          background: var(--color-primary); color: #fff;
        }
        .fl-gig-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .fl-gig-card {
          background: #fff; border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(183,201,226,0.35);
          box-shadow: 0 2px 12px rgba(4,46,76,0.07);
          transition: transform 0.2s, box-shadow 0.2s;
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
        .fl-gig-card__body { padding: 1.1rem; }
        .fl-gig-card__category { font-size: 0.72rem; font-weight: 700; color: var(--color-text-light); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.3rem; }
        .fl-gig-card__title {
          font-family: var(--font-heading); font-size: 0.95rem; font-weight: 700;
          color: var(--color-primary); margin-bottom: 0.4rem;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fl-gig-card__desc {
          font-size: 0.8rem; color: var(--color-text-mid); margin-bottom: 0.75rem; 
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fl-gig-card__tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.75rem; }
        .fl-gig-card__footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 0.75rem; border-top: 1px solid #f0f4f8;
        }
        .fl-gig-card__price-label { font-size: 0.72rem; color: var(--color-text-light); display: block; }
        .fl-gig-card__price-value { font-size: 1.1rem; font-weight: 800; color: var(--color-primary); }
        .fl-gig-card__actions { display: flex; gap: 0.4rem; }
        .fl-empty-message { text-align: center; padding: 3rem 2rem; }
        @media (max-width: 600px) {
          .fl-gig-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default FreelancerGigs;
