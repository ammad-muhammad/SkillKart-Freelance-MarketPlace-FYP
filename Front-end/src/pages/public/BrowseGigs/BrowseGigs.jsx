import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, ShoppingBag, Tag } from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { gsap } from 'gsap';
import { gigsAPI } from '../../../api/gigs';
import { publicAPI } from '../../../api/publicData';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import { formatDeliveryTime } from '../../../utils/gigOrderCheckout';
import './BrowseGigs.css';

/* Map a raw Gig (with populated freelancerId) from the API → card shape */
const mapGigToCard = (g) => {
    const f = g.freelancerId || {};
    const freelancerName = `${f.firstName || ''} ${f.lastName || ''}`.trim() || 'Freelancer';
    const tiers = ['basic', 'standard', 'premium'];
    const startingTier = tiers.map((t) => g.pricing?.[t]).find((t) => t?.price != null);
    return {
        id: g._id,
        title: g.title,
        shortDescription: g.shortDescription || '',
        category: g.category || '',
        skills: (g.skills || []).filter(Boolean),
        banner: g.media?.banner || g.media?.images?.[0] || null,
        startingPrice: startingTier?.price ?? null,
        deliveryTime: startingTier?.deliveryTime ?? null,
        rating: g.stats?.rating || 0,
        reviewsCount: g.stats?.reviewsCount || 0,
        orders: g.stats?.orders || 0,
        freelancerName,
        freelancerAvatar: f.profilePicture || null,
        freelancerInitial: (f.firstName || f.lastName || 'F').charAt(0).toUpperCase(),
    };
};

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
];

const RATINGS = [5, 4, 3];

/* ── Skeleton card ── */
function SkeletonCard({ list }) {
    return (
        <div className={`bg-skeleton${list ? ' bg-card--list' : ''}`}>
            <div className="bg-skel bg-skel--banner" />
            <div style={{ padding: '1rem' }}>
                <div className="bg-skel" style={{ height: 14, width: '70%', marginBottom: 8 }} />
                <div className="bg-skel" style={{ height: 12, width: '90%', marginTop: 10 }} />
                <div className="bg-skel" style={{ height: 12, width: '50%', marginTop: 14 }} />
            </div>
        </div>
    );
}

/* ── Gig Card ── */
function GigCard({ gig, list, onOpen }) {
    return (
        <div className={`bg-card${list ? ' bg-card--list' : ''}`} onClick={() => onOpen(gig.id)}>
            <div className="bg-card__banner">
                {gig.banner ? (
                    <img src={gig.banner} alt={gig.title} loading="lazy" />
                ) : (
                    <div className="bg-card__banner-fallback"><Tag size={28} /></div>
                )}
            </div>
            <div className="bg-card__body">
                {gig.category && <span className="bg-card__category">{gig.category}</span>}
                <h3 className="bg-card__title">{gig.title}</h3>
                <div className="bg-card__seller">
                    <div className="bg-card__seller-avatar">
                        {gig.freelancerAvatar ? <img src={gig.freelancerAvatar} alt={gig.freelancerName} /> : <span>{gig.freelancerInitial}</span>}
                    </div>
                    <span>{gig.freelancerName}</span>
                </div>
                <div className="bg-card__meta">
                    <span className="bg-card__rating">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" /> {gig.rating.toFixed(1)}
                        <span className="count">({gig.reviewsCount})</span>
                    </span>
                    {formatDeliveryTime(gig.deliveryTime) && (
                        <span className="bg-card__delivery"><Clock size={13} /> {formatDeliveryTime(gig.deliveryTime)} delivery</span>
                    )}
                </div>
                {gig.skills.length > 0 && (
                    <div className="bg-card__tags">
                        {gig.skills.slice(0, 3).map((s) => <span key={s} className="bg-card__tag">{s}</span>)}
                    </div>
                )}
            </div>
            <div className="bg-card__footer">
                <span className="bg-card__price">
                    {gig.startingPrice != null ? (<>Starting at <strong>Rs. {gig.startingPrice}</strong></>) : 'Contact for pricing'}
                </span>
            </div>
        </div>
    );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function BrowseGigs() {
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [draftQuery, setDraftQuery] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [maxPrice, setMaxPrice] = useState(500);
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [page, setPage] = useState(1);
    const PER_PAGE = 8;

    const [gigs, setGigs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isMounted = useRef(true);
    useEffect(() => () => { isMounted.current = false; }, []);
    const fetchSeq = useRef(0);

    useEffect(() => {
        document.title = 'Browse Gigs – SkillKart';

        publicAPI.getCategories()
            .then((res) => {
                const live = res.data?.data?.categories || [];
                setCategories(live.map((c) => c.name).filter(Boolean));
            })
            .catch(() => {});

        const tl = gsap.timeline({ delay: 0.1 });
        tl.fromTo('.bg-hero__tag', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
            .fromTo('.bg-hero h1', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }, '-=0.2')
            .fromTo('.bg-hero p', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, '-=0.3')
            .fromTo('.bg-search', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.2');
    }, []);

    const fetchGigs = useCallback(async () => {
        const requestId = ++fetchSeq.current;
        setLoading(true);
        setError(null);
        try {
            const params = {
                q: query || undefined,
                category: category || undefined,
                maxPrice: maxPrice < 500 ? maxPrice : undefined,
                minRating: minRating > 0 ? minRating : undefined,
                sort: sortBy === 'newest' ? undefined : sortBy,
                page,
                limit: PER_PAGE,
            };
            const res = await gigsAPI.listGigs(params);
            if (!isMounted.current || requestId !== fetchSeq.current) return;
            const items = Array.isArray(res.data?.data) ? res.data.data : [];
            setGigs(items.map(mapGigToCard));
            setTotal(res.data?.meta?.pagination?.total ?? items.length);
        } catch (err) {
            if (!isMounted.current || requestId !== fetchSeq.current) return;
            setGigs([]);
            setTotal(0);
            setError(err.response?.data?.message || 'Could not load gigs right now. Please try again.');
        } finally {
            if (isMounted.current && requestId === fetchSeq.current) setLoading(false);
        }
    }, [query, category, maxPrice, minRating, sortBy, page]);

    useEffect(() => { fetchGigs(); }, [fetchGigs]);

    const clearFilters = () => {
        setQuery(''); setDraftQuery(''); setCategory('');
        setMaxPrice(500); setMinRating(0); setSortBy('newest'); setPage(1);
    };

    const handleSearch = (e) => { e.preventDefault(); setQuery(draftQuery); setPage(1); };
    const handleOpen = (id) => { if (id) navigate(`/gigs/${id}`); };

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <>
            <Navbar />
            <div className="bg-page">
                <section className="bg-hero">
                    <div className="container bg-hero__inner">
                        <div className="bg-hero__tag">🛍️ Browse Gigs</div>
                        <h1>Ready-to-Buy <span>Freelancer Packages</span></h1>
                        <p>Skip the back-and-forth — order pre-packaged services from verified student freelancers at a fixed price.</p>

                        <form onSubmit={handleSearch} className="bg-search">
                            <input
                                className="bg-search__input"
                                placeholder="Search gigs by title, skill, or category…"
                                value={draftQuery}
                                onChange={(e) => setDraftQuery(e.target.value)}
                            />
                            <button type="submit" className="bg-search__btn">Search</button>
                        </form>
                    </div>
                    <div className="bg-hero__wave">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                            <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                        </svg>
                    </div>
                </section>

                <div className="container">
                    <div className="bg-layout">
                        <aside className="bg-sidebar">
                            <div className="bg-sidebar__header">
                                <span className="bg-sidebar__title">🎛 Filters</span>
                                <button className="bg-sidebar__clear" onClick={clearFilters}>Clear all</button>
                            </div>

                            <div className="bg-filter-group">
                                <label className="bg-filter-label">Category</label>
                                <CustomSelect
                                    value={category}
                                    onChange={(val) => { setCategory(val); setPage(1); }}
                                    placeholder="All categories"
                                    options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
                                />
                            </div>

                            <div className="bg-filter-group">
                                <label className="bg-filter-label">Max Price</label>
                                <input
                                    type="range"
                                    className="bg-range"
                                    min={10} max={500} step={10}
                                    value={maxPrice}
                                    onChange={(e) => { setMaxPrice(+e.target.value); setPage(1); }}
                                    style={{ background: `linear-gradient(to right, var(--color-primary, #042E4C) ${((maxPrice - 10) / 490) * 100}%, #e2e8f0 ${((maxPrice - 10) / 490) * 100}%)` }}
                                />
                                <div className="bg-range-vals">
                                    <span>Rs. 10</span>
                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Rs. {maxPrice}</span>
                                </div>
                            </div>

                            <div className="bg-filter-group">
                                <label className="bg-filter-label">Minimum Rating</label>
                                <div className="bg-rating-opts">
                                    <label className="bg-rating-opt">
                                        <input type="radio" name="gig-rating" value={0} checked={minRating === 0}
                                            onChange={() => { setMinRating(0); setPage(1); }} />
                                        <span>Any rating</span>
                                    </label>
                                    {RATINGS.map((r) => (
                                        <label key={r} className="bg-rating-opt">
                                            <input type="radio" name="gig-rating" value={r} checked={minRating === r}
                                                onChange={() => { setMinRating(r); setPage(1); }} />
                                            <span className="bg-stars">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
                                            <span>&amp; up</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        <div className="bg-content">
                            <div className="bg-toolbar">
                                <div className="bg-toolbar__count">
                                    Showing <strong>{gigs.length}</strong> of <strong>{total}</strong> gigs
                                    {query && <> for "<em>{query}</em>"</>}
                                </div>
                                <div className="bg-toolbar__right">
                                    <CustomSelect compact value={sortBy} onChange={(val) => { setSortBy(val); setPage(1); }} options={SORT_OPTIONS} />
                                    <div className="bg-view-btns">
                                        <button className={`bg-view-btn${viewMode === 'grid' ? ' bg-view-btn--active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">⊞</button>
                                        <button className={`bg-view-btn${viewMode === 'list' ? ' bg-view-btn--active' : ''}`} onClick={() => setViewMode('list')} title="List view">≡</button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-error">
                                    <div className="bg-error__icon">⚠️</div>
                                    <div className="bg-error__title">Something went wrong</div>
                                    <div className="bg-error__sub">{error}</div>
                                    <button className="bg-error__btn" onClick={fetchGigs}>Try Again</button>
                                </div>
                            )}

                            {loading && !error && (
                                <div className={viewMode === 'grid' ? 'bg-grid' : 'bg-list-view'}>
                                    {Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonCard key={i} list={viewMode === 'list'} />)}
                                </div>
                            )}

                            {!loading && !error && gigs.length > 0 && (
                                <div className={viewMode === 'grid' ? 'bg-grid' : 'bg-list-view'}>
                                    {gigs.map((g) => (
                                        <GigCard key={g.id} gig={g} list={viewMode === 'list'} onOpen={handleOpen} />
                                    ))}
                                </div>
                            )}

                            {!loading && !error && gigs.length === 0 && (
                                <div className="bg-empty">
                                    <div className="bg-empty__icon"><ShoppingBag size={40} /></div>
                                    <div className="bg-empty__title">No gigs found</div>
                                    <div className="bg-empty__sub">Try adjusting your filters or search terms.</div>
                                </div>
                            )}

                            {!loading && totalPages > 1 && (
                                <div className="bg-pagination">
                                    <button className="bg-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <button key={p} className={`bg-page-btn${page === p ? ' bg-page-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                                    ))}
                                    <button className="bg-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
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
