import { useState, useEffect, useRef } from 'react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AiTools.css';

gsap.registerPlugin(ScrollTrigger);

export default function ProfileAnalyzer() {
    const [formData, setFormData] = useState({
        bio: '',
        skills: '',
        experience: '',
        portfolio: '',
        category: 'Development'
    });

    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const pageRef = useRef(null);

    useEffect(() => {
        document.title = "Profile Analyzer | SkillKart AI";
        window.scrollTo(0, 0);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline();
            tl.from(".ai-hero__badge", { opacity: 0, y: -20, duration: 0.6, ease: "power3.out" })
              .from(".ai-hero__title", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" }, "-=0.3")
              .from(".ai-hero__sub", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out" }, "-=0.5")
              .from(".ai-hero-stat", { opacity: 0, y: 15, stagger: 0.08, duration: 0.4, ease: "power3.out" }, "-=0.3")
              .from(".ai-hero .ai-btn-primary", { opacity: 0, scale: 0.9, duration: 0.6, ease: "back.out(1.7)" }, "-=0.4");

            gsap.fromTo(".ai-card", 
                { opacity: 0, y: 40 },
                { 
                    opacity: 1, y: 0, duration: 1, ease: "power3.out",
                    scrollTrigger: { trigger: ".ai-tool-section", start: "top 85%" }
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

    const handleAnalyze = (e) => {
        e.preventDefault();
        setLoading(true);
        
        setTimeout(() => {
            setAnalysis({
                overallScore: 78,
                strengths: ["Strong technical core in React/Node", "Good portfolio link density", "Professional years-of-experience markers"],
                weaknesses: ["Bio is too short (lacks keywords)", "Missing a clear niche statement", "No mention of collaborative tools like Jira/Git"],
                seoKeywords: "Fullstack Developer, React specialist, UI Engineer, JavaScript Expert",
                competitorStat: "Your profile is stronger than 65% of applicants in your niche."
            });
            setLoading(false);
            
            setTimeout(() => {
                const resSection = document.getElementById('analysis-result');
                if (resSection) {
                    resSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    gsap.fromTo("#analysis-result", 
                        { opacity: 0, y: 30 },
                        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
                    );
                }
            }, 100);
        }, 1800);
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
                    <span className="ai-hero__badge">AI Profile Optimization</span>
                    <h1 className="ai-hero__title">
                        Optimize Your <span className="ai-hero__accent">Freelance</span><br />
                        Presence with AI
                    </h1>
                    <p className="ai-hero__sub">
                        Get data-driven insights into your Bio, Skills, and SEO positioning.
                        Turn more profile views into high-ticket client invitations.
                    </p>
                    <div className="ai-hero-stats" style={{ marginBottom: '2.5rem' }}>
                        <span className="ai-hero-stat">🔍 Deep Skill Audit</span>
                        <span className="ai-hero-stat">🛠️ SEO Optimization</span>
                        <span className="ai-hero-stat">📊 Market Benchmarking</span>
                        <span className="ai-hero-stat">💡 Content Strategy</span>
                    </div>
                    <a href="#analyze-tool" className="ai-btn-primary">Analyze My Profile</a>
                </div>
            </header>

            {/* ══ TOOL SECTION ══ */}
            <section id="analyze-tool" className="ai-tool-section">
                <div className="container" style={{ maxWidth: '1000px' }}>
                    <div className="ai-card">
                        <div className="ai-tool-header" style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#042E4C' }}>Profile Analysis Engine</h2>
                            <p style={{ color: '#4a5568' }}>Input your current profile details for a comprehensive AI deep-dive.</p>
                        </div>

                        <form onSubmit={handleAnalyze} className="ai-tool-form">
                            <div className="ai-form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Target Category</label>
                                <CustomSelect 
                                    options={['Development', 'UI/UX Design', 'Content Writing', 'Data Science', 'Digital Marketing']}
                                    value={formData.category}
                                    onChange={val => setFormData({...formData, category: val})}
                                />
                            </div>
                            <div className="ai-form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Profile Bio / About Section</label>
                                <textarea 
                                    required className="ai-input" 
                                    style={{ height: '150px', resize: 'vertical' }}
                                    placeholder="Paste your professional summary here..."
                                    value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})}
                                />
                            </div>
                            <div className="ai-form-grid">
                                <div className="ai-form-group">
                                    <label>Expert Skills (Comma Separated)</label>
                                    <input 
                                        type="text" required className="ai-input" placeholder="e.g. React, Python, Project Management"
                                        value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Work Experience Summary</label>
                                    <input 
                                        type="text" required className="ai-input" placeholder="e.g. 5 Years at Google, Freelanced for 2 years"
                                        value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}
                                    />
                                </div>
                            </div>
                             <button type="submit" className="ai-btn-primary ai-submit-btn" disabled={loading} style={{ marginTop: '2rem', minWidth: '240px' }}>
                                 {loading ? '🧠 Analyzing Your Profile...' : 'Run Profile Analysis'}
                             </button>
                        </form>

                        {/* RESULT PANEL */}
                        {analysis && (
                            <div id="analysis-result" className="ai-result" style={{ color: '#042E4C' }}>
                                <div className="ai-result-grid" style={{ marginBottom: '2.5rem' }}>
                                    <div className="ai-stat-card" style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ color: '#64748b', fontSize: '0.9rem' }}>Optimization Score</h4>
                                        <div className="value" style={{ fontSize: '3.5rem', fontWeight: 800, margin: '0.5rem 0', color: '#042E4C' }}>{analysis.overallScore}%</div>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Based on market demand in {formData.category}</p>
                                    </div>
                                    <div className="ai-stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ color: '#64748b', fontSize: '0.9rem' }}>Market Positioning</h4>
                                        <div className="value" style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#042E4C' }}>Strong Candidate</div>
                                        <p style={{ marginTop: '1rem', fontStyle: 'italic', fontWeight: 600, color: '#1e293b' }}>
                                            "{analysis.competitorStat}"
                                        </p>
                                    </div>
                                </div>

                                <div className="ai-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <div className="ai-form-grid">
                                        <div>
                                            <h4 style={{ fontWeight: 800, marginBottom: '1.2rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>✅</span> Profile Strengths
                                            </h4>
                                            <ul style={{ color: '#334155', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
                                                {analysis.strengths.map((s, i) => (
                                                    <li key={i} style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'start', gap: '8px' }}>
                                                        <span style={{ color: '#059669' }}>•</span> {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 800, marginBottom: '1.2rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>⚠️</span> Areas for Improvement
                                            </h4>
                                            <ul style={{ color: '#334155', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
                                                {analysis.weaknesses.map((w, i) => (
                                                    <li key={i} style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'start', gap: '8px' }}>
                                                        <span style={{ color: '#dc2626' }}>•</span> {w}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontWeight: 700, marginBottom: '0.8rem', color: '#042E4C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🔍</span> Recommended SEO Keywords:
                                        </h4>
                                        <p style={{ color: '#2563eb', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.02em' }}>{analysis.seoKeywords}</p>
                                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Include these in your bio and title to rank higher in searches.</p>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                                    <button className="ai-btn-primary" style={{ width: 'auto', padding: '1rem 3rem' }}>
                                        🚀 Advanced AI Deep Analysis (Incoming)
                                    </button>
                                    <p style={{ fontSize: '0.85rem', color: '#718096', marginTop: '0.75rem' }}>
                                        Coming Soon: Our next-gen AI will provide sentence-level feedback on your profile.
                                    </p>
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
                        <h2>Maximize Your Visibility</h2>
                        <p>We analyze 100+ data points from successful profiles to tell you exactly how you compare.</p>
                    </div>
                    <div className="ai-features-grid">
                        {[
                            { icon: '🎯', title: 'Niche Identification', desc: 'AI helps you find high-ticket sub-niches where your specific skills are in high demand.' },
                            { icon: '🚀', title: 'SEO Optimization', desc: 'Automatically find the best tags and titles to rank on the first page of search results.' },
                            { icon: '📊', title: 'Competitor Analysis', desc: 'Understand how you stack up against other freelancers and stay ahead of the game.' },
                            { icon: '💡', title: 'Content Polishing', desc: 'Get smart suggestions for rewriting your bio to sound more authoritative and professional.' }
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

            {/* ══ BEFORE/AFTER ══ */}
            <section style={{ padding: '100px 0', background: '#f8fafc' }}>
                <div className="container">
                    <div className="ai-section-title">
                        <h2>The AI Optimization Result</h2>
                        <p>Real example of how a student profile was transformed using AI-driven insights.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div className="ai-card" style={{ opacity: 0.7 }}>
                            <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#dc2626', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>BEFORE (40% Optm.)</span>
                            <p style={{ fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '1rem' }}>"Hi, I'm a student at FAST NUCES. I know JS, Python and I want to work on projects. I am hardworking and will do my best for you."</p>
                            <div style={{ padding: '0.5rem', background: '#fee2e2', color: '#dc2626', fontSize: '0.8rem', borderRadius: '8px' }}>❌ Too vague, missing keywords, lacks value statement.</div>
                        </div>
                        <div className="ai-card" style={{ border: '2px solid #059669' }}>
                            <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#059669', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>AFTER (98% Optm.)</span>
                            <p style={{ fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '1rem' }}>"Innovative Fullstack Developer specialized in React & Python. Deliverering high-performance web applications with a focus on seamless UI/UX. Experienced in Agile workflows and scalable architectures."</p>
                            <div style={{ padding: '0.5rem', background: '#d1fae5', color: '#059669', fontSize: '0.8rem', borderRadius: '8px' }}>✅ Authoritative, keywords-rich, clear value proposition.</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="ai-faq">
                <div className="container">
                    <div className="ai-section-title">
                        <h2>Optimization Help Desk</h2>
                    </div>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {[
                            { q: "Will this guarantee project invitations?", a: "While we can't guarantee job offers, data shows that highly optimized profiles receive 4× more invitations on average." },
                            { q: "How many times can I analyze my profile?", a: "SkillKart encourages unlimited analysis to ensure your profile evolves as you gain new professional milestones." },
                            { q: "Does the AI support non-technical categories?", a: "ABSOLUTELY. Our models are trained across writing, design, marketing, and 50+ other specialized categories." }
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
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Ready to Stand Out?</h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>Get your profile optimization report now and start attracting high-ticket clients.</p>
                    <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} className="ai-btn-primary" style={{ background: '#fff', color: '#042E4C' }}>
                        Analyze My Profile
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
}
