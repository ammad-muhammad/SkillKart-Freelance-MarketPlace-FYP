import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gigsAPI } from '../../../api/gigs';
import { useAuth } from '../../../hooks/useAuth';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import {
  ChevronLeft, Star, ShoppingBag, Clock, RefreshCw,
  CheckCircle2, Tag, MessageCircle, User
} from 'lucide-react';
import { toast } from 'react-toastify';
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

  const handleContact = () => {
    if (!user) {
      toast.info('Please log in to contact this freelancer.');
      navigate('/login');
      return;
    }
    navigate(user.role === 'freelancer' ? '/freelancer/messages' : '/client/messages');
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="gd-state">Loading gig details...</div>
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
          <Link to="/categories" className="gd-state__link">Browse categories</Link>
        </div>
        <Footer />
      </>
    );
  }

  const freelancer = gig.freelancerId || {};
  const freelancerName = `${freelancer.firstName || ''} ${freelancer.lastName || ''}`.trim() || 'Freelancer';
  const freelancerInitial = (freelancer.firstName || freelancer.lastName || 'F').charAt(0).toUpperCase();
  const bannerSrc = gig.media?.banner || gig.media?.images?.[0] || null;

  const tiers = TIER_ORDER
    .map((key) => ({ key, ...(gig.pricing?.[key] || {}) }))
    .filter((tier) => tier.price != null && tier.price !== '');

  const stats = gig.stats || {};

  return (
    <>
      <Navbar />
      <div className="gd-page">
        <div className="container">
          <Link to="/browse-projects" className="gd-back">
            <ChevronLeft size={18} /> Back to Marketplace
          </Link>

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
                  {tiers.map((tier) => (
                    <div key={tier.key} className="gd-tier">
                      <div className="gd-tier__head">
                        <span className="gd-tier__name">{TIER_LABELS[tier.key]}</span>
                        <span className="gd-tier__price">${tier.price}</span>
                      </div>
                      <div className="gd-tier__meta">
                        {tier.deliveryTime != null && (
                          <span><Clock size={14} /> {tier.deliveryTime} day{Number(tier.deliveryTime) === 1 ? '' : 's'}</span>
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
                    </div>
                  ))}
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
      <Footer />
    </>
  );
}
