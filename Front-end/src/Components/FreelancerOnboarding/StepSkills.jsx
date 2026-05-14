import React from "react";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import TagInput from "../common/TagInput/TagInput";

const StepSkills = ({ formData, setFormData, errors }) => {
  const skills = formData.skills || [];

  const handleSkillsChange = (newSkills) => {
    setFormData((prev) => ({
      ...prev,
      skills: newSkills,
    }));
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
          <Tag size={15} className="fob-label-icon" />
          Your Skills*
        </label>
        
        <TagInput 
          tags={skills} 
          onChange={handleSkillsChange}
          placeholder="Type a skill (e.g. React) and press Enter..."
        />

        <p className="fob-hint" style={{ marginTop: '0.75rem' }}>
          Our AI will validate your skills and suggest related ones as you type.
        </p>
        {errors?.skills && <p className="fob-error">{errors.skills}</p>}
      </div>

      {skills.length > 0 && (
        <div className="fob-skills-count-badge" style={{ marginTop: '1.5rem' }}>
          {skills.length} skill{skills.length !== 1 ? "s" : ""} added
        </div>
      )}
    </motion.div>
  );
};

export default StepSkills;
