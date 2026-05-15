import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle, Shield, Bot } from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import AuthBackground from "../AuthBackground";
import "../Auth.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const Login = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, loading: authLoading, handleLoginResponse } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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
        if (!formData.email) {
            setError("Email is required");
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError("Please enter a valid email");
            return false;
        }
        if (!formData.password) {
            setError("Password is required");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await authAPI.login(formData.email, formData.password);
            const { requires2FA, email } = await handleLoginResponse(response.data);

            if (requires2FA) {
                setSuccess("OTP sent to your email! Redirecting...");
                sessionStorage.setItem('OTPEmail', email);
                sessionStorage.setItem('registrationType', 'login');
                setTimeout(() => navigate('/otp-verification'), 1500);
            } else {
                setSuccess("Login successful! Redirecting...");
                
                // Role-based redirect logic (same as OTP.jsx)
                const userRole = response.data.data.user.role;
                const isOnboardingCompleted = response.data.data.user.isOnBoardingCompleted;

                setTimeout(() => {
                    if (userRole === 'client') {
                        isOnboardingCompleted ? navigate('/client/dashboard') : navigate('/client/onboarding');
                    } else if (userRole === 'freelancer') {
                        isOnboardingCompleted ? navigate('/freelancer/dashboard') : navigate('/freelancer/onboarding');
                    } else {
                        navigate('/');
                    }
                }, 1500);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
            setError(errorMessage);
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        if (!supabaseUrl || !supabaseKey) {
            alert('Supabase not configured');
            return;
        }
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/auth/consent`
            }
        });
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
                        <span>🔑</span> Welcome Back to SkillKart
                    </div>
                    <h1 className="auth-title">
                        Access Your <br />
                        <span style={{ color: 'var(--auth-accent)' }}>Profile.</span>
                    </h1>
                    <p className="auth-description">
                        Log in to manage your projects, connect with talent, and take your business to the next level.
                    </p>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Shield size={20} color="var(--auth-accent)" />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Secure</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>256-bit AES</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Bot size={20} color="var(--auth-accent)" />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>AI Check</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Active Monitoring</div>
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
                                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
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
                                    <CheckCircle size={18} style={{ flexShrink: 0 }} />
                                    <span>{success}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="auth-form">
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
                                        disabled={isLoading}
                                        placeholder="name@example.com"
                                        className="auth-input"
                                    />
                                </div>
                            </div>

                            <div className="auth-input-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <label className="auth-label">Password</label>
                                    <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--auth-accent)', fontWeight: 600 }}>Forgot Password?</Link>
                                </div>
                                <div className="auth-input-wrapper">
                                    <Lock size={18} className="auth-input-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        className="auth-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="auth-password-toggle"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="auth-submit-btn"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" opacity="0.3" />
                                                <path d="M12 2a10 10 0 0 1 10 10" />
                                            </svg>
                                        </div>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Login Now <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="auth-divider">Social Login</div>

                        <div className="auth-social-group">
                            <button onClick={() => handleSocialLogin('Google')} className="auth-social-btn">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </button>
                            <button onClick={() => handleSocialLogin('linkedin')} className="auth-social-btn" style={{ background: '#0A66C2' }}>
                                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.733 0-9.637h3.554v1.364c.429-.658 1.196-1.593 2.905-1.593 2.12 0 3.71 1.385 3.71 4.363v5.503zM5.337 8.855c-1.144 0-1.915-.759-1.915-1.71 0-.956.77-1.71 1.957-1.71 1.188 0 1.915.754 1.933 1.71 0 .951-.745 1.71-1.975 1.71zm1.946 11.597H3.392v-9.637h3.891v9.637zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                                </svg>
                            </button>
                            <button onClick={() => handleSocialLogin('github')} className="auth-social-btn" style={{ background: '#24292F' }}>
                                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.775.418-1.305.762-1.605-2.665-.3-5.466-1.335-5.466-5.93 0-1.31.467-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.51 11.51 0 0 1 3-.405c1.02.004 2.045.138 3 .405 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.873.118 3.176.77.84 1.232 1.91 1.232 3.22 0 4.61-2.807 5.625-5.48 5.922.43.372.823 1.103.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                </svg>
                            </button>
                        </div>

                        <div className="auth-footer">
                            Don't have an account? <Link to="/registration" className="auth-link">Sign Up</Link>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Login;