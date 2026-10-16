import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Code, Briefcase, Headphones, Database, TrendingUp,
  ArrowUpRight, Info, MoreHorizontal, Check
} from 'lucide-react';
import './TrendingSkills.css';

// Skills data matching Reference
const REACT_DEFAULT = {
  id: 'react',
  name: 'React',
  categorySlug: 'web-development',
  rank: '#1 MOST REQUESTED',
  percent: 85,
  activeGigs: 18,
  verifiedCount: 18,
  avgPrice: 'Rs. 8,068',
  rating: 4.3,
  tag: '85% • #1 Hot',
  iconType: 'react',
};

const TIMELINE_SKILLS = [
  {
    id: 'typescript',
    name: 'TypeScript',
    categorySlug: 'web-development',
    rank: '#2 MOST REQUESTED',
    percent: 80,
    activeGigs: 17,
    verifiedCount: 16,
    avgPrice: 'Rs. 9,059',
    rating: 4.6,
    tag: '80% • #2 Hot',
    subLeft: '17 active gigs',
    subRight: 'Rs. 9,059 • 4.6 ★',
    iconType: 'ts',
  },
  {
    id: 'python',
    name: 'Python',
    categorySlug: 'ai-and-machine-learning',
    rank: '#3 MOST REQUESTED',
    percent: 85,
    activeGigs: 16,
    verifiedCount: 15,
    avgPrice: 'Rs. 10,406',
    rating: 4.3,
    tag: '85% • #3 Hot',
    subLeft: '16 gigs',
    subRight: 'Rs. 10,406 • 4.3 ★',
    iconType: 'python',
  },
  {
    id: 'project-management',
    name: 'Project Management',
    categorySlug: 'business-consulting',
    rank: '#4 MOST REQUESTED',
    percent: 95,
    activeGigs: 15,
    verifiedCount: 15,
    avgPrice: 'Rs. 7,500',
    rating: 4.8,
    tag: '95% • 15 gigs',
    subLeft: '15 gigs',
    subRight: 'Rs. 7,500 • 4.8 ★',
    iconType: 'pm',
  },
  {
    id: 'virtual-assistance',
    name: 'Virtual Assistance',
    categorySlug: 'business-consulting',
    rank: '#5 MOST REQUESTED',
    percent: 90,
    activeGigs: 15,
    verifiedCount: 14,
    avgPrice: 'Rs. 5,200',
    rating: 4.7,
    tag: '90% • 15 gigs',
    subLeft: '15 gigs',
    subRight: 'Rs. 5,200 • 4.7 ★',
    iconType: 'va',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    categorySlug: 'web-development',
    rank: '#6 MOST REQUESTED',
    percent: 80,
    activeGigs: 15,
    verifiedCount: 14,
    avgPrice: 'Rs. 6,800',
    rating: 4.5,
    tag: '80% • 15 gigs',
    subLeft: '15 gigs',
    subRight: 'Rs. 6,800 • 4.5 ★',
    iconType: 'mongo',
  },
  {
    id: 'business-consulting',
    name: 'Business Consulting',
    categorySlug: 'business-consulting',
    rank: '#7 MOST REQUESTED',
    percent: 75,
    activeGigs: 15,
    verifiedCount: 12,
    avgPrice: 'Rs. 8,900',
    rating: 4.6,
    tag: '75% • 15 gigs',
    subLeft: '15 gigs',
    subRight: 'Rs. 8,900 • 4.6 ★',
    iconType: 'bc',
  },
];

// Student avatars for Talent Match Hub
const TALENT_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
];

export default function TrendingSkills() {
  const [focusSkill, setFocusSkill] = useState(REACT_DEFAULT);
  const [activeTimelineId, setActiveTimelineId] = useState('project-management');

  const handleTimelineClick = (skill) => {
    setActiveTimelineId(skill.id);
    setFocusSkill(skill);
  };

  const renderSkillIcon = (type) => {
    switch (type) {
      case 'ts':
        return <span className="ts-icon-badge ts-icon-badge--ts">TS</span>;
      case 'python':
        return (
          <span className="ts-icon-badge ts-icon-badge--py" title="Python">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M11.9 2C7.8 2 8.1 3.8 8.1 3.8L8.1 5.6H12v.6H6.4S4 5.9 4 10.1s2.1 4.2 2.1 4.2h1.3v-1.9s-.1-2.1 2.1-2.1h3.9s2 0 2-2V4.1S15.9 2 11.9 2zm-1.8 1.4a.7.7 0 110 1.4.7.7 0 010-1.4z" fill="#387EB8" />
              <path d="M12.1 22c4.1 0 3.8-1.8 3.8-1.8l0-1.8h-3.9v-.6h5.6s2.4.3 2.4-3.9-2.1-4.2-2.1-4.2h-1.3v1.9s.1 2.1-2.1 2.1h-3.9s-2 0-2 2v4.2s-.5 2.1 3.5 2.1zm1.8-1.4a.7.7 0 110-1.4.7.7 0 010 1.4z" fill="#FFE052" />
            </svg>
          </span>
        );
      case 'pm':
        return <Briefcase size={16} className="ts-icon-svg ts-icon-svg--pm" />;
      case 'va':
        return <Headphones size={16} className="ts-icon-svg ts-icon-svg--va" />;
      case 'mongo':
        return <Database size={16} className="ts-icon-svg ts-icon-svg--mongo" />;
      case 'bc':
        return <TrendingUp size={16} className="ts-icon-svg ts-icon-svg--bc" />;
      default:
        return <Code size={16} className="ts-icon-svg" />;
    }
  };

  return (
    <section className="trending-section" id="trending-skills">
      <div className="container">
        {/* ── Section Header ── */}
        <div className="trending-header">
          <div className="trending-header__left">
            <h2 className="trending-title">
              Top In-Demand <span className="trending-title--accent">Skills</span>
            </h2>
            <p className="trending-subtitle">
              Real-time algorithmic demand signals across micro-tasks and client contracts.
              Discover where verified talent is delivering high-value outcomes.{' '}
              <span className="ts-live-tag">
                <span className="ts-live-dot" /> LIVE ALGORITHMIC HEATMAP
              </span>
            </p>
          </div>

          <Link to="/categories" className="trending-explore-btn">
            <span>Explore All Skills</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* ── 3-Column Dashboard with Animated Circuit Connections ── */}
        <div className="ts-dashboard-stage">
          {/* ════ Column 1: Interactive "Focus & Demand Center" ════ */}
          <div className="ts-col-block ts-col-block--focus">
            <div className="ts-col-label">Interactive "Focus & Demand Center"</div>

            <div className="ts-focus-card">
              {/* ── Dark Green Gradient Console Top ── */}
              <div className="ts-focus-top">
                {/* Center Tab for Badge with Golden Glow */}
                <div className="ts-top-tab-notch">
                  <div className="ts-gold-halo" />
                  <span className="ts-focus-badge">{focusSkill.rank}</span>
                </div>

                {/* Twinkling Sparkles (✦) & Telemetry Dots */}
                <div className="ts-sparkle ts-sparkle--tl">✦</div>
                <div className="ts-sparkle-dot ts-sparkle-dot--tl" />
                <div className="ts-sparkle ts-sparkle--tr">✦</div>
                <div className="ts-sparkle ts-sparkle--tr-sub">✦</div>
                <div className="ts-sparkle-dot ts-sparkle-dot--tr" />

                <h3 className="ts-focus-name">{focusSkill.name}</h3>

                {/* ── Larger Radial Gauge Circle (210px) ── */}
                <div className="ts-gauge-wrapper">
                  <svg className="ts-gauge-svg" viewBox="0 0 210 210">
                    <defs>
                      <linearGradient id="tsHeroGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2DD4BF" />
                        <stop offset="45%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                      <filter id="tsGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#2DD4BF" floodOpacity="0.8" />
                      </filter>
                    </defs>

                    {/* Rotating Concentric Radar Orbits */}
                    <g className="ts-radar-orbit-group">
                      <circle cx="105" cy="105" r="98" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="1.2" strokeDasharray="3 4" fill="none" />
                      <circle cx="105" cy="105" r="92" stroke="rgba(45, 212, 191, 0.15)" strokeWidth="1" fill="none" />
                      <circle cx="105" cy="105" r="64" stroke="rgba(45, 212, 191, 0.10)" strokeWidth="1" strokeDasharray="2 3" fill="none" />
                    </g>

                    {/* Gauge Base Track Ring */}
                    <circle
                      className="ts-gauge-track"
                      cx="105"
                      cy="105"
                      r="80"
                    />

                    {/* Glowing Progress Arc */}
                    <circle
                      className="ts-gauge-bar"
                      cx="105"
                      cy="105"
                      r="80"
                      stroke="url(#tsHeroGaugeGrad)"
                      strokeDasharray="502.6"
                      strokeDashoffset={502.6 * (1 - focusSkill.percent / 100)}
                    />
                  </svg>

                  {/* Inside Circle Content - Larger & Clear */}
                  <div className="ts-gauge-content">
                    <span className="ts-gauge-percent">{focusSkill.percent}%</span>
                    <span className="ts-gauge-skill">{focusSkill.name}</span>
                    <span className="ts-gauge-meta">
                      From {focusSkill.avgPrice} / Avg {focusSkill.rating} ★
                    </span>
                  </div>
                </div>
              </div>

              {/* ── White Lower Half with Smooth Curved Arch Cutout ── */}
              <div className="ts-focus-bottom">
                {/* 5-Step Connected Progress Dots */}
                <div className="ts-step-track">
                  <span className="ts-step-dot ts-step-dot--first" />
                  <span className="ts-step-line ts-step-line--done" />
                  <span className="ts-step-dot ts-step-dot--active">
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                  <span className="ts-step-line" />
                  <span className="ts-step-dot" />
                  <span className="ts-step-line" />
                  <span className="ts-step-dot" />
                  <span className="ts-step-line" />
                  <span className="ts-step-dot" />
                </div>

                {/* 3 Meta Pills - Generous breathing room, NO overflow! */}
                <div className="ts-focus-pills">
                  <span className="ts-meta-pill">
                    📁 {focusSkill.activeGigs} Active Gigs
                  </span>
                  <span className="ts-meta-pill ts-meta-pill--verified">
                    🛡️ {focusSkill.verifiedCount} Verified
                  </span>
                  <span className="ts-meta-pill ts-meta-pill--fast">
                    ✓ Fast Delivery
                  </span>
                </div>

                {/* Dark Midnight Pill CTA Button */}
                <Link
                  to={`/skills/${focusSkill.categorySlug}`}
                  className="ts-focus-cta"
                >
                  <span>Find Freelancers in {focusSkill.name}</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          {/* ════ Animated Connector Branch 1 (Col 1 to Col 2) ════ */}
          <div className="ts-connector-cell ts-connector-cell--left">
            <svg className="ts-branch-svg" viewBox="0 0 48 480" fill="none" preserveAspectRatio="none">
              {/* Base grey line */}
              <path d="M 0 240 L 18 240" stroke="#CBD5E1" strokeWidth="1.5" />
              <line x1="18" y1="42" x2="18" y2="438" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />

              {/* Animated electric signal pulse line */}
              <path d="M 0 240 L 18 240" stroke="#10B981" strokeWidth="2.2" strokeDasharray="6 8" className="ts-signal-pulse" />
              <line x1="18" y1="42" x2="18" y2="438" stroke="#10B981" strokeWidth="1.6" strokeDasharray="5 7" className="ts-signal-pulse" />

              {/* Branch to TypeScript (#1) */}
              <circle cx="18" cy="42" r="3.5" fill="#10B981" className="ts-node-dot" />
              <path d="M 18 42 C 30 42 36 42 48 42" stroke="#CBD5E1" strokeWidth="1.5" />
              <path d="M 18 42 C 30 42 36 42 48 42" stroke="#10B981" strokeWidth="2" strokeDasharray="6 6" className="ts-signal-pulse" />

              {/* Branch to Project Management (#3) */}
              <circle cx="18" cy="180" r="4.5" fill="#10B981" className="ts-node-dot ts-node-dot--active" />
              <path d="M 18 180 C 30 180 36 180 48 180" stroke="#10B981" strokeWidth="2.2" />
              <path d="M 18 180 C 30 180 36 180 48 180" stroke="#2DD4BF" strokeWidth="2.5" strokeDasharray="8 8" className="ts-signal-pulse" />

              {/* Branch to MongoDB (#5) */}
              <circle cx="18" cy="350" r="3.5" fill="#10B981" className="ts-node-dot" />
              <path d="M 18 350 C 30 350 36 350 48 350" stroke="#CBD5E1" strokeWidth="1.5" />
              <path d="M 18 350 C 30 350 36 350 48 350" stroke="#10B981" strokeWidth="2" strokeDasharray="6 6" className="ts-signal-pulse" />

              {/* Animated Light Packet traveling along the bus */}
              <circle r="3" fill="#2DD4BF" filter="drop-shadow(0 0 5px #2DD4BF)">
                <animateMotion path="M 0 240 L 18 240 L 18 180 C 30 180 36 180 48 180" dur="2.8s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* ════ Column 2: Performance & Demand Flow Timeline ════ */}
          <div className="ts-col-block ts-col-block--timeline">
            <div className="ts-col-label">Performance & Demand Flow Timeline</div>

            <div className="ts-timeline-list">
              {TIMELINE_SKILLS.map((skill) => {
                const isSelected = activeTimelineId === skill.id;
                return (
                  <div
                    key={skill.id}
                    className={`ts-timeline-card ${isSelected ? 'ts-timeline-card--active' : ''}`}
                    onClick={() => handleTimelineClick(skill)}
                  >
                    <div className="ts-card-left">
                      <div className="ts-card-icon-box">
                        {renderSkillIcon(skill.iconType)}
                      </div>

                      <div className="ts-card-info">
                        <div className="ts-card-title-row">
                          <span className="ts-card-title">{skill.name}</span>
                          <span className="ts-card-tag">{skill.tag}</span>
                        </div>

                        {/* Animated Progress Bar with Shimmer Beam */}
                        <div className="ts-progress-wrap">
                          <div
                            className="ts-progress-fill"
                            style={{ width: `${skill.percent}%` }}
                          >
                            <span className="ts-progress-shimmer-beam" />
                          </div>
                        </div>

                        <div className="ts-card-meta-row">
                          <span className="ts-meta-left">{skill.subLeft}</span>
                          <span className="ts-meta-right">{skill.subRight}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ════ Animated Connector Branch 2 (Col 2 to Col 3) ════ */}
          <div className="ts-connector-cell ts-connector-cell--right">
            <svg className="ts-branch-svg" viewBox="0 0 48 480" fill="none" preserveAspectRatio="none">
              {/* Origin node on active card */}
              <circle cx="0" cy="180" r="4.5" fill="#10B981" className="ts-node-dot ts-node-dot--active" />

              {/* Base curves */}
              <path d="M 0 180 C 24 180 24 70 48 70" stroke="#A7F3D0" strokeWidth="1.8" />
              <path d="M 0 180 C 24 180 24 290 48 290" stroke="#A7F3D0" strokeWidth="1.8" />

              {/* Flowing animated signal pulse lines */}
              <path d="M 0 180 C 24 180 24 70 48 70" stroke="#10B981" strokeWidth="2.4" strokeDasharray="8 10" className="ts-signal-pulse" />
              <path d="M 0 180 C 24 180 24 290 48 290" stroke="#10B981" strokeWidth="2.4" strokeDasharray="8 10" className="ts-signal-pulse" />

              {/* Terminal connection nodes */}
              <circle cx="48" cy="70" r="3.5" fill="#10B981" className="ts-node-dot" />
              <circle cx="48" cy="290" r="3.5" fill="#10B981" className="ts-node-dot" />

              {/* Animated Light Packets flowing along both curves */}
              <circle r="3.2" fill="#2DD4BF" filter="drop-shadow(0 0 5px #2DD4BF)">
                <animateMotion path="M 0 180 C 24 180 24 70 48 70" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle r="3.2" fill="#2DD4BF" filter="drop-shadow(0 0 5px #2DD4BF)">
                <animateMotion path="M 0 180 C 24 180 24 290 48 290" dur="2.2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* ════ Column 3: Live Market Telemetry & Tickers ════ */}
          <div className="ts-col-block ts-col-block--telemetry">
            <div className="ts-col-label">Live Market Telemetry & Tickers</div>

            {/* Card 1: Live Ticker Strip */}
            <div className="ts-telemetry-card ts-telemetry-card--ticker">
              <div className="ts-telemetry-card__head">
                <span className="ts-telemetry-card__title">Live Ticker Strip</span>
                <MoreHorizontal size={16} className="ts-dots" />
              </div>

              <div className="ts-ticker-feed">
                <div className="ts-ticker-row">
                  <span className="ts-ticker-bullet">●</span>
                  <span className="ts-ticker-txt">
                    <strong>Maya</strong> completed API Script • <span className="ts-green">+$180</span>
                    <span className="ts-ticker-pipe">|</span>
                    <span className="ts-ticker-bullet ts-ticker-bullet--sub">●</span>
                    <strong>Alex</strong>
                  </span>
                </div>
                <div className="ts-ticker-row">
                  <span className="ts-ticker-bullet">●</span>
                  <span className="ts-ticker-txt">
                    <strong>Alex</strong> designed Logo • <span className="ts-green">+$95</span>
                  </span>
                </div>
                <div className="ts-ticker-row">
                  <span className="ts-ticker-bullet">●</span>
                  <span className="ts-ticker-txt">
                    <strong>Dev</strong> built Landing Page • <span className="ts-green">+$320</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Talent Match Hub */}
            <div className="ts-telemetry-card ts-telemetry-card--hub">
              <div className="ts-telemetry-card__head">
                <span className="ts-telemetry-card__title">Talent Match Hub</span>
                <MoreHorizontal size={16} className="ts-dots" />
              </div>

              {/* Overlapping Avatars + Signal Hire Button */}
              <div className="ts-hub-avatars-row">
                <div className="ts-avatars-cluster">
                  {TALENT_AVATARS.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Verified Student Freelancer"
                      className="ts-avatar-img"
                    />
                  ))}
                </div>

                <Link to="/browse-freelancers" className="ts-hire-btn">
                  <span className="ts-hire-signal" aria-hidden="true">
                    <span className="ts-bar ts-bar--1" />
                    <span className="ts-bar ts-bar--2" />
                    <span className="ts-bar ts-bar--3" />
                  </span>
                  <span>Hire</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>

              {/* Telemetry Metric 1: Active Match Rate */}
              <div className="ts-telemetry-stat">
                <div className="ts-telemetry-stat__info">
                  <div className="ts-stat-lbl">
                    <span>Active Match Rate</span>
                    <Info size={11} className="ts-info-icon" />
                  </div>
                  <div className="ts-stat-val">94%</div>
                </div>

                <svg className="ts-sparkline" viewBox="0 0 110 36" fill="none">
                  <defs>
                    <linearGradient id="tsGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 2 24 C 18 26 28 8 42 16 C 54 22 66 4 80 14 C 94 22 102 6 108 4"
                    stroke="#10B981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 2 24 C 18 26 28 8 42 16 C 54 22 66 4 80 14 C 94 22 102 6 108 4 L 108 36 L 2 36 Z"
                    fill="url(#tsGrad1)"
                  />
                </svg>
              </div>

              {/* Telemetry Metric 2: Active Tasks Completed */}
              <div className="ts-telemetry-stat">
                <div className="ts-telemetry-stat__info">
                  <div className="ts-stat-lbl">Active Tasks Completed</div>
                  <div className="ts-stat-val">--</div>
                </div>

                <svg className="ts-sparkline" viewBox="0 0 110 36" fill="none">
                  <path
                    d="M 2 18 L 14 26 L 26 8 L 38 24 L 50 6 L 62 20 L 74 12 L 86 26 L 98 8 L 108 14"
                    stroke="#10B981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Telemetry Metric 3: Mini Demand Trends */}
              <div className="ts-telemetry-stat">
                <div className="ts-telemetry-stat__info">
                  <div className="ts-stat-lbl">
                    <span>Mini Demand Trends</span>
                    <Info size={11} className="ts-info-icon" />
                  </div>
                  <div className="ts-stat-val ts-stat-val--green">
                    ↗ +$320
                  </div>
                </div>

                <svg className="ts-sparkline" viewBox="0 0 110 36" fill="none">
                  <defs>
                    <linearGradient id="tsGrad3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 2 30 C 22 30 38 24 54 18 C 72 11 88 6 108 2"
                    stroke="#10B981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 2 30 C 22 30 38 24 54 18 C 72 11 88 6 108 2 L 108 36 L 2 36 Z"
                    fill="url(#tsGrad3)"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
