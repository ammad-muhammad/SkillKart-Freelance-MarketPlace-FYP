import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Rocket, Clock
} from "lucide-react";
import { safeToast as toast } from "../../utils/safeToast";
import { useAuth } from "../../hooks/useAuth";
import { freelancersAPI } from "../../api/freelancers";
import ImageCropModal from "../common/ImageCropModal/ImageCropModal";

import ProgressBar from "./ProgressBar";
import StepBasicInfo from "./StepBasicInfo";
import StepSkills from "./StepSkills";
import StepLanguages from "./StepLanguages";
import StepPortfolio from "./StepPortfolio";
import StepEducation from "./StepEducation";
import StepCertifications from "./StepCertifications";
import StepResume from "./StepResume";
import StepReview from "./StepReview";

const TOTAL_STEPS = 8;

const STEP_TITLES = [
  { title: "Resume / CV", sub: "Upload your CV to auto-fill your profile or continue manually." },
  { title: "Basic Information", sub: "Tell clients who you are and what you offer." },
  { title: "Your Skills", sub: "Highlight your expertise to attract the right projects." },
  { title: "Languages", sub: "Let clients know how you can communicate with them." },
  { title: "Portfolio", sub: "Showcase your best work and impress potential clients." },
  { title: "Education", sub: "Add your academic background to build credibility." },
  { title: "Certifications", sub: "List your credentials and professional achievements." },
  { title: "Review & Submit", sub: "Everything look good? Submit your profile." },
];

const initialFormData = {
  // Personal Details (Pre-filled from OAuth if available)
  firstName: "",
  lastName: "",
  // Step 1
  title: "",
  bio: "",
  hourlyRate: "",
  availability: "",
  profilePic: null,
  profilePicUrl: "",
  // Step 2
  skills: [],
  // Step 3
  languages: [],
  // Step 4
  portfolio: [],
  // Step 5
  education: [],
  // Step 6
  certifications: [],
  // Missing fields for dashboard
  timezone: "",
  experienceLevel: "Entry",
  socialLinks: {
    github: "",
    linkedin: "",
    website: "",
  },
  // Step 7
  resume: null,
  resumeName: "",
  resumeSize: "",
  parsedData: null,
  aiAnalysis: null,
  isParsingCV: false,
};

const FreelancerOnboardingForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null); // raw file awaiting crop confirmation
  const { user, refreshAuth } = useAuth();

  const DRAFT_KEY = "freelancer_onboarding_draft";

  // OAuth Pre-fill logic
  useEffect(() => {
    if (user && !showDraftPrompt) {
      setFormData(prev => {
        const updates = {};
        
        // Autofill Name if empty
        if (!prev.firstName && user.firstName) updates.firstName = user.firstName;
        if (!prev.lastName && user.lastName) updates.lastName = user.lastName;
        
        // Autofill Profile Picture if empty
        if (!prev.profilePicUrl && user.profilePicture) updates.profilePicUrl = user.profilePicture;
        
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates };
        }
        return prev;
      });
    }
  }, [user, showDraftPrompt]);

  // Initial Load - Restore Draft Check
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.formData) {
          setDraftData(parsed);
          setShowDraftPrompt(true);
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Auto-Save Draft
  useEffect(() => {
    if (!showDraftPrompt && !submitted && Object.keys(formData).length > 0) {
      // Don't save empty init form right away
      if (formData.title !== "" || formData.skills.length > 0 || step > 1) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, step }));
      }
    }
  }, [formData, step, showDraftPrompt, submitted]);

  const handleRestoreDraft = () => {
    if (draftData) {
      setFormData(draftData.formData);
      setStep(draftData.step || 1);
    }
    setShowDraftPrompt(false);
    toast.success("Welcome back! Your progress has been restored.");
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftData(null);
    setShowDraftPrompt(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }
    setPendingAvatarFile(file);
  };

  const handleAvatarCropConfirm = async (finalFile) => {
    setPendingAvatarFile(null);

    // 1. Show local preview immediately
    const localUrl = URL.createObjectURL(finalFile);
    setFormData(prev => ({
      ...prev,
      profilePic: finalFile,
      profilePicUrl: localUrl
    }));

    // 2. Upload immediately to get permanent URL
    try {
      const avatarData = new FormData();
      avatarData.append('avatar', finalFile);

      toast.info("Uploading profile picture...");
      const avatarRes = await freelancersAPI.uploadAvatar(avatarData);
      const permanentUrl = avatarRes.data.data.url;

      // 3. Update with permanent URL
      setFormData(prev => ({
        ...prev,
        profilePic: null, // Clear file object after successful upload
        profilePicUrl: permanentUrl
      }));
      toast.success("Profile picture uploaded!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload profile picture. Please try again.");
      // Revert to null if upload failed
      setFormData(prev => ({
        ...prev,
        profilePic: null,
        profilePicUrl: ""
      }));
    }
  };

  const validateStep = () => {
    const newErrors = {};

    if (step === 2) {
      if (!formData.firstName?.trim()) newErrors.firstName = "First name is required.";
      if (!formData.lastName?.trim()) newErrors.lastName = "Last name is required.";
      if (!formData.title?.trim()) newErrors.title = "Professional title is required.";
      if (!formData.bio?.trim()) newErrors.bio = "Bio is required.";
      if (!formData.hourlyRate || isNaN(formData.hourlyRate) || Number(formData.hourlyRate) <= 0)
        newErrors.hourlyRate = "Enter a valid hourly rate.";
      if (!formData.availability)
        newErrors.availability = "Please select your availability.";
    }

    if (step === 3) {
      if ((formData.skills || []).length === 0)
        newErrors.skills = "Add at least one skill.";
    }

    if (step === 4) {
      const languages = formData.languages || [];
      if (languages.length === 0) {
        newErrors.languages = "Please add at least one language.";
      } else {
        languages.forEach((lang) => {
          if (!lang.language?.trim() || !lang.proficiency) {
            newErrors.languages = "Please complete all added languages or remove incomplete ones.";
          }
        });
      }
    }

    if (step === 5) {
      const portfolio = formData.portfolio || [];
      if (portfolio.length === 0) {
        // Soft warning, do not add to newErrors
        toast.warning("Portfolio/projects are required for profile verification and visibility.", { autoClose: 6000 });
      }
      portfolio.forEach(item => {
        if (!item.title?.trim() || !item.description?.trim()) {
          newErrors.portfolio = "Please complete all added portfolio projects or remove incomplete ones.";
        }
      });
    }

    if (step === 6) {
      const edu = formData.education || [];
      edu.forEach(item => {
        const missing = [];
        if (!item.institution?.trim()) missing.push("Institution");
        if (!item.degree?.trim()) missing.push("Degree");
        if (!item.startDate) missing.push("Start Date");
        if (missing.length) {
          newErrors.education = `Please fill in: ${missing.join(", ")}.`;
        }
      });
    }

    if (step === 7) {
      const cert = formData.certifications || [];
      cert.forEach(item => {
        const missing = [];
        if (!item.name?.trim()) missing.push("Certification Name");
        if (!item.issuer?.trim()) missing.push("Issuing Organization");
        if (missing.length) {
          newErrors.certifications = `Please fill in: ${missing.join(", ")}.`;
        }
      });
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.warning("Please fix the highlighted fields.");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditStep = (targetStep) => {
    setDirection(targetStep < step ? -1 : 1);
    setStep(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Upload Profile Picture if exists as a File
      let profilePicUrl = formData.profilePicUrl;
      if (formData.profilePic instanceof File) {
        const avatarData = new FormData();
        avatarData.append('avatar', formData.profilePic);
        const avatarRes = await freelancersAPI.uploadAvatar(avatarData);
        profilePicUrl = avatarRes.data.data.url;
      }

      // 2. Upload Portfolio Images if they are Files
      const processedPortfolio = await Promise.all((formData.portfolio || []).map(async (project) => {
        const uploadedImages = await Promise.all((project.images || []).map(async (img) => {
          if (img instanceof File) {
            const mediaData = new FormData();
            mediaData.append('image', img);
            const mediaRes = await freelancersAPI.uploadPortfolioMedia(mediaData);
            return mediaRes.data.data.url;
          }
          return img; // Already a URL
        }));

        return {
          ...project,
          images: uploadedImages
        };
      }));

      // Build clean payload
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        title: formData.title,
        bio: formData.bio,
        hourlyRate: Number(formData.hourlyRate) || 0,
        availability: formData.availability,
        skills: formData.skills,
        languages: (formData.languages || []).map(l => ({
          language: typeof l.language === 'object' ? (l.language.name || l.language.language || "") : l.language,
          proficiency: l.proficiency
        })),
        portfolio: processedPortfolio,
        profilePicUrl,
        education: formData.education,
        certifications: formData.certifications,
        timezone: formData.timezone,
        experienceLevel: formData.experienceLevel,
        socialLinks: formData.socialLinks,
        aiAnalysis: formData.aiAnalysis
      };

      const response = await freelancersAPI.submitProfile(payload);

      const { status } = response.data.data;
      if (status === 'unverified') {
        toast.info(
          "Profile saved! Add a portfolio and complete all sections to get verified and become visible in search.",
          { autoClose: 6000 }
        );
      } else {
        toast.success("Profile verified successfully! You are now live.");
      }

      setSubmitted(true);
      await refreshAuth(); // Refresh user data to update isOnBoardingCompleted flag
      localStorage.removeItem(DRAFT_KEY); // Clear draft on success
    } catch (error) {
      console.error("Submission error:", error);

      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        const newErrors = {};
        let firstErrorStep = TOTAL_STEPS;

        backendErrors.forEach(err => {
          // err.field might be "portfolio[0].title", extract base "portfolio" for step mapping
          const baseField = err.field.split('[')[0];

          // Store both specific and base field errors so the UI can catch it
          newErrors[baseField] = err.message;
          newErrors[err.field] = err.message;

          let errorStep = 8;
          if (['resume'].includes(baseField)) errorStep = 1;
          else if (['firstName', 'lastName', 'title', 'bio', 'hourlyRate', 'availability'].includes(baseField)) errorStep = 2;
          else if (['skills'].includes(baseField)) errorStep = 3;
          else if (['languages'].includes(baseField)) errorStep = 4;
          else if (['portfolio'].includes(baseField)) errorStep = 5;
          else if (['education'].includes(baseField)) errorStep = 6;
          else if (['certifications'].includes(baseField)) errorStep = 7;
          else if (['socialLinks', 'timezone', 'experienceLevel'].includes(baseField)) errorStep = 2; // Basic/Professional info

          if (errorStep < firstErrorStep) firstErrorStep = errorStep;
        });

        setErrors(newErrors);

        if (firstErrorStep < TOTAL_STEPS) {
          setDirection(-1);
          setStep(firstErrorStep);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }

        toast.error("Please fix the highlighted fields to submit your profile.");
      } else {
        toast.error(error.response?.data?.message || "Failed to submit profile. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  if (submitted) {
    return (
      <section className="fob-root">
        <div className="fob-bg">
          <div className="fob-orb fob-orb--1" />
          <div className="fob-orb fob-orb--2" />
          <div className="fob-orb fob-orb--3" />
          <div className="fob-grid-overlay" />
        </div>
        <div className="fob-container">
          <div className="fob-card">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="fob-success"
            >
              <div className="fob-success-icon-wrap">
                <Rocket size={64} className="fob-success-rocket" />
              </div>
              <h1 className="fob-success-title">You're Live on SkillKart!</h1>
              <p className="fob-success-sub">
                Your freelancer profile is now active. Clients will start
                discovering your work. The AI Matchmaking engine is warming up!
              </p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="fob-success-card"
              >
                <div className="fob-success-stat">
                  <span className="fob-success-stat-num">
                    {(formData.skills || []).length}
                  </span>
                  <span>Skills Listed</span>
                </div>
                <div className="fob-success-stat">
                  <span className="fob-success-stat-num">
                    Rs. {formData.hourlyRate}
                  </span>
                  <span>Hourly Rate</span>
                </div>
                <div className="fob-success-stat">
                  <span className="fob-success-stat-num">
                    {(formData.portfolio || []).length}
                  </span>
                  <span>Projects</span>
                </div>
              </motion.div>
              {/* The skill test is the freelancer's call: take it now, or go
                  straight to the dashboard (their skills just start at 0%
                  until they verify them — nothing is forced). */}
              <div className="fob-choice">
                <h2 className="fob-choice-title">Verify your skills</h2>
                <p className="fob-choice-sub">
                  Take the skill test now or do it later from your dashboard. Until you do,
                  every skill shows <strong>0%</strong> — verified skills are needed to apply to
                  jobs and publish gigs that require them.
                </p>
                <div className="fob-choice-actions">
                  <button
                    type="button"
                    className="fob-choice-card fob-choice-card--primary"
                    onClick={() => navigate("/freelancer/skill-test")}
                  >
                    <Rocket size={22} />
                    <span className="fob-choice-card-title">Take the skill test now</span>
                    <span className="fob-choice-card-desc">You'll choose the level first — Easy, Intermediate or Expert.</span>
                  </button>
                  <button
                    type="button"
                    className="fob-choice-card"
                    onClick={() => navigate("/freelancer/dashboard")}
                  >
                    <Clock size={22} />
                    <span className="fob-choice-card-title">I'll do it later</span>
                    <span className="fob-choice-card-desc">Go to your dashboard. Your skills start at 0% until you verify them.</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="fob-root">
      {/* Draft Resume Modal */}
      <AnimatePresence>
        {showDraftPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(4px)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                background: '#fff', borderRadius: '16px', padding: '32px',
                maxWidth: '400px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '64px', height: '64px', background: '#eff6ff', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', color: '#3b82f6'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.25rem', color: '#0f172a', fontWeight: 600 }}>
                Resume your onboarding progress?
              </h3>
              <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
                We noticed you left some unsaved changes. Would you like to pick up right where you left off?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                    background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                  Start Fresh
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                    background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#2563eb'}
                  onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                >
                  Resume
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fob-bg">
        <div className="fob-orb fob-orb--1" />
        <div className="fob-orb fob-orb--2" />
        <div className="fob-orb fob-orb--3" />
        <div className="fob-grid-overlay" />
      </div>

      <div className="fob-container">
        <div className="fob-card">
          {/* Progress Bar */}
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />

          {/* Step Header */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`header-${step}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="fob-header"
            >
              <h1 className="fob-title">{STEP_TITLES[step - 1].title}</h1>
              <p className="fob-subtitle">{STEP_TITLES[step - 1].sub}</p>
            </motion.div>
          </AnimatePresence>

          {/* Step Content */}
          <form onSubmit={(e) => e.preventDefault()} className="fob-form">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`step-${step}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="fob-step-content"
              >
                {step === 1 && (
                  <StepResume
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 2 && (
                  <StepBasicInfo
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    handleImageUpload={handleImageUpload}
                  />
                )}
                {step === 3 && (
                  <StepSkills
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 4 && (
                  <StepLanguages
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 5 && (
                  <StepPortfolio
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 6 && (
                  <StepEducation
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 7 && (
                  <StepCertifications
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 8 && (
                  <StepReview formData={formData} onEditStep={handleEditStep} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="fob-nav">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="fob-btn-back"
                >
                  <ChevronLeft size={20} /> Back
                </button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="fob-btn-next"
                >
                  Continue <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="fob-btn-next fob-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="fob-loader" />
                  ) : (
                    <>
                      <Rocket size={18} />
                      Submit Profile
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <ImageCropModal
        file={pendingAvatarFile}
        aspect={1}
        cropShape="round"
        title="Adjust Profile Photo"
        onCancel={() => setPendingAvatarFile(null)}
        onConfirm={handleAvatarCropConfirm}
      />
    </section>
  );
};

export default FreelancerOnboardingForm;
