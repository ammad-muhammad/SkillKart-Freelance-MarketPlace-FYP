import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, DollarSign, Wallet, UploadCloud, X, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import { jobsAPI } from '../../api/jobs';
import './FreelancerDashboard.css';

const STAGES = {
  'in-progress': { label: 'In Progress', color: '#2563eb' },
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await jobsAPI.getMyContracts({ limit: 50 });
      setContracts(Array.isArray(data?.data) ? data.data : []);
    } catch { /* global toast */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Earnings summary from completed contracts.
  const totalEarned = contracts
    .filter((c) => c.status === 'completed' && c.payment?.status === 'released')
    .reduce((sum, c) => sum + (Number(c.payment?.freelancerPayout) || 0), 0);
  const activeCount = contracts.filter((c) => ['in-progress', 'delivered'].includes(c.status)).length;

  const submitDelivery = async () => {
    if (!deliverFor) return;
    if (!delivery.message.trim() && !delivery.links.trim()) {
      toast.warn('Add a delivery note or at least one link.');
      return;
    }
    setDelivering(true);
    try {
      const links = delivery.links.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      await jobsAPI.submitDelivery(deliverFor._id, { message: delivery.message.trim(), links });
      toast.success('Work delivered! The client will review it. 🚀');
      setDeliverFor(null);
      setDelivery({ message: '', links: '' });
      load();
    } catch (err) {
      if (!err.response) toast.error('Failed to submit delivery.');
    } finally {
      setDelivering(false);
    }
  };

  if (loading) return <div className="fl-loading">Loading your work…</div>;

  return (
    <div className="fl-work">
      <div className="fl-page-header">
        <h1 className="fl-page-title">My Work</h1>
        <p className="fl-page-sub">Your active contracts, deliveries, and earnings.</p>
      </div>

      {/* Earnings summary */}
      <div className="fl-work-stats">
        <div className="fl-work-stat">
          <Wallet size={20} />
          <div>
            <strong>${totalEarned.toLocaleString()}</strong>
            <span>Total earned</span>
          </div>
        </div>
        <div className="fl-work-stat">
          <Briefcase size={20} />
          <div>
            <strong>{activeCount}</strong>
            <span>Active contracts</span>
          </div>
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
            const canDeliver = c.status === 'in-progress' && c.payment?.status === 'deposit_paid';
            const waitingDeposit = c.status === 'in-progress' && (!c.payment || c.payment.status === 'deposit_pending');
            return (
              <div key={c._id} className="fl-card fl-contract">
                <div className="fl-contract__top">
                  <div>
                    <h3 className="fl-contract__title">{c.title}</h3>
                    <p className="fl-contract__meta">
                      {c.source === 'gig' ? '🛍️ Gig order' : '📋 Project'} · {c.category}
                      {c.clientId && ` · ${c.clientId.firstName || ''} ${c.clientId.lastName || ''}`}
                    </p>
                  </div>
                  <span className="fl-contract__stage" style={{ color: stage.color }}>{stage.label}</span>
                </div>

                <div className="fl-contract__money">
                  <span><DollarSign size={14} /> Agreed: <strong>${c.budget?.min ?? c.budget?.max ?? '—'}</strong></span>
                  {escrow && <span className="fl-contract__escrow" style={{ color: escrow.color }}>● {escrow.label}</span>}
                  {c.payment?.status === 'released' && (
                    <span style={{ color: '#16a34a' }}>You received: <strong>${Number(c.payment.freelancerPayout).toLocaleString()}</strong></span>
                  )}
                </div>

                {c.revisionNote && c.status === 'in-progress' && (
                  <div className="fl-contract__revision">🔁 Revision requested: {c.revisionNote}</div>
                )}

                <div className="fl-contract__footer">
                  <Link to={`/jobs/${c._id}`} className="fl-btn fl-btn--ghost fl-btn--sm">View details</Link>
                  {waitingDeposit && (
                    <span className="fl-contract__hint"><Clock size={14} /> Waiting for client to fund the deposit</span>
                  )}
                  {canDeliver && (
                    <button className="fl-btn fl-btn--primary fl-btn--sm" onClick={() => { setDeliverFor(c); setDelivery({ message: '', links: '' }); }}>
                      <UploadCloud size={14} /> Submit Work
                    </button>
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
        .fl-work-stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .fl-work-stat { display: flex; align-items: center; gap: 0.85rem; background: #fff; border: 1px solid #eef2f7; border-radius: 14px; padding: 1rem 1.25rem; min-width: 200px; color: var(--color-primary); }
        .fl-work-stat strong { display: block; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
        .fl-work-stat span { font-size: 0.8rem; color: #64748b; }
        .fl-contract { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.7rem; }
        .fl-contract__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .fl-contract__title { font-size: 1rem; font-weight: 700; color: var(--color-primary); }
        .fl-contract__meta { font-size: 0.8rem; color: var(--color-text-light); margin-top: 0.2rem; }
        .fl-contract__stage { font-weight: 700; font-size: 0.85rem; }
        .fl-contract__money { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--color-text-mid); align-items: center; }
        .fl-contract__money span { display: inline-flex; align-items: center; gap: 0.3rem; }
        .fl-contract__escrow { font-weight: 700; }
        .fl-contract__revision { font-size: 0.82rem; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.5rem 0.7rem; }
        .fl-contract__footer { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; border-top: 1px solid #f1f5f9; padding-top: 0.75rem; }
        .fl-contract__hint { font-size: 0.8rem; color: #b45309; display: inline-flex; align-items: center; gap: 0.3rem; }
        .fl-deliver-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: flex; align-items: center; justify-content: center; z-index: 4000; padding: 1rem; }
        .fl-deliver-modal { background: #fff; width: 100%; max-width: 520px; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(4,46,76,0.3); }
        .fl-deliver-modal__head { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #eef2f7; }
        .fl-deliver-modal__head h3 { font-size: 1rem; font-weight: 700; color: var(--color-primary); }
        .fl-deliver-modal__head button { background: none; border: none; cursor: pointer; color: #64748b; }
        .fl-deliver-modal__body { padding: 1.25rem; }
        .fl-deliver-modal__foot { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.25rem; border-top: 1px solid #eef2f7; }
      `}</style>
    </div>
  );
}
