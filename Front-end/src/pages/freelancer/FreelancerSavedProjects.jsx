import { useFreelancer } from '../../context/FreelancerContext';
import { Link } from 'react-router-dom';
import { Bookmark, Search } from 'lucide-react';
import JobCard from '../../Components/common/JobCard/JobCard';
import '../../styles/freelancer-ds.css';

export default function FreelancerSavedProjects() {
  const { savedProjects = [], toggleSavedProject } = useFreelancer();

  return (
    <div>
      <div className="fl2-ph">
        <div className="fl2-ph__left">
          <h1 className="fl2-ph__title">Saved Projects</h1>
          <p className="fl2-ph__sub">Manage projects you've bookmarked for later.</p>
        </div>
        <div className="fl2-ph__actions">
          {savedProjects.length > 0 && (
            <Link to="/browse-projects" className="fl2-btn fl2-btn--primary fl2-btn--sm">
              <Search size={13} /> Browse Projects
            </Link>
          )}
        </div>
      </div>

      {savedProjects.length === 0 ? (
        <div className="fl2-card">
          <div className="fl2-empty">
            <div className="fl2-empty__icon"><Bookmark size={24} /></div>
            <p className="fl2-empty__title">No saved projects yet</p>
            <p className="fl2-empty__desc">Explore projects and bookmark the ones that interest you to apply later.</p>
            <Link to="/browse-projects" className="fl2-btn fl2-btn--primary fl2-btn--sm" style={{ marginTop: 8 }}>Browse Projects</Link>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'stretch'
        }}>
          {savedProjects.map(project => (
            <JobCard
              key={project._id || project.id}
              job={project}
              variant="grid"
              isSaved={true}
              onToggleSave={toggleSavedProject}
              surfaceBg="var(--fl-bg-app, #F6F8FB)"
            />
          ))}
        </div>
      )}
    </div>
  );
}
