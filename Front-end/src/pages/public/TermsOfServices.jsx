import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { 
  ArrowUpRight, Shield, Scale, Gavel,  
  Users, DollarSign, Copyright, AlertTriangle, 
  FileCheck, Ban, Terminal 
} from "lucide-react";

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
const termsData = {
  lastUpdated: "January 20, 2026",
  intro: {
    title: "Terms of Service",
    subtitle: "Please read these terms carefully before exploring the SkillKart ecosystem.",
    description: "Welcome to SkillKart. These Terms of Service ('Terms') govern your access to and use of the SkillKart platform, website, and services. By creating an account or accessing our platform, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use usage of our Services."
  },
  sections: [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: <FileCheck size={20} />,
      content: [
        {
          heading: "Agreement",
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
      title: "Definitions",
      icon: <Terminal size={20} />,
      content: [
        {
          heading: "Platform",
          text: "Refers to the SkillKart website and related services provided by SkillKart Inc."
        },
        {
          heading: "User",
          text: "Any individual or entity who accesses or uses the Platform, including Freelancers and Clients."
        },
        {
          heading: "Freelancer",
          text: "A User who offers and performs services ('Gigs') for Clients through the Platform."
        },
        {
          heading: "Client",
          text: "A User who purchases services ('Gigs') from Freelancers through the Platform."
        }
      ]
    },
    {
      id: "accounts",
      title: "Account Registration",
      icon: <Users size={20} />,
      content: [
        {
          heading: "Eligibility",
          text: "You must be at least 18 years old to create an account on SkillKart. By creating an account, you represent and warrant that you are capable of entering into a binding contract."
        },
        {
          heading: "Account Security",
          text: "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. SkillKart is not liable for any loss or damage arising from your failure to protect your account."
        }
      ]
    },
    {
      id: "freelancers",
      title: "Freelancer Obligations",
      icon: <Gavel size={20} />,
      content: [
        {
          heading: "Service Quality",
          text: "Freelancers must perform services in a professional manner and deliver work that meets the specifications agreed upon with the Client."
        },
        {
          heading: "Independence",
          text: "Freelancers acknowledge that they are independent contractors and not employees, partners, or agents of SkillKart. You are solely responsible for your own taxes and insurance."
        },
        {
          heading: "Prohibited Content",
          text: "You may not offer services that are illegal, violate intellectual property rights, or violate our Community Guidelines."
        }
      ]
    },
    {
      id: "payments",
      title: "Payments & Fees",
      icon: <DollarSign size={20} />,
      content: [
        {
          heading: "Service Fees",
          text: "SkillKart charges a service fee on all transactions to cover platform maintenance and support. This fee is deducted automatically from the payment released to the Freelancer."
        },
        {
          heading: "Escrow System",
          text: "Payments are held in escrow until the Client marks the order as complete. This ensures security for both parties. Disputes are handled via our Resolution Center."
        },
        {
          heading: "Withdrawals",
          text: "Funds can be withdrawn to your connected bank account or payment method after a standard clearance period."
        }
      ]
    },
    {
      id: "ip",
      title: "Intellectual Property",
      icon: <Copyright size={20} />,
      content: [
        {
          heading: "Ownership of Work",
          text: "Unless otherwise clearly stated in the Gig description, when the work is delivered and paid for, the Client is granted all intellectual property rights, including but not limited to, copyright in the work delivered from the Freelancer."
        },
        {
          heading: "Platform IP",
          text: "The SkillKart logo, design, and original content are the exclusive property of SkillKart Inc. and are protected by copyright and benchmark laws."
        }
      ]
    },
    {
      id: "prohibited",
      title: "Prohibited Activities",
      icon: <Ban size={20} />,
      content: [
        {
          heading: "Zero Tolerance",
          text: "We strictly prohibit spam, fraud, harassment, hate speech, and the distribution of malware. Engaging in such activities will result in immediate account suspension."
        },
        {
          heading: "Circumvention",
          text: "Users may not communicate or transact outside the SkillKart platform for orders initiated on SkillKart to avoid service fees. This is a violation of our Terms."
        }
      ]
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      icon: <AlertTriangle size={20} />,
      content: [
        {
          heading: "Disclaimer",
          text: "SkillKart services are provided 'as is'. We expressly disclaim all warranties, whether express or implied. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform."
        }
      ]
    },
    {
      id: "termination",
      title: "Termination",
      icon: <Shield size={20} />,
      content: [
        {
          heading: "Right to Terminate",
          text: "We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms."
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
const TermsOfServices = () => {
  const [activeSection, setActiveSection] = useState("acceptance");
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
      const sections = termsData.sections.map(s => document.getElementById(s.id));
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
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2670&auto=format&fit=crop" 
            alt="Terms and Conditions Legal" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-[#b3f5e1]/10 border border-[#b3f5e1]/30 text-[#b3f5e1] text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
              Effective from {termsData.lastUpdated}
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-8 leading-[0.9]">
              {termsData.intro.title}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto text-center">
              {termsData.intro.subtitle}
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
                  Table of Contents
                </h4>
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
                {termsData.intro.description}
              </p>
            </motion.div>

            {/* Dynamic Sections */}
            <div>
              {termsData.sections.map((section, index) => (
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
              <Scale className="w-16 h-16 mx-auto text-black mb-8" />
              <h3 className="text-3xl font-bold mb-6">Need Legal Clarification?</h3>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto text-center">
                If you have questions regarding our terms, intellectual property disputes, or platform rules, our legal team is here to assist you.
              </p>
              <button className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-full font-bold transition-all hover:shadow-xl hover:-translate-y-1 flex items-center gap-2 mx-auto mt-5">
                Contact Legal Team <ArrowUpRight size={18} />
              </button>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServices;