import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, Zap, Users2, Building2, MapPin, Calendar, Globe, User, Edit2, Plus, Search,
  MessageSquare, Bot, CheckCircle2, ChevronRight, Sparkles, TrendingUp, TrendingDown,
  Clock, ShieldCheck, ArrowRight, Package, CreditCard, Star, FileText, Check
} from 'lucide-react';
import { useClient } from '../../context/ClientContext';
import ProgressRing from '../freelancer/components/ProgressRing';
import BentoKPI from '../freelancer/components/BentoKPI';
import BentoCard from '../freelancer/components/BentoCard';
import Reveal, { useInView } from '../freelancer/components/Reveal';
import PkrIcon from '../../Components/common/PkrIcon';
import Loader from '../../Components/common/Loader/Loader';
import { isMobileApp } from '../../utils/platform';
import '../freelancer/BentoDashboard.css';
import './ClientDashboard.css';

/* ── Fallback Analytics Data for Spending Chart ── */
const SPEND_CHART_RANGES = {
  Monthly: [
    { label: 'May', val: 25000 },
    { label: 'Jun', val: 45000 },
    { label: 'Jul', val: 38000 },
    { label: 'Aug', val: 62000 },
    { label: 'Sep', val: 54000 },
    { label: 'Oct', val: 85000 }
  ],
  Weekly: [
    { label: 'Mon', val: 5000 },
    { label: 'Tue', val: 12000 },
    { label: 'Wed', val: 8000 },
    { label: 'Thu', val: 24000 },
    { label: 'Fri', val: 18000 },
    { label: 'Sat', val: 32000 },
    { label: 'Sun', val: 15000 }
  ],
  Yearly: [
    { label: '2023 Q1', val: 80000 },
    { label: '2023 Q2', val: 140000 },
    { label: '2023 Q3', val: 190000 },
    { label: '2023 Q4', val: 260000 },
    { label: '2024 Q1', val: 340000 },
    { label: '2024 Q2', val: 420000 }
  ]
};

export default function ClientDashboardOverview() {
  const { profile, projects = [], loading } = useClient();
  const personalInfo = profile?.personalInfo || {};

  // Analytics Chart State
  const [spendRange, setSpendRange] = useState('Monthly');
  const [hoveredChartIdx, setHoveredChartIdx] = useState(null);
  const [chartAreaRef, chartInView] = useInView({ threshold: 0.2 });

  // Real stats calculation
  const openProjects = projects.filter(p => p.status === 'open').length;
  const inProgressProjects = projects.filter(p => p.status === 'in-progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const hiredCount = projects.filter(p => p.hiredFreelancer).length;
  const totalSpent = profile?.stats?.totalSpent || 0;
  const totalProposals = projects.reduce((acc, p) => acc + (p.proposals?.length || 0), 0);

  // Client Onboarding / Workspace Milestones for Ring
  const clientMilestones = [
    { label: 'Email Verified', done: true },
    { label: 'Company / Profile Setup', done: !!(personalInfo.fullName && (personalInfo.companyName || personalInfo.location)) },
    { label: 'First Job Posted', done: projects.length > 0 },
    { label: 'Payment Method / Wallet', done: (profile?.walletBalance || 0) > 0 || totalSpent > 0 }
  ];
  const completedMilestones = clientMilestones.filter(m => m.done).length;
  const workspaceScore = Math.round((completedMilestones / clientMilestones.length) * 100);

  // Today's formatted date
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const firstName = (personalInfo.fullName || 'Client').split(' ')[0];

  // Spending Chart Calculations
  const chartData = SPEND_CHART_RANGES[spendRange] || SPEND_CHART_RANGES.Monthly;
  const maxSpendVal = Math.max(...chartData.map(d => d.val), 10000);
  const chartWidth = 560;
  const chartHeight = 160;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const chartPoints = chartData.map((d, i) => {
    const x = chartData.length === 1
      ? padLeft + plotW / 2
      : padLeft + (i / (chartData.length - 1)) * plotW;
    const y = padTop + plotH - (d.val / maxSpendVal) * plotH;
    return { x, y, ...d };
  });

  const pathD = chartPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const areaPath = chartPoints.length > 1
    ? `${pathD} L ${chartPoints[chartPoints.length - 1].x} ${padTop + plotH} L ${chartPoints[0].x} ${padTop + plotH} Z`
    : '';

  const totalSpentInRange = chartData.reduce((sum, d) => sum + d.val, 0);

  if (loading) {
    return <Loader text="Loading your client workspace..." fullScreen={true} />;
  }

  const recentProjects = projects.slice(0, 4);

  return (
    <div className="fl-bento-dashboard">
      {/* =================================================================
          ROW A: HERO BAND (Exact Freelancer Banner Architecture)
          ================================================================= */}
      <section className="fl-hero-band" aria-label="Client Workspace Hero">
        <div className="fl-hero-band__bg-shape fl-hero-band__bg-shape--1" />
        <div className="fl-hero-band__bg-shape fl-hero-band__bg-shape--2" />

        <div className="fl-hero-band__content">
          {/* Left Greeting & Actions */}
          <div className="fl-hero-band__left">
            <div className="fl-hero-band__date">
              <span className="fl-hero-chip" style={{ background: 'rgba(255, 255, 255, 0.22)', border: '1px solid rgba(255, 255, 255, 0.35)', color: '#FFFFFF', fontWeight: 800 }}>
                Client Workspace
              </span>
              <span className="fl-hero-chip">
                <Sparkles size={12} color="#FDE047" />
                <span>{personalInfo.companyType || 'Enterprise Client'}</span>
              </span>
              <span style={{ opacity: 0.6 }}>•</span>
              <Calendar size={13} />
              <span>{todayDate}</span>
            </div>

            <h1 className="fl-hero-band__title">
              Welcome back, {firstName}! 👋
            </h1>

            <p className="fl-hero-band__subtitle">
              You have <strong>{openProjects} open jobs</strong> and <strong>{inProgressProjects} active contracts</strong> running on SkillKart. Manage your hiring and payments smoothly.
            </p>

            <div className="fl-hero-band__actions">
              <Link to="/client/projects/create" className="fl-pill-btn fl-pill-btn--primary">
                <Plus size={16} strokeWidth={2.5} />
                <span>Post New Project</span>
              </Link>
              {!isMobileApp() && (
                <Link to="/browse-freelancers" className="fl-pill-btn fl-pill-btn--secondary">
                  <Search size={15} />
                  <span>Find Talent</span>
                </Link>
              )}
              <Link to="/client/projects" className="fl-pill-btn fl-pill-btn--secondary">
                <FolderOpen size={15} />
                <span>My Projects</span>
              </Link>
              <Link to="/client/messages" className="fl-pill-btn fl-pill-btn--secondary">
                <MessageSquare size={15} />
                <span>Messages</span>
              </Link>
            </div>
          </div>

          {/* Right Workspace Progress Widget */}
          <div className="fl-hero-band__right">
            <ProgressRing
              percent={workspaceScore}
              size={76}
              strokeWidth={6.5}
              color="#FFFFFF"
              bgColor="rgba(255, 255, 255, 0.25)"
              textColor="#FFFFFF"
              textSize={16}
              sublabel="WORKSPACE"
            />
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>
                Workspace Health
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 8 }}>
                {completedMilestones} of {clientMilestones.length} milestones complete
              </div>
              <Link
                to="/client/profile"
                className="fl-pill-btn fl-pill-btn--primary"
                style={{ padding: '6px 14px', fontSize: 12 }}
              >
                Profile & Settings →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          ROW B: KPI STRIP (4 Bento KPI Cards with Sparklines & CountUp)
          ================================================================= */}
      <section className="fl-bento-grid" aria-label="Key Performance Indicators">
        <Reveal delay={0} style={{ gridColumn: 'span 3' }}>
          <BentoKPI
            label="Total Projects"
            value={projects.length}
            icon={FolderOpen}
            iconBg="#EAFBF4"
            iconColor="#10B981"
            trend="+1 this week"
            trendUp={true}
            spark={[1, 2, 2, 3, 4, projects.length || 5]}
            to="/client/projects"
          />
        </Reveal>
        <Reveal delay={70} style={{ gridColumn: 'span 3' }}>
          <BentoKPI
            label="Open Job Posts"
            value={openProjects}
            icon={Zap}
            iconBg="#FEF3C7"
            iconColor="#D97706"
            trend={`${openProjects} Live`}
            trendUp={true}
            spark={[0, 1, 1, 2, openProjects || 3]}
            to="/client/projects"
          />
        </Reveal>
        <Reveal delay={140} style={{ gridColumn: 'span 3' }}>
          <BentoKPI
            label="Proposals Received"
            value={totalProposals}
            icon={Users2}
            iconBg="#E0F2FE"
            iconColor="#0284C7"
            trend="+5 new bids"
            trendUp={true}
            spark={[2, 4, 6, 8, 12, totalProposals || 14]}
            to="/client/projects"
          />
        </Reveal>
        <Reveal delay={210} style={{ gridColumn: 'span 3' }}>
          <BentoKPI
            label="Hired Freelancers"
            value={hiredCount}
            icon={CheckCircle2}
            iconBg="#F3E8FF"
            iconColor="#9333EA"
            trend={`${completedProjects} Completed`}
            trendUp={true}
            spark={[0, 1, 2, 2, hiredCount || 3]}
            to="/client/saved"
          />
        </Reveal>
      </section>

      {/* =================================================================
          ROW C: 12-COLUMN BENTO GRID
          8-Col: Spending Analytics Area Chart
          4-Col: Quick Hire Hub & Balance
          ================================================================= */}
      <section className="fl-bento-grid fl-bento-grid--stretch">
        {/* 8-Column Card: Spending Analytics */}
        <Reveal delay={280} style={{ gridColumn: 'span 8' }}>
          <BentoCard
            title="Hiring & Spending Analytics"
            icon={TrendingUp}
            action={
              <div style={{ display: 'flex', gap: 6 }}>
                {['Weekly', 'Monthly', 'Yearly'].map(range => (
                  <button
                    key={range}
                    onClick={() => setSpendRange(range)}
                    className="fl-pill-btn fl-pill-btn--secondary"
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      background: spendRange === range ? '#10B981' : '#FFFFFF',
                      color: spendRange === range ? '#FFFFFF' : '#0B2942',
                      borderColor: spendRange === range ? '#10B981' : '#E2E8F0',
                      fontWeight: 700
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            }
          >
            <div ref={chartAreaRef} style={{ width: '100%', position: 'relative' }}>
              {/* Header metrics bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                    Total Budget Allocated ({spendRange})
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#0B2942', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Rs. {totalSpentInRange.toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active Contracts</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>{inProgressProjects} Ongoing</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Completed</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0B2942' }}>{completedProjects} Delivered</div>
                  </div>
                </div>
              </div>

              {/* Area Chart SVG */}
              <div style={{ width: '100%', height: chartHeight, overflow: 'hidden' }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="clSpendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[0.25, 0.5, 0.75, 1].map(ratio => {
                    const y = padTop + plotH * (1 - ratio);
                    return (
                      <line
                        key={ratio}
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#F1F5F9"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Area fill */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="url(#clSpendGrad)"
                      style={{ transition: 'd 0.3s ease' }}
                    />
                  )}

                  {/* Line stroke */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data points */}
                  {chartPoints.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredChartIdx === idx ? 6 : 4}
                        fill="#FFFFFF"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        onMouseEnter={() => setHoveredChartIdx(idx)}
                        onMouseLeave={() => setHoveredChartIdx(null)}
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      />
                      {/* X-axis labels */}
                      <text
                        x={p.x}
                        y={chartHeight - 6}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#94A3B8"
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Hover Tooltip display */}
              {hoveredChartIdx !== null && chartPoints[hoveredChartIdx] && (
                <div
                  style={{
                    position: 'absolute',
                    top: chartPoints[hoveredChartIdx].y - 30,
                    left: `${(chartPoints[hoveredChartIdx].x / chartWidth) * 100}%`,
                    transform: 'translateX(-50%)',
                    background: '#0B2942',
                    color: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Rs. {chartPoints[hoveredChartIdx].val.toLocaleString()}
                </div>
              )}
            </div>
          </BentoCard>
        </Reveal>

        {/* 4-Column Card: Wallet & Quick Actions */}
        <Reveal delay={350} style={{ gridColumn: 'span 4' }}>
          <BentoCard
            title="Wallet & Quick Hire"
            icon={CreditCard}
            action={
              <Link to="/client/wallet" style={{ fontSize: 12, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}>
                Manage →
              </Link>
            }
          >
            {/* Wallet Balance Hero Box */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0B2942 0%, #163E63 100%)',
                borderRadius: 18,
                padding: '18px 20px',
                color: '#FFFFFF',
                marginBottom: 16,
                boxShadow: '0 8px 22px rgba(11, 41, 66, 0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
                  Available Balance
                </span>
                <span style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#10B981', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                  Active
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Rs. {(profile?.walletBalance || 0).toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Link
                  to="/client/wallet"
                  className="fl-pill-btn fl-pill-btn--primary"
                  style={{ padding: '6px 14px', fontSize: 12, flex: 1, textAlign: 'center' }}
                >
                  Deposit Funds
                </Link>
              </div>
            </div>

            {/* Quick Action Navigation items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                to="/client/projects/create"
                className="cl-recent-proj"
                style={{ padding: '10px 14px', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAFBF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0B2942' }}>Post a New Project</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Publish a project or gig order</div>
                  </div>
                </div>
                <ChevronRight size={16} color="#94A3B8" />
              </Link>

              <Link
                to="/client/saved"
                className="cl-recent-proj"
                style={{ padding: '10px 14px', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0B2942' }}>Saved Freelancers</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>View bookmarked talent</div>
                  </div>
                </div>
                <ChevronRight size={16} color="#94A3B8" />
              </Link>

              {!isMobileApp() && (
                <Link
                  to="/ai-matchmaking"
                  className="cl-recent-proj"
                  style={{ padding: '10px 14px', textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0B2942' }}>AI Matchmaking</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Find instant best-fit candidates</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </Link>
              )}
            </div>
          </BentoCard>
        </Reveal>
      </section>

      {/* =================================================================
          ROW D: 12-COLUMN BENTO GRID
          7-Col: Active & Recent Projects List
          5-Col: Workspace Verification & Hiring Health
          ================================================================= */}
      <section className="fl-bento-grid fl-bento-grid--stretch">
        {/* 7-Col: Recent Projects */}
        <Reveal delay={420} style={{ gridColumn: 'span 7' }}>
          <BentoCard
            title="Recent Project Postings"
            icon={FolderOpen}
            action={
              <Link to="/client/projects" style={{ fontSize: 12, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}>
                View All ({projects.length}) →
              </Link>
            }
          >
            {recentProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EAFBF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <FolderOpen size={24} />
                </div>
                <h4 style={{ margin: '0 0 6px', color: '#0B2942', fontWeight: 800 }}>No project postings yet</h4>
                <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px' }}>
                  Post your first job to receive bids from top verified freelancers.
                </p>
                <Link to="/client/projects/create" className="fl-pill-btn fl-pill-btn--primary">
                  Post Your First Project
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentProjects.map((p) => {
                  const isGig = p.source === 'gig' || p.title?.toLowerCase().includes('package');
                  const linkTo = isGig ? '#' : `/client/projects/${p.id}/proposals`;
                  return (
                    <Link
                      key={p.id}
                      to={linkTo}
                      className="cl-recent-proj"
                      style={{ textDecoration: 'none', cursor: isGig ? 'default' : 'pointer', padding: '12px 16px' }}
                    >
                      <div className="cl-recent-proj__left">
                        <div className="cl-recent-proj__icon-wrapper" style={{ width: 38, height: 38, borderRadius: 10 }}>
                          <FolderOpen size={18} />
                        </div>
                        <div className="cl-recent-proj__info">
                          <p className="cl-recent-proj__title" style={{ fontSize: '0.92rem' }}>{p.title}</p>
                          <div className="cl-recent-proj__meta" style={{ fontSize: '0.78rem' }}>
                            <span className="cl-tag" style={{ padding: '2px 7px', fontSize: 11 }}>
                              {p.category || 'General'}
                            </span>
                            <span className="cl-recent-proj__dot">•</span>
                            <span>
                              Rs. {p.budget?.min === p.budget?.max ? (p.budget?.min || 0) : `${p.budget?.min || 0}–${p.budget?.max || 0}`}
                            </span>
                            <span className="cl-recent-proj__dot">•</span>
                            {isGig ? (
                              <span style={{ color: '#10B981', fontWeight: 700 }}>Gig Order</span>
                            ) : (
                              <span>{p.proposals?.length || 0} proposal{(p.proposals?.length || 0) === 1 ? '' : 's'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="cl-recent-proj__right">
                        <span className={`cl-badge cl-badge--${(p.status || 'open').replace(' ', '-')}`}>
                          {p.status === 'open' ? (
                            <><CheckCircle2 size={11} style={{ marginRight: 3 }} /> Open</>
                          ) : p.status === 'in-progress' ? (
                            'In Progress'
                          ) : (
                            <><CheckCircle2 size={11} style={{ marginRight: 3 }} /> Completed</>
                          )}
                        </span>
                        {!isGig && (
                          <div className="cl-recent-proj__action">
                            <ChevronRight size={16} />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </BentoCard>
        </Reveal>

        {/* 5-Col: Workspace Verification & Health */}
        <Reveal delay={490} style={{ gridColumn: 'span 5' }}>
          <BentoCard
            title="Hiring Health & Verification"
            icon={ShieldCheck}
            action={
              <span className="cl-badge cl-badge--open" style={{ fontSize: 11 }}>
                {workspaceScore}% Complete
              </span>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clientMilestones.map((milestone, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: milestone.done ? '#EAFBF4' : '#F8FAFC',
                    border: `1px solid ${milestone.done ? '#A7F3D0' : '#E2E8F0'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: milestone.done ? '#10B981' : '#CBD5E1',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800
                      }}
                    >
                      {milestone.done ? <Check size={14} strokeWidth={3} /> : idx + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: milestone.done ? '#065F46' : '#64748B' }}>
                      {milestone.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: milestone.done ? '#10B981' : '#94A3B8' }}>
                    {milestone.done ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))}

              <div style={{ marginTop: 6, padding: '12px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>Need Talent Fast?</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Use AI match to pick from top 1% vetted freelancers.</div>
                </div>
                <Link
                  to="/ai-matchmaking"
                  className="fl-pill-btn fl-pill-btn--primary"
                  style={{ padding: '6px 12px', fontSize: 11 }}
                >
                  Match Now
                </Link>
              </div>
            </div>
          </BentoCard>
        </Reveal>
      </section>
    </div>
  );
}
