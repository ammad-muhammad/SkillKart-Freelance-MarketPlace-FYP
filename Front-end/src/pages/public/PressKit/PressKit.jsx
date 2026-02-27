import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import './PressKit.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ─── */
const OVERVIEW_STATS = [
    { value: '12K+', label: 'Registered Users' },
    { value: '4.8★', label: 'App Rating' },
    { value: '2025', label: 'Founded' },
    { value: 'PK', label: 'Headquarters' },
];

const BRAND_COLORS = [
    { name: 'Navy Primary', hex: '#042E4C', rgb: '4, 46, 76', usage: 'Hero backgrounds, headings', swatch: '#042E4C' },
    { name: 'Ocean Blue', hex: '#1a6fa8', rgb: '26, 111, 168', usage: 'Buttons, interactive elements', swatch: '#1a6fa8' },
    { name: 'Sky Accent', hex: '#B7C9E2', rgb: '183, 201, 226', usage: 'Gradients, decorative accents', swatch: '#B7C9E2' },
    { name: 'Pure White', hex: '#FFFFFF', rgb: '255, 255, 255', usage: 'Backgrounds, text on dark', swatch: '#FFFFFF' },
    { name: 'Text Dark', hex: '#1a2332', rgb: '26, 35, 50', usage: 'Body copy, paragraphs', swatch: '#1a2332' },
    { name: 'Soft Grey', hex: '#6b7c93', rgb: '107, 124, 147', usage: 'Captions, metadata, sublabels', swatch: '#6b7c93' },
    { name: 'Success', hex: '#276749', rgb: '39, 103, 73', usage: 'Badges, success states', swatch: '#276749' },
    { name: 'Warning', hex: '#c05621', rgb: '192, 86, 33', usage: 'Important alerts, warnings', swatch: '#c05621' },
];

const LOGOS = [
    { name: 'Primary Logo (Dark BG)', format: 'SVG + PNG', bg: 'linear-gradient(135deg,#042E4C,#1a6fa8)', textColor: '#fff' },
    { name: 'Primary Logo (Light BG)', format: 'SVG + PNG', bg: '#f0f7ff', textColor: '#042E4C' },
    { name: 'Wordmark Only', format: 'SVG + PNG', bg: '#fff', textColor: '#042E4C', wordmarkOnly: true },
    { name: 'Icon / Favicon', format: 'SVG + PNG + ICO', bg: 'linear-gradient(135deg,#042E4C,#1a6fa8)', iconOnly: true },
    { name: 'Monochrome Black', format: 'SVG + PNG', bg: '#f8f8f8', textColor: '#111', mono: true },
    { name: 'Monochrome White', format: 'SVG + PNG', bg: '#333', textColor: '#fff', monoWhite: true },
];

const TYPEFACES = [
    { sample: 'SkillKart', name: 'DM Serif Display (Heading)', weights: 'Regular 400, Bold 700, Black 900', use: 'Heroes, section titles, large display text', sampleClass: '' },
    { sample: 'Abcdefghij', name: 'Inter (Body)', weights: 'Regular 400, Medium 500, SemiBold 600, Bold 700', use: 'Body copy, UI labels, captions, buttons', sampleClass: 'press-type-sample--body' },
];

const EXEC_TEAM = [

    { name: 'Muhammad Ammad', role: 'CEO & Co-Founder', initials: 'AA', bg: 'linear-gradient(135deg,#1a6fa8,#B7C9E2)', bio: 'Ammad architects SkillKart\'s AI infrastructure, from Buddy AI to the skill verification engine. He holds a CS degree from FAST NUCES and has shipped production ML systems used by 12,000+ users.', linkedin: '#', email: 'cto@skillkart.app' },
    { name: 'Hassan Siddiqui', role: 'CTO & Co-Founder', initials: 'HS', bg: 'linear-gradient(135deg,#042E4C,#1a6fa8)', bio: 'Hassan leads SkillKart\'s vision of connecting Pakistan\'s top student talent with global clients. Previously at NUST Computing, he founded SkillKart to solve the gap between academic skills and real-world income.', linkedin: '#', email: 'ceo@skillkart.app' },
    { name: 'Syed obaid ullah shareef', role: 'Chief Product Officer', initials: 'AC', bg: 'linear-gradient(135deg,#553c9a,#B7C9E2)', bio: 'Asad owns the SkillKart roadmap, from client dashboards to the AI matchmaking pipeline. He brings UX research and product strategy expertise from his previous startup experience in the ed-tech sector.', linkedin: '#', email: 'cpo@skillkart.app' },
];

const PRESS_RELEASES = [
    { day: '20', month: 'Feb', year: '2026', title: 'SkillKart Launches Buddy AI: Pakistan\'s First Freelancer AI Assistant', excerpt: 'SkillKart today announced Buddy AI, a GPT-4 powered assistant that helps student freelancers write proposals, estimate pricing, and respond to client queries in real time.', href: '#' },
    { day: '15', month: 'Jan', year: '2026', title: 'SkillKart Crosses 10,000 Student Registrations in First 60 Days', excerpt: 'The Islamabad-based AI freelancing platform reached a major milestone as over 10,000 university students from 42 Pakistani campuses created verified profiles within two months of launch.', href: '#' },
    { day: '01', month: 'Dec', year: '2025', title: 'SkillKart Launches with Stripe-Powered Escrow and AI Skill Verification', excerpt: 'SkillKart officially opened to the public today with full milestone-based payment escrow via Stripe and an AI skill verification system that reduces fake profiles by 95%.', href: '#' },
];

const ASSET_TABS = ['Logos', 'Color Palette', 'Typography'];

/* ─── COMPONENT ─── */
export default function PressKit() {
    const [activeTab, setActiveTab] = useState('Logos');
    const heroRef = useRef(null);

    useEffect(() => {
        document.title = 'Press Kit | SkillKart — Media Assets and Brand Resources';

        const tl = gsap.timeline({ delay: 0.15 });
        tl.fromTo('.press-hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
            .fromTo('.press-hero__heading', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo('.press-hero__sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
            .fromTo('.press-hero__chips', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.2')
            .fromTo('.press-hero__download', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.1');

        gsap.fromTo('.press-stat',
            { y: 20, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'power3.out',
                scrollTrigger: { trigger: '.press-overview__stats', start: 'top 82%' }
            }
        );

        gsap.fromTo('.exec-card',
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.12, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.press-team__grid', start: 'top 82%' }
            }
        );

        gsap.fromTo('.pr-card',
            { x: -20, opacity: 0 },
            {
                x: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.press-releases__list', start: 'top 82%' }
            }
        );

        return () => ScrollTrigger.getAll().forEach(t => t.kill());
    }, []);

    return (
        <>
            <Navbar />

            {/* ══ HERO ══ */}
            <section ref={heroRef} className="press-hero">
                <div className="press-hero__bg">
                    <div className="press-hero__orb press-hero__orb--1" />
                    <div className="press-hero__orb press-hero__orb--2" />
                    <div className="press-hero__grid" />
                </div>
                <div className="container press-hero__inner">
                    <div className="press-hero__badge">📰 Press Kit</div>
                    <h1 className="press-hero__heading">
                        SkillKart <span className="press-hero__accent">Media Resources</span>
                    </h1>
                    <p className="press-hero__sub">
                        Everything journalists, bloggers, and media partners need — logos, brand assets,
                        executive bios, press releases, and media contacts. All in one place.
                    </p>
                    <div className="press-hero__chips">
                        <div className="press-hero__chip">🖼️ 6 Logo variants</div>
                        <div className="press-hero__chip">🎨 8 Brand colors</div>
                        <div className="press-hero__chip">👥 3 Executive bios</div>
                        <div className="press-hero__chip">📋 3 Press releases</div>
                    </div>
                    <a href="#" className="press-hero__download" aria-label="Download full media kit ZIP">
                        ⬇️ Download Full Media Kit (.zip)
                    </a>
                </div>
                <div className="press-hero__wave">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                    </svg>
                </div>
            </section>

            {/* ══ OVERVIEW ══ */}
            <section className="press-overview">
                <div className="container press-overview__grid">
                    <div className="press-overview__content">
                        <div className="section-tag"><span>🏢</span> Company Overview</div>
                        <h2 className="section-title">About SkillKart</h2>
                        <p className="press-overview__text">
                            SkillKart is Pakistan's first AI-powered micro-freelancing platform built exclusively for
                            university students. Founded in 2025, SkillKart connects verified student talent with
                            clients worldwide through an intelligent AI matching engine, milestone-based escrow
                            payments via Stripe, and Buddy — an AI assistant that helps freelancers write proposals,
                            estimate pricing, and grow their skills.
                        </p>
                        <p className="press-overview__text">
                            In under 60 days of public launch, SkillKart onboarded 12,000+ students from 42 Pakistani
                            universities, processed its first international client payments, and achieved a 4.8★
                            satisfaction rating. The platform is headquartered in Islamabad, Pakistan.
                        </p>
                        <div className="press-overview__stats">
                            {OVERVIEW_STATS.map(s => (
                                <div key={s.label} className="press-stat">
                                    <div className="press-stat__value">{s.value}</div>
                                    <div className="press-stat__label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="press-overview__card">
                        <div className="press-overview__card-orb press-overview__card-orb--1" />
                        <div className="press-overview__card-orb press-overview__card-orb--2" />
                        <div className="press-card__logo">🛒</div>
                        <div className="press-card__name">SkillKart</div>
                        <div className="press-card__tagline">Your Skills. Your Cart. Your Career.</div>
                    </div>
                </div>
            </section>

            {/* ══ BRAND ASSETS ══ */}
            <section className="press-assets">
                <div className="container">
                    <div className="press-assets__header">
                        <div className="section-tag"><span>🎨</span> Brand Assets</div>
                        <h2 className="section-title">Logo, Colors &amp; Typography</h2>
                        <p className="section-subtitle" style={{ margin: '0 auto var(--space-2)' }}>
                            All assets are provided in vector and raster formats. Please adhere to usage guidelines.
                        </p>
                    </div>
                    <div className="press-assets__tabs" role="tablist" aria-label="Asset type">
                        {ASSET_TABS.map(tab => (
                            <button
                                key={tab}
                                className={`press-tab${activeTab === tab ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                                role="tab"
                                aria-selected={activeTab === tab}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* LOGOS */}
                    {activeTab === 'Logos' && (
                        <div className="press-assets__section">
                            <div className="press-logos-grid">
                                {LOGOS.map(logo => (
                                    <div key={logo.name} className="press-logo-card">
                                        <div
                                            className="press-logo-card__preview"
                                            style={{ background: logo.bg }}
                                            role="img"
                                            aria-label={`${logo.name} preview`}
                                        >
                                            {logo.iconOnly ? (
                                                <span style={{ fontSize: '2.5rem' }}>🛒</span>
                                            ) : logo.wordmarkOnly ? (
                                                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.6rem', color: logo.textColor }}>
                                                    Skill<span style={{ opacity: .65 }}>Kart</span>
                                                </span>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '2rem' }}>🛒</span>
                                                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.3rem', color: logo.textColor }}>
                                                        SkillKart
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="press-logo-card__name">{logo.name}</div>
                                        <div className="press-logo-card__format">{logo.format}</div>
                                        <a href="#" className="press-logo-card__dl" aria-label={`Download ${logo.name}`}>
                                            ⬇️ Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* COLOR PALETTE */}
                    {activeTab === 'Color Palette' && (
                        <div className="press-assets__section">
                            <div className="press-colors-grid">
                                {BRAND_COLORS.map(c => (
                                    <div key={c.name} className="press-color-card">
                                        <div
                                            className="press-color-card__swatch"
                                            style={{ background: c.swatch, border: c.hex === '#FFFFFF' ? '1px solid #eee' : 'none' }}
                                            role="img"
                                            aria-label={`${c.name} color swatch`}
                                        />
                                        <div className="press-color-card__info">
                                            <div className="press-color-card__name">{c.name}</div>
                                            <div className="press-color-card__hex">{c.hex} · rgb({c.rgb})</div>
                                            <div className="press-color-card__usage">{c.usage}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TYPOGRAPHY */}
                    {activeTab === 'Typography' && (
                        <div className="press-assets__section">
                            <div className="press-type-grid">
                                {TYPEFACES.map(t => (
                                    <div key={t.name} className="press-type-card">
                                        <div className={`press-type-sample ${t.sampleClass}`}>{t.sample}</div>
                                        <div className="press-type-name">{t.name}</div>
                                        <div className="press-type-weights">Weights: {t.weights}</div>
                                        <div className="press-type-use">Used for: {t.use}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 'var(--space-8)', background: '#fff', border: '1px solid rgba(4,46,76,.09)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', boxShadow: 'var(--shadow-sm)' }}>
                                <div className="press-assets__section-title">Web Font Loading</div>
                                <code style={{ display: 'block', background: 'rgba(4,46,76,.05)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', fontSize: 'var(--fs-sm)', color: 'var(--color-primary)', fontFamily: 'monospace', lineHeight: 1.7 }}>
                                    {`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:wght@400;700;900&family=Inter:wght@400;500;600;700&display=swap');`}
                                </code>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ══ EXEC TEAM ══ */}
            <section className="press-team">
                <div className="container">
                    <div className="press-team__header">
                        <div className="section-tag"><span>👥</span> Executive Team</div>
                        <h2 className="section-title">Leadership Bios</h2>
                        <p className="section-subtitle" style={{ margin: '0 auto' }}>
                            Available for interviews, commentary, and speaking engagements. Contact media@skillkart.app.
                        </p>
                    </div>
                    <div className="press-team__grid">
                        {EXEC_TEAM.map(exec => (
                            <div key={exec.name} className="exec-card">
                                <div
                                    className="exec-card__avatar"
                                    style={{ background: exec.bg }}
                                    aria-label={`${exec.name} avatar`}
                                >
                                    {exec.initials}
                                </div>
                                <h3 className="exec-card__name">{exec.name}</h3>
                                <div className="exec-card__role">{exec.role}</div>
                                <p className="exec-card__bio">{exec.bio}</p>
                                <div className="exec-card__links">
                                    <a href={exec.linkedin} className="exec-card__link" aria-label={`${exec.name} LinkedIn`}>
                                        in LinkedIn
                                    </a>
                                    <a href={`mailto:${exec.email}`} className="exec-card__link" aria-label={`Email ${exec.name}`}>
                                        ✉️ Email
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PRESS RELEASES ══ */}
            <section className="press-releases">
                <div className="container">
                    <div className="press-releases__header">
                        <div className="section-tag"><span>📋</span> Press Releases</div>
                        <h2 className="section-title">Latest Announcements</h2>
                    </div>
                    <div className="press-releases__list">
                        {PRESS_RELEASES.map(pr => (
                            <div key={pr.title} className="pr-card">
                                <div className="pr-card__date">
                                    <div className="pr-card__date-day">{pr.day}</div>
                                    <div className="pr-card__date-mon">{pr.month} {pr.year}</div>
                                </div>
                                <div className="pr-card__content">
                                    <h3 className="pr-card__title">{pr.title}</h3>
                                    <p className="pr-card__excerpt">{pr.excerpt}</p>
                                </div>
                                <div className="pr-card__action">
                                    <a href={pr.href} className="pr-card__link" aria-label={`Read: ${pr.title}`}>
                                        Read PDF →
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ MEDIA CONTACT ══ */}
            <section className="press-contact">
                <div className="container">
                    <div className="press-contact__header">
                        <div className="section-tag"><span>📡</span> Media Contact</div>
                        <h2 className="section-title">Get in Touch</h2>
                    </div>
                    <div className="press-contact__grid">
                        <div className="press-contact-card">
                            <div className="press-contact-card__icon">📰</div>
                            <h3 className="press-contact-card__title">Press &amp; Media Enquiries</h3>
                            <div className="press-contact-card__row"><strong>Name:</strong> Press Team, SkillKart</div>
                            <div className="press-contact-card__row"><strong>Email:</strong> <a href="mailto:press@skillkart.app">press@skillkart.app</a></div>
                            <div className="press-contact-card__row"><strong>Phone:</strong> +92 51 000 0000</div>
                            <div className="press-contact-card__row"><strong>Hours:</strong> Mon–Fri, 10am–6pm PKT</div>
                            <div className="press-contact-card__row"><strong>Response:</strong> Within 24 business hours</div>
                        </div>
                        <div className="press-contact-card">
                            <div className="press-contact-card__icon">🤝</div>
                            <h3 className="press-contact-card__title">Partnership &amp; Collaboration</h3>
                            <div className="press-contact-card__row"><strong>Email:</strong> <a href="mailto:partnerships@skillkart.app">partnerships@skillkart.app</a></div>
                            <div className="press-contact-card__row"><strong>Type:</strong> University partnerships, sponsors, integrations</div>
                            <div className="press-contact-card__row"><strong>LinkedIn:</strong> <a href="#">linkedin.com/company/skillkart</a></div>
                            <div className="press-contact-card__row"><strong>Address:</strong> Islamabad, Pakistan</div>
                            <div className="press-contact-card__row"><strong>Website:</strong> <a href="https://skillkart.app">skillkart.app</a></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ GUIDELINES ══ */}
            <section className="press-guidelines">
                <div className="container">
                    <div className="press-guidelines__box">
                        <h2 className="press-guidelines__heading">Brand Usage Guidelines</h2>
                        <div className="press-guidelines__grid">
                            <div className="press-guidelines__col">
                                <div className="press-guidelines__sub">✅ Please Do</div>
                                <ul className="press-guidelines__list">
                                    <li>Use the official logo files provided in this press kit</li>
                                    <li>Maintain the minimum clear space around the logo (equal to the height of the "S" in SkillKart)</li>
                                    <li>Use the wordmark "SkillKart" (capital S, capital K) in all written references</li>
                                    <li>Reproduce logos on approved background colors only</li>
                                    <li>Contact press@skillkart.app before publication if unsure</li>
                                </ul>
                            </div>
                            <div className="press-guidelines__col">
                                <div className="press-guidelines__sub">❌ Please Don't</div>
                                <ul className="press-guidelines__list press-guidelines__list--no">
                                    <li>Modify, rotate, stretch, or recolor the logo</li>
                                    <li>Use the logo on visually busy or low-contrast backgrounds</li>
                                    <li>Write "Skillkart", "SKILLKART", or "skill kart" — always use "SkillKart"</li>
                                    <li>Imply any endorsement or false partnership with SkillKart</li>
                                    <li>Reproduce executive headshots without written permission</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}
