import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Rocket
} from "lucide-react";
import { toast } from "react-toastify";

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
  { title: "Basic Information", sub: "Tell clients who you are and what you offer." },
  { title: "Your Skills", sub: "Highlight your expertise to attract the right projects." },
  { title: "Languages", sub: "Let clients know how you can communicate with them." },
  { title: "Portfolio", sub: "Showcase your best work and impress potential clients." },
  { title: "Education", sub: "Add your academic background to build credibility." },
  { title: "Certifications", sub: "List your credentials and professional achievements." },
  { title: "Resume / CV", sub: "Upload your resume for a complete professional profile." },
  { title: "Review & Submit", sub: "Everything look good? Submit your profile." },
];

const initialFormData = {
  // Step 1
  title: "",
  bio: "",
  hourlyRate: "",
  availability: "",
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
  // Step 7
  resume: null,
  resumeName: "",
  resumeSize: "",
};

const FreelancerOnboardingForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState(1);

  const validateStep = () => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Professional title is required.";
      if (!formData.bio.trim()) newErrors.bio = "Bio is required.";
      if (!formData.hourlyRate || isNaN(formData.hourlyRate) || Number(formData.hourlyRate) <= 0)
        newErrors.hourlyRate = "Enter a valid hourly rate.";
      if (!formData.availability)
        newErrors.availability = "Please select your availability.";
    }

    if (step === 2) {
      if ((formData.skills || []).length === 0)
        newErrors.skills = "Add at least one skill.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.warn("Please fix the highlighted fields.");
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

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      console.log("FREELANCER ONBOARDING DATA:", formData);
      setIsSubmitting(false);
      setSubmitted(true);
    }, 2000);
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
                    ${formData.hourlyRate}
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
              <button
                className="fob-btn-next"
                onClick={() => navigate("/freelancer/dashboard")}
              >
                <Rocket size={18} />
                Go to Dashboard
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

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
                  <StepBasicInfo
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 2 && (
                  <StepSkills
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 3 && (
                  <StepLanguages
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 4 && (
                  <StepPortfolio
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 5 && (
                  <StepEducation
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 6 && (
                  <StepCertifications
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                  />
                )}
                {step === 7 && (
                  <StepResume
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
    </section>
  );
};

export default FreelancerOnboardingForm;
