import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jobsAPI } from '../../../api/jobs';
import { proposalsAPI } from '../../../api/proposals';
import { useAuth } from '../../../hooks/useAuth';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { 
  Clock, DollarSign, Tag, Briefcase, ChevronLeft, 
  Send, AlertCircle, CheckCircle2, User, Calendar, Bookmark
} from 'lucide-react';
import { useFreelancer } from '../../../context/FreelancerContext';
import { toast } from 'react-toastify';
import './JobDetails.css';

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { savedProjects, toggleSavedProject } = useFreelancer();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [proposalData, setProposalData] = useState({
    coverLetter: '',
    fixedPrice: '',
    hourlyRate: '',
    estimatedDeliveryTime: '1-2 weeks',
    estimatedWeeklyHours: '',
    attachments: []
  });

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await jobsAPI.getJobById(id);
      setJob(res.data.data.job);
      const isHourly = res.data.data.job.budget?.type === 'hourly';
      setProposalData(prev => ({
        ...prev,
        hourlyRate: isHourly ? res.data.data.job.budget?.min || '' : '',
        fixedPrice: !isHourly ? res.data.data.job.budget?.min || '' : ''
      }));
    } catch (error) {
      console.error('Failed to fetch job:', error);
      toast.error('Job not found or error loading details.');
    } finally {
      setLoading(false);
    }
  };

  // Gate the Apply button BEFORE opening the modal so a logged-out user is sent
  // to login (and returned here after) instead of filling the form then bouncing.
  const handleApplyClick = () => {
    if (!user) {
      toast.info('Please log in as a freelancer to apply.');
      try { sessionStorage.setItem('postLoginRedirect', `/jobs/${id}`); } catch { /* non-fatal */ }
      navigate('/login');
      return;
    }
    if (user.role !== 'freelancer') {
      toast.warning('Only freelancers can apply for projects. Switch to a freelancer account to apply.');
      return;
    }
    if (!user.isOnBoardingCompleted) {
      toast.warning('You must complete your freelancer profile before applying to projects.');
      navigate('/freelancer/onboarding');
      return;
    }
    setShowApplyModal(true);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info('Please login as a freelancer to apply.');
      navigate('/login');
      return;
    }
    if (user.role !== 'freelancer') {
      toast.warning('Only freelancers can apply for projects.');
      return;
    }

    // Client-side validation mirroring the backend (coverLetter 100–2000,
    // proposedRate > 0) so the user gets immediate, specific feedback.
    const cover = proposalData.coverLetter.trim();
    if (cover.length < 100) {
      toast.error(`Cover letter must be at least 100 characters (currently ${cover.length}).`);
      return;
    }
    if (cover.length > 2000) {
      toast.error('Cover letter must be at most 2000 characters.');
      return;
    }
    const isHourly = job.budget?.type === 'hourly';
    
    if (isHourly) {
      const rate = Number(proposalData.hourlyRate);
      if (!rate || rate <= 0) {
        toast.error('Enter a valid hourly rate greater than 0.');
        return;
      }
      const hrs = Number(proposalData.estimatedWeeklyHours);
      if (!hrs || hrs <= 0 || hrs > 168) {
        toast.error('Enter a valid number of weekly hours (1-168).');
        return;
      }
    } else {
      const price = Number(proposalData.fixedPrice);
      if (!price || price <= 0) {
        toast.error('Enter a valid fixed price greater than 0.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        jobId: id,
        coverLetter: proposalData.coverLetter,
        attachments: proposalData.attachments
      };

      if (isHourly) {
        payload.hourlyRate = Number(proposalData.hourlyRate);
        payload.estimatedWeeklyHours = Number(proposalData.estimatedWeeklyHours);
      } else {
        payload.fixedPrice = Number(proposalData.fixedPrice);
        payload.estimatedDeliveryTime = proposalData.estimatedDeliveryTime;
      }

      await proposalsAPI.submitProposal(payload);
      toast.success('Proposal submitted successfully! 🚀');
      setShowApplyModal(false);
      // Send the freelancer to their applications so they can track status.
      navigate('/freelancer/proposals');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit proposal.';
      const gate = error.response?.data?.errors;
      // Skill-gating block (403): route the freelancer to the skill test.
      if (error.response?.status === 403 && gate?.skillTestRequired) {
        toast.error(msg);
        setShowApplyModal(false);
        // Route to the baseline skill test (covers their unverified profile
        // skills). A per-skill ?skill= test requires the skill already be on
        // their profile, so we avoid forcing it here.
        if (window.confirm('You must pass the skill test for this project’s required skills before applying. Take the test now?')) {
          navigate('/freelancer/skill-test');
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // AI assist: draft a personalised cover letter for this job.
  const handleDraft = async () => {
    if (!user || user.role !== 'freelancer') {
      toast.info('Log in as a freelancer to use AI assist.');
      return;
    }
    setDrafting(true);
    try {
      const { data } = await proposalsAPI.draftProposal(id);
      const draft = data?.data?.coverLetter;
      if (draft) {
        setProposalData(prev => ({ ...prev, coverLetter: draft }));
        toast.success('Draft ready — edit it to make it yours ✨');
      } else {
        toast.error('Could not generate a draft right now.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'AI assist is unavailable right now.');
    } finally {
      setDrafting(false);
    }
  };

  if (loading) return <div className="jd-loading">Loading project details...</div>;
  if (!job) return <div className="jd-error">Project not found.</div>;

  const isFreelancer = user?.role === 'freelancer';
  const hasApplied = job.proposals?.some(p => p.freelancerId?._id === user?._id);
  const isSaved = Array.isArray(savedProjects) && savedProjects.some(sj => (sj._id || sj) === job._id);

  const handleToggleSave = async () => {
    if (!user) {
      toast.info('Please log in as a freelancer to save jobs.');
      return navigate('/login');
    }
    if (!isFreelancer) return toast.warning('Only freelancers can save jobs.');
    await toggleSavedProject(job);
  };

  return (
    <>
      <Navbar />
      <div className="jd-page">
        <div className="container">
          <Link to="/browse-projects" className="jd-back">
            <ChevronLeft size={18} /> Back to Marketplace
          </Link>

          <div className="jd-layout">
            <main className="jd-main">
              <div className="jd-card jd-header">
                <div className="jd-header__top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <span className="jd-category">{job.category}</span>
                    <span className="jd-posted" style={{ marginLeft: '1rem', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                  {(!user || isFreelancer) && (
                    <button 
                      className={`fl-btn ${isSaved ? 'fl-btn--primary' : 'fl-btn--outline'}`} 
                      onClick={handleToggleSave}
                      style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                      title={isSaved ? 'Unsave Job' : 'Save Job'}
                    >
                      <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                      {isSaved ? 'Saved' : 'Save Job'}
                    </button>
                  )}
                </div>
                <h1 className="jd-title">{job.title}</h1>
                <div className="jd-meta">
                  <div className="jd-meta__item">
                    <DollarSign size={18} />
                    <span>
                      {job.budget?.type === 'fixed' 
                        ? (job.budget?.min === job.budget?.max ? `Rs. ${job.budget?.min} Fixed` : `Rs. ${job.budget?.min} - Rs. ${job.budget?.max} Fixed`)
                        : `Rs. ${job.budget?.min}/hr Hourly`}
                    </span>
                  </div>
                  <div className="jd-meta__item">
                    <Clock size={18} />
                    <span>{job.duration || 'Not specified'}</span>
                  </div>
                  <div className="jd-meta__item">
                    <Briefcase size={18} />
                    <span>{job.experienceLevel || 'Intermediate'}</span>
                  </div>
                </div>
              </div>

              <div className="jd-card jd-body">
                <h2 className="jd-section-title">Project Description</h2>
                <div className="jd-description">
                  {job.description}
                </div>

                <h2 className="jd-section-title">Required Skills</h2>
                <div className="jd-tags">
                  {job.skills?.map(skill => (
                    <span key={skill} className="jd-tag">{skill}</span>
                  ))}
                </div>

                {job.attachments?.length > 0 && (
                  <>
                    <h2 className="jd-section-title">Attachments</h2>
                    <div className="jd-attachments">
                      {job.attachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="jd-attachment">
                          📎 Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </main>

            <aside className="jd-sidebar">
              <div className="jd-sidebar__card jd-client">
                <h3 className="jd-sidebar__title">About the Client</h3>
                <div className="jd-client__info">
                  <div className="jd-client__avatar">
                    {job.clientId?.profilePicture ? (
                      <img src={job.clientId.profilePicture} alt="" />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div>
                    <div className="jd-client__name">{job.clientId?.firstName} {job.clientId?.lastName}</div>
                    <div className="jd-client__meta">
                      Client
                      {job.clientStats?.rating > 0 && <> · ⭐ {job.clientStats.rating.toFixed(1)}</>}
                    </div>
                  </div>
                </div>
                <div className="jd-client__stats">
                  <div className="jd-client__stat">
                    <span>{job.clientStats?.verified ? 'Verified ✓' : 'Unverified'}</span>
                    <label>Identity</label>
                  </div>
                  <div className="jd-client__stat">
                    <span>{job.clientStats?.jobsPosted ?? 0}</span>
                    <label>Jobs Posted</label>
                  </div>
                </div>
              </div>

              <div className="jd-sidebar__card jd-apply">
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button 
                    className={`jd-apply__btn ${hasApplied && job.status === 'open' ? 'jd-apply__btn--applied' : ''}`}
                    onClick={hasApplied ? undefined : handleApplyClick}
                    disabled={job.status !== 'open' || hasApplied}
                    style={{ flex: 1 }}
                  >
                    {job.status !== 'open' ? (
                      'Closed'
                    ) : hasApplied ? (
                      <><CheckCircle2 size={18} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'text-bottom' }}/> Applied</>
                    ) : (
                      'Apply Now'
                    )}
                  </button>
                </div>
                <p className="jd-apply__note">
                  {job.proposals?.length || 0} proposals already submitted.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="jd-modal-overlay">
          <div className="jd-modal">
            <div className="jd-modal__header">
              <h3>Submit Proposal</h3>
              <button onClick={() => setShowApplyModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleApply} className="jd-modal__body">
              {job?.budget?.type === 'hourly' ? (
                <>
                  <div className="jd-form-group">
                    <label>Hourly Rate ($/hr)</label>
                    <div className="jd-input-icon">
                      <DollarSign size={16} />
                      <input 
                        type="number" 
                        required 
                        value={proposalData.hourlyRate}
                        onChange={e => setProposalData({ ...proposalData, hourlyRate: e.target.value })}
                        min="1"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="jd-form-group">
                    <label>Estimated Weekly Hours</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="e.g. 20"
                      value={proposalData.estimatedWeeklyHours}
                      onChange={e => setProposalData({ ...proposalData, estimatedWeeklyHours: e.target.value })}
                      min="1"
                      max="168"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="jd-form-group">
                    <label>Fixed Price ($)</label>
                    <div className="jd-input-icon">
                      <DollarSign size={16} />
                      <input 
                        type="number" 
                        required 
                        value={proposalData.fixedPrice}
                        onChange={e => setProposalData({ ...proposalData, fixedPrice: e.target.value })}
                        min="1"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="jd-form-group">
                    <label>Estimated Delivery Time</label>
                    <select 
                      value={proposalData.estimatedDeliveryTime}
                      onChange={e => setProposalData({ ...proposalData, estimatedDeliveryTime: e.target.value })}
                    >
                      <option>Less than 1 week</option>
                      <option>1-2 weeks</option>
                      <option>1 month</option>
                      <option>3+ months</option>
                    </select>
                  </div>
                </>
              )}

              <div className="jd-form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ margin: 0 }}>Cover Letter</label>
                  <button
                    type="button"
                    onClick={handleDraft}
                    disabled={drafting}
                    style={{
                      background: 'none', border: '1px solid #6366f1', color: '#4338ca',
                      borderRadius: '8px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700,
                      cursor: drafting ? 'wait' : 'pointer',
                    }}
                  >
                    {drafting ? '✨ Writing…' : '✨ Help me write'}
                  </button>
                </div>
                <textarea
                  required
                  maxLength={2000}
                  placeholder="Introduce yourself and explain why you're a good fit for this project... or tap ✨ Help me write."
                  rows={6}
                  value={proposalData.coverLetter}
                  onChange={e => setProposalData({ ...proposalData, coverLetter: e.target.value })}
                />
                <span
                  className="jd-char-count"
                  style={{ color: proposalData.coverLetter.trim().length < 100 ? '#ef4444' : '#16a34a' }}
                >
                  {proposalData.coverLetter.trim().length < 100
                    ? `${proposalData.coverLetter.trim().length} / 100 min`
                    : `${proposalData.coverLetter.length} / 2000`}
                </span>
              </div>

              <div className="jd-modal__footer">
                <button type="button" onClick={() => setShowApplyModal(false)} className="jd-btn--ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="jd-btn--primary">
                  {submitting ? 'Submitting...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
