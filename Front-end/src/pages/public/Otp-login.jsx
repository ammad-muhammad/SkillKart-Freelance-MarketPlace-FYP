import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, Shield, ChevronLeft, UserPlus, LogIn, RotateCw, AlertCircle } from "lucide-react";
import { authAPI } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';

// --- ANIMATION VARIANTS ---
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 15, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

// --- OTP INPUT COMPONENT ---
const OTPInput = ({ length = 6, value, onChange }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    onChange(newOtp.join(""));

    if (element.value !== "" && index < length - 1) {
      inputRefs.current[index + 1].focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        inputRefs.current[index - 1].focus();
        setFocusedIndex(index - 1);
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        onChange(newOtp.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
      setFocusedIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1].focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    const newOtp = [...otp];

    for (let i = 0; i < pastedData.length; i++) {
      if (!isNaN(pastedData[i])) {
        newOtp[i] = pastedData[i];
      }
    }

    setOtp(newOtp);
    onChange(newOtp.join(""));

    const lastFilledIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[lastFilledIndex].focus();
    setFocusedIndex(lastFilledIndex);
  };

  return (
    <motion.div
      className="flex gap-2 justify-center"
      variants={staggerItem}
    >
      {otp.map((digit, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => setFocusedIndex(index)}
            onPaste={handlePaste}
            className="w-11 h-12 text-center text-lg font-bold bg-[#f9f9f9] border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all duration-300 text-black"
            style={{
              borderColor: focusedIndex === index ? "#000000" : (digit ? "#000000" : "#e5e7eb"),
              backgroundColor: digit ? "#ffffff" : "#f9f9f9"
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

// --- MAIN OTP PAGE ---
const OTPLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();

  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const fromPage = location.state?.from || "login";
  const userEmail = location.state?.email || "user@example.com";
  const savedFormData = location.state?.formData || null;

  const heroRef = useRef(null);

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroY = useTransform(heroScroll, [0, 1], [0, 80]);
  const heroScale = useTransform(heroScroll, [0, 1], [1.05, 1.15]);
  const heroOpacity = useTransform(heroScroll, [0, 0.8], [0.7, 0.3]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      const updatedFormData = {
        ...savedFormData,
        otp: otpValue
      };

      const data = await verifyOtp(userEmail, otpValue);

      setSuccessMessage(fromPage === "register" ? "Code verified!" : "Verification successful!");
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage("");

        if (fromPage === "register") {
          navigate("/register", {
            state: {
              fromOTP: true,
              formData: updatedFormData
            }
          });
        } else {
          data.data.user.role === "client" ? navigate("/client") : navigate("/freelancer");
        }
      }, 1500);
    } catch (err) {
      console.error("OTP verification failed:", err);
      setError(err.response?.data?.message || "Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setError("");

    try {
      await authAPI.resendOTP(userEmail);
      setSuccessMessage("New code sent to your email!");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage("");
      }, 2000);
      setResendTimer(30);
      setCanResend(false);
      setOtpValue("");
    } catch (err) {
      console.error("Failed to resend OTP:", err);
      setError(err.response?.data?.message || "Failed to resend code. Please try again.");
    }
  };

  const handleBackClick = () => {
    if (fromPage === "register") {
      navigate("/register", {
        state: {
          formData: savedFormData
        }
      });
    } else {
      navigate(`/${fromPage}`);
    }
  };

  return (
    <div className="bg-white h-screen font-sans selection:bg-[#b3f5e1] selection:text-black overflow-hidden no-header no-footer">
      <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">

        {/* LEFT SIDE - HERO IMAGE */}
        <div
          ref={heroRef}
          className="relative hidden lg:flex lg:sticky lg:top-0 overflow-hidden bg-gray-900 rounded-3xl m-6 h-[94%]"
        >
          <motion.img
            src="https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200"
            className="absolute inset-0 w-full h-full object-cover blur-md grayscale"
            style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
            alt="Security"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />

          <div className="relative z-10 h-full p-8 md:p-14 flex flex-col justify-between text-white w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
                Verify Your Identity
              </h2>
              <p className="text-white/70 text-lg max-w-sm">
                We've sent a verification code to your email to ensure it's really you.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-6"
            >
              <div>
                <h6 className="text-white/60 text-sm font-medium">Why we verify</h6>
                <ul className="space-y-2 text-white/80 text-sm mt-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    Protect your account from unauthorized access
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    Ensure secure communication
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    Prevent fraudulent activity
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDE - OTP FORM */}
        <div className="p-6 md:p-8 lg:p-10 flex flex-col justify-center bg-white relative h-screen overflow-hidden items-center">

          {/* Back Button */}
          <motion.button
            onClick={handleBackClick}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer absolute top-6 left-6 z-20 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-black transition-all duration-300 hover:bg-gray-200"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </motion.button>

          {/* Form Container */}
          <motion.div
            className="w-full max-w-md mx-auto lg:mx-0 relative z-10"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >

            {/* Header */}
            <motion.div
              className="mb-6 text-center"
              variants={staggerItem}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mb-3 mx-auto"
              >
                <Shield className="text-white" size={24} />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-bold text-black mb-1.5">
                Enter Verification Code
              </h2>
              <p className="text-gray-600 font-medium text-xs">
                We've sent a 6-digit code to
              </p>
              <p className="text-black font-bold text-xs mt-0.5">
                {userEmail}
              </p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-[#b3f5e1]/20 border border-[#b3f5e1]/40 rounded-full text-xs font-semibold text-black"
              >
                {fromPage === "register" ? (
                  <>
                    <UserPlus size={12} strokeWidth={2.5} />
                    New Account
                  </>
                ) : (
                  <>
                    <LogIn size={12} strokeWidth={2.5} />
                    Login Verification
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="space-y-4 mb-4">

              <OTPInput
                length={6}
                value={otpValue}
                onChange={setOtpValue}
              />

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="p-2.5 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 font-bold text-center text-xs flex items-center justify-center gap-1.5"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

              {/* Timer & Resend */}
              <motion.div
                className="text-center pt-1"
                variants={staggerItem}
              >
                {canResend ? (
                  <motion.button
                    type="button"
                    onClick={handleResend}
                    className="text-black font-bold text-xs hover:text-gray-700 transition-colors inline-flex items-center gap-1.5"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RotateCw size={12} strokeWidth={2.5} />
                    Resend Code
                  </motion.button>
                ) : (
                  <p className="text-gray-600 font-medium text-xs">
                    Resend code in{" "}
                    <span className="font-bold text-black">
                      {resendTimer}s
                    </span>
                  </p>
                )}
              </motion.div>

              {/* Verify Button */}
              <motion.button
                type="submit"
                disabled={isLoading || otpValue.length !== 6}
                variants={staggerItem}
                whileHover={{ scale: otpValue.length === 6 ? 1.02 : 1 }}
                whileTap={{ scale: otpValue.length === 6 ? 0.98 : 1 }}
                className="w-full bg-black hover:bg-gray-900 text-white py-2.5 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Continue <ArrowUpRight size={16} />
                  </>
                )}
              </motion.button>

              {/* Success Message */}
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="p-2.5 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-bold text-center text-xs flex items-center justify-center gap-1.5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  {successMessage}
                </motion.div>
              )}
            </form>

            {/* Help Text */}
            <motion.div
              className="text-center space-y-1.5"
              variants={staggerItem}
            >
              <p className="text-gray-600 text-xs">
                Didn't receive the code? Check your spam folder
              </p>
              <p className="text-gray-600 text-xs">
                Wrong email?{" "}
                <button
                  onClick={handleBackClick}
                  className="font-bold text-black hover:text-gray-700 transition-colors"
                >
                  Go back to {fromPage}
                </button>
              </p>
            </motion.div>

            {/* Security Notice */}
            <motion.div
              variants={staggerItem}
              className="mt-4 p-3 bg-gray-50 rounded-xl border-2 border-gray-100"
            >
              <div className="flex gap-2.5">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-black/5 flex items-center justify-center">
                    <Shield size={14} className="text-black" />
                  </div>
                </div>
                <div>
                  <h6 className="text-black font-bold text-xs mb-0.5">
                    Security Tip
                  </h6>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Never share your verification code with anyone. Our team will never ask for it.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OTPLogin;