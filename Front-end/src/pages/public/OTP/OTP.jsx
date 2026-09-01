import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, ArrowLeft, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import { log } from "../../../utils/logger";
import AuthBackground from "../AuthBackground";
import "../Auth.css";

const OTP = () => {
    const { verifyOtp } = useAuth();
    const navigate = useNavigate();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    // Matches the backend's 1-minute per-email resend cooldown
    // (OTP.canRequestNewOTP) — a shorter local timer would let the button
    // re-enable before the backend actually allows a new OTP.
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const inputRefs = useRef([]);

    // Get email from sessionStorage (registration/login flow)
    const userEmail = sessionStorage.getItem('OTPEmail') || 'user@example.com';
    const registrationType = sessionStorage.getItem('registrationType') || 'login';

    // Get password reset data from sessionStorage (password reset flow)
    const tempForgotData = JSON.parse(sessionStorage.getItem('tempForgotData') || 'null');
    const isPasswordReset = tempForgotData ? true : false;
    const resetEmail = tempForgotData?.email || userEmail;
    const resetPassword = tempForgotData?.newPassword || '';

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

    useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

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
            // PASSWORD RESET FLOW
            if (isPasswordReset) {
                log("🔄 Password Reset Flow");
                log("Email:", resetEmail);
                log("OTP:", otpComplete);

                const response = await authAPI.resetPassword(resetEmail, otpComplete, resetPassword);
                log("✅ Password reset successful:", response.data);

                setSuccess("Password reset successfully!");

                setTimeout(() => {
                    sessionStorage.removeItem('tempForgotData');
                    navigate('/login');
                }, 1500);
            }
            // REGISTRATION/LOGIN FLOW
            else {
                log("🔐 Registration/Login Flow");
                log("Verifying OTP:", otpComplete, "for email:", userEmail);
                log("Registration Type:", registrationType);

                const purpose = registrationType === 'login' ? 'login' : 'email_verification';
                const response = await verifyOtp(userEmail, otpComplete, purpose);
                log("✅ OTP verification successful:", response.data);

                setSuccess("Verification successful!");

                setTimeout(() => {
                    const role = sessionStorage.getItem('userRole');

                    if (registrationType === 'registration') {
                        sessionStorage.removeItem('OTPEmail');
                        sessionStorage.removeItem('registrationType');
                        sessionStorage.removeItem('userRole');

                        if (role === 'client') {
                            navigate('/client/onboarding');
                        } else if (role === 'freelancer') {
                            navigate('/freelancer/onboarding');
                        } else {
                            navigate('/404');
                        }
                    } else {
                        const userRole = response?.data?.user?.role;
                        const isOnboardingcompleted = response?.data?.user?.isOnBoardingCompleted;

                        sessionStorage.removeItem('OTPEmail');
                        sessionStorage.removeItem('registrationType');
                        sessionStorage.removeItem('userRole');

                        if (userRole === 'client') {
                            isOnboardingcompleted ? navigate('/client/dashboard') : navigate('/client/onboarding');
                        } else if (userRole === 'freelancer') {
                            isOnboardingcompleted ? navigate('/freelancer/dashboard') : navigate('/freelancer/onboarding');
                        } else {
                            navigate('/404');
                        }
                    }
                }, 1500);
            }

        } catch (err) {
            console.error("❌ Verification failed:", err);
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
            const emailForResend = isPasswordReset ? resetEmail : userEmail;
            let purpose = 'email_verification';
            if (isPasswordReset) purpose = 'password_reset';
            else if (registrationType === 'login') purpose = 'login';

            log("📧 Resending OTP to:", emailForResend);

            await authAPI.resendOTP(emailForResend, purpose);

            setSuccess("New code sent to your email!");
            setTimer(60);
            setCanResend(false);
            setOtp(["", "", "", "", "", ""]);

            setTimeout(() => {
                setSuccess("");
            }, 2000);

            if (inputRefs.current[0]) {
                inputRefs.current[0].focus();
            }

        } catch (err) {
            console.error("❌ Failed to resend OTP:", err);
            const errorMessage = err.response?.data?.message || 'Failed to resend code. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBackClick = () => {
        if (isPasswordReset) {
            navigate('/forgot-password');
        } else if (registrationType === 'registration') {
            navigate('/registration');
        } else {
            navigate('/login');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#020b14',
            backgroundImage: 'radial-gradient(circle at 50% 35%, rgba(10, 74, 115, 0.4) 0%, rgba(4, 46, 76, 0.5) 45%, #020b14 90%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            position: 'relative',
            fontFamily: "'Lato', sans-serif",
            color: 'white',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            {/* Top Left Navigation */}
            <Link to="/" className="back-home-btn" style={{
                position: 'fixed',
                top: '24px',
                left: '24px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '999px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'all 0.25s ease'
            }}>
                <ArrowLeft size={18} />
                <span>Back to Home</span>
            </Link>

            <AuthBackground />

            {/* Centered OTP Card Container */}
            <main style={{
                width: '100%',
                maxWidth: '460px',
                margin: 'auto',
                position: 'relative',
                zIndex: 10
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        background: 'rgba(4, 46, 76, 0.35)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: '1.5px solid rgba(183, 201, 226, 0.22)',
                        borderRadius: '28px',
                        padding: '40px 32px',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(4, 46, 76, 0.4)',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Top Icon Badge & Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(183, 201, 226, 0.2), rgba(4, 46, 76, 0.6))',
                            border: '1.5px solid rgba(183, 201, 226, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#B7C9E2',
                            boxShadow: '0 8px 24px rgba(4, 46, 76, 0.5)',
                            marginBottom: '16px'
                        }}>
                            <ShieldCheck size={32} />
                        </div>

                        <h1 style={{
                            fontFamily: "'Roboto Slab', serif",
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            margin: '0 0 8px 0',
                            lineHeight: 1.2
                        }}>
                            Security Verification
                        </h1>

                        <p style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.68)',
                            margin: '0 0 10px 0',
                            fontWeight: 500
                        }}>
                            We've sent a 6-digit security code to
                        </p>

                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(183, 201, 226, 0.12)',
                            border: '1px solid rgba(183, 201, 226, 0.28)',
                            padding: '6px 16px',
                            borderRadius: '999px',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            wordBreak: 'break-all'
                        }}>
                            <span>{isPasswordReset ? resetEmail : userEmail}</span>
                        </div>
                    </div>

                    {/* Alerts */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    borderRadius: '14px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#fca5a5',
                                    fontSize: '0.85rem',
                                    textAlign: 'left'
                                }}
                            >
                                <AlertCircle size={18} style={{ flexShrink: 0, color: '#ef4444' }} />
                                <span>{error}</span>
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                style={{
                                    background: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.35)',
                                    borderRadius: '14px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#86efac',
                                    fontSize: '0.85rem',
                                    textAlign: 'left'
                                }}
                            >
                                <CheckCircle size={18} style={{ flexShrink: 0, color: '#22c55e' }} />
                                <span>{success}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 6 Digit OTP Input Boxes */}
                    <div style={{
                        display: 'flex',
                        justify: 'center',
                        gap: '10px',
                        marginBottom: '24px'
                    }}>
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
                                    width: '52px',
                                    height: '60px',
                                    textAlign: 'center',
                                    fontSize: '1.65rem',
                                    fontWeight: '900',
                                    fontFamily: 'inherit',
                                    color: '#ffffff',
                                    backgroundColor: digit ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    border: digit ? '1.5px solid #B7C9E2' : '1.5px solid rgba(255, 255, 255, 0.16)',
                                    borderRadius: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.2s ease',
                                    opacity: loading ? 0.5 : 1,
                                    cursor: loading ? 'not-allowed' : 'text',
                                    boxShadow: digit ? '0 0 12px rgba(183, 201, 226, 0.25)' : 'none'
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = '#B7C9E2';
                                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                                    e.target.style.boxShadow = '0 0 16px rgba(183, 201, 226, 0.35)';
                                }}
                                onBlur={e => {
                                    if (!digit) {
                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                        e.target.style.boxShadow = 'none';
                                    }
                                }}
                            />
                        ))}
                    </div>

                    {/* Primary Verify Button */}
                    <button
                        type="button"
                        onClick={handleVerify}
                        disabled={!isOtpValid || loading}
                        style={{
                            width: '100%',
                            padding: '14px 20px',
                            background: isOtpValid && !loading
                                ? 'linear-gradient(135deg, #1a6fa8 0%, #042E4C 100%)'
                                : 'rgba(255, 255, 255, 0.08)',
                            color: isOtpValid && !loading ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                            border: isOtpValid && !loading ? '1px solid rgba(183, 201, 226, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '14px',
                            fontSize: '1rem',
                            fontWeight: '700',
                            fontFamily: 'inherit',
                            cursor: isOtpValid && !loading ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: isOtpValid && !loading ? '0 8px 24px rgba(4, 46, 76, 0.5)' : 'none',
                            transition: 'all 0.25s ease',
                            marginBottom: '20px'
                        }}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin" style={{ width: 18, height: 18 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" opacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" />
                                    </svg>
                                </div>
                                Verifying Code...
                            </>
                        ) : (
                            <>
                                Verify Now <ArrowRight size={18} />
                            </>
                        )}
                    </button>

                    {/* Resend & Timer */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        {canResend ? (
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={loading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#B7C9E2',
                                    fontWeight: '700',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.88rem',
                                    opacity: loading ? 0.6 : 1,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <RotateCcw size={15} /> Resend OTP Code
                            </button>
                        ) : (
                            <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.84rem', margin: 0, fontWeight: 500 }}>
                                Resend code in <strong style={{ color: '#ffffff', fontWeight: 800 }}>{timer}s</strong>
                            </p>
                        )}

                        {/* Back Link */}
                        <button
                            onClick={handleBackClick}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.45)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={e => e.target.style.color = '#ffffff'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255, 255, 255, 0.45)'}
                        >
                            <ArrowLeft size={14} /> Wrong email? Change address
                        </button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default OTP;