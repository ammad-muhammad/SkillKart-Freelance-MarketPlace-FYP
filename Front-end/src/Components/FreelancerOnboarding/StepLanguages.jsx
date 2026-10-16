import React from "react";
import { motion } from "framer-motion";
import { Globe, CheckCircle2 } from "lucide-react";
import TagInput from "../common/TagInput/TagInput";
import { LANGUAGES } from "../../data/languages";

const StepLanguages = ({ formData, setFormData, errors }) => {
  const currentTags = (formData.languages || [])
    .map(l => typeof l === 'string' ? l : (l?.language || ''))
    .filter(Boolean);

  const handleTagsChange = (newTags) => {
    setFormData((prev) => ({
      ...prev,
      languages: newTags.map(tag => ({ language: tag, proficiency: 'fluent' }))
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
          <Globe size={16} className="fob-label-icon" />
          Languages You Speak*
        </label>
        <p className="fob-hint" style={{ marginBottom: "16px" }}>
          Select or type all languages you can comfortably communicate in with international and local clients (e.g. English, Urdu, Arabic).
        </p>

        <TagInput
          tags={currentTags}
          onChange={handleTagsChange}
          options={LANGUAGES}
          placeholder="e.g. English, Urdu, Arabic, German..."
          showHint={false}
        />

        {errors?.languages && (
          <p className="fob-error" style={{ marginTop: '0.75rem' }}>{errors.languages}</p>
        )}
      </div>

      {currentTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
          <div className="fob-skills-count-badge">
            <CheckCircle2 size={13} style={{ marginRight: "4px" }} />
            {currentTags.length} language{currentTags.length !== 1 ? "s" : ""} added
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StepLanguages;
