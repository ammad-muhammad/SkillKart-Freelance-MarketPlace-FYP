import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Star, Briefcase, ExternalLink, MessageSquare, 
  AlertCircle, Search, Loader2, Building2, Globe, FileEdit, Camera, CheckCircle,
  Github, Linkedin, Twitter, ChevronRight
} from 'lucide-react';

import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
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
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    document.title = 'Client Profile — SkillKart';

    Promise.all([
      clientsAPI.getPublicById(id),
      jobsAPI.listJobs({ clientId: id }).catch(() => ({ data: { data: [] } }))
    ])
      .then(([resProfile, resJobs]) => {
        if (!active) return;
        const p = resProfile.data?.data?.profile;
        const j = resJobs.data?.data || [];
        if (!p) { setError('notfound'); return; }
        setProfile(p);
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
              <div className="pub-cl-avatar-wrapper" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
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
                  <p className="pub-cl-title">{profile.industryType?.[0] || 'Client'}</p>
                </div>
                
                <div className="pub-cl-meta-tags">
                  <div className="pub-cl-meta-tag">
                    <Briefcase size={16} />
                    <span>{profile.totalProjectsPosted || 0} Projects Posted</span>
                  </div>
                  <div className="pub-cl-meta-tag">
                    <MapPin size={16} />
                    <span>{profile.location?.country || profile.timezone || 'Global'}</span>
                  </div>
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

          <motion.div 
            className="pub-cl-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Left Column */}
            <div className="pub-cl-col-main">
              
              <motion.section className="pub-cl-card pub-cl-card-glass" variants={itemVariants}>
                <div className="pub-cl-card-header">
                  <h3 className="pub-cl-section-title">About the Company</h3>
                </div>
                <div className="pub-cl-card-body pub-cl-about-text">
                  {profile.description ? (
                    <p>{profile.description}</p>
                  ) : (
                    <p className="pub-cl-empty">No description provided yet.</p>
                  )}
                </div>
              </motion.section>

              {Array.isArray(profile.services) && profile.services.length > 0 && (
                <motion.section className="pub-cl-card pub-cl-card-glass" variants={itemVariants}>
                  <div className="pub-cl-card-header">
                    <h3 className="pub-cl-section-title">Services Needed</h3>
                  </div>
                  <div className="pub-cl-card-body">
                    <div className="pub-cl-skills-cloud">
                      {profile.services.map((s, i) => (
                        <span key={i} className="pub-cl-skill-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {Array.isArray(profile.techStack) && profile.techStack.length > 0 && (
                <motion.section className="pub-cl-card pub-cl-card-glass" variants={itemVariants}>
                  <div className="pub-cl-card-header">
                    <h3 className="pub-cl-section-title">Tech Stack</h3>
                  </div>
                  <div className="pub-cl-card-body">
                    <div className="pub-cl-skills-cloud">
                      {profile.techStack.map((s, i) => (
                        <span key={i} className="pub-cl-skill-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              <motion.section className="pub-cl-card" variants={itemVariants}>
                <div className="pub-cl-card-header">
                  <h3 className="pub-cl-section-title">Active Job Postings</h3>
                </div>
                <div className="pub-cl-card-body">
                  {jobs.length > 0 ? (
                    <div className="pub-cl-portfolio-grid">
                      {jobs.map((job) => (
                        <Link to={`/jobs/${job._id}`} key={job._id} className="pub-cl-job-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                          <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', height: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#0f172a' }}>{job.title}</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                              {job.budget?.type === 'fixed'
                                ? `Fixed: Rs. ${job.budget.min} - ${job.budget.max}`
                                : `Hourly: Rs. ${job.budget?.min} - ${job.budget?.max}/hr`}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pub-cl-empty-state">
                      <Briefcase size={32} />
                      <p>No active job postings right now.</p>
                    </div>
                  )}
                </div>
              </motion.section>

            </div>

            {/* Right Column */}
            <div className="pub-cl-col-sidebar">
              <motion.div className="pub-cl-card pub-cl-stats-card" variants={itemVariants}>
                <div className="pub-cl-card-header">
                  <h3 className="pub-cl-section-title">Client Stats</h3>
                </div>
                <div className="pub-cl-card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                      <Star size={18} color="#64748b" /> 
                      <span style={{ color: '#334155' }}><strong>Total Spent:</strong> Rs. {(profile.totalSpent || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                      <Briefcase size={18} color="#64748b" /> 
                      <span style={{ color: '#334155' }}><strong>Projects Posted:</strong> {profile.totalProjectsPosted || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                      <AlertCircle size={18} color="#64748b" /> 
                      <span style={{ color: '#334155', textTransform: 'capitalize' }}><strong>Hiring Frequency:</strong> {profile.hiringFrequency || 'Not specified'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                      <CheckCircle size={18} color="#64748b" /> 
                      <span style={{ color: '#334155' }}><strong>Member Since:</strong> {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {(profile.industry?.length > 0 || profile.companySize || profile.website) && (
                <motion.div className="pub-cl-card" variants={itemVariants}>
                  <div className="pub-cl-card-header">
                    <h3 className="pub-cl-section-title">Company Info</h3>
                  </div>
                  <div className="pub-cl-card-body">
                    <div className="pub-cl-skills-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {profile.industry?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                          <Building2 size={18} color="#64748b" /> 
                          <span style={{ color: '#334155' }}><strong>Industry:</strong> {profile.industry.join(', ')}</span>
                        </div>
                      )}
                      {profile.companySize && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                          <Briefcase size={18} color="#64748b" /> 
                          <span style={{ color: '#334155' }}><strong>Company Size:</strong> {profile.companySize} Employees</span>
                        </div>
                      )}
                      {profile.website && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                          <Globe size={18} color="#64748b" /> 
                          <span style={{ color: '#334155' }}>
                            <strong>Website:</strong>{' '}
                            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                              {profile.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} style={{ display: 'inline', marginLeft: 4 }} />
                            </a>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {Array.isArray(profile.languages) && profile.languages.length > 0 && (
                <motion.div className="pub-cl-card" variants={itemVariants}>
                  <div className="pub-cl-card-header">
                    <h3 className="pub-cl-section-title">Languages</h3>
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
                </motion.div>
              )}

              {(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.twitter || profile.socialLinks?.website) && (
                <motion.div className="pub-cl-card" variants={itemVariants}>
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
                          <span>Website</span>
                          <ChevronRight size={16} className="pub-cl-link-arrow" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
