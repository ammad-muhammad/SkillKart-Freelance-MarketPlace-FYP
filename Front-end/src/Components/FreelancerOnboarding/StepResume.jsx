import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, X, CheckCircle2, AlertCircle, FileType } from "lucide-react";
import { toast } from "react-toastify";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_MB = 5;

const StepResume = ({ formData, setFormData, errors }) => {
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
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
    }));
  };

  const removeResume = () => {
    setFormData((prev) => ({
      ...prev,
      resume: null,
      resumeName: "",
      resumeSize: "",
    }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const getFileIcon = (name) => {
    if (!name) return <FileText size={28} />;
    const ext = name.split(".").pop().toLowerCase();
    return ext === "pdf"
      ? <FileText size={28} style={{ color: '#ef4444' }} />
      : <FileType size={28} style={{ color: '#1a6fa8' }} />;
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
          Upload Resume / CV
        </label>
        <p className="fob-hint">
          A resume increases your chances of getting hired by 40%. Accepted: PDF, DOC, DOCX (max {MAX_SIZE_MB}MB).
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
                  <CheckCircle2 size={13} /> Ready to upload
                </span>
              </p>
            </div>
            <div className="fob-resume-actions">
              <label className="fob-resume-replace-btn">
                Replace
                <input
                  type="file"
                  hidden
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  onChange={handleFileChange}
                />
              </label>
              <button
                type="button"
                className="fob-resume-remove-btn"
                onClick={removeResume}
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

      <div className="fob-tip-card">
        <div className="fob-tip-header">
          <CheckCircle2 size={18} className="fob-tip-icon" />
          <strong>Resume Tips</strong>
        </div>
        <ul className="fob-tip-list">
          <li>Keep your resume to 1-2 pages maximum</li>
          <li>Include relevant work experience and measurable achievements</li>
          <li>Tailor it to your target freelance niche</li>
          <li>Use a clean, ATS-friendly format</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default StepResume;
