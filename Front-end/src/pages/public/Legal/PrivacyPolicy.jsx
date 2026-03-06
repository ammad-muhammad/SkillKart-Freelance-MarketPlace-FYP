import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { policyState } from './policyState';
import './Legal.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ─── */
const {
    companyName,
    websiteUrl,
    contactEmail,
    jurisdiction,
    effectiveDate,
    lastUpdated,
    dataCategories,
    thirdPartyPartners,
    retentionPeriods,
} = policyState;

const TOC_ITEMS = [
    { id: 'pp-summary', label: '📋 Quick Summary' },
    { id: 'pp-collect', label: '1. Data We Collect' },
    { id: 'pp-use', label: '2. How We Use Data' },
    { id: 'pp-sharing', label: '3. Data Sharing' },
    { id: 'pp-rights', label: '4. Your Rights' },
    { id: 'pp-retention', label: '5. Data Retention' },
    { id: 'pp-security', label: '6. Security' },
    { id: 'pp-transfers', label: '7. International Transfers' },
    { id: 'pp-children', label: '8. Children\'s Privacy' },
    { id: 'pp-updates', label: '9. Policy Updates' },
    { id: 'pp-contact', label: '10. Contact Us' },
];

const USER_RIGHTS = [
    { icon: '👁️', title: 'Access', desc: 'Request a copy of all personal data we hold about you.' },
    { icon: '✏️', title: 'Rectification', desc: 'Correct inaccurate or incomplete information at any time.' },
    { icon: '🗑️', title: 'Erasure', desc: 'Request deletion of your account and associated data.' },
    { icon: '📦', title: 'Portability', desc: 'Export your data in a machine-readable format (JSON/CSV).' },
    { icon: '🚫', title: 'Object', desc: 'Object to processing for direct marketing at any time.' },
    { icon: '⏸️', title: 'Restriction', desc: 'Ask us to pause processing while a dispute is resolved.' },
];

export default function PrivacyPolicy() {
    const [activeSection, setActiveSection] = useState('pp-summary');
    const heroRef = useRef(null);

    useEffect(() => {
        document.title = `Privacy Policy | ${companyName}`;

        /* Hero entrance */
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

        /* Sections entrance */
        gsap.fromTo('.legal-section',
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.legal-content', start: 'top 80%' },
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
                    <div className="legal-hero__badge">🔒 Privacy Policy</div>
                    <h1 className="legal-hero__heading">
                        Your Privacy is Our <span className="legal-hero__accent">Priority</span>
                    </h1>
                    <p className="legal-hero__sub">
                        At {companyName}, we believe every student deserves to know exactly how their data
                        is collected, used, and protected. This policy explains it all — in plain language.
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
                                    <div className="legal-toc__contact-title">Questions?</div>
                                    <a href={`mailto:${contactEmail}`} className="legal-toc__contact-email">
                                        {contactEmail}
                                    </a>
                                </div>
                            </aside>

                            {/* ── Main Content ── */}
                            <main className="legal-content" id="main-content">

                                {/* ── QUICK SUMMARY ── */}
                                <section id="pp-summary" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">📋</div>
                                        <h2 className="legal-section__title">Quick Summary (Plain Language)</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <div className="legal-summary">
                                            <div className="legal-summary__title">What you need to know at a glance</div>
                                            <ul className="legal-summary__list">
                                                <li>We collect your name, email, and profile data to operate the platform.</li>
                                                <li><span>We <strong>never sell</strong> your personal data to advertisers or third parties.</span></li>
                                                <li>Payments are processed by Stripe — we never store card details.</li>
                                                <li>AI features (Buddy AI) process your submissions via OpenAI with strict privacy controls.</li>
                                                <li>You can request data export or full account deletion at any time.</li>
                                                <li>We use industry-standard AES-256 encryption and TLS 1.3 in transit.</li>
                                                <li>This policy is governed by the laws of {jurisdiction}.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 1. DATA WE COLLECT ── */}
                                <section id="pp-collect" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">01</div>
                                        <h2 className="legal-section__title">Data We Collect</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            {companyName} collects information that is necessary to provide our
                                            AI-powered micro-freelancing services. The categories of personal data we
                                            collect include:
                                        </p>
                                        <ul>
                                            {dataCategories.map(cat => <li key={cat}>{cat}</li>)}
                                        </ul>
                                        <div className="legal-info-card">
                                            <div className="legal-info-card__icon">💡</div>
                                            <div className="legal-info-card__title">Lawful Basis for Processing</div>
                                            <p className="legal-info-card__text">
                                                We process your data on the basis of <strong>contract performance</strong> (to provide
                                                the SkillKart service), <strong>legitimate interests</strong> (platform security and
                                                improvement), and your explicit <strong>consent</strong> for optional features like
                                                marketing communications. You may withdraw consent for optional processing at any time
                                                via your account settings.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 2. HOW WE USE DATA ── */}
                                <section id="pp-use" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">02</div>
                                        <h2 className="legal-section__title">How We Use Your Data</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>Your data is used exclusively to operate, secure, and improve {companyName}:</p>
                                        <ol>
                                            <li>Authenticate your identity and manage your account securely</li>
                                            <li>Power Buddy AI — skill verification, proposal assistance, and matchmaking algorithms</li>
                                            <li>Process payments and manage milestone-based escrow via Stripe</li>
                                            <li>Send transactional emails (account alerts, project updates, payment confirmations)</li>
                                            <li>Provide customer support and dispute resolution</li>
                                            <li>Analyse platform performance and detect fraudulent activity</li>
                                            <li>Send marketing newsletters — only with your explicit opt-in consent</li>
                                            <li>Comply with applicable legal obligations and regulatory requirements</li>
                                        </ol>
                                        <p>
                                            We do not use your data for automated decision-making that produces significant
                                            legal effects without human review. Skill-matching recommendations are advisory only.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 3. DATA SHARING ── */}
                                <section id="pp-sharing" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">03</div>
                                        <h2 className="legal-section__title">Data Sharing &amp; Third Parties</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            {companyName} does <strong>not sell, rent, or trade</strong> your personal information.
                                            We share data only with the following trusted service providers, strictly bound by
                                            data-processing agreements:
                                        </p>
                                        <div className="legal-table-wrap">
                                            <table className="legal-table" aria-label="Third-party service providers">
                                                <thead>
                                                    <tr>
                                                        <th>Partner</th>
                                                        <th>Purpose</th>
                                                        <th>Data Access</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {thirdPartyPartners.map(p => (
                                                        <tr key={p.name}>
                                                            <td><strong>{p.name}</strong></td>
                                                            <td>{p.purpose}</td>
                                                            <td>Minimum necessary</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p>
                                            We may also disclose data in response to <strong>lawful legal requests</strong>,
                                            court orders, or government authority — only to the extent legally required.
                                            We will notify you of such requests unless prohibited by law.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 4. YOUR RIGHTS ── */}
                                <section id="pp-rights" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">04</div>
                                        <h2 className="legal-section__title">Your Privacy Rights</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            You have the following rights regarding your personal data. To exercise any of them,
                                            contact us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                                            We will respond within 30 days.
                                        </p>
                                        <div className="rights-grid">
                                            {USER_RIGHTS.map(r => (
                                                <div key={r.title} className="rights-card">
                                                    <span className="rights-card__icon">{r.icon}</span>
                                                    <div className="rights-card__title">{r.title}</div>
                                                    <div className="rights-card__desc">{r.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* ── 5. RETENTION ── */}
                                <section id="pp-retention" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">05</div>
                                        <h2 className="legal-section__title">Data Retention</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            We retain your data only as long as necessary for the purposes described in this
                                            policy — or as required by applicable laws:
                                        </p>
                                        <div className="retention-list">
                                            {Object.entries(retentionPeriods).map(([key, val]) => (
                                                <div key={key} className="retention-row">
                                                    <div className="retention-row__label">
                                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                                    </div>
                                                    <div className="retention-row__period">{val}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <p>
                                            When data is no longer needed, it is securely deleted or anonymised using
                                            industry-standard methods. Backup deletion follows within 90 days.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 6. SECURITY ── */}
                                <section id="pp-security" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">06</div>
                                        <h2 className="legal-section__title">Security Measures</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            We invest heavily in protecting your data. Our security posture includes:
                                        </p>
                                        <ul>
                                            <li><span><strong>Encryption at rest:</strong> AES-256 for all stored personal data</span></li>
                                            <li><span><strong>Encryption in transit:</strong> TLS 1.3 for all data transmission</span></li>
                                            <li><span><strong>Access controls:</strong> Role-based permissions; minimal privilege principle</span></li>
                                            <li><span><strong>Authentication:</strong> JWT tokens with short expiry + OAuth 2.0</span></li>
                                            <li><span><strong>Payment security:</strong> Stripe-managed PCI-DSS Level 1 compliance</span></li>
                                            <li><span><strong>Penetration testing:</strong> Regular third-party security audits</span></li>
                                            <li><span><strong>Breach response:</strong> Affected users notified within 72 hours of discovery</span></li>
                                        </ul>
                                        <div className="legal-info-card legal-info-card--warn">
                                            <div className="legal-info-card__icon">⚠️</div>
                                            <div className="legal-info-card__title">No system is 100% secure</div>
                                            <p className="legal-info-card__text">
                                                While we implement strong safeguards, no internet transmission is perfectly secure.
                                                We encourage you to use a strong, unique password and enable two-factor authentication
                                                once available. Report suspected security issues to {contactEmail}.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 7. INTERNATIONAL TRANSFERS ── */}
                                <section id="pp-transfers" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">07</div>
                                        <h2 className="legal-section__title">International Data Transfers</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            {companyName} is primarily operated in <strong>{jurisdiction}</strong>.
                                            However, some of our service providers (e.g., Vercel, OpenAI, Stripe) may
                                            process data in the United States or European Union.
                                        </p>
                                        <p>
                                            When data is transferred internationally, we ensure adequate protection through:
                                        </p>
                                        <ul>
                                            <li>Standard Contractual Clauses (SCCs) or equivalent legal mechanisms</li>
                                            <li>Data-processing agreements with all third-party processors</li>
                                            <li>Adequacy decisions where applicable</li>
                                        </ul>
                                        <p>
                                            Users in the EU/EEA benefit from additional GDPR-aligned protections wherever applicable.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 8. CHILDREN ── */}
                                <section id="pp-children" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">08</div>
                                        <h2 className="legal-section__title">Children's Privacy</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <div className="legal-info-card legal-info-card--danger">
                                            <div className="legal-info-card__icon">🚸</div>
                                            <div className="legal-info-card__title">18+ Platform</div>
                                            <p className="legal-info-card__text">
                                                {companyName} is designed for university students and professionals. We do
                                                not knowingly collect data from individuals under 18 years of age. If we
                                                discover an account belonging to a minor, it will be immediately suspended
                                                and all associated data will be deleted. If you believe a minor has signed
                                                up, contact us immediately at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                                            </p>
                                        </div>
                                        <p>
                                            University email verification and age confirmation during registration help
                                            us enforce this policy. However, parents and guardians should also monitor
                                            their children's online activity and inform us of any concerns.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 9. UPDATES ── */}
                                <section id="pp-updates" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">09</div>
                                        <h2 className="legal-section__title">Policy Updates</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            We may update this Privacy Policy as our platform evolves or regulations change.
                                            When we make material changes, we will:
                                        </p>
                                        <ul>
                                            <li>Update the <strong>Effective Date</strong> at the top of this page</li>
                                            <li>Send an email notification to registered users at least 14 days before changes take effect</li>
                                            <li>Display a prominent in-app banner for 30 days after the update</li>
                                            <li>Archive previous policy versions for your reference</li>
                                        </ul>
                                        <p>
                                            Continued use of {companyName} after the effective date constitutes your
                                            acceptance of the updated policy. We encourage you to review this page periodically.
                                        </p>
                                        <p>
                                            Last updated: <strong>{lastUpdated}</strong>
                                        </p>
                                    </div>
                                </section>

                                {/* ── 10. CONTACT ── */}
                                <section id="pp-contact" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">10</div>
                                        <h2 className="legal-section__title">Contact Our Privacy Team</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            For any privacy-related questions, requests, or concerns, please reach out to us:
                                        </p>
                                        <ul>
                                            <li><strong>Email:</strong> <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
                                            <li><strong>Website:</strong> <a href={`${websiteUrl}/contact`}>{websiteUrl}/contact</a></li>
                                            <li><strong>Response Time:</strong> Within 30 days of receiving your request</li>
                                            <li><strong>Governing Jurisdiction:</strong> {jurisdiction}</li>
                                        </ul>
                                        <p>
                                            If you are unsatisfied with our response, you may escalate to the relevant
                                            data protection authority in your country.
                                        </p>
                                    </div>
                                </section>

                                {/* ── CTA ── */}
                                <div className="legal-cta">
                                    <div className="legal-cta__orb legal-cta__orb--1" />
                                    <div className="legal-cta__orb legal-cta__orb--2" />
                                    <div className="legal-cta__badge">🔒 Privacy-First Platform</div>
                                    <h2 className="legal-cta__heading">Questions About Your Privacy?</h2>
                                    <p className="legal-cta__sub">
                                        Our privacy team is ready to help. We aim to respond to all inquiries within 72 hours.
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
