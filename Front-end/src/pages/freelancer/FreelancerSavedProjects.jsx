import { useFreelancer } from '../../context/FreelancerContext';
import { Link } from 'react-router-dom';
import { Bookmark, X, DollarSign, Clock } from 'lucide-react';
import './FreelancerSavedProjects.css';

export default function FreelancerSavedProjects() {
    const { savedProjects, toggleSavedProject, proposals } = useFreelancer();

    return (
        <div className="fsp-container">
            <header className="fsp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="fsp-title">Saved Projects</h1>
                    <p className="fsp-subtitle">Manage projects you've bookmarked for later</p>
                </div>
                {savedProjects.length > 0 && (
                    <Link to="/browse-projects" className="fsp-empty__btn" style={{ margin: 0, padding: '0.6rem 1.2rem' }}>Browse Projects</Link>
                )}
            </header>

            {savedProjects.length === 0 ? (
                <div className="fsp-empty">
                    <div className="fsp-empty__icon" style={{ color: 'var(--color-primary)' }}><Bookmark size={40} /></div>
                    <h3 className="fsp-empty__title">No saved projects yet</h3>
                    <p className="fsp-empty__text">Explore projects and bookmark the ones that interest you to apply later.</p>
                    <Link to="/browse-projects" className="fsp-empty__btn">Browse Projects</Link>
                </div>
            ) : (
                <div className="fsp-grid">
                    {savedProjects.map(project => (
                        <div key={project._id || project.id} className="fsp-card">
                            <div className="fsp-card__header">
                                <span className={`fsp-card__badge fsp-card__badge--${(project.status || 'Active').toLowerCase()}`}>
                                    {project.status || 'Active'}
                                </span>
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
                                        <DollarSign size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: 'var(--color-text-light)' }} />
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
                                <Link to={`/jobs/${project._id || project.id}`} className="fsp-card__btn">
                                    View Details
                                </Link>
                                {(() => {
                                    const isOpen = project.status === 'open';
                                    const myProposal = proposals?.find(p => (p.jobId?._id || p.jobId) === (project._id || project.id));

                                    if (myProposal) {
                                        return (
                                            <Link to="/freelancer/proposals" className="fsp-card__btn" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                                                Applied
                                            </Link>
                                        );
                                    }

                                    if (!isOpen) {
                                        return (
                                            <span className="fsp-card__btn" style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}>
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
