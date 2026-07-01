import { useState, useEffect, useCallback } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { paymentsAPI } from '../../api/payments';
import { Wallet, DollarSign, ArrowDownToLine, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import './FreelancerDashboard.css';

export default function FreelancerWallet() {
  const { profile, loading: profileLoading, refreshProfile } = useFreelancer();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [withdrawing, setWithdrawing] = useState(false);

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
    // Also refresh profile to ensure wallet stats are completely up to date
    if (refreshProfile) {
      refreshProfile();
    }
  }, [loadHistory, refreshProfile]);

  const walletBalance = profile?.walletBalance || 0;
  const totalEarned = profile?.totalEarnings || 0;
  
  // Calculate active escrow: deposit is paid, but final isn't released
  const activeEscrow = payments
    .filter(p => p.status === 'deposit_paid')
    .reduce((sum, p) => sum + (Number(p.depositAmount) || 0), 0);

  const handleWithdrawClick = () => {
    if (walletBalance <= 0) {
      toast.error('No funds available for withdrawal.');
      return;
    }
    setWithdrawAmount(walletBalance.toString());
    setWithdrawModal(true);
  };

  const executeWithdraw = async () => {
    setWithdrawing(true);
    try {
      await paymentsAPI.withdrawFunds(withdrawAmount, withdrawMethod);
      toast.success(`Successfully initiated withdrawal of Rs. ${withdrawAmount} via ${withdrawMethod === 'bank' ? 'Bank Transfer' : 'PayPal'}.`);
      setWithdrawModal(false);
      // Refresh profile so the wallet balance syncs
      if (refreshProfile) refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (profileLoading || loading) {
    return <div className="fl-loading">Loading your wallet…</div>;
  }

  return (
    <div className="fl-wallet-page">
      <div className="fl-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="fl-page-title">Earnings & Wallet</h1>
          <p className="fl-page-sub">Track your active escrow, review transaction history, and withdraw funds.</p>
        </div>
        <button 
          className="fl-btn fl-btn--primary" 
          onClick={handleWithdrawClick}
          disabled={withdrawing || walletBalance <= 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowDownToLine size={18} />
          {withdrawing ? 'Processing...' : 'Withdraw Funds'}
        </button>
      </div>

      <div className="fl-stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="fl-stat-card" style={{ background: 'var(--gradient-primary)', color: 'var(--color-white)', borderColor: 'transparent' }}>
          <div className="fl-stat-card__bg" style={{ opacity: 0.1 }}>
            <DollarSign size={100} />
          </div>
          <div className="fl-stat-card__icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--color-white)' }}>
            <DollarSign size={24} />
          </div>
          <div className="fl-stat-card__value" style={{ color: 'var(--color-white)' }}>Rs. {walletBalance.toLocaleString()}</div>
          <div className="fl-stat-card__label" style={{ color: 'rgba(255,255,255,0.8)' }}>Available for Withdrawal</div>
        </div>

        <div className="fl-stat-card">
          <div className="fl-stat-card__bg">
            <Wallet size={100} />
          </div>
          <div className="fl-stat-card__icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Wallet size={24} />
          </div>
          <div className="fl-stat-card__value">Rs. {activeEscrow.toLocaleString()}</div>
          <div className="fl-stat-card__label">Funds in Active Escrow</div>
        </div>
        <div className="fl-stat-card">
          <div className="fl-stat-card__bg">
            <CheckCircle2 size={100} />
          </div>
          <div className="fl-stat-card__icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="fl-stat-card__value">Rs. {totalEarned.toLocaleString()}</div>
          <div className="fl-stat-card__label">Total Lifetime Earnings</div>
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card__header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-secondary)' }}>
          <h2 className="fl-card__title">Transaction History</h2>
        </div>
        <div className="fl-card__body">
          {payments.length === 0 ? (
            <EmptyState 
              icon={DollarSign}
              title="No Transactions Yet"
              message="Your payment history will appear here once you complete jobs and receive funds."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-secondary)' }}>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Project</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Client</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Amount</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment._id} style={{ borderBottom: '1px solid var(--color-secondary)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-primary-dark)', fontSize: 'var(--fs-sm)' }}>
                        {payment.jobId?.title || 'Unknown Project'}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                        {payment.clientId?.firstName} {payment.clientId?.lastName}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-md)', color: '#10b981' }}>
                        +${payment.status === 'released' ? payment.freelancerPayout?.toLocaleString() : payment.totalAmount?.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {payment.status === 'released' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            <CheckCircle2 size={14} /> Released
                          </span>
                        ) : payment.status === 'deposit_paid' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            <Clock size={14} /> Escrow (50%)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' }}>{payment.status}</span>
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

      {/* Dummy Withdraw Modal */}
      {withdrawModal && (
        <div className="fl-modal-overlay" onClick={() => !withdrawing && setWithdrawModal(false)}>
          <div className="fl-modal" onClick={e => e.stopPropagation()}>
            <div className="fl-modal__header">
              <h3>Withdraw Funds</h3>
              <button className="fl-modal__close" onClick={() => !withdrawing && setWithdrawModal(false)} disabled={withdrawing}>&times;</button>
            </div>
            <div className="fl-modal__body">
              <div className="fl-form-group">
                <label className="fl-label">Amount (PKR)</label>
                <input
                  type="number"
                  className="fl-input"
                  min="5"
                  max={walletBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Available: ${walletBalance.toLocaleString()}</span>
              </div>
              <div className="fl-form-group">
                <label className="fl-label">Withdrawal Method</label>
                <select className="fl-input" value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)}>
                  <option value="bank">Bank Transfer (ACH)</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Crypto Wallet</option>
                </select>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '1rem' }}>
                Note: In this demo environment, withdrawals are simulated. In production, this would trigger a Stripe Connect or PayPal Payout payout to your connected account.
              </p>
            </div>
            <div className="fl-modal__footer">
              <button className="fl-btn fl-btn--ghost" onClick={() => setWithdrawModal(false)} disabled={withdrawing}>Cancel</button>
              <button 
                className="fl-btn fl-btn--primary" 
                disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > walletBalance || withdrawing}
                onClick={executeWithdraw}
              >
                {withdrawing ? 'Processing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
