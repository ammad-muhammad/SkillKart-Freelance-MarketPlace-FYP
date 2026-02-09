import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { 
  Shield, Scale, Gavel, 
  Users, DollarSign, Copyright, Ban, 
  Terminal, ArrowDown, FileText, Info, 
  Check, FileCheck, ArrowUpRight, AlertTriangle,
  Layers, Globe, Fingerprint, Lock
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
const termsData = {
  lastUpdated: "January 20, 2026",
  hero: {
    title: "Terms of Service",
    subtitle: "The Legal Framework of the SkillKart Ecosystem.",
    description: "Welcome to SkillKart. These Terms of Service ('Terms') govern your access to and use of the SkillKart platform. By creating an account, you agree to be bound by these protocols that ensure a fair and safe marketplace for all.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2670&auto=format&fit=crop"
  },
  sections: [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: <FileCheck className="w-5 h-5" />,
      content: [
        {
          heading: "Contractual Binding",
          text: "By accessing or using SkillKart, you agree to comply with and be bound by these Terms and our Privacy Policy. These Terms apply to all visitors, users, and others who utilize our Service."
        },
        {
          heading: "Updates to Terms",
          text: "We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms."
        }
      ]
    },
    {
      id: "definitions",
      title: "Terminology",
      icon: <Terminal className="w-5 h-5" />,
      content: [
        {
          heading: "Platform Ecosystem",
          text: "Refers to the SkillKart website, mobile applications, and related services provided by SkillKart Inc."
        },
        {
          heading: "User Roles",
          text: "Any individual or entity who accesses or uses the Platform, including Freelancers (Sellers) and Clients (Buyers)."
        },
        {
          heading: "Digital Gigs",
          text: "A User who offers and performs services ('Gigs') for Clients through the Platform. Clients are Users who purchase these services."
        }
      ]
    },
    {
      id: "accounts",
      title: "Account Registration",
      icon: <Users className="w-5 h-5" />,
      content: [
        {
          heading: "Identity Veracity",
          text: "You must provide honest information. Using bots or false identities to manipulate our marketplace leads to permanent exclusion."
        },
        {
          heading: "Account Security",
          text: "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account."
        }
      ]
    },
    {
      id: "freelancers",
      title: "Freelancer Obligations",
      icon: <Gavel className="w-5 h-5" />,
      content: [
        {
          heading: "Service Quality",
          text: "Freelancers must perform services in a professional manner and deliver work that meets the specifications agreed upon with the Client."
        },
        {
          heading: "Contractor Autonomy",
          text: "Freelancers acknowledge that they are independent contractors and not employees of SkillKart. You are solely responsible for your own taxes and insurance."
        },
        {
          heading: "Prohibited Content",
          text: "You may not offer services that are illegal, violate intellectual property rights, or violate our Community Guidelines."
        }
      ]
    },
    {
      id: "payments",
      title: "Payments & Escrow",
      icon: <DollarSign className="w-5 h-5" />,
      content: [
        {
          heading: "Service Fees",
          text: "SkillKart charges a service fee on all transactions to cover platform maintenance. This fee is clearly displayed before any transaction."
        },
        {
          heading: "Neutral Escrow",
          text: "Payments are held in a secure neutral account until the Client marks the order as complete. Disputes are handled via our Resolution Center."
        },
        {
          heading: "Withdrawal Policy",
          text: "Funds can be withdrawn to connected bank accounts after a standard clearance period designed to prevent fraud."
        }
      ]
    },
    {
      id: "ip",
      title: "Intellectual Property",
      icon: <Copyright className="w-5 h-5" />,
      content: [
        {
          heading: "Ownership of Work",
          text: "Upon full payment, the Client is usually granted all intellectual property rights for the delivered work, unless special arrangements are documented."
        },
        {
          heading: "Platform IP",
          text: "The SkillKart logo, design, and original source code are the exclusive property of SkillKart Inc. and are protected by international law."
        }
      ]
    },
    {
      id: "prohibited",
      title: "Prohibited Activities",
      icon: <Ban className="w-5 h-5" />,
      content: [
        {
          heading: "Marketplace Integrity",
          text: "Spam, fraud, harassment, and off-platform payment attempts are strictly prohibited and result in immediate account termination."
        },
        {
          heading: "Circumvention",
          text: "Users may not communicate or transact outside the SkillKart platform for orders initiated on the platform to avoid service fees."
        }
      ]
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      icon: <AlertTriangle className="w-5 h-5" />,
      content: [
        {
          heading: "Liability Disclaimer",
          text: "SkillKart services are provided 'as is'. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform."
        }
      ]
    },
    {
      id: "termination",
      title: "Right of Exclusion",
      icon: <Shield className="w-5 h-5" />,
      content: [
        {
          heading: "Right to Terminate",
          text: "We reserve the right to suspend or terminate your account immediately if you breach these Terms or engage in conduct that harms the community."
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
            layoutId="activePillTerms"
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

const TermsOfServices = () => {
  const [activeSection, setActiveSection] = useState("acceptance");
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
      const sections = termsData.sections.map(s => document.getElementById(s.id));
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
                src={termsData.hero.image} 
                alt="Legal Framework" 
                className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
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
                <div className="flex items-center mb-6">
                    <span className="w-12 h-[2px] bg-[#b3f5e1]" />
                    <span className="text-[#b3f5e1] text-xs font-black uppercase tracking-[0.5em]">
                        Document TS-2026
                    </span>
                </div>
                <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] mb-8 uppercase">
                    Terms Of Service
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 font-light max-w-2xl leading-relaxed mb-15">
                    {termsData.hero.subtitle}
                </p>
                
                <div className="flex flex-wrap gap-6 mt-5">
                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold">
                        <Lock size={18} className="text-[#b3f5e1]" />
                        Secure Marketplace
                    </div>
                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold">
                        <Gavel size={18} className="text-[#b3f5e1]" />
                        Professional Standards
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
                            Platform Protocols
                        </h4>
                        <nav>
                            <ul className="space-y-2">
                                {termsData.sections.map((section) => (
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
                            These terms were last updated on {termsData.lastUpdated}. Usage of the platform constitutes agreement.
                        </p>
                        <IconButton text="Legal PDF" variant="secondary" className="!w-full !justify-center" />
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
                        {termsData.hero.description}
                    </p>
                </motion.div>

                {termsData.sections.map((section) => (
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
                            Understood Everything?
                        </h2>
                        <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto font-light leading-relaxed text-center">
                            By continuing to build on SkillKart, you acknowledge and agree to the platform protocols outlined above.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-8 items-center">
                            <IconButton text="I Agree & Accept" variant="primary" />
                            <IconButton text="Talk to Legal Team" variant="secondary" />
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

export default TermsOfServices;