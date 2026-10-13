import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { paymentsAPI } from '../../api/payments';
import { Wallet, ArrowUpRight, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(profile?.walletBalance || 0);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
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

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await paymentsAPI.getHistory();
      setPayments(data?.data?.payments || []);
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
      if (document.visibilityState === 'visible' && !depositModal) {
        loadHistory(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [loadHistory, depositModal]);

  const getTxTime = (p) => {
    const raw = p.releasedAt || p.depositPaidAt || p.updatedAt || p.createdAt;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const sortedPayments = [...payments].sort((a, b) => getTxTime(b) - getTxTime(a));

  const filteredPayments = sortedPayments.filter(p => {
    if (filter === 'deposits') return p.type === 'wallet_deposit';
    if (filter === 'paid') return p.type !== 'wallet_deposit' && p.status === 'released';
    if (filter === 'escrow') return p.status === 'deposit_paid' || p.status === 'deposit_pending';
    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE) || 1;
  const paginatedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  if (!initialLoaded && (profileLoading || loading)) {
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
        <div className="cl-card__header" style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="cl-card__title" style={{ margin: 0 }}>Transaction History</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All', count: sortedPayments.length },
              { id: 'deposits', label: 'Wallet Deposits', count: sortedPayments.filter(p => p.type === 'wallet_deposit').length },
              { id: 'paid', label: 'Paid in Full', count: sortedPayments.filter(p => p.type !== 'wallet_deposit' && p.status === 'released').length },
              { id: 'escrow', label: 'In Escrow', count: sortedPayments.filter(p => p.status === 'deposit_paid' || p.status === 'deposit_pending').length },
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
        <div className="cl-card__body">
          {sortedPayments.length === 0 ? (
            <EmptyState
              icon={PkrIcon}
              title="No Transactions Yet"
              message="Your payment history will appear here once you deposit funds or pay freelancers."
              actionText="Add Funds"
              actionClick={() => setDepositModal(true)}
            />
          ) : filteredPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-mid)' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No transactions found matching this filter.</p>
              <button
                onClick={() => { setFilter('all'); setPage(1); }}
                style={{
                  marginTop: '0.75rem',
                  background: 'transparent',
                  border: '1px solid var(--color-primary)',
                  color: 'var(--color-primary)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-secondary)' }}>
                      <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Date</th>
                      <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Project / Source</th>
                      <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Freelancer</th>
                      <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Amount</th>
                      <th style={{ padding: '1rem', fontWeight: 'var(--fw-bold)', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map(payment => {
                      const rawDate = payment.releasedAt || payment.depositPaidAt || payment.updatedAt || payment.createdAt;
                      const dateObj = new Date(rawDate);
                      const dateFormatted = !isNaN(dateObj) ? dateObj.toLocaleDateString() : 'N/A';
                      const timeFormatted = !isNaN(dateObj) ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                      return (
                        <tr key={payment._id} style={{ borderBottom: '1px solid var(--color-secondary)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--color-secondary)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem', color: 'var(--color-text-mid)', fontSize: 'var(--fs-sm)' }}>
                            <div style={{ fontWeight: 500 }}>{dateFormatted}</div>
                            {timeFormatted && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{timeFormatted}</div>}
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
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-success)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-success-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                <CheckCircle2 size={14} /> Completed
                              </span>
                            ) : payment.status === 'released' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-success)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-success-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                <CheckCircle2 size={14} /> Paid in Full
                              </span>
                            ) : payment.status === 'deposit_paid' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-warning)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', background: 'var(--color-warning-tint)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                <Clock size={14} /> {payment.milestoneId ? 'Escrow Active' : 'Escrow Active (50%)'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', textTransform: 'capitalize' }}>{statusLabel(payment.status)}</span>
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
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} transactions
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
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: page === p ? 'var(--color-primary)' : 'var(--color-secondary)',
                          background: page === p ? 'var(--color-primary)' : 'transparent',
                          color: page === p ? '#ffffff' : 'var(--color-text-dark)',
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          fontWeight: page === p ? 700 : 500
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
