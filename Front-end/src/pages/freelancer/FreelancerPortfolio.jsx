import { useFreelancer } from '../../context/FreelancerContext';
import { Link } from 'react-router-dom';
import './FreelancerDashboard.css';

const FreelancerPortfolio = () => {
  const { profile, gigs } = useFreelancer();

  return (
    <div>
      <div className="fl-page-header">
        <h1 className="fl-page-title">Portfolio</h1>
        <p className="fl-page-sub">Showcase your best work and projects.</p>
      </div>

      {/* Portfolio Links */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title">🔗 Portfolio Links</h3>
        {profile.portfolioLinks.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
            No portfolio links added yet. <Link to="/freelancer/profile" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Add links →</Link>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {profile.portfolioLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="fl-portfolio-link"
              >
                <span>🌐</span>
                <span>{link}</span>
                <span style={{ marginLeft: 'auto' }}>↗</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Gig Portfolio */}
      <div className="fl-card">
        <h3 className="fl-section-title">📦 Gig Portfolio</h3>
        {gigs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🖼️</p>
            <p style={{ marginBottom: '1rem' }}>No gigs to display. Create your first gig to populate your portfolio.</p>
            <Link to="/freelancer/gigs/create" className="fl-btn fl-btn--primary">＋ Create Gig</Link>
          </div>
        ) : (
          <div className="fl-portfolio-grid">
            {gigs.map((gig) => (
              <div key={gig.id} className="fl-portfolio-card">
                <div className="fl-portfolio-card__img">
                  {gig.media?.banner ? (
                    <img src={gig.media.banner} alt={gig.title} />
                  ) : (
                    <div className="fl-portfolio-card__placeholder">📦</div>
                  )}
                </div>
                <div className="fl-portfolio-card__info">
                  <span className="fl-portfolio-card__cat">{gig.category}</span>
                  <p className="fl-portfolio-card__title">{gig.title}</p>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {gig.skills.slice(0, 3).map((s) => <span key={s} className="fl-tag">{s}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .fl-portfolio-link {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.7rem 1rem; border-radius: 10px;
          background: #f8fafc; border: 1px solid #e5edf5;
          font-size: 0.85rem; color: var(--color-primary); font-weight: 600;
          transition: all 0.2s;
        }
        .fl-portfolio-link:hover { background: rgba(4,46,76,0.06); text-decoration: underline; }
        .fl-portfolio-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem;
        }
        .fl-portfolio-card {
          border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(183,201,226,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .fl-portfolio-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(4,46,76,0.12); }
        .fl-portfolio-card__img { height: 140px; background: var(--gradient-hero); overflow: hidden; }
        .fl-portfolio-card__img img { width: 100%; height: 100%; object-fit: cover; }
        .fl-portfolio-card__placeholder {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          font-size: 3rem; opacity: 0.4;
        }
        .fl-portfolio-card__info { padding: 0.85rem; background: #fff; }
        .fl-portfolio-card__cat { font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-light); letter-spacing: 0.06em; }
        .fl-portfolio-card__title { font-size: 0.875rem; font-weight: 700; color: var(--color-primary); margin-top: 0.2rem; line-clamp: 2; }
      `}</style>
    </div>
  );
};

export default FreelancerPortfolio;
