import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Users, Star, ArrowRight, Flame, ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getCategoryBySlug } from "../../../data/categories";
import { getSkillsByCategorySlug } from "../../../data/skills";
import { gigsAPI } from "../../../api/gigs";
import { publicAPI } from "../../../api/publicData";
import { mapGig, mapFreelancer } from "../../../utils/gigMapper";
import Navbar from "../../../Components/common/Navbar/Navbar";
import Footer from "../../../Components/common/Footer/Footer";
import SkillCard from "./SkillCard";
import GigCard from "./GigCard";
import "./marketplace.css";

gsap.registerPlugin(ScrollTrigger);

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  const category = getCategoryBySlug(categorySlug);
  const skills   = getSkillsByCategorySlug(categorySlug);

  /* ── Real backend data ── */
  const [allGigs, setAllGigs]             = useState([]);
  const [featuredGigs, setFeaturedGigs]   = useState([]);
  const [gigsLoading, setGigsLoading]     = useState(true);
  const [freelancers, setFreelancers]     = useState([]);
  const [flLoading, setFlLoading]         = useState(true);
  const [stats, setStats]                 = useState(null);

  useEffect(() => {
    if (!category) return;
    let active = true;

    setGigsLoading(true);
    setFlLoading(true);

    /* Skill names from the category's static skill taxonomy — used to scope
       the freelancer search to people who actually work in this category. */
    const skillNames = skills.map((s) => s.name).filter(Boolean).join(",");

    /* Real gigs in this category (Gig.category stores the display name).
       Fetch a larger pool so per-skill counts + trending are accurate; show
       the top 9 by rating as "featured". */
    gigsAPI
      .listGigs({ category: category.name, sort: "rating", limit: 100 })
      .then((res) => {
        if (!active) return;
        const list = (res.data?.data || []).map(mapGig);
        setAllGigs(list);
        setFeaturedGigs(list.slice(0, 9));
      })
      .catch(() => { if (active) { setAllGigs([]); setFeaturedGigs([]); } })
      .finally(() => { if (active) setGigsLoading(false); });

    /* Real top-rated freelancers scoped to this category's skills. */
    publicAPI
      .searchFreelancers({ skills: skillNames, sortBy: "rating", limit: 7 })
      .then((res) => {
        if (!active) return;
        const list = res.data?.data || [];
        setFreelancers(list.map(mapFreelancer));
      })
      .catch(() => { if (active) setFreelancers([]); })
      .finally(() => { if (active) setFlLoading(false); });

    /* Real aggregate stats for the hero. */
    publicAPI
      .getCategoryStats(categorySlug)
      .then((res) => { if (active) setStats(res.data?.data || null); })
      .catch(() => { if (active) setStats(null); });

    return () => { active = false; };
  }, [categorySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Refs for GSAP ── */
  const heroRef       = useRef(null);
  const skillsRef     = useRef(null);
  const trendingRef   = useRef(null);
  const freelanceRef  = useRef(null);
  const gigsRef       = useRef(null);

  useEffect(() => {
    if (!category) return;

    /* Hero entrance */
    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(".cat-hero__breadcrumb", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" })
      .fromTo(".cat-hero__badge",      { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, "-=0.2")
      .fromTo(".cat-hero__title",      { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: "power4.out" }, "-=0.25")
      .fromTo(".cat-hero__desc",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5,  ease: "power3.out" }, "-=0.3")
      .fromTo(".cat-hero__stat",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.45, ease: "power3.out" }, "-=0.25")
      .fromTo(".cat-hero__search",     { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, "-=0.15");

    /* Scroll-based section animations */
    const animateChildren = (ref, selector) => {
      const targets = selector
        ? ref.current?.querySelectorAll(selector)
        : ref.current?.children;
      if (!targets?.length) return;
      gsap.fromTo(targets,
        { y: 36, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.08, duration: 0.65, ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 82%" },
        }
      );
    };

    animateChildren(skillsRef,   ".mp-skill-card");
    animateChildren(trendingRef, ".mp-trending-pill");
    animateChildren(freelanceRef,".mp-freelancer-card");
    animateChildren(gigsRef,     ".mp-gig-card");

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, [category, freelancers, featuredGigs]);

  if (!category) {
    return (
      <>
        <Navbar />
        <div className="mp-page">
          <div className="mp-not-found">
            <div className="mp-not-found__emoji">🔍</div>
            <div className="mp-not-found__title">Category Not Found</div>
            <div className="mp-not-found__sub">The category you're looking for doesn't exist.</div>
            <Link to="/" className="mp-not-found__link">Back to Home</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  /* Real trending = the skills that actually appear most across this category's
     live gigs (ranked by frequency). Falls back to the static taxonomy tags
     only when there are no gigs yet. */
  const realTrending = (() => {
    const freq = new Map();
    for (const g of allGigs) {
      for (const s of g.skills || []) {
        const k = String(s).trim();
        if (k) freq.set(k, (freq.get(k) || 0) + 1);
      }
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 20);
  })();
  const staticTrending = skills.flatMap((s) => s.trending || []).slice(0, 20);
  const allTrending = realTrending.length > 0 ? realTrending : staticTrending;

  /* Real per-skill gig count: how many live gigs list this skill. */
  const skillGigCount = (skill) => {
    const target = String(skill.name).toLowerCase();
    return allGigs.filter((g) => (g.skills || []).some((s) => String(s).toLowerCase() === target)).length;
  };

  /* Real stats ONLY — no static fallback. "—" until there's data. */
  const totalServices = Number(stats?.totalGigs) || 0;
  const totalFreelancers = Number(stats?.totalFreelancers) || 0;
  const avgRating = stats?.avgRating
    ? `${Number(stats.avgRating).toFixed(1)}★`
    : "—";

  const filteredSkills = searchTerm.trim()
    ? skills.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : skills;

  return (
    <>
      <Navbar />
      <div className="mp-page">

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section ref={heroRef} className="cat-hero">
          {/* Orbs + grid — identical to About page */}
          <div className="cat-hero__bg">
            <div className="cat-hero__orb cat-hero__orb--1" />
            <div className="cat-hero__orb cat-hero__orb--2" />
            <div className="cat-hero__orb cat-hero__orb--3" />
            <div className="cat-hero__grid" />
          </div>

          <div className="container cat-hero__inner">
            {/* Breadcrumb */}
            <div className="cat-hero__breadcrumb">
              <Link to="/">Home</Link>
              <ChevronRight size={14} />
              <span>{category.name}</span>
            </div>

            {/* Badge */}
            <div className="cat-hero__badge cat-hero__badge--el">
              <span>{category.icon}</span>
              {totalServices.toLocaleString()} Services Available
            </div>

            {/* Title */}
            <h1 className="cat-hero__title">
              {category.name}
            </h1>

            {/* Description */}
            <p className="cat-hero__desc">{category.description}</p>

            {/* Stats */}
            <div className="cat-hero__stats">
              <div className="cat-hero__stat">
                <span className="cat-hero__stat-num">{skills.length}</span>
                <span className="cat-hero__stat-lbl">Skill Areas</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="cat-hero__stat">
                <span className="cat-hero__stat-num">{totalServices.toLocaleString()}</span>
                <span className="cat-hero__stat-lbl">
                  {totalFreelancers != null ? "Total Gigs" : "Total Services"}
                </span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="cat-hero__stat">
                <span className="cat-hero__stat-num">{avgRating}</span>
                <span className="cat-hero__stat-lbl">Avg Rating</span>
              </div>
            </div>

            {/* Search — filters the skills grid live; the button jumps to results */}
            <form
              className="cat-hero__search"
              onSubmit={(e) => { e.preventDefault(); skillsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            >
              <Search size={18} color="rgba(255,255,255,0.55)" style={{ flexShrink: 0 }} />
              <input
                className="cat-hero__search-input"
                placeholder={`Search in ${category.name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="cat-hero__search-btn">Search</button>
            </form>
          </div>

          {/* Wave separator — same as About page */}
          <div className="cat-hero__wave">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#f4f6f9" />
            </svg>
          </div>
        </section>

        {/* ═══════════════════ SKILLS GRID ═══════════════════ */}
        <div className="mp-section">
          <div className="mp-container">
            <div className="mp-section-head">
              <div>
                <div className="mp-section-tag"><TrendingUp size={11} /> Popular Skills</div>
                <h2 className="mp-section-title">Browse by Skill Area</h2>
                <p className="mp-section-subtitle">
                  {filteredSkills.length} skill area{filteredSkills.length !== 1 ? "s" : ""} in {category.name}
                </p>
              </div>
            </div>
            <div ref={skillsRef} className="mp-skills-grid">
              {filteredSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} categorySlug={categorySlug} gigCount={skillGigCount(skill)} />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════ TRENDING ═══════════════════ */}
        {allTrending.length > 0 && (
          <div className="mp-section mp-section--alt" style={{ paddingTop: 0 }}>
            <div className="mp-container">
              <div className="mp-section-head">
                <div>
                  <div className="mp-section-tag"><Flame size={11} /> Trending</div>
                  <h2 className="mp-section-title">Trending in {category.name}</h2>
                </div>
              </div>
              <div ref={trendingRef} className="mp-trending-scroll">
                {allTrending.map((tag, i) => (
                  <span key={i} className="mp-trending-pill">
                    <TrendingUp size={12} /> {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ FREELANCERS ═══════════════════ */}
        <div className="mp-section" style={{ paddingTop: 0 }}>
          <div className="mp-container">
            <div className="mp-section-head">
              <div>
                <div className="mp-section-tag"><Users size={11} /> Top Talent</div>
                <h2 className="mp-section-title">Top Rated Freelancers</h2>
              </div>
              <Link to="/browse-freelancers" className="mp-view-all">
                View All <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
              </Link>
            </div>
            {flLoading ? (
              <div className="mp-state-msg">Loading…</div>
            ) : freelancers.length === 0 ? (
              <div className="mp-state-msg">No freelancers here yet</div>
            ) : (
              <div ref={freelanceRef} className="mp-freelancers-scroll">
                {freelancers.map((f) => (
                  <Link
                    key={f.id}
                    to={`/freelancers/${f.id}`}
                    className="mp-freelancer-card"
                  >
                    <div className="mp-freelancer-card__avatar">
                      <img
                        src={f.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.seed}`}
                        alt={f.name}
                        onError={(e) => {
                          e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.seed}`;
                        }}
                      />
                    </div>
                    <div className="mp-freelancer-card__name">{f.name}</div>
                    <div className="mp-freelancer-card__title">{f.title}</div>
                    <div className="mp-freelancer-card__rating">
                      <Star size={13} fill="currentColor" /> {f.rating}
                      <span className="mp-freelancer-card__reviews">({f.reviews})</span>
                    </div>
                    <div className="mp-freelancer-card__price">From ${f.price}/hr</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ FEATURED GIGS ═══════════════════ */}
        <div className="mp-section mp-section--alt" style={{ paddingBottom: 80 }}>
          <div className="mp-container">
            <div className="mp-section-head">
              <div>
                <div className="mp-section-tag"><Star size={11} /> Featured</div>
                <h2 className="mp-section-title">Featured Gigs in {category.name}</h2>
              </div>
              <Link to="/browse-projects" className="mp-view-all">
                Browse All <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
              </Link>
            </div>
            {gigsLoading ? (
              <div className="mp-state-msg">Loading…</div>
            ) : featuredGigs.length === 0 ? (
              <div className="mp-state-msg">No gigs in this category yet — check back soon</div>
            ) : (
              <div ref={gigsRef} className="mp-gigs-grid">
                {featuredGigs.map((gig) => (
                  <Link key={gig.id} to={`/gigs/${gig.id}`} className="mp-gig-link">
                    <GigCard gig={gig} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      <Footer />
    </>
  );
}
