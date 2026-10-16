import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { publicAPI } from '../../../api/publicData';
import {
    MessageSquare, Mail, Phone, User, Tag, Send, Lock, CheckCircle2,
    Clock3, Building2, Bot, ChevronDown, ArrowRight, MapPin
} from 'lucide-react';
import Loader from '../../../Components/common/Loader/Loader';
import './Contact.css';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────── DATA ─────────────────────────── */

const CONTACT_CHANNELS = [
    {
        Icon: MessageSquare,
        title: 'Live Chat',
        desc: 'Chat with our support team in real time for instant answers.',
        action: 'Start Chat',
    },
    {
        Icon: Mail,
        title: 'Email Support',
        desc: 'Send us a detailed message — we reply within 24 hours.',
        action: 'support@skillkart.com',
    },
    {
        Icon: Phone,
        title: 'Phone',
        desc: 'Speak directly with our team Mon–Fri, 9 AM – 6 PM PKT.',
        action: '+92 300 000 0000',
    },
];

const FAQ_ITEMS = [
    {
        q: 'How quickly will I receive a response?',
        a: 'Our team responds to all inquiries within 24 hours on business days. For urgent matters, use Live Chat for instant assistance.',
    },
    {
        q: 'What information should I include in my message?',
        a: 'Please include your registered email, a clear description of your issue, and any relevant screenshots. The more detail you provide, the faster we can help.',
    },
    {
        q: 'Can I report a bug or suggest a feature?',
        a: 'Absolutely! Select "Bug Report" or "Feature Request" in the Subject dropdown. We review all suggestions and prioritize them for our roadmap.',
    },
    {
        q: 'Is there a dedicated enterprise support line?',
        a: 'Yes. Enterprise clients have access to a dedicated account manager and priority support. Contact us using the "Enterprise / Clients" subject to get started.',
    },
    {
        q: 'How do I track my support ticket?',
        a: 'After submitting your form, you will receive an automated email with your ticket ID. Use that ID to follow up anytime via email or live chat.',
    },
    {
        q: 'Do you offer support in languages other than English?',
        a: 'Our primary support language is English, but we have team members who can assist in Urdu. Mention your preference in the message field.',
    },
];

const SUBJECT_OPTIONS = [
    'General Inquiry',
    'Technical Support',
    'Billing & Payments',
    'Account & Profile',
    'Bug Report',
    'Feature Request',
    'Enterprise / Clients',
    'Partnership',
    'Other',
];

/* ─────────────────────────── VALIDATION ─────────────────────────── */
const validate = (fields) => {
    const errs = {};
    if (!fields.name.trim()) errs.name = 'Full name is required.';
    else if (fields.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';

    if (!fields.email.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errs.email = 'Enter a valid email address.';

    if (!fields.subject) errs.subject = 'Please select a subject.';

    if (!fields.message.trim()) errs.message = 'Message is required.';
    else if (fields.message.trim().length < 20) errs.message = 'Message must be at least 20 characters.';

    return errs;
};

const INIT = { name: '', email: '', subject: '', message: '' };

/* ─────────────────────────── COMPONENT ─────────────────────────── */

export default function Contact() {
    /* ── Form state ── */
    const [fields, setFields] = useState(INIT);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [submitState, setSubmitState] = useState('idle'); // idle | loading | success | error
    const [openFaq, setOpenFaq] = useState(null);
    const [isSubjectOpen, setIsSubjectOpen] = useState(false);

    /* ── Refs for animations ── */
    const channelsRef = useRef(null);
    const formRef = useRef(null);
    const faqRef = useRef(null);

    useEffect(() => {
        document.title = 'Contact Us – SkillKart';
        window.scrollTo(0, 0);

        /* Hero entrance */
        const tl = gsap.timeline({ delay: 0.12 });
        tl.fromTo('.contact-hero__tag', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
            .fromTo('.contact-hero__heading', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }, '-=0.2')
            .fromTo('.contact-hero__sub', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, '-=0.3')
            .fromTo('.contact-channel__card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power3.out' }, '-=0.2');

        /* Scroll-triggered sections */
        if (formRef.current) {
            gsap.fromTo(formRef.current.children,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.12, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: formRef.current, start: 'top 85%' } }
            );
        }
        if (faqRef.current) {
            gsap.fromTo('.cfaq__item',
                { y: 16, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.06, duration: 0.45, ease: 'power3.out', scrollTrigger: { trigger: faqRef.current, start: 'top 88%' } }
            );
        }

        return () => ScrollTrigger.getAll().forEach(t => t.kill());
    }, []);

    /* ── Close subject dropdown on outside click ── */
    useEffect(() => {
        if (!isSubjectOpen) return;
        const handler = (e) => {
            const wrap = document.querySelector('.contact-form__input-wrap--select');
            if (wrap && !wrap.contains(e.target)) {
                setIsSubjectOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isSubjectOpen]);

    /* ── Field change + live re-validate if touched ── */
    const handleChange = (e) => {
        const { name, value } = e.target;
        const next = { ...fields, [name]: value };
        setFields(next);
        if (touched[name]) {
            const errs = validate(next);
            setErrors(prev => ({ ...prev, [name]: errs[name] }));
        }
    };

    /* ── Blur → mark touched and validate ── */
    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const errs = validate(fields);
        setErrors(prev => ({ ...prev, [name]: errs[name] }));
    };

    /* ── Submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Mark all fields as touched
        setTouched({ name: true, email: true, subject: true, message: true });
        const errs = validate(fields);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSubmitState('loading');

        try {
            await publicAPI.submitContact({
                name: fields.name.trim(),
                email: fields.email.trim(),
                subject: fields.subject,
                message: fields.message.trim(),
            });
            setSubmitState('success');
            setFields(INIT);
            setTouched({});
            setErrors({});
        } catch (err) {
            console.error('Contact submit failed:', err);
            setErrors({ form: err.response?.data?.message || 'Could not send your message. Please try again.' });
            setSubmitState('idle');
        }
    };

    const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

    return (
        <>
            <Navbar />

            {/* ══════════════════ HERO ══════════════════ */}
            <section className="contact-hero" aria-label="Contact Hero">
                <div className="container contact-hero__inner">
                    <div className="contact-hero__tag">
                        <MapPin size={14} /> Get In Touch
                    </div>
                    <h1 className="contact-hero__heading">
                        We're Here to <span className="contact-hero__accent">Help You</span> Succeed
                    </h1>
                    <p className="contact-hero__sub">
                        Questions about SkillKart? Running into an issue? Want to partner with us?
                        Pick the fastest channel for you — our team is ready.
                    </p>

                    {/* ── Channel cards inside hero ── */}
                    <div className="contact-hero__channels" ref={channelsRef} role="list">
                        {CONTACT_CHANNELS.map((ch) => (
                            <div key={ch.title} className="contact-channel__card" role="listitem">
                                <div className="contact-channel__icon">
                                    <ch.Icon size={20} />
                                </div>
                                <div>
                                    <div className="contact-channel__title">{ch.title}</div>
                                    <div className="contact-channel__desc">{ch.desc}</div>
                                    <span className="contact-channel__action">{ch.action}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ CONTACT FORM SECTION ══════════════════ */}
            <section className="contact-main" aria-label="Contact Form Section">
                <div className="container">
                    <div ref={formRef} className="contact-form__layout">

                        {/* ── LEFT: Form card ── */}
                        <div className="contact-form__card" role="main">
                            <div className="contact-form__card-header">
                                <div className="section-tag"><span>✍️</span> Send a Message</div>
                                <h2 className="contact-form__card-title">Talk to Our Team</h2>
                                <p className="contact-form__card-sub">Fill in the form below and we'll get back to you within 24 hours.</p>
                            </div>

                            {submitState === 'success' ? (
                                <div className="contact-form__success" role="alert" aria-live="polite">
                                    <div className="contact-form__success-icon"><CheckCircle2 size={34} /></div>
                                    <h3 className="contact-form__success-title">Message Sent!</h3>
                                    <p className="contact-form__success-text">
                                        Thanks for reaching out. We've received your message and will reply within 24 hours.
                                        Check your email for a confirmation with your ticket ID.
                                    </p>
                                    <button
                                        className="contact-form__success-btn"
                                        onClick={() => setSubmitState('idle')}
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <form
                                    onSubmit={handleSubmit}
                                    className="contact-form__form"
                                    noValidate
                                    aria-label="Contact form"
                                >
                                    {/* Name + Email row */}
                                    <div className="contact-form__row">
                                        <div className="contact-form__group">
                                            <label htmlFor="cf-name" className="contact-form__label">
                                                Full Name <span aria-hidden="true" className="contact-form__required">*</span>
                                            </label>
                                            <div className={`contact-form__input-wrap ${errors.name && touched.name ? 'contact-form__input-wrap--error' : ''} ${!errors.name && touched.name ? 'contact-form__input-wrap--ok' : ''}`}>
                                                <span className="contact-form__input-icon"><User size={17} /></span>
                                                <input
                                                    id="cf-name"
                                                    name="name"
                                                    type="text"
                                                    className="contact-form__input"
                                                    placeholder="e.g. Sara Malik"
                                                    value={fields.name}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    aria-required="true"
                                                    aria-describedby={errors.name && touched.name ? 'cf-name-error' : undefined}
                                                    aria-invalid={!!(errors.name && touched.name)}
                                                    autoComplete="name"
                                                />
                                                {!errors.name && touched.name && (
                                                    <span className="contact-form__ok-tick" aria-hidden="true"><CheckCircle2 size={16} /></span>
                                                )}
                                            </div>
                                            {errors.name && touched.name && (
                                                <p id="cf-name-error" className="contact-form__error" role="alert">{errors.name}</p>
                                            )}
                                        </div>

                                        <div className="contact-form__group">
                                            <label htmlFor="cf-email" className="contact-form__label">
                                                Email Address <span aria-hidden="true" className="contact-form__required">*</span>
                                            </label>
                                            <div className={`contact-form__input-wrap ${errors.email && touched.email ? 'contact-form__input-wrap--error' : ''} ${!errors.email && touched.email ? 'contact-form__input-wrap--ok' : ''}`}>
                                                <span className="contact-form__input-icon"><Mail size={17} /></span>
                                                <input
                                                    id="cf-email"
                                                    name="email"
                                                    type="email"
                                                    className="contact-form__input"
                                                    placeholder="you@university.edu.pk"
                                                    value={fields.email}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    aria-required="true"
                                                    aria-describedby={errors.email && touched.email ? 'cf-email-error' : undefined}
                                                    aria-invalid={!!(errors.email && touched.email)}
                                                    autoComplete="email"
                                                />
                                                {!errors.email && touched.email && (
                                                    <span className="contact-form__ok-tick" aria-hidden="true"><CheckCircle2 size={16} /></span>
                                                )}
                                            </div>
                                            {errors.email && touched.email && (
                                                <p id="cf-email-error" className="contact-form__error" role="alert">{errors.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Subject */}
                                    <div className="contact-form__group">
                                        <label htmlFor="cf-subject" className="contact-form__label">
                                            Subject <span aria-hidden="true" className="contact-form__required">*</span>
                                        </label>
                                        <div
                                            className={`contact-form__input-wrap contact-form__input-wrap--select ${isSubjectOpen ? 'contact-form__input-wrap--open' : ''} ${errors.subject && touched.subject ? 'contact-form__input-wrap--error' : ''} ${!errors.subject && touched.subject ? 'contact-form__input-wrap--ok' : ''}`}
                                        >
                                            <span className="contact-form__input-icon"><Tag size={17} /></span>
                                            <div
                                                className="contact-form__custom-select"
                                                onClick={() => setIsSubjectOpen(!isSubjectOpen)}
                                                role="button"
                                                aria-haspopup="listbox"
                                                aria-expanded={isSubjectOpen}
                                                tabIndex={0}
                                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsSubjectOpen(!isSubjectOpen)}
                                            >
                                                <span className={`contact-form__select-value ${!fields.subject ? 'contact-form__select-value--placeholder' : ''}`}>
                                                    {fields.subject || 'Choose a topic…'}
                                                </span>
                                            </div>
                                            <span className={`contact-form__select-arrow ${isSubjectOpen ? 'contact-form__select-arrow--open' : ''}`} aria-hidden="true">
                                                <ChevronDown size={16} />
                                            </span>

                                            {/* Custom Dropdown Menu */}
                                            {isSubjectOpen && (
                                                <div className="contact-form__dropdown-menu" role="listbox">
                                                    {SUBJECT_OPTIONS.map(opt => (
                                                        <div
                                                            key={opt}
                                                            className={`contact-form__dropdown-item ${fields.subject === opt ? 'contact-form__dropdown-item--selected' : ''}`}
                                                            onClick={() => {
                                                                handleChange({ target: { name: 'subject', value: opt } });
                                                                setTouched(prev => ({ ...prev, subject: true }));
                                                                setIsSubjectOpen(false);
                                                            }}
                                                            role="option"
                                                            aria-selected={fields.subject === opt}
                                                        >
                                                            {opt}
                                                            {fields.subject === opt && <span className="contact-form__dropdown-check"><CheckCircle2 size={15} /></span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {errors.subject && touched.subject && (
                                            <p id="cf-subject-error" className="contact-form__error" role="alert">{errors.subject}</p>
                                        )}
                                    </div>

                                    {/* Message */}
                                    <div className="contact-form__group">
                                        <label htmlFor="cf-message" className="contact-form__label">
                                            Message <span aria-hidden="true" className="contact-form__required">*</span>
                                        </label>
                                        <div className={`contact-form__input-wrap contact-form__input-wrap--textarea ${errors.message && touched.message ? 'contact-form__input-wrap--error' : ''} ${!errors.message && touched.message ? 'contact-form__input-wrap--ok' : ''}`}>
                                            <textarea
                                                id="cf-message"
                                                name="message"
                                                className="contact-form__textarea"
                                                placeholder="Describe your question or issue in detail (minimum 20 characters)…"
                                                rows={6}
                                                value={fields.message}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                aria-required="true"
                                                aria-describedby={errors.message && touched.message ? 'cf-message-error' : undefined}
                                                aria-invalid={!!(errors.message && touched.message)}
                                            />
                                        </div>
                                        <div className="contact-form__char-row">
                                            {errors.message && touched.message && (
                                                <p id="cf-message-error" className="contact-form__error" role="alert">{errors.message}</p>
                                            )}
                                            <span className={`contact-form__char-count ${fields.message.length < 20 ? 'contact-form__char-count--low' : ''}`}>
                                                {fields.message.length} / 20 min
                                            </span>
                                        </div>
                                    </div>

                                    {/* Privacy note */}
                                    <p className="contact-form__privacy">
                                        <Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                        Your information is encrypted and never shared with third parties.
                                        See our <Link to="/privacy" className="contact-form__privacy-link">Privacy Policy</Link>.
                                    </p>

                                    {errors.form && (
                                        <p className="contact-form__error" role="alert" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                                            {errors.form}
                                        </p>
                                    )}

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        className={`contact-form__submit ${submitState === 'loading' ? 'contact-form__submit--loading' : ''}`}
                                        disabled={submitState === 'loading'}
                                        aria-busy={submitState === 'loading'}
                                    >
                                        {submitState === 'loading' ? (
                                            <>
                                                <Loader size="sm" text="" />
                                                Sending…
                                            </>
                                        ) : (
                                            <>
                                                Send Message <Send size={16} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* ── RIGHT: Info sidebar ── */}
                        <aside className="contact-info" aria-label="Contact information">
                            <div className="contact-info__card">
                                <h3 className="contact-info__title">Response Times</h3>
                                <ul className="contact-info__list" role="list">
                                    {[
                                        { type: 'Live Chat', time: 'Instant', Icon: MessageSquare },
                                        { type: 'Email', time: '< 24 hours', Icon: Mail },
                                        { type: 'Phone', time: 'Business hours', Icon: Phone },
                                        { type: 'Enterprise', time: '< 2 hours', Icon: Building2 },
                                    ].map(r => (
                                        <li key={r.type} className="contact-info__list-item" role="listitem">
                                            <span className="contact-info__list-icon"><r.Icon size={16} /></span>
                                            <span className="contact-info__list-type">{r.type}</span>
                                            <span className="contact-info__list-time">{r.time}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="contact-info__card">
                                <h3 className="contact-info__title">Office Hours</h3>
                                <ul className="contact-info__hours" role="list">
                                    {[
                                        { day: 'Mon – Fri', hrs: '9:00 AM – 6:00 PM' },
                                        { day: 'Saturday', hrs: '10:00 AM – 2:00 PM' },
                                        { day: 'Sunday', hrs: 'Closed' },
                                    ].map(o => (
                                        <li key={o.day} className="contact-info__hours-item" role="listitem">
                                            <span className="contact-info__hours-day">
                                                <Clock3 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, opacity: 0.7 }} />
                                                {o.day}
                                            </span>
                                            <span className="contact-info__hours-time">{o.hrs}</span>
                                        </li>
                                    ))}
                                    <li className="contact-info__hours-note">All times in Pakistan Standard Time (PKT)</li>
                                </ul>
                            </div>

                            <div className="contact-info__card contact-info__card--accent">
                                <div className="contact-info__accent-icon"><Bot size={24} /></div>
                                <h3 className="contact-info__accent-title">Try Buddy AI First</h3>
                                <p className="contact-info__accent-text">
                                    Buddy AI resolves 80% of common questions instantly — no wait time required.
                                </p>
                                <Link to="/ai/buddy" className="contact-info__accent-btn">Ask Buddy AI <ArrowRight size={15} /></Link>
                            </div>

                            <div className="contact-info__social">
                                <p className="contact-info__social-label">Find us on</p>
                                <div className="contact-info__social-links" role="list">
                                    {['LinkedIn', 'Twitter/X', 'GitHub', 'Instagram'].map(s => (
                                        <Link key={s} to="/contact" className="contact-info__social-pill" aria-label={s} role="listitem">
                                            {s}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            {/* ══════════════════ FAQ ══════════════════ */}
            <section className="cfaq" aria-label="Frequently Asked Questions">
                <div className="container">
                    <div className="cfaq__header">
                        <div className="section-tag"><span>❓</span> FAQ</div>
                        <h2 className="section-title">Common Questions</h2>
                        <p className="section-subtitle">Quick answers so you don't have to wait.</p>
                    </div>
                    <div ref={faqRef} className="cfaq__grid" role="list">
                        {FAQ_ITEMS.map((faq, i) => (
                            <div
                                key={i}
                                className={`cfaq__item ${openFaq === i ? 'cfaq__item--open' : ''}`}
                                onClick={() => toggleFaq(i)}
                                role="button"
                                tabIndex={0}
                                aria-expanded={openFaq === i}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleFaq(i)}
                            >
                                <div className="cfaq__q">
                                    <span>{faq.q}</span>
                                    <span className="cfaq__arrow" aria-hidden="true">
                                        <ChevronDown size={16} />
                                    </span>
                                </div>
                                <div className="cfaq__a" aria-hidden={openFaq !== i}>
                                    <p>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ FINAL CTA ══════════════════ */}
            <section className="contact-cta" aria-label="Call to action">
                <div className="container">
                    <div className="contact-cta__badge">🚀 Join SkillKart Today</div>
                    <h2 className="contact-cta__heading">
                        Still Exploring? <span className="contact-cta__accent">Start Free</span>
                    </h2>
                    <p className="contact-cta__sub">
                        Create your free account, get AI-verified, and land your first project — no credit card needed.
                    </p>
                    <div className="contact-cta__btns">
                        <Link to="/registration" className="contact-cta__btn-primary">Create Free Account <ArrowRight size={16} /></Link>
                        <Link to="/about" className="contact-cta__btn-secondary">Learn About SkillKart</Link>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}
