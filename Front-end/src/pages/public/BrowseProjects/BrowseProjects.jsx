import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, ChevronDown, X, RotateCcw,
  Sparkles, Rocket, ArrowRight, Check, Tag
} from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import BackButton from '../../../Components/common/BackButton/BackButton';
import JobCard, { JobCardSkeleton } from '../../../Components/common/JobCard/JobCard';
import Reveal from '../../freelancer/components/Reveal';
import { jobsAPI } from '../../../api/jobs';
import { JOB_CATEGORIES } from '../../../constants/jobCategories';
import { isMobileApp } from '../../../utils/platform';
import { useFreelancer } from '../../../context/FreelancerContext';
import './BrowseProjects.css';

const BUDGET_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
];

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
];

const DURATION_OPTIONS = [
  { value: '< 1 month', label: 'Less than 1 month' },
  { value: '1-3 months', label: '1 to 3 months' },
  { value: '3-6 months', label: '3 to 6 months' },
  { value: '> 6 months', label: 'More than 6 months' },
];

const POSTED_OPTIONS = [
  { value: '24h', label: 'Past 24 hours' },
  { value: '7d', label: 'Past week' },
  { value: '30d', label: 'Past month' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'budget_high', label: 'Budget: High to Low' },
  { value: 'budget_low', label: 'Budget: Low to High' },
];

const POPULAR_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'UI Design',
  'AI & Machine Learning',
  'Graphic Design',
  'Video Editing'
];

export default function BrowseProjects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCat = searchParams.get('category') || '';

  const { savedProjects = [], toggleSavedProject } = useFreelancer() || {};

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);

  const [filters, setFilters] = useState({
    category: initialCat,
    budgetType: '',
    minBudget: '',
    maxBudget: '',
    experienceLevel: '',
    duration: '',
    skills: [],
    postedDate: '',
  });

  // Draft filters for popovers / mobile drawer
  const [draftFilters, setDraftFilters] = useState({ ...filters });
  const [activePopover, setActivePopover] = useState(null); // 'budgetType' | 'budgetRange' | 'experienceLevel' | 'duration' | 'skills' | 'postedDate' | 'sort'
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const PER_PAGE = 9;

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);
  const fetchSeq = useRef(0);
  const filterBarRef = useRef(null);

  // Close popovers on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActivePopover(null);
        setMobileSheetOpen(false);
      }
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

  const fetchJobs = useCallback(async () => {
    const requestId = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      const params = {
        q: query || undefined,
        category: filters.category || undefined,
        budgetType: filters.budgetType || undefined,
        experienceLevel: filters.experienceLevel || undefined,
        page,
        limit: PER_PAGE,
        status: 'open'
      };

      if (filters.minBudget) params.minBudget = filters.minBudget;
      if (filters.maxBudget) params.maxBudget = filters.maxBudget;
      if (filters.skills && filters.skills.length > 0) params.skills = filters.skills.join(',');

      const res = await (query ? jobsAPI.searchJobs(params) : jobsAPI.listJobs(params));
      if (!isMounted.current || requestId !== fetchSeq.current) return;
      const responseData = res.data;
      setJobs(Array.isArray(responseData.data) ? responseData.data : []);
      setTotal(responseData.meta?.pagination?.total || (Array.isArray(responseData.data) ? responseData.data.length : 0));
    } catch (err) {
      if (!isMounted.current || requestId !== fetchSeq.current) return;
      console.error('Failed to fetch jobs:', err);
      setJobs([]);
      setTotal(0);
      setError(err.response?.data?.message || 'Could not load projects right now. Please try again.');
    } finally {
      if (isMounted.current && requestId === fetchSeq.current) setLoading(false);
    }
  }, [query, filters, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    document.title = 'Browse Projects – SkillKart';
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    setQuery(draftQuery.trim());
  };

  const handleCategorySelect = (cat) => {
    setPage(1);
    const newCat = cat === 'All' || cat === filters.category ? '' : cat;
    setFilters(prev => ({ ...prev, category: newCat }));
    setDraftFilters(prev => ({ ...prev, category: newCat }));
  };

  const openPopover = (popoverName) => {
    if (activePopover === popoverName) {
      setActivePopover(null);
    } else {
      setDraftFilters({ ...filters });
      setActivePopover(popoverName);
    }
  };

  const applyPopover = () => {
    setPage(1);
    setFilters({ ...draftFilters });
    setActivePopover(null);
  };

  const resetPopoverFilter = (key) => {
    setDraftFilters(prev => ({ ...prev, [key]: Array.isArray(prev[key]) ? [] : '' }));
  };

  const clearAllFilters = () => {
    setPage(1);
    setDraftQuery('');
    setQuery('');
    const reset = {
      category: '',
      budgetType: '',
      minBudget: '',
      maxBudget: '',
      experienceLevel: '',
      duration: '',
      skills: [],
      postedDate: '',
    };
    setFilters(reset);
    setDraftFilters(reset);
    setActivePopover(null);
    setMobileSheetOpen(false);
  };

  const removeFilterItem = (key, value) => {
    setPage(1);
    if (key === 'query') {
      setQuery('');
      setDraftQuery('');
    } else if (key === 'skills') {
      const nextSkills = filters.skills.filter(s => s !== value);
      setFilters(prev => ({ ...prev, skills: nextSkills }));
      setDraftFilters(prev => ({ ...prev, skills: nextSkills }));
    } else if (key === 'budgetRange') {
      setFilters(prev => ({ ...prev, minBudget: '', maxBudget: '' }));
      setDraftFilters(prev => ({ ...prev, minBudget: '', maxBudget: '' }));
    } else {
      setFilters(prev => ({ ...prev, [key]: '' }));
      setDraftFilters(prev => ({ ...prev, [key]: '' }));
    }
  };

  // Check how many non-default filters are active
  const activeFilterCount = [
    filters.budgetType,
    filters.minBudget || filters.maxBudget,
    filters.experienceLevel,
    filters.duration,
    filters.skills?.length > 0,
    filters.postedDate,
  ].filter(Boolean).length;

  const hasAnyActiveFilter = activeFilterCount > 0 || filters.category || query;

  // Sorting
  const budgetKey = (j) => j.budget?.max || j.budget?.min || 0;
  const sortedJobs = [...jobs].sort((a, b) => {
    if (sort === 'budget_high') return budgetKey(b) - budgetKey(a);
    if (sort === 'budget_low') return budgetKey(a) - budgetKey(b);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <Navbar />
      <div className="bp-page">
        {/* =================================================================
            PART 1: COMPACT HERO (Mint Gradient Background, No Dark Band)
            ================================================================= */}
        <section className="bp-hero">
          <div className="bp-hero__ambient" />
          <div className="container bp-hero__container">
            <div className="bp-hero__content">
              <div className="bp-hero__top-row">
                {isMobileApp() && <BackButton />}
                <div className="bp-badge">
                  <Rocket size={14} />
                  <span>Opportunities</span>
                </div>
              </div>

              <h1 className="bp-hero__title">
                Find Your Next <span>Big Project</span>
              </h1>

              <p className="bp-hero__subtitle">
                Explore thousands of freelance jobs from startups to enterprises. AI-matched to your unique skills.
              </p>

              {/* Big Search Pill */}
              <form className="bp-search-pill" onSubmit={handleSearchSubmit}>
                <div className="bp-search-pill__icon">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  className="bp-search-pill__input"
                  placeholder="Search projects by title, skill, or keywords..."
                  value={draftQuery}
                  onChange={(e) => setDraftQuery(e.target.value)}
                  aria-label="Search projects"
                />
                <button type="submit" className="bp-search-pill__btn">
                  <span className="bp-search-pill__btn-text">Search Projects</span>
                  <span className="bp-search-pill__btn-icon"><Search size={16} /></span>
                </button>
              </form>

              {/* Popular Category Quick Chips */}
              <div className="bp-quick-cats" aria-label="Popular categories">
                <span className="bp-quick-cats__label">Popular:</span>
                <div className="bp-quick-cats__list">
                  {POPULAR_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`bp-quick-chip ${filters.category === cat ? 'bp-quick-chip--active' : ''}`}
                      onClick={() => handleCategorySelect(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slim Stats Row */}
              {total > 0 && (
                <div className="bp-hero__stats">
                  <span className="bp-hero__stat-item">
                    <strong>{total.toLocaleString()}</strong> open project{total === 1 ? '' : 's'}
                  </span>
                  <span className="bp-hero__stat-dot">•</span>
                  <span className="bp-hero__stat-item">
                    <Sparkles size={13} color="#10B981" /> Verified Clients
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =================================================================
            PART 2: CLEAN TOP FILTER BAR (Replaces Sidebar)
            ================================================================= */}
        <div className="container bp-filter-container" ref={filterBarRef}>
          <div className="bp-filter-bar">
            {/* ROW 1: Horizontal Category Chips with edge fade */}
            <div className="bp-filter-bar__row1">
              <div className="bp-cats-scroll">
                <button
                  type="button"
                  className={`bp-cat-pill ${!filters.category ? 'bp-cat-pill--active' : ''}`}
                  onClick={() => handleCategorySelect('All')}
                >
                  All Projects
                </button>
                {JOB_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`bp-cat-pill ${filters.category === cat ? 'bp-cat-pill--active' : ''}`}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ROW 2: Filter Dropdown Pills + Popovers */}
            <div className="bp-filter-bar__row2">
              {/* Desktop Filter Pills */}
              <div className="bp-filter-pills-group">
                {/* 1. Budget Type Popover */}
                <div className="bp-popover-wrapper">
                  <button
                    type="button"
                    className={`bp-filter-btn ${filters.budgetType ? 'bp-filter-btn--active' : ''}`}
                    onClick={() => openPopover('budgetType')}
                    aria-expanded={activePopover === 'budgetType'}
                  >
                    <span>
                      {filters.budgetType === 'fixed'
                        ? 'Fixed Price'
                        : filters.budgetType === 'hourly'
                        ? 'Hourly Rate'
                        : 'Budget Type'}
                    </span>
                    <ChevronDown size={14} className={activePopover === 'budgetType' ? 'bp-rotate-180' : ''} />
                  </button>

                  {activePopover === 'budgetType' && (
                    <div className="bp-popover bp-popover--budget-type" role="dialog">
                      <div className="bp-popover__title">Budget Type</div>
                      <div className="bp-popover__options">
                        {BUDGET_TYPES.map(type => (
                          <label key={type.value} className="bp-popover__radio-item">
                            <input
                              type="radio"
                              name="budgetTypeDraft"
                              checked={draftFilters.budgetType === type.value}
                              onChange={() => setDraftFilters(p => ({ ...p, budgetType: type.value }))}
                            />
                            <span>{type.label}</span>
                          </label>
                        ))}
                        <label className="bp-popover__radio-item">
                          <input
                            type="radio"
                            name="budgetTypeDraft"
                            checked={draftFilters.budgetType === ''}
                            onChange={() => setDraftFilters(p => ({ ...p, budgetType: '' }))}
                          />
                          <span>Any Type</span>
                        </label>
                      </div>
                      <div className="bp-popover__footer">
                        <button type="button" className="bp-popover__reset" onClick={() => resetPopoverFilter('budgetType')}>
                          Reset
                        </button>
                        <button type="button" className="bp-popover__apply" onClick={applyPopover}>
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Budget Range Popover */}
                <div className="bp-popover-wrapper">
                  <button
                    type="button"
                    className={`bp-filter-btn ${(filters.minBudget || filters.maxBudget) ? 'bp-filter-btn--active' : ''}`}
                    onClick={() => openPopover('budgetRange')}
                    aria-expanded={activePopover === 'budgetRange'}
                  >
                    <span>
                      {filters.minBudget && filters.maxBudget
                        ? `Rs. ${filters.minBudget} - ${filters.maxBudget}`
                        : filters.minBudget
                        ? `Min Rs. ${filters.minBudget}`
                        : filters.maxBudget
                        ? `Max Rs. ${filters.maxBudget}`
                        : 'Budget Range'}
                    </span>
                    <ChevronDown size={14} className={activePopover === 'budgetRange' ? 'bp-rotate-180' : ''} />
                  </button>

                  {activePopover === 'budgetRange' && (
                    <div className="bp-popover bp-popover--range" role="dialog">
                      <div className="bp-popover__title">Budget Range (PKR)</div>
                      <div className="bp-popover__inputs-row">
                        <div className="bp-popover__field">
                          <label>Min (Rs.)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={draftFilters.minBudget}
                            onChange={(e) => setDraftFilters(p => ({ ...p, minBudget: e.target.value }))}
                          />
                        </div>
                        <div className="bp-popover__dash">–</div>
                        <div className="bp-popover__field">
                          <label>Max (Rs.)</label>
                          <input
                            type="number"
                            placeholder="Any"
                            value={draftFilters.maxBudget}
                            onChange={(e) => setDraftFilters(p => ({ ...p, maxBudget: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="bp-popover__quick-presets">
                        <button type="button" onClick={() => setDraftFilters(p => ({ ...p, minBudget: '', maxBudget: '10000' }))}>&lt; 10k</button>
                        <button type="button" onClick={() => setDraftFilters(p => ({ ...p, minBudget: '10000', maxBudget: '50000' }))}>10k - 50k</button>
                        <button type="button" onClick={() => setDraftFilters(p => ({ ...p, minBudget: '50000', maxBudget: '100000' }))}>50k - 100k</button>
                        <button type="button" onClick={() => setDraftFilters(p => ({ ...p, minBudget: '100000', maxBudget: '' }))}>100k+</button>
                      </div>
                      <div className="bp-popover__footer">
                        <button type="button" className="bp-popover__reset" onClick={() => setDraftFilters(p => ({ ...p, minBudget: '', maxBudget: '' }))}>
                          Reset
                        </button>
                        <button type="button" className="bp-popover__apply" onClick={applyPopover}>
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Experience Level Popover */}
                <div className="bp-popover-wrapper">
                  <button
                    type="button"
                    className={`bp-filter-btn ${filters.experienceLevel ? 'bp-filter-btn--active' : ''}`}
                    onClick={() => openPopover('experienceLevel')}
                    aria-expanded={activePopover === 'experienceLevel'}
                  >
                    <span>
                      {EXPERIENCE_LEVELS.find(l => l.value === filters.experienceLevel)?.label || 'Experience Level'}
                    </span>
                    <ChevronDown size={14} className={activePopover === 'experienceLevel' ? 'bp-rotate-180' : ''} />
                  </button>

                  {activePopover === 'experienceLevel' && (
                    <div className="bp-popover bp-popover--level" role="dialog">
                      <div className="bp-popover__title">Experience Level</div>
                      <div className="bp-popover__options">
                        {EXPERIENCE_LEVELS.map(level => (
                          <label key={level.value} className="bp-popover__radio-item">
                            <input
                              type="radio"
                              name="expLevelDraft"
                              checked={draftFilters.experienceLevel === level.value}
                              onChange={() => setDraftFilters(p => ({ ...p, experienceLevel: level.value }))}
                            />
                            <span>{level.label}</span>
                          </label>
                        ))}
                        <label className="bp-popover__radio-item">
                          <input
                            type="radio"
                            name="expLevelDraft"
                            checked={draftFilters.experienceLevel === ''}
                            onChange={() => setDraftFilters(p => ({ ...p, experienceLevel: '' }))}
                          />
                          <span>Any Level</span>
                        </label>
                      </div>
                      <div className="bp-popover__footer">
                        <button type="button" className="bp-popover__reset" onClick={() => resetPopoverFilter('experienceLevel')}>
                          Reset
                        </button>
                        <button type="button" className="bp-popover__apply" onClick={applyPopover}>
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Duration Popover */}
                <div className="bp-popover-wrapper">
                  <button
                    type="button"
                    className={`bp-filter-btn ${filters.duration ? 'bp-filter-btn--active' : ''}`}
                    onClick={() => openPopover('duration')}
                    aria-expanded={activePopover === 'duration'}
                  >
                    <span>
                      {DURATION_OPTIONS.find(d => d.value === filters.duration)?.label || 'Duration'}
                    </span>
                    <ChevronDown size={14} className={activePopover === 'duration' ? 'bp-rotate-180' : ''} />
                  </button>

                  {activePopover === 'duration' && (
                    <div className="bp-popover bp-popover--duration" role="dialog">
                      <div className="bp-popover__title">Project Duration</div>
                      <div className="bp-popover__options">
                        {DURATION_OPTIONS.map(d => (
                          <label key={d.value} className="bp-popover__radio-item">
                            <input
                              type="radio"
                              name="durationDraft"
                              checked={draftFilters.duration === d.value}
                              onChange={() => setDraftFilters(p => ({ ...p, duration: d.value }))}
                            />
                            <span>{d.label}</span>
                          </label>
                        ))}
                        <label className="bp-popover__radio-item">
                          <input
                            type="radio"
                            name="durationDraft"
                            checked={draftFilters.duration === ''}
                            onChange={() => setDraftFilters(p => ({ ...p, duration: '' }))}
                          />
                          <span>Any Duration</span>
                        </label>
                      </div>
                      <div className="bp-popover__footer">
                        <button type="button" className="bp-popover__reset" onClick={() => resetPopoverFilter('duration')}>
                          Reset
                        </button>
                        <button type="button" className="bp-popover__apply" onClick={applyPopover}>
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Skills Multi-select Popover */}
                <div className="bp-popover-wrapper">
                  <button
                    type="button"
                    className={`bp-filter-btn ${filters.skills?.length > 0 ? 'bp-filter-btn--active' : ''}`}
                    onClick={() => openPopover('skills')}
                    aria-expanded={activePopover === 'skills'}
                  >
                    <span>
                      {filters.skills?.length > 0
                        ? `${filters.skills.length} Skill${filters.skills.length > 1 ? 's' : ''}`
                        : 'Skills'}
                    </span>
                    <ChevronDown size={14} className={activePopover === 'skills' ? 'bp-rotate-180' : ''} />
                  </button>

                  {activePopover === 'skills' && (
                    <div className="bp-popover bp-popover--skills" role="dialog">
                      <div className="bp-popover__title">Filter by Skills</div>
                      <div className="bp-popover__skill-input-wrap">
                        <input
                          type="text"
                          placeholder="Type a skill & press Enter..."
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = skillInput.trim();
                              if (val && !draftFilters.skills.includes(val)) {
                                setDraftFilters(p => ({ ...p, skills: [...p.skills, val] }));
                                setSkillInput('');
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="bp-popover__add-skill-btn"
                          onClick={() => {
                            const val = skillInput.trim();
                            if (val && !draftFilters.skills.includes(val)) {
                              setDraftFilters(p => ({ ...p, skills: [...p.skills, val] }));
                              setSkillInput('');
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>

                      {draftFilters.skills?.length > 0 && (
                        <div className="bp-popover__skills-chips">
                          {draftFilters.skills.map(s => (
                            <span key={s} className="bp-popover__skill-tag">
                              {s}
                              <button
                                type="button"
                                onClick={() => setDraftFilters(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="bp-popover__footer">
                        <button type="button" className="bp-popover__reset" onClick={() => resetPopoverFilter('skills')}>
                          Reset
                        </button>
                        <button type="button" className="bp-popover__apply" onClick={applyPopover}>
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Posted Date Popover */}
                <div className="bp-popover-wrapper">
                  <button
                    type="button"
                    className={`bp-filter-btn ${filters.postedDate ? 'bp-filter-btn--active' : ''}`}
                    onClick={() => openPopover('postedDate')}
                    aria-expanded={activePopover === 'postedDate'}
                  >
                    <span>
                      {POSTED_OPTIONS.find(p => p.value === filters.postedDate)?.label || 'Posted Date'}
                    </span>
                    <ChevronDown size={14} className={activePopover === 'postedDate' ? 'bp-rotate-180' : ''} />
                  </button>

                  {activePopover === 'postedDate' && (
                    <div className="bp-popover bp-popover--posted" role="dialog">
                      <div className="bp-popover__title">Posted Date</div>
                      <div className="bp-popover__options">
                        {POSTED_OPTIONS.map(opt => (
                          <label key={opt.value} className="bp-popover__radio-item">
                            <input
                              type="radio"
                              name="postedDraft"
                              checked={draftFilters.postedDate === opt.value}
                              onChange={() => setDraftFilters(p => ({ ...p, postedDate: opt.value }))}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                        <label className="bp-popover__radio-item">
                          <input
                            type="radio"
                            name="postedDraft"
                            checked={draftFilters.postedDate === ''}
                            onChange={() => setDraftFilters(p => ({ ...p, postedDate: '' }))}
                          />
                          <span>Any Time</span>
                        </label>
                      </div>
                      <div className="bp-popover__footer">
                        <button type="button" className="bp-popover__reset" onClick={() => resetPopoverFilter('postedDate')}>
                          Reset
                        </button>
                        <button type="button" className="bp-popover__apply" onClick={applyPopover}>
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                className="bp-mobile-filter-trigger"
                onClick={() => {
                  setDraftFilters({ ...filters });
                  setMobileSheetOpen(true);
                }}
              >
                <SlidersHorizontal size={15} />
                <span>Filters</span>
                {activeFilterCount > 0 && <span className="bp-filter-count-badge">{activeFilterCount}</span>}
              </button>

              {/* Right Side: Sort Pill + Clear All Ghost Button */}
              <div className="bp-filter-bar__right">
                <div className="bp-popover-wrapper">
                  <button
                    type="button"
                    className="bp-filter-btn bp-filter-btn--sort"
                    onClick={() => openPopover('sort')}
                  >
                    <span className="bp-sort-label">Sort:</span>
                    <strong>{SORT_OPTIONS.find(s => s.value === sort)?.label}</strong>
                    <ChevronDown size={14} />
                  </button>

                  {activePopover === 'sort' && (
                    <div className="bp-popover bp-popover--sort" role="dialog">
                      <div className="bp-popover__title">Sort Results</div>
                      <div className="bp-popover__options">
                        {SORT_OPTIONS.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            className={`bp-sort-opt ${sort === s.value ? 'bp-sort-opt--active' : ''}`}
                            onClick={() => { setSort(s.value); setActivePopover(null); }}
                          >
                            <span>{s.label}</span>
                            {sort === s.value && <Check size={14} color="#10B981" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {hasAnyActiveFilter && (
                  <button
                    type="button"
                    className="bp-clear-all-btn"
                    onClick={clearAllFilters}
                    title="Clear all active filters"
                  >
                    <RotateCcw size={13} />
                    <span>Clear all</span>
                  </button>
                )}
              </div>
            </div>

            {/* ROW 3: Active Filter Chips + Results Count */}
            <div className="bp-filter-bar__row3">
              <div className="bp-results-count">
                {loading ? (
                  <span>Searching projects…</span>
                ) : (
                  <span>
                    <strong>{total.toLocaleString()}</strong> project{total === 1 ? '' : 's'} found
                  </span>
                )}
              </div>

              {hasAnyActiveFilter && (
                <div className="bp-active-chips">
                  {query && (
                    <span className="bp-active-chip">
                      Search: “{query}”
                      <button type="button" onClick={() => removeFilterItem('query')}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.category && (
                    <span className="bp-active-chip">
                      Category: {filters.category}
                      <button type="button" onClick={() => removeFilterItem('category')}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.budgetType && (
                    <span className="bp-active-chip">
                      Type: {filters.budgetType === 'fixed' ? 'Fixed Price' : 'Hourly Rate'}
                      <button type="button" onClick={() => removeFilterItem('budgetType')}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {(filters.minBudget || filters.maxBudget) && (
                    <span className="bp-active-chip">
                      Budget: Rs. {filters.minBudget || '0'} – {filters.maxBudget || 'Any'}
                      <button type="button" onClick={() => removeFilterItem('budgetRange')}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.experienceLevel && (
                    <span className="bp-active-chip">
                      Level: {filters.experienceLevel}
                      <button type="button" onClick={() => removeFilterItem('experienceLevel')}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.duration && (
                    <span className="bp-active-chip">
                      Duration: {filters.duration}
                      <button type="button" onClick={() => removeFilterItem('duration')}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.skills?.map(s => (
                    <span key={s} className="bp-active-chip">
                      Skill: {s}
                      <button type="button" onClick={() => removeFilterItem('skills', s)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {filters.postedDate && (
                    <span className="bp-active-chip">
                      Posted: {POSTED_OPTIONS.find(p => p.value === filters.postedDate)?.label}
                      <button type="button" onClick={() => removeFilterItem('postedDate')}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================
            MOBILE FILTER BOTTOM SHEET
            ================================================================= */}
        {mobileSheetOpen && (
          <div className="bp-mobile-sheet-overlay" onClick={() => setMobileSheetOpen(false)}>
            <div className="bp-mobile-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="bp-mobile-sheet__header">
                <h3>Filters</h3>
                <button
                  type="button"
                  className="bp-mobile-sheet__close"
                  onClick={() => setMobileSheetOpen(false)}
                  aria-label="Close filters"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bp-mobile-sheet__body">
                {/* Budget Type */}
                <div className="bp-sheet-section">
                  <h4>Budget Type</h4>
                  <div className="bp-sheet-options">
                    {BUDGET_TYPES.map(type => (
                      <label key={type.value} className="bp-popover__radio-item">
                        <input
                          type="radio"
                          name="mBudgetType"
                          checked={draftFilters.budgetType === type.value}
                          onChange={() => setDraftFilters(p => ({ ...p, budgetType: type.value }))}
                        />
                        <span>{type.label}</span>
                      </label>
                    ))}
                    <label className="bp-popover__radio-item">
                      <input
                        type="radio"
                        name="mBudgetType"
                        checked={draftFilters.budgetType === ''}
                        onChange={() => setDraftFilters(p => ({ ...p, budgetType: '' }))}
                      />
                      <span>Any Type</span>
                    </label>
                  </div>
                </div>

                {/* Budget Range */}
                <div className="bp-sheet-section">
                  <h4>Budget Range (PKR)</h4>
                  <div className="bp-popover__inputs-row">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="bp-sheet-input"
                      aria-label="Minimum budget (Rs.)"
                      placeholder="Min (Rs.)"
                      value={draftFilters.minBudget}
                      onChange={(e) => setDraftFilters(p => ({ ...p, minBudget: e.target.value }))}
                    />
                    <span>–</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="bp-sheet-input"
                      aria-label="Maximum budget (Rs.)"
                      placeholder="Max (Rs.)"
                      value={draftFilters.maxBudget}
                      onChange={(e) => setDraftFilters(p => ({ ...p, maxBudget: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Experience Level */}
                <div className="bp-sheet-section">
                  <h4>Experience Level</h4>
                  <div className="bp-sheet-options">
                    {EXPERIENCE_LEVELS.map(level => (
                      <label key={level.value} className="bp-popover__radio-item">
                        <input
                          type="radio"
                          name="mExpLevel"
                          checked={draftFilters.experienceLevel === level.value}
                          onChange={() => setDraftFilters(p => ({ ...p, experienceLevel: level.value }))}
                        />
                        <span>{level.label}</span>
                      </label>
                    ))}
                    <label className="bp-popover__radio-item">
                      <input
                        type="radio"
                        name="mExpLevel"
                        checked={draftFilters.experienceLevel === ''}
                        onChange={() => setDraftFilters(p => ({ ...p, experienceLevel: '' }))}
                      />
                      <span>Any Level</span>
                    </label>
                  </div>
                </div>

                {/* Duration */}
                <div className="bp-sheet-section">
                  <h4>Duration</h4>
                  <div className="bp-sheet-options">
                    {DURATION_OPTIONS.map(d => (
                      <label key={d.value} className="bp-popover__radio-item">
                        <input
                          type="radio"
                          name="mDuration"
                          checked={draftFilters.duration === d.value}
                          onChange={() => setDraftFilters(p => ({ ...p, duration: d.value }))}
                        />
                        <span>{d.label}</span>
                      </label>
                    ))}
                    <label className="bp-popover__radio-item">
                      <input
                        type="radio"
                        name="mDuration"
                        checked={draftFilters.duration === ''}
                        onChange={() => setDraftFilters(p => ({ ...p, duration: '' }))}
                      />
                      <span>Any Duration</span>
                    </label>
                  </div>
                </div>

                {/* Posted Date */}
                <div className="bp-sheet-section">
                  <h4>Posted Date</h4>
                  <div className="bp-sheet-options">
                    {POSTED_OPTIONS.map(opt => (
                      <label key={opt.value} className="bp-popover__radio-item">
                        <input
                          type="radio"
                          name="mPosted"
                          checked={draftFilters.postedDate === opt.value}
                          onChange={() => setDraftFilters(p => ({ ...p, postedDate: opt.value }))}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                    <label className="bp-popover__radio-item">
                      <input
                        type="radio"
                        name="mPosted"
                        checked={draftFilters.postedDate === ''}
                        onChange={() => setDraftFilters(p => ({ ...p, postedDate: '' }))}
                      />
                      <span>Any Time</span>
                    </label>
                  </div>
                </div>

                {/* Skills */}
                <div className="bp-sheet-section">
                  <h4>Skills</h4>
                  <div className="bp-popover__skill-input-wrap">
                    <input
                      type="text"
                      className="bp-sheet-input"
                      aria-label="Add a skill"
                      placeholder="Type a skill & press Add"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = skillInput.trim();
                          if (val && !draftFilters.skills.includes(val)) {
                            setDraftFilters(p => ({ ...p, skills: [...p.skills, val] }));
                            setSkillInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="bp-popover__add-skill-btn"
                      onClick={() => {
                        const val = skillInput.trim();
                        if (val && !draftFilters.skills.includes(val)) {
                          setDraftFilters(p => ({ ...p, skills: [...p.skills, val] }));
                          setSkillInput('');
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {draftFilters.skills?.length > 0 && (
                    <div className="bp-popover__skills-chips">
                      {draftFilters.skills.map(s => (
                        <span key={s} className="bp-popover__skill-tag">
                          {s}
                          <button
                            type="button"
                            aria-label={`Remove ${s}`}
                            onClick={() => setDraftFilters(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bp-mobile-sheet__footer">
                <button
                  type="button"
                  className="bp-popover__reset"
                  onClick={() => {
                    clearAllFilters();
                    setMobileSheetOpen(false);
                  }}
                >
                  Reset All
                </button>
                <button
                  type="button"
                  className="bp-popover__apply"
                  onClick={() => {
                    applyPopover();
                    setMobileSheetOpen(false);
                  }}
                >
                  Show Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            PROJECTS GRID (Full Width Container 1360px, Unified JobCard)
            ================================================================= */}
        <main className="container bp-grid-container">
          {loading ? (
            <div className="bp-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <JobCardSkeleton key={i} variant="grid" surfaceBg="var(--sk-bg-secondary, #F3F7F5)" />
              ))}
            </div>
          ) : error ? (
            <div className="bp-empty">
              <div className="bp-empty__icon">⚠️</div>
              <h3>Couldn’t load projects</h3>
              <p>{error}</p>
              <button className="bp-retry-btn" onClick={fetchJobs}>
                Try Again
              </button>
            </div>
          ) : sortedJobs.length > 0 ? (
            <>
              <div className="bp-grid">
                {sortedJobs.map((job, idx) => {
                  const isSaved = savedProjects.some(sp => (sp._id || sp.id || sp) === (job._id || job.id));
                  return (
                    <Reveal key={job._id || job.id || idx} delay={idx * 50}>
                      <JobCard
                        job={job}
                        variant="grid"
                        isSaved={isSaved}
                        onToggleSave={() => toggleSavedProject?.(job)}
                        surfaceBg="var(--sk-bg-secondary, #F3F7F5)"
                      />
                    </Reveal>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="bp-pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => {
                      setPage(p => p - 1);
                      window.scrollTo({ top: 320, behavior: 'smooth' });
                    }}
                    className="bp-pagination__btn"
                  >
                    Previous
                  </button>
                  <span className="bp-pagination__info">
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => {
                      setPage(p => p + 1);
                      window.scrollTo({ top: 320, behavior: 'smooth' });
                    }}
                    className="bp-pagination__btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bp-empty">
              <div className="bp-empty__icon">🔍</div>
              <h3>No projects match your filters</h3>
              <p>
                {hasAnyActiveFilter
                  ? 'Try clearing some of your filters or broadening your search query.'
                  : 'No open projects are available at the moment. Please check back soon.'}
              </p>
              {hasAnyActiveFilter && (
                <button type="button" className="bp-retry-btn" onClick={clearAllFilters}>
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
