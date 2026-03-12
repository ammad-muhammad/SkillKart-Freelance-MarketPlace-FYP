import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCw, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import "../../../Components/common/Hero/Hero.css";

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

    const sectionRef = useRef(null);
    const tagRef = useRef(null);
    const headingRef = useRef(null);
    const formRef = useRef(null);
    const visualRef = useRef(null);
    const bgRef = useRef(null);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                navigate('/');
                return;
            }
        }
    }, [isAuthenticated, user, authLoading, navigate]);

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 });
        tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.inOut' })
            .fromTo(tagRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.6')
            .fromTo(headingRef.current?.querySelectorAll('.hero__word'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo(formRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
            .fromTo(visualRef.current, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=1.2');

        const orbs = sectionRef.current?.querySelectorAll('.hero__orb');
        const onMouseMove = (e) => {
            const { innerWidth: W, innerHeight: H } = window;
            const xPct = (e.clientX / W - 0.5) * 2;
            const yPct = (e.clientY / H - 0.5) * 2;
            orbs?.forEach((orb, i) => {
                const depth = (i + 1) * 12;
                gsap.to(orb, { x: xPct * depth, y: yPct * depth, duration: 1.2, ease: 'power2.out' });
            });
        };
        window.addEventListener('mousemove', onMouseMove);
        return () => window.removeEventListener('mousemove', onMouseMove);
    }, []);

    const headingWords = ['Account', 'Recovery,', 'Take', 'Back', 'Control.'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError("");
    };

    // ✅ PASSWORD STRENGTH VALIDATION
    const validateForm = () => {
        if (!formData.email) {
            setError("Email is required");
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError("Invalid email format");
            return false;
        }
        if (!formData.newPassword) {
            setError("New password is required");
            return false;
        }
        if (formData.newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return false;
        }
        // ✅ Check for uppercase letter
        if (!/[A-Z]/.test(formData.newPassword)) {
            setError("Password must contain at least one uppercase letter (A-Z)");
            return false;
        }
        // ✅ Check for lowercase letter
        if (!/[a-z]/.test(formData.newPassword)) {
            setError("Password must contain at least one lowercase letter (a-z)");
            return false;
        }
        // ✅ Check for number
        if (!/\d/.test(formData.newPassword)) {
            setError("Password must contain at least one number (0-9)");
            return false;
        }
        if (!formData.confirmPassword) {
            setError("Please confirm your password");
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setError("");

        try {
            console.log("📧 Requesting password reset OTP for:", formData.email);

            // Step 1: Request OTP
            const response = await authAPI.requestPasswordReset(formData.email);
            console.log("✅ OTP sent successfully:", response.data);

            // Step 2: Store form data temporarily in sessionStorage
            sessionStorage.setItem('tempForgotData', JSON.stringify({
                email: formData.email,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword
            }));

            console.log("💾 Temp data saved to sessionStorage");

            // Step 3: Redirect to OTP verification
            navigate('/otp-verification');

        } catch (err) {
            console.error("❌ Request failed:", err);
            setError(err.response?.data?.message || err.message || 'Failed to send reset code');
            setIsLoading(false);
        }
    };

    return (
        <section ref={sectionRef} className="hero">
            <div ref={bgRef} className="hero__bg">
                <div className="hero__orb hero__orb--1" />
                <div className="hero__orb hero__orb--2" />
                <div className="hero__orb hero__orb--3" />
                <div className="hero__grid-overlay" />
            </div>

            <div className="container hero__inner">
                <div className="hero__copy">
                    <div ref={tagRef} className="section-tag hero__tag" style={{ color: '#e3e5e8ff', borderColor: 'rgba(14, 14, 14, 0.35)', background: 'rgba(160, 168, 179, 0.1)' }}>
                        <span>🔑</span> Secure Recovery
                    </div>

                    <h1 ref={headingRef} className="hero__heading">
                        {headingWords.map((w, i) => (
                            <span key={i} className="hero__word">
                                {w}{i === 2 ? ' ' : ' '}
                            </span>
                        ))}
                    </h1>

                    <div ref={formRef} className="hero__auth-container" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '35px',
                        backdropFilter: 'blur(12px)',
                        maxWidth: '460px',
                        width: '100%'
                    }}>
                        {/* Error Alert */}
                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 15px',
                                marginBottom: '20px',
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-start'
                            }}>
                                <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0, fontWeight: '500' }}>
                                    {error}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: '10px' }}>Enter your email and define a new secure password.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        className="white-placeholder"
                                        placeholder="name@example.com"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            padding: '14px 14px 14px 48px',
                                            color: 'white',
                                            fontWeight: '500',
                                            outline: 'none',
                                            opacity: isLoading ? 0.6 : 1,
                                            cursor: isLoading ? 'not-allowed' : 'text'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>
                                    New Password
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '500', marginLeft: '8px' }}>
                                        (Min 8 chars, 1 uppercase, 1 lowercase, 1 number)
                                    </span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="newPassword"
                                        className="white-placeholder"
                                        required
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            padding: '14px 48px 14px 48px',
                                            color: 'white',
                                            outline: 'none',
                                            fontWeight: '500',
                                            opacity: isLoading ? 0.6 : 1,
                                            cursor: isLoading ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: 'white', fontSize: '13px', fontWeight: '800', marginLeft: '4px' }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        className="white-placeholder"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            padding: '14px 48px 14px 48px',
                                            color: 'white',
                                            outline: 'none',
                                            fontWeight: '500',
                                            opacity: isLoading ? 0.6 : 1,
                                            cursor: isLoading ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={isLoading}
                                        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <style>
                                {`
  .white-placeholder::placeholder {
    color: rgba(255, 255, 255, 0.7); 
    opacity: 1;
  }
`}
                            </style>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="hero__btn-main"
                                style={{
                                    width: '100%',
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    padding: '16px',
                                    marginTop: '10px',
                                    opacity: isLoading ? 0.7 : 1,
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center'
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" opacity="0.3" />
                                                <path d="M12 2a10 10 0 0 1 10 10" />
                                            </svg>
                                        </div>
                                        Sending OTP...
                                    </>
                                ) : (
                                    <>
                                        Reset My Password <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <style>
                            {`
                                @keyframes spin {
                                    from { transform: rotate(0deg); }
                                    to { transform: rotate(360deg); }
                                }
                            `}
                        </style>

                        <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <Link to="/login-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '800', textDecoration: 'none' }}>
                                <ArrowLeft size={16} /> Return to Sign In
                            </Link>
                        </div>
                    </div>
                </div>

                <div ref={visualRef} className="hero__visual">
                    <div className="hero__dashboard">
                        <div className="hero__dashboard-header">
                            <div className="hero__dashboard-dots">
                                <span style={{ background: "#ff5f57" }} />
                                <span style={{ background: "#febc2e" }} />
                                <span style={{ background: "#28c840" }} />
                            </div>
                            <span className="hero__dashboard-title">System Recovery</span>
                        </div>
                        <div className="hero__dashboard-body">
                            <div className="hero__db-profile">
                                <div className="hero__db-avatar">🔐</div>
                                <div>
                                    <div className="hero__db-name">Security Protocol</div>
                                    <div className="hero__db-role">Verified Auth Workflow</div>
                                </div>
                            </div>
                            <div className="hero__db-ai">
                                <div className="hero__db-ai-icon">🛡️</div>
                                <div>
                                    <div className="hero__db-ai-title">Buddy AI Guard</div>
                                    <div className="hero__db-ai-text">
                                        I'm monitoring your account for unusual activity. Your password reset was initiated from a recognized device.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hero__stat-card hero__stat-card--1">
                        <span className="hero__stat-icon">✅</span>
                        <div>
                            <div className="hero__stat-val">Verified</div>
                            <div className="hero__stat-lbl">Secure Login</div>
                        </div>
                    </div>
                    <div className="hero__stat-card hero__stat-card--2">
                        <span className="hero__stat-icon">🔏</span>
                        <div>
                            <div className="hero__stat-val">2FA</div>
                            <div className="hero__stat-lbl">Active Layer</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hero__wave">
                <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                </svg>
            </div>
        </section>
    );
};

export default ForgotPassword;