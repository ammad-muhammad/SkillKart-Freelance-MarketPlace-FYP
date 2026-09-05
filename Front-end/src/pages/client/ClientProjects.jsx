import Loader from '../../Components/common/Loader/Loader';
import { FileEdit, ShoppingBag, Circle, Folder, Package, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, Calendar, Send, CreditCard, Star, Users, MessageSquare, Edit3, Trash2, Check, AlertCircle, Layers, Wallet } from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { useAuth } from '../../hooks/useAuth';
import { jobsAPI } from '../../api/jobs';
import { paymentsAPI } from '../../api/payments';
import { contractsAPI } from '../../api/contracts';
import { deliveriesAPI } from '../../api/deliveries';
import { JOB_CATEGORIES, GIG_SUBCATEGORIES } from '../../constants/jobCategories';
import Modal from '../../Components/common/Modal/Modal';
import TagInput from '../../Components/common/TagInput/TagInput';
import ComboSelect from '../../Components/common/ComboSelect/ComboSelect';
import AiSuggestFill from '../../Components/common/AiSuggest/AiSuggestFill';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import ReviewModal from '../../Components/common/ReviewModal/ReviewModal';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import LiveTimer from '../../Components/common/LiveTimer/LiveTimer';
import StatusBadge from '../../Components/common/StatusBadge/StatusBadge';
import Button from '../../Components/common/Button/Button';
import { FolderOpen } from 'lucide-react';
import './ClientDashboard.css';

const PROJECT_STATUS_TONE = {
  open: 'success',
  draft: 'neutral',
  'in-progress': 'info',
  completed: 'success',
  expired: 'warning',
  closed: 'neutral',
};

const STATUS_FILTERS = ['all', 'draft', 'open', 'in-progress', 'delivered', 'completed', 'expired', 'closed'];
const EXPERIENCE_OPTIONS = ['Entry', 'Intermediate', 'Expert'];

// `<input type="date">` needs YYYY-MM-DD; the API stores an ISO timestamp.
const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ClientProjects = () => {
  const { projects, deleteProject, updateProject, showToast, fetchProfile } = useClient();
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
  const [endRequestModal, setEndRequestModal] = useState(null); // proj
  const [endReason, setEndReason] = useState('Work completed');
  const [endDetails, setEndDetails] = useState('');
  const [disputeModal, setDisputeModal] = useState(null); // proj
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const { user } = useAuth(); // Need user to check requestedBy

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

  const openReview = async (proj) => {
    setRevisionNote('');
    const projectId = proj._id || proj.id;
    setReviewing({ id: projectId, title: proj.title, isCompleted: proj.status === 'completed' });
    try {
      // Find the contract associated with this job
      const { data: contractData } = await contractsAPI.getMyContracts();
      const contract = contractData?.data?.find(c => String(c.jobId?._id || c.jobId) === String(projectId));
      
      let delivery = null;
      let revisionCount = 0;
      if (contract) {
        const { data: delivData } = await deliveriesAPI.getContractDeliveries(contract._id);
        const deliveries = delivData?.data?.deliveries || [];
        if (deliveries.length > 0) {
          delivery = deliveries[0]; // Latest is first
          revisionCount = deliveries.length - 1;
        }
      }
      
      const { data } = await jobsAPI.getJobById(projectId);
      const job = data?.data?.job || data?.data || {};
      const freelancerName = job.hiredFreelancer ? `${job.hiredFreelancer.firstName} ${job.hiredFreelancer.lastName}` : 'Freelancer';
      setReviewing({ 
        id: projectId, 
        contractId: contract?._id,
        deliveryId: delivery?._id,
        title: proj.title, 
        isCompleted: proj.status === 'completed', 
        delivery: delivery, 
        revisionCount: revisionCount, 
        freelancerName 
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = async () => {
    if (!reviewing) return;
    setActioning(true);
    try {
      const { data } = await deliveriesAPI.reviewDelivery(reviewing.deliveryId, { action: 'accept' });
      const payload = data?.data || {};
      // Fixed-price milestones report `isLastMilestone: false` when there's
      // more work left — the project isn't done yet, so skip the review modal.
      const projectDone = payload.isLastMilestone !== false;
      if (projectDone) {
        showToast('Delivery accepted. Project completed and payment released!');
        setShowReviewModal({
          jobId: reviewing.id,
          targetName: reviewing.freelancerName || 'Freelancer'
        });
      } else {
        showToast(`Milestone ${payload.milestone?.order || ''} accepted — escrow released to the freelancer! Fund the next milestone when you're ready to continue.`);
      }
      setReviewing(null);
      await fetchProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept delivery', 'error');
    } finally {
      setActioning(false);
    }
  };

  // Lock/re-lock an hourly contract's escrow from the client's wallet.
  // Milestone-style: one week's estimate locks automatically at hire time —
  // this is for topping up once the running balance runs low.
  const lockHourly = async (contractId) => {
    if (actioning) return;
    setActioning(true);
    try {
      await paymentsAPI.lockHourlyContract(contractId);
      showToast('Escrow locked from your wallet balance! Any unpaid logged hours were just settled.', 'success');
      await fetchProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not lock escrow for this contract.', 'error');
    } finally {
      setActioning(false);
    }
  };

  // Fund a fixed-price milestone (100% lock, wallet-only) once the client is
  // ready to start the next phase. Milestone 1 funds automatically at hire.
  const fundNextMilestone = async (milestoneId) => {
    if (actioning) return;
    setActioning(true);
    try {
      await paymentsAPI.fundMilestone(milestoneId);
      showToast('Milestone funded from your wallet balance! The freelancer can start this phase now.', 'success');
      await fetchProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not fund this milestone.', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!reviewing || !reviewing.deliveryId) return;
    if (!revisionNote.trim()) { showToast('Add a note describing the changes needed.', 'error'); return; }
    setActioning(true);
    try {
      await deliveriesAPI.reviewDelivery(reviewing.deliveryId, { action: 'request_revision', feedback: revisionNote.trim() });
      showToast('Revision requested.');
      setReviewing(null);
      await fetchProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to request revision', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleRequestEnd = async (e) => {
    e.preventDefault();
    if (!endReason || (endReason === 'Other' && !endDetails.trim())) return;
    try {
      setActioning(true);
      await contractsAPI.requestEnd(endRequestModal.contractId, endReason, endDetails);
      showToast('End request sent', 'success');
      setEndRequestModal(null);
      fetchProfile(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send request', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleRespondEnd = async (contractId, action) => {
    try {
      setActioning(true);
      await contractsAPI.respondEnd(contractId, action);
      showToast(`Request ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
      fetchProfile(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to respond', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    try {
      setActioning(true);
      await contractsAPI.raiseDispute(disputeModal.contractId, disputeReason, disputeDesc);
      showToast('Dispute raised successfully', 'success');
      setDisputeModal(null);
      fetchProfile(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to raise dispute', 'error');
    } finally {
      setActioning(false);
    }
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
              {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f === 'draft' ? 'Drafts' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Project List */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon={FolderOpen}
          title={filter === 'all' ? "No Projects Yet" : `No ${filter} projects`}
          message={filter === 'all' ? "Post your first project and start finding talented freelancers." : "You don't have any projects matching this status."}
          actionText={filter === 'all' ? "＋ Post a Project" : null}
          actionLink={filter === 'all' ? "/client/projects/create" : null}
        />
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
                <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span
                    className="cl-badge"
                    style={proj.source === 'gig'
                      ? { background: 'rgba(4, 46, 76, 0.08)', color: 'var(--color-primary)' }
                      : { background: 'var(--color-secondary)', color: 'var(--color-text-mid)' }}
                  >
                    {proj.source === 'gig' ? <span><ShoppingBag size={14} style={{ marginRight: '6px' }} /> Gig Order</span> : <span><FileEdit size={14} style={{ marginRight: '6px' }} /> Custom Project</span>}
                  </span>
                  <StatusBadge tone={PROJECT_STATUS_TONE[proj.status] || 'neutral'}>
                    {proj.status === 'open' ? <span><Circle fill="currentColor" size={10} style={{ marginRight: '6px' }} /> Open</span> :
                     proj.status === 'draft' ? <span><Folder size={14} style={{ marginRight: '6px' }} /> Draft</span> :
                     proj.status === 'in-progress' && proj.contractStatus === 'delivered' ? <span><Package size={14} style={{ marginRight: '6px' }} /> Delivered — review needed</span> :
                     proj.status === 'in-progress' && proj.contractStatus === 'in_revision' ? <span><RefreshCw size={14} style={{ marginRight: '6px' }} /> In Revision</span> :
                     proj.status === 'in-progress' ? <span><Circle fill="currentColor" size={10} style={{ marginRight: '6px' }} /> In Progress</span> :
                     proj.status === 'completed' ? <span><CheckCircle size={14} style={{ marginRight: '6px' }} /> Completed</span> :
                     proj.status === 'expired' ? <span>⏰ Expired</span> :
                     <span><Circle fill="currentColor" size={10} style={{ marginRight: '6px' }} /> Closed</span>}
                  </StatusBadge>
                </span>
              </div>

              <p className="cl-proj-card__summary">{proj.summary}</p>

              {/* Skills */}
              {Array.isArray(proj.skills) && proj.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {proj.skills.map((s) => <span key={s} className="cl-tag">{s}</span>)}
                </div>
              )}

              {/* Pending Banners */}
              {proj.dispute && proj.dispute.status === 'pending' && (
                <div style={{ background: 'var(--color-error-tint)', border: '1px solid rgba(220, 38, 38, 0.25)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={14} style={{ marginRight: '6px' }} /> Contract under Dispute
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-error)' }}>
                    This contract has been escalated to Admin review. Reason: {proj.dispute.reason}.
                  </p>
                </div>
              )}

              {proj.contractType === 'hourly' && proj.endRequest && proj.endRequest.status === 'pending' && (
                <div style={{ background: 'var(--color-success-tint)', border: '1px solid rgba(5, 150, 105, 0.25)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  {String(proj.endRequest.requestedBy) === String(user?._id) ? (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-success)' }}>
                      ⏳ Waiting for the freelancer to approve your request to end this contract.
                    </p>
                  ) : (
                    <>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-success)' }}>
                        <XCircle size={14} style={{ marginRight: '6px' }} /> Freelancer has requested to end this contract
                      </h4>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-success)' }}>
                        Reason: {proj.endRequest.reason}
                        {proj.endRequest.additionalDetails && <span> - {proj.endRequest.additionalDetails}</span>}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button variant="success" size="sm" onClick={() => handleRespondEnd(proj.contractId, 'approve')} disabled={actioning}>
                          Approve & End Contract
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRespondEnd(proj.contractId, 'reject')} disabled={actioning}>
                          Reject Request
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Hourly Project Info */}
              {proj.contractType === 'hourly' && proj.status !== 'draft' && proj.status !== 'open' && (
                <div style={{ background: 'var(--color-secondary)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(183, 201, 226, 0.35)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {proj.status === 'completed' || proj.status === 'closed' ? (
                      <span style={{ color: 'var(--color-text-mid)', fontWeight: 600 }}><Circle fill="currentColor" size={10} style={{ marginRight: '6px' }} /> Freelancer stopped working</span>
                    ) : proj.timerActive ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        <Circle fill="currentColor" size={10} style={{ marginRight: '6px' }} /> Freelancer is currently working
                        <LiveTimer startedAt={proj.timerStartedAt} hourlyRate={proj.hourlyRate} prefix=" (" suffix=")" />
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-mid)', fontWeight: 600 }}><Circle fill="currentColor" size={10} style={{ marginRight: '6px' }} /> Freelancer is not working right now</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--color-text-mid)' }}>
                    <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Total logged: <strong>{Math.floor(proj.totalDuration / 3600000)}h {Math.floor((proj.totalDuration % 3600000) / 60000)}m</strong>
                    {proj.hourlyRate > 0 && <span style={{ marginLeft: '0.4rem', color: 'var(--color-success)', fontSize: '0.9em' }}>(Rs. {((proj.totalDuration / 3600000) * proj.hourlyRate).toFixed(2)})</span>}
                    {proj.lastTimeLog && (
                      <span style={{ marginLeft: '0.5rem', paddingLeft: '0.5rem', borderLeft: '1px solid rgba(183, 201, 226, 0.5)' }}>
                        Last session: <strong>{Math.floor(proj.lastTimeLog.duration / 3600000)}h {Math.floor((proj.lastTimeLog.duration % 3600000) / 60000)}m</strong>
                        {proj.hourlyRate > 0 && <span style={{ marginLeft: '0.4rem', color: 'var(--color-success)', fontSize: '0.9em' }}>(Rs. {((proj.lastTimeLog.duration / 3600000) * proj.hourlyRate).toFixed(2)})</span>}
                        {' '}({new Date(proj.lastTimeLog.endTime).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {proj.status !== 'completed' && proj.status !== 'closed' && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(183, 201, 226, 0.35)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Wallet size={14} style={{ color: (proj.hourlyEscrow?.lockedBalance || 0) < (proj.hourlyRate || 0) * 2 ? 'var(--color-error)' : 'var(--color-success)' }} />
                      <span style={{ color: (proj.hourlyEscrow?.lockedBalance || 0) < (proj.hourlyRate || 0) * 2 ? 'var(--color-error)' : 'var(--color-text-mid)' }}>
                        Escrow locked: <strong>Rs. {(proj.hourlyEscrow?.lockedBalance || 0).toFixed(2)}</strong>
                        {(proj.hourlyEscrow?.lockedBalance || 0) < (proj.hourlyRate || 0) * 2 && ' — running low'}
                      </span>
                      <Button variant="outline" size="sm" style={{ marginLeft: 'auto' }} onClick={() => lockHourly(proj.contractId)} disabled={actioning} icon={<CreditCard size={14} />}>
                        Top Up Escrow
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Fixed-price Milestone Progress */}
              {proj.contractType === 'fixed' && Array.isArray(proj.milestones) && proj.milestones.length > 0 && proj.status !== 'draft' && proj.status !== 'open' && (
                <div style={{ background: 'var(--color-secondary)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(183, 201, 226, 0.35)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-mid)' }}>
                    <Layers size={14} /> Escrow Milestones ({proj.milestones.filter(m => m.status === 'released').length}/{proj.milestones.length} released)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {proj.milestones.map((m) => {
                      const bg = m.status === 'released' ? 'var(--color-success-tint)'
                        : m.status === 'disputed' ? 'var(--color-error-tint)'
                        : m._id === proj.currentMilestone?._id ? 'var(--color-info-tint)'
                        : 'var(--color-secondary)';
                      const fg = m.status === 'released' ? 'var(--color-success)'
                        : m.status === 'disputed' ? 'var(--color-error)'
                        : m._id === proj.currentMilestone?._id ? 'var(--color-info)'
                        : 'var(--color-text-mid)';
                      return (
                        <span key={m._id} className="cl-tag" style={{ background: bg, color: fg }}>
                          {m.order}. {m.title} — Rs. {m.amount} ({m.status.replace('_', ' ')})
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="cl-proj-card__footer">
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)' }}>
                    <PkrIcon size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Budget: <strong>{proj.budget?.min === proj.budget?.max ? `Rs. ${proj.budget?.min || 0}` : `Rs. ${proj.budget?.min || 0}–${proj.budget?.max || 0}`}</strong>
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)' }}>
                    ⏱ {proj.duration}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)' }}>
                    <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Deadline: {proj.deadline || 'N/A'}
                  </span>
                </div>

                <div className="cl-proj-card__actions">
                  {/* Status is read-only — it advances only through the gated
                      lifecycle (accept proposal → pay deposit → deliver →
                      review → pay final → completed), never manual override. */}
                  <div className="cl-proj-card__btns">
                    {proj.status === 'draft' && (
                      <button 
                        className="cl-btn cl-btn--primary cl-btn--sm" 
                        onClick={async () => {
                          const ok = await updateProject(proj.id, { status: 'open' });
                          if (ok) showToast('Project published successfully!');
                        }}
                      >
                        <Send size={14} style={{ marginRight: '6px' }} /> Publish Draft
                      </button>
                    )}
                    {/* Hourly escrow lock status + top-up lives in the "Hourly Project
                        Info" panel above — no separate deposit button needed here;
                        the initial week's lock happens automatically at hire time. */}
                    {proj.status === 'in-progress' && proj.source !== 'gig' && proj.contractType === 'fixed' && proj.currentMilestone && (
                      proj.currentMilestone.status === 'pending_funding' ? (
                        <button className="cl-btn cl-btn--outline cl-btn--sm" onClick={() => fundNextMilestone(proj.currentMilestone._id)} disabled={actioning}>
                          <CreditCard size={14} style={{ marginRight: '6px' }} /> Fund Milestone {proj.currentMilestone.order} (Rs. {proj.currentMilestone.amount})
                        </button>
                      ) : proj.currentMilestone.status === 'disputed' ? (
                        <button className="cl-btn cl-btn--ghost cl-btn--sm" disabled style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                          <AlertTriangle size={14} style={{ marginRight: '6px' }} /> Milestone {proj.currentMilestone.order} Under Dispute
                        </button>
                      ) : (
                        <button className="cl-btn cl-btn--ghost cl-btn--sm" disabled style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                          <CheckCircle size={14} style={{ marginRight: '6px' }} /> Milestone {proj.currentMilestone.order} Escrow Funded
                        </button>
                      )
                    )}
                    {proj.status === 'completed' && (
                      <>
                        <button className="cl-btn cl-btn--secondary cl-btn--sm" onClick={() => openReview(proj)}>
                          <Folder size={14} style={{ marginRight: '6px' }} /> View Submitted Work {proj.hasReviewed ? '(Reviewed)' : ''}
                        </button>
                        {proj.hasReviewed !== true && (
                          <button 
                            className="cl-btn cl-btn--ghost cl-btn--sm"
                            onClick={() => setShowReviewModal({ jobId: proj.id, targetName: 'Freelancer' })}
                          >
                            <Star size={14} style={{ marginRight: '6px' }} /> Leave Review
                          </button>
                        )}
                      </>
                    )}
                    {proj.contractStatus === 'delivered' && (
                      <button className="cl-btn cl-btn--primary cl-btn--sm" onClick={() => openReview(proj)}>
                        <Package size={14} style={{ marginRight: '6px' }} /> Review Submitted Work
                      </button>
                    )}
                    {proj.contractType === 'hourly' && ['in-progress', 'active'].includes(proj.status) && proj.endRequest?.status !== 'pending' && proj.dispute?.status !== 'pending' && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<XCircle size={14} />}
                        onClick={() => setEndRequestModal({ contractId: proj.contractId })}
                      >
                        End Contract
                      </Button>
                    )}
                    {proj.dispute?.status !== 'pending' && (
                      (proj.contractType === 'hourly' && ['in-progress', 'active'].includes(proj.status)) ||
                      (proj.contractType === 'fixed' && ['delivered', 'in_revision'].includes(proj.contractStatus) && !!proj.currentMilestone)
                    ) && (
                      <button
                        className="cl-btn cl-btn--sm cl-btn--ghost"
                        style={{ color: 'var(--color-error)' }}
                        onClick={() => setDisputeModal({ contractId: proj.contractId })}
                      >
                        <AlertTriangle size={14} style={{ marginRight: '6px' }} /> {proj.contractType === 'hourly' ? 'Dispute (Force End)' : 'Raise Dispute'}
                      </button>
                    )}
                    {proj.status !== 'draft' && proj.source !== 'gig' && (
                      <Link to={`/client/projects/${proj.id}/proposals`} className="cl-btn cl-btn--secondary cl-btn--sm">
                        <Users size={14} style={{ marginRight: '6px' }} /> View Proposals ({proj.proposals?.length || 0})
                      </Link>
                    )}
                    {proj.hiredFreelancer && (
                      <Link to={`/client/messages?user=${proj.hiredFreelancer._id}`} className="cl-btn cl-btn--ghost cl-btn--sm">
                        <MessageSquare size={14} style={{ marginRight: '6px' }} /> Contact Freelancer
                      </Link>
                    )}
                    {['draft', 'open'].includes(proj.status) && (
                      <button className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => openEdit(proj)}><Edit3 size={14} style={{ marginRight: '6px' }} /> Edit</button>
                    )}
                    {!['in-progress', 'delivered', 'completed'].includes(proj.status) && (
                      <button
                        className="cl-btn cl-btn--danger cl-btn--sm"
                        onClick={() => setDeleteModal(proj.id)}
                      >
                        <Trash2 size={14} style={{ marginRight: '6px' }} /> Delete
                      </button>
                    )}
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
            <Loader text="Loading project details…" />
          </div>
        ) : (
          <form className="cl-edit-form" onSubmit={handleEditSubmit}>
            <div className="cl-edit-form__scroll" style={{ paddingRight: '0.75rem', marginRight: '-0.75rem' }}>
              <div className="cl-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                <div className="cl-form-group full" style={{ gridColumn: '1 / -1' }}>
                  <label className="cl-label" htmlFor="cp-edit-title">Project Title *</label>
                  <input
                    id="cp-edit-title"
                    className={`cl-input${editErrors.title ? ' cl-input--error' : ''}`}
                    value={editingProject.title}
                    onChange={e => { setField({ title: e.target.value }); clearEditError('title'); }}
                    style={{ background: 'var(--color-secondary)' }}
                  />
                  {editErrors.title && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {editErrors.title}</span>}
                </div>

                {/* AI suggest & fill — category, skills & experience level from the brief */}
                <div className="cl-form-group full" style={{ gridColumn: '1 / -1' }}>
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
                  {editErrors.category && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {editErrors.category}</span>}
                </div>

                <div className="cl-form-group">
                  <label className="cl-label">Subcategory</label>
                  <TagInput
                    tags={editingProject.subcategory ? [editingProject.subcategory] : []}
                    onChange={tags => setField({ subcategory: tags[0] || '' })}
                    options={GIG_SUBCATEGORIES[editingProject.category] || []}
                    maxTags={1}
                    placeholder="Type or select subcategory…"
                    showHint={false}
                  />
                </div>

                <div className="cl-form-group full" style={{ gridColumn: '1 / -1' }}>
                  <label className="cl-label">Required Skills (press Enter) *</label>
                  <TagInput
                    tags={editingProject.skills}
                    onChange={tags => { setField({ skills: tags }); clearEditError('skills'); }}
                    placeholder="e.g. React, CSS, Figma"
                  />
                  {editErrors.skills && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {editErrors.skills}</span>}
                </div>

                <div className="cl-form-group">
                  <label className="cl-label" htmlFor="cp-edit-experience">Experience Level</label>
                  <ComboSelect
                    id="cp-edit-experience"
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
                      style={{ flex: 1 }}
                    >Fixed Price</button>
                    <button
                      type="button"
                      className={`cl-btn cl-btn--sm ${editingProject.projectType === 'hourly' ? 'cl-btn--primary' : 'cl-btn--ghost'}`}
                      onClick={() => setField({ projectType: 'hourly' })}
                      style={{ flex: 1 }}
                    >Hourly Rate</button>
                  </div>
                </div>

                <div className="cl-form-group">
                  <label className="cl-label" htmlFor="cp-edit-budget-min">Min Budget (PKR) *</label>
                  <input
                    id="cp-edit-budget-min"
                    type="number" min={1} className={`cl-input${editErrors.budgetMin ? ' cl-input--error' : ''}`}
                    value={editingProject.budget.min}
                    onChange={e => { setField({ budget: { ...editingProject.budget, min: e.target.value } }); clearEditError('budgetMin'); }}
                    onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) setField({ budget: { ...editingProject.budget, min: 1 } }); }}
                  />
                  {editErrors.budgetMin && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {editErrors.budgetMin}</span>}
                </div>

                <div className="cl-form-group">
                  <label className="cl-label" htmlFor="cp-edit-budget-max">Max Budget (PKR) *</label>
                  <input
                    id="cp-edit-budget-max"
                    type="number" min={1} className={`cl-input${editErrors.budgetMax ? ' cl-input--error' : ''}`}
                    value={editingProject.budget.max}
                    onChange={e => { setField({ budget: { ...editingProject.budget, max: e.target.value } }); clearEditError('budgetMax'); }}
                    onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) setField({ budget: { ...editingProject.budget, max: 1 } }); }}
                  />
                  {editErrors.budgetMax && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {editErrors.budgetMax}</span>}
                </div>

                <div className="cl-form-group">
                  <label className="cl-label" htmlFor="cp-edit-duration">Duration</label>
                  <input
                    id="cp-edit-duration"
                    className="cl-input"
                    placeholder="e.g. 1-3 months"
                    value={editingProject.duration}
                    onChange={e => setField({ duration: e.target.value })}
                  />
                </div>

                <div className="cl-form-group">
                  <label className="cl-label" htmlFor="cp-edit-deadline">Deadline</label>
                  <input
                    id="cp-edit-deadline"
                    type="date" className={`cl-input${editErrors.deadline ? ' cl-input--error' : ''}`}
                    value={editingProject.deadline}
                    onChange={e => { setField({ deadline: e.target.value }); clearEditError('deadline'); }}
                  />
                  {editErrors.deadline && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {editErrors.deadline}</span>}
                </div>

                {/* Status is intentionally NOT editable here — it's driven by the gated lifecycle */}
                <div className="cl-form-group full" style={{ gridColumn: '1 / -1' }}>
                  <label className="cl-label">Status</label>
                  <div className="cl-input" style={{ background: 'var(--color-secondary)', textTransform: 'capitalize', color: 'var(--color-text-mid)' }}>
                    {editingProject.status} <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', opacity: 0.7 }}>(Managed by project lifecycle)</span>
                  </div>
                </div>

                <div className="cl-form-group full" style={{ gridColumn: '1 / -1' }}>
                  <label className="cl-label" htmlFor="cp-edit-description">Full Description *</label>
                  <textarea
                    id="cp-edit-description"
                    className={`cl-textarea${editErrors.description ? ' cl-input--error' : ''}`}
                    value={editingProject.description}
                    onChange={e => { setField({ description: e.target.value }); clearEditError('description'); }}
                    style={{ minHeight: '160px', background: 'var(--color-secondary)', resize: 'vertical' }}
                    placeholder="Describe the project scope, responsibilities, and deliverables (min 50 characters)…"
                  />
                  {editErrors.description && <span className="cl-error"><AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {editErrors.description}</span>}
                  <AiGenerateText
                    className="cl-ai-generate"
                    fieldLabel="a client's detailed freelance project description, including scope, responsibilities, and deliverables"
                    getContext={() => ({ title: editingProject.title, category: editingProject.category, skills: editingProject.skills })}
                    getExistingText={() => editingProject.description}
                    onGenerated={(text) => { setField({ description: text }); clearEditError('description'); }}
                  />
                </div>
              </div>
            </div>

            <div className="cl-actions full" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-secondary)' }}>
              <button type="button" className="cl-btn cl-btn--ghost" onClick={() => setEditingProject(null)} disabled={savingEdit}>Cancel</button>
              <button type="submit" className={`cl-btn cl-btn--primary${savingEdit ? ' cl-btn--loading' : ''}`} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
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
              <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginBottom: '0.75rem' }}>
                Revision #{reviewing.revisionCount} — this is a resubmission.
              </p>
            )}

            {reviewing.delivery ? (
              <div className="cl-card" style={{ background: 'var(--color-secondary)', padding: '1rem', marginBottom: '1.25rem' }}>
                {reviewing.delivery.message && (
                  <>
                    <span className="cl-label">Delivery note</span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>{reviewing.delivery.message}</p>
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
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.75rem' }}>
                    Submitted {new Date(reviewing.delivery.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <Loader text="Loading delivery details…" />
            )}

            {!reviewing.isCompleted ? (
              <>
                <div className="cl-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="cl-label" htmlFor="cp-revision-note">Need changes? Describe what to revise (optional for accept)</label>
                  <textarea
                    id="cp-revision-note"
                    className="cl-textarea"
                    rows={3}
                    placeholder="e.g. Please adjust the colour scheme and fix the mobile layout…"
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                  />
                </div>

                <div className="cl-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="cl-btn cl-btn--primary" onClick={handleAccept} disabled={actioning}>
                    {actioning ? 'Working…' : <><Check size={14} style={{ marginRight: '6px' }} /> Accept & Complete</>}
                  </button>
                  <button className="cl-btn cl-btn--outline" onClick={handleRequestRevision} disabled={actioning} style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
                    <RefreshCw size={14} style={{ marginRight: '6px' }} /> Request Revision
                  </button>
                  <button className="cl-btn cl-btn--ghost" onClick={() => setReviewing(null)} disabled={actioning}>Cancel</button>
                </div>
              </>
            ) : (
              <div className="cl-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="cl-btn cl-btn--ghost" onClick={() => setReviewing(null)} disabled={actioning}>Close</button>
              </div>
            )}
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
          onSuccess={() => {
            setShowReviewModal(null);
            fetchProfile();
          }}
        />
      )}

      {/* End Request Modal */}
      <Modal open={!!endRequestModal} title="End Hourly Contract" onClose={() => setEndRequestModal(null)}>
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-mid)' }}>
          This will send a request to the freelancer to mutually end this hourly contract.
        </p>
        <form onSubmit={handleRequestEnd}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="cl-label" htmlFor="cp-end-reason">Reason for ending</label>
            <CustomSelect
              id="cp-end-reason"
              value={endReason}
              onChange={setEndReason}
              options={['Work completed', 'Mutual agreement', 'Client no longer requires work', 'Freelancer unavailable', 'Communication issues', 'Other']}
            />
          </div>
          {endReason === 'Other' && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="cl-label" htmlFor="cp-end-details">Additional Details</label>
              <textarea
                id="cp-end-details"
                className="cl-input"
                rows="3"
                value={endDetails}
                onChange={e => setEndDetails(e.target.value)}
                placeholder="Please explain..."
                required
              />
            </div>
          )}
          <div className="cl-actions">
            <button type="submit" className="cl-btn cl-btn--primary" disabled={actioning}>Send Request</button>
            <button type="button" className="cl-btn cl-btn--ghost" onClick={() => setEndRequestModal(null)} disabled={actioning}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Dispute Modal */}
      <Modal open={!!disputeModal} title="Raise Dispute (Force End)" onClose={() => setDisputeModal(null)}>
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-mid)' }}>
          If you and the freelancer cannot agree, you can raise a dispute. The contract will be locked, and our Admin will review the case.
        </p>
        <form onSubmit={handleRaiseDispute}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="cl-label" htmlFor="cp-dispute-reason">Dispute Reason</label>
            <input
              id="cp-dispute-reason"
              className="cl-input"
              type="text"
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)} 
              placeholder="e.g. Freelancer stopped communicating"
              required 
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="cl-label" htmlFor="cp-dispute-desc">Description (Optional)</label>
            <textarea
              id="cp-dispute-desc"
              className="cl-input"
              rows="3"
              value={disputeDesc}
              onChange={e => setDisputeDesc(e.target.value)}
              placeholder="Provide more details for the admin..."
            />
          </div>
          <div className="cl-actions">
            <button type="submit" className="cl-btn cl-btn--danger" disabled={actioning}>Raise Dispute</button>
            <button type="button" className="cl-btn cl-btn--ghost" onClick={() => setDisputeModal(null)} disabled={actioning}>Cancel</button>
          </div>
        </form>
      </Modal>

      <style>{`
        .cl-proj-card { display: flex; flex-direction: column; gap: 0.75rem; }
        .cl-proj-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .cl-proj-card__title { font-family: var(--font-heading); font-size: 1rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.2rem; }
        .cl-proj-card__meta { font-size: 0.78rem; color: var(--color-text-light); }
        .cl-proj-card__summary { font-size: 0.875rem; color: var(--color-text-mid); line-height: 1.5; overflow-wrap: break-word;word-break: break-word;}
        .cl-proj-card__footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; border-top: 1px solid rgba(183, 201, 226, 0.35); padding-top: 0.75rem; margin-top: 0.25rem; }
        .cl-proj-card__actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: nowrap; }
        .cl-proj-card__btns { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .cl-status-select { min-width: 130px !important; }
        .cl-status-select .csel__trigger { height: 32px; padding: 0 0.75rem; font-size: 0.8rem; }
        .cl-spinner {
          width: 38px; height: 38px; margin: 0 auto;
          border: 3px solid rgba(183, 201, 226, 0.35); border-top-color: var(--color-primary);
          border-radius: 50%; animation: cl-spin 0.8s linear infinite;
        }
        @keyframes cl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientProjects;
