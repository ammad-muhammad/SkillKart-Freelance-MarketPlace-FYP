import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  Briefcase, 
  DollarSign, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  Scale,
  BrainCircuit,
  Rocket,
  Search,
  MessageSquare,
  CreditCard,
  Award,
  Users,
  Globe,
  Zap
} from "lucide-react";

// --- UTILS ---
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// --- THREE.JS BACKGROUND ---
const ThreeBackground = () => {
    const mountRef = useRef(null);
  
    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;
  
      // Scene Setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
  
      // Particles
      const particlesGeometry = new THREE.BufferGeometry();
      const count = 1500; // Number of particles
      const posArray = new Float32Array(count * 3);
  
      for(let i = 0; i < count * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 15; // Spread
      }
  
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  
      const particlesMaterial = new THREE.PointsMaterial({
        size: 0.015,
        color: '#52525b', // Zinc-600 subtle gray
        transparent: true,
        opacity: 0.4,
      });
  
      const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particlesMesh);
  
      camera.position.z = 3;
  
      // Mouse Interaction
      let mouseX = 0;
      let mouseY = 0;
  
      const animateParticles = (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
      };
      
      window.addEventListener('mousemove', animateParticles);
  
      // Animation Loop
      const clock = new THREE.Clock();
  
      const tick = () => {
        const elapsedTime = clock.getElapsedTime();
  
        // Gentle rotation
        particlesMesh.rotation.y = elapsedTime * 0.05;
        particlesMesh.rotation.x = elapsedTime * 0.02;
  
        // Mouse interaction influence (subtle)
        particlesMesh.rotation.x += mouseY * 0.00005;
        particlesMesh.rotation.y += mouseX * 0.00005;
  
        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);
      };
  
      tick();
  
      // Resize Handle
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
  
      window.addEventListener('resize', handleResize);
  
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', animateParticles);
        if (mount.contains(renderer.domElement)) {
            mount.removeChild(renderer.domElement);
        }
        particlesGeometry.dispose();
        particlesMaterial.dispose();
      };
    }, []);
  
    return <div ref={mountRef} className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-60" />;
};

// --- DATA ---

const TABS = [
  { id: 'work', label: 'I Want to Work' },
  { id: 'hire', label: 'I Want to Hire' }
];

const CONTENT = {
  freelancerSteps: [
    {
      id: 1,
      title: "Register & Get Verified",
      subtitle: "Join the Elite",
      desc: "Create your profile with basic details. Unlike other platforms, we require a quick verification of your institute email or CV to ensure a high-quality talent pool.",
      icon: UserCheck,
      image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=1000",
      tags: ["Identity Check", "CV Review", "Fast Approval"]
    },
    {
      id: 2,
      title: "Pass the Skill Test",
      subtitle: "Prove Your Worth",
      desc: "Take a specialized skill test related to your field. No degree? No problem. If you have the skills, you're in. This badge proves to clients you know your stuff.",
      icon: BrainCircuit,
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1000",
      tags: ["Skill Assessment", "Badges", "Trust Building"]
    },
    {
      id: 3,
      title: "Start Selling & Bidding",
      subtitle: "Launch Your Career",
      desc: "Once verified, your profile gets the 'SkillKart Verified' badge. Post gigs, bid on projects, or sell your time hourly. Clients trust verified profiles more.",
      icon: Briefcase,
      image: "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=1000",
      tags: ["Create Gigs", "Bid on Jobs", "Hourly Contracts"]
    },
    {
      id: 4,
      title: "Secure Payments (30% Upfront)",
      subtitle: "Get Paid Safely",
      desc: "Never work for free again. Clients deposit 30% before you start. If a project is cancelled unfairly, our dispute team ensures you get paid for what you did.",
      icon: ShieldCheck,
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1000",
      tags: ["Escrow Protection", "Upfront Deposit", "Dispute Resolution"]
    },
    {
      id: 5,
      title: "Deliver & Withdraw",
      subtitle: "Enjoy Your Earnings",
      desc: "Submit your work, get approved, and the remaining funds are released instantly. Withdraw to local Pakistani banks or mobile wallets easily.",
      icon: DollarSign,
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1000",
      tags: ["Instant Release", "Local Banks", "Easy2Plain"]
    }
  ],
  clientSteps: [
    {
      id: 1,
      title: "Post a Project",
      subtitle: "Tell Us What You Need",
      desc: "Describe your project in detail. Whether it's a quick logo design or a full-scale web app, posting is free and easy.",
      icon: Briefcase,
      image: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=1000",
      tags: ["Free Posting", "Detailed Briefs", "AI Assistance"]
    },
    {
      id: 2,
      title: "Hire the Perfect Match",
      subtitle: "Verified Talent Only",
      desc: "Browse proposals from 'SkillKart Verified' freelancers. Chat in real-time, compare portfolios, and select the best fit for your budget.",
      icon: Search,
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000",
      tags: ["Verified Pro", "Chat & Interview", "Compare Bids"]
    },
    {
      id: 3,
      title: "Secure Milestone Payments",
      subtitle: "Your Money is Safe",
      desc: "Deposit 30% upfront to start the project. This funds are held safely by SkillKart until you are satisfied with the milestones.",
      icon: ShieldCheck,
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1000",
      tags: ["Escrow System", "Milestone Based", "Safe Deposit"]
    },
    {
      id: 4,
      title: "Collaborate & Track",
      subtitle: "Stay in Control",
      desc: "Use our dashboard to track progress, share files, and communicate. Approving milestones releases payment to the freelancer.",
      icon: MessageSquare,
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=1000",
      tags: ["File Sharing", "Progress Tracking", "24/7 Support"]
    }
  ]
};

const COMMON_SECTIONS = [
  {
    title: "Freelancer Ranking & Fair Visibility",
    desc: "Our algorithm prioritizes skill over seniority. Newcomers with verified skills get equal visibility for small gigs.",
    icon: TrendingUp,
    tags: ["Merit Based", "Fair Chance"]
  },
  {
    title: "AI Smart Assistance",
    desc: "Get intelligent pricing suggestions, skill-gap analysis, and automated project briefs to save time.",
    icon: Sparkles,
    tags: ["Smart Pricing", "Career Guide"]
  },
  {
    title: "Dispute & Fair Play",
    desc: "Human-reviewed disputes ensure clients aren't scammed and freelancers aren't exploited.",
    icon: Scale,
    tags: ["Human Review", "No Bots"]
  }
];

const STATS = [
  { label: "Active Freelancers", value: "5,000+", icon: Users },
  { label: "Projects Completed", value: "12,000+", icon: CheckCircle2 },
  { label: "Client Satisfaction", value: "98%", icon: Award },
  { label: "Secure Transactions", value: "$2M+", icon: ShieldCheck }
];

// --- COMPONENTS ---

// Animated Counter Component (Simple implementation)
const Counter = ({ value, label, icon: Icon }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="text-center space-y-2 p-6 rounded-2xl bg-gray-50 hover:bg-[#b3f5e1]/10 transition-colors cursor-pointer group"
  >
    <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-black group-hover:scale-110 transition-transform">
      <Icon size={24} />
    </div>
    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">{value}</h3>
    <p className="text-gray-500 font-medium text-sm">{label}</p>
  </motion.div>
);

// Alternating Step Card
const ProcessStep = ({ step, index }) => {
  const isEven = index % 2 === 0;
  
  return (
    <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-20 py-12 lg:py-20 relative`}>
        
        {/* Connecting Line (Desktop) */}
        {index !== 4 && index !== 3 && ( // Adjust based on total items, mostly visual helper
            <div className={`hidden lg:block absolute top-1/2 left-1/2 w-0.5 h-32 bg-gradient-to-b from-gray-200 to-transparent -translate-x-1/2 translate-y-20 ${index % 2 !== 0 ? 'opacity-0' : ''}`} />
        )}

        {/* Text Side */}
        <motion.div 
            initial={{ opacity: 0, x: isEven ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex-1 space-y-6 text-center lg:text-left"
        >
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#b3f5e1]/20 text-black font-semibold text-sm ${!isEven && 'lg:ml-auto'} mx-auto lg:mx-0`}>
                <span className="w-6 h-6 rounded-full bg-[#b3f5e1] flex items-center justify-center text-xs border border-green-200">{step.id}</span>
                {step.subtitle}
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {step.title}
            </h3>
            
            <p className="text-lg text-gray-600 leading-relaxed">
                {step.desc}
            </p>

            <div className="flex flex-wrap gap-3 mt-5 justify-center">
                {step.tags && step.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-500">
                        {tag}
                    </span>
                ))}
            </div>
        </motion.div>

        {/* Image Side */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: isEven ? -2 : 2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="flex-1 relative w-full h-[300px] md:h-[400px] group"
        >
            <div className={`absolute inset-0 bg-[#b3f5e1] rounded-[2rem] transform ${isEven ? 'rotate-3' : '-rotate-3'} group-hover:rotate-0 transition-transform duration-500 opacity-20`} />
            <div className="absolute inset-0 bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 transform transition-transform duration-500 hover:scale-[1.02]">
                <img 
                    src={step.image} 
                    alt={step.title}
                    className="w-full h-full object-cover"
                />
                
                {/* Floating Icon */}
                <div className="absolute bottom-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg text-black">
                    <step.icon size={32} strokeWidth={1.5} />
                </div>
            </div>
        </motion.div>
    </div>
  )
}

// ... unchanged components ...

const Hero = () => {
    const titleRef = useRef(null);
    const textRef = useRef(null);
    const imageRef = useRef(null);
  
    // GSAP Entrance
    useEffect(() => {
      const tl = gsap.timeline();
      
      tl.fromTo(titleRef.current, 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power4.out" }
      )
      .fromTo(textRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        "-=0.5"
      )
      .fromTo(imageRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.2, ease: "expo.out" },
        "-=0.8"
      );
    }, []);
  
    return (
      <section className="relative pt-32 pb-20 px-6 md:px-12 lg:px-24 overflow-hidden">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
            
            {/* Text Side */}
            <div className="flex-1 text-center md:text-left z-10 ">
                <div ref={titleRef} className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white/50 backdrop-blur-sm text-sm font-semibold text-gray-600 shadow-sm mx-auto md:mx-0">
                        <Sparkles size={16} className="text-[#b3f5e1] fill-[#b3f5e1]" />
                        <span>Simple. Transparent. Secure.</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                        How <span className="relative whitespace-nowrap">
                            SkillKart
                            <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#b3f5e1]/80 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="5" fill="none" />
                            </svg>
                        </span> Works
                    </h1>
                </div>
                <br/>
                <p ref={textRef} className="mt-8 text-xl text-gray-600 max-w-lg mx-auto md:mx-0 leading-relaxed">
                    Whether you're a skilled student looking to earn or a business scaling up, we've simplified the process to just a few steps.
                </p>

                <div 
                  className="mt-10 flex flex-wrap justify-center md:justify-start gap-6 text-sm font-medium text-gray-500"
                >
                    {["Verified Freelancers", "Escrow Protection", "Fast Hiring"].map(feature => (
                        <div key={feature} className="flex items-center gap-2">
                             <CheckCircle2 size={16} className="text-[#b3f5e1]" strokeWidth={3} /> {feature}
                        </div>
                    ))}
                </div>
            </div>

            {/* Image Side */}
            <div ref={imageRef} className="flex-1 w-full relative">
                <div className="relative aspect-[4/3] w-full max-w-lg mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#b3f5e1] to-blue-50 rounded-[3rem] rotate-6 opacity-30 blur-2xl" />
                    <div className="absolute inset-0 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-700">
                         <img 
                            src="https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1000"
                            alt="Team collaboration" 
                            className="w-full h-full object-cover"
                         />
                    </div>
                    {/* Floating Badge */}
                    <div className="absolute -bottom-6 -left-6 z-20 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-4 animate-bounce-slow">
                        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Average Speed</p>
                            <p className="text-lg font-bold">24 Hrs to Hire</p>
                        </div>
                    </div>
                </div>
            </div>

         </div>
      </section>
    );
};

// --- MAIN PAGE ---

const HowItWorks = () => {
  const [activeTab, setActiveTab] = useState('work');

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#b3f5e1] relative">
      <ThreeBackground />

      {/* Hero */}
      <Hero />

      {/* Stats Section */}
      <section className="py-12 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
                <Counter key={i} {...stat} />
            ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="px-6 md:px-12 lg:px-24 py-24">
        <div className="max-w-7xl mx-auto">
            
            {/* Tab Controls */}
            <div className="flex justify-center mb-24 z-30">
                <div className="bg-white/80 p-2 rounded-full inline-flex relative backdrop-blur-xl border border-gray-200 shadow-lg">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={classNames(
                                "relative px-10 py-4 rounded-full text-base font-bold transition-colors duration-300 z-10 outline-none",
                                activeTab === tab.id ? "text-black" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-[#b3f5e1] rounded-full shadow-sm"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="space-y-0">
                        {activeTab === 'work' ? (
                            CONTENT.freelancerSteps.map((step, idx) => (
                                <ProcessStep key={idx} step={step} index={idx} isAlternate={true} />
                            ))
                        ) : (
                            CONTENT.clientSteps.map((step, idx) => (
                                <ProcessStep key={idx} step={step} index={idx} isAlternate={true} />
                            ))
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

        </div>
      </section>

      {/* Why SkillKart */}
      <section className="px-6 md:px-16 lg:px-24 py-24 bg-white text-gray-900 border-t border-gray-100 relative overflow-hidden">
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center text-center mb-20 space-y-4 gap-5" >
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 ">Why Choose SkillKart?</h2>
                <p className="text-gray-500 text-lg max-w-3xl leading-relaxed text-center ">
                    We're building a community where skills matter more than certificates, and trust is built into every transaction.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {COMMON_SECTIONS.map((section, idx) => (
                    <div key={idx} className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-lg hover:border-[#b3f5e1] transition-all duration-300 group">
                        <section.icon size={40} className="text-gray-400 mb-6 group-hover:scale-110 group-hover:text-black transition-all" />
                        <h3 className="text-2xl font-bold mb-4">{section.title}</h3>
                        <p className="text-gray-600 leading-relaxed mb-6">
                            {section.desc}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {section.tags.map((tag, i) => (
                                <span key={i} className="text-xs font-semibold px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-600">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                 ))}
            </div>

            {/* CTA */}
            <div className="mt-32 p-12 lg:p-16 bg-[#b3f5e1] rounded-[3rem] text-center text-black relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -ml-16 -mb-16" />
                
                <h2 className="text-3xl md:text-5xl font-bold mb-20 tracking-tight">Success Starts Here.</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-5 mt-5" >
                    <button className="px-6 py-3 bg-black text-white rounded-full font-bold text-base hover:bg-gray-900 transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg">
                        Join as Freelancer <ArrowRight size={18} />
                    </button>
                    <button className="px-6 py-3 bg-white/60 backdrop-blur-md text-black border border-black/5 rounded-full font-bold text-base hover:bg-white transition-all hover:scale-105 flex items-center justify-center gap-2">
                        Post a Job <ArrowRight size={18} />
                    </button>
                </div>
            </div>
         </div>
      </section>

    </div>
  )
}

export default HowItWorks