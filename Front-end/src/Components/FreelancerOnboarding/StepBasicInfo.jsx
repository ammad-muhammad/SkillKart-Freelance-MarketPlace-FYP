import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, AlignLeft, Tag, Clock, ChevronDown, Check,
  Zap, Moon, FileText, XCircle, Globe, Github, Linkedin, Award, Link,
  User, Upload, Camera, Sparkles
} from "lucide-react";
import { timezones, getCurrentTimezone } from "../../utils/timezones";
import ComboSelect from "../common/ComboSelect/ComboSelect";
import AiGenerateText from "../common/AiSuggest/AiGenerateText";
import ImageSourcePicker from "../common/ImageSourcePicker/ImageSourcePicker";

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
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
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
                  {isActive && <Check size={16} className="fob-dropdown-option-check" />}
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
  const avatarPickerRef = useRef(null);

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
  }, [formData.timezone, setFormData]);

  // Auto-fill social links from CV parsedData if present and fields are empty
  useEffect(() => {
    if (formData.parsedData?.socialLinks) {
      const pSocial = formData.parsedData.socialLinks;
      const current = formData.socialLinks || {};
      if (!current.github && !current.linkedin && !current.website) {
        if (pSocial.github || pSocial.linkedin || pSocial.website) {
          setFormData(prev => ({
            ...prev,
            socialLinks: {
              github: current.github || pSocial.github || "",
              linkedin: current.linkedin || pSocial.linkedin || "",
              website: current.website || pSocial.website || ""
            }
          }));
        }
      }
    }
  }, [formData.parsedData, setFormData]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -25 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Profile Picture Upload Hero Area */}
      <div className="fob-profile-pic-section">
        <div className="fob-avatar-container">
          {formData.profilePicUrl ? (
            <img
              src={formData.profilePicUrl}
              alt="Profile Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <User size={46} color="#059669" />
          )}
          <div
            className="fob-avatar-overlay"
            onClick={() => avatarPickerRef.current?.click()}
          >
            <Camera size={22} />
            <span style={{ fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>Change</span>
            <ImageSourcePicker
              ref={avatarPickerRef}
              accept="image/*"
              facing="user"
              onChange={handleImageUpload}
            />
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <span className="fob-label" style={{ justifyContent: "center", margin: "0 0 2px" }}>
            Profile Picture
          </span>
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
            Upload a clear professional photo (WEBP, PNG, JPG max 5MB)
          </p>
        </div>
      </div>

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
            placeholder="e.g. Alex"
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
            placeholder="e.g. Morgan"
          />
          {errors?.lastName && <p className="fob-error">{errors.lastName}</p>}
        </div>
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
          placeholder="e.g. Senior Full-Stack Engineer & Cloud Architect"
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
          placeholder="Share your experience, technical strengths, client achievements, and what sets you apart..."
          rows={4}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <p className="fob-hint" style={{ margin: 0 }}>
            {formData.bio?.length || 0}/500 characters
          </p>
        </div>
        {errors?.bio && <p className="fob-error">{errors.bio}</p>}
        <div style={{ marginTop: "10px" }}>
          <AiGenerateText
            fieldLabel="a freelancer's professional bio for their marketplace profile"
            getContext={() => ({
              title: formData.title,
              experienceLevel: formData.experienceLevel,
              availability: formData.availability
            })}
            getExistingText={() => formData.bio}
            onGenerated={(text) => setFormData((p) => ({ ...p, bio: text.slice(0, 500) }))}
          />
        </div>
      </div>

      {/* Hourly Rate + Availability row */}
      <div className="fob-form-row">
        <div className="fob-form-group">
          <label className="fob-label">
            <Tag size={15} className="fob-label-icon" />
            Hourly Rate (PKR)*
          </label>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix">Rs.</span>
            <input
              type="number"
              name="hourlyRate"
              value={formData.hourlyRate}
              onChange={handleChange}
              className={`fob-input fob-input--prefixed ${
                errors?.hourlyRate ? "fob-input--error" : ""
              }`}
              placeholder="1500"
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
            Work Availability*
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
          Professional & Social Links
        </label>
        <p className="fob-hint" style={{ marginBottom: "12px" }}>
          Link your GitHub, LinkedIn, or personal portfolio to build maximum client trust.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix"><Github size={17} style={{ color: "#0B2942" }} /></span>
            <input
              type="text"
              value={formData.socialLinks?.github || ""}
              onChange={(e) => setFormData(p => ({ ...p, socialLinks: { ...p.socialLinks, github: e.target.value } }))}
              className="fob-input fob-input--prefixed"
              placeholder="https://github.com/username"
            />
          </div>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix"><Linkedin size={17} style={{ color: "#0077B5" }} /></span>
            <input
              type="text"
              value={formData.socialLinks?.linkedin || ""}
              onChange={(e) => setFormData(p => ({ ...p, socialLinks: { ...p.socialLinks, linkedin: e.target.value } }))}
              className="fob-input fob-input--prefixed"
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <div className="fob-input-prefix-wrapper">
            <span className="fob-input-prefix"><Globe size={17} style={{ color: "#10B981" }} /></span>
            <input
              type="text"
              value={formData.socialLinks?.website || ""}
              onChange={(e) => setFormData(p => ({ ...p, socialLinks: { ...p.socialLinks, website: e.target.value } }))}
              className="fob-input fob-input--prefixed"
              placeholder="https://yourportfolio.com"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StepBasicInfo;
