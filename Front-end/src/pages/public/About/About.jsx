import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import './About.css';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────── DATA ─────────────────────── */

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
        color: '#0a4a73',
    },
    {
        icon: '✅',
        title: 'AI Skill Verification',
        desc: 'Automated credential checks remove fake profiles. Verified freelancers see 40% more project invitations than unverified peers.',
        color: '#276749',
    },
    {
        icon: '⚡',
        title: 'Smart Matchmaking',
        desc: 'Machine-learning algorithms match clients to freelancers 5× faster than keyword search, filtering on skill depth, budget, and timeline.',
        color: '#553c9a',
    },
    {
        icon: '🔒',
        title: 'Secure Escrow Payments',
        desc: 'Milestone-based escrow ensures freelancers only get paid on delivery and clients only release funds on satisfaction — zero disputes.',
        color: '#c05621',
    },
    {
        icon: '📊',
        title: 'Earnings Dashboard',
        desc: 'Real-time analytics on project pipeline, total earnings, skill demand trends, and personalized growth recommendations.',
        color: '#1a6fa8',
    },
    {
        icon: '🏅',
        title: 'Reputation System',
        desc: 'Transparent ratings, detailed reviews, and skill endorsements from clients build a portable professional reputation you own forever.',
        color: '#c53030',
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
        avatarBg: '#0a4a73',
        text: 'SkillKart\'s AI verification gave me instant credibility. Within a week of completing my profile I landed my first Rs. 500 project. The Buddy AI literally walked me through writing my proposal!',
        earned: 'Rs. 3,200',
        projects: 8,
    },
    {
        name: 'Omar Farooq',
        role: 'UI/UX Designer',
        university: 'NED University, Karachi',
        avatar: 'OF',
        avatarBg: '#276749',
        text: 'As a final-year student I was worried about competing with experienced freelancers. Smart Matchmaking only showed me projects suited to my level. Game changer!',
        earned: 'Rs. 1,800',
        projects: 5,
    },
    {
        name: 'Sara Malik',
        role: 'Content Strategist',
        university: 'IBA Karachi',
        avatar: 'SM',
        avatarBg: '#553c9a',
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
        statusColor: '#276749',
        title: 'Core Platform',
        items: ['AI Profile Verification', 'Smart Matchmaking', 'Secure Escrow Payments', 'Buddy AI Assistant'],
    },
    {
        phase: 'Phase 2',
        status: 'In Progress',
        statusColor: '#c05621',
        title: 'Growth Features',
        items: ['Mobile App (iOS & Android)', 'Skill Assessment Tests', 'Group Project Rooms', 'University Partnerships'],
    },
    {
        phase: 'Phase 3',
        status: 'Coming Soon',
        statusColor: '#1a6fa8',
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

// Each stat: numeric end value, prefix (e.g. 'Rs. '), suffix (e.g. 'K+', '%', 'M')
const STATS = [
    { end: 50, prefix: '', suffix: 'K+', label: 'Verified Freelancers' },
    { end: 12, prefix: '', suffix: 'K+', label: 'Projects Completed' },
    { end: 98, prefix: '', suffix: '%', label: 'Client Satisfaction' },
    { end: 2.1, prefix: 'Rs. ', suffix: 'M', label: 'Student Earnings' },
];

/* ─────────────────────── COMPONENT ─────────────────────── */

/* ── Animated counter cell ── */
function StatCounter({ end, prefix, suffix, label }) {
    const elRef = useRef(null);

    useEffect(() => {
        const decimals = end % 1 !== 0 ? 1 : 0;
        const obj = { val: 0 };
        const trigger = ScrollTrigger.create({
            trigger: elRef.current,
            start: 'top 88%',
            once: true,
            onEnter: () => {
                gsap.to(obj, {
                    val: end,
                    duration: 2,
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
        <div className="about-stat__item">
            <div ref={elRef} className="about-stat__value">
                {prefix}0{suffix}
            </div>
            <div className="about-stat__label">{label}</div>
        </div>
    );
}

export default function About() {
    const [openFaq, setOpenFaq] = useState(null);

    const heroRef = useRef(null);
    const statsRef = useRef(null);
    const missionRef = useRef(null);
    const howRef = useRef(null);
    const featRef = useRef(null);
    const audienceRef = useRef(null);
    const uvpRef = useRef(null);
    const techRef = useRef(null);
    const testimonialsRef = useRef(null);
    const roadmapRef = useRef(null);
    const faqRef = useRef(null);
    const ctaRef = useRef(null);

    useEffect(() => {
        document.title = 'About SkillKart – AI-Powered Freelancing Platform';

        const animateSection = (ref, selector = null) => {
            const targets = selector
                ? ref.current?.querySelectorAll(selector)
                : ref.current?.children;
            if (!targets || !targets.length) return;
            gsap.fromTo(
                targets,
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1, stagger: 0.1, duration: 0.7, ease: 'power3.out',
                    scrollTrigger: { trigger: ref.current, start: 'top 82%' },
                }
            );
        };

        // Hero entrance
        const tl = gsap.timeline({ delay: 0.2 });
        tl.fromTo('.about-hero__tag', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
            .fromTo('.about-hero__heading', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo('.about-hero__sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
            .fromTo('.about-hero__btns', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.2');

        // Stats slide-in (counter animation is handled per-card by StatCounter)
        gsap.fromTo('.about-stat__item',
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.12, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: statsRef.current, start: 'top 90%' }
            }
        );

        animateSection(missionRef);
        animateSection(howRef, '.hiw__step');
        animateSection(featRef, '.feat__card');
        animateSection(audienceRef, '.audience__card');
        animateSection(uvpRef);
        animateSection(techRef, '.tech__pill');
        animateSection(testimonialsRef, '.about-testimonial__card');
        animateSection(roadmapRef, '.roadmap__card');
        animateSection(faqRef);
        animateSection(ctaRef);

        return () => ScrollTrigger.getAll().forEach(t => t.kill());
    }, []);

    const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

    return (
        <>
            <Navbar />

            {/* ══════════════════ 1. HERO ══════════════════ */}
            <section ref={heroRef} className="about-hero">
                <div className="about-hero__bg">
                    <div className="about-hero__orb about-hero__orb--1" />
                    <div className="about-hero__orb about-hero__orb--2" />
                    <div className="about-hero__orb about-hero__orb--3" />
                    <div className="about-hero__grid" />
                </div>
                <div className="container about-hero__inner">
                    <div className="section-tag about-hero__tag" style={{ color: '#e3e5e8', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)' }}>
                        <span>🚀</span> About SkillKart
                    </div>
                    <h1 className="about-hero__heading">
                        Where <span className="about-hero__accent">Student Talent</span><br />
                        Meets <span className="about-hero__accent">Real Opportunity</span>
                    </h1>
                    <p className="about-hero__sub">
                        SkillKart is an AI-powered micro-freelancing platform that connects
                        verified student freelancers with clients worldwide — empowering the
                        next generation to earn, grow, and build careers before graduation.
                    </p>
                    <div className="about-hero__btns">
                        <Link to="/registration" className="about-hero__btn-main">Get Started Free →</Link>
                        <Link to="/" className="about-hero__btn-outline">Explore the Platform</Link>
                    </div>
                </div>
                <div className="about-hero__wave">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                    </svg>
                </div>
            </section>

            {/* ══════════════════ STATS BAR ══════════════════ */}
            <section ref={statsRef} className="about-stats">
                <div className="container about-stats__grid">
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
            </section>

            {/* ══════════════════ 2. MISSION & VISION ══════════════════ */}
            <section ref={missionRef} className="about-mission">
                <div className="container about-mission__grid">
                    <div className="about-mission__card about-mission__card--mission">
                        <div className="about-mission__icon">🎯</div>
                        <h2 className="about-mission__heading">Our Mission</h2>
                        <p className="about-mission__text">
                            To democratize the freelance economy by giving every student — regardless
                            of background, university, or country — the tools, AI mentorship, and
                            verified credentials they need to compete globally and earn independently before graduation.
                        </p>
                    </div>
                    <div className="about-mission__card about-mission__card--vision">
                        <div className="about-mission__icon">🌍</div>
                        <h2 className="about-mission__heading">Our Vision</h2>
                        <p className="about-mission__text">
                            A world where a student's talent and drive — not their connections — determine
                            their success. We envision SkillKart becoming the global launchpad where 1 million+
                            students land their first paid project, build portable reputations, and shape
                            the future of work.
                        </p>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 3. HOW IT WORKS ══════════════════ */}
            <section className="hiw">
                <div className="container">
                    <div className="hiw__header">
                        <div className="section-tag"><span>⚙️</span> How It Works</div>
                        <h2 className="section-title">Five Steps to Your First Paid Project</h2>
                        <p className="section-subtitle">From zero to earning — the SkillKart journey takes less than 30 minutes to start.</p>
                    </div>
                    <div ref={howRef} className="hiw__steps">
                        {HOW_IT_WORKS.map((step, i) => (
                            <div key={step.step} className="hiw__step">
                                <div className="hiw__step-connector" style={{ opacity: i === HOW_IT_WORKS.length - 1 ? 0 : 1 }} />
                                <div className="hiw__step-number">{step.step}</div>
                                <div className="hiw__step-icon">{step.icon}</div>
                                <h3 className="hiw__step-title">{step.title}</h3>
                                <p className="hiw__step-desc">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 4. KEY FEATURES ══════════════════ */}
            <section className="feat">
                <div className="container">
                    <div className="feat__header">
                        <div className="section-tag"><span>✨</span> Key Features</div>
                        <h2 className="section-title">Built for Student Success</h2>
                        <p className="section-subtitle">Every feature is designed with one question in mind: does this help a student earn more, faster?</p>
                    </div>
                    <div ref={featRef} className="feat__grid">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="feat__card">
                                <div className="feat__card-icon" style={{ background: `${f.color}18`, color: f.color }}>
                                    {f.icon}
                                </div>
                                <h3 className="feat__card-title">{f.title}</h3>
                                <p className="feat__card-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 5. TARGET AUDIENCE ══════════════════ */}
            <section className="audience">
                <div className="container">
                    <div className="audience__header">
                        <div className="section-tag"><span>👥</span> Who It's For</div>
                        <h2 className="section-title">One Platform, Many Beneficiaries</h2>
                        <p className="section-subtitle">Whether you're a student looking for income, a business seeking fresh talent, or an instructor empowering students — SkillKart is built for you.</p>
                    </div>
                    <div ref={audienceRef} className="audience__grid">
                        {AUDIENCES.map((a) => (
                            <div key={a.title} className="audience__card">
                                <div className="audience__card-icon">{a.icon}</div>
                                <h3 className="audience__card-title">{a.title}</h3>
                                <p className="audience__card-subtitle">{a.subtitle}</p>
                                <ul className="audience__list">
                                    {a.points.map((pt) => (
                                        <li key={pt} className="audience__list-item">
                                            <span className="audience__check">✓</span> {pt}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 6. UNIQUE VALUE PROPOSITION ══════════════════ */}
            <section className="uvp">
                <div className="container">
                    <div ref={uvpRef} className="uvp__inner">
                        <div className="uvp__left">
                            <div className="section-tag" style={{ color: '#B7C9E2', borderColor: 'rgba(183,201,226,0.3)', background: 'rgba(183,201,226,0.1)' }}>
                                <span>🏆</span> Why SkillKart
                            </div>
                            <h2 className="uvp__heading">Not Just Another Freelancing Platform</h2>
                            <p className="uvp__sub">
                                Generic platforms were built for established professionals. SkillKart was engineered from
                                scratch for students — with AI that understands where you are in your career and what you
                                need to reach the next level.
                            </p>
                        </div>
                        <div className="uvp__right">
                            {[
                                { label: 'Student-first verification', generic: 'Experience required', sk: 'Skills-based entry' },
                                { label: 'AI matching quality', generic: 'Keyword search only', sk: 'ML-powered precision' },
                                { label: 'Mentorship', generic: 'None included', sk: 'Buddy AI 24/7' },
                                { label: 'Profile credibility', generic: 'Self-declared skills', sk: 'AI-verified badges' },
                                { label: 'Payment safety', generic: 'Invoice-based risks', sk: 'Escrow-protected' },
                            ].map((row) => (
                                <div key={row.label} className="uvp__row">
                                    <div className="uvp__row-label">{row.label}</div>
                                    <div className="uvp__row-generic">
                                        <span className="uvp__x">✗</span> {row.generic}
                                    </div>
                                    <div className="uvp__row-sk">
                                        <span className="uvp__check">✓</span> {row.sk}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 7. TECH STACK & SECURITY ══════════════════ */}
            <section className="tech">
                <div className="container">
                    <div className="tech__header">
                        <div className="section-tag"><span>🛠️</span> Technology</div>
                        <h2 className="section-title">Built on a Modern, Secure Stack</h2>
                        <p className="section-subtitle">Enterprise-grade technology powering a student-friendly experience.</p>
                    </div>
                    <div ref={techRef} className="tech__grid">
                        {TECH_STACK.map((t) => (
                            <div key={t.label} className="tech__pill">
                                <span className="tech__pill-icon">{t.icon}</span>
                                <div>
                                    <div className="tech__pill-label">{t.label}</div>
                                    <div className="tech__pill-value">{t.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="tech__security">
                        <div className="tech__security-icon">🔐</div>
                        <div>
                            <h3 className="tech__security-title">Your Data, Your Privacy</h3>
                            <p className="tech__security-text">
                                All personal data is encrypted at rest (AES-256) and in transit (TLS 1.3). We never sell
                                user data, comply with GDPR and local data-protection regulations, and offer full account
                                deletion on request. Payment information is handled exclusively by Stripe and never stored
                                on our servers.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ 8. TESTIMONIALS ══════════════════ */}
            <section className="about-testimonials">
                <div className="container">
                    <div className="about-testimonials__header">
                        <div className="section-tag"><span>💬</span> Success Stories</div>
                        <h2 className="section-title">Real Students. Real Results.</h2>
                        <p className="section-subtitle">Over Rs. 2.1 million earned by students across Pakistan since our beta launch.</p>
                    </div>
                    <div ref={testimonialsRef} className="about-testimonials__grid">
                        {TESTIMONIALS.map((t) => (
                            <div key={t.name} className="about-testimonial__card">
                                <div className="about-testimonial__stars">★★★★★</div>
                                <p className="about-testimonial__text">"{t.text}"</p>
                                <div className="about-testimonial__footer">
                                    <div className="about-testimonial__avatar" style={{ background: t.avatarBg }}>
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <div className="about-testimonial__name">{t.name}</div>
                                        <div className="about-testimonial__role">{t.role}</div>
                                        <div className="about-testimonial__uni">📍 {t.university}</div>
                                    </div>
                                    <div className="about-testimonial__earned">
                                        <span className="about-testimonial__earned-val">{t.earned}</span>
                                        <span className="about-testimonial__earned-lbl">Earned</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 9. ROADMAP ══════════════════ */}
            <section className="roadmap">
                <div className="container">
                    <div className="roadmap__header">
                        <div className="section-tag"><span>🗺️</span> Roadmap</div>
                        <h2 className="section-title">Where We're Headed</h2>
                        <p className="section-subtitle">SkillKart is actively evolving. Here's what's live, what's building, and what's next.</p>
                    </div>
                    <div ref={roadmapRef} className="roadmap__grid">
                        {ROADMAP.map((phase) => (
                            <div key={phase.phase} className="roadmap__card">
                                <div className="roadmap__card-top">
                                    <span className="roadmap__phase">{phase.phase}</span>
                                    <span className="roadmap__status" style={{ background: `${phase.statusColor}18`, color: phase.statusColor }}>
                                        {phase.status}
                                    </span>
                                </div>
                                <h3 className="roadmap__title">{phase.title}</h3>
                                <ul className="roadmap__list">
                                    {phase.items.map((item) => (
                                        <li key={item} className="roadmap__list-item">
                                            <span className="roadmap__bullet" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 10. FAQ ══════════════════ */}
            <section className="about-faq">
                <div className="container">
                    <div className="about-faq__header">
                        <div className="section-tag"><span>❓</span> FAQ</div>
                        <h2 className="section-title">Frequently Asked Questions</h2>
                        <p className="section-subtitle">Everything you need to know before getting started on SkillKart.</p>
                    </div>
                    <div ref={faqRef} className="about-faq__list">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className={`about-faq__item ${openFaq === i ? 'about-faq__item--open' : ''}`}
                                onClick={() => toggleFaq(i)}
                            >
                                <div className="about-faq__q">
                                    <span>{faq.q}</span>
                                    <span className="about-faq__arrow">{openFaq === i ? '−' : '+'}</span>
                                </div>
                                <div className="about-faq__a">
                                    <p>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ 11. CALL TO ACTION ══════════════════ */}
            <section className="about-cta">
                <div className="about-cta__bg">
                    <div className="about-cta__orb about-cta__orb--1" />
                    <div className="about-cta__orb about-cta__orb--2" />
                </div>
                <div className="container">
                    <div ref={ctaRef} className="about-cta__inner">
                        <div className="about-cta__badge">🚀 Ready to Start?</div>
                        <h2 className="about-cta__heading">
                            Your First Paid Project is<br />
                            <span className="about-cta__accent">30 Minutes Away</span>
                        </h2>
                        <p className="about-cta__sub">
                            Join 50,000+ students who've already verified their skills, landed projects,
                            and built careers on SkillKart. It's free to start — no credit card required.
                        </p>
                        <div className="about-cta__btns">
                            <Link to="/registration" className="about-cta__btn-primary">
                                Create Free Account →
                            </Link>
                            <Link to="/" className="about-cta__btn-secondary">
                                Browse Features
                            </Link>
                        </div>
                        <p className="about-cta__note">
                            Have questions?{' '}
                            <Link to="/contact" className="about-cta__link">
                                Contact our support team
                            </Link>
                            — we respond within 24 hours.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}
