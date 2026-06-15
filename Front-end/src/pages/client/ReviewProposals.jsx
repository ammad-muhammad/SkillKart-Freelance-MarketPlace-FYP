import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { proposalsAPI } from '../../api/proposals';
import { jobsAPI } from '../../api/jobs';
import { messagesAPI } from '../../api/messages';
import { useClient } from '../../context/ClientContext';
import { 
  User, CheckCircle2, XCircle, Clock, 
  DollarSign, MessageSquare, ChevronLeft,
  Mail, Star, ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
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

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    try {
      const [jobRes, propRes] = await Promise.all([
        jobsAPI.getJobById(jobId),
        proposalsAPI.listProposals({ jobId })
      ]);
      setJob(jobRes.data.data.job);
      setProposals(propRes.data.data.items || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load proposals.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    const message = prompt('Send a welcome message to the freelancer:');
    if (message === null) return;

    setProcessingId(id);
    try {
      await proposalsAPI.acceptProposal(id, message);
      toast.success('Proposal accepted! Freelancer notified.');
      await fetchProfile(); // Sync global state
      fetchData(); // Refresh local view
    } catch (error) {
      toast.error('Failed to accept proposal.');
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

  if (loading) return <div className="rp-loading">Loading proposals...</div>;

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
                    <span>Bid: <strong>${prop.proposedRate}</strong></span>
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
                        onClick={() => handleAccept(prop._id)}
                        disabled={!!processingId}
                      >
                        <CheckCircle2 size={18} /> Accept
                      </button>
                      <button 
                        className="rp-btn rp-btn--reject"
                        onClick={() => handleReject(prop._id)}
                        disabled={!!processingId}
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="rp-responded">
                      Responded on {new Date(prop.respondedAt).toLocaleDateString()}
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
    </div>
  );
}
