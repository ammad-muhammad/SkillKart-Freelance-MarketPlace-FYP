import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { freelancersAPI } from '../../../api/freelancers';
import { MOCK_FREELANCERS, ALL_SKILLS, LOCATIONS } from '../../../utils/mockData';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import './BrowseFreelancers.css';

/* ─── helpers ─── */
const RATINGS = [5, 4, 3];
const SORT_OPTIONS = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'rate_asc', label: 'Rate: Low → High' },
    { value: 'rate_desc', label: 'Rate: High → Low' },
    { value: 'projects', label: 'Most Projects' },
];

const SKILL_PREVIEW = ALL_SKILLS.slice(0, 10);

/* ── Skeleton card ── */
function SkeletonCard({ list }) {
    return (
        <div className={`bf-skeleton${list ? ' bf-card--list' : ''}`} style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                <div className="bf-skel bf-skel--circle" style={{ width: 52, height: 52, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <div className="bf-skel" style={{ height: 14, width: '60%', marginBottom: 8 }} />
                    <div className="bf-skel" style={{ height: 12, width: '40%' }} />
                </div>
            </div>
            <div className="bf-skel" style={{ height: 12, width: '90%', marginTop: 16 }} />
            <div className="bf-skel" style={{ height: 12, width: '75%', marginTop: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="bf-skel" style={{ height: 20, width: 64, borderRadius: 999 }} />
                ))}
            </div>
        </div>
    );
}

/* ── Freelancer Card ── */
function FreelancerCard({ freelancer, list, onInvite }) {
    const {
        id, name, avatar, avatarBg, role, bio, skills,
        rating, reviewCount, hourlyRate, currency,
        isVerified, isOnline, location,
    } = freelancer;

    return (
        <div className={`bf-card${list ? ' bf-card--list' : ''}`}>
            <div className="bf-card__header">
                <div className="bf-card__avatar" style={{ background: avatarBg }}>
                    {avatar}
                    {isOnline && <span className="bf-card__online" title="Online now" />}
                </div>
                <div className="bf-card__info">
                    <div className="bf-card__name">{name}</div>
                    <div className="bf-card__role">{role}</div>
                    {isVerified && (
                        <div className="bf-card__verified">
                            <span>✓</span> AI Verified
                        </div>
                    )}
                </div>
                <div className="bf-card__rating">
                    <span className="star">★</span>
                    <span>{rating.toFixed(1)}</span>
                    <span className="count">({reviewCount})</span>
                </div>
            </div>

            <div className="bf-card__body">
                <p className="bf-card__bio">{bio}</p>
                <div className="bf-card__tags">
                    {skills.slice(0, 4).map(skill => (
                        <span key={skill} className="bf-card__tag">{skill}</span>
                    ))}
                    {skills.length > 4 && <span className="bf-card__tag">+{skills.length - 4}</span>}
                </div>
            </div>

            <div className="bf-card__footer">
                <div>
                    <div className="bf-card__rate">
                        {currency === 'USD' ? '$' : ''}{hourlyRate}<span>/hr</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginTop: 2 }}>
                        📍 {location}
                    </div>
                </div>
                <button className="bf-card__btn" onClick={() => onInvite(id)}>
                    View Profile
                </button>
            </div>
        </div>
    );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function BrowseFreelancers() {
    /* filter state */
    const [query, setQuery] = useState('');
    const [draftQuery, setDraftQuery] = useState('');
    const [minRating, setMinRating] = useState(0);
    const [maxRate, setMaxRate] = useState(100);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [location, setLocation] = useState('');
    const [sortBy, setSortBy] = useState('relevance');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [page, setPage] = useState(1);
    const PER_PAGE = 6;

    /* data state */
    const [freelancers, setFreelancers] = useState(() => MOCK_FREELANCERS.slice(0, PER_PAGE));
    const [total, setTotal] = useState(MOCK_FREELANCERS.length);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isMounted = useRef(true);
    useEffect(() => () => { isMounted.current = false; }, []);

    /* set page title */
    useEffect(() => { document.title = 'Browse Freelancers – SkillKart'; }, []);

    /* fetch – tries real API; silently falls back to mock on error */
    const fetchFreelancers = useCallback(async () => {
        setError(null);
        try {
            const params = {
                q: query || undefined,
                minRating: minRating > 0 ? minRating : undefined,
                maxRate: maxRate < 100 ? maxRate : undefined,
                skills: selectedSkills.length ? selectedSkills.join(',') : undefined,
                location: location || undefined,
                sort: sortBy,
                page,
                limit: PER_PAGE,
            };
            const { data } = await freelancersAPI.search(params);
            if (!isMounted.current) return;
            setFreelancers(data?.data?.freelancers ?? []);
            setTotal(data?.data?.total ?? 0);
        } catch {
            /* silently keep / refresh from mock */
            if (!isMounted.current) return;
            let filtered = [...MOCK_FREELANCERS];
            if (query) filtered = filtered.filter(f =>
                f.name.toLowerCase().includes(query.toLowerCase()) ||
                f.role.toLowerCase().includes(query.toLowerCase()) ||
                f.skills.some(s => s.toLowerCase().includes(query.toLowerCase()))
            );
            if (minRating > 0) filtered = filtered.filter(f => f.rating >= minRating);
            if (maxRate < 100) filtered = filtered.filter(f => f.hourlyRate <= maxRate);
            if (selectedSkills.length) filtered = filtered.filter(f =>
                selectedSkills.every(sk => f.skills.includes(sk))
            );
            if (location) filtered = filtered.filter(f => f.location === location);
            if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
            if (sortBy === 'rate_asc') filtered.sort((a, b) => a.hourlyRate - b.hourlyRate);
            if (sortBy === 'rate_desc') filtered.sort((a, b) => b.hourlyRate - a.hourlyRate);
            if (sortBy === 'projects') filtered.sort((a, b) => b.projectsCompleted - a.projectsCompleted);
            setTotal(filtered.length);
            setFreelancers(filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE));
        }
    }, [query, minRating, maxRate, selectedSkills, location, sortBy, page]);

    useEffect(() => { fetchFreelancers(); }, [fetchFreelancers]);

    const toggleSkill = (skill) => {
        setSelectedSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
        setPage(1);
    };

    const clearFilters = () => {
        setQuery(''); setDraftQuery(''); setMinRating(0);
        setMaxRate(100); setSelectedSkills([]); setLocation(''); setSortBy('relevance'); setPage(1);
    };

    const handleSearch = (e) => { e.preventDefault(); setQuery(draftQuery); setPage(1); };
    const handleInvite = (id) => { /* navigate to profile or open modal */ console.log('View profile', id); };

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <>
            <Navbar />

            {/* ── Hero Banner ── */}
            <section className="bf-hero">
                <div className="container bf-hero__inner">
                    <h1>Browse <span>Verified Freelancers</span></h1>
                    <p>Discover AI-verified student talent across 40+ skill categories. Every profile is screened.</p>

                    <form onSubmit={handleSearch} className="bf-search">
                        <input
                            id="bf-search-input"
                            className="bf-search__input"
                            placeholder="Search by name, skill, or role…"
                            value={draftQuery}
                            onChange={e => setDraftQuery(e.target.value)}
                        />
                        <button type="submit" className="bf-search__btn">Search</button>
                    </form>

                    <div className="bf-hero-stats">
                        <span className="bf-hero-stat">✅ 50K+ Verified Profiles</span>
                        <span className="bf-hero-stat">⭐ Avg 4.8 Rating</span>
                        <span className="bf-hero-stat">🌍 40+ Skill Categories</span>
                        <span className="bf-hero-stat">⚡ 1-hr Avg Response</span>
                    </div>
                </div>
            </section>

            {/* ── Main Content ── */}
            <div className="container">
                <div className="bf-layout">

                    {/* ── Sidebar Filters ── */}
                    <aside className="bf-sidebar">
                        <div className="bf-sidebar__header">
                            <span className="bf-sidebar__title">🎛 Filters</span>
                            <button className="bf-sidebar__clear" onClick={clearFilters}>Clear all</button>
                        </div>

                        {/* Hourly Rate */}
                        <div className="bf-filter-group">
                            <label className="bf-filter-label">Max Hourly Rate</label>
                            <input
                                type="range"
                                className="bf-range"
                                min={5} max={100} step={1}
                                value={maxRate}
                                onChange={e => { setMaxRate(+e.target.value); setPage(1); }}
                            />
                            <div className="bf-range-vals">
                                <span>$5/hr</span>
                                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>${maxRate}/hr</span>
                            </div>
                        </div>

                        {/* Min Rating */}
                        <div className="bf-filter-group">
                            <label className="bf-filter-label">Minimum Rating</label>
                            <div className="bf-rating-opts">
                                <label className="bf-rating-opt">
                                    <input type="radio" name="rating" value={0} checked={minRating === 0}
                                        onChange={() => { setMinRating(0); setPage(1); }} />
                                    <span>Any rating</span>
                                </label>
                                {RATINGS.map(r => (
                                    <label key={r} className="bf-rating-opt">
                                        <input type="radio" name="rating" value={r} checked={minRating === r}
                                            onChange={() => { setMinRating(r); setPage(1); }} />
                                        <span className="bf-stars">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
                                        <span>&amp; up</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="bf-filter-group">
                            <label className="bf-filter-label">Skills</label>
                            <div className="bf-skill-list">
                                {SKILL_PREVIEW.map(skill => (
                                    <label key={skill} className="bf-skill-opt">
                                        <input type="checkbox" checked={selectedSkills.includes(skill)}
                                            onChange={() => toggleSkill(skill)} />
                                        <span>{skill}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bf-filter-group">
                            <label className="bf-filter-label">Location</label>
                            <CustomSelect
                                value={location}
                                onChange={val => { setLocation(val); setPage(1); }}
                                placeholder="All locations"
                                options={[
                                    { value: '', label: 'All locations' },
                                    ...LOCATIONS.map(l => ({ value: l, label: l }))
                                ]}
                            />
                        </div>
                    </aside>

                    {/* ── Results ── */}
                    <div className="bf-content">
                        {/* Toolbar */}
                        <div className="bf-toolbar">
                            <div className="bf-toolbar__count">
                                Showing <strong>{freelancers.length}</strong> of <strong>{total}</strong> freelancers
                                {query && <> for "<em>{query}</em>"</>}
                            </div>
                            <div className="bf-toolbar__right">
                                <CustomSelect
                                    compact
                                    value={sortBy}
                                    onChange={val => { setSortBy(val); setPage(1); }}
                                    options={SORT_OPTIONS}
                                />
                                <div className="bf-view-btns">
                                    <button
                                        className={`bf-view-btn${viewMode === 'grid' ? ' bf-view-btn--active' : ''}`}
                                        onClick={() => setViewMode('grid')} title="Grid view"
                                    >⊞</button>
                                    <button
                                        className={`bf-view-btn${viewMode === 'list' ? ' bf-view-btn--active' : ''}`}
                                        onClick={() => setViewMode('list')} title="List view"
                                    >≡</button>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bf-error">
                                <div className="bf-error__icon">⚠️</div>
                                <div className="bf-error__title">Something went wrong</div>
                                <div className="bf-error__sub">{error}</div>
                                <button className="bf-error__btn" onClick={fetchFreelancers}>Try Again</button>
                            </div>
                        )}

                        {/* Loading */}
                        {loading && !error && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-mid)', fontSize: '0.9rem' }}>
                                Updating results…
                            </div>
                        )}

                        {/* Cards */}
                        {!loading && !error && freelancers.length > 0 && (
                            <div className={viewMode === 'grid' ? 'bf-grid' : 'bf-list-view'}>
                                {freelancers.map(f => (
                                    <FreelancerCard
                                        key={f.id}
                                        freelancer={f}
                                        list={viewMode === 'list'}
                                        onInvite={handleInvite}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Empty */}
                        {!loading && !error && freelancers.length === 0 && (
                            <div className="bf-empty">
                                <div className="bf-empty__icon">🔍</div>
                                <div className="bf-empty__title">No freelancers found</div>
                                <div className="bf-empty__sub">
                                    Try adjusting your filters or search terms.
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <div className="bf-pagination">
                                <button
                                    className="bf-page-btn"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >←</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        className={`bf-page-btn${page === p ? ' bf-page-btn--active' : ''}`}
                                        onClick={() => setPage(p)}
                                    >{p}</button>
                                ))}
                                <button
                                    className="bf-page-btn"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >→</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
}
