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
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('stripe');
  const [withdrawing, setWithdrawing] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentsAPI.getHistory();
      setPayments(data?.data?.payments || []);
      setWithdrawals(data?.data?.withdrawals || []);
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

  const transactions = [...payments, ...withdrawals.map(w => ({ ...w, isWithdrawal: true }))]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleWithdrawClick = () => {
    if (walletBalance <= 0) {
      toast.error('No funds available for withdrawal.');
      return;
    }
    setWithdrawAmount(walletBalance.toString());
    setWithdrawModal(true);
  };

  const handleConnectStripe = async () => {
    try {
      toast('Initiating Stripe connection...');
      const res = await paymentsAPI.connectStripe();
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      toast.error('Failed to initiate Stripe connection.');
    }
  };

  const executeWithdraw = async () => {
    setWithdrawing(true);
    try {
      const res = await paymentsAPI.withdrawFunds(withdrawAmount, withdrawMethod);
      
      if (res.data?.data?.needs_onboarding) {
        toast('Stripe onboarding required. Redirecting...');
        const connectRes = await paymentsAPI.connectStripe();
        if (connectRes.data?.data?.url) {
          window.location.href = connectRes.data.data.url;
        }
        return;
      }

      toast.success(`Successfully initiated withdrawal of Rs. ${withdrawAmount} via ${withdrawMethod}.`);
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {profile?.stripeOnboardingComplete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ecfdf5', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid #34d399' }}>
              <CheckCircle2 size={18} /> Stripe Connected
            </div>
          ) : (
            <button 
              className="fl-btn fl-btn--primary" 
              onClick={handleConnectStripe}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gradient-primary)', border: 'none', boxShadow: '0 4px 6px -1px rgba(4, 46, 76, 0.2)', color: '#fff' }}
            >
              Connect Stripe
            </button>
          )}
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
          {transactions.length === 0 ? (
            <EmptyState 
              icon={DollarSign}
              title="No Transactions Yet"
              message="Your payment and withdrawal history will appear here once you complete jobs and receive or withdraw funds."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-secondary)' }}>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Type / Project</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Client / Method</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Amount</th>
                    <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx._id} style={{ borderBottom: '1px solid var(--color-secondary)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-primary-dark)', fontSize: 'var(--fs-sm)' }}>
                        {tx.isWithdrawal ? 'Funds Withdrawal' : (tx.jobId?.title || 'Unknown Project')}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                        {tx.isWithdrawal ? (tx.method === 'stripe' ? 'Stripe Connect' : tx.method) : `${tx.clientId?.firstName} ${tx.clientId?.lastName}`}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-md)', color: tx.isWithdrawal ? '#ef4444' : '#10b981' }}>
                        {tx.isWithdrawal ? '- PKR ' : '+ PKR '}{tx.isWithdrawal ? tx.amount?.toLocaleString() : (tx.status === 'released' ? tx.freelancerPayout?.toLocaleString() : tx.totalAmount?.toLocaleString())}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {tx.isWithdrawal ? (
                          tx.status === 'completed' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                              <ArrowDownToLine size={14} /> Completed
                            </span>
                          ) : tx.status === 'processing' || tx.status === 'pending' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#3b82f6', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                              <Clock size={14} /> Processing
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' }}>{tx.status}</span>
                          )
                        ) : (
                          tx.status === 'released' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                              <CheckCircle2 size={14} /> Released
                            </span>
                          ) : tx.status === 'deposit_paid' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                              <Clock size={14} /> Escrow (50%)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' }}>{tx.status}</span>
                          )
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

      {/* Withdraw Modal */}
      {withdrawModal && (
        <div className="fl-modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }} onClick={() => !withdrawing && setWithdrawModal(false)}>
          <div className="fl-modal" style={{ borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--color-bg)', width: '100%', maxWidth: '500px', transform: 'translateY(-5vh)' }} onClick={e => e.stopPropagation()}>
            <div className="fl-modal__header" style={{ borderBottom: 'none', padding: '0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', color: 'transparent', margin: 0 }}>Withdraw Funds</h3>
              <button className="fl-modal__close" onClick={() => !withdrawing && setWithdrawModal(false)} disabled={withdrawing} style={{ background: '#f1f5f9', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            
            <div className="fl-modal__body" style={{ padding: '0' }}>
              <div className="fl-form-group">
                <label className="fl-label" style={{ fontWeight: '600', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Amount to Withdraw (PKR)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#94a3b8', fontSize: '1.1rem' }}>Rs.</span>
                  <input
                    type="number"
                    className="fl-input"
                    min="5"
                    max={walletBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    style={{ paddingLeft: '50px', fontSize: '1.25rem', height: '56px', borderRadius: '16px', border: '2px solid #e2e8f0', transition: 'all 0.3s', fontWeight: '600', color: '#0f172a', width: '100%', boxSizing: 'border-box' }}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Available: PKR {walletBalance.toLocaleString()}</span>
                  <button type="button" onClick={() => setWithdrawAmount(walletBalance)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}>Withdraw All</button>
                </div>
              </div>
              
              <div className="fl-form-group" style={{ marginTop: '2rem' }}>
                <label className="fl-label" style={{ fontWeight: '600', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Withdrawal Method</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '16px', border: '2px solid #e2e8f0', transition: 'border-color 0.3s' }}>
                  <div style={{ width: '42px', height: '42px', background: '#635bff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 6px -1px rgba(99, 91, 255, 0.3)' }}>
                    S
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem' }}>Stripe Connect</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.1rem' }}>Direct to Bank Account</div>
                  </div>
                  <div style={{ color: '#10b981', background: '#d1fae5', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'rgba(4, 46, 76, 0.04)', borderRadius: '16px', padding: '1.25rem', marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', border: '1px solid rgba(4, 46, 76, 0.08)' }}>
                <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>💡</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)', margin: 0, lineHeight: '1.6' }}>
                  Withdrawals are securely transferred to your configured payout method. If you haven't connected a bank account, Stripe will guide you through the setup.
                </p>
              </div>
            </div>
            
            <div className="fl-modal__footer" style={{ borderTop: 'none', padding: '0', marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
              <button 
                className="fl-btn fl-btn--ghost" 
                onClick={() => setWithdrawModal(false)} 
                disabled={withdrawing}
                style={{ flex: 1, borderRadius: '14px', height: '54px', fontWeight: '700', fontSize: '1rem', background: 'var(--color-secondary)', color: 'var(--color-text-mid)', border: 'none' }}
              >
                Cancel
              </button>
              <button 
                className="fl-btn fl-btn--primary" 
                disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > walletBalance || withdrawing}
                onClick={executeWithdraw}
                style={{ flex: 2, borderRadius: '14px', height: '54px', fontWeight: '700', fontSize: '1rem', background: 'var(--gradient-primary)', border: 'none', boxShadow: '0 10px 15px -3px rgba(4, 46, 76, 0.25)', color: '#fff', cursor: (!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > walletBalance || withdrawing) ? 'not-allowed' : 'pointer', opacity: (!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > walletBalance || withdrawing) ? 0.6 : 1 }}
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
