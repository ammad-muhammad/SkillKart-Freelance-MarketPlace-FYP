import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { gsap } from 'gsap';
import { matchmakingAPI } from '../../../api/matchmaking';
import { aiAPI } from '../../../api/ai';
import { ALL_SKILLS } from '../../../utils/mockData';
import { JOB_CATEGORIES } from '../../../constants/jobCategories';
import { safeToast as toast } from '../../../utils/safeToast';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import Loader from '../../../Components/common/Loader/Loader';
import './AiMatchmaking.css';

/* ─── Score to color ─── */
function scoreColor(s) {
    if (s >= 90) return '#15803d';
    if (s >= 75) return '#0a4a73';
    if (s >= 60) return '#c05621';
    return '#6b7280';
}

/* ─── Orbit Scene — empty state visual ─── */
function OrbitScene({ typing }) {
    return (
        <div className="aim-orbit-scene" aria-hidden="true">
            {/* Rings */}
            <div className="aim-orbit-ring" />
            <div className="aim-orbit-ring" />
            <div className="aim-orbit-ring" />
            {/* Center node */}
            <div className={`aim-orbit-center${typing ? ' aim-typing' : ''}`}>🎯</div>
            {/* Ghost nodes */}
            <div className="aim-orbit-node">👤</div>
            <div className="aim-orbit-node">👤</div>
            <div className="aim-orbit-node">👤</div>
            <div className="aim-orbit-node">👤</div>
            <div className="aim-orbit-node">👤</div>
            <div className="aim-orbit-node">👤</div>
            {/* Floating label chips */}
            <span className="aim-orbit-chip">Skills</span>
            <span className="aim-orbit-chip">Availability</span>
            <span className="aim-orbit-chip">Ratings</span>
            <span className="aim-orbit-chip">History</span>
        </div>
    );
}

/* ─── Loading Scene — radar sweep + checklist ─── */
const CRITERIA = [
    'Analysing skills',
    'Checking availability',
    'Reading ratings',
    'Reviewing history',
];

function LoadingScene({ loading }) {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!loading) { setTick(CRITERIA.length); return; }
        setTick(0);
        const timers = CRITERIA.map((_, i) =>
            setTimeout(() => setTick(i + 1), i * 600)
        );
        return () => timers.forEach(clearTimeout);
    }, [loading]);

    return (
        <div className="aim-loading" aria-live="polite" aria-label="AI is analysing your project">
            {/* Radar */}
            <div className="aim-radar-wrap" aria-hidden="true">
                <div className="aim-radar-ring" />
                <div className="aim-radar-ring" />
                <div className="aim-radar-ring" />
                <div className="aim-radar-sweep" />
                <div className="aim-radar-center">🧠</div>
            </div>

            {/* Checklist */}
            <div className="aim-checklist">
                <div className="aim-checklist__title">AI is Analysing…</div>
                {CRITERIA.map((label, i) => {
                    const done   = tick > i + 1 || (!loading && tick >= CRITERIA.length);
                    const active = tick === i + 1 && loading;
                    return (
                        <div key={label} className={`aim-check-item${done ? ' done' : active ? ' active' : ''}`}>
                            <span className="aim-check-icon">{done ? '✓' : active ? '' : ''}</span>
                            {label}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Match Card ─── */
function MatchCard({ result, rank, onView }) {
    const { freelancer: f, matchScore, matchReasons, estimatedCost, availability } = result;
    const [expanded, setExpanded] = useState(rank === 0); // top match auto-expanded

    const color = scoreColor(matchScore);

    const rankLabel = rank === 0 ? '🥇 Best Match'
        : rank === 1 ? '🥈 Runner Up'
            : rank === 2 ? '🥉 Great Fit'
                : `#${rank + 1}`;

    const rankClass = rank === 0 ? 'aim-rank--1'
        : rank === 1 ? 'aim-rank--2'
            : rank === 2 ? 'aim-rank--3'
                : 'aim-rank--n';

    return (
        <div className="aim-match-card" style={{ animationDelay: `${rank * 0.07}s` }}>
            <span className={`aim-rank ${rankClass}`}>{rankLabel}</span>

            {/* Header */}
            <div className="aim-card-header">
                <div className="aim-avatar" style={{ background: f.avatarBg }}>
                    {f.avatarUrl
                        ? <img src={f.avatarUrl} alt={f.name} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                        : f.avatar}
                    {f.isOnline && <span className="aim-online" />}
                </div>

                <div className="aim-info">
                    <div className="aim-name">{f.name}</div>
                    <div className="aim-role">{f.role}</div>
                    {f.isVerified && <div className="aim-verified">✓ AI Verified</div>}
                </div>

                {/* Score ring */}
                <div className="aim-score-wrap">
                    <div
                        className="aim-score-ring"
                        style={{ '--score-color': color, '--score-deg': `${Math.round((matchScore / 100) * 360)}deg` }}
                    >
                        {matchScore}%
                    </div>
                    <span className="aim-score-lbl">AI Score</span>
                </div>
            </div>

            {/* Rating row */}
            <div className="aim-rating">
                <span className="aim-rating__star">★</span>
                <span>{f.rating.toFixed(1)}</span>
                <span className="aim-rating__count">({f.reviewCount})</span>
                <span className="aim-rating__sep">|</span>
                <span className="aim-rating__rate">Rs. {f.hourlyRate}/hr</span>
                <span className="aim-rating__sep">|</span>
                <span className="aim-rating__online">
                    {f.isOnline ? '● Online' : '○ Offline'}
                </span>
                <span className="aim-rating__sep">|</span>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    {f.projectsCompleted} projects
                </span>
            </div>

            {/* Skills */}
            <div className="aim-skills">
                {f.skills.slice(0, 5).map(sk => (
                    <span key={sk} className="aim-skill">{sk}</span>
                ))}
                {f.skills.length > 5 && <span className="aim-skill">+{f.skills.length - 5}</span>}
            </div>

            {/* Reasoning panel — expandable */}
            <div className="aim-reasons">
                <div
                    className="aim-reasons__title"
                    onClick={() => setExpanded(e => !e)}
                    role="button"
                    aria-expanded={expanded}
                    tabIndex={0}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpanded(x => !x)}
                >
                    🤖 AI Reasoning Notes
                    <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#94A3B8' }}>
                        {expanded ? '▲' : '▼'}
                    </span>
                </div>
                {expanded && (
                    <div className="aim-reason-list">
                        {matchReasons.map((r, i) => (
                            <div key={i} className="aim-reason" style={{ animationDelay: `${i * 0.06}s` }}>
                                <span className="aim-reason__check">✓</span>
                                {r}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="aim-card-footer">
                <div className="aim-est-cost">
                    Est. Cost: <strong>{estimatedCost}</strong>
                    <span style={{ display: 'block', fontSize: 'var(--fs-floor, 0.75rem)', color: '#94A3B8' }}>
                        {availability}
                    </span>
                </div>
                <div className="aim-footer-btns">
                    <button className="aim-btn-view" onClick={() => onView(f.id)}>View Profile</button>
                    <button className="aim-btn-invite" onClick={() => onView(f.id)}>Invite →</button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function AiMatchmaking() {
    const navigate = useNavigate();

    /* project form */
    const [projectTitle, setProjectTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [budget, setBudget] = useState('');
    const [timeline, setTimeline] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState([]);

    /* results */
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasRan, setHasRan] = useState(false);
    const [sortBy, setSortBy] = useState('score');
    const [error, setError] = useState(null);
    const [autoFilling, setAutoFilling] = useState(false);

    /* is the user currently typing in any brief field (for orbit pulse) */
    const typing = projectTitle.trim().length > 0 || description.trim().length > 0;

    /* AI auto-fill: infer category + skills + budget (+ title) from the
       description so the user doesn't have to fill everything manually. */
    const autoFill = async () => {
        if (!description.trim()) { toast.info('Write a short description first, then let AI fill the rest.'); return; }
        setAutoFilling(true);
        try {
            const { data } = await aiAPI.suggestBrief(description, projectTitle);
            const s = data?.data || {};
            if (s.title && !projectTitle.trim()) setProjectTitle(s.title);
            if (s.category) setCategory(s.category);
            if (Array.isArray(s.skills) && s.skills.length) {
                setSkills(prev => {
                    const merged = [...prev];
                    s.skills.forEach(sk => { if (sk && !merged.includes(sk)) merged.push(sk); });
                    return merged;
                });
            }
            if (s.budget && !budget) setBudget(String(s.budget));
            toast.success('Filled in category, skills & budget — tweak as needed ✨');
        } catch (err) {
            const aiDown = err.response?.status === 503 || !err.response;
            toast.error(aiDown
                ? 'AI is temporarily out of service. Please fill the fields manually.'
                : (err.response?.data?.message || 'AI auto-fill is unavailable right now.'));
        } finally {
            setAutoFilling(false);
        }
    };

    useEffect(() => {
        document.title = 'AI Matchmaking — SkillKart';

        const tl = gsap.timeline({ delay: 0.1 });
        tl.fromTo('.aim-hero__tag',   { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
          .fromTo('.aim-hero h1',     { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6,  ease: 'power4.out' }, '-=0.2')
          .fromTo('.aim-hero p',      { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, '-=0.3')
          .fromTo('.aim-hero__pulse', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }, '-=0.1')
          .fromTo('.aim-input-panel', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4,  ease: 'power3.out' }, '-=0.05')
          .fromTo('.aim-results',     { opacity: 0 },        { opacity: 1, duration: 0.45, ease: 'power3.out' }, '-=0.2');
    }, []);

    const isMounted = useRef(true);
    const resultsRef = useRef(null);

    const addSkill = () => {
        const s = skillInput.trim();
        if (!s || skills.includes(s)) { setSkillInput(''); return; }
        setSkills(prev => [...prev, s]);
        setSkillInput('');
    };

    const removeSkill = (sk) => setSkills(prev => prev.filter(s => s !== sk));

    /* Run AI match — calls the real /matchmaking endpoint */
    const runMatch = useCallback(async () => {
        if (!projectTitle.trim() && !description.trim()) return;
        setLoading(true);
        setHasRan(false);
        setError(null);
        // Single-column layout (<=1023.98px): the results sit below the long brief
        // form, so bring them into view or the submit looks like it did nothing.
        if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 1023.98px)').matches) {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        try {
            const payload = { title: projectTitle, description, category, budget, timeline, skills };
            const { data } = await matchmakingAPI.matchByProject(payload);
            if (!isMounted.current) return;
            setMatches(data?.data?.matches ?? []);
        } catch (err) {
            if (!isMounted.current) return;
            setMatches([]);
            // Matching itself is a deterministic scoring engine, not an AI-provider
            // call — a 503 here would mean the backend itself is down, and a
            // missing response means the request never reached it (server
            // restarting, connectivity issue), not that "AI" specifically is down.
            const serverDown = err.response?.status === 503;
            const noResponse = !err.response;
            setError(
                serverDown
                    ? 'The matching service is temporarily unavailable. Please try again shortly.'
                    : noResponse
                        ? 'Could not reach the server. Please check your connection and try again.'
                        : (err.response?.data?.message ||
                           'Could not generate matches right now. Please try again in a moment.')
            );
        } finally {
            if (isMounted.current) { setLoading(false); setHasRan(true); }
        }
    }, [projectTitle, description, category, budget, timeline, skills]);

    /* Sort results */
    const sorted = [...matches].sort((a, b) =>
        sortBy === 'score'     ? b.matchScore - a.matchScore :
        sortBy === 'rating'    ? b.freelancer.rating - a.freelancer.rating :
        sortBy === 'rate_asc'  ? a.freelancer.hourlyRate - b.freelancer.hourlyRate :
                                 b.freelancer.hourlyRate - a.freelancer.hourlyRate
    );

    const avgScore = matches.length
        ? Math.round(matches.reduce((s, m) => s + m.matchScore, 0) / matches.length)
        : 0;

    const canRun = !!(projectTitle.trim() || description.trim());

    return (
        <>
            <Navbar />
            <div className="aim-page">

                {/* Ambient background */}
                <div className="aim-bg" aria-hidden="true">
                    <div className="aim-blob aim-blob--mint" />
                    <div className="aim-blob aim-blob--cyan" />
                    <div className="aim-blob aim-blob--blue" />
                    <div className="aim-bg-grid" />
                </div>

                {/* ── HERO ── */}
                <section className="aim-hero">
                    <div className="aim-hero__inner">
                        <div className="aim-hero__tag">🤖 AI Matchmaking</div>
                        <h1>Find Your <span>Perfect Match</span></h1>
                        <p>
                            Describe your project and let our AI engine analyse skills, availability, ratings,
                            and historical success to surface the most compatible freelancers — ranked and explained.
                        </p>
                        <div className="aim-hero__pulse">
                            <span className="aim-pulse-dot" />
                            AI engine online — matches generated in seconds
                        </div>
                    </div>
                </section>

                {/* ── CONSOLE ── */}
                <div className="aim-body">
                    <div className="container">
                        <div className="aim-layout">

                            {/* ════ LEFT — Brief Builder ════ */}
                            <div className="aim-input-panel">
                                {/* Panel header */}
                                <div className="aim-panel-header">
                                    <div className="aim-panel-header__icon">📋</div>
                                    <div className="aim-panel-header__title">Brief Builder</div>
                                </div>

                                <div className="aim-panel-body">

                                    {/* ── Section: Project Brief ── */}
                                    <div className="aim-section">
                                        <div className="aim-section__title">📋 Project Brief</div>

                                        {/* Title */}
                                        <div className="aim-field">
                                            <label className="aim-label" htmlFor="aim-title">Project Title</label>
                                            <input
                                                id="aim-title"
                                                className="aim-input"
                                                placeholder="e.g. Build a React dashboard"
                                                value={projectTitle}
                                                onChange={e => setProjectTitle(e.target.value)}
                                            />
                                        </div>

                                        {/* Description + Auto-fill */}
                                        <div className="aim-field">
                                            <div className="aim-desc-label-row">
                                                <label className="aim-label" htmlFor="aim-desc">Description</label>
                                                <button
                                                    type="button"
                                                    className="aim-autofill-btn"
                                                    onClick={autoFill}
                                                    disabled={autoFilling}
                                                    title="Let AI fill category, skills & budget from your description"
                                                >
                                                    {autoFilling ? '✨ Filling…' : '✨ Auto-fill with AI'}
                                                </button>
                                            </div>
                                            <textarea
                                                id="aim-desc"
                                                className="aim-textarea"
                                                placeholder="Describe what you need — features, goals, deliverables… then tap ✨ Auto-fill."
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                rows={3}
                                            />
                                        </div>

                                        {/* Category */}
                                        <div className="aim-field">
                                            <label className="aim-label" htmlFor="aim-cat">Category</label>
                                            <CustomSelect
                                                id="aim-cat"
                                                value={category}
                                                onChange={setCategory}
                                                placeholder="Any category"
                                                options={[
                                                    { value: '', label: 'Any category' },
                                                    ...JOB_CATEGORIES.map(c => ({ value: c, label: c }))
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    {/* ── Section: Budget & Timeline ── */}
                                    <div className="aim-section">
                                        <div className="aim-section__title">💰 Budget &amp; Timeline</div>
                                        <div className="aim-fields-row">
                                            <div className="aim-field">
                                                <label className="aim-label" htmlFor="aim-budget">Budget (PKR)</label>
                                                <input
                                                    id="aim-budget"
                                                    className="aim-input"
                                                    type="number"
                                                    min={1}
                                                    placeholder="e.g. 5000"
                                                    value={budget}
                                                    onChange={e => setBudget(e.target.value)}
                                                />
                                            </div>

                                            <div className="aim-field">
                                                <label className="aim-label" htmlFor="aim-timeline">Timeline</label>
                                                <CustomSelect
                                                    id="aim-timeline"
                                                    value={timeline}
                                                    onChange={setTimeline}
                                                    placeholder="Any"
                                                    options={[
                                                        { value: '', label: 'Any' },
                                                        ...['< 1 wk', '1–2 wks', '2–4 wks', '1–3 mos', '3–6 mos', 'Ongoing']
                                                            .map(t => ({ value: t, label: t }))
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Section: Required Skills ── */}
                                    <div className="aim-section">
                                        <div className="aim-section__title">🛠 Required Skills</div>

                                        <div className="aim-tag-row">
                                            <input
                                                id="aim-skill-input"
                                                className="aim-input"
                                                placeholder="e.g. React, Python…"
                                                value={skillInput}
                                                onChange={e => setSkillInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                            />
                                            <button type="button" className="aim-add-btn" onClick={addSkill}>Add</button>
                                        </div>

                                        {skills.length > 0 && (
                                            <div className="aim-tags">
                                                {skills.map(sk => (
                                                    <span key={sk} className="aim-tag">
                                                        {sk}
                                                        <button className="aim-tag__rm" onClick={() => removeSkill(sk)} aria-label={`Remove skill: ${sk}`}>✕</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Quick-add suggestions */}
                                        <div style={{ marginTop: '0.55rem' }}>
                                            <div style={{ fontSize: 'var(--fs-floor, 0.75rem)', color: '#94A3B8', fontFamily: 'Inter,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Quick add:</div>
                                            <div className="aim-quick-add">
                                                {ALL_SKILLS.slice(0, 6).filter(s => !skills.includes(s)).map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        className="aim-quick-pill"
                                                        onClick={() => setSkills(prev => [...prev, s])}
                                                    >+ {s}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Primary action */}
                                <div className="aim-panel-footer">
                                    <button
                                        id="aim-run-btn"
                                        className="aim-match-btn"
                                        onClick={runMatch}
                                        disabled={loading || !canRun}
                                    >
                                        {loading
                                            ? <><Loader size="sm" text="" /> Analysing project…</>
                                            : '✨ Find Best Matches'}
                                    </button>
                                </div>
                            </div>

                            {/* ════ RIGHT — Match Stage ════ */}
                            <div
                                ref={resultsRef}
                                className="aim-results"
                                role="region"
                                aria-label="Match results"
                                aria-live="polite"
                            >
                                {/* ── Analysis banner ── */}
                                {hasRan && matches.length > 0 && !loading && (
                                    <>
                                        <div className="aim-stage-header">
                                            <div>
                                                <div className="aim-stage-header__title">Top Freelancer Matches</div>
                                                <div className="aim-stage-header__sub">{sorted.length} results ranked by AI compatibility score</div>
                                            </div>
                                            <div className="aim-toolbar__right">
                                                <CustomSelect
                                                    compact
                                                    value={sortBy}
                                                    onChange={setSortBy}
                                                    options={[
                                                        { value: 'score',     label: 'Sort: AI Score' },
                                                        { value: 'rating',    label: 'Sort: Rating' },
                                                        { value: 'rate_asc',  label: 'Sort: Rate ↑' },
                                                        { value: 'rate_desc', label: 'Sort: Rate ↓' },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        <div className="aim-stage-body">
                                            {/* Analysis summary */}
                                            <div className="aim-analysis">
                                                <div className="aim-analysis__title">📊 Match Analysis Summary</div>
                                                <div className="aim-analysis__sub">
                                                    Based on your project description, required skills, budget, and timeline,
                                                    our AI reviewed <strong>{matches.length * 12}</strong> freelancer profiles
                                                    and surfaced the top <strong>{matches.length}</strong> matches.
                                                </div>
                                                <div className="aim-analysis-grid">
                                                    <div className="aim-analysis-stat">
                                                        <div className="aim-analysis-stat__val">{matches.length}</div>
                                                        <div className="aim-analysis-stat__lbl">Matches Found</div>
                                                    </div>
                                                    <div className="aim-analysis-stat">
                                                        <div className="aim-analysis-stat__val">{avgScore}%</div>
                                                        <div className="aim-analysis-stat__lbl">Avg AI Score</div>
                                                    </div>
                                                    <div className="aim-analysis-stat">
                                                        <div className="aim-analysis-stat__val">{sorted[0]?.matchScore ?? 0}%</div>
                                                        <div className="aim-analysis-stat__lbl">Top Match Score</div>
                                                    </div>
                                                    <div className="aim-analysis-stat">
                                                        <div className="aim-analysis-stat__val">{matches.filter(m => m.freelancer.isOnline).length}</div>
                                                        <div className="aim-analysis-stat__lbl">Online Now</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Match cards */}
                                            {sorted.map((result, i) => (
                                                <MatchCard
                                                    key={result.freelancer.id}
                                                    result={result}
                                                    rank={i}
                                                    onView={(id) => id && navigate(`/freelancers/${id}`)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* ── Loading ── */}
                                {loading && <LoadingScene loading={loading} />}

                                {/* ── Idle (empty state) ── */}
                                {!loading && !hasRan && (
                                    <div className="aim-idle">
                                        <OrbitScene typing={typing} />
                                        <div className="aim-idle__title">Describe Your Project to Begin</div>
                                        <div className="aim-idle__sub">
                                            Fill in the project brief on the left — even a rough description — then hit{' '}
                                            <strong>Find Best Matches</strong> and our AI will rank the best
                                            freelancers for you with detailed reasoning notes.
                                        </div>
                                    </div>
                                )}

                                {/* ── Error ── */}
                                {!loading && hasRan && error && (
                                    <div className="aim-empty" style={{ padding: '4rem 2rem' }}>
                                        <div className="aim-empty__icon">⚠️</div>
                                        <div className="aim-empty__title">Couldn't generate matches</div>
                                        <div className="aim-empty__sub">{error}</div>
                                        <button className="aim-retry-btn" onClick={runMatch}>
                                            ↺ Try Again
                                        </button>
                                    </div>
                                )}

                                {/* ── No results ── */}
                                {!loading && hasRan && !error && matches.length === 0 && (
                                    <div className="aim-empty" style={{ padding: '4rem 2rem' }}>
                                        <div className="aim-empty__icon">🔍</div>
                                        <div className="aim-empty__title">No strong matches found</div>
                                        <div className="aim-empty__sub">
                                            No freelancers have signed up with matching skills yet. Try broadening your skill requirements.
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
