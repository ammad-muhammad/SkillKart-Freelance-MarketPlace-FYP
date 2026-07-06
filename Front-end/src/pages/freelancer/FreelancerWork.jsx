import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, DollarSign, Wallet, UploadCloud, X, Clock, MessageSquare, Play, Square, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { contractsAPI } from '../../api/contracts';
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
      toast.success('Work delivered! The client will review it. 🚀');
      setDeliverFor(null);
      setDelivery({ message: '', links: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit delivery.');
    } finally {
      setDelivering(false);
    }
  };

  const handleTimer = async (contract, action) => {
    setTracking(prev => ({ ...prev, [contract._id]: true }));
    try {
      if (action === 'start') {
        await timeTrackingAPI.startTimer(contract._id);
        toast.success('Timer started');
      } else {
        await timeTrackingAPI.stopTimer(contract._id, { description: 'Working on ' + contract.jobId?.title });
        toast.success('Timer stopped and time logged');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} timer.`);
    } finally {
      setTracking(prev => ({ ...prev, [contract._id]: false }));
    }
  };

  if (loading) return <div className="fl-loading">Loading your work…</div>;

  return (
    <div className="fl-work">
      <div className="fl-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="fl-page-title">My Work</h1>
          <p className="fl-page-sub">Your active contracts, deliveries, and earnings.</p>
        </div>
        <Link to="/browse-projects" className="fl-btn fl-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🔍 Find Work
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
          <div className="fl-empty-state__icon">💼</div>
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
                      {isHourly ? '⏱️ Hourly Project' : '📋 Fixed Price Project'} · {c.jobId?.category || 'Unknown'}
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

                {isHourly && (
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {['completed', 'cancelled'].includes(c.status) ? (
                        <span style={{ color: '#64748b', fontWeight: 600 }}>⚪ Contract has ended</span>
                      ) : timerActive ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>
                          🟢 You are currently working 
                          <LiveTimer startedAt={c.timer?.startedAt} hourlyRate={c.hourlyRate} prefix=" (" suffix=")" />
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontWeight: 600 }}>⚪ You are not tracking time</span>
                      )}
                    </div>
                    <div style={{ color: 'var(--color-text-mid)' }}>
                      🕒 Total logged: <strong>{Math.floor((c.totalDuration || 0) / 3600000)}h {Math.floor(((c.totalDuration || 0) % 3600000) / 60000)}m</strong>
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
                  <div className="fl-contract__revision">🔁 Revision requested: {c.revisionNote}</div>
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
                    timerActive ? (
                      <button className="fl-btn fl-btn--sm" style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }} onClick={() => handleTimer(c, 'stop')} disabled={tracking[c._id]}>
                        <Square size={14} /> Stop Timer
                      </button>
                    ) : (
                      <button className="fl-btn fl-btn--primary fl-btn--sm" onClick={() => handleTimer(c, 'start')} disabled={tracking[c._id]}>
                        <Play size={14} /> Start Timer
                      </button>
                    )
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
