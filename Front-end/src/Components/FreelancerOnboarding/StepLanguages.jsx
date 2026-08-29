import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Plus, Trash2 } from "lucide-react";
import TagInput from "../common/TagInput/TagInput";
import { LANGUAGES } from "../../data/languages";

const PROFICIENCY_OPTIONS = ["basic", "conversational", "fluent", "native"];

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
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="fob-form-group">
        <div className="fob-section-header">
          <div>
            <label className="fob-label">
              <Globe size={15} className="fob-label-icon" />
              Languages You Speak*
            </label>
            <p className="fob-hint">Type or select all languages you can communicate in professionally (press Enter to add).</p>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <TagInput
            tags={currentTags}
            onChange={handleTagsChange}
            options={LANGUAGES}
            placeholder="e.g. Urdu, English, Punjabi..."
            showHint={false}
          />
        </div>
      </div>

      {errors?.languages && (
        <p className="fob-error" style={{ marginTop: '0.5rem' }}>{errors.languages}</p>
      )}
    </motion.div>
  );
};

export default StepLanguages;
