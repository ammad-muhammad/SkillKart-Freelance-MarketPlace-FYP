import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, AlignLeft, Tag, Clock, ChevronDown, Check,
  Zap, Moon, FileText, XCircle, Globe, Github, Linkedin, Award, Link,
  User, Upload, Globe2
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { timezones, getCurrentTimezone } from "../../utils/timezones";
import ComboSelect from "../common/ComboSelect/ComboSelect";

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
const StepBasicInfo = ({ formData, setFormData, errors, handleImageUpload }) => {
  const { user } = useAuth();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!formData.timezone) {
      setFormData(prev => ({
        ...prev,
        timezone: getCurrentTimezone()?.label || ''
      }));
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Name Section */}
      <div className="fob-form-row">
        <div className="fob-form-group">
          <label className="fob-label">
            <User size={15} className="fob-label-icon" />
            First Name*
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`fob-input ${errors?.firstName ? "fob-input--error" : ""}`}
            placeholder="John"
          />
          {errors?.firstName && <p className="fob-error">{errors.firstName}</p>}
        </div>
        <div className="fob-form-group">
          <label className="fob-label">
            <User size={15} className="fob-label-icon" />
            Last Name*
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`fob-input ${errors?.lastName ? "fob-input--error" : ""}`}
            placeholder="Doe"
          />
          {errors?.lastName && <p className="fob-error">{errors.lastName}</p>}
        </div>
      </div>

      {/* Profile Picture Upload */}
      <div className="fob-profile-pic-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div className="fob-avatar-container" style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
          {formData.profilePicUrl ? (
            <img src={formData.profilePicUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={40} color="#94a3b8" />
          )}
          <label style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
            <Upload size={24} />
            <span style={{ fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>Upload</span>
            <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
          </label>
        </div>
        <span className="fob-label" style={{ marginTop: '12px', marginBottom: '4px' }}>Profile Picture</span>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>WEBP, PNG or JPG, max 5MB</p>
      </div>
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
            <Tag size={15} className="fob-label-icon" />
            Hourly Rate (PKR)*
          </label>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix">Rs. </span>
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
          <ComboSelect
            id="fob-experience"
            options={[
              { value: 'Entry', label: 'Entry (0-2 years)' },
              { value: 'Intermediate', label: 'Intermediate (2-5 years)' },
              { value: 'Expert', label: 'Expert (5+ years)' },
            ]}
            value={formData.experienceLevel}
            onChange={(val) => handleChange({ target: { name: 'experienceLevel', value: val } })}
            placeholder="Select experience level..."
          />
        </div>

        <div className="fob-form-group">
          <label className="fob-label">
            <Globe size={15} className="fob-label-icon" />
            Timezone / Location*
          </label>
          <ComboSelect
            id="fob-timezone"
            options={timezones.map((tz) => tz.label)}
            value={formData.timezone}
            onChange={(val) => handleChange({ target: { name: 'timezone', value: val } })}
            placeholder="Select timezone / location..."
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
