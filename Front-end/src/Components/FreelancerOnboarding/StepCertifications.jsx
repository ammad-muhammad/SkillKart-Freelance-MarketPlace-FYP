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
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -25 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="fob-form-group">
        <div className="fob-section-header">
          <div>
            <label className="fob-label">
              <Award size={16} className="fob-label-icon" />
              Certifications & Professional Credentials
            </label>
            <p className="fob-hint">
              Industry certifications (AWS, Google, Meta, Scrum) boost your profile verification and client trust.
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
              <Award size={42} className="fob-empty-icon" />
              <p style={{ fontWeight: 600, color: "var(--fob-text)", marginBottom: "4px" }}>
                No certifications added yet
              </p>
              <p style={{ fontSize: "13px", color: "var(--fob-text-muted)" }}>
                Click "Add Certification" to show off your verified credentials.
              </p>
            </motion.div>
          )}

          {certifications.map((cert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="fob-dynamic-item"
            >
              <div className="fob-dynamic-item-header">
                <span className="fob-item-number">
                  <Award size={14} style={{ color: "#10B981" }} />
                  Certification #{index + 1}
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
                    placeholder="e.g. AWS Certified Solutions Architect"
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

              <div className="fob-form-row" style={{ marginBottom: 0 }}>
                <div className="fob-form-group" style={{ marginBottom: 0 }}>
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
                <div className="fob-form-group" style={{ marginBottom: 0 }}>
                  <label className="fob-label">
                    <ExternalLink size={13} className="fob-label-icon" />
                    Verification URL / Credential ID
                  </label>
                  <input
                    type="url"
                    value={cert.url}
                    onChange={(e) =>
                      updateCertification(index, "url", e.target.value)
                    }
                    className="fob-input"
                    placeholder="https://credly.com/badges/..."
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
