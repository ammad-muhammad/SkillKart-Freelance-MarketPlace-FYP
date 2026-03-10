import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { policyState } from './policyState';
import './Legal.css';

gsap.registerPlugin(ScrollTrigger);

const {
    companyName,
    websiteUrl,
    contactEmail,
    jurisdiction,
    effectiveDate,
    lastUpdated,
    cookieCategories,
} = policyState;

const TOC_ITEMS = [
    { id: 'cp-summary', label: '📋 Quick Summary' },
    { id: 'cp-what', label: '1. What Are Cookies?' },
    { id: 'cp-categories', label: '2. Cookie Categories' },
    { id: 'cp-purposes', label: '3. How We Use Cookies' },
    { id: 'cp-third-party', label: '4. Third-Party Cookies' },
    { id: 'cp-choices', label: '5. Your Choices' },
    { id: 'cp-retention', label: '6. Cookie Retention' },
    { id: 'cp-security', label: '7. Cookie Security' },
    { id: 'cp-updates', label: '8. Policy Updates' },
    { id: 'cp-contact', label: '9. Contact Us' },
];

const PURPOSES = [
    { icon: '🔐', title: 'Authentication', desc: 'Cookies keep you securely logged in during your session, preventing unauthorised access to your account.' },
    { icon: '🎨', title: 'Preferences', desc: 'Remember your display settings, language preferences, and saved filters so your next visit starts where you left off.' },
    { icon: '📊', title: 'Analytics', desc: 'Understand how students and clients use SkillKart to improve the platform experience — data is always anonymised.' },
    { icon: '🚀', title: 'Performance', desc: 'Identify slow page loads and technical errors to maintain near-perfect platform uptime.' },
    { icon: '🛡️', title: 'Security', desc: 'CSRF tokens and session fingerprints guard against cross-site request forgery and session hijacking attacks.' },
    { icon: '📢', title: 'Marketing', desc: 'Only with your explicit opt-in: personalised ads and campaign attribution to reach relevant freelancers and clients.' },
];

const CHOICES = [
    {
        title: 'Browser Settings',
        icon: '🌐',
        desc: 'Most browsers let you view, delete, or block cookies from the settings menu. Visit your browser\'s help page for step-by-step instructions.',
        links: [
            { label: 'Chrome', href: 'https://support.google.com/chrome/answer/95647' },
            { label: 'Firefox', href: 'https://support.mozilla.org/kb/block-websites-storing-cookies-site-data-firefox' },
            { label: 'Safari', href: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' },
            { label: 'Edge', href: 'https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge' },
        ],
    },
    {
        title: 'Cookie Settings',
        icon: '⚙️',
        desc: 'Use the in-app Cookie Preferences panel (accessible from the footer or your account settings) to manage optional cookie categories.',
        links: [],
    },
    {
        title: 'Opt-Out Tools',
        icon: '🚫',
        desc: 'For Google Analytics, you can install the Google Analytics Opt-Out add-on. For advertising cookies, visit the NAI Consumer Opt-Out page.',
        links: [
            { label: 'GA Opt-Out', href: 'https://tools.google.com/dlpage/gaoptout' },
        ],
    },
];

export default function CookiePolicy() {
    const [activeSection, setActiveSection] = useState('cp-summary');
    const heroRef = useRef(null);

    useEffect(() => {
        document.title = `Cookie Policy | ${companyName}`;

        const tl = gsap.timeline({ delay: 0.15 });
        tl.fromTo('.legal-hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
            .fromTo('.legal-hero__heading', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo('.legal-hero__sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
            .fromTo('.legal-hero__meta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.2');

        /* Scroll-spy */
        const observers = TOC_ITEMS.map(({ id }) => {
            const el = document.getElementById(id);
            if (!el) return null;
            const obs = new IntersectionObserver(
                ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
                { rootMargin: '-30% 0px -60% 0px' }
            );
            obs.observe(el);
            return obs;
        });

        gsap.fromTo('.legal-section',
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.legal-content', start: 'top 80%' },
            }
        );

        gsap.fromTo('.cookie-card',
            { y: 20, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'power3.out',
                scrollTrigger: { trigger: '#cp-categories', start: 'top 80%' },
            }
        );

        return () => {
            observers.forEach(o => o?.disconnect());
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    return (
        <>
            <Navbar />

            {/* ══════════ HERO ══════════ */}
            <section ref={heroRef} className="legal-hero">
                <div className="legal-hero__bg">
                    <div className="legal-hero__orb legal-hero__orb--1" />
                    <div className="legal-hero__orb legal-hero__orb--2" />
                    <div className="legal-hero__orb legal-hero__orb--3" />
                    <div className="legal-hero__grid" />
                </div>
                <div className="container legal-hero__inner">
                    <div className="legal-hero__badge">🍪 Cookie Policy</div>
                    <h1 className="legal-hero__heading">
                        Transparent About <span className="legal-hero__accent">Every Cookie</span>
                    </h1>
                    <p className="legal-hero__sub">
                        {companyName} uses cookies to keep our platform secure, personalised, and
                        performant. This policy explains exactly what cookies we use, why, and
                        how you can control them — in plain language.
                    </p>
                    <div className="legal-hero__meta">
                        <div className="legal-hero__meta-item">
                            <span className="legal-hero__meta-icon">📅</span>
                            Effective Date: {effectiveDate}
                        </div>
                        <div className="legal-hero__meta-item">
                            <span className="legal-hero__meta-icon">🌍</span>
                            Jurisdiction: {jurisdiction}
                        </div>
                        <div className="legal-hero__meta-item">
                            <span className="legal-hero__meta-icon">✉️</span>
                            {contactEmail}
                        </div>
                    </div>
                </div>
                <div className="legal-hero__wave">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                    </svg>
                </div>
            </section>

            {/* ══════════ BODY ══════════ */}
            <div className="legal-page">
                <div className="legal-body">
                    <div className="container">
                        <Link to="/" className="legal-back">← Back to Home</Link>

                        <div className="legal-layout">
                            {/* ── TOC Sidebar ── */}
                            <aside className="legal-toc" aria-label="Table of contents">
                                <div className="legal-toc__title">Contents</div>
                                <ul className="legal-toc__list">
                                    {TOC_ITEMS.map(item => (
                                        <li key={item.id}>
                                            <a
                                                href={`#${item.id}`}
                                                className={`legal-toc__link${activeSection === item.id ? ' active' : ''}`}
                                                onClick={e => {
                                                    e.preventDefault();
                                                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                            >
                                                {item.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                                <div className="legal-toc__contact">
                                    <div className="legal-toc__contact-title">Cookie Questions?</div>
                                    <a href={`mailto:${contactEmail}`} className="legal-toc__contact-email">
                                        {contactEmail}
                                    </a>
                                </div>
                            </aside>

                            {/* ── Main Content ── */}
                            <main className="legal-content" id="main-content">

                                {/* ── QUICK SUMMARY ── */}
                                <section id="cp-summary" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">📋</div>
                                        <h2 className="legal-section__title">Quick Summary</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <div className="legal-summary">
                                            <div className="legal-summary__title">Cookie essentials at a glance</div>
                                            <ul className="legal-summary__list">
                                                <li>We use <strong>4 categories</strong> of cookies: strictly necessary, functional, analytics, and marketing.</li>
                                                <li>Strictly necessary cookies cannot be disabled — they keep the platform secure.</li>
                                                <li>You can opt out of functional, analytics, and marketing cookies at any time.</li>
                                                <li>We never sell cookie data to advertisers or data brokers.</li>
                                                <li>Manage preferences via the Cookie Settings link in the footer.</li>
                                                <li>This policy applies to {websiteUrl} and all {companyName} subdomains.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 1. WHAT ARE COOKIES ── */}
                                <section id="cp-what" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">01</div>
                                        <h2 className="legal-section__title">What Are Cookies?</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            Cookies are small text files that a website places in your browser when you
                                            visit. They allow the site to remember information about your visit — like
                                            whether you're logged in, your language preferences, or which features you've
                                            used — making your next visit faster and more personalised.
                                        </p>
                                        <p>
                                            Beyond traditional cookies, {companyName} may also use related technologies:
                                        </p>
                                        <ul>
                                            <li><span><strong>Local Storage:</strong> Browser-based key-value pairs for client-side state (e.g., UI preferences)</span></li>
                                            <li><span><strong>Session Storage:</strong> Temporary data cleared when your browser tab closes</span></li>
                                            <li><span><strong>Web Beacons / Pixels:</strong> Tiny tracking images embedded in emails to confirm receipt (marketing emails only)</span></li>
                                            <li><span><strong>Server Logs:</strong> Automatic records of page requests, IP addresses, and browser types</span></li>
                                        </ul>
                                        <div className="legal-info-card">
                                            <div className="legal-info-card__icon">🔍</div>
                                            <div className="legal-info-card__title">Cookies vs. Personal Data</div>
                                            <p className="legal-info-card__text">
                                                Some cookies (e.g., those that track a logged-in user's journey) may constitute
                                                personal data under applicable law. Where required, we obtain your consent before
                                                setting non-essential cookies. See our Privacy Policy for full details on data processing.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 2. COOKIE CATEGORIES ── */}
                                <section id="cp-categories" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">02</div>
                                        <h2 className="legal-section__title">Cookie Categories We Use</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            {companyName} uses four categories of cookies. Each card below describes the
                                            type, purpose, example cookie names, and duration.
                                        </p>
                                        <div className="cookie-grid">
                                            {cookieCategories.map(cat => (
                                                <div key={cat.type} className="cookie-card">
                                                    <div className="cookie-card__head">
                                                        <div className="cookie-card__type">{cat.type}</div>
                                                        <div className={`cookie-card__opt ${cat.canOptOut ? 'cookie-card__opt--optional' : 'cookie-card__opt--required'}`}>
                                                            {cat.canOptOut ? 'Optional' : 'Required'}
                                                        </div>
                                                    </div>
                                                    <p className="cookie-card__purpose">{cat.purpose}</p>
                                                    <div className="cookie-card__meta">
                                                        <div className="cookie-card__meta-item">
                                                            <span className="cookie-card__meta-label">Duration</span>
                                                            {cat.duration}
                                                        </div>
                                                    </div>
                                                    <div className="cookie-card__examples">
                                                        {cat.examples.map(ex => (
                                                            <span key={ex} className="cookie-chip">{ex}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* ── 3. HOW WE USE COOKIES ── */}
                                <section id="cp-purposes" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">03</div>
                                        <h2 className="legal-section__title">How We Use Cookies</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>Here's a breakdown of each purpose served by our cookies:</p>
                                        <div className="rights-grid">
                                            {PURPOSES.map(p => (
                                                <div key={p.title} className="rights-card">
                                                    <span className="rights-card__icon">{p.icon}</span>
                                                    <div className="rights-card__title">{p.title}</div>
                                                    <div className="rights-card__desc">{p.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* ── 4. THIRD-PARTY COOKIES ── */}
                                <section id="cp-third-party" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">04</div>
                                        <h2 className="legal-section__title">Third-Party Cookies</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            Some cookies are set by our third-party service providers. {companyName} does
                                            not control these cookies directly. They are governed by each provider's own
                                            privacy and cookie policies:
                                        </p>
                                        <div className="legal-table-wrap">
                                            <table className="legal-table" aria-label="Third-party cookies">
                                                <thead>
                                                    <tr>
                                                        <th>Provider</th>
                                                        <th>Purpose</th>
                                                        <th>Type</th>
                                                        <th>Opt-Out</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td><strong>Google Analytics</strong></td>
                                                        <td>Anonymised usage analytics</td>
                                                        <td>Analytics</td>
                                                        <td>Available</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Stripe</strong></td>
                                                        <td>Fraud detection & payment security</td>
                                                        <td>Strictly Necessary</td>
                                                        <td>Not available</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Cloudflare</strong></td>
                                                        <td>Bot protection, CDN performance</td>
                                                        <td>Strictly Necessary</td>
                                                        <td>Not available</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Hotjar (if enabled)</strong></td>
                                                        <td>Heatmaps & session recordings</td>
                                                        <td>Analytics</td>
                                                        <td>Available</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <p>
                                            We only enable third-party analytics and marketing cookies with your consent.
                                            Where consent is given, it can be withdrawn at any time through Cookie Settings.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 5. YOUR CHOICES ── */}
                                <section id="cp-choices" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">05</div>
                                        <h2 className="legal-section__title">Your Cookie Choices</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            You have meaningful control over the cookies we set. Three options are available:
                                        </p>
                                        <div style={{ display: 'grid', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
                                            {CHOICES.map(choice => (
                                                <div key={choice.title} className="legal-info-card">
                                                    <div className="legal-info-card__icon">{choice.icon}</div>
                                                    <div className="legal-info-card__title">{choice.title}</div>
                                                    <p className="legal-info-card__text">{choice.desc}</p>
                                                    {choice.links.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                                                            {choice.links.map(link => (
                                                                <a
                                                                    key={link.label}
                                                                    href={link.href}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        background: 'rgba(4,46,76,0.08)',
                                                                        color: 'var(--color-primary)',
                                                                        padding: '4px 12px',
                                                                        borderRadius: 'var(--radius-full)',
                                                                        fontSize: 'var(--fs-xs)',
                                                                        fontWeight: 600,
                                                                        textDecoration: 'none',
                                                                    }}
                                                                >
                                                                    {link.label} →
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="legal-info-card legal-info-card--warn" style={{ marginTop: 'var(--space-5)' }}>
                                            <div className="legal-info-card__icon">⚠️</div>
                                            <div className="legal-info-card__title">Impact of Disabling Cookies</div>
                                            <p className="legal-info-card__text">
                                                Disabling strictly necessary cookies will prevent you from logging in and using most
                                                platform features. Disabling functional cookies will reset your preferences on each visit.
                                                The platform remains accessible, but some features may be degraded.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 6. RETENTION ── */}
                                <section id="cp-retention" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">06</div>
                                        <h2 className="legal-section__title">Cookie Retention Periods</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            Cookies have different lifespans depending on their purpose:
                                        </p>
                                        <div className="retention-list">
                                            {cookieCategories.map(cat => (
                                                <div key={cat.type} className="retention-row">
                                                    <div className="retention-row__label">{cat.type} Cookies</div>
                                                    <div className="retention-row__period">{cat.duration}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <p>
                                            <strong>Session cookies</strong> are automatically deleted when you close your browser.
                                            <strong> Persistent cookies</strong> remain until their expiry date or until you delete
                                            them manually.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 7. SECURITY ── */}
                                <section id="cp-security" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">07</div>
                                        <h2 className="legal-section__title">Cookie Security</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            We apply security best practices to all cookies that carry sensitive information:
                                        </p>
                                        <ul>
                                            <li><strong>HttpOnly:</strong> Authentication cookies are inaccessible to JavaScript, protecting against XSS attacks</li>
                                            <li><strong>Secure flag:</strong> Cookies are only transmitted over HTTPS connections</li>
                                            <li><strong>SameSite=Strict/Lax:</strong> Prevents cross-site request forgery (CSRF) attacks</li>
                                            <li><strong>Short session expiry:</strong> Session tokens rotate every 30 days and on password change</li>
                                            <li><strong>Signed tokens:</strong> Cookie integrity is verified server-side on every request</li>
                                        </ul>
                                    </div>
                                </section>

                                {/* ── 8. UPDATES ── */}
                                <section id="cp-updates" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">08</div>
                                        <h2 className="legal-section__title">Policy Updates</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            We review this Cookie Policy at least annually and whenever we change the set of
                                            cookies used on the platform. When updates occur:
                                        </p>
                                        <ul>
                                            <li>The <strong>Effective Date</strong> at the top is updated</li>
                                            <li>Material changes trigger a new consent banner for optional cookie categories</li>
                                            <li>Email notifications are sent to registered users for significant changes</li>
                                        </ul>
                                        <p>Last updated: <strong>{lastUpdated}</strong></p>
                                    </div>
                                </section>

                                {/* ── 9. CONTACT ── */}
                                <section id="cp-contact" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">09</div>
                                        <h2 className="legal-section__title">Contact Us</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            For questions or requests about our cookie practices, contact our privacy team:
                                        </p>
                                        <ul>
                                            <li><strong>Email:</strong> <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
                                            <li><strong>Website:</strong> <a href={`${websiteUrl}/contact`}>{websiteUrl}/contact</a></li>
                                            <li><strong>Jurisdiction:</strong> {jurisdiction}</li>
                                        </ul>
                                    </div>
                                </section>

                                {/* ── CTA ── */}
                                <div className="legal-cta">
                                    <div className="legal-cta__orb legal-cta__orb--1" />
                                    <div className="legal-cta__orb legal-cta__orb--2" />
                                    <div className="legal-cta__badge">🍪 Cookie Transparency</div>
                                    <h2 className="legal-cta__heading">Manage Your Cookie Preferences</h2>
                                    <p className="legal-cta__sub">
                                        Use our Cookie Settings panel to control optional cookies at any time.
                                        Have questions? Our team is here to help.
                                    </p>
                                    <a href={`mailto:${contactEmail}`} className="legal-cta__email">
                                        ✉️ {contactEmail}
                                    </a>
                                </div>

                            </main>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
}
