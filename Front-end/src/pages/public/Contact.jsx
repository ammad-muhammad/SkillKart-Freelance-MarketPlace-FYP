
import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";
import DroppingTextAnimation from "../../Components/common/SrcollingText/DroppingTextAnimation";
import { useCMS } from "../../cms/context/CMSContext";

// --- ANIMATION VARIANTS ---
const fadeInUp = {
  hidden: { opacity: 0, y: 60, filter: "blur(10px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 40, filter: "blur(6px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

// Scroll-triggered reveal wrapper
const ScrollReveal = ({ children, variants = fadeInUp, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      style={{ transitionDelay: `${delay}s` }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// --- COMPONENTS ---

const OfficeLocation = ({ city, country, address, img, index = 0 }) => {
  const [isActive, setIsActive] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px 0px" });

  const handleToggle = () => setIsActive(!isActive);

  return (
    <motion.div
      ref={ref}
      className="relative border-b border-gray-200 py-6 md:py-8 cursor-pointer group overflow-hidden"
      onClick={handleToggle}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      initial={{ opacity: 0, x: -60, filter: "blur(10px)" }}
      animate={isInView ? { 
        opacity: 1, 
        x: 0, 
        filter: "blur(0px)",
        ...(isActive && { backgroundColor: "rgba(179, 245, 225, 0.1)" })
      } : { opacity: 0, x: -60, filter: "blur(10px)" }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        x: 10,
        transition: { duration: 0.3 }
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4 md:gap-6">
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={isActive ? { width: 90, opacity: 1 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="h-12 md:h-16 rounded-lg bg-cover bg-center overflow-hidden shrink-0 hidden md:block"
            style={{ backgroundImage: `url(${img})` }}
          />
          <motion.h3 
            initial={{ color: "#d1d5db", scale: 2 }}
            animate={isActive ? { color: "#000000", scale: 2.15 } : { color: "#d1d5db", scale: 2 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-2xl sm:text-5xl md:text-5xl font-medium tracking-tight origin-left"
          >
            {city}, <span className="text-gray-400">{country}</span>
          </motion.h3>
        </div>

        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="self-start md:self-auto"
        >
            <button className="bg-[#b3f5e1] hover:bg-[#8eedc6] text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
                Get Directions <ArrowUpRight size={14} />
            </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ height: 0, opacity: 0, marginTop: 0 }}
        animate={isActive ? { height: "auto", opacity: 1, marginTop: 12 } : { height: 0, opacity: 0, marginTop: 0 }}
        transition={{ duration: 0.3 }}
        className="text-gray-500 text-sm md:text-base overflow-hidden"
      >
        <p>{address}</p>
      </motion.div>
    </motion.div>
  );
};

const FloatingInput = ({ label, placeholder, type = "text", value, onChange, name, fullWidth = false }) => (
  <div className={`space-y-2 ${fullWidth ? "col-span-2" : "col-span-2 md:col-span-1"}`}>
    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
      {label} <span className="text-red-400">*</span>
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
      className="w-full bg-[#f9f9f9] border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-black/10 transition-shadow outline-none placeholder:text-gray-400 text-black font-medium"
    />
  </div>
);

const FloatingTextArea = ({ label, placeholder, value, onChange, name }) => (
    <div className="space-y-2 col-span-2">
      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {label} <span className="text-red-400">*</span>
      </label>
      <textarea 
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        placeholder={placeholder}
        required
        className="w-full bg-[#f9f9f9] border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-black/10 transition-shadow outline-none placeholder:text-gray-400 text-black font-medium resize-none"
      />
    </div>
);

const FloatingSelect = ({ label, options, value, onChange, name }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (opt) => {
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
  };

  return (
    <div className={`space-y-2 relative ${isOpen ? "z-50" : "z-10"} col-span-2 md:col-span-1`}>
      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {label} <span className="text-red-400">*</span>
      </label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#f9f9f9] hover:bg-[#f3f3f3] rounded-xl p-4 text-sm cursor-pointer flex items-center justify-between transition-all duration-200 ${isOpen ? 'ring-2 ring-black/10' : ''}`}
      >
        <span className={value ? 'text-black font-medium' : 'text-gray-400'}>
          {value || 'Please select an option'}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </motion.div>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 right-0 z-50 w-full top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200"
          style={{ maxHeight: '250px', overflowY: 'auto' }}
        >
          {options.map((opt) => (
            <div 
              key={opt}
              onClick={() => handleSelect(opt)}
              className={`px-4 py-3 text-sm cursor-pointer transition-colors duration-150 hover:bg-[#f3f3f3] ${value === opt ? 'bg-[#b3f5e1] text-black font-medium' : 'text-gray-700'}`}
            >
              {opt}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---

const Contact = () => {
    const { formFields } = useCMS();
    const contactFormConfig = formFields?.contactForm || {};
    const cmsFields = contactFormConfig.fields || [];

    const contactData = {
      hero: {
        title: "Fill out our form\nto get in touch",
        description: "Interested in joining our team? Head over to our Careers page to check our latest vacancies.",
        buttonText: "Careers",
        heroImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200"
      },
      officeLocations: [
        {
          city: "Sheffield",
          country: "UK",
          address: "3 St Pauls Place, Sheffield, S1 2JE",
          img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300"
        },
        {
          city: "Manchester",
          country: "UK",
          address: "Colony, One Silk Street, Ancoats, Manchester, M4 6LZ",
          img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300"
        },
        {
          city: "London",
          country: "UK",
          address: "6 Bevis Marks, London EC3A 8JQ",
          img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300"
        },
        {
          city: "New York",
          country: "USA",
          address: "27 E 28th St, New York, NY 10016, USA",
          img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300"
        }
      ],
      sectionTitle: "Our Office Locations"
    };

    // ============ FORM HANDLING ============
    const [formData, setFormData] = useState({});
    const [showSuccess, setShowSuccess] = useState(false);
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmitForm = (e) => {
      e.preventDefault();
      
      // Validation Check
      const missingFields = cmsFields
        .filter(field => field.required && !formData[field.id])
        .map(field => field.label);

      if (missingFields.length > 0) {
        alert(`❌ Please fill all required fields: ${missingFields.join(', ')}`);
        return;
      }

      console.log('✅ Form Submitted Successfully!');
      console.log('User Details:', formData);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      setFormData({});
    };

    const heroRef = useRef(null);
    const formRef = useRef(null);
    const formInView = useInView(formRef, { once: true, margin: "-50px 0px" });
    
    // Parallax effect for hero image
    const { scrollYProgress: heroScroll } = useScroll({
      target: heroRef,
      offset: ["start start", "end start"]
    });
    const heroY = useTransform(heroScroll, [0, 1], [0, 150]);
    const heroScale = useTransform(heroScroll, [0, 1], [1.05, 1.2]);
    const heroOpacity = useTransform(heroScroll, [0, 0.8], [0.6, 0.2]);

    return (
    <div className="bg-white min-h-screen font-sans selection:bg-[#b3f5e1] selection:text-black m-1 ">
      
      {/* ---------------- SPLIT HERO SECTION ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen pt-29">
        
        {/* LEFT FIXED COLUMN - with parallax */}
        <div ref={heroRef} className="relative h-[60vh] lg:h-screen lg:sticky lg:top-0 overflow-hidden bg-gray-900 rounded-3xl m-4 md:m-6">
          <motion.img
            src={contactData.hero.heroImage}
            className="absolute inset-0 w-full h-full object-cover blur-md grayscale"
            style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
            alt="Office vibe"
          />
          <div className="absolute inset-0 bg-black/20" /> {/* Overlay tint */}
          
          <div className="relative z-10 h-full p-8 md:p-14 flex flex-col justify-between text-white">
            <motion.h1 
                initial={{ y: 80, opacity: 0, filter: "blur(10px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
                className="text-6xl md:text-7xl lg:text-8xl font-medium tracking-tighter leading-[0.9] max-w-xl"
            >
              {contactData.hero.title.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < contactData.hero.title.split('\n').length - 1 && <br/>}
                </React.Fragment>
              ))}
            </motion.h1>

            <motion.div 
                className="space-y-8"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.5 }}
            >
                <p className="max-w-md text-white/80 text-sm md:text-base leading-relaxed">
                    {contactData.hero.description}
                </p>
                <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white text-black px-8 py-4 rounded-full font-bold text-sm tracking-wide flex items-center gap-2 hover:shadow-lg transition-all"
                >
                    {contactData.hero.buttonText} <ArrowUpRight size={18} />
                </motion.button>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SCROLLABLE COLUMN - with staggered form animations */}
        <div className="p-8 md:p-14 lg:p-20 bg-white">
          
          <motion.form 
            ref={formRef}
            onSubmit={handleSubmitForm}
            className="space-y-6 max-w-xl mx-auto lg:mx-0 lg:ml-auto pt-10 lg:pt-0 overflow-visible"
          >
            <motion.div className="grid grid-cols-2 gap-6" variants={staggerItem}>
                {cmsFields.map((field, idx) => {
                    if (field.type === "textarea") {
                         return <FloatingTextArea 
                            key={field.id} 
                            label={field.label} 
                            placeholder={field.placeholder} 
                            name={field.id}
                            value={formData[field.id] || ""}
                            onChange={handleInputChange} 
                        />
                    }
                    if (field.type === "select") {
                        return <FloatingSelect 
                            key={field.id} 
                            label={field.label} 
                            options={field.options || []}
                            name={field.id}
                            value={formData[field.id] || ""}
                            onChange={handleInputChange}
                        />
                    }
                    // Default to Input
                    // Decide if full width?
                    const isFullWidth = field.id.includes("email") || field.id.includes("Subject");
                    return <FloatingInput 
                        key={field.id} 
                        label={field.label} 
                        placeholder={field.placeholder} 
                        type={field.type}
                        name={field.id}
                        value={formData[field.id] || ""}
                        onChange={handleInputChange} 
                        fullWidth={isFullWidth}
                    />
                })}
            </motion.div>

            <motion.button
              type="submit"
              variants={staggerItem}
              whileHover={{ scale: 1.02, y: -4, boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-black text-white py-5 rounded-xl font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:bg-gray-900 transition-all"
            >
              {contactFormConfig.submitButton?.text || "Submit Form"} <ArrowUpRight size={20} />
            </motion.button>

            {/* Success Message - Moved to bottom */}
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 font-semibold text-center text-sm"
              >
                ✅ Form submitted successfully!
              </motion.div>
            )}
          </motion.form>
        </div>
      </div>

      {/* ---------------- OFFICE LOCATIONS (FULL WIDTH) ---------------- */}
      <div className="w-full px-6 md:px-16 lg:px-24 py-20 bg-white">
        <ScrollReveal>
          <h4 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-12">{contactData.sectionTitle}</h4>
        </ScrollReveal>
        
        <div>
            {contactData.officeLocations.map((location, index) => (
              <OfficeLocation 
                key={index}
                city={location.city}
                country={location.country}
                address={location.address}
                img={location.img}
                index={index}
              />
            ))}
        </div>
      </div>

      {/* ---------------- CINEMATIC S-CURVE MARQUEE ---------------- */}
      <DroppingTextAnimation text="Ready to serve SkillKart?" id="2250" className="mt-0" />
    
    </div>
  );
};

export default Contact;
