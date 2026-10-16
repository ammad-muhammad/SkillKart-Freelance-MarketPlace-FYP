import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Wallet, UploadCloud, X, Clock, MessageSquare, Play,
  Square, FileText, Search, AlertTriangle, StopCircle, Circle,
  CheckCircle2, RefreshCw, Layers, Star, ShoppingBag, ChevronDown,
  Check, ExternalLink, ShieldCheck, ChevronRight
} from 'lucide-react';
import { contractsAPI } from '../../api/contracts';
import { jobsAPI } from '../../api/jobs';
import { deliveriesAPI } from '../../api/deliveries';
import { timeTrackingAPI } from '../../api/timeTracking';
import { useAuth } from '../../hooks/useAuth';
import { useFreelancer } from '../../context/FreelancerContext';
import Loader from '../../Components/common/Loader/Loader';
import LiveTimer from '../../Components/common/LiveTimer/LiveTimer';
import ReviewModal from '../../Components/common/ReviewModal/ReviewModal';
import Modal from '../../Components/common/Modal/Modal';
import OrderRequirements from '../../Components/common/OrderRequirements/OrderRequirements';
import useFocusTrap from '../../hooks/useFocusTrap';
import './FreelancerWork.css';

const STAGES = {
  'active': { label: 'In Progress', tone: 'active' },
  'in-progress': { label: 'In Progress', tone: 'active' },
  'in_revision': { label: 'In Revision', tone: 'revision' },
  delivered: { label: 'Delivered — In Review', tone: 'revision' },
  completed: { label: 'Completed', tone: 'completed' },
  cancelled: { label: 'Cancelled', tone: 'disputed' },
};

const ESCROW_CONFIG = {
  deposit_pending: { label: 'Awaiting deposit', color: '#D97706' },
  deposit_paid: { label: 'Escrow funded', color: '#0284C7' },
  released: { label: 'Paid in full', color: '#10B981' },
  refunded: { label: 'Refunded', color: '#64748B' },
};

export default function FreelancerWork() {
  const { user } = useAuth();
  const { showToast } = useFreelancer();

  const [contracts, setContracts] = useState([]);
  const [gigOrders, setGigOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs, Filters, Sort
  const [tab, setTab] = useState('active'); // 'active' | 'completed' | 'disputed' | 'all'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'amount'
  const [viewCompact, setViewCompact] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());

  // Modal States
  const [deliverFor, setDeliverFor] = useState(null);
  const [delivery, setDelivery] = useState({ message: '', links: '' });
  const [delivering, setDelivering] = useState(false);
  const deliverModalRef = useRef(null);
  const closeDeliverModal = useCallback(() => { if (!delivering) setDeliverFor(null); }, [delivering]);
  useFocusTrap(deliverModalRef, !!deliverFor, closeDeliverModal);

  const [tracking, setTracking] = useState({});
  const [manualLogFor, setManualLogFor] = useState(null);
  const [manualLog, setManualLog] = useState({ startTime: '', endTime: '', notes: '' });
  const [loggingManual, setLoggingManual] = useState(false);

  const [endRequestModal, setEndRequestModal] = useState(null);
  const [endReason, setEndReason] = useState('Work completed');
  const [endDetails, setEndDetails] = useState('');

  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');

  const [reviewModal, setReviewModal] = useState(null);

  // Pagination for many contracts
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Load contracts and gig orders
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [{ data }, gigRes] = await Promise.all([
        contractsAPI.getMyContracts({ limit: 100 }),
        jobsAPI.getMyHiredJobs({ source: 'gig', limit: 100 }).catch(() => null),
      ]);
      setContracts(Array.isArray(data?.data) ? data.data : []);
      setGigOrders(Array.isArray(gigRes?.data?.data)
        ? gigRes.data.data.map((g) => ({
            ...g,
            delivery: g.delivery?.submittedAt ? g.delivery : null,
            lastRevision: g.lastRevision || null,
            revisions: g.revisions || []
          }))
        : []);
    } catch {
      /* handled gracefully */
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !deliverFor && !endRequestModal && !disputeModal && !manualLogFor && !reviewModal) {
        load(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [load, deliverFor, endRequestModal, disputeModal, manualLogFor, reviewModal]);

  // Financial KPI totals
  const totalEarned = useMemo(() => {
    return contracts
      .filter((c) => c.status === 'completed' && c.payment?.status === 'released')
      .reduce((sum, c) => sum + (Number(c.payment?.freelancerPayout) || 0), 0);
  }, [contracts]);

  const activeContractsCount = useMemo(() => {
    return contracts.filter((c) => ['active', 'in-progress', 'in_revision', 'delivered'].includes(c.status)).length;
  }, [contracts]);

  const completedContractsCount = useMemo(() => {
    return contracts.filter((c) => c.status === 'completed').length;
  }, [contracts]);

  const totalInEscrow = useMemo(() => {
    return contracts
      .filter((c) => c.status !== 'completed' && c.status !== 'cancelled')
      .reduce((sum, c) => {
        if (c.type === 'hourly') return sum + (Number(c.hourlyEscrow?.lockedBalance) || 0);
        const fundedMs = (c.milestones || []).filter(m => m.status === 'funded');
        return sum + fundedMs.reduce((msSum, m) => msSum + (Number(m.amount) || 0), 0);
      }, 0);
  }, [contracts]);

  // Combined and filtered work items
  const filteredWorkItems = useMemo(() => {
    const combined = [
      ...contracts.map(c => ({ ...c, isGig: false })),
      ...gigOrders.map(g => ({ ...g, isGig: true }))
    ];

    return combined
      .filter(item => {
        const status = item.status || '';
        if (tab === 'active' && !['active', 'in-progress', 'in_revision', 'delivered'].includes(status)) return false;
        if (tab === 'completed' && status !== 'completed') return false;
        if (tab === 'disputed' && (status !== 'disputed' && !item.dispute)) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const title = (item.title || item.jobId?.title || '').toLowerCase();
          const client = item.clientId ? `${item.clientId.firstName || ''} ${item.clientId.lastName || ''}`.toLowerCase() : '';
          return title.includes(q) || client.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') {
          const amtA = a.fixedPrice || a.budget?.amount || a.payment?.totalAmount || 0;
          const amtB = b.fixedPrice || b.budget?.amount || b.payment?.totalAmount || 0;
          return amtB - amtA;
        }
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [contracts, gigOrders, tab, search, sortBy]);

  const totalPages = Math.ceil(filteredWorkItems.length / PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    return filteredWorkItems.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  }, [filteredWorkItems, page]);

  // Submit delivery
  const submitDelivery = async () => {
    if (!deliverFor) return;
    if (!delivery.message.trim() && !delivery.links.trim()) {
      showToast('Please add a delivery note or at least one link.', 'warning');
      return;
    }
    setDelivering(true);
    try {
      const externalLinks = delivery.links.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      if (deliverFor.isGig) {
        await jobsAPI.submitGigDelivery(deliverFor._id, { message: delivery.message.trim(), links: externalLinks });
      } else {
        await deliveriesAPI.submitDelivery(deliverFor._id, { message: delivery.message.trim(), externalLinks });
      }
      showToast('Work delivered successfully! The client has been notified to review.', 'success');
      setDeliverFor(null);
      setDelivery({ message: '', links: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit delivery.', 'error');
    } finally {
      setDelivering(false);
    }
  };

  // Hourly timer operations
  const toggleTimer = async (contractId, isActive) => {
    try {
      setTracking(prev => ({ ...prev, [contractId]: true }));
      if (isActive) {
        const { data } = await timeTrackingAPI.stopTimer(contractId);
        showToast(data?.data?.needsTopUp ? 'Timer stopped — escrow is running low.' : 'Timer stopped and payout logged.', 'success');
      } else {
        await timeTrackingAPI.startTimer(contractId);
        showToast('Timer started successfully.');
      }
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle timer.', 'error');
    } finally {
      setTracking(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const submitManualLog = async () => {
    if (!manualLogFor) return;
    if (!manualLog.startTime || !manualLog.endTime) {
      showToast('Set both start and end time.', 'warning');
      return;
    }
    setLoggingManual(true);
    try {
      await timeTrackingAPI.addManualLog(manualLogFor._id, {
        startTime: new Date(manualLog.startTime).toISOString(),
        endTime: new Date(manualLog.endTime).toISOString(),
        notes: manualLog.notes.trim(),
      });
      showToast('Manual hours logged successfully.', 'success');
      setManualLogFor(null);
      setManualLog({ startTime: '', endTime: '', notes: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log hours.', 'error');
    } finally {
      setLoggingManual(false);
    }
  };

  const handleRequestEnd = async (e) => {
    e.preventDefault();
    if (!endReason) return;
    try {
      setDelivering(true);
      await contractsAPI.requestEnd(endRequestModal.contractId, endReason, endDetails);
      showToast('End contract request sent to client.');
      setEndRequestModal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send request.', 'error');
    } finally {
      setDelivering(false);
    }
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (disputeReason.trim().length < 5) {
      showToast('Dispute reason must be at least 5 characters.', 'error');
      return;
    }
    try {
      setDelivering(true);
      await contractsAPI.raiseDispute(disputeModal.contractId, disputeReason, disputeDesc);
      showToast('Dispute raised. Admin will review the project details.');
      setDisputeModal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to raise dispute.', 'error');
    } finally {
      setDelivering(false);
    }
  };

  const toggleExpandCard = (id) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="fl-work-page">
        <Loader fullScreen text="Loading your contracts and deliverables..." />
      </div>
    );
  }

  return (
    <div className="fl-work-page">
      {/* ─── Header ─── */}
      <div className="fl-work-header">
        <div>
          <nav className="fl-work-breadcrumb" aria-label="Breadcrumb">
            <Link to="/freelancer/dashboard">Dashboard</Link>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ color: '#10B981' }}>My Work</span>
          </nav>
          <h1 className="fl-work-title">My Work</h1>
          <p className="fl-work-sub">
            Track active milestones, time logs, client revisions, and releases in real time.
          </p>
        </div>

        <Link to="/browse-projects" className="fl-gigs-header__cta">
          <Search size={15} />
          <span>Find Work</span>
        </Link>
      </div>

      {/* ─── Bento Summary Row ─── */}
      <section className="fl-work-summary-grid" aria-label="Earnings and Contracts Summary">
        <div className="fl-work-hero-card">
          <div>
            <span className="fl-work-hero-label">Total Earned</span>
            <div className="fl-work-hero-value">Rs. {totalEarned.toLocaleString()}</div>
          </div>
          <span className="fl-work-hero-sub">Released from completed milestone deliverables</span>
        </div>

        <div className="fl-work-kpi-card">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={20} />
          </div>
          <div>
            <div className="fl-work-kpi-val">{activeContractsCount}</div>
            <div className="fl-work-kpi-label">Active Contracts</div>
          </div>
        </div>

        <div className="fl-work-kpi-card">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="fl-work-kpi-val">Rs. {totalInEscrow.toLocaleString()}</div>
            <div className="fl-work-kpi-label">In Escrow</div>
          </div>
        </div>

        <div className="fl-work-kpi-card">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="fl-work-kpi-val">{completedContractsCount}</div>
            <div className="fl-work-kpi-label">Completed</div>
          </div>
        </div>
      </section>

      {/* ─── Toolbar ─── */}
      <div className="fl-gigs-toolbar">
        <div className="fl-gigs-toolbar__left">
          {/* Status Tabs */}
          <div className="fl-status-tabs-pill">
            {[
              { key: 'active',    label: 'In Progress', count: activeContractsCount },
              { key: 'completed', label: 'Completed',   count: completedContractsCount },
              { key: 'all',       label: 'All Work',    count: contracts.length + gigOrders.length },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                className={`fl-status-tab-btn ${tab === t.key ? 'fl-status-tab-btn--active' : ''}`}
                onClick={() => { setTab(t.key); setPage(1); }}
              >
                <span>{t.label}</span>
                <span className="fl-status-tab-badge">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Search Pill */}
          <div className="fl-search-pill">
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search contracts or clients..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="fl-gigs-toolbar__right">
          <select
            className="fl-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label="Sort contracts"
          >
            <option value="newest">Sort: Newest</option>
            <option value="amount">Sort: Highest Value</option>
          </select>
        </div>
      </div>

      {/* ─── Contract Cards List ─── */}
      {paginatedItems.length === 0 ? (
        <div className="fl-gigs-empty-card">
          <div className="fl-gigs-empty-card__icon">
            <Briefcase size={28} />
          </div>
          <h3 className="fl-gigs-empty-card__title">
            {search ? 'No work matches your search' : 'No contracts in this view'}
          </h3>
          <p className="fl-gigs-empty-card__sub">
            {search
              ? 'Try searching with a different client name or project keyword.'
              : 'Submit proposals on open client projects or offer fixed-price gigs to start contracts.'}
          </p>
          <Link to="/browse-projects" className="fl-gigs-header__cta">
            <Search size={15} />
            <span>Browse Open Projects</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {paginatedItems.map(item => {
            const isGig = item.isGig;
            const stage = STAGES[item.status] || { label: item.status, tone: 'active' };
            const isFixed = item.type === 'fixed' || isGig;
            const isHourly = item.type === 'hourly' && !isGig;
            const client = item.clientId || item.client || {};
            const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.name || 'Client';
            const clientInitial = clientName.charAt(0).toUpperCase() || 'C';
            const contractTitle = item.title || item.jobId?.title || (isGig ? 'Gig Order' : 'Contract');
            const isCompleted = item.status === 'completed';
            const isExpanded = expandedCardIds.has(item._id) || !isCompleted;

            // Escrow info
            const agreedAmount = item.fixedPrice || item.budget?.amount || item.totalAmount || item.payment?.totalAmount || 0;
            const payoutAmount = item.payment?.freelancerPayout || (agreedAmount * 0.9);
            const isPaid = item.payment?.status === 'released';

            // Milestone progress
            const milestones = Array.isArray(item.milestones) ? item.milestones : [];
            const releasedCount = milestones.filter(m => m.status === 'released').length;
            const currentMilestone = item.currentMilestone;
            const canDeliver = isFixed && (item.status === 'in-progress' || item.status === 'active' || item.status === 'in_revision');

            const isRevision = !item.delivery && !!item.lastRevision?.note && item.status === 'in-progress';
            const timerActive = isHourly && item.timer?.isActive;

            return (
              <article key={item._id} className="fl-contract-row-card">
                {/* 4px Status Accent Bar */}
                <div className={`fl-contract-status-bar fl-contract-status-bar--${stage.tone}`} />

                {/* Row 1: Client Avatar, Title, Chips, Status Pill */}
                <div className="fl-contract-head-row">
                  <div className="fl-contract-head-left">
                    <div className="fl-client-avatar-circle">
                      {clientInitial}
                    </div>
                    <div className="fl-contract-title-wrap">
                      <h3 className="fl-contract-title" title={contractTitle}>
                        {contractTitle}
                      </h3>
                      <div className="fl-contract-subline">
                        <span className="sk-gig-card__skill-chip" style={{ fontSize: 10.5 }}>
                          {isHourly ? 'Hourly Rate' : 'Fixed Price'}
                        </span>
                        {item.jobId?.category && (
                          <span style={{ color: '#64748B' }}>{item.jobId.category}</span>
                        )}
                        <span>•</span>
                        <span>Client: <strong>{clientName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`sk-badge sk-badge--status-${isCompleted ? 'active' : 'paused'}`}>
                      <span className="sk-badge__status-dot" />
                      {stage.label}
                    </span>
                    {isCompleted && (
                      <button
                        type="button"
                        className="sk-icon-btn"
                        style={{ width: 30, height: 30 }}
                        onClick={() => toggleExpandCard(item._id)}
                        title={isExpanded ? 'Collapse card' : 'Expand card details'}
                      >
                        <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <>
                    {/* Row 2: Financials Strip (4 plain columns with dividers) */}
                    <div className="fl-contract-fin-strip">
                      <div className="fl-contract-fin-col">
                        <span className="fl-contract-fin-label">AGREED BUDGET</span>
                        <span className="fl-contract-fin-val">Rs. {Number(agreedAmount).toLocaleString()}</span>
                      </div>

                      <div className="fl-contract-fin-col">
                        <span className="fl-contract-fin-label">{isHourly ? 'RATE' : 'FUNDED IN ESCROW'}</span>
                        <span className="fl-contract-fin-val">
                          {isHourly ? `Rs. ${item.hourlyRate}/hr` : (item.payment?.status === 'deposit_paid' ? '100% Funded' : 'Active')}
                        </span>
                      </div>

                      <div className="fl-contract-fin-col">
                        <span className="fl-contract-fin-label">RELEASED TO YOU</span>
                        <span className="fl-contract-fin-val" style={{ color: isPaid ? '#10B981' : '#64748B' }}>
                          {isPaid ? `Rs. ${Number(payoutAmount).toLocaleString()}` : 'Pending Delivery'}
                        </span>
                      </div>

                      <div className="fl-contract-fin-col">
                        <span className="fl-contract-fin-label">{isHourly ? 'WEEKLY LIMIT' : 'YOU RECEIVE'}</span>
                        <span className="fl-contract-fin-val">
                          {isHourly ? `${item.weeklyLimit || 40} hrs/wk` : `Rs. ${Number(payoutAmount).toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Prominent revision banner if client requested changes */}
                    {isRevision && (
                      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: 14, color: '#78350F' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                          <RefreshCw size={15} color="#D97706" /> Client Requested Revision:
                        </div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                          {item.lastRevision?.note}
                        </p>
                      </div>
                    )}

                    {/* Order Requirements drawer if gig order */}
                    {isGig && item.requirements && (
                      <OrderRequirements
                        requirements={item.requirements}
                        scope={item.customOfferId ? item.description : undefined}
                        title={item.customOfferId ? 'Offer scope & client notes' : 'Client requirements'}
                        defaultOpen={!isCompleted}
                      />
                    )}

                    {/* Row 3: Milestone Timeline Stepper (if fixed price with milestones) */}
                    {isFixed && milestones.length > 0 && (
                      <div className="fl-milestones-row">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                            Milestone Deliverables ({releasedCount}/{milestones.length} released)
                          </span>
                        </div>

                        <div className="fl-milestones-track">
                          {milestones.map((m, mIdx) => {
                            const isReleased = m.status === 'released';
                            const isFunded = m.status === 'funded';
                            return (
                              <div key={m._id || mIdx} className="fl-milestone-node-item">
                                <div className={`fl-milestone-dot ${isReleased ? 'fl-milestone-dot--released' : isFunded ? 'fl-milestone-dot--funded' : 'fl-milestone-dot--pending'}`}>
                                  {isReleased ? <Check size={13} /> : m.order || mIdx + 1}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>{m.title}</span>
                                  <span style={{ fontSize: 11, color: '#64748B' }}>Rs. {Number(m.amount).toLocaleString()}</span>
                                </div>
                                {mIdx < milestones.length - 1 && (
                                  <div className={`fl-milestone-line ${isReleased ? 'fl-milestone-line--active' : ''}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {currentMilestone?.status === 'funded' && (
                          <div className="fl-escrow-banner">
                            <CheckCircle2 size={15} color="#10B981" />
                            <span>Escrow Funded 100% — safe to work on Milestone {currentMilestone.order}!</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hourly Timer Bar */}
                    {isHourly && (
                      <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 14, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: timerActive ? '#059669' : '#0B2942' }}>
                            <Circle size={10} fill={timerActive ? '#10B981' : '#CBD5E1'} color="none" />
                            <span>{timerActive ? 'Timer running:' : 'Timer idle'}</span>
                            {timerActive && (
                              <LiveTimer startedAt={item.timer?.startedAt} hourlyRate={item.hourlyRate} />
                            )}
                          </div>
                          <span style={{ fontSize: 11.5, color: '#64748B' }}>
                            Total logged: {Math.floor((item.totalDuration || 0) / 3600000)}h {Math.floor(((item.totalDuration || 0) % 3600000) / 60000)}m
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          {timerActive ? (
                            <button
                              type="button"
                              className="sk-pill-action-btn"
                              style={{ background: '#EF4444', color: '#FFF', borderColor: '#EF4444' }}
                              onClick={() => toggleTimer(item._id, true)}
                              disabled={tracking[item._id]}
                            >
                              <Square size={13} /> Stop Timer
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="fl-gigs-header__cta"
                              style={{ height: 36, padding: '0 16px', fontSize: 12.5 }}
                              onClick={() => toggleTimer(item._id, false)}
                              disabled={tracking[item._id]}
                            >
                              <Play size={13} /> Start Timer
                            </button>
                          )}
                          <button
                            type="button"
                            className="sk-pill-action-btn"
                            style={{ height: 36, padding: '0 14px', fontSize: 12.5 }}
                            onClick={() => { setManualLogFor(item); setManualLog({ startTime: '', endTime: '', notes: '' }); }}
                          >
                            <Clock size={13} /> Log Hours
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Row 4: Actions Bar */}
                    <div className="fl-contract-actions-row">
                      <div className="fl-contract-actions-left">
                        {item.jobId?._id && (
                          <Link to={`/jobs/${item.jobId._id}`} className="sk-pill-action-btn">
                            View Details
                          </Link>
                        )}
                        <Link to="/freelancer/messages" className="sk-pill-action-btn">
                          <MessageSquare size={13} /> Contact Client
                        </Link>
                        {canDeliver && (
                          <button
                            type="button"
                            className="fl-gigs-header__cta"
                            style={{ height: 36, padding: '0 18px', fontSize: 12.5 }}
                            onClick={() => {
                              setDeliverFor(item);
                              setDelivery({ message: '', links: '' });
                            }}
                          >
                            <UploadCloud size={14} />
                            <span>{isRevision ? 'Submit Revised Work' : 'Submit Work'}</span>
                          </button>
                        )}
                        {isCompleted && !item.hasReviewed && (
                          <button
                            type="button"
                            className="sk-pill-action-btn"
                            onClick={() => setReviewModal({ jobId: item.jobId?._id, targetName: clientName })}
                          >
                            <Star size={13} color="#F59E0B" /> Leave Review
                          </button>
                        )}
                      </div>

                      {/* Dispute / End button far right */}
                      <div>
                        {!isCompleted && (
                          <button
                            type="button"
                            className="sk-icon-btn sk-icon-btn--danger"
                            onClick={() => setDisputeModal({ contractId: item._id })}
                            title="Raise contract dispute"
                          >
                            <AlertTriangle size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="bg-pagination">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`fl-status-tab-btn ${page === i + 1 ? 'fl-status-tab-btn--active' : ''}`}
              style={{ width: 38, height: 38, padding: 0, justifyContent: 'center' }}
              onClick={() => {
                setPage(i + 1);
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ─── Submit Work Modal ─── */}
      {deliverFor && (
        <div className="fl-edit-sheet-overlay" onClick={closeDeliverModal}>
          <div
            ref={deliverModalRef}
            className="fl-form-card"
            style={{ maxWidth: 540, width: '100%', margin: 'auto' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Submit Work Delivery"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0B2942' }}>
                  {deliverFor.lastRevision?.note ? 'Submit Revised Work' : 'Submit Milestone Delivery'}
                </h3>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  {deliverFor.title || deliverFor.jobId?.title}
                </span>
              </div>
              <button type="button" className="sk-icon-btn" onClick={closeDeliverModal}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
              <div className="fl-field">
                <label className="fl-field__label fl-field__label--required">Delivery Note</label>
                <textarea
                  className="fl-field__textarea"
                  style={{ minHeight: 90 }}
                  placeholder="Describe your deliverables, completed features, or deployment instructions..."
                  value={delivery.message}
                  onChange={e => setDelivery(d => ({ ...d, message: e.target.value }))}
                />
              </div>

              <div className="fl-field">
                <label className="fl-field__label">Project Links</label>
                <textarea
                  className="fl-field__textarea"
                  style={{ minHeight: 70 }}
                  placeholder="https://github.com/... or Google Drive links (one per line)"
                  value={delivery.links}
                  onChange={e => setDelivery(d => ({ ...d, links: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
              <button type="button" className="sk-pill-action-btn" onClick={closeDeliverModal} disabled={delivering}>
                Cancel
              </button>
              <button
                type="button"
                className="fl-gigs-header__cta"
                style={{ height: 40, padding: '0 20px', fontSize: 13 }}
                onClick={submitDelivery}
                disabled={delivering}
              >
                {delivering ? 'Submitting...' : 'Deliver to Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Raise Dispute Modal ─── */}
      <Modal open={!!disputeModal} title="Raise Dispute" onClose={() => setDisputeModal(null)}>
        <p style={{ margin: '0 0 14px 0', fontSize: 13.5, color: '#64748B' }}>
          If you and the client cannot resolve milestone requirements or funding, you can escalate this contract to Admin arbitration.
        </p>
        <form onSubmit={handleRaiseDispute} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fl-field">
            <label className="fl-field__label fl-field__label--required">Reason for Dispute</label>
            <input
              type="text"
              className="fl-field__input"
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              placeholder="e.g. Client is unresponsive or requesting out-of-scope work"
              required
            />
          </div>
          <div className="fl-field">
            <label className="fl-field__label">Additional Details</label>
            <textarea
              className="fl-field__textarea"
              style={{ minHeight: 80 }}
              value={disputeDesc}
              onChange={e => setDisputeDesc(e.target.value)}
              placeholder="Provide context for admin review..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="sk-pill-action-btn" onClick={() => setDisputeModal(null)} disabled={delivering}>Cancel</button>
            <button type="submit" className="sk-pill-action-btn" style={{ background: '#EF4444', color: '#FFF', borderColor: '#EF4444' }} disabled={delivering}>
              Raise Dispute
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Manual Log Modal ─── */}
      <Modal open={!!manualLogFor} title={`Log Hours — ${manualLogFor?.title || ''}`} onClose={() => { if (!loggingManual) setManualLogFor(null); }}>
        <form onSubmit={e => { e.preventDefault(); submitManualLog(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fl-field">
            <label className="fl-field__label fl-field__label--required">Start Time</label>
            <input
              type="datetime-local"
              className="fl-field__input"
              value={manualLog.startTime}
              onChange={e => setManualLog(p => ({ ...p, startTime: e.target.value }))}
              required
            />
          </div>
          <div className="fl-field">
            <label className="fl-field__label fl-field__label--required">End Time</label>
            <input
              type="datetime-local"
              className="fl-field__input"
              value={manualLog.endTime}
              onChange={e => setManualLog(p => ({ ...p, endTime: e.target.value }))}
              required
            />
          </div>
          <div className="fl-field">
            <label className="fl-field__label">Notes</label>
            <textarea
              className="fl-field__textarea"
              style={{ minHeight: 60 }}
              value={manualLog.notes}
              onChange={e => setManualLog(p => ({ ...p, notes: e.target.value }))}
              placeholder="What tasks were completed?"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="sk-pill-action-btn" onClick={() => setManualLogFor(null)} disabled={loggingManual}>Cancel</button>
            <button type="submit" className="fl-gigs-header__cta" style={{ height: 40, padding: '0 20px', fontSize: 13 }} disabled={loggingManual}>
              {loggingManual ? 'Logging...' : 'Log Time'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      {reviewModal && (
        <ReviewModal
          jobId={reviewModal.jobId}
          targetName={reviewModal.targetName}
          onClose={() => setReviewModal(null)}
          onSuccess={() => { setReviewModal(null); load(); }}
        />
      )}
    </div>
  );
}
