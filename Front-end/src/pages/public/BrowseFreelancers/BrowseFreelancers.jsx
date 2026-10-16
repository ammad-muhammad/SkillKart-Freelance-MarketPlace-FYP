import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, ChevronDown, X, RotateCcw,
  Star, CheckCircle2, MapPin, Bookmark, BookmarkCheck,
  ArrowRight, Sparkles, Filter, Grid, List, Check,
  DollarSign, Award, Briefcase, Zap, ShieldCheck
} from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { freelancersAPI } from '../../../api/freelancers';
import { publicAPI } from '../../../api/publicData';
import { aiAPI } from '../../../api/ai';
import { ALL_SKILLS } from '../../../utils/mockData';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import TagInput from '../../../Components/common/TagInput/TagInput';
import { useClient } from '../../../context/ClientContext';
import { useAuth } from '../../../hooks/useAuth';
import './BrowseFreelancers.css';

/* Map API response to Card object */
const mapProfileToCard = (p) => {
  const u = p.userId || {};
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || (u.email ? u.email.split('@')[0] : 'Freelancer');
  return {
    id: String(u._id || p.userId || p._id),
    name: fullName,
    avatar: u.profilePicture ? null : (u.firstName?.[0]?.toUpperCase() || 'U'),
    avatarUrl: u.profilePicture || null,
    avatarBg: 'linear-gradient(135deg, #0B2942, #10B981)',
    role: p.title || 'Specialist & Freelancer',
    bio: p.bio || '',
    skills: (p.skills || []).map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean),
    rating: p.rating || u.rating || 5.0,
    reviewCount: p.completedProjects || 0,
    hourlyRate: p.hourlyRate || 0,
    currency: 'PKR',
    isVerified: p.verificationStatus === 'verified',
    isOnline: true,
    location: p.timezone || 'Global / Remote',
    availability: p.availability || 'full-time',
  };
};

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'rate_asc', label: 'Rate: Low → High' },
  { value: 'rate_desc', label: 'Rate: High → Low' },
];

const POPULAR_DOMAINS = [
  'All',
  'Web Development',
  'Mobile Apps',
  'UI/UX Design',
  'AI & Machine Learning',
  'Graphic Design',
  'Content & SEO',
  'Video Editing'
];

const RATE_PRESETS = [
  { label: 'Any Rate', max: 100 },
  { label: 'Under Rs. 1,000/hr', max: 1000 },
  { label: 'Under Rs. 2,500/hr', max: 2500 },
  { label: 'Under Rs. 5,000/hr', max: 5000 },
  { label: 'Under Rs. 10,000/hr', max: 10000 },
];

/* ── Skeleton Card ── */
function SkeletonCard({ list }) {
  return (
    <div className={`bf-card-skeleton ${list ? 'bf-card-skeleton--list' : ''}`}>
      <div className="bf-skel-header">
        <div className="bf-skel-avatar bf-skel-pulse" />
        <div className="bf-skel-info">
          <div className="bf-skel-line bf-skel-line--title bf-skel-pulse" />
          <div className="bf-skel-line bf-skel-line--sub bf-skel-pulse" />
        </div>
      </div>
      <div className="bf-skel-body">
        <div className="bf-skel-line bf-skel-line--text bf-skel-pulse" />
        <div className="bf-skel-line bf-skel-line--text-short bf-skel-pulse" />
      </div>
      <div className="bf-skel-tags">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bf-skel-tag bf-skel-pulse" />
        ))}
      </div>
      <div className="bf-skel-footer">
        <div className="bf-skel-line bf-skel-line--price bf-skel-pulse" />
        <div className="bf-skel-btn bf-skel-pulse" />
      </div>
    </div>
  );
}

/* ── Modern Bento Freelancer Card ── */
function FreelancerCard({ freelancer, list, onInvite, isSaved, onToggleSave, isClient }) {
  const {
    id, name, avatar, avatarUrl, avatarBg, role, bio, skills,
    rating, reviewCount, hourlyRate, currency,
    isVerified, isOnline, location, availability
  } = freelancer;

  const displayRate = hourlyRate > 0 ? hourlyRate.toLocaleString() : '500';

  if (list) {
    return (
      <div className="bf-card bf-card--list">
        <div className="bf-card-list__left">
          <div className="bf-avatar-wrap" style={{ background: avatarBg }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} loading="lazy" className="bf-avatar-img" />
            ) : (
              <span className="bf-avatar-initials">{avatar}</span>
            )}
            {isOnline && <span className="bf-online-dot" title="Online now" />}
          </div>
        </div>

        <div className="bf-card-list__center">
          <div className="bf-card-name-row">
            <h3 className="bf-card-name" onClick={() => onInvite(id)}>{name}</h3>
            {isVerified && (
              <span className="bf-verified-badge" title="AI-Verified SkillKart Talent">
                <CheckCircle2 size={13} className="bf-verified-icon" />
                <span>Verified Pro</span>
              </span>
            )}
            <span className="bf-availability-pill">
              {availability === 'part-time' ? 'Part-time' : 'Full-time'}
            </span>
          </div>

          <p className="bf-card-role">{role}</p>
          {bio && <p className="bf-card-bio">{bio}</p>}

          <div className="bf-card-tags">
            {skills.slice(0, 5).map((skill) => (
              <span key={skill} className="bf-skill-tag">{skill}</span>
            ))}
            {skills.length > 5 && (
              <span className="bf-skill-tag bf-skill-tag--more">+{skills.length - 5}</span>
            )}
          </div>
        </div>

        <div className="bf-card-list__right">
          <div className="bf-card-rate-box">
            <span className="bf-rate-amount">Rs. {displayRate}</span>
            <span className="bf-rate-period">/ hour</span>
          </div>

          <div className="bf-meta-row">
            <div className="bf-rating-pill">
              <Star size={13} fill="#F59E0B" color="#F59E0B" />
              <strong>{rating.toFixed(1)}</strong>
              <span className="bf-rating-count">({reviewCount})</span>
            </div>
            {location && (
              <div className="bf-location-pill" title={location}>
                <MapPin size={12} />
                <span>{location}</span>
              </div>
            )}
          </div>

          <div className="bf-card-actions">
            {isClient && (
              <button
                type="button"
                className={`bf-save-btn ${isSaved ? 'bf-save-btn--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleSave(freelancer); }}
                title={isSaved ? 'Remove from saved' : 'Save freelancer'}
              >
                {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>
            )}
            <button
              type="button"
              className="bf-view-profile-btn"
              onClick={() => onInvite(id)}
            >
              <span>View Profile</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bf-card bf-card--grid">
      <div className="bf-card__top">
        <div className="bf-avatar-wrap" style={{ background: avatarBg }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} loading="lazy" className="bf-avatar-img" />
          ) : (
            <span className="bf-avatar-initials">{avatar}</span>
          )}
          {isOnline && <span className="bf-online-dot" title="Online now" />}
        </div>

        <div className="bf-card__top-info">
          <div className="bf-card-name-row">
            <h3 className="bf-card-name" onClick={() => onInvite(id)}>{name}</h3>
            {isClient && (
              <button
                type="button"
                className={`bf-save-btn ${isSaved ? 'bf-save-btn--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleSave(freelancer); }}
                title={isSaved ? 'Remove from saved' : 'Save freelancer'}
              >
                {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
            )}
          </div>

          <p className="bf-card-role">{role}</p>

          <div className="bf-badge-row">
            {isVerified && (
              <span className="bf-verified-badge" title="AI-Verified SkillKart Talent">
                <CheckCircle2 size={12} className="bf-verified-icon" />
                <span>Verified Pro</span>
              </span>
            )}
            <div className="bf-rating-pill">
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <strong>{rating.toFixed(1)}</strong>
              <span className="bf-rating-count">({reviewCount})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bf-card__body">
        {bio ? (
          <p className="bf-card-bio">{bio}</p>
        ) : (
          <p className="bf-card-bio bf-card-bio--empty">Verified expert ready for your projects.</p>
        )}

        <div className="bf-card-tags">
          {skills.slice(0, 3).map((skill) => (
            <span key={skill} className="bf-skill-tag">{skill}</span>
          ))}
          {skills.length > 3 && (
            <span className="bf-skill-tag bf-skill-tag--more">+{skills.length - 3}</span>
          )}
        </div>
      </div>

      <div className="bf-card__footer">
        <div className="bf-card__footer-meta">
          <div className="bf-card-rate-box">
            <span className="bf-rate-amount">Rs. {displayRate}</span>
            <span className="bf-rate-period">/hr</span>
          </div>
          {location && (
            <div className="bf-location-pill" title={location}>
              <MapPin size={11} />
              <span>{location}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="bf-view-profile-btn"
          onClick={() => onInvite(id)}
        >
          <span>View Profile</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────── MAIN BROWSE FREELANCERS COMPONENT ─────────────── */
export default function BrowseFreelancers() {
  const navigate = useNavigate();
  const { savedFreelancers = [], toggleSavedFreelancer } = useClient() || {};
  const { isClient } = useAuth();

  /* Search & Filter state */
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [maxRate, setMaxRate] = useState(100);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [location, setLocation] = useState('');
  const [dynamicLocations, setDynamicLocations] = useState([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [page, setPage] = useState(1);
  const PER_PAGE = 9;

  /* Popovers */
  const [activePopover, setActivePopover] = useState(null); // 'rate' | 'rating' | 'location' | 'skills'
  const filterBarRef = useRef(null);

  /* Data state */
  const [freelancers, setFreelancers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroStats, setHeroStats] = useState([]);

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);
  const fetchSeq = useRef(0);

  // Close popovers on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActivePopover(null);
    };
    const handleClickOutside = (e) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch initial stats & locations
  useEffect(() => {
    let on = true;
    publicAPI.getStats()
      .then((res) => {
        if (!on) return;
        const s = res?.data?.data || {};
        const chips = [];
        if (Number(s.freelancers) > 0) chips.push(`${Number(s.freelancers).toLocaleString()} Verified Talents`);
        if (s.avgRating != null) chips.push(`★ ${s.avgRating} Avg Rating`);
        if (Number(s.categories) > 0) chips.push(`${s.categories} Categories`);
        chips.push('100% Escrow Protected');
        setHeroStats(chips);
      })
      .catch(() => {
        if (on) setHeroStats(['500+ Verified Talents', '★ 4.9 Avg Rating', '100% Escrow Protected']);
      });

    freelancersAPI.getLocations()
      .then((res) => {
        if (on && res.data?.data) {
          setDynamicLocations(res.data.data);
        }
      })
      .catch(() => {});

    return () => { on = false; };
  }, []);

  // Document Title
  useEffect(() => {
    document.title = 'Browse Top Freelancers – SkillKart';
  }, []);

  // Fetch freelancers from API
  const fetchFreelancers = useCallback(async () => {
    const requestId = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      // Determine final query string including category pill if not "All"
      let effectiveQuery = query;
      if (activeCategory !== 'All' && !effectiveQuery) {
        effectiveQuery = activeCategory;
      }

      const params = {
        q: effectiveQuery || undefined,
        minRating: minRating > 0 ? minRating : undefined,
        maxRate: maxRate < 100 ? maxRate : undefined,
        skills: selectedSkills.length ? selectedSkills.join(',') : undefined,
        location: location || undefined,
        sortBy,
        page,
        limit: PER_PAGE,
      };

      const res = await freelancersAPI.search(params);
      if (!isMounted.current || requestId !== fetchSeq.current) return;
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setFreelancers(items.map(mapProfileToCard));
      setTotal(res.data?.meta?.pagination?.total ?? items.length);
    } catch (err) {
      if (!isMounted.current || requestId !== fetchSeq.current) return;
      setFreelancers([]);
      setTotal(0);
      setError(
        err.response?.data?.message ||
        'Could not load freelancers right now. Please try again.'
      );
    } finally {
      if (isMounted.current && requestId === fetchSeq.current) setLoading(false);
    }
  }, [query, activeCategory, minRating, maxRate, selectedSkills, location, sortBy, page]);

  useEffect(() => {
    fetchFreelancers();
  }, [fetchFreelancers]);

  // Handle Search Submission
  const handleSearch = (e) => {
    e?.preventDefault();
    setQuery(draftQuery.trim());
    setPage(1);
  };

  // Handle Category Pill Click
  const handleCategoryClick = (cat) => {
    setPage(1);
    if (activeCategory === cat) {
      setActiveCategory('All');
    } else {
      setActiveCategory(cat);
      if (cat !== 'All') {
        setDraftQuery('');
        setQuery('');
      }
    }
  };

  // Clear All Filters
  const clearAllFilters = () => {
    setQuery('');
    setDraftQuery('');
    setActiveCategory('All');
    setMinRating(0);
    setMaxRate(100);
    setSelectedSkills([]);
    setLocation('');
    setSortBy('relevance');
    setPage(1);
    setActivePopover(null);
  };

  const hasActiveFilters = Boolean(
    query || activeCategory !== 'All' || minRating > 0 || maxRate < 100 || selectedSkills.length > 0 || location
  );

  const handleInvite = (id) => {
    if (id) navigate(`/freelancers/${id}`);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="bf-page-wrapper">
      <Navbar />

      {/* ─── 1) COMPACT LIGHT HERO SECTION ─── */}
      <section className="bf-hero-section">
        <div className="bf-hero-ambient" />

        <div className="bf-hero-content-container">
          <div className="bf-hero-eyebrow">
            <Sparkles size={13} className="bf-eyebrow-icon" />
            <span>VERIFIED SKILLKART TALENT POOL</span>
          </div>

          <h1 className="bf-hero-title">
            Discover &amp; Hire <span>Top-Tier Freelancers</span>
          </h1>

          <p className="bf-hero-subtitle">
            Connect with pre-vetted student specialists, developers, and designers.
            Protected by milestone escrows.
          </p>

          {/* Unified Search Input Box (Pill Shape) */}
          <form onSubmit={handleSearch} className="bf-hero-search-form">
            <div className="bf-search-input-wrap">
              <Search size={17} className="bf-search-icon" />
              <input
                id="bf-search-input"
                type="text"
                className="bf-search-input"
                placeholder="Search by name, skill, or role (e.g. React, UI/UX, Python)..."
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
              />
              {draftQuery && (
                <button
                  type="button"
                  className="bf-search-clear-btn"
                  onClick={() => { setDraftQuery(''); setQuery(''); setPage(1); }}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button type="submit" className="bf-search-submit-btn">
              <span>Search Talent</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Domain Quick Pills */}
          <div className="bf-domain-pills-row">
            <span className="bf-domain-label">Popular:</span>
            {POPULAR_DOMAINS.map((domain) => {
              const isActive = activeCategory === domain;
              return (
                <button
                  key={domain}
                  type="button"
                  className={`bf-domain-pill ${isActive ? 'bf-domain-pill--active' : ''}`}
                  onClick={() => handleCategoryClick(domain)}
                >
                  {domain}
                </button>
              );
            })}
          </div>

          {/* Hero Live Stats Bar */}
          {heroStats.length > 0 && (
            <div className="bf-hero-stats-row">
              {heroStats.map((chip, idx) => (
                <div key={idx} className="bf-hero-stat-badge">
                  <ShieldCheck size={12} className="bf-stat-icon" />
                  <span>{chip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 2) HORIZONTAL FILTER TOOLBAR (NO SIDEBAR!) ─── */}
      <section className="bf-main-section">
        <div className="bf-container-1280">

          <div className="bf-filter-toolbar" ref={filterBarRef}>
            {/* Left Filter Popover Buttons */}
            <div className="bf-toolbar-left">
              <div className="bf-filter-pill-label">
                <Filter size={15} className="bf-filter-icon" />
                <span>Filters:</span>
              </div>

              {/* Rate Filter Popover */}
              <div className="bf-popover-container">
                <button
                  type="button"
                  className={`bf-toolbar-btn ${maxRate < 100 ? 'bf-toolbar-btn--active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'rate' ? null : 'rate')}
                >
                  <DollarSign size={14} />
                  <span>{maxRate < 100 ? `Up to Rs. ${maxRate}/hr` : 'Hourly Rate'}</span>
                  <ChevronDown size={14} className={activePopover === 'rate' ? 'bf-chevron--open' : ''} />
                </button>

                {activePopover === 'rate' && (
                  <div className="bf-popover-menu">
                    <div className="bf-popover-header">
                      <span>Max Hourly Rate</span>
                      <button
                        type="button"
                        className="bf-popover-reset"
                        onClick={() => { setMaxRate(100); setPage(1); }}
                      >
                        Reset
                      </button>
                    </div>

                    <div className="bf-popover-body">
                      <div className="bf-range-display">
                        <span>Rs. 5/hr</span>
                        <span className="bf-range-val-current">
                          {maxRate >= 100 ? 'Any rate' : `Rs. ${maxRate}/hr`}
                        </span>
                      </div>
                      <input
                        type="range"
                        className="bf-range-slider"
                        min={5}
                        max={100}
                        step={1}
                        value={maxRate}
                        onChange={(e) => { setMaxRate(+e.target.value); setPage(1); }}
                      />

                      <div className="bf-popover-presets">
                        <span className="bf-presets-title">Presets:</span>
                        <div className="bf-presets-list">
                          {RATE_PRESETS.map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              className={`bf-preset-btn ${maxRate === p.max ? 'bf-preset-btn--active' : ''}`}
                              onClick={() => { setMaxRate(p.max); setPage(1); setActivePopover(null); }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rating Filter Popover */}
              <div className="bf-popover-container">
                <button
                  type="button"
                  className={`bf-toolbar-btn ${minRating > 0 ? 'bf-toolbar-btn--active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'rating' ? null : 'rating')}
                >
                  <Star size={14} fill={minRating > 0 ? '#F59E0B' : 'none'} color={minRating > 0 ? '#F59E0B' : 'currentColor'} />
                  <span>{minRating > 0 ? `${minRating}★ & Above` : 'Rating'}</span>
                  <ChevronDown size={14} className={activePopover === 'rating' ? 'bf-chevron--open' : ''} />
                </button>

                {activePopover === 'rating' && (
                  <div className="bf-popover-menu bf-popover-menu--sm">
                    <div className="bf-popover-header">
                      <span>Minimum Rating</span>
                    </div>
                    <div className="bf-rating-options-list">
                      {[
                        { val: 0, label: 'Any Rating' },
                        { val: 4.5, label: '4.5 & up ★' },
                        { val: 4.0, label: '4.0 & up ★' },
                        { val: 3.0, label: '3.0 & up ★' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          className={`bf-rating-opt-row ${minRating === opt.val ? 'bf-rating-opt-row--active' : ''}`}
                          onClick={() => { setMinRating(opt.val); setPage(1); setActivePopover(null); }}
                        >
                          <span>{opt.label}</span>
                          {minRating === opt.val && <Check size={14} className="bf-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Location Filter Popover */}
              <div className="bf-popover-container">
                <button
                  type="button"
                  className={`bf-toolbar-btn ${location ? 'bf-toolbar-btn--active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'location' ? null : 'location')}
                >
                  <MapPin size={14} />
                  <span>{location || 'Location'}</span>
                  <ChevronDown size={14} className={activePopover === 'location' ? 'bf-chevron--open' : ''} />
                </button>

                {activePopover === 'location' && (
                  <div className="bf-popover-menu bf-popover-menu--location">
                    <div className="bf-popover-header">
                      <span>Select Location</span>
                      {location && (
                        <button
                          type="button"
                          className="bf-popover-reset"
                          onClick={() => { setLocation(''); setPage(1); }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="bf-location-list">
                      <button
                        type="button"
                        className={`bf-location-item ${!location ? 'bf-location-item--active' : ''}`}
                        onClick={() => { setLocation(''); setPage(1); setActivePopover(null); }}
                      >
                        All Locations
                      </button>
                      {dynamicLocations.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          className={`bf-location-item ${location === loc ? 'bf-location-item--active' : ''}`}
                          onClick={() => { setLocation(loc); setPage(1); setActivePopover(null); }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Skills Filter Popover */}
              <div className="bf-popover-container">
                <button
                  type="button"
                  className={`bf-toolbar-btn ${selectedSkills.length > 0 ? 'bf-toolbar-btn--active' : ''}`}
                  onClick={() => setActivePopover(activePopover === 'skills' ? null : 'skills')}
                >
                  <Award size={14} />
                  <span>{selectedSkills.length > 0 ? `${selectedSkills.length} Skills` : 'Skills'}</span>
                  <ChevronDown size={14} className={activePopover === 'skills' ? 'bf-chevron--open' : ''} />
                </button>

                {activePopover === 'skills' && (
                  <div className="bf-popover-menu bf-popover-menu--skills">
                    <div className="bf-popover-header">
                      <span>Filter by Skills</span>
                      {selectedSkills.length > 0 && (
                        <button
                          type="button"
                          className="bf-popover-reset"
                          onClick={() => { setSelectedSkills([]); setPage(1); }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="bf-skills-popover-body">
                      <TagInput
                        tags={selectedSkills}
                        onChange={(tags) => { setSelectedSkills(tags); setPage(1); }}
                        validateFn={aiAPI.validateSkill}
                        placeholder="Type skill & press Enter..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reset All Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="bf-clear-all-link"
                  onClick={clearAllFilters}
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Right: Sort & Grid/List View Controls */}
            <div className="bf-toolbar-right">
              <div className="bf-sort-wrapper">
                <span className="bf-sort-label">Sort:</span>
                <CustomSelect
                  compact
                  value={sortBy}
                  onChange={(val) => { setSortBy(val); setPage(1); }}
                  options={SORT_OPTIONS}
                />
              </div>

              <div className="bf-view-switcher">
                <button
                  type="button"
                  className={`bf-view-btn ${viewMode === 'grid' ? 'bf-view-btn--active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <Grid size={15} />
                </button>
                <button
                  type="button"
                  className={`bf-view-btn ${viewMode === 'list' ? 'bf-view-btn--active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                  aria-label="List View"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* ─── 3) ACTIVE FILTER TAGS STRIP ─── */}
          {hasActiveFilters && (
            <div className="bf-active-tags-strip">
              <span className="bf-active-tags-title">Active Filters:</span>

              {query && (
                <span className="bf-active-tag">
                  <span>Query: "{query}"</span>
                  <X size={12} onClick={() => { setQuery(''); setDraftQuery(''); setPage(1); }} />
                </span>
              )}

              {activeCategory !== 'All' && (
                <span className="bf-active-tag">
                  <span>Category: {activeCategory}</span>
                  <X size={12} onClick={() => { setActiveCategory('All'); setPage(1); }} />
                </span>
              )}

              {maxRate < 100 && (
                <span className="bf-active-tag">
                  <span>Max Rs. {maxRate}/hr</span>
                  <X size={12} onClick={() => { setMaxRate(100); setPage(1); }} />
                </span>
              )}

              {minRating > 0 && (
                <span className="bf-active-tag">
                  <span>{minRating}★ &amp; up</span>
                  <X size={12} onClick={() => { setMinRating(0); setPage(1); }} />
                </span>
              )}

              {location && (
                <span className="bf-active-tag">
                  <span>Location: {location}</span>
                  <X size={12} onClick={() => { setLocation(''); setPage(1); }} />
                </span>
              )}

              {selectedSkills.map((sk) => (
                <span key={sk} className="bf-active-tag">
                  <span>{sk}</span>
                  <X size={12} onClick={() => { setSelectedSkills(selectedSkills.filter(s => s !== sk)); setPage(1); }} />
                </span>
              ))}
            </div>
          )}

          {/* Results Count Header */}
          <div className="bf-results-meta-row">
            <span className="bf-results-count">
              Showing <strong>{freelancers.length}</strong> of <strong>{total}</strong> verified freelancers
            </span>
          </div>

          {/* ─── 4) RESULTS AREA ─── */}
          {/* Error Message */}
          {error && (
            <div className="bf-error-card">
              <div className="bf-error-icon">⚠️</div>
              <h3 className="bf-error-title">Could not load freelancers</h3>
              <p className="bf-error-desc">{error}</p>
              <button type="button" className="bf-error-retry-btn" onClick={fetchFreelancers}>
                Try Again
              </button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && !error && (
            <div className={viewMode === 'grid' ? 'bf-cards-grid' : 'bf-cards-list'}>
              {Array.from({ length: PER_PAGE }).map((_, idx) => (
                <SkeletonCard key={idx} list={viewMode === 'list'} />
              ))}
            </div>
          )}

          {/* Freelancer Cards Grid / List */}
          {!loading && !error && freelancers.length > 0 && (
            <div className={viewMode === 'grid' ? 'bf-cards-grid' : 'bf-cards-list'}>
              {freelancers.map((f) => (
                <FreelancerCard
                  key={f.id}
                  freelancer={f}
                  list={viewMode === 'list'}
                  onInvite={handleInvite}
                  isSaved={savedFreelancers.some((sf) => sf.id === f.id || sf._id === f.id)}
                  onToggleSave={toggleSavedFreelancer}
                  isClient={isClient}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && freelancers.length === 0 && (
            <div className="bf-empty-card">
              <div className="bf-empty-icon-wrap">
                <Search size={32} />
              </div>
              <h3 className="bf-empty-title">No Freelancers Match Your Criteria</h3>
              <p className="bf-empty-desc">
                We couldn't find any specialists matching your exact combination of search terms and filters.
                Try relaxing your rate, rating, or skill filters.
              </p>
              {hasActiveFilters && (
                <button type="button" className="bf-empty-reset-btn" onClick={clearAllFilters}>
                  <RotateCcw size={15} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          )}

          {/* ─── 5) MODERN PAGINATION ─── */}
          {!loading && totalPages > 1 && (
            <div className="bf-pagination-wrap">
              <button
                type="button"
                className="bf-pagination-btn"
                disabled={page === 1}
                onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
              >
                ← Prev
              </button>

              <div className="bf-pagination-numbers">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    className={`bf-page-number ${page === pNum ? 'bf-page-number--active' : ''}`}
                    onClick={() => { setPage(pNum); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  >
                    {pNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="bf-pagination-btn"
                disabled={page === totalPages}
                onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
              >
                Next →
              </button>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
}
