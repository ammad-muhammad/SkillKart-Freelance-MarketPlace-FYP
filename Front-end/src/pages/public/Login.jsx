import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Mail, Lock, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { authAPI } from '../../api/auth';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

// --- INPUT COMPONENT ---
const ModernInput = ({ icon: Icon, placeholder, type = "text", value, onChange, name, error }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      className="relative"
      variants={staggerItem}
    >
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2 pl-3.5 text-gray-400"
        animate={{ color: isFocused ? "#000000" : "#9ca3af" }}
        transition={{ duration: 0.2 }}
      >
        <Icon size={18} />
      </motion.div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full bg-[#f9f9f9] border-2 rounded-xl pl-12 pr-4 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
          }`}
      />
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none border-2"
        animate={{
          borderColor: isFocused ? "rgba(0,0,0,0.1)" : "transparent",
          boxShadow: isFocused ? "0 0 0 0px rgba(179, 245, 225, 0.2)" : "none"
        }}
        transition={{ duration: 0.3 }}
      />
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </motion.div>
  );
};

// --- PASSWORD INPUT WITH TOGGLE ---
const PasswordInput = ({ value, onChange, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      className="relative"
      variants={staggerItem}
    >
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2 pl-3.5 text-gray-400"
        animate={{ color: isFocused ? "#000000" : "#9ca3af" }}
        transition={{ duration: 0.2 }}
      >
        <Lock size={18} />
      </motion.div>
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full bg-[#f9f9f9] border-2 rounded-xl pl-12 pr-12 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
          }`}
      />
      <motion.button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-0 top-1/2 -translate-y-1/2 pr-3.5 text-gray-400 hover:text-black transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </motion.button>
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none border-2"
        animate={{
          borderColor: isFocused ? "rgba(0,0,0,0.1)" : "transparent",
          boxShadow: isFocused ? "0 0 0 0px rgba(179, 245, 225, 0.2)" : "none"
        }}
        transition={{ duration: 0.3 }}
      />
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </motion.div>
  );
};

// --- MAIN LOGIN PAGE ---
const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const heroRef = useRef(null);

  // Parallax effect for hero image
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroY = useTransform(heroScroll, [0, 1], [0, 80]);
  const heroScale = useTransform(heroScroll, [0, 1], [1.05, 1.15]);
  const heroOpacity = useTransform(heroScroll, [0, 0.8], [0.7, 0.3]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
  
    if (!validateForm()) return;
  
    setIsLoading(true);
  
    try {
      // Call the API to verify credentials and send OTP
      const response = await authAPI.login(formData.email, formData.password);
  
      console.log("✅ Credentials verified, OTP sent successfully!", response);
  
      // Navigate to OTP page with login credentials and user data
      navigate("/otp", {
        state: {
          from: "login",
          email: formData.email,
          formData: {
            email: formData.email,
            password: formData.password,
            userData: response.data // Store user data for after OTP verification
          }
        }
      });
    } catch (error) {
      console.error("❌ Login failed:", error);
  
      // Show appropriate error message
      if (error.response?.status === 401) {
        setErrors(prev => ({
          ...prev,
          submit: "Invalid email or password"
        }));
      } else if (error.response?.status === 404) {
        setErrors(prev => ({
          ...prev,
          submit: "Account not found"
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          submit: error.response?.data?.message || "Login failed. Please try again."
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    console.log(`🔗 Logging in with ${provider}...`);
    // alert(`Login with ${provider} coming soon!`);

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

  const handleBackClick = () => {
    console.log("Going back...");
    window.history.back();
  };

  return (
    <div className="bg-white h-screen font-sans selection:bg-[#b3f5e1] selection:text-black overflow-hidden no-header no-footer">

      {/* --- SPLIT LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">

        {/* LEFT SIDE - HERO IMAGE (HIDDEN ON MOBILE) */}
        <div
          ref={heroRef}
          className="relative hidden lg:flex lg:sticky lg:top-0 overflow-hidden bg-gray-900 rounded-3xl m-6 h-[94%]"
        >
          <motion.img
            src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200"
            className="absolute inset-0 w-full h-full object-cover blur-md grayscale"
            style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
            alt="Workspace"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />

          {/* Hero Content */}
          <div className="relative z-10 h-full p-8 md:p-14 flex flex-col justify-between text-white w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
                Welcome Back
              </h2>
              <p className="text-white/70 text-lg max-w-sm">
                Sign in to access your dashboard and continue where you left off.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-6"
            >
              <div>
                <h6 className="text-white/60 text-sm font-medium">Security Features</h6>
                <ul className="space-y-2 text-white/80 text-sm mt-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    End-to-end encrypted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    Two-factor authentication
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    Secure session management
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDE - LOGIN FORM */}
        <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white relative h-screen lg:overflow-hidden overflow-y-auto items-center justify-center">

          {/* Back Button on Mobile/Tablet */}
          <motion.button
            onClick={handleBackClick}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer absolute top-6 left-6 lg:hidden z-20 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-black transition-all duration-300 hover:bg-gray-200"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </motion.button>

          {/* Form Container */}
          <motion.div
            className="w-full max-w-sm mx-auto lg:mx-0 relative z-10"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >

            {/* Header */}
            <motion.div
              className="mb-6"
              variants={staggerItem}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="w-10 h-10 rounded-lg bg-black flex items-center justify-center mb-3"
              >
                <span className="text-white font-bold text-base">SK</span>
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-1.5">
                Sign In
              </h1>
              <p className="text-gray-600 font-medium text-sm">
                Access your workspace
              </p>
            </motion.div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5 mb-5">

              <ModernInput
                icon={Mail}
                placeholder="Enter your email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
              />

              <PasswordInput
                value={formData.password}
                onChange={(e) => handleInputChange({ target: { name: "password", value: e.target.value } })}
                error={errors.password}
              />

              {/* Remember & Forgot */}
              <motion.div
                className="flex items-center justify-between text-xs"
                variants={staggerItem}
              >
                <label className="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-2 border-gray-300 cursor-pointer accent-black"
                  />
                  <span className="text-gray-600 font-medium group-hover:text-black transition-colors">
                    Remember me
                  </span>
                </label>
                <motion.a
                  href="#"
                  className="text-gray-600 font-semibold hover:text-black transition-colors"
                  whileHover={{ x: 2 }}
                >
                  Forgot?
                </motion.a>
              </motion.div>

              {/* Submit Error */}
              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 font-medium text-center text-xs"
                >
                  {errors.submit}
                </motion.div>
              )}

              {/* Login Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                variants={staggerItem}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Sending code...
                  </>
                ) : (
                  <>
                    Sign In <ArrowUpRight size={16} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <motion.div
              className="flex items-center gap-3 mb-4"
              variants={staggerItem}
            >
              <div className="flex-1 h-[1px] bg-gray-200" />
              <span className="text-gray-400 font-medium text-xs">Or continue with</span>
              <div className="flex-1 h-[1px] bg-gray-200" />
            </motion.div>

            {/* Social Login Buttons */}
            <motion.div
              className="space-y-2.5 mb-5"
              variants={staggerContainer}
            >
              {/* <motion.button
                type="button"
                onClick={() => handleSocialLogin("google")}
                variants={staggerItem}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#1F2937] hover:text-white hover:border-[#1F2937] group text-black"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </motion.button> */}
              <motion.button
  type="button"
  onClick={() => handleSocialLogin("Google")}
  variants={staggerItem}
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.98 }}
  className="w-full py-2.5 px-4 rounded-xl border border-gray-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-300 bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md"
>
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Google
</motion.button>


              <motion.button
                type="button"
                onClick={() => handleSocialLogin("github")}
                variants={staggerItem}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:bg-black hover:text-white hover:border-black group text-black"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleSocialLogin("linkedin")}
                variants={staggerItem}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] group text-black"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.733 0-9.637h3.554v1.364c.429-.658 1.196-1.593 2.905-1.593 2.12 0 3.71 1.385 3.71 4.363v5.503zM5.337 8.855c-1.144 0-1.915-.759-1.915-1.71 0-.956.77-1.71 1.957-1.71 1.188 0 1.915.754 1.933 1.71 0 .951-.745 1.71-1.975 1.71zm1.946 11.597H3.392v-9.637h3.891v9.637zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                </svg>
                LinkedIn
              </motion.button>
            </motion.div>

            {/* Footer */}
            <motion.p
              className="text-center text-gray-600 text-xs"
              variants={staggerItem}
            >
              Don't have an account?{" "}
              <Link to="/register" className="font-bold text-black hover:text-gray-700 transition-colors">
                Sign up
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;