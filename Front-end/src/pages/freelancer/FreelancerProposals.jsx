import Loader from '../../Components/common/Loader/Loader';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { proposalsAPI } from '../../api/proposals';
import { useAuth } from '../../hooks/useAuth';
import {
  Clock, ExternalLink, UploadCloud, X, FileText, Settings, Package, CheckCircle2, XCircle, Flag, Edit2, RotateCcw
} from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import Modal from '../../Components/common/Modal/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import { safeToast as toast } from '../../utils/safeToast';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import './FreelancerDashboard.css';

const DELIVERY_OPTIONS = ['Less than 1 week', '1-2 weeks', '1 month', '3+ months'];

export default function FreelancerProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProposal, setEditingProposal] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [withdrawConfirmId, setWithdrawConfirmId] = useState(null);


  useEffect(() => {
    fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProposals = async () => {
    try {
      // Need a way to filter proposals by freelancerId
      // Backend listProposals allows jobId and status. 
      // I should check if backend handles freelancerId or 'me'
      const res = await proposalsAPI.listProposals({ freelancerId: user._id });
      setProposals(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      toast.error('Failed to load your proposals.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (id) => {
    if (withdrawingId) return;
    setWithdrawingId(id);
    try {
      await proposalsAPI.withdrawProposal(id);
      toast.success('Proposal withdrawn.');
      fetchProposals();
    } catch {
      toast.error('Failed to withdraw proposal.');
    } finally {
      setWithdrawingId(null);
      setWithdrawConfirmId(null);
    }
  };

  const isResubmit = (prop) => prop?.status === 'rejected' && prop?.canResubmit;

  const openEdit = (prop) => {
    setEditingProposal(prop);
    setEditForm({
      coverLetter: prop.coverLetter || '',
      fixedPrice: prop.fixedPrice ?? '',
      hourlyRate: prop.hourlyRate ?? '',
      estimatedDeliveryTime: prop.estimatedDeliveryTime || '1-2 weeks',
      estimatedWeeklyHours: prop.estimatedWeeklyHours ?? ''
    });
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditingProposal(null);
    setEditForm(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProposal || !editForm) return;

    // Client-side validation mirroring the Apply form / backend rules.
    const cover = editForm.coverLetter.trim();
    if (cover.length < 100) {
      toast.error(`Cover letter must be at least 100 characters (currently ${cover.length}).`);
      return;
    }
    if (cover.length > 2000) {
      toast.error('Cover letter must be at most 2000 characters.');
      return;
    }
    const isHourly = editingProposal.jobId?.budget?.type === 'hourly';
    const payload = { coverLetter: editForm.coverLetter };

    if (isHourly) {
      const rate = Number(editForm.hourlyRate);
      if (!rate || rate <= 0) {
        toast.error('Enter a valid hourly rate greater than 0.');
        return;
      }
      const hrs = Number(editForm.estimatedWeeklyHours);
      if (!hrs || hrs <= 0 || hrs > 168) {
        toast.error('Enter a valid number of weekly hours (1-168).');
        return;
      }
      payload.hourlyRate = rate;
      payload.estimatedWeeklyHours = hrs;
    } else {
      const price = Number(editForm.fixedPrice);
      if (!price || price <= 0) {
        toast.error('Enter a valid fixed price greater than 0.');
        return;
      }
      payload.fixedPrice = price;
      payload.estimatedDeliveryTime = editForm.estimatedDeliveryTime;
    }

    const resubmitting = isResubmit(editingProposal);
    setSavingEdit(true);
    try {
      await proposalsAPI.updateProposal(editingProposal._id, payload);
      toast.success(resubmitting ? 'Proposal revised and resubmitted!' : 'Proposal updated.');
      setEditingProposal(null);
      setEditForm(null);
      fetchProposals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update proposal.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Status badge for the underlying job (work stage), shown on accepted props.
  const workStage = (status) => {
    if (status === 'in-progress') return { label: <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Settings size={14} /> In Progress</span>, color: 'var(--color-info)' };
    if (status === 'delivered') return { label: <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Package size={14} /> Delivered — awaiting review</span>, color: 'var(--color-warning)' };
    if (status === 'completed') return { label: <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Completed</span>, color: 'var(--color-success)' };
    return null;
  };

  if (loading) return <Loader text="Loading your proposals..." fullScreen={true} />;

  return (
    <div className="fl-proposals">
      <div className="fl-page-header">
        <h1 className="fl-page-title">My Proposals</h1>
        <p className="fl-page-sub">Track the status of your submitted project bids.</p>
      </div>

      {proposals.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No Proposals Found"
          message="You haven't submitted any proposals yet. Explore projects to find work!"
          actionText="Browse Projects"
          actionLink="/browse-projects"
        />
      ) : (
        <div className="fl-card-list">
          {proposals.map((prop) => (
            <div key={prop._id} className="fl-card fl-prop-card">
              <div className="fl-prop-card__header">
                <div>
                  <h3 className="fl-prop-card__title">{prop.jobId?.title}</h3>
                  <p className="fl-prop-card__meta">
                    {prop.jobId?.category} · Submitted {new Date(prop.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`fl-badge fl-badge--${prop.status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  {prop.status === 'pending' && <><Clock size={14} /> Pending</>}
                  {prop.status === 'accepted' && <><CheckCircle2 size={14} /> Accepted</>}
                  {prop.status === 'rejected' && <><XCircle size={14} /> Rejected</>}
                  {prop.status === 'withdrawn' && <><Flag size={14} /> Withdrawn</>}
                </span>
              </div>

              <div className="fl-prop-card__body">
                <div className="fl-prop-card__details">
                  <div className="fl-prop-card__detail">
                    <PkrIcon size={14} />
                    <span>Your Bid: <strong>Rs. {prop.fixedPrice || prop.hourlyRate}{prop.hourlyRate ? '/hr' : ''}</strong></span>
                  </div>
                  <div className="fl-prop-card__detail">
                    <Clock size={14} />
                    <span>Duration: <strong>{prop.estimatedDeliveryTime || (prop.estimatedWeeklyHours ? `${prop.estimatedWeeklyHours} hrs/week` : '')}</strong></span>
                  </div>
                </div>
                
                {prop.clientResponse && (
                  <div className="fl-prop-card__response">
                    <strong>Client Feedback:</strong>
                    <p>{prop.clientResponse}</p>
                  </div>
                )}

                {isResubmit(prop) && (
                  <div className="fl-prop-card__resubmit-note">
                    <RotateCcw size={14} /> The client is open to a revised proposal — edit and resubmit below.
                  </div>
                )}

                {/* Work stage (only on accepted proposals) */}
                {prop.status === 'accepted' && workStage(prop.jobId?.status) && (
                  <div className="fl-work-stage" style={{ color: workStage(prop.jobId?.status).color }}>
                    {workStage(prop.jobId?.status).label}
                    {prop.jobId?.status === 'in-progress' && prop.jobId?.revisionNote && (
                      <span className="fl-revision-note">Revision requested: {prop.jobId.revisionNote}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="fl-prop-card__footer">
                <div className="fl-prop-card__btns">
                  <Link to={`/jobs/${prop.jobId?._id}`} className="fl-btn fl-btn--ghost fl-btn--sm">
                    View Project <ExternalLink size={14} />
                  </Link>
                  {prop.status === 'pending' && prop.jobId?.status === 'open' && (
                    <button
                      className="fl-btn fl-btn--outline fl-btn--sm"
                      onClick={() => openEdit(prop)}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  )}
                  {isResubmit(prop) && prop.jobId?.status === 'open' && (
                    <button
                      className="fl-btn fl-btn--primary fl-btn--sm"
                      onClick={() => openEdit(prop)}
                    >
                      <RotateCcw size={14} /> Edit & Resubmit
                    </button>
                  )}
                  {prop.status === 'pending' && (
                    <button
                      className="fl-btn fl-btn--outline fl-btn--sm"
                      onClick={() => setWithdrawConfirmId(prop._id)}
                      disabled={withdrawingId === prop._id}
                      style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                    >
                      {withdrawingId === prop._id ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                  )}
                  {prop.status === 'accepted' && prop.jobId?.status === 'in-progress' && (
                    <Link
                      to="/freelancer/work"
                      className="fl-btn fl-btn--primary fl-btn--sm"
                    >
                      <UploadCloud size={14} /> Submit Work
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!withdrawConfirmId}
        title="Withdraw proposal?"
        message="Are you sure you want to withdraw this proposal? This can't be undone."
        confirmLabel="Withdraw"
        loading={!!withdrawingId}
        onConfirm={() => handleWithdraw(withdrawConfirmId)}
        onClose={() => setWithdrawConfirmId(null)}
      />

      <Modal open={!!editingProposal} title={isResubmit(editingProposal) ? 'Edit & Resubmit Proposal' : 'Edit Proposal'} onClose={closeEdit} size="md">
        {editForm && (
          <form onSubmit={handleEditSubmit}>
            {editingProposal?.jobId?.budget?.type === 'hourly' ? (
              <>
                <div className="fl-form-group">
                  <label>Hourly Rate (Rs./hr)</label>
                  <input
                    type="number"
                    required
                    className="fl-input"
                    value={editForm.hourlyRate}
                    onChange={e => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                    min="1"
                    step="0.01"
                  />
                </div>
                <div className="fl-form-group">
                  <label>Estimated Weekly Hours</label>
                  <input
                    type="number"
                    required
                    className="fl-input"
                    placeholder="e.g. 20"
                    value={editForm.estimatedWeeklyHours}
                    onChange={e => setEditForm({ ...editForm, estimatedWeeklyHours: e.target.value })}
                    min="1"
                    max="168"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="fl-form-group">
                  <label>Fixed Price (PKR)</label>
                  <input
                    type="number"
                    required
                    className="fl-input"
                    value={editForm.fixedPrice}
                    onChange={e => setEditForm({ ...editForm, fixedPrice: e.target.value })}
                    min="1"
                    step="0.01"
                  />
                </div>
                <div className="fl-form-group">
                  <label>Estimated Delivery Time</label>
                  <CustomSelect
                    value={editForm.estimatedDeliveryTime}
                    onChange={val => setEditForm({ ...editForm, estimatedDeliveryTime: val })}
                    options={DELIVERY_OPTIONS}
                  />
                </div>
              </>
            )}

            <div className="fl-form-group">
              <label>Cover Letter</label>
              <textarea
                required
                maxLength={2000}
                rows={6}
                className="fl-textarea"
                value={editForm.coverLetter}
                onChange={e => setEditForm({ ...editForm, coverLetter: e.target.value })}
              />
              <span
                className="fl-char-count"
                style={{ color: editForm.coverLetter.trim().length < 100 ? 'var(--color-error)' : 'var(--color-success)' }}
              >
                {editForm.coverLetter.trim().length < 100
                  ? `${editForm.coverLetter.trim().length} / 100 min`
                  : `${editForm.coverLetter.length} / 2000`}
              </span>
            </div>

            <div className="fl-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-secondary)' }}>
              <button type="button" className="fl-btn fl-btn--ghost" onClick={closeEdit} disabled={savingEdit}>Cancel</button>
              <button type="submit" className="fl-btn fl-btn--primary" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : (isResubmit(editingProposal) ? 'Resubmit Proposal' : 'Save Changes')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        .fl-prop-card { margin-bottom: 1rem; }
        .fl-prop-card__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
        .fl-prop-card__title { font-size: 1rem; font-weight: 700; color: var(--color-primary); }
        .fl-prop-card__meta { font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.2rem; }
        .fl-prop-card__details { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
        .fl-prop-card__detail { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--color-text-mid); }
        .fl-prop-card__response { background: var(--color-secondary); border: 1px solid rgba(183, 201, 226, 0.35); padding: 0.75rem 1rem; border-radius: 10px; margin-top: 1rem; }
        .fl-prop-card__response strong { display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-light); margin-bottom: 0.3rem; }
        .fl-prop-card__response p { font-size: 0.875rem; color: var(--color-text-mid); line-height: 1.5; }
        .fl-prop-card__resubmit-note { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; font-weight: 600; color: var(--color-info); margin-top: 0.75rem; }
        .fl-prop-card__footer { border-top: 1px solid rgba(183, 201, 226, 0.2); padding-top: 1rem; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; }
        .fl-prop-card__btns { display: flex; gap: 0.75rem; }
        .fl-work-stage { margin-top: 0.85rem; font-weight: 700; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .fl-revision-note { font-weight: 500; font-size: 0.8rem; color: var(--color-warning); background: var(--color-warning-tint); border: 1px solid rgba(217, 119, 6, 0.3); border-radius: 8px; padding: 0.4rem 0.6rem; }
      `}</style>
    </div>
  );
}
