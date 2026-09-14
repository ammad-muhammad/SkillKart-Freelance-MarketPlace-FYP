import { useFreelancer } from '../../context/FreelancerContext';
import { Link } from 'react-router-dom';
import { Bookmark, X, Clock } from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import StatusBadge from '../../Components/common/StatusBadge/StatusBadge';
import { isMobileApp } from '../../utils/platform';
import './FreelancerSavedProjects.css';

// The public job-details/browse-projects routes aren't registered at all on
// the mobile build (see AppRoutes.jsx) — a saved project can't be viewed or
// applied to there, so its actions collapse to a plain disabled label
// instead of a dead link.
const disabledMobileNote = 'Not available on mobile';

const STATUS_TONE = {
    open: 'success',
    active: 'success',
    urgent: 'error',
    'in-progress': 'info',
    'in_progress': 'info',
    completed: 'neutral',
    closed: 'neutral',
    cancelled: 'neutral',
};

export default function FreelancerSavedProjects() {
    const { savedProjects, toggleSavedProject, proposals } = useFreelancer();

    return (
        <div className="fsp-container">
            <header className="fsp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="fsp-title">Saved Projects</h1>
                    <p className="fsp-subtitle">Manage projects you've bookmarked for later</p>
                </div>
                {savedProjects.length > 0 && !isMobileApp() && (
                    <Link to="/browse-projects" className="fsp-empty__btn" style={{ margin: 0, padding: '0.6rem 1.2rem' }}>Browse Projects</Link>
                )}
            </header>

            {savedProjects.length === 0 ? (
                <div className="fsp-empty">
                    <div className="fsp-empty__icon" style={{ color: 'var(--color-primary)' }}><Bookmark size={40} /></div>
                    <h3 className="fsp-empty__title">No saved projects yet</h3>
                    <p className="fsp-empty__text">Explore projects and bookmark the ones that interest you to apply later.</p>
                    {!isMobileApp() && <Link to="/browse-projects" className="fsp-empty__btn">Browse Projects</Link>}
                </div>
            ) : (
                <div className="fsp-grid">
                    {savedProjects.map(project => (
                        <div key={project._id || project.id} className="fsp-card">
                            <div className="fsp-card__header">
                                <StatusBadge tone={STATUS_TONE[(project.status || 'active').toLowerCase()] || 'neutral'}>
                                    {project.status || 'Active'}
                                </StatusBadge>
                                <button 
                                    className="fsp-card__remove"
                                    onClick={() => toggleSavedProject(project)}
                                    title="Remove from saved"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="fsp-card__body">
                                <h3 className="fsp-card__title">{project.title}</h3>
                                <p className="fsp-card__desc">{project.description || 'No description provided.'}</p>
                                
                                <div className="fsp-card__meta">
                                    <span className="fsp-card__meta-item">
                                        <PkrIcon size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: 'var(--color-text-light)' }} />
                                        {typeof project.budget === 'object' 
                                            ? `Rs. ${project.budget.min} - Rs. ${project.budget.max}`
                                            : project.budget || 'Rs. 500+'}
                                    </span>
                                    <span className="fsp-card__meta-item">
                                        <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: 'var(--color-text-light)' }} /> {project.duration || 'Flexible'}
                                    </span>
                                </div>

                                <div className="fsp-card__tags">
                                    {project.category && (
                                        <span className="fsp-card__tag">{project.category}</span>
                                    )}
                                    {project.experience && (
                                        <span className="fsp-card__tag">{project.experience}</span>
                                    )}
                                </div>
                            </div>

                            <div className="fsp-card__footer">
                                {isMobileApp() ? (
                                    <span className="fsp-card__btn" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)', cursor: 'not-allowed' }}>
                                        {disabledMobileNote}
                                    </span>
                                ) : (
                                    <Link to={`/jobs/${project._id || project.id}`} className="fsp-card__btn">
                                        View Details
                                    </Link>
                                )}
                                {(() => {
                                    if (isMobileApp()) return null;

                                    const isOpen = project.status === 'open';
                                    const myProposal = proposals?.find(p => (p.jobId?._id || p.jobId) === (project._id || project.id));

                                    if (myProposal) {
                                        return (
                                            <Link to="/freelancer/proposals" className="fsp-card__btn" style={{ background: 'var(--color-info-tint)', color: 'var(--color-info)', borderColor: 'rgba(37, 99, 235, 0.25)' }}>
                                                Applied
                                            </Link>
                                        );
                                    }

                                    if (!isOpen) {
                                        return (
                                            <span className="fsp-card__btn" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-mid)', cursor: 'not-allowed' }}>
                                                {project.status ? project.status.replace('-', ' ') : 'Unavailable'}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link to={`/jobs/${project._id || project.id}`} className="fsp-card__btn fsp-card__btn--primary">
                                            Apply Now
                                        </Link>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
