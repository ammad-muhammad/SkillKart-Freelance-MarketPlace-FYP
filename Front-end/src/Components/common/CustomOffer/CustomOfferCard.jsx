import { Package, Clock, RefreshCw, Tag } from 'lucide-react';
import Button from '../Button/Button';
import './CustomOffer.css';

const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`;

/**
 * Where an offer stands, combining its own status with its order's once it's
 * been accepted (the populated `jobId`). A still-'pending' offer past its
 * expiresAt reads as expired even before the hourly cleanup cron writes it.
 */
function offerState(offer) {
  if (!offer) return { key: 'missing', label: 'Offer unavailable', tone: 'neutral' };
  if (offer.status === 'pending') {
    if (new Date(offer.expiresAt) <= new Date()) return { key: 'expired', label: 'Expired', tone: 'neutral' };
    return { key: 'open', label: 'Awaiting response', tone: 'info' };
  }
  if (offer.status === 'accepted') {
    const job = offer.jobId && typeof offer.jobId === 'object' ? offer.jobId : null;
    if (job?.status === 'pending_payment') return { key: 'awaiting_payment', label: 'Accepted — awaiting deposit', tone: 'warning' };
    if (job?.status === 'cancelled') return { key: 'cancelled', label: 'Accepted — order cancelled', tone: 'neutral' };
    if (job?.status === 'completed') return { key: 'completed', label: 'Order completed', tone: 'success' };
    return { key: 'in_progress', label: 'Accepted — order in progress', tone: 'success' };
  }
  const labels = { declined: 'Declined', withdrawn: 'Withdrawn', expired: 'Expired' };
  return { key: offer.status, label: labels[offer.status] || offer.status, tone: 'neutral' };
}

const daysLeft = (expiresAt) => {
  const ms = new Date(expiresAt) - new Date();
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return d <= 1 ? 'less than a day' : plural(d, 'day');
};

/**
 * A custom-offer chat message, rendered as a card instead of a text bubble.
 * viewerRole 'client' gets Accept/Decline (and Pay deposit once accepted but
 * unpaid); 'freelancer' — the sender — gets Withdraw while it's still open.
 * The parent owns the actual API calls; `busy` disables everything meanwhile.
 */
export default function CustomOfferCard({ offer, viewerRole, busy = false, onAccept, onDecline, onWithdraw, onPay }) {
  const state = offerState(offer);
  if (!offer) {
    return <div className="co-card co-card--missing">This offer is no longer available.</div>;
  }

  const price = Number(offer.price) || 0;
  const jobId = offer.jobId?._id || offer.jobId;

  return (
    <div className={`co-card co-card--${state.key}`}>
      <div className="co-card__head">
        <span className="co-card__kicker"><Package size={14} /> Custom offer</span>
        <span className={`co-card__status co-card__status--${state.tone}`}>{state.label}</span>
      </div>

      <h4 className="co-card__title">{offer.title}</h4>
      {offer.gigId?.title && (
        <span className="co-card__gig"><Tag size={12} /> Based on: {offer.gigId.title}</span>
      )}
      <p className="co-card__desc">{offer.description}</p>

      <div className="co-card__meta">
        <span className="co-card__price">Rs. {price.toLocaleString()}</span>
        <span><Clock size={13} /> {plural(offer.deliveryDays, 'day')}</span>
        <span><RefreshCw size={13} /> {plural(offer.revisions ?? 0, 'revision')}</span>
      </div>

      {state.key === 'open' && (
        <p className="co-card__note">Expires in {daysLeft(offer.expiresAt)}. 50% is paid upfront into escrow, the rest on delivery.</p>
      )}

      {viewerRole === 'client' && state.key === 'open' && (
        <div className="co-card__actions">
          <Button size="sm" disabled={busy} onClick={() => onAccept?.(offer)}>Accept &amp; Pay 50%</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDecline?.(offer)}>Decline</Button>
        </div>
      )}
      {viewerRole === 'client' && state.key === 'awaiting_payment' && jobId && (
        <div className="co-card__actions">
          <Button size="sm" loading={busy} onClick={() => onPay?.(jobId)}>Pay Deposit (Rs. {(Math.round(price / 2 * 100) / 100).toLocaleString()})</Button>
        </div>
      )}
      {viewerRole === 'freelancer' && state.key === 'open' && (
        <div className="co-card__actions">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onWithdraw?.(offer)}>Withdraw offer</Button>
        </div>
      )}
    </div>
  );
}
