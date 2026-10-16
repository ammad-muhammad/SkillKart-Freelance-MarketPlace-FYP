import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import { paymentsAPI } from '../../api/payments';
import {
  Wallet, ArrowDownToLine, CheckCircle2, Clock, Lightbulb,
  ChevronLeft, ChevronRight, TrendingUp, DollarSign, Lock,
  ArrowUpRight, ArrowDownLeft, Search, X, ShieldCheck,
  AlertCircle, BarChart3, Calendar, Sparkles
} from 'lucide-react';
import Loader from '../../Components/common/Loader/Loader';
import useFocusTrap from '../../hooks/useFocusTrap';
import Reveal, { useInView } from './components/Reveal';
import { useCountUp } from './components/BentoKPI';
import { safeToast as toast } from '../../utils/safeToast';
import { error as logError } from '../../utils/logger';
import './FreelancerWallet.css';

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
  STATUS_LABELS[s] || String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const getStatusBadgeConfig = (tx) => {
  if (tx.isWithdrawal) {
    if (tx.status === 'completed') return { cls: 'completed', label: 'Completed' };
    if (tx.status === 'processing' || tx.status === 'pending') return { cls: 'processing', label: 'Processing' };
    return { cls: 'failed', label: statusLabel(tx.status) };
  }
  if (tx.status === 'released') return { cls: 'released', label: 'Released' };
  if (tx.status === 'deposit_paid') return { cls: 'escrow', label: tx.milestoneId ? 'In Escrow' : 'Escrow (50%)' };
  return { cls: 'failed', label: statusLabel(tx.status) };
};

/* ─── Real Earnings Area Chart (Computed strictly from released transactions) ─── */
function EarningsAreaChart({ payments = [], range = 'Monthly' }) {
  const [showEscrow, setShowEscrow] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Measured chart width: viewBox is in real pixels so nothing is stretched
  // (no preserveAspectRatio="none") and SVG text/dots keep their true size.
  const [chartW, setChartW] = useState(580);
  const chartRoRef = useRef(null);
  const chartBoxRef = useCallback((node) => {
    if (chartRoRef.current) {
      chartRoRef.current.disconnect();
      chartRoRef.current = null;
    }
    if (!node) return;
    const apply = () => {
      const w = Math.round(node.getBoundingClientRect().width);
      if (w > 0) setChartW(w);
    };
    apply();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(apply);
      ro.observe(node);
      chartRoRef.current = ro;
    }
  }, []);

  // Y-axis short format: full readable short form ("0, 10k, 20k, 30k", not "1.7L/84k")
  const formatShortPkr = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 1000) return `${Math.round(num / 1000)}k`;
    return String(Math.round(num));
  };

  // Group real transactions into complete continuous buckets
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const paymentDates = payments
      .map(p => new Date(p.releasedAt || p.depositPaidAt || p.updatedAt || p.createdAt))
      .filter(d => !isNaN(d.getTime()));
    const activeYear = paymentDates.some(d => d.getFullYear() === currentYear)
      ? currentYear
      : (paymentDates[0]?.getFullYear() || currentYear);

    if (range === 'Weekly') {
      const weeks = [];
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000 - 1);
        const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        weeks.push({
          label,
          start: weekStart.getTime(),
          end: weekEnd.getTime(),
          earnings: 0,
          escrow: 0
        });
      }

      payments.forEach(p => {
        const time = new Date(p.releasedAt || p.depositPaidAt || p.updatedAt || p.createdAt).getTime();
        if (isNaN(time)) return;
        const target = weeks.find(w => time >= w.start && time <= w.end);
        if (target) {
          const amt = Number(p.freelancerPayout || p.totalAmount || 0);
          const escrowAmt = Number(p.depositAmount || p.totalAmount || 0);
          if (p.status === 'released' || p.status === 'completed') {
            target.earnings += amt;
          } else if (p.status === 'deposit_paid' || p.status === 'deposit_pending') {
            target.escrow += escrowAmt;
          }
        }
      });

      return weeks.map(w => ({
        label: w.label,
        earnings: Math.round(w.earnings),
        escrow: Math.round(w.escrow)
      }));
    }

    if (range === 'Yearly') {
      const years = [];
      for (let y = activeYear - 3; y <= activeYear; y++) {
        years.push({ label: String(y), year: y, earnings: 0, escrow: 0 });
      }

      payments.forEach(p => {
        const d = new Date(p.releasedAt || p.depositPaidAt || p.updatedAt || p.createdAt);
        if (isNaN(d.getTime())) return;
        const target = years.find(y => y.year === d.getFullYear());
        if (target) {
          const amt = Number(p.freelancerPayout || p.totalAmount || 0);
          const escrowAmt = Number(p.depositAmount || p.totalAmount || 0);
          if (p.status === 'released' || p.status === 'completed') {
            target.earnings += amt;
          } else if (p.status === 'deposit_paid' || p.status === 'deposit_pending') {
            target.escrow += escrowAmt;
          }
        }
      });

      return years.map(y => ({
        label: y.label,
        earnings: Math.round(y.earnings),
        escrow: Math.round(y.escrow)
      }));
    }

    // Default: 'Monthly' (Jan to Dec of activeYear, all 12 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = monthNames.map((m, idx) => ({
      label: m,
      monthIdx: idx,
      earnings: 0,
      escrow: 0
    }));

    payments.forEach(p => {
      const d = new Date(p.releasedAt || p.depositPaidAt || p.updatedAt || p.createdAt);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === activeYear || paymentDates.length <= 12) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          const amt = Number(p.freelancerPayout || p.totalAmount || 0);
          const escrowAmt = Number(p.depositAmount || p.totalAmount || 0);
          if (p.status === 'released' || p.status === 'completed') {
            months[m].earnings += amt;
          } else if (p.status === 'deposit_paid' || p.status === 'deposit_pending') {
            months[m].escrow += escrowAmt;
          }
        }
      }
    });

    return months.map(m => ({
      label: m.label,
      earnings: Math.round(m.earnings),
      escrow: Math.round(m.escrow)
    }));
  }, [payments, range]);

  // Summary Metrics above the chart in plain words
  const summary = useMemo(() => {
    const totalEarnings = chartData.reduce((acc, d) => acc + d.earnings, 0);
    const totalEscrow = chartData.reduce((acc, d) => acc + d.escrow, 0);
    let best = chartData[0] || { label: '-', earnings: 0 };
    chartData.forEach(d => {
      if (d.earnings > best.earnings) best = d;
    });
    const avg = chartData.length > 0 ? Math.round(totalEarnings / chartData.length) : 0;
    return { totalEarnings, totalEscrow, best, avg };
  }, [chartData]);

  const hasData = chartData.some(d => d.earnings > 0 || (showEscrow && d.escrow > 0));

  if (!hasData && payments.length === 0) {
    return (
      <div style={{ height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F8FAFC', borderRadius: 16, border: '1px dashed #E2E8F0', padding: 20 }}>
        <BarChart3 size={28} style={{ color: '#94A3B8' }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0B2942' }}>No transaction history found</span>
        <span style={{ fontSize: 12, color: '#64748B' }}>When milestone payments are funded or released, your earnings trend appears here.</span>
      </div>
    );
  }

  const width = Math.max(chartW, 240);
  const height = 196;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Scale based strictly on released earnings by default; include escrow only if toggled on
  const maxVal = Math.max(
    ...chartData.map(d => showEscrow ? Math.max(d.earnings, d.escrow) : d.earnings),
    1000
  );

  const points = chartData.map((d, i) => {
    const x = chartData.length === 1
      ? padLeft + plotW / 2
      : padLeft + (i / (chartData.length - 1)) * plotW;
    const yEarn = padTop + plotH - (d.earnings / maxVal) * plotH;
    const yEscrow = padTop + plotH - (d.escrow / maxVal) * plotH;
    return { x, yEarn, yEscrow, ...d };
  });

  const pathDEarn = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yEarn}` : `${acc} L ${p.x} ${p.yEarn}`, '');
  const areaDEarn = points.length > 1
    ? `${pathDEarn} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`
    : '';

  const pathDEscrow = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yEscrow}` : `${acc} L ${p.x} ${p.yEscrow}`, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary Row Above Chart with plain word labels (Earned this year, Best month, Monthly average) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '10px 16px',
        background: '#F8FAFC',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        fontSize: 12.5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#64748B', fontWeight: 600 }}>
            {range === 'Weekly' ? 'Earned this period:' : range === 'Yearly' ? 'Earned all time:' : 'Earned this year:'}
          </span>
          <strong style={{ color: '#0B2942', fontVariantNumeric: 'tabular-nums' }}>
            Rs. {summary.totalEarnings.toLocaleString()}
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#64748B', fontWeight: 600 }}>
            {range === 'Weekly' ? 'Best week:' : range === 'Yearly' ? 'Best year:' : 'Best month:'}
          </span>
          <strong style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
            {summary.best.label} (Rs. {summary.best.earnings.toLocaleString()})
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#64748B', fontWeight: 600 }}>
            {range === 'Weekly' ? 'Weekly average:' : range === 'Yearly' ? 'Yearly average:' : 'Monthly average:'}
          </span>
          <strong style={{ color: '#0B2942', fontVariantNumeric: 'tabular-nums' }}>
            Rs. {summary.avg.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* Legend & Optional Escrow Toggle Chip (Default off) */}
      <div className="fl-wall-chart-legend">
        <div className="fl-wall-chart-legend-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, background: '#10B981', borderRadius: 2 }} />
            <span style={{ color: '#065F46' }}>Released Earnings</span>
          </div>
        </div>

        {/* Optional Toggle Chip */}
        <button
          type="button"
          className={`fl-wall-escrow-chip${showEscrow ? ' fl-wall-escrow-chip--active' : ''}`}
          onClick={() => setShowEscrow(prev => !prev)}
          aria-pressed={showEscrow}
          title="Toggle pending escrow dashed line"
        >
          <span className="fl-wall-escrow-chip__dash" />
          <span>Pending Escrow {showEscrow ? '(Showing)' : '(Hidden)'}</span>
        </button>
      </div>

      {/* SVG Canvas */}
      <div ref={chartBoxRef} style={{ position: 'relative', width: '100%', height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}
          role="img"
          aria-label="Earnings trend chart"
        >
          <defs>
            <linearGradient id="flWalletAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Soft Gridlines & Short Y-Axis Labels */}
          <g className="fl-chart-grid" opacity="0.8">
            <line x1={padLeft} y1={padTop} x2={width - padRight} y2={padTop} stroke="#E2E8F0" strokeDasharray="3 3" />
            <text x={padLeft - 8} y={padTop + 3.5} textAnchor="end" fontSize="12" fill="#94A3B8" fontFamily="monospace">
              {formatShortPkr(maxVal)}
            </text>

            <line x1={padLeft} y1={padTop + plotH / 2} x2={width - padRight} y2={padTop + plotH / 2} stroke="#E2E8F0" strokeDasharray="3 3" />
            <text x={padLeft - 8} y={padTop + plotH / 2 + 3.5} textAnchor="end" fontSize="12" fill="#94A3B8" fontFamily="monospace">
              {formatShortPkr(maxVal / 2)}
            </text>

            <line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="#E2E8F0" />
            <text x={padLeft - 8} y={padTop + plotH + 3.5} textAnchor="end" fontSize="12" fill="#94A3B8" fontFamily="monospace">
              0
            </text>
          </g>

          {/* Area Fill for Earnings */}
          {points.length > 1 && (
            <path d={areaDEarn} fill="url(#flWalletAreaGrad)" />
          )}

          {/* Optional Dashed Secondary Line: Pending Escrow (Rendered ONLY when toggled on) */}
          {showEscrow && points.length > 1 && (
            <path
              d={pathDEscrow}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}

          {/* Main Stroke Line: Released Earnings (Solid Emerald) */}
          {points.length > 1 && (
            <path
              d={pathDEarn}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-Axis Labels (SVG text, aligned with the points; thinned on narrow charts) */}
          {points.map((p, idx) => {
            const slot = points.length > 1 ? plotW / (points.length - 1) : plotW;
            const step = Math.max(1, Math.ceil(38 / Math.max(slot, 1)));
            if (idx % step !== 0) return null;
            return (
              <text key={`xl-${idx}`} x={p.x} y={height - 6} textAnchor="middle" fontSize="12" fill="#94A3B8" fontFamily="monospace">
                {p.label}
              </text>
            );
          })}

          {/* Interactive Dots for Earnings (hover on desktop, tap on touch; 14px hit area) */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.yEarn}
                r={hoverIndex === idx ? 5.5 : 3.5}
                fill="#FFFFFF"
                stroke="#10B981"
                strokeWidth={hoverIndex === idx ? 3 : 2}
                style={{ transition: 'all 0.15s ease', pointerEvents: 'none' }}
              />
              <circle
                cx={p.x}
                cy={p.yEarn}
                r={14}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => setHoverIndex(prev => (prev === idx ? null : idx))}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: Math.min(Math.max(points[hoverIndex].x, 90), width - 90),
            transform: 'translateX(-50%)',
            background: '#0B2942',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            pointerEvents: 'none',
            boxShadow: '0 4px 14px rgba(11, 41, 66, 0.25)',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}>
            <div style={{ fontWeight: 800, color: '#A7F3D0', marginBottom: 2 }}>
              {points[hoverIndex].label}
            </div>
            <div>Released: <strong>Rs. {points[hoverIndex].earnings.toLocaleString()}</strong></div>
            {showEscrow && points[hoverIndex].escrow > 0 && (
              <div style={{ color: '#FDE68A' }}>In Escrow: <strong>Rs. {points[hoverIndex].escrow.toLocaleString()}</strong></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FreelancerWallet() {
  const { profile, loading: profileLoading, refreshProfile } = useFreelancer();
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Withdraw flow state
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod] = useState('stripe');
  const [withdrawing, setWithdrawing] = useState(false);
  const [minWithdrawal, setMinWithdrawal] = useState(5);

  // Filters & Pagination
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [chartRange, setChartRange] = useState('Monthly');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const withdrawModalRef = useRef(null);
  const closeWithdrawModal = useCallback(() => {
    if (!withdrawing) setWithdrawModal(false);
  }, [withdrawing]);
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
      .catch(err => console.error('Failed to load withdrawal config:', err));
  }, []);

  const walletBalance = Number(profile?.walletBalance || 0);
  const totalEarned = Number(profile?.totalEarnings || 0);
  const activeEscrow = payments
    .filter(p => p.status === 'deposit_paid')
    .reduce((sum, p) => sum + (Number(p.depositAmount) || 0), 0);

  // Exact real value for already withdrawn
  const completedWithdrawalsSum = withdrawals
    .filter(w => w.status === 'completed' || w.status === 'processing')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const alreadyWithdrawn = completedWithdrawalsSum > 0
    ? completedWithdrawalsSum
    : Math.max(0, totalEarned - walletBalance);

  // Count-up hooks for Hero & KPIs - counts up directly on data arrival
  const [heroRef] = useInView();
  const animatedBalance = useCountUp(walletBalance, true, 800);
  const animatedEscrow = useCountUp(activeEscrow, true, 800);
  const animatedEarned = useCountUp(totalEarned, true, 800);

  // Formatted display values: Never stuck on 0 if source value > 0
  const displayBalance = (animatedBalance || walletBalance || 0).toLocaleString();
  const displayEscrow = (animatedEscrow || activeEscrow || 0).toLocaleString();
  const displayEarned = (animatedEarned || totalEarned || 0).toLocaleString();
  const displayWithdrawn = alreadyWithdrawn.toLocaleString();

  const getTxTime = (tx) => {
    const raw = tx.releasedAt || tx.depositPaidAt || tx.updatedAt || tx.createdAt;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const allTransactions = useMemo(() => {
    return [...payments, ...withdrawals.map(w => ({ ...w, isWithdrawal: true }))]
      .sort((a, b) => getTxTime(b) - getTxTime(a));
  }, [payments, withdrawals]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      if (filter === 'released' && (tx.isWithdrawal || tx.status !== 'released')) return false;
      if (filter === 'escrow' && (tx.isWithdrawal || (tx.status !== 'deposit_paid' && tx.status !== 'deposit_pending'))) return false;
      if (filter === 'withdrawals' && !tx.isWithdrawal) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const projectTitle = (tx.jobId?.title || '').toLowerCase();
        const clientName = tx.clientId ? `${tx.clientId.firstName || ''} ${tx.clientId.lastName || ''}`.toLowerCase() : '';
        const method = (tx.method || '').toLowerCase();
        return projectTitle.includes(q) || clientName.includes(q) || method.includes(q);
      }
      return true;
    });
  }, [allTransactions, filter, search]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTx = useMemo(() => {
    return filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredTransactions, page]);

  // Proportional money split calculation
  const totalMoneySum = walletBalance + activeEscrow + (totalEarned > walletBalance ? totalEarned - walletBalance : 0);
  const availablePct = totalMoneySum > 0 ? Math.max(5, Math.round((walletBalance / totalMoneySum) * 100)) : 33;
  const escrowPct = totalMoneySum > 0 ? Math.max(5, Math.round((activeEscrow / totalMoneySum) * 100)) : 33;
  const withdrawnPct = Math.max(5, 100 - availablePct - escrowPct);

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
      if (res.data?.data?.url) window.location.href = res.data.data.url;
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
        if (connectRes.data?.data?.url) window.location.href = connectRes.data.data.url;
        return;
      }
      toast.success(`Successfully initiated withdrawal of Rs. ${Number(withdrawAmount).toLocaleString()} via ${withdrawMethod}.`);
      setWithdrawModal(false);
      if (refreshProfile) refreshProfile(false, 0, true);
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (!initialLoaded && (profileLoading || loading)) {
    return <Loader text="Processing" fullScreen={true} />;
  }

  const TABS = [
    { id: 'all', label: 'All', count: allTransactions.length },
    { id: 'released', label: 'Earnings / Released', count: allTransactions.filter(t => !t.isWithdrawal && t.status === 'released').length },
    { id: 'escrow', label: 'In Escrow', count: allTransactions.filter(t => !t.isWithdrawal && (t.status === 'deposit_paid' || t.status === 'deposit_pending')).length },
    { id: 'withdrawals', label: 'Withdrawals', count: allTransactions.filter(t => t.isWithdrawal).length },
  ];

  return (
    <div className="fl-wallet-page">
      {/* ── A) PAGE HEADER ── */}
      <div className="fl-wall-header">
        <div className="fl-wall-header__left">
          <nav className="fl-wall-breadcrumb" aria-label="Breadcrumb">
            <Link to="/freelancer/dashboard">Dashboard</Link>
            <span className="fl-wall-breadcrumb__sep">/</span>
            <span className="fl-wall-breadcrumb__curr">Earnings & Wallet</span>
          </nav>
          <h1 className="fl-wall-header__title">Earnings & Wallet</h1>
          <p className="fl-wall-header__sub">Track your active escrow, review transaction history, and withdraw funds.</p>
        </div>

        <div className="fl-wall-header__actions">
          {profile?.stripeOnboardingComplete ? (
            <span className="fl-wall-badge-connected">
              <CheckCircle2 size={15} /> Stripe Connected
            </span>
          ) : (
            <button className="fl-wall-btn-connect" onClick={handleConnectStripe}>
              Connect Stripe
            </button>
          )}

          <button
            className="fl-wall-btn-withdraw-header"
            onClick={handleWithdrawClick}
            disabled={withdrawing || walletBalance <= 0}
            title={walletBalance <= 0 ? 'No funds available to withdraw' : 'Withdraw to bank'}
          >
            <ArrowDownToLine size={16} />
            {withdrawing ? 'Processing…' : 'Withdraw Funds'}
          </button>
        </div>
      </div>

      {/* ── B) BALANCE BENTO (12-Col Grid) ── */}
      <Reveal delay={60}>
        <div className="fl-wall-bento" ref={heroRef}>
          {/* LEFT col-span 5: HERO BALANCE CARD + MONEY SPLIT CARD */}
          <div className="fl-wall-left-col">
            {/* Compact Hero Card (FIX 3a) */}
            <div className="fl-wall-hero">
              <div className="fl-wall-hero__orb-1" />
              <div className="fl-wall-hero__orb-2" />

              <div className="fl-wall-hero__top">
                <div>
                  <span className="fl-wall-hero__label">AVAILABLE FOR WITHDRAWAL</span>
                  <div className="fl-wall-hero__amount" title={`Rs. ${walletBalance.toLocaleString()}`}>
                    Rs. {displayBalance}
                  </div>
                </div>
                <span className="fl-wall-hero__badge">
                  <Sparkles size={12} /> Ready
                </span>
              </div>

              <div className="fl-wall-hero__middle">
                <button
                  type="button"
                  className="fl-wall-hero__btn-withdraw"
                  onClick={handleWithdrawClick}
                  disabled={withdrawing || walletBalance <= 0}
                >
                  <ArrowDownToLine size={15} />
                  <span>{withdrawing ? 'Processing…' : 'Withdraw Funds'}</span>
                </button>
              </div>

              <div className="fl-wall-hero__divider" />

              <div className="fl-wall-hero__footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={15} />
                  <span>Escrow Protected & Bank Guaranteed</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 12 }}>
                  {profile?.stripeOnboardingComplete ? '● Stripe Active' : '○ Stripe Inactive'}
                </span>
              </div>
            </div>

            {/* "Where is my money?" Card (Replaces Portfolio Allocation, requirement b) */}
            <div className="fl-wall-breakdown-card">
              <div className="fl-wall-breakdown-head">
                <h4 className="fl-wall-breakdown-title">Where is my money?</h4>
              </div>
              <div className="fl-wall-breakdown-rows">
                {/* Available to withdraw */}
                <div className="fl-wall-breakdown-row">
                  <div className="fl-wall-breakdown-left">
                    <div className="fl-wall-breakdown-icon" style={{ background: '#EAFBF4', color: '#10B981' }}>
                      <CheckCircle2 size={16} strokeWidth={2.2} />
                    </div>
                    <div className="fl-wall-breakdown-text">
                      <span className="fl-wall-breakdown-label">Available to withdraw</span>
                      <span className="fl-wall-breakdown-sub">Cleared funds ready for payout</span>
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
                      <span className="fl-wall-breakdown-label">Held in escrow</span>
                      <span className="fl-wall-breakdown-sub">Locked until you deliver work</span>
                    </div>
                  </div>
                  <strong className="fl-wall-breakdown-amount" style={{ color: '#B45309' }}>Rs. {displayEscrow}</strong>
                </div>

                {/* Already withdrawn */}
                <div className="fl-wall-breakdown-row">
                  <div className="fl-wall-breakdown-left">
                    <div className="fl-wall-breakdown-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                      <ArrowUpRight size={16} strokeWidth={2.2} />
                    </div>
                    <div className="fl-wall-breakdown-text">
                      <span className="fl-wall-breakdown-label">Already withdrawn</span>
                      <span className="fl-wall-breakdown-sub">All money paid out to you so far</span>
                    </div>
                  </div>
                  <strong className="fl-wall-breakdown-amount" style={{ color: '#4F46E5' }}>Rs. {displayWithdrawn}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT col-span 7: Escrow, Lifetime, & Overview Chart */}
          <div className="fl-wall-right-col">
            <div className="fl-wall-kpi-pair">
              {/* Escrow Card (requirement d: sub-text "Locked until you deliver work") */}
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
                <span className="fl-wall-card__sub">Locked until you deliver work</span>
              </div>

              {/* Lifetime Earnings Card (requirement d: sub-text "All money paid out to you so far") */}
              <div className="fl-wall-card">
                <div className="fl-wall-card__top">
                  <span className="fl-wall-card__mono">TOTAL LIFETIME EARNINGS</span>
                  <div className="fl-wall-card__icon-box" style={{ background: '#EAFBF4', color: '#10B981' }}>
                    <TrendingUp size={18} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="fl-wall-card__val" title={`Rs. ${totalEarned.toLocaleString()}`}>
                  Rs. {displayEarned}
                </div>
                <span className="fl-wall-card__sub">All money paid out to you so far</span>
              </div>
            </div>

            {/* Earnings Overview Area Chart Card */}
            <div className="fl-wall-chart-card">
              <div className="fl-wall-chart-head">
                <div>
                  <h3 className="fl-wall-chart-head__title">Earnings Overview</h3>
                  <p className="fl-wall-chart-head__sub">Money released to you, per month.</p>
                </div>
                <div className="fl-wall-chart-head__toggles" role="group" aria-label="Earnings timeframe">
                  {['Weekly', 'Monthly', 'Yearly'].map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`fl-wall-toggle-btn${chartRange === r ? ' fl-wall-toggle-btn--active' : ''}`}
                      onClick={() => setChartRange(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fl-wall-chart-stage">
                <EarningsAreaChart payments={payments} range={chartRange} />
              </div>
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
                placeholder="Search project or client…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={24} />
              </div>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0B2942' }}>No transactions found</h4>
              <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', maxWidth: 360 }}>
                {search || filter !== 'all'
                  ? 'No results match your active filters. Try resetting search.'
                  : 'Your payment history will appear here once you complete projects and receive escrow deposits.'}
              </p>
              {(search || filter !== 'all') && (
                <button
                  className="fl-wall-btn-connect"
                  style={{ marginTop: 8 }}
                  onClick={() => { setSearch(''); setFilter('all'); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="fl-wall-table-wrap">
                <table className="fl-wall-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>TYPE / PROJECT</th>
                      <th>CLIENT / METHOD</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTx.map(tx => {
                      const txDate = tx.releasedAt || tx.depositPaidAt || tx.createdAt;
                      const { cls: badgeCls, label: badgeLabel } = getStatusBadgeConfig(tx);
                      const isCredit = !tx.isWithdrawal;
                      const amount = tx.isWithdrawal
                        ? tx.amount
                        : (tx.status === 'released' ? (tx.freelancerPayout || tx.totalAmount) : tx.totalAmount);
                      const clientName = tx.clientId ? `${tx.clientId.firstName || ''} ${tx.clientId.lastName || ''}`.trim() : 'Direct Client';
                      const initials = clientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'C';

                      return (
                        <tr key={tx._id}>
                          <td>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0B2942' }}>
                              {new Date(txDate).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                              {new Date(txDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td>
                            <div className="fl-wall-tx-project">
                              <div
                                className="fl-wall-tx-icon-circle"
                                style={{
                                  background: isCredit ? '#EAFBF4' : '#F1F5F9',
                                  color: isCredit ? '#10B981' : '#64748B'
                                }}
                              >
                                {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div>
                                <span className="fl-wall-tx-title" title={tx.isWithdrawal ? 'Funds Withdrawal' : (tx.jobId?.title || 'Direct Order')}>
                                  {tx.isWithdrawal ? 'Funds Withdrawal' : (tx.jobId?.title || 'Direct Order')}
                                </span>
                                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                                  {tx.isWithdrawal ? 'Bank Transfer via Stripe' : 'Milestone Escrow'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {tx.isWithdrawal ? (
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', background: '#F8FAFC', padding: '4px 10px', borderRadius: 9999, border: '1px solid #E2E8F0' }}>
                                Stripe Connect
                              </span>
                            ) : (
                              <div className="fl-wall-tx-client">
                                <span className="fl-wall-client-avatar">{initials}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{clientName}</span>
                              </div>
                            )}
                          </td>

                          <td>
                            <span className={isCredit ? 'fl-wall-amount-credit' : 'fl-wall-amount-debit'}>
                              {isCredit ? '+' : '−'} Rs. {(amount || 0).toLocaleString()}
                            </span>
                          </td>

                          <td>
                            <span className={`fl-wall-status-chip fl-wall-status-chip--${badgeCls}`}>
                              <span className="fl-wall-status-chip__dot" />
                              {badgeLabel}
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
                {paginatedTx.map(tx => {
                  const txDate = tx.releasedAt || tx.depositPaidAt || tx.createdAt;
                  const { cls: badgeCls, label: badgeLabel } = getStatusBadgeConfig(tx);
                  const isCredit = !tx.isWithdrawal;
                  const amount = tx.isWithdrawal
                    ? tx.amount
                    : (tx.status === 'released' ? (tx.freelancerPayout || tx.totalAmount) : tx.totalAmount);
                  const clientName = tx.clientId ? `${tx.clientId.firstName || ''} ${tx.clientId.lastName || ''}`.trim() : 'Direct Client';

                  return (
                    <div key={tx._id} className="fl-wall-mobile-card">
                      <div className="fl-wall-mobile-card__top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            className="fl-wall-tx-icon-circle"
                            style={{
                              background: isCredit ? '#EAFBF4' : '#F1F5F9',
                              color: isCredit ? '#10B981' : '#64748B'
                            }}
                          >
                            {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0B2942' }}>
                              {tx.isWithdrawal ? 'Funds Withdrawal' : (tx.jobId?.title || 'Project')}
                            </div>
                            <div style={{ fontSize: 12, color: '#94A3B8' }}>
                              {new Date(txDate).toLocaleDateString()} · {tx.isWithdrawal ? 'Stripe' : clientName}
                            </div>
                          </div>
                        </div>

                        <span className={isCredit ? 'fl-wall-amount-credit' : 'fl-wall-amount-debit'}>
                          {isCredit ? '+' : '−'} Rs. {(amount || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="fl-wall-mobile-card__bottom">
                        <span style={{ fontSize: 12, color: '#64748B' }}>
                          Status
                        </span>
                        <span className={`fl-wall-status-chip fl-wall-status-chip--${badgeCls}`}>
                          <span className="fl-wall-status-chip__dot" />
                          {badgeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#FFFFFF' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length} transactions
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className="fl-prop-pager"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        className={`fl-prop-pager${page === p ? ' fl-prop-pager--active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className="fl-prop-pager"
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

      {/* ── D) MODERN GLASS WITHDRAW MODAL ── */}
      {withdrawModal && (
        <div className="fl-wall-modal-overlay" onClick={closeWithdrawModal}>
          <div
            ref={withdrawModalRef}
            className="fl-wall-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Withdraw Funds"
            tabIndex={-1}
          >
            <div className="fl-wall-modal__head">
              <h3 className="fl-wall-modal__title">Withdraw Funds</h3>
              <button
                className="fl-wall-modal__close"
                onClick={closeWithdrawModal}
                disabled={withdrawing}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="fl-wall-modal__body">
              {/* Amount field */}
              <div className="fl-wall-modal__field">
                <label className="fl-wall-modal__label">Amount to Withdraw (PKR)</label>
                <div className="fl-wall-modal__input-wrap">
                  <span className="fl-wall-modal__prefix">Rs.</span>
                  <input
                    type="number"
                    className="fl-wall-modal__input"
                    min={minWithdrawal}
                    max={walletBalance}
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: '#64748B' }}>Available: Rs. {walletBalance.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(walletBalance)}
                    style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Withdraw All
                  </button>
                </div>
              </div>

              {/* Method Card */}
              <div className="fl-wall-modal__field">
                <label className="fl-wall-modal__label">Destination Account</label>
                <div className="fl-wall-method-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, background: '#635BFF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: 18 }}>
                      S
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0B2942' }}>Stripe Connect Payout</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>Direct Bank Transfer</div>
                    </div>
                  </div>
                  <CheckCircle2 size={19} style={{ color: '#10B981' }} />
                </div>
              </div>

              {/* Informational callout */}
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <Lightbulb size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12.5, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Withdrawals are initiated directly to your connected bank account through Stripe. Minimum withdrawal is Rs. {minWithdrawal.toLocaleString()}.
                </p>
              </div>
            </div>

            <div className="fl-wall-modal__footer">
              <button
                type="button"
                className="fl-prop-btn fl-prop-btn--outline"
                onClick={closeWithdrawModal}
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fl-prop-btn fl-prop-btn--primary"
                disabled={!withdrawAmount || Number(withdrawAmount) < minWithdrawal || Number(withdrawAmount) > walletBalance || withdrawing}
                onClick={executeWithdraw}
              >
                {withdrawing ? (
                  <>
                    <Loader size="sm" text="" /> Processing…
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
