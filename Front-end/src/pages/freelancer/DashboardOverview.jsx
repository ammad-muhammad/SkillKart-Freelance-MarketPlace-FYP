import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import { Package, Zap, CheckCircle2, Eye, MapPin, Calendar, Star, FolderOpen, Award, Search, ClipboardList, MessageSquare, Bot, Play, RotateCcw, Circle, PauseCircle } from 'lucide-react';
import ShareStory from './components/ShareStory';
import Skeleton from '../../Components/common/Skeleton/Skeleton';
import './FreelancerDashboard.css';

const StatCard = ({ icon, value, label, to }) => {
  const inner = (
    <>
      <div className="fl-stat-card__bg">{icon}</div>
      <div className="fl-stat-card__icon">{icon}</div>
      <div className="fl-stat-card__value">{value}</div>
      <div className="fl-stat-card__label">{label}</div>
    </>
  );
  return to
    ? <Link to={to} className="fl-stat-card fl-stat-card--link">{inner}</Link>
    : <div className="fl-stat-card">{inner}</div>;
};

const DashboardOverview = () => {
  const { profile, gigs, proposals, loading } = useFreelancer();
  const [showAllSkills, setShowAllSkills] = useState(false);
  const personalInfo = profile?.personalInfo || {};
  
  // Real stats calculation
  const activeProposals = proposals.filter(p => p.status === 'pending').length;
  const acceptedProposals = proposals.filter(p => p.status === 'accepted').length;

  if (loading) {
    return (
      <div>
        <div className="fl-page-header">
          <Skeleton width="300px" height="32px" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width="400px" height="20px" />
        </div>
        
        <div className="fl-card fl-dashboard-hero" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Skeleton variant="circle" width="72px" height="72px" />
          <div style={{ flex: 1 }}>
            <Skeleton width="200px" height="24px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="150px" height="16px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="300px" height="16px" />
          </div>
          <Skeleton width="120px" height="40px" />
        </div>

        <div className="fl-stat-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="fl-stat-card">
              <Skeleton width="32px" height="32px" style={{ marginBottom: '0.6rem' }} />
              <Skeleton width="60px" height="32px" style={{ marginBottom: '0.25rem' }} />
              <Skeleton width="100px" height="16px" />
            </div>
          ))}
        </div>
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
    { icon: <Package size={20} />,     value: gigs.length,                              label: 'Total Gigs',     to: '/freelancer/gigs' },
    { icon: <Zap size={20} />,         value: activeProposals,                          label: 'Active Bids',    to: '/freelancer/proposals' },
    { icon: <CheckCircle2 size={20} />, value: acceptedProposals,                        label: 'Accepted',       to: '/freelancer/proposals' },
    { icon: <Eye size={20} />,         value: (profile?.stats?.profileViews || 0).toLocaleString(),    label: 'Profile Views',  to: '/freelancer/profile' },
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
              <span><Star size={13} style={{display:'inline',verticalAlign:'middle',fill:'#facc15',color:'#facc15'}} /> {profile?.stats?.rating > 0 ? `${profile.stats.rating.toFixed(1)} Rating` : 'New'}</span>
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

      {/* Verification Progress Checklist */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title">
          <CheckCircle2 size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Verification Progress
        </h3>
        <div className="fl-verification-checklist">
          {[
            { key: 'emailVerified', label: 'Email Verification', required: true },
            { key: 'profileCompleted', label: 'Profile Completion (Bio, Title, Skills)', required: true },
            { key: 'onboardingCompleted', label: 'Onboarding Flow Completed', required: true },
            { key: 'allSkillTestsPassed', label: 'Skill Verification (Tests Passed)', required: true },
            { key: 'paymentMethodAdded', label: 'Payment Method Linked', required: false },
          ].map((item) => {
            // Also consider paymentMethodAdded completed if stripeOnboardingComplete is true
            let isCompleted = profile.verificationDetails?.[item.key];
            if (item.key === 'paymentMethodAdded' && profile.stripeOnboardingComplete) {
              isCompleted = true;
            }
            
            return (
              <div key={item.key} className={`fl-check-item ${isCompleted ? 'fl-check-item--done' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="fl-check-icon">
                    {isCompleted ? <CheckCircle2 size={18} fill="#10b981" color="#fff" /> : <div className="fl-check-circle" />}
                  </span>
                  <span className="fl-check-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.label}
                    {item.required && !isCompleted && <span className="fl-check-tag">Required</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {profile.verificationStatus !== 'verified' && (
          <div className="fl-verification-notice">
            <p>Your profile is currently <strong>{profile.verificationStatus}</strong>. Complete all required steps above to unlock full platform features and expert badges.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="fl-section-title">
          <Zap size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Quick Actions
        </h3>
        <div className="fl-dashboard-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/browse-projects" className="fl-btn fl-btn--primary"><Search size={16} style={{ marginRight: 6 }} /> Find Work</Link>
          <Link to="/freelancer/gigs/create" className="fl-btn fl-btn--outline">✚ Create Gig</Link>
          <Link to="/freelancer/proposals" className="fl-btn fl-btn--ghost"><ClipboardList size={16} style={{ marginRight: 6 }} /> My Proposals</Link>
          <Link to="/freelancer/messages" className="fl-btn fl-btn--ghost"><MessageSquare size={16} style={{ marginRight: 6 }} /> Messages</Link>
          <Link to="/ai-matchmaking" className="fl-btn fl-btn--ghost"><Bot size={16} style={{ marginRight: 6 }} /> AI Matchmaking</Link>
        </div>
      </div>

      {/* Share Success Story → appears on the public homepage */}
      <ShareStory />

      {/* Skill Verification Center */}
      <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="fl-section-title" style={{ margin: 0 }}>
            <Award size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Skill Verification Center
          </h3>
          {!profile.verifiedSkills?.length && (
            <Link to="/freelancer/skill-test" className="fl-btn fl-btn--primary fl-btn--sm">
              Start Baseline Test
            </Link>
          )}
        </div>
        
        <div className="fl-skill-grid">
          {(profile.verifiedSkills || []).slice(0, showAllSkills ? undefined : 8).map((skill) => (
            <div key={skill._id || skill.name} className="fl-skill-item">
              <div className="fl-skill-item__header">
                <span className="fl-skill-name">{skill.name}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className={`fl-skill-level fl-skill-level--${skill.level.toLowerCase()}`}>
                    {skill.level}
                  </span>
                  <Link 
                    to={`/freelancer/skill-test?skill=${encodeURIComponent(skill.name)}`} 
                  >
                    <button className="fl-btn fl-btn--sm fl-btn--outline">
                      {skill.isVerified ? <><RotateCcw size={14} style={{ marginRight: 4 }} /> Retake</> : <><Play size={14} style={{ marginRight: 4 }} /> Take Test</>}
                    </button>
                  </Link>
                </div>
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
              <p>No skills verified yet. Take the baseline test to unlock expert status!</p>
            </div>
          )}
        </div>
        {(profile.verifiedSkills || []).length > 8 && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button 
              type="button"
              className="fl-btn fl-btn--primary fl-btn--sm" 
              onClick={() => setShowAllSkills(!showAllSkills)}
            >
              {showAllSkills ? 'Show Less' : `Show More (${profile.verifiedSkills.length - 8} hidden)`}
            </button>
          </div>
        )}
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
                <span className={`fl-status-badge fl-status-badge--${gig.status}`}>
                  {gig.status === 'active' ? <><Circle size={10} style={{ marginRight: 4, fill: 'currentColor' }} /> Active</> : <><PauseCircle size={12} style={{ marginRight: 4 }} /> Paused</>}
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
        .fl-skill-action-btn {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-primary);
          text-decoration: none;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(26, 111, 168, 0.05);
          transition: all 0.2s;
        }
        .fl-skill-action-btn:hover {
          background: var(--color-primary);
          color: #fff;
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

        .fl-verification-checklist {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }
        .fl-check-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .fl-check-item--done {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .fl-check-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
        }
        .fl-check-circle {
          width: 18px; height: 18px;
          border: 2px solid #cbd5e1;
          border-radius: 50%;
        }
        .fl-check-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-mid);
          display: flex;
          flex-direction: column;
        }
        .fl-check-item--done .fl-check-label {
          color: #065f46;
        }
        .fl-check-tag {
          font-size: 0.65rem;
          font-weight: 700;
          color: #ef4444;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .fl-check-tag--optional {
          color: #64748b;
        }
        .fl-verification-notice {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #92400e;
        }
        .fl-verification-notice strong {
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
};

export default DashboardOverview;
