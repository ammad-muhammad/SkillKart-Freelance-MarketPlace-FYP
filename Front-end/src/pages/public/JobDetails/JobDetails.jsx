import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jobsAPI } from '../../../api/jobs';
import { proposalsAPI } from '../../../api/proposals';
import { useAuth } from '../../../hooks/useAuth';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { 
  Clock, DollarSign, Tag, Briefcase, ChevronLeft, 
  Send, AlertCircle, CheckCircle2, User, Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import './JobDetails.css';

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [proposalData, setProposalData] = useState({
    coverLetter: '',
    proposedRate: '',
    estimatedDuration: '1-2 weeks',
    attachments: []
  });

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await jobsAPI.getJobById(id);
      setJob(res.data.data.job);
      setProposalData(prev => ({ ...prev, proposedRate: res.data.data.job.budget?.min || '' }));
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

    setSubmitting(true);
    try {
      await proposalsAPI.submitProposal({
        jobId: id,
        ...proposalData
      });
      toast.success('Proposal submitted successfully! 🚀');
      setShowApplyModal(false);
      // Send the freelancer to their applications so they can track status.
      navigate('/freelancer/proposals');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit proposal.';
      toast.error(msg);
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
                <div className="jd-header__top">
                  <span className="jd-category">{job.category}</span>
                  <span className="jd-posted">Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
                <h1 className="jd-title">{job.title}</h1>
                <div className="jd-meta">
                  <div className="jd-meta__item">
                    <DollarSign size={18} />
                    <span>
                      {job.budget?.type === 'fixed' 
                        ? `$${job.budget?.min} - $${job.budget?.max} Fixed` 
                        : `$${job.budget?.min}/hr Hourly`}
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
                    <div className="jd-client__meta">Client · ⭐ 4.8</div>
                  </div>
                </div>
                <div className="jd-client__stats">
                  <div className="jd-client__stat">
                    <span>Verified ✓</span>
                    <label>Payment Method</label>
                  </div>
                  <div className="jd-client__stat">
                    <span>12</span>
                    <label>Jobs Posted</label>
                  </div>
                </div>
              </div>

              <div className="jd-sidebar__card jd-apply">
                <button 
                  className="jd-apply__btn"
                  onClick={handleApplyClick}
                  disabled={job.status !== 'open'}
                >
                  {job.status === 'open' ? 'Apply Now' : 'Job Closed'}
                </button>
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
              <div className="jd-form-group">
                <label>Proposed Rate ($)</label>
                <div className="jd-input-icon">
                  <DollarSign size={16} />
                  <input 
                    type="number" 
                    required 
                    value={proposalData.proposedRate}
                    onChange={e => setProposalData({ ...proposalData, proposedRate: e.target.value })}
                  />
                </div>
              </div>

              <div className="jd-form-group">
                <label>Estimated Duration</label>
                <select 
                  value={proposalData.estimatedDuration}
                  onChange={e => setProposalData({ ...proposalData, estimatedDuration: e.target.value })}
                >
                  <option>Less than 1 week</option>
                  <option>1-2 weeks</option>
                  <option>1 month</option>
                  <option>3+ months</option>
                </select>
              </div>

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
                  placeholder="Introduce yourself and explain why you're a good fit for this project... or tap ✨ Help me write."
                  rows={6}
                  value={proposalData.coverLetter}
                  onChange={e => setProposalData({ ...proposalData, coverLetter: e.target.value })}
                />
                <span className="jd-char-count">{proposalData.coverLetter.length} / 2000</span>
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
