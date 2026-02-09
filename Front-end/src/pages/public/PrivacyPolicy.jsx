import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { 
  Shield, Lock, Eye, FileText, 
  Users, Globe, Bell, Settings, 
  Mail, ArrowUpRight, ChevronRight,
  Database, Fingerprint, ShieldCheck,
  Scale, Smartphone, Layers
} from "lucide-react";
import IconButton from "../../Components/common/buttons/IconButton";

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
    transition: { staggerChildren: 0.1 }
  }
};

// --- DATA STRUCTURE ---
const privacyData = {
  lastUpdated: "February 09, 2026",
  hero: {
    title: "Privacy Policy",
    subtitle: "Transparency, Security, and Trust. How SkillKart protects your digital identity.",
    description: "Your privacy is not just a policy; it's our promise. We've built SkillKart with security at its core to ensure your data stays protected while you focus on building your career.",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=2670&auto=format&fit=crop"
  },
  sections: [
    {
      id: "intro",
      title: "SkillKart & Your Privacy",
      icon: <Globe className="w-5 h-5" />,
      content: [
        {
          heading: "The SkillKart Mission",
          text: "SkillKart is a micro-freelance ecosystem designed to empower talent globally. To facilitate this, we collect specific data points to ensure safe transactions, verified identities, and a high-quality marketplace experience."
        },
        {
          heading: "Scope of Policy",
          text: "This policy applies to all users of the SkillKart platform, including Freelancers offering services ('Sellers') and Clients purchasing services ('Buyers'). It covers all digital touchpoints including our web application, mobile interface, and API integrations."
        }
      ]
    },
    {
      id: "collection",
      title: "Data Acquisition",
      icon: <Database className="w-5 h-5" />,
      content: [
        {
          heading: "Information You Provide",
          text: "When you register, we collect primary identity data including your full name, email address, professional credentials, and tax identification where applicable for payment processing."
        },
        {
          heading: "Automated Telemetry",
          text: "Our systems automatically log technical data such as IP addresses, browser fingerprints, and session metadata. This is critical for preventing fraudulent activities and bot-driven marketplace manipulation."
        },
        {
          heading: "Verification Documentation",
          text: "To maintain our 'Verified' status for freelancers, we may request government-issued identification. This data is encrypted at rest and only used for security auditing."
        }
      ]
    },
    {
      id: "usage",
      title: "Usage & Orchestration",
      icon: <Settings className="w-5 h-5" />,
      content: [
        {
          heading: "Service Optimization",
          text: "We use your data to personalize your marketplace feed, suggest relevant gigs, and facilitate communication between freelancers and clients."
        },
        {
          heading: "Transactional Security",
          text: "Data is used to power our secure escrow system, ensuring that payments are released only when milestones are met and verified."
        },
        {
          heading: "Legal Compliance",
          text: "We process data to comply with international labor laws, anti-money laundering (AML) regulations, and 'Know Your Customer' (KYC) requirements."
        }
      ]
    },
    {
      id: "cookies",
      title: "Cookies & Tracking",
      icon: <Fingerprint className="w-5 h-5" />,
      content: [
        {
          heading: "Essential Persistence",
          text: "We use session cookies to keep you logged in and functional cookies to remember your platform preferences (like dark mode or currency settings)."
        },
        {
          heading: "Performance Insights",
          text: "Anonymized tracking allows us to understand platform bottlenecks and optimize the checkout experience."
        }
      ]
    },
    {
      id: "protection",
      title: "Data Safeguards",
      icon: <ShieldCheck className="w-5 h-5" />,
      content: [
        {
          heading: "Encryption Protocols",
          text: "All data transmitted to SkillKart is protected using industry-standard 256-bit SSL encryption. Payment details are never stored on our servers; they are handled by PCI-DSS compliant partners."
        },
        {
          heading: "Access Control",
          text: "Internal access to user data is strictly limited to authorized security personnel under a 'need-to-know' basis."
        }
      ]
    },
    {
        id: "thirdparty",
        title: "Third-Party Logistics",
        icon: <Layers className="w-5 h-5" />,
        content: [
          {
            heading: "Payment Gateways",
            text: "We integrate with Stripe, PayPal, and local Pakistani payment providers. These partners have their own privacy standards which are audited by SkillKart."
          },
          {
            heading: "Infrastructure Providers",
            text: "Our platform is hosted on secure cloud infrastructure that meets global security standards (SOC2, ISO 27001)."
          }
        ]
    },
    {
      id: "rights",
      title: "Your Digital Rights",
      icon: <Users className="w-5 h-5" />,
      content: [
        {
          heading: "Access & Portability",
          text: "You have the right to request a full dump of your data in a machine-readable format at any time from your account settings."
        },
        {
          heading: "The Right to Erasure",
          text: "Users can request permanent account deletion. We will purge all personal data, retaining only what is legally required for financial auditing."
        }
      ]
    },
    {
        id: "contact",
        title: "Governance & Contact",
        icon: <Mail className="w-5 h-5" />,
        content: [
          {
            heading: "Policy Updates",
            text: "We update this policy periodically. Major changes will be announced via platform notifications and email."
          },
          {
            heading: "Contact our DPO",
            text: "If you have specific privacy concerns, contact our Data Protection Officer at privacy@skillkart.com."
          }
        ]
      }
  ]
};

// --- COMPONENTS ---

const NavItem = ({ section, activeId, onClick }) => {
  const isActive = activeId === section.id;
  
  return (
    <motion.li className="relative group">
      <button
        onClick={() => onClick(section.id)}
        className={`flex items-center gap-4 w-full text-left py-3 transition-all duration-300 ${
          isActive ? "text-black font-bold" : "text-gray-400 hover:text-gray-900"
        }`}
      >
        <span className={`p-2 rounded-xl transition-all duration-500 scale-90 group-hover:scale-100 ${
          isActive ? "bg-[#b3f5e1] text-black shadow-lg shadow-[#b3f5e1]/20" : "bg-gray-100"
        }`}>
          {section.icon}
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] font-black">{section.title}</span>
        
        {isActive && (
          <motion.div 
            layoutId="activePill"
            className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-black rounded-full"
          />
        )}
      </button>
    </motion.li>
  );
};

const ContentBlock = ({ section }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      id={section.id}
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      className="mb-24 last:mb-0"
    >
      <div className="flex items-center gap-6 mb-12">
        <div className="w-16 h-16 bg-black text-[#b3f5e1] rounded-[1.5rem] flex items-center justify-center shadow-xl rotate-3">
          {section.icon}
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-black tracking-tighter uppercase italic">
            {section.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {section.content.map((block, idx) => (
          <div key={idx} className="group p-8 rounded-[2rem] bg-gray-50 border border-transparent hover:border-[#b3f5e1] hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
            <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#b3f5e1]" />
                {block.heading}
            </h3>
            <p className="text-gray-500 leading-relaxed font-light text-lg">
                {block.text}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
};

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState("intro");
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Scroll Spy Logic
  useEffect(() => {
    const handleScroll = () => {
      const sections = privacyData.sections.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 200;

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
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 120,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-[#b3f5e1] selection:text-black">
      
      {/* --- HERO SECTION --- */}
      <section ref={heroRef} className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden bg-black pt-20">
        <motion.div 
            style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
            className="absolute inset-0"
        >
            <img 
                src={privacyData.hero.image} 
                alt="Privacy and Security" 
                className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </motion.div>

        {/* Unique Cyber-Grid Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: `radial-gradient(#b3f5e1 0.5px, transparent 0.5px)`, 
               backgroundSize: '30px 30px' 
             }} 
        />
        
        <div className="container mx-auto px-6 relative z-10">
            <motion.div
                initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="max-w-4xl"
            >
                <div className="flex items-center  mb-6">
                    <span className="w-12 h-[2px] bg-[#b3f5e1]" />
                    <span className="text-[#b3f5e1] text-xs font-black uppercase tracking-[0.5em]">
                        Document PS-2026
                    </span>
                </div>
                <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] mb-8 uppercase">
                    Privacy Policy
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 font-light max-w-2xl leading-relaxed mb-15">
                    {privacyData.hero.subtitle}
                </p>
                
                <div className="flex flex-wrap gap-6 mt-5">
                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold">
                        <Shield size={18} className="text-[#b3f5e1]" />
                        GDPR Compliant
                    </div>
                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold">
                        <Lock size={18} className="text-[#b3f5e1]" />
                        SSL Secured
                    </div>
                </div>
            </motion.div>
        </div>

        <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/50"
        >
            <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-black">Scroll to Explore</span>
                <div className="w-px h-12 bg-linear-to-b from-[#b3f5e1] to-transparent" />
            </div>
        </motion.div>
      </section>

      {/* --- CONTENT SPREAD --- */}
      <div className="container mx-auto px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-20">
            
            {/* LEFT: Premium Navigation */}
            <aside className="lg:col-span-3">
                <div className="sticky top-32">
                    <div className="mb-10">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-8">
                            Section Index
                        </h4>
                        <nav>
                            <ul className="space-y-2">
                                {privacyData.sections.map((section) => (
                                    <NavItem 
                                        key={section.id} 
                                        section={section} 
                                        activeId={activeSection}
                                        onClick={scrollToSection}
                                    />
                                ))}
                            </ul>
                        </nav>
                    </div>

                    {/* Meta Info */}
                    <div className="p-8 rounded-[2rem] bg-black text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#b3f5e1]/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <h5 className="text-xl font-black mb-4 italic tracking-tight">Last Revised</h5>
                        <p className="text-sm text-gray-400 mb-8 font-light leading-relaxed">
                            This policy was last updated on {privacyData.lastUpdated}. We recommend reviewing it quarterly.
                        </p>
                        <IconButton text="Download PDF" variant="secondary" className="!w-full !justify-center" />
                    </div>
                </div>
            </aside>

            {/* RIGHT: Editorial Content */}
            <div className="lg:col-span-9">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16 md:mb-24"
                >
                    <p className="text-xl md:text-2xl font-light text-gray-500 leading-relaxed border-l-4 border-[#b3f5e1] pl-8 italic">
                        {privacyData.hero.description}
                    </p>
                </motion.div>

                {privacyData.sections.map((section) => (
                   <ContentBlock key={section.id} section={section} />
                ))}

                {/* Final Trust Section */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="mt-16 md:mt-24 p-10 md:p-16 bg-gray-50 rounded-[3rem] text-center relative overflow-hidden border border-gray-100"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#b3f5e110_0%,_transparent_70%)]" />
                    <div className="relative z-10 flex flex-col items-center gap-5">
                        <Scale size={60} strokeWidth={1.5} className="text-black mb-6" />
                        <h2 className="text-4xl md:text-5xl font-black text-black tracking-tighter uppercase mb-6">
                            Any Concerns?
                        </h2>
                        <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto font-light leading-relaxed">
                            Our compliance team is dedicated to handling all data-related inquiries within 24 business hours.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-8 items-center">
                            <IconButton text="Email Compliance" variant="primary" />
                            <IconButton text="Support Center" variant="secondary" />
                        </div>
                    </div>
                </motion.div>
            </div>

        </div>
      </div>

      {/* --- FOOTER DECORATION --- */}
      <footer className="py-12 border-t border-gray-100">
          <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-[#b3f5e1] font-black">S</div>
                  <span className="text-sm font-black uppercase tracking-widest text-black">SkillKart Legal</span>
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-black text-center">
                  Secure Digital Marketplace Foundation © 2026
              </div>
          </div>
      </footer>

    </div>
  );
};

export default PrivacyPolicy;
