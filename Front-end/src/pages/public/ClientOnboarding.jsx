import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Select, { components } from 'react-select';
import countryList from 'react-select-country-list';
import {
    User, Mail, Phone, Upload, Globe, Building2, Briefcase,
    ChevronRight, ChevronLeft, CheckCircle2, Info, Lightbulb,
    Target, Zap, Clock, MessageSquare, Terminal, Layout, ShieldCheck,
    Search, Trash2, Sliders, Settings, Sparkles, X, Plus
} from "lucide-react";
import { toast } from "react-toastify";
import "./ClientOnboarding.css";

const ClientOnboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [searchCountry, setSearchCountry] = useState("");

    const [formData, setFormData] = useState(() => {
        const saved = localStorage.getItem("skillkart_client_onboarding_v2");
        return saved ? JSON.parse(saved) : {
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

            // Step 2: Professional Background
            isNewToHiring: "", // Yes (Fresh), No (Experienced)
            industryType: "",
            customIndustry: "",
            role: "", // Founder, PM, Marketing, Developer, Other

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
            preferredCommunication: [], // Chat, Video Call, Email
            aiAssistance: true,
            termsAccepted: false
        };
    });

    useEffect(() => {
        const dataToSave = { ...formData };
        delete dataToSave.profilePic; // Don't save blob objects to LS
        localStorage.setItem("skillkart_client_onboarding_v2", JSON.stringify(dataToSave));
    }, [formData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please upload an image file");
                return;
            }
            setFormData(prev => ({
                ...prev,
                profilePic: file,
                profilePicUrl: URL.createObjectURL(file)
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
            if (!formData.fullName) { toast.warn("Full Name is required"); return false; }
            if (!formData.workEmail) { toast.warn("Work Email is required"); return false; }
            if (!formData.companyType) { toast.warn("Please select a Client Type"); return false; }
        }
        if (step === 2) {
            if (!formData.isNewToHiring) { toast.warn("Hiring Experience is required"); return false; }
            if (formData.industryType === 'Other' && !formData.customIndustry) {
                toast.warn("Please specify your industry");
                return false;
            }
        }
        if (step === 5 && !formData.termsAccepted) {
            toast.warn("Please agree to the Terms & Conditions");
            return false;
        }
        return true;
    };

    const handleFinish = (e) => {
        e.preventDefault();
        if (!validateStep()) return;

        setIsLoading(true);
        setTimeout(() => {
            console.log("FINAL CLIENT ONBOARDING DATA:", formData);
            localStorage.removeItem("skillkart_client_onboarding_v2");
            setIsLoading(false);
            setStep(6);
        }, 2000);
    };

    const isStepValid = () => {
        if (step === 1) {
            return formData.fullName && formData.workEmail && formData.companyType;
        }
        if (step === 2) {
            const hasExperience = formData.isNewToHiring;
            const hasIndustry = formData.industryType !== 'Other' || formData.customIndustry;
            return hasExperience && hasIndustry;
        }
        if (step === 5) {
            return formData.termsAccepted;
        }
        return true;
    };

    const progress = (step - 1) / 4 * 100;
    const options = useMemo(() => countryList().getData(), []);

    const CustomControl = ({ children, ...props }) => (
        <components.Control {...props}>
            <Search size={16} color="var(--onboard-text-secondary)" style={{ marginLeft: '12px', opacity: 0.6 }} />
            {children}
        </components.Control>
    );

    const customStyles = {
        control: (base, state) => ({
            ...base,
            background: "rgba(255, 255, 255, 0.04)",
            borderColor: state.isFocused ? "var(--onboard-accent-primary)" : "rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "8px 12px",
            color: "white",
            fontSize: "16px",
            boxShadow: state.isFocused ? "0 0 15px var(--onboard-accent-glow), 0 0 0 1px var(--onboard-accent-primary)" : "none",
            transition: "all 0.3s ease",
            "&:hover": {
                borderColor: state.isFocused ? "var(--onboard-accent-primary)" : "rgba(255, 255, 255, 0.2)",
            }
        }),
        menu: (base) => ({
            ...base,
            background: "#042E4C",
            border: "1px solid rgba(183, 201, 226, 0.2)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            zIndex: 9999
        }),
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999
        }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected ? "var(--onboard-accent-primary)" : state.isFocused ? "rgba(255, 255, 255, 0.05)" : "transparent",
            color: state.isSelected ? "#042E4C" : "white",
            cursor: "pointer",
            "&:active": {
                background: "var(--onboard-accent-primary)",
                color: "#042E4C"
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: "white",
            marginLeft: "8px"
        }),
        input: (base) => ({
            ...base,
            color: "white",
            marginLeft: "8px"
        }),
        placeholder: (base) => ({
            ...base,
            color: "#64748b",
            marginLeft: "8px"
        })
    };

    // --- Step Renders ---

    const renderStep1 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
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
                            <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                        </label>
                    </div>
                </div>
                <span className="onboarding__label" style={{ marginBottom: '4px' }}>Professional Avatar</span>
                <p className="onboarding__upload-hint">PNG, JPG up to 5MB</p>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Full Name*</label>
                <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="onboarding__input" placeholder="e.g. John Doe" />
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Work Email*</label>
                <input type="email" name="workEmail" required value={formData.workEmail} onChange={handleChange} className="onboarding__input" placeholder="john@company.com" />
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
                                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', margin: '4px 0 0' }}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {formData.companyType !== 'Individual' && formData.companyType !== '' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <div className="onboarding__form-group">
                        <label className="onboarding__label">Company Name</label>
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="onboarding__input" placeholder="Acme Inc." />
                    </div>
                    <div className="onboarding__form-group">
                        <label className="onboarding__label">Country</label>
                        <Select
                            options={options}
                            value={options.find(opt => opt.label === formData.country)}
                            onChange={(val) => setFormData(p => ({ ...p, country: val.label }))}
                            styles={customStyles}
                            placeholder="Select Country"
                            classNamePrefix="skillkart-select"
                            isSearchable={true}
                            maxMenuHeight={220} // ~5.5 items
                            menuShouldScrollIntoView={true}
                            components={{ Control: CustomControl }}
                            menuPortalTarget={document.body}
                            menuPlacement="top"
                        />
                    </div>
                </motion.div>
            )}
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
                                <p style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', margin: '4px 0 0' }}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Primary Industry</label>
                <select name="industryType" value={formData.industryType} onChange={handleChange} className="onboarding__select">
                    <option value="">Select Industry</option>
                    {['Tech', 'E-commerce', 'Healthcare', 'FinTech', 'Marketing', 'Education'].map(i => (
                        <option key={i} value={i}>{i}</option>
                    ))}
                    <option value="Other">Other</option>
                </select>

                <AnimatePresence>
                    {formData.industryType === 'Other' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <label className="onboarding__label">Please Specify Industry</label>
                            <input
                                type="text"
                                name="customIndustry"
                                value={formData.customIndustry}
                                onChange={handleChange}
                                className="onboarding__input"
                                placeholder="e.g. Space Exploration"
                                autoFocus
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="onboarding__form-group">
                <label className="onboarding__label">Your Executive Role</label>
                <div className="onboarding__tags">
                    {['Founder', 'Product Lead', 'CTO', 'Engineering Manager', 'Marketing Head', 'Design Director'].map(r => (
                        <div key={r} className={`onboarding__tag ${formData.role === r ? 'onboarding__tag--active' : ''}`} onClick={() => setFormData(p => ({ ...p, role: r }))}>{r}</div>
                    ))}
                </div>
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
                            <span style={{ fontSize: '13px', color: 'var(--onboard-text-secondary)' }}>{item.desc}</span>
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
            <div className="onboarding__form-group" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
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
                    style={{ display: 'flex', gap: '16px', cursor: 'pointer' }}
                    onClick={() => setFormData(p => ({ ...p, termsAccepted: !p.termsAccepted }))}
                >
                    <div style={{
                        minWidth: '24px',
                        height: '24px',
                        border: '2px solid',
                        borderColor: formData.termsAccepted ? 'var(--onboard-accent-primary)' : 'rgba(255,255,255,0.2)',
                        background: formData.termsAccepted ? 'var(--onboard-accent-primary)' : 'transparent',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}>
                        {formData.termsAccepted && <CheckCircle2 size={16} color="white" />}
                    </div>
                    <label className="onboarding__label" style={{ cursor: 'pointer', lineHeight: 1.4 }}>
                        I agree to the <span style={{ color: 'var(--onboard-accent-primary)', textDecoration: 'underline' }}>Service Agreement</span> and understand that SkillKart ensures payment safety through Escrow.
                    </label>
                </div>
            </div>
        </motion.div>
    );

    const renderSuccess = () => (
        <motion.div className="onboarding__success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🚀</div>
            <h1 className="onboarding__title">You're All Set!</h1>
            <p className="onboarding__subtitle">Your project ecosystem is being prepared. Our AI is already analyzing local and global talent for you.</p>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', padding: '24px 32px', borderRadius: '32px', border: '1px solid var(--onboard-border)', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '14px' }}>
                        <Terminal size={24} color="var(--onboard-accent-primary)" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Initialization Report</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: 'var(--onboard-text-secondary)', margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
                        Hello <b>{formData.fullName ? formData.fullName.split(' ')[0] : 'Client'}</b>, we've identified <b>12+ verified experts</b> in <b>{formData.services[0] || 'your field'}</b> who match your <b>{formData.budgetRange || 'your range'}</b> budget.
                    </p>
                    <button className="onboarding__btn-next" style={{ alignSelf: 'flex-start' }} onClick={() => navigate("/")}>Go to Dashboard</button>
                </div>
            </motion.div>
        </motion.div>
    );

    return (
        <section className="onboarding">
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
                                    {isLoading ? <Loader2 className="animate-spin" /> : (
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

const Loader2 = ({ className }) => <div className={`animate-spin ${className}`}>⌛</div>;

export default ClientOnboarding;
