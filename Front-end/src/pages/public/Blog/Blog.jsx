import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import './Blog.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ─── */
const CATEGORIES = ['All', 'AI & Tech', 'Freelancing', 'Career Growth', 'Platform Updates', 'Student Stories'];

const BLOG_POSTS = [
    {
        id: 1, slug: 'how-buddy-ai-writes-winning-proposals',
        category: 'AI & Tech', categoryColor: '#0a4a73', categoryBg: 'rgba(10,74,115,.1)',
        emoji: '🤖', heroBg: 'linear-gradient(135deg,#042E4C 0%,#0a4a73 100%)',
        featured: true,
        title: 'How Buddy AI Writes Winning Freelance Proposals in 60 Seconds',
        excerpt: 'Learn how SkillKart\'s AI assistant analyzes project briefs, tailors proposals to each client\'s tone, and increases student win rates by 3× — with a behind-the-scenes look at the model.',
        author: { name: 'Zara Ahmed', role: 'AI Product Lead', initials: 'ZA', bg: '#0a4a73' },
        date: 'Feb 20, 2026', readTime: '8 min read',
        tags: ['Buddy AI', 'Proposals', 'NLP', 'GPT-4'],
        metaDescription: 'Discover how SkillKart\'s Buddy AI crafts personalized freelance proposals using GPT-4, boosting student win rates by 300%.',
        wordCount: 1800,
    },
    {
        id: 2, slug: 'from-zero-to-first-client-30-days',
        category: 'Student Stories', categoryColor: '#276749', categoryBg: 'rgba(39,103,73,.1)',
        emoji: '🎓', heroBg: 'linear-gradient(135deg,#1a4a2e 0%,#276749 100%)',
        featured: false,
        title: 'From Zero to First Client: A FAST NUCES Student\'s 30-Day Journey',
        excerpt: 'Aisha Khan had no portfolio and no clients. Thirty days after joining SkillKart, she landed a $500 web project. Here\'s her exact game plan.',
        author: { name: 'Bilal Raza', role: 'Content Strategist', initials: 'BR', bg: '#276749' },
        date: 'Feb 15, 2026', readTime: '6 min read',
        tags: ['Success Story', 'First Client', 'Students'],
        metaDescription: 'How a FAST NUCES student went from zero experience to landing a $500 project in 30 days using SkillKart.',
        wordCount: 1400,
    },
    {
        id: 3, slug: 'top-5-skills-in-demand-2026',
        category: 'Career Growth', categoryColor: '#553c9a', categoryBg: 'rgba(85,60,154,.1)',
        emoji: '📈', heroBg: 'linear-gradient(135deg,#2d1b69 0%,#553c9a 100%)',
        featured: false,
        title: 'Top 5 Freelance Skills Clients Can\'t Get Enough of in 2026',
        excerpt: 'SkillKart data reveals the most requested skills on the platform this quarter — from AI prompt engineering to no-code development. Are yours on the list?',
        author: { name: 'Sana Mir', role: 'Data Analyst', initials: 'SM', bg: '#553c9a' },
        date: 'Feb 10, 2026', readTime: '5 min read',
        tags: ['Skills', 'Trends', 'Data', '2026'],
        metaDescription: 'SkillKart analytics reveal the top 5 freelance skills dominating client requests in 2026.',
        wordCount: 1200,
    },
    {
        id: 4, slug: 'escrow-payments-explained',
        category: 'Freelancing', categoryColor: '#c05621', categoryBg: 'rgba(192,86,33,.1)',
        emoji: '🔒', heroBg: 'linear-gradient(135deg,#7b3611 0%,#c05621 100%)',
        featured: false,
        title: 'Escrow Payments Explained: Why SkillKart Freelancers Never Chase Invoices',
        excerpt: 'Unpaid invoices kill freelance momentum. SkillKart\'s milestone-based escrow system ensures you\'re always protected — here\'s exactly how it works from bid to payment.',
        author: { name: 'Omar Sheikh', role: 'FinTech Writer', initials: 'OS', bg: '#c05621' },
        date: 'Feb 5, 2026', readTime: '7 min read',
        tags: ['Payments', 'Escrow', 'Stripe', 'Finance'],
        metaDescription: 'A complete guide to how SkillKart\'s milestone-based Stripe escrow protects both freelancers and clients.',
        wordCount: 1600,
    },
    {
        id: 5, slug: 'ai-skill-verification-deep-dive',
        category: 'AI & Tech', categoryColor: '#0a4a73', categoryBg: 'rgba(10,74,115,.1)',
        emoji: '✅', heroBg: 'linear-gradient(135deg,#042E4C 0%,#1a6fa8 100%)',
        featured: false,
        title: 'AI Skill Verification Deep Dive: How We Eliminate Fake Profiles',
        excerpt: 'Fake profiles cost platforms $100M+ annually. SkillKart\'s multi-signal AI verification system reduces fraudulent accounts to near zero. Our CTO explains how.',
        author: { name: 'Zara Ahmed', role: 'AI Product Lead', initials: 'ZA', bg: '#0a4a73' },
        date: 'Jan 28, 2026', readTime: '10 min read',
        tags: ['AI', 'Security', 'Verification', 'ML'],
        metaDescription: 'How SkillKart\'s AI verification system uses machine learning to eliminate fake profiles and build platform trust.',
        wordCount: 2200,
    },
];

const RESOURCES = [
    {
        id: 1, type: 'PDF Guide', icon: '📘',
        title: 'The Ultimate Student Freelancer Handbook',
        desc: 'A 42-page guide covering profile setup, proposal writing, pricing strategies, and client communication — everything you need to land your first paid project.',
        pages: 42, downloads: '8.4K', size: '3.2 MB',
        downloadHref: '#',
    },
    {
        id: 2, type: 'Template Pack', icon: '📋',
        title: 'Proposal Templates Toolkit (10 Templates)',
        desc: 'Plug-and-play proposal templates for web development, design, content writing, data analysis, and more — written by top-earning SkillKart freelancers.',
        pages: 10, downloads: '12K', size: '1.8 MB',
        downloadHref: '#',
    },
    {
        id: 3, type: 'Checklist', icon: '✅',
        title: 'Profile Optimization Checklist',
        desc: 'A 35-point checklist that top-rated freelancers use to ensure their profiles rank higher in SkillKart search and attract AI-verified client invitations.',
        pages: 4, downloads: '15K', size: '0.9 MB',
        downloadHref: '#',
    },
];

/* ─── COMPONENT ─── */
export default function Blog() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const heroRef = useRef(null);

    const featured = BLOG_POSTS[0];
    const filtered = BLOG_POSTS.slice(1).filter(p => {
        const matchCat = activeCategory === 'All' || p.category === activeCategory;
        const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    useEffect(() => {
        document.title = 'Blog & Resources | SkillKart — AI Freelancing Insights';

        const tl = gsap.timeline({ delay: 0.15 });
        tl.fromTo('.blog-hero__badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
            .fromTo('.blog-hero__heading', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power4.out' }, '-=0.2')
            .fromTo('.blog-hero__sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
            .fromTo('.blog-hero__search-wrap', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.2');

        gsap.fromTo('.blog-stat__value',
            { y: 20, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.blog-stats', start: 'top 88%' }
            }
        );

        gsap.fromTo('.blog-featured__card',
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
                scrollTrigger: { trigger: '.blog-featured', start: 'top 82%' }
            }
        );

        gsap.fromTo('.blog-card',
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.blog-grid', start: 'top 82%' }
            }
        );

        gsap.fromTo('.resource-card',
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.12, duration: 0.6, ease: 'power3.out',
                scrollTrigger: { trigger: '.blog-resources__grid', start: 'top 82%' }
            }
        );

        return () => ScrollTrigger.getAll().forEach(t => t.kill());
    }, []);

    return (
        <>
            <Navbar />

            {/* ══ HERO ══ */}
            <section ref={heroRef} className="blog-hero">
                <div className="blog-hero__bg">
                    <div className="blog-hero__orb blog-hero__orb--1" />
                    <div className="blog-hero__orb blog-hero__orb--2" />
                    <div className="blog-hero__orb blog-hero__orb--3" />
                    <div className="blog-hero__grid" />
                </div>
                <div className="container blog-hero__inner">
                    <div className="blog-hero__badge">✍️ Blog &amp; Resources</div>
                    <h1 className="blog-hero__heading">
                        Insights to <span className="blog-hero__accent">Accelerate</span><br />
                        Your Freelance Journey
                    </h1>
                    <p className="blog-hero__sub">
                        AI insights, student success stories, career guides, and downloadable resources —
                        curated by the SkillKart team to help you earn more, faster.
                    </p>
                    <div className="blog-hero__search-wrap">
                        <input
                            type="search"
                            className="blog-hero__search"
                            placeholder="Search articles, guides, tutorials…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            aria-label="Search blog posts"
                        />
                        <button className="blog-hero__search-btn">Search</button>
                    </div>
                </div>
                <div className="blog-hero__wave">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FFFFFF" />
                    </svg>
                </div>
            </section>

            {/* ══ STATS BAR ══ */}
            <section className="blog-stats">
                <div className="container blog-stats__grid">
                    {[
                        { value: '120+', label: 'Articles Published' },
                        { value: '35K+', label: 'Monthly Readers' },
                        { value: '3', label: 'Free Resources' },
                        { value: '15', label: 'Expert Authors' },
                    ].map(s => (
                        <div key={s.label} className="blog-stat__item">
                            <div className="blog-stat__value">{s.value}</div>
                            <div className="blog-stat__label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ══ FILTER BAR ══ */}
            <section className="blog-filter">
                <div className="container blog-filter__inner">
                    <div className="blog-filter__cats">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                className={`blog-filter__btn${activeCategory === cat ? ' active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                                aria-pressed={activeCategory === cat}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="blog-filter__sort">
                        <span>Sort by:</span>
                        <select aria-label="Sort posts">
                            <option>Latest</option>
                            <option>Most Read</option>
                            <option>Shortest Read</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* ══ FEATURED POST ══ */}
            <section className="blog-featured">
                <div className="container">
                    <div className="blog-featured__card">
                        <div className="blog-featured__img" style={{ background: featured.heroBg }}>
                            <div className="blog-featured__img-badge">Featured Post</div>
                            <span className="blog-featured__img-emoji">{featured.emoji}</span>
                        </div>
                        <div className="blog-featured__body">
                            <div className="blog-featured__cat" style={{ background: featured.categoryBg, color: featured.categoryColor }}>
                                {featured.category}
                            </div>
                            <h2 className="blog-featured__title">{featured.title}</h2>
                            <p className="blog-featured__excerpt">{featured.excerpt}</p>
                            <div className="blog-featured__meta">
                                <div className="blog-featured__author">
                                    <div className="blog-featured__avatar" style={{ background: featured.author.bg }}>
                                        {featured.author.initials}
                                    </div>
                                    <div>
                                        <div className="blog-featured__name">{featured.author.name}</div>
                                        <div className="blog-featured__role">{featured.author.role}</div>
                                    </div>
                                </div>
                                <div className="blog-featured__info">
                                    <div className="blog-featured__date">📅 {featured.date}</div>
                                    <div className="blog-featured__read">⏱ {featured.readTime}</div>
                                </div>
                            </div>
                            <div className="blog-featured__tags">
                                {featured.tags.map(t => <span key={t} className="blog-featured__tag">#{t}</span>)}
                            </div>
                            <a href={`#/blog/${featured.slug}`} className="blog-featured__link">
                                Read Article →
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ ARTICLE GRID ══ */}
            <section className="blog-grid-section">
                <div className="container">
                    <div className="blog-grid-section__header">
                        <div className="section-tag"><span>📰</span> Latest Articles</div>
                        <h2 className="section-title">
                            {activeCategory === 'All' ? 'All Articles' : activeCategory}
                            {searchQuery && ` · "${searchQuery}"`}
                        </h2>
                        <p className="section-subtitle">
                            {filtered.length} article{filtered.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    {filtered.length > 0 ? (
                        <div className="blog-grid">
                            {filtered.map(post => (
                                <article key={post.id} className="blog-card">
                                    <div className="blog-card__img" style={{ background: post.heroBg }}>
                                        <span>{post.emoji}</span>
                                    </div>
                                    <div className="blog-card__body">
                                        <span
                                            className="blog-card__cat"
                                            style={{ background: post.categoryBg, color: post.categoryColor }}
                                        >
                                            {post.category}
                                        </span>
                                        <h3 className="blog-card__title">{post.title}</h3>
                                        <p className="blog-card__excerpt">{post.excerpt}</p>
                                        <div className="blog-card__footer">
                                            <div className="blog-card__author">
                                                <div className="blog-card__av" style={{ background: post.author.bg }}>
                                                    {post.author.initials}
                                                </div>
                                                <span className="blog-card__author-name">{post.author.name}</span>
                                            </div>
                                            <div>
                                                <div className="blog-card__date">{post.date}</div>
                                                <div className="blog-card__read">{post.readTime}</div>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--color-text-light)', fontSize: 'var(--fs-md)' }}>
                            😢 No articles found. Try a different search or category.
                        </div>
                    )}
                </div>
            </section>

            {/* ══ RESOURCES ══ */}
            <section className="blog-resources">
                <div className="container">
                    <div className="blog-resources__header">
                        <div className="section-tag"><span>📥</span> Free Resources</div>
                        <h2 className="section-title">Download & Level Up</h2>
                        <p className="section-subtitle" style={{ margin: '0 auto' }}>
                            Practical guides, templates, and toolkits crafted by SkillKart's top freelancers — 100% free.
                        </p>
                    </div>
                    <div className="blog-resources__grid">
                        {RESOURCES.map(r => (
                            <div key={r.id} className="resource-card">
                                <div className="resource-card__icon">{r.icon}</div>
                                <div className="resource-card__type">{r.type}</div>
                                <h3 className="resource-card__title">{r.title}</h3>
                                <p className="resource-card__desc">{r.desc}</p>
                                <div className="resource-card__meta">
                                    <span className="resource-card__meta-item">📄 {r.pages} pages</span>
                                    <span className="resource-card__meta-item">⬇️ {r.downloads} downloads</span>
                                    <span className="resource-card__meta-item">💾 {r.size}</span>
                                </div>
                                <a href={r.downloadHref} className="resource-card__download" aria-label={`Download ${r.title}`}>
                                    ⬇️ Download Free
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ NEWSLETTER ══ */}
            <section className="blog-newsletter">
                <div className="blog-newsletter__orb blog-newsletter__orb--1" />
                <div className="blog-newsletter__orb blog-newsletter__orb--2" />
                <div className="container blog-newsletter__inner">
                    <div className="blog-newsletter__badge">📬 Newsletter</div>
                    <h2 className="blog-newsletter__heading">Get the SkillKart Weekly</h2>
                    <p className="blog-newsletter__sub">
                        AI tips, hot skills, job market insights, and success stories — delivered every Tuesday.
                        No spam. Unsubscribe anytime.
                    </p>
                    <div className="blog-newsletter__form" role="form" aria-label="Newsletter signup">
                        <input
                            type="email"
                            className="blog-newsletter__input"
                            placeholder="your@university.edu"
                            aria-label="Email address for newsletter"
                        />
                        <button className="blog-newsletter__submit">Subscribe →</button>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}
