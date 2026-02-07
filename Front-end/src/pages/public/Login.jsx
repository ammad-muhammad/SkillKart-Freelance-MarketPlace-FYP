
import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, Lock, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { useCMS } from "../../cms/context/CMSContext";

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
        {Icon && <Icon size={18} />}
      </motion.div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full bg-[#f9f9f9] border-2 rounded-xl pl-12 pr-4 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
          error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </motion.div>
  );
};

// --- PASSWORD INPUT WITH TOGGLE ---
const PasswordInput = ({ value, onChange, name, placeholder, error }) => {
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
        name={name}
        placeholder={placeholder || "Enter your password"}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full bg-[#f9f9f9] border-2 rounded-xl pl-12 pr-12 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
          error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
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
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </motion.div>
  );
};

// --- DYNAMIC RENDERER ---
const renderField = (field, formData, handleInputChange, errors) => {
  if (!field) return null;
  const commonProps = {
    key: field.id,
    name: field.id,
    label: field.label,
    placeholder: field.placeholder, 
    value: formData[field.id] || "",
    onChange: handleInputChange,
    error: errors[field.id],
    type: field.type 
  };

  if (field.type === "password") {
    return (
      <PasswordInput
        {...commonProps}
      />
    );
  }

  // Icons
  let Icon = null;
  if (field.type === "email" || field.id.includes("email")) Icon = Mail;
  
  return (
    <ModernInput
      {...commonProps}
      icon={Icon} 
    />
  );
};

// --- MAIN LOGIN PAGE ---
const Login = () => {
  const { formFields } = useCMS();
  // Get Login Form config or fallback
  const loginFormConfig = formFields?.loginForm || {};
  const fields = loginFormConfig.fields || [];

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    let isValid = true;
    
    // Use CMS fields for validation
    fields.forEach(field => {
        if (field.required && !formData[field.id]) {
            newErrors[field.id] = (field.label || "This field") + " is required";
            isValid = false;
        }
        if (field.type === 'email' && formData[field.id] && !formData[field.id].match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
             newErrors[field.id] = "Invalid email format";
             isValid = false;
        }
    });
    
    // Fallback if no fields loaded yet (shouldn't happen with proper initialContent)
    if (fields.length === 0) {
        if (!formData.email) newErrors.email = "Email is required";
        if (!formData.password) newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      console.log("✅ Login Successful!");
      console.log("User Data:", formData);
      setShowSuccess(true);
      setIsLoading(false);
      
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({});
      }, 2000);
    }, 1500);
  };

  const handleSocialLogin = (provider) => {
    console.log(`🔗 Logging in with ${provider}...`);
    alert(`Login with ${provider} coming soon!`);
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
              
              {/* Dynamic Fields */}
              {fields.length > 0 ? (
                  fields.map(field => renderField(field, formData, handleInputChange, errors))
              ) : (
                  // Fallback if CMS not loaded
                   <>
                    <ModernInput icon={Mail} placeholder="Enter your email" type="email" name="email" value={formData.email} onChange={handleInputChange} error={errors.email} />
                    <PasswordInput value={formData.password} onChange={(e) => handleInputChange({ target: { name: "password", value: e.target.value } })} name="password" error={errors.password} />
                   </>
              )}

              {/* Remember & Forgot */}
              <motion.div 
                className="flex items-center justify-between text-xs"
                variants={staggerItem}
              >
                {loginFormConfig.rememberMe && (
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 rounded border-2 border-gray-300 cursor-pointer accent-black"
                    />
                    <span className="text-gray-600 font-medium group-hover:text-black transition-colors">
                        Remember me
                    </span>
                    </label>
                )}
                {loginFormConfig.forgotPassword && (
                    <motion.div
                        className="text-gray-600 font-semibold hover:text-black transition-colors cursor-pointer"
                        whileHover={{ x: 2 }}
                    >
                        {loginFormConfig.forgotPassword.text || "Forgot?"}
                    </motion.div>
                )}
              </motion.div>

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
                    Signing in...
                  </>
                ) : (
                  <>
                    {loginFormConfig.submitButton?.text || "Sign In"} <ArrowUpRight size={16} />
                  </>
                )}
              </motion.button>

              {/* Success Message */}
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="p-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-bold text-center text-xs"
                >
                  ✅ Login successful!
                </motion.div>
              )}
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

            {/* Social Login Buttons - Simplified for brevity */}
            <motion.div 
              className="space-y-2.5 mb-5"
              variants={staggerContainer}
            >
             {/* Using hardcoded social buttons as they are usually not dynamic in simple CMS, 
                 but could be. For now keeping them static as requested focus is on Fields */}
              <motion.button
                type="button"
                onClick={() => handleSocialLogin("Google")}
                variants={staggerItem}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#1F2937] hover:text-white hover:border-[#1F2937] group text-black"
              >
                Google
              </motion.button>
              {/* ... other social buttons */}
            </motion.div>

            {/* Footer */}
            <motion.p 
              className="text-center text-gray-600 text-xs"
              variants={staggerItem}
            >
              Don't have an account?{" "}
              <Link to="/register" className="font-bold text-black hover:text-gray-700 transition-colors"
                whileHover={{ x: 2 }}>Sign up</Link>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;