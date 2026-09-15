import Loader from '../../../Components/common/Loader/Loader';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { jobsAPI } from '../../../api/jobs';
import { proposalsAPI } from '../../../api/proposals';
import { freelancersAPI } from '../../../api/freelancers';
import { useAuth } from '../../../hooks/useAuth';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import {
  Clock, Tag, Briefcase, ChevronLeft,
  Send, AlertCircle, CheckCircle2, User, Calendar, Bookmark, FileText, X, Edit2, RotateCcw
} from 'lucide-react';
import PkrIcon from '../../../Components/common/PkrIcon';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import ConfirmDialog from '../../../Components/common/ConfirmDialog/ConfirmDialog';
import BackButton from '../../../Components/common/BackButton/BackButton';
import { useFreelancer } from '../../../context/FreelancerContext';
import { safeToast as toast } from '../../../utils/safeToast';
import useFocusTrap from '../../../hooks/useFocusTrap';
import { isMobileApp } from '../../../utils/platform';
import './JobDetails.css';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];

// Per-extension accent color for the generic icon block (files we can't
// generate a real visual preview for — docx, txt, zip, etc.).
const FILE_COLORS = {
  pdf: '#dc2626',
  doc: '#2563eb', docx: '#2563eb',
  txt: '#64748b',
  xls: '#16a34a', xlsx: '#16a34a', csv: '#16a34a',
  ppt: '#ea580c', pptx: '#ea580c',
  zip: '#7c3aed', rar: '#7c3aed', '7z': '#7c3aed',
};

const getFileExt = (url = '') => {
  const clean = url.split('?')[0].split('#')[0];
  const last = clean.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  return dot > -1 ? last.slice(dot + 1).toLowerCase() : '';
};

// Cloudinary renders a PDF's first page as a JPG when the PDF was uploaded as
// an `image` resource (see Backend/src/services/upload.service.js) — inserting
// a transformation segment right after `/image/upload/` asks for that page-1
// thumbnail instead of the raw file. Older PDFs stored as a `raw` resource
// (pre-fix) have no `/image/upload/` segment, so this returns null for them
// and the card falls back to the generic icon below.
const pdfThumbUrl = (url) =>
  url.includes('/image/upload/')
    ? url.replace('/image/upload/', '/image/upload/w_300,h_360,c_fill,pg_1,f_jpg,q_auto/')
    : null;

function AttachmentCard({ url, index }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const ext = getFileExt(url);
  const isImage = IMAGE_EXTS.includes(ext);
  const pdfThumb = ext === 'pdf' ? pdfThumbUrl(url) : null;
  const thumbSrc = isImage ? url : pdfThumb;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="jd-attachment">
      <div className="jd-attachment__thumb">
        {thumbSrc && !thumbFailed ? (
          <img src={thumbSrc} alt="" loading="lazy" onError={() => setThumbFailed(true)} />
        ) : (
          <div className="jd-attachment__icon" style={{ '--file-color': FILE_COLORS[ext] || '#64748b' }}>
            <FileText size={28} />
            <span>{ext ? ext.toUpperCase() : 'FILE'}</span>
          </div>
        )}
      </div>
      <span className="jd-attachment__label">Attachment {index + 1}</span>
    </a>
  );
}

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { savedProjects, toggleSavedProject, profile, refreshProfile } = useFreelancer();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  // null = submitting a fresh proposal; set = editing/resubmitting this proposal id.
  const [editingProposalId, setEditingProposalId] = useState(null);
  const [resubmitMode, setResubmitMode] = useState(false);
  const [skillGateConfirm, setSkillGateConfirm] = useState(null); // { message, onConfirm } | null
  const applyModalRef = useRef(null);
  const closeApplyModal = useCallback(() => { if (!submitting) setShowApplyModal(false); }, [submitting]);
  useFocusTrap(applyModalRef, showApplyModal, closeApplyModal);
  const defaultProposalData = (jobDoc) => {
    const isHourly = jobDoc?.budget?.type === 'hourly';
    return {
      coverLetter: '',
      fixedPrice: !isHourly ? jobDoc?.budget?.min || '' : '',
      hourlyRate: isHourly ? jobDoc?.budget?.min || '' : '',
      estimatedDeliveryTime: '1-2 weeks',
      estimatedWeeklyHours: '',
      attachments: []
    };
  };
  const [proposalData, setProposalData] = useState({
    coverLetter: '',
    fixedPrice: '',
    hourlyRate: '',
    estimatedDeliveryTime: '1-2 weeks',
    estimatedWeeklyHours: '',
    attachments: []
  });

  const fetchSeq = useRef(0); // ignore a response if navigation to another job has since started
  const fetchJob = useCallback(async () => {
    const requestId = ++fetchSeq.current;
    setLoading(true);
    try {
      const res = await jobsAPI.getJobById(id);
      if (requestId !== fetchSeq.current) return; // a newer job fetch has since started — ignore this stale response
      setJob(res.data.data.job);
      setProposalData(defaultProposalData(res.data.data.job));
    } catch (error) {
      if (requestId !== fetchSeq.current) return;
      console.error('Failed to fetch job:', error);
      toast.error('Job not found or error loading details.');
    } finally {
      if (requestId === fetchSeq.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Reset any open edit/resubmit modal state when navigating to a DIFFERENT
  // job (e.g. via browser Back/Forward, which bypasses the modal's own close
  // handler) — otherwise a still-open modal keeps editingProposalId pointed
  // at the PREVIOUS job's proposal while proposalData gets reset to the new
  // job's defaults, so submitting would silently edit the wrong proposal
  // with the wrong content.
  useEffect(() => {
    setShowApplyModal(false);
    setEditingProposalId(null);
    setResubmitMode(false);
  }, [id]);

  useEffect(() => {
    document.title = job?.title ? `${job.title} – SkillKart` : 'Project Details – SkillKart';
  }, [job?.title]);

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
    setEditingProposalId(null);
    setResubmitMode(false);
    setProposalData(defaultProposalData(job));
    setShowApplyModal(true);
  };

  // Prefill the same modal with an existing proposal's values — used both to
  // edit a still-pending proposal and to edit+resubmit a rejected one the
  // client explicitly allowed to be revised.
  const openEditModal = (myProposal) => {
    setEditingProposalId(myProposal._id);
    setResubmitMode(myProposal.status === 'rejected');
    setProposalData({
      coverLetter: myProposal.coverLetter || '',
      fixedPrice: myProposal.fixedPrice ?? '',
      hourlyRate: myProposal.hourlyRate ?? '',
      estimatedDeliveryTime: myProposal.estimatedDeliveryTime || '1-2 weeks',
      estimatedWeeklyHours: myProposal.estimatedWeeklyHours ?? '',
      attachments: myProposal.attachments || []
    });
    setShowApplyModal(true);
  };

  // Coming back from a required skill test (see the skill-gate handling in
  // handleApply below) — reopen the Apply modal automatically instead of
  // dropping the freelancer back on the job page with another click to make.
  useEffect(() => {
    if (!job || searchParams.get('openApply') !== '1') return;
    handleApplyClick();
    // Strip the param so a refresh/back-nav doesn't reopen the modal again.
    const next = new URLSearchParams(searchParams);
    next.delete('openApply');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

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

      if (editingProposalId) {
        await proposalsAPI.updateProposal(editingProposalId, payload);
        toast.success(resubmitMode ? 'Proposal revised and resubmitted! 🚀' : 'Proposal updated.');
        setShowApplyModal(false);
        setEditingProposalId(null);
        setResubmitMode(false);
        await fetchJob(); // refresh myProposal so the sidebar button reflects the new state
      } else {
        await proposalsAPI.submitProposal(payload);
        toast.success('Proposal submitted successfully! 🚀');
        setShowApplyModal(false);
        // Send the freelancer to their applications so they can track status.
        navigate('/freelancer/proposals');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit proposal.';
      const gate = error.response?.data?.errors;
      // Skill-gating block (403): route the freelancer to the right skill test.
      if (error.response?.status === 403 && gate?.skillTestRequired) {
        setShowApplyModal(false);

        // A per-skill ?skill= test only works for a skill already listed on
        // the freelancer's profile (generateTest 400s otherwise). Find one of
        // the job's required skills (or its category) that's already on their
        // profile — verified or not — and send them straight to that test.
        const candidates = [...(gate.requiredSkills || []), gate.category].filter(Boolean);
        const myProfileSkillNames = (profile?.verifiedSkills || []).map((s) => s.name?.toLowerCase());
        const matchedSkill = candidates.find((c) => myProfileSkillNames.includes(c.toLowerCase()));

        if (matchedSkill) {
          toast.error(msg);
          // gate.requiredLevel ('entry'|'intermediate'|'expert') means the freelancer
          // already has this skill verified but not at a high enough level — retaking
          // for a better score is what unlocks it, same test/skill either way.
          const levelNote = gate.requiredLevel
            ? ` This project needs ${{ entry: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }[gate.requiredLevel]}-level verification.`
            : '';
          setSkillGateConfirm({
            message: `You must pass the skill test for "${matchedSkill}" before applying.${levelNote} Take the test now?`,
            onConfirm: () => {
              const returnTo = encodeURIComponent(`/jobs/${id}?openApply=1`);
              navigate(`/freelancer/skill-test?skill=${encodeURIComponent(matchedSkill)}&returnTo=${returnTo}`);
            },
          });
        } else if (candidates[0]) {
          // None of the required skills are on their profile at all — a test
          // can't be generated for a skill they don't have listed yet (that's
          // what caused the old loop: retaking a baseline test of unrelated
          // skills can never satisfy this gate). Add it to their profile
          // (unverified, same as any profile-edit skill add) and take them
          // straight to its test instead.
          const skillLabel = candidates[0];
          setSkillGateConfirm({
            message: `This project requires "${skillLabel}", which isn't on your profile yet. Add it now and take the skill test?`,
            onConfirm: async () => {
              try {
                const existingSkillNames = profile?.skills || [];
                await freelancersAPI.updateProfile({ skills: [...existingSkillNames, skillLabel] });
                await refreshProfile();
                const returnTo = encodeURIComponent(`/jobs/${id}?openApply=1`);
                navigate(`/freelancer/skill-test?skill=${encodeURIComponent(skillLabel)}&returnTo=${returnTo}`);
              } catch (addErr) {
                toast.error(addErr.response?.data?.message || 'Could not add the skill to your profile.');
              }
            },
          });
        } else {
          toast.error(msg);
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

  if (loading) return <Loader text="Loading project details..." fullScreen={true} />;
  if (!job) return <div className="jd-error">Project not found.</div>;

  const isClient = user?.role === 'client';
  const isFreelancer = user?.role === 'freelancer';
  const myProposal = job.myProposal;
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
          {isMobileApp() ? (
            <BackButton className="jd-back-btn" />
          ) : (
            <Link to="/browse-projects" className="jd-back">
              <ChevronLeft size={18} /> Back to Marketplace
            </Link>
          )}

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
                    <Tag size={18} />
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
                        <AttachmentCard key={i} url={url} index={i} />
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
                {isClient ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Link 
                      to={`/client/projects/${job._id || id}/proposals`} 
                      className="jd-apply__btn" 
                      style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <Send size={16} /> View Proposals ({job.proposalsCount || 0})
                    </Link>
                    <p className="jd-apply__note" style={{ textAlign: 'center', margin: 0 }}>
                      {job.proposalsCount || 0} proposal{job.proposalsCount === 1 ? '' : 's'} received for this project.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {job.status !== 'open' ? (
                        <button className="jd-apply__btn" disabled style={{ flex: 1 }}>Closed</button>
                      ) : !myProposal ? (
                        <button className="jd-apply__btn" onClick={handleApplyClick} style={{ flex: 1 }}>Apply Now</button>
                      ) : myProposal.status === 'pending' ? (
                        <button
                          className="jd-apply__btn"
                          onClick={() => openEditModal(myProposal)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        >
                          <Edit2 size={16} /> Edit Proposal
                        </button>
                      ) : myProposal.status === 'rejected' && myProposal.canResubmit ? (
                        <button
                          className="jd-apply__btn"
                          onClick={() => openEditModal(myProposal)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        >
                          <RotateCcw size={16} /> Edit & Resubmit
                        </button>
                      ) : (
                        <button className="jd-apply__btn jd-apply__btn--applied" disabled style={{ flex: 1 }}>
                          <CheckCircle2 size={18} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'text-bottom' }}/> Applied
                        </button>
                      )}
                    </div>
                    <p className="jd-apply__note">
                      {job.proposalsCount || 0} proposals already submitted.
                    </p>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="jd-modal-overlay">
          <div
            ref={applyModalRef}
            className="jd-modal"
            role="dialog"
            aria-modal="true"
            aria-label={editingProposalId ? (resubmitMode ? 'Edit & Resubmit Proposal' : 'Edit Proposal') : 'Submit Proposal'}
            tabIndex={-1}
          >
            <div className="jd-modal__header">
              <h3>{editingProposalId ? (resubmitMode ? 'Edit & Resubmit Proposal' : 'Edit Proposal') : 'Submit Proposal'}</h3>
              <button onClick={closeApplyModal} aria-label="Close" disabled={submitting}><X size={20} /></button>
            </div>
            <form onSubmit={handleApply} className="jd-modal__body">
              {job?.budget?.type === 'hourly' ? (
                <>
                  <div className="jd-form-group">
                    <label>Hourly Rate (Rs./hr)</label>
                    <div className="jd-input-icon">
                      <PkrIcon size={16} />
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
                    <div className="jd-input-icon">
                      <Clock size={16} />
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
                  </div>
                </>
              ) : (
                <>
                  <div className="jd-form-group">
                    <label>Fixed Price (PKR)</label>
                    <div className="jd-input-icon">
                      <PkrIcon size={16} />
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
                    <CustomSelect
                      value={proposalData.estimatedDeliveryTime}
                      onChange={val => setProposalData({ ...proposalData, estimatedDeliveryTime: val })}
                      options={['Less than 1 week', '1-2 weeks', '1 month', '3+ months']}
                    />
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
                <button type="button" onClick={closeApplyModal} disabled={submitting} className="jd-btn--ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="jd-btn--primary">
                  {submitting
                    ? (editingProposalId ? 'Saving...' : 'Submitting...')
                    : editingProposalId
                      ? (resubmitMode ? 'Resubmit Proposal' : 'Save Changes')
                      : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!skillGateConfirm}
        title="Skill verification required"
        message={skillGateConfirm?.message}
        confirmLabel="Take the test"
        danger={false}
        onConfirm={() => {
          const action = skillGateConfirm?.onConfirm;
          setSkillGateConfirm(null);
          action?.();
        }}
        onClose={() => setSkillGateConfirm(null)}
      />

      <Footer />
    </>
  );
}
