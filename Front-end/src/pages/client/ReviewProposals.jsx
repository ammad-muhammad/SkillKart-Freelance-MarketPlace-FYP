import { Inbox } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { proposalsAPI } from '../../api/proposals';
import { jobsAPI } from '../../api/jobs';
import { messagesAPI } from '../../api/messages';
import { useClient } from '../../context/ClientContext';
import {
  User, CheckCircle2, XCircle, Clock,
  MessageSquare, ChevronLeft,
  Mail, Star, ExternalLink, Plus, X, Layers, Wallet
} from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import Skeleton from '../../Components/common/Skeleton/Skeleton';
import Modal from '../freelancer/components/Modal';
import './ReviewProposals.css';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function ReviewProposals() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { fetchProfile, showToast } = useClient();
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [messagingId, setMessagingId] = useState(null);
  const [welcomeModal, setWelcomeModal] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [splitMilestones, setSplitMilestones] = useState(false);
  const [milestones, setMilestones] = useState([{ title: '', amount: '' }]);
  // Set when accept fails with a structured insufficientBalance error —
  // drives the guided top-up modal instead of a plain error toast.
  const [topUpModal, setTopUpModal] = useState(null); // { required, available, contractType }

  const acceptingProposal = proposals.find((p) => p._id === welcomeModal);
  const isHourlyJob = job?.budget?.type === 'hourly';
  const agreedPrice = round2(acceptingProposal?.fixedPrice || 0);
  const milestonesTotal = round2(milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0));
  const milestonesValid = !splitMilestones || (
    milestones.every((m) => m.title.trim() && Number(m.amount) > 0) && milestonesTotal === agreedPrice
  );

  const addMilestoneRow = () => setMilestones((prev) => [...prev, { title: '', amount: '' }]);
  const removeMilestoneRow = (i) => setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  const updateMilestoneRow = (i, key, val) => setMilestones((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: val } : m)));

  const handleMessage = async (prop) => {
    const freelancerId = prop.freelancerId?._id;
    if (!freelancerId) return;
    setMessagingId(prop._id);
    try {
      await messagesAPI.startConversation(
        freelancerId,
        `Hi! I'd like to discuss your proposal for "${job?.title || 'my project'}".`,
        { suppressErrorToast: true }
      );
      navigate('/client/messages');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      showToast('Could not start the conversation. Please try again.', 'error');
    } finally {
      setMessagingId(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, propRes] = await Promise.all([
        jobsAPI.getJobById(jobId),
        proposalsAPI.listProposals({ jobId })
      ]);
      setJob(jobRes.data.data.job);
      // listProposals returns a paginated body: { data: [...proposals], meta }.
      // The array is at data.data (NOT data.data.items).
      setProposals(Array.isArray(propRes.data.data) ? propRes.data.data : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('Failed to load proposals.', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptClick = (id) => {
    setWelcomeModal(id);
    setWelcomeMessage("Hi! I'm thrilled to accept your proposal and look forward to working with you on this project. Let's get started!");
    setSplitMilestones(false);
    setMilestones([{ title: '', amount: '' }]);
  };

  const confirmAccept = async () => {
    if (!welcomeModal) return;
    if (splitMilestones && !milestonesValid) {
      showToast(`Milestone amounts must add up to exactly Rs. ${agreedPrice} (currently Rs. ${milestonesTotal}), and every milestone needs a title.`, 'error');
      return;
    }

    const id = welcomeModal;
    const message = welcomeMessage.trim();
    const milestonePayload = splitMilestones
      ? milestones.map((m) => ({ title: m.title.trim(), amount: Number(m.amount) }))
      : undefined;

    setWelcomeModal(null);
    setProcessingId(id);
    setJob(prev => prev ? { ...prev, status: 'in_progress' } : prev);

    try {
      // Fixed-price hires lock 100% of milestone 1's escrow, hourly hires lock
      // one week's estimate — both as part of this call itself, there's no
      // separate "fund the deposit" step to redirect to afterward.
      await proposalsAPI.acceptProposal(id, message, milestonePayload);
      showToast(
        isHourlyJob
          ? 'Proposal accepted — one week\'s escrow locked. The freelancer can start logging time.'
          : 'Proposal accepted — 100% escrow locked for milestone 1. The freelancer can start work now.'
      );
      await fetchProfile(); // Sync global state
      navigate('/client/projects');
    } catch (error) {
      const errData = error.response?.data?.errors;
      if (errData?.insufficientBalance) {
        // Guided top-up: the client can't accept until they fund their
        // wallet — show the exact shortfall and a direct link to top up.
        setTopUpModal({
          required: errData.required,
          available: errData.available,
          contractType: errData.contractType
        });
      } else {
        showToast(error.response?.data?.message || 'Failed to accept proposal.', 'error');
      }
      setJob(prev => prev ? { ...prev, status: 'open' } : prev);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;

    setProcessingId(id);
    try {
      await proposalsAPI.rejectProposal(id, reason);
      showToast('Proposal rejected.');
      await fetchProfile(); // Sync global state
      fetchData(); // Refresh local view
    } catch {
      showToast('Failed to reject proposal.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rp-container">
        <div className="cl-page-header">
          <Skeleton width="150px" height="20px" style={{ marginBottom: '1rem' }} />
          <Skeleton width="300px" height="32px" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width="250px" height="20px" />
        </div>
        <div className="rp-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="rp-card">
              <div className="rp-card__header" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Skeleton variant="circle" width="48px" height="48px" />
                <div style={{ flex: 1 }}>
                  <Skeleton width="150px" height="20px" style={{ marginBottom: '0.25rem' }} />
                  <Skeleton width="100px" height="16px" />
                </div>
              </div>
              <div className="rp-card__body">
                <Skeleton width="100%" height="60px" style={{ marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Skeleton width="100px" height="20px" />
                  <Skeleton width="100px" height="20px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rp-page">
      <div className="cl-page-header">
        <Link to="/client/projects" className="rp-back">
          <ChevronLeft size={18} /> Back to My Projects
        </Link>
        <h1 className="cl-page-title">Review Proposals</h1>
        <p className="cl-page-sub">
          Reviewing {proposals.length} proposals for <strong>{job?.title}</strong>
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="rp-empty">
          <div className="rp-empty__icon"><Inbox size={48} /></div>
          <h3>No Proposals Yet</h3>
          <p>This project hasn't received any proposals from freelancers yet.</p>
        </div>
      ) : (
        <div className="rp-grid">
          {proposals.map((prop) => (
            <div key={prop._id} className={`rp-card rp-card--${prop.status}`}>
              <div className="rp-card__header">
                <div className="rp-user">
                  <div className="rp-user__avatar">
                    {prop.freelancerId?.profilePicture ? (
                      <img src={prop.freelancerId.profilePicture} alt="" />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div className="rp-user__info">
                    <h4 className="rp-user__name">
                      {prop.freelancerId?.firstName} {prop.freelancerId?.lastName}
                    </h4>
                    <div className="rp-user__meta">
                      <Star size={12} fill="#facc15" color="#facc15" />
                      <span>{prop.freelancerId?.rating > 0 ? prop.freelancerId.rating.toFixed(1) : 'New'}</span>
                    </div>
                  </div>
                </div>
                <div className={`rp-status rp-status--${prop.status}`}>
                  {prop.status.toUpperCase()}
                </div>
              </div>

              <div className="rp-card__body">
                <div className="rp-details">
                  <div className="rp-detail">
                    <PkrIcon size={16} />
                    <span>Bid: <strong>Rs. {prop.fixedPrice || prop.hourlyRate}{prop.hourlyRate ? '/hr' : ''}</strong></span>
                  </div>
                  <div className="rp-detail">
                    <Clock size={16} />
                    <span>Duration: <strong>{prop.estimatedDeliveryTime || (prop.estimatedWeeklyHours ? `${prop.estimatedWeeklyHours} hrs/week` : '')}</strong></span>
                  </div>
                </div>

                <div className="rp-cover">
                  <h5>Cover Letter</h5>
                  <p>{prop.coverLetter}</p>
                </div>
              </div>

              <div className="rp-card__footer">
                <div className="rp-actions">
                  {prop.status === 'pending' ? (
                    <>
                      <button 
                        className="rp-btn rp-btn--accept"
                        onClick={() => handleAcceptClick(prop._id)}
                        disabled={!!processingId || job?.status !== 'open'}
                      >
                        <CheckCircle2 size={18} /> Accept
                      </button>
                      <button 
                        className="rp-btn rp-btn--reject"
                        onClick={() => handleReject(prop._id)}
                        disabled={!!processingId || job?.status !== 'open'}
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="rp-responded">
                      {prop.respondedAt ? `Responded on ${new Date(prop.respondedAt).toLocaleDateString()}` : 'Auto-rejected'}
                    </span>
                  )}
                  <button
                    className="rp-btn rp-btn--ghost"
                    onClick={() => handleMessage(prop)}
                    disabled={messagingId === prop._id}
                  >
                    <MessageSquare size={18} /> {messagingId === prop._id ? 'Opening…' : 'Message'}
                  </button>
                </div>
                <Link to={`/freelancers/${prop.freelancerId?._id}`} className="rp-link">
                  View Profile <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {welcomeModal && (
        <Modal
          open={!!welcomeModal}
          onClose={() => setWelcomeModal(null)}
          title="Accept Proposal"
        >
          <div className="cl-modal__body" style={{ padding: '0.5rem 0 0 0' }}>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-text-mid)' }}>
              Send a welcome message to the freelancer to start the project contract:
            </p>
            <textarea
              className="cl-textarea"
              style={{
                width: '100%',
                minHeight: '120px',
                marginBottom: '1.5rem',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #d1d9e6',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical'
              }}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi! I'd like to accept your proposal..."
            />

            {!isHourlyJob && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', marginBottom: splitMilestones ? '0.9rem' : 0 }}>
                  <input type="checkbox" checked={splitMilestones} onChange={(e) => setSplitMilestones(e.target.checked)} />
                  <Layers size={15} /> Split into milestones (Rs. {agreedPrice} total)
                </label>

                {splitMilestones && (
                  <>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-mid)', margin: '0 0 0.75rem' }}>
                      Only milestone 1 is funded now. The freelancer must complete and you approve each milestone before the next one is funded.
                    </p>
                    {milestones.map((m, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <input
                          className="cl-input"
                          style={{ flex: 2 }}
                          placeholder={`Milestone ${i + 1} title`}
                          value={m.title}
                          onChange={(e) => updateMilestoneRow(i, 'title', e.target.value)}
                        />
                        <input
                          className="cl-input"
                          type="number"
                          style={{ flex: 1 }}
                          placeholder="Amount"
                          value={m.amount}
                          onChange={(e) => updateMilestoneRow(i, 'amount', e.target.value)}
                        />
                        {milestones.length > 1 && (
                          <button type="button" className="cl-btn cl-btn--ghost cl-btn--sm" onClick={() => removeMilestoneRow(i)} style={{ padding: '0.4rem' }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="cl-btn cl-btn--ghost cl-btn--sm" onClick={addMilestoneRow} style={{ marginTop: '0.25rem' }}>
                      <Plus size={14} style={{ marginRight: '4px' }} /> Add Milestone
                    </button>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '0.75rem', color: milestonesTotal === agreedPrice ? '#16a34a' : '#dc2626' }}>
                      Total: Rs. {milestonesTotal} / Rs. {agreedPrice} {milestonesTotal === agreedPrice ? '✓' : ''}
                    </p>
                  </>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                type="button" 
                className="cl-btn cl-btn--ghost" 
                onClick={() => setWelcomeModal(null)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="cl-btn cl-btn--primary" 
                onClick={confirmAccept}
                disabled={processingId || (splitMilestones && !milestonesValid)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                {processingId ? 'Accepting...' : 'Confirm & Accept'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {topUpModal && (
        <Modal
          open={!!topUpModal}
          onClose={() => setTopUpModal(null)}
          title="Top up your wallet to accept"
        >
          <div className="cl-modal__body" style={{ padding: '0.5rem 0 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Wallet size={28} style={{ flexShrink: 0, color: '#2563eb' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-mid)' }}>
                {topUpModal.contractType === 'hourly'
                  ? "Accepting this proposal locks one week's estimated cost from your wallet so the freelancer can start logging time."
                  : 'Accepting this proposal locks 100% of milestone 1 from your wallet so the freelancer can start work.'}
                {' '}Your balance is a bit short — top up, then come back and hit Accept again.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, padding: '0.85rem', borderRadius: '10px', background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--color-text-mid)', fontWeight: 600 }}>NEEDED</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Rs. {topUpModal.required}</p>
              </div>
              <div style={{ flex: 1, padding: '0.85rem', borderRadius: '10px', background: '#fef2f2', border: '1.5px solid #fecaca' }}>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>YOUR BALANCE</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c' }}>Rs. {topUpModal.available}</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="cl-btn cl-btn--ghost"
                onClick={() => setTopUpModal(null)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cl-btn cl-btn--primary"
                onClick={() => navigate('/client/wallet')}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Wallet size={16} /> Top Up Wallet
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
