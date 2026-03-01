import { useFreelancer } from '../../context/FreelancerContext';
import { Link } from 'react-router-dom';
import './FreelancerSavedProjects.css';

export default function FreelancerSavedProjects() {
    const { savedProjects, toggleSavedProject } = useFreelancer();

    return (
        <div className="fsp-container">
            <header className="fsp-header">
                <div>
                    <h1 className="fsp-title">Saved Projects</h1>
                    <p className="fsp-subtitle">Manage projects you've bookmarked for later</p>
                </div>
            </header>

            {savedProjects.length === 0 ? (
                <div className="fsp-empty">
                    <div className="fsp-empty__icon">🔖</div>
                    <h3 className="fsp-empty__title">No saved projects yet</h3>
                    <p className="fsp-empty__text">Explore projects and bookmark the ones that interest you to apply later.</p>
                    <Link to="/browse-projects" className="fsp-empty__btn">Browse Projects</Link>
                </div>
            ) : (
                <div className="fsp-grid">
                    {savedProjects.map(project => (
                        <div key={project.id} className="fsp-card">
                            <div className="fsp-card__header">
                                <span className={`fsp-card__badge fsp-card__badge--${(project.status || 'Active').toLowerCase()}`}>
                                    {project.status || 'Active'}
                                </span>
                                <button 
                                    className="fsp-card__remove"
                                    onClick={() => toggleSavedProject(project)}
                                    title="Remove from saved"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="fsp-card__body">
                                <h3 className="fsp-card__title">{project.title}</h3>
                                <p className="fsp-card__desc">{project.description || 'No description provided.'}</p>
                                
                                <div className="fsp-card__meta">
                                    <span className="fsp-card__meta-item">
                                        <span className="icon">💰</span> 
                                        {typeof project.budget === 'object' 
                                            ? `$${project.budget.min} - $${project.budget.max}`
                                            : project.budget || '$500+'}
                                    </span>
                                    <span className="fsp-card__meta-item">
                                        <span className="icon">⏱️</span> {project.duration || 'Flexible'}
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
                                <Link to={`/projects/${project.id}`} className="fsp-card__btn">
                                    View Details
                                </Link>
                                <button className="fsp-card__btn fsp-card__btn--primary">
                                    Apply Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
