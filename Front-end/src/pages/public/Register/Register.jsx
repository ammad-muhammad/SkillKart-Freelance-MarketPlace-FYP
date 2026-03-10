import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useNavigate, useLocation, data } from "react-router-dom";
import { ArrowUpRight, Mail, Lock, Eye, EyeOff, ChevronLeft, Check, Briefcase, Code } from "lucide-react";
import { clientsAPI } from '../../../api/clients';
import { freelancersAPI } from '../../../api/freelancers';
import { authAPI } from '../../../api/auth';

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
      className={`relative w-full p-5 rounded-2xl border-2 transition-all duration-300 text-left ${isSelected
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
const ModernSelect = ({ options, value, onChange, name, label, error, isOpen, onToggle, openUpward = false }) => {
  return (
    <motion.div className={`relative ${isOpen ? "z-[100]" : "z-10"}`} variants={staggerItem}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <motion.button
        type="button"
        onClick={onToggle}
        className={`w-full bg-[#f9f9f9] border-2 rounded-xl px-4 py-2.5 text-sm font-medium text-left flex items-center justify-between transition-all duration-300 ${error ? "border-red-300 focus:border-red-500" : "border-gray-200 hover:border-gray-300"
          } ${isOpen ? "border-black bg-white shadow-sm" : ""}`}
      >
        <span className={value ? "text-black" : "text-gray-400"}>
          {value || "Select an option"}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`absolute ${openUpward ? "bottom-full mb-3" : "top-full mt-2"} left-0 w-full bg-white border-2 border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[999] overflow-hidden`}
        >
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <motion.button
                key={option}
                type="button"
                onClick={() => {
                  onChange({ target: { name, value: option } });
                  onToggle();
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0 text-black font-medium"
                whileHover={{ x: 4 }}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </motion.div>
  );
};

// --- MAIN REGISTER PAGE ---
const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get saved data from location state (when returning from OTP)
  const savedData = location.state?.formData;
  const isReturningFromOTP = location.state?.fromOTP || false;

  const [step, setStep] = useState(isReturningFromOTP ? 2 : 0); // Start at step 2 if returning from OTP
  const [userRole, setUserRole] = useState(savedData?.userRole || null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [formData, setFormData] = useState(savedData || {
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,

    phone: "",
    profilePicture: "",

    // Client fields
    companyName: "",
    companySize: "",
    industry: "",
    website: null,
    description: "",
    country: "",
    city: "",
    address: "",

    // Freelancer fields
    bio: "",
    title: "",
    hourlyRate: "",
    skills: [],
    availability: "full-time",
    portfolio: [],
    education: [],
    certifications: [],
    languages: []
  });
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
    const { name, value, type, checked, files } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? checked
        : type === 'file'
          ? files[0]
          : name === 'skills'
            ? value.split(',').map(skill => skill.trim()).filter(Boolean) // Convert comma-separated to array
            : value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (!formData.acceptedTerms) newErrors.acceptedTerms = "You must agree to the Terms & Conditions";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUserData = () => {
    const newErrors = {};

    // Common validation
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";

    // Client validation
    if (userRole === "client") {
      // Make these required if needed
      if (!formData.companyName) newErrors.companyName = "Company name is required";
      if (!formData.companySize) newErrors.companySize = "Please select company size";
      if (!formData.industry) newErrors.industry = "Please select an industry";

      // Optional field validation
      if (formData.website && !isValidUrl(formData.website)) {
        newErrors.website = "Please enter a valid URL (e.g., https://example.com)";
      }
    }

    // Freelancer validation
    if (userRole === "freelancer") {
      if (!formData.title) newErrors.title = "Professional title is required";
      if (!formData.bio) newErrors.bio = "Bio is required";
      if (!formData.hourlyRate) newErrors.hourlyRate = "Hourly rate is required";
      if (parseFloat(formData.hourlyRate) < 1) {
        newErrors.hourlyRate = "Rate must be at least $1";
      }
      if (!formData.availability) newErrors.availability = "Please select your availability";

      // Skills validation
      const skillsArray = typeof formData.skills === 'string'
        ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
        : formData.skills;

      if (skillsArray.length === 0) {
        newErrors.skills = "Please add at least one skill";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function for URL validation
  const isValidUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleRoleSelect = (role) => {
    if (role !== "client" && role !== "freelancer") {
      console.error("Invalid role selected");
      return;
    }

    setUserRole(role);
    setStep(1);
    setOpenDropdown(null);
  };

  const toggleDropdown = (id) => {
    setOpenDropdown(prev => prev === id ? null : id);
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (validateStep1()) {
        setIsLoading(true);
        try {
          // Call API to Create User and Send OTP

          const userData = {
            email: formData.email,
            password: formData.password,
            role: userRole, // This will now only be "client" or "freelancer"
          };

          console.log(userData)
          await authAPI.register(userData);

          // Navigate to OTP page with form data
          navigate("/otp", {
            state: {
              from: "register",
              email: formData.email,
              formData: { ...formData, userRole }
            }
          });
        } catch (error) {
          console.error("Failed to send OTP:", error);
          setErrors(prev => ({
            ...prev,
            email: error.response?.data?.message || "Failed to send verification code. Please try again."
          }));
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 2) {
      if (validateUserData()) {
        // Validate role before submitting
        if (userRole !== "client" && userRole !== "freelancer") {
          setErrors(prev => ({
            ...prev,
            submit: "Invalid role selected. Please start over."
          }));
          return;
        }

        setIsLoading(true);

        try {
          if (userRole === "client") {
            await clientsAPI.updateProfile({
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone,
              profilePicture: formData.profilePicture,
              companyName: formData.companyName,
              companySize: formData.companySize,
              industry: formData.industry,
              website: formData.website || null,
              description: formData.description,
              country: formData.country,
              city: formData.city,
              address: formData.address
            });
          }

          if (userRole === "freelancer") {
            await freelancersAPI.updateProfile({
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone,
              profilePicture: formData.profilePicture,
              bio: formData.bio,
              title: formData.title,
              hourlyRate: parseFloat(formData.hourlyRate),
              skills: typeof formData.skills === 'string'
                ? formData.skills.split(',').map(skill => skill.trim()).filter(Boolean)
                : formData.skills, // Convert comma-separated string to array
              portfolio: formData.portfolio || [],
              education: formData.education || [],
              certifications: formData.certifications || [],
              languages: formData.languages || [],
              availability: formData.availability
            });
          }

          console.log("✅ Update Successful!");
          setShowSuccess(true);

          setTimeout(() => {
            setShowSuccess(false);
            navigate(userRole === "client" ? "/client" : "/freelancer");
          }, 2000);
        } catch (error) {
          console.error("Update failed:", error);
          setErrors(prev => ({
            ...prev,
            submit: error.response?.data?.message || "Update failed. Please try again."
          }));
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleBackClick = () => {
    if (step === 0) {
      navigate("/login");
    } else if (step === 2) {
      // If on step 2, go back to step 1
      setStep(1);
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
                <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-3.5 mb-5">

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
                    onChange={handleInputChange}
                    name="password"
                    placeholder="Create a password"
                    error={errors.password}
                  />

                  <PasswordInput
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    error={errors.confirmPassword}
                  />

                  {/* Terms & Conditions */}
                  <motion.div variants={staggerItem} className="space-y-1">
                    <label className="flex items-start gap-2 cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        name="acceptedTerms"
                        checked={formData.acceptedTerms}
                        onChange={handleInputChange}
                        className={`w-4 h-4 rounded border-2 cursor-pointer accent-black mt-0.5 transition-colors ${errors.acceptedTerms ? "border-red-300" : "border-gray-200"
                          }`}
                      />
                      <span className="text-gray-600 font-medium text-xs">
                        I agree to the <span className="font-bold text-black">Terms of Service</span> and <span className="font-bold text-black">Privacy Policy</span>
                      </span>
                    </label>
                    {errors.acceptedTerms && <p className="text-red-500 text-[10px] ml-6">{errors.acceptedTerms}</p>}
                  </motion.div>

                  {/* Next Button */}
                  <motion.button
                    type="submit"
                    disabled={!formData.acceptedTerms || isLoading}
                    variants={staggerItem}
                    whileHover={{ scale: formData.acceptedTerms && !isLoading ? 1.02 : 1 }}
                    whileTap={{ scale: formData.acceptedTerms && !isLoading ? 0.98 : 1 }}
                    className={`w-full ${formData.acceptedTerms && !isLoading ? "bg-black hover:bg-gray-900" : "bg-gray-300 cursor-not-allowed"} text-white py-3 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 mt-6`}
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
                        Continue <ArrowUpRight size={16} />
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

                  <motion.div className="grid grid-cols-2 gap-3" variants={staggerItem}>
                    <div>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full bg-[#f9f9f9] border-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${errors.firstName ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
                          }`}
                      />
                      {errors.firstName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full bg-[#f9f9f9] border-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${errors.lastName ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
                          }`}
                      />
                      {errors.lastName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.lastName}</p>}
                    </div>
                  </motion.div>

                  {/* Phone Number Field - Common for both */}
                  <motion.div variants={staggerItem}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+1 234 567 8900"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black"
                    />
                  </motion.div>

                  {/* CLIENT SPECIFIC FIELDS */}
                  {userRole === "client" && (
                    <>
                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name (Optional)</label>
                        <input
                          type="text"
                          name="companyName"
                          placeholder="Enter company name"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black"
                        />
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <ModernSelect
                          label="Company Size (Optional)"
                          name="companySize"
                          options={["1-10", "11-50", "51-200", "201-500", "500+"]}
                          value={formData.companySize}
                          onChange={handleInputChange}
                          isOpen={openDropdown === "companySize"}
                          onToggle={() => toggleDropdown("companySize")}
                          openUpward={true}
                        />
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <ModernSelect
                          label="Industry (Optional)"
                          name="industry"
                          options={["Technology", "Marketing", "Design", "Finance", "Healthcare", "E-commerce", "Education", "Real Estate", "Other"]}
                          value={formData.industry}
                          onChange={handleInputChange}
                          isOpen={openDropdown === "industry"}
                          onToggle={() => toggleDropdown("industry")}
                          openUpward={true}
                        />
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Website (Optional)</label>
                        <input
                          type="url"
                          name="website"
                          placeholder="https://yourcompany.com"
                          value={formData.website}
                          onChange={handleInputChange}
                          className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black"
                        />
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Description (Optional)</label>
                        <textarea
                          name="description"
                          placeholder="Brief description of your company..."
                          value={formData.description}
                          onChange={handleInputChange}
                          rows="3"
                          className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black resize-none"
                        />
                      </motion.div>

                      {/* Location Fields */}
                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Country (Optional)</label>
                        <input
                          type="text"
                          name="country"
                          placeholder="United States"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black"
                        />
                      </motion.div>

                      <motion.div className="grid grid-cols-2 gap-3" variants={staggerItem}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">City (Optional)</label>
                          <input
                            type="text"
                            name="city"
                            placeholder="San Francisco"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Address (Optional)</label>
                          <input
                            type="text"
                            name="address"
                            placeholder="123 Main St"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black"
                          />
                        </div>
                      </motion.div>
                    </>
                  )}

                  {/* FREELANCER SPECIFIC FIELDS */}
                  {userRole === "freelancer" && (
                    <>
                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title</label>
                        <input
                          type="text"
                          name="title"
                          placeholder="e.g., Full-Stack Developer"
                          value={formData.title}
                          onChange={handleInputChange}
                          className={`w-full bg-[#f9f9f9] border-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${errors.title ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
                            }`}
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1 ml-1">{errors.title}</p>}
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                        <textarea
                          name="bio"
                          placeholder="Tell us about yourself and your expertise..."
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows="4"
                          className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black resize-none"
                        />
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (USD)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                          <input
                            type="number"
                            name="hourlyRate"
                            placeholder="50"
                            value={formData.hourlyRate}
                            onChange={handleInputChange}
                            min="1"
                            step="0.5"
                            className={`w-full bg-[#f9f9f9] border-2 rounded-xl pl-8 pr-4 py-2.5 text-sm font-medium focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${errors.hourlyRate ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-black"
                              }`}
                          />
                        </div>
                        {errors.hourlyRate && <p className="text-red-500 text-xs mt-1 ml-1">{errors.hourlyRate}</p>}
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Skills (comma-separated)</label>
                        <input
                          type="text"
                          name="skills"
                          placeholder="JavaScript, React, Node.js, MongoDB"
                          value={formData.skills}
                          onChange={handleInputChange}
                          className="w-full bg-[#f9f9f9] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-black transition-all duration-300 placeholder:text-gray-400 text-black"
                        />
                        <p className="text-xs text-gray-500 mt-1 ml-1">Separate skills with commas</p>
                      </motion.div>

                      <motion.div variants={staggerItem}>
                        <ModernSelect
                          label="Availability"
                          name="availability"
                          options={["full-time", "part-time", "contract", "not-available"]}
                          value={formData.availability}
                          onChange={handleInputChange}
                          isOpen={openDropdown === "availability"}
                          onToggle={() => toggleDropdown("availability")}
                          openUpward={true}
                        />
                      </motion.div>
                    </>
                  )}


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
                        Create Account <Check size={16} />
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