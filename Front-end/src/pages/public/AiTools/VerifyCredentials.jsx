import { useState, useEffect, useRef } from 'react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AiTools.css';

gsap.registerPlugin(ScrollTrigger);

export default function VerifyCredentials() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        linkedin: '',
        portfolio: '',
        experience: '1-3 Years',
        skills: ''
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const pageRef = useRef(null);

    useEffect(() => {
        document.title = "Verify Credentials | SkillKart AI";
        window.scrollTo(0, 0);

        // GSAP Hero Animations
        const ctx = gsap.context(() => {
            const tl = gsap.timeline();
            tl.from(".ai-hero__badge", { opacity: 0, y: -20, duration: 0.6, ease: "power3.out" })
              .from(".ai-hero__title", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" }, "-=0.3")
              .from(".ai-hero__sub", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out" }, "-=0.5")
              .from(".ai-hero .ai-btn-primary", { opacity: 0, scale: 0.9, duration: 0.6, ease: "back.out(1.7)" }, "-=0.4");

            // Scroll Animations for sections - use more robust formTo
            gsap.fromTo(".ai-card", 
                { opacity: 0, y: 40 },
                { 
                    opacity: 1, y: 0, duration: 1, ease: "power3.out",
                    scrollTrigger: {
                        trigger: ".ai-tool-section",
                        start: "top 85%",
                        toggleActions: "play none none none"
                    }
                }
            );

            gsap.fromTo(".ai-feature-card", 
                { opacity: 0, y: 30 },
                { 
                    opacity: 1, y: 0, stagger: 0.15, duration: 0.8, ease: "power3.out",
                    scrollTrigger: {
                        trigger: ".ai-features",
                        start: "top 85%",
                        toggleActions: "play none none none"
                    }
                }
            );

            // Force refresh ScrollTrigger after a short delay to account for images/layouts
            setTimeout(() => ScrollTrigger.refresh(), 500);
        }, pageRef);

        return () => ctx.revert();
    }, []);

    const handleVerify = (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulate AI Processing
        setTimeout(() => {
            setResult({
                score: 85,
                trustLevel: 'High',
                comments: "Excellent profile markers. LinkedIn profile and portfolio are well-synced. Verified skills match current market demand.",
                improvements: [
                    "Add more specific project details to LinkedIn",
                    "Include GitHub contributions for technical validation",
                    "Request more client testimonials on portfolio"
                ]
            });
            setLoading(false);
            
            // Scroll to results
            setTimeout(() => {
                const resSection = document.getElementById('verification-result');
                if (resSection) {
                    resSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    gsap.fromTo("#verification-result", 
                        { opacity: 0, y: 30 },
                        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
                    );
                }
            }, 100);
        }, 1500);
    };

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
                    <span className="ai-hero__badge">AI Identity & Trust</span>
                    <h1 className="ai-hero__title">
                        Verify Your <span className="ai-hero__accent">Professional</span><br />
                        Credentials with AI
                    </h1>
                    <p className="ai-hero__sub">
                        Instantly validate your skills, experience, and online presence to build
                        trust with high-ticket clients on SkillKart.
                    </p>
                    <a href="#verify-tool" className="ai-btn-primary">Start Verification</a>
                </div>
            </header>

            {/* ══ TOOL SECTION ══ */}
            <section id="verify-tool" className="ai-tool-section">
                <div className="container">
                    <div className="ai-card">
                        <div className="ai-tool-header" style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#042E4C' }}>Verification Form</h2>
                            <p style={{ color: '#4a5568' }}>Please fill in your professional details for AI analysis.</p>
                        </div>

                        <form onSubmit={handleVerify} className="ai-tool-form">
                            <div className="ai-form-grid">
                                <div className="ai-form-group">
                                    <label>Full Name</label>
                                    <input 
                                        type="text" required className="ai-input" placeholder="e.g. Alex Johnson"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" required className="ai-input" placeholder="alex@example.com"
                                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>LinkedIn Profile URL</label>
                                    <input 
                                        type="url" required className="ai-input" placeholder="linkedin.com/in/username"
                                        value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Portfolio URL</label>
                                    <input 
                                        type="url" required className="ai-input" placeholder="yourportfolio.com"
                                        value={formData.portfolio} onChange={e => setFormData({...formData, portfolio: e.target.value})}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Years of Experience</label>
                                    <CustomSelect 
                                        options={['Free (Entry Level)', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years']}
                                        value={formData.experience} 
                                        onChange={val => setFormData({...formData, experience: val})}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Skills (Comma Separated)</label>
                                    <input 
                                        type="text" required className="ai-input" placeholder="React, Node.js, GSAP..."
                                        value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})}
                                    />
                                </div>
                            </div>
                             <button type="submit" className="ai-btn-primary ai-submit-btn" disabled={loading} style={{ marginTop: '2rem', minWidth: '240px' }}>
                                 {loading ? '✨ AI is Verifying...' : 'Verify My Credentials'}
                             </button>
                        </form>

                         {/* RESULT PANEL */}
                        {result && (
                            <div id="verification-result" className="ai-result" style={{ color: '#042E4C' }}>
                                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#042E4C', marginBottom: '2rem' }}>
                                    Verification Report
                                </h3>
                                <div className="ai-result-grid" style={{ marginBottom: '2.5rem' }}>
                                    <div className="ai-stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                        <h4 style={{ color: '#64748b', fontSize: '0.9rem' }}>Verification Score</h4>
                                        <div className="value" style={{ fontSize: '3.5rem', fontWeight: 800, color: '#042E4C', margin: '0.5rem 0' }}>{result.score}%</div>
                                        <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', marginTop: '15px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                            <div style={{ width: `${result.score}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
                                        </div>
                                    </div>
                                    <div className="ai-stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <h4 style={{ color: '#64748b', fontSize: '0.9rem' }}>Trust Level Status</h4>
                                        <div className="value" style={{ 
                                            fontSize: '2.5rem', 
                                            fontWeight: 800,
                                            marginTop: '0.5rem',
                                            color: result.trustLevel === 'High' ? '#059669' : '#042E4C' 
                                        }}>
                                            {result.trustLevel}
                                        </div>
                                        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Your credentials have been successfully validated by our AI model.</p>
                                    </div>
                                </div>

                                <div className="ai-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2rem' }}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h4 style={{ fontWeight: 800, marginBottom: '1rem', color: '#042E4C', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>💎</span> AI Specialist Comments:
                                        </h4>
                                        <p style={{ color: '#334155', lineHeight: 1.7, fontSize: '1.05rem', background: '#fff', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            {result.comments}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <h4 style={{ fontWeight: 800, marginBottom: '1.2rem', color: '#042E4C', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🚀</span> Priority Recommendations:
                                        </h4>
                                        <ul style={{ color: '#334155', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
                                            {result.improvements.map((imp, i) => (
                                                <li key={i} style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'start', gap: '10px' }}>
                                                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>→</span> {imp}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                                    <button className="ai-btn-primary" style={{ minWidth: '280px' }}>
                                        Display Verification Badge on Profile
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ══ FEATURES ══ */}
            <section className="ai-features">
                <div className="container">
                    <div className="ai-section-title">
                        <h2>Why Verify Your Credentials?</h2>
                        <p>A verified profile stands out from 90% of freelancers. AI-verified users attract higher-paying clients and enjoy faster job matching.</p>
                    </div>
                    <div className="ai-features-grid">
                        {[
                            { icon: '🛡️', title: 'Identity Protection', desc: 'Securely validate your real-world identity without exposing sensitive documents.' },
                            { icon: '🎖️', title: 'Skill Validation', desc: 'Our AI analyzes your portfolio and contributions to score your technical expertise.' },
                            { icon: '🤝', title: 'Client Trust', desc: 'Display a verification badge on your profile that high-value clients look for.' },
                            { icon: '📈', title: 'Higher Rankings', desc: 'Verified profiles rank higher in client searches and AI recommendation algorithms.' }
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

            {/* ══ HOW IT WORKS ══ */}
            <section style={{ padding: '100px 0', background: '#f8fafc' }}>
                <div className="container">
                    <div className="ai-section-title">
                        <h2>How the Process Works</h2>
                        <p>Our sophisticated AI system uses multiple signals to validate your professional identity.</p>
                    </div>
                    <div className="ai-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', textAlign: 'center' }}>
                        {[
                            { step: '01', title: 'Input Data', desc: 'Provide your professional links and background info.' },
                            { step: '02', title: 'AI Analysis', desc: 'Our model cross-references your skills with real-world project data.' },
                            { step: '03', title: 'Validation', desc: 'Signals from LinkedIn & Portfolio are checked for authenticity.' },
                            { step: '04', title: 'Get Badge', desc: 'Receive your verification score and trust level badge.' }
                        ].map((s, i) => (
                            <div key={i} className="ai-step">
                                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(4, 46, 76, 0.05)', marginBottom: '-1.5rem' }}>{s.step}</div>
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', position: 'relative' }}>{s.title}</h4>
                                <p style={{ fontSize: '0.95rem', color: '#4a5568' }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="ai-faq">
                <div className="container">
                    <div className="ai-section-title">
                        <h2>Frequently Asked Questions</h2>
                    </div>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {[
                            { q: "Is my personal data safe?", a: "SkillKart AI only analyzes public metadata from your profiles. No private logins or sensitive documents are required for this basic verification." },
                            { q: "How often should I re-verify?", a: "We recommend updating your verification every 3 months or as you gain significant new experience and portfolio items." },
                            { q: "Does a low score mean I can't use SkillKart?", a: "No, the score is an internal trust metric. We provide constructive AI feedback to help you improve your professional presence." }
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
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Ready to Boost Your Trust?</h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>Get verified by AI and start winning high-paying enterprise contracts today.</p>
                    <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} className="ai-btn-primary" style={{ background: '#fff', color: '#042E4C' }}>
                        Start Your Verification
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
}
