import Loader from '../../Components/common/Loader/Loader';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, DollarSign, Wallet, UploadCloud, X, Clock, MessageSquare, Play, Square, FileText, Search, AlertTriangle, StopCircle, Circle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { contractsAPI } from '../../api/contracts';
import { useAuth } from '../../hooks/useAuth';
import Modal from './components/Modal';
import { deliveriesAPI } from '../../api/deliveries';
import { timeTrackingAPI } from '../../api/timeTracking';
import LiveTimer from '../../Components/common/LiveTimer/LiveTimer';
import './FreelancerDashboard.css';

const STAGES = {
  'active': { label: 'In Progress', color: '#2563eb' },
  'in-progress': { label: 'In Progress', color: '#2563eb' },
  'in_revision': { label: 'In Revision', color: '#b45309' },
  delivered: { label: 'Delivered — awaiting review', color: '#d97706' },
  completed: { label: 'Completed', color: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#64748b' },
};

// Escrow status → freelancer-facing label.
const ESCROW = {
  deposit_pending: { label: 'Awaiting deposit', color: '#b45309' },
  deposit_paid: { label: 'Deposit funded', color: '#2563eb' },
  released: { label: 'Paid in full', color: '#16a34a' },
  refunded: { label: 'Refunded', color: '#64748b' },
};

export default function FreelancerWork() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliverFor, setDeliverFor] = useState(null);
  const [delivery, setDelivery] = useState({ message: '', links: '' });
  const [delivering, setDelivering] = useState(false);
  const [tracking, setTracking] = useState({}); // state for tracking operations
  const [endRequestModal, setEndRequestModal] = useState(null); // contractId
  const [endReason, setEndReason] = useState('Work completed');
  const [endDetails, setEndDetails] = useState('');
  const [disputeModal, setDisputeModal] = useState(null); // contractId
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await contractsAPI.getMyContracts({ limit: 50 });
      setContracts(Array.isArray(data?.data) ? data.data : []);
    } catch { /* global toast */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Earnings summary from completed contracts.
  const totalEarned = contracts
    .filter((c) => c.status === 'completed' && c.payment?.status === 'released')
    .reduce((sum, c) => sum + (Number(c.payment?.freelancerPayout) || 0), 0);
  const activeCount = contracts.filter((c) => ['active', 'in-progress', 'delivered'].includes(c.status)).length;

  const submitDelivery = async () => {
    if (!deliverFor) return;
    if (!delivery.message.trim() && !delivery.links.trim()) {
      toast.warn('Add a delivery note or at least one link.');
      return;
    }
    setDelivering(true);
    try {
      const externalLinks = delivery.links.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      await deliveriesAPI.submitDelivery(deliverFor._id, { message: delivery.message.trim(), externalLinks });
      toast.success('Work delivered! The client will review it.');
      setDeliverFor(null);
      setDelivery({ message: '', links: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit delivery.');
    } finally {
      setDelivering(false);
    }
  };

  const toggleTimer = async (contractId, isActive) => {
    try {
      setTracking(prev => ({ ...prev, [contractId]: true }));
      if (isActive) {
        await timeTrackingAPI.stopTimer(contractId);
        toast.success('Timer stopped successfully');
      } else {
        await timeTrackingAPI.startTimer(contractId);
        toast.success('Timer started successfully');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle timer');
    } finally {
      setTracking(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleRequestEnd = async (e) => {
    e.preventDefault();
    if (!endReason || (endReason === 'Other' && !endDetails.trim())) return;
    try {
      setDelivering(true);
      await contractsAPI.requestEnd(endRequestModal.contractId, endReason, endDetails);
      toast.success('End request sent');
      setEndRequestModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setDelivering(false);
    }
  };

  const handleRespondEnd = async (contractId, action) => {
    try {
      setDelivering(true);
      await contractsAPI.respondEnd(contractId, action);
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    } finally {
      setDelivering(false);
    }
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    try {
      setDelivering(true);
      await contractsAPI.raiseDispute(disputeModal.contractId, disputeReason, disputeDesc);
      toast.success('Dispute raised successfully');
      setDisputeModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute');
    } finally {
      setDelivering(false);
    }
  };

  if (loading) return <Loader text="Loading your work..." fullScreen={true} />;

  return (
    <div className="fl-work">
      <div className="fl-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="fl-page-title">My Work</h1>
          <p className="fl-page-sub">Your active contracts, deliveries, and earnings.</p>
        </div>
        <Link to="/browse-projects" className="fl-btn fl-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Search size={14} style={{ marginRight: '4px' }} /> Find Work
        </Link>
      </div>

      {/* Earnings summary */}
      <div className="fl-stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="fl-stat-card" style={{ background: 'var(--gradient-primary)', color: 'var(--color-white)', borderColor: 'transparent' }}>
          <div className="fl-stat-card__bg" style={{ opacity: 0.1 }}><Wallet size={100} /></div>
          <div className="fl-stat-card__icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--color-white)' }}><Wallet size={24} /></div>
          <div className="fl-stat-card__value" style={{ background: '#ffffff', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rs. {totalEarned.toLocaleString()}</div>
          <div className="fl-stat-card__label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total earned from completed contracts</div>
        </div>
        <div className="fl-stat-card">
          <div className="fl-stat-card__bg"><Briefcase size={100} /></div>
          <div className="fl-stat-card__icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Briefcase size={24} /></div>
          <div className="fl-stat-card__value">{activeCount}</div>
          <div className="fl-stat-card__label">Active contracts in progress</div>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="fl-empty-state">
          <div className="fl-empty-state__icon"><Briefcase size={48} style={{ color: 'var(--color-primary)' }} /></div>
          <h3>No contracts yet</h3>
          <p>When a client hires you (via a proposal or a gig order), your work will appear here.</p>
          <Link to="/browse-projects" className="fl-btn fl-btn--primary">Browse Projects</Link>
        </div>
      ) : (
        <div className="fl-card-list">
          {contracts.map((c) => {
            const stage = STAGES[c.status] || { label: c.status, color: '#64748b' };
            const escrow = c.payment ? ESCROW[c.payment.status] : null;
            
            const isFixed = c.type === 'fixed';
            const isHourly = c.type === 'hourly';
            
            const canDeliver = ['active', 'in-progress', 'in_revision'].includes(c.status);
            const waitingDeposit = isFixed && ['active', 'in-progress'].includes(c.status) && (!c.payment || c.payment.status === 'deposit_pending');
            
            const timerActive = isHourly && c.timer?.isActive;

            return (
              <div key={c._id} className="fl-card fl-contract">
                <div className="fl-contract__top">
                  <div>
                    <h3 className="fl-contract__title">{c.jobId?.title || 'Unknown Job'}</h3>
                    <p className="fl-contract__meta">
                      {isHourly ? <span style={{ display: 'inline-flex', alignItems: 'center' }}><Clock size={14} style={{ marginRight: '4px' }} /> Hourly Project</span> : <span style={{ display: 'inline-flex', alignItems: 'center' }}><FileText size={14} style={{ marginRight: '4px' }} /> Fixed Price Project</span>} · {c.jobId?.category || 'Unknown'}
                      {c.clientId && ` · ${c.clientId.firstName || ''} ${c.clientId.lastName || ''}`}
                    </p>
                  </div>
                  <span className="fl-contract__stage" style={{ color: stage.color }}>{stage.label}</span>
                </div>

                <div className="fl-contract__money">
                  {isFixed ? (
                    <span><DollarSign size={14} /> Agreed: <strong>Rs. {c.fixedPrice ?? '—'}</strong></span>
                  ) : (
                    <span><DollarSign size={14} /> Rate: <strong>Rs. {c.hourlyRate ?? '—'} / hr</strong> (Max {c.weeklyHourLimit} hrs/wk)</span>
                  )}
                  {isFixed && escrow && <span className="fl-contract__escrow" style={{ color: escrow.color }}>● {escrow.label}</span>}
                  {isFixed && c.payment?.status === 'released' && (
                    <span style={{ color: '#16a34a' }}>You received: <strong>Rs. {Number(c.payment.freelancerPayout).toLocaleString()}</strong></span>
                  )}
                </div>

                {/* Pending Banners */}
                {isHourly && c.dispute && c.dispute.status === 'pending' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} style={{ marginRight: '8px' }} /> Contract under Dispute
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                      This contract has been escalated to Admin review. Reason: {c.dispute.reason}.
                    </p>
                  </div>
                )}

                {isHourly && c.endRequest && c.endRequest.status === 'pending' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    {String(c.endRequest.requestedBy) === String(user?._id) ? (
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534', display: 'flex', alignItems: 'center' }}>
                        <Clock size={14} style={{ marginRight: '4px' }} /> Waiting for the client to approve your request to end this contract.
                      </p>
                    ) : (
                      <>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', display: 'flex', alignItems: 'center' }}>
                          <StopCircle size={18} style={{ marginRight: '8px' }} /> Client has requested to end this contract
                        </h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#15803d' }}>
                          Reason: {c.endRequest.reason} 
                          {c.endRequest.additionalDetails && <span> - {c.endRequest.additionalDetails}</span>}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button className="fl-btn fl-btn--sm" style={{ background: '#16a34a', color: '#fff' }} onClick={() => handleRespondEnd(c._id, 'approve')} disabled={delivering}>
                            Approve & End Contract
                          </button>
                          <button className="fl-btn fl-btn--sm fl-btn--ghost" onClick={() => handleRespondEnd(c._id, 'reject')} disabled={delivering}>
                            Reject Request
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isHourly && (
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {['completed', 'cancelled'].includes(c.status) ? (
                        <span style={{ color: '#64748b', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}><Circle size={14} style={{ marginRight: '4px' }} /> Contract has ended</span>
                      ) : timerActive ? (
                        <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                          <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> You are currently working 
                          <LiveTimer startedAt={c.timer?.startedAt} hourlyRate={c.hourlyRate} prefix=" (" suffix=")" />
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}><Circle size={14} style={{ marginRight: '4px' }} /> You are not tracking time</span>
                      )}
                    </div>
                    <div style={{ color: 'var(--color-text-mid)' }}>
                      <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Total logged: <strong>{Math.floor((c.totalDuration || 0) / 3600000)}h {Math.floor(((c.totalDuration || 0) % 3600000) / 60000)}m</strong>
                      {c.hourlyRate > 0 && <span style={{ marginLeft: '0.4rem', color: '#059669', fontSize: '0.9em' }}>(Rs. {(((c.totalDuration || 0) / 3600000) * c.hourlyRate).toFixed(2)})</span>}
                      {c.lastTimeLog && (
                        <span style={{ marginLeft: '0.5rem', paddingLeft: '0.5rem', borderLeft: '1px solid #cbd5e1' }}>
                          Last session: <strong>{Math.floor(c.lastTimeLog.duration / 3600000)}h {Math.floor((c.lastTimeLog.duration % 3600000) / 60000)}m</strong> 
                          {c.hourlyRate > 0 && <span style={{ marginLeft: '0.4rem', color: '#059669', fontSize: '0.9em' }}>(Rs. {((c.lastTimeLog.duration / 3600000) * c.hourlyRate).toFixed(2)})</span>}
                          {' '}({new Date(c.lastTimeLog.endTime).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {c.revisionNote && c.status === 'in_revision' && (
                  <div className="fl-contract__revision"><RefreshCw size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Revision requested: {c.revisionNote}</div>
                )}

                <div className="fl-contract__footer">
                  <Link to={`/jobs/${c.jobId?._id}`} className="fl-btn fl-btn--ghost fl-btn--sm">View details</Link>
                  {c.clientId && (
                    <Link to="/freelancer/messages" className="fl-btn fl-btn--outline fl-btn--sm">
                      <MessageSquare size={14} /> Contact Client
                    </Link>
                  )}
                  {waitingDeposit && (
                    <span className="fl-contract__hint"><Clock size={14} /> Waiting for client to fund the deposit</span>
                  )}
                  {canDeliver && (
                    <button className="fl-btn fl-btn--primary fl-btn--sm" onClick={() => { setDeliverFor(c); setDelivery({ message: '', links: '' }); }}>
                      <UploadCloud size={14} /> Submit Work
                    </button>
                  )}
                  {isHourly && !['completed', 'cancelled', 'pending_cancellation', 'under_review'].includes(c.status) && (
                    <>
                      {timerActive ? (
                        <button className="fl-btn fl-btn--sm" style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }} onClick={() => toggleTimer(c._id, true)} disabled={tracking[c._id]}>
                          <Square size={14} /> Stop Timer
                        </button>
                      ) : (
                        <button className="fl-btn fl-btn--primary fl-btn--sm" onClick={() => toggleTimer(c._id, false)} disabled={tracking[c._id]}>
                          <Play size={14} /> Start Timer
                        </button>
                      )}
                      
                      {c.endRequest?.status !== 'pending' && c.dispute?.status !== 'pending' && (
                        <>
                          <button 
                            className="fl-btn fl-btn--sm fl-btn--ghost" 
                            style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setEndRequestModal({ contractId: c._id })}
                          >
                            <StopCircle size={14} /> End Contract
                          </button>
                          <button 
                            className="fl-btn fl-btn--sm fl-btn--ghost" 
                            style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setDisputeModal({ contractId: c._id })}
                          >
                            <AlertTriangle size={14} /> Dispute
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delivery modal */}
      {deliverFor && (
        <div className="fl-deliver-overlay" onClick={() => !delivering && setDeliverFor(null)}>
          <div className="fl-deliver-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fl-deliver-modal__head">
              <h3>Submit Work — {deliverFor.title}</h3>
              <button onClick={() => !delivering && setDeliverFor(null)}><X size={18} /></button>
            </div>
            <div className="fl-deliver-modal__body">
              <label className="fl-label">Delivery note</label>
              <textarea className="fl-textarea" rows={4} placeholder="Describe what you delivered…"
                value={delivery.message} onChange={(e) => setDelivery((d) => ({ ...d, message: e.target.value }))} />
              <label className="fl-label" style={{ marginTop: '0.75rem' }}>Links (one per line or comma-separated)</label>
              <textarea className="fl-textarea" rows={3} placeholder={"https://github.com/...\nhttps://drive.google.com/..."}
                value={delivery.links} onChange={(e) => setDelivery(d => ({ ...d, links: e.target.value }))}></textarea>
            </div>
            <div className="fl-deliver-modal__foot">
              <button className="fl-btn fl-btn--ghost" onClick={() => setDeliverFor(null)} disabled={delivering}>Cancel</button>
              <button className="fl-btn fl-btn--primary" onClick={submitDelivery} disabled={delivering}>
                {delivering ? 'Submitting…' : 'Deliver Work'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Request Modal */}
      <Modal open={!!endRequestModal} title="End Hourly Contract" onClose={() => setEndRequestModal(null)}>
        <p style={{ marginBottom: '1rem', color: '#64748b' }}>
          This will send a request to the client to mutually end this hourly contract.
        </p>
        <form onSubmit={handleRequestEnd}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="fl-label">Reason for ending</label>
            <select className="fl-input" value={endReason} onChange={e => setEndReason(e.target.value)} required>
              <option value="Work completed">Work completed</option>
              <option value="Mutual agreement">Mutual agreement</option>
              <option value="Client no longer requires work">Client no longer requires work</option>
              <option value="Freelancer unavailable">Freelancer unavailable</option>
              <option value="Communication issues">Communication issues</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {endReason === 'Other' && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="fl-label">Additional Details</label>
              <textarea 
                className="fl-input" 
                rows="3" 
                value={endDetails} 
                onChange={e => setEndDetails(e.target.value)}
                placeholder="Please explain..."
                required
              />
            </div>
          )}
          <div className="fl-actions">
            <button type="submit" className="fl-btn fl-btn--primary" disabled={delivering}>Send Request</button>
            <button type="button" className="fl-btn fl-btn--ghost" onClick={() => setEndRequestModal(null)} disabled={delivering}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Dispute Modal */}
      <Modal open={!!disputeModal} title="Raise Dispute (Force End)" onClose={() => setDisputeModal(null)}>
        <p style={{ marginBottom: '1rem', color: '#64748b' }}>
          If you and the client cannot agree, you can raise a dispute. The contract will be locked, and our Admin will review the case.
        </p>
        <form onSubmit={handleRaiseDispute}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="fl-label">Dispute Reason</label>
            <input 
              className="fl-input" 
              type="text" 
              value={disputeReason} 
              onChange={e => setDisputeReason(e.target.value)} 
              placeholder="e.g. Client is unresponsive"
              required 
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="fl-label">Description (Optional)</label>
            <textarea 
              className="fl-input" 
              rows="3" 
              value={disputeDesc} 
              onChange={e => setDisputeDesc(e.target.value)}
              placeholder="Provide more details for the admin..."
            />
          </div>
          <div className="fl-actions">
            <button type="submit" className="fl-btn fl-btn--danger" disabled={delivering}>Raise Dispute</button>
            <button type="button" className="fl-btn fl-btn--ghost" onClick={() => setDisputeModal(null)} disabled={delivering}>Cancel</button>
          </div>
        </form>
      </Modal>

      <style>{`
        .fl-contract { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem; padding: var(--space-5); }
        .fl-contract__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .fl-contract__title { font-size: var(--fs-md); font-weight: var(--fw-bold); color: var(--color-primary-dark); }
        .fl-contract__meta { font-size: var(--fs-sm); color: var(--color-text-mid); margin-top: var(--space-1); }
        .fl-contract__stage { font-weight: var(--fw-bold); font-size: var(--fs-sm); padding: 0.25rem 0.6rem; border-radius: var(--radius-full); background: rgba(0,0,0,0.03); }
        .fl-contract__money { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: var(--fs-sm); color: var(--color-text-mid); align-items: center; background: var(--color-secondary); padding: 0.8rem 1rem; border-radius: var(--radius-md); }
        .fl-contract__money span { display: inline-flex; align-items: center; gap: 0.4rem; }
        .fl-contract__escrow { font-weight: var(--fw-bold); }
        .fl-contract__revision { font-size: var(--fs-sm); color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 0.75rem 1rem; }
        .fl-contract__footer { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--color-secondary); padding-top: 1rem; }
        .fl-contract__hint { font-size: var(--fs-sm); color: #b45309; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: var(--fw-medium); }
        
        .fl-deliver-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: flex; align-items: center; justify-content: center; z-index: 4000; padding: 1rem; }
        .fl-deliver-modal { background: var(--color-bg); width: 100%; max-width: 600px; border-radius: var(--radius-xl); overflow: hidden; box-shadow: 0 24px 60px rgba(4,46,76,0.3); }
        .fl-deliver-modal__head { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid var(--color-secondary); }
        .fl-deliver-modal__head h3 { font-size: var(--fs-md); font-weight: var(--fw-bold); color: var(--color-primary-dark); }
        .fl-deliver-modal__head button { background: none; border: none; cursor: pointer; color: var(--color-text-light); transition: color 0.2s; }
        .fl-deliver-modal__head button:hover { color: var(--color-primary); }
        .fl-deliver-modal__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .fl-deliver-modal__foot { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.5rem; border-top: 1px solid var(--color-secondary); background: #f8fafc; }
      `}</style>
    </div>
  );
}
