import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Briefcase, Code, ArrowLeft, AlertCircle, CheckCircle, Loader, UserPlus, Zap } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import AuthBackground from "../AuthBackground";
import "../Auth.css";

const Registration = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [step, setStep] = useState(1); // 1: Role, 2: Details
    const [role, setRole] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                navigate('/');
                return;
            }
        }
    }, [isAuthenticated, user, authLoading, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError("");
    };

    const validateForm = () => {
        if (!formData.firstName) { setError("First name is required"); return false; }
        if (formData.firstName.trim().length < 2 || formData.firstName.trim().length > 50) { setError("First name must be 2–50 characters"); return false; }
        if (!formData.lastName) { setError("Last name is required"); return false; }
        if (formData.lastName.trim().length < 2 || formData.lastName.trim().length > 50) { setError("Last name must be 2–50 characters"); return false; }
        if (!formData.email) { setError("Email is required"); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError("Please enter a valid email"); return false; }
        if (!formData.password) { setError("Password is required"); return false; }
        if (formData.password.length < 8) { setError("Password must be at least 8 characters"); return false; }
        if (!/[A-Z]/.test(formData.password)) { setError("Password must contain at least one uppercase letter (A-Z)"); return false; }
        if (!/[a-z]/.test(formData.password)) { setError("Password must contain at least one lowercase letter (a-z)"); return false; }
        if (!/\d/.test(formData.password)) { setError("Password must contain at least one number (0-9)"); return false; }
        if (!formData.confirmPassword) { setError("Please confirm your password"); return false; }
        if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return false; }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await authAPI.register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: role
            });

            setSuccess("Registration successful! OTP sent to your email. Redirecting...");
            sessionStorage.setItem('OTPEmail', formData.email);
            sessionStorage.setItem('registrationType', "registration");
            sessionStorage.setItem('userRole', role);

            setTimeout(() => {
                navigate('/otp-verification');
            }, 2000);

        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'An error occurred. Please try again.';
            setError(errorMessage);
            setLoading(false);
        }
    };

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setError("");
    };

    const handleBackToRole = () => {
        setStep(1);
        setError("");
        setSuccess("");
    };

    return (
        <div className="auth-page">
            <Link to="/" className="back-home-btn">
                <ArrowLeft size={18} />
                <span>Back to Home</span>
            </Link>

            <AuthBackground />

            <main className="auth-content">
                <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="auth-branding"
                >
                    <div className="auth-tag">
                        <span>🚀</span> Join SkillKart Today
                    </div>
                    <h1 className="auth-title">
                        {step === 1 ? (
                            <>Start Your <br /><span style={{ color: 'var(--auth-accent)' }}>Journey.</span></>
                        ) : (
                            <>Tell Us <br /><span style={{ color: 'var(--auth-accent)' }}>More.</span></>
                        )}
                    </h1>
                    <p className="auth-description">
                        Connect with the best talent and projects across the globe on our modern freelance platform.
                    </p>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Zap size={20} color="var(--auth-accent)" />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Fast</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Instant Onboarding</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <UserPlus size={20} color="var(--auth-accent)" />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Elite</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Vetted Community</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="auth-card-container"
                >
                    <div className="auth-card">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="auth-alert auth-alert--error"
                                >
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                            {success && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="auth-alert auth-alert--success"
                                >
                                    <CheckCircle size={18} />
                                    <span>{success}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: '1.5rem', fontSize: '0.95rem' }}>How would you like to join?</p>
                                    <div className="auth-role-grid">
                                        <div 
                                            className={`auth-role-card ${role === "client" ? "active" : ""}`}
                                            onClick={() => handleRoleSelect("client")}
                                        >
                                            <Briefcase size={28} className="auth-role-icon" />
                                            <div className="auth-role-title">Client</div>
                                            <div className="auth-role-desc">Hire Elite Talent</div>
                                        </div>
                                        <div 
                                            className={`auth-role-card ${role === "freelancer" ? "active" : ""}`}
                                            onClick={() => handleRoleSelect("freelancer")}
                                        >
                                            <Code size={28} className="auth-role-icon" />
                                            <div className="auth-role-title">Freelancer</div>
                                            <div className="auth-role-desc">Offer Your Skills</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => role && setStep(2)}
                                        disabled={!role}
                                        className="auth-submit-btn"
                                        style={{ width: '100%' }}
                                    >
                                        Continue <ArrowRight size={18} />
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <form onSubmit={handleSubmit} className="auth-form">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="auth-input-group">
                                                <label className="auth-label">First Name</label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    required
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    placeholder="John"
                                                    className="auth-input"
                                                    style={{ paddingLeft: '1rem' }}
                                                />
                                            </div>
                                            <div className="auth-input-group">
                                                <label className="auth-label">Last Name</label>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    required
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    placeholder="Doe"
                                                    className="auth-input"
                                                    style={{ paddingLeft: '1rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="auth-input-group">
                                            <label className="auth-label">Email Address</label>
                                            <div className="auth-input-wrapper">
                                                <Mail size={18} className="auth-input-icon" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="john@example.com"
                                                    className="auth-input"
                                                />
                                            </div>
                                        </div>

                                        <div className="auth-input-group">
                                            <label className="auth-label">Password</label>
                                            <div className="auth-input-wrapper">
                                                <Lock size={18} className="auth-input-icon" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    required
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    className="auth-input"
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-password-toggle">
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="auth-input-group">
                                            <label className="auth-label">Confirm Password</label>
                                            <div className="auth-input-wrapper">
                                                <Lock size={18} className="auth-input-icon" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    required
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    className="auth-input"
                                                />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-password-toggle">
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={loading} className="auth-submit-btn">
                                            {loading ? <Loader size={18} className="animate-spin" /> : "Create Account"}
                                            {!loading && <ArrowRight size={18} />}
                                        </button>
                                    </form>
                                    <button
                                        onClick={handleBackToRole}
                                        disabled={loading}
                                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '700', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <ArrowLeft size={14} /> Back to Role Selection
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="auth-footer">
                            Already a member? <Link to="/login" className="auth-link">Sign In</Link>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Registration;