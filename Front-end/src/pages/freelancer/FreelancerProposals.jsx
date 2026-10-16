import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { proposalsAPI } from '../../api/proposals';
import { useAuth } from '../../hooks/useAuth';
import {
  Clock, ExternalLink, UploadCloud, X, FileText, CheckCircle2,
  XCircle, Flag, Edit2, RotateCcw, Search, Filter, LayoutGrid,
  List, ArrowUpDown, ChevronRight, ChevronLeft, Send, Sparkles,
  AlertCircle, MessageSquare, Briefcase, Calendar, DollarSign
} from 'lucide-react';
import Loader from '../../Components/common/Loader/Loader';
import Modal from '../../Components/common/Modal/Modal';
import ConfirmDialog from '../../Components/common/ConfirmDialog/ConfirmDialog';
import CustomSelect from '../../Components/common/CustomSelect/CustomSelect';
import ProgressRing from './components/ProgressRing';
import Reveal, { useInView } from './components/Reveal';
import { useCountUp } from './components/BentoKPI';
import { safeToast as toast } from '../../utils/safeToast';
import './FreelancerProposals.css';

const DELIVERY_OPTIONS = ['Less than 1 week', '1-2 weeks', '1 month', '3+ months'];

/* ─── Compact Stat Card with Count-up ─── */
const StatCard = ({ label, count, icon: Icon, iconBg, iconColor, accentColor }) => {
  const [ref, inView] = useInView();
  const animatedCount = useCountUp(count, inView, 900);

  return (
    <div className="fl-prop-stat-card" ref={ref}>
      <div className="fl-prop-stat-card__accent" style={{ background: accentColor }} />
      <div className="fl-prop-stat-card__top">
        <span className="fl-prop-stat-card__mono">{label}</span>
        <div className="fl-prop-stat-card__icon-box" style={{ background: iconBg, color: iconColor }}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      </div>
      <div className="fl-prop-stat-card__bottom">
        <span className="fl-prop-stat-card__val">{animatedCount}</span>
        <span className="fl-prop-stat-card__sub">Bids</span>
      </div>
    </div>
  );
};

export default function FreelancerProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'table' : 'cards'));
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Drawer & feedback expansion
  const [drawerProposal, setDrawerProposal] = useState(null);
  const [expandedFeedback, setExpandedFeedback] = useState({});

  // Edit / Withdraw states
  const [editingProposal, setEditingProposal] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [withdrawConfirmId, setWithdrawConfirmId] = useState(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  // Sync default view mode on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'table') {
        setViewMode('cards');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Drawer escape key support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && drawerProposal) {
        setDrawerProposal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerProposal]);

  const fetchProposals = async () => {
    try {
      const res = await proposalsAPI.listProposals({ freelancerId: user?._id });
      setProposals(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      toast.error('Failed to load your proposals.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (id) => {
    if (withdrawingId) return;
    setWithdrawingId(id);
    try {
      await proposalsAPI.withdrawProposal(id);
      toast.success('Proposal withdrawn.');
      if (drawerProposal?._id === id) setDrawerProposal(null);
      fetchProposals();
    } catch {
      toast.error('Failed to withdraw proposal.');
    } finally {
      setWithdrawingId(null);
      setWithdrawConfirmId(null);
    }
  };

  const isResubmit = (prop) => prop?.status === 'rejected' && prop?.canResubmit;

  const openEdit = (prop) => {
    setEditingProposal(prop);
    setEditForm({
      coverLetter: prop.coverLetter || '',
      fixedPrice: prop.fixedPrice ?? '',
      hourlyRate: prop.hourlyRate ?? '',
      estimatedDeliveryTime: prop.estimatedDeliveryTime || '1-2 weeks',
      estimatedWeeklyHours: prop.estimatedWeeklyHours ?? ''
    });
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditingProposal(null);
    setEditForm(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProposal || !editForm) return;
    const cover = editForm.coverLetter.trim();
    if (cover.length < 100) {
      toast.error(`Cover letter must be at least 100 characters (currently ${cover.length}).`);
      return;
    }
    if (cover.length > 2000) {
      toast.error('Cover letter must be at most 2000 characters.');
      return;
    }
    const isHourly = editingProposal.jobId?.budget?.type === 'hourly';
    const payload = { coverLetter: editForm.coverLetter };
    if (isHourly) {
      const rate = Number(editForm.hourlyRate);
      if (!rate || rate <= 0) {
        toast.error('Enter a valid hourly rate greater than 0.');
        return;
      }
      const hrs = Number(editForm.estimatedWeeklyHours);
      if (!hrs || hrs <= 0 || hrs > 168) {
        toast.error('Enter a valid number of weekly hours (1-168).');
        return;
      }
      payload.hourlyRate = rate;
      payload.estimatedWeeklyHours = hrs;
    } else {
      const price = Number(editForm.fixedPrice);
      if (!price || price <= 0) {
        toast.error('Enter a valid fixed price greater than 0.');
        return;
      }
      payload.fixedPrice = price;
      payload.estimatedDeliveryTime = editForm.estimatedDeliveryTime;
    }
    const resubmitting = isResubmit(editingProposal);
    setSavingEdit(true);
    try {
      await proposalsAPI.updateProposal(editingProposal._id, payload);
      toast.success(resubmitting ? 'Proposal revised and resubmitted!' : 'Proposal updated.');
      setEditingProposal(null);
      setEditForm(null);
      if (drawerProposal?._id === editingProposal._id) setDrawerProposal(null);
      fetchProposals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update proposal.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleFeedback = (id) => {
    setExpandedFeedback(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── Filter & Sort computation ── */
  const counts = useMemo(() => {
    const total = proposals.length;
    const pending = proposals.filter(p => p.status === 'pending').length;
    const accepted = proposals.filter(p => p.status === 'accepted').length;
    const inProgress = proposals.filter(p => p.status === 'accepted' && p.jobId?.status === 'in-progress').length;
    const rejected = proposals.filter(p => p.status === 'rejected').length;
    const withdrawn = proposals.filter(p => p.status === 'withdrawn').length;
    const winRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, pending, accepted, inProgress, rejected, withdrawn, winRate };
  }, [proposals]);

  const filtered = useMemo(() => {
    let list = proposals.filter(p => {
      if (tab === 'all') return true;
      if (tab === 'in-progress') return p.status === 'accepted' && p.jobId?.status === 'in-progress';
      return p.status === tab;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.jobId?.title || '').toLowerCase().includes(q) ||
        (p.jobId?.category || '').toLowerCase().includes(q)
      );
    }

    if (sort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'highest_bid') {
      list.sort((a, b) => {
        const valA = Number(a.fixedPrice || a.hourlyRate || 0);
        const valB = Number(b.fixedPrice || b.hourlyRate || 0);
        return valB - valA;
      });
    }

    return list;
  }, [proposals, tab, search, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedList = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  if (loading) {
    return <Loader fullScreen text="Loading" />;
  }

  const getStatusDisplay = (prop) => {
    if (prop.status === 'accepted' && prop.jobId?.status === 'in-progress') {
      return { label: 'In Progress', cls: 'in-progress', step: 2 };
    }
    if (prop.status === 'accepted') {
      return { label: 'Accepted', cls: 'accepted', step: 3 };
    }
    if (prop.status === 'rejected') {
      return { label: 'Rejected', cls: 'rejected', step: 3 };
    }
    if (prop.status === 'withdrawn') {
      return { label: 'Withdrawn', cls: 'withdrawn', step: 1 };
    }
    return { label: 'Pending', cls: 'pending', step: 2 };
  };

  return (
    <div className="fl-proposals-page">
      {/* ── A) PAGE HEADER ── */}
      <div className="fl-prop-header">
        <div className="fl-prop-header__left">
          <nav className="fl-prop-breadcrumb" aria-label="Breadcrumb">
            <Link to="/freelancer/dashboard">Dashboard</Link>
            <span className="fl-prop-breadcrumb__sep">/</span>
            <span className="fl-prop-breadcrumb__curr">My Proposals</span>
          </nav>
          <h1 className="fl-prop-header__title">My Proposals</h1>
          <p className="fl-prop-header__sub">Track the status of your submitted project bids.</p>
        </div>
        <Link to="/browse-projects" className="fl-prop-header__cta">
          <Search size={15} /> Find Work
        </Link>
      </div>

      {/* ── B) STATS STRIP ── */}
      <Reveal delay={50}>
        <div className="fl-prop-stats">
          <StatCard
            label="Total Sent"
            count={counts.total}
            icon={Send}
            iconBg="#EAFBF4"
            iconColor="#10B981"
            accentColor="#10B981"
          />
          <StatCard
            label="Pending"
            count={counts.pending}
            icon={Clock}
            iconBg="#FEF3C7"
            iconColor="#D97706"
            accentColor="#F59E0B"
          />
          <StatCard
            label="Accepted"
            count={counts.accepted}
            icon={CheckCircle2}
            iconBg="#DCFCE7"
            iconColor="#16A34A"
            accentColor="#10B981"
          />
          <StatCard
            label="Rejected"
            count={counts.rejected}
            icon={XCircle}
            iconBg="#FEE2E2"
            iconColor="#DC2626"
            accentColor="#EF4444"
          />
          {/* 5th element: Win Rate Ring */}
          <div className="fl-prop-stat-card" style={{ alignItems: 'center', justifyContent: 'center', padding: '14px 20px' }}>
            <div className="fl-prop-stat-card__accent" style={{ background: '#0B2942' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ProgressRing
                percent={counts.winRate}
                size={58}
                strokeWidth={5.5}
                color="#10B981"
                bgColor="#E2E8F0"
                textColor="#0B2942"
                textSize={14}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="fl-prop-stat-card__mono">Win Rate</span>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Proposal Success</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── C) TOOLBAR ── */}
      <div className="fl-prop-toolbar">
        {/* Status filter pill tabs */}
        <div className="fl-prop-toolbar__tabs" role="tablist">
          {[
            { id: 'all', label: 'All', count: counts.total },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'accepted', label: 'Accepted', count: counts.accepted },
            { id: 'in-progress', label: 'In Progress', count: counts.inProgress },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
            ...(counts.withdrawn > 0 ? [{ id: 'withdrawn', label: 'Withdrawn', count: counts.withdrawn }] : [])
          ].map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`fl-prop-tab${tab === t.id ? ' fl-prop-tab--active' : ''}`}
              onClick={() => { setTab(t.id); setPage(1); }}
            >
              <span>{t.label}</span>
              <span className="fl-prop-tab__cnt">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Search, Sort, View Toggle */}
        <div className="fl-prop-toolbar__controls">
          <div className="fl-prop-search">
            <Search size={14} className="fl-prop-search__icon" />
            <input
              type="text"
              className="fl-prop-search__input"
              placeholder="Search project title…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="fl-prop-search__clear" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            className="fl-prop-sort-select"
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label="Sort proposals"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_bid">Highest Bid</option>
          </select>

          <div className="fl-prop-view-toggle" role="group" aria-label="View toggle">
            <button
              className={`fl-prop-view-btn${viewMode === 'cards' ? ' fl-prop-view-btn--active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards view"
              aria-label="Cards view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`fl-prop-view-btn${viewMode === 'table' ? ' fl-prop-view-btn--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
              aria-label="Table view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── EMPTY STATES ── */}
      {filtered.length === 0 ? (
        <div className="fl-prop-card fl-prop-empty">
          <div className="fl-prop-empty__icon-circle">
            <FileText size={28} />
          </div>
          <h3 className="fl-prop-empty__title">
            {search || tab !== 'all' ? 'No proposals found' : 'No proposals yet'}
          </h3>
          <p className="fl-prop-empty__desc">
            {search || tab !== 'all'
              ? 'Try adjusting your search keywords or switching filters to see more results.'
              : 'You have not submitted any project proposals yet. Explore available jobs and submit your first bid!'}
          </p>
          {search || tab !== 'all' ? (
            <button
              className="fl-prop-btn fl-prop-btn--outline"
              onClick={() => { setSearch(''); setTab('all'); }}
            >
              Clear Filters
            </button>
          ) : (
            <Link to="/browse-projects" className="fl-prop-header__cta">
              Browse Open Projects
            </Link>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* ── D) CARDS VIEW ── */
        <div className="fl-prop-cards-list">
          {paginatedList.map((prop, idx) => {
            const { label: statusLabel, cls: statusCls, step } = getStatusDisplay(prop);
            const isHourly = prop.jobId?.budget?.type === 'hourly' || !!prop.hourlyRate;
            const bidDisplay = isHourly
              ? `Rs. ${(prop.hourlyRate || 0).toLocaleString()}/hr`
              : `Rs. ${(prop.fixedPrice || 0).toLocaleString()}`;
            const durationDisplay = prop.estimatedDeliveryTime || (prop.estimatedWeeklyHours ? `${prop.estimatedWeeklyHours} hrs/wk` : '—');
            const submittedDate = prop.createdAt ? new Date(prop.createdAt).toLocaleDateString() : '—';
            const hasFeedback = Boolean(prop.clientResponse);
            const isFeedbackOpen = Boolean(expandedFeedback[prop._id]);

            return (
              <Reveal key={prop._id} delay={idx * 40}>
                <div className="fl-prop-card">
                  <div className={`fl-prop-card__indicator fl-prop-card__indicator--${statusCls}`} />
                  
                  <div className="fl-prop-card__main">
                    {/* Block 1: Project info */}
                    <div className="fl-prop-card__project">
                      <Link to={`/jobs/${prop.jobId?._id}`} className="fl-prop-card__title" title={prop.jobId?.title || 'Project'}>
                        {prop.jobId?.title || 'Project'}
                      </Link>
                      <div className="fl-prop-card__meta-tags">
                        {prop.jobId?.category && (
                          <span className="fl-prop-category-chip">{prop.jobId.category}</span>
                        )}
                        <span className="fl-prop-date-sub">Submitted {submittedDate}</span>
                      </div>
                    </div>

                    {/* Block 2: 3 Mini Meta Columns */}
                    <div className="fl-prop-card__metrics">
                      <div className="fl-prop-metric">
                        <span className="fl-prop-metric__label">YOUR BID</span>
                        <span className="fl-prop-metric__val">{bidDisplay}</span>
                      </div>
                      <div className="fl-prop-metric">
                        <span className="fl-prop-metric__label">DURATION</span>
                        <span className="fl-prop-metric__val">{durationDisplay}</span>
                      </div>
                      <div className="fl-prop-metric">
                        <span className="fl-prop-metric__label">SUBMITTED</span>
                        <span className="fl-prop-metric__val">{submittedDate}</span>
                      </div>
                    </div>

                    {/* Block 3: Status & 3-Dot Pipeline */}
                    <div className="fl-prop-card__status-col">
                      <span className={`fl-prop-status-chip fl-prop-status-chip--${statusCls}`}>
                        <span className="fl-prop-status-chip__dot" />
                        {statusLabel}
                      </span>
                      <div className="fl-prop-pipeline" title={`Pipeline Stage: ${step}/3`}>
                        <div className="fl-prop-pipeline__step">
                          <span className="fl-prop-pipeline__dot fl-prop-pipeline__dot--active" />
                          <span className={`fl-prop-pipeline__line${step >= 2 ? ' fl-prop-pipeline__line--active' : ''}`} />
                        </div>
                        <div className="fl-prop-pipeline__step">
                          <span className={`fl-prop-pipeline__dot${step >= 2 ? ' fl-prop-pipeline__dot--active' : ''}`} />
                          <span className={`fl-prop-pipeline__line${step >= 3 ? ' fl-prop-pipeline__line--active' : ''}`} />
                        </div>
                        <div className="fl-prop-pipeline__step">
                          <span className={`fl-prop-pipeline__dot${step >= 3 ? ' fl-prop-pipeline__dot--active' : ''}`} />
                        </div>
                        <span className="fl-prop-pipeline__lbl" style={{ marginLeft: 6 }}>
                          {step === 1 ? 'Sent' : step === 2 ? 'Reviewed' : 'Decision'}
                        </span>
                      </div>
                    </div>

                    {/* Block 4: Actions */}
                    <div className="fl-prop-card__actions">
                      <Link to={`/jobs/${prop.jobId?._id}`} className="fl-prop-btn fl-prop-btn--outline">
                        View Project <ExternalLink size={12} />
                      </Link>

                      {prop.status === 'accepted' && prop.jobId?.status === 'in-progress' && (
                        <Link to="/freelancer/work" className="fl-prop-btn fl-prop-btn--primary">
                          <UploadCloud size={13} /> Submit Work
                        </Link>
                      )}

                      {prop.status === 'pending' && prop.jobId?.status === 'open' && (
                        <button className="fl-prop-btn fl-prop-btn--outline" onClick={() => openEdit(prop)}>
                          <Edit2 size={13} /> Edit
                        </button>
                      )}

                      {isResubmit(prop) && prop.jobId?.status === 'open' && (
                        <button className="fl-prop-btn fl-prop-btn--accent" onClick={() => openEdit(prop)}>
                          <RotateCcw size={13} /> Edit & Resubmit
                        </button>
                      )}

                      {prop.status === 'pending' && (
                        <button
                          className="fl-prop-btn fl-prop-btn--danger-ghost"
                          onClick={() => setWithdrawConfirmId(prop._id)}
                          disabled={withdrawingId === prop._id}
                        >
                          {withdrawingId === prop._id ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Client Feedback Bar */}
                  {hasFeedback && (
                    <div className="fl-prop-card__feedback-bar">
                      <button
                        className="fl-prop-card__feedback-toggle"
                        onClick={() => toggleFeedback(prop._id)}
                      >
                        <MessageSquare size={14} />
                        <span>{isFeedbackOpen ? 'Hide client feedback' : 'Show client feedback'}</span>
                      </button>
                      <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
                        Feedback received
                      </span>
                    </div>
                  )}

                  {hasFeedback && isFeedbackOpen && (
                    <div className={`fl-prop-card__feedback-body fl-prop-card__feedback-body--${statusCls}`}>
                      <strong>Client message:</strong> {prop.clientResponse}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}

          {/* Cards View Pagination */}
          {totalPages > 1 && (
            <div className="fl-prop-table-footer" style={{ borderRadius: 22 }}>
              <span className="fl-prop-table-footer__text">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} proposals
              </span>
              <div className="fl-prop-pagination">
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
        </div>
      ) : (
        /* ── E) TABLE VIEW (Desktop Steadi Style) ── */
        <div className="fl-prop-table-card">
          <div className="fl-prop-table-wrap">
            <table className="fl-prop-table">
              <thead>
                <tr>
                  <th>PROJECT</th>
                  <th>BID</th>
                  <th>DURATION</th>
                  <th>SUBMITTED</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map(prop => {
                  const { label: statusLabel, cls: statusCls } = getStatusDisplay(prop);
                  const isHourly = prop.jobId?.budget?.type === 'hourly' || !!prop.hourlyRate;
                  const bidDisplay = isHourly
                    ? `Rs. ${(prop.hourlyRate || 0).toLocaleString()}/hr`
                    : `Rs. ${(prop.fixedPrice || 0).toLocaleString()}`;
                  const durationDisplay = prop.estimatedDeliveryTime || (prop.estimatedWeeklyHours ? `${prop.estimatedWeeklyHours} hrs/wk` : '—');
                  const submittedDate = prop.createdAt ? new Date(prop.createdAt).toLocaleDateString() : '—';

                  return (
                    <tr
                      key={prop._id}
                      onClick={() => setDrawerProposal(prop)}
                      title="Click row to view details"
                    >
                      <td>
                        <span className="fl-prop-table__title">
                          {prop.jobId?.title || 'Project'}
                        </span>
                        <div className="fl-prop-table__sub">
                          {prop.jobId?.category || 'General'}
                        </div>
                      </td>
                      <td>
                        <span className="fl-prop-table__amount">{bidDisplay}</span>
                      </td>
                      <td>
                        <span style={{ color: '#475569', fontWeight: 500 }}>{durationDisplay}</span>
                      </td>
                      <td>
                        <span style={{ color: '#64748B' }}>{submittedDate}</span>
                      </td>
                      <td>
                        <span className={`fl-prop-status-chip fl-prop-status-chip--${statusCls}`}>
                          <span className="fl-prop-status-chip__dot" />
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <Link
                            to={`/jobs/${prop.jobId?._id}`}
                            className="fl-prop-btn fl-prop-btn--outline"
                            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                          >
                            View
                          </Link>
                          {prop.status === 'accepted' && prop.jobId?.status === 'in-progress' && (
                            <Link
                              to="/freelancer/work"
                              className="fl-prop-btn fl-prop-btn--primary"
                              style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                            >
                              Work
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="fl-prop-table-footer">
            <span className="fl-prop-table-footer__text">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} proposals
            </span>
            {totalPages > 1 && (
              <div className="fl-prop-pagination">
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
            )}
          </div>
        </div>
      )}

      {/* ── RIGHT-SIDE DETAILS DRAWER ── */}
      {drawerProposal && (
        <div className="fl-prop-drawer-backdrop" onClick={() => setDrawerProposal(null)}>
          <div
            className="fl-prop-drawer"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Proposal Details"
          >
            <div className="fl-prop-drawer__header">
              <div style={{ minWidth: 0 }}>
                <span className="fl-prop-stat-card__mono" style={{ color: '#10B981' }}>Proposal Overview</span>
                <h3 className="fl-prop-drawer__title" style={{ marginTop: 2 }}>
                  {drawerProposal.jobId?.title || 'Project Details'}
                </h3>
              </div>
              <button
                className="fl-prop-drawer__close"
                onClick={() => setDrawerProposal(null)}
                aria-label="Close drawer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="fl-prop-drawer__body">
              {/* Status and category badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span className={`fl-prop-status-chip fl-prop-status-chip--${getStatusDisplay(drawerProposal).cls}`}>
                  <span className="fl-prop-status-chip__dot" />
                  {getStatusDisplay(drawerProposal).label}
                </span>
                {drawerProposal.jobId?.category && (
                  <span className="fl-prop-category-chip">{drawerProposal.jobId.category}</span>
                )}
              </div>

              {/* Grid with Key Numbers */}
              <div className="fl-prop-drawer__grid">
                <div>
                  <div className="fl-prop-drawer__section-title">YOUR PROPOSED BID</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0B2942' }}>
                    Rs. {(drawerProposal.fixedPrice || drawerProposal.hourlyRate || 0).toLocaleString()}
                    {drawerProposal.hourlyRate ? '/hr' : ''}
                  </div>
                </div>
                <div>
                  <div className="fl-prop-drawer__section-title">ESTIMATED TIME</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0B2942' }}>
                    {drawerProposal.estimatedDeliveryTime || (drawerProposal.estimatedWeeklyHours ? `${drawerProposal.estimatedWeeklyHours} hrs/wk` : '—')}
                  </div>
                </div>
                <div>
                  <div className="fl-prop-drawer__section-title">SUBMITTED ON</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>
                    {drawerProposal.createdAt ? new Date(drawerProposal.createdAt).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div>
                  <div className="fl-prop-drawer__section-title">CLIENT STATUS</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>
                    {drawerProposal.jobId?.status ? drawerProposal.jobId.status.toUpperCase() : 'ACTIVE'}
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <div className="fl-prop-drawer__section-title">COVER LETTER</div>
                <div className="fl-prop-drawer__cover-letter">
                  {drawerProposal.coverLetter || 'No cover letter provided.'}
                </div>
              </div>

              {/* Client Feedback Box */}
              {drawerProposal.clientResponse && (
                <div>
                  <div className="fl-prop-drawer__section-title">CLIENT FEEDBACK</div>
                  <div className={`fl-prop-card__feedback-body fl-prop-card__feedback-body--${getStatusDisplay(drawerProposal).cls}`} style={{ borderRadius: 14 }}>
                    {drawerProposal.clientResponse}
                  </div>
                </div>
              )}

              {/* Revision note if any */}
              {drawerProposal.jobId?.status === 'in-progress' && drawerProposal.jobId?.revisionNote && (
                <div style={{ padding: 14, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, color: '#92400E', fontSize: 13 }}>
                  <strong>Client Revision Request:</strong> {drawerProposal.jobId.revisionNote}
                </div>
              )}
            </div>

            <div className="fl-prop-drawer__footer">
              <Link to={`/jobs/${drawerProposal.jobId?._id}`} className="fl-prop-btn fl-prop-btn--outline">
                View Project <ExternalLink size={13} />
              </Link>
              {drawerProposal.status === 'accepted' && drawerProposal.jobId?.status === 'in-progress' && (
                <Link to="/freelancer/work" className="fl-prop-btn fl-prop-btn--primary">
                  <UploadCloud size={14} /> Submit Work
                </Link>
              )}
              {drawerProposal.status === 'pending' && drawerProposal.jobId?.status === 'open' && (
                <button className="fl-prop-btn fl-prop-btn--outline" onClick={() => openEdit(drawerProposal)}>
                  <Edit2 size={13} /> Edit Bid
                </button>
              )}
              {isResubmit(drawerProposal) && drawerProposal.jobId?.status === 'open' && (
                <button className="fl-prop-btn fl-prop-btn--accent" onClick={() => openEdit(drawerProposal)}>
                  <RotateCcw size={13} /> Resubmit
                </button>
              )}
              {drawerProposal.status === 'pending' && (
                <button
                  className="fl-prop-btn fl-prop-btn--danger-ghost"
                  onClick={() => setWithdrawConfirmId(drawerProposal._id)}
                  disabled={withdrawingId === drawerProposal._id}
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WITHDRAW CONFIRM DIALOG ── */}
      <ConfirmDialog
        open={!!withdrawConfirmId}
        title="Withdraw proposal?"
        message="Are you sure you want to withdraw this proposal? This action cannot be undone."
        confirmLabel="Withdraw Proposal"
        loading={!!withdrawingId}
        onConfirm={() => handleWithdraw(withdrawConfirmId)}
        onClose={() => setWithdrawConfirmId(null)}
      />

      {/* ── EDIT / RESUBMIT MODAL ── */}
      <Modal
        open={!!editingProposal}
        title={isResubmit(editingProposal) ? 'Edit & Resubmit Proposal' : 'Edit Proposal'}
        onClose={closeEdit}
      >
        {editForm && (
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {editingProposal?.jobId?.budget?.type === 'hourly' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>Hourly Rate (Rs./hr)</label>
                  <input
                    type="number"
                    required
                    className="fl-prop-search__input"
                    style={{ borderRadius: 12 }}
                    value={editForm.hourlyRate}
                    onChange={e => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                    min="1"
                    step="0.01"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>Estimated Weekly Hours</label>
                  <input
                    type="number"
                    required
                    className="fl-prop-search__input"
                    style={{ borderRadius: 12 }}
                    placeholder="e.g. 20"
                    value={editForm.estimatedWeeklyHours}
                    onChange={e => setEditForm({ ...editForm, estimatedWeeklyHours: e.target.value })}
                    min="1"
                    max="168"
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>Fixed Price (PKR)</label>
                  <input
                    type="number"
                    required
                    className="fl-prop-search__input"
                    style={{ borderRadius: 12 }}
                    value={editForm.fixedPrice}
                    onChange={e => setEditForm({ ...editForm, fixedPrice: e.target.value })}
                    min="1"
                    step="0.01"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>Estimated Delivery Time</label>
                  <CustomSelect
                    value={editForm.estimatedDeliveryTime}
                    onChange={val => setEditForm({ ...editForm, estimatedDeliveryTime: val })}
                    options={DELIVERY_OPTIONS}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>Cover Letter</label>
              <textarea
                required
                maxLength={2000}
                rows={6}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                value={editForm.coverLetter}
                onChange={e => setEditForm({ ...editForm, coverLetter: e.target.value })}
              />
              <span style={{ fontSize: 12, fontWeight: 600, alignSelf: 'flex-end', color: editForm.coverLetter.trim().length < 100 ? '#EF4444' : '#10B981' }}>
                {editForm.coverLetter.trim().length < 100
                  ? `${editForm.coverLetter.trim().length} / 100 min chars`
                  : `${editForm.coverLetter.length} / 2000 chars`}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
              <button type="button" className="fl-prop-btn fl-prop-btn--outline" onClick={closeEdit} disabled={savingEdit}>
                Cancel
              </button>
              <button type="submit" className="fl-prop-btn fl-prop-btn--accent" disabled={savingEdit}>
                {savingEdit ? 'Saving…' : (isResubmit(editingProposal) ? 'Resubmit Proposal' : 'Save Changes')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
