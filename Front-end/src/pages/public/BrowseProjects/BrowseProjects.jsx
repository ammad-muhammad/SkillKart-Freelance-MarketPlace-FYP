import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { gsap } from 'gsap';
import { jobsAPI } from '../../../api/jobs';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import './BrowseProjects.css';

const CATEGORIES = [
  'Web Development', 'Mobile Development', 'Design', 'Writing & Translation',
  'Digital Marketing', 'Video & Animation', 'Music & Audio', 'Programming & Tech',
  'Business', 'Data', 'Photography', 'Other',
];

const BUDGET_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
];

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
];

function JobCard({ job }) {
  return (
    <div className="bp-card">
      <div className="bp-card__header">
        <div className="bp-card__meta">
          <span className="bp-card__category">{job.category}</span>
          <span className="bp-card__posted">Posted {new Date(job.createdAt).toLocaleDateString()}</span>
        </div>
        <h3 className="bp-card__title">
          <Link to={`/jobs/${job._id}`}>{job.title}</Link>
        </h3>
      </div>
      
      <div className="bp-card__body">
        <p className="bp-card__desc">{job.description?.substring(0, 200)}...</p>
        <div className="bp-card__tags">
          {job.skills?.slice(0, 5).map(skill => (
            <span key={skill} className="bp-card__tag">{skill}</span>
          ))}
        </div>
      </div>
      
      <div className="bp-card__footer">
        <div className="bp-card__details">
          <div className="bp-card__detail">
            <span className="label">Budget</span>
            <span className="value">
              {job.budget?.type === 'fixed' 
                ? `$${job.budget?.min} - $${job.budget?.max}` 
                : `$${job.budget?.min}/hr`}
            </span>
          </div>
          <div className="bp-card__detail">
            <span className="label">Level</span>
            <span className="value">{job.experienceLevel}</span>
          </div>
        </div>
        <Link to={`/jobs/${job._id}`} className="bp-card__btn">View Details</Link>
      </div>
    </div>
  );
}

export default function BrowseProjects() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    budgetType: '',
    experienceLevel: '',
  });
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
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
      const responseData = res.data;
      setJobs(Array.isArray(responseData.data) ? responseData.data : []);
      setTotal(responseData.meta?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filters, page]);

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

  return (
    <>
      <Navbar />
      <div className="bp-page">
        <section className="bp-hero">
          <div className="container bp-hero__inner">
            <div className="bp-hero__content">
              <span className="bp-tag">🚀 Opportunities</span>
              <h1>Find Your Next <span>Big Project</span></h1>
              <p>Explore thousands of freelance jobs from startups to enterprises. AI-matched to your unique skills.</p>
              
              <div className="bp-search">
                <input 
                  type="text" 
                  placeholder="Search projects by title, skill, or keywords..." 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="bp-search__btn">Search Projects</button>
              </div>
            </div>
          </div>
        </section>

        <div className="container">
          <div className="bp-layout">
            <aside className="bp-sidebar">
              <div className="bp-sidebar__section">
                <h3 className="bp-sidebar__title">Category</h3>
                <CustomSelect 
                  options={['All Categories', ...CATEGORIES]}
                  value={filters.category || 'All Categories'}
                  onChange={(val) => setFilters(prev => ({ ...prev, category: val === 'All Categories' ? '' : val }))}
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
                  Found <strong>{total}</strong> projects
                </div>
              </div>

              {loading ? (
                <div className="bp-loading">Searching projects...</div>
              ) : jobs.length > 0 ? (
                <div className="bp-grid">
                  {jobs.map(job => <JobCard key={job._id} job={job} />)}
                </div>
              ) : (
                <div className="bp-empty">
                  <h3>No projects found</h3>
                  <p>Try adjusting your search or filters to find more opportunities.</p>
                </div>
              )}

              {totalPages > 1 && (
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
