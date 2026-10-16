import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Zap, CheckCircle2, Eye, MapPin, Calendar, Star,
  Search, ClipboardList, Plus, TrendingUp, TrendingDown,
  BarChart2, Award, Briefcase, ArrowRight, ShieldCheck,
  ChevronRight, ChevronLeft, Bookmark, Clock, DollarSign,
  AlertCircle, Sparkles, Send, Trash2, RotateCcw, Play, Check,
  ExternalLink, FileText, UserCheck, CreditCard
} from 'lucide-react';
import { useFreelancer } from '../../context/FreelancerContext';
import { contractsAPI } from '../../api/contracts';
import { jobsAPI } from '../../api/jobs';
import { testimonialsAPI } from '../../api/testimonials';
import { paymentsAPI } from '../../api/payments';
import { safeToast as toast } from '../../utils/safeToast';
import ProgressRing from './components/ProgressRing';
import BentoKPI from './components/BentoKPI';
import BentoCard from './components/BentoCard';
import Reveal, { useInView } from './components/Reveal';
import AiGenerateText from '../../Components/common/AiSuggest/AiGenerateText';
import PkrIcon from '../../Components/common/PkrIcon';
import JobCard from '../../Components/common/JobCard/JobCard';
import { FinishOnboardingBanner } from '../../Components/common/SkipOnboarding/SkipOnboarding';
import './BentoDashboard.css';

/* ── Fallback sample jobs for Recommended carousel if API has no results ── */
const FALLBACK_JOBS = [
  {
    _id: 'sample-job-1',
    title: 'Full-Stack React & Node.js Marketplace Platform',
    category: 'Web Development',
    budget: { min: 45000, max: 75000, type: 'fixed' },
    skills: ['React', 'Node.js', 'MongoDB', 'Tailwind CSS'],
    duration: '2-4 weeks',
    matchScore: 98,
    client: { name: 'Acme Studios', verified: true }
  },
  {
    _id: 'sample-job-2',
    title: 'Mobile App UI/UX Redesign in Figma & React Native',
    category: 'Design & Creative',
    budget: { min: 35000, max: 60000, type: 'fixed' },
    skills: ['Figma', 'UI/UX', 'React Native', 'Mobile Design'],
    duration: '1-2 weeks',
    matchScore: 94,
    client: { name: 'FinPulse Labs', verified: true }
  },
  {
    _id: 'sample-job-3',
    title: 'E-Commerce Store Optimization & Payment Gateway Integration',
    category: 'Web Development',
    budget: { min: 25000, max: 40000, type: 'fixed' },
    skills: ['JavaScript', 'Stripe', 'REST APIs', 'Performance'],
    duration: '1 week',
    matchScore: 91,
    client: { name: 'TrendKart Direct', verified: true }
  },
  {
    _id: 'sample-job-4',
    title: 'AI Chatbot Integration with OpenAI & Python Backend',
    category: 'AI & Data Science',
    budget: { min: 50000, max: 90000, type: 'fixed' },
    skills: ['Python', 'OpenAI API', 'FastAPI', 'LangChain'],
    duration: '3-4 weeks',
    matchScore: 89,
    client: { name: 'CogniTech Solutions', verified: true }
  }
];

/* ── Loading Skeleton Screen ── */
const DashboardSkeleton = () => (
  <div className="fl-bento-dashboard" aria-busy="true" aria-label="Loading dashboard">
    {/* Hero skeleton */}
    <div style={{ height: 220, borderRadius: 28, background: 'linear-gradient(135deg, #A7F3D0, #E0F2FE)', opacity: 0.7 }} />
    {/* KPI strip skeleton */}
    <div className="fl-skel-kpis">
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: 110, borderRadius: 20, background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 20 }} />
      ))}
    </div>
    {/* Rows skeleton */}
    <div className="fl-skel-rows">
      <div style={{ height: 320, borderRadius: 24, background: '#FFFFFF', border: '1px solid #E2E8F0' }} />
      <div style={{ height: 320, borderRadius: 24, background: '#FFFFFF', border: '1px solid #E2E8F0' }} />
    </div>
  </div>
);

export default function DashboardOverview() {
  const { profile, gigs = [], proposals = [], savedProjects = [], toggleSavedProject, loading } = useFreelancer();
  const navigate = useNavigate();

  // State for Contracts & Recommended Jobs & Real Payments
  const [contracts, setContracts] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Earnings Area Chart Range & Hover
  const [earningsRange, setEarningsRange] = useState('Monthly');
  const [hoveredChartIdx, setHoveredChartIdx] = useState(null);

  // Scalable Skill Verification & Recent Gigs state
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('all');
  const [gigsExpanded, setGigsExpanded] = useState(false);

  // Success Story Form State
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyRating, setStoryRating] = useState(5);
  const [existingStory, setExistingStory] = useState(null);
  const [storySaving, setStorySaving] = useState(false);

  // Scroll ref for Recommended Jobs
  const scrollTrackRef = useRef(null);

  // In-view hook for Area Chart drawing
  const [chartAreaRef, chartInView] = useInView({ threshold: 0.2 });

  // Measured chart width: the SVG viewBox uses real pixels so nothing is
  // stretched (no preserveAspectRatio="none") and labels stay aligned.
  const [chartW, setChartW] = useState(560);
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

  // Fetch contracts, marketplace recommendations, and payment history
  useEffect(() => {
    let isMounted = true;

    async function loadAuxiliaryData() {
      try {
        const [contractsRes, jobsRes, storyRes, paymentsRes] = await Promise.allSettled([
          contractsAPI.getMyContracts({ limit: 4 }),
          jobsAPI.listJobs({ limit: 6 }),
          testimonialsAPI.getMine(),
          paymentsAPI.getHistory()
        ]);

        if (!isMounted) return;

        if (contractsRes.status === 'fulfilled') {
          const list = contractsRes.value.data?.data?.contracts || contractsRes.value.data?.data || [];
          setContracts(Array.isArray(list) ? list : []);
        }

        if (jobsRes.status === 'fulfilled') {
          const jobsList = jobsRes.value.data?.data?.jobs || jobsRes.value.data?.data || [];
          setRecommendedJobs(jobsList.length > 0 ? jobsList : FALLBACK_JOBS);
        } else {
          setRecommendedJobs(FALLBACK_JOBS);
        }

        if (storyRes.status === 'fulfilled') {
          const t = storyRes.value.data?.data?.testimonial;
          if (t) {
            setExistingStory(t);
            setStoryText(t.text || '');
            setStoryRating(t.rating || 5);
          }
        }

        if (paymentsRes.status === 'fulfilled') {
          const pList = paymentsRes.value.data?.data?.payments || [];
          setPayments(Array.isArray(pList) ? pList : []);
        }
      } catch {
        if (isMounted) setRecommendedJobs(FALLBACK_JOBS);
      } finally {
        if (isMounted) setDataLoading(false);
      }
    }

    loadAuxiliaryData();
    return () => { isMounted = false; };
  }, []);

  // ── Derived Profile Info ──
  const personalInfo = profile?.personalInfo || {};
  const fullName = personalInfo.fullName || 'Freelancer';
  const firstName = fullName.split(' ')[0] || 'Freelancer';
  const activeProposals = proposals.filter(p => p.status === 'pending').length;
  const acceptedProposals = proposals.filter(p => p.status === 'accepted').length;
  const rejectedProposals = proposals.filter(p => p.status === 'rejected').length;

  // ── Verification Checklist (Row C) ──
  const verificationSteps = [
    { key: 'emailVerified',       label: 'Email Address Verified',    to: '/freelancer/settings', required: true },
    { key: 'profileCompleted',    label: 'Profile Overview Completed', to: '/freelancer/profile',  required: true },
    { key: 'onboardingCompleted', label: 'Onboarding Questionnaire',   to: '/freelancer/profile',  required: true },
    { key: 'allSkillTestsPassed', label: 'Skill Verification Test',    to: '/freelancer/skill-test', required: true },
    { key: 'paymentMethodAdded',  label: 'Stripe Payout Connected',    to: '/freelancer/wallet',   required: false },
  ];

  const completedStepsCount = verificationSteps.filter(s => {
    let done = profile?.verificationDetails?.[s.key];
    if (s.key === 'paymentMethodAdded' && profile?.stripeOnboardingComplete) done = true;
    return !!done;
  }).length;

  const profilePercent = Math.round((completedStepsCount / verificationSteps.length) * 100);
  const nextPendingStep = verificationSteps.find(s => {
    if (s.key === 'paymentMethodAdded' && profile?.stripeOnboardingComplete) return false;
    return !profile?.verificationDetails?.[s.key];
  });

  // Current formatted date
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });


  // ── Success Story Handlers ──
  const handleSaveStory = async (e) => {
    e?.preventDefault?.();
    if (storyText.trim().length < 20) {
      toast.error('Please write at least 20 characters about your experience.');
      return;
    }
    setStorySaving(true);
    try {
      const res = await testimonialsAPI.submit(storyText.trim(), storyRating);
      setExistingStory(res.data?.data?.testimonial || { text: storyText.trim(), rating: storyRating });
      toast.success(existingStory ? 'Success story updated!' : 'Thanks for sharing your story! ✨');
      setStoryOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save your story.');
    } finally {
      setStorySaving(false);
    }
  };

  const handleDeleteStory = async () => {
    setStorySaving(true);
    try {
      await testimonialsAPI.deleteMine();
      setExistingStory(null);
      setStoryText('');
      setStoryRating(5);
      toast.info('Your success story was removed.');
      setStoryOpen(false);
    } catch {
      toast.error('Could not remove story.');
    } finally {
      setStorySaving(false);
    }
  };

  // ── Real Earnings Area Chart Coordinates (Mapped from payments API) ──
  const formatShortPkr = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 100000) return `${(num / 100000).toFixed(1).replace('.0', '')}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return String(Math.round(num));
  };

  const currentChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const paymentDates = payments
      .map(p => new Date(p.releasedAt || p.updatedAt || p.createdAt))
      .filter(d => !isNaN(d.getTime()));
    const activeYear = paymentDates.some(d => d.getFullYear() === currentYear)
      ? currentYear
      : (paymentDates[0]?.getFullYear() || currentYear);

    if (earningsRange === 'Weekly') {
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
          val: 0
        });
      }

      payments.forEach(p => {
        if (p.status === 'released' || p.status === 'completed') {
          const time = new Date(p.releasedAt || p.updatedAt || p.createdAt).getTime();
          if (isNaN(time)) return;
          const target = weeks.find(w => time >= w.start && time <= w.end);
          if (target) {
            target.val += Number(p.freelancerPayout || p.totalAmount || 0);
          }
        }
      });

      return weeks.map(w => ({ label: w.label, val: Math.round(w.val) }));
    }

    if (earningsRange === 'Yearly') {
      const years = [];
      for (let y = activeYear - 3; y <= activeYear; y++) {
        years.push({ label: String(y), year: y, val: 0 });
      }

      payments.forEach(p => {
        if (p.status === 'released' || p.status === 'completed') {
          const d = new Date(p.releasedAt || p.updatedAt || p.createdAt);
          if (isNaN(d.getTime())) return;
          const target = years.find(y => y.year === d.getFullYear());
          if (target) {
            target.val += Number(p.freelancerPayout || p.totalAmount || 0);
          }
        }
      });

      return years.map(y => ({ label: y.label, val: Math.round(y.val) }));
    }

    // Default: 'Monthly' (Jan to Dec of activeYear)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = monthNames.map((m, idx) => ({
      label: m,
      monthIdx: idx,
      val: 0
    }));

    payments.forEach(p => {
      if (p.status === 'released' || p.status === 'completed') {
        const d = new Date(p.releasedAt || p.updatedAt || p.createdAt);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === activeYear || paymentDates.length <= 12) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            months[m].val += Number(p.freelancerPayout || p.totalAmount || 0);
          }
        }
      }
    });

    return months.map(m => ({ label: m.label, val: Math.round(m.val) }));
  }, [payments, earningsRange]);

  const maxVal = Math.max(...currentChartData.map(d => d.val), 1000);
  const chartWidth = Math.max(chartW, 240);
  const chartHeight = 196;
  const chartPadLeft = 46;
  const chartPadRight = 14;
  const chartPadTop = 16;
  const chartPadBottom = 24;
  const plotWidth = chartWidth - chartPadLeft - chartPadRight;
  const plotHeight = chartHeight - chartPadTop - chartPadBottom;

  const points = currentChartData.map((d, i) => {
    const x = currentChartData.length === 1
      ? chartPadLeft + plotWidth / 2
      : chartPadLeft + (i / (currentChartData.length - 1)) * plotWidth;
    const y = chartPadTop + plotHeight - (d.val / maxVal) * plotHeight;
    return { x, y, ...d };
  });

  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
  const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  const areaPath = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${chartPadTop + plotHeight} L ${points[0].x} ${chartPadTop + plotHeight} Z`
    : '';

  const totalEarningsInRange = currentChartData.reduce((sum, d) => sum + d.val, 0);

  // ── Scalable Skills Filtering ──
  const allVerifiedSkills = Array.isArray(profile?.verifiedSkills) ? profile.verifiedSkills : [];
  const filteredSkills = allVerifiedSkills.filter(s => {
    if (skillsFilter === 'verified' && !s.isVerified) return false;
    if (skillsFilter === 'unverified' && s.isVerified) return false;
    if (skillsSearch.trim()) {
      return (s.name || '').toLowerCase().includes(skillsSearch.trim().toLowerCase());
    }
    return true;
  });
  const displayedSkills = skillsExpanded ? filteredSkills : filteredSkills.slice(0, 8);

  // ── Scalable Recent Gigs ──
  const displayedGigs = gigsExpanded ? gigs.slice(0, 10) : gigs.slice(0, 5);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="fl-bento-dashboard">
      <FinishOnboardingBanner role="freelancer" />
      {/* =================================================================
          ROW A: HERO BAND (Full Width)
          ================================================================= */}
      <section className="fl-hero-band" aria-label="Freelancer Welcome Hero">
        <div className="fl-hero-band__bg-shape fl-hero-band__bg-shape--1" />
        <div className="fl-hero-band__bg-shape fl-hero-band__bg-shape--2" />

        <div className="fl-hero-band__content">
          {/* Left Greeting & Actions */}
          <div className="fl-hero-band__left">
            <div className="fl-hero-band__date">
              <span className="fl-hero-chip" style={{ background: 'rgba(255, 255, 255, 0.22)', border: '1px solid rgba(255, 255, 255, 0.35)', color: '#FFFFFF', fontWeight: 800 }}>
                Freelancer Dashboard
              </span>
              <span className="fl-hero-chip">
                <Sparkles size={12} color="#FDE047" />
                <span>{profile?.verificationStatus === 'verified' ? 'Verified Expert' : 'Top Talent'}</span>
              </span>
              <span style={{ opacity: 0.6 }}>•</span>
              <Calendar size={13} />
              <span>{todayDate}</span>
            </div>

            <h1 className="fl-hero-band__title">
              Welcome back, {firstName}! 👋
            </h1>

            <p className="fl-hero-band__subtitle">
              You have <strong>{activeProposals} active bids</strong> and <strong>{gigs.length} published gigs</strong> live on the SkillKart marketplace. Ready to grow your business today?
            </p>

            <div className="fl-hero-band__actions">
              <Link to="/browse-projects" className="fl-pill-btn fl-pill-btn--primary">
                <Search size={15} />
                <span>Find Work</span>
              </Link>
              <Link to="/freelancer/gigs/create" className="fl-pill-btn fl-pill-btn--secondary">
                <Plus size={16} />
                <span>Create New Gig</span>
              </Link>
              <Link to="/freelancer/profile" className="fl-pill-btn fl-pill-btn--secondary">
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>

          {/* Right Profile Completion Widget */}
          <div className="fl-hero-band__right">
            <ProgressRing
              percent={profilePercent}
              size={76}
              strokeWidth={6.5}
              color="#FFFFFF"
              bgColor="rgba(255, 255, 255, 0.25)"
              textColor="#FFFFFF"
              textSize={16}
              sublabel="PROFILE"
            />
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>
                Profile Status
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 8 }}>
                {completedStepsCount} of {verificationSteps.length} milestones complete
              </div>
              <Link
                to="/freelancer/profile"
                className="fl-pill-btn fl-pill-btn--primary"
                style={{ padding: '6px 14px', fontSize: 12 }}
              >
                Complete Profile →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          ROW B: KPI STRIP (4 Compact Bento Cards)
          ================================================================= */}
      <section className="fl-bento-grid" aria-label="Key Performance Indicators">
        <Reveal delay={0} className="fl-bento-kpi-cell">
          <BentoKPI
            label="Total Gigs"
            value={gigs.length}
            icon={Package}
            iconBg="#EAFBF4"
            iconColor="#10B981"
            trend="+2"
            trendUp={true}
            spark={[1, 2, 2, 3, 3, gigs.length || 4]}
            to="/freelancer/gigs"
          />
        </Reveal>
        <Reveal delay={70} className="fl-bento-kpi-cell">
          <BentoKPI
            label="Active Bids"
            value={activeProposals}
            icon={Zap}
            iconBg="#FEF3C7"
            iconColor="#D97706"
            trend="+1 active"
            trendUp={true}
            spark={[0, 1, 2, 1, 2, activeProposals || 3]}
            to="/freelancer/proposals"
          />
        </Reveal>
        <Reveal delay={140} className="fl-bento-kpi-cell">
          <BentoKPI
            label="Accepted Bids"
            value={acceptedProposals}
            icon={CheckCircle2}
            iconBg="#E0F2FE"
            iconColor="#0284C7"
            trend={`${acceptedProposals} Total`}
            trendUp={acceptedProposals > 0}
            spark={[0, 0, 1, 1, 2, acceptedProposals || 2]}
            to="/freelancer/proposals"
          />
        </Reveal>
        <Reveal delay={210} className="fl-bento-kpi-cell">
          <BentoKPI
            label="Profile Views"
            value={profile?.stats?.profileViews || 128}
            icon={Eye}
            iconBg="#F3E8FF"
            iconColor="#9333EA"
            trend="+18% week"
            trendUp={true}
            spark={[24, 45, 60, 85, 110, profile?.stats?.profileViews || 128]}
            to="/freelancer/profile"
          />
        </Reveal>
      </section>

      {/* =================================================================
          ROW 3: EARNINGS & CASH FLOW (Col 7) + NEXT BEST ACTIONS (Col 5)
          Side by side in ONE ROW, equal height (grid 12-col: 7 & 5)
          Stretch both to same height (align-items: stretch), no empty gap
          ================================================================= */}
      <section className="fl-bento-grid fl-bento-grid--stretch" aria-label="Financial and Next Actions Overview">
        {/* Earnings & Cash Flow (Col 7) */}
        <Reveal delay={0} style={{ gridColumn: 'span 7' }} className="fl-stretch-col">
          <BentoCard
            colSpan={12}
            title="Earnings & Cash Flow"
            icon={BarChart2}
            className="fl-card--stretch"
            action={
              <div className="fl-time-toggle">
                {['Weekly', 'Monthly', 'Yearly'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    className={`fl-time-btn${earningsRange === range ? ' fl-time-btn--active' : ''}`}
                    onClick={() => setEarningsRange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
            }
          >
            {/* Top metric row */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Earned:
                </span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, color: '#0B2942', marginLeft: 8 }}>
                  Rs. {(profile?.totalEarnings || 0).toLocaleString()}
                </span>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: '#EAFBF4',
                borderRadius: 999,
                color: '#065F46',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                <PkrIcon size={12} />
                <span>Available: Rs. {(profile?.walletBalance || 0).toLocaleString()}</span>
              </span>
            </div>

            {/* Area Chart Container - fills remaining vertical height cleanly */}
            <div ref={chartAreaRef} className="fl-chart-fill-wrap" style={{ position: 'relative', minHeight: 190 }}>
              {totalEarningsInRange === 0 && payments.length === 0 ? (
                <div style={{ height: '100%', minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F8FAFC', borderRadius: 16, border: '1px dashed #E2E8F0', padding: 16 }}>
                  <BarChart2 size={26} style={{ color: '#94A3B8' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0B2942' }}>No earnings recorded yet</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Chart draws in real-time as your milestone funds are released.</span>
                </div>
              ) : (
                <>
                  <div ref={chartBoxRef} style={{ width: '100%' }}>
                  <svg className="fl-chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} width={chartWidth} height={chartHeight} style={{ width: '100%', height: chartHeight, overflow: 'visible', display: 'block' }} role="img" aria-label="Earnings chart">
                    <defs>
                      <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Soft Gridlines & Short Y-Axis Labels */}
                    <g className="fl-chart-grid" opacity="0.8">
                      {/* Top gridline (Max) */}
                      <line
                        x1={chartPadLeft}
                        y1={chartPadTop}
                        x2={chartWidth - chartPadRight}
                        y2={chartPadTop}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={chartPadLeft - 8}
                        y={chartPadTop + 3.5}
                        textAnchor="end"
                        fontSize="12"
                        fill="#94A3B8"
                        fontFamily="monospace"
                      >
                        {formatShortPkr(maxVal)}
                      </text>

                      {/* Middle gridline (Half) */}
                      <line
                        x1={chartPadLeft}
                        y1={chartPadTop + plotHeight / 2}
                        x2={chartWidth - chartPadRight}
                        y2={chartPadTop + plotHeight / 2}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={chartPadLeft - 8}
                        y={chartPadTop + plotHeight / 2 + 3.5}
                        textAnchor="end"
                        fontSize="12"
                        fill="#94A3B8"
                        fontFamily="monospace"
                      >
                        {formatShortPkr(maxVal / 2)}
                      </text>

                      {/* Baseline gridline (0) */}
                      <line
                        x1={chartPadLeft}
                        y1={chartPadTop + plotHeight}
                        x2={chartWidth - chartPadRight}
                        y2={chartPadTop + plotHeight}
                        stroke="#E2E8F0"
                        strokeWidth="1"
                      />
                      <text
                        x={chartPadLeft - 8}
                        y={chartPadTop + plotHeight + 3.5}
                        textAnchor="end"
                        fontSize="12"
                        fill="#94A3B8"
                        fontFamily="monospace"
                      >
                        0
                      </text>
                    </g>

                    {/* Gradient Area Fill */}
                    {points.length > 1 && (
                      <path
                        d={areaPath}
                        fill="url(#earningsGrad)"
                        className={`fl-chart-area${chartInView ? ' fl-chart-area--drawn' : ''}`}
                      />
                    )}

                    {/* Continuous Line */}
                    {points.length > 1 && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`fl-chart-line${chartInView ? ' fl-chart-line--drawn' : ''}`}
                      />
                    )}

                    {/* X-Axis Labels (SVG text so they stay aligned with the points) */}
                    {points.map((d, i) => {
                      const minGap = 38;
                      const slot = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
                      const step = Math.max(1, Math.ceil(minGap / Math.max(slot, 1)));
                      const show = i % step === 0 || (i === points.length - 1 && (points.length - 1) % step === 0);
                      if (!show) return null;
                      return (
                        <text
                          key={`xl-${d.label}-${i}`}
                          x={d.x}
                          y={chartHeight - 6}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#94A3B8"
                          fontFamily="monospace"
                        >
                          {d.label}
                        </text>
                      );
                    })}

                    {/* Interactive Dots (hover on desktop, tap on touch; 14px invisible hit area) */}
                    {points.map((d, i) => (
                      <g key={i}>
                        <circle
                          cx={d.x}
                          cy={d.y}
                          r={hoveredChartIdx === i ? 5.5 : 3.5}
                          fill="#FFFFFF"
                          stroke="#10B981"
                          strokeWidth={hoveredChartIdx === i ? 3 : 2.2}
                          className={`fl-chart-point${chartInView ? ' fl-chart-point--visible' : ''}`}
                          style={{ transition: 'all 0.15s ease', pointerEvents: 'none' }}
                        />
                        <circle
                          cx={d.x}
                          cy={d.y}
                          r={14}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredChartIdx(i)}
                          onMouseLeave={() => setHoveredChartIdx(null)}
                          onClick={() => setHoveredChartIdx(prev => (prev === i ? null : i))}
                        />
                      </g>
                    ))}
                  </svg>
                  </div>

                  {/* Hover Tooltip */}
                  {hoveredChartIdx !== null && points[hoveredChartIdx] && (
                    <div style={{
                      position: 'absolute',
                      top: 4,
                      left: Math.min(Math.max(points[hoveredChartIdx].x, 80), chartWidth - 80),
                      transform: 'translateX(-50%)',
                      background: '#0B2942',
                      color: '#FFFFFF',
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      pointerEvents: 'none',
                      boxShadow: '0 4px 14px rgba(11, 41, 66, 0.25)',
                      whiteSpace: 'nowrap',
                      zIndex: 10
                    }}>
                      {points[hoveredChartIdx].label}: Rs. {points[hoveredChartIdx].val.toLocaleString()}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom summary with auto-width Wallet Button (height 38px, pill, auto width) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
              <Link
                to="/freelancer/wallet"
                className="fl-pill-btn fl-pill-btn--outline"
                style={{ height: 38, padding: '0 18px', fontSize: 12.5, width: 'auto' }}
              >
                Wallet Details →
              </Link>
            </div>
          </BentoCard>
        </Reveal>

        {/* Next Best Actions (Col 5) */}
        <Reveal delay={70} style={{ gridColumn: 'span 5' }} className="fl-stretch-col">
          <BentoCard
            colSpan={12}
            title="Next Best Actions"
            icon={ShieldCheck}
            className="fl-card--stretch"
            action={
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                {completedStepsCount}/{verificationSteps.length} Done
              </span>
            }
          >
            {/* Progress bar */}
            <div style={{ marginBottom: 12 }}>
              <div className="fl-progress-thin" style={{ height: 6 }}>
                <div className="fl-progress-thin__bar" style={{ width: `${profilePercent}%` }} />
              </div>
            </div>

            {/* Checklist rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verificationSteps.map((s, sIdx) => {
                let isDone = profile?.verificationDetails?.[s.key];
                if (s.key === 'paymentMethodAdded' && profile?.stripeOnboardingComplete) isDone = true;

                return (
                  <div
                    key={s.key}
                    className={`fl-action-step fl-action-step--compact${isDone ? ' fl-action-step--done' : ''}`}
                    style={{ animationDelay: `${sIdx * 70}ms` }}
                  >
                    <div className="fl-action-step__left" style={{ gap: 10 }}>
                      {isDone ? (
                        <CheckCircle2 size={16} color="#10B981" className="fl-check-pop" />
                      ) : (
                        <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #CBD5E1', display: 'inline-block' }} />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0B2942' }}>{s.label}</span>
                    </div>
                    {s.required && !isDone && (
                      <span className="fl-badge-req" style={{ fontSize: 12, padding: '2px 8px' }}>Required</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Slim single-line warning banner if unverified */}
            {profilePercent < 100 && (
              <div className="fl-action-alert-slim" style={{ marginTop: 12 }}>
                Complete verification to earn top placement and bid on high-budget projects.
              </div>
            )}

            {/* Primary Action Button (Auto width on desktop, height 38px, pill, NOT stretched) */}
            {nextPendingStep && (
              <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                <Link
                  to={nextPendingStep.to}
                  className="fl-pill-btn fl-pill-btn--emerald"
                  style={{ height: 38, padding: '0 20px', fontSize: 13, width: 'auto', display: 'inline-flex' }}
                >
                  <span>{nextPendingStep.label.replace('Completed', '').replace('Verified', '')} Now →</span>
                </Link>
              </div>
            )}
          </BentoCard>
        </Reveal>
      </section>

      {/* =================================================================
          ROW 4: ACTIVE CONTRACTS & DELIVERABLES (Full Width Row, FIX 1)
          ================================================================= */}
      <Reveal delay={0}>
        <BentoCard
          colSpan={12}
          title="Active Contracts & Deliverables"
          icon={Briefcase}
          action={
            <Link to="/freelancer/work" style={{ fontSize: 13, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}>
              View All Work →
            </Link>
          }
        >
          {contracts.length === 0 ? (
            <div className="fl-contracts-empty">
              <div className="fl-contracts-empty__icon">
                <Briefcase size={20} />
              </div>
              <div className="fl-contracts-empty__title">
                No active contracts right now
              </div>
              <p className="fl-contracts-empty__desc">
                Submit bids on client projects to win your next milestone contract.
              </p>
              <Link to="/browse-projects" className="fl-pill-btn fl-pill-btn--emerald" style={{ padding: '7px 18px', fontSize: 12.5, width: 'auto' }}>
                Browse Open Projects
              </Link>
            </div>
          ) : (
            <div className="fl-contracts-list">
              {contracts.slice(0, 3).map((contract) => (
                <div key={contract._id} className="fl-contract-item">
                  <div className="fl-contract-head">
                    <div>
                      <h4 className="fl-contract-title">{contract.title || contract.jobId?.title || 'Contract'}</h4>
                      <div className="fl-contract-meta">
                        <span>Client: <strong>{contract.client?.name || contract.clientId?.name || 'Verified Client'}</strong></span>
                        <span>•</span>
                        <span>Rs. {(contract.budget?.amount || contract.totalAmount || 35000).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="fl-match-chip">
                      <ShieldCheck size={12} />
                      <span>Escrow Funded</span>
                    </span>
                  </div>

                  {/* Milestone mini timeline */}
                  <div className="fl-milestone-bar" title="Milestone Status: Funded & In Progress">
                    <div className="fl-milestone-node fl-milestone-node--released" />
                    <div className="fl-milestone-node fl-milestone-node--funded" />
                    <div className="fl-milestone-node fl-milestone-node--pending" />
                  </div>

                  <div className="fl-contract-foot">
                    <span style={{ fontSize: 12, color: '#64748B' }}>Milestone 1 in progress</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to="/freelancer/messages" className="fl-pill-btn fl-pill-btn--outline" style={{ height: 34, padding: '0 14px', fontSize: 12, width: 'auto' }}>
                        Contact Client
                      </Link>
                      <Link to="/freelancer/work" className="fl-pill-btn fl-pill-btn--emerald" style={{ height: 34, padding: '0 16px', fontSize: 12, width: 'auto' }}>
                        Submit Work
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BentoCard>
      </Reveal>

      {/* =================================================================
          ROW 5: PROPOSAL PIPELINE (Full Width Row, FIX 1)
          ================================================================= */}
      <Reveal delay={70}>
        <BentoCard
          colSpan={12}
          title="Proposal Pipeline"
          icon={ClipboardList}
          action={
            <Link to="/freelancer/proposals" style={{ fontSize: 13, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}>
              My Proposals ({proposals.length}) →
            </Link>
          }
        >
          <div className="fl-pipeline-cols">
            {/* Pending Column */}
            <div className="fl-pipeline-col">
              <div className="fl-pipeline-col__head">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>Pending</span>
                <span className="fl-pipeline-badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
                  {activeProposals}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proposals.filter(p => p.status === 'pending').slice(0, 3).map(p => (
                  <div key={p._id} style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: '#0B2942', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.jobId?.title || 'Project Proposal'}
                    </div>
                    <div style={{ color: '#64748B', marginTop: 2 }}>Rs. {p.fixedPrice || p.hourlyRate || 'Flexible'}</div>
                  </div>
                ))}
                {activeProposals === 0 && (
                  <span style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 10 }}>No pending bids</span>
                )}
              </div>
            </div>

            {/* Accepted Column */}
            <div className="fl-pipeline-col">
              <div className="fl-pipeline-col__head">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Accepted</span>
                <span className="fl-pipeline-badge" style={{ background: '#EAFBF4', color: '#059669' }}>
                  {acceptedProposals}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proposals.filter(p => p.status === 'accepted').slice(0, 3).map(p => (
                  <div key={p._id} style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 10, border: '1px solid #A7F3D0', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: '#065F46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.jobId?.title || 'Hired Project'}
                    </div>
                    <div style={{ color: '#059669', marginTop: 2 }}>Ready to work</div>
                  </div>
                ))}
                {acceptedProposals === 0 && (
                  <span style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 10 }}>None yet</span>
                )}
              </div>
            </div>

            {/* Closed Column */}
            <div className="fl-pipeline-col">
              <div className="fl-pipeline-col__head">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Closed</span>
                <span className="fl-pipeline-badge" style={{ background: '#F1F5F9', color: '#64748B' }}>
                  {rejectedProposals}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proposals.filter(p => p.status === 'rejected' || p.status === 'withdrawn').slice(0, 3).map(p => (
                  <div key={p._id} style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12, opacity: 0.8 }}>
                    <div style={{ fontWeight: 600, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.jobId?.title || 'Closed'}
                    </div>
                    <div style={{ color: '#94A3B8', marginTop: 2 }}>{p.status}</div>
                  </div>
                ))}
                {rejectedProposals === 0 && (
                  <span style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 10 }}>None closed</span>
                )}
              </div>
            </div>
          </div>
        </BentoCard>
      </Reveal>

      {/* =================================================================
          ROW 6: RECOMMENDED JOBS (Infinite Auto-scrolling Marquee Slider, FIX 2)
          ================================================================= */}
      <Reveal delay={0}>
        <BentoCard
          colSpan={12}
          title="Recommended Jobs for Your Skills"
          icon={Sparkles}
          action={
            <Link
              to="/browse-projects"
              style={{ fontSize: 13, fontWeight: 700, color: '#10B981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <span>Browse All Projects</span>
              <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="fl-marquee-wrapper">
            <div className="fl-marquee-track" ref={scrollTrackRef}>
              {recommendedJobs.map((job, idx) => {
                const isSaved = savedProjects.some(sp => (sp._id || sp.id) === (job._id || job.id));
                return (
                  <JobCard
                    key={`${job._id || job.id}-${idx}`}
                    job={job}
                    variant="slider"
                    isSaved={isSaved}
                    onToggleSave={toggleSavedProject}
                    surfaceBg="#FFFFFF"
                  />
                );
              })}
            </div>
          </div>
        </BentoCard>
      </Reveal>

      {/* =================================================================
          ROW 7: SKILL VERIFICATION CENTER (Full Width Row, Scalable to 30+ Skills)
          ================================================================= */}
      <Reveal delay={0}>
        <BentoCard
          colSpan={12}
          title="Skill Verification Center"
          icon={Award}
          action={
            <Link to="/freelancer/skill-test" style={{ fontSize: 13, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}>
              Take Skill Test →
            </Link>
          }
        >
          {allVerifiedSkills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EAFBF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Award size={20} />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0B2942', marginBottom: 4 }}>
                No verified skills yet
              </div>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 16px' }}>
                Pass quick AI-proctored skill tests to earn Verified Badges and boost client response rates.
              </p>
              <Link to="/freelancer/skill-test" className="fl-pill-btn fl-pill-btn--emerald" style={{ padding: '8px 20px', fontSize: 13, width: 'auto' }}>
                Start Baseline Verification
              </Link>
            </div>
          ) : (
            <div>
              {/* Optional Search & Filters when skills > 8 */}
              {allVerifiedSkills.length > 8 && (
                <div className="fl-skills-toolbar">
                  <div className="fl-skills-search-wrap">
                    <Search size={14} className="fl-skills-search-icon" />
                    <input
                      type="text"
                      className="fl-skills-search-input"
                      placeholder="Search skills…"
                      value={skillsSearch}
                      onChange={(e) => setSkillsSearch(e.target.value)}
                    />
                    {skillsSearch && (
                      <button
                        type="button"
                        className="fl-skills-search-clear"
                        onClick={() => setSkillsSearch('')}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="fl-skills-filter-chips">
                    <button
                      type="button"
                      className={`fl-skills-chip${skillsFilter === 'all' ? ' fl-skills-chip--active' : ''}`}
                      onClick={() => setSkillsFilter('all')}
                    >
                      All ({allVerifiedSkills.length})
                    </button>
                    <button
                      type="button"
                      className={`fl-skills-chip${skillsFilter === 'verified' ? ' fl-skills-chip--active' : ''}`}
                      onClick={() => setSkillsFilter('verified')}
                    >
                      Verified ({allVerifiedSkills.filter(s => s.isVerified).length})
                    </button>
                    <button
                      type="button"
                      className={`fl-skills-chip${skillsFilter === 'unverified' ? ' fl-skills-chip--active' : ''}`}
                      onClick={() => setSkillsFilter('unverified')}
                    >
                      Not Verified ({allVerifiedSkills.filter(s => !s.isVerified).length})
                    </button>
                  </div>
                </div>
              )}

              {/* Responsive 4-Column Grid */}
              <div className="fl-skills-grid-scalable">
                {displayedSkills.map((skill, sIdx) => {
                  const score = Math.round(skill.verificationScore || 85);
                  return (
                    <div key={skill._id || skill.name || sIdx} className="fl-skill-card-ref">
                      <div className="fl-skill-card-ref__top">
                        <span className="fl-skill-card-ref__name" title={skill.name}>
                          {skill.name}
                        </span>
                        {skill.isVerified ? (
                          <span className="fl-skill-badge fl-skill-badge--verified" title="Skill Verified">
                            <CheckCircle2 size={11} />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="fl-skill-badge fl-skill-badge--unverified" title="Unverified Skill">
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      <div className="fl-skill-card-ref__meta">
                        <span className="fl-skill-level-chip">{skill.level || 'Intermediate'}</span>
                        <span className="fl-skill-score-label">{score}% Score</span>
                      </div>

                      <div className="fl-progress-thin">
                        <div className="fl-progress-thin__bar" style={{ width: `${score}%` }} />
                      </div>

                      <div className="fl-skill-card-ref__action">
                        <Link
                          to={`/freelancer/skill-test?skill=${encodeURIComponent(skill.name)}`}
                          className="fl-pill-btn fl-pill-btn--outline"
                          style={{ height: 32, padding: '0 12px', fontSize: 12, width: 'auto', display: 'inline-flex' }}
                        >
                          {skill.isVerified ? (
                            <><RotateCcw size={11} /> Retake Test</>
                          ) : (
                            <><Play size={11} /> Verify Skill</>
                          )}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show All / Show Less Expand Pill */}
              {filteredSkills.length > 8 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                  <button
                    type="button"
                    className="fl-pill-btn fl-pill-btn--outline"
                    onClick={() => setSkillsExpanded(prev => !prev)}
                    style={{ height: 36, padding: '0 20px', fontSize: 12.5, width: 'auto' }}
                  >
                    {skillsExpanded ? 'Show Less' : `Show All (${filteredSkills.length}) Skills`}
                  </button>
                </div>
              )}
            </div>
          )}
        </BentoCard>
      </Reveal>

      {/* =================================================================
          ROW 8: RECENT SERVICE GIGS (Full Width Row, 2-Column Responsive Grid)
          ================================================================= */}
      <Reveal delay={60}>
        <BentoCard
          colSpan={12}
          title="Recent Service Gigs"
          icon={Package}
          action={
            <Link to="/freelancer/gigs" style={{ fontSize: 13, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}>
              All Gigs ({gigs.length}) →
            </Link>
          }
        >
          {gigs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Package size={20} />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0B2942', marginBottom: 4 }}>
                No published gigs yet
              </div>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 16px' }}>
                Create pre-packaged freelance gigs with 3-tier pricing so clients can hire you directly.
              </p>
              <Link to="/freelancer/gigs/create" className="fl-pill-btn fl-pill-btn--emerald" style={{ padding: '8px 20px', fontSize: 13, width: 'auto' }}>
                <Plus size={14} /> Create Your First Gig
              </Link>
            </div>
          ) : (
            <div>
              {/* 2-Column Responsive Grid on Desktop */}
              <div className="fl-gigs-grid-scalable">
                {displayedGigs.map((gig, gIdx) => {
                  const price = gig.pricing?.basic?.price || gig.price || 5000;
                  const isActive = gig.status === 'active' || !gig.status;
                  return (
                    <div key={gig._id || gig.id || gIdx} className="fl-gig-row-card">
                      <div className="fl-gig-row-left">
                        <div className="fl-gig-row-icon">
                          <Package size={17} strokeWidth={2} />
                        </div>
                        <div className="fl-gig-row-info">
                          <h5 className="fl-gig-row-title" title={gig.title}>
                            {gig.title}
                          </h5>
                          <div className="fl-gig-row-meta">
                            <span>{gig.category || 'Freelance'}</span>
                            <span>•</span>
                            <span className="fl-gig-row-price">From Rs. {Number(price).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="fl-gig-row-right">
                        <span className={`fl-gig-status-chip fl-gig-status-chip--${isActive ? 'active' : 'paused'}`}>
                          {isActive ? 'ACTIVE' : (gig.status || 'PAUSED').toUpperCase()}
                        </span>
                        <Link to={`/gigs/${gig._id || gig.id}`} className="fl2-icon-btn fl2-icon-btn--sm" title="View Gig">
                          <ChevronRight size={15} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show More Expand / View All Link */}
              {gigs.length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 18 }}>
                  {!gigsExpanded && gigs.length > 5 ? (
                    <button
                      type="button"
                      className="fl-pill-btn fl-pill-btn--outline"
                      onClick={() => setGigsExpanded(true)}
                      style={{ height: 36, padding: '0 20px', fontSize: 12.5, width: 'auto' }}
                    >
                      Show More (+{Math.min(gigs.length - 5, 5)})
                    </button>
                  ) : null}
                  <Link
                    to="/freelancer/gigs"
                    style={{ fontSize: 12.5, fontWeight: 700, color: '#10B981', textDecoration: 'none' }}
                  >
                    View All {gigs.length} Gigs on My Gigs Page →
                  </Link>
                </div>
              )}
            </div>
          )}
        </BentoCard>
      </Reveal>

      {/* =================================================================
          ROW G: SHARE SUCCESS STORY (Expandable Banner)
          ================================================================= */}
      <Reveal delay={0}>
        <section className="fl-story-banner" onClick={() => setStoryOpen(prev => !prev)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#EAFBF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={22} fill="#10B981" />
              </div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0B2942', margin: '0 0 2px' }}>
                  {existingStory ? 'Your SkillKart Success Story ✨' : 'Share Your Freelance Success Story'}
                </h4>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  {existingStory
                    ? 'Your story is published on the public SkillKart homepage. Click to edit or update.'
                    : 'Inspire thousands of clients and students. Approved stories appear directly on the SkillKart homepage!'}
                </p>
              </div>
            </div>
            <button type="button" className="fl-pill-btn fl-pill-btn--emerald" style={{ padding: '8px 20px', fontSize: 13 }}>
              {storyOpen ? 'Close Form' : existingStory ? 'Edit Story' : 'Share Story'}
            </button>
          </div>

          {storyOpen && (
            <div className="fl-story-banner__expand" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleSaveStory}>
                {/* Star Rating Selection */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0B2942' }}>Your Platform Rating:</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                        onClick={() => setStoryRating(star)}
                        aria-label={`${star} Stars`}
                      >
                        <Star
                          size={20}
                          fill={star <= storyRating ? '#F59E0B' : 'none'}
                          color={star <= storyRating ? '#F59E0B' : '#CBD5E1'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea & AI Generator */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label htmlFor="dashboard-story-text" style={{ fontSize: 12.5, fontWeight: 700, color: '#0B2942' }}>
                      Your Experience & Achievements
                    </label>
                    <AiGenerateText
                      fieldLabel="a student freelancer sharing their success story on SkillKart"
                      getContext={() => ({
                        name: fullName,
                        gigsCount: gigs.length,
                        rating: profile?.stats?.rating || 5,
                        skills: profile?.verifiedSkills?.map(s => s.name).join(', ')
                      })}
                      getExistingText={() => storyText}
                      onGenerated={(txt) => setStoryText(txt.slice(0, 600))}
                    />
                  </div>
                  <textarea
                    id="dashboard-story-text"
                    value={storyText}
                    onChange={e => setStoryText(e.target.value.slice(0, 600))}
                    placeholder="Tell your story: How did SkillKart help you land gigs, acquire clients, or grow your freelance career?"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 14,
                      border: '1px solid #CBD5E1',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                    <span>Min 20 characters</span>
                    <span>{storyText.length} / 600 characters</span>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="submit"
                    className="fl-pill-btn fl-pill-btn--emerald"
                    disabled={storySaving}
                  >
                    <Send size={14} />
                    <span>{storySaving ? 'Saving…' : existingStory ? 'Update Story' : 'Publish Story'}</span>
                  </button>
                  {existingStory && (
                    <button
                      type="button"
                      className="fl-pill-btn fl-pill-btn--outline"
                      style={{ color: '#DC2626', borderColor: '#FECACA' }}
                      onClick={handleDeleteStory}
                      disabled={storySaving}
                    >
                      <Trash2 size={14} />
                      <span>Remove Story</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}
