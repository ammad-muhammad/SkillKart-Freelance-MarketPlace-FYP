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
    { id: 'tos-summary', label: '📋 Quick Summary' },
    { id: 'tos-service', label: '1. Service Description' },
    { id: 'tos-eligibility', label: '2. Eligibility' },
    { id: 'tos-obligations', label: '3. User Obligations' },
    { id: 'tos-account', label: '4. Account Security' },
    { id: 'tos-ip', label: '5. Intellectual Property' },
    { id: 'tos-liability', label: '6. Limitation of Liability' },
    { id: 'tos-indemnity', label: '7. Indemnification' },
    { id: 'tos-termination', label: '8. Termination' },
    { id: 'tos-governing', label: '9. Governing Law' },
    { id: 'tos-disputes', label: '10. Dispute Resolution' },
    { id: 'tos-modifications', label: '11. Modifications' },
];

const OBLIGATIONS = [
    {
        title: 'As a Freelancer, you must:',
        items: [
            'Provide accurate, complete, and up-to-date profile information',
            'Deliver projects to the agreed specification and within agreed timelines',
            'Communicate professionally through platform tools only (no off-platform deals)',
            'Not misrepresent your skills, qualifications, or prior work',
            'Submit authentic portfolio samples — no plagiarism or AI-fabricated work without disclosure',
        ],
    },
    {
        title: 'As a Client, you must:',
        items: [
            'Post accurate and complete project descriptions',
            'Fund escrow milestones before work begins',
            'Review and approve (or dispute) delivered work within 7 days of submission',
            'Not attempt to circumvent the platform to deal directly with freelancers',
            'Provide lawful project briefs — no illegal, offensive, or deceptive projects',
        ],
    },
    {
        title: 'All users must NOT:',
        items: [
            'Engage in harassment, discrimination, or abusive behaviour',
            'Create fake accounts, manipulate reviews, or game the AI-matching system',
            'Upload malware, spam, or malicious code',
            'Violate intellectual property rights of any third party',
            'Attempt to reverse-engineer or scrape any part of the platform',
        ],
    },
];

const ACCORD_ITEMS = [
    {
        q: 'What happens if a freelancer misses a deadline?',
        a: `Late delivery without client agreement constitutes a breach. The client may request a partial refund from escrow proportional to the delay. Repeated late deliveries may result in account suspension. ${companyName} provides a 48-hour grace period for genuine technical issues upon written notice.`,
    },
    {
        q: 'Can I cancel a project mid-way?',
        a: `Clients may cancel a project before the freelancer submits any deliverables for a full refund. After deliverables are submitted, cancellation requires mutual agreement or Resolution Center mediation. Partial refunds may be issued based on work completed.`,
    },
    {
        q: 'Who owns the intellectual property once a project is completed?',
        a: `Upon full payment release, ownership of custom deliverables transfers to the client unless otherwise specified in the project contract. Freelancers retain ownership of reusable code libraries, design systems, or tools that were pre-existing.`,
    },
    {
        q: 'What is SkillKart\'s service fee?',
        a: `${companyName} charges freelancers an 8% success fee on each completed and paid milestone. There are no upfront fees. Platform fees for clients are included in the project budget displayed at checkout.`,
    },
];

export default function TermsOfService() {
    const [activeSection, setActiveSection] = useState('tos-summary');
    const [openAccord, setOpenAccord] = useState(null);
    const heroRef = useRef(null);

    useEffect(() => {
        document.title = `Terms of Service | ${companyName}`;

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
                    <div className="legal-hero__badge">📜 Terms of Service</div>
                    <h1 className="legal-hero__heading">
                        Clear Rules for a <span className="legal-hero__accent">Fair Platform</span>
                    </h1>
                    <p className="legal-hero__sub">
                        These Terms govern your access to and use of {companyName}. By creating an account
                        you agree to these terms. We've written them to be clear, fair, and student-friendly.
                    </p>
                    <div className="legal-hero__meta">
                        <div className="legal-hero__meta-item">
                            <span className="legal-hero__meta-icon">📅</span>
                            Effective Date: {effectiveDate}
                        </div>
                        <div className="legal-hero__meta-item">
                            <span className="legal-hero__meta-icon">⚖️</span>
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
                                    <div className="legal-toc__contact-title">Legal Queries?</div>
                                    <a href={`mailto:${contactEmail}`} className="legal-toc__contact-email">
                                        {contactEmail}
                                    </a>
                                </div>
                            </aside>

                            {/* ── Main Content ── */}
                            <main className="legal-content" id="main-content">

                                {/* ── QUICK SUMMARY ── */}
                                <section id="tos-summary" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">📋</div>
                                        <h2 className="legal-section__title">Quick Summary</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <div className="legal-summary">
                                            <div className="legal-summary__title">The essentials in plain language</div>
                                            <ul className="legal-summary__list">
                                                <li>You must be at least 18 years old and a registered university student or professional.</li>
                                                <li>All payments flow through Stripe-secured escrow — no direct off-platform money transfers allowed.</li>
                                                <li>{companyName} charges an 8% success fee only when you complete a paid project.</li>
                                                <li>Custom deliverables belong to the client after payment is released.</li>
                                                <li>We can suspend accounts for policy violations, fraud, or repeated poor ratings.</li>
                                                <li>Disputes are resolved first through mediation; arbitration is the last resort.</li>
                                                <li>These Terms are governed by the laws of {jurisdiction}.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 1. SERVICE ── */}
                                <section id="tos-service" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">01</div>
                                        <h2 className="legal-section__title">Service Description</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            {companyName} (<a href={websiteUrl}>{websiteUrl}</a>) is an AI-powered
                                            micro-freelancing marketplace that connects verified student freelancers with
                                            clients seeking digital services. Core features include:
                                        </p>
                                        <ul>
                                            <li>AI-based skill verification and profile enrichment (Buddy AI)</li>
                                            <li>Smart project-to-freelancer matchmaking using machine-learning algorithms</li>
                                            <li>Milestone-based escrow payment processing via Stripe</li>
                                            <li>Structured communication, deliverable submission, and review workflows</li>
                                            <li>Reputation system with verified ratings, reviews, and endorsements</li>
                                            <li>Real-time earnings dashboard and AI-driven growth recommendations</li>
                                        </ul>
                                        <p>
                                            {companyName} acts as an <strong>intermediary marketplace only</strong>. We are
                                            not a party to any contract between client and freelancer. We are not liable for
                                            disputes arising from the quality or timeliness of project deliverables.
                                        </p>
                                        <div className="legal-info-card">
                                            <div className="legal-info-card__icon">🏗️</div>
                                            <div className="legal-info-card__title">Platform Availability</div>
                                            <p className="legal-info-card__text">
                                                We target 99.5% monthly uptime. Planned maintenance is communicated 48 hours
                                                in advance via email and in-app notifications. Unplanned downtime does not void
                                                active contracts or trigger penalty fees.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 2. ELIGIBILITY ── */}
                                <section id="tos-eligibility" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">02</div>
                                        <h2 className="legal-section__title">Eligibility</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>To create and use a {companyName} account, you must:</p>
                                        <ul>
                                            <li>Be at least <strong>18 years old</strong></li>
                                            <li>Be a currently enrolled university student, recent graduate (within 3 years), or verified client/business</li>
                                            <li>Have a valid, active email address (university email preferred for students)</li>
                                            <li>Have the legal capacity to enter into binding contracts in your jurisdiction</li>
                                            <li>Not have been previously suspended or banned from {companyName}</li>
                                            <li>Not be located in a country subject to applicable trade sanctions</li>
                                        </ul>
                                        <p>
                                            {companyName} reserves the right to verify eligibility at any time and to
                                            suspend accounts found to be ineligible without prior notice.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 3. USER OBLIGATIONS ── */}
                                <section id="tos-obligations" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">03</div>
                                        <h2 className="legal-section__title">User Obligations</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        {OBLIGATIONS.map(group => (
                                            <div key={group.title} style={{ marginBottom: 'var(--space-6)' }}>
                                                <p><strong>{group.title}</strong></p>
                                                <ul>
                                                    {group.items.map(item => <li key={item}>{item}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                        <div className="legal-accord">
                                            <p style={{ marginBottom: 'var(--space-3)', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                Common Questions About Obligations:
                                            </p>
                                            {ACCORD_ITEMS.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className={`legal-accord__item${openAccord === i ? ' open' : ''}`}
                                                >
                                                    <button
                                                        className="legal-accord__trigger"
                                                        onClick={() => setOpenAccord(openAccord === i ? null : i)}
                                                        aria-expanded={openAccord === i}
                                                    >
                                                        {item.q}
                                                        <span className="legal-accord__icon">+</span>
                                                    </button>
                                                    <div className="legal-accord__body">
                                                        <div className="legal-accord__body-inner">{item.a}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* ── 4. ACCOUNT SECURITY ── */}
                                <section id="tos-account" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">04</div>
                                        <h2 className="legal-section__title">Account Security</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            You are fully responsible for maintaining the confidentiality of your login
                                            credentials and for all activities that occur under your account.
                                        </p>
                                        <ul>
                                            <li>Choose a strong, unique password and change it periodically</li>
                                            <li>Never share your login credentials with anyone, including {companyName} staff</li>
                                            <li>Enable any two-factor authentication options available to you</li>
                                            <li>Log out of shared or public devices after each session</li>
                                            <li>Report suspicious activity immediately to <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
                                        </ul>
                                        <p>
                                            {companyName} will never ask for your password through email, chat, or support
                                            channels. If you receive such a request, report it as a phishing attempt.
                                        </p>
                                        <div className="legal-info-card legal-info-card--warn">
                                            <div className="legal-info-card__icon">🛡️</div>
                                            <div className="legal-info-card__title">Account Responsibility</div>
                                            <p className="legal-info-card__text">
                                                Actions taken under your account are attributed to you. {companyName} is not
                                                liable for losses resulting from your failure to secure your account credentials,
                                                unless the breach was caused by our negligence.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 5. IP ── */}
                                <section id="tos-ip" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">05</div>
                                        <h2 className="legal-section__title">Intellectual Property</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            <strong>{companyName} Platform IP:</strong> All trademarks, logos, platform
                                            interfaces, software, AI models, and documentation are the exclusive property of
                                            {companyName} and protected under applicable law. You may not copy, modify, or
                                            distribute any part of the platform without express written permission.
                                        </p>
                                        <p>
                                            <strong>User Content:</strong> You retain ownership of the content you upload
                                            (profile descriptions, portfolio samples). By uploading, you grant {companyName}
                                            a non-exclusive, royalty-free, worldwide licence to display this content to other
                                            users for the purpose of operating the platform.
                                        </p>
                                        <p>
                                            <strong>Project Deliverables:</strong> Upon full payment release from escrow,
                                            intellectual property rights for custom deliverables transfer to the client,
                                            unless the project contract specifies otherwise in writing.
                                        </p>
                                        <p>
                                            <strong>Third-Party IP:</strong> You must not submit work that infringes on any
                                            third-party copyright, trademark, or patent. Verified infringement may result in
                                            immediate account termination.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 6. LIABILITY ── */}
                                <section id="tos-liability" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">06</div>
                                        <h2 className="legal-section__title">Limitation of Liability</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <div className="legal-info-card legal-info-card--danger">
                                            <div className="legal-info-card__icon">⚖️</div>
                                            <div className="legal-info-card__title">Important Legal Notice</div>
                                            <p className="legal-info-card__text">
                                                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {companyName.toUpperCase()}
                                                SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                                                PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING FROM YOUR USE OF THE PLATFORM,
                                                EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL
                                                CUMULATIVE LIABILITY IS LIMITED TO THE AMOUNT OF FEES PAID BY YOU IN THE 6
                                                MONTHS PRECEDING THE CLAIM.
                                            </p>
                                        </div>
                                        <p>
                                            This limitation applies to claims arising from: project disputes, delayed
                                            payments, data loss, platform downtime, AI recommendation inaccuracies,
                                            or actions of other users. {companyName} provides the platform "as is"
                                            with no guarantee of specific outcomes.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 7. INDEMNIFICATION ── */}
                                <section id="tos-indemnity" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">07</div>
                                        <h2 className="legal-section__title">Indemnification</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            You agree to indemnify, defend, and hold harmless {companyName}, its directors,
                                            officers, employees, and agents from any claims, damages, losses, or expenses
                                            (including reasonable legal fees) arising from:
                                        </p>
                                        <ul>
                                            <li>Your breach of these Terms of Service</li>
                                            <li>Your violation of any applicable law or regulation</li>
                                            <li>Your infringement of any third-party intellectual property rights</li>
                                            <li>Any content you post or transmit through the platform</li>
                                            <li>Your interactions with other users, including project disputes</li>
                                        </ul>
                                        <p>
                                            {companyName} reserves the right to assume exclusive defence and control of
                                            any matter subject to indemnification by you, at your expense.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 8. TERMINATION ── */}
                                <section id="tos-termination" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">08</div>
                                        <h2 className="legal-section__title">Termination</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            <strong>You may:</strong> Close your account at any time through Account Settings.
                                            Outstanding escrow obligations must be resolved before deletion is final.
                                        </p>
                                        <p>
                                            <strong>{companyName} may:</strong> Suspend or terminate your account, with or
                                            without prior notice, if we reasonably believe you have:
                                        </p>
                                        <ul>
                                            <li>Violated any provision of these Terms</li>
                                            <li>Engaged in fraudulent, abusive, or illegal behaviour</li>
                                            <li>Received repeated low ratings or client complaints below platform thresholds</li>
                                            <li>Created multiple accounts to circumvent a prior suspension</li>
                                            <li>Failed to complete projects or abandon active contracts repeatedly</li>
                                        </ul>
                                        <p>
                                            Upon termination: your public profile is removed, active contracts are paused,
                                            and escrow funds are distributed per the dispute resolution process. Earned and
                                            cleared funds will be disbursed within 14 business days. Provisions relating to
                                            IP, indemnification, limitation of liability, and governing law survive termination.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 9. GOVERNING LAW ── */}
                                <section id="tos-governing" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">09</div>
                                        <h2 className="legal-section__title">Governing Law</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            These Terms of Service shall be governed by and construed in accordance with
                                            the laws of <strong>{jurisdiction}</strong>, without regard to conflict of law
                                            principles.
                                        </p>
                                        <p>
                                            By using {companyName}, users outside of Pakistan consent to the jurisdiction
                                            of the courts of Pakistan for any dispute arising under these Terms.
                                        </p>
                                        <div className="legal-info-card">
                                            <div className="legal-info-card__icon">🌍</div>
                                            <div className="legal-info-card__title">International Users</div>
                                            <p className="legal-info-card__text">
                                                If you access {companyName} from a jurisdiction other than Pakistan, you are
                                                responsible for compliance with local laws. We make no representation that
                                                the platform is appropriate for use in all regions.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 10. DISPUTES ── */}
                                <section id="tos-disputes" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">10</div>
                                        <h2 className="legal-section__title">Dispute Resolution</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            We encourage all disputes to be resolved as simply and quickly as possible.
                                            The process follows these escalating steps:
                                        </p>
                                        <ol>
                                            <li>
                                                <strong>Direct Resolution (0–3 days):</strong> Both parties attempt to resolve
                                                the dispute through the in-platform messaging system.
                                            </li>
                                            <li>
                                                <strong>Resolution Center (3–7 days):</strong> Either party opens a formal
                                                dispute. {companyName} mediators review evidence (messages, deliverables,
                                                milestones) and issue a binding recommendation.
                                            </li>
                                            <li>
                                                <strong>Arbitration:</strong> If Resolution Center mediation fails, disputes
                                                are referred to binding arbitration under the applicable Arbitration Rules
                                                of Pakistan, conducted in English.
                                            </li>
                                        </ol>
                                        <p>
                                            <strong>Class Action Waiver:</strong> You agree to resolve disputes individually
                                            and waive any right to participate in class or collective legal action against {companyName}.
                                        </p>
                                    </div>
                                </section>

                                {/* ── 11. MODIFICATIONS ── */}
                                <section id="tos-modifications" className="legal-section">
                                    <div className="legal-section__header">
                                        <div className="legal-section__num">11</div>
                                        <h2 className="legal-section__title">Modifications to Terms</h2>
                                    </div>
                                    <div className="legal-section__body">
                                        <p>
                                            {companyName} may revise these Terms at any time. When material changes occur:
                                        </p>
                                        <ul>
                                            <li>We update the <strong>Effective Date</strong> at the top of this page</li>
                                            <li>Registered users receive email notification at least 14 days before changes take effect</li>
                                            <li>An in-app banner is displayed for 30 days post-update</li>
                                            <li>Previous versions are archived and accessible on request</li>
                                        </ul>
                                        <p>
                                            Continued use of {companyName} after the effective date of updated Terms
                                            constitutes acceptance. If you do not agree, you must discontinue use and
                                            may close your account with no penalty (subject to active contract resolution).
                                        </p>
                                        <p>Last updated: <strong>{lastUpdated}</strong></p>
                                    </div>
                                </section>

                                {/* ── CTA ── */}
                                <div className="legal-cta">
                                    <div className="legal-cta__orb legal-cta__orb--1" />
                                    <div className="legal-cta__orb legal-cta__orb--2" />
                                    <div className="legal-cta__badge">⚖️ Legal Transparency</div>
                                    <h2 className="legal-cta__heading">Questions About These Terms?</h2>
                                    <p className="legal-cta__sub">
                                        Our team is here to clarify anything. We respond to legal inquiries within 48 hours.
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
