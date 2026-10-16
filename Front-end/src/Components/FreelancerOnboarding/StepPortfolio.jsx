import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, Trash2, ExternalLink, ImagePlus, X, Sparkles } from "lucide-react";
import { safeToast as toast } from "../../utils/safeToast";
import { freelancersAPI } from "../../api/freelancers";
import AiGenerateText from "../common/AiSuggest/AiGenerateText";
import ImageSourcePicker from "../common/ImageSourcePicker/ImageSourcePicker";

const StepPortfolio = ({ formData, setFormData, errors }) => {
  const fileInputRefs = useRef([]);
  const portfolio = formData.portfolio || [];

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      portfolio: [
        ...(prev.portfolio || []),
        { title: "", description: "", url: "", images: [], imagePreviews: [] },
      ],
    }));
  };

  const removeProject = (index) => {
    setFormData((prev) => ({
      ...prev,
      portfolio: (prev.portfolio || []).filter((_, i) => i !== index),
    }));
  };

  const updateProject = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.portfolio || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, portfolio: updated };
    });
  };

  const handleImageUpload = async (index, e) => {
    const files = Array.from(e.target.files);
    const validImages = files.filter((f) => f.type.startsWith("image/"));

    if (validImages.length === 0) return;

    // Show local previews first for responsive UX
    const localPreviews = validImages.map(f => URL.createObjectURL(f));
    
    setFormData((prev) => {
      const updated = [...(prev.portfolio || [])];
      updated[index] = {
        ...updated[index],
        imagePreviews: [...(updated[index].imagePreviews || []), ...localPreviews]
      };
      return { ...prev, portfolio: updated };
    });

    toast.info(`Uploading ${validImages.length} image(s)...`);

    try {
      const uploadPromises = validImages.map(async (file) => {
        const mediaData = new FormData();
        mediaData.append("image", file);
        const res = await freelancersAPI.uploadPortfolioMedia(mediaData);
        return res.data.data.url;
      });

      const permanentUrls = await Promise.all(uploadPromises);

      setFormData((prev) => {
        const updated = [...(prev.portfolio || [])];
        updated[index] = {
          ...updated[index],
          images: [...(updated[index].images || []), ...permanentUrls],
          imagePreviews: [...(updated[index].images || []), ...permanentUrls]
        };
        return { ...prev, portfolio: updated };
      });
      
      toast.success("Project images uploaded successfully!");
    } catch (error) {
      console.error("Portfolio upload error:", error);
      toast.error("Failed to upload portfolio images.");
      setFormData((prev) => {
        const updated = [...(prev.portfolio || [])];
        const currentImages = updated[index].images || [];
        updated[index] = {
          ...updated[index],
          imagePreviews: currentImages
        };
        return { ...prev, portfolio: updated };
      });
    }
  };

  const removeImage = (projectIndex, imgIndex) => {
    setFormData((prev) => {
      const updated = [...(prev.portfolio || [])];
      const newImages = (updated[projectIndex].images || []).filter((_, i) => i !== imgIndex);
      updated[projectIndex] = {
        ...updated[projectIndex],
        images: newImages,
        imagePreviews: newImages
      };
      return { ...prev, portfolio: updated };
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
              <FolderOpen size={16} className="fob-label-icon" />
              Portfolio Projects & Case Studies
            </label>
            <p className="fob-hint">
              Showcase tangible proofs of work. Freelancers with verified portfolio projects get 3x higher client conversion.
            </p>
          </div>
          <button type="button" className="fob-add-btn" onClick={addProject}>
            <Plus size={16} />
            Add Project
          </button>
        </div>

        <AnimatePresence>
          {portfolio.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fob-empty-state"
            >
              <FolderOpen size={42} className="fob-empty-icon" />
              <p style={{ fontWeight: 600, color: "var(--fob-text)", marginBottom: "4px" }}>
                No projects added yet
              </p>
              <p style={{ fontSize: "13px", color: "var(--fob-text-muted)" }}>
                Click "Add Project" above to highlight your best achievements.
              </p>
            </motion.div>
          )}

          {portfolio.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="fob-dynamic-item"
            >
              <div className="fob-dynamic-item-header">
                <span className="fob-item-number">
                  <FolderOpen size={14} style={{ color: "#10B981" }} />
                  Project #{index + 1}
                </span>
                <button
                  type="button"
                  className="fob-remove-btn"
                  onClick={() => removeProject(index)}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>

              <div className="fob-form-group">
                <label className="fob-label">Project Title*</label>
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) => updateProject(index, "title", e.target.value)}
                  className="fob-input"
                  placeholder="e.g. Modern E-commerce Platform with Stripe & Next.js"
                />
              </div>

              <div className="fob-form-group">
                <label className="fob-label">Description & Key Highlights*</label>
                <textarea
                  value={project.description}
                  onChange={(e) =>
                    updateProject(index, "description", e.target.value)
                  }
                  className="fob-textarea"
                  placeholder="Describe the challenge, tech stack utilized, your role, and quantitative outcomes..."
                  rows={3}
                />
                <div style={{ marginTop: "8px" }}>
                  <AiGenerateText
                    fieldLabel="a portfolio project description on a freelancer's profile — the project, their role, technologies used, and impact"
                    getContext={() => ({ title: project.title, url: project.url })}
                    getExistingText={() => project.description}
                    onGenerated={(text) => updateProject(index, 'description', text)}
                  />
                </div>
              </div>

              <div className="fob-form-group">
                <label className="fob-label">
                  <ExternalLink size={14} className="fob-label-icon" />
                  Live Demo or Repository URL
                </label>
                <input
                  type="url"
                  value={project.url}
                  onChange={(e) => updateProject(index, "url", e.target.value)}
                  className="fob-input"
                  placeholder="https://example.com/demo or https://github.com/..."
                />
              </div>

              <div className="fob-form-group" style={{ marginBottom: 0 }}>
                <label className="fob-label">
                  <ImagePlus size={14} className="fob-label-icon" />
                  Screenshots & Media
                </label>

                {(project.imagePreviews || []).length > 0 && (
                  <div className="fob-image-grid">
                    {project.imagePreviews.map((src, imgIdx) => (
                      <div key={imgIdx} className="fob-image-preview">
                        <img src={src} alt={`Preview ${imgIdx + 1}`} />
                        <button
                          type="button"
                          className="fob-image-remove"
                          onClick={() => removeImage(index, imgIdx)}
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="fob-upload-area" onClick={() => fileInputRefs.current[index]?.click()}>
                  <ImagePlus size={24} className="fob-upload-icon" />
                  <span>Click to select and upload images</span>
                  <span className="fob-upload-formats">PNG, JPG, WEBP up to 5MB each</span>
                  <ImageSourcePicker
                    multiple
                    accept="image/*"
                    ref={(el) => (fileInputRefs.current[index] = el)}
                    onChange={(e) => handleImageUpload(index, e)}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {errors?.portfolio && <p className="fob-error">{errors.portfolio}</p>}
    </motion.div>
  );
};

export default StepPortfolio;
