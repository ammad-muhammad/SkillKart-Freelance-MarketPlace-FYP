import Loader from '../../../Components/common/Loader/Loader';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gigsAPI } from '../../../api/gigs';
import { messagesAPI } from '../../../api/messages';
import { useAuth } from '../../../hooks/useAuth';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import {
  ChevronLeft, ChevronRight, Star, ShoppingBag, Clock, RefreshCw,
  CheckCircle2, Tag, MessageCircle, User, Maximize2, X, ExternalLink
} from 'lucide-react';
import { safeToast as toast } from '../../../utils/safeToast';
import GigOrderModal from '../../../Components/common/GigOrderModal/GigOrderModal';
import { payGigOrderDeposit, apiErrorMessage, formatDeliveryTime } from '../../../utils/gigOrderCheckout';
import BackButton from '../../../Components/common/BackButton/BackButton';
import ReportButton from '../../../Components/common/ReportButton/ReportButton';
import { isMobileApp } from '../../../utils/platform';
import './GigDetail.css';

const TIER_ORDER = ['basic', 'standard', 'premium'];
const TIER_LABELS = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

function GigGallery({ title, media }) {
  const slides = useMemo(() => {
    const list = [];
    if (media?.banner) list.push(media.banner);
    if (Array.isArray(media?.images)) {
      media.images.forEach((img) => {
        if (img && typeof img === 'string' && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    return list;
  }, [media]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (activeIdx >= slides.length) {
      setActiveIdx(0);
    }
  }, [slides.length, activeIdx]);

  const prevSlide = useCallback(() => {
    setActiveIdx((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    setActiveIdx((i) => (i + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowLeft') prevSlide();
      else if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, prevSlide, nextSlide]);

  if (slides.length === 0) {
    return (
      <div className="gd-card gd-banner">
        <div className="gd-banner__fallback">
          <Tag size={40} />
          <span>No preview available</span>
        </div>
      </div>
    );
  }

  const currentImage = slides[activeIdx] || slides[0];

  return (
    <div className="gd-card gd-gallery">
      <div className="gd-gallery__main">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={currentImage}
            alt={`${title} - Preview ${activeIdx + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="gd-gallery__main-img"
            onClick={() => setLightboxOpen(true)}
          />
        </AnimatePresence>

        <div className="gd-gallery__top-bar">
          <span className="gd-gallery__counter">
            {activeIdx === 0 && media?.banner === currentImage ? 'Cover Banner' : `Portfolio Sample ${activeIdx + 1} of ${slides.length}`}
          </span>
          <button
            type="button"
            className="gd-gallery__zoom-btn"
            onClick={() => setLightboxOpen(true)}
            title="View Fullscreen"
          >
            <Maximize2 size={14} />
            <span>Expand</span>
          </button>
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="gd-gallery__nav-btn gd-gallery__nav-btn--prev"
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              aria-label="Previous sample"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="gd-gallery__nav-btn gd-gallery__nav-btn--next"
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              aria-label="Next sample"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="gd-gallery__thumbs-wrap">
          <div className="gd-gallery__thumbs">
            {slides.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`gd-gallery__thumb ${idx === activeIdx ? 'gd-gallery__thumb--active' : ''}`}
                onClick={() => setActiveIdx(idx)}
                aria-label={`View sample ${idx + 1}`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} loading="lazy" />
                {idx === 0 && media?.banner === img && (
                  <span className="gd-gallery__thumb-tag">Cover</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="gd-lightbox" onClick={() => setLightboxOpen(false)}>
          <button
            type="button"
            className="gd-lightbox__close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close fullscreen preview"
          >
            <X size={24} />
          </button>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                className="gd-lightbox__nav gd-lightbox__nav--prev"
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                aria-label="Previous image"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                type="button"
                className="gd-lightbox__nav gd-lightbox__nav--next"
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                aria-label="Next image"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div className="gd-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <img
              src={currentImage}
              alt={`${title} - Fullscreen preview`}
              className="gd-lightbox__img"
            />

            <div className="gd-lightbox__caption">
              {title} • Sample {activeIdx + 1} of {slides.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GigDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ordering, setOrdering] = useState(null); // tier key being ordered
  const [orderConfirmTier, setOrderConfirmTier] = useState(null); // tier key whose requirements modal is open
  const [activeTierKey, setActiveTierKey] = useState('basic');

  const tiers = useMemo(() => {
    if (!gig?.pricing) return [];
    return TIER_ORDER
      .map((key) => ({ key, ...(gig.pricing[key] || {}) }))
      .filter((tier) => tier.price != null && tier.price !== '');
  }, [gig?.pricing]);

  useEffect(() => {
    if (tiers.length > 0 && !tiers.some((t) => t.key === activeTierKey)) {
      setActiveTierKey(tiers[0].key);
    }
  }, [tiers, activeTierKey]);

  const selectedTier = useMemo(() => {
    return tiers.find((t) => t.key === activeTierKey) || tiers[0] || null;
  }, [tiers, activeTierKey]);

  const compareFeatures = useMemo(() => {
    const list = [];
    tiers.forEach((t) => {
      if (Array.isArray(t.features)) {
        t.features.forEach((f) => {
          if (f && typeof f === 'string' && !list.includes(f.trim())) {
            list.push(f.trim());
          }
        });
      }
    });
    if (list.length === 0) {
      return ['Responsive Design', 'Source Code', 'Design Customization', 'Content Upload'];
    }
    return list;
  }, [tiers]);

  useEffect(() => {
    let active = true;

    const fetchGig = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await gigsAPI.getGig(id);
        if (active) setGig(res.data.data.gig);
      } catch (error) {
        console.error('Failed to fetch gig:', error);
        if (active) {
          setNotFound(true);
          toast.error('Gig not found or error loading details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchGig();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    document.title = gig?.title ? `${gig.title} – SkillKart` : 'Gig Details – SkillKart';
  }, [gig?.title]);

  const handleContact = async () => {
    if (!user) {
      toast.info('Please log in to contact this freelancer.');
      navigate('/login');
      return;
    }
    const freelancerId = gig?.freelancerId?._id;
    // Actually start a conversation with the gig owner (not just navigate).
    if (user.role === 'client' && freelancerId) {
      try {
        await messagesAPI.startConversation(freelancerId, `Hi! I'm interested in your gig "${gig?.title || ''}".`);
        navigate('/client/messages');
        return;
      } catch {
        /* fall through to the messages page */
      }
    }
    navigate(user.role === 'freelancer' ? '/freelancer/messages' : '/client/messages');
  };

  const handleOrder = (tier) => {
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
    setOrderConfirmTier(tier);
  };

  // Requirements are collected by GigOrderModal first (mandatory) — the order
  // is created in 'pending_payment' carrying them, then we go straight to the
  // 50% deposit (wallet, or Stripe checkout). It only reaches the freelancer
  // once that deposit is paid.
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
      toast.error('Could not create the order. Please try again.');
      setOrdering(null);
      return;
    }

    const pay = await payGigOrderDeposit(jobId);
    if (pay.outcome === 'redirect') return; // navigating to checkout
    setOrderConfirmTier(null);
    setOrdering(null);
    if (pay.outcome === 'wallet') {
      toast.success('Order placed and 50% deposit paid from your wallet! The freelancer has your requirements. 🚀');
    } else {
      toast.warning(`Your order is saved, but the deposit wasn't paid: ${pay.message} You can pay or cancel it from My Projects.`);
    }
    navigate('/client/projects');
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <Loader text="Loading gig details..." fullScreen={true} />
        <Footer />
      </>
    );
  }

  if (notFound || !gig) {
    return (
      <>
        <Navbar />
        <div className="gd-state">
          <p>This gig could not be found.</p>
          {/* /categories isn't registered at all on the mobile build (see
              AppRoutes.jsx) — hidden there rather than left as a dead link. */}
          {!isMobileApp() && (
            <Link to="/categories" className="gd-state__link">Browse categories</Link>
          )}
        </div>
        <Footer />
      </>
    );
  }

  const freelancer = gig.freelancerId || {};
  const freelancerName = `${freelancer.firstName || ''} ${freelancer.lastName || ''}`.trim() || 'Freelancer';
  const freelancerInitial = (freelancer.firstName || freelancer.lastName || 'F').charAt(0).toUpperCase();
  const bannerSrc = gig.media?.banner || gig.media?.images?.[0] || null;
  // Hide ordering when the logged-in freelancer is viewing their OWN gig.
  const isOwnGig = user && freelancer._id && String(user._id || user.id) === String(freelancer._id);

  const stats = gig.stats || {};

  return (
    <>
      <Navbar />
      <div className="gd-page">
        <div className="container">
          {isMobileApp() ? (
            <BackButton className="gd-back-btn" />
          ) : (
            <Link to="/browse-projects" className="gd-back">
              <ChevronLeft size={18} /> Back to Marketplace
            </Link>
          )}

          <div className="gd-layout">
            <main className="gd-main">
              <div className="gd-card gd-header">
                <div className="gd-header__top">
                  {gig.category && <span className="gd-category">{gig.category}</span>}
                  {gig.subcategory && <span className="gd-subcategory">{gig.subcategory}</span>}
                </div>
                <h1 className="gd-title">{gig.title}</h1>

                <div className="gd-header-meta">
                  {freelancer._id ? (
                    <div className="gd-seller-meta-group">
                      <Link to={`/freelancers/${freelancer._id}`} className="gd-seller" title={`View ${freelancerName}'s profile`}>
                        <div className="gd-seller__avatar">
                          {freelancer.profilePicture ? (
                            <img src={freelancer.profilePicture} alt={freelancerName} />
                          ) : (
                            <span>{freelancerInitial}</span>
                          )}
                        </div>
                        <span className="gd-seller__name">{freelancerName}</span>
                      </Link>
                      <Link to={`/freelancers/${freelancer._id}`} className="gd-seller-view-link">
                        View Profile <ExternalLink size={12} />
                      </Link>
                    </div>
                  ) : (
                    <div className="gd-seller">
                      <div className="gd-seller__avatar"><User size={18} /></div>
                      <span className="gd-seller__name">{freelancerName}</span>
                    </div>
                  )}

                  <span className="gd-meta-divider">•</span>

                  <div className="gd-header-stat">
                    <Star size={15} className="gd-star-icon" />
                    <strong>{Number(stats.rating || freelancer.rating || 0).toFixed(1)}</strong>
                    <span className="gd-meta-sub">({stats.reviewsCount || 0} reviews)</span>
                  </div>

                  <span className="gd-meta-divider">•</span>

                  <div className="gd-header-stat">
                    <ShoppingBag size={15} className="gd-orders-icon" />
                    <span className="gd-meta-sub"><strong>{stats.orders || 0}</strong> orders completed</span>
                  </div>
                </div>
                {!isOwnGig && gig._id && (
                  <div style={{ marginTop: 14 }}>
                    <ReportButton itemType="gig" itemId={gig._id} label="Report this gig" />
                  </div>
                )}
              </div>

              <GigGallery title={gig.title} media={gig.media} />

              <div className="gd-card gd-body">
                {gig.shortDescription && (
                  <p className="gd-short">{gig.shortDescription}</p>
                )}

                {gig.fullDescription && (
                  <>
                    <h2 className="gd-section-title">About This Gig</h2>
                    <div className="gd-description">{gig.fullDescription}</div>
                  </>
                )}

                {gig.skills?.length > 0 && (
                  <>
                    <h2 className="gd-section-title">Skills</h2>
                    <div className="gd-tags">
                      {gig.skills.map((skill) => (
                        <span key={skill} className="gd-tag">{skill}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* Compare Packages Table (Fiverr Style) */}
                {tiers.length > 0 && (
                  <div className="gd-compare-section">
                    <h2 className="gd-section-title">Compare packages</h2>
                    <div className="gd-compare-table-wrap">
                      <table className="gd-compare-table">
                        <thead>
                          <tr>
                            <th className="gd-col-label">Package</th>
                            {tiers.map((t) => (
                              <th key={t.key} className="gd-col-tier">
                                <div className="gd-th-price">Rs. {t.price}</div>
                                <div className="gd-th-tier-name">{TIER_LABELS[t.key]}</div>
                                <div className="gd-th-title">{t.title || `${TIER_LABELS[t.key]} Tier`}</div>
                                <div className="gd-th-desc">{t.description || gig.shortDescription || 'Standard package delivery'}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compareFeatures.map((feat, i) => (
                            <tr key={i}>
                              <td className="gd-td-label">{feat}</td>
                              {tiers.map((t) => {
                                const has = Array.isArray(t.features) && t.features.length > 0
                                  ? t.features.some((f) => f.toLowerCase() === feat.toLowerCase())
                                  : true;
                                return (
                                  <td key={t.key} className="gd-td-val">
                                    {has ? (
                                      <CheckCircle2 size={18} className="gd-check-active" />
                                    ) : (
                                      <span className="gd-dash-inactive">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}

                          {/* Delivery Row */}
                          <tr>
                            <td className="gd-td-label">Delivery Time</td>
                            {tiers.map((t) => (
                              <td key={t.key} className="gd-td-val gd-meta-text">
                                <Clock size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                {formatDeliveryTime(t.deliveryTime) || '—'}
                              </td>
                            ))}
                          </tr>

                          {/* Revisions Row */}
                          <tr>
                            <td className="gd-td-label">Revisions</td>
                            {tiers.map((t) => (
                              <td key={t.key} className="gd-td-val gd-meta-text">
                                <RefreshCw size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                {t.revisions ? `${t.revisions}` : 'Unlimited'}
                              </td>
                            ))}
                          </tr>

                          {/* Order Action Row */}
                          <tr className="gd-tr-action">
                            <td className="gd-td-label">Total</td>
                            {tiers.map((t) => (
                              <td key={t.key} className="gd-td-val">
                                <div className="gd-td-total-price">Rs. {t.price}</div>
                                {!isOwnGig && gig.status === 'active' && (
                                  <button
                                    className="gd-compare-btn"
                                    onClick={() => handleOrder(t.key)}
                                    disabled={!!ordering}
                                  >
                                    {ordering === t.key ? 'Starting…' : 'Select'}
                                  </button>
                                )}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {gig.faqs?.length > 0 && (
                  <>
                    <h2 className="gd-section-title">Frequently Asked Questions</h2>
                    <div className="gd-faqs">
                      {gig.faqs.map((faq, i) => (
                        <div key={i} className="gd-faq">
                          <div className="gd-faq__q">{faq.question}</div>
                          <div className="gd-faq__a">{faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* About the Seller Section */}
                {freelancer._id && (
                  <div className="gd-about-seller">
                    <h2 className="gd-section-title">About the Seller</h2>
                    <div className="gd-about-seller__card">
                      <div className="gd-about-seller__top">
                        <Link to={`/freelancers/${freelancer._id}`} className="gd-about-seller__avatar">
                          {freelancer.profilePicture ? (
                            <img src={freelancer.profilePicture} alt={freelancerName} />
                          ) : (
                            <span>{freelancerInitial}</span>
                          )}
                        </Link>
                        <div className="gd-about-seller__info">
                          <div className="gd-about-seller__name-row">
                            <Link to={`/freelancers/${freelancer._id}`} className="gd-about-seller__name">
                              {freelancerName}
                            </Link>
                            <Link to={`/freelancers/${freelancer._id}`} className="gd-about-seller__link-btn">
                              <User size={14} /> View Profile
                            </Link>
                          </div>
                          {freelancer.title && (
                            <p className="gd-about-seller__title">{freelancer.title}</p>
                          )}
                          <div className="gd-about-seller__rating-row">
                            <div className="gd-about-seller__stars">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={14}
                                  fill={s <= Math.round(Number(freelancer.rating || stats.rating || 0)) ? '#f59e0b' : '#e2e8f0'}
                                  color={s <= Math.round(Number(freelancer.rating || stats.rating || 0)) ? '#f59e0b' : '#cbd5e1'}
                                />
                              ))}
                            </div>
                            <strong>{Number(freelancer.rating || stats.rating || 0).toFixed(1)}</strong>
                            <span className="gd-meta-sub">({stats.reviewsCount || 0} reviews)</span>
                            {freelancer.completedProjects > 0 && (
                              <>
                                <span className="gd-meta-divider">|</span>
                                <span className="gd-meta-sub">
                                  <strong>{freelancer.completedProjects}</strong> projects completed
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {freelancer.bio && (
                        <div className="gd-about-seller__bio">
                          <p>{freelancer.bio}</p>
                        </div>
                      )}

                      <div className="gd-about-seller__actions">
                        <Link to={`/freelancers/${freelancer._id}`} className="gd-about-seller__profile-btn">
                          <User size={15} /> Visit {freelancerName}&apos;s Profile & Portfolio
                        </Link>
                        <button type="button" className="gd-about-seller__contact-btn" onClick={handleContact}>
                          <MessageCircle size={15} /> Contact Seller
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </main>

            <aside className="gd-sidebar">
              {tiers.length > 0 && selectedTier && (
                <div className="gd-sidebar__card gd-pkg-card">
                  {/* Fiverr-style Tabs */}
                  <div className="gd-pkg-tabs">
                    {tiers.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={`gd-pkg-tab ${t.key === selectedTier.key ? 'active' : ''}`}
                        onClick={() => setActiveTierKey(t.key)}
                      >
                        {TIER_LABELS[t.key]}
                      </button>
                    ))}
                  </div>

                  <div className="gd-pkg-content">
                    {/* Price */}
                    <div className="gd-pkg-price-row">
                      <span className="gd-pkg-price">Rs. {selectedTier.price}</span>
                    </div>

                    {/* Title & Description */}
                    <div className="gd-pkg-desc-block">
                      <strong className="gd-pkg-title">
                        {selectedTier.title || `${TIER_LABELS[selectedTier.key]} Package`}
                      </strong>
                      <span className="gd-pkg-desc">
                        {' '}{selectedTier.description || gig.shortDescription || 'Includes delivery as described in gig.'}
                      </span>
                    </div>

                    {/* Delivery & Revisions pills */}
                    <div className="gd-pkg-meta">
                      {selectedTier.deliveryTime != null && (
                        <span className="gd-pkg-meta-item">
                          <Clock size={15} /> {formatDeliveryTime(selectedTier.deliveryTime)}
                        </span>
                      )}
                      {selectedTier.revisions != null && (
                        <span className="gd-pkg-meta-item">
                          <RefreshCw size={15} /> {selectedTier.revisions ? `${selectedTier.revisions} Revision${Number(selectedTier.revisions) === 1 ? '' : 's'}` : 'Unlimited'}
                        </span>
                      )}
                    </div>

                    {/* Checklist of features */}
                    <ul className="gd-pkg-features">
                      {selectedTier.features?.length > 0 ? (
                        selectedTier.features.map((feat, i) => (
                          <li key={i}>
                            <CheckCircle2 size={16} className="gd-pkg-check" />
                            <span>{feat}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li><CheckCircle2 size={16} className="gd-pkg-check" /> <span>Quality Delivery</span></li>
                          <li><CheckCircle2 size={16} className="gd-pkg-check" /> <span>Source Files Included</span></li>
                          <li><CheckCircle2 size={16} className="gd-pkg-check" /> <span>Responsive Design</span></li>
                        </>
                      )}
                    </ul>

                    {/* Primary Order Action */}
                    {!isOwnGig && gig.status === 'active' && (
                      <button
                        className="gd-pkg-order-btn"
                        onClick={() => handleOrder(selectedTier.key)}
                        disabled={!!ordering}
                      >
                        {ordering === selectedTier.key ? 'Starting…' : 'Request to order'}
                      </button>
                    )}

                    {!isOwnGig && gig.status !== 'active' && (
                      <p className="gd-pricing__note" style={{ margin: '0 0 1rem 0', color: '#b45309' }}>
                        This gig is currently paused and not accepting orders.
                      </p>
                    )}

                    {/* Secondary Contact button */}
                    <button className="gd-pkg-contact-btn" onClick={handleContact}>
                      <MessageCircle size={16} /> Contact me
                    </button>

                    <p className="gd-pkg-deposit-note">
                      You’ll pay 50% now to start; the rest is released when you accept the delivery.
                    </p>
                  </div>
                </div>
              )}

              {freelancer._id && (
                <div className="gd-sidebar-seller-card">
                  <div className="gd-sidebar-seller-card__header">
                    <span className="gd-sidebar-seller-card__eyebrow">Gig Creator</span>
                  </div>
                  <div className="gd-sidebar-seller-card__profile">
                    <Link to={`/freelancers/${freelancer._id}`} className="gd-sidebar-seller-card__avatar">
                      {freelancer.profilePicture ? (
                        <img src={freelancer.profilePicture} alt={freelancerName} />
                      ) : (
                        <span>{freelancerInitial}</span>
                      )}
                    </Link>
                    <div className="gd-sidebar-seller-card__info">
                      <Link to={`/freelancers/${freelancer._id}`} className="gd-sidebar-seller-card__name">
                        {freelancerName}
                      </Link>
                      {freelancer.title && (
                        <span className="gd-sidebar-seller-card__title">{freelancer.title}</span>
                      )}
                      <div className="gd-sidebar-seller-card__rating">
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        <strong>{Number(freelancer.rating || stats.rating || 0).toFixed(1)}</strong>
                        <span>({stats.reviewsCount || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <Link to={`/freelancers/${freelancer._id}`} className="gd-sidebar-seller-card__btn">
                    <User size={15} /> View Seller Profile
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

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
