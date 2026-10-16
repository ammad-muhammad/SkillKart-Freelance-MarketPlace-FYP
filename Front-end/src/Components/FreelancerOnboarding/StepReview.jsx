import React from "react";
import { motion } from "framer-motion";
import {
  User, Tag, Globe, FolderOpen, GraduationCap, Award, FileText,
  Edit2, CheckCircle2, Clock, Check
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
        <Edit2 size={13} /> Edit
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
      "full-time": "Full Time (40+ hrs/wk)",
      "part-time": "Part Time (~20 hrs/wk)",
      contract: "Contract (Project-based)",
      "not-available": "Not Available currently",
    };
    return map[val] || val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -25 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="fob-review-intro">
        <CheckCircle2 size={24} className="fob-review-check" />
        <div>
          <h3 className="fob-review-intro-title">You're almost there! Review your profile</h3>
          <p className="fob-review-intro-sub">
            Review everything below before submitting. You can click "Edit" on any section to tweak details.
          </p>
        </div>
      </div>

      {/* 1. Resume */}
      <Section icon={FileText} title="Resume / CV" onEdit={() => onEditStep(1)}>
        {formData.resumeName ? (
          <div className="fob-review-list-item">
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={18} style={{ color: '#10B981', flexShrink: 0 }} />
              <strong>{formData.resumeName}</strong>
            </span>
            <span className="fob-review-badge">{formData.resumeSize} MB · Uploaded</span>
          </div>
        ) : (
          <em className="fob-review-empty">No resume uploaded (Manual profile entry)</em>
        )}
      </Section>

      {/* 2. Basic Info */}
      <Section icon={User} title="Basic Information" onEdit={() => onEditStep(2)}>
        <div className="fob-review-grid">
          <div className="fob-review-field fob-review-field--full" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--fob-mint)',
              border: '2px solid var(--fob-mint-border)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {formData.profilePicUrl ? (
                <img src={formData.profilePicUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={26} color="#059669" />
              )}
            </div>
            <div>
              <span className="fob-review-field-label">Full Name</span>
              <span className="fob-review-field-value" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--fob-text)' }}>
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
              <Tag size={12} style={{ color: '#10B981' }} /> Hourly Rate
            </span>
            <span className="fob-review-field-value">
              {formData.hourlyRate ? `Rs. ${formData.hourlyRate}/hr` : <em className="fob-review-empty">Not set</em>}
            </span>
          </div>
          <div className="fob-review-field">
            <span className="fob-review-field-label">
              <Clock size={12} style={{ color: '#10B981' }} /> Work Availability
            </span>
            <span className="fob-review-field-value">
              {availabilityLabel(formData.availability) || <em className="fob-review-empty">Not set</em>}
            </span>
          </div>
          <div className="fob-review-field">
            <span className="fob-review-field-label">Timezone & Location</span>
            <span className="fob-review-field-value">
              {formData.timezone || <em className="fob-review-empty">Default</em>}
            </span>
          </div>
          <div className="fob-review-field fob-review-field--full">
            <span className="fob-review-field-label">Professional Bio</span>
            <span className="fob-review-field-value fob-review-bio">
              {formData.bio || <em className="fob-review-empty">Not provided</em>}
            </span>
          </div>
          {(formData.socialLinks?.github || formData.socialLinks?.linkedin || formData.socialLinks?.website) && (
            <div className="fob-review-field fob-review-field--full" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {formData.socialLinks.github && (
                <a href={formData.socialLinks.github} target="_blank" rel="noreferrer" className="fob-review-link" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  GitHub ↗
                </a>
              )}
              {formData.socialLinks.linkedin && (
                <a href={formData.socialLinks.linkedin} target="_blank" rel="noreferrer" className="fob-review-link" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  LinkedIn ↗
                </a>
              )}
              {formData.socialLinks.website && (
                <a href={formData.socialLinks.website} target="_blank" rel="noreferrer" className="fob-review-link" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Portfolio ↗
                </a>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* 3. Skills */}
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

      {/* 4. Languages */}
      <Section icon={Globe} title="Languages" onEdit={() => onEditStep(4)}>
        {languages.length > 0 ? (
          <div className="fob-review-list">
            {languages.map((lang, i) => {
              const langName = typeof lang === 'object' ? (lang.language || "") : lang;
              return (
                <div key={i} className="fob-review-list-item">
                  <span style={{ fontWeight: 600 }}>{langName || "—"}</span>
                  <span className="fob-review-badge">Fluent / Professional</span>
                </div>
              );
            })}
          </div>
        ) : (
          <em className="fob-review-empty">No languages added</em>
        )}
      </Section>

      {/* 5. Portfolio */}
      <Section icon={FolderOpen} title="Portfolio Projects" onEdit={() => onEditStep(5)}>
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
          <em className="fob-review-empty">No projects added (Add later from profile)</em>
        )}
      </Section>

      {/* 6. Education */}
      <Section icon={GraduationCap} title="Education" onEdit={() => onEditStep(6)}>
        {education.length > 0 ? (
          <div className="fob-review-list">
            {education.map((edu, i) => (
              <div key={i} className="fob-review-list-item">
                <div>
                  <strong>{edu.degree}</strong> {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
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

      {/* 7. Certifications */}
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
                    View Credential ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <em className="fob-review-empty">No certifications added</em>
        )}
      </Section>
    </motion.div>
  );
};

export default StepReview;
