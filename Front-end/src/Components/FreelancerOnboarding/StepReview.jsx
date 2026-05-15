import React from "react";
import { motion } from "framer-motion";
import {
  User, Tag, Globe, FolderOpen, GraduationCap, Award, FileText,
  Edit2, CheckCircle2, DollarSign, Clock
} from "lucide-react";

const Section = ({ icon: Icon, title, onEdit, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="fob-review-section"
  >
    <div className="fob-review-section-header">
      <div className="fob-review-section-title">
        <Icon size={16} className="fob-review-icon" />
        {title}
      </div>
      <button type="button" className="fob-review-edit-btn" onClick={onEdit}>
        <Edit2 size={14} /> Edit
      </button>
    </div>
    <div className="fob-review-section-body">{children}</div>
  </motion.div>
);

const StepReview = ({ formData, onEditStep }) => {
  const languages = formData.languages || [];
  const portfolio = formData.portfolio || [];
  const education = formData.education || [];
  const certifications = formData.certifications || [];
  const skills = formData.skills || [];

  const availabilityLabel = (val) => {
    const map = {
      "full-time": "Full Time",
      "part-time": "Part Time",
      contract: "Contract",
      "not-available": "Not Available",
    };
    return map[val] || val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="fob-review-intro">
        <CheckCircle2 size={24} className="fob-review-check" />
        <div>
          <h3 className="fob-review-intro-title">Almost there! Review your profile</h3>
          <p className="fob-review-intro-sub">
            Double-check everything before submitting. You can edit any section.
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <Section icon={User} title="Basic Information" onEdit={() => onEditStep(2)}>
        <div className="fob-review-grid">
          <div className="fob-review-field fob-review-field--full" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
              {formData.profilePicUrl ? (
                <img src={formData.profilePicUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <User size={24} />
                </div>
              )}
            </div>
            <div>
              <span className="fob-review-field-label">Full Name</span>
              <span className="fob-review-field-value" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : <em className="fob-review-empty">Not provided</em>}
              </span>
            </div>
          </div>
          <div className="fob-review-field">
            <span className="fob-review-field-label">Professional Title</span>
            <span className="fob-review-field-value">
              {formData.title || <em className="fob-review-empty">Not provided</em>}
            </span>
          </div>
          <div className="fob-review-field">
            <span className="fob-review-field-label">
              <DollarSign size={12} /> Hourly Rate
            </span>
            <span className="fob-review-field-value">
              {formData.hourlyRate ? `$${formData.hourlyRate}/hr` : <em className="fob-review-empty">Not set</em>}
            </span>
          </div>
          <div className="fob-review-field">
            <span className="fob-review-field-label">
              <Clock size={12} /> Availability
            </span>
            <span className="fob-review-field-value">
              {availabilityLabel(formData.availability) || <em className="fob-review-empty">Not set</em>}
            </span>
          </div>
          <div className="fob-review-field fob-review-field--full">
            <span className="fob-review-field-label">Bio</span>
            <span className="fob-review-field-value fob-review-bio">
              {formData.bio || <em className="fob-review-empty">Not provided</em>}
            </span>
          </div>
        </div>
      </Section>

      {/* Skills */}
      <Section icon={Tag} title="Skills" onEdit={() => onEditStep(3)}>
        {skills.length > 0 ? (
          <div className="fob-review-tags">
            {skills.map((s) => (
              <span key={s} className="fob-review-tag">{s}</span>
            ))}
          </div>
        ) : (
          <em className="fob-review-empty">No skills added</em>
        )}
      </Section>

      {/* Languages */}
      <Section icon={Globe} title="Languages" onEdit={() => onEditStep(4)}>
        {languages.length > 0 ? (
          <div className="fob-review-list">
            {languages.map((lang, i) => (
              <div key={i} className="fob-review-list-item">
                <span>{lang.language || "—"}</span>
                <span className="fob-review-badge">{lang.proficiency || "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <em className="fob-review-empty">No languages added</em>
        )}
      </Section>

      {/* Portfolio */}
      <Section icon={FolderOpen} title="Portfolio" onEdit={() => onEditStep(5)}>
        {portfolio.length > 0 ? (
          <div className="fob-review-list">
            {portfolio.map((p, i) => (
              <div key={i} className="fob-review-list-item fob-review-portfolio-item">
                <div>
                  <strong>{p.title || "Untitled Project"}</strong>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="fob-review-link"
                    >
                      Visit ↗
                    </a>
                  )}
                </div>
                <span className="fob-review-badge">
                  {(p.images || []).length} image{(p.images || []).length !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <em className="fob-review-empty">No projects added</em>
        )}
      </Section>

      {/* Education */}
      <Section icon={GraduationCap} title="Education" onEdit={() => onEditStep(6)}>
        {education.length > 0 ? (
          <div className="fob-review-list">
            {education.map((edu, i) => (
              <div key={i} className="fob-review-list-item">
                <div>
                  <strong>{edu.degree}</strong> in {edu.fieldOfStudy}
                  <p className="fob-review-sub">{edu.institution}</p>
                </div>
                <span className="fob-review-badge">
                  {edu.startDate} → {edu.endDate || "Present"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <em className="fob-review-empty">No education added</em>
        )}
      </Section>

      {/* Certifications */}
      <Section icon={Award} title="Certifications" onEdit={() => onEditStep(7)}>
        {certifications.length > 0 ? (
          <div className="fob-review-list">
            {certifications.map((cert, i) => (
              <div key={i} className="fob-review-list-item">
                <div>
                  <strong>{cert.name}</strong>
                  <p className="fob-review-sub">{cert.issuer}</p>
                </div>
                {cert.url && (
                  <a
                    href={cert.url}
                    target="_blank"
                    rel="noreferrer"
                    className="fob-review-link"
                  >
                    View ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <em className="fob-review-empty">No certifications added</em>
        )}
      </Section>

      {/* Resume */}
      <Section icon={FileText} title="Resume" onEdit={() => onEditStep(7)}>
        {formData.resumeName ? (
          <div className="fob-review-list-item">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              {formData.resumeName}
            </span>
            <span className="fob-review-badge">{formData.resumeSize} MB</span>
          </div>
        ) : (
          <em className="fob-review-empty">No resume uploaded</em>
        )}
      </Section>
    </motion.div>
  );
};

export default StepReview;
