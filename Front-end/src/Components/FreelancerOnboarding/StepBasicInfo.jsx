import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, AlignLeft, DollarSign, Clock, ChevronDown, Check,
  Zap, Moon, FileText, XCircle, Globe, Github, Linkedin, Award, Link
} from "lucide-react";

const AVAILABILITY_OPTIONS = [
  { value: "full-time",     label: "Full Time",     desc: "40+ hrs/week",     Icon: Zap       },
  { value: "part-time",     label: "Part Time",     desc: "20 hrs/week",      Icon: Moon      },
  { value: "contract",      label: "Contract",      desc: "Project-based",    Icon: FileText  },
  { value: "not-available", label: "Not Available", desc: "Unavailable now",  Icon: XCircle   },
];

/* ── Custom Dropdown ──────────────────────────────────────────── */
const CustomDropdown = ({ value, onChange, placeholder = "Select an option", options, error }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`fob-dropdown ${error ? "fob-dropdown--error" : ""}`}>
      {/* Trigger */}
      <button
        type="button"
        className={`fob-dropdown-trigger ${open ? "fob-dropdown-trigger--open" : ""} ${value ? "fob-dropdown-trigger--selected" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="fob-dropdown-value">
          {selected ? (
            <>
              <span className="fob-dropdown-icon-wrap"><selected.Icon size={16} /></span>
              <span className="fob-dropdown-label-text">{selected.label}</span>
              <span className="fob-dropdown-desc-inline">— {selected.desc}</span>
            </>
          ) : (
            <span className="fob-dropdown-placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={`fob-dropdown-chevron ${open ? "fob-dropdown-chevron--rotated" : ""}`}
        />
      </button>

      {/* Menu */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            className="fob-dropdown-menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {options.map((opt) => {
              const isActive = value === opt.value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isActive}
                  className={`fob-dropdown-option ${isActive ? "fob-dropdown-option--active" : ""}`}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  <span className="fob-dropdown-option-icon"><opt.Icon size={16} /></span>
                  <span className="fob-dropdown-option-body">
                    <span className="fob-dropdown-option-label">{opt.label}</span>
                    <span className="fob-dropdown-option-desc">{opt.desc}</span>
                  </span>
                  {isActive && <Check size={15} className="fob-dropdown-option-check" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Step Component ───────────────────────────────────────────── */
const StepBasicInfo = ({ formData, setFormData, errors }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Professional Title */}
      <div className="fob-form-group">
        <label className="fob-label">
          <Briefcase size={15} className="fob-label-icon" />
          Professional Title*
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`fob-input ${errors?.title ? "fob-input--error" : ""}`}
          placeholder="e.g. Senior React Developer"
        />
        {errors?.title && <p className="fob-error">{errors.title}</p>}
      </div>

      {/* Bio */}
      <div className="fob-form-group">
        <label className="fob-label">
          <AlignLeft size={15} className="fob-label-icon" />
          Professional Bio*
        </label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          className={`fob-textarea ${errors?.bio ? "fob-input--error" : ""}`}
          placeholder="Tell clients about your experience, expertise, and what makes you stand out..."
          rows={4}
        />
        <p className="fob-hint">{formData.bio?.length || 0}/500 characters</p>
        {errors?.bio && <p className="fob-error">{errors.bio}</p>}
      </div>

      {/* Hourly Rate + Availability row */}
      <div className="fob-form-row">
        <div className="fob-form-group">
          <label className="fob-label">
            <DollarSign size={15} className="fob-label-icon" />
            Hourly Rate (USD)*
          </label>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix">$</span>
            <input
              type="number"
              name="hourlyRate"
              value={formData.hourlyRate}
              onChange={handleChange}
              className={`fob-input fob-input--prefixed ${
                errors?.hourlyRate ? "fob-input--error" : ""
              }`}
              placeholder="50"
              min="1"
            />
            <span className="fob-input-suffix">/hr</span>
          </div>
          {errors?.hourlyRate && (
            <p className="fob-error">{errors.hourlyRate}</p>
          )}
        </div>

        <div className="fob-form-group">
          <label className="fob-label">
            <Clock size={15} className="fob-label-icon" />
            Availability*
          </label>
          <CustomDropdown
            value={formData.availability}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, availability: val }))
            }
            options={AVAILABILITY_OPTIONS}
            placeholder="Select availability"
            error={errors?.availability}
          />
          {errors?.availability && (
            <p className="fob-error">{errors.availability}</p>
          )}
        </div>
      </div>

      {/* Visual Availability Cards */}
      <div className="fob-availability-cards">
        {AVAILABILITY_OPTIONS.map((opt) => (
          <div
            key={opt.value}
            className={`fob-avail-card ${
              formData.availability === opt.value ? "fob-avail-card--active" : ""
            }`}
            onClick={() =>
              setFormData((prev) => ({ ...prev, availability: opt.value }))
            }
          >
            <span className="fob-avail-icon"><opt.Icon size={18} /></span>
            <span className="fob-avail-label">{opt.label}</span>
            <span className="fob-avail-desc">{opt.desc}</span>
          </div>
        ))}
      </div>

      {/* Experience Level + Timezone row */}
      <div className="fob-form-row" style={{ marginTop: '24px' }}>
        <div className="fob-form-group">
          <label className="fob-label">
            <Award size={15} className="fob-label-icon" />
            Experience Level*
          </label>
          <select
            name="experienceLevel"
            value={formData.experienceLevel}
            onChange={handleChange}
            className="fob-input"
          >
            <option value="Entry">Entry (0-2 years)</option>
            <option value="Intermediate">Intermediate (2-5 years)</option>
            <option value="Expert">Expert (5+ years)</option>
          </select>
        </div>

        <div className="fob-form-group">
          <label className="fob-label">
            <Globe size={15} className="fob-label-icon" />
            Timezone / Location*
          </label>
          <input
            type="text"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            className="fob-input"
            placeholder="e.g. GMT+5 (Pakistan) or New York"
          />
        </div>
      </div>

      {/* Social Links */}
      <div className="fob-form-group" style={{ marginTop: '12px' }}>
        <label className="fob-label">
          <Link size={15} className="fob-label-icon" />
          Social & Portfolio Links
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix"><Github size={16} /></span>
            <input
              type="text"
              value={formData.socialLinks?.github || ""}
              onChange={(e) => setFormData(p => ({ ...p, socialLinks: { ...p.socialLinks, github: e.target.value } }))}
              className="fob-input fob-input--prefixed"
              placeholder="GitHub Profile URL"
            />
          </div>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix"><Linkedin size={16} /></span>
            <input
              type="text"
              value={formData.socialLinks?.linkedin || ""}
              onChange={(e) => setFormData(p => ({ ...p, socialLinks: { ...p.socialLinks, linkedin: e.target.value } }))}
              className="fob-input fob-input--prefixed"
              placeholder="LinkedIn Profile URL"
            />
          </div>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix"><Globe size={16} /></span>
            <input
              type="text"
              value={formData.socialLinks?.website || ""}
              onChange={(e) => setFormData(p => ({ ...p, socialLinks: { ...p.socialLinks, website: e.target.value } }))}
              className="fob-input fob-input--prefixed"
              placeholder="Personal Portfolio/Website"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StepBasicInfo;
