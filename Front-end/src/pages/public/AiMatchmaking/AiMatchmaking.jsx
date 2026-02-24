import { useState, useCallback, useRef } from 'react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { matchmakingAPI } from '../../../api/matchmaking';
import { MOCK_MATCH_RESULTS, ALL_SKILLS, CATEGORIES } from '../../../utils/mockData';
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
function MatchCard({ result, rank }) {
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
                    {f.avatar}
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
                <span className="aim-rating__rate">${f.hourlyRate}/hr</span>
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
                    <button className="aim-btn-view">View Profile</button>
                    <button className="aim-btn-invite">Invite →</button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function AiMatchmaking() {
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

    const isMounted = useRef(true);

    const addSkill = () => {
        const s = skillInput.trim();
        if (!s || skills.includes(s)) { setSkillInput(''); return; }
        setSkills(prev => [...prev, s]);
        setSkillInput('');
    };

    const removeSkill = (sk) => setSkills(prev => prev.filter(s => s !== sk));

    /* Run AI match */
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
        } catch {
            /* fallback to mock — simulate AI delay */
            await new Promise(r => setTimeout(r, 2200));
            if (!isMounted.current) return;
            /* optionally filter mock by skills */
            let results = [...MOCK_MATCH_RESULTS];
            if (skills.length) {
                results = results.map(r => {
                    const overlap = skills.filter(sk =>
                        r.freelancer.skills.some(fs => fs.toLowerCase().includes(sk.toLowerCase()))
                    ).length;
                    const boost = Math.min(8, overlap * 3);
                    return { ...r, matchScore: Math.min(100, r.matchScore + boost) };
                });
                results.sort((a, b) => b.matchScore - a.matchScore);
            }
            setMatches(results);
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
                                    <label className="aim-label" htmlFor="aim-desc">Description</label>
                                    <textarea
                                        id="aim-desc"
                                        className="aim-textarea"
                                        placeholder="Describe what you need — features, goals, deliverables…"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={5}
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
                                            ...CATEGORIES.map(c => ({ value: c, label: c }))
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Budget & Timeline */}
                            <div className="aim-card">
                                <div className="aim-card__title">💰 Budget & Timeline</div>

                                <div className="aim-field">
                                    <label className="aim-label" htmlFor="aim-budget">Budget (USD)</label>
                                    <input
                                        id="aim-budget"
                                        className="aim-input"
                                        type="number"
                                        min={1}
                                        placeholder="e.g. 500"
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
                                        placeholder="Any timeline"
                                        options={[
                                            { value: '', label: 'Any timeline' },
                                            ...['< 1 week', '1–2 weeks', '2–4 weeks', '1–3 months', '3–6 months', 'Ongoing']
                                                .map(t => ({ value: t, label: t }))
                                        ]}
                                    />
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
                                <div style={{ marginTop: '0.75rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '0.4rem' }}>Quick add:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {ALL_SKILLS.slice(0, 8).filter(s => !skills.includes(s)).map(s => (
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

                            {/* Empty result */}
                            {!loading && hasRan && matches.length === 0 && (
                                <div className="aim-empty">
                                    <div className="aim-empty__icon">🔍</div>
                                    <div className="aim-empty__title">No strong matches found</div>
                                    <div style={{ fontSize: '0.88rem', color: 'var(--color-text-mid)', marginTop: '0.5rem' }}>
                                        Try broadening your skill requirements or adjusting your budget.
                                    </div>
                                </div>
                            )}

                            {/* Match cards */}
                            {!loading && sorted.map((result, i) => (
                                <MatchCard key={result.freelancer.id} result={result} rank={i} />
                            ))}
                        </div>

                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
