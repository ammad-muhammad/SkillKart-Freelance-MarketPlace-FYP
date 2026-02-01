import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Shield, Lock, FileText, Eye, Cookie, Server, Scale, Mail } from "lucide-react";

// --- ANIMATION VARIANTS ---
const fadeInUp = {
  hidden: { opacity: 0, y: 40, filter: "blur(4px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const sidebarVariant = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

// --- DATA STRUCTURE ---
const policyData = {
  lastUpdated: "March 15, 2024",
  intro: {
    title: "Privacy Policy",
    subtitle: "We value your trust and are committed to protecting your personal data.",
    description: "This Data Collection and Processing Policy, or Privacy Policy (hereafter referred to as the “Policy”) explains how SkillKart collects information about You, how it is used, kept, and disclosed when You visit the Website. We are dedicated to ensuring that your privacy is protected and that we are transparent about our data practices."
  },
  sections: [
    {
      id: "definitions",
      title: "Definitions",
      icon: <FileText size={20} />,
      content: [
        {
          heading: "Key Terms",
          text: "The following terms have the meanings specified below for the purposes of this Policy:"
        },
        {
          heading: "Company",
          text: "Refers to SkillKart Inc., represented by its legal entities and affiliates (hereinafter – “We”, “Us”, or “Our”)."
        },
        {
          heading: "Website",
          text: "Means all Content and links available on the SkillKart platform that provides Services to Users and provides information regarding the Services."
        },
        {
          heading: "Personal Data",
          text: "Any information relating to an identified or identifiable natural person ('Data Subject'); an identifiable natural person is one who can be identified, directly or indirectly."
        }
      ]
    },
    {
      id: "collection",
      title: "Information We Collect",
      icon: <Eye size={20} />,
      content: [
        {
          heading: "Personal Information",
          text: "We collect information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us."
        },
        {
          heading: "Usage Data",
          text: "We may also collect information that your browser sends whenever you visit our Service or when you access the Service by or through a mobile device. This may include information such as your computer's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data."
        }
      ]
    },
    {
      id: "usage",
      title: "How We Use Your Data",
      icon: <Server size={20} />,
      content: [
        {
          heading: "Service Delivery",
          text: "To provide and maintain our Service, including to monitor the usage of our Service and to manage your account."
        },
        {
          heading: "Communication",
          text: "To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication, regarding updates or informative communications related to the functionalities, products or contracted services, including the security updates, when necessary or reasonable for their implementation."
        }
      ]
    },
    {
      id: "cookies",
      title: "Cookies & Tracking",
      icon: <Cookie size={20} />,
      content: [
        {
          heading: "Tracking Technologies",
          text: "We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies used are beacons, tags, and scripts to collect and track information and to improve and analyze Our Service."
        },
        {
          heading: "Your Control",
          text: "You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if You do not accept Cookies, You may not be able to use some parts of our Service."
        }
      ]
    },
    {
      id: "security",
      title: "Data Security",
      icon: <Lock size={20} />,
      content: [
        {
          heading: "Protection Measures",
          text: "The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security."
        }
      ]
    },
    {
      id: "rights",
      title: "Your Rights",
      icon: <Scale size={20} />,
      content: [
        {
          heading: "Access & Control",
          text: "You have the right to request access to your personal data, rectify incorrect data, or request the deletion of your data under certain circumstances (Right to be Forgotten). You also have the right to restrict processing of your personal data."
        }
      ]
    },
    {
      id: "contact",
      title: "Contact Us",
      icon: <Mail size={20} />,
      content: [
        {
          heading: "Get in Touch",
          text: "If you have any questions about this Privacy Policy, You can contact us:"
        },
        {
          heading: "Email",
          text: "privacy@skillkart.com"
        },
        {
          heading: "Address",
          text: "123 Tech Park, Innovation Way, Silicon Valley, CA"
        }
      ]
    }
  ]
};

// --- COMPONENTS ---

// 1. Navigation Item
const NavItem = ({ section, activeId, onClick }) => {
  const isActive = activeId === section.id;
  
  return (
    <motion.li 
      variants={sidebarVariant}
      className="relative"
    >
      <button
        onClick={() => onClick(section.id)}
        className={`flex items-center gap-4 w-full text-left py-3 group transition-colors duration-300 ${
          isActive ? "text-black font-semibold" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <span className={`p-2 rounded-lg transition-colors duration-300 ${isActive ? "bg-[#b3f5e1] text-black" : "bg-gray-100 group-hover:bg-gray-200"}`}>
          {section.icon}
        </span>
        <span className="text-sm uppercase tracking-wider">{section.title}</span>
        
        {isActive && (
          <motion.div 
            layoutId="activeIndicator"
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1 h-8 bg-black rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </button>
    </motion.li>
  );
};

// 2. Content Section
const ContentSection = ({ section, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px 0px" });

  return (
    <motion.section
      id={section.id}
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      transition={{ delay: index * 0.1 }}
      className="mb-20 scroll-mt-32"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-black text-white rounded-xl">
          {section.icon}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{section.title}</h2>
      </div>

      <div className="space-y-8 pl-0 md:pl-4 border-l-2 border-dashed border-gray-100">
        {section.content.map((block, idx) => (
          <div key={idx} className="relative group">
            {/* Hover Indicator */}
            <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-gray-200 border-2 border-white transition-colors duration-300 group-hover:bg-[#b3f5e1]" />
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">{block.heading}</h3>
            <p className="text-gray-600 leading-relaxed text-lg">{block.text}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
};

// --- MAIN PAGE ---
const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState("definitions");
  const heroRef = useRef(null);
  
  // Parallax for Hero
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Handle Scroll Spy
  useEffect(() => {
    const handleScroll = () => {
      const sections = policyData.sections.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 150; // Offset

      for (const section of sections) {
        if (section && section.offsetTop <= scrollPosition && (section.offsetTop + section.offsetHeight) > scrollPosition) {
          setActiveSection(section.id);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: "smooth"
      });
      setActiveSection(id); // Optimistic update
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-[#b3f5e1] selection:text-black pt-24">
      
      {/* ---------------- HERO SECTION ---------------- */}
      <div ref={heroRef} className="relative h-[75vh] w-full overflow-hidden bg-gray-900 flex items-center justify-center">
        {/* Background Image with Parallax */}
        <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop" 
            alt="Privacy Shield" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-[#b3f5e1]/10 border border-[#b3f5e1]/30 text-[#b3f5e1] text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
              Updated {policyData.lastUpdated}
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-8 leading-[0.9]">
              {policyData.intro.title}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto text-center">
              {policyData.intro.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ---------------- MAIN CONTENT LAYOUT ---------------- */}
      <div className="container mx-auto px-6 md:px-12 lg:px-20 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* LEFT: Sticky Sidebar Navigation */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-32">
              <motion.div 
                initial="hidden" 
                animate="visible" 
                variants={staggerContainer}
                className="space-y-2 border-l border-gray-100 pl-4"
              >
                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-6 pl-2">
                  Navigation
                </h4>
                <ul className="space-y-2">
                  {policyData.sections.map((section) => (
                    <NavItem 
                      key={section.id} 
                      section={section} 
                      activeId={activeSection}
                      onClick={scrollToSection}
                    />
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>

          {/* RIGHT: Content Area */}
          <div className="lg:col-span-9">
            {/* Introduction Text */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-24"
            >
              <p className="text-xl md:text-2xl leading-relaxed font-light text-gray-600 border-l-4 border-[#b3f5e1] pl-6 md:pl-10 py-2">
                {policyData.intro.description}
              </p>
            </motion.div>

            {/* Dynamic Sections */}
            <div>
              {policyData.sections.map((section, index) => (
                <ContentSection key={section.id} section={section} index={index} />
              ))}
            </div>

            {/* Bottom Call to Action */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="mt-32 p-12 bg-gray-100 rounded-3xl border border-gray-100 text-center flex flex-col items-center"
            >
              <Shield className="w-16 h-16 mx-auto text-black mb-8" />
              <h3 className="text-3xl font-bold mb-6">Your Privacy Matters</h3>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto text-center">
                We are committed to full transparency. If you have any further questions that aren't answered here, please reach out to our data protection team.
              </p>

              <button className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-full font-bold transition-all hover:shadow-xl hover:-translate-y-1 flex items-center gap-2 mx-auto mt-5">
                Contact Data Protection Team <ArrowUpRight size={18} />
              </button>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;