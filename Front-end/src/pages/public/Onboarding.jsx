import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, ShieldCheck, Camera, Rocket, Mail, Lock,
    MapPin, Globe, Zap, Building2, Terminal, Code,
    Wallet, Check, ArrowLeft, ChevronRight, Loader2, Sparkles, Upload,
    Eye, EyeOff, Smartphone, Briefcase, Languages, Trash2, Edit2, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';
import './Onboarding.css';

// --- Premium Base Components ---

const PremiumInput = ({ label, showPasswordToggle, strength, error, ...props }) => {
    const [show, setShow] = useState(false);
    const type = props.type === 'password' && show ? 'text' : props.type;

    return (
        <div className="onboard__field">
            {label && <label className="onboard__label">{label}</label>}
            <div className="onboard__input-wrapper">
                <input className={`onboard__input ${error ? 'onboard__input--error' : ''}`} {...props} type={type} />
                {showPasswordToggle && props.type === 'password' && (
                    <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {strength && props.value && (
                <div className="onboard__strength">
                    <div className={`onboard__strength-bar strength--${strength}`} />
                </div>
            )}
            {error && <span style={{ color: '#ff4d4d', fontSize: '11px', fontWeight: '600', marginTop: '4px', display: 'block' }}>{error}</span>}
        </div>
    );
};

const Onboarding = () => {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(30);
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef()];

    // --- Form State ---
    const [formData, setFormData] = useState({
        // Account Setup
        firstName: '', lastName: '', username: '', email: '', phone: '',
        password: '', confirmPassword: '', termsAccepted: false,

        // Profile/Company Setup
        profilePic: null, profilePicUrl: '', proTitle: '', bio: '', location: '',
        website: '', linkedin: '', skills: [], expertiseLevel: '', hourlyRate: '',
        availability: '', languages: [], companyName: '', industry: '',
        companySize: '', budgetRange: '', companyDescription: ''
    });

    const [errors, setErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState('weak');

    // --- Password Strength Logic ---
    useEffect(() => {
        const pwd = formData.password;
        if (!pwd) setPasswordStrength('weak');
        else if (pwd.length < 6) setPasswordStrength('weak');
        else if (pwd.length < 10) setPasswordStrength('medium');
        else if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) setPasswordStrength('strong');
        else setPasswordStrength('medium');
    }, [formData.password]);

    // --- OTP Countdown ---
    useEffect(() => {
        let timer;
        if (step === 3 && resendTimer > 0) {
            timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [step, resendTimer]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value && index < 4) {
            otpRefs[index + 1].current.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs[index - 1].current.focus();
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                profilePic: file,
                profilePicUrl: URL.createObjectURL(file)
            }));
        }
    };

    const toggleSkill = (skill) => {
        setFormData(prev => {
            const skills = prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill];
            return { ...prev, skills };
        });
    };

    const validateStep = () => {
        const newErrors = {};
        if (step === 1 && !role) {
            toast.warn("Choose your role to start!");
            return false;
        }
        if (step === 2) {
            if (!formData.firstName) newErrors.firstName = "First name required";
            if (!formData.lastName) newErrors.lastName = "Last name required";
            if (!formData.email) newErrors.email = "Email required";
            else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email";
            if (!formData.password) newErrors.password = "Password required";
            if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords mismatch";
            if (!formData.termsAccepted) newErrors.termsAccepted = "Accept terms to continue";
        }
        if (step === 3) {
            if (otp.join('').length < 5) {
                toast.error("Enter full OTP code");
                return false;
            }
        }
        if (step === 4) {
            if (role === 'Freelancer') {
                if (!formData.proTitle) newErrors.proTitle = "Professional title required";
                if (formData.skills.length === 0) toast.warn("Add at least one skill");
            } else {
                if (!formData.companyName) newErrors.companyName = "Company name required";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep()) {
            if (step === 3) {
                setIsLoading(true);
                setTimeout(() => {
                    setIsLoading(false);
                    setStep(4);
                }, 1500);
            } else {
                setStep(prev => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateStep()) return;

        setIsLoading(true);
        setTimeout(() => {
            console.log("FINAL MARKET-LEVEL ONBOARDING DATA:", {
                role,
                account: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    username: formData.username,
                    email: formData.email,
                    phone: formData.phone
                },
                professional: role === 'Freelancer' ? {
                    title: formData.proTitle,
                    bio: formData.bio,
                    skills: formData.skills,
                    expertise: formData.expertiseLevel,
                    rate: formData.hourlyRate,
                    availability: formData.availability
                } : {
                    companyName: formData.companyName,
                    industry: formData.industry,
                    size: formData.companySize,
                    budget: formData.budgetRange,
                    description: formData.companyDescription
                },
                profilePic: formData.profilePic,
                submittedAt: new Date().toISOString()
            });

            toast.success("Success! Welcome to SkillKart.");
            setIsLoading(false);

            // Reset
            setStep(1);
            setRole(null);
            setFormData({
                firstName: '', lastName: '', username: '', email: '', phone: '', password: '', confirmPassword: '', termsAccepted: false,
                profilePic: null, profilePicUrl: '', proTitle: '', bio: '', location: '', website: '', linkedin: '',
                skills: [], expertiseLevel: '', hourlyRate: '', availability: '', languages: [],
                companyName: '', industry: '', companySize: '', budgetRange: '', companyDescription: ''
            });
            setOtp(['', '', '', '', '']);
        }, 2000);
    };

    // --- Step Renders ---

    const StepNode = ({ s, title, active, completed }) => (
        <div className={`onboard__step-item ${active ? 'onboard__step-item--active' : ''} ${completed ? 'onboard__step-item--completed' : ''}`}>
            <div className="onboard__step-node">
                {completed ? <Check size={20} /> : s}
            </div>
            <span className="onboard__step-title">{title}</span>
        </div>
    );

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="onboard__step">
            <div className="onboard__header">
                <h1 className="onboard__title">Welcome to SkillKart</h1>
                <p className="onboard__subtitle">Choose how you want to use the platform to continue.</p>
            </div>
            <div className="onboard__roles">
                <div className={`onboard__role-card ${role === 'Client' ? 'onboard__role-card--active' : ''}`} onClick={() => setRole('Client')}>
                    <div className="onboard__role-icon"><Briefcase size={32} /></div>
                    <h3>I'm a Client</h3>
                    <p>Hire world-class talent and grow your business dreams.</p>
                </div>
                <div className={`onboard__role-card ${role === 'Freelancer' ? 'onboard__role-card--active' : ''}`} onClick={() => setRole('Freelancer')}>
                    <div className="onboard__featured-badge">Top Pick</div>
                    <div className="onboard__role-icon"><Terminal size={32} /></div>
                    <h3>I'm a Freelancer</h3>
                    <p>Find global projects and fast-track your professional career.</p>
                </div>
            </div>
            <div className="onboard__micro">Join 50K+ professionals worldwide.</div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="onboard__step">
            <div className="onboard__header">
                <h1 className="onboard__title">Account Details</h1>
                <p className="onboard__subtitle">Let's set up your personal SkillKart identity.</p>
            </div>
            <div className="onboard__form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <PremiumInput label="First Name" name="firstName" placeholder="e.g. John" value={formData.firstName} onChange={handleInputChange} error={errors.firstName} />
                <PremiumInput label="Last Name" name="lastName" placeholder="e.g. Doe" value={formData.lastName} onChange={handleInputChange} error={errors.lastName} />
            </div>
            <PremiumInput label="Unique Username" name="username" placeholder="johndoe_pro" value={formData.username} onChange={handleInputChange} />
            <PremiumInput label="Email Address" name="email" type="email" placeholder="john@company.com" value={formData.email} onChange={handleInputChange} error={errors.email} />
            <div className="onboard__form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <PremiumInput label="Create Password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} error={errors.password} strength={passwordStrength} showPasswordToggle />
                <PremiumInput label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleInputChange} error={errors.confirmPassword} />
            </div>
            <div className="onboard__field" style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleInputChange} style={{ width: '20px', height: '20px', accentColor: 'var(--onboard-indigo)' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>I agree to the <a href="#" style={{ color: 'white', textDecoration: 'underline' }}>Terms & Conditions</a></span>
                </div>
                {errors.termsAccepted && <span style={{ color: '#ff4d4d', fontSize: '11px', display: 'block', marginTop: '5px' }}>{errors.termsAccepted}</span>}
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="onboard__step" style={{ textAlign: 'center' }}>
            <div className="onboard__header">
                <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Mail size={32} color="white" />
                </div>
                <h1 className="onboard__title">Verify Your Email</h1>
                <p className="onboard__subtitle">We've sent a 5-digit code to <br /><b style={{ color: 'white' }}>{formData.email}</b> <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', cursor: 'pointer', marginLeft: '5px' }}><Edit2 size={12} /></button></p>
            </div>

            <div className="onboard__otp-container">
                {otp.map((digit, idx) => (
                    <input
                        key={idx} ref={otpRefs[idx]} type="text" maxLength="1" value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="onboard__input onboard__otp-input"
                    />
                ))}
            </div>

            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                Did safe not receive the code? {resendTimer > 0 ? (
                    <span>Resend in {resendTimer}s</span>
                ) : (
                    <button onClick={() => setResendTimer(30)} style={{ background: 'none', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Resend Now</button>
                )}
            </p>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="onboard__step">
            <div className="onboard__header">
                <h1 className="onboard__title">{role === 'Freelancer' ? 'Profile Details' : 'Company Info'}</h1>
                <p className="onboard__subtitle">Final setup to optimize your SkillKart experience.</p>
            </div>

            {role === 'Freelancer' ? (
                <>
                    <div className="onboard__profile-up">
                        <div className="onboard__avatar-wrap">
                            <div className="onboard__avatar-inner">
                                {formData.profilePicUrl ? <img src={formData.profilePicUrl} className="onboard__avatar-img" /> : <User size={40} color="white" />}
                                <label className="onboard__avatar-overlay">
                                    <Upload size={18} />
                                    <span>Upload</span>
                                    <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>
                    </div>
                    <PremiumInput label="Professional Title" name="proTitle" placeholder="e.g. Lead UI Designer" value={formData.proTitle} onChange={handleInputChange} error={errors.proTitle} />
                    <div className="onboard__field">
                        <label className="onboard__label">Bio</label>
                        <textarea className="onboard__input" name="bio" value={formData.bio} onChange={handleInputChange} placeholder="Say something high-impact about yourself..." style={{ height: '100px', resize: 'none' }} />
                        <div className="onboard__counter">{formData.bio.length}/300</div>
                    </div>
                    <div className="onboard__field">
                        <label className="onboard__label">Key Skills</label>
                        <div className="onboard__tags">
                            {['React', 'Vite', 'NodeJS', 'Python', 'AWS', 'TensorFlow', 'UI/UX'].map(skill => (
                                <div key={skill} className={`onboard__tag ${formData.skills.includes(skill) ? 'onboard__tag--active' : ''}`} onClick={() => toggleSkill(skill)}>
                                    {skill} {formData.skills.includes(skill) && <X size={10} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <PremiumInput label="Corporate Branding Name" name="companyName" placeholder="Acme Inc." value={formData.companyName} onChange={handleInputChange} error={errors.companyName} />
                    <div className="onboard__field">
                        <label className="onboard__label">Strategic Industry</label>
                        <select name="industry" value={formData.industry} onChange={handleInputChange} className="onboard__input onboard__select">
                            <option value="">Choose Industry</option>
                            <option value="Tech">Technology</option>
                            <option value="Fintech">Finance & Crypto</option>
                            <option value="Healthcare">Health Tech</option>
                        </select>
                    </div>
                    <div className="onboard__form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="onboard__field">
                            <label className="onboard__label">Company Size</label>
                            <select name="companySize" value={formData.companySize} onChange={handleInputChange} className="onboard__input onboard__select">
                                <option value="">Select Size</option>
                                <option value="1-10">1-10 Employees</option>
                                <option value="11-50">11-50 Employees</option>
                                <option value="51+">50+ Employees</option>
                            </select>
                        </div>
                        <div className="onboard__field">
                            <label className="onboard__label">Budget Range</label>
                            <select name="budgetRange" value={formData.budgetRange} onChange={handleInputChange} className="onboard__input onboard__select">
                                <option value="">Select Range</option>
                                <option value="1k-5k">$1k - $5k</option>
                                <option value="5k-20k">$5k - $20k</option>
                                <option value="20k+">$20k+</option>
                            </select>
                        </div>
                    </div>
                    <PremiumInput label="Corporate Website / URL" name="companyWebsite" placeholder="https://acme.inc" value={formData.companyWebsite} onChange={handleInputChange} />
                </>
            )}
        </motion.div>
    );

    return (
        <section className="onboard">
            <div className="onboard__circle onboard__circle--1" />
            <div className="onboard__circle onboard__circle--2" />
            <div className="onboard__container">

                <div className="onboard__stepper">
                    <div className="onboard__step-line">
                        <div className="onboard__step-line-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
                    </div>
                    <StepNode s={1} title="Identity" active={step === 1} completed={step > 1} />
                    <StepNode s={2} title="Account" active={step === 2} completed={step > 2} />
                    <StepNode s={3} title="Security" active={step === 3} completed={step > 3} />
                    <StepNode s={4} title="Setup" active={step === 4} completed={false} />
                </div>

                <div className="onboard__card">
                    <AnimatePresence mode="wait">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                    </AnimatePresence>

                    <footer className="onboard__footer">
                        {step > 1 && step < 4 ? (
                            <button onClick={handleBack} className="onboard__btn-back">
                                <ArrowLeft size={18} /> Back
                            </button>
                        ) : <div />}

                        <button
                            onClick={step === 4 ? handleSubmit : handleNext}
                            className="onboard__btn-next"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    {step === 4 ? "Launch Profile" : "Continue Journey"}
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </footer>
                </div>
            </div>
        </section>
    );
};

export default Onboarding;
