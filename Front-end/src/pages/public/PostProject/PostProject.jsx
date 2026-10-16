import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { gsap } from 'gsap';
import { CATEGORIES, ALL_SKILLS } from '../../../utils/mockData';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import ComboSelect from '../../../Components/common/ComboSelect/ComboSelect';
import AiSuggestFill from '../../../Components/common/AiSuggest/AiSuggestFill';
import AiGenerateText from '../../../Components/common/AiSuggest/AiGenerateText';
import ImageSourcePicker from '../../../Components/common/ImageSourcePicker/ImageSourcePicker';
import Loader from '../../../Components/common/Loader/Loader';
import { useAuth } from '../../../hooks/useAuth';
import './PostProject.css';

/* ─── Validation helpers ─── */
const REQUIRED = (v) => (!v || !v.toString().trim()) ? 'This field is required.' : '';
const MIN_LEN = (n) => (v) => v.trim().length < n ? `Minimum ${n} characters.` : '';
const BUDGET = (v) => {
    if (!v) return 'Enter a budget amount.';
    const num = Number(v);
    if (isNaN(num) || num <= 0) return 'Enter a valid positive number.';
    return '';
};

const STEPS = ['Project Details', 'Budget & Timeline', 'Skills & Attachments'];

const TIMELINE_OPTIONS = [
    'Less than 1 week', '1 – 2 weeks', '2 – 4 weeks',
    '1 – 3 months', '3 – 6 months', 'Ongoing',
];

const SUGGEST_SKILLS = ALL_SKILLS.slice(0, 12);

/* ─── Initial form state ─── */
const INIT = {
    title: '',
    category: '',
    description: '',
    budgetType: 'fixed',   // 'fixed' | 'hourly'
    budgetMin: '',
    budgetMax: '',
    timeline: '',
    skills: [],
    files: [],
    visibility: 'public',
};

/* ─── Field validator map ─── */
function validate(form, step) {
    const errs = {};
    if (step >= 0) {
        if (REQUIRED(form.title)) errs.title = REQUIRED(form.title) || MIN_LEN(10)(form.title);
        if (MIN_LEN(10)(form.title)) errs.title = MIN_LEN(10)(form.title);
        if (REQUIRED(form.category)) errs.category = REQUIRED(form.category);
        if (REQUIRED(form.description)) errs.description = REQUIRED(form.description);
        if (MIN_LEN(50)(form.description)) errs.description = MIN_LEN(50)(form.description);
    }
    if (step >= 1) {
        if (BUDGET(form.budgetMin)) errs.budgetMin = BUDGET(form.budgetMin);
        if (form.budgetType === 'fixed' && BUDGET(form.budgetMax)) errs.budgetMax = BUDGET(form.budgetMax);
        if (REQUIRED(form.timeline)) errs.timeline = REQUIRED(form.timeline);
    }
    if (step >= 2) {
        if (!form.skills.length) errs.skills = 'Add at least one required skill.';
    }
    return errs;
}

/* ─── Description quality score ─── */
function qualityScore(form) {
    let score = 0;
    if (form.title.length >= 20) score += 25;
    if (form.description.length >= 100) score += 25;
    if (form.skills.length >= 2) score += 25;
    if (form.budgetMin) score += 15;
    if (form.files.length) score += 10;
    return score;
}

/* ─── Stepper ─── */
function GlassStepper({ steps, step }) {
    return (
        <div className="pp-stepper" role="list">
            {steps.map((label, i) => {
                const done   = i < step;
                const active = i === step;
                return (
                    <>
                        <div
                            key={i}
                            className={`pp-stepper__item${active ? ' pp-stepper__item--active' : done ? ' pp-stepper__item--done' : ''}`}
                            role="listitem"
                            aria-current={active ? 'step' : undefined}
                        >
                            <div className="pp-stepper__dot">
                                {done ? '✓' : i + 1}
                            </div>
                            <span className="pp-stepper__label">{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div key={`line-${i}`} className={`pp-stepper__line${done ? ' pp-stepper__line--done' : ''}`} />
                        )}
                    </>
                );
            })}
        </div>
    );
}

/* ─── STEP HEADER icons ─── */
const STEP_META = [
    { icon: '📄', title: 'Project Details',      sub: 'Tell us what you need built.' },
    { icon: '💰', title: 'Budget & Timeline',    sub: 'Set your budget and deadline.' },
    { icon: '🛠',  title: 'Skills & Attachments', sub: 'Required skills and reference files.' },
];

/* ─────────────── MAIN PAGE ─────────────── */
export default function PostProject() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    // If the Cost Estimator handed off an estimate (navigate('/post-project', { state: { estimate, type, skills } })),
    // pre-fill the relevant fields instead of silently discarding it — the normal
    // direct-navigation case (no state) falls back to the plain INIT form.
    const [form, setForm] = useState(() => {
        const handoff = location.state?.estimate;
        if (!handoff) return INIT;
        return {
            ...INIT,
            category: CATEGORIES.includes(location.state?.type) ? location.state.type : '',
            budgetMin: handoff.min != null ? String(handoff.min) : '',
            budgetMax: handoff.max != null ? String(handoff.max) : '',
            skills: Array.isArray(location.state?.skills) ? location.state.skills : [],
        };
    });
    const [errors, setErrors] = useState({});
    const [skillInput, setSkillInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [projectId, setProjectId] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        document.title = 'Post a Project — SkillKart';

        const tl = gsap.timeline({ delay: 0.1 });
        tl.fromTo('.pp-hero__tag',  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
          .fromTo('.pp-hero h1',    { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }, '-=0.2')
          .fromTo('.pp-hero p',     { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, '-=0.3')
          .fromTo('.pp-stepper',    { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4,  ease: 'back.out(1.4)' }, '-=0.15')
          .fromTo('.pp-form-card',  { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4,  ease: 'power3.out' }, '-=0.1')
          .fromTo('.pp-sidebar-card', { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.35, ease: 'power3.out' }, '-=0.15');

    }, []);

    /* update a field */
    const set = useCallback((key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
    }, [errors]);

    /* validate current step and advance */
    const next = () => {
        const errs = validate(form, step);
        const stepKeys = step === 0
            ? ['title', 'category', 'description']
            : step === 1
                ? ['budgetMin', ...(form.budgetType === 'fixed' ? ['budgetMax'] : []), 'timeline']
                : ['skills'];
        const stepErrs = Object.fromEntries(Object.entries(errs).filter(([k]) => stepKeys.includes(k)));
        if (Object.keys(stepErrs).length) { setErrors(stepErrs); return; }
        setErrors({});
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const back = () => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    /* add skill */
    const addSkill = () => {
        const s = skillInput.trim();
        if (!s || form.skills.includes(s)) { setSkillInput(''); return; }
        set('skills', [...form.skills, s]);
        setSkillInput('');
    };

    const removeSkill = (sk) => set('skills', form.skills.filter(s => s !== sk));

    /* file handling */
    const handleFiles = useCallback((fileList) => {
        const valid = Array.from(fileList).filter(f => f.size < 10 * 1024 * 1024); // 10 MB max
        set('files', [...form.files, ...valid]);
    }, [form.files, set]);

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    /* submit — posting a real project requires a logged-in CLIENT. We stash the
       drafted brief so the authenticated post-project form can prefill it, then
       route based on auth state:
         - client      → straight to the real post form
         - freelancer  → show notice (wrong role)
         - logged out  → login, returning to the post form afterwards */
    const submit = async () => {
        const errs = validate(form, 2);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSubmitting(true);

        const draft = {
            title: form.title,
            category: form.category,
            description: form.description,
            budgetType: form.budgetType,
            budgetMin: form.budgetMin,
            budgetMax: form.budgetMax,
            timeline: form.timeline,
            skills: form.skills,
            visibility: form.visibility,
        };
        try {
            sessionStorage.setItem('pendingProjectDraft', JSON.stringify(draft));
        } catch { /* sessionStorage may be unavailable; non-fatal */ }

        // Already a logged-in client → jump straight into the real form.
        if (user?.role === 'client') {
            setSubmitting(false);
            navigate('/client/projects/create');
            return;
        }

        // Logged out → remember where to land after login.
        if (!user) {
            try { sessionStorage.setItem('postLoginRedirect', '/client/projects/create'); } catch { /* non-fatal */ }
        }

        // Confirmation screen (its CTA routes to login/register, or to the
        // freelancer notice). For a wrong-role user we mark that too.
        setProjectId(`DRAFT-${Date.now().toString(36).toUpperCase()}`);
        setSubmitted(true);
        setSubmitting(false);
    };

    const score = qualityScore(form);

    /* ────────────────── SUCCESS SCREEN ────────────────── */
    if (submitted) {
        return (
            <>
                <Navbar />
                <div className="pp-page">
                    {/* Ambient bg */}
                    <div className="pp-bg" aria-hidden="true">
                        <div className="pp-blob pp-blob--mint" />
                        <div className="pp-blob pp-blob--cyan" />
                        <div className="pp-blob pp-blob--blue" />
                        <div className="pp-bg-grid" />
                    </div>

                    <section className="pp-hero" style={{ paddingBottom: '1.5rem' }}>
                        <div className="pp-hero__inner">
                            <div className="pp-hero__tag">📝 Brief Saved</div>
                            <h1>You're One Step <span className="pp-hero__accent">Away!</span></h1>
                        </div>
                    </section>

                    <div className="pp-body">
                        <div className="container" style={{ maxWidth: 600, padding: '0 1.5rem 4rem' }}>
                            <div className="pp-form-card">
                                {user?.role === 'freelancer' ? (
                                    <div className="pp-success">
                                        <span className="pp-success__icon">👋</span>
                                        <div className="pp-success__title">Switch to a client account to post</div>
                                        <div className="pp-success__sub">
                                            You're signed in as a freelancer. Projects are posted by clients —
                                            switch your role from your account to publish this brief and hire talent.
                                        </div>
                                        <div className="pp-success__id">Reference: <strong>{projectId}</strong></div>
                                        <div className="pp-success__btns">
                                            <Link to="/freelancer/dashboard" className="pp-success__btn-main">
                                                Go to my dashboard
                                            </Link>
                                            <Link to="/browse-freelancers" className="pp-success__btn-sec">
                                                Browse talent
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pp-success">
                                        <span className="pp-success__icon">🎉</span>
                                        <div className="pp-success__title">Your project brief is ready</div>
                                        <div className="pp-success__sub">
                                            We've saved your details. Sign in or create a free client account to
                                            publish your project and start receiving proposals from verified freelancers.
                                        </div>
                                        <div className="pp-success__id">Reference: <strong>{projectId}</strong></div>
                                        <div className="pp-success__btns">
                                            <Link to="/registration" className="pp-success__btn-main">
                                                Create account &amp; publish
                                            </Link>
                                            <Link to="/login" className="pp-success__btn-sec">
                                                Sign in
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    /* ────────────────── MAIN FORM ────────────────── */
    return (
        <>
            <Navbar />
            <div className="pp-page">

                {/* Ambient background */}
                <div className="pp-bg" aria-hidden="true">
                    <div className="pp-blob pp-blob--mint" />
                    <div className="pp-blob pp-blob--cyan" />
                    <div className="pp-blob pp-blob--blue" />
                    <div className="pp-bg-grid" />
                </div>

                {/* ── HERO ── */}
                <section className="pp-hero">
                    <div className="pp-hero__inner">
                        <div className="pp-hero__tag">💼 Post a Project</div>
                        <h1>Hire <span className="pp-hero__accent">Top Student Talent</span></h1>
                        <p>Describe your project and our AI will match you with verified freelancers in minutes.</p>

                        {/* Glass stepper */}
                        <GlassStepper steps={STEPS} step={step} />
                    </div>
                </section>

                {/* ── LAYOUT ── */}
                <div className="pp-body">
                    <div className="container">
                        <div className="pp-layout">

                            {/* ── FORM COLUMN ── */}
                            <div>
                                {/* ── STEP 0: Project Details ── */}
                                {step === 0 && (
                                    <div className="pp-form-card">
                                        <div className="pp-card-header">
                                            <div className="pp-card-header__icon">{STEP_META[0].icon}</div>
                                            <div>
                                                <div className="pp-card-header__title">{STEP_META[0].title}</div>
                                                <div className="pp-card-header__sub">{STEP_META[0].sub}</div>
                                            </div>
                                        </div>

                                        <div className="pp-card-body pp-step-content">
                                            <div className="pp-form-section">
                                                <div className="pp-form-section__title">📝 Basic Information</div>

                                                {/* Title */}
                                                <div className="pp-field" style={{ marginBottom: '1.1rem' }}>
                                                    <label className="pp-label" htmlFor="pp-title">Project Title <span>*</span></label>
                                                    <input
                                                        id="pp-title"
                                                        className={`pp-input${errors.title ? ' pp-input--error' : ''}`}
                                                        placeholder="e.g. Build a responsive e-commerce website with React"
                                                        value={form.title}
                                                        onChange={e => set('title', e.target.value)}
                                                        maxLength={120}
                                                    />
                                                    <div className="pp-field-meta">
                                                        {errors.title
                                                            ? <span className="pp-err-msg">{errors.title}</span>
                                                            : <span />}
                                                        <span className="pp-char-count">{form.title.length}/120</span>
                                                    </div>
                                                </div>

                                                {/* Category */}
                                                <div className="pp-field" style={{ marginBottom: '1.1rem' }}>
                                                    <label className="pp-label" htmlFor="pp-category">Category <span>*</span></label>
                                                    <ComboSelect
                                                        id="pp-category"
                                                        value={form.category}
                                                        onChange={val => set('category', val)}
                                                        placeholder="Type to search categories…"
                                                        options={CATEGORIES.map(c => ({ value: c, label: c }))}
                                                        className={errors.category ? 'csel--error' : ''}
                                                    />
                                                    {errors.category && <span className="pp-err-msg">{errors.category}</span>}
                                                </div>

                                                {/* Description */}
                                                <div className="pp-field">
                                                    <label className="pp-label" htmlFor="pp-description">Project Description <span>*</span></label>
                                                    <textarea
                                                        id="pp-description"
                                                        className={`pp-textarea${errors.description ? ' pp-textarea--error' : ''}`}
                                                        placeholder="Describe your project in detail — what needs to be built, what the goals are, and what deliverables you expect…"
                                                        value={form.description}
                                                        onChange={e => set('description', e.target.value)}
                                                        rows={6}
                                                    />
                                                    <div className="pp-field-meta">
                                                        {errors.description
                                                            ? <span className="pp-err-msg">{errors.description}</span>
                                                            : <span className="pp-hint">Min 50 characters. More detail = better AI matches.</span>}
                                                        <span className="pp-char-count">{form.description.length}</span>
                                                    </div>
                                                    <AiGenerateText
                                                        className="pp-ai-generate"
                                                        fieldLabel="a client's project description for a freelance job posting"
                                                        getContext={() => ({ title: form.title, category: form.category, skills: form.skills, budget: form.budgetType === 'fixed' ? `${form.budgetMin}-${form.budgetMax} PKR fixed` : `${form.budgetMin} PKR/hr`, timeline: form.timeline })}
                                                        getExistingText={() => form.description}
                                                        onGenerated={(text) => set('description', text)}
                                                    />
                                                </div>

                                                {/* AI suggest & fill */}
                                                <AiSuggestFill
                                                    label="Suggest category & skills (AI)"
                                                    getContext={() => ({ title: form.title, description: form.description, skills: form.skills })}
                                                    allowedCategories={CATEGORIES}
                                                    existingSkills={form.skills}
                                                    onCategory={(cat) => set('category', cat)}
                                                    onSkills={(newSkills) => set('skills', Array.from(new Set([...form.skills, ...newSkills])))}
                                                />
                                            </div>

                                            {/* Visibility */}
                                            <div className="pp-form-section">
                                                <div className="pp-form-section__title">🔒 Visibility</div>
                                                <div className="pp-budget-type">
                                                    {['public', 'invite-only'].map(v => (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            className={`pp-budget-pill${form.visibility === v ? ' pp-budget-pill--active' : ''}`}
                                                            onClick={() => set('visibility', v)}
                                                        >
                                                            {v === 'public' ? '🌐 Public' : '🔑 Invite-only'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="pp-hint">
                                                    {form.visibility === 'public'
                                                        ? 'All verified freelancers can see and submit proposals.'
                                                        : 'Only freelancers you invite can see this project.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pp-card-footer">
                                            <p className="pp-submit-note">Step 1 of 3 — Project summary</p>
                                            <div className="pp-submit-btns">
                                                <button className="pp-btn-primary" onClick={next}>
                                                    Next: Budget &amp; Timeline →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP 1: Budget & Timeline ── */}
                                {step === 1 && (
                                    <div className="pp-form-card">
                                        <div className="pp-card-header">
                                            <div className="pp-card-header__icon">{STEP_META[1].icon}</div>
                                            <div>
                                                <div className="pp-card-header__title">{STEP_META[1].title}</div>
                                                <div className="pp-card-header__sub">{STEP_META[1].sub}</div>
                                            </div>
                                        </div>

                                        <div className="pp-card-body pp-step-content">
                                            <div className="pp-form-section">
                                                <div className="pp-form-section__title">💰 Budget Type</div>
                                                <div className="pp-budget-type">
                                                    {['fixed', 'hourly'].map(t => (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            className={`pp-budget-pill${form.budgetType === t ? ' pp-budget-pill--active' : ''}`}
                                                            onClick={() => set('budgetType', t)}
                                                        >
                                                            {t === 'fixed' ? '📦 Fixed Price' : '⏱ Hourly Rate'}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="pp-row" style={{ marginTop: '0.8rem' }}>
                                                    <div className="pp-field">
                                                        <label className="pp-label" htmlFor="pp-bmin">
                                                            {form.budgetType === 'fixed' ? 'Minimum Budget (PKR)' : 'Min Rate (PKR/hr)'} <span>*</span>
                                                        </label>
                                                        <input
                                                            id="pp-bmin"
                                                            type="number"
                                                            min={1}
                                                            className={`pp-input${errors.budgetMin ? ' pp-input--error' : ''}`}
                                                            placeholder="e.g. 200"
                                                            value={form.budgetMin}
                                                            onChange={e => set('budgetMin', e.target.value)}
                                                        />
                                                        {errors.budgetMin && <span className="pp-err-msg">{errors.budgetMin}</span>}
                                                    </div>
                                                    {form.budgetType === 'fixed' && (
                                                        <div className="pp-field">
                                                            <label className="pp-label" htmlFor="pp-bmax">Maximum Budget (PKR) <span>*</span></label>
                                                            <input
                                                                id="pp-bmax"
                                                                type="number"
                                                                min={1}
                                                                className={`pp-input${errors.budgetMax ? ' pp-input--error' : ''}`}
                                                                placeholder="e.g. 500"
                                                                value={form.budgetMax}
                                                                onChange={e => set('budgetMax', e.target.value)}
                                                            />
                                                            {errors.budgetMax && <span className="pp-err-msg">{errors.budgetMax}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="pp-hint" style={{ marginTop: '0.5rem' }}>
                                                    Projects with a clear budget receive 3× more proposals on average.
                                                </p>
                                            </div>

                                            <div className="pp-form-section">
                                                <div className="pp-form-section__title">📅 Timeline</div>
                                                <div className="pp-field">
                                                    <label className="pp-label" htmlFor="pp-timeline">Expected Duration <span>*</span></label>
                                                    <CustomSelect
                                                        id="pp-timeline"
                                                        value={form.timeline}
                                                        onChange={val => set('timeline', val)}
                                                        placeholder="Select duration…"
                                                        options={TIMELINE_OPTIONS.map(t => ({ value: t, label: t }))}
                                                        className={errors.timeline ? 'csel--error' : ''}
                                                    />
                                                    {errors.timeline && <span className="pp-err-msg">{errors.timeline}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pp-card-footer">
                                            <p className="pp-submit-note">Step 2 of 3 — Budget &amp; timeline</p>
                                            <div className="pp-submit-btns">
                                                <button className="pp-btn-secondary" onClick={back}>← Back</button>
                                                <button className="pp-btn-primary" onClick={next}>Next: Skills &amp; Files →</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP 2: Skills & Attachments ── */}
                                {step === 2 && (
                                    <div className="pp-form-card">
                                        <div className="pp-card-header">
                                            <div className="pp-card-header__icon">{STEP_META[2].icon}</div>
                                            <div>
                                                <div className="pp-card-header__title">{STEP_META[2].title}</div>
                                                <div className="pp-card-header__sub">{STEP_META[2].sub}</div>
                                            </div>
                                        </div>

                                        <div className="pp-card-body pp-step-content">
                                            <div className="pp-form-section">
                                                <div className="pp-form-section__title">
                                                    🛠 Required Skills <span style={{ color: '#ef4444' }}>*</span>
                                                </div>

                                                <div className="pp-skill-input-wrap">
                                                    <input
                                                        id="pp-skill-input"
                                                        aria-label="Add a required skill"
                                                        className={`pp-input${errors.skills ? ' pp-input--error' : ''}`}
                                                        placeholder="e.g. React, Figma, Python…"
                                                        value={skillInput}
                                                        onChange={e => setSkillInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                                    />
                                                    <button type="button" className="pp-add-btn" onClick={addSkill}>Add</button>
                                                </div>

                                                {errors.skills && <span className="pp-err-msg" style={{ marginTop: 4, display: 'block' }}>{errors.skills}</span>}

                                                {form.skills.length > 0 && (
                                                    <div className="pp-tags">
                                                        {form.skills.map(sk => (
                                                            <span key={sk} className="pp-tag">
                                                                {sk}
                                                                <button className="pp-tag__remove" onClick={() => removeSkill(sk)} aria-label={`Remove skill: ${sk}`}>✕</button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div style={{ marginTop: '0.8rem' }}>
                                                    <span className="pp-hint">Suggestions:</span>
                                                    <div className="pp-suggested">
                                                        {SUGGEST_SKILLS.filter(s => !form.skills.includes(s)).map(s => (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                className="pp-sug-pill"
                                                                onClick={() => set('skills', [...form.skills, s])}
                                                            >+ {s}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attachments */}
                                            <div className="pp-form-section">
                                                <div className="pp-form-section__title">
                                                    📎 Attachments <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Optional</span>
                                                </div>

                                                <div
                                                    className={`pp-dropzone${dragOver ? ' pp-dropzone--active' : ''}`}
                                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                                    onDragLeave={() => setDragOver(false)}
                                                    onDrop={handleDrop}
                                                    onClick={() => fileRef.current?.click()}
                                                >
                                                    <div className="pp-dropzone__icon">📁</div>
                                                    <p className="pp-dropzone__text">
                                                        <strong>Click to browse</strong> or drag &amp; drop files here<br />
                                                        <span style={{ fontSize: '0.75rem' }}>PDF, DOC, PNG, JPG — max 10 MB each</span>
                                                    </p>
                                                    <ImageSourcePicker
                                                        ref={fileRef}
                                                        multiple
                                                        accept=""
                                                        onChange={e => handleFiles(e.target.files)}
                                                    />
                                                </div>

                                                {form.files.length > 0 && (
                                                    <div className="pp-file-list">
                                                        {form.files.map((f, i) => (
                                                            <div key={i} className="pp-file-item">
                                                                <span>📄 {f.name} <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: '0.75rem' }}>({(f.size / 1024).toFixed(0)} KB)</span></span>
                                                                <button className="pp-file-remove" onClick={() => set('files', form.files.filter((_, j) => j !== i))} aria-label={`Remove file: ${f.name}`}>✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pp-card-footer">
                                            <p className="pp-submit-note">
                                                By posting you agree to SkillKart's <Link to="/terms" style={{ color: '#10B981', fontWeight: 600 }}>Terms of Service</Link>.
                                            </p>
                                            <div className="pp-submit-btns">
                                                <button className="pp-btn-secondary" onClick={back}>← Back</button>
                                                <button
                                                    className="pp-btn-primary"
                                                    onClick={submit}
                                                    disabled={submitting}
                                                >
                                                    {submitting
                                                        ? <><Loader size="sm" text="" /> Posting…</>
                                                        : '🚀 Post Project'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── SIDEBAR ── */}
                            <aside className="pp-sidebar">

                                {/* (a) Quality Score */}
                                <div className="pp-sidebar-card">
                                    <div className="pp-sidebar-card__title">📊 Project Quality Score</div>
                                    <div className="pp-quality-wrap">
                                        <div className="pp-quality-ring-wrap">
                                            <div
                                                className="pp-quality-ring"
                                                style={{
                                                    background: `conic-gradient(#10B981 ${score * 3.6}deg, #E2E8F0 0deg)`,
                                                }}
                                            >
                                                <div className="pp-quality-inner">{score}%</div>
                                            </div>
                                        </div>
                                        <p className="pp-quality-label">
                                            {score < 50
                                                ? 'Add more details to attract better proposals.'
                                                : score < 80
                                                    ? 'Good! A few more fields will maximise matches.'
                                                    : 'Excellent! Your project is well-described.'}
                                        </p>
                                    </div>
                                </div>

                                {/* (b) Tips */}
                                <div className="pp-sidebar-card">
                                    <div className="pp-sidebar-card__title">💡 Tips for Great Results</div>
                                    <ul className="pp-tip-list">
                                        {[
                                            'Be specific about deliverables and acceptance criteria.',
                                            'Set a realistic budget — it filters out mismatched freelancers.',
                                            'List required skills so AI can find the best match.',
                                            'Attach mockups or references to speed up proposals.',
                                            'Respond to proposals within 24 hrs to keep freelancers engaged.',
                                        ].map(tip => (
                                            <li key={tip} className="pp-tip">
                                                <span className="pp-tip__dot" />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* (c) Buddy AI — green gradient card */}
                                <div className="pp-sidebar-card pp-sidebar-card--buddy">
                                    <span className="pp-buddy-sparkles" aria-hidden="true">✨</span>
                                    <div className="pp-ai-preview__tag">🤖 Buddy AI</div>
                                    <div className="pp-ai-preview__title">Smart Freelancer Matching</div>
                                    <div className="pp-ai-preview__sub">
                                        After posting, our AI will analyse your project and rank the top freelancers within seconds — no browsing required.
                                    </div>
                                    <div className="pp-ai-score">
                                        <span className="pp-ai-score__label">Estimated matches</span>
                                        <span className="pp-ai-score__val">{Math.max(3, Math.round(score / 10))}+</span>
                                    </div>
                                </div>

                            </aside>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
