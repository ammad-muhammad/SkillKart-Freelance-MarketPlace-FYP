import React from "react";
import { motion } from "framer-motion";
import { Tag, Sparkles, CheckCircle2 } from "lucide-react";
import TagInput from "../common/TagInput/TagInput";
import AiSuggestFill from "../common/AiSuggest/AiSuggestFill";

const StepSkills = ({ formData, setFormData, errors }) => {
  const skills = formData.skills || [];

  const handleSkillsChange = (newSkills) => {
    setFormData((prev) => ({
      ...prev,
      skills: newSkills,
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -25 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="fob-form-group">
        <label className="fob-label">
          <Tag size={16} className="fob-label-icon" />
          Technical & Professional Skills*
        </label>
        <p className="fob-hint" style={{ marginBottom: "16px" }}>
          Add keywords that clients search for (e.g. React, Node.js, UI/UX Design, Docker, Python).
        </p>

        <TagInput
          tags={skills}
          onChange={handleSkillsChange}
          placeholder="Type a skill and press Enter (e.g. React)..."
        />

        <div style={{ marginTop: "14px" }}>
          <AiSuggestFill
            label="Suggest Skills & Experience Level with AI"
            getContext={() => ({
              title: formData.title || '',
              description: [formData.title, formData.bio].filter(Boolean).join('. '),
              skills,
            })}
            existingSkills={skills}
            onSkills={(newSkills) => setFormData((prev) => ({
              ...prev,
              skills: Array.from(new Set([...(prev.skills || []), ...newSkills])),
            }))}
            onExperience={(level) => setFormData((prev) => ({ ...prev, experienceLevel: level }))}
          />
        </div>

        {errors?.skills && <p className="fob-error">{errors.skills}</p>}
      </div>

      {skills.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
          <div className="fob-skills-count-badge">
            <CheckCircle2 size={13} style={{ marginRight: "4px" }} />
            {skills.length} skill{skills.length !== 1 ? "s" : ""} added
          </div>
          <span style={{ fontSize: "12px", color: "#64748B" }}>
            (Add 5+ skills to rank higher in client searches)
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default StepSkills;
