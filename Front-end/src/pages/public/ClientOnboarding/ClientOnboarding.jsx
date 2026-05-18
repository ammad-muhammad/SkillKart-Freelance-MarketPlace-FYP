import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Select, { components } from 'react-select';
import countryList from 'react-select-country-list';
import {
    User, Mail, Phone, Upload, Globe, Building2, Briefcase,
    ChevronRight, ChevronLeft, CheckCircle2, Info, Lightbulb,
    Target, Zap, Clock, MessageSquare, Terminal, Layout, ShieldCheck,
    Search, Trash2, Sliders, Settings, Sparkles, X, Plus,
    Rocket, Github, Linkedin, Globe2
} from "lucide-react";
import { toast } from "react-toastify";
import { clientsAPI } from "../../../api/clients";
import { useAuth } from "../../../hooks/useAuth";
import { timezones, getCurrentTimezone } from "../../../utils/timezones";
import { uploadAvatar, uploadCompanyLogo } from "../../../utils/uploadHelper";
import { LANGUAGES } from "../../../data/languages";
import "./ClientOnboarding.css";

const ClientOnboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [searchCountry, setSearchCountry] = useState("");
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [draftData, setDraftData] = useState(null);
    const { refreshAuth, user } = useAuth();

    const DRAFT_KEY = "skillkart_client_onboarding_draft";

    const [formData, setFormData] = useState({
        // Step 1: Basic Info
        fullName: "",
        workEmail: "",
        phone: "",
        companyType: "", // Individual, Startup, SME, Enterprise
        companyName: "",
        companySize: "",
        companyWebsite: "",
        country: "",
        profilePic: null,
        profilePicUrl: "",
        companyPic: null,
        companyPicUrl: "",

        // Step 2: Professional Background
        isNewToHiring: "", // Yes (Fresh), No (Experienced)
        industryType: "",
        customIndustry: "",
        role: "", // Founder, PM, Marketing, Developer, Other
        bio: "",
        languages: [],

        // Step 3: Project Needs
        services: [],
        techStack: [],
        budgetRange: "",
        hiringFrequency: "", // One-time, Monthly, Long-term

        // Step 4: Self Assessment
        technicalUnderstanding: 5,
        communicationClarity: 5,
        freelancerExperience: "", // Beginner, Intermediate, Expert
        urgency: "", // Flexible, 2 Weeks, 1 Month, Urgent

        // Step 5: Preferences
        // Additional for Dashboard
        timezone: "",
        socialLinks: {
            linkedin: "",
            twitter: "",
            website: ""
        },
        aiAssistance: true,
        termsAccepted: false
    });

    // Initial Load - Check for draft in Backend
    useEffect(() => {
        const fetchDraft = async () => {
            try {
                const response = await clientsAPI.getOnboardingDraft();
                if (response.data?.data?.draft) {
                    setDraftData(response.data.data.draft);
                    setShowDraftPrompt(true);
                }
            } catch (e) {
                console.error("Failed to fetch client draft from backend", e);
            }
        };
        fetchDraft();
    }, []);

    // Sync Draft to Backend on step change or significant changes
    useEffect(() => {
        if (!showDraftPrompt && step <= 5) {
            const syncDraft = async () => {
                try {
                    await clientsAPI.saveOnboardingDraft({ formData, step });
                } catch (e) {
                    console.error("Failed to sync draft to backend", e);
                }
            };

            // Only sync if some data exists or step is > 1
            if (formData.fullName !== "" || step > 1) {
                syncDraft();
            }
        }
    }, [step, showDraftPrompt]); // Sync on step change for robustness

    useEffect(() => {
        if (user && !showDraftPrompt) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                workEmail: prev.workEmail || user.email || '',
                timezone: prev.timezone || getCurrentTimezone()?.label || '',
                profilePicUrl: prev.profilePicUrl || user.profilePicture || ''
            }));
        }
    }, [user, showDraftPrompt]);

    const handleRestoreDraft = () => {
        if (draftData) {
            setFormData(draftData.formData);
            setStep(draftData.step || 1);
        }
        setShowDraftPrompt(false);
        toast.success("Welcome back! Your onboarding progress has been restored.");
    };

    const handleDiscardDraft = async () => {
        // Option to clear from backend if we want, but for now just hide
        setShowDraftPrompt(false);
        setDraftData(null);
    };



    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please upload an image file");
                return;
            }
            setFormData(prev => ({
                ...prev,
                [field]: file,
                [`${field}Url`]: URL.createObjectURL(file)
            }));
        }
    };

    const toggleMultiSelect = (field, item) => {
        setFormData(prev => {
            const current = prev[field] || [];
            return {
                ...prev,
                [field]: current.includes(item)
                    ? current.filter(i => i !== item)
                    : [...current, item]
            };
        });
    };

    const nextStep = () => {
        if (validateStep()) {
            setStep(s => Math.min(s + 1, 6));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const validateStep = () => {
        if (step === 1) {
            if (!formData.fullName.trim()) { toast.warn("Full Name is required"); return false; }
            if (!formData.workEmail.trim()) { toast.warn("Work Email is required"); return false; }
            if (!formData.companyType) { toast.warn("Please select an Organization Type"); return false; }
            if (formData.companyType !== 'Individual' && !formData.companyName.trim()) {
                toast.warn("Company Name is required for businesses");
                return false;
            }
        }
        if (step === 2) {
            if (!formData.isNewToHiring) { toast.warn("Hiring Experience selection is required"); return false; }
            if (!formData.industryType) { toast.warn("Please select your Primary Industry"); return false; }
            if (formData.industryType === 'Other' && !formData.customIndustry.trim()) {
                toast.warn("Please specify your industry");
                return false;
            }
            if (!formData.bio || formData.bio.trim().length < 20) {
                toast.warn("Please provide a descriptive Bio / About summary (minimum 20 characters)");
                return false;
            }
            if (!formData.languages || formData.languages.length === 0) {
                toast.warn("Please select at least one language spoken / preferred");
                return false;
            }
        }
        if (step === 3) {
            if (formData.services.length === 0) { toast.warn("Please select at least one expertise area"); return false; }
            if (!formData.budgetRange) { toast.warn("Please select a Budget Allocation"); return false; }
            if (!formData.hiringFrequency) { toast.warn("Please select an Engagement Type"); return false; }
        }
        if (step === 4) {
            if (!formData.urgency) { toast.warn("Please define your project urgency"); return false; }
        }
        if (step === 5 && !formData.termsAccepted) {
            toast.warn("Please agree to the Terms & Conditions to proceed");
            return false;
        }
        return true;
    };

    const handleFinish = async (e) => {
        e.preventDefault();
        if (!validateStep()) return;

        setIsLoading(true);
        try {
            let profilePicUrl = formData.profilePicUrl;
            let companyPicUrl = formData.companyPicUrl;

            // 1. Upload Profile Picture if selected as a local file
            if (formData.profilePic instanceof File) {
                toast.info("Uploading profile picture...");
                const avatarUrl = await uploadAvatar(formData.profilePic, 'client');
                profilePicUrl = avatarUrl;
            }

            // 2. Upload Company Logo/Picture if selected as a local file
            if (formData.companyPic instanceof File) {
                toast.info("Uploading company logo...");
                const companyLogoUrl = await uploadCompanyLogo(formData.companyPic);
                companyPicUrl = companyLogoUrl;
            }

            // 3. Submit onboarding profile with updated URLs
            const submitData = {
                ...formData,
                profilePicUrl,
                companyLogo: companyPicUrl
            };

            await clientsAPI.submitOnboarding(submitData);
            toast.success("Onboarding profile deployed successfully!");
            await refreshAuth(); // Refresh user data locally
            setStep(6);
        } catch (error) {
            console.error("Onboarding submission error:", error);
            toast.error(error.response?.data?.message || "Failed to submit profile");
        } finally {
            setIsLoading(false);
        }
    };

    const isStepValid = () => {
        if (step === 1) {
            const hasBasic = formData.fullName.trim() && formData.workEmail.trim() && formData.companyType;
            if (formData.companyType === 'Individual') return hasBasic;
            return hasBasic && formData.companyName.trim();
        }
        if (step === 2) {
            return formData.isNewToHiring && formData.industryType && (formData.industryType !== 'Other' || formData.customIndustry.trim()) && formData.bio.trim().length >= 20 && formData.languages.length > 0;
        }
        if (step === 3) {
            return formData.services.length > 0 && formData.budgetRange && formData.hiringFrequency;
        }
        if (step === 4) {
            return formData.urgency;
        }
        if (step === 5) {
            return formData.termsAccepted;
        }
        return true;
    };

    const progress = (step - 1) / 4 * 100;
    const options = useMemo(() => countryList().getData(), []);

    const industryOptions = [
        { value: 'Accounting & Finance', label: 'Accounting & Finance' },
        { value: 'Advertising & PR', label: 'Advertising & PR' },
        { value: 'Architecture & Design', label: 'Architecture & Design' },
        { value: 'Automotive', label: 'Automotive' },
        { value: 'Aviation & Aerospace', label: 'Aviation & Aerospace' },
        { value: 'Banking', label: 'Banking' },
        { value: 'Biotechnology', label: 'Biotechnology' },
        { value: 'Construction', label: 'Construction' },
        { value: 'Consulting', label: 'Consulting' },
        { value: 'E-commerce', label: 'E-commerce' },
        { value: 'Education & EdTech', label: 'Education & EdTech' },
        { value: 'Energy & Utilities', label: 'Energy & Utilities' },
        { value: 'Entertainment & Media', label: 'Entertainment & Media' },
        { value: 'FinTech', label: 'FinTech' },
        { value: 'Food & Beverage', label: 'Food & Beverage' },
        { value: 'Gaming', label: 'Gaming' },
        { value: 'Government & Public Sector', label: 'Government & Public Sector' },
        { value: 'Healthcare & HealthTech', label: 'Healthcare & HealthTech' },
        { value: 'Hospitality & Tourism', label: 'Hospitality & Tourism' },
        { value: 'Human Resources', label: 'Human Resources' },
        { value: 'Insurance', label: 'Insurance' },
        { value: 'Legal', label: 'Legal' },
        { value: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain' },
        { value: 'Manufacturing', label: 'Manufacturing' },
        { value: 'Marketing', label: 'Marketing' },
        { value: 'NGO & Non-profit', label: 'NGO & Non-profit' },
        { value: 'Real Estate & PropTech', label: 'Real Estate & PropTech' },
        { value: 'Retail', label: 'Retail' },
        { value: 'Software & IT Services', label: 'Software & IT Services' },
        { value: 'Telecommunications', label: 'Telecommunications' }
    ];

    const languageOptions = useMemo(() => LANGUAGES.map(lang => ({ value: lang, label: lang })), []);

    const CustomControl = ({ children, ...props }) => {
        const iconStyle = { marginLeft: '12px', opacity: 0.7, fontSize: '1rem' };
        const icon = props.selectProps.name === 'country' ? <Search size={16} color="var(--onboard-text-secondary)" style={iconStyle} /> : <span style={iconStyle}>📌</span>;
        return (
            <components.Control {...props}>
                {icon}
                {children}
            </components.Control>
        );
    };

    const customStyles = {
        control: (base, state) => ({
            ...base,
            background: "#fff",
            borderColor: state.isFocused ? "var(--onboard-accent-primary)" : "#e2e8f0",
            borderWidth: "1.5px",
            borderRadius: "12px",
            minHeight: "56px",
            padding: "0 8px",
            color: "#0f172a",
            fontSize: "16px",
            boxShadow: state.isFocused ? "0 0 0 4px rgba(26, 111, 168, 0.08)" : "none",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "pointer",
            "&:hover": {
                borderColor: state.isFocused ? "var(--onboard-accent-primary)" : "#cbd5e1"
            }
        }),
        menu: (base) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(12px)",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 12px 30px rgba(4, 46, 76, 0.1)",
            padding: "8px",
            zIndex: 9999,
            marginTop: "8px",
            animation: "dropdownSlideIn 0.3s cubic-bezier(0.19, 1, 0.22, 1)"
        }),
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected
                ? "rgba(26, 111, 168, 0.08)"
                : state.isFocused
                    ? "rgba(4, 46, 76, 0.05)"
                    : "transparent",
            color: "var(--onboard-accent-primary)",
            fontWeight: state.isSelected ? "700" : "600",
            cursor: "pointer",
            borderRadius: "10px",
            margin: "2px 0",
            padding: "12px 16px",
            transition: "all 0.2s ease",
            "&:active": {
                background: "rgba(26, 111, 168, 0.15)"
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: "#0f172a",
            marginLeft: "8px",
            fontWeight: "500"
        }),
        placeholder: (base) => ({
            ...base,
            color: "#94a3b8",
            marginLeft: "8px",
            fontWeight: "500"
        }),
        dropdownIndicator: (base, state) => ({
            ...base,
            color: state.isFocused ? "var(--onboard-accent-primary)" : "#94a3b8",
            transition: "transform 0.3s ease",
            transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
            "&:hover": {
                color: "var(--onboard-accent-primary)"
            }
        }),
        indicatorSeparator: () => ({ display: "none" })
    };

    // --- Step Renders ---

    const renderStep1 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            {user?.authProvider !== 'supabase' && (
                <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginBottom: '28px', flexWrap: 'wrap' }}>
                    <div className="onboarding__profile-pic">
                        <div className="onboarding__avatar-container">
                            <div className="onboarding__avatar">
                                {formData.profilePicUrl ? (
                                    <img src={formData.profilePicUrl} className="onboarding__avatar-img" alt="Profile" />
                                ) : (
                                    <User size={40} color="var(--onboard-accent-primary)" />
                                )}
                                <label className="onboarding__avatar-overlay">
                                    <Upload size={28} />
                                    <span>Upload</span>
                                    <input type="file" hidden onChange={(e) => handleImageUpload(e, 'profilePic')} accept="image/*" />
                                </label>
                            </div>
                        </div>
                        <span className="onboarding__label" style={{ marginBottom: '4px' }}>Profile Image</span>
                        <p className="onboarding__upload-hint">PNG, JPG up to 5MB</p>
                    </div>

                    {formData.companyType !== 'Individual' && formData.companyType !== '' && (
                        <div className="onboarding__profile-pic">
                            <div className="onboarding__avatar-container">
                                <div className="onboarding__avatar" style={{ borderRadius: '12px' }}>
                                    {formData.companyPicUrl ? (
                                        <img src={formData.companyPicUrl} className="onboarding__avatar-img" alt="Company" style={{ borderRadius: '12px' }} />
                                    ) : (
                                        <Building2 size={40} color="var(--onboard-accent-primary)" />
                                    )}
                                    <label className="onboarding__avatar-overlay" style={{ borderRadius: '12px' }}>
                                        <Upload size={28} />
                                        <span>Upload</span>
                                        <input type="file" hidden onChange={(e) => handleImageUpload(e, 'companyPic')} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                            <span className="onboarding__label" style={{ marginBottom: '4px' }}>Business / Company Image</span>
                            <p className="onboarding__upload-hint">PNG, JPG up to 5MB</p>
                        </div>
                    )}
                </div>
            )}

            <div className="onboarding__form-row">
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Full Name*</label>
                    <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="onboarding__input" placeholder="e.g. John Doe" />
                </div>

                <div className="onboarding__form-group">
                    <label className="onboarding__label">Work Email*</label>
                    <input type="email" name="workEmail" required value={formData.workEmail} onChange={handleChange} className="onboarding__input" placeholder="john@company.com" />
                </div>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Organization Type*</label>
                <div className="onboarding__choices">
                    {[
                        { id: 'Individual', icon: User, desc: 'Solo Entrepreneur / Pro' },
                        { id: 'Startup', icon: Zap, desc: 'Early/Mid Stage' },
                        { id: 'SME', icon: Building2, desc: 'Small/Medium Enterprise' },
                        { id: 'Enterprise', icon: Globe, desc: 'Global Corporation' }
                    ].map(item => (
                        <div
                            key={item.id}
                            className={`onboarding__choice-card ${formData.companyType === item.id ? 'onboarding__choice-card--active' : ''}`}
                            onClick={() => setFormData(p => ({ ...p, companyType: item.id }))}
                        >
                            <item.icon className="onboarding__choice-icon" />
                            <div>
                                <span className="onboarding__choice-label">{item.id}</span>
                                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', margin: '4px 0 0', fontWeight: '500' }}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {formData.companyType !== 'Individual' && formData.companyType !== '' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="onboarding__form-row">
                    <div className="onboarding__form-group" style={{ flex: 1 }}>
                        <label className="onboarding__label">Company Name</label>
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="onboarding__input" placeholder="Acme Inc." />
                    </div>
                    <div className="onboarding__form-group" style={{ flex: 1 }}>
                        <label className="onboarding__label">Country</label>
                        <Select
                            options={options}
                            value={formData.country ? options.find(opt => opt.label === formData.country) : null}
                            onChange={(val) => setFormData(p => ({ ...p, country: val ? val.label : '' }))}
                            styles={customStyles}
                            placeholder="Select Country"
                            classNamePrefix="skillkart-select"
                            isSearchable={true}
                            maxMenuHeight={220} // ~5.5 items
                            menuShouldScrollIntoView={true}
                            components={{ Control: CustomControl }}
                            menuPortalTarget={document.body}
                            menuPlacement="bottom"
                        />
                    </div>
                </motion.div>
            )}

            <div className="onboarding__form-row">
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Phone Number (Optional)</label>
                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '12px', top: '18px', color: '#94a3b8' }} />
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="onboarding__input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="e.g. +1 (555) 000-0000"
                        />
                    </div>
                </div>
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Timezone / Base Location</label>
                    <div style={{ position: 'relative' }}>
                        <Select
                            options={timezones}
                            value={formData.timezone ? timezones.find(t => t.label === formData.timezone) : null}
                            onChange={(val) => setFormData(p => ({ ...p, timezone: val ? val.label : '' }))}
                            styles={customStyles}
                            placeholder="Select Timezone"
                            classNamePrefix="skillkart-select"
                            isSearchable={true}
                            maxMenuHeight={220}
                            menuShouldScrollIntoView={true}
                            components={{ Control: CustomControl }}
                            menuPortalTarget={document.body}
                            menuPlacement="bottom"
                        />
                    </div>
                </div>
            </div>

            <div className="onboarding__form-row">
                <div className="onboarding__form-group" style={{ flex: 0.5 }}>
                    <label className="onboarding__label">LinkedIn Profile (Optional)</label>
                    <div style={{ position: 'relative' }}>
                        <Linkedin size={16} style={{ position: 'absolute', left: '12px', top: '18px', color: '#94a3b8' }} />
                        <input
                            type="text"
                            value={formData.socialLinks.linkedin}
                            onChange={(e) => setFormData(p => ({ ...p, socialLinks: { ...p.socialLinks, linkedin: e.target.value } }))}
                            className="onboarding__input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="linkedin.com/company/..."
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
        >
            <div className="onboarding__form-group">
                <label className="onboarding__label">Hiring Experience*</label>
                <div className="onboarding__choices">
                    {[
                        { id: 'Yes', label: 'Fresh Client', icon: Lightbulb, desc: 'First time hiring' },
                        { id: 'No', label: 'Experienced', icon: Target, desc: 'I have hired before' }
                    ].map(item => (
                        <div
                            key={item.id}
                            className={`onboarding__choice-card ${formData.isNewToHiring === item.id ? 'onboarding__choice-card--active' : ''}`}
                            onClick={() => setFormData(p => ({ ...p, isNewToHiring: item.id }))}
                        >
                            <item.icon className="onboarding__choice-icon" />
                            <div>
                                <span className="onboarding__choice-label">{item.label}</span>
                                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', margin: '4px 0 0', fontWeight: '500' }}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="onboarding__form-row">
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Primary Industry*</label>
                    <Select
                        name="industryType"
                        options={industryOptions}
                        styles={customStyles}
                        components={{ Control: CustomControl }}
                        placeholder="Select Industry"
                        value={formData.industryType ? industryOptions.find(o => o.value === formData.industryType) : null}
                        onChange={(opt) => setFormData(p => ({ ...p, industryType: opt ? opt.value : '' }))}
                        classNamePrefix="skillkart-select"
                        isSearchable={true}
                        maxMenuHeight={220}
                        menuShouldScrollIntoView={true}
                        menuPortalTarget={document.body}
                        menuPlacement="bottom"
                    />
                </div>

                <div className="onboarding__form-group">
                    <label className="onboarding__label">Other Industry (Optional)</label>
                    <input
                        type="text"
                        name="customIndustry"
                        value={formData.customIndustry}
                        onChange={handleChange}
                        className="onboarding__input"
                        placeholder="e.g. Space Exploration"
                    />
                </div>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Your Executive Role</label>
                <div className="onboarding__tags">
                    {['Founder', 'Product Lead', 'CTO', 'Engineering Manager', 'Marketing Head', 'Design Director'].map(r => (
                        <div key={r} className={`onboarding__tag ${formData.role === r ? 'onboarding__tag--active' : ''}`} onClick={() => setFormData(p => ({ ...p, role: r }))}>{r}</div>
                    ))}
                </div>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Bio / About Yourself*</label>
                <textarea
                    name="bio"
                    required
                    value={formData.bio}
                    onChange={handleChange}
                    className="onboarding__input"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    placeholder="Describe your goals, team size, company mission, or what you plan to accomplish on SkillKart..."
                />
                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', marginTop: '4px', fontWeight: '500' }}>
                    Introduce yourself and your organization to help top freelancers understand your requirements. (Min 20 characters)
                </p>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Languages Spoken / Preferred*</label>
                <Select
                    isMulti
                    options={languageOptions}
                    value={formData.languages.map(l => ({ value: l.language, label: l.language }))}
                    onChange={(selected) => {
                        const mapped = (selected || []).map(opt => ({
                            language: opt.value,
                            proficiency: 'fluent'
                        }));
                        setFormData(p => ({ ...p, languages: mapped }));
                    }}
                    styles={customStyles}
                    placeholder="Select Languages Spoken / Preferred"
                    classNamePrefix="skillkart-select"
                    maxMenuHeight={220}
                    menuShouldScrollIntoView={true}
                    components={{ Control: CustomControl }}
                    menuPortalTarget={document.body}
                    menuPlacement="bottom"
                />
                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', marginTop: '4px', fontWeight: '500' }}>
                    Select one or more languages you use to communicate with freelancers.
                </p>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="onboarding__form-group">
                <label className="onboarding__label">Expertise Required (Multi-select)</label>
                <div className="onboarding__tags">
                    {['Web Development', 'Mobile Apps', 'AI/ML', 'Cloud Architecture', 'UI/UX Design', 'Cybersecurity', 'Data Science'].map(s => (
                        <div key={s} className={`onboarding__tag ${formData.services.includes(s) ? 'onboarding__tag--active' : ''}`} onClick={() => toggleMultiSelect('services', s)}>{s}</div>
                    ))}
                </div>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Budget Allocation</label>
                <div className="onboarding__choices">
                    {[
                        { id: '<$5k', label: 'Startup', desc: 'Up to $5,000' },
                        { id: '$5k-$20k', label: 'Growth', desc: '$5,000 - $20,000' },
                        { id: '$20k+', label: 'Enterprise', desc: '$20,000+' }
                    ].map(item => (
                        <div
                            key={item.id}
                            className={`onboarding__choice-card ${formData.budgetRange === item.id ? 'onboarding__choice-card--active' : ''}`}
                            onClick={() => setFormData(p => ({ ...p, budgetRange: item.id }))}
                        >
                            <span className="onboarding__choice-label">{item.label}</span>
                            <span style={{ fontSize: '13px', color: 'var(--onboard-text-secondary)', fontWeight: '500' }}>{item.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Engagement Type</label>
                <div className="onboarding__tags">
                    {['One-time Project', 'Monthly Retainer', 'Full-time Dedicated', 'Part-time Support'].map(t => (
                        <div key={t} className={`onboarding__tag ${formData.hiringFrequency === t ? 'onboarding__tag--active' : ''}`} onClick={() => setFormData(p => ({ ...p, hiringFrequency: t }))}>{t}</div>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="onboarding__form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label className="onboarding__label">Technical Complexity Awareness</label>
                    <span style={{ color: 'var(--onboard-accent-primary)', fontWeight: '700' }}>{formData.technicalUnderstanding}/10</span>
                </div>
                <input type="range" name="technicalUnderstanding" min="1" max="10" value={formData.technicalUnderstanding} onChange={handleChange} className="onboarding__slider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--onboard-text-secondary)' }}>
                    <span>Conceptual</span>
                    <span>Deep Tech</span>
                </div>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Project Urgency</label>
                <div className="onboarding__choices">
                    {[
                        { id: 'Immediate', icon: Zap, desc: 'ASAP' },
                        { id: 'Exploring', icon: Search, desc: 'Planning Phase' },
                        { id: 'Flexible', icon: Clock, desc: 'Next few months' }
                    ].map(item => (
                        <div
                            key={item.id}
                            className={`onboarding__choice-card ${formData.urgency === item.id ? 'onboarding__choice-card--active' : ''}`}
                            onClick={() => setFormData(p => ({ ...p, urgency: item.id }))}
                        >
                            <item.icon className="onboarding__choice-icon" />
                            <span className="onboarding__choice-label">{item.id}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const renderStep5 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="onboarding__form-group" style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={18} color="var(--onboard-accent-primary)" />
                            Activate Buddy AI™ Guidance
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--onboard-text-secondary)' }}>
                            Let AI draft your project scope and match you with 99% accuracy.
                        </p>
                    </div>
                    <div
                        className={`onboarding__toggle ${formData.aiAssistance ? 'active' : ''}`}
                        onClick={() => setFormData(p => ({ ...p, aiAssistance: !p.aiAssistance }))}
                        style={{
                            width: '50px',
                            height: '26px',
                            background: formData.aiAssistance ? 'var(--onboard-accent-primary)' : 'rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '3px',
                            left: formData.aiAssistance ? '27px' : '3px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                    </div>
                </div>
            </div>

            <div className="onboarding__form-group" style={{ marginTop: '24px' }}>
                <div
                    style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}
                >
                    <div
                        style={{
                            minWidth: '24px',
                            height: '24px',
                            border: '2px solid',
                            borderColor: formData.termsAccepted ? 'var(--onboard-accent-primary)' : '#cbd5e1',
                            background: formData.termsAccepted ? 'var(--onboard-accent-primary)' : 'transparent',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            marginTop: '2px'
                        }}
                        onClick={() => setFormData(p => ({ ...p, termsAccepted: !p.termsAccepted }))}
                    >
                        {formData.termsAccepted && <CheckCircle2 size={16} color="white" />}
                    </div>
                    <label className="onboarding__label" style={{ lineHeight: 1.4, margin: 0, fontWeight: '500' }}>
                        I agree to the <span
                            style={{ color: 'var(--onboard-accent-primary)', textDecoration: 'underline', cursor: 'pointer' }}
                            onClick={() => window.open('/services-agreement', '_blank')}
                        >Service Agreement</span> and understand that SkillKart ensures payment safety through Escrow.
                    </label>
                </div>
            </div>
        </motion.div>
    );

    const renderSuccess = () => (
        <motion.div className="onboarding__success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div style={{ fontSize: '80px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <Rocket size={72} style={{ color: '#1a6fa8' }} />
            </div>
            <h1 className="onboarding__title">You're All Set!</h1>
            <p className="onboarding__subtitle">Your project ecosystem is being prepared. Our AI is already analyzing local and global talent for you.</p>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="onboarding__report-card"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '10px', background: 'rgba(100, 181, 232, 0.1)', borderRadius: '14px' }}>
                        <Terminal size={24} color="var(--onboard-accent-primary)" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Initialization Report</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: 'var(--onboard-text-secondary)', margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
                        Hello <b>{formData.fullName ? formData.fullName.split(' ')[0] : 'Client'}</b>, we've identified <b>12+ verified experts</b> in <b>{formData.services[0] || 'your field'}</b> who match your <b>{formData.budgetRange || 'your range'}</b> budget.
                    </p>
                    <button className="onboarding__btn-next" style={{ alignSelf: 'flex-start' }} onClick={() => navigate("/client/dashboard")}>Go to Dashboard</button>
                </div>
            </motion.div>
        </motion.div>
    );

    return (
        <section className="onboarding">
            {/* Draft Resume Modal */}
            <AnimatePresence>
                {showDraftPrompt && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                            backdropFilter: 'blur(4px)', zIndex: 99999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            style={{
                                background: '#fff', borderRadius: '24px', padding: '40px',
                                maxWidth: '440px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{
                                width: '72px', height: '72px', background: 'rgba(26, 111, 168, 0.1)', borderRadius: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 28px', color: 'var(--onboard-accent-primary)'
                            }}>
                                <Rocket size={36} />
                            </div>
                            <h3 style={{ margin: '0 0 12px', fontSize: '1.5rem', color: '#0f172a', fontWeight: 800 }}>
                                Resume Onboarding?
                            </h3>
                            <p style={{ margin: '0 0 32px', color: '#64748b', fontSize: '1rem', lineHeight: 1.6, fontWeight: '500' }}>
                                We found your unfinished setup. Would you like to continue where you left off or start fresh?
                            </p>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    type="button"
                                    onClick={handleDiscardDraft}
                                    style={{
                                        flex: 1, padding: '16px', borderRadius: '14px', border: '2px solid #e2e8f0',
                                        background: 'transparent', color: '#64748b', fontWeight: '700', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Start Fresh
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRestoreDraft}
                                    style={{
                                        flex: 1, padding: '16px', borderRadius: '14px', border: 'none',
                                        background: 'var(--onboard-accent-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer',
                                        transition: 'all 0.2s', boxShadow: '0 8px 16px rgba(26, 111, 168, 0.2)'
                                    }}
                                >
                                    Resume
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="onboarding__bg">
                <div className="onboarding__orb onboarding__orb--1" />
                <div className="onboarding__orb onboarding__orb--2" />
                <div className="onboarding__orb onboarding__orb--3" />
                <div className="onboarding__grid-overlay" />
            </div>

            <div className="onboarding__container">
                <div className="onboarding__card">
                    {step <= 5 && (
                        <>
                            <div className="onboarding__stepper-wrapper">
                                <div className="onboarding__stepper">
                                    <div className="onboarding__stepper-line-bg" />
                                    <div
                                        className="onboarding__stepper-line-fill"
                                        style={{ width: `${((step - 1) / 4) * 100}%` }}
                                    />
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <div
                                            key={s}
                                            className={`onboarding__step-node ${step === s ? 'onboarding__step-node--active' :
                                                step > s ? 'onboarding__step-node--completed' : ''
                                                }`}
                                        >
                                            {step > s ? <CheckCircle2 size={18} /> : s}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="onboarding__header">
                                <h1 className="onboarding__title">
                                    {step === 1 && "Identity & Organization"}
                                    {step === 2 && "Company Background"}
                                    {step === 3 && "Project Requirements"}
                                    {step === 4 && "Strategy & Timeline"}
                                    {step === 5 && "Final Security Check"}
                                </h1>
                                <p className="onboarding__subtitle">
                                    {step === 1 && "Start by introducing yourself and your organization."}
                                    {step === 2 && "Help us understand your hiring history and focus."}
                                    {step === 3 && "Specify what you're building and your investment range."}
                                    {step === 4 && "Define the urgency and complexity of your mission."}
                                    {step === 5 && "Complete your setup and activate premium AI matching."}
                                </p>
                            </div>
                        </>
                    )}

                    <form onSubmit={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                style={{ flex: 1 }}
                            >
                                {step === 1 && renderStep1()}
                                {step === 2 && renderStep2()}
                                {step === 3 && renderStep3()}
                                {step === 4 && renderStep4()}
                                {step === 5 && renderStep5()}
                                {step === 6 && renderSuccess()}
                            </motion.div>
                        </AnimatePresence>

                        {step <= 5 && (
                            <div className="onboarding__nav">
                                {step > 1 ? (
                                    <button type="button" onClick={prevStep} className="onboarding__btn-back">
                                        <ChevronLeft size={20} /> Back
                                    </button>
                                ) : <div />}

                                <button
                                    type="button"
                                    onClick={step === 5 ? handleFinish : nextStep}
                                    className="onboarding__btn-next"
                                    disabled={isLoading || !isStepValid()}
                                >
                                    {isLoading ? <div className="onboarding__loader" /> : (
                                        <>
                                            {step === 5 ? "Deploy Profile" : "Continue"} {step !== 5 && <ChevronRight size={20} />}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
};

export default ClientOnboarding;
