import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { 
    Github, 
    Linkedin, 
    Mail, 
    Sparkles, 
    ArrowRight, 
    Check, 
    X, 
    ChevronDown, 
    ShieldCheck, 
    Lock, 
    Star, 
    Zap, 
    CheckCircle2,
    Compass,
    GraduationCap,
    TrendingUp,
    Award
} from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import './About.css';

import mineImg from '../../../assets/mine.jpeg';
import lamizImg from '../../../assets/lamiz.jpeg';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────── DATA (EXACT UNCHANGED CONTENT) ─────────────────────── */

const TEAM_MEMBERS = [
    {
        name: 'Muhammad Ammad',
        role: 'Founder & Lead Full-Stack Architect (CEO)',
        badge: 'FYP Lead Architect',
        bio: 'Lead Developer & Architect behind SkillKart. Spearheaded the full-stack architecture, AI Buddy engine, real-time messaging, and secure transaction workflows.',
        image: mineImg,
        socials: {
            github: 'https://github.com',
            linkedin: 'https://linkedin.com',
            email: 'mailto:ammad@skillkart.com'
        }
    },
    {
        name: 'Lamiz Afridi',
        role: 'Co-Founder & Lead AI Engineer (CTO)',
        badge: 'AI & Verification Specialist',
        bio: 'Core AI Engineer driving skill-matching intelligence, automated portfolio analysis, and credential verification algorithms that power student credibility.',
        image: lamizImg,
        socials: {
            github: 'https://github.com',
            linkedin: 'https://linkedin.com',
            email: 'mailto:neha.lamiz@skillkart.com'
        }
    },
    {
        name: 'Neha Izhar',
        role: 'Co-Founder & Head of Product Design (CPO)',
        badge: 'UX & Product Lead',
        bio: 'Architect of SkillKart\'s design identity and user experience. Focused on creating an intuitive, accessible interface that empowers student freelancers.',
        image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
        socials: {
            github: 'https://github.com',
            linkedin: 'https://linkedin.com',
            email: 'mailto:neha.izhar@skillkart.com'
        }
    }
];

const HOW_IT_WORKS = [
    {
        step: '01',
        icon: '🎓',
        title: 'Create Your Profile',
        desc: 'Sign up with your university email, build your profile, and showcase your skills, projects, and credentials in minutes.',
    },
    {
        step: '02',
        icon: '🤖',
        title: 'Get AI-Verified',
        desc: 'Our Buddy AI analyzes your skills, portfolio, and credentials to generate a verified badge that tells clients you\'re the real deal.',
    },
    {
        step: '03',
        icon: '🔍',
        title: 'Discover Opportunities',
        desc: 'Smart matchmaking surfaces projects perfectly aligned to your skill level, location, and goals — no endless scrolling required.',
    },
    {
        step: '04',
        icon: '💼',
        title: 'Collaborate & Deliver',
        desc: 'Use built-in milestones, secure messaging, and escrow payments to deliver great work and build your reputation.',
    },
    {
        step: '05',
        icon: '📈',
        title: 'Grow & Earn',
        desc: 'Track earnings, receive AI-driven growth suggestions, and climb the leaderboard as you complete more projects.',
    },
];

const FEATURES = [
    {
        icon: '🤖',
        title: 'Buddy AI Assistant',
        desc: 'Your 24/7 freelance mentor. It writes proposals, estimates project scope, flags underpricing, and recommends skills to add — boosting profile views by up to 3×.',
        color: '#10B981',
        metric: '3× Views',
        tag: 'AI Mentor',
        highlight: 'Smart proposal generator, underpricing alerts & skill guidance',
        statValue: '+300%',
        statLabel: 'Profile Reach',
    },
    {
        icon: '✅',
        title: 'AI Skill Verification',
        desc: 'Automated credential checks remove fake profiles. Verified freelancers see 40% more project invitations than unverified peers.',
        color: '#059669',
        metric: '+40% Invites',
        tag: 'Trust Engine',
        highlight: 'Automated credential verification & badge authenticity check',
        statValue: '+40%',
        statLabel: 'More Invitations',
    },
    {
        icon: '⚡',
        title: 'Smart Matchmaking',
        desc: 'Machine-learning algorithms match clients to freelancers 5× faster than keyword search, filtering on skill depth, budget, and timeline.',
        color: '#14B8A6',
        metric: '5× Faster',
        tag: 'ML Matcher',
        highlight: 'Deep matching algorithms filtering skill depth, budget & deadline',
        statValue: '5×',
        statLabel: 'Faster Placement',
    },
    {
        icon: '🔒',
        title: 'Secure Escrow Payments',
        desc: 'Milestone-based escrow ensures freelancers only get paid on delivery and clients only release funds on satisfaction — zero disputes.',
        color: '#0D9488',
        metric: 'Zero Disputes',
        tag: 'Milestone Vault',
        highlight: 'Funds held in secure escrow until milestone sign-off',
        statValue: '100%',
        statLabel: 'Payment Safety',
    },
    {
        icon: '📊',
        title: 'Earnings Dashboard',
        desc: 'Real-time analytics on project pipeline, total earnings, skill demand trends, and personalized growth recommendations.',
        color: '#10B981',
        metric: 'Real-Time',
        tag: 'Financial Hub',
        highlight: 'Live revenue pipeline, skill demand trends & payout tracker',
        statValue: '$0 Fee',
        statLabel: 'To Get Started',
    },
    {
        icon: '🏅',
        title: 'Reputation System',
        desc: 'Transparent ratings, detailed reviews, and skill endorsements from clients build a portable professional reputation you own forever.',
        color: '#059669',
        metric: 'Portable Score',
        tag: 'Verified Record',
        highlight: 'Client endorsements & verified badge portable to your resume',
        statValue: '4.95★',
        statLabel: 'Average Rating',
    },
];

const AUDIENCES = [
    {
        icon: '👨‍🎓',
        title: 'Students',
        subtitle: 'Turn coursework into cash',
        points: [
            'Build a real portfolio while still in college',
            'Work on projects suited to your skill level',
            'Earn income that covers tuition and living costs',
            'Graduate with verified experience employers trust',
        ],
    },
    {
        icon: '🏢',
        title: 'Clients & Businesses',
        subtitle: 'Fresh talent, exceptional value',
        points: [
            'Access a pre-screened pool of motivated student talent',
            'AI-matched freelancers reduce hiring time by 70%',
            'Lower cost than traditional agencies without sacrificing quality',
            'Support the next generation of tech professionals',
        ],
    },
    {
        icon: '📚',
        title: 'Instructors & Mentors',
        subtitle: 'Guide the next wave',
        points: [
            'Recommend SkillKart to students for real-world practice',
            'Monitor student progress and project completions',
            'Post skill-building challenges for classroom use',
            'Share expertise as a verified platform mentor',
        ],
    },
];

const TESTIMONIALS = [
    {
        name: 'Aisha Khan',
        role: 'Frontend Developer',
        university: 'FAST NUCES, Karachi',
        avatar: 'AK',
        avatarBg: '#059669',
        text: 'SkillKart\'s AI verification gave me instant credibility. Within a week of completing my profile I landed my first Rs. 500 project. The Buddy AI literally walked me through writing my proposal!',
        earned: 'Rs. 3,200',
        projects: 8,
    },
    {
        name: 'Omar Farooq',
        role: 'UI/UX Designer',
        university: 'NED University, Karachi',
        avatar: 'OF',
        avatarBg: '#10B981',
        text: 'As a final-year student I was worried about competing with experienced freelancers. Smart Matchmaking only showed me projects suited to my level. Game changer!',
        earned: 'Rs. 1,800',
        projects: 5,
    },
    {
        name: 'Sara Malik',
        role: 'Content Strategist',
        university: 'IBA Karachi',
        avatar: 'SM',
        avatarBg: '#14B8A6',
        text: 'The AI Profile Analyzer told me exactly what to add. I went from 2 profile views a week to 40+ after following its suggestions. My conversion rate tripled!',
        earned: 'Rs. 2,400',
        projects: 12,
    },
];

const TECH_STACK = [
    { label: 'Frontend', value: 'React.js + Vite', icon: '⚛️' },
    { label: 'Backend', value: 'Node.js + Express', icon: '🟢' },
    { label: 'Database', value: 'MongoDB Atlas', icon: '🍃' },
    { label: 'AI Engine', value: 'OpenAI GPT-4 API', icon: '🤖' },
    { label: 'Authentication', value: 'JWT + OAuth 2.0', icon: '🔐' },
    { label: 'Payments', value: 'Stripe Escrow SDK', icon: '💳' },
    { label: 'Hosting', value: 'Vercel + Railway', icon: '☁️' },
    { label: 'Security', value: 'AES-256 Encryption', icon: '🛡️' },
];

const ROADMAP = [
    {
        phase: 'Phase 1',
        status: 'Live',
        statusColor: '#10B981',
        title: 'Core Platform',
        items: ['AI Profile Verification', 'Smart Matchmaking', 'Secure Escrow Payments', 'Buddy AI Assistant'],
    },
    {
        phase: 'Phase 2',
        status: 'In Progress',
        statusColor: '#F59E0B',
        title: 'Growth Features',
        items: ['Mobile App (iOS & Android)', 'Skill Assessment Tests', 'Group Project Rooms', 'University Partnerships'],
    },
    {
        phase: 'Phase 3',
        status: 'Coming Soon',
        statusColor: '#059669',
        title: 'Ecosystem Expansion',
        items: ['International Marketplace', 'Instructor Certification', 'AI-Generated Project Briefs', 'Enterprise Client Portal'],
    },
];

const FAQS = [
    {
        q: 'Is SkillKart free to use as a freelancer?',
        a: 'Yes — creating a profile, browsing projects, and using Buddy AI basic features is completely free. We charge a small success fee (8%) only when you successfully complete a paid project.',
    },
    {
        q: 'Do I need prior work experience to join?',
        a: 'Not at all! SkillKart is built specifically for students and new graduates. Our skill-level matching ensures you only see projects aligned to your current abilities, helping you grow at your own pace.',
    },
    {
        q: 'How does AI verification work?',
        a: 'Our AI analyzes your uploaded credentials, portfolio projects, and skill assessments. It cross-references publicly available signals to confirm authenticity, then awards a Verified badge visible to all clients.',
    },
    {
        q: 'How do payments work? Are they safe?',
        a: 'All payments flow through Stripe-powered escrow. Clients fund milestones upfront; funds are released to you only after milestone approval. Chargebacks and fraud are handled automatically.',
    },
    {
        q: 'Can businesses of any size use SkillKart?',
        a: 'Absolutely. From solo founders needing a landing page to enterprises running multi-phase software projects, SkillKart has flexible plans and volume discounts for recurring clients.',
    },
    {
        q: 'What happens if there is a dispute?',
        a: 'Our Resolution Center mediates disputes using project milestones, chat history, and deliverable evidence. In most cases disputes are resolved within 48 hours without escalation.',
    },
];

const STATS = [
    { end: 50, prefix: '', suffix: 'K+', label: 'Verified Freelancers' },
    { end: 12, prefix: '', suffix: 'K+', label: 'Projects Completed' },
    { end: 98, prefix: '', suffix: '%', label: 'Client Satisfaction' },
    { end: 2.1, prefix: 'Rs. ', suffix: 'M', label: 'Student Earnings' },
];

/* ─────────────────────── ANIMATED COUNTER ─────────────────────── */
function StatCounter({ end, prefix, suffix, label }) {
    const elRef = useRef(null);

    useEffect(() => {
        const decimals = end % 1 !== 0 ? 1 : 0;
        const obj = { val: 0 };
        const trigger = ScrollTrigger.create({
            trigger: elRef.current,
            start: 'top 92%',
            once: true,
            onEnter: () => {
                gsap.to(obj, {
                    val: end,
                    duration: 1.8,
                    ease: 'power2.out',
                    onUpdate: () => {
                        if (elRef.current) {
                            elRef.current.textContent =
                                prefix + obj.val.toFixed(decimals) + suffix;
                        }
                    },
                });
            },
        });
        return () => trigger.kill();
    }, [end, prefix, suffix]);

    return (
        <div className="ab-stat__card">
            <div className="ab-stat__bubble">
                <span className="ab-stat__dot" />
            </div>
            <div ref={elRef} className="ab-stat__val">
                {prefix}0{suffix}
            </div>
            <div className="ab-stat__lbl">{label}</div>
        </div>
    );
}

/* ─────────────────────── MAIN ABOUT COMPONENT ─────────────────────── */
export default function About() {
    const [openFaq, setOpenFaq] = useState(null);
    const [activeFeature, setActiveFeature] = useState(0);

    const heroRef = useRef(null);
    const statsRef = useRef(null);
    const missionRef = useRef(null);
    const howRef = useRef(null);
    const featRef = useRef(null);
    const audienceRef = useRef(null);
    const uvpRef = useRef(null);
    const techRef = useRef(null);
    const teamRef = useRef(null);
    const testimonialsRef = useRef(null);
    const roadmapRef = useRef(null);
    const faqRef = useRef(null);
    const ctaRef = useRef(null);

    useEffect(() => {
        document.title = 'About SkillKart – AI-Powered Freelancing Platform';

        const ctx = gsap.context(() => {
            // Hero entrance animation
            const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
            heroTl.fromTo('.ab-hero__tag', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 })
                  .fromTo('.ab-hero__heading', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power4.out' }, '-=0.3')
                  .fromTo('.ab-hero__sub', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.35')
                  .fromTo('.ab-hero__btns', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, '-=0.3')
                  .fromTo('.ab-hero__terminal', { scale: 0.94, opacity: 0, y: 25 }, { scale: 1, opacity: 1, y: 0, duration: 0.75, ease: 'back.out(1.4)' }, '-=0.4')
                  .fromTo('.ab-hero__chip', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(1.6)' }, '-=0.3');

            // Scroll animations for sections
            const revealSection = (ref, selector) => {
                const elements = selector ? ref.current?.querySelectorAll(selector) : ref.current?.children;
                if (!elements || !elements.length) return;
                gsap.fromTo(elements,
                    { y: 35, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        stagger: 0.1,
                        duration: 0.65,
                        ease: 'power3.out',
                        scrollTrigger: { trigger: ref.current, start: 'top 85%' }
                    }
                );
            };

            revealSection(statsRef, '.ab-stat__card');
            revealSection(missionRef, '.ab-purpose-card');
            revealSection(howRef, '.ab-hiw-station');
            revealSection(featRef, '.ab-feat-strip, .ab-feat-center__card');
            revealSection(audienceRef, '.ab-audience__door');
            revealSection(uvpRef, '.ab-uvp__matrix');
            revealSection(techRef, '.ab-tech__card, .ab-tech__vault');
            revealSection(teamRef, '.ab-creator__profile');
            revealSection(testimonialsRef, '.ab-review__spotlight');
            revealSection(roadmapRef, '.ab-roadmap__pillar');
            revealSection(faqRef, '.ab-faq__accordion-item');
            revealSection(ctaRef, '.ab-cta__box');
        });

        return () => ctx.revert();
    }, []);

    const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

    return (
        <div className="ab-root">
            <Navbar />

            {/* ══════════════════ 1. HERO (FITS 100% IN ONE FULL SCREEN) ══════════════════ */}
            <section ref={heroRef} className="ab-hero">
                {/* Ambient Mint Blobs + Faint Grid (Matching Home Theme) */}
                <div className="ab-hero__backdrop" aria-hidden="true">
                    <div className="ab-hero__ambient ab-hero__ambient--mint" />
                    <div className="ab-hero__ambient ab-hero__ambient--cyan" />
                    <div className="ab-hero__ambient ab-hero__ambient--soft" />
                    <div className="ab-hero__grid-pattern" />
                </div>

                <div className="ab-container ab-hero__stage">
                    {/* Left Column: Typography & CTAs */}
                    <div className="ab-hero__intro">
                        <div className="ab-hero__tag">
                            <span className="ab-hero__tag-sparkle"><Sparkles size={13} /></span>
                            <span>🚀 About SkillKart</span>
                            <span className="ab-hero__live-dot" />
                        </div>

                        <h1 className="ab-hero__heading">
                            Where <span className="ab-hero__accent">Student Talent</span><br />
                            Meets Real Opportunity
                        </h1>

                        <p className="ab-hero__sub">
                            SkillKart is an AI-powered micro-freelancing platform that connects
                            verified student freelancers with clients worldwide — empowering the
                            next generation to earn, grow, and build careers before graduation.
                        </p>

                        <div className="ab-hero__btns">
                            <Link to="/registration" className="ab-btn-emerald">
                                <Zap size={15} />
                                Get Started Free →
                            </Link>
                            <Link to="/" className="ab-btn-frosted">
                                Explore the Platform
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Live Student Launchpad Terminal (Full-Screen Visual Anchor) */}
                    <div className="ab-hero__visual-zone">
                        <div className="ab-hero__terminal">
                            <div className="ab-hero__terminal-top">
                                <div className="ab-hero__terminal-dots">
                                    <span className="ab-hero__t-dot ab-hero__t-dot--1" />
                                    <span className="ab-hero__t-dot ab-hero__t-dot--2" />
                                    <span className="ab-hero__t-dot ab-hero__t-dot--3" />
                                </div>
                                <div className="ab-hero__terminal-badge">
                                    <GraduationCap size={13} />
                                    <span>Verified University Talent Pool</span>
                                </div>
                            </div>

                            <div className="ab-hero__terminal-body">
                                <div className="ab-hero__t-status-row">
                                    <div className="ab-hero__t-avatar">🎓</div>
                                    <div className="ab-hero__t-meta">
                                        <strong>AI Credential Engine</strong>
                                        <span>Automated Portfolio & Skill Verification</span>
                                    </div>
                                    <span className="ab-hero__t-badge-verified">
                                        <CheckCircle2 size={12} /> 98% Confidence
                                    </span>
                                </div>

                                <div className="ab-hero__t-meter-wrap">
                                    <div className="ab-hero__t-meter-label">
                                        <span>Matchmaking Precision</span>
                                        <span className="ab-hero__t-meter-score">5× Faster Delivery</span>
                                    </div>
                                    <div className="ab-hero__t-meter-track">
                                        <div className="ab-hero__t-meter-fill" />
                                    </div>
                                </div>

                                <div className="ab-hero__t-pills-cluster">
                                    <div className="ab-hero__t-minipill">
                                        <ShieldCheck size={12} className="text-emerald-500" />
                                        <span>Escrow Milestone Security</span>
                                    </div>
                                    <div className="ab-hero__t-minipill">
                                        <Zap size={12} className="text-emerald-500" />
                                        <span>Buddy AI 24/7 Mentorship</span>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Satellite Badges */}
                            <div className="ab-hero__chip ab-hero__chip--top">
                                <span className="ab-hero__chip-icon">⚡</span>
                                <div>
                                    <strong>Smart Matchmaking</strong>
                                    <span>Curated Project Discovery</span>
                                </div>
                            </div>

                            <div className="ab-hero__chip ab-hero__chip--bottom">
                                <span className="ab-hero__chip-icon">📈</span>
                                <div>
                                    <strong>Rs. 2.1M+ Disbursed</strong>
                                    <span>Direct Student Earnings</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 2. STATS BAR (FLOATING CURVED HORIZON) ══════════════════ */}
            <section ref={statsRef} className="ab-stats-band">
                <div className="ab-container">
                    <div className="ab-stats-dock">
                        <div className="ab-stats-grid">
                            {STATS.map((s) => (
                                <StatCounter
                                    key={s.label}
                                    end={s.end}
                                    prefix={s.prefix}
                                    suffix={s.suffix}
                                    label={s.label}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 3. PURPOSE & DESTINATION (ORBITAL SHOWCASE) ══════════════════ */}
            <section ref={missionRef} className="ab-purpose-section">
                <div className="ab-purpose-container">
                    <div className="ab-purpose-card">
                        {/* Top Bar: Title & Brandmark */}
                        <div className="ab-purpose-card__top">
                            <div className="ab-purpose-card__heading-group">
                                <div className="ab-purpose-tag">
                                    <span className="ab-purpose-bar" />
                                    <span>Purpose & Destination</span>
                                </div>
                                <h2 className="ab-purpose-title">Driven by Purpose, Guided by Vision</h2>
                            </div>
                            <div className="ab-purpose-brandmark" aria-hidden="true">
                                <div className="ab-brandmark-shape ab-brandmark-shape--dark" />
                                <div className="ab-brandmark-shape ab-brandmark-shape--light" />
                            </div>
                        </div>

                        {/* Main 3-Column Stage */}
                        <div className="ab-purpose-stage">
                            {/* Left Column: Our Mission */}
                            <div className="ab-purpose-col ab-purpose-col--left">
                                <div className="ab-purpose-point">
                                    <div className="ab-purpose-point__header">
                                        <span className="ab-purpose-point__bar" />
                                        <h3 className="ab-purpose-point__title">Our Mission</h3>
                                    </div>
                                    <p className="ab-purpose-point__desc">
                                        To democratize the freelance economy by giving every student — regardless
                                        of background, university, or country — the tools, AI mentorship, and
                                        verified credentials they need to compete globally and earn independently before graduation.
                                    </p>
                                    <div className="ab-purpose-point__pill">
                                        <span>✦ 100% Student-Centric Architecture</span>
                                    </div>
                                </div>
                            </div>

                            {/* Center Column: Radial Orbital Visual with Central Figure, Nodes & Floating Cards */}
                            <div className="ab-purpose-col ab-purpose-col--center">
                                <div className="ab-purpose-orbit-wrap">
                                    {/* Concentric Dashed Orbital Rings */}
                                    <div className="ab-orbit-ring ab-orbit-ring--outer" />
                                    <div className="ab-orbit-ring ab-orbit-ring--middle" />
                                    <div className="ab-orbit-ring ab-orbit-ring--inner" />

                                    {/* Floating Node Avatars on the Rings */}
                                    <div className="ab-orbit-node ab-orbit-node--1" title="Community Student">
                                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" alt="Student" />
                                    </div>
                                    <div className="ab-orbit-node ab-orbit-node--2" title="Community Student">
                                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" alt="Student" />
                                    </div>
                                    <div className="ab-orbit-node ab-orbit-node--3" title="Community Student">
                                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" alt="Student" />
                                    </div>

                                    {/* Center Visual: Student in Emerald Aura */}
                                    <div className="ab-orbit-center">
                                        <div className="ab-orbit-center__halo" />
                                        <img 
                                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80" 
                                            alt="SkillKart Talent" 
                                            className="ab-orbit-center__img" 
                                        />
                                    </div>

                                    {/* Floating Testimonial Card: Top-Right */}
                                    <div className="ab-orbit-float-card ab-orbit-float-card--top-right">
                                        <img 
                                            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" 
                                            alt="Aisha Khan" 
                                            className="ab-orbit-float-card__avatar" 
                                        />
                                        <div className="ab-orbit-float-card__info">
                                            <div className="ab-orbit-float-card__name">
                                                <strong>Aisha Khan</strong>
                                                <span>FAST NUCES</span>
                                            </div>
                                            <p className="ab-orbit-float-card__text">
                                                "AI verification gave me instant credibility for my first paid project."
                                            </p>
                                        </div>
                                    </div>

                                    {/* Floating Testimonial Card: Bottom-Left */}
                                    <div className="ab-orbit-float-card ab-orbit-float-card--bottom-left">
                                        <img 
                                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" 
                                            alt="Omar Farooq" 
                                            className="ab-orbit-float-card__avatar" 
                                        />
                                        <div className="ab-orbit-float-card__info">
                                            <div className="ab-orbit-float-card__name">
                                                <strong>Omar Farooq</strong>
                                                <span>NED University</span>
                                            </div>
                                            <p className="ab-orbit-float-card__text">
                                                "Smart Matchmaking showed me projects suited to my current skill level."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Our Vision & Global Launchpad */}
                            <div className="ab-purpose-col ab-purpose-col--right">
                                <div className="ab-purpose-point">
                                    <div className="ab-purpose-point__header">
                                        <span className="ab-purpose-point__bar" />
                                        <h3 className="ab-purpose-point__title">Our Vision</h3>
                                    </div>
                                    <p className="ab-purpose-point__desc">
                                        A world where a student's talent and drive — not their connections — determine
                                        their success. Empowering verified talent to compete on global standards.
                                    </p>
                                </div>

                                <div className="ab-purpose-point">
                                    <div className="ab-purpose-point__header">
                                        <span className="ab-purpose-point__bar" />
                                        <h3 className="ab-purpose-point__title">Global Launchpad</h3>
                                    </div>
                                    <p className="ab-purpose-point__desc">
                                        SkillKart is the launchpad where 1 million+ students land their first paid project,
                                        build portable reputations, and shape the future of work.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 4. HOW IT WORKS (HORIZONTAL FLOW WITH CONNECTORS) ══════════════════ */}
            <section ref={howRef} className="ab-hiw-section">
                {/* Subtle Background Decorations */}
                <div className="ab-hiw-bg" aria-hidden="true">
                    <div className="ab-hiw-bg-circle ab-hiw-bg-circle--1" />
                    <div className="ab-hiw-bg-circle ab-hiw-bg-circle--2" />
                    <div className="ab-hiw-bg-circle ab-hiw-bg-circle--3" />
                </div>

                <div className="ab-container">
                    {/* Header */}
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <span>⚙️</span>
                            <span>How It Works</span>
                        </span>
                        <h2 className="ab-head-title">Five Steps to Your First Paid Project</h2>
                        <p className="ab-head-sub">
                            From zero to earning — the SkillKart journey takes less than 30 minutes to start.
                        </p>
                    </div>

                    {/* Horizontal Process Flow */}
                    <div className="ab-hiw-flow">
                        {HOW_IT_WORKS.map((step, idx) => (
                            <div key={step.step} className="ab-hiw-step">
                                {/* Step Number Badge */}
                                <div className="ab-hiw-number">
                                    <span className="ab-hiw-number-inner">{step.step}</span>
                                </div>

                                {/* Icon/Illustration */}
                                <div className="ab-hiw-icon">
                                    <span className="ab-hiw-icon-emoji">{step.icon}</span>
                                </div>

                                {/* Content */}
                                <div className="ab-hiw-content">
                                    <h3 className="ab-hiw-title">{step.title}</h3>
                                    <p className="ab-hiw-desc">{step.desc}</p>
                                </div>

                                {/* Connector Arrow (not on last step) */}
                                {idx < HOW_IT_WORKS.length - 1 && (
                                    <div className="ab-hiw-connector">
                                        <svg width="60" height="24" viewBox="0 0 60 24" fill="none" aria-hidden="true">
                                            <path 
                                                d="M 0 12 L 50 12 M 42 6 L 50 12 L 42 18" 
                                                stroke="#10B981" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                                className="ab-hiw-connector-line"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 5. KEY FEATURES (INTERACTIVE CAPABILITY CONSOLE) ══════════════════ */}
            <section ref={featRef} className="ab-section ab-features-section">
                <div className="ab-container">
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <Sparkles size={13} />
                            <span>Key Features</span>
                        </span>
                        <h2 className="ab-head-title">Built for Student Success</h2>
                        <p className="ab-head-sub">
                            Every feature is designed with one question in mind: does this help a student earn more, faster?
                        </p>
                    </div>

                    <div className="ab-feat-console">
                        {/* LEFT WING: First 3 capabilities */}
                        <div className="ab-feat-wing ab-feat-wing--left">
                            {FEATURES.slice(0, 3).map((f, idx) => {
                                const isActive = activeFeature === idx;
                                return (
                                    <div
                                        key={f.title}
                                        className={`ab-feat-strip ${isActive ? 'ab-feat-strip--active' : ''}`}
                                        onClick={() => setActiveFeature(idx)}
                                        onMouseEnter={() => setActiveFeature(idx)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="ab-feat-strip__indicator" />
                                        <div className="ab-feat-strip__icon-box">
                                            <span>{f.icon}</span>
                                        </div>
                                        <div className="ab-feat-strip__content">
                                            <div className="ab-feat-strip__top">
                                                <h3 className="ab-feat-strip__title">{f.title}</h3>
                                                <span className="ab-feat-strip__metric">{f.metric}</span>
                                            </div>
                                            <p className="ab-feat-strip__desc">{f.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CENTER SPOTLIGHT: Dynamic Live Student Engine */}
                        <div className="ab-feat-center">
                            <div className="ab-feat-center__card">
                                <div className="ab-feat-center__radar-bar">
                                    <div className="ab-feat-center__live-indicator">
                                        <span className="ab-feat-center__live-dot" />
                                        <span className="ab-feat-center__live-label">AI Engine Active</span>
                                    </div>
                                    <span className="ab-feat-center__pill-tag">{FEATURES[activeFeature].tag}</span>
                                </div>

                                <div className="ab-feat-center__hero">
                                    <div className="ab-feat-center__icon-sphere" style={{ borderColor: FEATURES[activeFeature].color }}>
                                        <span>{FEATURES[activeFeature].icon}</span>
                                    </div>
                                    <div className="ab-feat-center__meta">
                                        <span className="ab-feat-center__meta-sub">Active Capability</span>
                                        <h4 className="ab-feat-center__meta-title">{FEATURES[activeFeature].title}</h4>
                                    </div>
                                </div>

                                <div className="ab-feat-center__highlight-box">
                                    <div className="ab-feat-center__hl-label">Direct Impact</div>
                                    <p className="ab-feat-center__hl-text">{FEATURES[activeFeature].highlight}</p>
                                </div>

                                <div className="ab-feat-center__stats-row">
                                    <div className="ab-feat-center__stat-cell">
                                        <span className="ab-feat-center__stat-val">{FEATURES[activeFeature].statValue}</span>
                                        <span className="ab-feat-center__stat-lbl">{FEATURES[activeFeature].statLabel}</span>
                                    </div>
                                    <div className="ab-feat-center__stat-divider" />
                                    <div className="ab-feat-center__stat-cell">
                                        <span className="ab-feat-center__stat-val">100%</span>
                                        <span className="ab-feat-center__stat-lbl">Student Focused</span>
                                    </div>
                                </div>

                                <div className="ab-feat-center__dots">
                                    {FEATURES.map((_, i) => (
                                        <button
                                            key={i}
                                            className={`ab-feat-center__dot-btn ${activeFeature === i ? 'ab-feat-center__dot-btn--active' : ''}`}
                                            onClick={() => setActiveFeature(i)}
                                            aria-label={`Select feature ${i + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT WING: Next 3 capabilities */}
                        <div className="ab-feat-wing ab-feat-wing--right">
                            {FEATURES.slice(3, 6).map((f, i) => {
                                const actualIdx = i + 3;
                                const isActive = activeFeature === actualIdx;
                                return (
                                    <div
                                        key={f.title}
                                        className={`ab-feat-strip ${isActive ? 'ab-feat-strip--active' : ''}`}
                                        onClick={() => setActiveFeature(actualIdx)}
                                        onMouseEnter={() => setActiveFeature(actualIdx)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="ab-feat-strip__indicator" />
                                        <div className="ab-feat-strip__icon-box">
                                            <span>{f.icon}</span>
                                        </div>
                                        <div className="ab-feat-strip__content">
                                            <div className="ab-feat-strip__top">
                                                <h3 className="ab-feat-strip__title">{f.title}</h3>
                                                <span className="ab-feat-strip__metric">{f.metric}</span>
                                            </div>
                                            <p className="ab-feat-strip__desc">{f.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 6. TARGET AUDIENCE (TRI-FOLD PERSONA SHOWCASE) ══════════════════ */}
            <section ref={audienceRef} className="ab-section ab-audience-section">
                <div className="ab-container">
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <span>👥</span>
                            <span>Who It's For</span>
                        </span>
                        <h2 className="ab-head-title">One Platform, Many Beneficiaries</h2>
                        <p className="ab-head-sub">
                            Whether you're a student looking for income, a business seeking fresh talent, or an instructor empowering students — SkillKart is built for you.
                        </p>
                    </div>

                    <div className="ab-audience__grid">
                        {AUDIENCES.map((a, idx) => (
                            <div key={a.title} className={`ab-audience__door ab-audience__door--${idx}`}>
                                <div className="ab-audience__header">
                                    <div className="ab-audience__icon-pod">{a.icon}</div>
                                    <div>
                                        <h3 className="ab-audience__title">{a.title}</h3>
                                        <span className="ab-audience__subtitle">{a.subtitle}</span>
                                    </div>
                                </div>
                                <div className="ab-audience__separator" />
                                <ul className="ab-audience__points">
                                    {a.points.map((pt) => (
                                        <li key={pt} className="ab-audience__point">
                                            <span className="ab-audience__check-circle">
                                                <Check size={13} />
                                            </span>
                                            <span>{pt}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 7. UNIQUE VALUE PROPOSITION (COMMAND MATRIX) ══════════════════ */}
            <section ref={uvpRef} className="ab-section ab-uvp-section">
                <div className="ab-container">
                    <div className="ab-uvp__matrix">
                        {/* Narrative Column */}
                        <div className="ab-uvp__editorial">
                            <span className="ab-badge-pill">
                                <Award size={13} />
                                <span>Why SkillKart</span>
                            </span>
                            <h2 className="ab-uvp__title">Not Just Another Freelancing Platform</h2>
                            <p className="ab-uvp__text">
                                Generic platforms were built for established professionals. SkillKart was engineered from
                                scratch for students — with AI that understands where you are in your career and what you
                                need to reach the next level.
                            </p>
                            <div className="ab-uvp__callout">
                                <div className="ab-uvp__callout-num">40%</div>
                                <div className="ab-uvp__callout-desc">
                                    Higher project conversion rate for verified student profiles compared to unverified freelancers.
                                </div>
                            </div>
                        </div>

                        {/* Comparison Switchboard (Clean Light Card - Zero Blue Wash) */}
                        <div className="ab-uvp__board">
                            <div className="ab-uvp__board-header">
                                <span className="ab-uvp__th-col">Capability</span>
                                <span className="ab-uvp__th-col ab-uvp__th-col--generic">Generic Platforms</span>
                                <span className="ab-uvp__th-col ab-uvp__th-col--sk">SkillKart</span>
                            </div>

                            <div className="ab-uvp__board-rows">
                                {[
                                    { label: 'Student-first verification', generic: 'Experience required', sk: 'Skills-based entry' },
                                    { label: 'AI matching quality', generic: 'Keyword search only', sk: 'ML-powered precision' },
                                    { label: 'Mentorship', generic: 'None included', sk: 'Buddy AI 24/7' },
                                    { label: 'Profile credibility', generic: 'Self-declared skills', sk: 'AI-verified badges' },
                                    { label: 'Payment safety', generic: 'Invoice-based risks', sk: 'Escrow-protected' },
                                ].map((row) => (
                                    <div key={row.label} className="ab-uvp__row">
                                        <div className="ab-uvp__td-label">{row.label}</div>
                                        <div className="ab-uvp__td-generic">
                                            <span className="ab-uvp__cross-icon"><X size={12} /></span>
                                            <span>{row.generic}</span>
                                        </div>
                                        <div className="ab-uvp__td-sk">
                                            <span className="ab-uvp__check-icon"><Check size={12} /></span>
                                            <span>{row.sk}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 8. TECH STACK & SECURITY ══════════════════ */}
            <section ref={techRef} className="ab-section ab-tech-section">
                <div className="ab-container">
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <span>🛠️</span>
                            <span>Technology</span>
                        </span>
                        <h2 className="ab-head-title">Built on a Modern, Secure Stack</h2>
                        <p className="ab-head-sub">Enterprise-grade technology powering a student-friendly experience.</p>
                    </div>

                    <div className="ab-tech__mosaic">
                        {TECH_STACK.map((t) => (
                            <div key={t.label} className="ab-tech__card">
                                <div className="ab-tech__icon-box">{t.icon}</div>
                                <div>
                                    <span className="ab-tech__label">{t.label}</span>
                                    <strong className="ab-tech__val">{t.value}</strong>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Security Vault Banner */}
                    <div className="ab-tech__vault">
                        <div className="ab-tech__vault-shield">
                            <ShieldCheck size={38} className="text-emerald-500" />
                        </div>
                        <div className="ab-tech__vault-info">
                            <div className="ab-tech__vault-badge">
                                <Lock size={12} />
                                <span>Enterprise Grade Security</span>
                            </div>
                            <h3 className="ab-tech__vault-title">Your Data, Your Privacy</h3>
                            <p className="ab-tech__vault-text">
                                All personal data is encrypted at rest (AES-256) and in transit (TLS 1.3). We never sell
                                user data, comply with GDPR and local data-protection regulations, and offer full account
                                deletion on request. Payment information is handled exclusively by Stripe and never stored
                                on our servers.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 9. MEET THE FYP CREATORS (FOUNDER SHOWCASE) ══════════════════ */}
            <section ref={teamRef} className="ab-section ab-team-section">
                <div className="ab-container">
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <GraduationCap size={13} />
                            <span>FYP Team & Founders</span>
                        </span>
                        <h2 className="ab-head-title">Meet the Creators of SkillKart</h2>
                        <p className="ab-head-sub">
                            SkillKart was engineered as a Final Year Project by a team of passionate student innovators dedicated to empowering talent across Pakistan.
                        </p>
                    </div>

                    <div className="ab-creator__grid">
                        {TEAM_MEMBERS.map((member) => (
                            <div key={member.name} className="ab-creator__profile">
                                <div className="ab-creator__photo-wrap">
                                    <img src={member.image} alt={member.name} className="ab-creator__img" />
                                    <span className="ab-creator__badge">{member.badge}</span>
                                </div>
                                <div className="ab-creator__bio-box">
                                    <h3 className="ab-creator__name">{member.name}</h3>
                                    <p className="ab-creator__role">{member.role}</p>
                                    <p className="ab-creator__bio">{member.bio}</p>
                                    <div className="ab-creator__social-row">
                                        <a href={member.socials.github} target="_blank" rel="noreferrer" title="GitHub" className="ab-creator__social-circle">
                                            <Github size={15} />
                                        </a>
                                        <a href={member.socials.linkedin} target="_blank" rel="noreferrer" title="LinkedIn" className="ab-creator__social-circle">
                                            <Linkedin size={15} />
                                        </a>
                                        <a href={member.socials.email} title="Email" className="ab-creator__social-circle">
                                            <Mail size={15} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 10. SUCCESS STORIES (MODERN TESTIMONIAL GRID) ══════════════════ */}
            <section ref={testimonialsRef} className="ab-section ab-testimonials-section">
                {/* Background Decor */}
                <div className="ab-testimonials-bg" aria-hidden="true">
                    <div className="ab-testimonials-bg-circle ab-testimonials-bg-circle--1" />
                    <div className="ab-testimonials-bg-circle ab-testimonials-bg-circle--2" />
                </div>

                <div className="ab-container">
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <Star size={13} />
                            <span>Success Stories</span>
                        </span>
                        <h2 className="ab-head-title">Real Students. Real Results.</h2>
                        <p className="ab-head-sub">
                            Over Rs. 2.1 million earned by students across Pakistan since our beta launch.
                        </p>
                    </div>

                    <div className="ab-testimonials-grid">
                        {TESTIMONIALS.map((t, idx) => (
                            <div key={t.name} className={`ab-testimonial-card ${idx === 0 ? 'ab-testimonial-card--featured' : ''}`}>
                                {/* Quote Icon */}
                                <div className="ab-testimonial-quote-icon">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                        <path d="M8 24V12H12C13.5913 12 15.1174 11.3679 16.2426 10.2426C17.3679 9.11743 18 7.5913 18 6V4H8V24ZM24 24V12H28C29.5913 12 31.1174 11.3679 32.2426 10.2426C33.3679 9.11743 34 7.5913 34 6V4H24V24Z" fill="#10B981" fillOpacity="0.15"/>
                                        <path d="M8 24V12H12C13.5913 12 15.1174 11.3679 16.2426 10.2426C17.3679 9.11743 18 7.5913 18 6V4H8V24ZM24 24V12H28C29.5913 12 31.1174 11.3679 32.2426 10.2426C33.3679 9.11743 34 7.5913 34 6V4H24V24Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>

                                {/* Stars */}
                                <div className="ab-testimonial-stars">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} fill="#F59E0B" color="#F59E0B" />
                                    ))}
                                </div>

                                {/* Testimonial Text */}
                                <p className="ab-testimonial-text">"{t.text}"</p>

                                {/* Author Info */}
                                <div className="ab-testimonial-author">
                                    <div className="ab-testimonial-avatar" style={{ background: t.avatarBg }}>
                                        {t.avatar}
                                    </div>
                                    <div className="ab-testimonial-info">
                                        <span className="ab-testimonial-name">{t.name}</span>
                                        <span className="ab-testimonial-role">{t.role}</span>
                                        <span className="ab-testimonial-uni">{t.university}</span>
                                    </div>
                                </div>

                                {/* Earnings Badge */}
                                <div className="ab-testimonial-earnings">
                                    <span className="ab-testimonial-earned">{t.earned}</span>
                                    <span className="ab-testimonial-projects">{t.projects} projects</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 11. ROADMAP (ASCENDING MILESTONES) ══════════════════ */}
            <section ref={roadmapRef} className="ab-section ab-roadmap-section">
                <div className="ab-container">
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <TrendingUp size={13} />
                            <span>Roadmap</span>
                        </span>
                        <h2 className="ab-head-title">Where We're Headed</h2>
                        <p className="ab-head-sub">
                            SkillKart is actively evolving. Here's what's live, what's building, and what's next.
                        </p>
                    </div>

                    <div className="ab-roadmap__ladder">
                        {ROADMAP.map((phase) => (
                            <div key={phase.phase} className="ab-roadmap__pillar">
                                <div className="ab-roadmap__top-status">
                                    <span className="ab-roadmap__phase-lbl">{phase.phase}</span>
                                    <span className="ab-roadmap__badge-status" style={{ color: phase.statusColor }}>
                                        <span className="ab-roadmap__status-orb" style={{ background: phase.statusColor }} />
                                        {phase.status}
                                    </span>
                                </div>
                                <h3 className="ab-roadmap__title">{phase.title}</h3>
                                <ul className="ab-roadmap__items">
                                    {phase.items.map((item) => (
                                        <li key={item} className="ab-roadmap__item">
                                            <span className="ab-roadmap__bullet" style={{ background: phase.statusColor }} />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 12. FAQ (CLEAN EXPANDING ACCORDION) ══════════════════ */}
            <section ref={faqRef} className="ab-section ab-faq-section">
                <div className="ab-container">
                    <div className="ab-head-center">
                        <span className="ab-badge-pill">
                            <span>❓</span>
                            <span>FAQ</span>
                        </span>
                        <h2 className="ab-head-title">Frequently Asked Questions</h2>
                        <p className="ab-head-sub">Everything you need to know before getting started on SkillKart.</p>
                    </div>

                    <div className="ab-faq__accordion-list">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className={`ab-faq__accordion-item ${openFaq === i ? 'ab-faq__accordion-item--active' : ''}`}
                                onClick={() => toggleFaq(i)}
                            >
                                <div className="ab-faq__q-bar">
                                    <span className="ab-faq__question">{faq.q}</span>
                                    <span className="ab-faq__chevron">
                                        <ChevronDown size={18} />
                                    </span>
                                </div>
                                <div className="ab-faq__a-drawer">
                                    <p className="ab-faq__answer">{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 13. CALL TO ACTION (EMERALD AURORA WRAP) ══════════════════ */}
            <section ref={ctaRef} className="ab-cta-section">
                <div className="ab-container">
                    <div className="ab-cta__box">
                        <div className="ab-cta__halo" aria-hidden="true" />
                        <div className="ab-cta__badge">
                            <Sparkles size={13} className="text-emerald-400" />
                            <span>🚀 Ready to Start?</span>
                        </div>
                        <h2 className="ab-cta__heading">
                            Your First Paid Project is<br />
                            <span className="ab-cta__accent">30 Minutes Away</span>
                        </h2>
                        <p className="ab-cta__sub">
                            Join 50,000+ students who've already verified their skills, landed projects,
                            and built careers on SkillKart. It's free to start — no credit card required.
                        </p>
                        <div className="ab-cta__btns">
                            <Link to="/registration" className="ab-btn-emerald ab-btn-emerald--large">
                                Create Free Account <ArrowRight size={16} />
                            </Link>
                            <Link to="/" className="ab-btn-frosted ab-btn-frosted--cta">
                                Browse Features
                            </Link>
                        </div>
                        <p className="ab-cta__note">
                            Have questions?{' '}
                            <Link to="/contact" className="ab-cta__link">
                                Contact our support team
                            </Link>
                            {' '}— we respond within 24 hours.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
