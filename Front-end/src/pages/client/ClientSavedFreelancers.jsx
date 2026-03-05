import { useState } from 'react';
import { useClient } from '../../context/ClientContext';
import './ClientDashboard.css';

const MOCK_SAVED = [
  {
    id: 1,
    name: 'Alex Rivera',
    title: 'Senior Full Stack Developer',
    rating: 4.9,
    reviews: 124,
    hourlyRate: 45,
    skills: ['React', 'Node.js', 'AWS'],
    avatar: null,
    location: 'Ukraine'
  },
  {
    id: 2,
    name: 'Sophia Chen',
    title: 'UI/UX Product Designer',
    rating: 5.0,
    reviews: 89,
    hourlyRate: 55,
    skills: ['Figma', 'Prototyping', 'Product Design'],
    avatar: null,
    location: 'Singapore'
  },
  {
    id: 3,
    name: 'Jordan Smith',
    title: 'Mobile App Expert (iOS/Android)',
    rating: 4.8,
    reviews: 210,
    hourlyRate: 60,
    skills: ['Flutter', 'React Native', 'Firebase'],
    avatar: null,
    location: 'USA'
  }
];

const ClientSavedFreelancers = () => {
  const { showToast } = useClient();
  const [saved, setSaved] = useState(MOCK_SAVED);

  const removeSaved = (id) => {
    setSaved(prev => prev.filter(f => f.id !== id));
    showToast('Freelancer removed from saved list.', 'info');
  };

  return (
    <div className="cl-saved-page">
      <div className="cl-page-header">
        <h1 className="cl-page-title">Saved Freelancers</h1>
        <p className="cl-page-sub">Quickly access the talent you've bookmarked for future projects.</p>
      </div>

      {saved.length === 0 ? (
        <div className="cl-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔖</div>
          <h3 style={{ color: 'var(--color-primary)' }}>Your list is empty</h3>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
            Browse freelancers and click the bookmark icon to save them here.
          </p>
          <button className="cl-btn cl-btn--primary" style={{ marginTop: '1.5rem' }}>
            Browse Talent
          </button>
        </div>
      ) : (
        <div className="cl-saved-grid">
          {saved.map(f => (
            <div key={f.id} className="cl-card cl-freelancer-card animate-fade-in">
              <button 
                className="cl-freelancer-card__unsave" 
                onClick={() => removeSaved(f.id)}
                title="Remove from saved"
              >
                🔖
              </button>
              
              <div className="cl-freelancer-card__header">
                <div className="cl-freelancer-card__avatar">
                  {f.avatar ? <img src={f.avatar} alt={f.name} /> : <span>{f.name.charAt(0)}</span>}
                </div>
                <div>
                  <h3 className="cl-freelancer-card__name">{f.name}</h3>
                  <p className="cl-freelancer-card__title">{f.title}</p>
                </div>
              </div>

              <div className="cl-freelancer-card__stats">
                <span>⭐ {f.rating} ({f.reviews})</span>
                <span>📍 {f.location}</span>
              </div>

              <div className="cl-freelancer-card__skills">
                {f.skills.map(s => <span key={s} className="cl-tag">{s}</span>)}
              </div>

              <div className="cl-freelancer-card__footer">
                <span className="cl-freelancer-card__rate"><strong>${f.hourlyRate}</strong> / hr</span>
                <button className="cl-btn cl-btn--primary cl-btn--sm">View Profile</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .cl-saved-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .cl-freelancer-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.2s;
        }
        .cl-freelancer-card:hover { transform: translateY(-4px); }
        .cl-freelancer-card__unsave {
          position: absolute; top: 1.25rem; right: 1.25rem;
          background: none; border: none; font-size: 1.25rem;
          cursor: pointer; opacity: 0.8; transition: opacity 0.2s;
        }
        .cl-freelancer-card__unsave:hover { opacity: 1; color: var(--color-primary); }
        .cl-freelancer-card__header { display: flex; align-items: center; gap: 0.75rem; }
        .cl-freelancer-card__avatar {
          width: 50px; height: 50px; border-radius: 50%;
          background: var(--gradient-primary); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1.2rem; flex-shrink: 0;
        }
        .cl-freelancer-card__name { font-size: 1rem; font-weight: 700; color: var(--color-primary); }
        .cl-freelancer-card__title { font-size: 0.8rem; color: var(--color-text-light); }
        .cl-freelancer-card__stats { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--color-text-mid); font-weight: 600; }
        .cl-freelancer-card__skills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .cl-freelancer-card__footer {
          margin-top: auto; padding-top: 1rem; border-top: 1px solid #f0f4f8;
          display: flex; justify-content: space-between; align-items: center;
        }
        .cl-freelancer-card__rate { font-size: 0.875rem; color: var(--color-text-mid); }
      `}</style>
    </div>
  );
};

export default ClientSavedFreelancers;
