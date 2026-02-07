
import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Mail, Lock, Eye, EyeOff, ChevronLeft, ChevronRight, Check, Briefcase, Code } from "lucide-react";
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
        className={`w-full bg-[#f9f9f9] border-2 rounded-xl ${Icon ? "pl-12" : "pl-4"} pr-4 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
          error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </motion.div>
  );
};

// --- PASSWORD INPUT WITH TOGGLE ---
const PasswordInput = ({ value, onChange, name = "password", placeholder = "Enter password", error }) => {
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
        placeholder={placeholder}
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

// --- ROLE SELECTION CARD ---
const RoleCard = ({ role, title, description, icon: Icon, isSelected, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      type="button"
      variants={staggerItem}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
        isSelected 
          ? "border-black bg-black text-white shadow-lg" 
          : "border-gray-200 bg-white text-black hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <motion.div
          className={`p-2.5 rounded-lg ${isSelected ? "bg-white" : "bg-gray-100"}`}
        >
          <Icon size={24} color={isSelected ? "black" : "currentColor"} />
        </motion.div>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-[#b3f5e1] flex items-center justify-center"
          >
            <Check size={16} color="black" />
          </motion.div>
        )}
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className={`text-sm ${isSelected ? "text-white/80" : "text-gray-600"}`}>
        {description}
      </p>
    </motion.button>
  );
};

// --- SELECT DROPDOWN ---
const ModernSelect = ({ options, value, onChange, name, label, error }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div className="relative z-30" variants={staggerItem}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#f9f9f9] border-2 rounded-xl px-4 py-2.5 text-sm font-medium text-left flex items-center justify-between transition-all duration-300 ${
          error ? "border-red-300 focus:border-red-500" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className={value ? "text-black" : "text-gray-400"}>
          {value || "Select an option"}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronRight size={18} className="text-gray-400 rotate-90" />
        </motion.div>
      </motion.button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
        >
          {options.map((option) => (
            <motion.button
              key={option}
              type="button"
              onClick={() => {
                onChange({ target: { name, value: option } });
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
              whileHover={{ x: 4 }}
            >
              {option}
            </motion.button>
          ))}
        </motion.div>
      )}
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
    placeholder: field.placeholder, // Use placeholder from CMS
    value: formData[field.id] || "",
    onChange: handleInputChange,
    error: errors[field.id],
    type: field.type // Pass type
  };

  if (field.type === "select") {
    return (
      <ModernSelect
        {...commonProps}
        options={field.options || []}
      />
    );
  }

  if (field.type === "password") {
    return (
      <PasswordInput
        {...commonProps}
      />
    );
  }

  if (field.type === "file") {
      return (
          <motion.div variants={staggerItem} key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
            <div className="relative">
              <input
                type="file"
                name={field.id}
                accept={field.accept || "*"}
                onChange={handleInputChange}
                className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-black file:text-white hover:file:bg-gray-900 cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1 ml-1">{field.helperText || "Supported formats: PDF, DOC, DOCX (Max 5MB)"}</p>
            </div>
            {errors[field.id] && <p className="text-red-500 text-xs mt-1 ml-1">{errors[field.id]}</p>}
          </motion.div>
      );
  }

  // Icons based on id substring
  let Icon = null;
  const idLower = field.id.toLowerCase();
  if (idLower.includes("email")) Icon = Mail;
  else if (idLower.includes("user") || idLower.includes("name")) Icon = Briefcase;
  else if (idLower.includes("rate") || idLower.includes("price")) Icon = Check;
  else if (field.type === "number") Icon = Check;
  
  // If no icon matched, maybe use default? ModernInput handles no icon.

  return (
    <ModernInput
      {...commonProps}
      icon={Icon} 
    />
  );
};

// --- MAIN REGISTER PAGE ---
const Register = () => {
  const { formFields } = useCMS();
  // Get Register Form config or fallback to empty object if not loaded yet
  const registerFormConfig = formFields?.registerForm || {};

  const [step, setStep] = useState(0); // 0: Role Selection, 1: Basic Registration, 2: Profile Completion
  const [userRole, setUserRole] = useState(null); // "client" or "freelancer"
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
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
    const { name, value, files } = e.target;
    // Handle files if present
    const val = files ? files[0] : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const getFieldsForStep = (currentStep) => {
    if (!registerFormConfig.steps) return [];
    
    // Config steps are usually indexed 0, 1... matches logic
    // But config step property is 1-based in initialContent (step: 1, step: 2)
    // Our local state step is 0 (Role), 1 (Basic), 2 (Profile).
    // So local Step 1 maps to config Step with step: 1.
    // Local Step 2 maps to config Step with step: 2.
    
    const configStep = registerFormConfig.steps.find(s => s.step === currentStep);
    if (!configStep) return [];

    if (currentStep === 2) {
        return userRole === 'client' 
          ? (configStep.clientFields || []) 
          : (configStep.freelancerFields || []);
    }
    return configStep.fields || [];
  };

  const validateStep = (currentStep) => {
    const currentFields = getFieldsForStep(currentStep);
    const newErrors = {};
    let isValid = true;

    currentFields.forEach(field => {
        // Required check
        if (field.required && !formData[field.id]) {
            newErrors[field.id] = (field.label || "This field") + " is required";
            isValid = false;
        }
        // Specific validations
        if (field.type === 'email' && formData[field.id] && !formData[field.id].match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
             newErrors[field.id] = "Invalid email format";
             isValid = false;
        }
        if (field.type === 'password' && formData[field.id] && formData[field.id].length < 6) {
             newErrors[field.id] = "Password must be at least 6 characters";
             isValid = false;
        }
        if (field.id === 'confirmPassword' && formData['password'] !== formData['confirmPassword']) {
             newErrors['confirmPassword'] = "Passwords do not match";
             isValid = false;
        }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleRoleSelect = (role) => {
    setUserRole(role);
    setStep(1);
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (validateStep(1)) {
        setStep(2);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 2) {
      if (validateStep(2)) {
        setIsLoading(true);
        
        setTimeout(() => {
          console.log("✅ Registration Successful!");
          console.log("Role:", userRole);
          console.log("User Data:", formData);
          setShowSuccess(true);
          setIsLoading(false);
          
          setTimeout(() => {
            setShowSuccess(false);
            // Reset or navigate
            navigate("/login");
          }, 2000);
        }, 1500);
      }
    }
  };

  const handleBackClick = () => {
    if (step === 0) {
      window.history.back();
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="bg-white font-sans selection:bg-[#b3f5e1] selection:text-black overflow-hidden no-header no-footer">
      
      {/* --- SPLIT LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        
        {/* LEFT SIDE - HERO IMAGE */}
        <div 
          ref={heroRef} 
          className="relative hidden lg:flex lg:sticky lg:top-0 overflow-hidden bg-gray-900 rounded-3xl m-6 h-[94vh]"
        >
          <motion.img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200"
            className="absolute inset-0 w-full h-full object-cover blur-md grayscale"
            style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
            alt="Team"
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
                Join Us Today
              </h2>
              <p className="text-white/70 text-lg max-w-sm">
                Start your journey as a client or freelancer and unlock endless opportunities.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-6"
            >
              <div>
                <h6 className="text-white/60 text-sm font-medium">Why Join Our Platform?</h6>
                <ul className="space-y-2 text-white/80 text-sm mt-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    Secure & Verified Community
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    Easy Payment & Escrow
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b3f5e1]" />
                    24/7 Customer Support
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDE - REGISTRATION FORM */}
        <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white relative min-h-screen lg:overflow-hidden overflow-y-auto">
          
          {/* Back Button */}
          <motion.button
            onClick={handleBackClick}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer absolute top-6 left-6 z-40 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-black transition-all duration-300 hover:bg-gray-200"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </motion.button>

          {/* Form Container */}
          <motion.div 
            className="w-full max-w-sm mx-auto relative z-10"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            
            {/* --- STEP 0: ROLE SELECTION --- */}
            {step === 0 && (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                {/* Header */}
                <motion.div 
                  className="mb-8"
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
                    Get Started
                  </h1>
                  <p className="text-gray-600 font-medium text-sm">
                    Choose your role to create an account
                  </p>
                </motion.div>

                {/* Role Selection Cards */}
                <motion.div 
                  className="space-y-3 mb-6"
                  variants={staggerContainer}
                >
                  <RoleCard
                    role="client"
                    title="I'm a Client"
                    description="I want to hire freelancers and get projects done"
                    icon={Briefcase}
                    isSelected={userRole === "client"}
                    onClick={() => handleRoleSelect("client")}
                  />
                  
                  <RoleCard
                    role="freelancer"
                    title="I'm a Freelancer"
                    description="I want to offer my skills and earn money"
                    icon={Code}
                    isSelected={userRole === "freelancer"}
                    onClick={() => handleRoleSelect("freelancer")}
                  />
                </motion.div>

                {/* Info Text */}
                <motion.p 
                  className="text-center text-gray-600 text-xs"
                  variants={staggerItem}
                >
                  Already have an account?{" "}
                  <Link to="/login" className="font-bold text-black hover:text-gray-700 transition-colors">
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            )}

            {/* --- STEP 1: BASIC REGISTRATION --- */}
            {step === 1 && (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                {/* Header */}
                <motion.div 
                  className="mb-6"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-1 bg-black rounded-full" />
                    <span className="text-xs font-bold text-gray-600">Step 1 of 2</span>
                    <div className="flex-1 h-1 bg-gray-200 rounded-full" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-black mb-1.5">
                    Create Account
                  </h1>
                  <p className="text-gray-600 font-medium text-sm">
                    Sign up as a {userRole === "client" ? "Client" : "Freelancer"}
                  </p>
                </motion.div>

                {/* Registration Form */}
                <form onSubmit={handleNextStep} className="space-y-3.5 mb-5">
                  
                  {getFieldsForStep(1).map(field => renderField(field, formData, handleInputChange, errors))}

                  {/* Terms & Conditions */}
                  <motion.label 
                    className="flex items-start gap-2 cursor-pointer mt-4"
                    variants={staggerItem}
                  >
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-2 border-gray-300 cursor-pointer accent-black mt-0.5"
                      required
                    />
                    <span className="text-gray-600 font-medium text-xs">
                      I agree to the <span className="font-bold text-black">Terms of Service</span> and <span className="font-bold text-black">Privacy Policy</span>
                    </span>
                  </motion.label>

                  {/* Next Button */}
                  <motion.button
                    type="button"
                    onClick={handleNextStep}
                    variants={staggerItem}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 mt-6"
                  >
                    Continue <ArrowUpRight size={16} />
                  </motion.button>
                </form>

                {/* Footer */}
                <motion.p 
                  className="text-center text-gray-600 text-xs"
                  variants={staggerItem}
                >
                  Already have an account?{" "}
                  <Link to="/login" className="font-bold text-black hover:text-gray-700 transition-colors">
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            )}

            {/* --- STEP 2: PROFILE COMPLETION --- */}
            {step === 2 && (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                {/* Header */}
                <motion.div 
                  className="mb-6"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-1 bg-black rounded-full" />
                    <span className="text-xs font-bold text-gray-600">Step 2 of 2</span>
                    <div className="flex-1 h-1 bg-black rounded-full" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-black mb-1.5">
                    Complete Profile
                  </h1>
                  <p className="text-gray-600 font-medium text-sm">
                    {userRole === "client" ? "Tell us about your business" : "Showcase your expertise"}
                  </p>
                </motion.div>

                {/* Profile Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5 mb-5">
                  
                  {getFieldsForStep(2).map(field => renderField(field, formData, handleInputChange, errors))}

                  {/* Success Message */}
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-bold text-center text-xs"
                    >
                      ✅ Registration successful!
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    variants={staggerItem}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-70 mt-6"
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        {registerFormConfig.submitButton?.text || "Create Account"} <Check size={16} />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Footer */}
                <motion.p 
                  className="text-center text-gray-600 text-xs"
                  variants={staggerItem}
                >
                  Already have an account?{" "}
                  <Link to="/login" className="font-bold text-black hover:text-gray-700 transition-colors">
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Register;