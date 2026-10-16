import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, ArrowLeft, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { authAPI } from "../../../api/auth";
import { useAuth } from '../../../hooks/useAuth';
import { log } from "../../../utils/logger";
import AuthBackground from "../AuthBackground";
import Loader from "../../../Components/common/Loader/Loader";
import { isMobileApp } from "../../../utils/platform";
import { notify } from "../../../utils/notify";
import "../Auth.css";
import "./OTP.css";

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
            notify.error(errorMessage, { duration: 6000 });
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
            notify.success("New verification code sent to your email!");
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
            setLoading(false);
            notify.error(errorMessage, { duration: 6000 });
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

    /* Progress ring for timer */
    const timerProgress = ((60 - timer) / 60) * 100;

    return (
        <div className="auth-page otp-page">
            {/* Back to Home */}
            {!isMobileApp() && (
                <Link to="/" className="back-home-btn">
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                </Link>
            )}

            <AuthBackground />

            {/* Centered single-card layout */}
            <main className="otp-main">
                <motion.div
                    initial={{ opacity: 0, y: 32, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="otp-card"
                >
                    {/* Icon badge */}
                    <div className="otp-icon-badge">
                        <ShieldCheck size={32} aria-hidden="true" />
                    </div>

                    {/* Heading */}
                    <h1 className="otp-heading">Security Verification</h1>
                    <p className="otp-sub">We've sent a 6-digit security code to</p>

                    {/* Email pill */}
                    <div className="otp-email-pill">
                        <span>{isPasswordReset ? resetEmail : userEmail}</span>
                    </div>

                    {/* Alerts */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                key="err"
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
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
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className="auth-alert auth-alert--success"
                                role="status"
                                aria-live="polite"
                            >
                                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{success}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* OTP boxes */}
                    <div className="otp-boxes" role="group" aria-label="Enter 6-digit verification code">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                className={`otp-box${digit ? ' otp-box--filled' : ''}`}
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={1}
                                value={digit}
                                aria-label={`Digit ${index + 1}`}
                                onChange={e => handleChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {/* Verify button */}
                    <button
                        type="button"
                        onClick={handleVerify}
                        disabled={!isOtpValid || loading}
                        className="auth-submit-btn"
                    >
                        {loading ? (
                            <>
                                <Loader size="sm" text="" />
                                Verifying Code...
                            </>
                        ) : (
                            <>
                                Verify Now
                                <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
                            </>
                        )}
                    </button>

                    {/* Timer / Resend */}
                    <div className="otp-resend-row">
                        {canResend ? (
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={loading}
                                className="otp-resend-btn"
                            >
                                <RotateCcw size={15} aria-hidden="true" />
                                Resend OTP Code
                            </button>
                        ) : (
                            <div className="otp-timer">
                                {/* Progress ring */}
                                <svg className="otp-timer-ring" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
                                    <circle cx="19" cy="19" r="16" fill="none" stroke="rgba(167,243,208,0.3)" strokeWidth="3" />
                                    <circle
                                        cx="19" cy="19" r="16"
                                        fill="none"
                                        stroke="#10B981"
                                        strokeWidth="3"
                                        strokeDasharray={`${2 * Math.PI * 16}`}
                                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - timerProgress / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.9s linear' }}
                                    />
                                    <text x="19" y="23" textAnchor="middle" fontSize="10" fontWeight="700" fill="#059669">{timer}</text>
                                </svg>
                                <span className="otp-timer-label">Resend code in <strong>{timer}s</strong></span>
                            </div>
                        )}

                        {/* Back link */}
                        <button onClick={handleBackClick} className="auth-back-link" style={{ marginTop: 6 }}>
                            <ArrowLeft size={14} aria-hidden="true" /> Wrong email? Change address
                        </button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default OTP;