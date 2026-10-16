import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { aiAPI } from '../../../api/ai';
import { useAuth } from '../../../hooks/useAuth';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    Bot, Send, Sparkles, MessageSquareText, IndianRupee, Clock,
    ShieldCheck, Lock, Trash2, CheckCircle2, ChevronDown
} from 'lucide-react';
import './AiTools.css';

gsap.registerPlugin(ScrollTrigger);

const GUEST_LIMIT = 3;
const GUEST_KEY = 'buddyGuestUsed'; // shared with the floating BuddyWidget

const FEATURES = [
    { icon: MessageSquareText, title: 'Smart Proposals', desc: 'Generate personalized project bids that resonate with specific client project briefs.', prompt: 'Help me write a winning proposal for a web development project' },
    { icon: Sparkles, title: 'Negotiation Strategy', desc: 'Get real-time advice on how to handle pricing objections and communication gaps.', prompt: 'Give me negotiation tips for handling a client who wants to lower my rate' },
    { icon: IndianRupee, title: 'Pricing Insights', desc: 'Buddy AI analyzes market trends to help you set profitable and competitive rates.', prompt: 'What is a fair rate for a React developer with 2 years of experience?' },
    { icon: Clock, title: 'Instant Responses', desc: 'No queues, no waiting — Buddy replies instantly, any hour of any day.', prompt: 'How can I respond professionally to a difficult client?' },
];

const FAQS = [
    { q: "How accurate is Buddy AI's market data?", a: "Buddy syncs with SkillKart's internal platform data hourly, giving you the most up-to-date pricing and skill demand insights." },
    { q: "Can Buddy write my whole profile?", a: "Buddy can certainly draft it for you! We recommend using its output as a strong base and adding your personal voice for the best results." },
    { q: "Is Buddy AI available to all users?", a: "Yes, currently Buddy AI is accessible to all SkillKart freelancers to help bridge the gap for new students entering the market." },
];

/* ── Orbiting decorative chip ── */
function OrbitChip({ label, angle }) {
    const r = 88; // orbit radius in px
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * r;
    const y = Math.sin(rad) * r;
    return (
        <span
            className="buddy-orbit-chip"
            aria-hidden="true"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
        >
            {label}
        </span>
    );
}

export default function BuddyAI() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const chatPanelRef = useRef(null);
    const [messages, setMessages] = useState([
        { role: 'ai', text: "Hello! I'm your SkillKart Buddy. How can I assist you with your freelance journey today?" }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [limitReached, setLimitReached] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const scrollRef = useRef(null);
    const pageRef = useRef(null);

    const guestUsed = () => Number(sessionStorage.getItem(GUEST_KEY) || 0);
    const guestRemaining = isAuthenticated ? Infinity : Math.max(0, GUEST_LIMIT - guestUsed());

    // Reflect an already-spent guest quota on mount, and clear lock once logged in.
    useEffect(() => {
        if (isAuthenticated) { setLimitReached(false); return; }
        if (guestUsed() >= GUEST_LIMIT) setLimitReached(true);
    }, [isAuthenticated]);

    useEffect(() => {
        document.title = "Buddy AI Assistant | SkillKart";
        window.scrollTo(0, 0);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline();
            tl.from(".bai-badge", { opacity: 0, y: -16, duration: 0.5, ease: "power3.out" })
              .from(".bai-title", { opacity: 0, y: 24, duration: 0.7, ease: "power3.out" }, "-=0.25")
              .from(".bai-sub", { opacity: 0, y: 18, duration: 0.6, ease: "power3.out" }, "-=0.4")
              .from(".bai-chip", { opacity: 0, y: 12, stagger: 0.07, duration: 0.4, ease: "power3.out" }, "-=0.3")
              .from(".bai-try-label,.bai-try-chips", { opacity: 0, y: 8, duration: 0.35, ease: "power3.out" }, "-=0.2")
              .from(".bai-chat-col", { opacity: 0, y: 40, duration: 0.9, ease: "power3.out" }, "-=0.6")
              .from(".buddy-orb", { opacity: 0, scale: 0.7, duration: 0.6, ease: "back.out(1.5)" }, "-=0.7");

            gsap.fromTo(".bai-bento-tile",
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: "power3.out",
                    scrollTrigger: { trigger: ".bai-bento", start: "top 88%" }
                }
            );

            gsap.fromTo(".bai-privacy-text,.bai-security-card",
                { opacity: 0, y: 28 },
                {
                    opacity: 1, y: 0, stagger: 0.12, duration: 0.8, ease: "power3.out",
                    scrollTrigger: { trigger: ".bai-privacy", start: "top 88%" }
                }
            );

            gsap.fromTo(".bai-faq-item",
                { opacity: 0, y: 20 },
                {
                    opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power3.out",
                    scrollTrigger: { trigger: ".bai-faq", start: "top 88%" }
                }
            );

            gsap.fromTo(".bai-cta-panel",
                { opacity: 0, scale: 0.96 },
                {
                    opacity: 1, scale: 1, duration: 0.7, ease: "power3.out",
                    scrollTrigger: { trigger: ".bai-cta", start: "top 90%" }
                }
            );

            setTimeout(() => ScrollTrigger.refresh(), 500);
        }, pageRef);

        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (textInput) => {
        const msg = textInput || input;
        if (!msg.trim() || isTyping || limitReached) return;

        // Guest gate (client-side; the server enforces it too).
        if (!isAuthenticated && guestUsed() >= GUEST_LIMIT) {
            setLimitReached(true);
            return;
        }

        // Build the conversation history from prior messages BEFORE this one.
        // Our internal role 'ai' maps to the API role 'assistant'.
        const history = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await aiAPI.buddy(msg, history);
            const d = res?.data?.data || {};
            setMessages(prev => [...prev, { role: 'ai', text: d.reply || "Sorry, I'm having trouble right now — please try again." }]);
            if (!isAuthenticated) {
                const used = d.guestRemaining != null ? (GUEST_LIMIT - d.guestRemaining) : guestUsed() + 1;
                sessionStorage.setItem(GUEST_KEY, String(used));
                if (d.guestRemaining === 0) setLimitReached(true);
            }
        } catch (err) {
            if (err.response?.status === 403 && err.response?.data?.data?.loginRequired) {
                sessionStorage.setItem(GUEST_KEY, String(GUEST_LIMIT));
                setLimitReached(true);
            } else {
                console.error('Buddy AI request failed:', err);
                const aiDown = err.response?.status === 503 || !err.response;
                setMessages(prev => [...prev, {
                    role: 'ai',
                    text: aiDown
                        ? "Buddy AI is temporarily out of service. Please try again in a little while."
                        : "Sorry, I'm having trouble right now — please try again."
                }]);
            }
        } finally {
            setIsTyping(false);
        }
    };

    const suggestions = [
        "Write a proposal",
        "Improve my gig description",
        "Client negotiation tips",
        "Best pricing strategy"
    ];

    const scrollToChat = () => {
        chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            chatPanelRef.current?.querySelector('.ai-input')?.focus();
        }, 400);
    };

    const handleBentoAsk = (prompt) => {
        setInput(prompt);
        scrollToChat();
    };

    return (
        <div className="bai-page" ref={pageRef}>
            {/* Ambient background blobs */}
            <div className="bai-bg" aria-hidden="true">
                <div className="bai-blob bai-blob--1" />
                <div className="bai-blob bai-blob--2" />
                <div className="bai-blob bai-blob--3" />
            </div>

            <Navbar />

            {/* ══ HERO + CHAT TOGETHER ══ */}
            <section className="bai-hero-section">
                <div className="container bai-hero-grid">

                    {/* Left — text + chips */}
                    <div className="bai-left-col">
                        <span className="bai-badge">
                            <Bot size={14} /> AI Productivity Assistant
                        </span>
                        <h1 className="bai-title">
                            Your 24/7 Smart{' '}
                            <span className="bai-accent">Freelance</span>{' '}
                            Business Partner
                        </h1>
                        <p className="bai-sub">
                            SkillKart Buddy helps you craft perfect proposals, set competitive rates,
                            and navigate complex client communications with ease.
                        </p>

                        {/* Feature chips */}
                        <div className="bai-chips-row">
                            <span className="bai-chip"><Bot size={13} /> 24/7 Availability</span>
                            <span className="bai-chip"><MessageSquareText size={13} /> Smart Proposals</span>
                            <span className="bai-chip"><IndianRupee size={13} /> Pricing Analysis</span>
                            <span className="bai-chip"><Clock size={13} /> Instant Responses</span>
                        </div>

                        {/* Try asking row */}
                        <div className="bai-try-row">
                            <span className="bai-try-label">Try asking:</span>
                            <div className="bai-try-chips">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        className="buddy-suggestion"
                                        onClick={() => handleSend(s)}
                                        disabled={isTyping || limitReached}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — chat window with orb */}
                    <div className="bai-chat-col" ref={chatPanelRef}>
                        {/* Orb + orbiting decorative chips */}
                        <div className="buddy-orb-wrap" aria-hidden="true">
                            <div className="buddy-orb">
                                <Bot size={28} />
                            </div>
                            <div className="buddy-orb-halo" />
                            <OrbitChip label="Proposals" angle={-30} />
                            <OrbitChip label="Pricing" angle={60} />
                            <OrbitChip label="Clients" angle={150} />
                            <OrbitChip label="Strategy" angle={240} />
                        </div>

                        {/* Chat window */}
                        <div className="buddy-chat">
                            {/* Light glass header */}
                            <div className="buddy-chat-header">
                                <div className="buddy-chat-header__avatar">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <div className="buddy-chat-header__name">Buddy AI Assistant</div>
                                    <div className="buddy-chat-header__status">Online &amp; ready to help</div>
                                </div>
                            </div>

                            <div
                                className="buddy-chat-messages"
                                ref={scrollRef}
                                aria-live="polite"
                                aria-label="Chat messages"
                            >
                                {messages.map((m, i) => (
                                    <div key={i} className={`buddy-bubble buddy-bubble--${m.role}`}>
                                        {m.text}
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="buddy-bubble buddy-bubble--ai buddy-typing" aria-label="Buddy is typing">
                                        <span /><span /><span />
                                    </div>
                                )}
                            </div>

                            {limitReached ? (
                                <div className="buddy-limit">
                                    <p>
                                        You've used your {GUEST_LIMIT} free messages. Log in to keep
                                        chatting with Buddy — it's free and unlimited.
                                    </p>
                                    <button className="ai-btn-primary" onClick={() => navigate('/login')}>
                                        Log in to continue
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="buddy-chat-input-wrap">
                                        <input
                                            type="text"
                                            className="ai-input"
                                            placeholder="Ask Buddy anything about your freelance project..."
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                                            aria-label="Message Buddy AI"
                                        />
                                        <button
                                            onClick={() => handleSend()}
                                            className="buddy-send"
                                            disabled={!input.trim() || isTyping}
                                            aria-label="Send message"
                                        >
                                            <Send size={17} />
                                        </button>
                                    </div>

                                    {!isAuthenticated && (
                                        <p className="buddy-note">
                                            {guestRemaining} free message{guestRemaining === 1 ? '' : 's'} left ·{' '}
                                            <button onClick={() => navigate('/login')}>log in</button> for unlimited
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ CAPABILITIES BENTO ══ */}
            <section className="bai-bento-section">
                <div className="container">
                    <div className="bai-section-head">
                        <span className="bai-section-eyebrow"><Sparkles size={13} /> Capabilities</span>
                        <h2 className="bai-section-title">
                            Advanced AI <span className="bai-accent">Capabilities</span>
                        </h2>
                        <p className="bai-section-sub">
                            Leverage the power of cutting-edge NLP models trained on successful freelancing data.
                        </p>
                    </div>

                    <div className="bai-bento">
                        {FEATURES.map((f, i) => (
                            <div
                                key={i}
                                className={`bai-bento-tile bai-bento-tile--${i}`}
                                onMouseMove={e => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    e.currentTarget.style.setProperty('--mx', `${x}%`);
                                    e.currentTarget.style.setProperty('--my', `${y}%`);
                                }}
                            >
                                <span className="bai-bento-icon"><f.icon size={22} /></span>
                                <h4 className="bai-bento-h4">{f.title}</h4>
                                <p className="bai-bento-p">{f.desc}</p>
                                <button
                                    className="bai-bento-ask"
                                    onClick={() => handleBentoAsk(f.prompt)}
                                    aria-label={`Ask Buddy about ${f.title}`}
                                >
                                    Ask Buddy ↗
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PRIVACY — light split ══ */}
            <section className="bai-privacy">
                <div className="container bai-privacy-grid">
                    {/* Left — text */}
                    <div className="bai-privacy-text">
                        <span className="bai-section-eyebrow"><ShieldCheck size={13} /> Privacy</span>
                        <h2 className="bai-section-title">
                            Encrypted &amp; <span className="bai-accent">Private</span>
                        </h2>
                        <p className="bai-section-sub" style={{ textAlign: 'left', marginLeft: 0, maxWidth: '100%' }}>
                            Your conversations with Buddy AI are fully encrypted and only used to
                            improve your personal experience. We do not share your strategic data
                            with other freelancers or third parties.
                        </p>
                        <ul className="bai-privacy-list">
                            <li><ShieldCheck size={17} /> End-to-end Encryption</li>
                            <li><CheckCircle2 size={17} /> Compliance with Data Privacy</li>
                            <li><Trash2 size={17} /> One-Click History Clearing</li>
                        </ul>
                    </div>

                    {/* Right — animated security card */}
                    <div className="bai-security-card">
                        {/* Animated shield illustration */}
                        <div className="bai-shield-wrap" aria-hidden="true">
                            <div className="bai-shield-ring bai-shield-ring--1" />
                            <div className="bai-shield-ring bai-shield-ring--2" />
                            <div className="bai-shield-ring bai-shield-ring--3" />
                            <div className="bai-shield-core">
                                <Lock size={28} />
                            </div>
                        </div>
                        <h4 className="bai-security-card__title">Enterprise-Grade Security</h4>
                        <p className="bai-security-card__text">
                            Trust is the foundation of SkillKart. Our AI assistant is designed
                            with a "Privacy First" architecture.
                        </p>
                    </div>
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="bai-faq">
                <div className="container bai-faq-grid">
                    {/* Left — sticky heading */}
                    <div className="bai-faq-head">
                        <span className="bai-section-eyebrow">Help</span>
                        <h2 className="bai-section-title">Buddy AI Help &amp; Tips</h2>
                        <p className="bai-section-sub" style={{ textAlign: 'left', marginLeft: 0, maxWidth: '100%' }}>
                            Everything you need to know about working with Buddy.
                        </p>
                    </div>
                    {/* Right — accordion */}
                    <div className="bai-faq-items">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className={`bai-faq-item${openFaq === i ? ' bai-faq-item--open' : ''}`}
                            >
                                <button
                                    className="bai-faq-question"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    aria-expanded={openFaq === i}
                                >
                                    {faq.q}
                                    <ChevronDown size={18} className="bai-faq-chevron" />
                                </button>
                                <div className="bai-faq-answer">
                                    <p>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA ══ */}
            <section className="bai-cta">
                <div className="container">
                    <div className="bai-cta-panel">
                        {/* Decorative circles */}
                        <div className="bai-cta-circle bai-cta-circle--1" aria-hidden="true" />
                        <div className="bai-cta-circle bai-cta-circle--2" aria-hidden="true" />
                        <div className="bai-cta-circle bai-cta-circle--3" aria-hidden="true" />

                        <div className="bai-cta-orb" aria-hidden="true"><Bot size={24} /></div>
                        <h2 className="bai-cta-title">Start Growing Your Business</h2>
                        <p className="bai-cta-sub">
                            Connect with Buddy AI and transform your freelance professional workflow.
                        </p>
                        <button
                            onClick={scrollToChat}
                            className="ai-btn-primary bai-cta-btn"
                        >
                            <Sparkles size={17} /> Chat with Buddy Now
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
