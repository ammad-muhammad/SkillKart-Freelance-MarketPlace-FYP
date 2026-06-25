import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { jobsAPI } from '../../api/jobs';
import { paymentsAPI } from '../../api/payments';
import { JOB_CATEGORIES } from '../../constants/jobCategories';
import Modal from '../freelancer/components/Modal';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import ReviewModal from '../../Components/common/ReviewModal/ReviewModal';
import './ClientDashboard.css';

const STATUS_FILTERS = ['all', 'open', 'in-progress', 'delivered', 'completed', 'expired', 'closed'];
const EXPERIENCE_OPTIONS = ['Entry', 'Intermediate', 'Expert'];

// `<input type="date">` needs YYYY-MM-DD; the API stores an ISO timestamp.
const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ClientProjects = () => {
  const { projects, deleteProject, updateProject, requestRevision, showToast, fetchProfile } = useClient();
  const [filter, setFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [reviewing, setReviewing] = useState(null);   // the delivered project under review
  const [revisionNote, setRevisionNote] = useState('');
  const [actioning, setActioning] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(null); // { jobId, targetName }

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

  const openReview = async (proj) => {
    setRevisionNote('');
    const projectId = proj._id || proj.id;
    setReviewing({ id: projectId, title: proj.title });
    // Fetch the full job to show the freelancer's delivery details.
    try {
      const { data } = await jobsAPI.getJobById(projectId);
      const job = data?.data?.job || data?.data || {};
      const freelancerName = job.hiredFreelancer ? `${job.hiredFreelancer.firstName} ${job.hiredFreelancer.lastName}` : 'Freelancer';
      setReviewing({ id: projectId, title: proj.title, delivery: job.delivery || null, revisionCount: job.revisionCount || 0, freelancerName });
    } catch {
      /* keep the modal open with no delivery detail */
    }
  };

  const handleAccept = async () => {
    if (!reviewing) return;
    setActioning(true);
    // Try to complete; backend returns paymentRequired when the final 50% is
    // still owed → send the client to the final checkout.
    try {
      const { data } = await jobsAPI.acceptDelivery(reviewing.id);
      const payload = data?.data || {};
      if (payload.paymentRequired) {
        const { data: pay } = await paymentsAPI.startFinal(reviewing.id);
        const url = pay?.data?.checkoutUrl;
        if (url) { window.location.assign(url); return; }
        showToast('Could not start the final payment. Please try again.', 'error');
      } else {
        showToast('Delivery accepted. Project completed! 🎉');
        setShowReviewModal({ 
          jobId: reviewing.id, 
          targetName: reviewing.freelancerName || 'Freelancer' 
        });
        setReviewing(null);
        await fetchProfile();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept delivery', 'error');
    } finally {
      setActioning(false);
    }
  };

  const fundDeposit = async (projId) => {
    try {
      const { data } = await paymentsAPI.startDeposit(projId);
      const url = data?.data?.checkoutUrl;
      if (url) { window.location.assign(url); return; }
      showToast('Could not start the deposit checkout.', 'error');
    } catch (err) {
      showToast(err.response?.data?.message || 'Deposit could not be started (it may already be paid).', 'info');
    }
  };

  const handleRequestRevision = async () => {
    if (!reviewing) return;
    if (!revisionNote.trim()) { showToast('Add a note describing the changes needed.', 'error'); return; }
    setActioning(true);
    const res = await requestRevision(reviewing.id, revisionNote.trim());
    setActioning(false);
    if (res?.success) setReviewing(null);
  };

  // Open the edit modal with the FULL job (context only keeps a truncated
  // summary + a display-formatted deadline, which would otherwise be saved back
  // lossily). Fetch the complete record so every field is editable faithfully.
  const openEdit = async (proj) => {
    setEditErrors({});
    setEditLoading(true);
    setEditingProject({ id: proj.id }); // open modal immediately in loading state
    try {
      const { data } = await jobsAPI.getJobById(proj.id);
      const job = data?.data?.job || data?.data || {};
      setEditingProject({
        id: job._id || proj.id,
        title: job.title || '',
        category: job.category || '',
        subcategory: job.subcategory || '',
        skills: Array.isArray(job.skills) ? job.skills : [],
        experienceLevel: capitalize(job.experienceLevel) || 'Intermediate',
        description: job.description || '',
        projectType: job.budget?.type || 'fixed',
        budget: { min: job.budget?.min ?? 0, max: job.budget?.max ?? 0 },
        duration: job.duration || '',
        deadline: toDateInput(job.deadline),
        status: job.status || 'open',
      });
    } catch (error) {
      console.error('Failed to load project for editing:', error);
      showToast(error.response?.data?.message || 'Could not load project details', 'error');
      setEditingProject(null);
    } finally {
      setEditLoading(false);
    }
  };

  const setField = (patch) => setEditingProject((prev) => ({ ...prev, ...patch }));
  const clearEditError = (key) =>
    setEditErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });

  const validateEdit = (p) => {
    const e = {};
    if (!p.title || p.title.trim().length < 5) e.title = 'Title must be at least 5 characters.';
    else if (p.title.trim().length > 100) e.title = 'Title must be at most 100 characters.';
    if (!p.category) e.category = 'Select a category.';
    if (!p.skills || p.skills.length === 0) e.skills = 'Add at least one skill.';
    if (!p.description || p.description.trim().length < 50) e.description = 'Description must be at least 50 characters.';
    else if (p.description.trim().length > 5000) e.description = 'Description must be at most 5000 characters.';
    const min = Number(p.budget?.min); const max = Number(p.budget?.max);
    if (Number.isNaN(min) || min <= 0) e.budgetMin = 'Enter a valid minimum budget.';
    if (Number.isNaN(max) || max <= 0) e.budgetMax = 'Enter a valid maximum budget.';
    if (!e.budgetMin && !e.budgetMax && max < min) e.budgetMax = 'Maximum must be ≥ minimum.';
    if (p.deadline) {
      const d = new Date(p.deadline);
      if (Number.isNaN(d.getTime())) e.deadline = 'Invalid date.';
      else if (d.getTime() <= Date.now()) e.deadline = 'Deadline must be in the future.';
    }
    return e;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = validateEdit(editingProject);
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    const payload = {
      title: editingProject.title.trim(),
      category: editingProject.category,
      subcategory: editingProject.subcategory?.trim() || '',
      skills: editingProject.skills,
      experienceLevel: editingProject.experienceLevel.toLowerCase(),
      description: editingProject.description.trim(),
      budget: {
        min: Number(editingProject.budget.min),
        max: Number(editingProject.budget.max),
        type: editingProject.projectType,
      },
      duration: editingProject.duration,
      deadline: editingProject.deadline ? new Date(editingProject.deadline).toISOString() : null,
      // status is NOT sent — it's controlled by the lifecycle, not this form.
    };

    setSavingEdit(true);
    const ok = await updateProject(editingProject.id, payload);
    setSavingEdit(false);
    if (ok) setEditingProject(null); // updateProject already toasts success/error
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
                  {proj.status === 'open' ? '🟢 Open' :
                   proj.status === 'in-progress' ? '🔵 In Progress' :
                   proj.status === 'delivered' ? '📦 Delivered — review needed' :
                   proj.status === 'completed' ? '✅ Completed' :
                   proj.status === 'expired' ? '⏰ Expired' :
                   '⚪ Closed'}
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
                  {/* Status is read-only — it advances only through the gated
                      lifecycle (accept proposal → pay deposit → deliver →
                      review → pay final → completed), never manual override. */}
                  <div className="cl-proj-card__btns">
                    {proj.status === 'in-progress' && (
                      <button className="cl-btn cl-btn--outline cl-btn--sm" onClick={() => fundDeposit(proj.id)}>
                        💳 Fund Deposit
                      </button>
                    )}
                    {proj.status === 'completed' && (
                      <button 
                        className="cl-btn cl-btn--ghost cl-btn--sm"
                        onClick={() => setShowReviewModal({ jobId: proj.id, targetName: 'Freelancer' })}
                      >
                        ⭐️ Leave Review
                      </button>
                    )}
                    {proj.status === 'delivered' && (
                      <button className="cl-btn cl-btn--primary cl-btn--sm" onClick={() => openReview(proj)}>
                        📦 Review Delivery
                      </button>
                    )}
                    <Link to={`/client/projects/${proj.id}/proposals`} className="cl-btn cl-btn--secondary cl-btn--sm">
                      👥 View Proposals ({proj.proposals?.length || 0})
                    </Link>
                    <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => openEdit(proj)}>✏ Edit</button>
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

      {/* Edit Modal — full project editing */}
      <Modal
        open={!!editingProject}
        title="Edit Project"
        size="lg"
        onClose={() => !savingEdit && setEditingProject(null)}
      >
        {editLoading || !editingProject?.title ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div className="cl-spinner" />
            <p style={{ color: 'var(--color-text-light)', marginTop: '1rem' }}>Loading project details…</p>
          </div>
        ) : (
          <form className="cl-form-grid" onSubmit={handleEditSubmit}>
            <div className="cl-form-group full">
              <label className="cl-label">Project Title *</label>
              <input
                className={`cl-input${editErrors.title ? ' cl-input--error' : ''}`}
                value={editingProject.title}
                onChange={e => { setField({ title: e.target.value }); clearEditError('title'); }}
              />
              {editErrors.title && <span className="cl-error">⚠ {editErrors.title}</span>}
            </div>

            {/* AI suggest & fill — category, skills & experience level from the brief */}
            <div className="cl-form-group full">
              <AiSuggestFill
                label="Suggest category, skills & level (AI)"
                getContext={() => ({
                  title: editingProject.title,
                  description: editingProject.description,
                  skills: editingProject.skills,
                })}
                allowedCategories={JOB_CATEGORIES}
                existingSkills={editingProject.skills}
                onCategory={(cat) => { setField({ category: cat }); clearEditError('category'); }}
                onSkills={(newSkills) => {
                  setField({ skills: Array.from(new Set([...(editingProject.skills || []), ...newSkills])) });
                  clearEditError('skills');
                }}
                onExperience={(level) => setField({ experienceLevel: level })}
              />
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Category *</label>
              <TagInput
                tags={editingProject.category ? [editingProject.category] : []}
                onChange={tags => { setField({ category: tags[0] || '' }); clearEditError('category'); }}
                options={JOB_CATEGORIES}
                maxTags={1}
                placeholder="Type to search categories…"
                showHint={false}
              />
              {editErrors.category && <span className="cl-error">⚠ {editErrors.category}</span>}
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Subcategory</label>
              <input
                className="cl-input"
                placeholder="e.g. Frontend Development"
                value={editingProject.subcategory}
                onChange={e => setField({ subcategory: e.target.value })}
              />
            </div>

            <div className="cl-form-group full">
              <label className="cl-label">Required Skills (press Enter) *</label>
              <TagInput
                tags={editingProject.skills}
                onChange={tags => { setField({ skills: tags }); clearEditError('skills'); }}
                placeholder="e.g. React, CSS, Figma"
              />
              {editErrors.skills && <span className="cl-error">⚠ {editErrors.skills}</span>}
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Experience Level</label>
              <ComboSelect
                options={EXPERIENCE_OPTIONS}
                value={editingProject.experienceLevel}
                onChange={val => setField({ experienceLevel: val })}
                placeholder="Type to search…"
              />
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Project Type</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className={`cl-btn cl-btn--sm ${editingProject.projectType === 'fixed' ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                  onClick={() => setField({ projectType: 'fixed' })}
                >Fixed Price</button>
                <button
                  type="button"
                  className={`cl-btn cl-btn--sm ${editingProject.projectType === 'hourly' ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                  onClick={() => setField({ projectType: 'hourly' })}
                >Hourly Rate</button>
              </div>
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Min Budget ($) *</label>
              <input
                type="number" className={`cl-input${editErrors.budgetMin ? ' cl-input--error' : ''}`}
                value={editingProject.budget.min}
                onChange={e => { setField({ budget: { ...editingProject.budget, min: e.target.value } }); clearEditError('budgetMin'); }}
              />
              {editErrors.budgetMin && <span className="cl-error">⚠ {editErrors.budgetMin}</span>}
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Max Budget ($) *</label>
              <input
                type="number" className={`cl-input${editErrors.budgetMax ? ' cl-input--error' : ''}`}
                value={editingProject.budget.max}
                onChange={e => { setField({ budget: { ...editingProject.budget, max: e.target.value } }); clearEditError('budgetMax'); }}
              />
              {editErrors.budgetMax && <span className="cl-error">⚠ {editErrors.budgetMax}</span>}
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Duration</label>
              <input
                className="cl-input"
                placeholder="e.g. 1-3 months"
                value={editingProject.duration}
                onChange={e => setField({ duration: e.target.value })}
              />
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Deadline</label>
              <input
                type="date" className={`cl-input${editErrors.deadline ? ' cl-input--error' : ''}`}
                value={editingProject.deadline}
                onChange={e => { setField({ deadline: e.target.value }); clearEditError('deadline'); }}
              />
              {editErrors.deadline && <span className="cl-error">⚠ {editErrors.deadline}</span>}
            </div>

            {/* Status is intentionally NOT editable here — it's driven by the
                gated lifecycle, not manual override. */}
            <div className="cl-form-group">
              <label className="cl-label">Status</label>
              <div className="cl-input" style={{ background: '#f8fafc', textTransform: 'capitalize' }}>{editingProject.status}</div>
            </div>

            <div className="cl-form-group full">
              <label className="cl-label">Full Description *</label>
              <textarea
                className={`cl-textarea${editErrors.description ? ' cl-input--error' : ''}`}
                value={editingProject.description}
                onChange={e => { setField({ description: e.target.value }); clearEditError('description'); }}
                style={{ minHeight: '140px' }}
                placeholder="Describe the project scope, responsibilities, and deliverables (min 50 characters)…"
              />
              {editErrors.description && <span className="cl-error">⚠ {editErrors.description}</span>}
            </div>

            <div className="cl-actions full" style={{ marginTop: '1rem' }}>
              <button type="submit" className={`cl-btn cl-btn--primary${savingEdit ? ' cl-btn--loading' : ''}`} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="cl-btn cl-btn--ghost" onClick={() => setEditingProject(null)} disabled={savingEdit}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Review Delivery Modal */}
      <Modal
        open={!!reviewing}
        title="Review Delivery"
        size="lg"
        onClose={() => !actioning && setReviewing(null)}
      >
        {reviewing && (
          <div>
            <h4 style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>{reviewing.title}</h4>
            {reviewing.revisionCount > 0 && (
              <p style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: '0.75rem' }}>
                Revision #{reviewing.revisionCount} — this is a resubmission.
              </p>
            )}

            {reviewing.delivery ? (
              <div className="cl-card" style={{ background: '#f8fafc', padding: '1rem', marginBottom: '1.25rem' }}>
                {reviewing.delivery.message && (
                  <>
                    <span className="cl-label">Delivery note</span>
                    <p style={{ fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>{reviewing.delivery.message}</p>
                  </>
                )}
                {Array.isArray(reviewing.delivery.links) && reviewing.delivery.links.length > 0 && (
                  <>
                    <span className="cl-label">Links</span>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
                      {reviewing.delivery.links.map((l, i) => (
                        <li key={i}><a href={l} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', wordBreak: 'break-all' }}>{l}</a></li>
                      ))}
                    </ul>
                  </>
                )}
                {reviewing.delivery.submittedAt && (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                    Submitted {new Date(reviewing.delivery.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Loading delivery details…</p>
            )}

            <div className="cl-form-group" style={{ marginBottom: '1rem' }}>
              <label className="cl-label">Need changes? Describe what to revise (optional for accept)</label>
              <textarea
                className="cl-textarea"
                rows={3}
                placeholder="e.g. Please adjust the colour scheme and fix the mobile layout…"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
              />
            </div>

            <div className="cl-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="cl-btn cl-btn--primary" onClick={handleAccept} disabled={actioning}>
                {actioning ? 'Working…' : '✅ Accept & Complete'}
              </button>
              <button className="cl-btn cl-btn--outline" onClick={handleRequestRevision} disabled={actioning} style={{ color: '#d97706', borderColor: '#d97706' }}>
                🔁 Request Revision
              </button>
              <button className="cl-btn cl-btn--ghost" onClick={() => setReviewing(null)} disabled={actioning}>Cancel</button>
            </div>
          </div>
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

      {showReviewModal && (
        <ReviewModal
          jobId={showReviewModal.jobId}
          targetName={showReviewModal.targetName}
          onClose={() => setShowReviewModal(null)}
        />
      )}

      <style>{`
        .cl-proj-card { display: flex; flex-direction: column; gap: 0.75rem; }
        .cl-proj-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .cl-proj-card__title { font-family: var(--font-heading); font-size: 1rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.2rem; }
        .cl-proj-card__meta { font-size: 0.78rem; color: var(--color-text-light); }
        .cl-proj-card__summary { font-size: 0.875rem; color: var(--color-text-mid); line-height: 1.5; overflow-wrap: break-word;word-break: break-word;}
        .cl-proj-card__footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; border-top: 1px solid #f0f4f8; padding-top: 0.75rem; margin-top: 0.25rem; }
        .cl-proj-card__actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: nowrap; }
        .cl-proj-card__btns { display: flex; gap: 0.4rem; }
        .cl-status-select { min-width: 130px !important; }
        .cl-status-select .csel__trigger { height: 32px; padding: 0 0.75rem; font-size: 0.8rem; }
        .cl-spinner {
          width: 38px; height: 38px; margin: 0 auto;
          border: 3px solid #e2e8f0; border-top-color: var(--color-primary);
          border-radius: 50%; animation: cl-spin 0.8s linear infinite;
        }
        @keyframes cl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientProjects;
