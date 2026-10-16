import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Users, Star, ArrowRight, Flame, ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gigsAPI } from "../../../api/gigs";
import { publicAPI } from "../../../api/publicData";
import { mapGig, mapFreelancer } from "../../../utils/gigMapper";
import {
  resolveFallbackCategory,
  getFallbackGigs,
  getFallbackFreelancers,
} from "../../../utils/categoryMarketplaceData";
import Navbar from "../../../Components/common/Navbar/Navbar";
import Footer from "../../../Components/common/Footer/Footer";
import Loader from "../../../Components/common/Loader/Loader";
import SkillCard from "./SkillCard";
import GigCard from "./GigCard";
import "./marketplace.css";

gsap.registerPlugin(ScrollTrigger);

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [hideLoader, setHideLoader] = useState(false);

  /* ── Real backend data ── */
  const [allGigs, setAllGigs]             = useState([]);
  const [featuredGigs, setFeaturedGigs]   = useState([]);
  const [gigsLoading, setGigsLoading]     = useState(true);
  const [freelancers, setFreelancers]     = useState([]);
  const [flLoading, setFlLoading]         = useState(true);
  const [stats, setStats]                 = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingCategory(true);
    setGigsLoading(true);
    setFlLoading(true);

    const loadCategoryDetails = async () => {
      // Prepared fallback in case backend is offline, unseeded, or slug is custom
      const fallbackData = resolveFallbackCategory(categorySlug);

      try {
        const { skillsAPI } = await import("../../../api/skills");
        let node = null;
        try {
          const resolveRes = await skillsAPI.resolve(categorySlug);
          node = resolveRes.data?.data?.node;
        } catch (_) {
          node = null;
        }

        let childNodes = [];
        if (node) {
          try {
            const descendantsRes = await skillsAPI.getDescendants(categorySlug);
            childNodes = descendantsRes.data?.data?.descendants || [];
          } catch (_) {
            childNodes = [];
          }
        }

        const resolvedCategory = node || fallbackData;
        const resolvedSkills = childNodes.length > 0 ? childNodes : (fallbackData.skills || []);

        if (!active) return;
        setCategory(resolvedCategory);
        setSkills(resolvedSkills);
        setLoadingCategory(false);

        const skillNames = resolvedSkills.map((s) => s.name).filter(Boolean).join(",");

        // Fetch live gigs with graceful fallback to rich mock gigs
        gigsAPI
          .listGigs({ category: resolvedCategory.name, sort: "rating", limit: 100 })
          .then((res) => {
            if (!active) return;
            const list = (res.data?.data || []).map(mapGig);
            if (list.length > 0) {
              setAllGigs(list);
              setFeaturedGigs(list.slice(0, 9));
            } else {
              const mockList = getFallbackGigs(resolvedCategory.name);
              setAllGigs(mockList);
              setFeaturedGigs(mockList.slice(0, 9));
            }
          })
          .catch(() => {
            if (!active) return;
            const mockList = getFallbackGigs(resolvedCategory.name);
            setAllGigs(mockList);
            setFeaturedGigs(mockList.slice(0, 9));
          })
          .finally(() => { if (active) setGigsLoading(false); });

        // Fetch live freelancers with graceful fallback
        publicAPI
          .searchFreelancers({ skills: skillNames, sortBy: "rating", limit: 7 })
          .then((res) => {
            if (!active) return;
            const list = res.data?.data || [];
            if (list.length > 0) {
              setFreelancers(list.map(mapFreelancer));
            } else {
              setFreelancers(getFallbackFreelancers());
            }
          })
          .catch(() => {
            if (active) setFreelancers(getFallbackFreelancers());
          })
          .finally(() => { if (active) setFlLoading(false); });

        // Fetch category stats with fallback
        publicAPI
          .getCategoryStats(categorySlug)
          .then((res) => {
            if (!active) return;
            const s = res.data?.data;
            if (s && (s.totalGigs > 0 || s.totalFreelancers > 0)) {
              setStats(s);
            } else {
              setStats({
                totalGigs: fallbackData.totalServices || 28,
                totalFreelancers: fallbackData.totalFreelancers || 18,
                avgRating: 4.9,
              });
            }
          })
          .catch(() => {
            if (active) {
              setStats({
                totalGigs: fallbackData.totalServices || 28,
                totalFreelancers: fallbackData.totalFreelancers || 18,
                avgRating: 4.9,
              });
            }
          });

      } catch (err) {
        console.error("Category details fallback initialized:", err);
        if (!active) return;
        setCategory(fallbackData);
        setSkills(fallbackData.skills || []);
        setLoadingCategory(false);
        const mockList = getFallbackGigs(fallbackData.name);
        setAllGigs(mockList);
        setFeaturedGigs(mockList.slice(0, 9));
        setGigsLoading(false);
        setFreelancers(getFallbackFreelancers());
        setFlLoading(false);
        setStats({
          totalGigs: fallbackData.totalServices || 28,
          totalFreelancers: fallbackData.totalFreelancers || 18,
          avgRating: 4.9,
        });
      }
    };

    loadCategoryDetails();
    return () => { active = false; };
  }, [categorySlug]);

  useEffect(() => {
    document.title = category?.name ? `${category.name} – SkillKart` : 'Category – SkillKart';
  }, [category?.name]);

  /* ── Refs for GSAP ── */
  const heroRef       = useRef(null);
  const skillsRef     = useRef(null);
  const trendingRef   = useRef(null);
  const freelanceRef  = useRef(null);
  const gigsRef       = useRef(null);

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
    const live = allGigs.filter((g) => (g.skills || []).some((s) => String(s).toLowerCase() === target)).length;
    return live > 0 ? live : (skill.totalServices || 8);
  };

  /* Stats display with reliable fallbacks */
  const totalServices = Number(stats?.totalGigs) || (allGigs.length > 0 ? allGigs.length : 28);
  const totalFreelancers = Number(stats?.totalFreelancers) || (freelancers.length > 0 ? freelancers.length : 18);
  const avgRating = stats?.avgRating
    ? `${Number(stats.avgRating).toFixed(1)}★`
    : "4.9★";

  const filteredSkills = searchTerm.trim()
    ? skills.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : skills;

  /* ── GSAP animations ── */
  useEffect(() => {
    if (loadingCategory || !category) return;
    
    // Hero entrance - runs exactly once
    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(".cat-hero__breadcrumb", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" })
      .fromTo(".cat-hero__badge",      { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, "-=0.2")
      .fromTo(".cat-hero__title",      { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: "power4.out" }, "-=0.25")
      .fromTo(".cat-hero__desc",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5,  ease: "power3.out" }, "-=0.3")
      .fromTo(".cat-hero__stat",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.45, ease: "power3.out" }, "-=0.25")
      .fromTo(".cat-hero__search",     { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, "-=0.15");
  }, [loadingCategory, category]);

  useEffect(() => {
    if (loadingCategory || filteredSkills.length === 0) return;
    const targets = skillsRef.current?.querySelectorAll(".mp-skill-card");
    if (!targets?.length) return;

    const trigger = ScrollTrigger.create({
      trigger: skillsRef.current,
      start: "top 82%",
      onEnter: () => {
        gsap.fromTo(targets,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.65, ease: "power3.out" }
        );
      },
      once: true
    });

    return () => trigger.kill();
  }, [loadingCategory, filteredSkills]);

  useEffect(() => {
    if (loadingCategory || allTrending.length === 0) return;
    const targets = trendingRef.current?.querySelectorAll(".mp-trending-pill");
    if (!targets?.length) return;

    const trigger = ScrollTrigger.create({
      trigger: trendingRef.current,
      start: "top 82%",
      onEnter: () => {
        gsap.fromTo(targets,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.65, ease: "power3.out" }
        );
      },
      once: true
    });

    return () => trigger.kill();
  }, [loadingCategory, allTrending]);

  useEffect(() => {
    if (flLoading || freelancers.length === 0) return;
    const targets = freelanceRef.current?.querySelectorAll(".mp-freelancer-card");
    if (!targets?.length) return;

    const trigger = ScrollTrigger.create({
      trigger: freelanceRef.current,
      start: "top 82%",
      onEnter: () => {
        gsap.fromTo(targets,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.65, ease: "power3.out" }
        );
      },
      once: true
    });

    return () => trigger.kill();
  }, [flLoading, freelancers]);

  useEffect(() => {
    if (gigsLoading || featuredGigs.length === 0) return;
    const targets = gigsRef.current?.querySelectorAll(".mp-gig-card");
    if (!targets?.length) return;

    const trigger = ScrollTrigger.create({
      trigger: gigsRef.current,
      start: "top 82%",
      onEnter: () => {
        gsap.fromTo(targets,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.65, ease: "power3.out" }
        );
      },
      once: true
    });

    return () => trigger.kill();
  }, [gigsLoading, featuredGigs]);

  /* ── Fade out loader overlay ── */
  useEffect(() => {
    if (!loadingCategory) {
      gsap.to(".skl-page-loader", {
        opacity: 0,
        y: -30,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => setHideLoader(true)
      });
    }
  }, [loadingCategory]);

  /* ── Not found ──
     Placed AFTER every hook so the hook order is identical on every render
     (React's rules-of-hooks). The GSAP effects above no-op while there's no
     category, so it's safe for them to run before this bails out. */
  if (!category && !loadingCategory) {
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

  return (
    <>
      <Navbar />
      <div className="mp-page">
        {category ? (
          <>

        {/* ═══════════════════ COMPACT LIGHT HERO ═══════════════════ */}
        <section ref={heroRef} className="cat-hero-section">
          <div className="cat-hero-ambient" />

          <div className="cat-hero-container">
            {/* Breadcrumb */}
            <div className="cat-hero-breadcrumb">
              <Link to="/">Home</Link>
              <ChevronRight size={13} />
              <Link to="/categories">Categories</Link>
              <ChevronRight size={13} />
              <span>{category.name}</span>
            </div>

            {/* Badge */}
            <div className="cat-hero-badge">
              <span>{category.icon}</span>
              <span>{totalServices.toLocaleString()} Services Available</span>
            </div>

            {/* Title */}
            <h1 className="cat-hero-title">
              {category.name}
            </h1>

            {/* Description */}
            <p className="cat-hero-subtitle">{category.description}</p>

            {/* Stats Badges */}
            <div className="cat-hero-stats">
              <div className="cat-hero-stat-badge">
                <span className="cat-hero-stat-num">{skills.length}</span>
                <span className="cat-hero-stat-lbl">Skill Areas</span>
              </div>
              <div className="cat-hero-stat-badge">
                <span className="cat-hero-stat-num">{totalServices.toLocaleString()}</span>
                <span className="cat-hero-stat-lbl">Services Available</span>
              </div>
              <div className="cat-hero-stat-badge">
                <span className="cat-hero-stat-num">{avgRating}</span>
                <span className="cat-hero-stat-lbl">Avg Rating</span>
              </div>
            </div>

            {/* Search Pill */}
            <form
              className="cat-search-pill"
              onSubmit={(e) => { e.preventDefault(); skillsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            >
              <Search size={17} className="cat-search-icon" />
              <input
                className="cat-search-input"
                placeholder={`Search skill areas in ${category.name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="cat-search-btn">Search Skills</button>
            </form>
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
                <SkillCard key={skill._id || skill.slug} skill={skill} categorySlug={categorySlug} gigCount={skillGigCount(skill)} />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════ TRENDING ═══════════════════ */}
        {allTrending.length > 0 && (
          <div className="mp-section mp-section--alt">
            <div className="mp-container">
              <div className="mp-section-head">
                <div>
                  <div className="mp-section-tag"><Flame size={11} /> Trending</div>
                  <h2 className="mp-section-title">Trending in {category.name}</h2>
                </div>
              </div>
              <div ref={trendingRef} className="mp-trending-scroll">
                {allTrending.map((tag, i) => (
                  <Link key={i} to={`/skills/${categorySlug}/${tag.toLowerCase().replace(/ /g, '-')}`} className="mp-trending-pill" style={{ textDecoration: 'none' }}>
                    <TrendingUp size={12} /> {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ FREELANCERS ═══════════════════ */}
        {(flLoading || freelancers.length > 0) && (
        <div className="mp-section">
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
                    <div className="mp-freelancer-card__rating" style={{ gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} fill={s <= Math.round(f.rating) ? "currentColor" : "none"} style={{ opacity: s <= Math.round(f.rating) ? 1 : 0.3, color: '#f59e0b' }} />
                      ))}
                      <span className="mp-freelancer-card__reviews" style={{ marginLeft: '4px' }}>({f.reviews})</span>
                    </div>
                    <div className="mp-freelancer-card__price">From Rs. {f.price}/hr</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* ═══════════════════ FEATURED GIGS ═══════════════════ */}
        {(gigsLoading || featuredGigs.length > 0) && (
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
        )}

          </>
        ) : (
          <div style={{ minHeight: 'calc(var(--vh-full, 100vh) * 0.8)' }} />
        )}
      </div>
      <Footer />

      {!hideLoader && <Loader fullScreen text="Loading" />}
    </>
  );
}
