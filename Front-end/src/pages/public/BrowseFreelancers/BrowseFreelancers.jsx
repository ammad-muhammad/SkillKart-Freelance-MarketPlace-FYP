import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, CheckCircle2, MapPin, Bookmark, BookmarkCheck } from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { freelancersAPI } from '../../../api/freelancers';
import { publicAPI } from '../../../api/publicData';
import { aiAPI } from '../../../api/ai';
import { ALL_SKILLS, LOCATIONS } from '../../../utils/mockData';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import TagInput from '../../../Components/common/TagInput/TagInput';
import { useClient } from '../../../context/ClientContext';
import { useAuth } from '../../../hooks/useAuth';
import './BrowseFreelancers.css';

/* Map a FreelancerProfile (with populated userId) from the API → card shape */
const mapProfileToCard = (p) => {
    const u = p.userId || {};
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || (u.email ? u.email.split('@')[0] : 'Freelancer');
    return {
        id: String(u._id || p.userId || p._id),
        name: fullName,
        avatar: u.profilePicture ? null : (u.firstName?.[0]?.toUpperCase() || 'U'),
        avatarUrl: u.profilePicture || null,
        avatarBg: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        role: p.title || 'Freelancer',
        bio: p.bio || '',
        skills: (p.skills || []).map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean),
        rating: p.rating || u.rating || 0,
        reviewCount: p.completedProjects || 0,
        hourlyRate: p.hourlyRate || 0,
        currency: 'PKR',
        isVerified: p.verificationStatus === 'verified',
        isOnline: false,
        location: p.timezone || 'Global',
    };
};

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
function FreelancerCard({ freelancer, list, onInvite, isSaved, onToggleSave, isClient }) {
    const {
        id, name, avatar, avatarUrl, avatarBg, role, bio, skills,
        rating, reviewCount, hourlyRate, currency,
        isVerified, isOnline, location,
    } = freelancer;

    return (
        <div className={`bf-card${list ? ' bf-card--list' : ''}`}>

            <div className="bf-card__header">
                <div className="bf-card__avatar" style={{ background: avatarBg }}>
                    {avatarUrl
                        ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                        : avatar}
                    {isOnline && <span className="bf-card__online" title="Online now" />}
                </div>
                <div className="bf-card__info">
                    <div className="bf-card__name">{name}</div>
                    <div className="bf-card__role">{role}</div>
                    {isVerified && (
                        <div className="bf-card__verified" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} color="#10b981" /> Verified Expert
                        </div>
                    )}
                </div>
                <div className="bf-card__rating-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {isClient && (
                        <button
                            className={`bf-card__save ${isSaved ? 'bf-card__save--active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleSave(freelancer); }}
                            title={isSaved ? "Remove from saved" : "Save freelancer"}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isSaved ? 'var(--color-primary)' : '#94a3b8' }}
                        >
                            {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                        </button>
                    )}
                    <div className="bf-card__rating">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        <span>{rating.toFixed(1)}</span>
                        <span className="count">({reviewCount})</span>
                    </div>
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
                <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <div className="bf-card__rate" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        {currency === 'PKR' ? 'Rs. ' : ''}{hourlyRate}<span>/hr</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px', maxWidth: '100%' }}>
                        <MapPin size={12} color="#f43f5e" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{location}</span>
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
    const navigate = useNavigate();
    const { savedFreelancers, toggleSavedFreelancer } = useClient();
    const { isClient } = useAuth();
    /* filter state */
    const [query, setQuery] = useState('');
    const [draftQuery, setDraftQuery] = useState('');
    const [minRating, setMinRating] = useState(0);
    const [maxRate, setMaxRate] = useState(100);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [location, setLocation] = useState('');
    const [dynamicLocations, setDynamicLocations] = useState([]);
    const [sortBy, setSortBy] = useState('relevance');
    const [heroStats, setHeroStats] = useState([]); // real-only hero chips

    useEffect(() => {
        let on = true;
        publicAPI.getStats()
            .then((res) => {
                if (!on) return;
                const s = res?.data?.data || {};
                const chips = [];
                if (Number(s.freelancers) > 0) chips.push(`✅ ${Number(s.freelancers).toLocaleString()} Verified Profiles`);
                if (s.avgRating != null) chips.push(`⭐ Avg ${s.avgRating} Rating`);
                if (Number(s.categories) > 0) chips.push(`🌍 ${s.categories} Skill Categories`);
                setHeroStats(chips);
            })
            .catch(() => { if (on) setHeroStats([]); });

        freelancersAPI.getLocations()
            .then((res) => {
                if (on && res.data?.data) {
                    setDynamicLocations(res.data.data);
                }
            })
            .catch(() => { });

        return () => { on = false; };
    }, []);

    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [page, setPage] = useState(1);
    const PER_PAGE = 6;

    /* data state */
    const [freelancers, setFreelancers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isMounted = useRef(true);
    useEffect(() => () => { isMounted.current = false; }, []);

    /* set page title */
    useEffect(() => {
        document.title = 'Browse Freelancers – SkillKart';

        const tl = gsap.timeline({ delay: 0.1 });
        tl.fromTo('.bf-hero__tag', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
            .fromTo('.bf-hero h1', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }, '-=0.2')
            .fromTo('.bf-hero p', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, '-=0.3')
            .fromTo('.bf-search', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.2')
            .fromTo('.bf-hero-stat', { y: 15, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: 'power3.out' }, '-=0.1');

    }, []);

    /* fetch real freelancers from the API (no mock fallback) */
    const fetchFreelancers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                q: query || undefined,
                minRating: minRating > 0 ? minRating : undefined,
                maxRate: maxRate < 100 ? maxRate : undefined,
                skills: selectedSkills.length ? selectedSkills.join(',') : undefined,
                location: location || undefined,
                sortBy,
                page,
                limit: PER_PAGE,
            };
            const res = await freelancersAPI.search(params);
            if (!isMounted.current) return;
            // sendPaginated → { data: [...profiles], meta: { pagination: { total } } }
            const items = Array.isArray(res.data?.data) ? res.data.data : [];
            setFreelancers(items.map(mapProfileToCard));
            setTotal(res.data?.meta?.pagination?.total ?? items.length);
        } catch (err) {
            if (!isMounted.current) return;
            setFreelancers([]);
            setTotal(0);
            setError(
                err.response?.data?.message ||
                'Could not load freelancers right now. Please try again.'
            );
        } finally {
            if (isMounted.current) setLoading(false);
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
    const handleInvite = (id) => { if (id) navigate(`/freelancers/${id}`); };

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <>
            <Navbar />
            <div className="bf-page">

                {/* ── Hero Banner ── */}
                <section className="bf-hero">
                    <div className="bf-hero__orb bf-hero__orb--1" />
                    <div className="bf-hero__orb bf-hero__orb--2" />
                    <div className="bf-hero__grid" />
                    <div className="container bf-hero__inner">
                        <div className="bf-hero__tag">🔍 Browse Talent</div>
                        <h1>Browse <span>Verified Freelancers</span></h1>
                        <p>Discover AI-verified student talent across 40+ skill categories. Every profile is screened for quality and expertise.</p>

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

                        {heroStats.length > 0 && (
                            <div className="bf-hero-stats">
                                {heroStats.map((chip) => (
                                    <span key={chip} className="bf-hero-stat">{chip}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="bf-hero__wave">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                            <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                        </svg>
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
                                    style={{ background: `linear-gradient(to right, var(--color-primary, #042E4C) ${((maxRate - 5) / 95) * 100}%, #e2e8f0 ${((maxRate - 5) / 95) * 100}%)` }}
                                />
                                <div className="bf-range-vals">
                                    <span>Rs. 5/hr</span>
                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Rs. {maxRate}/hr</span>
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
                                <label className="bf-filter-label" style={{ marginBottom: '0.5rem' }}>Skills</label>
                                <TagInput
                                    tags={selectedSkills}
                                    onChange={(tags) => { setSelectedSkills(tags); setPage(1); }}
                                    validateFn={aiAPI.validateSkill}
                                    placeholder="E.g. Web Development, React..."
                                    hintText={<span>Type a skill and press <strong>Enter</strong>. AI will suggest valid alternatives.</span>}
                                />
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
                                        ...dynamicLocations.map(l => ({ value: l, label: l }))
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

                            {/* Loading — skeleton cards */}
                            {loading && !error && (
                                <div className={viewMode === 'grid' ? 'bf-grid' : 'bf-list-view'}>
                                    {Array.from({ length: PER_PAGE }).map((_, i) => (
                                        <SkeletonCard key={i} list={viewMode === 'list'} />
                                    ))}
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
                                            isSaved={savedFreelancers.some(sf => sf.id === f.id)}
                                            onToggleSave={toggleSavedFreelancer}
                                            isClient={isClient}
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
            </div>
            <Footer />
        </>
    );
}
