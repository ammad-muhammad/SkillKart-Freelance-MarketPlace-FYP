import Loader from '../../../Components/common/Loader/Loader';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gigsAPI } from '../../../api/gigs';
import { messagesAPI } from '../../../api/messages';
import { useAuth } from '../../../hooks/useAuth';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import {
  ChevronLeft, Star, ShoppingBag, Clock, RefreshCw,
  CheckCircle2, Tag, MessageCircle, User
} from 'lucide-react';
import { safeToast as toast } from '../../../utils/safeToast';
import GigOrderModal from '../../../Components/common/GigOrderModal/GigOrderModal';
import { payGigOrderDeposit, apiErrorMessage, formatDeliveryTime } from '../../../utils/gigOrderCheckout';
import BackButton from '../../../Components/common/BackButton/BackButton';
import { isMobileApp } from '../../../utils/platform';
import './GigDetail.css';

const TIER_ORDER = ['basic', 'standard', 'premium'];
const TIER_LABELS = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

export default function GigDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ordering, setOrdering] = useState(null); // tier key being ordered
  const [orderConfirmTier, setOrderConfirmTier] = useState(null); // tier key whose requirements modal is open

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

  const tiers = TIER_ORDER
    .map((key) => ({ key, ...(gig.pricing?.[key] || {}) }))
    .filter((tier) => tier.price != null && tier.price !== '');

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

                {freelancer._id ? (
                  <Link to={`/freelancers/${freelancer._id}`} className="gd-seller">
                    <div className="gd-seller__avatar">
                      {freelancer.profilePicture ? (
                        <img src={freelancer.profilePicture} alt={freelancerName} />
                      ) : (
                        <span>{freelancerInitial}</span>
                      )}
                    </div>
                    <div className="gd-seller__info">
                      <span className="gd-seller__name">{freelancerName}</span>
                      <span className="gd-seller__rating">
                        <Star size={14} /> {Number(freelancer.rating || 0).toFixed(1)}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="gd-seller">
                    <div className="gd-seller__avatar"><User size={20} /></div>
                    <div className="gd-seller__info">
                      <span className="gd-seller__name">{freelancerName}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="gd-card gd-banner">
                {bannerSrc ? (
                  <img src={bannerSrc} alt={gig.title} />
                ) : (
                  <div className="gd-banner__fallback">
                    <Tag size={40} />
                    <span>No preview available</span>
                  </div>
                )}
              </div>

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
              </div>
            </main>

            <aside className="gd-sidebar">
              {tiers.length > 0 && (
                <div className="gd-sidebar__card gd-pricing">
                  <h3 className="gd-sidebar__title">Packages</h3>
                  {!isOwnGig && (
                    <div style={{ background: '#f0f9ff', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', borderLeft: '3px solid #0ea5e9' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#0369a1', lineHeight: '1.4' }}>
                        <strong>Tip:</strong> It's highly recommended to <button style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 'bold', cursor: 'pointer', padding: 0, textDecoration: 'underline' }} onClick={handleContact}>contact the freelancer</button> to discuss your requirements before placing an order — they can send you a custom offer if no package fits.
                      </p>
                    </div>
                  )}
                  {tiers.map((tier) => (
                    <div key={tier.key} className="gd-tier">
                      <div className="gd-tier__head">
                        <span className="gd-tier__name">{TIER_LABELS[tier.key]}</span>
                        <span className="gd-tier__price">Rs. {tier.price}</span>
                      </div>
                      <div className="gd-tier__meta">
                        {tier.deliveryTime != null && (
                          <span><Clock size={14} /> {formatDeliveryTime(tier.deliveryTime)}</span>
                        )}
                        {tier.revisions != null && (
                          <span><RefreshCw size={14} /> {tier.revisions} revision{Number(tier.revisions) === 1 ? '' : 's'}</span>
                        )}
                      </div>
                      {tier.features?.length > 0 && (
                        <ul className="gd-tier__features">
                          {tier.features.map((feature, i) => (
                            <li key={i}><CheckCircle2 size={14} /> {feature}</li>
                          ))}
                        </ul>
                      )}
                      {!isOwnGig && gig.status === 'active' && (
                        <button
                          className="gd-tier__order"
                          onClick={() => handleOrder(tier.key)}
                          disabled={!!ordering}
                        >
                          {ordering === tier.key ? 'Starting…' : `Order · Rs. ${tier.price}`}
                        </button>
                      )}
                      {!isOwnGig && gig.status !== 'active' && (
                        <p className="gd-pricing__note" style={{ margin: 0, color: '#b45309' }}>
                          This gig is currently paused and not accepting orders.
                        </p>
                      )}
                    </div>
                  ))}
                  <p className="gd-pricing__note">You’ll pay 50% now to start; the rest is released when you accept the delivery.</p>
                </div>
              )}

              <div className="gd-sidebar__card gd-cta">
                <button className="gd-cta__btn" onClick={handleContact}>
                  <MessageCircle size={18} /> Contact Freelancer
                </button>
                {freelancer._id && (
                  <Link to={`/freelancers/${freelancer._id}`} className="gd-cta__secondary">
                    View Profile
                  </Link>
                )}
              </div>

              <div className="gd-sidebar__card gd-stats">
                <h3 className="gd-sidebar__title">Gig Stats</h3>
                <div className="gd-stats__grid">
                  <div className="gd-stat">
                    <span><Star size={16} /> {Number(stats.rating || 0).toFixed(1)}</span>
                    <label>Rating</label>
                  </div>
                  <div className="gd-stat">
                    <span>{stats.reviewsCount || 0}</span>
                    <label>Reviews</label>
                  </div>
                  <div className="gd-stat">
                    <span><ShoppingBag size={16} /> {stats.orders || 0}</span>
                    <label>Orders</label>
                  </div>
                </div>
              </div>
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
