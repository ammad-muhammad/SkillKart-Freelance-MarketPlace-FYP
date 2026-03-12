import React from "react";
import { CheckCircle2 } from "lucide-react";

const STEP_LABELS = [
  "Basic Info",
  "Skills",
  "Languages",
  "Portfolio",
  "Education",
  "Certifications",
  "Resume",
  "Review",
];

const ProgressBar = ({ currentStep, totalSteps = 8 }) => {
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="fob-progress-wrapper">
      <div className="fob-progress-bar-track">
        <div
          className="fob-progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
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
                  isActive ? "fob-step-label--active" : ""
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
