import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { paymentsAPI } from '../../api/payments';
import { Wallet, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import useFocusTrap from '../../hooks/useFocusTrap';
import './ClientDashboard.css';

// Human-readable labels for raw payment status enums (never show "deposit_pending").
const STATUS_LABELS = {
  deposit_pending: 'Awaiting deposit',
  deposit_paid: 'In escrow',
  released: 'Released',
  refunded: 'Refunded',
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
const statusLabel = (s) =>
  STATUS_LABELS[s] || String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ClientWallet() {
  const { profile, loading: profileLoading, showToast } = useClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositModal, setDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(profile?.walletBalance || 0);
  const depositConfirmed = useRef(false);
  const depositModalRef = useRef(null);
  const closeDepositModal = useCallback(() => { if (!depositing) setDepositModal(false); }, [depositing]);
  useFocusTrap(depositModalRef, depositModal, closeDepositModal);

  // Sync with context profile when it loads/updates
  useEffect(() => {
    if (profile && profile.walletBalance !== undefined) {
      setWalletBalance(profile.walletBalance);
    }
  }, [profile]);

  useEffect(() => {
    // Process Stripe session return if present
    const sessionId = searchParams.get('session_id');
    if (sessionId && !depositConfirmed.current) {
      depositConfirmed.current = true;
      setLoading(true);
      paymentsAPI.depositFunds(sessionId)
        .then(({ data }) => {
          setWalletBalance(data?.data?.walletBalance || 0);
          showToast('Wallet successfully funded!');
          navigate('/client/wallet', { replace: true });
        })
        .catch(err => {
          showToast('Failed to verify wallet deposit: ' + (err.response?.data?.message || err.message), 'error');
          navigate('/client/wallet', { replace: true });
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams, navigate, showToast]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentsAPI.getHistory();
      setPayments(data?.data?.payments || []);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Calculate active escrow: deposit is paid, but final isn't released
  const activeEscrow = payments
    .filter(p => p.status === 'deposit_paid')
    .reduce((sum, p) => sum + (Number(p.depositAmount) || 0), 0);

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return;
    setDepositing(true);
    try {
      const { data } = await paymentsAPI.startWalletDeposit(depositAmount);
      const url = data?.data?.checkoutUrl;
      if (url) {
        window.location.assign(url);
        return;
      }
      showToast('Failed to get checkout URL', 'error');
      setDepositing(false);
    } catch (err) {
      showToast('Failed to initiate checkout: ' + (err.response?.data?.message || err.message), 'error');
      setDepositing(false);
    }
  };

  if (profileLoading || loading) {
    return <div className="cl-loading-container"><div className="cl-loader" /></div>;
  }

  return (
    <div className="cl-wallet-page">
      <div className="cl-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="cl-page-title">Billing & Payments</h1>
          <p className="cl-page-sub">Manage your wallet, active escrow funds, and transaction history.</p>
        </div>
        <button
          className="cl-btn cl-btn--primary"
          onClick={() => setDepositModal(true)}
          disabled={depositing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowUpRight size={18} />
          {depositing ? 'Processing...' : 'Add Funds'}
        </button>
      </div>

      <div className="fl-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2rem' }}>
        <div className="cl-stat-card" style={{ background: 'var(--gradient-primary)', color: 'var(--color-white)', borderColor: 'transparent' }}>
          <div className="cl-stat-card__bg" style={{ opacity: 0.1 }}>
            <PkrIcon size={100} />
          </div>
          <div className="cl-stat-card__icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--color-white)' }}>
            <PkrIcon size={24} />
          </div>
          <div className="cl-stat-card__value" style={{ background: 'var(--color-white)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rs. {walletBalance.toLocaleString()}</div>
          <div className="cl-stat-card__label" style={{ color: 'rgba(255,255,255,0.8)' }}>Available Wallet Balance</div>
        </div>

        <div className="cl-stat-card">
          <div className="cl-stat-card__bg">
            <Wallet size={100} />
          </div>
          <div className="cl-stat-card__icon" style={{ background: 'var(--color-warning-tint)', color: 'var(--color-warning)' }}>
            <Wallet size={24} />
          </div>
          <div className="cl-stat-card__value">Rs. {activeEscrow.toLocaleString()}</div>
          <div className="cl-stat-card__label">Funds in Active Escrow</div>
        </div>
      </div>

      <div className="cl-card">
        <div className="cl-card__header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-secondary)' }}>
          <h2 className="cl-card__title">Transaction History</h2>
        </div>
        <div className="cl-card__body">
          {payments.length === 0 ? (
            <EmptyState
              icon={PkrIcon}
              title="No Transactions Yet"
              message="Your payment history will appear here once you deposit funds or pay freelancers."
              actionText="Add Funds"
              actionClick={() => setDepositModal(true)}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-secondary)' }}>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Project</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Freelancer</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Amount</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment._id} style={{ borderBottom: '1px solid var(--color-secondary)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--color-secondary)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-primary-dark)', fontSize: 'var(--fs-sm)' }}>
                        {payment.type === 'wallet_deposit' ? 'Wallet Deposit' : (payment.jobId?.title || 'Unknown Project')}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                        {payment.type === 'wallet_deposit' ? 'Self' : (payment.freelancerId ? `${payment.freelancerId.firstName} ${payment.freelancerId.lastName}` : 'N/A')}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-md)', color: payment.type === 'wallet_deposit' ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {payment.type === 'wallet_deposit' ? '+' : '-'}Rs. {payment.totalAmount?.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {payment.type === 'wallet_deposit' && payment.status === 'released' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-success)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-success-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            <CheckCircle2 size={14} /> Completed
                          </span>
                        ) : payment.status === 'released' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-success)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-success-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            <CheckCircle2 size={14} /> Paid in Full
                          </span>
                        ) : payment.status === 'deposit_paid' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-warning)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-warning-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            {/* Milestones lock 100% of the amount; only the legacy gig-order
                                flow (no milestoneId) is a true 50% deposit. */}
                            <Clock size={14} /> {payment.milestoneId ? 'Escrow Active' : 'Escrow Active (50%)'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', textTransform: 'capitalize' }}>{statusLabel(payment.status)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dummy Deposit Modal */}
      {depositModal && (
        <div className="cl-modal-overlay" onClick={closeDepositModal}>
          <div
            ref={depositModalRef}
            className="cl-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add Funds to Wallet"
            tabIndex={-1}
          >
            <div className="cl-modal__header">
              <h3>Add Funds to Wallet</h3>
              <button className="cl-modal__close" onClick={closeDepositModal} disabled={depositing} aria-label="Close">&times;</button>
            </div>
            <div className="cl-modal__body">
              <div className="cl-form-group">
                <label className="cl-label">Amount (PKR)</label>
                <input
                  type="number"
                  className="cl-input"
                  min="5"
                  placeholder="e.g. 100"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '1rem' }}>
                Note: You will be redirected to our secure Stripe Checkout to complete this transaction.
              </p>
            </div>
            <div className="cl-modal__footer">
              <button className="cl-btn cl-btn--ghost" onClick={closeDepositModal} disabled={depositing}>Cancel</button>
              <button
                className="cl-btn cl-btn--primary"
                disabled={!depositAmount || Number(depositAmount) < 5 || depositing}
                onClick={handleDeposit}
              >
                {depositing ? 'Redirecting...' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
