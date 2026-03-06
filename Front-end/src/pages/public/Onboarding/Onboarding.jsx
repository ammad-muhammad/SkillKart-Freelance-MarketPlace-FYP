import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Upload, Globe, Building2, Briefcase,
    ChevronRight, ChevronLeft, CheckCircle2, Lock, Edit2, Terminal, ShieldCheck, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import '../ClientOnboarding/ClientOnboarding.css'; // Importing the new beautiful design variables!

// Reusing the robust layout of ClientOnboarding but adapting for the general onboarding steps

const Onboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [role, setRole] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // OTP State
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(30);
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef()];

    const [formData, setFormData] = useState({
        // Account Setup
        firstName: '', lastName: '', username: '', email: '', 
        password: '', confirmPassword: '', termsAccepted: false,

        // Profile/Company Setup
        profilePic: null, profilePicUrl: '', proTitle: '', bio: '', 
        skills: [], industry: '', companyName: '', companySize: '', budgetRange: '', companyWebsite: ''
    });

    const [errors, setErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState('weak');

    useEffect(() => {
        const pwd = formData.password;
        if (!pwd) setPasswordStrength('weak');
        else if (pwd.length < 6) setPasswordStrength('weak');
        else if (pwd.length < 10) setPasswordStrength('medium');
        else if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) setPasswordStrength('strong');
        else setPasswordStrength('medium');
    }, [formData.password]);

    useEffect(() => {
        let timer;
        if (step === 3 && resendTimer > 0) {
            timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [step, resendTimer]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        if (value && index < 4) otpRefs[index + 1].current.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs[index - 1].current.focus();
        }
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
        if (step === 1 && !role) { toast.warn("Please choose your role to start!"); return false; }
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
            if (otp.join('').length < 5) { toast.warn("Please enter the full 5-digit OTP"); return false; }
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

    const nextStep = () => {
        if (validateStep()) {
            if (step === 3) {
                setIsLoading(true);
                setTimeout(() => { setIsLoading(false); setStep(4); }, 1500);
            } else {
                setStep(s => Math.min(s + 1, 5));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateStep()) return;
        setIsLoading(true);
        setTimeout(() => {
            toast.success("Success! Welcome to SkillKart.");
            setIsLoading(false);
            setStep(5); // Success step
        }, 2000);
    };

    // ------------- Renders -------------

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="onboarding__form-group">
                <label className="onboarding__label">Select your platform role:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div
                        className={`onboarding__choice-card ${role === 'Client' ? 'onboarding__choice-card--active' : ''}`}
                        onClick={() => setRole('Client')}
                        style={{ padding: '32px 24px', textAlign: 'center', cursor: 'pointer' }}
                    >
                        <Briefcase className="onboarding__choice-icon" style={{ margin: '0 auto 16px', color: 'var(--onboard-accent-primary)' }} size={36} />
                        <h3 className="onboarding__choice-label" style={{ fontSize: '18px', marginBottom: '8px' }}>I'm a Client</h3>
                        <p style={{ fontSize: '13px', color: 'var(--onboard-text-secondary)', lineHeight: 1.5 }}>Hire world-class talent and grow your business dreams.</p>
                    </div>

                    <div
                        className={`onboarding__choice-card ${role === 'Freelancer' ? 'onboarding__choice-card--active' : ''}`}
                        onClick={() => setRole('Freelancer')}
                        style={{ padding: '32px 24px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
                    >
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--onboard-accent-primary)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(26,111,168,0.3)' }}>Top Pick</div>
                        <Terminal className="onboarding__choice-icon" style={{ margin: '0 auto 16px', color: 'var(--onboard-accent-primary)' }} size={36} />
                        <h3 className="onboarding__choice-label" style={{ fontSize: '18px', marginBottom: '8px' }}>I'm a Freelancer</h3>
                        <p style={{ fontSize: '13px', color: 'var(--onboard-text-secondary)', lineHeight: 1.5 }}>Find global projects and fast-track your professional career.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="onboarding__form-row">
                <div className="onboarding__form-group">
                    <label className="onboarding__label">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="onboarding__input" placeholder="e.g. John" />
                    {errors.firstName && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.firstName}</span>}
                </div>
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="onboarding__input" placeholder="e.g. Doe" />
                    {errors.lastName && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.lastName}</span>}
                </div>
            </div>

            <div className="onboarding__form-row">
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Unique Username</label>
                    <input type="text" name="username" value={formData.username} onChange={handleChange} className="onboarding__input" placeholder="johndoe_pro" />
                </div>
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="onboarding__input" placeholder="john@company.com" />
                    {errors.email && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.email}</span>}
                </div>
            </div>

            <div className="onboarding__form-row">
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Create Password</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} className="onboarding__input" placeholder="••••••••" />
                    {errors.password && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.password}</span>}
                </div>
                <div className="onboarding__form-group">
                    <label className="onboarding__label">Confirm Password</label>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="onboarding__input" placeholder="••••••••" />
                    {errors.confirmPassword && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.confirmPassword}</span>}
                </div>
            </div>

            <div className="onboarding__form-group" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: 'var(--onboard-accent-primary)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--onboard-text-secondary)' }}>I agree to the <a onClick={() => window.open('/terms', '_blank')} style={{ color: 'var(--onboard-accent-primary)', textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</a></span>
                </div>
                {errors.termsAccepted && <span style={{ color: 'red', fontSize: '12px', display: 'block', marginTop: '8px' }}>{errors.termsAccepted}</span>}
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="onboarding__step" style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(26,111,168,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Mail size={32} color="var(--onboard-accent-primary)" />
            </div>
            <h1 className="onboarding__title" style={{ fontSize: '24px', marginBottom: '8px' }}>Verify Your Email</h1>
            <p className="onboarding__subtitle" style={{ fontSize: '15px' }}>
                We've sent a 5-digit code to <br /><b style={{ color: 'var(--onboard-text-primary)' }}>{formData.email}</b> 
                <button type="button" onClick={prevStep} style={{ background: 'none', border: 'none', color: 'var(--onboard-accent-primary)', cursor: 'pointer', marginLeft: '6px' }}><Edit2 size={14} /></button>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '32px 0' }}>
                {otp.map((digit, idx) => (
                    <input
                        key={idx} ref={otpRefs[idx]} type="text" maxLength="1" value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="onboarding__input"
                        style={{ width: '56px', height: '64px', fontSize: '24px', textAlign: 'center', padding: 0 }}
                    />
                ))}
            </div>

            <p style={{ fontSize: '14px', color: 'var(--onboard-text-secondary)' }}>
                Did not receive the code? {resendTimer > 0 ? (
                    <span>Wait {resendTimer}s</span>
                ) : (
                    <button type="button" onClick={() => setResendTimer(30)} style={{ background: 'none', border: 'none', color: 'var(--onboard-accent-primary)', fontWeight: '600', cursor: 'pointer' }}>Resend Now</button>
                )}
            </p>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {role === 'Freelancer' ? (
                <>
                    <div className="onboarding__profile-pic" style={{ marginBottom: '32px' }}>
                        <div className="onboarding__avatar-container">
                            <div className="onboarding__avatar">
                                {formData.profilePicUrl ? <img src={formData.profilePicUrl} className="onboarding__avatar-img" /> : <User size={40} color="var(--onboard-accent-primary)" />}
                                <label className="onboarding__avatar-overlay">
                                    <Upload size={28} />
                                    <span>Upload</span>
                                    <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>
                        <span className="onboarding__label">Profile Photo</span>
                    </div>

                    <div className="onboarding__form-group">
                        <label className="onboarding__label">Professional Title</label>
                        <input type="text" name="proTitle" value={formData.proTitle} onChange={handleChange} className="onboarding__input" placeholder="e.g. Lead UI/UX Designer" />
                        {errors.proTitle && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.proTitle}</span>}
                    </div>

                    <div className="onboarding__form-group">
                        <label className="onboarding__label">Short Bio</label>
                        <textarea name="bio" value={formData.bio} onChange={handleChange} className="onboarding__input" placeholder="Say something high-impact about yourself..." style={{ height: '100px', resize: 'none' }} />
                        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--onboard-text-secondary)', marginTop: '4px' }}>{formData.bio.length}/300</div>
                    </div>

                    <div className="onboarding__form-group">
                        <label className="onboarding__label">Key Skills</label>
                        <div className="onboarding__tags">
                            {['React', 'NodeJS', 'Python', 'AWS', 'TensorFlow', 'UI/UX', 'Figma', 'DevOps'].map(skill => (
                                <div key={skill} className={`onboarding__tag ${formData.skills.includes(skill) ? 'onboarding__tag--active' : ''}`} onClick={() => toggleSkill(skill)}>
                                    {skill} {formData.skills.includes(skill) && <X size={14} style={{ marginLeft: '4px' }} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="onboarding__form-group">
                        <label className="onboarding__label">Company Name</label>
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="onboarding__input" placeholder="Acme Inc." />
                        {errors.companyName && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.companyName}</span>}
                    </div>

                    <div className="onboarding__form-row">
                        <div className="onboarding__form-group">
                            <label className="onboarding__label">Strategic Industry</label>
                            <select name="industry" value={formData.industry} onChange={handleChange} className="onboarding__input">
                                <option value="">Choose Industry</option>
                                <option value="Tech">Technology</option>
                                <option value="Fintech">Finance & Crypto</option>
                                <option value="Healthcare">Health Tech</option>
                            </select>
                        </div>
                        <div className="onboarding__form-group">
                            <label className="onboarding__label">Company Size</label>
                            <select name="companySize" value={formData.companySize} onChange={handleChange} className="onboarding__input">
                                <option value="">Select Size</option>
                                <option value="1-10">1-10 Employees</option>
                                <option value="11-50">11-50 Employees</option>
                                <option value="51+">50+ Employees</option>
                            </select>
                        </div>
                    </div>

                    <div className="onboarding__form-group">
                        <label className="onboarding__label">Corporate Website / URL</label>
                        <input type="text" name="companyWebsite" value={formData.companyWebsite} onChange={handleChange} className="onboarding__input" placeholder="https://acme.inc" />
                    </div>
                </>
            )}
        </motion.div>
    );

    const renderSuccess = () => (
        <motion.div className="onboarding__success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>🚀</div>
            <h1 className="onboarding__title" style={{ fontSize: '32px' }}>Welcome Aboard!</h1>
            <p className="onboarding__subtitle" style={{ fontSize: '16px', maxWidth: '400px', margin: '0 auto 32px' }}>
                Your account is ready. Step into a borderless ecosystem of talent and opportunities.
            </p>
            <button className="onboarding__btn-next" style={{ margin: '0 auto' }} onClick={() => navigate('/')}>
                Go to Dashboard <ChevronRight size={18} />
            </button>
        </motion.div>
    );

    return (
        <section className="onboarding">
            <div className="onboarding__bg" />
            <div className="onboarding__container" style={{ maxWidth: '800px' }}>
                <div className="onboarding__card">
                    {step <= 4 && (
                        <>
                            <div className="onboarding__stepper-wrapper">
                                <div className="onboarding__stepper" style={{ maxWidth: '500px' }}>
                                    <div className="onboarding__stepper-line-bg" />
                                    <div className="onboarding__stepper-line-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
                                    {[1, 2, 3, 4].map((s) => (
                                        <div key={s} className={`onboarding__step-node ${step === s ? 'onboarding__step-node--active' : step > s ? 'onboarding__step-node--completed' : ''}`}>
                                            {step > s ? <CheckCircle2 size={18} /> : s}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="onboarding__header" style={{ textAlign: 'center' }}>
                                <h1 className="onboarding__title">
                                    {step === 1 && "Start Your Journey"}
                                    {step === 2 && "Account Details"}
                                    {step === 3 && "Secure Verification"}
                                    {step === 4 && (role === "Client" ? "Your Company" : "Your Profile")}
                                </h1>
                                <p className="onboarding__subtitle">
                                    {step === 1 && "Choose how you want to use the platform."}
                                    {step === 2 && "Let's set up your personal SkillKart identity."}
                                    {step === 3 && "We need to verify your email before entering."}
                                    {step === 4 && "Final setup to optimize your SkillKart experience."}
                                </p>
                            </div>
                        </>
                    )}

                    <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column' }}>
                        <AnimatePresence mode="wait">
                            <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                                {step === 1 && renderStep1()}
                                {step === 2 && renderStep2()}
                                {step === 3 && renderStep3()}
                                {step === 4 && renderStep4()}
                                {step === 5 && renderSuccess()}
                            </motion.div>
                        </AnimatePresence>

                        {step <= 4 && (
                            <div className="onboarding__nav" style={{ marginTop: '32px' }}>
                                {step > 1 ? (
                                    <button type="button" onClick={prevStep} className="onboarding__btn-back">
                                        <ChevronLeft size={20} /> Back
                                    </button>
                                ) : <div />}

                                <button type="button" onClick={step === 4 ? handleSubmit : nextStep} className="onboarding__btn-next" disabled={isLoading}>
                                    {isLoading ? <div className="onboarding__loader" /> : (
                                        <>
                                            {step === 4 ? "Launch Dashboard" : "Continue"} {step !== 4 && <ChevronRight size={20} />}
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

export default Onboarding;
