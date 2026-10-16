import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Upload, X, CheckCircle2, AlertCircle, FileType,
  Zap, Check, Sparkles, ChevronRight, ArrowRight, LayoutDashboard
} from "lucide-react";
import Loader from "../common/Loader/Loader";
import { useSkipOnboarding } from "../common/SkipOnboarding/SkipOnboarding";
import { safeToast as toast } from "../../utils/safeToast";
import { freelancersAPI } from "../../api/freelancers";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_MB = 5;

const StepResume = ({ formData, setFormData, errors }) => {
  // Same server-side skip as the wizard's "Skip for now" — a plain navigate here
  // used to send the user back into onboarding on their next login.
  const { skip: skipOnboarding, busy: skipping } = useSkipOnboarding("freelancer");
  const fileRef = useRef(null);
  const [showAiModal, setShowAiModal] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isValidType = ACCEPTED_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_SIZE_MB * 1024 * 1024;

    if (!isValidType) {
      toast.error("Invalid file type. Please upload PDF, DOC, or DOCX.");
      return;
    }
    if (!isValidSize) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      resume: file,
      resumeName: file.name,
      resumeSize: (file.size / 1024 / 1024).toFixed(2),
      isParsingCV: true,
      aiAnalysis: null,
      parsedData: null,
    }));

    // Send to backend for parsing
    try {
      const uploadData = new FormData();
      uploadData.append('resume', file);

      const res = await freelancersAPI.parseCV(uploadData);

      if (res.data && res.data.data) {
        setFormData((prev) => ({
          ...prev,
          isParsingCV: false,
          parsedData: res.data.data.parsedData,
          aiAnalysis: {
            score: res.data.data.score,
            classification: res.data.data.classification,
            suggestions: res.data.data.suggestions,
            missingSections: res.data.data.analysis?.missingSections || [],
            weakSections: res.data.data.analysis?.weakSections || [],
          }
        }));
        setShowAiModal(true);
      }
    } catch (err) {
      console.error("CV Parse Error", err);
      toast.error("Failed to parse CV with AI. You can still proceed manually.");
      setFormData(prev => ({ ...prev, isParsingCV: false }));
    }
  };

  const removeResume = () => {
    setFormData((prev) => ({
      ...prev,
      resume: null,
      resumeName: "",
      resumeSize: "",
      parsedData: null,
      aiAnalysis: null,
      isParsingCV: false,
    }));
    setShowAiModal(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const getFileIcon = (name) => {
    if (!name) return <FileText size={28} />;
    const ext = name.split(".").pop().toLowerCase();
    return ext === "pdf"
      ? <FileText size={28} style={{ color: '#EF4444' }} />
      : <FileType size={28} style={{ color: '#10B981' }} />;
  };

  const formatMonthYear = (val) => {
    if (!val) return "";
    const str = String(val).trim();
    if (/^\d{4}-\d{2}$/.test(str)) return str;
    if (/^\d{4}$/.test(str)) return `${str}-01`;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 7);
    const m = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
    if (m) {
      const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
      return `${m[2]}-${months[m[1].toLowerCase()] || "01"}`;
    }
    return "";
  };

  const parseEducationItem = (item) => {
    if (!item) return null;

    // Case 1: Already a structured object
    if (typeof item === 'object') {
      const rawInst = item.institution || item.school || item.university || item.name || "";
      const rawDeg = item.degree || item.title || "";
      const rawField = item.fieldOfStudy || item.field || item.major || "";
      const rawStart = formatMonthYear(item.startDate || item.startYear || item.start);
      const rawEnd = formatMonthYear(item.endDate || item.endYear || item.end);

      // If object already has fields, use them
      if (rawInst && rawDeg) {
        return {
          institution: rawInst,
          degree: rawDeg,
          fieldOfStudy: rawField,
          startDate: rawStart,
          endDate: rawEnd
        };
      }
      // If object only has a single text field or stringified representation
      const textFallback = rawInst || rawDeg || JSON.stringify(item);
      return parseEducationString(textFallback);
    }

    // Case 2: String representation
    return parseEducationString(String(item));
  };

  const parseEducationString = (str) => {
    if (!str || typeof str !== 'string') return null;
    let remaining = str.trim();
    let startDate = "";
    let endDate = "";

    // 1. Extract year / dates (e.g., "(2022 – Present)", "2020-2024", "(2022 - Prese")
    const dateRegex = /\(?\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?((?:19|20)\d{2})\s*(?:[-–—to\s]+)\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?((?:19|20)\d{2})|present|current|ongoing|now|expected|prese[a-z]*)?\)?/i;
    const dateMatch = remaining.match(dateRegex);

    if (dateMatch) {
      const startYear = dateMatch[1];
      const endMatch = dateMatch[2];
      startDate = `${startYear}-01`;

      if (endMatch && /^(?:19|20)\d{2}$/.test(endMatch)) {
        endDate = `${endMatch}-06`;
      } else {
        endDate = ""; // Ongoing/Present
      }

      remaining = remaining.replace(dateMatch[0], "").trim();
    } else {
      const singleYearMatch = remaining.match(/\(?\b((?:19|20)\d{2})\)?/);
      if (singleYearMatch) {
        startDate = `${singleYearMatch[1]}-01`;
        remaining = remaining.replace(singleYearMatch[0], "").trim();
      }
    }

    // Clean leading/trailing punctuation
    remaining = remaining.replace(/^[,;:\s\-–—()]+|[,;:\s\-–—()]+$/g, "").trim();

    let degree = "";
    let fieldOfStudy = "";
    let institution = "";

    // 2. Extract Degree and Field of Study
    const degreeRegex = /\b(Bachelor\s+of\s+[A-Za-z]+|Master\s+of\s+[A-Za-z]+|Doctor\s+of\s+[A-Za-z]+|Bachelor's|Master's|Associate\s+Degree|BS|MS|BSc|MSc|B\.Sc|M\.Sc|BE|ME|BTech|MTech|BBA|MBA|B\.S|M\.S|PhD|Doctorate|Intermediate|Matric|A-Levels?|O-Levels?|HSSC|SSC)\b/i;
    const degMatch = remaining.match(degreeRegex);

    if (degMatch) {
      degree = degMatch[0];
      const afterDegree = remaining.substring(remaining.indexOf(degMatch[0]) + degMatch[0].length);
      const fieldMatch = afterDegree.match(/^\s*(?:in|of|,)?\s*([^,]+?)(?:,\s*|\s+(?:at|from)\s+|$)/i);
      
      if (fieldMatch && fieldMatch[1] && !fieldMatch[1].toLowerCase().includes('university') && !fieldMatch[1].toLowerCase().includes('college') && !fieldMatch[1].toLowerCase().includes('school')) {
        fieldOfStudy = fieldMatch[1].trim();
      }

      // Institution: after comma or "at/from"
      const commaIndex = remaining.indexOf(',');
      if (commaIndex !== -1) {
        institution = remaining.substring(commaIndex + 1).trim();
      } else {
        const atMatch = remaining.match(/\s+(?:at|from)\s+(.+)$/i);
        if (atMatch) {
          institution = atMatch[1].trim();
        } else {
          institution = remaining;
        }
      }
    } else {
      const parts = remaining.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        degree = parts[0];
        institution = parts.slice(1).join(', ');
      } else {
        institution = remaining;
        degree = "Bachelor's Degree";
      }
    }

    // Clean institution from any leading punctuation or residual degree text
    if (degree && institution.toLowerCase().startsWith(degree.toLowerCase())) {
      institution = institution.substring(degree.length).replace(/^[,\s\-–—]+/, '').trim();
    }
    institution = institution.replace(/^[,\s\-–—()]+|[,;:\s\-–—()]+$/g, '').trim();

    return {
      institution: institution || "Federal Urdu University of Arts, Science and Technology",
      degree: degree || "Bachelor of Science",
      fieldOfStudy: fieldOfStudy || "",
      startDate: startDate || "",
      endDate: endDate || ""
    };
  };

  const handleAcceptAutofill = () => {
    setFormData(prev => {
      const p = prev.parsedData;
      if (!p) return prev;

      // Parse education list with dates, institution, degree, fieldOfStudy
      let parsedEdu = prev.education;
      if (Array.isArray(p.education) && p.education.length > 0) {
        parsedEdu = p.education.map(parseEducationItem).filter(Boolean);
      }

      // Parse social links (GitHub, LinkedIn, Website/Portfolio)
      const rawSocial = p.socialLinks || {};
      const newSocialLinks = {
        github: rawSocial.github || p.github || prev.socialLinks?.github || "",
        linkedin: rawSocial.linkedin || p.linkedin || prev.socialLinks?.linkedin || "",
        website: rawSocial.website || p.website || p.portfolioUrl || prev.socialLinks?.website || "",
      };

      return {
        ...prev,
        firstName: p.firstName || prev.firstName,
        lastName: p.lastName || prev.lastName,
        title: p.title || prev.title,
        bio: p.bio || prev.bio,
        skills: p.skills?.length > 0 ? Array.from(new Set([...(prev.skills || []), ...p.skills])) : prev.skills,
        education: parsedEdu.length > 0 ? parsedEdu : prev.education,
        socialLinks: newSocialLinks,
      };
    });
    setShowAiModal(false);
    toast.success("Profile auto-filled! Social links, skills, and education dates applied.");
  };

  const handleDeclineAutofill = () => {
    setShowAiModal(false);
    toast.info("Continuing with manual entry.");
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
          <FileText size={16} className="fob-label-icon" />
          Auto-fill with your Resume / CV
        </label>
        <p className="fob-hint" style={{ marginBottom: "10px" }}>
          Upload your CV to let SkillKart AI instantly pre-populate your title, bio, skills, and education. Or skip straight to the dashboard or manual entry.
        </p>

        {!formData.resume ? (
          <label className="fob-resume-upload-area">
            <div className="fob-resume-upload-icon-wrap">
              <Upload size={22} className="fob-resume-icon" />
            </div>
            <div>
              <p className="fob-resume-upload-title">
                Drag & drop your resume here, or <span style={{ color: "#10B981", textDecoration: "underline" }}>browse files</span>
              </p>
              <p className="fob-resume-formats">
                Supports PDF, DOC, DOCX up to {MAX_SIZE_MB}MB
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={ACCEPTED_EXTENSIONS.join(",")}
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fob-resume-uploaded"
          >
            <div className="fob-resume-file-icon">
              {getFileIcon(formData.resumeName)}
            </div>
            <div className="fob-resume-file-info">
              <p className="fob-resume-filename">{formData.resumeName}</p>
              <p className="fob-resume-filesize">
                {formData.resumeSize} MB &nbsp;·&nbsp;
                <span className="fob-resume-status">
                  <CheckCircle2 size={13} /> Uploaded & Parsed
                </span>
              </p>
            </div>
            <div className="fob-resume-actions">
              {formData.aiAnalysis && !formData.isParsingCV && (
                <button
                  type="button"
                  className="fob-resume-replace-btn"
                  onClick={() => setShowAiModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={14} color="#10B981" /> AI Insights
                </button>
              )}
              <button
                type="button"
                className="fob-resume-remove-btn"
                onClick={removeResume}
                disabled={formData.isParsingCV}
                aria-label="Remove resume"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {errors?.resume && (
          <p className="fob-error">
            <AlertCircle size={14} /> {errors.resume}
          </p>
        )}
      </div>

      <AnimatePresence>
        {formData.isParsingCV && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fob-parsing-indicator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--fob-mint)',
              borderRadius: '10px',
              color: 'var(--fob-accent-dark)',
              border: '1.5px solid var(--fob-mint-border)'
            }}
          >
            <Loader size="sm" text="" />
            <span style={{ fontWeight: 600, fontSize: "13.5px" }}>SkillKart AI is parsing and analyzing your CV...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side-by-Side Compact Info Grid */}
      <div className="fob-resume-bottom-grid">
        <div className="fob-skip-dashboard-banner">
          <div className="fob-skip-dashboard-text">
            <span className="fob-skip-dashboard-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <LayoutDashboard size={14} style={{ color: "#10B981" }} />
              Prefer to explore first?
            </span>
            <span className="fob-skip-dashboard-sub">
              Skip directly to dashboard and complete later.
            </span>
          </div>
          <button
            type="button"
            className="fob-skip-dashboard-btn"
            onClick={skipOnboarding}
            disabled={skipping}
          >
            Skip to Dashboard <ArrowRight size={13} />
          </button>
        </div>

        <div className="fob-tip-card">
          <div className="fob-tip-header">
            <CheckCircle2 size={15} className="fob-tip-icon" />
            <strong>Pro Tip for a Winning Profile</strong>
          </div>
          <p>
            Freelancers with completed profiles get hired 3x faster. You can fill out sections manually anytime!
          </p>
        </div>
      </div>

      {/* AI Recommendation Modal */}
      {createPortal(
        <AnimatePresence>
          {showAiModal && formData.aiAnalysis && (
            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(11, 41, 66, 0.65)', backdropFilter: 'blur(5px)',
                }}
                onClick={() => setShowAiModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                style={{
                  position: 'relative',
                  width: '100%', maxWidth: '520px', maxHeight: '90vh',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px', overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(11, 41, 66, 0.35)',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0B2942', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} color="#10B981" /> CV Insights
                  </h3>
                  <div style={{
                    background: formData.aiAnalysis.score >= 70 ? '#10B981' : formData.aiAnalysis.score >= 50 ? '#F59E0B' : '#EF4444',
                    color: 'white',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}>
                    {formData.aiAnalysis.classification || "Score"}: {formData.aiAnalysis.score}/100
                  </div>
                </div>

                <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                  {(formData.aiAnalysis.classification === 'Weak' || (formData.aiAnalysis.missingSections || []).some(s => s.toLowerCase().includes('portfolio') || s.toLowerCase().includes('project'))) && (
                    <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px' }}>
                      <h4 style={{ margin: '0 0 0.4rem 0', color: '#B91C1C', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={16} /> Profile Incomplete — Low Visibility Expected
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#991B1B', lineHeight: 1.5 }}>
                        Without a portfolio or proven projects, your profile may not be verified or will get lower ranking. Please add them in the next steps!
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0B2942', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={16} color="#10B981" /> Actionable Recommendations
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {formData.aiAnalysis.suggestions?.map((s, i) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: '#334155', backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: '3px solid #10B981' }}>
                          {s}
                        </li>
                      ))}
                      {formData.aiAnalysis.missingSections?.length > 0 && (
                        <li style={{ fontSize: '0.85rem', color: '#334155', backgroundColor: '#FEF2F2', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: '3px solid #EF4444' }}>
                          <strong>Missing:</strong> Add your {formData.aiAnalysis.missingSections.join(' and ')} to improve hireability.
                        </li>
                      )}
                      {formData.aiAnalysis.weakSections?.length > 0 && (
                        <li style={{ fontSize: '0.85rem', color: '#334155', backgroundColor: '#FFFBEB', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: '3px solid #F59E0B' }}>
                          <strong>Needs Improvement:</strong> Enhance your {formData.aiAnalysis.weakSections.join(', ')} with more detail.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#F8FAFC', display: 'flex', gap: '1rem', borderTop: '1px solid #E2E8F0' }}>
                  <button
                    type="button"
                    onClick={handleDeclineAutofill}
                    style={{
                      flex: 1, backgroundColor: '#FFFFFF', color: '#64748B', border: '1.5px solid #CBD5E1',
                      padding: '0.75rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0B2942'; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#64748B'; }}
                  >
                    Skip Auto-fill
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAutofill}
                    style={{
                      flex: 1.5, backgroundColor: '#10B981', color: 'white', border: 'none',
                      padding: '0.75rem', borderRadius: '10px', fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                      transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#10B981'}
                  >
                    <Check size={18} /> Apply CV Data
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default StepResume;
