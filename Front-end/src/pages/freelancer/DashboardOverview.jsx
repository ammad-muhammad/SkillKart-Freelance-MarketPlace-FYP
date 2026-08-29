import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import { Package, Zap, CheckCircle2, Eye, MapPin, Calendar, Star, FolderOpen, Award, Search, ClipboardList, MessageSquare, Bot, Play, RotateCcw, Circle, PauseCircle, ChevronRight, Plus } from 'lucide-react';
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
  const [columns, setColumns] = useState(5);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Based on grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) with 1.5rem (24px) gap
        const width = entry.contentRect.width;
        const cols = Math.floor((width + 24) / 304) || 1;
        setColumns(cols);
      }
    });
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, []);

  const maxVisibleSkills = columns * 2;
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
          <Link to="/freelancer/gigs/create" className="fl-btn fl-btn--outline"><Plus size={16} style={{ marginRight: 6 }} /> Create Gig</Link>
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
        
        <div className="fl-skill-grid" ref={gridRef}>
          {(profile.verifiedSkills || []).slice(0, showAllSkills ? undefined : maxVisibleSkills).map((skill) => (
            <div key={skill._id || skill.name} className={`fl-skill-card ${skill.isVerified ? 'fl-skill-card--verified' : ''}`}>
              <div className="fl-skill-card__top">
                <div className="fl-skill-card__info">
                  <div className="fl-skill-card__title-row">
                    <h4 className="fl-skill-card__name">{skill.name}</h4>
                    {skill.isVerified && <span className="fl-skill-card__badge"><CheckCircle2 size={12} /> Verified</span>}
                  </div>
                  <span className={`fl-skill-level fl-skill-level--${skill.level.toLowerCase()}`}>
                    {skill.level}
                  </span>
                </div>
                <div className="fl-skill-card__score-col">
                   <span className="fl-skill-card__score-val">{skill.verificationScore}%</span>
                   <span className="fl-skill-card__score-lbl">Accuracy</span>
                </div>
              </div>

              <div className="fl-skill-card__progress">
                <div className="fl-skill-card__progress-track">
                  <div 
                    className="fl-skill-card__progress-fill" 
                    style={{ width: `${skill.verificationScore}%` }} 
                  />
                </div>
              </div>

              <div className="fl-skill-card__footer">
                <Link to={`/freelancer/skill-test?skill=${encodeURIComponent(skill.name)}`} style={{ textDecoration: 'none', width: '100%' }}>
                  <button className={`fl-btn fl-btn--sm ${skill.isVerified ? 'fl-btn--outline' : 'fl-btn--primary'}`} style={{ width: '100%', justifyContent: 'center' }}>
                    {skill.isVerified ? <><RotateCcw size={14} style={{ marginRight: '6px' }} /> Retake Test</> : <><Play size={14} style={{ marginRight: '6px' }} /> Verify Skill</>}
                  </button>
                </Link>
              </div>
            </div>
          ))}
          {(!profile.verifiedSkills || profile.verifiedSkills.length === 0) && (
            <div className="fl-empty-state">
              <p>No skills verified yet. Take the baseline test to unlock expert status!</p>
            </div>
          )}
        </div>
        {(profile.verifiedSkills || []).length > maxVisibleSkills && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button 
              type="button"
              className="fl-btn fl-btn--primary fl-btn--sm" 
              onClick={() => setShowAllSkills(!showAllSkills)}
            >
              {showAllSkills ? 'Show Less' : `Show More (${profile.verifiedSkills.length - maxVisibleSkills} hidden)`}
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
              <Link key={gig._id || gig.id} to={`/gigs/${gig._id || gig.id}`} className="fl-recent-gig" style={{ textDecoration: 'none' }}>
                <div className="fl-recent-gig__left">
                  <div className="fl-recent-gig__icon-wrapper">
                    <Package size={20} />
                  </div>
                  <div className="fl-recent-gig__info">
                    <p className="fl-recent-gig__title">{gig.title}</p>
                    <p className="fl-recent-gig__meta">
                      {gig.category} <span className="fl-recent-gig__dot">•</span> <span className="fl-recent-gig__price">From Rs. {gig.pricing.basic.price}</span>
                    </p>
                  </div>
                </div>
                <div className="fl-recent-gig__right">
                  <span className={`fl-status-badge fl-status-badge--${gig.status}`}>
                    {gig.status === 'active' ? <><Circle size={10} style={{ marginRight: 4, fill: 'currentColor' }} /> Active</> : <><PauseCircle size={12} style={{ marginRight: 4 }} /> Paused</>}
                  </span>
                  <div className="fl-recent-gig__action">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </Link>
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
        
        .fl-status-badge {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.25rem 0.65rem; border-radius: 999px;
          font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.05em; line-height: 1;
        }
        .fl-status-badge--active { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
        .fl-status-badge--paused { background: #fefce8; color: #ca8a04; border: 1px solid #fef08a; }
        .fl-recent-gig {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 1.25rem; border-radius: 16px; border: 1px solid rgba(4,46,76,0.06); background: #ffffff;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .fl-recent-gig:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 10px 25px -5px rgba(4,46,76,0.08);
          border-color: rgba(26,111,168,0.2);
        }
        .fl-recent-gig__left {
          display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 0;
        }
        .fl-recent-gig__icon-wrapper {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(26, 111, 168, 0.08), rgba(26, 111, 168, 0.02));
          display: flex; align-items: center; justify-content: center;
          color: var(--color-primary); flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .fl-recent-gig:hover .fl-recent-gig__icon-wrapper {
          background: var(--gradient-primary); color: #fff;
          transform: rotate(-5deg) scale(1.05);
          box-shadow: 0 6px 15px rgba(26, 111, 168, 0.25);
        }
        .fl-recent-gig__info { flex: 1; min-width: 0; }
        .fl-recent-gig__title {
          font-weight: 800; font-size: 0.95rem; color: var(--color-text-dark);
          margin: 0; margin-bottom: 0.25rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .fl-recent-gig__meta { 
          font-size: 0.78rem; color: var(--color-text-light); font-weight: 600;
          display: flex; align-items: center; gap: 0.4rem;
          margin: 0;
        }
        .fl-recent-gig__dot { color: #cbd5e1; }
        .fl-recent-gig__price { color: var(--color-primary); font-weight: 700; }
        .fl-recent-gig__right { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
        .fl-recent-gig__action {
          color: #94a3b8; transition: all 0.3s ease;
          display: flex; align-items: center;
        }
        .fl-recent-gig:hover .fl-recent-gig__action {
          color: var(--color-primary); transform: translateX(3px);
        }
           /* --- Skill Card Redesign --- */
        .fl-skill-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        
        .fl-skill-card {
          background: linear-gradient(to bottom, #ffffff, #fcfcfd);
          border: 1px solid rgba(183, 201, 226, 0.4);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 4px 15px rgba(4, 46, 76, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .fl-skill-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 4px;
          background: #e2e8f0;
          transition: background 0.3s ease;
        }
        
        .fl-skill-card--verified::after {
          background: var(--gradient-primary);
        }

        .fl-skill-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(4, 46, 76, 0.08);
          border-color: rgba(4, 46, 76, 0.15);
        }

        .fl-skill-card__top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        
        .fl-skill-card__info {
          flex: 1;
          min-width: 0;
        }
        
        .fl-skill-card__title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
          flex-wrap: wrap;
        }
        
        .fl-skill-card__name {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-text-dark);
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .fl-skill-card__badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #ecfdf5;
          color: #10b981;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .fl-skill-card__score-col {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }
        
        .fl-skill-card__score-val {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--color-primary);
          line-height: 1;
        }
        
        .fl-skill-card--verified .fl-skill-card__score-val {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .fl-skill-card__score-lbl {
          font-size: 0.65rem;
          text-transform: uppercase;
          color: var(--color-text-light);
          font-weight: 700;
          margin-top: 0.2rem;
          letter-spacing: 0.05em;
        }

        .fl-skill-level {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .fl-skill-level--expert { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .fl-skill-level--intermediate { background: #fefce8; color: #a16207; border: 1px solid #fef08a; }
        .fl-skill-level--beginner { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        
        .fl-skill-card__progress-track {
          height: 6px;
          background: #f1f5f9;
          border-radius: 999px;
          overflow: hidden;
          width: 100%;
        }
        
        .fl-skill-card__progress-fill {
          height: 100%;
          background: #94a3b8;
          border-radius: 999px;
          transition: width 1s ease-out;
        }
        
        .fl-skill-card--verified .fl-skill-card__progress-fill {
          background: var(--gradient-primary);
        }
        
        .fl-skill-card__footer {
          margin-top: auto;
          display: flex;
        }
        
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

        /* ── Mobile: avatar + info stay a centered row; the Edit Profile button
           wraps to its own centered line below (it can't fit beside them). ── */
        @media (max-width: 640px) {
          .fl-dashboard-hero__inner {
            justify-content: center;
            gap: 0.85rem 1rem;
          }
          .fl-dashboard-hero__avatar { width: 56px; height: 56px; font-size: 1.25rem; }
          .fl-dashboard-hero__name { font-size: 1.05rem; line-height: 1.2; }
          /* keep the info beside the avatar (don't let the name wrap per-word) */
          .fl-dashboard-hero__info { flex: 1 1 200px; min-width: 180px; }
          .fl-dashboard-hero__meta { justify-content: flex-start; }
          /* button drops to a full-width centered line under the identity row */
          .fl-dashboard-hero__inner > .fl-btn { flex: 1 0 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default DashboardOverview;
