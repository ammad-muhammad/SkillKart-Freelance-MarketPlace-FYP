import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Star, Clock, Briefcase, Award, GraduationCap, 
  ExternalLink, MessageSquare, Bookmark, CheckCircle, 
  Github, Linkedin, Link as LinkIcon, AlertCircle, Search, 
  Calendar, Code, ChevronRight, Loader2, BookmarkCheck, FileEdit, Camera
} from 'lucide-react';

import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { freelancersAPI } from '../../../api/freelancers';
import { messagesAPI } from '../../../api/messages';
import { gigsAPI } from '../../../api/gigs';
import { useAuth } from '../../../hooks/useAuth';
import { useClient } from '../../../context/ClientContext';
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
}[a] || 'Availability on request');

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function PublicFreelancerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isClient, isFreelancer } = useAuth();
  const { savedFreelancers, toggleSavedFreelancer } = useClient();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

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
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.status === 404 ? 'notfound' : (err.response?.data?.message || 'Failed to load profile'));
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id]);

  const u = profile?.userId || {};
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Freelancer';
  const isSaved = savedFreelancers.some((f) => f.id === (u._id || id));
  const isOwner = user && (user._id === u._id || user._id === id);

  const handleSave = () => {
    toggleSavedFreelancer({
      id: u._id || id,
      _id: u._id || id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      profilePicture: u.profilePicture,
      rating: profile?.rating,
      freelancerProfile: profile,
    });
  };

  const handleContact = async () => {
    if (!user) { navigate('/login'); return; }
    
    const targetId = u._id || id;
    
    if (isClient && targetId) {
      try {
        await messagesAPI.startConversation(targetId, `Hi ${u.firstName || 'there'}, I'd like to discuss a project with you.`);
        navigate('/client/messages');
        return;
      } catch {
        // Fall through to standard navigation if fails
      }
    }
    
    navigate(isClient ? '/client/messages' : '/freelancer/messages');
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pfp-page pfp-page--loading pfp-centered">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="pfp-spinner" style={{ width: '60px', height: '60px', color: 'white', margin: 0 }} />
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  if (error === 'notfound') {
    return (
      <>
        <Navbar />
        <div className="pfp-page pfp-page--loading pfp-centered">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pfp-error-card">
            <div className="pfp-error-icon-bg"><Search size={32} /></div>
            <h2>Freelancer Not Found</h2>
            <p>This profile doesn't exist or is no longer available in our directory.</p>
            <Link to="/browse-freelancers" className="pfp-btn pfp-btn-primary">Browse Top Talent</Link>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="pfp-page pfp-centered">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pfp-error-card">
            <div className="pfp-error-icon-bg pfp-error-icon-bg-red"><AlertCircle size={32} /></div>
            <h2>Couldn't load profile</h2>
            <p>{error}</p>
            <button className="pfp-btn pfp-btn-primary" onClick={() => navigate(0)}>Try Again</button>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="pfp-page">
        {/* Dynamic Background Elements */}
        <div className="pfp-bg-blob pfp-bg-blob-1"></div>
        <div className="pfp-bg-blob pfp-bg-blob-2"></div>
        
        <div className="container pfp-container">
          
          <motion.div 
            className="pfp-hero-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div 
              className="pfp-hero-banner"
              style={{ backgroundImage: profile.coverPhoto ? `url(${profile.coverPhoto})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="pfp-hero-overlay"></div>
              
              {profile.verificationStatus === 'verified' && (
                <div className="pfp-verified-badge" title="Verified Freelancer">
                  <CheckCircle size={14} strokeWidth={2.5} />
                  <span>Verified</span>
                </div>
              )}

              {isOwner && (
                <button 
                  className="pfp-edit-cover-btn"
                  onClick={() => navigate('/freelancer/profile')}
                >
                  <Camera size={16} />
                  <span>Update Cover</span>
                </button>
              )}
            </div>
            
            <div className="pfp-hero-content">
              <div className="pfp-avatar-wrapper">
                <div className="pfp-avatar">
                  {u.profilePicture
                    ? <img src={u.profilePicture} alt={fullName} />
                    : <span>{(u.firstName?.[0] || 'F').toUpperCase()}</span>}
                </div>
              </div>
              
              <div className="pfp-hero-main">
                <div className="pfp-hero-header">
                  <h1 className="pfp-name">{fullName}</h1>
                  <p className="pfp-title">{profile.title || 'Professional Freelancer'}</p>
                </div>
                
                <div className="pfp-meta-tags">
                  <div className="pfp-meta-tag pfp-meta-rating">
                    <Star size={16} className="pfp-icon-star" fill="currentColor" />
                    <span>{(profile.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="pfp-meta-tag">
                    <Briefcase size={16} />
                    <span>{profile.completedProjects || 0} Projects</span>
                  </div>
                  <div className="pfp-meta-tag">
                    <MapPin size={16} />
                    <span>{profile.timezone || 'Global'}</span>
                  </div>
                  <div className="pfp-meta-tag">
                    <Clock size={16} />
                    <span>{availabilityLabel(profile.availability)}</span>
                  </div>
                </div>
              </div>
              
              <div className="pfp-hero-actions">
                {profile.hourlyRate && (
                  <div className="pfp-rate-box">
                    <span className="pfp-rate-currency">Rs. </span>
                    <span className="pfp-rate-amount">{profile.hourlyRate}</span>
                    <span className="pfp-rate-period">/hr</span>
                  </div>
                )}
                <div className="pfp-action-buttons">
                  {isOwner ? (
                    <button className="pfp-btn pfp-btn-secondary pfp-btn-contact" onClick={() => navigate('/freelancer/profile')}>
                      <FileEdit size={18} /> Edit Profile
                    </button>
                  ) : !isFreelancer ? (
                    <button className="pfp-btn pfp-btn-primary pfp-btn-contact" onClick={handleContact}>
                      <MessageSquare size={18} /> Contact Me
                    </button>
                  ) : null}
                  {isClient && !isOwner && (
                    <button className={`pfp-btn pfp-btn-icon ${isSaved ? 'pfp-btn-saved' : 'pfp-btn-secondary'}`} onClick={handleSave} title={isSaved ? "Remove from saved" : "Save freelancer"}>
                      {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="pfp-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* MAIN COLUMN */}
            <div className="pfp-col-main">
              {profile.bio && (
                <motion.section variants={itemVariants} className="pfp-card pfp-card-glass">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">About Me</h2>
                  </div>
                  <div className="pfp-card-body">
                    <p className="pfp-bio">{profile.bio}</p>
                  </div>
                </motion.section>
              )}

              {gigs && gigs.length > 0 && (
                <motion.section variants={itemVariants} className="pfp-card">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">Services Offered</h2>
                  </div>
                  <div className="pfp-card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {gigs.map((gig) => (
                        <Link to={`/gigs/${gig._id}`} key={gig._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ border: '1px solid var(--color-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', transition: 'all 0.2s', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseOver={e => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)'}} onMouseOut={e => {e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'}}>
                            <div style={{ height: '160px', background: 'var(--color-bg-alt)' }}>
                              {gig.banner ? <img src={gig.banner} alt={gig.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-primary)', color: 'white' }}><Briefcase size={32} /></div>}
                            </div>
                            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 'var(--fw-bold)', lineHeight: 1.4, color: 'var(--color-text-dark)' }}>{gig.title}</h3>
                              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-mid)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{gig.shortDescription}</p>
                              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--color-secondary)' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Star size={16} fill="#f59e0b" color="#f59e0b" /> <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--color-text-dark)' }}>{gig.stats?.rating > 0 ? gig.stats.rating.toFixed(1) : 'New'}</span> {gig.stats?.reviewsCount > 0 && `(${gig.stats.reviewsCount})`}</span>
                                <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--color-primary)', fontSize: '1.1rem' }}>From ${gig.pricing?.basic?.price || 0}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {Array.isArray(profile.portfolio) && profile.portfolio.length > 0 && (
                <motion.section variants={itemVariants} className="pfp-card">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">Portfolio Showcase</h2>
                  </div>
                  <div className="pfp-card-body">
                    <div className="pfp-portfolio-grid">
                      {profile.portfolio.map((item, i) => (
                        <motion.div 
                          key={i} 
                          className="pfp-portfolio-item"
                          whileHover={{ y: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div className="pfp-portfolio-img-wrapper">
                            {item.images?.[0] ? (
                              <img src={item.images[0]} alt={item.title} />
                            ) : (
                              <div className="pfp-portfolio-img-placeholder"><Code size={40} /></div>
                            )}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="pfp-portfolio-link-overlay">
                                <ExternalLink size={24} color="white" />
                              </a>
                            )}
                          </div>
                          <div className="pfp-portfolio-content">
                            <h3>{item.title}</h3>
                            {item.description && <p>{item.description}</p>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {Array.isArray(profile.education) && profile.education.length > 0 && (
                <motion.section variants={itemVariants} className="pfp-card">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">Education</h2>
                  </div>
                  <div className="pfp-card-body">
                    <div className="pfp-timeline">
                      {profile.education.map((e, i) => (
                        <div key={i} className="pfp-timeline-item">
                          <div className="pfp-timeline-icon"><GraduationCap size={16} /></div>
                          <div className="pfp-timeline-content">
                            <h3 className="pfp-timeline-title">{e.degree}{e.field ? ` in ${e.field}` : ''}</h3>
                            <h4 className="pfp-timeline-subtitle">{e.institution}</h4>
                            {(e.startDate || e.endDate) && (
                              <div className="pfp-timeline-date">
                                <Calendar size={14} /> 
                                <span>{fmtDate(e.startDate)} — {e.endDate ? fmtDate(e.endDate) : 'Present'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {Array.isArray(profile.certifications) && profile.certifications.length > 0 && (
                <motion.section variants={itemVariants} className="pfp-card">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">Licenses & Certifications</h2>
                  </div>
                  <div className="pfp-card-body">
                    <div className="pfp-cert-list">
                      {profile.certifications.map((c, i) => (
                        <div key={i} className="pfp-cert-card">
                          <div className="pfp-cert-icon"><Award size={24} /></div>
                          <div className="pfp-cert-info">
                            <h3>{c.name}</h3>
                            <p>{c.issuer}{c.issueDate ? ` · Issued ${fmtDate(c.issueDate)}` : ''}</p>
                          </div>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="pfp-cert-link">
                              <ExternalLink size={18} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="pfp-col-side">
              
              <motion.section variants={itemVariants} className="pfp-card pfp-card-gradient">
                <div className="pfp-card-header">
                  <h2 className="pfp-section-title">Top Skills</h2>
                </div>
                <div className="pfp-card-body">
                  {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                    <div className="pfp-skills-cloud">
                      {profile.skills.map((s, i) => (
                        <span key={i} className={`pfp-skill-tag ${s.isVerified ? 'pfp-skill-verified' : ''}`}>
                          {s.name}
                          {s.isVerified && <CheckCircle size={12} className="pfp-skill-check" />}
                        </span>
                      ))}
                    </div>
                  ) : <p className="pfp-empty-text">No skills listed yet.</p>}
                </div>
              </motion.section>

              {Array.isArray(profile.languages) && profile.languages.length > 0 && (
                <motion.section variants={itemVariants} className="pfp-card">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">Languages</h2>
                  </div>
                  <div className="pfp-card-body">
                    <ul className="pfp-lang-list">
                      {profile.languages.map((l, i) => (
                        <li key={i}>
                          <span className="pfp-lang-name">{typeof l.language === 'object' ? l.language?.name : l.language}</span>
                          <span className="pfp-lang-level">{l.proficiency}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.section>
              )}

              {(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.website || (profile.portfolioLinks?.length > 0)) && (
                <motion.section variants={itemVariants} className="pfp-card">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">On The Web</h2>
                  </div>
                  <div className="pfp-card-body">
                    <div className="pfp-links-list">
                      {profile.socialLinks?.github && (
                        <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="pfp-web-link">
                          <div className="pfp-link-icon-wrap"><Github size={18} /></div>
                          <span>GitHub</span>
                          <ChevronRight size={16} className="pfp-link-arrow" />
                        </a>
                      )}
                      {profile.socialLinks?.linkedin && (
                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="pfp-web-link">
                          <div className="pfp-link-icon-wrap pfp-linkedin"><Linkedin size={18} /></div>
                          <span>LinkedIn</span>
                          <ChevronRight size={16} className="pfp-link-arrow" />
                        </a>
                      )}
                      {profile.socialLinks?.website && (
                        <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="pfp-web-link">
                          <div className="pfp-link-icon-wrap pfp-website"><LinkIcon size={18} /></div>
                          <span>Personal Website</span>
                          <ChevronRight size={16} className="pfp-link-arrow" />
                        </a>
                      )}
                      {(profile.portfolioLinks || []).map((l, i) => (
                        <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="pfp-web-link">
                          <div className="pfp-link-icon-wrap pfp-portfolio-link"><ExternalLink size={18} /></div>
                          <span>{l.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}</span>
                          <ChevronRight size={16} className="pfp-link-arrow" />
                        </a>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {reviews.length > 0 && (
                <motion.section variants={itemVariants} className="pfp-card">
                  <div className="pfp-card-header">
                    <h2 className="pfp-section-title">Client Reviews</h2>
                  </div>
                  <div className="pfp-card-body pfp-reviews-container">
                    {(showAllReviews ? reviews : reviews.slice(0, 3)).map((rev) => (
                      <div key={rev._id} className="pfp-review-card">
                        <div className="pfp-review-header">
                          <div className="pfp-reviewer-avatar">
                            {rev.reviewerId?.profilePicture ? (
                              <img src={rev.reviewerId.profilePicture} alt="Client" />
                            ) : (
                              <span>{rev.reviewerId?.firstName?.charAt(0) || 'C'}</span>
                            )}
                          </div>
                          <div className="pfp-reviewer-info">
                            <h4>{rev.reviewerId?.firstName} {rev.reviewerId?.lastName?.charAt(0)}.</h4>
                            <div className="pfp-review-stars">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                  key={star} 
                                  size={12} 
                                  fill={star <= rev.rating ? "#f59e0b" : "transparent"} 
                                  color={star <= rev.rating ? "#f59e0b" : "#cbd5e1"} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="pfp-review-text">"{rev.comment}"</p>
                      </div>
                    ))}
                    {reviews.length > 3 && (
                      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button 
                          className="pfp-btn pfp-btn-outline" 
                          onClick={() => setShowAllReviews(!showAllReviews)}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          {showAllReviews ? 'Show Less' : `Show All Reviews (${reviews.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.section>
              )}

            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
