import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Wallet, TrendingUp, Search } from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import BackButton from '../../../Components/common/BackButton/BackButton';
import { gsap } from 'gsap';
import { jobsAPI } from '../../../api/jobs';
import { JOB_CATEGORIES } from '../../../constants/jobCategories';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import { isMobileApp } from '../../../utils/platform';
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

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'budget_high', label: 'Budget: High to Low' },
  { value: 'budget_low', label: 'Budget: Low to High' },
];

// "5 days ago" style relative time
const timeAgo = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['min', 60]];
  for (const [name, s] of units) {
    const v = Math.floor(secs / s);
    if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
};

const formatBudget = (budget) => {
  if (!budget) return 'Not specified';
  if (budget.type === 'hourly') return `Rs. ${budget.min ?? 0}/hr`;
  if (budget.max && budget.max !== budget.min) return `Rs. ${budget.min ?? 0} – Rs. ${budget.max}`;
  return `Rs. ${budget.min ?? 0}`;
};

function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job._id}`} className="bp-card">
      <div className="bp-card__top">
        <div className="bp-card__meta">
          <span className="bp-card__category">{job.category}</span>
          <span className="bp-card__posted"><Clock size={13} /> {timeAgo(job.createdAt)}</span>
        </div>
        <h3 className="bp-card__title">{job.title}</h3>
        <p className="bp-card__desc">
          {job.description?.length > 180 ? `${job.description.slice(0, 180)}…` : job.description}
        </p>
      </div>

      {job.skills?.length > 0 && (
        <div className="bp-card__tags">
          {job.skills.slice(0, 5).map(skill => (
            <span key={skill} className="bp-card__tag">{skill}</span>
          ))}
          {job.skills.length > 5 && <span className="bp-card__tag bp-card__tag--more">+{job.skills.length - 5}</span>}
        </div>
      )}

      <div className="bp-card__footer">
        <div className="bp-card__details">
          <div className="bp-card__detail">
            <span className="label"><Wallet size={13} /> Budget</span>
            <span className="value">{formatBudget(job.budget)}</span>
          </div>
          <div className="bp-card__detail">
            <span className="label"><TrendingUp size={13} /> Level</span>
            <span className="value bp-card__level">{job.experienceLevel || '—'}</span>
          </div>
          {Array.isArray(job.proposals) && (
            <div className="bp-card__detail">
              <span className="label">Proposals</span>
              <span className="value">{job.proposals.length}</span>
            </div>
          )}
        </div>
        <span className="bp-card__btn">View Details →</span>
      </div>
    </Link>
  );
}

function JobCardSkeleton() {
  return (
    <div className="bp-card bp-card--skeleton">
      <div className="bp-skel bp-skel--chip" />
      <div className="bp-skel bp-skel--title" />
      <div className="bp-skel bp-skel--line" />
      <div className="bp-skel bp-skel--line" style={{ width: '70%' }} />
      <div className="bp-card__tags">
        <div className="bp-skel bp-skel--tag" /><div className="bp-skel bp-skel--tag" /><div className="bp-skel bp-skel--tag" />
      </div>
    </div>
  );
}

export default function BrowseProjects() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({
    category: '',
    budgetType: '',
    experienceLevel: '',
  });
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);
  const fetchSeq = useRef(0); // ignore a response if a newer filter-change request has since started

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

      const res = await (query ? jobsAPI.searchJobs(params) : jobsAPI.listJobs(params));
      if (!isMounted.current || requestId !== fetchSeq.current) return;
      const responseData = res.data;
      setJobs(Array.isArray(responseData.data) ? responseData.data : []);
      setTotal(responseData.meta?.pagination?.total || 0);
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

  const handleSearch = (e) => {
    e?.preventDefault();
    setPage(1);
    setQuery(draftQuery.trim());
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    document.title = 'Browse Projects – SkillKart';
    gsap.from('.bp-hero__content > *', {
      y: 30,
      opacity: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.out'
    });
  }, []);

  const totalPages = Math.ceil(total / PER_PAGE);

  // Client-side sort of the current page (budget needs a numeric key)
  const budgetKey = (j) => j.budget?.max || j.budget?.min || 0;
  const sortedJobs = [...jobs].sort((a, b) => {
    if (sort === 'budget_high') return budgetKey(b) - budgetKey(a);
    if (sort === 'budget_low') return budgetKey(a) - budgetKey(b);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });

  return (
    <>
      <Navbar />
      <div className="bp-page">
        <section className="bp-hero">
          <div className="container bp-hero__inner">
            <div className="bp-hero__content">
              <div className="bp-hero__top-row">
                {isMobileApp() && <BackButton />}
                <span className="bp-tag">🚀 Opportunities</span>
              </div>
              <h1>Find Your Next <span>Big Project</span></h1>
              <p>Explore thousands of freelance jobs from startups to enterprises. AI-matched to your unique skills.</p>
              
              <form className="bp-search" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search projects by title, skill, or keywords..."
                  value={draftQuery}
                  onChange={(e) => setDraftQuery(e.target.value)}
                />
                <button type="submit" className="bp-search__btn">Search Projects</button>
              </form>
            </div>
          </div>
        </section>

        <div className="container">
          <div className="bp-layout">
            <aside className="bp-sidebar">
              <div className="bp-sidebar__section">
                <h3 className="bp-sidebar__title">Category</h3>
                <CustomSelect
                  options={['All Categories', ...JOB_CATEGORIES]}
                  value={filters.category || 'All Categories'}
                  onChange={(val) => { setPage(1); setFilters(prev => ({ ...prev, category: val === 'All Categories' ? '' : val })); }}
                />
              </div>

              <div className="bp-sidebar__section">
                <h3 className="bp-sidebar__title">Budget Type</h3>
                <div className="bp-filter-list">
                  {BUDGET_TYPES.map(type => (
                    <label key={type.value} className="bp-filter-item">
                      <input 
                        type="radio" 
                        name="budgetType" 
                        checked={filters.budgetType === type.value}
                        onChange={() => setFilters(prev => ({ ...prev, budgetType: type.value }))}
                      />
                      <span>{type.label}</span>
                    </label>
                  ))}
                  <label className="bp-filter-item">
                    <input 
                      type="radio" 
                      name="budgetType" 
                      checked={filters.budgetType === ''}
                      onChange={() => setFilters(prev => ({ ...prev, budgetType: '' }))}
                    />
                    <span>Any Type</span>
                  </label>
                </div>
              </div>

              <div className="bp-sidebar__section">
                <h3 className="bp-sidebar__title">Experience Level</h3>
                <div className="bp-filter-list">
                  {EXPERIENCE_LEVELS.map(level => (
                    <label key={level.value} className="bp-filter-item">
                      <input 
                        type="radio" 
                        name="experienceLevel" 
                        checked={filters.experienceLevel === level.value}
                        onChange={() => setFilters(prev => ({ ...prev, experienceLevel: level.value }))}
                      />
                      <span>{level.label}</span>
                    </label>
                  ))}
                  <label className="bp-filter-item">
                    <input 
                      type="radio" 
                      name="experienceLevel" 
                      checked={filters.experienceLevel === ''}
                      onChange={() => setFilters(prev => ({ ...prev, experienceLevel: '' }))}
                    />
                    <span>Any Level</span>
                  </label>
                </div>
              </div>
            </aside>

            <main className="bp-main">
              <div className="bp-toolbar">
                <div className="bp-toolbar__count">
                  {loading ? 'Searching…' : <>Found <strong>{total}</strong> project{total === 1 ? '' : 's'}{query && <> for “<em>{query}</em>”</>}</>}
                </div>
                <div className="bp-toolbar__sort">
                  <span className="bp-toolbar__sort-label">Sort by</span>
                  <CustomSelect
                    compact
                    options={SORT_OPTIONS}
                    value={sort}
                    onChange={setSort}
                  />
                </div>
              </div>

              {loading ? (
                <div className="bp-grid">
                  {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
                </div>
              ) : error ? (
                <div className="bp-empty">
                  <div className="bp-empty__icon">⚠️</div>
                  <h3>Couldn’t load projects</h3>
                  <p>{error}</p>
                  <button className="bp-search__btn" style={{ marginTop: '1rem' }} onClick={fetchJobs}>Try Again</button>
                </div>
              ) : sortedJobs.length > 0 ? (
                <div className="bp-grid">
                  {sortedJobs.map(job => <JobCard key={job._id} job={job} />)}
                </div>
              ) : (
                <div className="bp-empty">
                  <div className="bp-empty__icon">🔍</div>
                  <h3>No projects found</h3>
                  <p>
                    {query || filters.category || filters.budgetType || filters.experienceLevel
                      ? 'Try adjusting your search or filters to find more opportunities.'
                      : 'No open projects have been posted yet — check back soon.'}
                  </p>
                </div>
              )}

              {!error && totalPages > 1 && (
                <div className="bp-pagination">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                  >Previous</button>
                  <span>Page {page} of {totalPages}</span>
                  <button 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => p + 1)}
                  >Next</button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
