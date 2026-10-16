import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useClient } from '../../context/ClientContext';
import { paymentsAPI } from '../../api/payments';
import {
  Wallet, ArrowDownToLine, ArrowUpRight, CheckCircle2, Clock, Lightbulb,
  ChevronLeft, ChevronRight, TrendingUp, DollarSign, Lock,
  ArrowDownLeft, Search, X, ShieldCheck, AlertCircle, BarChart3,
  Calendar, Sparkles
} from 'lucide-react';
import Loader from '../../Components/common/Loader/Loader';
import useFocusTrap from '../../hooks/useFocusTrap';
import Reveal, { useInView } from '../freelancer/components/Reveal';
import { useCountUp } from '../freelancer/components/BentoKPI';
import '../freelancer/FreelancerWallet.css';

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
  STATUS_LABELS[s] || String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const getStatusBadgeConfig = (tx) => {
  if (tx.type === 'wallet_deposit') {
    if (tx.status === 'completed') return { cls: 'completed', label: 'Funded' };
    if (tx.status === 'pending') return { cls: 'processing', label: 'Processing' };
    return { cls: 'failed', label: statusLabel(tx.status) };
  }
  if (tx.status === 'released') return { cls: 'released', label: 'Paid in Full' };
  if (tx.status === 'deposit_paid') return { cls: 'escrow', label: 'In Escrow (50%)' };
  return { cls: 'failed', label: statusLabel(tx.status) };
};

/* ─── Client Spending & Escrow Area Chart ─── */
function SpendingAreaChart({ payments = [], range = 'Monthly' }) {
  const [showEscrow, setShowEscrow] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);

  const formatShortPkr = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 1000) return `${Math.round(num / 1000)}k`;
    return String(Math.round(num));
  };

  const chartData = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const now = new Date();

    if (range === 'Weekly') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((day, i) => ({
        label: day,
        spending: (i + 1) * 4500 + (i % 2 === 0 ? 3000 : 1500),
        escrow: (i + 1) * 3000
      }));
    }

    if (range === 'Yearly') {
      const quarters = ['2023 Q1', '2023 Q2', '2023 Q3', '2023 Q4', '2024 Q1', '2024 Q2'];
      return quarters.map((q, i) => ({
        label: q,
        spending: (i + 1) * 35000 + 20000,
        escrow: (i + 1) * 15000 + 10000
      }));
    }

    // Monthly default
    return months.map((m, idx) => {
      const base = (idx + 1) * 12000;
      return {
        label: m,
        spending: base + (idx % 2 === 0 ? 8000 : 3000),
        escrow: base * 0.6
      };
    });
  }, [range]);

  const maxVal = Math.max(
    ...chartData.map(d => Math.max(d.spending, showEscrow ? d.escrow : 0)),
    10000
  );

  const width = 560;
  const height = 180;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = chartData.map((d, i) => {
    const x = chartData.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (chartData.length - 1)) * plotW;
    const ySpend = padTop + plotH - (d.spending / maxVal) * plotH;
    const yEscrow = padTop + plotH - (d.escrow / maxVal) * plotH;
    return { ...d, x, ySpend, yEscrow };
  });

  const spendPath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.ySpend}`, '');
  const spendArea = `${spendPath} L ${points[points.length - 1]?.x} ${padTop + plotH} L ${points[0]?.x} ${padTop + plotH} Z`;

  const escrowPath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.yEscrow}`, '');

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#10B981' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
            <span>Spent / Released</span>
          </div>
          <button
            type="button"
            onClick={() => setShowEscrow(!showEscrow)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: showEscrow ? '#D97706' : '#94A3B8',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: showEscrow ? '#F59E0B' : '#CBD5E1' }} />
            <span>Active Escrow</span>
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="clientSpendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = padTop + plotH * (1 - ratio);
            const val = formatShortPkr(maxVal * ratio);
            return (
              <g key={idx}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94A3B8" fontWeight="600" fontFamily="monospace">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Filled Area */}
          <path d={spendArea} fill="url(#clientSpendGrad)" />
          {/* Line for Spending */}
          <path d={spendPath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Line for Escrow */}
          {showEscrow && (
            <path d={escrowPath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
          )}

          {/* Interactive Dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.ySpend}
              r={hoverIndex === idx ? 5.5 : 3.5}
              fill="#FFFFFF"
              stroke="#10B981"
              strokeWidth={hoverIndex === idx ? 3 : 2}
              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}
        </svg>

        {hoverIndex !== null && points[hoverIndex] && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: `${(points[hoverIndex].x / width) * 100}%`,
            transform: 'translateX(-50%)',
            background: '#0B2942',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: 600,
            pointerEvents: 'none',
            boxShadow: '0 4px 14px rgba(11, 41, 66, 0.25)',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}>
            <div style={{ fontWeight: 800, color: '#A7F3D0', marginBottom: 2 }}>{points[hoverIndex].label}</div>
            <div>Spent: <strong>Rs. {points[hoverIndex].spending.toLocaleString()}</strong></div>
            {showEscrow && (
              <div style={{ color: '#FDE68A' }}>Escrow: <strong>Rs. {points[hoverIndex].escrow.toLocaleString()}</strong></div>
            )}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: `0 ${padRight}px 0 ${padLeft}px`,
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: 'monospace'
      }}>
        {chartData.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function ClientWallet() {
  const { profile, loading: profileLoading, showToast } = useClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Deposit modal
  const [depositModal, setDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(profile?.walletBalance || 0);

  // Filters & Pagination
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [chartRange, setChartRange] = useState('Monthly');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const depositConfirmed = useRef(false);
  const depositModalRef = useRef(null);
  const closeDepositModal = useCallback(() => {
    if (!depositing) setDepositModal(false);
  }, [depositing]);
  useFocusTrap(depositModalRef, depositModal, closeDepositModal);

  const heroRef = useRef(null);
  const [heroInView, setHeroInView] = useState(true);

  // Sync profile wallet balance
  useEffect(() => {
    if (profile && profile.walletBalance !== undefined) {
      setWalletBalance(profile.walletBalance);
    }
  }, [profile]);

  // Handle Stripe callback
  useEffect(() => {
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

  const activeEscrow = payments
    .filter(p => p.status === 'deposit_paid')
    .reduce((sum, p) => sum + (Number(p.depositAmount) || 0), 0);

  const totalSpent = payments
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  const totalDeposited = payments
    .filter(p => p.type === 'wallet_deposit' && p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount || p.totalAmount) || 0), 0) || walletBalance;

  const displayBalance = useCountUp(walletBalance, heroInView, 850);
  const displayEscrow = useCountUp(activeEscrow, heroInView, 850);
  const displaySpent = useCountUp(totalSpent, heroInView, 850);
  const displayDeposited = useCountUp(totalDeposited, heroInView, 850);

  const getTxTime = (p) => {
    const raw = p.releasedAt || p.depositPaidAt || p.updatedAt || p.createdAt;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const sortedPayments = [...payments].sort((a, b) => getTxTime(b) - getTxTime(a));

  const filteredPayments = sortedPayments.filter(p => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (p.jobId?.title || p.gigId?.title || p.description || '').toLowerCase().includes(q);
      const matchId = (p._id || '').toLowerCase().includes(q);
      if (!matchTitle && !matchId) return false;
    }
    if (filter === 'deposits') return p.type === 'wallet_deposit';
    if (filter === 'paid') return p.type !== 'wallet_deposit' && p.status === 'released';
    if (filter === 'escrow') return p.status === 'deposit_paid' || p.status === 'deposit_pending';
    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE) || 1;
  const paginatedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDepositSubmit = async () => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }
    setDepositing(true);
    try {
      const res = await paymentsAPI.createDepositSession(amt);
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      } else {
        showToast('Unable to initiate checkout session.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Deposit initiation failed.', 'error');
    } finally {
      setDepositing(false);
    }
  };

  if (!initialLoaded && (profileLoading || loading)) {
    return <Loader text="Loading Wallet" fullScreen={true} />;
  }

  const TABS = [
    { id: 'all', label: 'All Transactions', count: sortedPayments.length },
    { id: 'deposits', label: 'Wallet Deposits', count: sortedPayments.filter(p => p.type === 'wallet_deposit').length },
    { id: 'paid', label: 'Paid in Full', count: sortedPayments.filter(p => p.type !== 'wallet_deposit' && p.status === 'released').length },
    { id: 'escrow', label: 'In Escrow', count: sortedPayments.filter(p => p.status === 'deposit_paid' || p.status === 'deposit_pending').length },
  ];

  return (
    <div className="fl-wallet-page">
      {/* ── A) PAGE HEADER ── */}
      <div className="fl-wall-header">
        <div className="fl-wall-header__left">
          <nav className="fl-wall-breadcrumb" aria-label="Breadcrumb">
            <Link to="/client/dashboard">Dashboard</Link>
            <span className="fl-wall-breadcrumb__sep">/</span>
            <span className="fl-wall-breadcrumb__curr">Client Wallet & Escrow</span>
          </nav>
          <h1 className="fl-wall-header__title">Client Wallet & Escrow</h1>
          <p className="fl-wall-header__sub">
            Fund your workspace balance, track active milestone escrow, and review hiring invoices.
          </p>
        </div>

        <div className="fl-wall-header__actions">
          <button
            className="fl-wall-btn-withdraw-header"
            onClick={() => { setDepositAmount(''); setDepositModal(true); }}
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          >
            <Wallet size={16} />
            <span>Deposit Funds</span>
          </button>
        </div>
      </div>

      {/* ── B) BALANCE BENTO (12-Col Grid) ── */}
      <Reveal delay={60}>
        <div className="fl-wall-bento" ref={heroRef}>

          {/* LEFT col-span 5: HERO BALANCE CARD + MONEY SPLIT CARD */}
          <div className="fl-wall-left-col">
            {/* Compact Hero Card */}
            <div className="fl-wall-hero">
              <div className="fl-wall-hero__orb-1" />
              <div className="fl-wall-hero__orb-2" />

              <div className="fl-wall-hero__top">
                <div>
                  <span className="fl-wall-hero__label">AVAILABLE WALLET BALANCE</span>
                  <div className="fl-wall-hero__amount" title={`Rs. ${walletBalance.toLocaleString()}`}>
                    Rs. {displayBalance}
                  </div>
                </div>
                <span className="fl-wall-hero__badge">
                  <Sparkles size={12} /> Ready to Hire
                </span>
              </div>

              <div className="fl-wall-hero__middle">
                <button
                  type="button"
                  className="fl-wall-hero__btn-withdraw"
                  onClick={() => { setDepositAmount(''); setDepositModal(true); }}
                  style={{ background: '#FFFFFF', color: '#0B2942' }}
                >
                  <Wallet size={15} />
                  <span>Add Funds to Wallet</span>
                </button>
              </div>

              <div className="fl-wall-hero__divider" />

              <div className="fl-wall-hero__footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={15} />
                  <span>Escrow Protected & Bank Guaranteed</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 11.5 }}>
                  ● Instant Checkout
                </span>
              </div>
            </div>

            {/* "Where is my money?" Card */}
            <div className="fl-wall-breakdown-card">
              <div className="fl-wall-breakdown-head">
                <h4 className="fl-wall-breakdown-title">Where is my money?</h4>
              </div>
              <div className="fl-wall-breakdown-rows">
                {/* Available to spend */}
                <div className="fl-wall-breakdown-row">
                  <div className="fl-wall-breakdown-left">
                    <div className="fl-wall-breakdown-icon" style={{ background: '#EAFBF4', color: '#10B981' }}>
                      <CheckCircle2 size={16} strokeWidth={2.2} />
                    </div>
                    <div className="fl-wall-breakdown-text">
                      <span className="fl-wall-breakdown-label">Available to spend</span>
                      <span className="fl-wall-breakdown-sub">Ready for contract offers & packages</span>
                    </div>
                  </div>
                  <strong className="fl-wall-breakdown-amount">Rs. {displayBalance}</strong>
                </div>

                {/* Held in escrow */}
                <div className="fl-wall-breakdown-row">
                  <div className="fl-wall-breakdown-left">
                    <div className="fl-wall-breakdown-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                      <Lock size={16} strokeWidth={2.2} />
                    </div>
                    <div className="fl-wall-breakdown-text">
                      <span className="fl-wall-breakdown-label">Held in active escrow</span>
                      <span className="fl-wall-breakdown-sub">Locked until freelancer delivers work</span>
                    </div>
                  </div>
                  <strong className="fl-wall-breakdown-amount" style={{ color: '#B45309' }}>Rs. {displayEscrow}</strong>
                </div>

                {/* Total lifetime spent */}
                <div className="fl-wall-breakdown-row">
                  <div className="fl-wall-breakdown-left">
                    <div className="fl-wall-breakdown-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                      <ArrowUpRight size={16} strokeWidth={2.2} />
                    </div>
                    <div className="fl-wall-breakdown-text">
                      <span className="fl-wall-breakdown-label">Total lifetime spent</span>
                      <span className="fl-wall-breakdown-sub">All released payments to freelancers</span>
                    </div>
                  </div>
                  <strong className="fl-wall-breakdown-amount" style={{ color: '#4F46E5' }}>Rs. {displaySpent}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT col-span 7: Escrow, Lifetime, & Overview Chart */}
          <div className="fl-wall-right-col">
            <div className="fl-wall-kpi-pair">
              {/* Escrow Card */}
              <div className="fl-wall-card">
                <div className="fl-wall-card__top">
                  <span className="fl-wall-card__mono">FUNDS IN ACTIVE ESCROW</span>
                  <div className="fl-wall-card__icon-box" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    <Lock size={18} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="fl-wall-card__val" title={`Rs. ${activeEscrow.toLocaleString()}`}>
                  Rs. {displayEscrow}
                </div>
                <span className="fl-wall-card__sub">Locked until you approve deliverables</span>
              </div>

              {/* Lifetime Spent Card */}
              <div className="fl-wall-card">
                <div className="fl-wall-card__top">
                  <span className="fl-wall-card__mono">LIFETIME PROJECT SPENDING</span>
                  <div className="fl-wall-card__icon-box" style={{ background: '#EAFBF4', color: '#10B981' }}>
                    <TrendingUp size={18} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="fl-wall-card__val" title={`Rs. ${totalSpent.toLocaleString()}`}>
                  Rs. {displaySpent}
                </div>
                <span className="fl-wall-card__sub">Successfully paid to freelancers</span>
              </div>
            </div>

            {/* Spending & Escrow Analytics Chart */}
            <div className="fl-wall-chart-card">
              <div className="fl-wall-chart-card__head">
                <div className="fl-wall-chart-card__title-group">
                  <BarChart3 size={18} style={{ color: '#10B981' }} />
                  <div>
                    <h3 className="fl-wall-chart-card__title">Hiring & Escrow Trends</h3>
                    <p className="fl-wall-chart-card__sub">Track contract expenditure and escrow commitments.</p>
                  </div>
                </div>

                <div className="fl-wall-chart-range-tabs">
                  {['Weekly', 'Monthly', 'Yearly'].map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`fl-wall-range-pill ${chartRange === r ? 'fl-wall-range-pill--active' : ''}`}
                      onClick={() => setChartRange(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <SpendingAreaChart payments={payments} range={chartRange} />
            </div>
          </div>

        </div>
      </Reveal>

      {/* ── C) TRANSACTION HISTORY TABLE (Steadi Fintech Style) ── */}
      <Reveal delay={160}>
        <div className="fl-wall-table-card">
          <div className="fl-wall-table-toolbar">
            <div className="fl-wall-table-title-wrap">
              <div className="fl-wall-table-title-icon">
                <Wallet size={18} />
              </div>
              <h3 className="fl-wall-table-title">Transaction History</h3>
            </div>

            {/* Filter Tabs */}
            <div className="fl-wall-table-tabs" role="tablist">
              {TABS.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={filter === t.id}
                  className={`fl-wall-tab${filter === t.id ? ' fl-wall-tab--active' : ''}`}
                  onClick={() => { setFilter(t.id); setPage(1); }}
                >
                  <span>{t.label}</span>
                  <span className="fl-wall-tab__cnt">{t.count}</span>
                </button>
              ))}
            </div>

            {/* Search Pill */}
            <div className="fl-wall-search">
              <Search size={14} className="fl-wall-search__icon" />
              <input
                type="text"
                className="fl-wall-search__input"
                placeholder="Search transactions..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1); }}
                  style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={24} />
              </div>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0B2942' }}>No transactions found</h4>
              <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', maxWidth: 360 }}>
                {search || filter !== 'all'
                  ? 'No results match your active filters. Try resetting search.'
                  : 'Your payment history will appear here once you fund your wallet or hire freelancers.'}
              </p>
              {(search || filter !== 'all') && (
                <button
                  className="fl-wall-btn-connect"
                  style={{ marginTop: 8 }}
                  onClick={() => { setSearch(''); setFilter('all'); setPage(1); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="fl-wall-table-wrap">
                <table className="fl-wall-table">
                  <thead>
                    <tr>
                      <th>TYPE & DESCRIPTION</th>
                      <th>REFERENCE / ID</th>
                      <th>DATE & TIME</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((tx, idx) => {
                      const badge = getStatusBadgeConfig(tx);
                      const isDeposit = tx.type === 'wallet_deposit';
                      const title = isDeposit
                        ? 'Wallet Deposit (Stripe)'
                        : (tx.jobId?.title || tx.gigId?.title || tx.description || 'Freelance Service');
                      const rawDate = getTxTime(tx);
                      const dateObj = new Date(rawDate);
                      const txDate = dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      const txTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const amountNum = Number(tx.amount || tx.totalAmount || tx.depositAmount) || 0;

                      return (
                        <tr key={tx._id || idx}>
                          <td>
                            <div className="fl-wall-tx-project">
                              <div
                                className="fl-wall-tx-icon-circle"
                                style={{
                                  background: isDeposit ? '#EAFBF4' : '#FEF3C7',
                                  color: isDeposit ? '#10B981' : '#D97706'
                                }}
                              >
                                {isDeposit ? <ArrowDownToLine size={16} /> : <Lock size={16} />}
                              </div>
                              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <span className="fl-wall-tx-title" title={title}>
                                  {title}
                                </span>
                                <span style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
                                  {isDeposit ? 'Direct wallet top-up via Stripe' : (tx.contractId ? 'Contract Milestone' : 'Custom Project Offer')}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span style={{
                              fontFamily: "'SF Mono', 'Fira Code', monospace",
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#475569',
                              background: '#F8FAFC',
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid #E2E8F0'
                            }} title={tx._id}>
                              #{String(tx._id || '').slice(-6).toUpperCase()}
                            </span>
                          </td>

                          <td>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0B2942' }}>
                              {txDate}
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                              {txTime}
                            </div>
                          </td>

                          <td>
                            <span className={isDeposit ? 'fl-wall-amount-credit' : 'fl-wall-amount-debit'}>
                              {isDeposit ? '+' : '−'} Rs. {amountNum.toLocaleString()}
                            </span>
                          </td>

                          <td>
                            <span className={`fl-wall-status-chip fl-wall-status-chip--${badge.cls}`}>
                              <span className="fl-wall-status-chip__dot" />
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Transaction Cards (<768px) */}
              <div className="fl-wall-mobile-list">
                {paginatedPayments.map((tx, idx) => {
                  const badge = getStatusBadgeConfig(tx);
                  const isDeposit = tx.type === 'wallet_deposit';
                  const title = isDeposit
                    ? 'Wallet Deposit (Stripe)'
                    : (tx.jobId?.title || tx.gigId?.title || tx.description || 'Freelance Service');
                  const rawDate = getTxTime(tx);
                  const dateObj = new Date(rawDate);
                  const txDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const txTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const amountNum = Number(tx.amount || tx.totalAmount || tx.depositAmount) || 0;

                  return (
                    <div key={tx._id || idx} className="fl-wall-mobile-card">
                      <div className="fl-wall-mobile-card__top">
                        <div className="fl-wall-tx-project">
                          <div
                            className="fl-wall-tx-icon-circle"
                            style={{
                              background: isDeposit ? '#EAFBF4' : '#FEF3C7',
                              color: isDeposit ? '#10B981' : '#D97706'
                            }}
                          >
                            {isDeposit ? <ArrowDownToLine size={16} /> : <Lock size={16} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span className="fl-wall-tx-title" style={{ maxWidth: 200 }}>{title}</span>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>#{String(tx._id || '').slice(-6).toUpperCase()}</span>
                          </div>
                        </div>
                        <span className={isDeposit ? 'fl-wall-amount-credit' : 'fl-wall-amount-debit'}>
                          {isDeposit ? '+' : '−'} Rs. {amountNum.toLocaleString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: 11.5, color: '#94A3B8' }}>{txDate} at {txTime}</span>
                        <span className={`fl-wall-status-chip fl-wall-status-chip--${badge.cls}`}>
                          <span className="fl-wall-status-chip__dot" />
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  background: '#FFFFFF'
                }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} transactions
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 34,
                        height: 34,
                        padding: '0 8px',
                        borderRadius: 9999,
                        background: 'transparent',
                        border: '1px solid #E2E8F0',
                        color: '#0B2942',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        opacity: page === 1 ? 0.4 : 1,
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 34,
                          height: 34,
                          padding: '0 8px',
                          borderRadius: 9999,
                          background: page === p ? '#0B2942' : 'transparent',
                          color: page === p ? '#FFFFFF' : '#0B2942',
                          border: `1px solid ${page === p ? '#0B2942' : '#E2E8F0'}`,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 34,
                        height: 34,
                        padding: '0 8px',
                        borderRadius: 9999,
                        background: 'transparent',
                        border: '1px solid #E2E8F0',
                        color: '#0B2942',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        opacity: page === totalPages ? 0.4 : 1,
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Reveal>

      {/* ── D) DEPOSIT MODAL ── */}
      {depositModal && (
        <div className="fl-modal-overlay">
          <div className="fl-modal-card" ref={depositModalRef}>
            <div className="fl-modal-hd">
              <div>
                <h3 className="fl-modal-title">Deposit Funds to Wallet</h3>
                <p className="fl-modal-sub">Add money to your SkillKart balance to instantly accept bids and hire freelancers.</p>
              </div>
              <button
                type="button"
                className="fl-modal-close-btn"
                onClick={closeDepositModal}
                disabled={depositing}
              >
                <X size={18} />
              </button>
            </div>

            <div className="fl-modal-body">
              <label className="fsec-field-label">Quick Presets</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {[5000, 10000, 25000, 50000].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="fl-pill-btn fl-pill-btn--secondary"
                    style={{
                      padding: '8px 0',
                      fontSize: 12,
                      fontWeight: 700,
                      background: Number(depositAmount) === val ? '#10B981' : '#F8FAFC',
                      color: Number(depositAmount) === val ? '#FFFFFF' : '#0B2942',
                      borderColor: Number(depositAmount) === val ? '#10B981' : '#E2E8F0'
                    }}
                    onClick={() => setDepositAmount(String(val))}
                  >
                    Rs. {val.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="fsec-field">
                <label className="fsec-field-label">Custom Deposit Amount (PKR)</label>
                <input
                  type="number"
                  min="100"
                  className="fsec-field-input"
                  placeholder="e.g. 15000"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                />
              </div>

              <div style={{
                background: '#EAFBF4',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 14
              }}>
                <ShieldCheck size={18} style={{ color: '#059669', flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: '#065F46', lineHeight: 1.4 }}>
                  Funds are held in secure escrow. Payments are only released to freelancers once you approve the delivered work.
                </span>
              </div>
            </div>

            <div className="fl-modal-footer">
              <button
                type="button"
                className="fsec-btn-outline"
                onClick={closeDepositModal}
                disabled={depositing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fsec-btn-primary"
                onClick={handleDepositSubmit}
                disabled={depositing || !depositAmount || Number(depositAmount) <= 0}
              >
                {depositing ? 'Redirecting to Stripe...' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
