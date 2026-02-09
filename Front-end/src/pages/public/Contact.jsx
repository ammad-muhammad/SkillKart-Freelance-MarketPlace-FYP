
import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from "framer-motion";
import { ArrowUpRight, MapPin, Search, Check } from "lucide-react";
import DroppingTextAnimation from "../../Components/common/SrcollingText/DroppingTextAnimation";
import { useCMS } from "../../cms/context/CMSContext";
import { countries } from "../../data/countries";
import HomeBanner from "../../Components/common/Banners/HomeBanner";

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

// 2. Searchable Smart Dropdown
const SmartDropdown = ({ label, options, value, onChange, name, type = "default", isOpen, onToggle }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = type === "searchable" 
    ? (options || []).filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
    : (options || []);

  const handleSelect = (opt) => {
    onChange({ target: { name, value: opt } });
    onToggle();
  };

  return (
    <div className={`space-y-4 relative ${isOpen ? "z-60" : "z-10"} col-span-2 md:col-span-1`}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af] mb-1 block">
        {label} <span className="text-red-400">*</span>
      </label>
      
      <div className="relative">
        <div 
          onClick={onToggle} 
          className={`w-full bg-[#f9f9f9] hover:bg-[#f3f3f3] rounded-xl p-4 text-sm cursor-pointer flex items-center justify-between transition-all duration-200 ${isOpen ? 'ring-1 ring-black/10' : ''}`}
        >
          <span className={value ? 'text-black font-medium' : 'text-gray-300'}>
            {value || 'Please select an option'}
          </span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </motion.div>
        </div>

        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="absolute left-0 right-0 z-70 w-full top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            {type === "searchable" && (
              <div className="p-3 border-b border-gray-100 bg-white sticky top-0 flex items-center gap-2">
                <Search size={14} className="text-gray-400 ml-2" />
                <input 
                  type="text" 
                  placeholder="Search countries..." 
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  autoFocus 
                  onClick={(e) => e.stopPropagation()} 
                />
              </div>
            )}
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
                <div 
                  key={opt} 
                  onClick={() => handleSelect(opt)} 
                  className={`px-5 py-3 text-sm cursor-pointer hover:bg-[#f3f3f3] flex items-center justify-between group transition-colors ${value === opt ? 'bg-[#b3f5e1] text-black font-semibold' : 'text-gray-600'}`}
                >
                  {opt}
                  {value === opt && <Check size={14} />}
                </div>
              )) : <div className="px-5 py-4 text-sm text-gray-400 text-center">No options found</div>}
            </div>
          </motion.div>
        )}
      </div>
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
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const toggleDropdown = (id) => setActiveDropdown(prev => prev === id ? null : id);

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
    <div className="bg-white min-h-screen font-sans selection:bg-[#b3f5e1] selection:text-black relative">
      
      {/* 1. PREMIUM HERO SECTION */}
      <HomeBanner
        backgroundImage={contactData.hero.heroImage}
        searchIcon="/assets/icons/ic-search.svg"
        titleStart="Fill out our form"
        titleEnd="to get in touch"
        subtitle="Contact Us"
        descriptionOne={contactData.hero.description}
        descriptionTwo="Our team typically responds within 24 hours during business days."
        searchPlaceholder="How can we help you today?"
        showSearch={false}
        showDescription={false}
        showBlur={true}
        isFullWidth={true}
      />

      {/* 2. MAIN CONTENT SECTION - TWO COLUMNS */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 lg:py-24 grid lg:grid-cols-[45%_55%] gap-12 lg:gap-20 items-start">
        
        {/* LEFT COLUMN: HERO IMAGE & OVERLAY TEXT */}
        <ScrollReveal className="sticky top-24">
            <div className="relative rounded-[3rem] overflow-hidden aspect-4/5 lg:aspect-3/4 group shadow-2xl">
                <img 
                  src={contactData.hero.heroImage} 
                  className="w-full h-full object-cover grayscale brightness-75 transition-transform duration-1000 group-hover:scale-110" 
                  alt="Contact Hero" 
                />
                
                {/* Text Overlay */}
                <div className="absolute inset-0 p-12 lg:p-14 flex flex-col justify-between text-white border border-white/10 rounded-[3rem] overflow-hidden">
                    <h2 className="text-6xl md:text-7xl font-bold tracking-tighter leading-[0.9] drop-shadow-xl">
                        Fill out our form <br/>to get in touch
                    </h2>
                    
                    <div className="space-y-10">
                        <p className="text-lg font-medium text-white/90 max-w-sm leading-relaxed">
                            {contactData.hero.description}
                        </p>
                        <button className="relative px-8 py-4 rounded-full text-sm font-bold flex items-center justify-center overflow-hidden transition-all duration-500 border border-white/30 text-white bg-transparent hover:bg-white hover:text-black hover:border-white shadow-sm cursor-pointer group/btn w-fit  mt-5">
                          <div className="relative flex items-center overflow-hidden h-5">
                            <div className="flex items-center transition-all duration-500 ease-in-out group-hover/btn:-translate-y-full">
                              <span className="whitespace-nowrap uppercase tracking-widest">{contactData.hero.buttonText}</span>
                              <ArrowUpRight size={18} className="ml-2" />
                            </div>
                            <div className="absolute inset-0 flex items-center translate-y-full transition-all duration-500 ease-in-out group-hover/btn:translate-y-0">
                              <span className="whitespace-nowrap uppercase tracking-widest">{contactData.hero.buttonText}</span>
                              <ArrowUpRight size={18} className="ml-2" />
                            </div>
                          </div>
                        </button>
                    </div>
                </div>
            </div>
        </ScrollReveal>

        {/* RIGHT COLUMN: THE FORM */}
        <motion.div variants={staggerItem} className="lg:pt-4">
            <form onSubmit={handleSubmitForm} className="grid grid-cols-2 gap-x-6 gap-y-10">
                {cmsFields.map((field) => {
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
                        const isCountry = field.id === "country";
                        const options = isCountry ? countries : (field.options || []);
                        
                        return (
                            <React.Fragment key={field.id}>
                                <SmartDropdown 
                                    label={field.label} 
                                    options={options}
                                    type={isCountry ? "searchable" : "default"}
                                    name={field.id}
                                    value={formData[field.id] || ""}
                                    onChange={handleInputChange}
                                    isOpen={activeDropdown === field.id}
                                    onToggle={() => toggleDropdown(field.id)}
                                />
                                
                                {/* Conditional Other Input for 'Interested' or 'Source' */}
                                <AnimatePresence>
                                    {((field.id === 'interested' && formData.interested === 'Other') || 
                                      (field.id === 'source' && formData.source === 'Other')) && (
                                        <motion.div 
                                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                          animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                          transition={{ duration: 0.3, ease: "easeInOut" }}
                                          className="col-span-2 overflow-hidden"
                                        >
                                            <input
                                              type="text"
                                              name={`${field.id}_other`}
                                              value={formData[`${field.id}_other`] || ""}
                                              onChange={handleInputChange}
                                              placeholder="Please specify..."
                                              required
                                              className="w-full bg-[#f3f3f3] border-none rounded-xl p-5 text-sm focus:ring-1 focus:ring-black/5 transition-shadow outline-none placeholder:text-gray-400 text-black font-medium border-l-4 border-black"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        );
                    }
                    
                    const isFullWidth = field.id.includes("email") || field.id.includes("Subject") || field.fullWidth;
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

                <div className="col-span-2 pt-10">
                    <motion.button 
                      type="submit" 
                      className="relative w-full px-8 py-4 rounded-xl text-sm font-bold flex items-center justify-center overflow-hidden transition-all duration-500 border border-transparent text-white bg-black hover:bg-gray-900 shadow-xl cursor-pointer group/submit"
                    >
                      <div className="relative flex items-center overflow-hidden h-5">
                        <div className="flex items-center transition-all duration-500 ease-in-out group-hover/submit:-translate-y-full">
                          <span className="whitespace-nowrap uppercase tracking-widest">{contactFormConfig.submitButton?.text || "Submit Form"}</span>
                          <ArrowUpRight size={18} className="ml-2" />
                        </div>
                        <div className="absolute inset-0 flex items-center translate-y-full transition-all duration-500 ease-in-out group-hover/submit:translate-y-0 text-[#b3f5e1]">
                          <span className="whitespace-nowrap uppercase tracking-widest">{contactFormConfig.submitButton?.text || "Submit Form"}</span>
                          <ArrowUpRight size={18} className="ml-2" />
                        </div>
                      </div>
                    </motion.button>
                </div>
            </form>

            {/* Success Message */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-8 p-6 bg-[#b3f5e1] rounded-2xl text-black font-bold text-center flex items-center justify-center gap-3 shadow-lg"
                    >
                      <Check size={20} className="mr-2" />  SENT SUCCESSFULLY! WE'LL BE IN TOUCH.
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
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
      {/* <DroppingTextAnimation text="Ready to serve SkillKart?" id="2250" className="mt-0" /> */}
    
    </div>
  );
};

export default Contact;