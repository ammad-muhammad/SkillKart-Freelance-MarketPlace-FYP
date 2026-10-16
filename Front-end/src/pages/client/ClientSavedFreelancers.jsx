import { useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { Bookmark, BookmarkMinus, MapPin, Star, UserCheck, Search, ChevronRight } from 'lucide-react';
import Loader from '../../Components/common/Loader/Loader';
import './ClientDashboard.css';

const ClientSavedFreelancers = () => {
  const { savedFreelancers: saved, savedLoading, toggleSavedFreelancer } = useClient();
  const navigate = useNavigate();

  const removeSaved = (freelancer) => {
    toggleSavedFreelancer(freelancer);
  };

  return (
    <div className="cl-page-root">
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Saved Freelancers</h1>
          <p className="cl-page-sub">Quickly access and manage the top talent you have bookmarked for projects.</p>
        </div>
        <button
          className="cl-btn cl-btn--outline"
          onClick={() => navigate('/browse-freelancers')}
        >
          <Search size={16} strokeWidth={2.2} /> Browse More Talent
        </button>
      </div>

      {savedLoading ? (
        <div className="cl-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, padding: '4rem 2rem' }}>
          <Loader size="md" text="Loading saved talent..." />
        </div>
      ) : saved.length === 0 ? (
        <div className="cl-card" style={{ textAlign: 'center', padding: '4.5rem 2rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#EAFBF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Bookmark size={32} strokeWidth={2} />
          </div>
          <h3 style={{ color: '#0B2942', fontWeight: 800, fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Your saved talent list is empty</h3>
          <p style={{ color: '#64748B', maxWidth: 440, margin: '0 auto 1.5rem', fontSize: '0.92rem', lineHeight: 1.55 }}>
            Browse through verified freelancers, review their portfolios and skill tests, and click the bookmark icon to save them here for quick hiring.
          </p>
          <button
            className="cl-btn cl-btn--primary"
            onClick={() => navigate('/browse-freelancers')}
          >
            <Search size={16} strokeWidth={2.5} /> Browse Verified Talent
          </button>
        </div>
      ) : (
        <div className="cl-saved-grid">
          {saved.map(f => (
            <div key={f.id} className="cl-card cl-freelancer-card">
              <button
                className="cl-freelancer-card__unsave"
                onClick={() => removeSaved(f)}
                title="Remove from saved"
                aria-label="Remove from saved"
              >
                <BookmarkMinus size={18} />
              </button>
              
              <div className="cl-freelancer-card__header">
                <div className="cl-freelancer-card__avatar">
                  {f.avatar ? <img src={f.avatar} alt={f.name} loading="lazy" /> : <span>{f.name?.charAt(0) || 'U'}</span>}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 className="cl-freelancer-card__name">{f.name}</h3>
                  <p className="cl-freelancer-card__title">{f.title || 'Freelancer'}</p>
                </div>
              </div>

              <div className="cl-freelancer-card__stats">
                <span className="cl-freelancer-card__stat-pill">
                  <Star size={13} fill="#F59E0B" color="#F59E0B" style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {f.rating || 0} ({f.reviews || 0})
                </span>
                {f.location && (
                  <span className="cl-freelancer-card__stat-pill">
                    <MapPin size={13} color="#10B981" style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {f.location}
                  </span>
                )}
              </div>

              {f.description && (
                <p className="cl-freelancer-card__desc">
                  {f.description}
                </p>
              )}

              <div className="cl-freelancer-card__skills">
                {f.skills?.length > 0 ? (
                  f.skills.slice(0, 5).map(s => <span key={s} className="cl-tag">{s}</span>)
                ) : (
                  <span className="cl-tag" style={{ opacity: 0.6 }}>No skills listed</span>
                )}
                {f.skills?.length > 5 && (
                  <span className="cl-tag" style={{ background: '#F1F5F9', borderColor: '#E2E8F0', color: '#64748B' }}>
                    +{f.skills.length - 5} more
                  </span>
                )}
              </div>

              <div className="cl-freelancer-card__footer">
                <div className="cl-freelancer-card__rate">
                  <span style={{ fontSize: 12, color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Starting Rate</span>
                  <strong style={{ fontSize: '1.15rem', color: '#0B2942' }}>Rs. {f.hourlyRate || 0}</strong> <span style={{ color: '#64748B', fontSize: 13 }}>/ hr</span>
                </div>
                <button
                  className="cl-btn cl-btn--primary cl-btn--sm"
                  onClick={() => navigate(`/freelancers/${f.id}`)}
                >
                  View Profile <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .cl-saved-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr));
          gap: 1.5rem;
        }
        .cl-freelancer-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          padding: 1.6rem;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(11, 41, 66, 0.04);
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s, border-color 0.22s;
        }
        .cl-freelancer-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.35);
        }
        .cl-freelancer-card__unsave {
          position: absolute;
          top: 1.4rem;
          right: 1.4rem;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #94A3B8;
          transition: all 0.2s;
        }
        .cl-freelancer-card__unsave:hover {
          color: #EF4444;
          background: #FEF2F2;
          border-color: rgba(239, 68, 68, 0.3);
          transform: scale(1.05);
        }
        .cl-freelancer-card__header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-right: 3rem;
        }
        .cl-freelancer-card__avatar {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #10B981, #0B2942);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.35rem;
          flex-shrink: 0;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .cl-freelancer-card__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cl-freelancer-card__name {
          font-size: 1.1rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          color: #0B2942;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cl-freelancer-card__title {
          font-size: 0.85rem;
          color: #64748B;
          margin-top: 0.2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cl-freelancer-card__stats {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .cl-freelancer-card__stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          background: #F8FAFC;
          border-radius: 999px;
          border: 1px solid #E2E8F0;
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }
        .cl-freelancer-card__desc {
          font-size: 0.88rem;
          color: #475569;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cl-freelancer-card__skills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .cl-freelancer-card__footer {
          margin-top: auto;
          padding-top: 1.1rem;
          border-top: 1px solid #EDF2F7;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        @media (max-width: 479.98px) {
          .cl-saved-grid { gap: 1rem; }
          .cl-freelancer-card { padding: 1.15rem; }
          .cl-freelancer-card__unsave { top: 1rem; right: 1rem; }
        }
        @media (hover: none) {
          .cl-freelancer-card:hover { transform: none; }
        }
      `}</style>
    </div>
  );
};

export default ClientSavedFreelancers;
