import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Briefcase, Code,
    ArrowLeft, AlertCircle, CheckCircle, UserPlus, Zap,
} from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import AuthBackground from "../AuthBackground";
import Loader from "../../../Components/common/Loader/Loader";
import { isMobileApp } from "../../../utils/platform";
import { openExternal } from "../../../utils/externalLink";
import { notify } from "../../../utils/notify";
import "../Auth.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

    // A guest who set a pending post-login redirect (e.g. tapped "Apply Now")
    // but then registered a brand-new account instead of logging in bypasses
    // Login.jsx entirely — clear it here so a LATER, unrelated login in this
    // browser doesn't get silently redirected to that stale destination.
    useEffect(() => {
        try { sessionStorage.removeItem('postLoginRedirect'); } catch { /* non-fatal */ }
    }, []);

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
            notify.error(errorMessage, { duration: 6000 });
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

    // Same Supabase OAuth handshake as Login.jsx's handleSocialLogin — Google
    // sign-in doubles as sign-up (the backend finds-or-creates the account),
    // so this is identical logic, not a separate signup-specific flow. A
    // brand-new user lands on /role to pick client/freelancer afterward (see
    // AuthConsent.jsx's `userRole === "publicviewer"` branch) since Supabase
    // has no concept of the role picked on this page's Step 1.
    const handleSocialLogin = async (provider) => {
        if (!supabaseUrl || !supabaseKey) {
            setError('Social sign-up is not available right now.');
            return;
        }
        const supabase = createClient(supabaseUrl, supabaseKey);
        const mobile = isMobileApp();
        try {
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: mobile ? 'skillkart://auth-callback' : `${window.location.origin}/auth/consent`,
                    skipBrowserRedirect: mobile,
                }
            });

            if (mobile) {
                if (oauthError || !data?.url) {
                    setError('Could not start Google sign-up. Please try again.');
                    return;
                }
                await openExternal(data.url);
            }
        } catch (err) {
            setError(err?.message || 'Social sign-up failed. Please try again.');
        }
    };

    /* ─── Left column content changes per step ─── */
    const leftContent = {
        tag: "🚀 Join SkillKart Today",
        title: step === 1
            ? (<>Start Your <br /><span className="auth-title-accent">Journey.</span></>)
            : (<>Tell Us <br /><span className="auth-title-accent">More.</span></>),
        desc: "Connect with the best talent and projects across the globe on our modern freelance platform.",
    };

    return (
        <div className="auth-page">
            {!isMobileApp() && (
                <Link to="/" className="back-home-btn">
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                </Link>
            )}

            <AuthBackground />

            <main className="auth-content">
                {/* ── LEFT: BRANDING ── */}
                <div className="auth-branding">
                    <div className="auth-tag auth-anim-tag">
                        <span>🚀</span> Join SkillKart Today
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={`title-${step}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="auth-title"
                        >
                            {leftContent.title}
                        </motion.h1>
                    </AnimatePresence>

                    <p className="auth-description auth-anim-para">
                        {leftContent.desc}
                    </p>

                    <div className="auth-feature-badges auth-anim-badges">
                        <div className="auth-badge-card">
                            <div className="auth-badge-icon" aria-hidden="true">
                                <Zap size={18} />
                            </div>
                            <div>
                                <div className="auth-badge-title">Fast</div>
                                <div className="auth-badge-sub">Instant Onboarding</div>
                            </div>
                        </div>
                        <div className="auth-badge-card">
                            <div className="auth-badge-icon" aria-hidden="true">
                                <UserPlus size={18} />
                            </div>
                            <div>
                                <div className="auth-badge-title">Elite</div>
                                <div className="auth-badge-sub">Vetted Community</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: CARD ── */}
                <div className="auth-card-container">
                    <div className="auth-card auth-anim-card">

                        {/* Step indicator */}
                        <div className="auth-step-indicator" aria-label={`Step ${step} of 2`}>
                            <div className={`auth-step-dot${step >= 1 ? ' auth-step-dot--active' : ''}`} />
                            <div className={`auth-step-dot${step >= 2 ? ' auth-step-dot--active' : ''}`} />
                        </div>

                        {/* Alerts */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key="err"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="auth-alert auth-alert--error"
                                    role="alert"
                                    aria-live="polite"
                                >
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    key="ok"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="auth-alert auth-alert--success"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <CheckCircle size={16} style={{ flexShrink: 0 }} />
                                    <span>{success}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Steps */}
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="auth-card-heading">Choose your role</div>
                                    <p className="auth-role-prompt">How would you like to join?</p>

                                    <div className="auth-role-grid">
                                        {/* Client */}
                                        <div
                                            className={`auth-role-card${role === "client" ? " active" : ""}`}
                                            onClick={() => handleRoleSelect("client")}
                                            role="button"
                                            tabIndex={0}
                                            aria-pressed={role === "client"}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRoleSelect("client"); } }}
                                        >
                                            <div className="auth-role-check" aria-hidden="true">✓</div>
                                            <div className="auth-role-icon"><Briefcase size={24} /></div>
                                            <div className="auth-role-title">Client</div>
                                            <div className="auth-role-desc">Hire Elite Talent</div>
                                        </div>
                                        {/* Freelancer */}
                                        <div
                                            className={`auth-role-card${role === "freelancer" ? " active" : ""}`}
                                            onClick={() => handleRoleSelect("freelancer")}
                                            role="button"
                                            tabIndex={0}
                                            aria-pressed={role === "freelancer"}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRoleSelect("freelancer"); } }}
                                        >
                                            <div className="auth-role-check" aria-hidden="true">✓</div>
                                            <div className="auth-role-icon"><Code size={24} /></div>
                                            <div className="auth-role-title">Freelancer</div>
                                            <div className="auth-role-desc">Offer Your Skills</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => role && setStep(2)}
                                        disabled={!role}
                                        className="auth-submit-btn"
                                    >
                                        Continue
                                        <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
                                    </button>

                                    <div className="auth-divider">Or Sign Up With</div>
                                    <div className="auth-social-group">
                                        <button onClick={() => handleSocialLogin('Google')} className="auth-social-btn" aria-label="Sign up with Google">
                                            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleSocialLogin('linkedin')} className="auth-social-btn" aria-label="Sign up with LinkedIn">
                                            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                                                <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.733 0-9.637h3.554v1.364c.429-.658 1.196-1.593 2.905-1.593 2.12 0 3.71 1.385 3.71 4.363v5.503zM5.337 8.855c-1.144 0-1.915-.759-1.915-1.71 0-.956.77-1.71 1.957-1.71 1.188 0 1.915.754 1.933 1.71 0 .951-.745 1.71-1.975 1.71zm1.946 11.597H3.392v-9.637h3.891v9.637zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleSocialLogin('github')} className="auth-social-btn" aria-label="Sign up with GitHub">
                                            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                                                <path fill="#24292F" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.775.418-1.305.762-1.605-2.665-.3-5.466-1.335-5.466-5.93 0-1.31.467-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.51 11.51 0 0 1 3-.405c1.02.004 2.045.138 3 .405 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.873.118 3.176.77.84 1.232 1.91 1.232 3.22 0 4.61-2.807 5.625-5.48 5.922.43.372.823 1.103.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                            </svg>
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="auth-card-heading">Create your account</div>
                                    <div className="auth-card-sub">Fill in your details to get started</div>

                                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                                        {/* First / Last Name */}
                                        <div className="auth-name-grid">
                                            <div className="auth-input-group">
                                                <label className="auth-label" htmlFor="reg-first-name">First Name</label>
                                                <input
                                                    id="reg-first-name"
                                                    type="text"
                                                    name="firstName"
                                                    autoComplete="given-name"
                                                    required
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    placeholder="John"
                                                    className="auth-input auth-input--bare"
                                                />
                                            </div>
                                            <div className="auth-input-group">
                                                <label className="auth-label" htmlFor="reg-last-name">Last Name</label>
                                                <input
                                                    id="reg-last-name"
                                                    type="text"
                                                    name="lastName"
                                                    autoComplete="family-name"
                                                    required
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    placeholder="Doe"
                                                    className="auth-input auth-input--bare"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="auth-input-group">
                                            <label className="auth-label" htmlFor="reg-email">Email Address</label>
                                            <div className="auth-input-wrapper">
                                                <Mail size={16} className="auth-input-icon" aria-hidden="true" />
                                                <input
                                                    id="reg-email"
                                                    type="email"
                                                    name="email"
                                                    autoComplete="username"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="john@example.com"
                                                    className="auth-input"
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="auth-input-group">
                                            <label className="auth-label" htmlFor="reg-password">Password</label>
                                            <div className="auth-input-wrapper">
                                                <Lock size={16} className="auth-input-icon" aria-hidden="true" />
                                                <input
                                                    id="reg-password"
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    autoComplete="new-password"
                                                    required
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    className="auth-input"
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"}>
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="auth-input-group">
                                            <label className="auth-label" htmlFor="reg-confirm-password">Confirm Password</label>
                                            <div className="auth-input-wrapper">
                                                <Lock size={16} className="auth-input-icon" aria-hidden="true" />
                                                <input
                                                    id="reg-confirm-password"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    autoComplete="new-password"
                                                    required
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    className="auth-input"
                                                />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-password-toggle" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Submit */}
                                        <button type="submit" disabled={loading} className="auth-submit-btn">
                                            {loading ? (
                                                <>
                                                    <Loader size="sm" text="" />
                                                    Creating account...
                                                </>
                                            ) : (
                                                <>
                                                    Create Account
                                                    <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    <button
                                        onClick={handleBackToRole}
                                        disabled={loading}
                                        className="auth-back-link"
                                    >
                                        <ArrowLeft size={14} aria-hidden="true" /> Back to Role Selection
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="auth-footer">
                            Already a member?{" "}
                            <Link to="/login" className="auth-link">Sign In</Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Registration;