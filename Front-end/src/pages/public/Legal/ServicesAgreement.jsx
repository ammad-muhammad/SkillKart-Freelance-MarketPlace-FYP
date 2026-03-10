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
} = policyState;

const TOC_ITEMS = [
    { id: 'sa-summary', label: '📋 Quick Summary' },
    { id: 'sa-scope', label: '1. Scope of Services' },
    { id: 'sa-payment', label: '2. Payment & Escrow' },
    { id: 'sa-delivery', label: '3. Delivery & Acceptance' },
    { id: 'sa-revisions', label: '4. Revisions & Changes' },
    { id: 'sa-intellectual', label: '5. Intellectual Property' },
    { id: 'sa-confidentiality', label: '6. Confidentiality' },
    { id: 'sa-termination', label: '7. Termination & Refunds' },
    { id: 'sa-dispute', label: '8. Dispute Resolution' },
];

export default function ServicesAgreement() {
    const [activeSection, setActiveSection] = useState('sa-summary');
    const heroRef = useRef(null);

    useEffect(() => {
        document.title = `Service Agreement | ${companyName}`;

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
                    <div className="legal-hero__badge">🤝 Legal Documentation</div>
                    <h1 className="legal-hero__heading">
                        Service <span className="legal-hero__accent">Agreement</span>
                    </h1>
                    <p className="legal-hero__sub">
                        The terms governing the relationship and transactions between Clients and Freelancers on the {companyName} platform.
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
                                <section id="sa-summary" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">📋</div>
                                        <h2 className="legal-section__title">Quick Summary</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <div className="legal-summary">
                                            <div className="legal-summary__title">What you need to know at a glance</div>
                                            <ul className="legal-summary__list">
                                                <li>This agreement forms a binding contract between the <strong>Client</strong> and the <strong>Freelancer</strong>.</li>
                                                <li>Payments must be held securely in <strong>Escrow</strong> before work commences.</li>
                                                <li>Intellectual Property transfers to the Client only upon <strong>full payment</strong>.</li>
                                                <li>All communications and transactions must take place <strong>exclusively on {companyName}</strong>.</li>
                                            </ul>
                                        </div>
                                        <p style={{ marginTop: '24px' }}>
                                            Welcome to the {companyName} Service Agreement. This document ("Agreement") sets out the terms and conditions under which a Freelancer agrees to provide services to a Client, and a Client agrees to engage and pay for those services. By using our platform to form a contract, both parties agree to abide by these terms.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 1. SCOPE OF SERVICES ── */}
                                <section id="sa-scope" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">01</div>
                                        <h2 className="legal-section__title">Scope of Services</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            The Freelancer agrees to perform the services ("Services") and deliver the deliverables ("Deliverables") as specifically detailed in the project description, proposal, or milestone agreement established on the platform.
                                        </p>
                                        <p>
                                            The Client agrees to provide timely access to any necessary materials, information, or access credentials required for the Freelancer to complete the Services. Delays caused by the Client may result in corresponding extensions to delivery deadlines.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 2. PAYMENT ── */}
                                <section id="sa-payment" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">02</div>
                                        <h2 className="legal-section__title">Payment & Escrow</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            All project payments must be processed through {companyName}'s payment system.
                                        </p>
                                        <ul>
                                            <li><strong>Escrow Funding:</strong> The Client must fund the agreed amount for a milestone into Escrow before the Freelancer is obligated to begin work on that milestone.</li>
                                            <li><strong>Release of Funds:</strong> Funds are released to the Freelancer only after the Client reviews and approves the submitted Deliverables, or automatically after the review period expires without dispute.</li>
                                            <li><strong>Platform Fees:</strong> {companyName} deducts relevant usage and processing fees from payments as outlined in the Fee Schedule.</li>
                                        </ul>
                                    </div>
                                </section>

                                {/* ── 3. DELIVERY ── */}
                                <section id="sa-delivery" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">03</div>
                                        <h2 className="legal-section__title">Delivery & Acceptance</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            The Freelancer must deliver completed work through the platform's designated submission system.
                                        </p>
                                        <p>
                                            <strong>Review Period:</strong> Upon submission, the Client has up to 7 days (or the agreed-upon timeframe) to review the Deliverables. The Client must either approve the work, request revisions, or open a dispute. If no action is taken within the review period, the Deliverables are deemed accepted, and funds will be automatically released from Escrow.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 4. REVISIONS ── */}
                                <section id="sa-revisions" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">04</div>
                                        <h2 className="legal-section__title">Revisions & Changes</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            The agreed-upon project scope includes a specific number of revision rounds, typically outlined in the approved proposal. If the Client requests changes that fall outside the original scope or beyond the allocated revision rounds, the Freelancer has the right to negotiate an additional milestone or fee for the extra work.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 5. INTELLECTUAL PROPERTY ── */}
                                <section id="sa-intellectual" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">05</div>
                                        <h2 className="legal-section__title">Intellectual Property Rights</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            Unless explicitly agreed otherwise in writing between the Client and Freelancer:
                                        </p>
                                        <ul>
                                            <li><strong>Upon Full Payment:</strong> All rights, title, and interest in the custom Deliverables—including copyright and intellectual property rights—are transferred to the Client only after the funds for those Deliverables have been fully released to the Freelancer.</li>
                                            <li><strong>Pre-existing Material:</strong> The Freelancer retains ownership of any pre-existing code, libraries, templates, or background technology used to create the Deliverables, granting the Client a non-exclusive, perpetual license to use them as part of the final product.</li>
                                            <li><strong>Portfolio Rights:</strong> The Freelancer retains the right to display the completed work in their professional portfolio, unless a Non-Disclosure Agreement (NDA) is signed prohibiting it.</li>
                                        </ul>
                                    </div>
                                </section>

                                {/* ── 6. CONFIDENTIALITY ── */}
                                <section id="sa-confidentiality" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">06</div>
                                        <h2 className="legal-section__title">Confidentiality</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            Both parties agree to keep all proprietary information, trade secrets, business plans, and sensitive internal data shared during the project strictly confidential. Confidential information must not be shared with third parties or used for any purpose other than completing the Services.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 7. TERMINATION ── */}
                                <section id="sa-termination" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">07</div>
                                        <h2 className="legal-section__title">Termination & Refunds</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            A contract may be terminated under the following conditions:
                                        </p>
                                        <ul>
                                            <li><strong>Mutual Agreement:</strong> Both parties agree to end the contract. Funds in Escrow are distributed according to their agreement.</li>
                                            <li><strong>Client Cancellation:</strong> If the Client cancels before work begins, Escrow funds are refunded to the Client. If cancelled mid-project, the Freelancer is entitled to payment for work already completed.</li>
                                            <li><strong>Freelancer Cancellation:</strong> If the Freelancer fails to deliver or abandons the project, the Client is entitled to a refund of unreleased Escrow funds for incomplete milestones.</li>
                                        </ul>
                                    </div>
                                </section>

                                {/* ── 8. DISPUTE ── */}
                                <section id="sa-dispute" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">08</div>
                                        <h2 className="legal-section__title">Dispute Resolution</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            In the event of a disagreement regarding Deliverables, deadlines, or payments:
                                        </p>
                                        <ul>
                                            <li>Both parties must first attempt to resolve the issue amicably through the platform's messaging system.</li>
                                            <li>If unresolved, either party may escalate the issue to the {companyName} Resolution Center.</li>
                                            <li>The Dispute Team will review the project communications, original scope, and submitted work to make a binding decision regarding the distribution of Escrow funds. Both parties agree to abide by the Dispute Team's final ruling.</li>
                                        </ul>
                                        <div className="legal-highlight" style={{ marginTop: '24px' }}>
                                            <div className="legal-highlight__title">⚠️ Circumvention Warning</div>
                                            Moving communications, payments, or dispute resolutions off the {companyName} platform is a violation of our Terms of Service. Doing so revokes your eligibility for Escrow protection, Dispute Resolution support, and may result in permanent account suspension.
                                        </div>
                                    </div>
                                </section>

                                {/* End of Document */}
                                <div className="legal-footer">
                                    <p>End of Service Agreement.</p>
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
