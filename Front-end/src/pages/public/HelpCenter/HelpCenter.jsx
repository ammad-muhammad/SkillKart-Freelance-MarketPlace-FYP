import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import './HelpCenter.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ─── */
const CATEGORIES = [
    { id: 'getting-started', icon: '🚀', label: 'Getting Started', articles: 14, color: '#0a4a73', bg: 'rgba(10,74,115,.1)', desc: 'Account setup, profile building, and your first project.' },
    { id: 'payments', icon: '💳', label: 'Payments & Escrow', articles: 12, color: '#276749', bg: 'rgba(39,103,73,.1)', desc: 'Billing, escrow milestones, withdrawals, and invoices.' },
    { id: 'ai-tools', icon: '🤖', label: 'AI Tools & Buddy', articles: 18, color: '#1a6fa8', bg: 'rgba(26,111,168,.1)', desc: 'Buddy AI, matchmaking engine, and skill verification.' },
    { id: 'disputes', icon: '⚖️', label: 'Disputes & Safety', articles: 9, color: '#c05621', bg: 'rgba(192,86,33,.1)', desc: 'How to raise disputes, refund policies, and account safety.' },
    { id: 'freelancers', icon: '🎯', label: 'For Freelancers', articles: 22, color: '#553c9a', bg: 'rgba(85,60,154,.1)', desc: 'Proposals, portfolio, contracts, and getting found.' },
    { id: 'clients', icon: '🏢', label: 'For Clients', articles: 16, color: '#b7791f', bg: 'rgba(183,121,31,.1)', desc: 'Posting projects, reviewing proposals, and managing teams.' },
];

const FAQS = [
    {
        id: 1, cat: 'getting-started',
        q: 'How do I create my SkillKart account?',
        a: 'Go to skillkart.com/register, enter your university email, verify via OTP, and complete your profile in under 5 minutes. Students automatically get a verified student badge.',
    },
    {
        id: 2, cat: 'getting-started',
        q: 'How does AI skill verification work?',
        a: 'Our AI analyses your GitHub, portfolio links, and completed assessments to assign a verified badge to your listed skills. This isn\'t just a checkbox — it\'s ML-powered credibility that clients trust.',
    },
    {
        id: 3, cat: 'payments',
        q: 'When does money transfer to my account?',
        a: 'Once a milestone is marked complete by the client and approved, funds release to your SkillKart wallet within 24 hours. You can then withdraw to your bank account or Easypaisa/JazzCash anytime.',
    },
    {
        id: 4, cat: 'payments',
        q: 'What fees does SkillKart charge?',
        a: 'SkillKart deducts a small platform fee (currently 0.5%) from the freelancer\'s payout when a payment is released. Clients pay the agreed price, with no service fee added on top. There are no subscription costs — a fee is taken only when work is paid for.',
    },
    {
        id: 5, cat: 'ai-tools',
        q: 'What is Buddy AI and how do I use it?',
        a: 'Buddy AI is your personal freelancing assistant. It writes tailored proposals based on project descriptions, optimizes your profile keywords, and analyses client briefs to highlight your best matching skills.',
    },
    {
        id: 6, cat: 'ai-tools',
        q: 'How does AI Matchmaking decide rankings?',
        a: 'The AI matchmaking engine scores freelancers on 12 signals: skill overlap, past project success rate, response time, rating, availability, and more. The top-ranked matches are explained in plain English.',
    },
    {
        id: 7, cat: 'disputes',
        q: 'What happens if a client refuses to release payment?',
        a: 'Funds are held in Stripe escrow — clients cannot simply disappear with them. If a milestone is disputed, our resolution team reviews both sides within 48 hours and reaches a fair decision based on evidence submitted.',
    },
    {
        id: 8, cat: 'freelancers',
        q: 'How do I write a winning proposal?',
        a: 'Focus on the client\'s problem — not your resume. Address their specific brief, provide a realistic timeline, show a relevant portfolio piece, and use Buddy AI to personalize the tone. Keep it under 300 words.',
    },
    {
        id: 9, cat: 'clients',
        q: 'How do I post a project?',
        a: 'Click "Post a Project" in the navbar, fill in the title, description, budget, and timeline (takes under 3 minutes), and our AI immediately starts matching you with the best-fit freelancers — no searching required.',
    },
];

// Each links to the real page that actually performs the action.
const POPULAR = [
    { id: 1, icon: '🔑', title: 'Reset your password', to: '/forgot-password' },
    { id: 2, icon: '📄', title: 'Find work & submit a proposal', to: '/browse-projects' },
    { id: 3, icon: '✅', title: 'Get your skills AI-verified', to: '/freelancer/skill-test' },
    { id: 4, icon: '🤖', title: 'Use Buddy AI for your profile', to: '/ai/buddy' },
    { id: 5, icon: '🚀', title: 'Post a project & get matched', to: '/post-project' },
    { id: 6, icon: '💬', title: 'Contact support', to: '/contact' },
];

const SUPPORT_EMAIL = 'support@skillkart.com';
const SUPPORT_CHANNELS = [
    { icon: '📧', title: 'Email Support', desc: 'Send a detailed ticket and get a thorough response from our team.', cta: 'Send Email', color: '#276749', bg: 'rgba(39,103,73,.07)', wait: 'Avg. response: 4 hrs', href: `mailto:${SUPPORT_EMAIL}` },
    { icon: '📨', title: 'Contact Form', desc: "Prefer a form? Reach us through our contact page and we'll get back to you.", cta: 'Go to Contact', color: '#0a4a73', bg: 'rgba(10,74,115,.07)', wait: 'Avg. response: 4 hrs', to: '/contact' },
];

const STATUS = [
    { label: 'API & Matchmaking', ok: true },
    { label: 'Payments & Escrow', ok: true },
    { label: 'Buddy AI', ok: true },
    { label: 'File Uploads', ok: false, note: 'Degraded — 10 min delay' },
    { label: 'Notifications', ok: true },
];

/* ─────────────── COMPONENT ─────────────── */
export default function HelpCenter() {
    const [searchQ, setSearchQ] = useState('');
    const [activecat, setActivecat] = useState('all');
    const [openFaq, setOpenFaq] = useState(null);

    useEffect(() => {
        document.title = 'Help Center — SkillKart Support & Documentation';

        const tl = gsap.timeline({ delay: 0.1 });
        tl.fromTo('.hc-hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
            .fromTo('.hc-hero__heading', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power4.out' }, '-=0.2')
            .fromTo('.hc-hero__sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
            .fromTo('.hc-hero__search-wrap', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.2');

        gsap.fromTo('.hc-cat-card',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.07, duration: 0.5, ease: 'power3.out', scrollTrigger: { trigger: '.hc-cats__grid', start: 'top 84%' } }
        );
        gsap.fromTo('.hc-popular-item',
            { x: -20, opacity: 0 },
            { x: 0, opacity: 1, stagger: 0.06, duration: 0.45, ease: 'power3.out', scrollTrigger: { trigger: '.hc-popular__list', start: 'top 84%' } }
        );
        gsap.fromTo('.hc-faq-item',
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.06, duration: 0.45, ease: 'power3.out', scrollTrigger: { trigger: '.hc-faq__list', start: 'top 84%' } }
        );
        gsap.fromTo('.hc-support-card',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.1, duration: 0.55, ease: 'power3.out', scrollTrigger: { trigger: '.hc-support__grid', start: 'top 84%' } }
        );

        return () => ScrollTrigger.getAll().forEach(t => t.kill());
    }, []);

    const filteredFaqs = FAQS.filter(f => {
        const matchCat = activecat === 'all' || f.cat === activecat;
        const matchQ = f.q.toLowerCase().includes(searchQ.toLowerCase()) || f.a.toLowerCase().includes(searchQ.toLowerCase());
        return matchCat && matchQ;
    });

    return (
        <>
            <Navbar />

            {/* ══ HERO ══ */}
            <section className="hc-hero">
                <div className="hc-hero__orb hc-hero__orb--1" />
                <div className="hc-hero__orb hc-hero__orb--2" />
                <div className="hc-hero__grid" />
                <div className="container hc-hero__inner">
                    <div className="hc-hero__badge">🛟 Help Center</div>
                    <h1 className="hc-hero__heading">
                        How can we <span className="hc-hero__accent">help you?</span>
                    </h1>
                    <p className="hc-hero__sub">
                        Search our knowledge base, browse FAQs, or reach our support team — we're here to make sure you succeed.
                    </p>
                    <div className="hc-hero__search-wrap">
                        <span className="hc-hero__search-icon">🔍</span>
                        <input
                            id="hc-search"
                            type="search"
                            className="hc-hero__search"
                            placeholder={"Search articles - e.g. 'withdraw earnings', 'proposal tips'..."}
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                            aria-label="Search help articles"
                        />
                    </div>
                    <div className="hc-hero__suggestions">
                        {['Reset password', 'Escrow payment', 'Buddy AI', 'Dispute resolution'].map(s => (
                            <button key={s} className="hc-hero__sug" onClick={() => setSearchQ(s)}>{s}</button>
                        ))}
                    </div>
                </div>
                <div className="hc-hero__wave">
                    <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                    </svg>
                </div>
            </section>

            {/* ══ SYSTEM STATUS ══ */}
            <div className="hc-status-bar">
                <div className="container hc-status-bar__inner">
                    <span className="hc-status-bar__label">System Status:</span>
                    {STATUS.map(s => (
                        <span key={s.label} className={`hc-status-item${s.ok ? '' : ' hc-status-item--warn'}`}>
                            <span className={`hc-status-dot${s.ok ? '' : ' hc-status-dot--warn'}`} />
                            {s.label}
                            {!s.ok && <span className="hc-status-note">{s.note}</span>}
                        </span>
                    ))}
                    <Link to="/contact" className="hc-status-bar__all">View all →</Link>
                </div>
            </div>

            {/* ══ CATEGORIES ══ */}
            <section className="hc-cats">
                <div className="container">
                    <div className="hc-section-header">
                        <div className="section-tag"><span>📂</span> Browse Topics</div>
                        <h2 className="section-title">What do you need help with?</h2>
                    </div>
                    <div className="hc-cats__grid">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                className={`hc-cat-card${activecat === cat.id ? ' hc-cat-card--active' : ''}`}
                                onClick={() => setActivecat(activecat === cat.id ? 'all' : cat.id)}
                                style={activecat === cat.id ? { borderColor: cat.color, boxShadow: `0 0 0 3px ${cat.bg}` } : {}}
                            >
                                <div className="hc-cat-card__icon" style={{ background: cat.bg, color: cat.color }}>
                                    {cat.icon}
                                </div>
                                <div className="hc-cat-card__body">
                                    <div className="hc-cat-card__name">{cat.label}</div>
                                    <div className="hc-cat-card__desc">{cat.desc}</div>
                                </div>
                                <div className="hc-cat-card__count" style={{ color: cat.color }}>{cat.articles} articles</div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ POPULAR + FAQ ══ */}
            <section className="hc-body">
                <div className="container hc-body__layout">

                    {/* Left – Popular Articles */}
                    <div className="hc-popular">
                        <div className="hc-popular__header">
                            <div className="hc-popular__title">⭐ Quick Links</div>
                        </div>
                        <div className="hc-popular__list">
                            {POPULAR.map(p => (
                                <Link key={p.id} to={p.to} className="hc-popular-item">
                                    <span className="hc-popular-item__icon">{p.icon}</span>
                                    <span className="hc-popular-item__title">{p.title}</span>
                                    <span className="hc-popular-item__arrow">→</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right – FAQ Accordion */}
                    <div className="hc-faq">
                        <div className="hc-faq__header">
                            <div className="hc-faq__title">
                                ❓ FAQs
                                {activecat !== 'all' && (
                                    <span className="hc-faq__cat-pill">
                                        {CATEGORIES.find(c => c.id === activecat)?.label}
                                        <button className="hc-faq__cat-clear" onClick={() => setActivecat('all')} aria-label="Clear category filter">✕</button>
                                    </span>
                                )}
                            </div>
                            <div className="hc-faq__count">{filteredFaqs.length} question{filteredFaqs.length !== 1 ? 's' : ''}</div>
                        </div>

                        <div className="hc-faq__list">
                            {filteredFaqs.length > 0 ? filteredFaqs.map(f => (
                                <div
                                    key={f.id}
                                    className={`hc-faq-item${openFaq === f.id ? ' hc-faq-item--open' : ''}`}
                                >
                                    <button
                                        className="hc-faq-item__q"
                                        onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}
                                        aria-expanded={openFaq === f.id}
                                    >
                                        <span>{f.q}</span>
                                        <span className="hc-faq-item__chevron">
                                            {openFaq === f.id ? '▲' : '▼'}
                                        </span>
                                    </button>
                                    {openFaq === f.id && (
                                        <div className="hc-faq-item__a">{f.a}</div>
                                    )}
                                </div>
                            )) : (
                                <div className="hc-faq__empty">
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                                    <div>No results found for <strong>"{searchQ}"</strong>.</div>
                                    <div style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                                        Try different keywords or browse a category above.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ CONTACT SUPPORT ══ */}
            <section className="hc-support">
                <div className="container">
                    <div className="hc-section-header">
                        <div className="section-tag"><span>🤝</span> Still need help?</div>
                        <h2 className="section-title">Reach Our Support Team</h2>
                        <p className="section-subtitle">
                            Our support agents are real humans — no bots. We're here 7 days a week.
                        </p>
                    </div>
                    <div className="hc-support__grid">
                        {SUPPORT_CHANNELS.map(ch => (
                            <div key={ch.title} className="hc-support-card" style={{ borderTop: `3px solid ${ch.color}` }}>
                                <div className="hc-support-card__icon" style={{ background: ch.bg, color: ch.color }}>
                                    {ch.icon}
                                </div>
                                <h3 className="hc-support-card__title">{ch.title}</h3>
                                <p className="hc-support-card__desc">{ch.desc}</p>
                                <div className="hc-support-card__wait">{ch.wait}</div>
                                {ch.href ? (
                                    <a href={ch.href} className="hc-support-card__btn" style={{ background: ch.color }}>
                                        {ch.cta} →
                                    </a>
                                ) : (
                                    <Link to={ch.to} className="hc-support-card__btn" style={{ background: ch.color }}>
                                        {ch.cta} →
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ BOTTOM CTA ══ */}
            <section className="hc-bottom-cta">
                <div className="hc-bottom-cta__orb hc-bottom-cta__orb--1" />
                <div className="hc-bottom-cta__orb hc-bottom-cta__orb--2" />
                <div className="container hc-bottom-cta__inner">
                    <div className="hc-bottom-cta__left">
                        <div className="hc-bottom-cta__title">Didn't find your answer?</div>
                        <div className="hc-bottom-cta__sub">
                            Our support team is here to help. Reach out and we'll get back to you quickly.
                        </div>
                    </div>
                    <div className="hc-bottom-cta__right">
                        <Link to="/contact" className="hc-bottom-cta__btn">Contact Support →</Link>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}
