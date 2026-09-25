import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Star, Briefcase, ExternalLink, MessageSquare, 
  AlertCircle, Search, Loader2, Building2, Globe, FileEdit, Camera, CheckCircle,
  Github, Linkedin, Twitter, ChevronRight, Send, Clock, Tag, ShieldCheck, CheckCircle2
} from 'lucide-react';

import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import ReviewSection from '../../../Components/common/ReviewSection/ReviewSection';
import { clientsAPI } from '../../../api/clients';
import { jobsAPI } from '../../../api/jobs';
import { messagesAPI } from '../../../api/messages';
import { useAuth } from '../../../hooks/useAuth';
import './PublicClientProfile.css';

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

export default function PublicClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobTab, setJobTab] = useState('all');

  const sidebarRef = useRef(null);

  // Smart sticky behavior: both columns scroll naturally.
  // When the bottom of the right sidebar card is reached, it locks in place
  // while the left content continues scrolling down.
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const updateSticky = () => {
      const vh = window.innerHeight;
      const h = el.offsetHeight;
      if (h + 100 > vh) {
        el.style.top = `${vh - h - 24}px`;
      } else {
        el.style.top = '90px';
      }
    };

    updateSticky();
    window.addEventListener('resize', updateSticky);
    const ro = new ResizeObserver(updateSticky);
    ro.observe(el);

    return () => {
      window.removeEventListener('resize', updateSticky);
      ro.disconnect();
    };
  }, [profile, jobs, reviews]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    document.title = 'Client Profile — SkillKart';

    Promise.all([
      clientsAPI.getPublicById(id),
      jobsAPI.listJobs({ clientId: id, status: 'all' }).catch(() => ({ data: { data: [] } }))
    ])
      .then(([resProfile, resJobs]) => {
        if (!active) return;
        const p = resProfile.data?.data?.profile;
        const r = resProfile.data?.data?.reviews || [];
        const j = resJobs.data?.data || [];
        if (!p) { setError('notfound'); return; }
        setProfile(p);
        setReviews(r);
        setJobs(j);
        
        const companyName = p.companyName || `${p.userId?.firstName || ''} ${p.userId?.lastName || ''}`.trim();
        if (companyName) document.title = `${companyName} — SkillKart`;
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.status === 404 ? 'notfound' : (err.response?.data?.message || 'Failed to load profile'));
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id]);

  const u = profile?.userId || {};
  const companyName = profile?.companyName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Client';
  const isFreelancer = user?.role === 'freelancer';
  const isOwner = user && (user._id === u._id || user._id === id);

  const filteredJobs = jobs.filter(j => {
    if (jobTab === 'open' || jobTab === 'active') return ['open', 'in-progress'].includes(j.status);
    if (jobTab === 'completed') return j.status === 'completed';
    return true;
  });

  const handleContact = async () => {
    if (!user) { navigate('/login'); return; }
    
    const targetId = u._id || id;
    
    if (isFreelancer && targetId) {
      try {
        await messagesAPI.startConversation(targetId, `Hi ${u.firstName || 'there'}, I'd like to discuss a project with you.`);
        navigate('/freelancer/messages');
        return;
      } catch {
        // Fall through
      }
    }
    
    navigate(isFreelancer ? '/freelancer/messages' : '/client/messages');
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pub-cl-page pub-cl-page--loading pub-cl-centered">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="pub-cl-spinner" style={{ width: '60px', height: '60px', color: 'white', margin: 0 }} />
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
        <div className="pub-cl-page pub-cl-page--loading pub-cl-centered">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pub-cl-error-card">
            <div className="pub-cl-error-icon-bg"><Search size={32} /></div>
            <h2>Client Not Found</h2>
            <p>This profile doesn't exist or is no longer available in our directory.</p>
            <Link to="/browse-projects" className="pub-cl-btn pub-cl-btn-primary">Browse Projects</Link>
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
        <div className="pub-cl-page pub-cl-centered">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pub-cl-error-card">
            <div className="pub-cl-error-icon-bg pub-cl-error-icon-bg-red"><AlertCircle size={32} /></div>
            <h2>Couldn't load profile</h2>
            <p>{error}</p>
            <button className="pub-cl-btn pub-cl-btn-primary" onClick={() => navigate(0)}>Try Again</button>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="pub-cl-page">
        <div className="pub-cl-bg-blob pub-cl-bg-blob-1"></div>
        <div className="pub-cl-bg-blob pub-cl-bg-blob-2"></div>
        
        <div className="container pub-cl-container">
          
          {/* Hero Section */}
          <motion.div 
            className="pub-cl-hero-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="pub-cl-hero-banner" style={{ background: profile.coverPhoto ? `url(${profile.coverPhoto}) center/cover no-repeat` : 'var(--color-primary, #042E4C)' }}>
              <div className="pub-cl-hero-overlay"></div>
              
              {u.isEmailVerified && (
                <div className="pub-cl-verified-badge" title="Verified Client">
                  <CheckCircle size={14} strokeWidth={2.5} />
                  <span>Verified</span>
                </div>
              )}

              {isOwner && (
                <button 
                  className="pfp-edit-cover-btn"
                  onClick={() => navigate('/client/profile')}
                >
                  <Camera size={16} />
                  <span>Update Cover</span>
                </button>
              )}
            </div>
            
            <div className="pub-cl-hero-content">
              <div className="pub-cl-avatar-wrapper" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-end' }}>
                {profile.companyLogo && (
                  <div className="pub-cl-avatar" style={{ position: 'relative' }} title="Company Logo">
                    <img src={profile.companyLogo} alt={companyName} />
                  </div>
                )}
                
                {u.profilePicture && (
                  <div className="pub-cl-avatar" style={{ position: 'relative' }} title="Profile Picture">
                    <img src={u.profilePicture} alt={companyName} />
                  </div>
                )}
                
                {!profile.companyLogo && !u.profilePicture && (
                  <div className="pub-cl-avatar" style={{ position: 'relative' }}>
                    <span>{companyName?.[0]?.toUpperCase() || 'C'}</span>
                  </div>
                )}
              </div>
              
              <div className="pub-cl-hero-main">
                <div className="pub-cl-hero-header">
                  <h1 className="pub-cl-name">{companyName}</h1>
                  <p className="pub-cl-title">{profile.industryType?.[0] || profile.industry?.[0] || 'Client'}</p>
                </div>
                
                <div className="pub-cl-meta-tags">
                  <div className="pub-cl-meta-tag">
                    <Briefcase size={16} />
                    <span>{jobs.length || profile.totalProjectsPosted || 0} Projects Posted</span>
                  </div>
                  <div className="pub-cl-meta-tag">
                    <MapPin size={16} />
                    <span>{[profile.location?.city, profile.location?.country].filter(Boolean).join(', ') || profile.timezone || 'Global'}</span>
                  </div>
                  {profile.companyType && (
                    <div className="pub-cl-meta-tag" style={{ background: '#e0f2fe', borderColor: '#bae6fd', color: '#0369a1' }}>
                      <Building2 size={16} />
                      <span>{profile.companyType}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pub-cl-hero-actions">
                {!isOwner ? (
                  <button 
                    className="pub-cl-btn pub-cl-btn-primary" 
                    onClick={handleContact}
                  >
                    <MessageSquare size={16} /> Contact Client
                  </button>
                ) : (
                  <button 
                    className="pub-cl-btn pub-cl-btn-primary" 
                    onClick={() => navigate('/client/profile')}
                  >
                    <FileEdit size={16} /> Edit Profile
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Overview Banner */}
          <motion.div 
            className="pub-cl-stats-banner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="pub-cl-stat-item">
              <div className="pub-cl-stat-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                <Briefcase size={18} />
              </div>
              <div>
                <div className="pub-cl-stat-num">{jobs.length || profile.totalProjectsPosted || 0}</div>
                <div className="pub-cl-stat-lbl">Projects Posted</div>
              </div>
            </div>
            <div className="pub-cl-stat-item">
              <div className="pub-cl-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Star size={18} />
              </div>
              <div>
                <div className="pub-cl-stat-num">Rs. {(profile.totalSpent || 0).toLocaleString()}</div>
                <div className="pub-cl-stat-lbl">Total Spent</div>
              </div>
            </div>
            <div className="pub-cl-stat-item">
              <div className="pub-cl-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                <Clock size={18} />
              </div>
              <div>
                <div className="pub-cl-stat-num" style={{ textTransform: 'capitalize' }}>{profile.hiringFrequency || 'Regular'}</div>
                <div className="pub-cl-stat-lbl">Hiring Frequency</div>
              </div>
            </div>
            <div className="pub-cl-stat-item">
              <div className="pub-cl-stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="pub-cl-stat-num">{profile.verificationStatus === 'verified' || u.isEmailVerified ? 'Verified' : 'Active'}</div>
                <div className="pub-cl-stat-lbl">Account Status</div>
              </div>
            </div>
            <div className="pub-cl-stat-item">
              <div className="pub-cl-stat-icon" style={{ background: '#fff1f2', color: '#e11d48' }}>
                <CheckCircle size={18} />
              </div>
              <div>
                <div className="pub-cl-stat-num">{new Date(profile.createdAt || u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                <div className="pub-cl-stat-lbl">Member Since</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="pub-cl-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Left Column (Main Content) */}
            <div className="pub-cl-col-main">
              
              {/* About Company */}
              <motion.section className="pub-cl-card" variants={itemVariants}>
                <div className="pub-cl-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="pub-cl-section-title">
                    <Building2 size={18} /> About {profile.companyName || 'the Company'}
                  </h3>
                  {profile.role && (
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '10px' }}>
                      Role: {profile.role}
                    </span>
                  )}
                </div>
                <div className="pub-cl-card-body pub-cl-about-text">
                  {profile.description ? (
                    <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{profile.description}</p>
                  ) : (
                    <p className="pub-cl-empty">No detailed company bio provided yet.</p>
                  )}

                  {/* Services Needed */}
                  {Array.isArray(profile.services) && profile.services.length > 0 && (
                    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                      <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.45rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Services Typically Hired
                      </h4>
                      <div className="pub-cl-skills-cloud">
                        {profile.services.map((s, i) => (
                          <span key={i} className="pub-cl-skill-tag">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tech Stack */}
                  {Array.isArray(profile.techStack) && profile.techStack.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', margin: '0 0 0.45rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Preferred Tech Stack
                      </h4>
                      <div className="pub-cl-skills-cloud">
                        {profile.techStack.map((s, i) => (
                          <span key={i} className="pub-cl-skill-tag" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Projects & Job Postings */}
              <motion.section className="pub-cl-card" variants={itemVariants}>
                <div className="pub-cl-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 className="pub-cl-section-title">
                    <Briefcase size={18} /> Projects & Job Postings ({jobs.length})
                  </h3>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[
                      { id: 'all', label: `All (${jobs.length})` },
                      { id: 'open', label: `Active (${jobs.filter(j => ['open', 'in-progress'].includes(j.status)).length})` },
                      { id: 'completed', label: `Completed (${jobs.filter(j => j.status === 'completed').length})` }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setJobTab(tab.id)}
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '16px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: jobTab === tab.id ? 'var(--color-primary)' : '#e2e8f0',
                          background: jobTab === tab.id ? 'var(--color-primary)' : '#ffffff',
                          color: jobTab === tab.id ? '#ffffff' : '#64748b',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pub-cl-card-body">
                  {filteredJobs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {filteredJobs.map((job) => (
                        <Link 
                          to={`/jobs/${job._id}`} 
                          key={job._id} 
                          className="pub-cl-job-card-rich"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.4rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 650, letterSpacing: '-0.01em' }}>
                              {job.title}
                            </h4>
                            <span className={`pub-cl-badge-status pub-cl-badge-${job.status}`}>
                              {job.status === 'open' ? '🟢 Active' : job.status === 'completed' ? '✓ Completed' : job.status === 'in-progress' ? '⏳ In Progress' : job.status}
                            </span>
                          </div>
                          {job.description && (
                            <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {job.description}
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', fontSize: '0.8rem', color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 650, fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                                {job.budget?.type === 'fixed'
                                  ? `Fixed: Rs. ${(job.budget.min || 0).toLocaleString()} - ${(job.budget.max || 0).toLocaleString()}`
                                  : `Hourly: Rs. ${job.budget?.min || 0}/hr`}
                              </span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{job.category || 'General'}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, fontSize: '0.76rem', color: '#059669', background: '#ecfdf5', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #d1fae5' }}>
                                <Send size={11} /> {job.proposalsCount || 0} Proposals
                              </span>
                            </div>
                            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pub-cl-empty-state" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                      <Briefcase size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>No {jobTab !== 'all' ? jobTab : ''} job postings found.</p>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Reviews from Freelancers Section */}
              <ReviewSection
                targetUserId={u._id || id}
                targetName={companyName}
                initialReviews={reviews}
                title="Reviews from Freelancers"
                onRatingUpdated={(updated) => {
                  setReviews(updated);
                  if (updated.length > 0) {
                    const sum = updated.reduce((acc, r) => acc + (r.rating || 0), 0);
                    setProfile(prev => prev ? ({ ...prev, rating: Number((sum / updated.length).toFixed(1)) }) : prev);
                  }
                }}
              />
            </div>

            {/* Right Column (Sidebar) */}
            <div className="pub-cl-col-sidebar" ref={sidebarRef}>
              {/* Company Info */}
              <motion.section className="pub-cl-card" variants={itemVariants}>
                <div className="pub-cl-card-header">
                  <h3 className="pub-cl-section-title">
                    <Building2 size={18} /> Company Information
                  </h3>
                </div>
                <div className="pub-cl-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {profile.companyType && (
                    <div className="pub-cl-info-row">
                      <div className="pub-cl-info-icon"><Building2 size={16} /></div>
                      <div className="pub-cl-info-content">
                        <div className="pub-cl-info-label">Organization Type</div>
                        <div className="pub-cl-info-value">{profile.companyType}</div>
                      </div>
                    </div>
                  )}

                  {profile.industry?.length > 0 && (
                    <div className="pub-cl-info-row">
                      <div className="pub-cl-info-icon"><Tag size={16} /></div>
                      <div className="pub-cl-info-content">
                        <div className="pub-cl-info-label">Industry</div>
                        <div className="pub-cl-info-value">{profile.industry.join(', ')}</div>
                      </div>
                    </div>
                  )}

                  {profile.companySize && (
                    <div className="pub-cl-info-row">
                      <div className="pub-cl-info-icon"><Briefcase size={16} /></div>
                      <div className="pub-cl-info-content">
                        <div className="pub-cl-info-label">Company Size</div>
                        <div className="pub-cl-info-value">{profile.companySize} Employees</div>
                      </div>
                    </div>
                  )}

                  {(profile.location?.country || profile.location?.city || profile.timezone) && (
                    <div className="pub-cl-info-row">
                      <div className="pub-cl-info-icon"><MapPin size={16} /></div>
                      <div className="pub-cl-info-content">
                        <div className="pub-cl-info-label">Base Location</div>
                        <div className="pub-cl-info-value">
                          {[profile.location?.city, profile.location?.country].filter(Boolean).join(', ') || profile.timezone}
                          {profile.timezone && profile.location?.country && (
                            <div className="pub-cl-info-sub">{profile.timezone}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.website && (
                    <div className="pub-cl-info-row">
                      <div className="pub-cl-info-icon"><Globe size={16} /></div>
                      <div className="pub-cl-info-content">
                        <div className="pub-cl-info-label">Website</div>
                        <a 
                          href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="pub-cl-info-link"
                        >
                          {profile.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Languages Spoken */}
              {Array.isArray(profile.languages) && profile.languages.length > 0 && (
                <motion.section className="pub-cl-card" variants={itemVariants}>
                  <div className="pub-cl-card-header">
                    <h3 className="pub-cl-section-title">
                      <Globe size={18} /> Languages
                    </h3>
                  </div>
                  <div className="pub-cl-card-body">
                    <ul className="pub-cl-lang-list">
                      {profile.languages.map((l, i) => (
                        <li key={i}>
                          <span className="pub-cl-lang-name">{typeof l.language === 'object' ? l.language?.name : l.language}</span>
                          <span className="pub-cl-lang-level">{l.proficiency}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.section>
              )}

              {/* On The Web & Social Profiles */}
              {(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.twitter || profile.socialLinks?.website) && (
                <motion.section className="pub-cl-card" variants={itemVariants}>
                  <div className="pub-cl-card-header">
                    <h3 className="pub-cl-section-title">On The Web</h3>
                  </div>
                  <div className="pub-cl-card-body">
                    <div className="pub-cl-links-list">
                      {profile.socialLinks?.github && (
                        <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="pub-cl-web-link">
                          <div className="pub-cl-link-icon-wrap"><Github size={18} /></div>
                          <span>GitHub</span>
                          <ChevronRight size={16} className="pub-cl-link-arrow" />
                        </a>
                      )}
                      {profile.socialLinks?.linkedin && (
                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="pub-cl-web-link">
                          <div className="pub-cl-link-icon-wrap pub-cl-linkedin"><Linkedin size={18} /></div>
                          <span>LinkedIn</span>
                          <ChevronRight size={16} className="pub-cl-link-arrow" />
                        </a>
                      )}
                      {profile.socialLinks?.twitter && (
                        <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="pub-cl-web-link">
                          <div className="pub-cl-link-icon-wrap pub-cl-twitter"><Twitter size={18} /></div>
                          <span>Twitter</span>
                          <ChevronRight size={16} className="pub-cl-link-arrow" />
                        </a>
                      )}
                      {profile.socialLinks?.website && (
                        <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="pub-cl-web-link">
                          <div className="pub-cl-link-icon-wrap pub-cl-website"><Globe size={18} /></div>
                          <span>Company Website</span>
                          <ChevronRight size={16} className="pub-cl-link-arrow" />
                        </a>
                      )}
                    </div>
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
