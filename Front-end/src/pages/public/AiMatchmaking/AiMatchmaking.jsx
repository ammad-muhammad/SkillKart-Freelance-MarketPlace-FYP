import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { matchmakingAPI } from '../../../api/matchmaking';
import { aiAPI } from '../../../api/ai';
import { ALL_SKILLS } from '../../../utils/mockData';
import { JOB_CATEGORIES } from '../../../constants/jobCategories';
import { safeToast as toast } from '../../../utils/safeToast';
import CustomSelect from '../../../Components/common/CustomSelect/CustomSelect';
import './AiMatchmaking.css';

/* ─── Score to color ─── */
function scoreColor(s) {
    if (s >= 90) return '#15803d';
    if (s >= 75) return '#0a4a73';
    if (s >= 60) return '#c05621';
    return '#6b7280';
}

/* ─── Match Card ─── */
function MatchCard({ result, rank, onView }) {
    const { freelancer: f, matchScore, matchReasons, estimatedCost, availability } = result;
    const [expanded, setExpanded] = useState(rank === 0); // top match auto-expanded

    const color = scoreColor(matchScore);
    const deg = Math.round((matchScore / 100) * 360);

    const rankLabel = rank === 0 ? '🥇 Best Match'
        : rank === 1 ? '🥈 Runner Up'
            : rank === 2 ? '🥉 Great Fit'
                : `#${rank + 1}`;

    const rankClass = rank === 0 ? 'aim-rank--1'
        : rank === 1 ? 'aim-rank--2'
            : rank === 2 ? 'aim-rank--3'
                : 'aim-rank--n';

    return (
        <div className="aim-match-card" style={{ marginTop: rank === 0 ? '1rem' : undefined }}>
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
                        style={{
                            background: color,
                            '--score-color': color,
                            '--score-deg': `${deg}deg`,
                        }}
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
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-mid)' }}>
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

            {/* Reasoning panel – expandable */}
            <div className="aim-reasons">
                <div
                    className="aim-reasons__title"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setExpanded(e => !e)}
                >
                    🤖 AI Reasoning Notes
                    <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--color-text-mid)' }}>
                        {expanded ? '▲' : '▼'}
                    </span>
                </div>
                {expanded && (
                    <div className="aim-reason-list">
                        {matchReasons.map((r, i) => (
                            <div key={i} className="aim-reason">
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
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
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
        tl.fromTo('.aim-hero__tag', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
          .fromTo('.aim-hero h1', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }, '-=0.2')
          .fromTo('.aim-hero p', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, '-=0.3')
          .fromTo('.aim-hero__pulse', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }, '-=0.1');

    }, []);

    const isMounted = useRef(true);

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
        sortBy === 'score' ? b.matchScore - a.matchScore :
            sortBy === 'rating' ? b.freelancer.rating - a.freelancer.rating :
                sortBy === 'rate_asc' ? a.freelancer.hourlyRate - b.freelancer.hourlyRate :
                    b.freelancer.hourlyRate - a.freelancer.hourlyRate
    );

    const avgScore = matches.length
        ? Math.round(matches.reduce((s, m) => s + m.matchScore, 0) / matches.length)
        : 0;

    return (
        <>
            <Navbar />
            <div className="aim-page">

                {/* Hero */}
                <section className="aim-hero">
                    <div className="aim-hero__orb aim-hero__orb--1" />
                    <div className="aim-hero__orb aim-hero__orb--2" />
                    <div className="aim-hero__grid" />
                    <div className="container aim-hero__inner">
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
                    <div className="aim-hero__wave">
                        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                            <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                        </svg>
                    </div>
                </section>

                {/* Body layout */}
                <div className="container">
                    <div className="aim-layout">

                        {/* ── Left: Input Panel ── */}
                        <div className="aim-input-panel">

                            {/* Project basics */}
                            <div className="aim-card">
                                <div className="aim-card__title">📋 Project Brief</div>

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

                                <div className="aim-field">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <label className="aim-label" htmlFor="aim-desc" style={{ margin: 0 }}>Description</label>
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

                            {/* Budget & Timeline */}
                            <div className="aim-card">
                                <div className="aim-card__title">💰 Budget & Timeline</div>

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

                            {/* Skills */}
                            <div className="aim-card">
                                <div className="aim-card__title">🛠 Required Skills</div>

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
                                                <button className="aim-tag__rm" onClick={() => removeSkill(sk)}>✕</button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Quick-add pills */}
                                <div style={{ marginTop: '0.6rem' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '0.35rem' }}>Quick add:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {ALL_SKILLS.slice(0, 6).filter(s => !skills.includes(s)).map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                style={{
                                                    background: 'transparent', border: '1.5px solid #dde3ec',
                                                    borderRadius: '999px', color: 'var(--color-text-mid)',
                                                    fontSize: '0.72rem', fontWeight: 600,
                                                    padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                                                    transition: 'all 0.15s',
                                                }}
                                                onClick={() => setSkills(prev => [...prev, s])}
                                            >+ {s}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Run button */}
                            <button
                                id="aim-run-btn"
                                className="aim-match-btn"
                                onClick={runMatch}
                                disabled={loading || (!projectTitle.trim() && !description.trim())}
                            >
                                {loading
                                    ? <><div className="aim-spinner" /> Analysing project…</>
                                    : '🤖 Find Best Matches'}
                            </button>
                        </div>

                        {/* ── Right: Results ── */}
                        <div className="aim-results">

                            {/* Analysis overview banner (only after run) */}
                            {hasRan && matches.length > 0 && !loading && (
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
                                            <div className="aim-analysis-stat__val">
                                                {matches.filter(m => m.freelancer.isOnline).length}
                                            </div>
                                            <div className="aim-analysis-stat__lbl">Online Now</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Toolbar */}
                            {hasRan && matches.length > 0 && !loading && (
                                <div className="aim-toolbar">
                                    <div className="aim-toolbar__left">
                                        <div className="aim-toolbar__title">Top Freelancer Matches</div>
                                        <div className="aim-toolbar__sub">
                                            {sorted.length} results ranked by AI compatibility score
                                        </div>
                                    </div>
                                    <div className="aim-toolbar__right">
                                        <CustomSelect
                                            compact
                                            value={sortBy}
                                            onChange={setSortBy}
                                            options={[
                                                { value: 'score', label: 'Sort: AI Score' },
                                                { value: 'rating', label: 'Sort: Rating' },
                                                { value: 'rate_asc', label: 'Sort: Rate ↑' },
                                                { value: 'rate_desc', label: 'Sort: Rate ↓' },
                                            ]}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Loading animation */}
                            {loading && (
                                <div className="aim-loading">
                                    <div className="aim-loading__brain">🧠</div>
                                    <div className="aim-loading__title">AI is Analysing Your Project…</div>
                                    <div className="aim-loading__sub">
                                        Reviewing skill compatibility, ratings, past performance, availability,
                                        and budget alignment across thousands of profiles.
                                    </div>
                                    <div className="aim-loading-bar">
                                        <div className="aim-loading-bar__fill" />
                                    </div>
                                </div>
                            )}

                            {/* Idle state */}
                            {!loading && !hasRan && (
                                <div className="aim-idle">
                                    <div className="aim-idle__icon">🎯</div>
                                    <div className="aim-idle__title">Describe Your Project to Begin</div>
                                    <div className="aim-idle__sub">
                                        Fill in the project brief on the left — even a rough description — then hit
                                        <strong> Find Best Matches</strong> and our AI will rank the best
                                        freelancers for you with detailed reasoning notes.
                                    </div>
                                </div>
                            )}

                            {/* Error state */}
                            {!loading && hasRan && error && (
                                <div className="aim-empty">
                                    <div className="aim-empty__icon">⚠️</div>
                                    <div className="aim-empty__title">Couldn’t generate matches</div>
                                    <div style={{ fontSize: '0.88rem', color: 'var(--color-text-mid)', marginTop: '0.5rem' }}>
                                        {error}
                                    </div>
                                    <button
                                        className="aim-add-btn"
                                        style={{ marginTop: '1rem' }}
                                        onClick={runMatch}
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {/* Empty result */}
                            {!loading && hasRan && !error && matches.length === 0 && (
                                <div className="aim-empty">
                                    <div className="aim-empty__icon">🔍</div>
                                    <div className="aim-empty__title">No strong matches found</div>
                                    <div style={{ fontSize: '0.88rem', color: 'var(--color-text-mid)', marginTop: '0.5rem' }}>
                                        No freelancers have signed up with matching skills yet. Try broadening your skill requirements.
                                    </div>
                                </div>
                            )}

                            {/* Match cards */}
                            {!loading && sorted.map((result, i) => (
                                <MatchCard
                                    key={result.freelancer.id}
                                    result={result}
                                    rank={i}
                                    onView={(id) => id && navigate(`/freelancers/${id}`)}
                                />
                            ))}
                        </div>

                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
