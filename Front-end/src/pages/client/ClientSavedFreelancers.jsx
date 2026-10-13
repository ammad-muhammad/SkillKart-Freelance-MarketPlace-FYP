import { useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { Bookmark, BookmarkMinus, MapPin, Star } from 'lucide-react';
import './ClientDashboard.css';

const ClientSavedFreelancers = () => {
  const { savedFreelancers: saved, savedLoading, toggleSavedFreelancer } = useClient();
  const navigate = useNavigate();

  const removeSaved = (freelancer) => {
    // toggleSavedFreelancer persists to the backend and updates context state
    toggleSavedFreelancer(freelancer);
  };

  return (
    <div className="cl-saved-page">
      <div className="cl-page-header">
        <h1 className="cl-page-title">Saved Freelancers</h1>
        <p className="cl-page-sub">Quickly access the talent you've bookmarked for future projects.</p>
      </div>

      {savedLoading ? (
        <div className="cl-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="cl-spinner" />
          <p style={{ color: 'var(--color-text-light)', marginTop: '1rem' }}>Loading your saved freelancers…</p>
        </div>
      ) : saved.length === 0 ? (
        <div className="cl-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}><Bookmark size={64} /></div>
          <h3 style={{ color: 'var(--color-primary)' }}>Your list is empty</h3>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
            Browse freelancers and click the bookmark icon to save them here.
          </p>
          <button
            className="cl-btn cl-btn--primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => navigate('/browse-freelancers')}
          >
            Browse Talent
          </button>
        </div>
      ) : (
        <div className="cl-saved-grid">
          {saved.map(f => (
            <div key={f.id} className="cl-card cl-freelancer-card animate-fade-in">
              <button
                className="cl-freelancer-card__unsave"
                onClick={() => removeSaved(f)}
                title="Remove from saved"
              >
                <BookmarkMinus size={20} />
              </button>
              
              <div className="cl-freelancer-card__header">
                <div className="cl-freelancer-card__avatar">
                  {f.avatar ? <img src={f.avatar} alt={f.name} loading="lazy" /> : <span>{f.name.charAt(0)}</span>}
                </div>
                <div>
                  <h3 className="cl-freelancer-card__name">{f.name}</h3>
                  <p className="cl-freelancer-card__title">{f.title || 'Freelancer'}</p>
                </div>
              </div>

              <div className="cl-freelancer-card__stats">
                <span><Star size={14} fill="currentColor" style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> {f.rating || 0} ({f.reviews || 0})</span>
                {f.location && <span><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> {f.location}</span>}
              </div>

              {f.description && (
                <p className="cl-freelancer-card__desc" style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)', marginBottom: '1rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {f.description}
                </p>
              )}

              <div className="cl-freelancer-card__skills">
                {f.skills?.length > 0 ? (
                  f.skills.map(s => <span key={s} className="cl-tag">{s}</span>)
                ) : (
                  <span className="cl-tag" style={{ opacity: 0.6 }}>No skills listed</span>
                )}
              </div>

              <div className="cl-freelancer-card__footer">
                <span className="cl-freelancer-card__rate"><strong>Rs. {f.hourlyRate || 0}</strong> / hr</span>
                <button
                  className="cl-btn cl-btn--primary cl-btn--sm"
                  onClick={() => navigate(`/freelancers/${f.id}`)}
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .cl-saved-grid {
          display: grid;
          /* min(100%, 400px) lets the column shrink below 400px on narrow phones
             so a 400px card can't push the page wider than the viewport. */
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr));
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .cl-saved-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .cl-freelancer-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
          background: var(--color-bg);
          border: 1px solid var(--color-secondary);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .cl-freelancer-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--color-accent); }
        .cl-freelancer-card__unsave {
          position: absolute; top: 1.5rem; right: 1.5rem;
          background: rgba(4,46,76,0.05); border: none; 
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--color-text-light); transition: all 0.2s;
        }
        .cl-freelancer-card__unsave:hover { color: var(--color-error); background: var(--color-error-tint); }
        .cl-freelancer-card__header { display: flex; align-items: center; gap: 1rem; padding-right: 2.5rem; }
        .cl-freelancer-card__avatar {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--gradient-primary); color: var(--color-white);
          display: flex; align-items: center; justify-content: center;
          font-weight: var(--fw-bold); font-size: 1.5rem; flex-shrink: 0;
          overflow: hidden;
        }
        .cl-freelancer-card__avatar img { width: 100%; height: 100%; object-fit: cover; }
        .cl-freelancer-card__name { font-size: var(--fs-md); font-family: var(--font-heading); font-weight: var(--fw-bold); color: var(--color-primary-dark); }
        .cl-freelancer-card__title { font-size: var(--fs-sm); color: var(--color-text-mid); margin-top: 0.25rem; }
        .cl-freelancer-card__stats { display: flex; gap: 1.5rem; font-size: var(--fs-sm); color: var(--color-text-mid); font-weight: var(--fw-medium); }
        .cl-freelancer-card__skills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .cl-freelancer-card__footer {
          margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(183, 201, 226, 0.35);
          display: flex; justify-content: space-between; align-items: center;
        }
        .cl-freelancer-card__rate { font-size: 0.875rem; color: var(--color-text-mid); }
        .cl-spinner {
          width: 38px; height: 38px; margin: 0 auto;
          border: 3px solid rgba(183, 201, 226, 0.35); border-top-color: var(--color-primary);
          border-radius: 50%; animation: cl-spin 0.8s linear infinite;
        }
        @keyframes cl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientSavedFreelancers;
