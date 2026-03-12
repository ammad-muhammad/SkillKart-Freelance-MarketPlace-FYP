import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Plus, Trash2 } from "lucide-react";

const StepEducation = ({ formData, setFormData, errors }) => {
  const education = formData.education || [];

  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        {
          institution: "",
          degree: "",
          fieldOfStudy: "",
          startDate: "",
          endDate: "",
        },
      ],
    }));
  };

  const removeEducation = (index) => {
    setFormData((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index),
    }));
  };

  const updateEducation = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.education || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
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
              <GraduationCap size={15} className="fob-label-icon" />
              Education History
            </label>
            <p className="fob-hint">
              Add your academic qualifications to build trust with clients.
            </p>
          </div>
          <button type="button" className="fob-add-btn" onClick={addEducation}>
            <Plus size={16} />
            Add Education
          </button>
        </div>

        <AnimatePresence>
          {education.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fob-empty-state"
            >
              <GraduationCap size={40} className="fob-empty-icon" />
              <p>No education added. Click "Add Education" to start.</p>
            </motion.div>
          )}

          {education.map((edu, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="fob-dynamic-item"
            >
              <div className="fob-dynamic-item-header">
                <span className="fob-item-number">
                  <GraduationCap size={14} /> Education #{index + 1}
                </span>
                <button
                  type="button"
                  className="fob-remove-btn"
                  onClick={() => removeEducation(index)}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>

              <div className="fob-form-group">
                <label className="fob-label">Institution*</label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) =>
                    updateEducation(index, "institution", e.target.value)
                  }
                  className="fob-input"
                  placeholder="e.g. COMSATS University Islamabad"
                />
              </div>

              <div className="fob-form-row">
                <div className="fob-form-group">
                  <label className="fob-label">Degree*</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) =>
                      updateEducation(index, "degree", e.target.value)
                    }
                    className="fob-input"
                    placeholder="e.g. Bachelor of Science"
                  />
                </div>
                <div className="fob-form-group">
                  <label className="fob-label">Field of Study</label>
                  <input
                    type="text"
                    value={edu.fieldOfStudy}
                    onChange={(e) =>
                      updateEducation(index, "fieldOfStudy", e.target.value)
                    }
                    className="fob-input"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              <div className="fob-form-row">
                <div className="fob-form-group">
                  <label className="fob-label">Start Date</label>
                  <input
                    type="month"
                    value={edu.startDate}
                    onChange={(e) =>
                      updateEducation(index, "startDate", e.target.value)
                    }
                    className="fob-input"
                  />
                </div>
                <div className="fob-form-group">
                  <label className="fob-label">End Date</label>
                  <input
                    type="month"
                    value={edu.endDate}
                    onChange={(e) =>
                      updateEducation(index, "endDate", e.target.value)
                    }
                    className="fob-input"
                    placeholder="Leave empty if ongoing"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {errors?.education && <p className="fob-error">{errors.education}</p>}
    </motion.div>
  );
};

export default StepEducation;
