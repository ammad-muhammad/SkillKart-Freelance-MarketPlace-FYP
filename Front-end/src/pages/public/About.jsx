
import React, { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { 
  Users, 
  ShieldCheck, 
  Award, 
  Heart, 
  ArrowUpRight, 
  CheckCircle2, 
  Briefcase, 
  Globe2 
} from "lucide-react";
import HomeBanner from "../../Components/common/Banners/HomeBanner";

// --- ANIMATION VARIANTS (Consistent with Contact.jsx) ---
const fadeInUp = {
  hidden: { opacity: 0, y: 60, filter: "blur(10px)" },
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
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(10px)" },
  visible: { 
    opacity: 1, 
    scale: 1, 
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

// --- REUSABLE COMPONENTS ---

const SectionHeading = ({ children, className = "" }) => (
  <motion.h2 
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-100px" }}
    variants={fadeInUp}
    className={`text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-8 ${className}`}
  >
    {children}
  </motion.h2>
);

const StatCard = ({ number, label, suffix = "+" }) => {
    return (
        <motion.div 
            variants={fadeInUp}
            className="flex flex-col items-center md:items-start text-center md:text-left"
        >
            <h3 className="text-6xl md:text-7xl font-bold text-[#b3f5e1] mb-2 font-mono">
                {number}{suffix}
            </h3>
            <p className="text-white/80 text-lg uppercase tracking-wider font-medium">{label}</p>
        </motion.div>
    )
}

const ValueCard = ({ iconName, title, description }) => {
  const IconMap = { Users, ShieldCheck, Award, Globe2, Heart, CheckCircle2, Briefcase };
  const Icon = IconMap[iconName] || Users;

  return (
    <motion.div 
      variants={scaleIn}
      className="group p-8 rounded-3xl bg-[#f9f9f9] hover:bg-white hover:shadow-xl transition-all duration-500 border border-transparent hover:border-[#b3f5e1]/50"
    >
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#b3f5e1] transition-colors duration-500">
        <Icon size={28} className="text-gray-900" />
      </div>
      <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:tracking-wide transition-all">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm md:text-base">
        {description}
      </p>
    </motion.div>
  );
};

const TeamMember = ({ name, role, img }) => (
  <motion.div 
    variants={fadeInUp}
    className="group relative overflow-hidden"
  >
    <div className="relative overflow-hidden rounded-2xl aspect-[3/4] mb-6">
      <motion.img 
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.5 }}
        src={img} 
        alt={name}
        className="w-full h-full object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
    <h4 className="text-xl font-bold text-gray-900">{name}</h4>
    <p className="text-gray-500 font-medium text-sm result-sm uppercase tracking-wider bg-gray-100 inline-block px-3 py-1 rounded mt-2 group-hover:bg-black group-hover:text-white transition-colors">
        {role}
    </p>
  </motion.div>
);

// --- MAIN PAGE COMPONENT ---

const About = () => {
  const containerRef = useRef(null);
  const sectionRef = useRef(null);
  const { getPage } = useCMS();
  const page = getPage('about');
  
  // Localized Parallax for the "Our Story" section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);

  if (!page) return null;

  const getSection = (id) => page.sections?.find(s => s.id === id)?.content || {};

  const hero = getSection('about-hero');
  const mission = getSection('about-mission');
  const stats = getSection('about-stats');
  const team = getSection('about-team');
  const standards = getSection('about-standards');
  const cta = getSection('about-cta');

  const teamMembers = [
    { name: 'Muhammad Ammad', role: "CEO", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
    { name: 'Sumair', role: "Founder", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
    { name: 'Sherry', role: "Co-Founder", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
    { name: 'Shammer', role: "Marketing", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
    { name: 'Syed Obaid', role: "CO-CEO", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
    { name: 'Lamiz Khan', role: "QA Lead", img: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg" },
  ];

  return (
    <div ref={containerRef} className="bg-white min-h-screen font-sans selection:bg-[#b3f5e1] selection:text-black">
      
      {/* 1. PREMIUM HERO SECTION */}
      <HomeBanner
        backgroundImage={hero.images?.main}
        searchIcon="/assets/icons/ic-search.svg"
        titleStart={hero.heading?.line1}
        titleEnd={hero.heading?.line2}
        subtitle={hero.subHeading}
        descriptionOne={hero.description?.[0] || ""}
        descriptionTwo={hero.description?.[2] || ""}
        searchPlaceholder="What skill are you looking for?"
        showSearch={false}
        showDescription={false}
        showBlur={true}
        isFullWidth={true}
      />

      {/* 2. OUR STORY SECTION */}
      <section ref={sectionRef} className="px-6 md:px-16 lg:px-24 py-10 lg:py-16 grid lg:grid-cols-2 gap-16 items-center overflow-hidden">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="order-2 lg:order-1"
        >
            <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-6">
                <span className="h-px w-8 bg-black"></span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{hero.subHeading}</span>
            </motion.div>
            
            <SectionHeading>
                {hero.heading?.line1} <br/> 
                <span className="text-gray-800 font-serif italic">{hero.heading?.line2}</span>
            </SectionHeading>

            <motion.div variants={fadeInUp} className="space-y-6 text-gray-600 text-lg leading-relaxed">
                {hero.description?.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </motion.div>

            <motion.button 
                variants={fadeInUp}
                className="mt-10 group relative px-8 py-4 bg-black border border-transparent rounded-full text-white font-bold flex items-center justify-center overflow-hidden transition-all duration-500 shadow-lg hover:bg-white hover:text-black"
            >
                <div className="relative flex items-center overflow-hidden h-5">
                    <div className="flex items-center gap-2 transition-all duration-500 ease-in-out group-hover:-translate-y-full">
                        <span className="whitespace-nowrap">{hero.ctaButton}</span>
                        <ArrowUpRight size={18} />
                    </div>
                    
                    <div className="absolute inset-0 flex items-center gap-2 translate-y-full transition-all duration-500 ease-in-out group-hover:translate-y-0 text-black">
                        <span className="whitespace-nowrap">{hero.ctaButton}</span>
                        <ArrowUpRight size={18} />
                    </div>
                </div>
            </motion.button>
        </motion.div>

        <motion.div 
            className="relative order-1 lg:order-2 aspect-4/5 lg:aspect-3/4 w-full rounded-[3rem] overflow-hidden shadow-2xl"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
        >
            <motion.img 
                style={{ y: y1 }}
                src={hero.images?.main}
                className="absolute -inset-y-[20%] w-full h-[140%] object-cover object-center"
                alt="Team collaboration"
            />
            
            {/* Floating Badge */}
            <motion.div 
                style={{ y: y2 }}
                className="absolute bottom-10 left-10 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl max-w-xs border border-white/50"
            >
                <div className="text-5xl font-serif italic mb-2">"</div>
                <p className="font-medium text-gray-900 mb-4">
                  {hero.quote?.text}
                </p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        <img src={hero.images?.founder} alt="Founder" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider">{hero.quote?.author}</div>
                        <div className="text-[10px] text-gray-500">{hero.quote?.role}</div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
      </section>

      {/* 3. MISSION & VALUES SECTION */}
      <section className="px-6 md:px-16 lg:px-24 py-20 bg-gray-50">
        <div className="text-center max-w-3xl mx-auto mb-20">
            <h4 className="text-xs font-black uppercase text-[#b3f5e1] bg-black inline-block px-3 py-1 rounded mb-6 tracking-widest">
                {mission.badge}
            </h4>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-gray-900">
                {mission.title}
            </h2>
            <p className="mt-6 text-gray-500">
                {mission.description}
            </p>
        </div>

        <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
            {mission.values?.map((value, index) => (
                <ValueCard 
                    key={index}
                    iconName={value.icon} 
                    title={value.title}
                    description={value.description}
                />
            ))}
        </motion.div>
      </section>

      {/* 4. IMPACT STATS SECTION */}
      <section className="bg-[#111] text-white py-24 px-6 md:px-16 lg:px-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#b3f5e1]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative rounded-3xl overflow-hidden aspect-square lg:aspect-[4/3]"
            >
                <img 
                    src={stats.image}
                    className="w-full h-full object-cover"
                    alt="Impact" 
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 to-transparent" />
            </motion.div>

            <div className="space-y-16">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">
                        {stats.title?.line1} <br/>
                        <span className="text-[#b3f5e1]">{stats.title?.line2}</span>
                    </h2>
                    <h5 className="text-gray-400 text-lg max-w-md">
                        {stats.description}
                    </h5>
                </motion.div>

                <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    className="grid grid-cols-2 gap-10"
                >
                    {stats.metrics?.map((metric, index) => (
                        <StatCard 
                            key={index}
                            number={metric.number} 
                            label={metric.label} 
                            suffix={metric.suffix} 
                        />
                    ))}
                </motion.div>
            </div>
        </div>
      </section>

      {/* 5. TEAM SECTION */}
      <section className="px-6 md:px-16 lg:px-24 py-24">
        <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">The Minds Behind SkillKart</h2>
            <p className="text-gray-500">{team.description}</p>
        </div>

        <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
            {teamMembers.map((member, index) => (
                <TeamMember 
                    key={index}
                    name={member.name} 
                    role={member.role} 
                    img={member.img} 
                />
            ))}
        </motion.div>
      </section>

      {/* 6. STANDARDS SECTION */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="text-center px-6">
             <h3 className="text-2xl font-serif italic text-gray-400 mb-10">{standards.title}</h3>
             
             <motion.div 
                initial="hidden"
                whileInView="visible"
                variants={staggerContainer}
                className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto mt-10"
             >
                {standards.tags?.map((tag, i) => (
                    <motion.div
                        key={i}
                        variants={scaleIn}
                        className="px-6 py-2 rounded-full bg-gray-50 border border-gray-100 text-gray-600 font-medium hover:bg-black hover:text-white hover:border-black transition-all cursor-default text-sm md:text-base"
                    >
                        {tag}
                    </motion.div>
                ))}
             </motion.div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-24 bg-[#e1efec] text-center">
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
        >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 text-black">{cta.title}</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-6 mt-10">
                <button className="group relative px-10 py-4 bg-black border border-transparent rounded-full text-white font-bold flex items-center justify-center overflow-hidden transition-all duration-500 hover:bg-white hover:text-black">
                     <div className="relative flex items-center overflow-hidden h-5">
                        <div className="flex items-center gap-2 transition-all duration-500 ease-in-out group-hover:-translate-y-full">
                            <span className="whitespace-nowrap">{cta.buttons?.primary}</span>
                            <ArrowUpRight size={18} />
                        </div>
                        <div className="absolute inset-0 flex items-center gap-2 translate-y-full transition-all duration-500 ease-in-out group-hover:translate-y-0 text-white group-hover:text-black">
                            <span className="whitespace-nowrap">{cta.buttons?.primary}</span>
                            <ArrowUpRight size={18} />
                        </div>
                    </div>
                </button>
                <button className="group relative px-10 py-4 bg-white border border-transparent rounded-full text-black font-bold flex items-center justify-center overflow-hidden transition-all duration-500 hover:bg-black hover:text-white">
                     <div className="relative flex items-center overflow-hidden h-5">
                        <div className="flex items-center gap-2 transition-all duration-500 ease-in-out group-hover:-translate-y-full">
                            <span className="whitespace-nowrap">{cta.buttons?.secondary}</span>
                            <ArrowUpRight size={18} />
                        </div>
                        <div className="absolute inset-0 flex items-center gap-2 translate-y-full transition-all duration-500 ease-in-out group-hover:translate-y-0 text-black group-hover:text-white">
                            <span className="whitespace-nowrap">{cta.buttons?.secondary}</span>
                            <ArrowUpRight size={18} />
                        </div>
                    </div>
                </button>
            </div>
        </motion.div>
      </section>
    </div>
  );
};

export default About;