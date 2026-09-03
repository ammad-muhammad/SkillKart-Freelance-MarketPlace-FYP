import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import AuthBackground from "../AuthBackground";
import "../Auth.css";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

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
        if (!formData.email) { setError("Email is required"); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError("Invalid email format"); return false; }
        if (!formData.newPassword) { setError("New password is required"); return false; }
        if (formData.newPassword.length < 8) { setError("Password must be at least 8 characters"); return false; }
        if (!/[A-Z]/.test(formData.newPassword)) { setError("Password must contain at least one uppercase letter (A-Z)"); return false; }
        if (!/[a-z]/.test(formData.newPassword)) { setError("Password must contain at least one lowercase letter (a-z)"); return false; }
        if (!/\d/.test(formData.newPassword)) { setError("Password must contain at least one number (0-9)"); return false; }
        if (!formData.confirmPassword) { setError("Please confirm your password"); return false; }
        if (formData.newPassword !== formData.confirmPassword) { setError("Passwords do not match"); return false; }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setError("");

        try {
            await authAPI.requestPasswordReset(formData.email);
            sessionStorage.setItem('tempForgotData', JSON.stringify({
                email: formData.email,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword
            }));
            navigate('/otp-verification');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to send reset code');
            setIsLoading(false);
        }
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
                        <span>🔑</span> Secure Recovery
                    </div>
                    <h1 className="auth-title">
                        Reset Your <br />
                        <span style={{ color: 'var(--auth-accent)' }}>Access.</span>
                    </h1>
                    <p className="auth-description">
                        Don't worry, it happens to the best of us. Just enter your email and we'll help you get back into your account.
                    </p>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <ShieldCheck size={20} color="var(--auth-accent)" />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Privacy</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Data Encrypted</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <RefreshCw size={20} color="var(--auth-accent)" />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Simple</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Quick Recovery</div>
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
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="forgot-email">Email Address</label>
                                <div className="auth-input-wrapper">
                                    <Mail size={18} className="auth-input-icon" />
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        placeholder="name@example.com"
                                        className="auth-input"
                                    />
                                </div>
                            </div>

                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="forgot-new-password">New Password</label>
                                <div className="auth-input-wrapper">
                                    <Lock size={18} className="auth-input-icon" />
                                    <input
                                        id="forgot-new-password"
                                        type={showPassword ? "text" : "password"}
                                        name="newPassword"
                                        required
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        className="auth-input"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-password-toggle">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="forgot-confirm-password">Confirm Password</label>
                                <div className="auth-input-wrapper">
                                    <Lock size={18} className="auth-input-icon" />
                                    <input
                                        id="forgot-confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        className="auth-input"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-password-toggle">
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={isLoading} className="auth-submit-btn">
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin" style={{ width: 18, height: 18 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" opacity="0.3" />
                                                <path d="M12 2a10 10 0 0 1 10 10" />
                                            </svg>
                                        </div>
                                        Sending Reset Code...
                                    </>
                                ) : (
                                    <>Reset My Password <ArrowRight size={18} /></>
                                )}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <Link to="/login" className="auth-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                                <ArrowLeft size={16} /> Return to Sign In
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default ForgotPassword;