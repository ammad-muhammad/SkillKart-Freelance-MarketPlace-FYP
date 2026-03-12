import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Plus } from "lucide-react";

const SUGGESTED_SKILLS = [
  "React", "Node.js", "Python", "JavaScript", "TypeScript", "Vue.js",
  "Angular", "MongoDB", "PostgreSQL", "UI/UX Design", "Figma", "Docker",
  "AWS", "GraphQL", "REST APIs", "Mobile Development", "AI/ML", "Data Science",
];

const StepSkills = ({ formData, setFormData, errors }) => {
  const [inputValue, setInputValue] = useState("");

  const addSkill = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    const skills = formData.skills || [];
    if (!skills.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...(prev.skills || []), trimmed],
      }));
    }
    setInputValue("");
  };

  const removeSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skillToRemove),
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(inputValue);
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      (formData.skills || []).length > 0
    ) {
      removeSkill(formData.skills[formData.skills.length - 1]);
    }
  };

  const skills = formData.skills || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="fob-form-group">
        <label className="fob-label">
          <Tag size={15} className="fob-label-icon" />
          Your Skills*
        </label>
        <div
          className={`fob-tag-input-container ${
            errors?.skills ? "fob-input--error" : ""
          }`}
        >
          <AnimatePresence>
            {skills.map((skill) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="fob-skill-tag"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="fob-skill-tag-remove"
                >
                  <X size={12} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="fob-tag-input"
            placeholder={
              skills.length === 0 ? "Type a skill and press Enter..." : "Add more..."
            }
          />
        </div>
        <p className="fob-hint">
          Press <kbd className="fob-kbd">Enter</kbd> or <kbd className="fob-kbd">,</kbd> to add. Press <kbd className="fob-kbd">Backspace</kbd> to remove last.
        </p>
        {errors?.skills && <p className="fob-error">{errors.skills}</p>}
      </div>

      <div className="fob-form-group">
        <label className="fob-label">Suggested Skills</label>
        <div className="fob-suggested-tags">
          {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((skill) => (
            <button
              key={skill}
              type="button"
              className="fob-suggested-tag"
              onClick={() => addSkill(skill)}
            >
              <Plus size={12} />
              {skill}
            </button>
          ))}
        </div>
      </div>

      {skills.length > 0 && (
        <div className="fob-skills-count-badge">
          {skills.length} skill{skills.length !== 1 ? "s" : ""} added
        </div>
      )}
    </motion.div>
  );
};

export default StepSkills;
