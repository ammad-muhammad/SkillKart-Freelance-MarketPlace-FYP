import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, X, CheckCircle2, AlertCircle, FileType, Zap, Check, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import { freelancersAPI } from "../../api/freelancers";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_MB = 5;

const StepResume = ({ formData, setFormData, errors }) => {
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
      ? <FileText size={28} style={{ color: '#ef4444' }} />
      : <FileType size={28} style={{ color: '#1a6fa8' }} />;
  };

  const handleAcceptAutofill = () => {
    setFormData(prev => {
      const p = prev.parsedData;
      if (!p) return prev;
      return {
        ...prev,
        title: p.title || prev.title,
        bio: p.bio || prev.bio,
        skills: p.skills?.length > 0 ? Array.from(new Set([...(prev.skills || []), ...p.skills])) : prev.skills,
        education: p.education?.length > 0 ? p.education.map(e => ({ institution: e, degree: "Parsed degree", year: "" })) : prev.education,
      };
    });
    setShowAiModal(false);
    toast.success("Profile auto-filled! You can review and tweak the details in the next steps.");
  };

  const handleDeclineAutofill = () => {
    setShowAiModal(false);
    toast.info("Continuing with manual entry.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="fob-form-group">
        <label className="fob-label">
          <FileText size={15} className="fob-label-icon" />
          Auto-fill with your CV
        </label>
        <p className="fob-hint">
          Upload your CV to instantly populate your profile, or skip this step to fill everything manually. Accepted: PDF, DOC, DOCX (max {MAX_SIZE_MB}MB).
        </p>

        {!formData.resume ? (
          <label className="fob-resume-upload-area">
            <div className="fob-resume-upload-icon-wrap">
              <Upload size={32} className="fob-resume-icon" />
            </div>
            <p className="fob-resume-upload-title">
              Drag & drop or click to upload
            </p>
            <p className="fob-resume-formats">
              {ACCEPTED_EXTENSIONS.join(", ")} · Max {MAX_SIZE_MB}MB
            </p>
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
            initial={{ opacity: 0, scale: 0.95 }}
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
                  <CheckCircle2 size={13} /> Uploaded
                </span>
              </p>
            </div>
            <div className="fob-resume-actions">
              {formData.aiAnalysis && !formData.isParsingCV && (
                <button
                  type="button"
                  className="fob-resume-replace-btn"
                  onClick={() => setShowAiModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Sparkles size={14} color="#f59e0b" /> View Insights
                </button>
              )}
              <button
                type="button"
                className="fob-resume-remove-btn"
                onClick={removeResume}
                disabled={formData.isParsingCV}
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
            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6' }}
          >
            <div className="fob-loader" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', borderTopColor: '#3b82f6' }} />
            <span style={{ fontWeight: 500 }}>SkillKart AI is parsing and analyzing your CV...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fob-tip-card" style={{ marginTop: '1.5rem' }}>
        <div className="fob-tip-header">
          <CheckCircle2 size={18} className="fob-tip-icon" />
          <strong>Pro Tip for a Winning Profile</strong>
        </div>
        <p className="fob-tip-text" style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
          Freelancers with completed profiles and well-written summaries get hired 3x faster. If you skip the CV upload, be sure to fill out the upcoming sections thoroughly!
        </p>
      </div>

      {/* AI Recommendation Modal */}
      <AnimatePresence>
        {showAiModal && formData.aiAnalysis && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                zIndex: 9998,
              }}
              onClick={() => setShowAiModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                position: 'fixed', top: '10%', left: '50%', x: '-50%', y: '-50%',
                width: '90%', maxWidth: '500px', backgroundColor: '#fff',
                borderRadius: '16px', zIndex: 9999, overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #f8fafc, #ffffff)' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#f59e0b" /> CV Insights
                </h3>
                <div style={{ background: formData.aiAnalysis.score >= 70 ? '#10b981' : formData.aiAnalysis.score >= 50 ? '#f59e0b' : '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 700 }}>
                  {formData.aiAnalysis.classification || "Score"}: {formData.aiAnalysis.score}/100
                </div>
              </div>

              <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                {(formData.aiAnalysis.classification === 'Weak' || (formData.aiAnalysis.missingSections || []).some(s => s.toLowerCase().includes('portfolio') || s.toLowerCase().includes('project'))) && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#b91c1c', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={16} /> Profile Incomplete — Low Visibility Expected
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b', lineHeight: 1.5 }}>
                      Without a portfolio or proven projects, your profile may not be verified or will get a lower ranking in search results. Please ensure you add them manually in the next steps!
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={16} color="#3b82f6" /> Actionable Recommendations
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {formData.aiAnalysis.suggestions?.map((s, i) => (
                      <li key={i} style={{ fontSize: '0.875rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                        {s}
                      </li>
                    ))}
                    {formData.aiAnalysis.missingSections?.length > 0 && (
                      <li style={{ fontSize: '0.875rem', color: '#475569', backgroundColor: '#fef2f2', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                        <strong>Missing:</strong> Add your {formData.aiAnalysis.missingSections.join(' and ')} to improve hireability.
                      </li>
                    )}
                    {formData.aiAnalysis.weakSections?.length > 0 && (
                      <li style={{ fontSize: '0.875rem', color: '#475569', backgroundColor: '#fffbeb', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                        <strong>Needs Improvement:</strong> Enhance your {formData.aiAnalysis.weakSections.join(', ')} with more detail.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', display: 'flex', gap: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={handleDeclineAutofill}
                  style={{ flex: 1, backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                  Skip Auto-fill
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAutofill}
                  style={{ flex: 1.5, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  <Check size={18} /> Apply CV Data
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default StepResume;
