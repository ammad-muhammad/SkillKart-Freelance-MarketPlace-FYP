import { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Briefcase, TrendingUp, Users, ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories as staticCategories } from "../../../data/categories";
import { publicAPI } from "../../../api/publicData";
import Navbar from "../../../Components/common/Navbar/Navbar";
import Footer from "../../../Components/common/Footer/Footer";
import "./Categories.css";

gsap.registerPlugin(ScrollTrigger);

export default function Categories() {
  const heroRef = useRef(null);
  const gridRef = useRef(null);
  const navigate = useNavigate();
  // Static taxonomy provides the descriptions/icons (no DB source) but NOT the
  // counts — those start at 0 and are filled with REAL gig counts from the API.
  const [categories, setCategories] = useState(
    staticCategories.map((c) => ({ ...c, totalServices: 0, isLiveCount: true }))
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    publicAPI.getCategories()
      .then((res) => {
        if (!active) return;
        const live = res.data?.data?.categories || [];
        // Backend categories are JOB_CATEGORIES (e.g. "Web Development"); the
        // static marketing categories use broader groupings. Map each static
        // category → the backend categories it covers, then sum real counts.
        const byName = new Map(live.map((c) => [c.name, c.totalServices || 0]));
        const STATIC_TO_BACKEND = {
          'admin-support': ['Other'],
          'design-creative': ['UI/UX Design'],
          'marketing': ['Digital Marketing'],
          'writing-content': ['Content & Writing'],
          'ai-emerging-tech': ['Data Science & AI', 'Cybersecurity'],
          'development-tech': ['Web Development', 'Mobile Development', 'DevOps & Cloud'],
          'video-audio-animation': ['Video & Animation'],
        };
        setCategories(staticCategories.map((c) => {
          const mapped = STATIC_TO_BACKEND[c.slug] || [];
          const real = mapped.reduce((sum, name) => sum + (byName.get(name) || 0), 0);
          // Real count only (even 0 = honest "no gigs yet"); never the fake static number.
          return { ...c, totalServices: real, isLiveCount: true };
        }));
      })
      .catch(() => { /* keep static counts on failure */ });
    return () => { active = false; };
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(search.trim() ? `/browse-projects?q=${encodeURIComponent(search.trim())}` : '/browse-projects');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "All Categories - SkillKart";

    /* Hero entrance */
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo(".cats-hero__tag",   { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" })
      .fromTo(".cats-hero__title", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power4.out" }, "-=0.2")
      .fromTo(".cats-hero__desc",  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.3")
      .fromTo(".cats-hero__search",{ y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.2");

    /* Grid entrance */
    gsap.fromTo(gridRef.current.children,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: gridRef.current, start: "top 85%" }
      }
    );

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <>
      <Navbar />
      <div className="cats-page">
        {/* ── HERO ── */}
        <section ref={heroRef} className="cats-hero">
          <div className="cats-hero__bg">
            <div className="cats-hero__orb cats-hero__orb--1" />
            <div className="cats-hero__orb cats-hero__orb--2" />
            <div className="cats-hero__orb cats-hero__orb--3" />
            <div className="cats-hero__grid" />
          </div>

          <div className="container cats-hero__inner">
            <div className="section-tag cats-hero__tag">
                <span>📂</span> Marketplace Categories
            </div>

            <h1 className="cats-hero__title">
              Explore Our <span className="cats-hero__accent">Marketplace</span>
            </h1>
            <p className="cats-hero__desc">
              Discover verified student freelancers across hundreds of specialized skills. 
              Find the perfect talent filtered by category, rating, and expertise.
            </p>

            <form className="cats-hero__search" onSubmit={onSearch}>
              <Search size={18} color="rgba(255,255,255,0.55)" />
              <input
                placeholder="Search for any service or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <div className="cats-hero__wave">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="var(--color-bg)" />
            </svg>
          </div>
        </section>

        {/* ── CATEGORY GRID ── */}
        <div className="container cats-main">
          <div className="cats-main__head">
            <div className="section-tag"><Briefcase size={14} /> Main Sectors</div>
            <h2 className="section-title">All Service Categories</h2>
          </div>

          <div ref={gridRef} className="cats-grid">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/skills/${cat.slug}`} className="cat-card">
                <div className="cat-card__content">
                  <div className="cat-card__icon" style={{ background: cat.lightBg }}>
                    {cat.icon}
                  </div>
                  <div className="cat-card__info">
                    <h3>{cat.name}</h3>
                    <p>{cat.description}</p>
                  </div>
                  <div className="cat-card__footer">
                    <div className="cat-card__stat">
                      <Users size={14} />
                      <span>
                        {cat.isLiveCount
                          ? `${cat.totalServices.toLocaleString()} ${cat.totalServices === 1 ? 'gig' : 'gigs'}`
                          : `${cat.totalServices.toLocaleString()} Services`}
                      </span>
                    </div>
                    <div className="cat-card__arrow">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
                {/* Decorative gradient overlay */}
                <div className="cat-card__glow" style={{ background: cat.gradient }} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── TRENDING ── */}
        <section className="cats-trending">
            <div className="container">
                <div className="cats-trending__box">
                    <div className="cats-trending__info">
                        <div className="section-tag"><TrendingUp size={14} /> Trending Now</div>
                        <h2 className="section-title">Can't find what you're looking for?</h2>
                        <p className="section-subtitle">
                           Try our AI Buddy to help you match with the perfect freelancer or 
                           browse our most trending skillsets this month.
                        </p>
                        <div className="cats-trending__actions">
                            <Link to="/ai/buddy" className="btn-primary">Talk to AI Buddy</Link>
                            <Link to="/post-project" className="btn-secondary">Post a Project</Link>
                        </div>
                    </div>
                    <div className="cats-trending__visual">
                        <div className="cats-trending__circle">
                            <div className="cats-trending__icon">🤖</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
