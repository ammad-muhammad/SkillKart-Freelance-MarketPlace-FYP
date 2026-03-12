import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Plus, Trash2, ExternalLink } from "lucide-react";

const StepCertifications = ({ formData, setFormData, errors }) => {
  const certifications = formData.certifications || [];

  const addCertification = () => {
    setFormData((prev) => ({
      ...prev,
      certifications: [
        ...(prev.certifications || []),
        { name: "", issuer: "", issueDate: "", url: "" },
      ],
    }));
  };

  const removeCertification = (index) => {
    setFormData((prev) => ({
      ...prev,
      certifications: (prev.certifications || []).filter((_, i) => i !== index),
    }));
  };

  const updateCertification = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.certifications || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, certifications: updated };
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
              <Award size={15} className="fob-label-icon" />
              Certifications & Credentials
            </label>
            <p className="fob-hint">
              Verified certifications boost your credibility and earning potential.
            </p>
          </div>
          <button
            type="button"
            className="fob-add-btn"
            onClick={addCertification}
          >
            <Plus size={16} />
            Add Certification
          </button>
        </div>

        <AnimatePresence>
          {certifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fob-empty-state"
            >
              <Award size={40} className="fob-empty-icon" />
              <p>
                No certifications yet. Add certificates to stand out!
              </p>
            </motion.div>
          )}

          {certifications.map((cert, index) => (
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
                  <Award size={14} /> Certification #{index + 1}
                </span>
                <button
                  type="button"
                  className="fob-remove-btn"
                  onClick={() => removeCertification(index)}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>

              <div className="fob-form-row">
                <div className="fob-form-group">
                  <label className="fob-label">Certification Name*</label>
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) =>
                      updateCertification(index, "name", e.target.value)
                    }
                    className="fob-input"
                    placeholder="e.g. AWS Solutions Architect"
                  />
                </div>
                <div className="fob-form-group">
                  <label className="fob-label">Issuing Organization*</label>
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) =>
                      updateCertification(index, "issuer", e.target.value)
                    }
                    className="fob-input"
                    placeholder="e.g. Amazon Web Services"
                  />
                </div>
              </div>

              <div className="fob-form-row">
                <div className="fob-form-group">
                  <label className="fob-label">Issue Date</label>
                  <input
                    type="month"
                    value={cert.issueDate}
                    onChange={(e) =>
                      updateCertification(index, "issueDate", e.target.value)
                    }
                    className="fob-input"
                  />
                </div>
                <div className="fob-form-group">
                  <label className="fob-label">
                    <ExternalLink size={13} className="fob-label-icon" />
                    Credential URL
                  </label>
                  <input
                    type="url"
                    value={cert.url}
                    onChange={(e) =>
                      updateCertification(index, "url", e.target.value)
                    }
                    className="fob-input"
                    placeholder="https://credential.net/..."
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {errors?.certifications && (
        <p className="fob-error">{errors.certifications}</p>
      )}
    </motion.div>
  );
};

export default StepCertifications;
