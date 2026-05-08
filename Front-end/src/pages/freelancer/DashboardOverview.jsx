import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import { Package, Zap, CheckCircle2, Eye, MapPin, Calendar, Star, FolderOpen } from 'lucide-react';
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
  const { profile, gigs, loading } = useFreelancer();
  const personalInfo = profile?.personalInfo || {};
  const stats = profile?.stats || { activeOrders: 0, completedOrders: 0, profileViews: 0 };

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
    { icon: <Zap size={20} />,         value: stats?.activeOrders || 0,                       label: 'Active Orders'    },
    { icon: <CheckCircle2 size={20} />, value: stats?.completedOrders || 0,                   label: 'Completed Orders' },
    { icon: <Eye size={20} />,         value: (stats?.profileViews || 0).toLocaleString(),    label: 'Profile Views'    },
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
              <div key={gig.id} className="fl-recent-gig">
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
