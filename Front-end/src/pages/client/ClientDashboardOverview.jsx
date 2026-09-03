import { Link } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { FolderOpen, Zap, Users2, Building2, MapPin, Calendar, Globe, User, Edit2, PlusSquare, Search, MessageSquare, Bot, CheckCircle2, ChevronRight } from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import Loader from '../../Components/common/Loader/Loader';
import './ClientDashboard.css';

const StatCard = ({ icon, value, label, to }) => {
  const inner = (
    <>
      <div className="cl-stat-card__bg">{icon}</div>
      <div className="cl-stat-card__icon">{icon}</div>
      <div className="cl-stat-card__value">{value}</div>
      <div className="cl-stat-card__label">{label}</div>
    </>
  );
  return to
    ? <Link to={to} className="cl-stat-card cl-stat-card--link">{inner}</Link>
    : <div className="cl-stat-card">{inner}</div>;
};

const ClientDashboardOverview = () => {
  const { profile, projects, loading } = useClient();
  const personalInfo = profile?.personalInfo || {};
  
  // Real stats calculation
  const openProjects = projects.filter(p => p.status === 'open').length;
  const hiredCount = projects.filter(p => p.hiredFreelancer).length;
  const totalSpent = profile?.stats?.totalSpent || 0;

  if (loading) {
    return <Loader text="Fetching your workspace..." fullScreen={true} />;
  }

  const initials = (personalInfo.fullName || 'User')
    .split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const statsData = [
    { icon: <FolderOpen size={20} />, value: projects.length,                          label: 'Total Projects',    to: '/client/projects' },
    { icon: <Zap size={20} />,        value: openProjects,                             label: 'Open Jobs',         to: '/client/projects' },
    { icon: <Users2 size={20} />,     value: hiredCount,                               label: 'Freelancers Hired', to: '/client/saved' },
    { icon: <PkrIcon size={20} />, value: `Rs. ${totalSpent.toLocaleString()}`,        label: 'Total Spent',       to: '/client/projects' },
  ];

  const recentProjects = projects.slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <h1 className="cl-page-title">Welcome back, {(personalInfo.fullName || 'User').split(' ')[0]}!</h1>
        <p className="cl-page-sub">Here's an overview of your client activity on SkillKart.</p>
      </div>

      {/* Profile Hero */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <div className="cl-dash-hero">
          <div className="cl-dash-hero__avatar">
            {personalInfo?.avatar ? (
              <img src={personalInfo.avatar} alt={personalInfo.fullName} />
            ) : <span>{initials}</span>}
          </div>
          <div className="cl-dash-hero__info">
            <h2 className="cl-dash-hero__name">{personalInfo.fullName}</h2>
            <p className="cl-dash-hero__company">
              {personalInfo.companyType === 'Individual' ? (
                <><User size={13} style={{display:'inline',verticalAlign:'middle'}} /> Individual</>
              ) : (
                <>
                  <Building2 size={13} style={{display:'inline',verticalAlign:'middle'}} /> {personalInfo.companyName} · {personalInfo.industry}
                </>
              )}
            </p>
            <div className="cl-dash-hero__meta">
              <span><MapPin size={13} style={{display:'inline',verticalAlign:'middle'}} /> {personalInfo.location}</span>
              <span><Calendar size={13} style={{display:'inline',verticalAlign:'middle'}} /> Member since {personalInfo.memberSince}</span>
              <span><Globe size={13} style={{display:'inline',verticalAlign:'middle'}} /> {personalInfo.website}</span>
            </div>
          </div>
          <Link to="/client/profile" className="cl-btn cl-btn--outline">
            <Edit2 size={16} style={{ marginRight: 6 }} /> Edit Profile
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="cl-stat-grid">
        {statsData.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick Actions */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title"><Zap size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/client/projects/create" className="cl-btn cl-btn--primary"><PlusSquare size={16} style={{ marginRight: 6 }} /> Post New Project</Link>
          <Link to="/browse-freelancers" className="cl-btn cl-btn--outline"><Search size={16} style={{ marginRight: 6 }} /> Find Freelancers</Link>
          <Link to="/client/projects" className="cl-btn cl-btn--ghost"><FolderOpen size={16} style={{ marginRight: 6 }} /> View My Projects</Link>
          <Link to="/client/messages" className="cl-btn cl-btn--ghost"><MessageSquare size={16} style={{ marginRight: 6 }} /> Messages</Link>
          <Link to="/ai-matchmaking" className="cl-btn cl-btn--ghost"><Bot size={16} style={{ marginRight: 6 }} /> AI Matchmaking</Link>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="cl-card">
        <h3 className="cl-section-title"><FolderOpen size={16} style={{display:'inline',verticalAlign:'middle',color:'#1a6fa8'}} /> Recent Projects</h3>
        {recentProjects.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
            No projects yet.{' '}
            <Link to="/client/projects/create" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Post your first project →
            </Link>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentProjects.map((p) => {
              const isGig = p.source === 'gig' || p.title.toLowerCase().includes('package');
              
              return (
              <Link key={p.id} to={isGig ? '#' : `/client/projects/${p.id}/proposals`} className="cl-recent-proj" style={{ textDecoration: 'none', cursor: isGig ? 'default' : 'pointer' }}>
                <div className="cl-recent-proj__left">
                  <div className="cl-recent-proj__icon-wrapper">
                    <FolderOpen size={20} />
                  </div>
                  <div className="cl-recent-proj__info">
                    <p className="cl-recent-proj__title">{p.title}</p>
                    <p className="cl-recent-proj__meta">
                      {p.category} 
                      <span className="cl-recent-proj__dot">•</span> Budget: {p.budget?.min === p.budget?.max ? `Rs. ${p.budget?.min || 0}` : `Rs. ${p.budget?.min || 0}–${p.budget?.max || 0}`}
                      <span className="cl-recent-proj__dot">•</span>
                      {isGig ? (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Gig Order</span>
                      ) : (
                        <span>{p.proposals?.length || 0} proposal{(p.proposals?.length || 0) === 1 ? '' : 's'}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="cl-recent-proj__right">
                  <span className={`cl-badge cl-badge--${p.status.replace(' ', '-')}`}>
                    {p.status === 'open' ? <><CheckCircle2 size={12} style={{color:'#16a34a', marginRight: 4}} /> Open</> : p.status === 'in-progress' ? 'In Progress' : <><CheckCircle2 size={12} style={{marginRight: 4}}/> Completed</>}
                  </span>
                  {!isGig && (
                    <div className="cl-recent-proj__action">
                      <ChevronRight size={18} />
                    </div>
                  )}
                </div>
              </Link>
            )})}
          </div>
        )}
      </div>

      <style>{`
        .cl-dash-hero { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
        .cl-dash-hero__avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: var(--gradient-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 800; color: #fff;
          flex-shrink: 0; border: 3px solid rgba(183,201,226,0.5); overflow: hidden;
        }
        .cl-dash-hero__avatar img { width: 100%; height: 100%; object-fit: cover; }
        .cl-dash-hero__info { flex: 1; min-width: 0; }
        .cl-dash-hero__name {
          font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: var(--color-primary);
        }
        .cl-dash-hero__company { color: var(--color-text-mid); font-size: 0.875rem; margin: 0.2rem 0; }
        .cl-dash-hero__meta {
          display: flex; flex-wrap: wrap; gap: 1rem;
          font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.3rem;
        }
        .cl-recent-proj {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 1.25rem; border-radius: 16px; border: 1px solid rgba(4,46,76,0.06); background: #ffffff;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .cl-recent-proj:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 10px 25px -5px rgba(4,46,76,0.08);
          border-color: rgba(26,111,168,0.2);
        }
        .cl-recent-proj__left {
          display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 0;
        }
        .cl-recent-proj__icon-wrapper {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(26, 111, 168, 0.08), rgba(26, 111, 168, 0.02));
          display: flex; align-items: center; justify-content: center;
          color: var(--color-primary); flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .cl-recent-proj:hover .cl-recent-proj__icon-wrapper {
          background: var(--gradient-primary); color: #fff;
          transform: rotate(-5deg) scale(1.05);
          box-shadow: 0 6px 15px rgba(26, 111, 168, 0.25);
        }
        .cl-recent-proj__info { flex: 1; min-width: 0; }
        .cl-recent-proj__title {
          font-weight: 800; font-size: 0.95rem; color: var(--color-text-dark);
          margin: 0; margin-bottom: 0.25rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cl-recent-proj__meta { 
          font-size: 0.78rem; color: var(--color-text-light); font-weight: 600;
          display: flex; align-items: center; gap: 0.4rem;
          margin: 0;
        }
        .cl-recent-proj__dot { color: #cbd5e1; }
        .cl-recent-proj__right { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
        .cl-recent-proj__action {
          color: #94a3b8; transition: all 0.3s ease;
          display: flex; align-items: center;
        }
        .cl-recent-proj:hover .cl-recent-proj__action {
          color: var(--color-primary); transform: translateX(3px);
        }
        .cl-stat-card--link { text-decoration: none; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
        .cl-stat-card--link:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(4,46,76,0.1); }

        .cl-loading-container {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 400px; gap: 1rem; color: var(--color-text-light);
        }
        .cl-loader {
          width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: var(--color-primary);
          border-radius: 50%; animation: cl-spin 1s linear infinite;
        }
        @keyframes cl-spin { to { transform: rotate(360deg); } }

        /* ── Mobile: avatar + info stay a centered row; the Edit Profile button
           wraps to its own centered line below (it can't fit beside them). ── */
        @media (max-width: 640px) {
          .cl-dash-hero {
            justify-content: center;
            gap: 0.85rem 1rem;
          }
          .cl-dash-hero__avatar { width: 56px; height: 56px; font-size: 1.25rem; }
          .cl-dash-hero__name { font-size: 1.05rem; line-height: 1.2; }
          /* keep the info beside the avatar (don't let the name wrap per-word) */
          .cl-dash-hero__info { flex: 1 1 200px; min-width: 180px; }
          .cl-dash-hero__meta { justify-content: flex-start; }
          /* button drops to a full-width centered line under the identity row */
          .cl-dash-hero > .cl-btn { flex: 1 0 100%; justify-content: center; }

          /* Recent projects rows: tighter padding + let the meta line wrap so the
             status/budget don't get squeezed or clipped on phones. */
          .cl-recent-proj { padding: 0.85rem 0.9rem; }
          .cl-recent-proj__left { gap: 0.7rem; }
          .cl-recent-proj__icon-wrapper { width: 38px; height: 38px; }
          .cl-recent-proj__meta { flex-wrap: wrap; row-gap: 0.15rem; font-size: 0.72rem; }
          .cl-recent-proj__right { gap: 0.5rem; }
        }
      `}</style>
    </div>
  );
};

export default ClientDashboardOverview;
