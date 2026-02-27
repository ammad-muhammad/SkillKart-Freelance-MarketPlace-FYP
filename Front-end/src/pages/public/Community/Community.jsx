import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import './Community.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ─── */
const CHANNELS = [
    { id: 1, icon: '💻', name: 'Web Development', members: 4200, posts: 18600, color: '#0a4a73', bg: 'rgba(10,74,115,.1)', pinned: 'Best React libraries in 2026?' },
    { id: 2, icon: '🎨', name: 'UI/UX Design', members: 3100, posts: 12400, color: '#553c9a', bg: 'rgba(85,60,154,.1)', pinned: 'Figma vs Adobe XD — final verdict' },
    { id: 3, icon: '📊', name: 'Data Science & ML', members: 2800, posts: 9300, color: '#276749', bg: 'rgba(39,103,73,.1)', pinned: 'How to land your first ML gig' },
    { id: 4, icon: '📱', name: 'Mobile Development', members: 2200, posts: 7800, color: '#c05621', bg: 'rgba(192,86,33,.1)', pinned: 'Flutter vs React Native 2026' },
    { id: 5, icon: '✍️', name: 'Content & Copywriting', members: 1900, posts: 6200, color: '#b7791f', bg: 'rgba(183,121,31,.1)', pinned: 'Setting your word rate guide' },
    { id: 6, icon: '🤖', name: 'AI & Automation', members: 5100, posts: 23400, color: '#1a6fa8', bg: 'rgba(26,111,168,.1)', pinned: 'Buddy AI prompting masterclass' },
];

const DISCUSSIONS = [
    {
        id: 1, emoji: '🔥', badge: 'Hot', badgeColor: '#dc2626', badgeBg: 'rgba(220,38,38,.1)',
        title: 'How I earned $2,000 in my first month — step-by-step breakdown',
        channel: 'Freelancing Tips', author: { initials: 'AA', bg: '#0a4a73', name: 'Aisha Ahmed' },
        replies: 142, views: 8900, votes: 318, time: '2h ago', solved: false,
    },
    {
        id: 2, emoji: '✅', badge: 'Solved', badgeColor: '#15803d', badgeBg: 'rgba(21,128,61,.1)',
        title: 'Escrow held after client dispute — what actually happened and how to avoid it',
        channel: 'Client Relations', author: { initials: 'BR', bg: '#553c9a', name: 'Bilal Raza' },
        replies: 87, views: 5200, votes: 201, time: '5h ago', solved: true,
    },
    {
        id: 3, emoji: '💡', badge: 'Tip', badgeColor: '#0a4a73', badgeBg: 'rgba(10,74,115,.1)',
        title: 'Use AI to write your proposals — here\'s my exact prompt that tripled my win rate',
        channel: 'Buddy AI', author: { initials: 'SM', bg: '#276749', name: 'Sana Mir' },
        replies: 63, views: 4100, votes: 177, time: '8h ago', solved: false,
    },
    {
        id: 4, emoji: '❓', badge: 'Open', badgeColor: '#c05621', badgeBg: 'rgba(192,86,33,.08)',
        title: 'How do you handle scope creep without losing the client?',
        channel: 'Client Relations', author: { initials: 'OS', bg: '#c05621', name: 'Omar Sheikh' },
        replies: 34, views: 2800, votes: 89, time: '12h ago', solved: false,
    },
    {
        id: 5, emoji: '🎓', badge: 'Student', badgeColor: '#553c9a', badgeBg: 'rgba(85,60,154,.1)',
        title: 'Balancing final exams and freelancing — my survival guide',
        channel: 'Student Life', author: { initials: 'ZA', bg: '#1a6fa8', name: 'Zara Ahmad' },
        replies: 56, views: 3400, votes: 143, time: '1d ago', solved: false,
    },
];

const LEADERBOARD = [
    { rank: 1, initials: 'AA', bg: '#042E4C', name: 'Aisha Ahmed', uni: 'FAST NUCES', points: 9840, badge: '👑', earned: '$12,400' },
    { rank: 2, initials: 'BR', bg: '#0a4a73', name: 'Bilal Raza', uni: 'LUMS', points: 8210, badge: '🥈', earned: '$9,800' },
    { rank: 3, initials: 'SM', bg: '#276749', name: 'Sana Mir', uni: 'NUST', points: 7650, badge: '🥉', earned: '$8,100' },
    { rank: 4, initials: 'OS', bg: '#553c9a', name: 'Omar Sheikh', uni: 'IBA Karachi', points: 6430, badge: '', earned: '$6,200' },
    { rank: 5, initials: 'ZA', bg: '#c05621', name: 'Zara Ahmad', uni: 'COMSATS', points: 5880, badge: '', earned: '$5,700' },
];

const EVENTS = [
    {
        id: 1, emoji: '🌐', type: 'Webinar',
        title: 'AI Tools for Freelancers — Live Demo & Q&A',
        date: 'Mar 1, 2026', time: '7:00 PM PKT', seats: 200, registered: 178,
        typeColor: '#0a4a73', typeBg: 'rgba(10,74,115,.1)',
    },
    {
        id: 2, emoji: '⚡', type: 'Hackathon',
        title: 'SkillKart Spring Hackathon — $5,000 Prize Pool',
        date: 'Mar 8–10, 2026', time: 'Online', seats: 500, registered: 342,
        typeColor: '#553c9a', typeBg: 'rgba(85,60,154,.1)',
    },
    {
        id: 3, emoji: '🎤', type: 'AMA',
        title: 'Ask a Top Freelancer: How I Hit $10k/Month',
        date: 'Mar 15, 2026', time: '6:00 PM PKT', seats: 100, registered: 91,
        typeColor: '#276749', typeBg: 'rgba(39,103,73,.1)',
    },
];

const STATS = [
    { value: '18K+', label: 'Active Members' },
    { value: '94K+', label: 'Discussions' },
    { value: '6', label: 'Skill Channels' },
    { value: '4.9★', label: 'Community Rating' },
];

/* ─────────────── COMPONENT ─────────────── */
export default function Community() {
    const [activeTab, setActiveTab] = useState('trending');
    const [searchQ, setSearchQ] = useState('');

    useEffect(() => {
        document.title = 'Community — SkillKart | Connect, Learn & Grow Together';

        const tl = gsap.timeline({ delay: 0.1 });
        tl.fromTo('.com-hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
            .fromTo('.com-hero__heading', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power4.out' }, '-=0.2')
            .fromTo('.com-hero__sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
            .fromTo('.com-hero__actions', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.2');

        gsap.fromTo('.com-stat__item',
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power3.out', scrollTrigger: { trigger: '.com-stats', start: 'top 88%' } }
        );
        gsap.fromTo('.com-channel-card',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.07, duration: 0.55, ease: 'power3.out', scrollTrigger: { trigger: '.com-channels__grid', start: 'top 84%' } }
        );
        gsap.fromTo('.com-disc-row',
            { x: -20, opacity: 0 },
            { x: 0, opacity: 1, stagger: 0.07, duration: 0.5, ease: 'power3.out', scrollTrigger: { trigger: '.com-discussions', start: 'top 82%' } }
        );
        gsap.fromTo('.com-lb-row',
            { x: 20, opacity: 0 },
            { x: 0, opacity: 1, stagger: 0.06, duration: 0.5, ease: 'power3.out', scrollTrigger: { trigger: '.com-leaderboard', start: 'top 84%' } }
        );
        gsap.fromTo('.com-event-card',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.09, duration: 0.55, ease: 'power3.out', scrollTrigger: { trigger: '.com-events__grid', start: 'top 84%' } }
        );

        return () => ScrollTrigger.getAll().forEach(t => t.kill());
    }, []);

    const filtered = DISCUSSIONS.filter(d =>
        activeTab === 'all' || activeTab === 'trending'
            ? d.title.toLowerCase().includes(searchQ.toLowerCase())
            : d.channel.toLowerCase().includes(activeTab.toLowerCase()) &&
            d.title.toLowerCase().includes(searchQ.toLowerCase())
    );

    return (
        <>
            <Navbar />

            {/* ══ HERO ══ */}
            <section className="com-hero">
                <div className="com-hero__orb com-hero__orb--1" />
                <div className="com-hero__orb com-hero__orb--2" />
                <div className="com-hero__orb com-hero__orb--3" />
                <div className="com-hero__grid" />
                <div className="container com-hero__inner">
                    <div className="com-hero__badge">🌐 SkillKart Community</div>
                    <h1 className="com-hero__heading">
                        Where Student Freelancers<br />
                        <span className="com-hero__accent">Grow Together</span>
                    </h1>
                    <p className="com-hero__sub">
                        Join 18,000+ students sharing tips, asking questions, celebrating wins, and building
                        careers together — across 6 skill-focused channels.
                    </p>
                    <div className="com-hero__actions">
                        <button className="com-hero__cta-primary">Join the Community</button>
                        <button className="com-hero__cta-secondary">Browse Channels ↓</button>
                    </div>
                </div>
                <div className="com-hero__wave">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                    </svg>
                </div>
            </section>

            {/* ══ STATS ══ */}
            <section className="com-stats">
                <div className="container com-stats__grid">
                    {STATS.map(s => (
                        <div key={s.label} className="com-stat__item">
                            <div className="com-stat__value">{s.value}</div>
                            <div className="com-stat__label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ══ CHANNELS ══ */}
            <section className="com-channels">
                <div className="container">
                    <div className="com-section-header">
                        <div className="section-tag"><span>#</span> Channels</div>
                        <h2 className="section-title">Find Your Community</h2>
                        <p className="section-subtitle">
                            Skill-focused channels where you can ask, share, and connect with peers in your domain.
                        </p>
                    </div>
                    <div className="com-channels__grid">
                        {CHANNELS.map(ch => (
                            <div key={ch.id} className="com-channel-card">
                                <div className="com-channel-card__icon" style={{ background: ch.bg, color: ch.color }}>
                                    {ch.icon}
                                </div>
                                <div className="com-channel-card__body">
                                    <div className="com-channel-card__name">{ch.name}</div>
                                    <div className="com-channel-card__meta">
                                        <span>👥 {ch.members.toLocaleString()}</span>
                                        <span>💬 {ch.posts.toLocaleString()}</span>
                                    </div>
                                    <div className="com-channel-card__pinned">
                                        📌 <em>{ch.pinned}</em>
                                    </div>
                                </div>
                                <button className="com-channel-card__join" style={{ color: ch.color, borderColor: ch.color }}>
                                    Join →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ DISCUSSIONS + LEADERBOARD ══ */}
            <section className="com-body">
                <div className="container com-body__layout">

                    {/* Left – Discussions */}
                    <div className="com-discussions">
                        <div className="com-disc__header">
                            <div className="com-disc__tabs">
                                {['trending', 'solved', 'student'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`com-disc__tab${activeTab === tab ? ' active' : ''}`}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {tab === 'trending' ? '🔥 Trending' : tab === 'solved' ? '✅ Solved' : '🎓 Students'}
                                    </button>
                                ))}
                            </div>
                            <input
                                className="com-disc__search"
                                placeholder="Search discussions…"
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                aria-label="Search discussions"
                            />
                        </div>

                        <div className="com-disc__list">
                            {filtered.map(d => (
                                <div key={d.id} className="com-disc-row">
                                    <div className="com-disc-row__votes">
                                        <button className="com-disc-row__upvote" aria-label="Upvote">▲</button>
                                        <span>{d.votes}</span>
                                    </div>
                                    <div className="com-disc-row__body">
                                        <div className="com-disc-row__meta">
                                            <span className="com-disc-row__badge"
                                                style={{ color: d.badgeColor, background: d.badgeBg }}>
                                                {d.badge}
                                            </span>
                                            <span className="com-disc-row__channel">{d.channel}</span>
                                        </div>
                                        <div className="com-disc-row__title">{d.emoji} {d.title}</div>
                                        <div className="com-disc-row__footer">
                                            <div className="com-disc-row__author">
                                                <div className="com-disc-row__av" style={{ background: d.author.bg }}>{d.author.initials}</div>
                                                <span>{d.author.name}</span>
                                            </div>
                                            <div className="com-disc-row__stats">
                                                <span>💬 {d.replies}</span>
                                                <span>👁 {d.views.toLocaleString()}</span>
                                                <span>🕐 {d.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="com-disc__new-btn">+ Start a Discussion</button>
                    </div>

                    {/* Right – Leaderboard */}
                    <div className="com-leaderboard">
                        <div className="com-lb__header">
                            <div className="com-lb__title">🏆 Top Contributors</div>
                            <div className="com-lb__sub">This month</div>
                        </div>
                        <div className="com-lb__list">
                            {LEADERBOARD.map(m => (
                                <div key={m.rank} className={`com-lb-row${m.rank <= 3 ? ' com-lb-row--top' : ''}`}>
                                    <div className="com-lb-row__rank">
                                        {m.badge || `#${m.rank}`}
                                    </div>
                                    <div className="com-lb-row__av" style={{ background: m.bg }}>{m.initials}</div>
                                    <div className="com-lb-row__info">
                                        <div className="com-lb-row__name">{m.name}</div>
                                        <div className="com-lb-row__uni">{m.uni}</div>
                                    </div>
                                    <div className="com-lb-row__right">
                                        <div className="com-lb-row__points">{m.points.toLocaleString()}</div>
                                        <div className="com-lb-row__earned">{m.earned}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="com-lb__cta">
                            <Link to="/browse-freelancers" className="com-lb__link">View Full Leaderboard →</Link>
                        </div>

                        {/* Referral card */}
                        <div className="com-referral">
                            <div className="com-referral__icon">🎁</div>
                            <div className="com-referral__title">Invite a Friend</div>
                            <div className="com-referral__sub">
                                Earn 500 community points for every student you refer who completes a project.
                            </div>
                            <button className="com-referral__btn">Copy Referral Link</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ EVENTS ══ */}
            <section className="com-events">
                <div className="container">
                    <div className="com-section-header">
                        <div className="section-tag"><span>📅</span> Events</div>
                        <h2 className="section-title">Upcoming Community Events</h2>
                        <p className="section-subtitle">
                            Live webinars, AMAs with top earners, hackathons, and skill workshops — all free for members.
                        </p>
                    </div>
                    <div className="com-events__grid">
                        {EVENTS.map(ev => (
                            <div key={ev.id} className="com-event-card">
                                <div className="com-event-card__emoji">{ev.emoji}</div>
                                <div className="com-event-card__body">
                                    <span className="com-event-card__type"
                                        style={{ color: ev.typeColor, background: ev.typeBg }}>
                                        {ev.type}
                                    </span>
                                    <h3 className="com-event-card__title">{ev.title}</h3>
                                    <div className="com-event-card__meta">
                                        <span>📅 {ev.date}</span>
                                        <span>⏰ {ev.time}</span>
                                    </div>
                                    <div className="com-event-card__seats">
                                        <div className="com-event-card__seats-bar">
                                            <div
                                                className="com-event-card__seats-fill"
                                                style={{ width: `${(ev.registered / ev.seats) * 100}%`, background: ev.typeColor }}
                                            />
                                        </div>
                                        <span>{ev.registered}/{ev.seats} registered</span>
                                    </div>
                                    <button className="com-event-card__btn" style={{ background: ev.typeColor }}>
                                        Register Free →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA BANNER ══ */}
            <section className="com-cta">
                <div className="com-cta__orb com-cta__orb--1" />
                <div className="com-cta__orb com-cta__orb--2" />
                <div className="container com-cta__inner">
                    <div className="com-cta__badge">🚀 Join Today</div>
                    <h2 className="com-cta__heading">
                        18,000 students can't be wrong.<br />Your community is waiting.
                    </h2>
                    <p className="com-cta__sub">
                        Free to join. No spam. Just real conversations with real student freelancers building real careers.
                    </p>
                    <div className="com-cta__actions">
                        <button className="com-cta__primary">Create Free Account</button>
                        <Link to="/browse-freelancers" className="com-cta__secondary">Browse Talent First →</Link>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}
