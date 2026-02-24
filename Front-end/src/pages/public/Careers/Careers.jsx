import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import './Careers.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ─── */
const CULTURE_CARDS = [
    { icon: '🚀', title: 'Move Fast, Learn Faster', desc: 'We ship weekly, break things thoughtfully, and reflect every sprint. You\'ll make more impactful decisions here in 3 months than at a big tech firm in 3 years.' },
    { icon: '🎓', title: 'Learning Budget: Real', desc: 'Every team member gets a PKR 60,000/year learning allowance for courses, conferences, certifications, and books. No approval theatre.' },
    { icon: '🌍', title: 'Remote-First Flexibility', desc: 'We\'re async-first with optional Islamabad/Karachi in-person days. Work where you\'re most productive — we judge output, not office hours.' },
    { icon: '🤝', title: 'Radical Transparency', desc: 'Company metrics, roadmap priorities, and board updates are shared with every team member each month. No information silos.' },
    { icon: '⚡', title: 'Ownership by Default', desc: 'You won\'t be handed a Jira ticket list. You\'ll own features end-to-end, make product calls, and see your name in the changelog.' },
    { icon: '💚', title: 'Wellbeing First', desc: 'Friday deep-work blocks (no meetings after 2pm), 20 days annual leave, mental health days, and a monthly wellness stipend.' },
];

const BENEFITS = [
    { icon: '💰', title: 'Competitive Salary', desc: 'Market-rate + equity for all permanent roles. Reviewed twice annually.' },
    { icon: '🏥', title: 'Health Insurance', desc: 'Comprehensive family health cover from day one via a leading Pakistani insurer.' },
    { icon: '🖥️', title: 'Equipment Budget', desc: 'PKR 150,000 equipment budget to set up your ideal workstation.' },
    { icon: '📅', title: '20 Days Leave', desc: 'Plus 11 national holidays, your birthday off, and 5 mental health days.' },
    { icon: '📚', title: 'Learning Budget', desc: 'PKR 60,000/year for courses, books, and conferences of your choice.' },
    { icon: '🍕', title: 'Team Retreats', desc: 'Bi-annual full-team retreats — local and (once/year) international.' },
    { icon: '⚡', title: 'Equity / ESOP', desc: 'All full-time employees receive stock options with a 1-year cliff.' },
    { icon: '📡', title: 'Internet Stipend', desc: 'PKR 5,000/month toward your home internet or mobile data plan.' },
];

const DEPT_FILTERS = ['All', 'Engineering', 'Product', 'Design', 'Marketing', 'Operations'];

const OPEN_ROLES = [
    {
        id: 1, dept: 'Engineering', title: 'Senior React / Next.js Engineer',
        type: 'Full-time', location: 'Remote (PK)', experience: '3+ years',
        salary: 'PKR 220K–280K/month', deadline: 'Mar 15, 2026', isNew: true,
        description: 'You\'ll lead the SkillKart front-end guild, own the design system, and ship features that thousands of students use daily.',
    },
    {
        id: 2, dept: 'Engineering', title: 'Node.js / Express Backend Engineer',
        type: 'Full-time', location: 'Remote (PK)', experience: '2+ years',
        salary: 'PKR 180K–240K/month', deadline: 'Mar 20, 2026', isNew: true,
        description: 'Architect and build the APIs that power payments, AI features, and real-time notifications across the platform.',
    },
    {
        id: 3, dept: 'Product', title: 'Product Manager – AI Features',
        type: 'Full-time', location: 'Islamabad / Remote', experience: '4+ years',
        salary: 'PKR 250K–320K/month', deadline: 'Mar 25, 2026', isNew: false,
        description: 'Define and drive the roadmap for Buddy AI and Skill Verification — two of SkillKart\'s most-loved features.',
    },
    {
        id: 4, dept: 'Design', title: 'Senior UI/UX Designer',
        type: 'Full-time', location: 'Remote (PK)', experience: '3+ years',
        salary: 'PKR 160K–200K/month', deadline: 'Apr 1, 2026', isNew: false,
        description: 'Lead design for the freelancer and client dashboard — user research, wireframes, high-fidelity Figma, and design system ownership.',
    },
    {
        id: 5, dept: 'Marketing', title: 'Growth Marketing Manager',
        type: 'Full-time', location: 'Karachi / Remote', experience: '3+ years',
        salary: 'PKR 160K–210K/month', deadline: 'Apr 5, 2026', isNew: true,
        description: 'Own student acquisition across Pakistani universities through content, partnerships, events, and paid performance marketing.',
    },
    {
        id: 6, dept: 'Engineering', title: 'ML Engineer – Recommendation Systems',
        type: 'Full-time', location: 'Remote (PK)', experience: '2+ years',
        salary: 'PKR 200K–260K/month', deadline: 'Mar 30, 2026', isNew: false,
        description: 'Build and tune the models that match clients to the perfect freelancer — collaborative filtering, NLP embeddings, and A/B experiments.',
    },
];

const FAQS = [
    { q: 'Do you sponsor visas or offer relocation support?', a: 'At this stage, all roles are open to Pakistan-based candidates only. We hire remotely across all provinces and offer a relocation allowance to Islamabad for roles that require occasional in-office presence.' },
    { q: 'How long does the hiring process take?', a: 'Our typical timeline is 10–14 working days from application to offer: screening call (30 min) → technical / work sample (2–3 days) → panel interview (60 min) → reference check → offer.' },
    { q: 'Are internships available?', a: 'Yes! We run a structured 3-month internship program twice a year (June and December). Watch our LinkedIn and this page for announcements, or subscribe via the job alerts form below.' },
    { q: 'What tech stack do you use?', a: 'Front-end: React / Next.js / Vite. Back-end: Node.js / Express / PostgreSQL. AI: Python / FastAPI / OpenAI. Infrastructure: Railway, Vercel, Cloudflare. We document all decisions in public RFCs.' },
    { q: 'Is there a probation period?', a: 'All permanent roles include a 3-month probation with structured feedback at weeks 4 and 12. We believe probation should feel supportive, not stressful — you\'ll have a dedicated buddy from day one.' },
];

/* ─── COMPONENT ─── */
export default function Careers() {
    const [activeFilter, setActiveFilter] = useState('All');
    const [openFaq, setOpenFaq] = useState(null);
    const [modalRole, setModalRole] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', github: '', why: '', resume: '' });
    const [alertEmail, setAlertEmail] = useState('');

    const filtered = OPEN_ROLES.filter(r => activeFilter === 'All' || r.dept === activeFilter);

    useEffect(() => {
        document.title = 'Careers | SkillKart — Build What\'s Next in Freelancing';

        const tl = gsap.timeline({ delay: 0.15 });
        tl.fromTo('.careers-hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
            .fromTo('.careers-hero__heading', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo('.careers-hero__sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
            .fromTo('.careers-hero__btns', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.2');

        gsap.fromTo('.culture-card',
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.careers-culture__grid', start: 'top 82%' }
            }
        );

        gsap.fromTo('.benefit-card',
            { y: 20, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power3.out',
                scrollTrigger: { trigger: '.careers-benefits__grid', start: 'top 82%' }
            }
        );

        gsap.fromTo('.role-card',
            { x: -20, opacity: 0 },
            {
                x: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.careers-roles__list', start: 'top 85%' }
            }
        );

        return () => ScrollTrigger.getAll().forEach(t => t.kill());
    }, []);

    const handleApply = (e) => {
        e.preventDefault();
        alert(`✅ Application submitted for "${modalRole.title}"! We'll be in touch within 3 business days.`);
        setModalRole(null);
        setFormData({ name: '', email: '', github: '', why: '', resume: '' });
    };

    return (
        <>
            <Navbar />

            {/* ══ HERO ══ */}
            <section className="careers-hero">
                <div className="careers-hero__bg">
                    <div className="careers-hero__orb careers-hero__orb--1" />
                    <div className="careers-hero__orb careers-hero__orb--2" />
                    <div className="careers-hero__grid" />
                </div>
                <div className="container careers-hero__inner">
                    <div className="careers-hero__badge">🏢 Careers at SkillKart</div>
                    <h1 className="careers-hero__heading">
                        Build the Future of<br />
                        <span className="careers-hero__accent">Student Freelancing</span>
                    </h1>
                    <p className="careers-hero__sub">
                        We're a small, fast-moving team on a mission to make Pakistan's talent the world's first
                        choice. If you want real ownership, meaningful impact, and a great pay cheque — let's talk.
                    </p>
                    <div className="careers-hero__btns">
                        <a href="#open-roles" className="careers-hero__btn-main"
                            onClick={e => { e.preventDefault(); document.getElementById('open-roles')?.scrollIntoView({ behavior: 'smooth' }); }}>
                            🔍 View Open Roles
                        </a>
                        <Link to="/about" className="careers-hero__btn-outline">
                            Our Story →
                        </Link>
                    </div>
                </div>
                <div className="careers-hero__wave">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                    </svg>
                </div>
            </section>

            {/* ══ CULTURE ══ */}
            <section className="careers-culture">
                <div className="container">
                    <div className="careers-culture__header">
                        <div className="section-tag"><span>🌱</span> Our Culture</div>
                        <h2 className="section-title">Why People Choose SkillKart</h2>
                        <p className="section-subtitle" style={{ margin: '0 auto' }}>
                            We're not a 9-to-5 company. We're a team of builders who ship, learn, and grow together.
                        </p>
                    </div>
                    <div className="careers-culture__grid">
                        {CULTURE_CARDS.map(c => (
                            <div key={c.title} className="culture-card">
                                <div className="culture-card__icon">{c.icon}</div>
                                <h3 className="culture-card__title">{c.title}</h3>
                                <p className="culture-card__desc">{c.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ BENEFITS ══ */}
            <section className="careers-benefits">
                <div className="container">
                    <div className="careers-benefits__header">
                        <div className="section-tag"><span>🎁</span> Benefits</div>
                        <h2 className="section-title">Our Total Compensation Package</h2>
                    </div>
                    <div className="careers-benefits__grid">
                        {BENEFITS.map(b => (
                            <div key={b.title} className="benefit-card">
                                <div className="benefit-card__icon">{b.icon}</div>
                                <h3 className="benefit-card__title">{b.title}</h3>
                                <p className="benefit-card__desc">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ OPEN ROLES ══ */}
            <section className="careers-roles" id="open-roles">
                <div className="container">
                    <div className="careers-roles__header">
                        <div className="section-tag"><span>💼</span> Open Positions</div>
                        <h2 className="section-title">{filtered.length} Role{filtered.length !== 1 ? 's' : ''} Available</h2>
                        <div className="careers-roles__filter" role="group" aria-label="Filter by department">
                            {DEPT_FILTERS.map(f => (
                                <button
                                    key={f}
                                    className={`careers-roles__filter-btn${activeFilter === f ? ' active' : ''}`}
                                    onClick={() => setActiveFilter(f)}
                                    aria-pressed={activeFilter === f}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="careers-roles__list">
                        {filtered.map(role => (
                            <div key={role.id} className="role-card">
                                <div className="role-card__left">
                                    <div className="role-card__dept">{role.dept}</div>
                                    <h3 className="role-card__title">{role.title}</h3>
                                    <div className="role-card__meta">
                                        <span className="role-card__tag">🏠 {role.location}</span>
                                        <span className="role-card__tag">⏱ {role.type}</span>
                                        <span className="role-card__tag">🎯 {role.experience}</span>
                                        <span className="role-card__tag">💰 {role.salary}</span>
                                    </div>
                                </div>
                                <div className="role-card__right">
                                    {role.isNew && <span className="role-card__badge-new">✨ New</span>}
                                    <div className="role-card__deadline">Deadline: {role.deadline}</div>
                                    <button
                                        className="role-card__apply"
                                        onClick={() => setModalRole(role)}
                                        aria-label={`Apply for ${role.title}`}
                                    >
                                        Apply Now →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ JOB ALERT ══ */}
            <section className="careers-alert">
                <div className="careers-alert__orb careers-alert__orb--1" />
                <div className="careers-alert__orb careers-alert__orb--2" />
                <div className="container careers-alert__inner">
                    <h2 className="careers-alert__heading">🔔 No Perfect Role Yet?</h2>
                    <p className="careers-alert__sub">Subscribe to job alerts and be first to know when new roles open.</p>
                    <div className="careers-alert__form" role="form" aria-label="Job alert signup">
                        <input
                            type="email"
                            className="careers-alert__input"
                            placeholder="your@email.com"
                            value={alertEmail}
                            onChange={e => setAlertEmail(e.target.value)}
                            aria-label="Email for job alerts"
                        />
                        <button
                            className="careers-alert__submit"
                            onClick={() => { alert('✅ Subscribed! We\'ll notify you when new roles open.'); setAlertEmail(''); }}
                        >
                            Notify Me
                        </button>
                    </div>
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="careers-faq">
                <div className="container">
                    <div className="careers-faq__header">
                        <div className="section-tag"><span>❓</span> FAQ</div>
                        <h2 className="section-title">Common Questions</h2>
                    </div>
                    <div className="careers-faq__list" role="list">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className={`careers-faq__item${openFaq === i ? ' open' : ''}`}
                                role="listitem"
                            >
                                <button
                                    className="careers-faq__q"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    aria-expanded={openFaq === i}
                                >
                                    {faq.q}
                                    <span className="careers-faq__icon" aria-hidden="true">+</span>
                                </button>
                                <div className="careers-faq__a" aria-hidden={openFaq !== i}>
                                    <div className="careers-faq__a-inner">{faq.a}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ APPLY MODAL ══ */}
            {modalRole && (
                <div
                    className="career-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    onClick={e => { if (e.target === e.currentTarget) setModalRole(null); }}
                >
                    <div className="career-modal">
                        <div className="career-modal__header">
                            <div>
                                <div id="modal-title" className="career-modal__title">{modalRole.title}</div>
                                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-light)', marginTop: 4 }}>{modalRole.dept} · {modalRole.location}</div>
                            </div>
                            <button className="career-modal__close" onClick={() => setModalRole(null)} aria-label="Close application form">×</button>
                        </div>
                        <div className="career-modal__body">
                            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-mid)', marginBottom: 'var(--space-6)', lineHeight: 'var(--lh-relaxed)' }}>
                                {modalRole.description}
                            </p>
                            <form className="career-form" onSubmit={handleApply}>
                                <div className="career-form__group">
                                    <label className="career-form__label" htmlFor="cf-name">Full Name *</label>
                                    <input id="cf-name" required type="text" className="career-form__input" placeholder="Muhammad Ali"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="career-form__group">
                                    <label className="career-form__label" htmlFor="cf-email">Email Address *</label>
                                    <input id="cf-email" required type="email" className="career-form__input" placeholder="ali@university.edu"
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="career-form__group">
                                    <label className="career-form__label" htmlFor="cf-github">GitHub / Portfolio URL</label>
                                    <input id="cf-github" type="url" className="career-form__input" placeholder="https://github.com/username"
                                        value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} />
                                </div>
                                <div className="career-form__group">
                                    <label className="career-form__label" htmlFor="cf-why">Why SkillKart? *</label>
                                    <textarea id="cf-why" required className="career-form__textarea" placeholder="Tell us what excites you about this role and SkillKart's mission…"
                                        value={formData.why} onChange={e => setFormData({ ...formData, why: e.target.value })} />
                                </div>
                                <div className="career-form__group">
                                    <label className="career-form__label" htmlFor="cf-resume">Resume / CV Link *</label>
                                    <input id="cf-resume" required type="url" className="career-form__input" placeholder="https://drive.google.com/…"
                                        value={formData.resume} onChange={e => setFormData({ ...formData, resume: e.target.value })} />
                                </div>
                                <button type="submit" className="career-form__submit">Submit Application →</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
}
