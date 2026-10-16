import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Star, Clock, Briefcase, Award, GraduationCap,
  ExternalLink, MessageSquare, Bookmark, CheckCircle2,
  Github, Linkedin, Globe, Twitter, AlertCircle, Search,
  Calendar, ChevronRight, BookmarkCheck, FileEdit,
  Share2, ArrowRight, ShieldCheck, Check, Zap, ShoppingBag,
  Send, Copy, Shield, Layers, HelpCircle, UserCheck, Sparkles
} from 'lucide-react';

import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import Loader from '../../../Components/common/Loader/Loader';
import ReviewSection from '../../../Components/common/ReviewSection/ReviewSection';
import Reveal from '../../freelancer/components/Reveal';
import BackButton from '../../../Components/common/BackButton/BackButton';
import { isMobileApp } from '../../../utils/platform';
import { freelancersAPI } from '../../../api/freelancers';
import { messagesAPI } from '../../../api/messages';
import { gigsAPI } from '../../../api/gigs';
import { useAuth } from '../../../hooks/useAuth';
import { useClient } from '../../../context/ClientContext';
import { openExternal } from '../../../utils/externalLink';
import { safeToast as toast } from '../../../utils/safeToast';
import './PublicFreelancerProfile.css';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const availabilityLabel = (a) => ({
  'full-time': 'Available Full-time',
  'part-time': 'Available Part-time',
  'contract': 'Open to Contracts',
  'not-available': 'Not Available',
}[a] || 'Available for Hire');

export default function PublicFreelancerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isClient } = useAuth();
  const { savedFreelancers = [], toggleSavedFreelancer } = useClient() || {};

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fast inquiry state
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    document.title = 'Freelancer Profile — SkillKart';

    Promise.all([
      freelancersAPI.getById(id),
      gigsAPI.listGigs({ freelancerId: id, status: 'active' }).catch(() => ({ data: { data: [] } }))
    ])
      .then(([resProfile, resGigs]) => {
        if (!active) return;
        const p = resProfile.data?.data?.profile;
        const r = resProfile.data?.data?.reviews || [];
        const g = resGigs.data?.data || [];
        if (!p) { setError('notfound'); return; }
        setProfile(p);
        setReviews(r);
        setGigs(g);
        const u = p.userId || {};
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        if (name) document.title = `${name} — SkillKart`;
        if (user) {
          setInquiryName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.status === 404 ? 'notfound' : (err.response?.data?.message || 'Failed to load profile'));
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id, user]);

  const u = profile?.userId || {};
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Freelancer';
  const targetId = u._id || id;
  const isSaved = savedFreelancers.some((f) => f.id === targetId || f._id === targetId);
  const isOwner = user && (user._id === u._id || user._id === id);

  const handleSave = () => {
    toggleSavedFreelancer({
      id: targetId,
      _id: targetId,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      profilePicture: u.profilePicture,
      rating: profile?.rating,
      freelancerProfile: profile,
    });
    toast?.(isSaved ? 'Removed from saved freelancers' : 'Freelancer saved to your list', 'info');
  };

  const handleContact = async () => {
    if (!user) { navigate('/login'); return; }
    if (isClient && targetId) {
      try {
        await messagesAPI.startConversation(targetId, `Hi ${u.firstName || 'there'}, I'd like to discuss a project with you.`);
        navigate('/client/messages');
        return;
      } catch {
        // Fallback to standard messages route
      }
    }
    navigate(isClient ? '/client/messages' : '/freelancer/messages');
  };

  const handleSendInquiry = async (e) => {
    e?.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!inquiryMsg.trim()) {
      toast?.('Please write a short message before sending', 'warning');
      return;
    }
    setSendingInquiry(true);
    try {
      const fullMsg = inquiryName.trim()
        ? `[Inquiry from ${inquiryName.trim()}]\n${inquiryMsg.trim()}`
        : inquiryMsg.trim();

      if (isClient && targetId) {
        await messagesAPI.startConversation(targetId, fullMsg);
        toast?.('Inquiry sent successfully to ' + (u.firstName || fullName), 'success');
        setInquiryMsg('');
        navigate('/client/messages');
        return;
      }
      navigate(isClient ? '/client/messages' : '/freelancer/messages');
    } catch (err) {
      toast?.(err.response?.data?.message || 'Could not send inquiry. Please try again.', 'error');
    } finally {
      setSendingInquiry(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fullName} on SkillKart`,
          text: `Check out ${fullName}'s profile on SkillKart`,
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast?.('Profile link copied to clipboard!', 'success');
      } catch {
        toast?.('Could not copy link', 'error');
      }
    }
  };

  const scrollToSection = (secId) => {
    const target = document.getElementById(secId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Portfolio items normalization
  const portfolioItems = useMemo(() => {
    if (Array.isArray(profile?.portfolio) && profile.portfolio.length > 0) return profile.portfolio;
    return [];
  }, [profile]);

  const handleRatingUpdated = useCallback((updated) => {
    setReviews(updated);
    if (updated.length > 0) {
      const sum = updated.reduce((acc, r) => acc + (r.rating || 0), 0);
      setProfile(prev => prev ? ({ ...prev, rating: Number((sum / updated.length).toFixed(1)) }) : prev);
    }
  }, []);

  if (loading) {
    return (
      <div className="pfp-page-shell">
        <Navbar />
        <div className="pfp-center-loader">
          <Loader size="lg" text="Loading talent profile..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (error === 'notfound') {
    return (
      <div className="pfp-page-shell">
        <Navbar />
        <div className="pfp-center-loader">
          <div className="pfp-state-card">
            <div className="pfp-state-icon"><Search size={32} /></div>
            <h2>Freelancer Not Found</h2>
            <p>This profile is either inactive or does not exist in our directory.</p>
            <Link to="/browse-freelancers" className="pfp-btn-primary">Browse All Freelancers</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pfp-page-shell">
        <Navbar />
        <div className="pfp-center-loader">
          <div className="pfp-state-card">
            <div className="pfp-state-icon pfp-state-icon--red"><AlertCircle size={32} /></div>
            <h2>Could Not Load Profile</h2>
            <p>{error}</p>
            <button type="button" className="pfp-btn-primary" onClick={() => navigate(0)}>
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const completedProjectsCount = profile.completedProjects || portfolioItems.length || 0;
  const ratingValue = Number(profile.rating || 5.0);
  const memberSince = fmtDate(u.createdAt || profile.createdAt);
  const hourlyRate = Number(profile.hourlyRate || 0);

  const hasSocialLinks = profile.socialLinks && (
    profile.socialLinks.github ||
    profile.socialLinks.linkedin ||
    profile.socialLinks.website ||
    profile.socialLinks.twitter
  );

  return (
    <div className="pfp-page-shell">
      <Navbar />

      <div className="pfp-main-container">
        {isMobileApp() && (
          <div className="pfp-back-row">
            <BackButton />
          </div>
        )}
        {/* ─── 1) BREADCRUMBS & LIVE STATUS ─── */}
        <div className="pfp-top-nav-bar">
          <div className="pfp-breadcrumbs">
            <Link to="/browse-freelancers" className="pfp-crumb-link">Explore Talent</Link>
            <span className="pfp-crumb-sep">/</span>
            <span className="pfp-crumb-category">{profile.title || 'Specialist'}</span>
            <span className="pfp-crumb-sep">/</span>
            <span className="pfp-crumb-active">{fullName}</span>
          </div>

          <div className="pfp-active-pill">
            <span className="pfp-active-pulse" />
            <span>VERIFIED SKILLKART TALENT</span>
          </div>
        </div>

        {/* ─── 2) STUDIO PROFILE HEADER CARD ─── */}
        <Reveal delay={0}>
          <div className="pfp-studio-hero-card">
            <div className="pfp-hero-banner-accent" />

            <div className="pfp-hero-content-wrap">
              <div className="pfp-hero-main-row">

                {/* Avatar with Status */}
                <div className="pfp-avatar-block">
                  <div className="pfp-avatar-squircle">
                    {u.profilePicture ? (
                      <img src={u.profilePicture} alt={fullName} className="pfp-avatar-img" />
                    ) : (
                      <div className="pfp-avatar-fallback">
                        {(u.firstName?.[0] || 'F').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="pfp-status-indicator">
                    <span className="pfp-status-dot" />
                    <span>{availabilityLabel(profile.availability)}</span>
                  </div>
                </div>

                {/* Identity & Main Highlights */}
                <div className="pfp-info-block">
                  <div className="pfp-title-row">
                    <h1 className="pfp-name">{fullName}</h1>
                    {profile.verificationStatus === 'verified' && (
                      <span className="pfp-badge-verified">
                        <CheckCircle2 size={13} />
                        <span>Verified Pro</span>
                      </span>
                    )}
                    <span className="pfp-badge-top-rated">
                      <Sparkles size={12} />
                      <span>Top Rated</span>
                    </span>
                  </div>

                  <p className="pfp-headline">{profile.title || 'Full Stack Specialist & Consultant'}</p>

                  <div className="pfp-meta-tags-row">
                    <div className="pfp-meta-tag">
                      <Star size={14} fill="#F59E0B" color="#F59E0B" />
                      <strong>{ratingValue.toFixed(1)}</strong>
                      <span className="pfp-meta-sub">({reviews.length} reviews)</span>
                    </div>

                    {profile.timezone && (
                      <div className="pfp-meta-tag">
                        <MapPin size={13} color="#EF4444" />
                        <span>{profile.timezone}</span>
                      </div>
                    )}

                    {hourlyRate > 0 && (
                      <div className="pfp-meta-tag pfp-meta-tag--rate">
                        <strong>Rs. {hourlyRate.toLocaleString()}</strong>
                        <span className="pfp-meta-sub">/hr</span>
                      </div>
                    )}

                    {memberSince && (
                      <div className="pfp-meta-tag">
                        <Calendar size={13} />
                        <span>Member since {memberSince}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="pfp-hero-actions">
                  {isOwner ? (
                    <button
                      type="button"
                      className="pfp-btn-primary"
                      onClick={() => navigate('/freelancer/profile')}
                    >
                      <FileEdit size={16} />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="pfp-btn-primary"
                        onClick={handleContact}
                      >
                        <Zap size={16} />
                        <span>Hire Directly</span>
                      </button>

                      <button
                        type="button"
                        className="pfp-btn-secondary"
                        onClick={handleContact}
                      >
                        <MessageSquare size={16} />
                        <span>Message</span>
                      </button>

                      <div className="pfp-icon-btns-row">
                        {isClient && (
                          <button
                            type="button"
                            className={`pfp-icon-action ${isSaved ? 'pfp-icon-action--active' : ''}`}
                            onClick={handleSave}
                            title={isSaved ? 'Saved to bookmarks' : 'Bookmark freelancer'}
                          >
                            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                          </button>
                        )}
                        <button
                          type="button"
                          className="pfp-icon-action"
                          onClick={handleShare}
                          title="Share profile"
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Specialization snippet if present */}
              {profile.bio && (
                <div className="pfp-hero-bio-strip">
                  <span className="pfp-bio-label">Overview:</span>
                  <p className="pfp-bio-preview">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* ─── 3) PERFORMANCE METRICS STRIP ─── */}
        <Reveal delay={40}>
          <div className="pfp-kpi-bar">
            <div className="pfp-kpi-cell">
              <span className="pfp-kpi-num">
                {ratingValue.toFixed(1)} <Star size={16} fill="#F59E0B" color="#F59E0B" className="pfp-inline-star" />
              </span>
              <span className="pfp-kpi-label">{reviews.length} Client Reviews</span>
            </div>

            <div className="pfp-kpi-divider" />

            <div className="pfp-kpi-cell">
              <span className="pfp-kpi-num">{completedProjectsCount}</span>
              <span className="pfp-kpi-label">Completed Deliverables</span>
            </div>

            <div className="pfp-kpi-divider" />

            <div className="pfp-kpi-cell">
              <span className="pfp-kpi-num">{gigs.length > 0 ? `${gigs.length} Gigs` : 'Available'}</span>
              <span className="pfp-kpi-label">Instant Services</span>
            </div>

            <div className="pfp-kpi-divider" />

            <div className="pfp-kpi-cell">
              <span className="pfp-kpi-num pfp-kpi-num--emerald">
                100% <ShieldCheck size={17} className="pfp-inline-shield" />
              </span>
              <span className="pfp-kpi-label">Milestone Escrow Security</span>
            </div>
          </div>
        </Reveal>

        {/* ─── 4) 2-COLUMN MARKETPLACE CONTENT GRID ─── */}
        <div className="pfp-two-col-layout">

          {/* ════════ LEFT COLUMN: MAIN CONTENT (68%) ════════ */}
          <div className="pfp-main-column">

            {/* SECTION 1: ABOUT & BACKGROUND */}
            <Reveal delay={60}>
              <div className="pfp-section-card" id="sec-about">
                <div className="pfp-card-header">
                  <div className="pfp-header-icon-box">
                    <UserCheck size={18} />
                  </div>
                  <h2 className="pfp-card-title">About the Specialist</h2>
                </div>

                <div className="pfp-card-body">
                  <p className="pfp-about-text">
                    {profile.bio || `${fullName} is a dedicated professional offering top-tier services on SkillKart with milestone-protected quality.`}
                  </p>

                  {Array.isArray(profile.languages) && profile.languages.length > 0 && (
                    <div className="pfp-lang-row">
                      <span className="pfp-lang-title">Languages Spoken:</span>
                      <div className="pfp-lang-badges">
                        {profile.languages.map((l, i) => (
                          <span key={i} className="pfp-lang-pill">
                            {typeof l === 'object' ? `${l.language || l.name || ''} (${l.proficiency || 'Fluent'})` : l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>

            {/* SECTION 2: PACKAGED GIGS & INSTANT SERVICES (IF ANY) */}
            {gigs.length > 0 && (
              <Reveal delay={80}>
                <div className="pfp-section-card" id="sec-services">
                  <div className="pfp-card-header">
                    <div className="pfp-header-icon-box pfp-header-icon-box--emerald">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <h2 className="pfp-card-title">Instant-Order Services</h2>
                      <span className="pfp-card-subtitle">Transparent pricing • Escrow-protected delivery</span>
                    </div>
                  </div>

                  <div className="pfp-gigs-stack">
                    {gigs.map((gig, idx) => {
                      const pricing = gig.pricing || {};
                      const basicPrice = gig.startingPrice != null
                        ? gig.startingPrice
                        : (pricing.basic?.price != null ? pricing.basic.price : null);
                      const coverImg = gig.media?.banner || gig.banner || (Array.isArray(gig.media?.images) ? gig.media.images[0] : null);
                      const delivery = pricing.basic?.deliveryTime || gig.deliveryTime;
                      const revisions = pricing.basic?.revisions != null ? pricing.basic.revisions : gig.revisions;

                      return (
                        <div key={gig._id || idx} className="pfp-gig-row-card">
                          <div className="pfp-gig-thumb-wrap">
                            {coverImg ? (
                              <img src={coverImg} alt={gig.title} className="pfp-gig-img" />
                            ) : (
                              <div className="pfp-gig-fallback"><ShoppingBag size={24} /></div>
                            )}
                          </div>

                          <div className="pfp-gig-info-wrap">
                            <div className="pfp-gig-meta-top">
                              <span className="pfp-gig-category">{gig.category || 'Service'}</span>
                              {basicPrice != null && (
                                <span className="pfp-gig-price">Rs. {Number(basicPrice).toLocaleString()}</span>
                              )}
                            </div>

                            <h3 className="pfp-gig-title">
                              <Link to={`/gigs/${gig._id}`}>{gig.title}</Link>
                            </h3>

                            {gig.shortDescription && (
                              <p className="pfp-gig-desc">{gig.shortDescription}</p>
                            )}

                            <div className="pfp-gig-footer-row">
                              <div className="pfp-gig-specs">
                                {delivery && (
                                  <span className="pfp-gig-spec-pill">
                                    <Clock size={12} />
                                    <span>{delivery}</span>
                                  </span>
                                )}
                                {revisions != null && (
                                  <span className="pfp-gig-spec-pill">
                                    <CheckCircle2 size={12} />
                                    <span>{revisions} Revisions</span>
                                  </span>
                                )}
                              </div>

                              <Link to={`/gigs/${gig._id}`} className="pfp-gig-order-btn">
                                <span>Order Service</span>
                                <ArrowRight size={13} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            )}

            {/* SECTION 3: VERIFIED SKILLS & PROFICIENCY */}
            {Array.isArray(profile.skills) && profile.skills.length > 0 && (
              <Reveal delay={100}>
                <div className="pfp-section-card" id="sec-skills">
                  <div className="pfp-card-header">
                    <div className="pfp-header-icon-box">
                      <Award size={18} />
                    </div>
                    <div>
                      <h2 className="pfp-card-title">Verified Skills &amp; Competencies</h2>
                      <span className="pfp-card-subtitle">AI-evaluated and benchmarked on SkillKart</span>
                    </div>
                  </div>

                  <div className="pfp-skills-grid">
                    {profile.skills.map((sk, sIdx) => {
                      const name = typeof sk === 'string' ? sk : sk?.name;
                      if (!name) return null;
                      const score = typeof sk === 'object' && sk?.verificationScore
                        ? Math.min(100, Math.max(0, sk.verificationScore))
                        : (sk?.isVerified ? 100 : (sk?.level === 'Expert' ? 95 : 80));
                      const isVerified = typeof sk === 'object' && (sk?.isVerified || sk?.verificationScore > 0);

                      return (
                        <div key={sIdx} className="pfp-skill-item-card">
                          <div className="pfp-skill-label-row">
                            <span className="pfp-skill-title">{name}</span>
                            {isVerified && (
                              <span className="pfp-skill-check-badge">
                                <CheckCircle2 size={12} />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                          <div className="pfp-skill-progress-bar">
                            <div className="pfp-skill-progress-fill" style={{ width: `${score}%` }} />
                          </div>
                          <span className="pfp-skill-percent">{score}% benchmark score</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            )}

            {/* SECTION 4: SELECTED WORK / PORTFOLIO SHOWCASE */}
            {portfolioItems.length > 0 && (
              <Reveal delay={120}>
                <div className="pfp-section-card" id="sec-portfolio">
                  <div className="pfp-card-header">
                    <div className="pfp-header-icon-box">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h2 className="pfp-card-title">Portfolio Showcase</h2>
                      <span className="pfp-card-subtitle">Verified project deliverables</span>
                    </div>
                  </div>

                  <div className="pfp-portfolio-grid">
                    {portfolioItems.map((item, pIdx) => {
                      const img = item.images?.[0] || item.coverImage || item.image;
                      return (
                        <div key={pIdx} className="pfp-portfolio-card">
                          <div className="pfp-portfolio-img-box">
                            {img ? (
                              <img src={img} alt={item.title} className="pfp-portfolio-img" />
                            ) : (
                              <div className="pfp-portfolio-fallback"><Briefcase size={28} /></div>
                            )}
                          </div>

                          <div className="pfp-portfolio-body">
                            <h3 className="pfp-portfolio-title">{item.title}</h3>
                            {item.description && (
                              <p className="pfp-portfolio-desc">{item.description}</p>
                            )}

                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => { e.preventDefault(); openExternal(item.url); }}
                                className="pfp-portfolio-link"
                              >
                                <span>View Live Deliverable</span>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            )}

            {/* SECTION 5: EDUCATION & CERTIFICATIONS */}
            {((profile.education && profile.education.length > 0) || (profile.certifications && profile.certifications.length > 0)) && (
              <Reveal delay={140}>
                <div className="pfp-section-card" id="sec-education">
                  <div className="pfp-card-header">
                    <div className="pfp-header-icon-box">
                      <GraduationCap size={18} />
                    </div>
                    <h2 className="pfp-card-title">Education &amp; Certifications</h2>
                  </div>

                  <div className="pfp-edu-grid">
                    {/* Education list */}
                    {profile.education?.map((edu, eIdx) => (
                      <div key={`edu-${eIdx}`} className="pfp-edu-item">
                        <div className="pfp-edu-icon-circle"><GraduationCap size={16} /></div>
                        <div className="pfp-edu-content">
                          <h4 className="pfp-edu-title">{edu.institution || 'University'}</h4>
                          <p className="pfp-edu-degree">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                          {(edu.startDate || edu.endDate) && (
                            <span className="pfp-edu-date">
                              {fmtDate(edu.startDate)} — {edu.endDate ? fmtDate(edu.endDate) : 'Present'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Certifications list */}
                    {profile.certifications?.map((cert, cIdx) => (
                      <div key={`cert-${cIdx}`} className="pfp-edu-item">
                        <div className="pfp-edu-icon-circle pfp-edu-icon-circle--emerald"><Award size={16} /></div>
                        <div className="pfp-edu-content">
                          <h4 className="pfp-edu-title">{cert.name || 'Certification'}</h4>
                          <p className="pfp-edu-degree">{cert.issuer}{cert.credentialId ? ` • ID: ${cert.credentialId}` : ''}</p>
                          {cert.issueDate && (
                            <span className="pfp-edu-date">Issued {fmtDate(cert.issueDate)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* SECTION 6: CLIENT REVIEWS */}
            <Reveal delay={160}>
              <div className="pfp-section-card" id="sec-reviews">
                <div className="pfp-card-header">
                  <div className="pfp-header-icon-box pfp-header-icon-box--gold">
                    <Star size={18} fill="#F59E0B" color="#F59E0B" />
                  </div>
                  <div>
                    <h2 className="pfp-card-title">Client Reviews &amp; Endorsements</h2>
                    <span className="pfp-card-subtitle">
                      ★ {ratingValue.toFixed(1)} / 5.0 from {reviews.length} completed project{reviews.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="pfp-reviews-container">
                  <ReviewSection
                    targetUserId={targetId}
                    targetName={fullName}
                    initialReviews={reviews}
                    title="Client Endorsements"
                    onRatingUpdated={handleRatingUpdated}
                  />
                </div>
              </div>
            </Reveal>

          </div>

          {/* ════════ RIGHT COLUMN: STICKY SIDEBAR (32%) ════════ */}
          <aside className="pfp-sidebar-column">

            {/* SIDEBAR CARD 1: DIRECT HIRE & INQUIRY */}
            <div className="pfp-sticky-hire-card">
              <div className="pfp-hire-rate-row">
                <div className="pfp-hire-rate-info">
                  <span className="pfp-hire-rate-label">Hourly Consultation</span>
                  <div className="pfp-hire-price">
                    <strong>Rs. {hourlyRate > 0 ? hourlyRate.toLocaleString() : '500'}</strong>
                    <span>/hr</span>
                  </div>
                </div>
                <div className="pfp-hire-status-pill">
                  <span className="pfp-pulse-circle" />
                  <span>Available</span>
                </div>
              </div>

              {!isOwner && (
                <form className="pfp-fast-inquiry-box" onSubmit={handleSendInquiry}>
                  <span className="pfp-inquiry-heading">Send Instant Inquiry</span>
                  <input
                    type="text"
                    className="pfp-input-field"
                    placeholder="Your name or organization"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                  />
                  <textarea
                    className="pfp-textarea-field"
                    placeholder="Describe your project, budget, and timeline..."
                    rows={3}
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="pfp-inquiry-submit"
                    disabled={sendingInquiry}
                  >
                    <Send size={14} />
                    <span>{sendingInquiry ? 'Sending...' : 'Send Direct Message'}</span>
                  </button>
                </form>
              )}

              <div className="pfp-guarantee-bullets">
                <div className="pfp-gbullet">
                  <ShieldCheck size={14} className="pfp-gbullet-icon" />
                  <span>100% Escrow Milestone Protection</span>
                </div>
                <div className="pfp-gbullet">
                  <Clock size={14} className="pfp-gbullet-icon" />
                  <span>Average Reply Time: Within 2 Hours</span>
                </div>
                <div className="pfp-gbullet">
                  <Check size={14} className="pfp-gbullet-icon" />
                  <span>Full Intellectual Property Ownership</span>
                </div>
              </div>
            </div>

            {/* SIDEBAR CARD 2: SOCIAL & EXTERNAL CHANNELS */}
            {hasSocialLinks && (
              <div className="pfp-side-box">
                <span className="pfp-side-box-title">Online Presence</span>
                <div className="pfp-social-pills-wrap">
                  {profile.socialLinks?.github && (
                    <a
                      href={profile.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); openExternal(profile.socialLinks.github); }}
                      className="pfp-social-item"
                    >
                      <Github size={14} />
                      <span>GitHub</span>
                    </a>
                  )}
                  {profile.socialLinks?.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); openExternal(profile.socialLinks.linkedin); }}
                      className="pfp-social-item"
                    >
                      <Linkedin size={14} />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {profile.socialLinks?.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); openExternal(profile.socialLinks.website); }}
                      className="pfp-social-item"
                    >
                      <Globe size={14} />
                      <span>Portfolio</span>
                    </a>
                  )}
                  {profile.socialLinks?.twitter && (
                    <a
                      href={profile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); openExternal(profile.socialLinks.twitter); }}
                      className="pfp-social-item"
                    >
                      <Twitter size={14} />
                      <span>Twitter / X</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* SIDEBAR CARD 3: VERIFIED TRUST BADGES */}
            <div className="pfp-side-box">
              <span className="pfp-side-box-title">SkillKart Trust &amp; Safety</span>
              <div className="pfp-trust-list">
                <div className="pfp-trust-row">
                  <div className="pfp-trust-icon-box"><ShieldCheck size={16} /></div>
                  <div className="pfp-trust-text">
                    <strong>Identity Verified</strong>
                    <p>Government ID and student credentials screened.</p>
                  </div>
                </div>
                <div className="pfp-trust-row">
                  <div className="pfp-trust-icon-box pfp-trust-icon-box--gold"><Star size={16} fill="#F59E0B" color="#F59E0B" /></div>
                  <div className="pfp-trust-text">
                    <strong>Skill-Tested Profile</strong>
                    <p>Standardized domain evaluation passed.</p>
                  </div>
                </div>
                <div className="pfp-trust-row">
                  <div className="pfp-trust-icon-box"><Shield size={16} /></div>
                  <div className="pfp-trust-text">
                    <strong>Milestone Escrow</strong>
                    <p>Funds remain held safely until work is approved.</p>
                  </div>
                </div>
              </div>
            </div>

          </aside>

        </div>
      </div>

      <Footer />
    </div>
  );
}
