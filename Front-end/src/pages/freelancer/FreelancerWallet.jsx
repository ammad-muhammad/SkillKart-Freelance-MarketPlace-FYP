import { useState, useEffect, useCallback } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { paymentsAPI } from '../../api/payments';
import { Wallet, DollarSign, ArrowDownToLine, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import './FreelancerDashboard.css';

export default function FreelancerWallet() {
  const { profile, loading: profileLoading } = useFreelancer();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [withdrawing, setWithdrawing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(profile?.walletBalance || 0);

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
      const { data } = await paymentsAPI.withdrawFunds(withdrawAmount, withdrawMethod);
      setWalletBalance(data?.data?.walletBalance || 0);
      toast.success(`Successfully initiated withdrawal of $${withdrawAmount} via ${withdrawMethod === 'bank' ? 'Bank Transfer' : 'PayPal'}.`);
      setWithdrawModal(false);
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

      <div className="fl-work-stats" style={{ marginBottom: '2rem' }}>
        <div className="fl-stat-card">
          <div className="fl-stat-card__icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <DollarSign size={24} />
          </div>
          <div className="fl-stat-card__value">${walletBalance.toLocaleString()}</div>
          <div className="fl-stat-card__label">Available for Withdrawal</div>
        </div>
        <div className="fl-work-stat">
          <div style={{ color: '#d97706' }}><Wallet size={24} /></div>
          <div>
            <strong>${activeEscrow.toLocaleString()}</strong>
            <span>Funds in Active Escrow</span>
          </div>
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card__header">
          <h2 className="fl-card__title">Transaction History</h2>
        </div>
        <div className="fl-card__body" style={{ padding: '0' }}>
          {payments.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
              No transactions found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Project</th>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Client</th>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Amount</th>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', color: '#64748b' }}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>
                        {payment.jobId?.title || 'Unknown Project'}
                      </td>
                      <td style={{ padding: '1rem', color: '#475569' }}>
                        {payment.clientId?.firstName} {payment.clientId?.lastName}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>
                        ${payment.status === 'released' ? payment.freelancerPayout?.toLocaleString() : payment.totalAmount?.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {payment.status === 'released' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontSize: '0.875rem' }}>
                            <CheckCircle2 size={16} /> Funds Released
                          </span>
                        ) : payment.status === 'deposit_paid' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#d97706', fontSize: '0.875rem' }}>
                            <Clock size={16} /> In Escrow (50%)
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{payment.status}</span>
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
                <label className="fl-label">Amount (USD)</label>
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
