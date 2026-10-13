import Loader from '../../Components/common/Loader/Loader';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFreelancer } from '../../context/FreelancerContext';
import { paymentsAPI } from '../../api/payments';
import { Wallet, ArrowDownToLine, CheckCircle2, Clock, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import PkrIcon from '../../Components/common/PkrIcon';
import { safeToast as toast } from '../../utils/safeToast';
import EmptyState from '../../Components/common/EmptyState/EmptyState';
import useFocusTrap from '../../hooks/useFocusTrap';
import { error as logError } from '../../utils/logger';
import './FreelancerDashboard.css';

// Human-readable labels for raw payment/withdrawal status enums, so the wallet
// never shows machine values like "deposit_pending".
const STATUS_LABELS = {
  deposit_pending: 'Awaiting deposit',
  deposit_paid: 'In escrow',
  released: 'Released',
  refunded: 'Refunded',
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
const statusLabel = (s) =>
  STATUS_LABELS[s] || String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function FreelancerWallet() {
  const { profile, loading: profileLoading, refreshProfile } = useFreelancer();
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod] = useState('stripe');
  const [withdrawing, setWithdrawing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  // Admin-configurable — fetched so this can't drift from the backend's own
  // enforced minimum (see payments.controller.js's getWithdrawalConfig).
  const [minWithdrawal, setMinWithdrawal] = useState(5);
  const withdrawModalRef = useRef(null);
  const closeWithdrawModal = useCallback(() => { if (!withdrawing) setWithdrawModal(false); }, [withdrawing]);
  useFocusTrap(withdrawModalRef, withdrawModal, closeWithdrawModal);

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await paymentsAPI.getHistory();
      setPayments(data?.data?.payments || []);
      setWithdrawals(data?.data?.withdrawals || []);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      if (!silent) setLoading(false);
      setInitialLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !withdrawModal) {
        loadHistory(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [loadHistory, withdrawModal]);

  useEffect(() => {
    paymentsAPI.getWithdrawalConfig()
      .then(({ data }) => {
        const min = data?.data?.minWithdrawal;
        if (Number.isFinite(min)) setMinWithdrawal(min);
      })
      .catch((err) => console.error('Failed to load withdrawal config:', err));
  }, []);

  const walletBalance = profile?.walletBalance || 0;
  const totalEarned = profile?.totalEarnings || 0;
  
  // Calculate active escrow: deposit is paid, but final isn't released
  const activeEscrow = payments
    .filter(p => p.status === 'deposit_paid')
    .reduce((sum, p) => sum + (Number(p.depositAmount) || 0), 0);

  const getTxTime = (tx) => {
    const raw = tx.releasedAt || tx.depositPaidAt || tx.updatedAt || tx.createdAt;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const allTransactions = [...payments, ...withdrawals.map(w => ({ ...w, isWithdrawal: true }))]
    .sort((a, b) => getTxTime(b) - getTxTime(a));

  const filteredTransactions = allTransactions.filter(tx => {
    if (filter === 'released') return !tx.isWithdrawal && tx.status === 'released';
    if (filter === 'escrow') return !tx.isWithdrawal && (tx.status === 'deposit_paid' || tx.status === 'deposit_pending');
    if (filter === 'withdrawals') return tx.isWithdrawal;
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      toast.info('Initiating Stripe connection...');
      const res = await paymentsAPI.connectStripe();
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      logError('Failed to initiate Stripe connection:', err);
      toast.error(err.response?.data?.message || 'Failed to initiate Stripe connection.');
    }
  };

  const executeWithdraw = async () => {
    setWithdrawing(true);
    try {
      const res = await paymentsAPI.withdrawFunds(withdrawAmount, withdrawMethod);
      
      if (res.data?.data?.needs_onboarding) {
        toast.info('Stripe onboarding required. Redirecting...');
        const connectRes = await paymentsAPI.connectStripe();
        if (connectRes.data?.data?.url) {
          window.location.href = connectRes.data.data.url;
        }
        return;
      }

      toast.success(`Successfully initiated withdrawal of Rs. ${withdrawAmount} via ${withdrawMethod}.`);
      setWithdrawModal(false);
      // Refresh profile silently so the wallet balance syncs
      if (refreshProfile) refreshProfile(false, 0, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (!initialLoaded && (profileLoading || loading)) {
    return <Loader text="Loading your wallet…" fullScreen={true} />;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-success-tint)', color: 'var(--color-success)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid rgba(5, 150, 105, 0.4)' }}>
              <CheckCircle2 size={18} /> Stripe Connected
            </div>
          ) : (
            <button 
              className="fl-btn fl-btn--primary" 
              onClick={handleConnectStripe}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gradient-primary)', border: 'none', boxShadow: '0 4px 6px -1px rgba(4, 46, 76, 0.2)', color: 'var(--color-white)' }}
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
            <PkrIcon size={100} />
          </div>
          <div className="fl-stat-card__icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--color-white)' }}>
            <PkrIcon size={24} />
          </div>
          <div className="fl-stat-card__value" style={{ background: 'var(--color-white)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rs. {walletBalance.toLocaleString()}</div>
          <div className="fl-stat-card__label" style={{ color: 'rgba(255,255,255,0.8)' }}>Available for Withdrawal</div>
        </div>

        <div className="fl-stat-card">
          <div className="fl-stat-card__bg">
            <Wallet size={100} />
          </div>
          <div className="fl-stat-card__icon" style={{ background: 'var(--color-warning-tint)', color: 'var(--color-warning)' }}>
            <Wallet size={24} />
          </div>
          <div className="fl-stat-card__value">Rs. {activeEscrow.toLocaleString()}</div>
          <div className="fl-stat-card__label">Funds in Active Escrow</div>
        </div>
        <div className="fl-stat-card">
          <div className="fl-stat-card__bg">
            <CheckCircle2 size={100} />
          </div>
          <div className="fl-stat-card__icon" style={{ background: 'var(--color-success-tint)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="fl-stat-card__value">Rs. {totalEarned.toLocaleString()}</div>
          <div className="fl-stat-card__label">Total Lifetime Earnings</div>
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card__header" style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="fl-card__title" style={{ margin: 0 }}>Transaction History</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All', count: allTransactions.length },
              { id: 'released', label: 'Earnings / Released', count: allTransactions.filter(t => !t.isWithdrawal && t.status === 'released').length },
              { id: 'escrow', label: 'In Escrow', count: allTransactions.filter(t => !t.isWithdrawal && (t.status === 'deposit_paid' || t.status === 'deposit_pending')).length },
              { id: 'withdrawals', label: 'Withdrawals', count: allTransactions.filter(t => t.isWithdrawal).length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setFilter(tab.id); setPage(1); }}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: filter === tab.id ? 'var(--color-primary)' : 'var(--color-secondary)',
                  background: filter === tab.id ? 'var(--color-primary)' : 'transparent',
                  color: filter === tab.id ? '#ffffff' : 'var(--color-text-mid)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
        <div className="fl-card__body">
          {filteredTransactions.length === 0 ? (
            <EmptyState 
              icon={PkrIcon}
              title="No Transactions Found"
              message={filter === 'all' ? 'Your payment and withdrawal history will appear here once you complete jobs and receive or withdraw funds.' : `No transactions found under "${filter}".`}
            />
          ) : (
            <>
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
                    {paginatedTransactions.map(tx => {
                      const txDate = tx.releasedAt || tx.depositPaidAt || tx.createdAt;
                      return (
                        <tr key={tx._id} style={{ borderBottom: '1px solid var(--color-secondary)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--color-secondary)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                            <div>{new Date(txDate).toLocaleDateString()}</div>
                            {tx.releasedAt && tx.status === 'released' && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                                {new Date(tx.releasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-primary-dark)', fontSize: 'var(--fs-sm)' }}>
                            {tx.isWithdrawal ? 'Funds Withdrawal' : (tx.jobId?.title || 'Unknown Project')}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                            {tx.isWithdrawal ? (tx.method === 'stripe' ? 'Stripe Connect' : tx.method) : (tx.clientId ? `${tx.clientId.firstName || ''} ${tx.clientId.lastName || ''}`.trim() : 'Client')}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-md)', color: tx.isWithdrawal ? 'var(--color-error)' : 'var(--color-success)' }}>
                            {tx.isWithdrawal ? '- Rs. ' : '+ Rs. '}{tx.isWithdrawal ? tx.amount?.toLocaleString() : (tx.status === 'released' ? (tx.freelancerPayout || tx.totalAmount)?.toLocaleString() : tx.totalAmount?.toLocaleString())}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {tx.isWithdrawal ? (
                              tx.status === 'completed' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-success)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-success-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                  <ArrowDownToLine size={14} /> Completed
                                </span>
                              ) : tx.status === 'processing' || tx.status === 'pending' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-info)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-info-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                  <Clock size={14} /> Processing
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', textTransform: 'capitalize' }}>{statusLabel(tx.status)}</span>
                              )
                            ) : (
                              tx.status === 'released' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-success)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-success-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                  <CheckCircle2 size={14} /> Released
                                </span>
                              ) : tx.status === 'deposit_paid' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-warning)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-warning-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                  <Clock size={14} /> {tx.milestoneId ? 'In Escrow' : 'Escrow (50%)'}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', textTransform: 'capitalize' }}>{statusLabel(tx.status)}</span>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-secondary)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)' }}>
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length} transactions
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-secondary)',
                        background: 'transparent',
                        color: page === 1 ? 'var(--color-text-light)' : 'var(--color-text-dark)',
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.84rem',
                        fontWeight: 500
                      }}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: page === p ? 'var(--color-primary)' : 'var(--color-secondary)',
                          background: page === p ? 'var(--color-primary)' : 'transparent',
                          color: page === p ? '#fff' : 'var(--color-text-mid)',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-secondary)',
                        background: 'transparent',
                        color: page === totalPages ? 'var(--color-text-light)' : 'var(--color-text-dark)',
                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '0.84rem',
                        fontWeight: 500
                      }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {withdrawModal && (
        <div className="fl-modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }} onClick={closeWithdrawModal}>
          <div
            ref={withdrawModalRef}
            className="fl-modal"
            style={{ borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--color-bg)', width: '100%', maxWidth: '500px', transform: 'translateY(-5vh)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Withdraw Funds"
            tabIndex={-1}
          >
            <div className="fl-modal__header" style={{ borderBottom: 'none', padding: '0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', color: 'transparent', margin: 0 }}>Withdraw Funds</h3>
              <button className="fl-modal__close" onClick={closeWithdrawModal} disabled={withdrawing} aria-label="Close" style={{ background: 'var(--color-secondary)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: 'var(--color-text-mid)' }}>&times;</button>
            </div>
            
            <div className="fl-modal__body" style={{ padding: '0' }}>
              <div className="fl-form-group">
                <label className="fl-label" style={{ fontWeight: '600', color: 'var(--color-text-dark)', marginBottom: '0.5rem', display: 'block' }}>Amount to Withdraw (PKR)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--color-text-light)', fontSize: '1.1rem' }}>Rs.</span>
                  <input
                    type="number"
                    className="fl-input"
                    min={minWithdrawal}
                    max={walletBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    style={{ paddingLeft: '50px', fontSize: '1.25rem', height: '56px', borderRadius: '16px', border: '2px solid rgba(183, 201, 226, 0.5)', transition: 'all 0.3s', fontWeight: '600', color: 'var(--color-text-dark)', width: '100%', boxSizing: 'border-box' }}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-mid)', fontWeight: '500' }}>Available: Rs. {walletBalance.toLocaleString()}</span>
                  <button type="button" onClick={() => setWithdrawAmount(walletBalance)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}>Withdraw All</button>
                </div>
              </div>
              
              <div className="fl-form-group" style={{ marginTop: '2rem' }}>
                <label className="fl-label" style={{ fontWeight: '600', color: 'var(--color-text-dark)', marginBottom: '0.5rem', display: 'block' }}>Withdrawal Method</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-secondary)', padding: '1rem 1.25rem', borderRadius: '16px', border: '2px solid rgba(183, 201, 226, 0.5)', transition: 'border-color 0.3s' }}>
                  <div style={{ width: '42px', height: '42px', background: '#635bff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 6px -1px rgba(99, 91, 255, 0.3)' }}>
                    S
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: 'var(--color-text-dark)', fontSize: '1rem' }}>Stripe Connect</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)', marginTop: '0.1rem' }}>Direct to Bank Account</div>
                  </div>
                  <div style={{ color: 'var(--color-success)', background: 'var(--color-success-tint)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'rgba(4, 46, 76, 0.04)', borderRadius: '16px', padding: '1.25rem', marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', border: '1px solid rgba(4, 46, 76, 0.08)' }}>
                <span style={{ fontSize: '1.5rem', lineHeight: '1' }}><Lightbulb size={24} style={{ color: 'var(--color-primary)' }} /></span>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)', margin: 0, lineHeight: '1.6' }}>
                  Withdrawals are securely transferred to your configured payout method. If you haven't connected a bank account, Stripe will guide you through the setup.
                </p>
              </div>
            </div>
            
            <div className="fl-modal__footer" style={{ borderTop: 'none', padding: '0', marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
              <button
                className="fl-btn fl-btn--ghost"
                onClick={closeWithdrawModal}
                disabled={withdrawing}
                style={{ flex: 1, borderRadius: '14px', height: '54px', fontWeight: '700', fontSize: '1rem', background: 'var(--color-secondary)', color: 'var(--color-text-mid)', border: 'none' }}
              >
                Cancel
              </button>
              <button 
                className="fl-btn fl-btn--primary" 
                disabled={!withdrawAmount || Number(withdrawAmount) < minWithdrawal || Number(withdrawAmount) > walletBalance || withdrawing}
                onClick={executeWithdraw}
                style={{ flex: 2, borderRadius: '14px', height: '54px', fontWeight: '700', fontSize: '1rem', background: 'var(--gradient-primary)', border: 'none', boxShadow: '0 10px 15px -3px rgba(4, 46, 76, 0.25)', color: 'var(--color-white)', cursor: (!withdrawAmount || Number(withdrawAmount) < minWithdrawal || Number(withdrawAmount) > walletBalance || withdrawing) ? 'not-allowed' : 'pointer', opacity: (!withdrawAmount || Number(withdrawAmount) < minWithdrawal || Number(withdrawAmount) > walletBalance || withdrawing) ? 0.6 : 1 }}
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
