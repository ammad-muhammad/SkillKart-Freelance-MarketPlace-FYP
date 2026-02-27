import { useEffect, useState, useRef, useCallback } from "react";
import { ShieldCheck, CalendarDays } from "lucide-react";
import Navbar from "../../Components/common/Navbar/Navbar";
import Footer from "../../Components/common/Footer/Footer";
import "../../styles/PrivacyPolicy.css";

// ─────────────────────────────────────────────
// CONTENT DATA — swap this array for an API/CMS
// ─────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {
    id: "overview",
    label: "1",
    title: "1. Overview",
    paragraphs: [
      'At SkillKart, we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy ("Policy") explains how we collect, use, disclose, and safeguard your information when you use our platform and services.',
      "This Policy applies to all users of SkillKart, including Freelancers and Clients, as well as visitors to our website. By using SkillKart, you consent to the practices described in this Policy.",
    ],
    highlight:
      "This Policy was last updated on 24 February 2026. We will notify you of any material changes via email or a prominent notice on our platform.",
  },
  {
    id: "information-collected",
    label: "2",
    title: "2. Information We Collect",
    paragraphs: [
      "We collect several types of information to provide and improve our services. This includes information you provide directly, information generated when you use our platform, and information from third-party sources.",
    ],
    subsections: [
      {
        heading: "Information You Provide",
        list: [
          "Account registration details: name, email address, phone number, and password",
          "Profile information: skills, portfolio, bio, profile photo, and work history",
          "Payment information: billing address, bank details, or payment card information (processed by our secure payment partners)",
          "Communications: messages, support tickets, and feedback you send us",
          "Identity verification documents where required",
        ],
      },
      {
        heading: "Information Generated Automatically",
        list: [
          "Log data: IP address, browser type, pages visited, and timestamps",
          "Device information: device type, operating system, and unique identifiers",
          "Usage data: features used, orders placed, and time spent on the platform",
          "Cookies and similar tracking technologies (see Section 7)",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    label: "3",
    title: "3. How We Use Your Information",
    paragraphs: [
      "We use the information we collect for the following purposes:",
    ],
    list: [
      "To operate, maintain, and improve the SkillKart platform",
      "To process transactions, payments, and payouts",
      "To verify your identity and prevent fraud",
      "To personalise your experience and recommend relevant listings",
      "To communicate with you about your account, orders, and platform updates",
      "To resolve disputes and enforce our Terms and Conditions",
      "To comply with legal obligations and regulatory requirements",
      "To send marketing communications (with your consent; opt-out available at any time)",
      "To analyse usage patterns and conduct research to improve our services",
    ],
    highlight:
      "We will never sell your personal information to third parties. Your data is used solely to operate and improve SkillKart.",
  },
  {
    id: "sharing",
    label: "4",
    title: "4. Sharing Your Information",
    paragraphs: [
      "We share your information only in the circumstances described below and always in accordance with this Policy.",
    ],
    subsections: [
      {
        heading: "With Other Users",
        list: [
          "Your public profile (name, photo, skills, ratings) is visible to all users",
          "Client names and project details are shared with Freelancers you hire",
          "Messages sent through our platform are shared with the recipient",
        ],
      },
      {
        heading: "With Service Providers",
        list: [
          "Payment processors to handle transactions securely",
          "Cloud hosting and infrastructure providers",
          "Analytics providers (data is anonymised where possible)",
          "Email and notification services",
          "Identity verification services",
        ],
      },
      {
        heading: "For Legal Reasons",
        list: [
          "To comply with applicable laws, regulations, or legal processes",
          "To protect the rights, property, or safety of SkillKart, our users, or the public",
          "In connection with a merger, acquisition, or sale of assets",
        ],
      },
    ],
  },
  {
    id: "data-retention",
    label: "5",
    title: "5. Data Retention",
    paragraphs: [
      "We retain your personal information for as long as your account is active, or as necessary to provide you with our services. We will also retain and use your information as required to comply with our legal obligations, resolve disputes, and enforce our agreements.",
      "When you delete your account, we will remove your public profile and personal data within 30 days. Transaction records and financial data may be retained for up to 7 years as required by financial regulations.",
    ],
  },
  {
    id: "security",
    label: "6",
    title: "6. Data Security",
    paragraphs: [
      "We implement industry-standard security measures to protect your data, including encryption in transit (TLS/HTTPS), encryption at rest for sensitive fields, multi-factor authentication options, regular security audits, and strict access controls for our staff.",
    ],
    highlight:
      "While we take every reasonable precaution to protect your data, no system is 100% secure. If you believe your account has been compromised, please contact us immediately at security@skillkart.app.",
    list: [
      "All passwords are hashed using bcrypt with salt rounds",
      "Payment card data is handled by PCI-DSS compliant processors",
      "Access to production data is restricted to authorised personnel only",
      "We conduct regular penetration testing and vulnerability assessments",
    ],
  },
  {
    id: "cookies",
    label: "7",
    title: "7. Cookies & Tracking",
    paragraphs: [
      "We use cookies and similar technologies to enhance your experience, analyse platform usage, and serve relevant content. You can control cookie preferences through your browser settings or our Cookie Preference Centre.",
    ],
    subsections: [
      {
        heading: "Types of Cookies We Use",
        list: [
          "Essential cookies: Required for the platform to function (cannot be disabled)",
          "Analytics cookies: Help us understand how users interact with our platform",
          "Preference cookies: Remember your settings and personalisation choices",
          "Marketing cookies: Used to deliver relevant advertising (only with consent)",
        ],
      },
    ],
    highlight:
      "You can opt out of non-essential cookies at any time via your Account Settings → Privacy → Cookie Preferences.",
  },
  {
    id: "your-rights",
    label: "8",
    title: "8. Your Privacy Rights",
    paragraphs: [
      "Depending on your location, you may have the following rights regarding your personal data:",
    ],
    list: [
      "Right to access: Request a copy of the personal data we hold about you",
      "Right to rectification: Request correction of inaccurate or incomplete data",
      "Right to erasure: Request deletion of your personal data ('right to be forgotten')",
      "Right to portability: Receive your data in a structured, machine-readable format",
      "Right to object: Object to processing of your data for marketing purposes",
      "Right to restriction: Request we limit how we process your data",
      "Right to withdraw consent: Withdraw any consent you have given at any time",
    ],
    highlight:
      "To exercise any of these rights, please contact privacy@skillkart.app. We will respond to verified requests within 30 days.",
  },
  {
    id: "children",
    label: "9",
    title: "9. Children's Privacy",
    paragraphs: [
      "SkillKart is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from anyone under 18. If we become aware that we have inadvertently collected information from a minor, we will take immediate steps to delete such data.",
      "If you believe we have collected data from a minor, please contact us at privacy@skillkart.app.",
    ],
  },
  {
    id: "third-party",
    label: "10",
    title: "10. Third-Party Links",
    paragraphs: [
      "Our platform may contain links to third-party websites or services that are not operated by SkillKart. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.",
    ],
  },
  {
    id: "changes",
    label: "11",
    title: "11. Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make material changes, we will notify you via email and a prominent notice on our platform at least 30 days before the changes take effect.",
      "Your continued use of SkillKart after the effective date of any revised Policy constitutes your acceptance of those changes.",
    ],
  },
  {
    id: "contact",
    label: "12",
    title: "12. Contact Our Privacy Team",
    paragraphs: [
      "If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, you can reach our dedicated Privacy Team below.",
    ],
    isContact: true,
  },
];

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const PrivacyPolicy = () => {
  const [activeId, setActiveId] = useState(PRIVACY_SECTIONS[0].id);
  const contentRef = useRef(null);
  const pillRefs = useRef({});

  useEffect(() => {
    document.title = "Privacy Policy – SkillKart";
    window.scrollTo({ top: 0 });
  }, []);

  // Intersection Observer — highlight active section in sidebar
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      {
        rootMargin: `-${84 + 32}px 0px -55% 0px`,
        threshold: 0,
      }
    );

    PRIVACY_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Auto-scroll pill bar so active pill stays visible on mobile
  useEffect(() => {
    const pill = pillRefs.current[activeId];
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeId]);

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      // Calculate top position with offset for sticky navbar + pill bar
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

      {/* ── Hero ── */}
      <section className="legal-hero">
        <span className="legal-hero__eyebrow">
          <ShieldCheck size={13} />
          Privacy
        </span>
        <h1 className="legal-hero__title">Privacy Policy</h1>
        <p className="legal-hero__subtitle">
          We value your trust. This Policy explains exactly what personal
          information we collect, how we use it, and the controls you have over
          your data.
        </p>
        <span className="legal-hero__date-pill">
          <CalendarDays size={14} />
          Last updated: 24 February 2026
        </span>
      </section>

      {/* ── Mobile Pill Bar ── */}
      <nav className="legal-pill-bar" aria-label="Privacy navigation">
        {PRIVACY_SECTIONS.map(({ id, label, title }) => (
          <button
            key={id}
            ref={el => { pillRefs.current[id] = el; }}
            className={`legal-pill-bar__item${activeId === id ? " active" : ""}`}
            onClick={() => scrollToSection(id)}
          >
            §{label} {title.split(". ")[1]}
          </button>
        ))}
      </nav>

      {/* ── Body ── */}
      <div className="legal-body">
        {/* Desktop Sidebar */}
        <aside className="legal-sidebar" aria-label="Privacy table of contents">
          <p className="legal-sidebar__heading">Contents</p>
          <ul className="legal-sidebar__list">
            {PRIVACY_SECTIONS.map(({ id, title }) => (
              <li key={id}>
                <button
                  className={`legal-sidebar__link${
                    activeId === id ? " active" : ""
                  }`}
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
          {PRIVACY_SECTIONS.map(
            ({
              id,
              title,
              label,
              paragraphs,
              list,
              highlight,
              subsections,
              isContact,
            }) => (
              <section key={id} id={id} className="legal-section">
                <span className="legal-section__number">§{label}</span>
                <h2 className="legal-section__title">
                  {title.split(". ").slice(1).join(". ")}
                </h2>

                {paragraphs?.map((p, i) => (
                  <p key={i} className="legal-section__text">
                    {p}
                  </p>
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

                {/* Subsections (nested headings + lists) */}
                {subsections?.map((sub, si) => (
                  <div key={si} style={{ marginTop: "var(--space-5)" }}>
                    <h3
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "var(--fs-base)",
                        fontWeight: "var(--fw-bold)",
                        color: "var(--color-primary-dark)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      {sub.heading}
                    </h3>
                    <ul className="legal-section__list">
                      {sub.list.map((item, li) => (
                        <li key={li}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                {isContact && (
                  <div className="legal-contact-card">
                    <h3 className="legal-contact-card__title">Privacy Team</h3>
                    <p className="legal-contact-card__text">
                      Our Privacy Team is ready to assist with any data-related
                      requests or questions about this Policy.
                    </p>
                    <a
                      href="mailto:privacy@skillkart.app"
                      className="legal-contact-card__link"
                    >
                      ✉ privacy@skillkart.app
                    </a>
                  </div>
                )}
              </section>
            )
          )}

          {/* Back to top */}
          <button className="legal-back-top" onClick={scrollToTop}>
            ↑ Back to top
          </button>
        </main>
      </div>

      <Footer />
    </>
  );
};

export default PrivacyPolicy;
