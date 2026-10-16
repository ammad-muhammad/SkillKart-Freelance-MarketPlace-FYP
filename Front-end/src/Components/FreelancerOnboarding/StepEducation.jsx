import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Plus, Trash2 } from "lucide-react";

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

  remaining = remaining.replace(/^[,;:\s\-–—()]+|[,;:\s\-–—()]+$/g, "").trim();

  let degree = "";
  let fieldOfStudy = "";
  let institution = "";

  const degreeRegex = /\b(Bachelor\s+of\s+[A-Za-z]+|Master\s+of\s+[A-Za-z]+|Doctor\s+of\s+[A-Za-z]+|Bachelor's|Master's|Associate\s+Degree|BS|MS|BSc|MSc|B\.Sc|M\.Sc|BE|ME|BTech|MTech|BBA|MBA|B\.S|M\.S|PhD|Doctorate|Intermediate|Matric|A-Levels?|O-Levels?|HSSC|SSC)\b/i;
  const degMatch = remaining.match(degreeRegex);

  if (degMatch) {
    degree = degMatch[0];
    const afterDegree = remaining.substring(remaining.indexOf(degMatch[0]) + degMatch[0].length);
    const fieldMatch = afterDegree.match(/^\s*(?:in|of|,)?\s*([^,]+?)(?:,\s*|\s+(?:at|from)\s+|$)/i);
    
    if (fieldMatch && fieldMatch[1] && !fieldMatch[1].toLowerCase().includes('university') && !fieldMatch[1].toLowerCase().includes('college') && !fieldMatch[1].toLowerCase().includes('school')) {
      fieldOfStudy = fieldMatch[1].trim();
    }

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

const StepEducation = ({ formData, setFormData, errors }) => {
  const education = formData.education || [];

  // Auto-clean any unparsed or raw strings left from older CV parsing drafts
  React.useEffect(() => {
    if (!formData.education || formData.education.length === 0) return;
    let needsUpdate = false;
    const cleaned = formData.education.map(item => {
      if (item.degree === "Parsed degree" || (item.institution && /\((?:19|20)\d{2}/.test(item.institution))) {
        needsUpdate = true;
        const parsed = parseEducationString(item.institution);
        if (parsed) {
          return {
            institution: parsed.institution || item.institution,
            degree: parsed.degree || item.degree,
            fieldOfStudy: parsed.fieldOfStudy || item.fieldOfStudy || "",
            startDate: parsed.startDate || item.startDate || "",
            endDate: parsed.endDate || item.endDate || ""
          };
        }
      }
      return item;
    });

    if (needsUpdate) {
      setFormData(prev => ({ ...prev, education: cleaned }));
    }
  }, []);

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
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -25 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="fob-form-group">
        <div className="fob-section-header">
          <div>
            <label className="fob-label">
              <GraduationCap size={16} className="fob-label-icon" />
              Academic History & Degrees
            </label>
            <p className="fob-hint">
              List your universities, degrees, and academic qualifications to build credibility with clients.
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
              <GraduationCap size={42} className="fob-empty-icon" />
              <p style={{ fontWeight: 600, color: "var(--fob-text)", marginBottom: "4px" }}>
                No education history added yet
              </p>
              <p style={{ fontSize: "13px", color: "var(--fob-text-muted)" }}>
                Click "Add Education" to include your college or university credentials.
              </p>
            </motion.div>
          )}

          {education.map((edu, index) => (
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
                  <GraduationCap size={14} style={{ color: "#10B981" }} />
                  Education #{index + 1}
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
                <label className="fob-label">Institution / University*</label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) =>
                    updateEducation(index, "institution", e.target.value)
                  }
                  className="fob-input"
                  placeholder="e.g. National University of Sciences and Technology (NUST)"
                />
              </div>

              <div className="fob-form-row">
                <div className="fob-form-group">
                  <label className="fob-label">Degree Earned*</label>
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
                    placeholder="e.g. Software Engineering"
                  />
                </div>
              </div>

              <div className="fob-form-row" style={{ marginBottom: 0 }}>
                <div className="fob-form-group" style={{ marginBottom: 0 }}>
                  <label className="fob-label">Start Date*</label>
                  <input
                    type="month"
                    value={edu.startDate}
                    onChange={(e) =>
                      updateEducation(index, "startDate", e.target.value)
                    }
                    className="fob-input"
                  />
                </div>
                <div className="fob-form-group" style={{ marginBottom: 0 }}>
                  <label className="fob-label">End Date (or Expected)</label>
                  <input
                    type="month"
                    value={edu.endDate}
                    onChange={(e) =>
                      updateEducation(index, "endDate", e.target.value)
                    }
                    className="fob-input"
                    placeholder="Leave empty if currently enrolled"
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
