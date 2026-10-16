import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Select, { components } from 'react-select';
import countryList from 'react-select-country-list';
import {
    User, Mail, Phone, Upload, Globe, Building2, Briefcase,
    ChevronRight, ChevronLeft, CheckCircle2, Info, Lightbulb,
    Target, Zap, Clock, MessageSquare, Terminal, Layout, ShieldCheck,
    Search, Trash2, Sliders, Settings, Sparkles, X, Plus,
    Rocket, Github, Linkedin, Globe2, LayoutDashboard, ArrowRight
} from "lucide-react";
import { safeToast as toast } from "../../../utils/safeToast";
import { clientsAPI } from "../../../api/clients";
import { useAuth } from "../../../hooks/useAuth";
import { timezones, getCurrentTimezone } from "../../../utils/timezones";
import { uploadAvatar, uploadCompanyLogo } from "../../../utils/uploadHelper";
import { LANGUAGES } from "../../../data/languages";
import TagInput from "../../../Components/common/TagInput/TagInput";
import IndustryInput from "../../../Components/common/IndustryInput/IndustryInput";
import { isMobileApp } from "../../../utils/platform";
import { openExternal } from "../../../utils/externalLink";
import AiGenerateText from "../../../Components/common/AiSuggest/AiGenerateText";
import ImageCropModal from "../../../Components/common/ImageCropModal/ImageCropModal";
import ImageSourcePicker from "../../../Components/common/ImageSourcePicker/ImageSourcePicker";
import Loader from "../../../Components/common/Loader/Loader";
import "./ClientOnboarding.css";


const TOTAL_STEPS = 4;

const STEP_METADATA = [
    { label: "Organization", title: "Identity & Organization", sub: "Start by introducing yourself and your organization." },
    { label: "Background", title: "Company Background", sub: "Help us understand your hiring history and focus." },
    { label: "Strategy", title: "Strategy & Timeline", sub: "Define the urgency and complexity of your mission." },
    { label: "Preferences", title: "Preferences & Terms", sub: "Complete your setup and activate premium AI matching." },
];

const slideVariants = {
    enter: (direction) => ({
        x: direction > 0 ? 30 : -30,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction) => ({
        x: direction < 0 ? 30 : -30,
        opacity: 0,
    }),
};

const ClientOnboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [draftData, setDraftData] = useState(null);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
    const [cropTarget, setCropTarget] = useState(null); // { file, field } while the crop modal is open
    const [errors, setErrors] = useState({});
    const fieldRefs = useRef({});
    const profilePicRef = useRef(null);
    const companyPicRef = useRef(null);
    const registerFieldRef = (name) => (el) => { fieldRefs.current[name] = el; };
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
        industryType: [],
        customIndustry: "",
        role: "", // Founder, PM, Marketing, Developer, Other
        bio: "",
        languages: [],

        // Step 3: Project Needs
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

    // Load existing client profile to prefill onboarding (if already completed)
    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const res = await clientsAPI.getProfile();
                const dbProfile = res.data?.data?.profile || {};
                if (dbProfile._id) {
                    setFormData(prev => ({
                        ...prev,
                        fullName: prev.fullName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
                        workEmail: prev.workEmail || user?.email || '',
                        phone: dbProfile.phone || prev.phone,
                        companyName: dbProfile.companyName || prev.companyName,
                        companyWebsite: dbProfile.website || prev.companyWebsite,
                        companyType: dbProfile.companyType || prev.companyType,
                        companySize: dbProfile.companySize || prev.companySize,
                        country: dbProfile.location?.country || prev.country,
                        isNewToHiring: dbProfile.isNewToHiring || prev.isNewToHiring,
                        industryType: Array.isArray(dbProfile.industryType) ? dbProfile.industryType : (dbProfile.industryType ? [dbProfile.industryType] : []),
                        customIndustry: dbProfile.customIndustry || prev.customIndustry,
                        role: dbProfile.role || prev.role,
                        bio: dbProfile.description || prev.bio,
                        languages: dbProfile.languages || prev.languages,
                        techStack: dbProfile.techStack || prev.techStack,
                    }));
                }
            } catch (e) {
                console.error('Failed to prefill onboarding:', e);
            }
        };
        fetchProfile();
    }, [user]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally not re-syncing on every formData keystroke, only on step/prompt change
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

    const fetchAISuggestions = async () => {
        if (!formData.companyName && !formData.bio && (!formData.techStack || formData.techStack.length === 0)) {
            return;
        }
        setFetchingSuggestions(true);
        try {
            const res = await clientsAPI.recommendIndustry({
                companyName: formData.companyName,
                bio: formData.bio,
                techStack: formData.techStack,
                website: formData.companyWebsite
            });
            if (res.data?.success && res.data?.data?.recommendations) {
                setAiSuggestions(res.data.data.recommendations);
            }
        } catch (error) {
            console.error("Error getting industry recommendations:", error);
        } finally {
            setFetchingSuggestions(false);
        }
    };

    useEffect(() => {
        if (step === 2 && formData.companyType !== 'Individual') {
            fetchAISuggestions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAISuggestions is recreated every render; only re-fire on step/companyType change
    }, [step, formData.companyType]);

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
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }
        setCropTarget({ file, field });
    };

    const handleCropConfirm = (finalFile) => {
        const field = cropTarget?.field;
        setCropTarget(null);
        setFormData(prev => ({
            ...prev,
            [field]: finalFile,
            [`${field}Url`]: URL.createObjectURL(finalFile)
        }));
    };

    const nextStep = () => {
        if (validateStep()) {
            setDirection(1);
            setStep(s => Math.min(s + 1, 5));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        setDirection(-1);
        setStep(s => Math.max(s - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Field order per step, used to pick which invalid field to scroll to first.
    const STEP_FIELD_ORDER = {
        1: ['fullName', 'workEmail', 'companyType', 'companyName', 'country'],
        2: ['isNewToHiring', 'industryType', 'bio', 'languages'],
        3: ['urgency'],
        4: ['termsAccepted'],
    };

    const validateStep = () => {
        const newErrors = {};

        if (step === 1) {
            if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
            if (!formData.workEmail.trim()) newErrors.workEmail = "Work Email is required";
            if (!formData.companyType) newErrors.companyType = "Please select an Organization Type";
            if (formData.companyType !== 'Individual' && !formData.companyName.trim()) {
                newErrors.companyName = "Company Name is required for businesses";
            }
            if (!formData.country) newErrors.country = "Please select your Country";
        }
        if (step === 2) {
            if (!formData.isNewToHiring) newErrors.isNewToHiring = "Hiring Experience selection is required";
            if (formData.companyType !== 'Individual' && !formData.industryType) {
                newErrors.industryType = "Please select your Industry";
            }
            if (!formData.bio || formData.bio.trim().length < 20) {
                newErrors.bio = "Please provide a descriptive Bio / About summary (minimum 20 characters)";
            }
            if (!formData.languages || formData.languages.length === 0 || formData.languages.every(l => !l.language)) {
                newErrors.languages = "Please select at least one language spoken / preferred";
            }
        }
        if (step === 3) {
            if (!formData.urgency) newErrors.urgency = "Please define your project urgency";
        }
        if (step === 4 && !formData.termsAccepted) {
            newErrors.termsAccepted = "Please agree to the Terms & Conditions to proceed";
        }

        setErrors(newErrors);

        const order = STEP_FIELD_ORDER[step] || [];
        const firstInvalidField = order.find((key) => newErrors[key]);
        if (firstInvalidField) {
            toast.warning(newErrors[firstInvalidField]);
            const el = fieldRefs.current[firstInvalidField];
            if (el?.scrollIntoView) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        return true;
    };

    const handleFinish = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
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
            await refreshAuth(); // Refresh user data locally to update isOnBoardingCompleted
            setDirection(1);
            setStep(5);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error("Onboarding submission error:", error);
            toast.error(error.response?.data?.message || "Failed to submit profile");
        } finally {
            setIsLoading(false);
        }
    };

    const options = useMemo(() => countryList().getData(), []);

    const languageOptions = useMemo(() => LANGUAGES.map(lang => ({ value: lang, label: lang })), []);
    const proficiencyOptions = useMemo(() => [
        { value: 'basic', label: 'Basic' },
        { value: 'conversational', label: 'Conversational' },
        { value: 'fluent', label: 'Fluent' },
        { value: 'native', label: 'Native' }
    ], []);

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
            borderColor: state.isFocused ? "var(--onboard-accent-primary)" : "#E2E8F0",
            borderWidth: "1.5px",
            borderRadius: "12px",
            minHeight: "48px",
            padding: "0 6px",
            color: "var(--onboard-accent-dark)",
            fontSize: "14.5px",
            boxShadow: state.isFocused ? "0 0 0 3.5px var(--onboard-accent-glow)" : "none",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "pointer",
            "&:hover": {
                borderColor: state.isFocused ? "var(--onboard-accent-primary)" : "#CBD5E1"
            }
        }),
        menu: (base) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(12px)",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 12px 32px -8px rgba(11, 41, 66, 0.12)",
            padding: "6px",
            zIndex: 9999,
            marginTop: "6px",
            animation: "dropdownSlideIn 0.2s cubic-bezier(0.19, 1, 0.22, 1)"
        }),
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected
                ? "var(--onboard-mint)"
                : state.isFocused
                    ? "rgba(16, 185, 129, 0.08)"
                    : "transparent",
            color: state.isSelected ? "var(--onboard-accent-dark)" : "var(--onboard-accent-dark)",
            fontWeight: state.isSelected ? "700" : "500",
            cursor: "pointer",
            borderRadius: "8px",
            margin: "2px 0",
            padding: "10px 14px",
            fontSize: "14px",
            transition: "all 0.15s ease",
            "&:active": {
                background: "var(--onboard-mint-hover)"
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: "var(--onboard-accent-dark)",
            marginLeft: "6px",
            fontWeight: "500",
            fontSize: "14.5px"
        }),
        placeholder: (base) => ({
            ...base,
            color: "#94a3b8",
            marginLeft: "6px",
            fontWeight: "500",
            fontSize: "14.5px"
        }),
        dropdownIndicator: (base, state) => ({
            ...base,
            color: state.isFocused ? "var(--onboard-accent-primary)" : "#94a3b8",
            transition: "transform 0.25s ease",
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
                                <div className="onboarding__avatar-overlay" onClick={() => profilePicRef.current?.click()}>
                                    <Upload size={28} />
                                    <span>Upload</span>
                                    <ImageSourcePicker ref={profilePicRef} accept="image/*" facing="user" onChange={(e) => handleImageUpload(e, 'profilePic')} />
                                </div>
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
                                    <div className="onboarding__avatar-overlay" style={{ borderRadius: '12px' }} onClick={() => companyPicRef.current?.click()}>
                                        <Upload size={28} />
                                        <span>Upload</span>
                                        <ImageSourcePicker ref={companyPicRef} accept="image/*" onChange={(e) => handleImageUpload(e, 'companyPic')} />
                                    </div>
                                </div>
                            </div>
                            <span className="onboarding__label" style={{ marginBottom: '4px' }}>Business / Company Image</span>
                            <p className="onboarding__upload-hint">PNG, JPG up to 5MB</p>
                        </div>
                    )}
                </div>
            )}

            <div className="onboarding__form-row">
                <div className="onboarding__form-group" ref={registerFieldRef('fullName')}>
                    <label className="onboarding__label" htmlFor="ob-full-name">Full Name*</label>
                    <input id="ob-full-name" type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="onboarding__input" placeholder="e.g. John Doe" />
                    {errors.fullName && <p className="onboarding__field-error">{errors.fullName}</p>}
                </div>

                <div className="onboarding__form-group" ref={registerFieldRef('workEmail')}>
                    <label className="onboarding__label" htmlFor="ob-work-email">Work Email*</label>
                    <input id="ob-work-email" type="email" name="workEmail" required value={formData.workEmail} onChange={handleChange} className="onboarding__input" placeholder="john@company.com" />
                    {errors.workEmail && <p className="onboarding__field-error">{errors.workEmail}</p>}
                </div>
            </div>

            <div className="onboarding__form-group" ref={registerFieldRef('companyType')}>
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
                            onClick={() => setFormData(p => {
                                const isIndiv = item.id === 'Individual';
                                return {
                                    ...p,
                                    companyType: item.id,
                                    companyName: isIndiv ? '' : p.companyName,
                                    companyPic: isIndiv ? null : p.companyPic,
                                    companyPicUrl: isIndiv ? '' : p.companyPicUrl,
                                    companyWebsite: isIndiv ? '' : p.companyWebsite,
                                    companySize: isIndiv ? '' : p.companySize,
                                    industryType: isIndiv ? '' : p.industryType,
                                    role: isIndiv ? '' : p.role,
                                    customIndustry: ''
                                };
                            })}
                        >
                            <item.icon className="onboarding__choice-icon" />
                            <div>
                                <span className="onboarding__choice-label">{item.id}</span>
                                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', margin: '4px 0 0', fontWeight: '500' }}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {errors.companyType && <p className="onboarding__field-error">{errors.companyType}</p>}
            </div>

            {formData.companyType !== 'Individual' && formData.companyType !== '' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="onboarding__form-row">
                    <div className="onboarding__form-group" style={{ flex: 1 }} ref={registerFieldRef('companyName')}>
                        <label className="onboarding__label" htmlFor="ob-company-name">Company Name</label>
                        <input id="ob-company-name" type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="onboarding__input" placeholder="Acme Inc." />
                        {errors.companyName && <p className="onboarding__field-error">{errors.companyName}</p>}
                    </div>
                </motion.div>
            )}

            <div className="onboarding__form-row">
                <div className="onboarding__form-group">
                    <label className="onboarding__label" htmlFor="ob-phone">Phone Number (Optional)</label>
                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '12px', top: '18px', color: '#94a3b8' }} />
                        <input
                            id="ob-phone"
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
                    <label className="onboarding__label" htmlFor="ob-website">Website (Optional)</label>
                    <div style={{ position: 'relative' }}>
                        <Globe2 size={16} style={{ position: 'absolute', left: '12px', top: '18px', color: '#94a3b8' }} />
                        <input
                            id="ob-website"
                            type="url"
                            name="companyWebsite"
                            value={formData.companyWebsite}
                            onChange={handleChange}
                            className="onboarding__input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="https://example.com"
                        />
                    </div>
                    {formData.companyWebsite && !/^https?:\/\/.*/.test(formData.companyWebsite) && (
                        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>Please include http:// or https://</p>
                    )}
                </div>
            </div>

            <div className="onboarding__form-row">
                <div className="onboarding__form-group" ref={registerFieldRef('country')}>
                    <label className="onboarding__label" htmlFor="ob-country">Country*</label>
                    <Select
                        inputId="ob-country"
                        options={options}
                        value={formData.country ? options.find(opt => opt.label === formData.country) : null}
                        onChange={(val) => setFormData(p => ({ ...p, country: val ? val.label : '' }))}
                        styles={customStyles}
                        placeholder="Select Country"
                        classNamePrefix="skillkart-select"
                        isSearchable={true}
                        maxMenuHeight={220}
                        menuShouldScrollIntoView={true}
                        components={{ Control: CustomControl }}
                        menuPortalTarget={document.body}
                        menuPlacement="bottom"
                    />
                    {errors.country && <p className="onboarding__field-error">{errors.country}</p>}
                </div>
                <div className="onboarding__form-group">
                    <label className="onboarding__label" htmlFor="ob-timezone">Timezone / Base Location</label>
                    <div style={{ position: 'relative' }}>
                        <Select
                            inputId="ob-timezone"
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
                    <label className="onboarding__label" htmlFor="ob-linkedin">LinkedIn Profile (Optional)</label>
                    <div style={{ position: 'relative' }}>
                        <Linkedin size={16} style={{ position: 'absolute', left: '12px', top: '18px', color: '#94a3b8' }} />
                        <input
                            id="ob-linkedin"
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

            {/* Side-by-Side Compact Skip & Tip Grid (Identical to Freelancer Onboarding) */}
            <div className="onboarding__skip-grid">
                <div className="onboarding__skip-banner">
                    <div className="onboarding__skip-text">
                        <span className="onboarding__skip-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <LayoutDashboard size={14} style={{ color: "var(--onboard-accent-primary)" }} />
                            Prefer to explore first?
                        </span>
                        <span className="onboarding__skip-sub">
                            Skip directly to dashboard and complete later.
                        </span>
                    </div>
                    <button
                        type="button"
                        className="onboarding__skip-btn"
                        onClick={() => navigate("/client/dashboard")}
                    >
                        Skip to Dashboard <ArrowRight size={13} />
                    </button>
                </div>

                <div className="onboarding__tip-card">
                    <div className="onboarding__tip-header">
                        <CheckCircle2 size={15} className="onboarding__tip-icon" />
                        <strong>Pro Tip for Smart Hiring</strong>
                    </div>
                    <p>
                        Clients with complete profiles attract top 1% verified talent 3x faster. You can fill out details anytime!
                    </p>
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
            <div className="onboarding__form-group" ref={registerFieldRef('isNewToHiring')}>
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
                {errors.isNewToHiring && <p className="onboarding__field-error">{errors.isNewToHiring}</p>}
            </div>

            {formData.companyType !== 'Individual' && (
                <div className="onboarding__form-row" style={{ display: 'block' }}>
                    <div className="onboarding__form-group" style={{ flex: 1, marginBottom: '1.5rem' }} ref={registerFieldRef('industryType')}>
                        <label className="onboarding__label">Industry*</label>
                        <IndustryInput
                            value={formData.industryType}
                            onChange={(val) => setFormData(p => ({ ...p, industryType: val }))}
                            placeholder="Type to search industry (e.g. software, design)..."
                        />
                        {errors.industryType && <p className="onboarding__field-error">{errors.industryType}</p>}


                        <div className="onboarding__ai-suggestions" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Sparkles size={13} style={{ color: '#eab308' }} /> AI Recommended:
                                </span>
                                {fetchingSuggestions && <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>analyzing company profile...</span>}
                                {!fetchingSuggestions && (
                                    <button 
                                        type="button" 
                                        onClick={fetchAISuggestions}
                                        style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '0 4px', textDecoration: 'underline' }}
                                    >
                                        re-analyze
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {aiSuggestions.length > 0 ? (
                                    aiSuggestions.map(rec => (
                                        <button
                                            key={rec}
                                            type="button"
                                            className={`onboarding__tag ${formData.industryType?.includes(rec) ? 'onboarding__tag--active' : ''}`}
                                            style={{ fontSize: '12px', padding: '6px 12px', height: 'auto', margin: 0, borderRadius: '8px', cursor: 'pointer' }}
                                            onClick={() => {
                                                const current = Array.isArray(formData.industryType) ? formData.industryType : [formData.industryType].filter(Boolean);
                                                const updated = current.includes(rec)
                                                    ? current.filter(x => x !== rec)
                                                    : [...current, rec];
                                                setFormData(p => ({ ...p, industryType: updated }));
                                            }}
                                        >
                                            {rec}
                                        </button>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Fill name or bio details to populate AI recommendations.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {formData.companyType !== 'Individual' && (
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Your Executive Role</label>
                    <div className="onboarding__tags">
                        {['Founder', 'Product Lead', 'CTO', 'Engineering Manager', 'Marketing Head', 'Design Director'].map(r => (
                            <div
                                key={r}
                                className={`onboarding__tag ${formData.role === r ? 'onboarding__tag--active' : ''}`}
                                onClick={() => setFormData(p => ({ ...p, role: r }))}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormData(p => ({ ...p, role: r })); } }}
                            >{r}</div>
                        ))}
                    </div>
                </div>
            )}

            <div className="onboarding__form-group" ref={registerFieldRef('bio')}>
                <label className="onboarding__label" htmlFor="ob-bio">Bio / About Yourself*</label>
                <textarea
                    id="ob-bio"
                    name="bio"
                    required
                    value={formData.bio}
                    onChange={handleChange}
                    className="onboarding__input"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    placeholder="Describe your goals, team size, company mission, or what you plan to accomplish on SkillKart..."
                />
                {errors.bio && <p className="onboarding__field-error">{errors.bio}</p>}
                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', marginTop: '4px', fontWeight: '500' }}>
                    Introduce yourself and your organization to help top freelancers understand your requirements. (Min 20 characters)
                </p>
                <AiGenerateText
                    fieldLabel="a client company's bio/about section on their freelance-marketplace profile — goals, team, and mission"
                    getContext={() => ({ companyName: formData.companyName, companyType: formData.companyType, industry: formData.industryType })}
                    getExistingText={() => formData.bio}
                    onGenerated={(text) => setFormData((p) => ({ ...p, bio: text }))}
                />
            </div>

            <div className="onboarding__form-group" ref={registerFieldRef('languages')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label className="onboarding__label" style={{ marginBottom: 0 }}>Languages Spoken / Preferred*</label>
                    <button
                        type="button"
                        className="cl-btn cl-btn--ghost cl-btn--sm"
                        onClick={() => setFormData(p => ({ ...p, languages: [...p.languages, { language: '', proficiency: 'fluent' }] }))}
                        style={{ padding: '4px 8px', fontSize: '13px' }}
                    >
                        <Plus size={14} /> Add Language
                    </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {formData.languages.map((lang, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e5edf5' }}>
                            <div className="onboarding__form-group" style={{ marginBottom: 0 }}>
                                <label className="onboarding__label" htmlFor={`ob-lang-${idx}`} style={{ fontSize: '12px', marginBottom: '4px' }}>Language</label>
                                <Select
                                    inputId={`ob-lang-${idx}`}
                                    options={languageOptions}
                                    value={lang.language ? { value: lang.language, label: lang.language } : null}
                                    onChange={(selected) => {
                                        const newList = [...formData.languages];
                                        newList[idx].language = selected?.value || '';
                                        setFormData(p => ({ ...p, languages: newList }));
                                    }}
                                    placeholder="Select language"
                                    styles={customStyles}
                                    classNamePrefix="skillkart-select"
                                    menuPortalTarget={document.body}
                                />
                            </div>
                            <div className="onboarding__form-group" style={{ marginBottom: 0 }}>
                                <label className="onboarding__label" htmlFor={`ob-prof-${idx}`} style={{ fontSize: '12px', marginBottom: '4px' }}>Proficiency</label>
                                <Select
                                    inputId={`ob-prof-${idx}`}
                                    options={proficiencyOptions}
                                    value={proficiencyOptions.find(o => o.value.toLowerCase() === (lang.proficiency || 'fluent').toLowerCase()) || proficiencyOptions[2]}
                                    onChange={(selected) => {
                                        const newList = [...formData.languages];
                                        newList[idx].proficiency = selected?.value || 'fluent';
                                        setFormData(p => ({ ...p, languages: newList }));
                                    }}
                                    placeholder="Select proficiency"
                                    styles={customStyles}
                                    classNamePrefix="skillkart-select"
                                    menuPortalTarget={document.body}
                                />
                            </div>
                            <button
                                type="button"
                                className="cl-btn cl-btn--ghost cl-btn--sm"
                                style={{ color: '#ef4444', height: '42px', border: '1px solid #fee2e2', background: '#fef2f2' }}
                                onClick={() => {
                                    const newList = formData.languages.filter((_, i) => i !== idx);
                                    setFormData(p => ({ ...p, languages: newList }));
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {formData.languages.length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>⚠ No languages added. At least one is required.</p>
                    )}
                </div>
                {errors.languages && <p className="onboarding__field-error">{errors.languages}</p>}
                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', marginTop: '8px', fontWeight: '500' }}>
                    Select one or more languages you use to communicate with freelancers.
                </p>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="onboarding__form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label className="onboarding__label" htmlFor="ob-tech-understanding">Technical Complexity Awareness</label>
                    <span style={{ color: 'var(--onboard-accent-primary)', fontWeight: '700' }}>{formData.technicalUnderstanding}/10</span>
                </div>
                <input id="ob-tech-understanding" type="range" name="technicalUnderstanding" min="1" max="10" value={formData.technicalUnderstanding} onChange={handleChange} className="onboarding__slider" style={{ background: `linear-gradient(to right, var(--onboard-accent-primary, #10B981) ${((formData.technicalUnderstanding - 1) / 9) * 100}%, #e2e8f0 ${((formData.technicalUnderstanding - 1) / 9) * 100}%)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--onboard-text-secondary)' }}>
                    <span>Conceptual</span>
                    <span>Deep Tech</span>
                </div>
            </div>

            <div className="onboarding__form-group" ref={registerFieldRef('urgency')}>
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
                {errors.urgency && <p className="onboarding__field-error">{errors.urgency}</p>}
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
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

            <div className="onboarding__form-group" style={{ marginTop: '24px' }} ref={registerFieldRef('termsAccepted')}>
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
                            onClick={() => {
                                // /services-agreement isn't registered as an in-app route in the
                                // mobile build (it's part of the excluded marketing route block in
                                // AppRoutes.jsx), so it 404s there. Read it from the live site instead
                                // of losing onboarding progress by navigating the app itself away.
                                if (isMobileApp()) openExternal('https://skillkart-fuuast.vercel.app/services-agreement');
                                else window.open('/services-agreement', '_blank');
                            }}
                        >Service Agreement</span> and understand that SkillKart ensures payment safety through Escrow.
                    </label>
                </div>
                {errors.termsAccepted && <p className="onboarding__field-error">{errors.termsAccepted}</p>}
            </div>
        </motion.div>
    );

    const renderSuccess = () => (
        <motion.div className="onboarding__success" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
            <div className="onboarding__success-icon-wrap">
                <Rocket size={42} style={{ color: 'var(--onboard-accent-primary)' }} />
            </div>
            <h1 className="onboarding__title">You're All Set!</h1>
            <p className="onboarding__subtitle">Your client profile has been deployed. Our AI is already analyzing local and global talent matching your requirements.</p>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="onboarding__report-card"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '10px', background: 'var(--onboard-mint)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Terminal size={22} color="var(--onboard-accent-primary)" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--onboard-accent-dark)', fontWeight: 700 }}>Initialization Report</h3>
                        <span style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)' }}>AI Matching Profile Active</span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: 'var(--onboard-text-secondary)', margin: 0, fontSize: '14.5px', lineHeight: 1.6 }}>
                        Hello <b style={{ color: 'var(--onboard-accent-dark)' }}>{formData.fullName ? formData.fullName.split(' ')[0] : 'Client'}</b>, we've identified verified talent in <b style={{ color: 'var(--onboard-accent-dark)' }}>{formData.techStack?.[0] || 'your domain'}</b> ready to collaborate within your <b style={{ color: 'var(--onboard-accent-dark)' }}>{formData.budgetRange || 'target'}</b> budget.
                    </p>
                    <button
                        className="onboarding__btn-next"
                        style={{ alignSelf: 'flex-start' }}
                        onClick={() => navigate("/client/dashboard")}
                    >
                        Go to Dashboard <ChevronRight size={18} />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    const progressPercent = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);

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
                            position: 'fixed', inset: 0, background: 'rgba(11, 41, 66, 0.65)',
                            backdropFilter: 'blur(6px)', zIndex: 99999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            style={{
                                background: '#fff', borderRadius: '20px', padding: '36px 32px',
                                maxWidth: '440px', width: '92%', boxShadow: '0 20px 45px -10px rgba(11, 41, 66, 0.25)',
                                textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <div style={{
                                width: '64px', height: '64px', background: 'var(--onboard-mint)', borderRadius: '18px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px', color: 'var(--onboard-accent-primary)',
                                border: '1px solid var(--onboard-mint-border)'
                            }}>
                                <Clock size={32} />
                            </div>
                            <h3 style={{ margin: '0 0 10px', fontSize: '1.35rem', color: 'var(--onboard-accent-dark)', fontWeight: 800 }}>
                                Unfinished Onboarding
                            </h3>
                            <p style={{ margin: '0 0 26px', color: 'var(--onboard-text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
                                We found your previous onboarding progress. Would you like to continue where you left off or start fresh?
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={handleDiscardDraft}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E2E8F0',
                                        background: 'transparent', color: 'var(--onboard-text-secondary)', fontWeight: 700, cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = '#F8FAFC'}
                                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                                >
                                    Start Fresh
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRestoreDraft}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer',
                                        transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)'}
                                    onMouseOut={(e) => e.target.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)'}
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
                    {step <= 4 && (
                        <div className="onboarding__progress-wrapper">
                            <div className="onboarding__progress-top-row">
                                <span className="onboarding__progress-step-indicator">
                                    <Sparkles size={13} style={{ color: "var(--onboard-accent-primary)" }} />
                                    Step {step} of {TOTAL_STEPS}: {STEP_METADATA[step - 1].label}
                                </span>
                                <span className="onboarding__progress-percentage">
                                    {progressPercent}% Completed
                                </span>
                            </div>

                            <div className="onboarding__progress-bar-track">
                                <motion.div
                                    className="onboarding__progress-bar-fill"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>

                            <div className="onboarding__stepper">
                                {STEP_METADATA.map((meta, idx) => {
                                    const stepNum = idx + 1;
                                    const isCompleted = step > stepNum;
                                    const isActive = step === stepNum;

                                    return (
                                        <div key={stepNum} className="onboarding__step-item">
                                            <div
                                                className={`onboarding__step-node ${
                                                    isActive
                                                        ? "onboarding__step-node--active"
                                                        : isCompleted
                                                        ? "onboarding__step-node--completed"
                                                        : ""
                                                }`}
                                            >
                                                {isCompleted ? <CheckCircle2 size={16} /> : stepNum}
                                            </div>
                                            <span
                                                className={`onboarding__step-label ${
                                                    isActive
                                                        ? "onboarding__step-label--active"
                                                        : isCompleted
                                                        ? "onboarding__step-label--completed"
                                                        : ""
                                                }`}
                                            >
                                                {meta.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={`header-${step}`}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.35, ease: "easeOut" }}
                                    className="onboarding__header"
                                >
                                    <h1 className="onboarding__title">{STEP_METADATA[step - 1].title}</h1>
                                    <p className="onboarding__subtitle">{STEP_METADATA[step - 1].sub}</p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}

                    <form onSubmit={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                style={{ flex: 1 }}
                            >
                                {step === 1 && renderStep1()}
                                {step === 2 && renderStep2()}
                                {step === 3 && renderStep3()}
                                {step === 4 && renderStep4()}
                                {step === 5 && renderSuccess()}
                            </motion.div>
                        </AnimatePresence>

                        {step <= 4 && (
                            <div className="onboarding__nav">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {step > 1 ? (
                                        <button type="button" onClick={prevStep} className="onboarding__btn-back">
                                            <ChevronLeft size={18} /> Back
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => navigate("/client/dashboard")}
                                        className="onboarding__nav-skip"
                                    >
                                        <LayoutDashboard size={14} /> Skip to Dashboard
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={step === 4 ? handleFinish : nextStep}
                                    className={`onboarding__btn-next ${step === 4 ? 'onboarding__btn-submit' : ''}`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader size="sm" text="" />
                                    ) : (
                                        <>
                                            {step === 4 ? (
                                                <>
                                                    <Rocket size={18} />
                                                    Deploy Profile
                                                </>
                                            ) : (
                                                <>
                                                    Continue <ChevronRight size={18} />
                                                </>
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            <ImageCropModal
                file={cropTarget?.file || null}
                aspect={1}
                cropShape={cropTarget?.field === 'companyPic' ? 'rect' : 'round'}
                title={cropTarget?.field === 'companyPic' ? 'Adjust Company Logo' : 'Adjust Profile Photo'}
                onCancel={() => setCropTarget(null)}
                onConfirm={handleCropConfirm}
            />
        </section>
    );
};

export default ClientOnboarding;
