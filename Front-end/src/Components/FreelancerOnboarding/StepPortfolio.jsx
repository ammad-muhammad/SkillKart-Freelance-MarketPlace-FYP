import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, Trash2, ExternalLink, ImagePlus, X, Loader2 } from "lucide-react";
import { freelancersAPI } from "../../api/freelancers";
import { toast } from "react-toastify";

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

    // Show local previews first for better UX
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
        // Replace previews with permanent URLs in the main images array
        updated[index] = {
          ...updated[index],
          images: [...(updated[index].images || []), ...permanentUrls],
          // We can clear previews or keep them, but let's sync them
          imagePreviews: [...(updated[index].images || []), ...permanentUrls]
        };
        return { ...prev, portfolio: updated };
      });
      
      toast.success("Images uploaded successfully!");
    } catch (error) {
      console.error("Portfolio upload error:", error);
      toast.error("Failed to upload portfolio images.");
      // Remove the local previews on failure
      setFormData((prev) => {
        const updated = [...(prev.portfolio || [])];
        const currentImages = updated[index].images || [];
        updated[index] = {
          ...updated[index],
          imagePreviews: currentImages // Revert to only confirmed images
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
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="fob-form-group">
        <div className="fob-section-header">
          <div>
            <label className="fob-label">
              <FolderOpen size={15} className="fob-label-icon" />
              Portfolio Projects
            </label>
            <p className="fob-hint">
              Showcase your best work. Good portfolios increase hire rates by 3x.
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
              <FolderOpen size={40} className="fob-empty-icon" />
              <p>No projects yet. Add your first portfolio project!</p>
            </motion.div>
          )}

          {portfolio.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="fob-dynamic-item"
            >
              <div className="fob-dynamic-item-header">
                <span className="fob-item-number">
                  <FolderOpen size={14} /> Project #{index + 1}
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
                  placeholder="e.g. E-commerce Platform for Fashion Brand"
                />
              </div>

              <div className="fob-form-group">
                <label className="fob-label">Description*</label>
                <textarea
                  value={project.description}
                  onChange={(e) =>
                    updateProject(index, "description", e.target.value)
                  }
                  className="fob-textarea"
                  placeholder="Describe the project, your role, technologies used, and impact..."
                  rows={3}
                />
              </div>

              <div className="fob-form-group">
                <label className="fob-label">
                  <ExternalLink size={13} className="fob-label-icon" />
                  Project URL
                </label>
                <input
                  type="url"
                  value={project.url}
                  onChange={(e) => updateProject(index, "url", e.target.value)}
                  className="fob-input"
                  placeholder="https://your-project.com"
                />
              </div>

              <div className="fob-form-group">
                <label className="fob-label">
                  <ImagePlus size={13} className="fob-label-icon" />
                  Project Screenshots
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
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="fob-upload-area">
                  <ImagePlus size={24} className="fob-upload-icon" />
                  <span>Click to upload images</span>
                  <span className="fob-upload-formats">PNG, JPG, WEBP up to 5MB each</span>
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    ref={(el) => (fileInputRefs.current[index] = el)}
                    onChange={(e) => handleImageUpload(index, e)}
                  />
                </label>
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
