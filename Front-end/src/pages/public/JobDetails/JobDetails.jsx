import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock, Tag, Briefcase, ChevronRight, ArrowLeft, Send,
  AlertCircle, CheckCircle2, User, Calendar, Bookmark, FileText,
  X, Edit2, RotateCcw, MapPin, Building2, Globe, Mail,
  ExternalLink, Linkedin, Twitter, Share2, ShieldCheck, Sparkles,
  Download, ArrowRight, Check
} from 'lucide-react';
import Loader from '../../../Components/common/Loader/Loader';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import BackButton from '../../../Components/common/BackButton/BackButton';
import JobCard, { formatJobBudget } from '../../../Components/common/JobCard/JobCard';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import ConfirmDialog from '../../../Components/common/ConfirmDialog/ConfirmDialog';
import PkrIcon from '../../../Components/common/PkrIcon';
import Reveal from '../../freelancer/components/Reveal';
import { jobsAPI } from '../../../api/jobs';
import { proposalsAPI } from '../../../api/proposals';
import { freelancersAPI } from '../../../api/freelancers';
import { useAuth } from '../../../hooks/useAuth';
import { useFreelancer } from '../../../context/FreelancerContext';
import { safeToast as toast } from '../../../utils/safeToast';
import useFocusTrap from '../../../hooks/useFocusTrap';
import { isMobileApp } from '../../../utils/platform';
import { error as logError } from '../../../utils/logger';
import './JobDetails.css';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
const LEVEL_LABEL = { entry: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };

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

const getFileName = (url = '') => {
  const clean = url.split('?')[0].split('#')[0];
  const raw = clean.split('/').pop() || 'Attachment';
  return decodeURIComponent(raw);
};

const timeAgo = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  const units = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['min', 60]
  ];
  for (const [name, s] of units) {
    const v = Math.floor(secs / s);
    if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
};

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { savedProjects = [], toggleSavedProject, profile, refreshProfile } = useFreelancer() || {};
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [job, setJob] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState(null);
  const [resubmitMode, setResubmitMode] = useState(false);
  const [skillGateConfirm, setSkillGateConfirm] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const applyDrawerRef = useRef(null);
  const closeApplyModal = useCallback(() => {
    if (!submitting) setShowApplyModal(false);
  }, [submitting]);
  useFocusTrap(applyDrawerRef, showApplyModal, closeApplyModal);

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

  const fetchSeq = useRef(0);

  const fetchJob = useCallback(async () => {
    const requestId = ++fetchSeq.current;
    setLoading(true);
    try {
      const res = await jobsAPI.getJobById(id);
      if (requestId !== fetchSeq.current) return;
      const jobDoc = res.data.data.job;
      setJob(jobDoc);
      setProposalData(defaultProposalData(jobDoc));

      // Fetch 2-3 similar jobs in the same category
      if (jobDoc?.category) {
        jobsAPI.listJobs({ category: jobDoc.category, limit: 4, status: 'open' })
          .then(similarRes => {
            if (requestId !== fetchSeq.current) return;
            const items = (similarRes.data?.data || []).filter(j => (j._id || j.id) !== id).slice(0, 3);
            setSimilarJobs(items);
          })
          .catch(() => setSimilarJobs([]));
      }
    } catch (error) {
      if (requestId !== fetchSeq.current) return;
      console.error('Failed to fetch job:', error);
      toast.error('Job not found or error loading details.');
      setJob(null);
    } finally {
      if (requestId === fetchSeq.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    setShowApplyModal(false);
    setEditingProposalId(null);
    setResubmitMode(false);
    setDescExpanded(false);
  }, [id]);

  useEffect(() => {
    document.title = job?.title ? `${job.title} – SkillKart` : 'Project Details – SkillKart';
  }, [job?.title]);

  const buildSkillGateConfirm = (gate, actionLabel = 'apply') => {
    const gerund = actionLabel === 'resubmit' ? 'resubmitting' : 'applying';
    const candidates = [...(gate.requiredSkills || []), gate.category].filter(Boolean);
    const myProfileSkillNames = (profile?.verifiedSkills || []).map((s) => s.name?.toLowerCase());
    const matchedSkill = candidates.find((c) => myProfileSkillNames.includes(c.toLowerCase()));

    if (matchedSkill) {
      const levelNote = gate.requiredLevel
        ? ` This project needs ${LEVEL_LABEL[gate.requiredLevel] || gate.requiredLevel}-level verification.`
        : '';
      return {
        kind: 'matched',
        message: `You must pass the skill test for "${matchedSkill}" before ${gerund}.${levelNote} Take the test now?`,
        onConfirm: () => {
          const returnTo = encodeURIComponent(`/jobs/${id}?openApply=1`);
          navigate(`/freelancer/skill-test?skill=${encodeURIComponent(matchedSkill)}&returnTo=${returnTo}`);
        },
      };
    }
    if (candidates[0]) {
      const skillLabel = candidates[0];
      return {
        kind: 'new',
        message: `This project requires "${skillLabel}", which isn't on your profile yet. Add it now and take the skill test?`,
        onConfirm: async () => {
          try {
            const existingSkillNames = profile?.skills || [];
            await freelancersAPI.updateProfile({ skills: [...existingSkillNames, skillLabel] });
            await refreshProfile?.();
            const returnTo = encodeURIComponent(`/jobs/${id}?openApply=1`);
            navigate(`/freelancer/skill-test?skill=${encodeURIComponent(skillLabel)}&returnTo=${returnTo}`);
          } catch (addErr) {
            toast.error(addErr.response?.data?.message || 'Could not add the skill to your profile.');
          }
        },
      };
    }
    return null;
  };

  const skillGateFallbackMessage = (gate, actionLabel = 'apply') => {
    const label = LEVEL_LABEL[gate.requiredLevel];
    return label
      ? `This project requires ${label}-level verification in at least one of its required skills before you can ${actionLabel}.`
      : `You need to pass the skill test for this project’s required skills before you can ${actionLabel}. Verify at least one of them to continue.`;
  };

  const runEligibilityGate = async (actionLabel) => {
    setCheckingEligibility(true);
    try {
      const { data } = await proposalsAPI.checkEligibility(job._id || id);
      const gate = data?.data;
      if (gate && !gate.allowed) {
        const confirm = buildSkillGateConfirm(gate, actionLabel);
        if (confirm) setSkillGateConfirm(confirm);
        else toast.error(skillGateFallbackMessage(gate, actionLabel));
        return false;
      }
      return true;
    } catch (err) {
      logError('[JobDetails] eligibility precheck failed', err);
      return true;
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleApplyClick = async () => {
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

    const eligible = await runEligibilityGate('apply');
    if (!eligible) return;

    setEditingProposalId(null);
    setResubmitMode(false);
    setProposalData(defaultProposalData(job));
    setShowApplyModal(true);
  };

  const openEditModal = async (myProp) => {
    const isResubmit = myProp.status === 'rejected';
    if (isResubmit) {
      const eligible = await runEligibilityGate('resubmit');
      if (!eligible) return;
    }

    setEditingProposalId(myProp._id);
    setResubmitMode(isResubmit);
    setProposalData({
      coverLetter: myProp.coverLetter || '',
      fixedPrice: myProp.fixedPrice ?? '',
      hourlyRate: myProp.hourlyRate ?? '',
      estimatedDeliveryTime: myProp.estimatedDeliveryTime || '1-2 weeks',
      estimatedWeeklyHours: myProp.estimatedWeeklyHours ?? '',
      attachments: myProp.attachments || []
    });
    setShowApplyModal(true);
  };

  useEffect(() => {
    if (!job || searchParams.get('openApply') !== '1') return;
    handleApplyClick();
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
        await fetchJob();
      } else {
        await proposalsAPI.submitProposal(payload);
        toast.success('Proposal submitted successfully! 🚀');
        setShowApplyModal(false);
        navigate('/freelancer/proposals');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit proposal.';
      const gate = error.response?.data?.errors;
      if (error.response?.status === 403 && gate?.skillTestRequired) {
        setShowApplyModal(false);
        const actionLabel = editingProposalId ? 'resubmit' : 'apply';
        const confirm = buildSkillGateConfirm(gate, actionLabel);
        if (confirm) {
          if (confirm.kind === 'matched') toast.error(msg);
          setSkillGateConfirm(confirm);
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

  const handleToggleSave = async () => {
    if (!user) {
      toast.info('Please log in as a freelancer to save jobs.');
      return navigate('/login');
    }
    if (user.role !== 'freelancer') return toast.warning('Only freelancers can save jobs.');
    await toggleSavedProject?.(job);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Project link copied to clipboard! 📋');
    } else {
      toast.info('Copy this link from your browser bar to share.');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="jd-page">
          <div className="container jd-container">
            <Loader text="Loading project details..." fullScreen={false} />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Navbar />
        <div className="jd-page">
          <div className="container jd-container">
            <div className="jd-empty">
              <div className="jd-empty__icon">🔍</div>
              <h2>Project Not Found</h2>
              <p>This project may have been closed or removed by the client.</p>
              <Link to="/browse-projects" className="jd-btn jd-btn--primary" style={{ marginTop: '1rem' }}>
                Browse Available Projects
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const isClient = user?.role === 'client';
  const isFreelancer = user?.role === 'freelancer';
  const myProposal = job.myProposal;
  const isSaved = Array.isArray(savedProjects) && savedProjects.some(sj => (sj._id || sj.id || sj) === job._id);

  const clientObj = job.clientId || job.client || {};
  const clientName = clientObj.name ||
    (clientObj.firstName ? `${clientObj.firstName} ${clientObj.lastName || ''}`.trim() : null) ||
    job.clientName ||
    'Verified Client';
  const clientInitial = clientName.charAt(0).toUpperCase() || 'C';
  const clientAvatar = clientObj.profilePicture || clientObj.avatar || null;
  const isVerifiedClient = Boolean(clientObj.isEmailVerified || clientObj.verified || job.clientStats?.verified);
  const clientRating = job.clientStats?.rating || 0;
  const clientJobsCount = job.clientStats?.jobsPosted ?? null;

  const budgetDisplay = formatJobBudget(job.budget);
  const isHourly = job.budget?.type === 'hourly';
  const durationText = (job.duration || 'Flexible')
    .replace(/Less than 1 month/i, '< 1 month')
    .replace(/less than a month/i, '< 1 month');
  const levelText = LEVEL_LABEL[job.experienceLevel] || (job.experienceLevel ? job.experienceLevel.charAt(0).toUpperCase() + job.experienceLevel.slice(1) : 'Intermediate');
  const deadlineText = job.deadline ? new Date(job.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible';
  const matchScore = job.matchScore || job.matchPercentage || null;

  const description = job.description || '';
  const descParagraphs = description.split('\n\n').filter(Boolean);
  const isLongDesc = description.length > 550;

  return (
    <>
      <Navbar />
      <div className="jd-page">
        <div className="container jd-container">
          {/* Breadcrumb + Back pill */}
          <div className="jd-nav-strip">
            {isMobileApp() ? (
              <BackButton />
            ) : (
              <Link to="/browse-projects" className="jd-back-pill">
                <ArrowLeft size={15} />
                <span>All Projects</span>
              </Link>
            )}

            <div className="jd-breadcrumb">
              <Link to="/browse-projects">Projects</Link>
              <ChevronRight size={13} />
              <Link to={`/browse-projects?category=${encodeURIComponent(job.category || '')}`}>
                {job.category || 'General'}
              </Link>
              <ChevronRight size={13} />
              <span className="jd-breadcrumb__curr">{job.title}</span>
            </div>
          </div>

          {/* 12-Column Grid: LEFT col 8, RIGHT col 4 */}
          <div className="jd-grid">
            {/* =============================================================
                LEFT COLUMN (8 Cols): Flat sections on background
                ============================================================= */}
            <main className="jd-left-col">
              {/* 1. TITLE FIRST SECTION */}
              <section className="jd-section jd-title-section">
                <div className="jd-title-top">
                  <div className="jd-chips-row">
                    <span className="jd-cat-pill">{job.category || 'Freelance'}</span>
                    <span className={`jd-status-pill jd-status-pill--${job.status || 'open'}`}>
                      {job.status === 'open' ? '🟢 Open for Proposals' : job.status === 'in-progress' ? '⏳ In Progress' : 'Closed'}
                    </span>
                  </div>

                  {/* Save + Share Icon Buttons */}
                  <div className="jd-action-icons">
                    {(!user || isFreelancer) && (
                      <button
                        type="button"
                        className={`jd-icon-btn ${isSaved ? 'jd-icon-btn--saved' : ''}`}
                        onClick={handleToggleSave}
                        title={isSaved ? 'Remove from saved' : 'Save project'}
                        aria-label={isSaved ? 'Remove from saved' : 'Save project'}
                      >
                        <Bookmark size={18} fill={isSaved ? '#10B981' : 'none'} color={isSaved ? '#10B981' : '#64748B'} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="jd-icon-btn"
                      onClick={handleShare}
                      title="Share project"
                      aria-label="Share project"
                    >
                      <Share2 size={18} color="#64748B" />
                    </button>
                  </div>
                </div>

                <h1 className="jd-heading">{job.title}</h1>

                <div className="jd-meta-strip">
                  <span className="jd-meta-strip__item">
                    <Clock size={14} />
                    <span>Posted {timeAgo(job.createdAt)}</span>
                  </span>
                  <span className="jd-meta-strip__dot">•</span>
                  <span className="jd-meta-strip__item">
                    <Send size={14} />
                    <span>{job.proposalsCount || 0} {(job.proposalsCount === 1) ? 'Proposal' : 'Proposals'}</span>
                  </span>
                  {(job.clientDetails?.location || job.location) && (
                    <>
                      <span className="jd-meta-strip__dot">•</span>
                      <span className="jd-meta-strip__item">
                        <MapPin size={14} />
                        <span>{job.clientDetails?.location || job.location}</span>
                      </span>
                    </>
                  )}
                </div>
              </section>

              {/* 2. CLIENT ROW (No box, plain line layout) */}
              <section className="jd-section jd-client-strip">
                <div className="jd-client-strip__left">
                  <div className="jd-client-strip__avatar">
                    {clientAvatar ? (
                      <img src={clientAvatar} alt={clientName} />
                    ) : (
                      <span>{clientInitial}</span>
                    )}
                  </div>
                  <div className="jd-client-strip__info">
                    <div className="jd-client-strip__name-row">
                      <span className="jd-client-strip__name">{clientName}</span>
                      {isVerifiedClient && <CheckCircle2 size={16} color="#10B981" />}
                    </div>
                    <div className="jd-client-strip__sub">
                      {clientRating > 0 ? (
                        <span className="jd-client-strip__rating">⭐ {clientRating.toFixed(1)}</span>
                      ) : (
                        <span>New Client</span>
                      )}
                      {clientJobsCount !== null && (
                        <>
                          <span className="jd-meta-strip__dot">•</span>
                          <span>{clientJobsCount} project{clientJobsCount === 1 ? '' : 's'} posted</span>
                        </>
                      )}
                      {job.clientDetails?.memberSince && (
                        <>
                          <span className="jd-meta-strip__dot">•</span>
                          <span>Member since {new Date(job.clientDetails.memberSince).getFullYear()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {job.clientId?._id && (
                  <Link to={`/clients/${job.clientId._id}`} className="jd-client-strip__link">
                    <span>View Client Profile</span>
                    <ExternalLink size={13} />
                  </Link>
                )}
              </section>

              {/* 3. KEY FACTS STRIP (4 Plain Columns with Dividers) */}
              <section className="jd-section jd-facts-strip">
                <div className="jd-facts-col jd-facts-col--first">
                  <span className="jd-facts-label">BUDGET</span>
                  <span className="jd-facts-val">{budgetDisplay}</span>
                  <span className="jd-facts-sub">{isHourly ? 'Hourly Rate' : 'Fixed Price'}</span>
                </div>
                <div className="jd-facts-col">
                  <span className="jd-facts-label">PROJECT TYPE</span>
                  <span className="jd-facts-val">{isHourly ? 'Hourly Contract' : 'Fixed Milestone'}</span>
                  <span className="jd-facts-sub">{isHourly ? 'Tracked Weekly' : 'Single or Phased'}</span>
                </div>
                <div className="jd-facts-col">
                  <span className="jd-facts-label">DURATION</span>
                  <span className="jd-facts-val">{durationText}</span>
                  <span className="jd-facts-sub">Expected timeline</span>
                </div>
                <div className="jd-facts-col">
                  <span className="jd-facts-label">EXPERIENCE</span>
                  <span className="jd-facts-val">{levelText}</span>
                  <span className="jd-facts-sub">Required proficiency</span>
                </div>
              </section>

              {/* 4. PROJECT DESCRIPTION */}
              <section className="jd-section">
                <h2 className="jd-sec-heading">Project Description</h2>
                <div className={`jd-desc-content ${!descExpanded && isLongDesc ? 'jd-desc-content--clamped' : ''}`}>
                  {descParagraphs.length > 0 ? (
                    descParagraphs.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))
                  ) : (
                    <p>{description || 'No detailed description provided.'}</p>
                  )}
                </div>
                {isLongDesc && (
                  <button
                    type="button"
                    className="jd-read-more-btn"
                    onClick={() => setDescExpanded(!descExpanded)}
                  >
                    {descExpanded ? 'Read Less ↑' : 'Read More ↓'}
                  </button>
                )}
              </section>

              {/* 5. SKILLS REQUIRED */}
              {job.skills?.length > 0 && (
                <section className="jd-section">
                  <h2 className="jd-sec-heading">Skills Required</h2>
                  <div className="jd-skills-wrap">
                    {job.skills.map((skill) => (
                      <span key={skill} className="jd-skill-pill">
                        <Tag size={12} />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* 6. ATTACHMENTS / FILES (Only if exist) */}
              {job.attachments?.length > 0 && (
                <section className="jd-section">
                  <h2 className="jd-sec-heading">Attachments & Project Files</h2>
                  <div className="jd-files-list">
                    {job.attachments.map((url, i) => {
                      const ext = getFileExt(url);
                      const name = getFileName(url);
                      const color = FILE_COLORS[ext] || '#10B981';
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jd-file-row"
                        >
                          <div className="jd-file-row__icon" style={{ background: `${color}15`, color }}>
                            <FileText size={20} />
                          </div>
                          <div className="jd-file-row__info">
                            <span className="jd-file-row__name">{name}</span>
                            <span className="jd-file-row__ext">{ext ? ext.toUpperCase() : 'FILE'} Document</span>
                          </div>
                          <div className="jd-file-row__action">
                            <Download size={16} />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 7. MILESTONES (Only if exist) */}
              {Array.isArray(job.milestones) && job.milestones.length > 0 && (
                <section className="jd-section">
                  <h2 className="jd-sec-heading">Project Milestones</h2>
                  <div className="jd-milestones-timeline">
                    {job.milestones.map((ms, idx) => (
                      <div key={idx} className="jd-milestone-item">
                        <div className="jd-milestone-node">{idx + 1}</div>
                        <div className="jd-milestone-body">
                          <div className="jd-milestone-title">{ms.title || `Milestone ${idx + 1}`}</div>
                          <div className="jd-milestone-meta">
                            {ms.amount && <span>Rs. {ms.amount.toLocaleString()}</span>}
                            {ms.duration && <span>• {ms.duration}</span>}
                          </div>
                          {ms.description && <p className="jd-milestone-desc">{ms.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 8. ABOUT THE CLIENT (Extra details in plain stats) */}
              {job.clientDetails && (
                <section className="jd-section">
                  <h2 className="jd-sec-heading">About the Client</h2>
                  <div className="jd-client-stats-grid">
                    {job.clientDetails.companyName && (
                      <div className="jd-client-stat-box">
                        <span className="jd-client-stat-label">Company</span>
                        <span className="jd-client-stat-value">{job.clientDetails.companyName}</span>
                        {job.clientDetails.companyType && (
                          <span className="jd-client-stat-sub">{job.clientDetails.companyType}</span>
                        )}
                      </div>
                    )}
                    {(job.clientDetails.location || job.clientDetails.timezone) && (
                      <div className="jd-client-stat-box">
                        <span className="jd-client-stat-label">Location</span>
                        <span className="jd-client-stat-value">
                          {job.clientDetails.location || job.clientDetails.timezone}
                        </span>
                        {job.clientDetails.timezone && (
                          <span className="jd-client-stat-sub">{job.clientDetails.timezone}</span>
                        )}
                      </div>
                    )}
                    {job.clientDetails.hiringExperience && (
                      <div className="jd-client-stat-box">
                        <span className="jd-client-stat-label">Experience</span>
                        <span className="jd-client-stat-value">{job.clientDetails.hiringExperience}</span>
                        <span className="jd-client-stat-sub">Client hiring track record</span>
                      </div>
                    )}
                    {job.clientDetails.website && (
                      <div className="jd-client-stat-box">
                        <span className="jd-client-stat-label">Website</span>
                        <a
                          href={job.clientDetails.website.startsWith('http') ? job.clientDetails.website : `https://${job.clientDetails.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jd-client-stat-link"
                        >
                          <span>{job.clientDetails.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 9. SIMILAR PROJECTS (Shared JobCard) */}
              {similarJobs.length > 0 && (
                <section className="jd-section jd-similar-section">
                  <div className="jd-similar-head">
                    <h2 className="jd-sec-heading">Similar Projects in {job.category || 'This Category'}</h2>
                    <Link to={`/browse-projects?category=${encodeURIComponent(job.category || '')}`} className="jd-similar-view-all">
                      <span>View All</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="jd-similar-grid">
                    {similarJobs.map((simJob, idx) => (
                      <Reveal key={simJob._id || idx} delay={idx * 60}>
                        <JobCard
                          job={simJob}
                          variant="grid"
                          surfaceBg="var(--sk-bg-secondary, #F3F7F5)"
                        />
                      </Reveal>
                    ))}
                  </div>
                </section>
              )}
            </main>

            {/* =============================================================
                RIGHT COLUMN (4 Cols): Sticky Apply Panel
                ============================================================= */}
            <aside className="jd-right-col">
              <div className="jd-sticky-panel">
                <div className="jd-apply-card">
                  {/* Budget Big */}
                  <div className="jd-apply-card__budget-row">
                    <div>
                      <div className="jd-apply-card__budget-label">Total Budget</div>
                      <div className="jd-apply-card__budget-val">{budgetDisplay}</div>
                    </div>
                    <span className="jd-apply-card__type-pill">
                      {isHourly ? 'Hourly' : 'Fixed Price'}
                    </span>
                  </div>

                  <div className="jd-apply-card__posted-note">
                    <Clock size={13} />
                    <span>Posted {timeAgo(job.createdAt)}</span>
                  </div>

                  {/* Divider */}
                  <div className="jd-apply-card__divider" />

                  {/* Summary Rows with Icons */}
                  <div className="jd-apply-card__summary">
                    <div className="jd-summary-row">
                      <div className="jd-summary-row__left">
                        <Clock size={15} color="#10B981" />
                        <span>Duration</span>
                      </div>
                      <strong>{durationText}</strong>
                    </div>

                    <div className="jd-summary-row">
                      <div className="jd-summary-row__left">
                        <Briefcase size={15} color="#10B981" />
                        <span>Experience</span>
                      </div>
                      <strong>{levelText}</strong>
                    </div>

                    <div className="jd-summary-row">
                      <div className="jd-summary-row__left">
                        <Calendar size={15} color="#10B981" />
                        <span>Deadline</span>
                      </div>
                      <strong>{deadlineText}</strong>
                    </div>

                    <div className="jd-summary-row">
                      <div className="jd-summary-row__left">
                        <Send size={15} color="#10B981" />
                        <span>Proposals</span>
                      </div>
                      <strong>{job.proposalsCount || 0} submitted</strong>
                    </div>
                  </div>

                  {/* Skill Match Mini Bar (Only if match exists) */}
                  {matchScore != null && (
                    <div className="jd-match-box">
                      <div className="jd-match-box__header">
                        <span>Skill Match</span>
                        <strong>{matchScore}%</strong>
                      </div>
                      <div className="jd-match-box__track">
                        <div
                          className="jd-match-box__fill"
                          style={{ width: `${Math.min(100, Math.max(0, matchScore))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="jd-apply-card__actions">
                    {isClient ? (
                      <Link
                        to={`/client/projects/${job._id || id}/proposals`}
                        className="jd-primary-btn"
                      >
                        <Send size={16} />
                        <span>View Proposals ({job.proposalsCount || 0})</span>
                      </Link>
                    ) : job.status !== 'open' ? (
                      <button className="jd-primary-btn jd-primary-btn--disabled" disabled>
                        Project Closed
                      </button>
                    ) : !myProposal ? (
                      <button
                        className="jd-primary-btn"
                        onClick={handleApplyClick}
                        disabled={checkingEligibility}
                      >
                        <Send size={16} />
                        <span>{checkingEligibility ? 'Checking Eligibility…' : 'Submit Proposal'}</span>
                      </button>
                    ) : myProposal.status === 'pending' ? (
                      <div className="jd-proposal-status-block">
                        <div className="jd-proposal-pill jd-proposal-pill--pending">
                          <CheckCircle2 size={14} />
                          <span>Proposal Submitted</span>
                        </div>
                        <button
                          className="jd-secondary-btn"
                          onClick={() => openEditModal(myProposal)}
                        >
                          <Edit2 size={15} />
                          <span>Edit Proposal</span>
                        </button>
                      </div>
                    ) : myProposal.status === 'rejected' && myProposal.canResubmit ? (
                      <div className="jd-proposal-status-block">
                        <div className="jd-proposal-pill jd-proposal-pill--rejected">
                          <span>Revision Requested</span>
                        </div>
                        <button
                          className="jd-primary-btn"
                          onClick={() => openEditModal(myProposal)}
                          disabled={checkingEligibility}
                        >
                          <RotateCcw size={15} />
                          <span>{checkingEligibility ? 'Checking…' : 'Edit & Resubmit'}</span>
                        </button>
                      </div>
                    ) : (
                      <button className="jd-primary-btn jd-primary-btn--disabled" disabled>
                        <Check size={16} />
                        <span>Proposal Sent ({myProposal.status})</span>
                      </button>
                    )}

                    {(!user || isFreelancer) && (
                      <button
                        type="button"
                        className={`jd-save-btn ${isSaved ? 'jd-save-btn--active' : ''}`}
                        onClick={handleToggleSave}
                      >
                        <Bookmark size={15} fill={isSaved ? '#10B981' : 'none'} />
                        <span>{isSaved ? 'Saved in My Bookmarks' : 'Save Project for Later'}</span>
                      </button>
                    )}
                  </div>

                  {/* Trust Note */}
                  <div className="jd-trust-note">
                    <ShieldCheck size={16} color="#10B981" />
                    <span>SkillKart Escrow: Milestone payments are protected and released only upon your delivery approval.</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* =================================================================
            MOBILE FIXED BOTTOM BAR (Right offset 80px so Buddy AI stays free)
            ================================================================= */}
        <div className="jd-mobile-bar">
          <div className="jd-mobile-bar__inner">
            <div className="jd-mobile-bar__budget">
              <span className="label">{isHourly ? 'Hourly Rate' : 'Budget'}</span>
              <span className="value">{budgetDisplay}</span>
            </div>
            <div className="jd-mobile-bar__action">
              {isClient ? (
                <Link to={`/client/projects/${job._id || id}/proposals`} className="jd-mobile-apply-btn">
                  Proposals ({job.proposalsCount || 0})
                </Link>
              ) : job.status !== 'open' ? (
                <button className="jd-mobile-apply-btn" disabled>Closed</button>
              ) : !myProposal ? (
                <button className="jd-mobile-apply-btn" onClick={handleApplyClick} disabled={checkingEligibility}>
                  {checkingEligibility ? 'Checking…' : 'Apply Now'}
                </button>
              ) : myProposal.status === 'pending' ? (
                <button className="jd-mobile-apply-btn" onClick={() => openEditModal(myProposal)}>
                  Edit Proposal
                </button>
              ) : myProposal.status === 'rejected' && myProposal.canResubmit ? (
                <button className="jd-mobile-apply-btn" onClick={() => openEditModal(myProposal)}>
                  Resubmit
                </button>
              ) : (
                <button className="jd-mobile-apply-btn" disabled>Applied</button>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================
            PROPOSAL DRAWER (Desktop Right Drawer / Mobile Bottom Sheet)
            ================================================================= */}
        {showApplyModal && (
          <div className="jd-drawer-overlay" onClick={closeApplyModal}>
            <div
              ref={applyDrawerRef}
              className="jd-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={editingProposalId ? (resubmitMode ? 'Edit & Resubmit Proposal' : 'Edit Proposal') : 'Submit Proposal'}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="jd-drawer__header">
                <div>
                  <h3 className="jd-drawer__title">
                    {editingProposalId ? (resubmitMode ? 'Edit & Resubmit Proposal' : 'Edit Proposal') : 'Submit Proposal'}
                  </h3>
                  <p className="jd-drawer__subtitle">
                    Applying to: <strong>{job.title}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="jd-drawer__close"
                  onClick={closeApplyModal}
                  aria-label="Close"
                  disabled={submitting}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleApply} className="jd-drawer__form">
                <div className="jd-drawer__body">
                  {/* Budget Fields */}
                  {job?.budget?.type === 'hourly' ? (
                    <div className="jd-drawer__fields-row">
                      <div className="jd-form-field">
                        <label className="jd-form-label">
                          Hourly Rate (PKR/hr) <span className="req">*</span>
                        </label>
                        <div className="jd-input-affix-wrap">
                          <span className="jd-input-prefix">Rs.</span>
                          <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            placeholder="e.g. 1500"
                            className="jd-input-48"
                            value={proposalData.hourlyRate}
                            onChange={(e) => setProposalData({ ...proposalData, hourlyRate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="jd-form-field">
                        <label className="jd-form-label">
                          Estimated Weekly Hours <span className="req">*</span>
                        </label>
                        <div className="jd-input-affix-wrap">
                          <Clock size={16} className="jd-input-icon" />
                          <input
                            type="number"
                            required
                            min="1"
                            max="168"
                            placeholder="e.g. 20"
                            className="jd-input-48"
                            value={proposalData.estimatedWeeklyHours}
                            onChange={(e) => setProposalData({ ...proposalData, estimatedWeeklyHours: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="jd-drawer__fields-row">
                      <div className="jd-form-field">
                        <label className="jd-form-label">
                          Bid Amount (PKR) <span className="req">*</span>
                        </label>
                        <div className="jd-input-affix-wrap">
                          <span className="jd-input-prefix">Rs.</span>
                          <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            placeholder="e.g. 25000"
                            className="jd-input-48"
                            value={proposalData.fixedPrice}
                            onChange={(e) => setProposalData({ ...proposalData, fixedPrice: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="jd-form-field">
                        <label className="jd-form-label">
                          Estimated Delivery <span className="req">*</span>
                        </label>
                        <CustomSelect
                          value={proposalData.estimatedDeliveryTime}
                          onChange={(val) => setProposalData({ ...proposalData, estimatedDeliveryTime: val })}
                          options={['Less than 1 week', '1-2 weeks', '1 month', '3+ months']}
                        />
                      </div>
                    </div>
                  )}

                  {/* Cover Letter Field with AI assist chip */}
                  <div className="jd-form-field">
                    <div className="jd-form-label-row">
                      <label className="jd-form-label" style={{ margin: 0 }}>
                        Cover Letter <span className="req">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleDraft}
                        disabled={drafting}
                        className="jd-ai-draft-chip"
                      >
                        <Sparkles size={13} />
                        <span>{drafting ? 'Writing draft…' : '✨ Help me write'}</span>
                      </button>
                    </div>

                    <textarea
                      required
                      minLength={100}
                      maxLength={2000}
                      rows={7}
                      className="jd-textarea"
                      placeholder="Introduce yourself, outline your approach to the project deliverables, and explain why you're the best fit..."
                      value={proposalData.coverLetter}
                      onChange={(e) => setProposalData({ ...proposalData, coverLetter: e.target.value })}
                    />

                    <div className="jd-textarea-counter">
                      <span
                        style={{
                          color: proposalData.coverLetter.trim().length < 100 ? '#EF4444' : '#10B981',
                          fontWeight: 600,
                        }}
                      >
                        {proposalData.coverLetter.trim().length < 100
                          ? `${proposalData.coverLetter.trim().length} / 100 characters min`
                          : `${proposalData.coverLetter.length} / 2000 characters`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer with Buttons */}
                <div className="jd-drawer__footer">
                  <button
                    type="button"
                    onClick={closeApplyModal}
                    disabled={submitting}
                    className="jd-drawer-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="jd-drawer-submit-btn"
                  >
                    {submitting ? (
                      <>
                        <Loader size="sm" inline={true} />
                        <span>Submitting…</span>
                      </>
                    ) : editingProposalId ? (
                      resubmitMode ? 'Resubmit Proposal' : 'Save Changes'
                    ) : (
                      'Submit Proposal'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Skill Verification Required Dialog */}
        <ConfirmDialog
          open={!!skillGateConfirm}
          title="Skill Verification Required"
          message={skillGateConfirm?.message}
          confirmLabel="Take Skill Test"
          danger={false}
          onConfirm={() => {
            const action = skillGateConfirm?.onConfirm;
            setSkillGateConfirm(null);
            action?.();
          }}
          onClose={() => setSkillGateConfirm(null)}
        />
      </div>
      <Footer />
    </>
  );
}
