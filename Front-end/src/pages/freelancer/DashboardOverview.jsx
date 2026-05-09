import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import { Package, Zap, CheckCircle2, Eye, MapPin, Calendar, Star, FolderOpen, Award } from 'lucide-react';
import './FreelancerDashboard.css';

const StatCard = ({ icon, value, label }) => (
  <div className="fl-stat-card">
    <div className="fl-stat-card__bg">{icon}</div>
    <div className="fl-stat-card__icon">{icon}</div>
    <div className="fl-stat-card__value">{value}</div>
    <div className="fl-stat-card__label">{label}</div>
  </div>
);

const DashboardOverview = () => {
  const { profile, gigs, proposals, loading } = useFreelancer();
  const personalInfo = profile?.personalInfo || {};
  
  // Real stats calculation
  const activeProposals = proposals.filter(p => p.status === 'pending').length;
  const acceptedProposals = proposals.filter(p => p.status === 'accepted').length;

  if (loading) {
    return (
      <div className="fl-loading-container">
        <div className="fl-loader"></div>
        <p>Syncing your dashboard...</p>
      </div>
    );
  }

  const initials = (personalInfo.fullName || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statsData = [
    { icon: <Package size={20} />,     value: gigs.length,                              label: 'Total Gigs'       },
    { icon: <Zap size={20} />,         value: activeProposals,                          label: 'Active Bids'    },
    { icon: <CheckCircle2 size={20} />, value: acceptedProposals,                        label: 'Accepted' },
    { icon: <Eye size={20} />,         value: (profile?.stats?.profileViews || 0).toLocaleString(),    label: 'Profile Views'    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="fl-page-header">
        <h1 className="fl-page-title">Welcome back, {(personalInfo.fullName || 'User').split(' ')[0]}!</h1>
        <p className="fl-page-sub">Here's an overview of your freelance activity.</p>
      </div>

      {/* Profile Hero Card */}
      <div className="fl-card fl-dashboard-hero" style={{ marginBottom: '1.5rem' }}>
        <div className="fl-dashboard-hero__inner">
          <div className="fl-dashboard-hero__avatar">
            {personalInfo?.avatar ? (
              <img src={personalInfo.avatar} alt={personalInfo.fullName} />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="fl-dashboard-hero__info">
            <h2 className="fl-dashboard-hero__name">{personalInfo.fullName}</h2>
            <p className="fl-dashboard-hero__title">{personalInfo.title}</p>
            <p className="fl-dashboard-hero__meta">
              <span><MapPin size={13} style={{display:'inline',verticalAlign:'middle'}} /> {personalInfo.location}</span>
              <span><Calendar size={13} style={{display:'inline',verticalAlign:'middle'}} /> Member since {personalInfo.memberSince}</span>
              <span><Star size={13} style={{display:'inline',verticalAlign:'middle',fill:'#facc15',color:'#facc15'}} /> 4.9 Rating</span>
            </p>
          </div>
          <Link to="/freelancer/profile" className="fl-btn fl-btn--outline">
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="fl-stat-grid">
        {statsData.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title"><Zap size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/freelancer/gigs/create" className="fl-btn fl-btn--primary">＋ Create New Gig</Link>
          <Link to="/freelancer/gigs" className="fl-btn fl-btn--ghost">View My Gigs</Link>
          <Link to="/freelancer/profile" className="fl-btn fl-btn--ghost">Update Profile</Link>
          <Link to="/freelancer/settings" className="fl-btn fl-btn--ghost">Account Settings</Link>
        </div>
      </div>

      {/* Skill Verification Center */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="fl-section-title" style={{ margin: 0 }}>
            <Award size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Skill Verification Center
          </h3>
          <Link to="/freelancer/skill-test" className="fl-btn fl-btn--outline fl-btn--sm">
            {profile.verifiedSkills?.length > 0 ? 'Retake Test' : 'Start Verification'}
          </Link>
        </div>
        
        <div className="fl-skill-grid">
          {(profile.verifiedSkills || []).map((skill) => (
            <div key={skill._id || skill.name} className="fl-skill-item">
              <div className="fl-skill-item__header">
                <span className="fl-skill-name">{skill.name}</span>
                <span className={`fl-skill-level fl-skill-level--${skill.level.toLowerCase()}`}>
                  {skill.level}
                </span>
              </div>
              <div className="fl-skill-progress-bg">
                <div 
                  className="fl-skill-progress-bar" 
                  style={{ width: `${skill.verificationScore}%`, background: skill.isVerified ? '#3b82f6' : '#94a3b8' }} 
                />
              </div>
              <div className="fl-skill-footer">
                <span className="fl-skill-score">{skill.verificationScore}% Accuracy</span>
                {skill.isVerified && <span className="fl-skill-verified">✓ Verified</span>}
              </div>
            </div>
          ))}
          {(!profile.verifiedSkills || profile.verifiedSkills.length === 0) && (
            <div className="fl-empty-state">
              <p>No skills verified yet. Take the test to unlock expert status!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Gigs */}
      <div className="fl-card">
        <h3 className="fl-section-title"><FolderOpen size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Recent Gigs</h3>
        {gigs.length === 0 ? (
          <div className="fl-empty-state">
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
              No gigs yet.{' '}
              <Link to="/freelancer/gigs/create" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                Create your first gig →
              </Link>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {gigs.slice(0, 3).map((gig) => (
              <div key={gig._id || gig.id} className="fl-recent-gig">
                <div className="fl-recent-gig__info">
                  <p className="fl-recent-gig__title">{gig.title}</p>
                  <p className="fl-recent-gig__meta">{gig.category} · ${gig.pricing.basic.price} starting</p>
                </div>
                <span className={`fl-badge fl-badge--${gig.status}`}>
                  {gig.status === 'active' ? '● Active' : '⏸ Paused'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .fl-dashboard-hero__inner {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .fl-dashboard-hero__avatar {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 800; color: #fff;
          flex-shrink: 0; border: 3px solid rgba(183,201,226,0.5);
          overflow: hidden;
        }
        .fl-dashboard-hero__avatar img { width: 100%; height: 100%; object-fit: cover; }
        .fl-dashboard-hero__info { flex: 1; min-width: 0; }
        .fl-dashboard-hero__name {
          font-family: var(--font-heading);
          font-size: 1.3rem; font-weight: 700; color: var(--color-primary);
        }
        .fl-dashboard-hero__title { color: var(--color-text-mid); font-size: 0.9rem; margin: 0.2rem 0; }
        .fl-dashboard-hero__meta {
          display: flex; flex-wrap: wrap; gap: 1rem;
          font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.3rem;
        }
        .fl-recent-gig {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1rem;
          background: #f8fafc; border-radius: 10px;
          border: 1px solid #e5edf5; gap: 1rem;
        }
        .fl-recent-gig__title {
          font-size: 0.875rem; font-weight: 600; color: var(--color-text-dark);
          margin-bottom: 0.2rem;
        }
        .fl-recent-gig__meta { font-size: 0.78rem; color: var(--color-text-light); }
        
        .fl-skill-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
        .fl-skill-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
        }
        .fl-skill-item__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .fl-skill-name {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--color-text-dark);
        }
        .fl-skill-level {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }
        .fl-skill-level--expert { background: #dbeafe; color: #1e40af; }
        .fl-skill-level--intermediate { background: #fef3c7; color: #92400e; }
        .fl-skill-level--beginner { background: #f1f5f9; color: #475569; }
        
        .fl-skill-progress-bg {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          margin-bottom: 0.75rem;
          overflow: hidden;
        }
        .fl-skill-progress-bar {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease-out;
        }
        .fl-skill-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }
        .fl-skill-score { color: var(--color-text-mid); font-weight: 600; }
        .fl-skill-verified { color: #10b981; font-weight: 700; }
        
        .fl-btn--sm { padding: 0.4rem 0.8rem; font-size: 0.75rem; }

        .fl-loading-container {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 400px; gap: 1rem; color: var(--color-text-light);
        }
        .fl-loader {
          width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: var(--color-primary);
          border-radius: 50%; animation: fl-spin 1s linear infinite;
        }
        @keyframes fl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DashboardOverview;
