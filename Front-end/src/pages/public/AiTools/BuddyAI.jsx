import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { aiAPI } from '../../../api/ai';
import { useAuth } from '../../../hooks/useAuth';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AiTools.css';

gsap.registerPlugin(ScrollTrigger);

const GUEST_LIMIT = 3;
const GUEST_KEY = 'buddyGuestUsed'; // shared with the floating BuddyWidget

export default function BuddyAI() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { role: 'ai', text: "Hello! I'm your SkillKart Buddy. How can I assist you with your freelance journey today?" }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [limitReached, setLimitReached] = useState(false);
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
            tl.from(".ai-hero__badge", { opacity: 0, y: -20, duration: 0.6, ease: "power3.out" })
              .from(".ai-hero__title", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" }, "-=0.3")
              .from(".ai-hero__sub", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out" }, "-=0.5")
              .from(".ai-hero-stat", { opacity: 0, y: 15, stagger: 0.08, duration: 0.4, ease: "power3.out" }, "-=0.3")
              .from(".ai-hero .ai-btn-primary", { opacity: 0, scale: 0.9, duration: 0.6, ease: "back.out(1.7)" }, "-=0.4");

            gsap.fromTo(".buddy-chat", 
                { opacity: 0, y: 40 },
                { 
                    opacity: 1, y: 0, duration: 1, ease: "power3.out",
                    scrollTrigger: { trigger: ".buddy-chat", start: "top 85%" }
                }
            );

            gsap.fromTo(".ai-feature-card", 
                { opacity: 0, y: 30 },
                { 
                    opacity: 1, y: 0, stagger: 0.15, duration: 0.8, ease: "power3.out",
                    scrollTrigger: { trigger: ".ai-features", start: "top 85%" }
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

    return (
        <div className="ai-page" ref={pageRef}>
            <Navbar />

            {/* ══ HERO ══ */}
            <header className="ai-hero">
                <div className="ai-hero__bg">
                    <div className="ai-hero__orb ai-hero__orb--1" />
                    <div className="ai-hero__orb ai-hero__orb--2" />
                    <div className="ai-hero__grid" />
                </div>
                <div className="container ai-hero__inner">
                    <span className="ai-hero__badge">AI Productivity Assistant</span>
                    <h1 className="ai-hero__title">
                        Your 24/7 Smart <span className="ai-hero__accent">Freelance</span><br />
                        Business Partner
                    </h1>
                    <p className="ai-hero__sub">
                        SkillKart Buddy helps you craft perfect proposals, set competitive rates, 
                        and navigate complex client communications with ease.
                    </p>
                    <div className="ai-hero-stats">
                        <span className="ai-hero-stat">🤖 24/7 Availability</span>
                        <span className="ai-hero-stat">📝 Smart Proposals</span>
                        <span className="ai-hero-stat">📊 Pricing Analysis</span>
                        <span className="ai-hero-stat">⚡ Instant Responses</span>
                    </div>
                </div>
            </header>

            {/* ══ CHAT INTERFACE ══ */}
            <section className="ai-tool-section">
                <div className="container">
                    <div className="buddy-chat">
                        <div className="buddy-chat-header">
                            <div style={{ width: '40px', height: '40px', background: '#042E4C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.2rem' }}>🤖</span>
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, color: '#042E4C' }}>Buddy AI Assistant</h3>
                                <p style={{ fontSize: '0.75rem', color: '#10b981' }}>● Online & Ready to help</p>
                            </div>
                        </div>

                        <div className="buddy-chat-messages" ref={scrollRef}>
                            {messages.map((m, i) => (
                                <div key={i} className={`buddy-bubble buddy-bubble--${m.role}`}>
                                    {m.text}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="buddy-bubble buddy-bubble--ai" style={{ width: '60px', textAlign: 'center' }}>
                                    ...
                                </div>
                            )}
                        </div>

                        {limitReached ? (
                            <div style={{ margin: '0 1.5rem 1.25rem', padding: '1.1rem', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.9rem', color: '#3730a3', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                                    You've used your {GUEST_LIMIT} free messages. Log in to keep chatting with Buddy — it's free and unlimited.
                                </p>
                                <button className="ai-btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }} onClick={() => navigate('/login')}>
                                    Log in to continue
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ padding: '0 1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(s)}
                                            disabled={isTyping}
                                            style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', borderRadius: '20px', fontSize: '0.8rem', color: '#4a5568', fontWeight: 600, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                <div className="buddy-chat-input-wrap">
                                    <input
                                        type="text"
                                        className="ai-input"
                                        style={{ borderRadius: '24px' }}
                                        placeholder="Ask Buddy anything about your freelance project..."
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        className="ai-btn-primary"
                                        style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, flexShrink: 0 }}
                                        disabled={!input.trim() || isTyping}
                                    >
                                        ➔
                                    </button>
                                </div>

                                {!isAuthenticated && (
                                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', margin: '0.6rem 1.5rem 0' }}>
                                        {guestRemaining} free message{guestRemaining === 1 ? '' : 's'} left ·{' '}
                                        <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--color-primary, #042e4c)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.75rem' }}>
                                            log in
                                        </button>{' '}for unlimited
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ══ FEATURES ══ */}
            <section className="ai-features">
                <div className="container">
                    <div className="ai-section-title">
                        <h2>Advanced AI Capabilities</h2>
                        <p>Leverage the power of cutting-edge NLP models trained on successful freelancing data.</p>
                    </div>
                    <div className="ai-features-grid">
                        {[
                            { icon: '📝', title: 'Smart Proposals', desc: 'Generate personalized project bids that resonate with specific client project briefs.' },
                            { icon: '💬', title: 'Negotiation Strategy', desc: 'Get real-time advice on how to handle pricing objections and communication gaps.' },
                            { icon: '✨', title: 'Content Polishing', desc: 'Refine your gig titles, descriptions, and FAQs to maximize conversion rates.' },
                            { icon: '📊', title: 'Pricing Insights', desc: 'Buddy AI analyzes market trends to help you set profitable and competitive rates.' }
                        ].map((f, i) => (
                            <div key={i} className="ai-feature-card">
                                <span className="ai-feature-icon">{f.icon}</span>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{f.title}</h4>
                                <p style={{ fontSize: '0.95rem', color: '#4a5568' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ SECURE DATA ══ */}
            <section style={{ padding: '100px 0', background: '#042E4C', color: '#fff' }}>
                <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>Encrypted &amp; Private</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, marginBottom: '2rem' }}>
                            Your conversations with Buddy AI are fully encrypted and only used to improve your personal experience. 
                            We do not share your strategic data with other freelancers or third parties.
                        </p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>✅ End-to-end Encryption</li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>✅ Compliance with Data Privacy</li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>✅ One-Click History Clearing</li>
                        </ul>
                    </div>
                    <div className="ai-card" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
                        <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>Enterprise-Grade Security</h4>
                        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Trust is the foundation of SkillKart. Our AI assistant is designed with a "Privacy First" architecture.</p>
                    </div>
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="ai-faq">
                <div className="container">
                    <div className="ai-section-title">
                        <h2>Buddy AI Help & Tips</h2>
                    </div>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {[
                            { q: "How accurate is Buddy AI's market data?", a: "Buddy syncs with SkillKart's internal platform data hourly, giving you the most up-to-date pricing and skill demand insights." },
                            { q: "Can Buddy write my whole profile?", a: "Buddy can certainly draft it for you! We recommend using its output as a strong base and adding your personal voice for the best results." },
                            { q: "Is Buddy AI available to all users?", a: "Yes, currently Buddy AI is accessible to all SkillKart freelancers to help bridge the gap for new students entering the market." }
                        ].map((faq, i) => (
                            <div key={i} className="ai-faq-item">
                                <div className="ai-faq-question">{faq.q}</div>
                                <div className="ai-faq-answer">{faq.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA ══ */}
            <section className="ai-cta">
                <div className="container">
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Start Growing Your Business</h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>Connect with Buddy AI and transform your freelance professional workflow.</p>
                    <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} className="ai-btn-primary" style={{ background: '#fff', color: '#042E4C' }}>
                        Chat with Buddy Now
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
}
