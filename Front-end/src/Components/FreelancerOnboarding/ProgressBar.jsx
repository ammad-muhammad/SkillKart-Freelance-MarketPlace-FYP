import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const STEP_LABELS = [
  "Resume",
  "Basic Info",
  "Skills",
  "Languages",
  "Portfolio",
  "Education",
  "Certifications",
  "Review",
];

const ProgressBar = ({ currentStep, totalSteps = 8 }) => {
  const progressPercent = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

  return (
    <div className="fob-progress-wrapper">
      <div className="fob-progress-top-row">
        <span className="fob-progress-step-indicator">
          <Sparkles size={13} style={{ color: "#10B981" }} />
          Step {currentStep} of {totalSteps}: {STEP_LABELS[currentStep - 1]}
        </span>
        <span className="fob-progress-percentage">{progressPercent}% Completed</span>
      </div>

      <div className="fob-progress-bar-track">
        <motion.div
          className="fob-progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="fob-stepper">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = currentStep > stepNum;
          const isActive = currentStep === stepNum;

          return (
            <div key={stepNum} className="fob-step-item">
              <div
                className={`fob-step-node ${
                  isActive
                    ? "fob-step-node--active"
                    : isCompleted
                    ? "fob-step-node--completed"
                    : ""
                }`}
              >
                {isCompleted ? <CheckCircle2 size={16} /> : stepNum}
              </div>
              <span
                className={`fob-step-label ${
                  isActive
                    ? "fob-step-label--active"
                    : isCompleted
                    ? "fob-step-label--completed"
                    : ""
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
