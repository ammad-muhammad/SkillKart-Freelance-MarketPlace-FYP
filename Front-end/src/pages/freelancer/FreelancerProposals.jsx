import { useState, useEffect } from 'react';
import { proposalsAPI } from '../../api/proposals';
import { useAuth } from '../../hooks/useAuth';
import { 
  Briefcase, Clock, DollarSign, ExternalLink, 
  Trash2, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import './FreelancerDashboard.css';

export default function FreelancerProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
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
    if (!window.confirm('Are you sure you want to withdraw this proposal?')) return;
    try {
      await proposalsAPI.withdrawProposal(id);
      toast.success('Proposal withdrawn.');
      fetchProposals();
    } catch (error) {
      toast.error('Failed to withdraw proposal.');
    }
  };

  if (loading) return <div className="fl-loading">Loading your proposals...</div>;

  return (
    <div className="fl-proposals">
      <div className="fl-page-header">
        <h1 className="fl-page-title">My Proposals</h1>
        <p className="fl-page-sub">Track the status of your submitted project bids.</p>
      </div>

      {proposals.length === 0 ? (
        <div className="fl-empty-state">
          <div className="fl-empty-state__icon">📄</div>
          <h3>No Proposals Found</h3>
          <p>You haven't submitted any proposals yet. Explore projects to find work!</p>
          <a href="/browse-projects" className="fl-btn fl-btn--primary">Browse Projects</a>
        </div>
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
                <span className={`fl-badge fl-badge--${prop.status}`}>
                  {prop.status === 'pending' && '🕒 Pending'}
                  {prop.status === 'accepted' && '✅ Accepted'}
                  {prop.status === 'rejected' && '❌ Rejected'}
                  {prop.status === 'withdrawn' && '🏳️ Withdrawn'}
                </span>
              </div>

              <div className="fl-prop-card__body">
                <div className="fl-prop-card__details">
                  <div className="fl-prop-card__detail">
                    <DollarSign size={14} />
                    <span>Your Bid: <strong>${prop.proposedRate}</strong></span>
                  </div>
                  <div className="fl-prop-card__detail">
                    <Clock size={14} />
                    <span>Duration: <strong>{prop.estimatedDuration}</strong></span>
                  </div>
                </div>
                
                {prop.clientResponse && (
                  <div className="fl-prop-card__response">
                    <strong>Client Feedback:</strong>
                    <p>{prop.clientResponse}</p>
                  </div>
                )}
              </div>

              <div className="fl-prop-card__footer">
                <div className="fl-prop-card__btns">
                  <a href={`/jobs/${prop.jobId?._id}`} className="fl-btn fl-btn--ghost fl-btn--sm">
                    View Project <ExternalLink size={14} />
                  </a>
                  {prop.status === 'pending' && (
                    <button 
                      className="fl-btn fl-btn--outline fl-btn--sm" 
                      onClick={() => handleWithdraw(prop._id)}
                      style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .fl-prop-card { margin-bottom: 1rem; }
        .fl-prop-card__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
        .fl-prop-card__title { font-size: 1rem; font-weight: 700; color: var(--color-primary); }
        .fl-prop-card__meta { font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.2rem; }
        .fl-prop-card__details { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
        .fl-prop-card__detail { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--color-text-mid); }
        .fl-prop-card__response { background: #f8fafc; border: 1px solid #e5edf5; padding: 0.75rem 1rem; border-radius: 10px; margin-top: 1rem; }
        .fl-prop-card__response strong { display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-light); margin-bottom: 0.3rem; }
        .fl-prop-card__response p { font-size: 0.875rem; color: #475569; line-height: 1.5; }
        .fl-prop-card__footer { border-top: 1px solid #f1f5f9; padding-top: 1rem; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; }
        .fl-prop-card__btns { display: flex; gap: 0.75rem; }
      `}</style>
    </div>
  );
}
