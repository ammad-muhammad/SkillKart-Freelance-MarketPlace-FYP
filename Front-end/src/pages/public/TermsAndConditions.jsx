import { useEffect, useState, useRef, useCallback } from "react";
import { Scale, CalendarDays } from "lucide-react";
import Navbar from "../../Components/common/Navbar/Navbar";
import Footer from "../../Components/common/Footer/Footer";
import "../../styles/TermsAndConditions.css";

// ---------------------------------------------------
// CONTENT DATA -- replace this array with an API/CMS
// ---------------------------------------------------
const TERMS_SECTIONS = [
  {
    id: "acceptance",
    label: "1",
    title: "1. Acceptance of Terms",
    paragraphs: [
      'By accessing or using the SkillKart platform, website, or any related services (collectively, the "Services"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you must not access or use our Services.',
      'These Terms constitute a legally binding agreement between you ("User" or "you") and SkillKart ("we", "us", or "our"). We reserve the right to update these Terms at any time. Continued use of the Services after any changes constitutes your acceptance of the revised Terms.',
    ],
    highlight:
      'Please read these Terms carefully. By clicking "Sign Up", accessing our website, or using any of our Services, you confirm you have read, understood, and agreed to be bound by these Terms.',
  },
  {
    id: "services",
    label: "2",
    title: "2. Description of Services",
    paragraphs: [
      'SkillKart is a micro-freelance platform that connects skilled individuals ("Freelancers") with individuals or businesses seeking services ("Clients"). SkillKart provides the technology infrastructure to facilitate these connections but is not a party to any agreement between Freelancers and Clients.',
      "Our Services include, but are not limited to:",
    ],
    list: [
      "Profile creation and portfolio management for Freelancers",
      "Service listing and discovery for Clients",
      "Secure in-platform messaging and communication tools",
      "Payment processing and escrow management",
      "Dispute resolution and mediation services",
      "Review and rating systems for both parties",
    ],
    highlight:
      "SkillKart acts solely as an intermediary. We do not employ Freelancers, nor are we responsible for the quality, timing, or legality of services rendered between users.",
  },
  {
    id: "eligibility",
    label: "3",
    title: "3. User Eligibility",
    paragraphs: [
      "To use SkillKart, you must be at least 18 years of age and have the legal capacity to enter into binding contracts. By registering, you represent and warrant that all information you provide is accurate, current, and complete.",
      "We reserve the right to suspend or terminate accounts that provide false, misleading, or incomplete information at any time, without notice.",
    ],
    list: [
      "You must be at least 18 years old to register",
      "One account per individual -- multiple accounts are prohibited",
      "Account credentials are personal and non-transferable",
      "You are solely responsible for all activity that occurs under your account",
    ],
  },
  {
    id: "account",
    label: "4",
    title: "4. Account Registration & Security",
    paragraphs: [
      "When you create an account on SkillKart, you are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorised access or security breach.",
      "You agree not to share your username or password with any third party, and you accept full responsibility for any use of your account by others.",
    ],
    highlight:
      "SkillKart will never ask for your password via email, phone, or in-platform message. If you receive such a request, please report it immediately to support@skillkart.app.",
  },
  {
    id: "conduct",
    label: "5",
    title: "5. User Conduct & Prohibited Activities",
    paragraphs: [
      "You agree to use SkillKart only for lawful purposes and in a manner consistent with all applicable laws and regulations. The following activities are strictly prohibited:",
    ],
    list: [
      "Posting false, misleading, or deceptive listings or profiles",
      "Engaging in off-platform payments to circumvent SkillKart fees",
      "Harassing, threatening, or abusing other users",
      "Uploading malware, viruses, or any harmful code",
      "Infringing on third-party intellectual property rights",
      "Using automated bots or scrapers without written permission",
      "Engaging in money laundering or fraudulent transactions",
      "Discriminating against users based on race, gender, religion, or other protected characteristics",
    ],
    paragraphs2: [
      "Violation of any of the above may result in immediate account suspension or permanent termination, at our sole discretion.",
    ],
  },
  {
    id: "payments",
    label: "6",
    title: "6. Payments, Fees & Refunds",
    paragraphs: [
      "SkillKart charges a platform service fee on all completed transactions. The fee structure is displayed on the Pricing page and may be subject to change with reasonable notice. All fees are non-refundable except as expressly stated in our Refund Policy.",
      "Clients pay into an escrow account when placing an order. Funds are released to the Freelancer only after the order is marked as complete and the review window has passed.",
    ],
    list: [
      "Platform fee: deducted automatically from Freelancer payouts",
      "Payments are processed via our third-party payment partners",
      "Withdrawal processing time: 7-14 business days",
      "All amounts are displayed in USD unless otherwise stated",
    ],
    highlight:
      "Refund requests are evaluated on a case-by-case basis under our Refund Policy. Initiating a chargeback outside of SkillKart's dispute process may result in account suspension.",
  },
  {
    id: "intellectual-property",
    label: "7",
    title: "7. Intellectual Property",
    paragraphs: [
      "All content, design, logos, trademarks, and functionality of the SkillKart platform are the exclusive property of SkillKart or its licensors. You may not copy, reproduce, distribute, or create derivative works without prior written consent.",
      "Freelancers retain ownership of original work they create. By default, upon full payment, all rights to the delivered work are transferred to the Client unless a different arrangement is explicitly agreed upon in the project terms.",
    ],
  },
  {
    id: "privacy",
    label: "8",
    title: "8. Privacy & Data",
    paragraphs: [
      "Your use of SkillKart is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.",
    ],
    highlight:
      "By using our Services, you consent to the collection and use of your data as described in our Privacy Policy.",
  },
  {
    id: "disclaimers",
    label: "9",
    title: "9. Disclaimers & Limitation of Liability",
    paragraphs: [
      'The Services are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied. SkillKart does not warrant that the Services will be uninterrupted, error-free, or free from viruses or other harmful components.',
      "To the fullest extent permitted by law, SkillKart shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the Services.",
    ],
  },
  {
    id: "termination",
    label: "10",
    title: "10. Termination",
    paragraphs: [
      "We reserve the right to suspend or terminate your account and access to the Services at any time, for any reason, without prior notice. Upon termination, your right to use the Services will immediately cease.",
      "You may delete your account at any time from your account settings. Deletion removes your public profile but transaction records may be retained as required by law.",
    ],
  },
  {
    id: "governing-law",
    label: "11",
    title: "11. Governing Law & Disputes",
    paragraphs: [
      "These Terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to its conflict of law provisions. Any disputes arising under these Terms shall first be attempted to be resolved through good-faith negotiation.",
      "If a dispute cannot be resolved informally, it shall be submitted to binding arbitration in accordance with the rules of the Pakistan Centre for Dispute Resolution (PCDR).",
    ],
  },
  {
    id: "contact",
    label: "12",
    title: "12. Contact Us",
    paragraphs: [
      "If you have any questions about these Terms, please do not hesitate to reach out. Our team is here to help.",
    ],
    isContact: true,
  },
];

// ---------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------
const TermsAndConditions = () => {
  const [activeId, setActiveId] = useState(TERMS_SECTIONS[0].id);
  const contentRef = useRef(null);
  const sectionRefs = useRef({});
  const pillRefs = useRef({});

  useEffect(() => {
    document.title = "Terms & Conditions - SkillKart";
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-116px 0px -55% 0px", threshold: 0 }
    );

    TERMS_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) {
        sectionRefs.current[id] = el;
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Auto-scroll the pill bar so the active pill is always visible on mobile
  useEffect(() => {
    const pill = pillRefs.current[activeId];
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeId]);

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 140; 
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      setActiveId(id);
    }
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="legal-hero">
        <span className="legal-hero__eyebrow">
          <Scale size={13} />
          Legal
        </span>
        <h1 className="legal-hero__title">Terms &amp; Conditions</h1>
        <p className="legal-hero__subtitle">
          Please read these Terms carefully before using SkillKart. They govern
          your access to and use of our platform and services.
        </p>
        <span className="legal-hero__date-pill">
          <CalendarDays size={14} />
          Last updated: 24 February 2026
        </span>
      </section>

      {/* Mobile Pill Bar */}
      <nav className="legal-pill-bar" aria-label="Terms navigation">
        {TERMS_SECTIONS.map(({ id, label, title }) => (
          <button
            key={id}
            ref={el => { pillRefs.current[id] = el; }}
            className={"legal-pill-bar__item" + (activeId === id ? " active" : "")}
            onClick={() => scrollToSection(id)}
          >
            {"S." + label + " " + title.split(". ").slice(1).join(". ")}
          </button>
        ))}
      </nav>

      {/* Body */}
      <div className="legal-body">
        {/* Desktop Sidebar */}
        <aside className="legal-sidebar" aria-label="Terms table of contents">
          <p className="legal-sidebar__heading">Contents</p>
          <ul className="legal-sidebar__list">
            {TERMS_SECTIONS.map(({ id, title }) => (
              <li key={id}>
                <button
                  className={"legal-sidebar__link" + (activeId === id ? " active" : "")}
                  onClick={() => scrollToSection(id)}
                >
                  {title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <main className="legal-content" ref={contentRef}>
          {TERMS_SECTIONS.map(({ id, title, label, paragraphs, paragraphs2, list, highlight, isContact }) => (
            <section key={id} id={id} className="legal-section">
              <span className="legal-section__number">{"S." + label}</span>
              <h2 className="legal-section__title">
                {title.split(". ").slice(1).join(". ")}
              </h2>

              {paragraphs && paragraphs.map((p, i) => (
                <p key={i} className="legal-section__text">{p}</p>
              ))}

              {highlight && (
                <div className="legal-section__highlight">{highlight}</div>
              )}

              {list && (
                <ul className="legal-section__list">
                  {list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}

              {paragraphs2 && paragraphs2.map((p, i) => (
                <p key={"p2-" + i} className="legal-section__text">{p}</p>
              ))}

              {isContact && (
                <div className="legal-contact-card">
                  <h3 className="legal-contact-card__title">Get in Touch</h3>
                  <p className="legal-contact-card__text">
                    Our legal and support team are available to answer your
                    questions about these Terms.
                  </p>
                  <a
                    href="mailto:legal@skillkart.app"
                    className="legal-contact-card__link"
                  >
                    legal@skillkart.app
                  </a>
                </div>
              )}
            </section>
          ))}

          <button className="legal-back-top" onClick={scrollToTop}>
            Back to top
          </button>
        </main>
      </div>

      <Footer />
    </>
  );
};

export default TermsAndConditions;
