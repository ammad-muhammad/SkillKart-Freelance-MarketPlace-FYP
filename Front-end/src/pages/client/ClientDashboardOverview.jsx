import { Link } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import './ClientDashboard.css';

const StatCard = ({ icon, value, label }) => (
  <div className="cl-stat-card">
    <div className="cl-stat-card__bg">{icon}</div>
    <div className="cl-stat-card__icon">{icon}</div>
    <div className="cl-stat-card__value">{value}</div>
    <div className="cl-stat-card__label">{label}</div>
  </div>
);

const ClientDashboardOverview = () => {
  const { profile, projects } = useClient();
  const { personalInfo, stats } = profile;

  const initials = personalInfo.fullName
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const statsData = [
    { icon: '📁', value: projects.length, label: 'Total Projects' },
    { icon: '⚡', value: stats.activeProjects, label: 'Active Projects' },
    { icon: '👥', value: stats.freelancersHired, label: 'Freelancers Hired' },
    { icon: '💰', value: `$${stats.totalSpent.toLocaleString()}`, label: 'Total Spent' },
  ];

  const recentProjects = projects.slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="cl-page-header">
        <h1 className="cl-page-title">Welcome back, {personalInfo.fullName.split(' ')[0]}! 👋</h1>
        <p className="cl-page-sub">Here's an overview of your client activity on SkillKart.</p>
      </div>

      {/* Profile Hero */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <div className="cl-dash-hero">
          <div className="cl-dash-hero__avatar">
            {personalInfo.avatar ? (
              <img src={personalInfo.avatar} alt={personalInfo.fullName} />
            ) : <span>{initials}</span>}
          </div>
          <div className="cl-dash-hero__info">
            <h2 className="cl-dash-hero__name">{personalInfo.fullName}</h2>
            <p className="cl-dash-hero__company">🏢 {personalInfo.companyName} · {personalInfo.industry}</p>
            <div className="cl-dash-hero__meta">
              <span>📍 {personalInfo.location}</span>
              <span>🗓️ Member since {personalInfo.memberSince}</span>
              <span>🌐 {personalInfo.website}</span>
            </div>
          </div>
          <Link to="/client/profile" className="cl-btn cl-btn--outline">
            ✏ Edit Profile
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="cl-stat-grid">
        {statsData.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick Actions */}
      <div className="cl-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="cl-section-title">⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/client/projects/create" className="cl-btn cl-btn--primary">＋ Post New Project</Link>
          <Link to="/client/projects" className="cl-btn cl-btn--ghost">View My Projects</Link>
          <Link to="/client/profile" className="cl-btn cl-btn--ghost">Update Profile</Link>
          <Link to="/client/settings" className="cl-btn cl-btn--ghost">Account Settings</Link>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="cl-card">
        <h3 className="cl-section-title">📁 Recent Projects</h3>
        {recentProjects.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
            No projects yet.{' '}
            <Link to="/client/projects/create" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Post your first project →
            </Link>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentProjects.map((p) => (
              <div key={p.id} className="cl-recent-proj">
                <div className="cl-recent-proj__info">
                  <p className="cl-recent-proj__title">{p.title}</p>
                  <p className="cl-recent-proj__meta">
                    {p.category} · Budget: ${p.budget.min}–${p.budget.max} · {p.createdAt}
                  </p>
                </div>
                <span className={`cl-badge cl-badge--${p.status.replace(' ', '-')}`}>
                  {p.status === 'open' ? '🟢 Open' : p.status === 'in-progress' ? '🔵 In Progress' : '✅ Completed'}
                </span>
              </div>
            ))}
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
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1rem; background: #f8fafc;
          border-radius: 10px; border: 1px solid #e5edf5; gap: 1rem;
        }
        .cl-recent-proj__title { font-size: 0.875rem; font-weight: 600; color: var(--color-text-dark); margin-bottom: 0.2rem; }
        .cl-recent-proj__meta { font-size: 0.78rem; color: var(--color-text-light); }
      `}</style>
    </div>
  );
};

export default ClientDashboardOverview;
