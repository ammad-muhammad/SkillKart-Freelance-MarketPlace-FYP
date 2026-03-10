import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ShieldCheck, ArrowRight, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import "../../../Components/common/Hero/Hero.css";

const OTP = () => {
    const { verifyOtp } = useAuth();
    const navigate = useNavigate();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const inputRefs = useRef([]);

    const sectionRef = useRef(null);
    const tagRef = useRef(null);
    const headingRef = useRef(null);
    const formRef = useRef(null);
    const visualRef = useRef(null);
    const bgRef = useRef(null);

    // Get email from sessionStorage
    const userEmail = sessionStorage.getItem('OTPEmail') || 'user@example.com';
    const registrationType = sessionStorage.getItem('registrationType') || 'login'; // 'registration' or 'login'

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

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

    useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const headingWords = ['Secure', 'Verification,', 'Protecting', 'Your', 'Account.'];

    const otpComplete = otp.join('');
    const isOtpValid = otpComplete.length === 6;

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        setError(""); // Clear error on input change

        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1].focus();
        } else if (e.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").slice(0, 6);
        const newOtp = [...otp];

        for (let i = 0; i < pastedData.length; i++) {
            if (!isNaN(pastedData[i])) {
                newOtp[i] = pastedData[i];
            }
        }

        setOtp(newOtp);
        if (pastedData.length > 0) {
            const focusIndex = Math.min(pastedData.length - 1, 5);
            inputRefs.current[focusIndex].focus();
        }
    };

    const handleVerify = async () => {
        if (!isOtpValid) {
            setError("Please enter the complete 6-digit code");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            console.log("Verifying OTP:", otpComplete, "for email:", userEmail);
            console.log("API Call: authAPI.verifyOTP");

            // const response = await authAPI.verifyOTP(userEmail, otpComplete);
            const response = await verifyOtp(userEmail, otpComplete);
            console.log("OTP verification successful:", response.data);

            setSuccess("Verification successful!");

            // Redirect based on flow
            setTimeout(() => {
                // Clear OTP data


                if (registrationType === 'registration') {
                    // Redirect to dashboard or profile completion
                    const role = sessionStorage.getItem('userRole');
                    sessionStorage.removeItem('OTPEmail');
                    sessionStorage.removeItem('registrationType');
                    sessionStorage.removeItem('userRole');
                    if (role === 'client') {
                        navigate('/client/onboarding');
                    } else if (role === 'freelancer') {
                        navigate('/freelancer/onboarding');
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    // Login flow - redirect to dashboard
                    const role = response.data?.data?.user?.role;
                    sessionStorage.removeItem('OTPEmail');
                    sessionStorage.removeItem('userRole');
                    if (role === 'client') {
                        navigate('/client/dashboard');
                    } else if (role === 'freelancer') {
                        navigate('/freelancer/dashboard');
                    } else {
                        navigate('/dashboard');
                    }
                }
            }, 1500);

        } catch (err) {
            console.error("OTP verification failed:", err);
            const errorMessage = err.response?.data?.message || 'Invalid verification code. Please try again.';
            setError(errorMessage);
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            console.log("Resending OTP to:", userEmail);
            await authAPI.resendOTP(userEmail, 'email_verification');

            setSuccess("New code sent to your email!");
            setTimer(30);
            setCanResend(false);
            setOtp(["", "", "", "", "", ""]);

            // Clear success message after 2 seconds
            setTimeout(() => {
                setSuccess("");
            }, 2000);

            // Focus first input
            if (inputRefs.current[0]) {
                inputRefs.current[0].focus();
            }

        } catch (err) {
            console.error("Failed to resend OTP:", err);
            const errorMessage = err.response?.data?.message || 'Failed to resend code. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBackClick = () => {
        if (registrationType === 'registration') {
            navigate('/registration');
        } else {
            navigate('/login');
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
                        <span>🛡️</span> Verification Stage
                    </div>

                    <h1 ref={headingRef} className="hero__heading">
                        {headingWords.map((w, i) => (
                            <span key={i} className="hero__word">
                                {w}{i === 2 ? ' ' : ' '}
                            </span>
                        ))}
                    </h1>

                    <p className="hero__sub" style={{ marginBottom: '25px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                        We've sent a 6-digit security code to <span style={{ color: 'white', fontWeight: '800' }}>{userEmail}</span>
                    </p>

                    <div ref={formRef} className="hero__auth-container" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '45px 35px',
                        backdropFilter: 'blur(12px)',
                        maxWidth: '420px',
                        width: '100%',
                        textAlign: 'center'
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

                        {/* Success Alert */}
                        {success && (
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 15px',
                                marginBottom: '20px',
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-start'
                            }}>
                                <CheckCircle size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ color: '#86efac', fontSize: '13px', margin: 0, fontWeight: '500' }}>
                                    {success}
                                </p>
                            </div>
                        )}

                        {/* OTP Input Fields */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    disabled={loading}
                                    style={{
                                        width: '55px',
                                        height: '65px',
                                        textAlign: 'center',
                                        fontSize: '28px',
                                        fontWeight: '900',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        color: 'white',
                                        outline: 'none',
                                        transition: 'all 0.3s',
                                        opacity: loading ? 0.6 : 1,
                                        cursor: loading ? 'not-allowed' : 'text'
                                    }}
                                />
                            ))}
                        </div>

                        {/* Verify Button */}
                        <button
                            type="button"
                            onClick={handleVerify}
                            disabled={!isOtpValid || loading}
                            className="hero__btn-main"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                border: 'none',
                                cursor: isOtpValid && !loading ? 'pointer' : 'not-allowed',
                                padding: '16px',
                                opacity: isOtpValid && !loading ? 1 : 0.4,
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                marginBottom: '20px'
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                                        <ShieldCheck size={18} />
                                    </div>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Verify Now <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        {/* Resend & Timer */}
                        <div style={{ marginTop: '25px' }}>
                            {canResend ? (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={loading}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: '800',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        margin: '0 auto',
                                        fontSize: '14px',
                                        opacity: loading ? 0.6 : 1
                                    }}
                                >
                                    <RotateCcw size={16} /> Resend OTP Code
                                </button>
                            ) : (
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600' }}>
                                    Resend code in <span style={{ color: 'white', fontWeight: '900' }}>{timer}s</span>
                                </p>
                            )}
                        </div>

                        {/* Back Button */}
                        <p style={{ marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600' }}>
                            Wrong email? <button
                                onClick={handleBackClick}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Go back
                            </button>
                        </p>
                    </div>
                </div>

                {/* Right Side Visual */}
                <div ref={visualRef} className="hero__visual">
                    <div className="hero__dashboard">
                        <div className="hero__dashboard-header">
                            <div className="hero__dashboard-dots">
                                <span style={{ background: "#ff5f57" }} />
                                <span style={{ background: "#febc2e" }} />
                                <span style={{ background: "#28c840" }} />
                            </div>
                            <span className="hero__dashboard-title">Security Lab</span>
                        </div>
                        <div className="hero__dashboard-body">
                            <div className="hero__db-profile">
                                <div className="hero__db-avatar">🛡️</div>
                                <div>
                                    <div className="hero__db-name">MFA Verification</div>
                                    <div className="hero__db-role">Level 2 Authorization</div>
                                </div>
                            </div>
                            <div className="hero__db-ai">
                                <div className="hero__db-ai-icon">💡</div>
                                <div>
                                    <div className="hero__db-ai-title">Buddy AI Check</div>
                                    <div className="hero__db-ai-text">
                                        This extra layer of security helps prevent unauthorized access to your account and data.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hero__wave">
                <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                </svg>
            </div>

            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </section>
    );
};

export default OTP;