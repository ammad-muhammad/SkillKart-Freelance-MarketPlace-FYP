import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { proposalsAPI } from '../../api/proposals';
import { jobsAPI } from '../../api/jobs';
import { messagesAPI } from '../../api/messages';
import { paymentsAPI } from '../../api/payments';
import { useClient } from '../../context/ClientContext';
import { 
  User, CheckCircle2, XCircle, Clock, 
  DollarSign, MessageSquare, ChevronLeft,
  Mail, Star, ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import Skeleton from '../../Components/common/Skeleton/Skeleton';
import Modal from '../freelancer/components/Modal';
import './ReviewProposals.css';

export default function ReviewProposals() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { fetchProfile } = useClient();
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [messagingId, setMessagingId] = useState(null);
  const [welcomeModal, setWelcomeModal] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  const handleMessage = async (prop) => {
    const freelancerId = prop.freelancerId?._id;
    if (!freelancerId) return;
    setMessagingId(prop._id);
    try {
      await messagesAPI.startConversation(
        freelancerId,
        `Hi! I'd like to discuss your proposal for "${job?.title || 'my project'}".`
      );
      navigate('/client/messages');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Could not start the conversation. Please try again.');
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
      toast.error('Failed to load proposals.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptClick = (id) => {
    setWelcomeModal(id);
    setWelcomeMessage("Hi! I'm thrilled to accept your proposal and look forward to working with you on this project. Let's get started!");
  };

  const confirmAccept = async () => {
    if (!welcomeModal) return;
    const id = welcomeModal;
    const message = welcomeMessage.trim();
    
    setWelcomeModal(null);
    setProcessingId(id);
    setJob(prev => prev ? { ...prev, status: 'in_progress' } : prev);
    
    try {
      await proposalsAPI.acceptProposal(id, message);
      toast.success('Proposal accepted! Now fund the 50% deposit to start the work.');
      await fetchProfile(); // Sync global state

      // Escrow: take the client straight to the 50% deposit checkout. Work can't
      // be delivered until the deposit is funded.
      try {
        const { data } = await paymentsAPI.startDeposit(jobId);
        if (data?.data?.walletPaid) {
          toast.success('50% deposit funded successfully from your wallet balance! Work can begin. 🚀');
          await fetchProfile(); // Sync global state
          navigate('/client/projects');
          return;
        }
        const url = data?.data?.checkoutUrl;
        if (url) {
          window.location.assign(url);
          return;
        }
      } catch (payErr) {
        toast.info(payErr.response?.data?.message || 'You can pay the 50% deposit from My Projects.');
      }
      fetchData(); // Refresh local view if we didn't redirect
    } catch (error) {
      toast.error('Failed to accept proposal.');
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
      toast.success('Proposal rejected.');
      await fetchProfile(); // Sync global state
      fetchData(); // Refresh local view
    } catch (error) {
      toast.error('Failed to reject proposal.');
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
          <div className="rp-empty__icon">📭</div>
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
                    <DollarSign size={16} />
                    <span>Bid: <strong>Rs. {prop.proposedRate}</strong></span>
                  </div>
                  <div className="rp-detail">
                    <Clock size={16} />
                    <span>Duration: <strong>{prop.estimatedDuration}</strong></span>
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
                disabled={processingId}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                {processingId ? 'Accepting...' : 'Confirm & Accept'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
