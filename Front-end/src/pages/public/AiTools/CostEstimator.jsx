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
import {
    Calculator, TrendingUp, CalendarClock, ShieldAlert, Gavel,
    Wallet, AlertTriangle, FileText, Rocket, BarChart3, Clock, Layers,
    Sparkles, ChevronDown
} from 'lucide-react';
import Loader from '../../../Components/common/Loader/Loader';
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

const FEATURES = [
    { icon: Wallet, title: 'Fair Market Pricing', desc: 'Ensure you earn what you deserve based on real-time demand for your specific skill stack.' },
    { icon: CalendarClock, title: 'Timeline Prediction', desc: 'Our model analyzes similar project cycles to provide a realistic delivery schedule.' },
    { icon: ShieldAlert, title: 'Risk Reduction', desc: 'Identify potential overheads and complexities before you even sign the contract.' },
    { icon: BarChart3, title: 'Competitive Bidding', desc: 'Use our data to place the most competitive bids that dont undervalue your skills.' },
];

const TIPS = [
    { title: 'The Value-Based Approach', tip: 'Instead of hours, charge for the outcomes you deliver. A Rs. 1,000 solution is more attractive than Rs. 50/hour.' },
    { title: 'Bundle Your Services', tip: 'Combine design and development into one package to increase your average project size by 40%.' },
    { title: 'Niche Specialization', tip: 'Specializing in specific tools like Webflow or Shopify can increase your market rate by 2.5×.' },
];

const CE_FAQS = [
    { q: "How accurate are these estimates?", a: "The AI analysis is based on 50,000+ completed projects on SkillKart and global market data, with an average accuracy of +/- 12%." },
    { q: "Does complexity really affect my rate?", a: "Absolutely. Projects with advanced integrations or high risk require specialist oversight, which the market values at a higher premium." },
    { q: "Is this tool free for clients too?", a: "Yes, we provide this tool to both clients and freelancers to ensure a fair, transparent, and sustainable pricing ecosystem." },
];

/* ── Animated count-up hook ── */
function useCountUp(target, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!target || isNaN(Number(target))) { setValue(target); return; }
        const start = Date.now();
        const end = Number(target);
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(end * eased));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target, duration]);
    return value;
}

/* ── Shimmer skeleton ── */
function SkeletonStage() {
    return (
        <div className="ce-skeleton" aria-label="Loading estimate" aria-live="polite">
            <div className="ce-skel-block ce-skel-hero" />
            <div className="ce-skel-row">
                <div className="ce-skel-block ce-skel-card" />
                <div className="ce-skel-block ce-skel-card" />
                <div className="ce-skel-block ce-skel-card" />
            </div>
            <div className="ce-skel-block ce-skel-wide" />
        </div>
    );
}

/* ── Empty stage ── */
function EmptyStage() {
    return (
        <div className="ce-empty">
            <div className="ce-empty-motif" aria-hidden="true">
                <div className="ce-coin ce-coin--1" />
                <div className="ce-coin ce-coin--2" />
                <div className="ce-coin ce-coin--3" />
                <div className="ce-calc-body">
                    <Calculator size={32} />
                </div>
            </div>
            <h3 className="ce-empty-title">Your Estimate Will Appear Here</h3>
            <p className="ce-empty-sub">
                Fill in your project details on the left and click{' '}
                <strong>Get Cost Estimate</strong> to see a market-accurate breakdown.
            </p>
        </div>
    );
}

/* ── Result stage ── */
function ResultStage({ estimate, formData, navigate }) {
    const midValue = estimate.min != null && estimate.max != null
        ? Math.round((Number(estimate.min) + Number(estimate.max)) / 2)
        : null;
    const countedMid = useCountUp(midValue, 1400);

    // Range bar %: marker sits at 50% always (estimate is midpoint)
    const total = Number(estimate.max) - Number(estimate.min);

    return (
        <div className="ce-result" id="estimate-result" aria-live="polite">
            {/* Hero cost block */}
            <div className="ce-result-hero">
                <div className="ce-result-label">Estimated Market Value</div>
                <div className="ce-result-amount">
                    {midValue != null
                        ? `${countedMid.toLocaleString()} ${estimate.currency}`
                        : `${formatMoney(estimate.min, estimate.currency)} – ${formatMoney(estimate.max, estimate.currency)}`}
                </div>
                {/* Range band */}
                <div className="ce-range-band" aria-label={`Range: ${formatMoney(estimate.min, estimate.currency)} to ${formatMoney(estimate.max, estimate.currency)}`}>
                    <div className="ce-range-track">
                        <div className="ce-range-fill" />
                        <div className="ce-range-marker" title={`Estimate: ${formatMoney(midValue, estimate.currency)}`} />
                    </div>
                    <div className="ce-range-labels">
                        <span>{formatMoney(estimate.min, estimate.currency)}</span>
                        <span>{formatMoney(estimate.max, estimate.currency)}</span>
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="ce-result-stats">
                <div className="ce-stat-card">
                    <div className="ce-stat-label">Currency</div>
                    <div className="ce-stat-value">{estimate.currency}</div>
                </div>
                <div className="ce-stat-card">
                    <div className="ce-stat-label">Timeline</div>
                    <div className="ce-stat-value">{formData.duration}</div>
                </div>
                <div className="ce-stat-card">
                    <div className="ce-stat-label">Expertise</div>
                    <div className="ce-stat-value">{formData.level}</div>
                </div>
            </div>

            {/* AI Rationale */}
            {estimate.rationale && (
                <div className="ce-rationale">
                    <div className="ce-rationale__label"><Sparkles size={15} /> AI Rationale</div>
                    <p>{estimate.rationale}</p>
                </div>
            )}

            {/* Breakdown */}
            {estimate.breakdown.length > 0 && (
                <div className="ce-breakdown">
                    <h4 className="ce-breakdown__title">Project Cost Breakdown</h4>
                    <table className="breakdown-table" aria-label="Project cost breakdown">
                        <thead>
                            <tr>
                                <th>Project Phase</th>
                                <th style={{ textAlign: 'right' }}>Estimated Cost Allocation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimate.breakdown.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.label}</td>
                                    <td style={{ textAlign: 'right' }}>{formatMoney(row.amount, estimate.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Actions */}
            <div className="ai-result-actions">
                <button
                    className="ai-btn-primary"
                    onClick={() => navigate('/post-project', {
                        state: { estimate, type: formData.type, skills: formData.skills }
                    })}
                >
                    <Rocket size={17} /> Create Project with this Estimate
                </button>
                <button className="ai-btn-secondary" onClick={() => window.print()}>
                    <FileText size={17} /> Save Estimate as PDF
                </button>
            </div>
        </div>
    );
}

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
    const [estimateMeta, setEstimateMeta] = useState(null); // { ref, date } — frozen at generation time for the print doc
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [openFaq, setOpenFaq] = useState(null);
    const pageRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Project Cost Estimator | SkillKart AI";
        window.scrollTo(0, 0);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline();
            tl.from(".ce-badge", { opacity: 0, y: -16, duration: 0.5, ease: "power3.out" })
              .from(".ce-title", { opacity: 0, y: 24, duration: 0.7, ease: "power3.out" }, "-=0.25")
              .from(".ce-sub", { opacity: 0, y: 18, duration: 0.6, ease: "power3.out" }, "-=0.4")
              .from(".ce-inputs-panel", { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" }, "-=0.5")
              .from(".ce-stage-panel", { opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.7");

            gsap.fromTo(".ce-feature-card",
                { opacity: 0, y: 24 },
                {
                    opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: "power3.out",
                    scrollTrigger: { trigger: ".ce-features", start: "top 88%" }
                }
            );

            gsap.fromTo(".ce-tip-card",
                { opacity: 0, y: 24 },
                {
                    opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power3.out",
                    scrollTrigger: { trigger: ".ce-tips", start: "top 88%" }
                }
            );

            gsap.fromTo(".ce-faq-item",
                { opacity: 0, y: 20 },
                {
                    opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power3.out",
                    scrollTrigger: { trigger: ".ce-faq", start: "top 88%" }
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
            const now = new Date();
            setEstimateMeta({
                ref: `SK-EST-${now.getTime().toString(36).toUpperCase()}`,
                date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
        <div className="ce-page" ref={pageRef}>
            {/* Ambient background blobs */}
            <div className="bai-bg" aria-hidden="true">
                <div className="bai-blob bai-blob--1" />
                <div className="bai-blob bai-blob--2" />
                <div className="bai-blob bai-blob--3" />
            </div>

            <Navbar />

            {/* ══ COMPACT HERO ══ */}
            <section className="ce-hero">
                <div className="container ce-hero__inner">
                    <span className="ce-badge">
                        <TrendingUp size={14} /> AI Market Analytics
                    </span>
                    <h1 className="ce-title">
                        Smart Project <span className="bai-accent">Cost</span> Estimation Tool
                    </h1>
                    <p className="ce-sub">
                        Estimate your project's market value based on complexity, skill demand,
                        and duration. Don't underprice your hard-earned expertise.
                    </p>
                    <div className="ce-hero-chips">
                        <span className="bai-chip"><Wallet size={13} /> Accurate Pricing</span>
                        <span className="bai-chip"><Clock size={13} /> Timeframe Prediction</span>
                        <span className="bai-chip"><BarChart3 size={13} /> Market Comparables</span>
                        <span className="bai-chip"><Layers size={13} /> Smart Scheduling</span>
                    </div>
                </div>
            </section>

            {/* ══ STUDIO — two zones ══ */}
            <section id="estimate-tool" className="ce-studio-section">
                <div className="container ce-studio">

                    {/* LEFT — Inputs panel */}
                    <div className="ce-inputs-panel">
                        <div className="ce-panel-head">
                            <h2 className="ce-panel-title">Project Parameters</h2>
                            <p className="ce-panel-sub">Define your project requirements for a market-accurate cost estimation.</p>
                        </div>

                        <form onSubmit={handleEstimate} className="ce-form">
                            <div className="ce-form-section">
                                <div className="ce-form-divider"><Calculator size={13} /> Project Scope</div>
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
                            </div>

                            <div className="ce-form-section">
                                <div className="ce-form-divider"><BarChart3 size={13} /> Expertise &amp; Timeline</div>
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
                                    <label>Budget Preference</label>
                                    <ComboSelect
                                        options={['Fixed Price', 'Hourly Rate']}
                                        value={formData.budget}
                                        onChange={val => setFormData({ ...formData, budget: val })}
                                        placeholder="Type to search…"
                                    />
                                </div>
                            </div>

                            <div className="ce-form-section">
                                <div className="ce-form-divider"><Layers size={13} /> Complexity</div>
                                <div className="ai-form-group">
                                    <label>Complexity Level ({formData.complexity}%)</label>
                                    <input
                                        type="range" min="0" max="100"
                                        style={{ background: `linear-gradient(to right, #10B981 ${formData.complexity}%, #E2E8F0 ${formData.complexity}%)` }}
                                        value={formData.complexity} onChange={e => setFormData({ ...formData, complexity: e.target.value })}
                                        aria-valuemin={0} aria-valuemax={100} aria-valuenow={formData.complexity}
                                    />
                                </div>
                            </div>

                            {/* AI suggest */}
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

                            <button type="submit" className="ai-btn-primary ce-submit-btn" disabled={loading}>
                                {loading
                                    ? <><Loader size="sm" text="" /> Calculating Market Rates…</>
                                    : <><Calculator size={17} /> Get Cost Estimate</>}
                            </button>
                        </form>
                    </div>

                    {/* RIGHT — Estimate stage */}
                    <div className="ce-stage-panel">
                        <div className="ce-stage" aria-live="polite" aria-label="Estimate stage">
                            {loading && <SkeletonStage />}
                            {!loading && error && (
                                <div className="ce-error-state">
                                    <AlertTriangle size={32} className="ce-error-icon" />
                                    <h3>Couldn't Generate Estimate</h3>
                                    <p>{error}</p>
                                    <button className="ai-btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={handleEstimate}>
                                        ↺ Try Again
                                    </button>
                                </div>
                            )}
                            {!loading && !error && estimate && (
                                <ResultStage estimate={estimate} formData={formData} navigate={navigate} />
                            )}
                            {!loading && !error && !estimate && <EmptyStage />}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FEATURES ══ */}
            <section className="ce-features">
                <div className="container">
                    <div className="bai-section-head">
                        <span className="bai-section-eyebrow"><TrendingUp size={13} /> Why Use the Estimator</span>
                        <h2 className="bai-section-title">
                            Accurate Project <span className="bai-accent">Valuation</span>
                        </h2>
                        <p className="bai-section-sub">
                            Our AI combines internal platform data with global market rates to find the perfect pricing sweet spot.
                        </p>
                    </div>
                    <div className="ce-features-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="ce-feature-card">
                                <span className="bai-bento-icon"><f.icon size={20} /></span>
                                <h4>{f.title}</h4>
                                <p>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PRICING TIPS — light glass ══ */}
            <section className="ce-tips">
                <div className="container">
                    <div className="bai-section-head">
                        <span className="bai-section-eyebrow"><Sparkles size={13} /> Pro Tips</span>
                        <h2 className="bai-section-title">
                            Pricing Strategies <span className="bai-accent">That Work</span>
                        </h2>
                        <p className="bai-section-sub">Expert tips to increase your project value on SkillKart.</p>
                    </div>
                    <div className="ce-tips-grid">
                        {TIPS.map((m, i) => (
                            <div key={i} className="ce-tip-card">
                                <h4>{m.title}</h4>
                                <p>{m.tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ FAQ ══ */}
            <section className="ce-faq">
                <div className="container bai-faq-grid">
                    <div className="bai-faq-head">
                        <span className="bai-section-eyebrow">Help</span>
                        <h2 className="bai-section-title">Pricing Help Center</h2>
                        <p className="bai-section-sub" style={{ textAlign: 'left', marginLeft: 0, maxWidth: '100%' }}>
                            Common questions about how the estimator works.
                        </p>
                    </div>
                    <div className="bai-faq-items">
                        {CE_FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className={`bai-faq-item ce-faq-item${openFaq === i ? ' bai-faq-item--open' : ''}`}
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
                        <div className="bai-cta-circle bai-cta-circle--1" aria-hidden="true" />
                        <div className="bai-cta-circle bai-cta-circle--2" aria-hidden="true" />
                        <div className="bai-cta-circle bai-cta-circle--3" aria-hidden="true" />
                        <div className="bai-cta-orb" aria-hidden="true"><Calculator size={24} /></div>
                        <h2 className="bai-cta-title">Never Underprice Your Projects</h2>
                        <p className="bai-cta-sub">
                            Value your time, expertise, and future. Get a market-accurate estimate today.
                        </p>
                        <button
                            onClick={() => document.getElementById('estimate-tool')?.scrollIntoView({ behavior: 'smooth' })}
                            className="ai-btn-primary bai-cta-btn"
                        >
                            <Calculator size={17} /> Estimate Your Project
                        </button>
                    </div>
                </div>
            </section>

            <Footer />

            {/* PRINT-ONLY DOCUMENT — rendered by window.print() (the "Save Estimate as
                PDF" button). Kept as a direct child of .ce-page (a sibling of Navbar/
                Footer/every section), so the print stylesheet can hide every OTHER
                direct child with display:none and collapse the page to just this
                content — display:none removes hidden siblings from layout entirely,
                unlike visibility:hidden, which would leave their height in place and
                pad the print-out with blank pages. */}
            {estimate && estimateMeta && (
                <div className="estimate-print-doc" aria-hidden="true">
                    <div className="print-doc__header">
                        <div className="print-doc__brand">
                            <span className="print-doc__logo">SkillKart</span>
                            <span className="print-doc__tagline">Micro-Freelance Marketplace</span>
                        </div>
                        <div className="print-doc__meta">
                            <div><strong>Estimate Ref:</strong> {estimateMeta.ref}</div>
                            <div><strong>Date:</strong> {estimateMeta.date}</div>
                        </div>
                    </div>

                    <h1 className="print-doc__title">Project Cost Estimate</h1>

                    <table className="print-doc__details">
                        <tbody>
                            <tr><th>Project Type</th><td>{formData.type || '—'}</td></tr>
                            <tr><th>Required Skills</th><td>{(formData.skills || []).join(', ') || '—'}</td></tr>
                            <tr><th>Target Expertise Level</th><td>{formData.level}</td></tr>
                            <tr><th>Project Duration</th><td>{formData.duration}</td></tr>
                            <tr><th>Budget Preference</th><td>{formData.budget}</td></tr>
                            <tr><th>Complexity</th><td>{formData.complexity}%</td></tr>
                        </tbody>
                    </table>

                    <div className="print-doc__range">
                        <span className="print-doc__range-label">Estimated Market Value</span>
                        <span className="print-doc__range-value">
                            {formatMoney(estimate.min, estimate.currency)} – {formatMoney(estimate.max, estimate.currency)}
                        </span>
                    </div>

                    {estimate.breakdown.length > 0 && (
                        <>
                            <h2 className="print-doc__section-title">Cost Breakdown</h2>
                            <table className="print-doc__breakdown">
                                <thead>
                                    <tr><th>Project Phase</th><th>Estimated Cost Allocation</th></tr>
                                </thead>
                                <tbody>
                                    {estimate.breakdown.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.label}</td>
                                            <td>{formatMoney(row.amount, estimate.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {estimate.rationale && (
                        <>
                            <h2 className="print-doc__section-title">AI Rationale</h2>
                            <p className="print-doc__rationale">{estimate.rationale}</p>
                        </>
                    )}

                    <div className="print-doc__footer">
                        <p>
                            This estimate was generated by SkillKart's AI Cost Estimator using platform
                            and market data. It is indicative only and does not constitute a binding
                            quote or contract.
                        </p>
                        <p className="print-doc__footer-brand">skillkart-fuuast.vercel.app · Generated {estimateMeta.date}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
