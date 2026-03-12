import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Plus, Trash2 } from "lucide-react";

const PROFICIENCY_OPTIONS = ["Basic", "Conversational", "Fluent", "Native"];

const StepLanguages = ({ formData, setFormData, errors }) => {
  const languages = formData.languages || [];

  const addLanguage = () => {
    setFormData((prev) => ({
      ...prev,
      languages: [
        ...(prev.languages || []),
        { language: "", proficiency: "" },
      ],
    }));
  };

  const removeLanguage = (index) => {
    setFormData((prev) => ({
      ...prev,
      languages: (prev.languages || []).filter((_, i) => i !== index),
    }));
  };

  const updateLanguage = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.languages || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, languages: updated };
    });
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
              Languages You Speak
            </label>
            <p className="fob-hint">Add all languages you can communicate in professionally.</p>
          </div>
          <button type="button" className="fob-add-btn" onClick={addLanguage}>
            <Plus size={16} />
            Add Language
          </button>
        </div>

        <AnimatePresence>
          {languages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fob-empty-state"
            >
              <Globe size={40} className="fob-empty-icon" />
              <p>No languages added yet. Click "Add Language" to get started.</p>
            </motion.div>
          )}

          {languages.map((lang, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
              className="fob-dynamic-item"
            >
              <div className="fob-dynamic-item-header">
                <span className="fob-item-number">Language #{index + 1}</span>
                <button
                  type="button"
                  className="fob-remove-btn"
                  onClick={() => removeLanguage(index)}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>

              <div className="fob-form-row">
                <div className="fob-form-group">
                  <label className="fob-label">Language*</label>
                  <input
                    type="text"
                    value={lang.language}
                    onChange={(e) =>
                      updateLanguage(index, "language", e.target.value)
                    }
                    className="fob-input"
                    placeholder="e.g. English, Urdu, French"
                  />
                </div>
                <div className="fob-form-group">
                  <label className="fob-label">Proficiency*</label>
                  <select
                    value={lang.proficiency}
                    onChange={(e) =>
                      updateLanguage(index, "proficiency", e.target.value)
                    }
                    className="fob-select"
                  >
                    <option value="">Select proficiency</option>
                    {PROFICIENCY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {lang.proficiency && (
                <div className="fob-proficiency-bar">
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <div
                      key={opt}
                      className={`fob-proficiency-segment ${
                        PROFICIENCY_OPTIONS.indexOf(opt) <=
                        PROFICIENCY_OPTIONS.indexOf(lang.proficiency)
                          ? "fob-proficiency-segment--filled"
                          : ""
                      }`}
                    />
                  ))}
                  <span className="fob-proficiency-label">
                    {lang.proficiency}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {errors?.languages && (
        <p className="fob-error">{errors.languages}</p>
      )}
    </motion.div>
  );
};

export default StepLanguages;
