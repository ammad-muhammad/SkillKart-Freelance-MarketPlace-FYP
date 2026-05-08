import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import Modal from '../freelancer/components/Modal';
import TagInput from '../freelancer/components/TagInput';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import './ClientDashboard.css';

const STATUS_FILTERS = ['all', 'open', 'in-progress', 'completed'];

const ClientProjects = () => {
  const { projects, deleteProject, updateProject, showToast } = useClient();
  const [filter, setFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

  const statusOptions = ['open', 'in-progress', 'completed'];

  const handleStatusChange = (id, status) => {
    updateProject(id, { status });
    showToast(`Project status updated to "${status}".`, 'info');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateProject(editingProject.id, editingProject);
    showToast('Project updated successfully.', 'success');
    setEditingProject(null);
  };

  return (
    <div>
      <div className="cl-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="cl-page-title">My Projects</h1>
          <p className="cl-page-sub">Manage all your posted freelance projects.</p>
        </div>
        <Link to="/client/projects/create" className="cl-btn cl-btn--primary">
          ＋ Post New Project
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {STATUS_FILTERS.map((f) => {
          const count = f === 'all' ? projects.length : projects.filter((p) => p.status === f).length;
          return (
            <button
              key={f}
              className={`cl-btn cl-btn--sm${filter === f ? ' cl-btn--primary' : ' cl-btn--ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Project List */}
      {filtered.length === 0 ? (
        <div className="cl-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📁</div>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>No Projects Yet</h3>
          <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Post your first project and start finding talented freelancers.
          </p>
          <Link to="/client/projects/create" className="cl-btn cl-btn--primary">＋ Post a Project</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((proj) => (
            <div key={proj.id} className="cl-card cl-proj-card">
              <div className="cl-proj-card__top">
                <div>
                  <h3 className="cl-proj-card__title">{proj.title}</h3>
                  <p className="cl-proj-card__meta">
                    {proj.category}
                    {proj.subcategory && ` · ${proj.subcategory}`}
                    {' '} · Posted {proj.createdAt}
                  </p>
                </div>
                <span className={`cl-badge cl-badge--${proj.status}`}>
                  {proj.status === 'open' ? '🟢 Open' : proj.status === 'in-progress' ? '🔵 In Progress' : '✅ Completed'}
                </span>
              </div>

              <p className="cl-proj-card__summary">{proj.summary}</p>

              {/* Skills */}
              {Array.isArray(proj.skills) && proj.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {proj.skills.map((s) => <span key={s} className="cl-tag">{s}</span>)}
                </div>
              )}

              <div className="cl-proj-card__footer">
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)' }}>
                    💰 Budget: <strong>${proj.budget?.min}–${proj.budget?.max}</strong>
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)' }}>
                    ⏱ {proj.duration}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)' }}>
                    📅 Deadline: {proj.deadline || 'N/A'}
                  </span>
                </div>

                <div className="cl-proj-card__actions">
                  {/* Status toggle */}
                  <CustomSelect
                    options={statusOptions}
                    value={proj.status}
                    onChange={(val) => handleStatusChange(proj.id, val)}
                    compact
                    className="cl-status-select"
                  />
                  <div className="cl-proj-card__btns">
                    <Link to={`/client/projects/${proj.id}/proposals`} className="cl-btn cl-btn--secondary cl-btn--sm">
                      👥 View Proposals ({proj.proposals?.length || 0})
                    </Link>
                    <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => setEditingProject({...proj})}>✏ Edit</button>
                    <button
                      className="cl-btn cl-btn--danger cl-btn--sm"
                      onClick={() => setDeleteModal(proj.id)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={!!editingProject}
        title="Edit Project"
        onClose={() => setEditingProject(null)}
      >
        {editingProject && (
          <form className="cl-form-grid" onSubmit={handleEditSubmit}>
            <div className="cl-form-group full">
              <label className="cl-label">Project Title</label>
              <input 
                className="cl-input" value={editingProject.title} 
                onChange={e => setEditingProject({...editingProject, title: e.target.value})} 
              />
            </div>
            <div className="cl-form-group full">
              <label className="cl-label">Required Skills</label>
              <TagInput 
                tags={editingProject.skills} 
                onChange={tags => setEditingProject({...editingProject, skills: tags})} 
              />
            </div>
            <div className="cl-form-group">
              <label className="cl-label">Min Budget ($)</label>
              <input 
                type="number" className="cl-input" value={editingProject.budget?.min} 
                onChange={e => setEditingProject({...editingProject, budget: {...editingProject.budget, min: Number(e.target.value)}})} 
              />
            </div>
            <div className="cl-form-group">
              <label className="cl-label">Max Budget ($)</label>
              <input 
                type="number" className="cl-input" value={editingProject.budget?.max} 
                onChange={e => setEditingProject({...editingProject, budget: {...editingProject.budget, max: Number(e.target.value)}})} 
              />
            </div>
            <div className="cl-form-group full">
              <label className="cl-label">Short Summary</label>
              <textarea 
                className="cl-textarea" value={editingProject.summary} 
                onChange={e => setEditingProject({...editingProject, summary: e.target.value})} 
                style={{ minHeight: '80px' }}
              />
            </div>
            <div className="cl-actions full" style={{ marginTop: '1rem' }}>
              <button type="submit" className="cl-btn cl-btn--primary">Save Changes</button>
              <button type="button" className="cl-btn cl-btn--ghost" onClick={() => setEditingProject(null)}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteModal}
        title="Delete Project"
        onClose={() => setDeleteModal(null)}
        danger
      >
        <p>Are you sure you want to delete this project? All associated data will be lost.</p>
        <div className="cl-actions" style={{ marginTop: '1.25rem' }}>
          <button
            className="cl-btn cl-btn--danger"
            onClick={() => { deleteProject(deleteModal); setDeleteModal(null); }}
          >
            Yes, Delete
          </button>
          <button className="cl-btn cl-btn--ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
        </div>
      </Modal>

      <style>{`
        .cl-proj-card { display: flex; flex-direction: column; gap: 0.75rem; }
        .cl-proj-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .cl-proj-card__title { font-family: var(--font-heading); font-size: 1rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.2rem; }
        .cl-proj-card__meta { font-size: 0.78rem; color: var(--color-text-light); }
        .cl-proj-card__summary { font-size: 0.875rem; color: var(--color-text-mid); line-height: 1.5; }
        .cl-proj-card__footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; border-top: 1px solid #f0f4f8; padding-top: 0.75rem; margin-top: 0.25rem; }
        .cl-proj-card__actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: nowrap; }
        .cl-proj-card__btns { display: flex; gap: 0.4rem; }
        .cl-status-select { min-width: 130px !important; }
        .cl-status-select .csel__trigger { height: 32px; padding: 0 0.75rem; font-size: 0.8rem; }
      `}</style>
    </div>
  );
};

export default ClientProjects;
