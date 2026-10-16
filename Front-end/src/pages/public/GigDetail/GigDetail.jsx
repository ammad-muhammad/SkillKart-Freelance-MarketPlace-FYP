import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gigsAPI } from '../../../api/gigs';
import { messagesAPI } from '../../../api/messages';
import { useAuth } from '../../../hooks/useAuth';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import Loader from '../../../Components/common/Loader/Loader';
import Skeleton from '../../../Components/common/Skeleton/Skeleton';
import GigOrderModal from '../../../Components/common/GigOrderModal/GigOrderModal';
import BackButton from '../../../Components/common/BackButton/BackButton';
import Reveal from '../../freelancer/components/Reveal';
import { payGigOrderDeposit, apiErrorMessage, formatDeliveryTime } from '../../../utils/gigOrderCheckout';
import { safeToast as toast } from '../../../utils/safeToast';
import { isMobileApp } from '../../../utils/platform';
import {
  ChevronLeft, ChevronRight, Star, ShoppingBag, Clock, RefreshCw,
  CheckCircle2, Tag, MessageCircle, Maximize2, X, ExternalLink,
  ShieldCheck, ArrowRight, Share2, Bookmark, Check, ChevronDown,
  Sparkles, FileCode, CheckSquare, Calendar, AlertCircle, Layers,
  RotateCcw, Image as ImageIcon, Award, Zap, HelpCircle
} from 'lucide-react';
import './GigDetail.css';

const TIER_ORDER = ['basic', 'standard', 'premium'];
const TIER_LABELS = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

export default function GigDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Selected pricing tier
  const [activeTierKey, setActiveTierKey] = useState('basic');

  // Accordion & Collapse States
  const [descExpanded, setDescExpanded] = useState(false);
  const [matrixExpanded, setMatrixExpanded] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0); // First FAQ open by default
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState('all'); // 'all' | 5 | 4 | 3 | 2 | 1

  // Gallery slider & Lightbox state
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Portfolio state (if seller portfolio exists)
  const [featuredProjectIdx, setFeaturedProjectIdx] = useState(0);

  // Order & Bookmark state
  const [orderConfirmTier, setOrderConfirmTier] = useState(null);
  const [ordering, setOrdering] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);

  const loadGig = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setErrorMsg(null);
    try {
      const res = await gigsAPI.getGig(id);
      const g = res.data?.data?.gig;
      if (!g) {
        setNotFound(true);
      } else {
        setGig(g);
        if (g?.pricing) {
          const firstAvailable = TIER_ORDER.find(t => g.pricing[t]?.price != null) || 'basic';
          setActiveTierKey(firstAvailable);
        }
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setNotFound(true);
      } else {
        setErrorMsg('Failed to load this service gig. Please try again.');
        toast.error('Could not load service gig.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGig();
  }, [loadGig]);

  useEffect(() => {
    if (gig?.title) {
      document.title = `${gig.title} – SkillKart`;
    }
  }, [gig?.title]);

  // Gallery slides collection
  const slides = useMemo(() => {
    const list = [];
    if (gig?.media?.banner) list.push(gig.media.banner);
    if (Array.isArray(gig?.media?.images)) {
      gig.media.images.forEach(img => {
        if (img && typeof img === 'string' && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [gig]);

  const currentSlide = slides[activeImgIdx] || slides[0] || null;

  // Preload next image in gallery
  useEffect(() => {
    if (slides.length > 1) {
      const nextIdx = (activeImgIdx + 1) % slides.length;
      if (slides[nextIdx]) {
        const pre = new Image();
        pre.src = slides[nextIdx];
      }
    }
  }, [activeImgIdx, slides]);

  // Keyboard navigation for Lightbox and Gallery (Esc, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') setLightboxOpen(false);
        if (e.key === 'ArrowRight') setActiveImgIdx(prev => (prev + 1) % (slides.length || 1));
        if (e.key === 'ArrowLeft') setActiveImgIdx(prev => (prev - 1 + (slides.length || 1)) % (slides.length || 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, slides.length]);

  // Touch swipe support for gallery slider
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45 && slides.length > 1) {
      setActiveImgIdx(prev => (prev + 1) % slides.length);
    } else if (diff < -45 && slides.length > 1) {
      setActiveImgIdx(prev => (prev - 1 + slides.length) % slides.length);
    }
  };

  // Tiers normalized
  const tiers = useMemo(() => {
    if (!gig?.pricing) return [];
    return TIER_ORDER
      .filter(key => gig.pricing[key] && gig.pricing[key].price != null)
      .map(key => ({
        key,
        label: TIER_LABELS[key],
        ...gig.pricing[key]
      }));
  }, [gig]);

  const selectedTier = useMemo(() => {
    return tiers.find(t => t.key === activeTierKey) || tiers[0] || null;
  }, [tiers, activeTierKey]);

  // Distinct features for compare matrix
  const compareFeatures = useMemo(() => {
    const set = new Set();
    tiers.forEach(t => {
      (t.features || []).forEach(f => {
        const text = typeof f === 'string' ? f : f?.text;
        if (text) set.add(text);
      });
    });
    return Array.from(set);
  }, [tiers]);

  // Star rating distribution (5, 4, 3, 2, 1)
  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const revs = Array.isArray(gig?.reviews) ? gig.reviews : [];
    revs.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    const total = revs.length;
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: counts[star] || 0,
      pct: total > 0 ? Math.round(((counts[star] || 0) / total) * 100) : 0
    }));
  }, [gig?.reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    const all = Array.isArray(gig?.reviews) ? gig.reviews : [];
    if (reviewRatingFilter === 'all') return all;
    const target = Number(reviewRatingFilter);
    return all.filter(r => Math.round(Number(r.rating) || 5) === target);
  }, [gig?.reviews, reviewRatingFilter]);

  const visibleReviews = useMemo(() => {
    return reviewsExpanded ? filteredReviews : filteredReviews.slice(0, 5);
  }, [filteredReviews, reviewsExpanded]);

  // Portfolio items (only rendered if portfolio data exists on current payload)
  const portfolioItems = useMemo(() => {
    if (Array.isArray(gig?.portfolio) && gig.portfolio.length > 0) return gig.portfolio;
    if (Array.isArray(gig?.freelancerId?.portfolio) && gig.freelancerId.portfolio.length > 0) {
      return gig.freelancerId.portfolio;
    }
    return [];
  }, [gig]);

  // Deliverables (images beyond the cover image)
  const deliverableImages = useMemo(() => {
    if (slides.length <= 1) return [];
    return slides.slice(1, 5); // Take up to 4 images for the 2x2 grid
  }, [slides]);

  // Contact seller
  const handleContact = async () => {
    if (!user) {
      toast.info('Please log in to contact this freelancer.');
      navigate('/login');
      return;
    }
    const freelancerId = gig?.freelancerId?._id;
    if (user.role === 'client' && freelancerId) {
      try {
        await messagesAPI.startConversation(freelancerId, `Hi! I'm interested in your gig "${gig?.title || ''}".`);
        navigate('/client/messages');
        return;
      } catch {
        navigate('/client/messages');
        return;
      }
    }
    navigate(user.role === 'freelancer' ? '/freelancer/messages' : '/client/messages');
  };

  // Order trigger
  const handleOrder = (tierKey) => {
    if (!user) {
      toast.info('Please log in as a client to order this gig.');
      try { sessionStorage.setItem('postLoginRedirect', `/gigs/${id}`); } catch { /* non-fatal */ }
      navigate('/login');
      return;
    }
    if (user.role !== 'client') {
      toast.warning('Only clients can order gigs. Switch to a client account to purchase.');
      return;
    }
    setOrderConfirmTier(tierKey);
  };

  // Submit order through checkout
  const proceedWithOrder = async (requirements) => {
    const tier = orderConfirmTier;
    setOrdering(tier);
    let jobId;
    try {
      const orderRes = await gigsAPI.orderGig(id, tier, requirements);
      jobId = orderRes.data?.data?.order?._id;
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not place the order.'));
      setOrdering(null);
      return;
    }
    if (!jobId) {
      toast.error('Could not create order. Please try again.');
      setOrdering(null);
      return;
    }

    const pay = await payGigOrderDeposit(jobId);
    if (pay.outcome === 'redirect') return;
    setOrderConfirmTier(null);
    setOrdering(null);
    if (pay.outcome === 'wallet') {
      toast.success('Order placed and 50% escrow deposit paid from your wallet! 🚀');
    } else {
      toast.warning(`Order created, but deposit wasn't paid: ${pay.message}`);
    }
    navigate('/client/projects');
  };

  /* ── SKELETON / LOADING STATE ── */
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="gd-page-wrapper gd-skeleton-page">
          <div className="gd-container">
            <div className="gd-skeleton-breadcrumbs">
              <Skeleton width="220px" height="18px" />
            </div>

            <Skeleton width="130px" height="26px" style={{ borderRadius: 9999, marginBottom: 16 }} />
            <Skeleton width="90%" height="48px" style={{ borderRadius: 12, marginBottom: 12 }} />
            <Skeleton width="65%" height="48px" style={{ borderRadius: 12, marginBottom: 24 }} />

            <div className="gd-skeleton-seller-row">
              <Skeleton width="44px" height="44px" variant="circle" />
              <div style={{ flex: 1 }}>
                <Skeleton width="180px" height="18px" style={{ marginBottom: 6 }} />
                <Skeleton width="280px" height="14px" />
              </div>
            </div>

            {/* Full-width Gallery Skeleton */}
            <div className="gd-skeleton-gallery">
              <Skeleton width="100%" height="440px" style={{ borderRadius: 24, marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                {[1, 2, 3, 4].map(n => (
                  <Skeleton key={n} width="120px" height="72px" style={{ borderRadius: 12 }} />
                ))}
              </div>
            </div>

            {/* Two Column Grid Skeleton */}
            <div className="gd-main-grid" style={{ marginTop: 40 }}>
              <div className="gd-left-col">
                <Skeleton width="240px" height="28px" style={{ marginBottom: 16 }} />
                <Skeleton width="100%" height="16px" style={{ marginBottom: 8 }} />
                <Skeleton width="95%" height="16px" style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height="16px" style={{ marginBottom: 24 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Skeleton width="100%" height="90px" style={{ borderRadius: 16 }} />
                  <Skeleton width="100%" height="90px" style={{ borderRadius: 16 }} />
                </div>
              </div>

              <aside className="gd-right-col">
                <Skeleton width="100%" height="420px" style={{ borderRadius: 24 }} />
              </aside>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  /* ── 404 / NOT FOUND STATE ── */
  if (notFound) {
    return (
      <>
        <Navbar />
        <div className="gd-page-wrapper">
          <div className="gd-container" style={{ textAlign: 'center', padding: '120px 24px' }}>
            <div className="gd-not-found-icon-box">
              <Tag size={44} color="#10B981" />
            </div>
            <h2 className="gd-not-found-title">Service Gig Not Found</h2>
            <p className="gd-not-found-text">
              The service package you requested may have been archived, paused, or the link is incorrect.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Link to="/browse-gigs" className="gd-primary-pill-btn">
                Browse Marketplace Gigs →
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  /* ── GENERAL ERROR STATE WITH RETRY ── */
  if (errorMsg || !gig) {
    return (
      <>
        <Navbar />
        <div className="gd-page-wrapper">
          <div className="gd-container" style={{ textAlign: 'center', padding: '120px 24px' }}>
            <div className="gd-not-found-icon-box">
              <AlertCircle size={44} color="#EF4444" />
            </div>
            <h2 className="gd-not-found-title">Could Not Load Service Gig</h2>
            <p className="gd-not-found-text">{errorMsg || 'An unexpected error occurred while fetching the gig details.'}</p>
            <button type="button" onClick={loadGig} className="gd-primary-pill-btn">
              <RotateCcw size={16} />
              <span>Retry Loading</span>
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const freelancer = gig.freelancerId || {};
  const freelancerName = freelancer.userId?.fullName || freelancer.personalInfo?.fullName || (freelancer.firstName ? `${freelancer.firstName || ''} ${freelancer.lastName || ''}`.trim() : 'Verified Freelancer');
  const freelancerAvatar = freelancer.userId?.profilePicture || freelancer.profilePicture || null;
  const freelancerInitial = freelancerName.charAt(0).toUpperCase();
  const isOwnGig = user && String(user._id || user.id) === String(freelancer._id || freelancer.userId?._id);
  const stats = gig.stats || {};
  const rating = Number(stats.rating || freelancer.rating || 0);
  const reviewsCount = Number(stats.reviewsCount || (Array.isArray(gig.reviews) ? gig.reviews.length : 0));
  const ordersCount = Number(freelancer.completedProjects || stats.orders || 0);
  const sellerTitle = freelancer.title || (rating >= 4.8 ? 'Top Rated Seller' : rating >= 4.5 ? 'Level 2 Seller' : 'Specialized Pro');

  // Badge Row checks
  const isTopRated = rating >= 4.8;
  const isVerifiedSeller = Boolean(freelancer.isVerified || freelancer.userId?.isVerified || (freelancer.verifiedSkills && freelancer.verifiedSkills.length > 0));
  const isFastDelivery = tiers.some(t => Number(t.deliveryTime) > 0 && Number(t.deliveryTime) <= 3);
  const hasBadges = Boolean(gig.category || isTopRated || isVerifiedSeller || isFastDelivery);

  return (
    <>
      <Navbar />

      <div className="gd-page-wrapper">
        <div className="gd-container">

          {/* ══════════════════════════════════════════════════════════
              A) TOP AREA: FULL CONTAINER WIDTH (Above Two Columns)
              ══════════════════════════════════════════════════════════ */}
          <header className="gd-top-area" aria-label="Gig Header & Gallery">
            {/* 1. Breadcrumb small muted */}
            <div className="gd-breadcrumb-bar">
              <nav className="gd-breadcrumb" aria-label="Breadcrumb">
                <Link to="/browse-gigs">Marketplace</Link>
                <span className="gd-breadcrumb__sep">/</span>
                {gig.category && (
                  <>
                    <Link to={`/browse-gigs?category=${encodeURIComponent(gig.category)}`}>
                      {gig.category}
                    </Link>
                    <span className="gd-breadcrumb__sep">/</span>
                  </>
                )}
                {gig.subcategory && (
                  <>
                    <span className="gd-breadcrumb__muted">{gig.subcategory}</span>
                    <span className="gd-breadcrumb__sep">/</span>
                  </>
                )}
                <span className="gd-breadcrumb__curr" title={gig.title}>{gig.title}</span>
              </nav>

              {isMobileApp() ? (
                <BackButton />
              ) : (
                <Link to="/browse-gigs" className="gd-back-text-link">
                  <ChevronLeft size={14} />
                  <span>All Gigs</span>
                </Link>
              )}
            </div>

            {/* UNIFIED HERO CARD: IMAGE ON LEFT + DETAILS ON RIGHT */}
            <div className="gd-hero-unified-card">
              {/* Left Column: Gallery Media Showcase Slider + Thumbnails */}
              <div className="gd-hero-unified-media">
                <div className="gd-gallery-slider-wrap">
                  <div
                    className="gd-slider-viewport"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => { if (currentSlide) setLightboxOpen(true); }}
                    role="button"
                    tabIndex={0}
                    aria-label="Click to enlarge showcase image"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (currentSlide) setLightboxOpen(true);
                      }
                    }}
                  >
                    {currentSlide ? (
                      <img
                        src={currentSlide}
                        alt={`${gig.title} - Showcase ${activeImgIdx + 1}`}
                        className="gd-slider-main-img"
                      />
                    ) : (
                      <div className="gd-slider-empty-fallback">
                        <ImageIcon size={44} color="#10B981" />
                        <span>SkillKart Verified Service Gig</span>
                      </div>
                    )}

                    {/* Counter Pill bottom-right */}
                    {slides.length > 1 && (
                      <div className="gd-slider-counter-pill" onClick={e => e.stopPropagation()}>
                        Preview {activeImgIdx + 1} of {slides.length}
                      </div>
                    )}

                    {/* Navigation Arrows */}
                    {slides.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="gd-slider-arrow gd-slider-arrow--prev"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImgIdx(prev => (prev - 1 + slides.length) % slides.length);
                          }}
                          aria-label="Previous preview"
                        >
                          <ChevronLeft size={22} />
                        </button>
                        <button
                          type="button"
                          className="gd-slider-arrow gd-slider-arrow--next"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImgIdx(prev => (prev + 1) % slides.length);
                          }}
                          aria-label="Next preview"
                        >
                          <ChevronRight size={22} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip directly under slider */}
                  {slides.length > 1 && (
                    <div className="gd-thumbnail-strip-row" aria-label="Gallery thumbnails">
                      {slides.map((img, idx) => {
                        const isActive = idx === activeImgIdx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`gd-thumbnail-tile ${isActive ? 'gd-thumbnail-tile--active' : ''}`}
                            onClick={() => setActiveImgIdx(idx)}
                            aria-label={`Show preview image ${idx + 1}`}
                          >
                            <img src={img} alt={`Thumbnail ${idx + 1}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Badges, Title, Seller Profile, and Action Buttons */}
              <div className="gd-hero-unified-details">
                {/* 1. Badge row */}
                {hasBadges && (
                  <div className="gd-badge-row">
                    {gig.category && (
                      <span className="gd-badge-chip gd-badge-chip--category">
                        <Sparkles size={12} color="#10B981" />
                        <span>{gig.category}</span>
                      </span>
                    )}
                    {isTopRated && (
                      <span className="gd-badge-chip gd-badge-chip--top">
                        <Award size={12} color="#F59E0B" />
                        <span>Top Rated</span>
                      </span>
                    )}
                    {isVerifiedSeller && (
                      <span className="gd-badge-chip gd-badge-chip--verified">
                        <CheckCircle2 size={12} color="#10B981" />
                        <span>Verified Seller</span>
                      </span>
                    )}
                    {isFastDelivery && (
                      <span className="gd-badge-chip gd-badge-chip--speed">
                        <Zap size={12} color="#3B82F6" />
                        <span>Fast Delivery (≤3 Days)</span>
                      </span>
                    )}
                  </div>
                )}

                {/* 2. Gig Title */}
                <h1 className="gd-h1-title">{gig.title}</h1>

                {/* 3. Seller Identity & Performance Card */}
                <div className="gd-hero-seller-card">
                  <div className="gd-hero-seller-top">
                    <Link
                      to={`/freelancers/${freelancer._id || freelancer.userId?._id || ''}`}
                      className="gd-seller-avatar-44"
                      aria-label={`View ${freelancerName}'s profile`}
                    >
                      {freelancerAvatar ? (
                        <img src={freelancerAvatar} alt={freelancerName} />
                      ) : (
                        <span>{freelancerInitial}</span>
                      )}
                    </Link>

                    <div className="gd-hero-seller-info">
                      <div className="gd-seller-name-row">
                        <Link
                          to={`/freelancers/${freelancer._id || freelancer.userId?._id || ''}`}
                          className="gd-seller-name-link"
                        >
                          {freelancerName}
                        </Link>
                        {isVerifiedSeller && (
                          <CheckCircle2 size={15} color="#10B981" className="gd-verified-icon" />
                        )}
                      </div>
                      {sellerTitle && (
                        <span className="gd-seller-title-muted">{sellerTitle}</span>
                      )}
                    </div>
                  </div>

                  <div className="gd-hero-seller-meta">
                    <div className="gd-seller-rating-inline">
                      <Star size={14} fill="#F59E0B" color="#F59E0B" />
                      <strong>{rating > 0 ? rating.toFixed(1) : '5.0'}</strong>
                      <span className="gd-rating-count-muted">({reviewsCount} reviews)</span>
                    </div>

                    {ordersCount > 0 && (
                      <>
                        <span className="gd-meta-dot">•</span>
                        <div className="gd-seller-orders-inline">
                          <ShoppingBag size={13} color="#10B981" />
                          <span>{ordersCount} orders completed</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. Action Buttons (Save, Share, Expand) */}
                <div className="gd-hero-actions-row">
                  <button
                    type="button"
                    className={`gd-action-icon-pill ${bookmarked ? 'gd-action-icon-pill--active' : ''}`}
                    onClick={() => {
                      setBookmarked(!bookmarked);
                      toast.success(bookmarked ? 'Bookmark removed' : 'Gig saved to bookmarks!');
                    }}
                    title="Save gig"
                    aria-label="Save gig"
                  >
                    <Bookmark size={15} fill={bookmarked ? '#10B981' : 'none'} color={bookmarked ? '#10B981' : '#0B2942'} />
                    <span className="gd-action-pill-text">{bookmarked ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    className="gd-action-icon-pill"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: gig.title, url: window.location.href });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Gig link copied to clipboard!');
                      }
                    }}
                    title="Share gig"
                    aria-label="Share gig"
                  >
                    <Share2 size={15} color="#0B2942" />
                    <span className="gd-action-pill-text">Share</span>
                  </button>

                  {currentSlide && (
                    <button
                      type="button"
                      className="gd-action-icon-pill gd-action-icon-pill--expand"
                      onClick={() => setLightboxOpen(true)}
                      title="Expand gallery view"
                      aria-label="Expand gallery view"
                    >
                      <Maximize2 size={15} color="#0B2942" />
                      <span className="gd-action-pill-text">Expand view</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ══════════════════════════════════════════════════════════
              B) TWO-COLUMN BODY (12-col grid, gap 32px)
                 LEFT: Col 8 Content
                 RIGHT: Col 4 Sticky Order Panel
              ══════════════════════════════════════════════════════════ */}
          <div className="gd-main-grid">

            {/* ─── LEFT COLUMN (8 Columns) ─── */}
            <main className="gd-left-col">

              {/* 1) ABOUT THIS GIG */}
              <Reveal>
                <section className="gd-section-block" aria-label="About this service">
                  <div className="gd-section-eyebrow">ABOUT THIS SERVICE</div>
                  <h2 className="gd-section-h2">About this gig</h2>

                  {/* Description Text */}
                  <div className="gd-desc-container">
                    <div className={`gd-desc-body ${!descExpanded && (gig.fullDescription?.length > 450) ? 'gd-desc-body--collapsed' : ''}`}>
                      {gig.fullDescription || gig.shortDescription || 'No detailed description provided.'}
                    </div>

                    {gig.fullDescription && gig.fullDescription.length > 450 && (
                      <button
                        type="button"
                        className="gd-read-more-pill"
                        onClick={() => setDescExpanded(!descExpanded)}
                      >
                        <span>{descExpanded ? 'Show less' : 'Read full description'}</span>
                        <ChevronDown size={14} className={`gd-read-more-icon ${descExpanded ? 'gd-read-more-icon--rotated' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* 2x2 Grid of small feature tiles built ONLY from real data */}
                  <div className="gd-features-tiles-grid">
                    {/* Delivery Time */}
                    {selectedTier?.deliveryTime && (
                      <div className="gd-feature-tile">
                        <div className="gd-feature-tile__icon-circle">
                          <Clock size={16} color="#10B981" />
                        </div>
                        <div className="gd-feature-tile__content">
                          <strong className="gd-feature-tile__title">
                            {formatDeliveryTime(selectedTier?.deliveryTime)} Turnaround
                          </strong>
                          <span className="gd-feature-tile__desc">
                            Direct milestone delivery schedule
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Revisions */}
                    <div className="gd-feature-tile">
                      <div className="gd-feature-tile__icon-circle">
                        <RefreshCw size={16} color="#10B981" />
                      </div>
                      <div className="gd-feature-tile__content">
                        <strong className="gd-feature-tile__title">
                          {selectedTier?.revisions ? `${selectedTier.revisions} Rounds Revisions` : 'Unlimited Revisions'}
                        </strong>
                        <span className="gd-feature-tile__desc">
                          Quality guarantee until accepted
                        </span>
                      </div>
                    </div>

                    {/* Deliverables / Source Files */}
                    <div className="gd-feature-tile">
                      <div className="gd-feature-tile__icon-circle">
                        <FileCode size={16} color="#10B981" />
                      </div>
                      <div className="gd-feature-tile__content">
                        <strong className="gd-feature-tile__title">
                          Source Files Included
                        </strong>
                        <span className="gd-feature-tile__desc">
                          Production deliverables & assets
                        </span>
                      </div>
                    </div>

                    {/* Verified Skills */}
                    {Array.isArray(gig.skills) && gig.skills.length > 0 && (
                      <div className="gd-feature-tile">
                        <div className="gd-feature-tile__icon-circle">
                          <ShieldCheck size={16} color="#10B981" />
                        </div>
                        <div className="gd-feature-tile__content">
                          <strong className="gd-feature-tile__title">
                            {gig.skills.length} Verified Stack Skills
                          </strong>
                          <span className="gd-feature-tile__desc">
                            Proctored SkillKart assessment
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Skill Chips Row below */}
                  {Array.isArray(gig.skills) && gig.skills.length > 0 && (
                    <div className="gd-skills-chips-wrap">
                      <span className="gd-skills-label">Skills & Tools:</span>
                      <div className="gd-skills-chips-row">
                        {gig.skills.map((skill, idx) => (
                          <span key={idx} className="gd-skill-chip">
                            {typeof skill === 'string' ? skill : skill?.name || ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </Reveal>

              {/* MOBILE INLINE PACKAGES PANEL (Appears after About section on mobile < 1024px) */}
              <div className="gd-mobile-packages-slot">
                <PackagesPanel
                  tiers={tiers}
                  activeTierKey={activeTierKey}
                  setActiveTierKey={setActiveTierKey}
                  selectedTier={selectedTier}
                  gig={gig}
                  isOwnGig={isOwnGig}
                  ordering={ordering}
                  handleOrder={handleOrder}
                  handleContact={handleContact}
                />
              </div>

              {/* 2) WHAT YOU WILL RECEIVE (Only if gig has 2+ gallery images/deliverables) */}
              {deliverableImages.length > 0 && (
                <Reveal>
                  <section className="gd-section-block" aria-label="What you will receive">
                    <div className="gd-section-eyebrow">DELIVERABLES</div>
                    <h2 className="gd-section-h2">What you will receive</h2>

                    <div className="gd-deliverables-grid">
                      {deliverableImages.map((imgUrl, dIdx) => (
                        <div
                          key={dIdx}
                          className="gd-deliverable-card"
                          onClick={() => {
                            setActiveImgIdx(dIdx + 1);
                            setLightboxOpen(true);
                          }}
                        >
                          <div className="gd-deliverable-img-wrap">
                            <img src={imgUrl} alt={`Deliverable showcase ${dIdx + 1}`} />
                            <div className="gd-deliverable-overlay-hint">
                              <Maximize2 size={14} />
                              <span>View preview</span>
                            </div>
                          </div>
                          <div className="gd-deliverable-info">
                            <h4 className="gd-deliverable-title">
                              Deliverable Asset #{dIdx + 1}
                            </h4>
                            <p className="gd-deliverable-desc">
                              Full resolution preview & deliverable export built for {gig.category || 'project'}.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* 3) SELLER PORTFOLIO (Only if portfolio data exists on current payload) */}
              {portfolioItems.length > 0 && (
                <Reveal>
                  <section className="gd-section-block" aria-label="Seller portfolio">
                    <div className="gd-section-eyebrow">PORTFOLIO</div>
                    <h2 className="gd-section-h2">Seller's featured projects</h2>

                    {portfolioItems[featuredProjectIdx] && (
                      <div className="gd-portfolio-featured-card">
                        <div className="gd-portfolio-featured-img-col">
                          <img
                            src={portfolioItems[featuredProjectIdx].coverImage || portfolioItems[featuredProjectIdx].image || slides[0]}
                            alt={portfolioItems[featuredProjectIdx].title || 'Portfolio project'}
                            className="gd-portfolio-featured-img"
                          />
                          <div className="gd-portfolio-img-badge">
                            <ImageIcon size={13} />
                            <span>{portfolioItems.length} projects</span>
                          </div>
                        </div>

                        <div className="gd-portfolio-featured-info-col">
                          {portfolioItems[featuredProjectIdx].completedAt && (
                            <span className="gd-portfolio-date">
                              Completed: {new Date(portfolioItems[featuredProjectIdx].completedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          <h3 className="gd-portfolio-title">
                            {portfolioItems[featuredProjectIdx].title || 'Client Deliverable Showcase'}
                          </h3>
                          <p className="gd-portfolio-desc">
                            {portfolioItems[featuredProjectIdx].description || 'Custom professional deliverable built under milestone contract.'}
                          </p>

                          {/* Category chips */}
                          {Array.isArray(portfolioItems[featuredProjectIdx].skills) && (
                            <div className="gd-portfolio-chips-row">
                              {portfolioItems[featuredProjectIdx].skills.slice(0, 3).map((sk, sIdx) => (
                                <span key={sIdx} className="gd-portfolio-chip">{sk}</span>
                              ))}
                              {portfolioItems[featuredProjectIdx].skills.length > 3 && (
                                <span className="gd-portfolio-chip gd-portfolio-chip--more">
                                  +{portfolioItems[featuredProjectIdx].skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Plain stats */}
                          <div className="gd-portfolio-stats-row">
                            {portfolioItems[featuredProjectIdx].cost && (
                              <div className="gd-portfolio-stat">
                                <span className="gd-portfolio-stat__lbl">Project cost</span>
                                <strong className="gd-portfolio-stat__val">
                                  Rs. {Number(portfolioItems[featuredProjectIdx].cost).toLocaleString()}
                                </strong>
                              </div>
                            )}
                            {portfolioItems[featuredProjectIdx].duration && (
                              <div className="gd-portfolio-stat">
                                <span className="gd-portfolio-stat__lbl">Duration</span>
                                <strong className="gd-portfolio-stat__val">
                                  {portfolioItems[featuredProjectIdx].duration}
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Thumbnail strip with "+N" tile */}
                    {portfolioItems.length > 1 && (
                      <div className="gd-portfolio-thumbs-row">
                        {portfolioItems.slice(0, 5).map((proj, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            className={`gd-portfolio-thumb-tile ${pIdx === featuredProjectIdx ? 'gd-portfolio-thumb-tile--active' : ''}`}
                            onClick={() => setFeaturedProjectIdx(pIdx)}
                          >
                            <img
                              src={proj.coverImage || proj.image || slides[0]}
                              alt={proj.title || `Project ${pIdx + 1}`}
                            />
                          </button>
                        ))}
                        {portfolioItems.length > 5 && (
                          <Link
                            to={`/freelancers/${freelancer._id || freelancer.userId?._id || ''}`}
                            className="gd-portfolio-thumb-more-tile"
                          >
                            <span>+{portfolioItems.length - 5}</span>
                            <small>More</small>
                          </Link>
                        )}
                      </div>
                    )}
                  </section>
                </Reveal>
              )}

              {/* 4) PROCESS / DELIVERY STEPS: SKIPPED (No steps data in gig model) */}

              {/* 5) PACKAGE COMPARISON */}
              <Reveal>
                <section className="gd-section-block" aria-label="Package comparison">
                  <div className="gd-section-eyebrow">PACKAGE COMPARISON</div>
                  <h2 className="gd-section-h2">Compare packages</h2>
                  <p className="gd-section-subtext">Select the plan that matches your project scope</p>

                  {/* 3 Tier Cards Side by Side (equal height, stacks under 900px) */}
                  <div className="gd-tier-cards-grid">
                    {tiers.map((t, idx) => {
                      const isSelected = t.key === activeTierKey;
                      const isPopular = tiers.length === 3 && idx === 1;

                      return (
                        <div
                          key={t.key}
                          className={`gd-tier-card ${isSelected ? 'gd-tier-card--selected' : ''}`}
                          onClick={() => setActiveTierKey(t.key)}
                        >
                          {isPopular && (
                            <div className="gd-tier-popular-ribbon">
                              Most Popular
                            </div>
                          )}

                          <div className="gd-tier-card-header">
                            <span className="gd-tier-card-eyebrow">{t.label}</span>
                            <div className="gd-tier-card-price">
                              Rs. {Number(t.price).toLocaleString()}
                            </div>
                            <h4 className="gd-tier-card-title">{t.title || `${t.label} Package`}</h4>
                            <p className="gd-tier-card-desc">{t.description || gig.shortDescription}</p>
                          </div>

                          <div className="gd-tier-card-meta">
                            <div className="gd-tier-meta-line">
                              <Clock size={14} color="#10B981" />
                              <span>{formatDeliveryTime(t.deliveryTime)}</span>
                            </div>
                            <div className="gd-tier-meta-line">
                              <RefreshCw size={14} color="#10B981" />
                              <span>{t.revisions ? `${t.revisions} Revisions` : 'Unlimited Revisions'}</span>
                            </div>
                          </div>

                          {/* Features list */}
                          <ul className="gd-tier-card-features">
                            {compareFeatures.map((feat, fIdx) => {
                              const included = (t.features || []).some(f => (typeof f === 'string' ? f : f?.text) === feat);
                              return (
                                <li key={fIdx} className={`gd-tier-feature-row ${!included ? 'gd-tier-feature-row--disabled' : ''}`}>
                                  {included ? (
                                    <CheckCircle2 size={15} color="#10B981" className="gd-tier-feat-check" />
                                  ) : (
                                    <span className="gd-tier-feat-dash">—</span>
                                  )}
                                  <span>{feat}</span>
                                </li>
                              );
                            })}
                          </ul>

                          {/* Full-width Select Tier button */}
                          <button
                            type="button"
                            className={`gd-tier-select-btn ${isSelected ? 'gd-tier-select-btn--active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTierKey(t.key);
                            }}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} />
                                <span>Selected</span>
                              </>
                            ) : (
                              <span>Select {t.label}</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Collapsible "Compare all features" Matrix Table */}
                  <div className="gd-matrix-collapse-wrap">
                    <button
                      type="button"
                      className="gd-matrix-toggle-btn"
                      onClick={() => setMatrixExpanded(!matrixExpanded)}
                    >
                      <span>{matrixExpanded ? 'Hide feature comparison matrix' : 'Compare all package features'}</span>
                      <ChevronDown size={15} className={`gd-matrix-toggle-arrow ${matrixExpanded ? 'gd-matrix-toggle-arrow--rotated' : ''}`} />
                    </button>

                    {matrixExpanded && (
                      <div className="gd-compare-table-container">
                        <table className="gd-compare-table">
                          <thead>
                            <tr>
                              <th className="gd-compare-th-fixed">Feature / Scope</th>
                              {tiers.map(t => {
                                const isSelected = t.key === activeTierKey;
                                return (
                                  <th
                                    key={t.key}
                                    className={`gd-compare-th-tier ${isSelected ? 'gd-compare-th-tier--active' : ''}`}
                                    onClick={() => setActiveTierKey(t.key)}
                                  >
                                    <div className="gd-compare-th-inner">
                                      <span className="gd-compare-tier-name">{t.label}</span>
                                      <strong className="gd-compare-tier-price">
                                        Rs. {Number(t.price).toLocaleString()}
                                      </strong>
                                      <span className="gd-compare-tier-select-indicator">
                                        {isSelected ? '✓ Selected' : 'Click to select'}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="gd-compare-td-fixed">Delivery Time</td>
                              {tiers.map(t => (
                                <td
                                  key={t.key}
                                  className={t.key === activeTierKey ? 'gd-compare-td--selected' : ''}
                                  onClick={() => setActiveTierKey(t.key)}
                                >
                                  <div className="gd-compare-cell-center">
                                    <Clock size={14} color="#10B981" />
                                    <span>{formatDeliveryTime(t.deliveryTime)}</span>
                                  </div>
                                </td>
                              ))}
                            </tr>

                            <tr>
                              <td className="gd-compare-td-fixed">Revisions</td>
                              {tiers.map(t => (
                                <td
                                  key={t.key}
                                  className={t.key === activeTierKey ? 'gd-compare-td--selected' : ''}
                                  onClick={() => setActiveTierKey(t.key)}
                                >
                                  <div className="gd-compare-cell-center">
                                    <RefreshCw size={14} color="#10B981" />
                                    <span>{t.revisions ? `${t.revisions} rounds` : 'Unlimited'}</span>
                                  </div>
                                </td>
                              ))}
                            </tr>

                            {compareFeatures.map((feat, idx) => (
                              <tr key={idx}>
                                <td className="gd-compare-td-fixed">{feat}</td>
                                {tiers.map(t => {
                                  const included = (t.features || []).some(f => (typeof f === 'string' ? f : f?.text) === feat);
                                  return (
                                    <td
                                      key={t.key}
                                      className={t.key === activeTierKey ? 'gd-compare-td--selected' : ''}
                                      onClick={() => setActiveTierKey(t.key)}
                                    >
                                      {included ? (
                                        <div className="gd-compare-check-box">
                                          <Check size={16} color="#10B981" />
                                        </div>
                                      ) : (
                                        <span className="gd-compare-dash">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              </Reveal>

              {/* 6) FREQUENTLY ASKED QUESTIONS (Accordion inside ONE white card) */}
              {Array.isArray(gig.faqs) && gig.faqs.length > 0 && (
                <Reveal>
                  <section className="gd-section-block" aria-label="Frequently asked questions">
                    <div className="gd-section-eyebrow">FAQ</div>
                    <h2 className="gd-section-h2">Frequently asked questions</h2>

                    <div className="gd-faqs-card">
                      {gig.faqs.map((faq, idx) => {
                        const isOpen = activeFaq === idx;
                        return (
                          <div key={idx} className="gd-faq-item">
                            <button
                              type="button"
                              className="gd-faq-header-btn"
                              onClick={() => setActiveFaq(isOpen ? null : idx)}
                              aria-expanded={isOpen}
                            >
                              <span className="gd-faq-question">{faq.question}</span>
                              <ChevronDown
                                size={18}
                                className={`gd-faq-chevron ${isOpen ? 'gd-faq-chevron--rotated' : ''}`}
                              />
                            </button>
                            {isOpen && (
                              <div className="gd-faq-answer-panel">
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* 7) CLIENT RATINGS & REVIEWS */}
              <Reveal>
                <section className="gd-section-block" aria-label="Client ratings and reviews">
                  <div className="gd-section-eyebrow">REVIEWS</div>
                  <h2 className="gd-section-h2">Client ratings & reviews</h2>

                  {/* Header Row: Big Average Number + Stars on Left, 5 Distribution Bars on Right */}
                  <div className="gd-reviews-header-card">
                    <div className="gd-reviews-score-col">
                      <div className="gd-reviews-big-num">
                        {rating > 0 ? rating.toFixed(1) : '5.0'}
                      </div>
                      <div className="gd-reviews-stars-wrap">
                        {[...Array(5)].map((_, s) => (
                          <Star
                            key={s}
                            size={16}
                            fill={s < Math.round(rating || 5) ? '#F59E0B' : '#E2E8F0'}
                            color="none"
                          />
                        ))}
                      </div>
                      <span className="gd-reviews-total-lbl">
                        Based on {reviewsCount} verified {reviewsCount === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>

                    <div className="gd-reviews-bars-col">
                      {ratingDistribution.map(({ star, count, pct }) => (
                        <div key={star} className="gd-dist-row">
                          <span className="gd-dist-star-lbl">{star} Stars</span>
                          <div className="gd-dist-bar-track">
                            <div className="gd-dist-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="gd-dist-count-lbl">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filter Chips Row */}
                  {reviewsCount > 0 && (
                    <div className="gd-review-filter-chips">
                      <button
                        type="button"
                        className={`gd-rf-chip ${reviewRatingFilter === 'all' ? 'gd-rf-chip--active' : ''}`}
                        onClick={() => setReviewRatingFilter('all')}
                      >
                        All ({reviewsCount})
                      </button>
                      {[5, 4, 3, 2, 1].map(star => {
                        const dist = ratingDistribution.find(d => d.star === star);
                        if (!dist || dist.count === 0) return null;
                        return (
                          <button
                            key={star}
                            type="button"
                            className={`gd-rf-chip ${reviewRatingFilter === star ? 'gd-rf-chip--active' : ''}`}
                            onClick={() => setReviewRatingFilter(star)}
                          >
                            <Star size={12} fill="#F59E0B" color="#F59E0B" />
                            <span>{star} Stars ({dist.count})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Review Cards (white, radius 18px) */}
                  {visibleReviews.length > 0 ? (
                    <div className="gd-reviews-cards-stack">
                      {visibleReviews.map((rev, rIdx) => {
                        const clientInitial = (rev.clientName || 'C').charAt(0).toUpperCase();
                        return (
                          <div key={rIdx} className="gd-review-card">
                            <div className="gd-review-card-top">
                              <div className="gd-review-author-wrap">
                                <div className="gd-review-avatar-circle">
                                  {rev.clientAvatar ? (
                                    <img src={rev.clientAvatar} alt={rev.clientName || 'Client'} />
                                  ) : (
                                    <span>{clientInitial}</span>
                                  )}
                                </div>
                                <div>
                                  <strong className="gd-review-client-name">
                                    {rev.clientName || 'Verified Buyer'}
                                  </strong>
                                  <div className="gd-review-stars-row">
                                    {[...Array(5)].map((_, s) => (
                                      <Star
                                        key={s}
                                        size={13}
                                        fill={s < (rev.rating || 5) ? '#F59E0B' : '#E2E8F0'}
                                        color="none"
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <span className="gd-review-date">
                                {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified Order'}
                              </span>
                            </div>

                            <p className="gd-review-comment-text">
                              {rev.comment || 'Outstanding service and communication. Highly recommended for future projects!'}
                            </p>

                            {/* Seller reply if exists */}
                            {rev.reply && (
                              <div className="gd-review-seller-reply">
                                <div className="gd-review-reply-header">
                                  <span className="gd-reply-author">Response from {freelancerName}:</span>
                                </div>
                                <p className="gd-reply-text">{rev.reply}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {filteredReviews.length > 5 && (
                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                          <button
                            type="button"
                            className="gd-show-more-reviews-pill"
                            onClick={() => setReviewsExpanded(!reviewsExpanded)}
                          >
                            <span>{reviewsExpanded ? 'Show fewer reviews' : `Show all ${filteredReviews.length} reviews`}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="gd-reviews-clean-empty">
                      No reviews found matching this filter.
                    </p>
                  )}
                </section>
              </Reveal>

              {/* 8) SELLER CARD (Last item in left column, white card radius 24px) */}
              <Reveal>
                <section className="gd-seller-bio-card" aria-label="About the seller">
                  <div className="gd-seller-card-top">
                    <div className="gd-seller-card-avatar-wrap">
                      <Link
                        to={`/freelancers/${freelancer._id || freelancer.userId?._id || ''}`}
                        className="gd-seller-avatar-64"
                      >
                        {freelancerAvatar ? (
                          <img src={freelancerAvatar} alt={freelancerName} />
                        ) : (
                          <span>{freelancerInitial}</span>
                        )}
                      </Link>
                    </div>

                    <div className="gd-seller-card-info">
                      <div className="gd-seller-card-name-row">
                        <Link
                          to={`/freelancers/${freelancer._id || freelancer.userId?._id || ''}`}
                          className="gd-seller-card-name"
                        >
                          {freelancerName}
                        </Link>
                        {isVerifiedSeller && (
                          <CheckCircle2 size={16} color="#10B981" />
                        )}
                      </div>
                      <span className="gd-seller-card-title">{sellerTitle}</span>
                    </div>
                  </div>

                  {/* Short Bio (3 lines clamped) */}
                  <p className="gd-seller-card-bio">
                    {freelancer.personalInfo?.bio || freelancer.bio || `${freelancerName} is a verified SkillKart creator providing milestone-backed digital deliverables with milestone escrow protection.`}
                  </p>

                  {/* 4 Plain Stat Columns with Dividers */}
                  <div className="gd-seller-card-stats-grid">
                    <div className="gd-seller-card-stat">
                      <span className="gd-sc-lbl">Location</span>
                      <strong className="gd-sc-val">{freelancer.location || freelancer.personalInfo?.location || 'Pakistan'}</strong>
                    </div>

                    <div className="gd-sc-sep" />

                    <div className="gd-seller-card-stat">
                      <span className="gd-sc-lbl">Member Since</span>
                      <strong className="gd-sc-val">
                        {freelancer.memberSince ? new Date(freelancer.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '2024'}
                      </strong>
                    </div>

                    <div className="gd-sc-sep" />

                    <div className="gd-seller-card-stat">
                      <span className="gd-sc-lbl">Orders Completed</span>
                      <strong className="gd-sc-val">{ordersCount} orders</strong>
                    </div>

                    <div className="gd-sc-sep" />

                    <div className="gd-seller-card-stat">
                      <span className="gd-sc-lbl">Rating</span>
                      <strong className="gd-sc-val">{rating > 0 ? `${rating.toFixed(1)} ★` : '5.0 ★'}</strong>
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="gd-seller-card-actions">
                    <Link
                      to={`/freelancers/${freelancer._id || freelancer.userId?._id || ''}`}
                      className="gd-sc-profile-link"
                    >
                      <span>View full profile & verification</span>
                      <ArrowRight size={14} />
                    </Link>

                    <button
                      type="button"
                      className="gd-sc-contact-btn"
                      onClick={handleContact}
                    >
                      <MessageCircle size={15} />
                      <span>Contact me</span>
                    </button>
                  </div>
                </section>
              </Reveal>
            </main>

            {/* ─── RIGHT COLUMN (4 Columns): STICKY ORDER PANEL ─── */}
            <aside className="gd-right-col" aria-label="Packages Order Panel">
              <PackagesPanel
                tiers={tiers}
                activeTierKey={activeTierKey}
                setActiveTierKey={setActiveTierKey}
                selectedTier={selectedTier}
                gig={gig}
                isOwnGig={isOwnGig}
                ordering={ordering}
                handleOrder={handleOrder}
                handleContact={handleContact}
              />
            </aside>
          </div>
        </div>
      </div>

      {/* ── MOBILE FIXED BOTTOM BAR (Never Overlaps Buddy AI, 80px right offset) ── */}
      {!isOwnGig && gig.status === 'active' && (
        <div className="gd-mobile-fixed-bottom-bar">
          <div className="gd-mobile-bottom-inner">
            <div className="gd-mobile-bottom-info">
              <span className="gd-mobile-bottom-tier-name">{selectedTier?.label} Tier</span>
              <strong className="gd-mobile-bottom-price">
                Rs. {Number(selectedTier?.price || 0).toLocaleString()}
              </strong>
            </div>
            <button
              type="button"
              className="gd-mobile-order-btn"
              onClick={() => handleOrder(selectedTier?.key)}
              disabled={!!ordering}
            >
              {ordering === selectedTier?.key ? 'Ordering...' : 'Request to order →'}
            </button>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX OVERLAY MODAL (Accessible, Focus Trapped, Esc to Close) ── */}
      {lightboxOpen && currentSlide && (
        <div className="gd-lightbox-backdrop" onClick={() => setLightboxOpen(false)}>
          <div className="gd-lightbox-modal" onClick={e => e.stopPropagation()}>
            <img src={currentSlide} alt="Expanded showcase" className="gd-lightbox-img" />

            {/* Counter pill */}
            <div className="gd-lightbox-counter-pill">
              {activeImgIdx + 1} / {slides.length}
            </div>

            {/* Prev / Next buttons */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  className="gd-lightbox-btn gd-lightbox-btn--prev"
                  onClick={() => setActiveImgIdx(prev => (prev - 1 + slides.length) % slides.length)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  className="gd-lightbox-btn gd-lightbox-btn--next"
                  onClick={() => setActiveImgIdx(prev => (prev + 1) % slides.length)}
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Close button */}
            <button
              type="button"
              className="gd-lightbox-close-btn"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close photo overlay"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ── GIG ORDER CHECKOUT MODAL ── */}
      <GigOrderModal
        open={!!orderConfirmTier}
        mode="package"
        summary={(() => {
          const t = gig.pricing?.[orderConfirmTier] || {};
          return {
            title: gig.title,
            label: `${TIER_LABELS[orderConfirmTier] || ''} package`,
            price: t.price,
            deliveryDays: t.deliveryTime,
            revisions: t.revisions,
          };
        })()}
        submitting={!!ordering}
        onSubmit={proceedWithOrder}
        onContact={() => { setOrderConfirmTier(null); handleContact(); }}
        onClose={() => setOrderConfirmTier(null)}
      />

      <Footer />
    </>
  );
}

/**
 * PackagesPanel Component — Sticky in desktop right column, inline on mobile
 */
function PackagesPanel({
  tiers,
  activeTierKey,
  setActiveTierKey,
  selectedTier,
  gig,
  isOwnGig,
  ordering,
  handleOrder,
  handleContact,
}) {
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const allFeatures = selectedTier?.features || [];
  const visibleFeatures = featuresExpanded ? allFeatures : allFeatures.slice(0, 6);

  return (
    <div className="gd-sticky-panel-container">
      <div className="gd-packages-sticky-card">
        {/* Segmented Pill Tabs: Basic / Standard / Premium */}
        {tiers.length > 1 && (
          <div className="gd-tier-segmented-track">
            {tiers.map(t => {
              const isSelected = t.key === activeTierKey;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`gd-tier-seg-tab ${isSelected ? 'gd-tier-seg-tab--active' : ''}`}
                  onClick={() => setActiveTierKey(t.key)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Tier Body */}
        <div className="gd-packages-card-body">
          {/* Price Row: 36px, 800 navy + small "Fixed price" chip */}
          <div className="gd-tier-price-row">
            <div className="gd-tier-price-number">
              Rs. {Number(selectedTier?.price || 0).toLocaleString()}
            </div>
            <span className="gd-tier-milestone-chip">
              Fixed Price
            </span>
          </div>

          {/* Tier Title & Description */}
          <div className="gd-tier-title-desc">
            <h3 className="gd-tier-heading">
              {selectedTier?.title || `${selectedTier?.label || ''} Plan`}
            </h3>
            <p className="gd-tier-paragraph">
              {selectedTier?.description || gig.shortDescription || 'Complete deliverables package.'}
            </p>
          </div>

          {/* Delivery & Revisions Chips with Icons */}
          <div className="gd-tier-chips-row">
            <span className="gd-tier-meta-chip">
              <Clock size={13} color="#10B981" />
              <span><strong>{formatDeliveryTime(selectedTier?.deliveryTime)}</strong> delivery</span>
            </span>
            <span className="gd-tier-meta-chip">
              <RefreshCw size={13} color="#10B981" />
              <span><strong>{selectedTier?.revisions ? `${selectedTier.revisions}` : 'Unlimited'}</strong> revisions</span>
            </span>
          </div>

          {/* Included Features Checklist (green checks, max 6, "+N more") */}
          <ul className="gd-tier-features-list">
            {visibleFeatures.map((f, idx) => (
              <li key={idx} className="gd-tier-feature-item">
                <CheckCircle2 size={15} color="#10B981" className="gd-tier-check-icon" />
                <span>{typeof f === 'string' ? f : f?.text || ''}</span>
              </li>
            ))}
            {allFeatures.length > 6 && (
              <li className="gd-tier-feature-toggle-item">
                <button
                  type="button"
                  className="gd-tier-more-features-btn"
                  onClick={() => setFeaturesExpanded(!featuresExpanded)}
                >
                  {featuresExpanded ? 'Show fewer features' : `+${allFeatures.length - 6} more included features`}
                </button>
              </li>
            )}
            {allFeatures.length === 0 && (
              <>
                <li className="gd-tier-feature-item">
                  <CheckCircle2 size={15} color="#10B981" className="gd-tier-check-icon" />
                  <span>Complete Deliverables Package</span>
                </li>
                <li className="gd-tier-feature-item">
                  <CheckCircle2 size={15} color="#10B981" className="gd-tier-check-icon" />
                  <span>Full Commercial License</span>
                </li>
              </>
            )}
          </ul>

          {/* Primary Action Button: "Request to order" */}
          {!isOwnGig && gig.status === 'active' && (
            <button
              type="button"
              className="gd-request-order-cta-btn"
              onClick={() => handleOrder(selectedTier?.key)}
              disabled={!!ordering}
            >
              {ordering === selectedTier?.key ? 'Processing Order...' : 'Request to order'}
            </button>
          )}

          {!isOwnGig && gig.status !== 'active' && (
            <div className="gd-gig-paused-callout">
              This service gig is currently not accepting new orders.
            </div>
          )}

          {/* Escrow Trust Box */}
          <div className="gd-escrow-trust-note">
            <ShieldCheck size={18} color="#10B981" className="gd-escrow-shield" />
            <span>
              You'll pay 50% now to start; the rest is released when you accept the delivery.
            </span>
          </div>
        </div>
      </div>

      {/* Slim card below panel: "Need something custom?" with "Send a message" link */}
      <div className="gd-custom-order-card">
        <div className="gd-custom-order-left">
          <MessageCircle size={16} color="#10B981" />
          <span>Need something custom?</span>
        </div>
        <button
          type="button"
          className="gd-custom-order-link"
          onClick={handleContact}
        >
          Send a message →
        </button>
      </div>
    </div>
  );
}
