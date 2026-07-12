import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import ComboSelect from '../../../Components/common/ComboSelect/ComboSelect';
import TagInput from '../../../Components/common/TagInput/TagInput';
import AiSuggestFill from '../../../Components/common/AiSuggest/AiSuggestFill';
import { JOB_CATEGORIES } from '../../../constants/jobCategories';
import { aiAPI } from '../../../api/ai';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AiTools.css';

gsap.registerPlugin(ScrollTrigger);

// Format a numeric amount with its currency. Falls back gracefully when the
// API returns a non-numeric / missing value.
const formatMoney = (amount, currency = 'PKR') => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
        return '—';
    }
    return `${Number(amount).toLocaleString()} ${currency}`;
};

export default function CostEstimator() {
    const [formData, setFormData] = useState({
        type: JOB_CATEGORIES[0],   // full platform taxonomy (editable + AI-suggested)
        skills: [],                // array of skills (TagInput chips)
        level: 'Expert',
        duration: '1 Month',
        complexity: 50,
        budget: 'Fixed'
    });

    const [estimate, setEstimate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const pageRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Project Cost Estimator | SkillKart AI";
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

    const handleEstimate = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError('');
        setEstimate(null);

        // Map the form fields into the project brief the AI endpoint expects.
        const skills = Array.isArray(formData.skills) ? formData.skills : [];

        const project = {
            title: formData.type,
            category: formData.type,
            description: `A ${formData.type} project requiring ${skills.join(', ') || 'general skills'}. ` +
                `Target expertise level: ${formData.level}. ` +
                `Expected duration: ${formData.duration}. ` +
                `Budget preference: ${formData.budget}.`,
            skills,
            complexity: formData.complexity,
            timeline: formData.duration
        };

        try {
            const res = await aiAPI.estimateCost(project);
            const data = res?.data?.data || {};
            setEstimate({
                min: data.min,
                max: data.max,
                currency: data.currency || 'PKR',
                rationale: data.rationale || '',
                breakdown: Array.isArray(data.breakdown) ? data.breakdown : []
            });

            setTimeout(() => {
                const resSection = document.getElementById('estimate-result');
                if (resSection) {
                    resSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    gsap.fromTo("#estimate-result",
                        { opacity: 0, y: 30 },
                        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
                    );
                }
            }, 100);
        } catch (err) {
            console.error('Cost estimate request failed:', err);
            const aiDown = err.response?.status === 503 || !err.response;
            setError(aiDown
                ? "AI is temporarily out of service, so we couldn't generate an estimate. Please try again shortly."
                : "Couldn't generate an estimate right now — please try again.");
        } finally {
            setLoading(false);
        }
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
                    <span className="ai-hero__badge">AI Market Analytics</span>
                    <h1 className="ai-hero__title">
                        Smart Project <span className="ai-hero__accent">Cost</span><br />
                        Estimation Tool
                    </h1>
                    <p className="ai-hero__sub">
                        Estimate your project's market value based on complexity, skill demand, 
                        and duration. Don't underprice your hard-earned expertise.
                    </p>
                    <div className="ai-hero-stats" style={{ marginBottom: '2.5rem' }}>
                        <span className="ai-hero-stat">💰 Accurate Pricing</span>
                        <span className="ai-hero-stat">🕒 Timeframe Prediction</span>
                        <span className="ai-hero-stat">📈 Market Comparables</span>
                        <span className="ai-hero-stat">📅 Smart Scheduling</span>
                    </div>
                    <a href="#estimate-tool" className="ai-btn-primary">Calculate Estimate</a>
                </div>
            </header>

            {/* ══ TOOL SECTION ══ */}
            <section id="estimate-tool" className="ai-tool-section">
                <div className="container">
                    <div className="ai-card">
                        <div className="ai-tool-header" style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#042E4C' }}>Project Parameters</h2>
                            <p style={{ color: '#4a5568' }}>Define your project requirements for a market-accurate cost estimation.</p>
                        </div>

                        <form onSubmit={handleEstimate} className="ai-tool-form">
                            <div className="ai-form-grid">
                                <div className="ai-form-group">
                                    <label>Project Type</label>
                                    <TagInput
                                        options={JOB_CATEGORIES}
                                        maxTags={1}
                                        tags={formData.type ? [formData.type] : []}
                                        onChange={(tags) => setFormData({ ...formData, type: tags[tags.length - 1] || '' })}
                                        placeholder="Type to search project types…"
                                        hintText={<span>Type to filter the categories, then click one or press <strong>Enter</strong>.</span>}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Required Skills</label>
                                    <TagInput
                                        tags={formData.skills}
                                        onChange={tags => setFormData({ ...formData, skills: tags })}
                                        validateFn={aiAPI.validateSkill}
                                        placeholder="Type a skill (e.g. React) — AI suggests as you type…"
                                        hintText={<span>Type a skill and press <strong>Enter</strong>. AI validates and suggests related skills — no login needed.</span>}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Target Expertise Level</label>
                                    <ComboSelect
                                        options={['Beginner (Student)', 'Intermediate', 'Expert (Pro)']}
                                        value={formData.level}
                                        onChange={val => setFormData({ ...formData, level: val })}
                                        placeholder="Type to search…"
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Project Duration</label>
                                    <ComboSelect
                                        options={['Under 1 Week', '1 Month', '3 Months', '6+ Months']}
                                        value={formData.duration}
                                        onChange={val => setFormData({ ...formData, duration: val })}
                                        placeholder="Type to search…"
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Complexity Level ({formData.complexity}%)</label>
                                    <input
                                        type="range" className="ai-input" min="0" max="100" style={{ padding: 0, background: `linear-gradient(to right, var(--color-primary, #042E4C) ${formData.complexity}%, #e2e8f0 ${formData.complexity}%)` }}
                                        value={formData.complexity} onChange={e => setFormData({...formData, complexity: e.target.value})}
                                    />
                                </div>
                                <div className="ai-form-group">
                                    <label>Budget Preference</label>
                                    <ComboSelect
                                        options={['Fixed Price', 'Hourly Rate']}
                                        value={formData.budget}
                                        onChange={val => setFormData({ ...formData, budget: val })}
                                        placeholder="Type to search…"
                                    />
                                </div>
                            </div>

                            {/* AI suggest — infer project type + skills from what's entered */}
                            <AiSuggestFill
                                label="Suggest type & skills (AI)"
                                getContext={() => ({
                                    title: formData.type,
                                    description: `A ${formData.type} project. Required skills: ${(formData.skills || []).join(', ') || 'unspecified'}. Expertise: ${formData.level}.`,
                                    skills: formData.skills,
                                })}
                                allowedCategories={JOB_CATEGORIES}
                                existingSkills={formData.skills}
                                onCategory={(cat) => setFormData((p) => ({ ...p, type: cat }))}
                                onSkills={(newSkills) => setFormData((p) => ({
                                    ...p,
                                    skills: Array.from(new Set([...(p.skills || []), ...newSkills])),
                                }))}
                            />

                             <button type="submit" className="ai-btn-primary ai-submit-btn" disabled={loading} style={{ marginTop: '1.5rem', minWidth: '240px' }}>
                                 {loading ? '📊 Calculating Market Rates...' : 'Get Cost Estimate'}
                             </button>
                        </form>

                        {/* ERROR STATE */}
                        {error && (
                            <div style={{ marginTop: '2rem', padding: '1.25rem 1.5rem', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontWeight: 600 }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* RESULT PANEL */}
                        {estimate && (
                            <div id="estimate-result" className="ai-result">
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#042E4C', marginBottom: '2rem' }}>
                                    Estimated Market Value
                                </h3>
                                <div className="ai-result-grid" style={{ marginBottom: '2.5rem' }}>
                                    <div className="ai-stat-card" style={{ borderLeft: '6px solid var(--ai-primary)' }}>
                                        <h4>Estimated Range</h4>
                                        <div className="value" style={{ color: '#059669', fontSize: '2.25rem' }}>
                                            {formatMoney(estimate.min, estimate.currency)} – {formatMoney(estimate.max, estimate.currency)}
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#718096', marginTop: '0.5rem' }}>Based on current {formData.type} trends</p>
                                    </div>
                                    <div className="ai-stat-card">
                                        <h4>Currency</h4>
                                        <div className="value" style={{ fontSize: '1.5rem' }}>{estimate.currency}</div>
                                    </div>
                                    <div className="ai-stat-card">
                                        <h4>Estimated Timeline</h4>
                                        <div className="value" style={{ fontSize: '1.5rem' }}>{formData.duration}</div>
                                    </div>
                                    <div className="ai-stat-card">
                                        <h4>Target Level</h4>
                                        <div className="value" style={{ fontSize: '1.5rem' }}>{formData.level}</div>
                                    </div>
                                </div>

                                {estimate.rationale && (
                                    <div style={{ marginBottom: '2.5rem', padding: '1.5rem 1.75rem', background: '#f0f9ff', borderRadius: '16px', border: '1.5px solid #e0f2fe' }}>
                                        <h4 style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#042E4C' }}>AI Rationale</h4>
                                        <p style={{ color: '#4a5568', lineHeight: 1.7 }}>{estimate.rationale}</p>
                                    </div>
                                )}

                                {estimate.breakdown.length > 0 && (
                                    <div className="breakdown-table-wrap" style={{ overflowX: 'auto', background: '#fbfcff', padding: '2rem', borderRadius: '16px', border: '1.5px solid #edf2f7' }}>
                                        <h4 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Project Cost Breakdown</h4>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                    <th style={{ padding: '1rem', color: '#718096', fontWeight: 600 }}>Project Phase</th>
                                                    <th style={{ padding: '1rem', color: '#718096', fontWeight: 600 }}>Estimated Cost Allocation</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {estimate.breakdown.map((row, i) => (
                                                    <tr key={i} style={{ borderBottom: '1.5px solid #edf2f7' }}>
                                                        <td style={{ padding: '1rem', fontWeight: 600, color: '#4a5568' }}>{row.label}</td>
                                                        <td style={{ padding: '1rem', color: '#042E4C', fontWeight: 700 }}>{formatMoney(row.amount, estimate.currency)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        className="ai-btn-primary"
                                        style={{ width: 'auto', padding: '1rem 2.5rem' }}
                                        onClick={() => navigate('/post-project', {
                                            state: { estimate, type: formData.type, skills: formData.skills }
                                        })}
                                    >
                                        🚀 Create Project with this Estimate
                                    </button>
                                    <button
                                        className="ai-btn-secondary"
                                        style={{ width: 'auto', padding: '1rem 2.5rem', background: 'transparent', border: '2.5px solid var(--ai-primary)', color: 'var(--ai-primary)' }}
                                        onClick={() => window.print()}
                                    >
                                        📄 Save Estimate as PDF
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
                        <h2>Accurate Project Valuation</h2>
                        <p>Our AI combines internal platform data with global market rates to find the perfect pricing sweet spot.</p>
                    </div>
                    <div className="ai-features-grid">
                        {[
                            { icon: '💰', title: 'Fair Market Pricing', desc: 'Ensure you earn what you deserve based on real-time demand for your specific skill stack.' },
                            { icon: '📅', title: 'Timeline Prediction', desc: 'Our model analyzes similar project cycles to provide a realistic delivery schedule.' },
                            { icon: '📉', title: 'Risk Reduction', desc: 'Identify potential overheads and complexities before you even sign the contract.' },
                            { icon: '📊', title: 'Competitive Bidding', desc: 'Use our data to place the most competitive bids that dont undervalue your skills.' }
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

            {/* ══ MARKET TIPS ══ */}
            <section style={{ padding: '100px 0', background: '#042E4C', color: '#fff' }}>
                <div className="container">
                    <div className="ai-section-title" style={{ color: '#fff' }}>
                        <h2 style={{ color: '#fff' }}>Pricing Strategies That Work</h2>
                        <p style={{ opacity: 0.8 }}>Expert tips to increase your project value on SkillKart.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
                        {[
                            { title: 'The Value-Based Approach', tip: 'Instead of hours, charge for the outcomes you deliver. A Rs. 1,000 solution is more attractive than Rs. 50/hour.' },
                            { title: 'Bundle Your Services', tip: 'Combine design and development into one package to increase your average project size by 40%.' },
                            { title: 'Niche Specialization', tip: 'Specializing in specific tools like Webflow or Shopify can increase your market rate by 2.5×.' }
                        ].map((m, i) => (
                            <div key={i} style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--ai-accent)' }}>{m.title}</h4>
                                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: 1.7 }}>{m.tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="ai-faq">
                <div className="container">
                    <div className="ai-section-title">
                        <h2>Pricing Help Center</h2>
                    </div>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {[
                            { q: "How accurate are these estimates?", a: "The AI analysis is based on 50,000+ completed projects on SkillKart and global market data, with an average accuracy of +/- 12%." },
                            { q: "Does complexity really affect my rate?", a: "ABSOLUTELY. Projects with advanced integrations or high risk require specialist oversight, which the market values at a higher premium." },
                            { q: "Is this tool free for clients too?", a: "Yes, we providing this tool to both clients and freelancers to ensure fair, transparent, and sustainable pricing ecosystem." }
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
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Never Underprice Your Projects</h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>Value your time, expertise, and future. Get a market-accurate estimate today.</p>
                    <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} className="ai-btn-primary" style={{ background: '#fff', color: '#042E4C' }}>
                        Estimate Your Project
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
}
