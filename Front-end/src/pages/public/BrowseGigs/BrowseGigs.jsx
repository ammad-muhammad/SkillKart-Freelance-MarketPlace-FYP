import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, ChevronLeft, ChevronRight, X, Star, Filter, Package } from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import Loader from '../../../Components/common/Loader/Loader';
import GigCard from '../../../Components/common/GigCard/GigCard';
import BackButton from '../../../Components/common/BackButton/BackButton';
import { isMobileApp } from '../../../utils/platform';
import { gigsAPI } from '../../../api/gigs';
import { publicAPI } from '../../../api/publicData';
import './BrowseGigs.css';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
];

const POPULAR_CATEGORIES = [
  'Web Development',
  'Graphic Design',
  'Content Writing',
  'Mobile Apps',
  'AI & Machine Learning',
];

export default function BrowseGigs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Sync
  const initialCat = searchParams.get('category') || '';
  const initialQ = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [draftQuery, setDraftQuery] = useState(initialQ);
  const [category, setCategory] = useState(initialCat);
  const [categories, setCategories] = useState([]);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  // Popovers & Mobile Bottom Sheet
  const [openPopover, setOpenPopover] = useState(null); // 'budget' | 'rating' | null
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const [gigs, setGigs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);
  const fetchSeq = useRef(0);

  // Load platform categories
  useEffect(() => {
    document.title = 'Browse Gigs – SkillKart';

    publicAPI.getCategories()
      .then((res) => {
        const live = res.data?.data?.categories || [];
        setCategories(live.map((c) => c.name).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  // Fetch Gigs with active filters
  const fetchGigs = useCallback(async () => {
    const requestId = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      const params = {
        q: query || undefined,
        category: category || undefined,
        maxPrice: maxPrice < 100000 ? maxPrice : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        sort: sortBy === 'newest' ? undefined : sortBy,
        page,
        limit: PER_PAGE,
      };
      const res = await gigsAPI.listGigs(params);
      if (!isMounted.current || requestId !== fetchSeq.current) return;
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setGigs(items);
      setTotal(res.data?.meta?.pagination?.total ?? items.length);
    } catch (err) {
      if (!isMounted.current || requestId !== fetchSeq.current) return;
      setGigs([]);
      setTotal(0);
      setError(err.response?.data?.message || 'Could not load gigs. Please try again.');
    } finally {
      if (isMounted.current && requestId === fetchSeq.current) setLoading(false);
    }
  }, [query, category, maxPrice, minRating, sortBy, page]);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery(draftQuery);
    setPage(1);
  };

  const handleCategorySelect = (cat) => {
    const newCat = category === cat ? '' : cat;
    setCategory(newCat);
    setPage(1);
    if (newCat) setSearchParams({ category: newCat });
    else setSearchParams({});
  };

  const clearAllFilters = () => {
    setQuery('');
    setDraftQuery('');
    setCategory('');
    setMaxPrice(100000);
    setMinRating(0);
    setSortBy('newest');
    setPage(1);
    setSearchParams({});
    setOpenPopover(null);
    setMobileSheetOpen(false);
  };

  const activeFiltersCount = (category ? 1 : 0) + (query ? 1 : 0) + (maxPrice < 100000 ? 1 : 0) + (minRating > 0 ? 1 : 0);
  const totalPages = Math.ceil(total / PER_PAGE) || 1;

  // Windowed pagination range (e.g. 1, 2, 3, 4, 5, '...', 17)
  const paginationRange = useMemo(() => {
    const siblingCount = 1;
    const totalPageNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', lastPageIndex];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages, page]);

  return (
    <>
      <Navbar />

      <div className="bg-page-wrap">
        <div className="bg-container">
          {/* ─── A) Compact Hero Banner with Mint Gradient ─── */}
          <section className="bg-hero">
            {isMobileApp() && (
              <div className="bg-hero__back">
                <BackButton />
              </div>
            )}
            <span className="bg-hero__badge">
              🛍️ SkillKart Marketplace
            </span>

            <h1 className="bg-hero__title">
              Ready-to-Buy <span>Service Packages</span>
            </h1>

            <p className="bg-hero__sub">
              Order verified, fixed-price services from top student talent with milestone escrow protection.
            </p>

            {/* BIG SEARCH PILL centered inside hero (max-width 760px) */}
            <form onSubmit={handleSearchSubmit} className="bg-hero__search-wrap">
              <Search size={18} color="#94A3B8" className="bg-hero__search-icon" />
              <input
                type="text"
                className="bg-hero__search-input"
                placeholder="What service are you looking for today? (e.g., React website, Logo, SEO)..."
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
              />
              {draftQuery && (
                <button
                  type="button"
                  className="bg-hero__search-clear"
                  onClick={() => { setDraftQuery(''); setQuery(''); setPage(1); }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <button type="submit" className="bg-hero__search-btn">
                Search
              </button>
            </form>

            {/* Popular quick category chips */}
            <div className="bg-hero__quick-chips">
              <span className="bg-hero__quick-label">Popular:</span>
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`bg-hero__quick-chip ${category === cat ? 'bg-hero__quick-chip--active' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* ─── B) Clean Single-Row Filter Bar (Not Sticky, No Heavy Box) ─── */}
          <section className="bg-filter-bar" aria-label="Filters">
            {/* Left: Category pills with horizontal scroll & edge fade */}
            <div className="bg-filter-scroll-wrapper">
              <div className="bg-filter-scroll">
                <button
                  type="button"
                  className={`bg-cat-pill ${!category ? 'bg-cat-pill--active' : ''}`}
                  onClick={() => handleCategorySelect('')}
                >
                  All
                </button>
                {(categories.length ? categories : POPULAR_CATEGORIES).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`bg-cat-pill ${category === c ? 'bg-cat-pill--active' : ''}`}
                    onClick={() => handleCategorySelect(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Results Count + Desktop Filter Popovers + Sort */}
            <div className="bg-filter-right-cluster">
              {/* Results count as small muted text */}
              <span className="bg-results-count">
                {total} {total === 1 ? 'gig' : 'gigs'}
              </span>

              {/* Desktop Popover: Budget */}
              <div className="bg-popover-wrap">
                <button
                  type="button"
                  className={`bg-popover-btn ${maxPrice < 100000 ? 'bg-popover-btn--active' : ''}`}
                  onClick={() => setOpenPopover(openPopover === 'budget' ? null : 'budget')}
                  aria-expanded={openPopover === 'budget'}
                >
                  <span>{maxPrice < 100000 ? `≤ Rs. ${maxPrice.toLocaleString()}` : 'Budget'}</span>
                  <ChevronDown size={14} />
                </button>

                {openPopover === 'budget' && (
                  <div className="bg-popover-dropdown">
                    <div className="bg-popover-dropdown__hd">Maximum Price</div>
                    <input
                      type="range"
                      min={1000}
                      max={100000}
                      step={1000}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="bg-range-slider"
                    />
                    <div className="bg-popover-range-labels">
                      <span>Rs. 1,000</span>
                      <strong style={{ color: '#0B2942' }}>Rs. {maxPrice.toLocaleString()}</strong>
                    </div>
                    <div className="bg-popover-actions">
                      <button
                        type="button"
                        className="bg-popover-btn-reset"
                        onClick={() => { setMaxPrice(100000); setOpenPopover(null); setPage(1); }}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="bg-popover-btn-apply"
                        onClick={() => { setOpenPopover(null); setPage(1); }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Popover: Rating */}
              <div className="bg-popover-wrap">
                <button
                  type="button"
                  className={`bg-popover-btn ${minRating > 0 ? 'bg-popover-btn--active' : ''}`}
                  onClick={() => setOpenPopover(openPopover === 'rating' ? null : 'rating')}
                  aria-expanded={openPopover === 'rating'}
                >
                  <Star size={13} fill={minRating > 0 ? '#F59E0B' : 'none'} color={minRating > 0 ? '#F59E0B' : '#0B2942'} />
                  <span>{minRating > 0 ? `${minRating}★+` : 'Rating'}</span>
                  <ChevronDown size={14} />
                </button>

                {openPopover === 'rating' && (
                  <div className="bg-popover-dropdown" style={{ width: 200 }}>
                    <div className="bg-popover-dropdown__hd">Minimum Rating</div>
                    {[4.5, 4.0, 3.5, 0].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`bg-rating-option ${minRating === r ? 'bg-rating-option--active' : ''}`}
                        onClick={() => { setMinRating(r); setOpenPopover(null); setPage(1); }}
                      >
                        <Star size={14} fill={r > 0 ? '#F59E0B' : 'none'} color={r > 0 ? '#F59E0B' : '#94A3B8'} />
                        <span>{r > 0 ? `${r} stars & above` : 'Any rating'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                className="bg-sort-select"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                aria-label="Sort gigs"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Clear button when active filters exist */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  className="bg-clear-btn"
                  onClick={clearAllFilters}
                  title="Clear all filters"
                >
                  Clear
                </button>
              )}

              {/* Mobile "Filters" trigger button */}
              <button
                type="button"
                className="bg-mobile-filters-btn"
                onClick={() => setMobileSheetOpen(true)}
              >
                <Filter size={14} />
                <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              </button>
            </div>
          </section>

          {/* ─── Mobile Bottom Sheet for Filters ─── */}
          {mobileSheetOpen && (
            <div className="bg-sheet-overlay" onClick={() => setMobileSheetOpen(false)}>
              <div className="bg-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="bg-sheet__hd">
                  <h3 className="bg-sheet__title">Filter Gigs</h3>
                  <button type="button" onClick={() => setMobileSheetOpen(false)} className="bg-sheet__close">
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-sheet__body">
                  <div className="bg-sheet__section">
                    <span className="bg-sheet__section-title">Maximum Budget</span>
                    <input
                      type="range"
                      min={1000}
                      max={100000}
                      step={1000}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="bg-range-slider"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B' }}>
                      <span>Rs. 1,000</span>
                      <strong style={{ color: '#0B2942' }}>Rs. {maxPrice.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="bg-sheet__section">
                    <span className="bg-sheet__section-title">Minimum Rating</span>
                    {[4.5, 4.0, 3.5, 0].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`bg-rating-option ${minRating === r ? 'bg-rating-option--active' : ''}`}
                        onClick={() => setMinRating(r)}
                      >
                        <Star size={14} fill={r > 0 ? '#F59E0B' : 'none'} color={r > 0 ? '#F59E0B' : '#94A3B8'} />
                        <span>{r > 0 ? `${r} stars & above` : 'Any rating'}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-sheet__section">
                    <span className="bg-sheet__section-title">Sort By</span>
                    <select
                      className="bg-sort-select"
                      style={{ width: '100%' }}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-sheet__ft">
                  <button type="button" className="bg-popover-btn-reset" onClick={clearAllFilters}>
                    Reset All
                  </button>
                  <button
                    type="button"
                    className="bg-popover-btn-apply"
                    onClick={() => { setMobileSheetOpen(false); setPage(1); }}
                  >
                    Show Results
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── C) Gigs Grid (Public Variant: 3 per row at 1280+, 2 tablet, 1 mobile) ─── */}
          {loading ? (
            <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader text="Finding service gigs..." />
            </div>
          ) : gigs.length === 0 ? (
            <div className="fl-gigs-empty-card">
              <div className="fl-gigs-empty-card__icon">
                <Package size={28} />
              </div>
              <h3 className="fl-gigs-empty-card__title">
                No service gigs match your criteria
              </h3>
              <p className="fl-gigs-empty-card__sub">
                Try widening your price range, searching for another skill, or clearing filters.
              </p>
              <button
                type="button"
                className="fl-gigs-header__cta"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="sk-gigs-grid">
              {gigs.map((g) => (
                <GigCard
                  key={g._id}
                  gig={g}
                  variant="public"
                  onOpen={(id) => navigate(`/gigs/${id}`)}
                />
              ))}
            </div>
          )}

          {/* ─── D) Modern Windowed Pagination Bar ─── */}
          {totalPages > 1 && !loading && (
            <nav className="bg-pagination-wrap" aria-label="Gigs pagination">
              <div className="bg-pagination-info">
                Showing <span className="bg-pagination-highlight">{(page - 1) * PER_PAGE + 1}</span>–<span className="bg-pagination-highlight">{Math.min(page * PER_PAGE, total)}</span> of <span className="bg-pagination-highlight">{total}</span> service packages
              </div>

              <div className="bg-pagination">
                <button
                  type="button"
                  className="bg-page-nav-btn"
                  disabled={page === 1}
                  onClick={() => {
                    setPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span className="bg-page-nav-text">Previous</span>
                </button>

                <div className="bg-page-numbers">
                  {paginationRange.map((pageNumber, idx) => {
                    if (pageNumber === '...') {
                      return (
                        <span key={`dots-${idx}`} className="bg-page-dots" aria-hidden="true">
                          •••
                        </span>
                      );
                    }

                    const isActive = page === pageNumber;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`bg-page-btn ${isActive ? 'bg-page-btn--active' : ''}`}
                        onClick={() => {
                          setPage(pageNumber);
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={`Page ${pageNumber}`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="bg-page-nav-btn"
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  aria-label="Next page"
                >
                  <span className="bg-page-nav-text">Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
