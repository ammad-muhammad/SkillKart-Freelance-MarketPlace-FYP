import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { paymentsAPI } from '../../api/payments';
import { Wallet, DollarSign, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import './ClientDashboard.css';

export default function ClientWallet() {
  const { profile, loading: profileLoading } = useClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositModal, setDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(profile?.walletBalance || 0);
  const depositConfirmed = useRef(false);

  // Sync with context profile when it loads/updates
  useEffect(() => {
    if (profile && profile.walletBalance !== undefined) {
      setWalletBalance(profile.walletBalance);
    }
  }, [profile?.walletBalance]);

  useEffect(() => {
    // Process Stripe session return if present
    const sessionId = searchParams.get('session_id');
    if (sessionId && !depositConfirmed.current) {
      depositConfirmed.current = true;
      setLoading(true);
      paymentsAPI.depositFunds(sessionId)
        .then(({ data }) => {
          setWalletBalance(data?.data?.walletBalance || 0);
          alert('Wallet successfully funded!');
          navigate('/client/wallet', { replace: true });
        })
        .catch(err => {
          alert('Failed to verify wallet deposit: ' + (err.response?.data?.message || err.message));
          navigate('/client/wallet', { replace: true });
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams, navigate]);

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

  const totalSpent = profile?.stats?.totalSpent || profile?.totalSpent || 0;
  
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
      alert('Failed to get checkout URL');
      setDepositing(false);
    } catch (err) {
      alert('Failed to initiate checkout: ' + (err.response?.data?.message || err.message));
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
        <button className="cl-btn cl-btn--primary" onClick={() => setDepositModal(true)}>
          + Add Funds
        </button>
      </div>

      <div className="cl-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2rem' }}>
        <div className="cl-stat-card">
          <div className="cl-stat-card__icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Wallet size={24} />
          </div>
          <div className="cl-stat-card__value">${walletBalance.toLocaleString()}</div>
          <div className="cl-stat-card__label">Available Wallet Balance</div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-card__icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Wallet size={24} />
          </div>
          <div className="cl-stat-card__value">${activeEscrow.toLocaleString()}</div>
          <div className="cl-stat-card__label">Funds in Active Escrow</div>
        </div>
      </div>

      <div className="cl-card">
        <div className="cl-card__header">
          <h2 className="cl-card__title">Transaction History</h2>
        </div>
        <div className="cl-card__body" style={{ padding: payments.length === 0 ? '2rem' : '0' }}>
          {payments.length === 0 ? (
            <EmptyState 
              icon={DollarSign}
              title="No Transactions Yet"
              message="Your payment history will appear here once you deposit funds or pay freelancers."
              actionText="Add Funds"
              actionClick={() => setDepositModal(true)}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Project</th>
                    <th style={{ padding: '1rem', fontWeight: '500', color: '#475569' }}>Freelancer</th>
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
                        {payment.type === 'wallet_deposit' ? 'Wallet Deposit' : (payment.jobId?.title || 'Unknown Project')}
                      </td>
                      <td style={{ padding: '1rem', color: '#475569' }}>
                        {payment.type === 'wallet_deposit' ? 'Self' : (payment.freelancerId ? `${payment.freelancerId.firstName} ${payment.freelancerId.lastName}` : 'N/A')}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>
                        ${payment.totalAmount?.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {payment.status === 'released' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontSize: '0.875rem' }}>
                            <CheckCircle2 size={16} /> Paid in Full
                          </span>
                        ) : payment.status === 'deposit_paid' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#d97706', fontSize: '0.875rem' }}>
                            <Clock size={16} /> Escrow Active (50%)
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

      {/* Dummy Deposit Modal */}
      {depositModal && (
        <div className="cl-modal-overlay" onClick={() => setDepositModal(false)}>
          <div className="cl-modal" onClick={e => e.stopPropagation()}>
            <div className="cl-modal__header">
              <h3>Add Funds to Wallet</h3>
              <button className="cl-modal__close" onClick={() => setDepositModal(false)}>&times;</button>
            </div>
            <div className="cl-modal__body">
              <div className="cl-form-group">
                <label className="cl-label">Amount (USD)</label>
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
              <button className="cl-btn cl-btn--ghost" onClick={() => setDepositModal(false)} disabled={depositing}>Cancel</button>
              <button 
                className="cl-btn cl-btn--primary" 
                disabled={!depositAmount || Number(depositAmount) <= 0 || depositing}
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
