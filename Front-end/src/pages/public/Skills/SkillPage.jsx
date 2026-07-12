import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import { Star, Users, TrendingUp, Layers, SlidersHorizontal, X, ArrowRight, Flame, ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getSkillBySlug } from "../../../data/skills";
import { getCategoryBySlug } from "../../../data/categories";
import { gigsAPI } from "../../../api/gigs";
import { publicAPI } from "../../../api/publicData";
import { mapGig, mapFreelancer } from "../../../utils/gigMapper";
import Navbar from "../../../Components/common/Navbar/Navbar";
import FilterSelect from "./FilterSelect";
import Footer from "../../../Components/common/Footer/Footer";
import GigCard from "./GigCard";
import "./marketplace.css";

gsap.registerPlugin(ScrollTrigger);

export default function SkillPage() {
  const { categorySlug, skillSlug } = useParams();
  const [skill, setSkill] = useState(null);
  const [category, setCategory] = useState(null);
  const [loadingSkill, setLoadingSkill] = useState(true);
  const [hideLoader, setHideLoader] = useState(false);

  const [activeSub,      setActiveSub]      = useState("all");
  const [priceFilter,    setPriceFilter]    = useState("any");
  const [deliveryFilter, setDeliveryFilter] = useState("any");
  const [ratingFilter,   setRatingFilter]   = useState("any");

  /* ── Real backend data ── */
  const [allGigs,      setAllGigs]      = useState([]);
  const [gigsLoading,  setGigsLoading]  = useState(true);
  const [freelancers,  setFreelancers]  = useState([]);
  const [flLoading,    setFlLoading]    = useState(true);
  const [stats,        setStats]        = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingSkill(true);
    setGigsLoading(true);
    setFlLoading(true);

    const loadSkillData = async () => {
      try {
        const { skillsAPI } = await import("../../../api/skills");
        const resolveRes = await skillsAPI.resolve(skillSlug);
        const node = resolveRes.data?.data?.node;

        if (!node) {
          if (active) setLoadingSkill(false);
          return;
        }

        const ancestorsRes = await skillsAPI.resolve(categorySlug);
        const catNode = ancestorsRes.data?.data?.node;

        if (!active) return;
        setSkill(node);
        setCategory(catNode || { name: categorySlug, slug: categorySlug });
        setLoadingSkill(false);

        /* Real gigs for this skill (Gig.skills stores display names). */
        gigsAPI
          .listGigs({ skill: node.name, limit: 48 })
          .then((res) => {
            if (!active) return;
            const list = res.data?.data || [];
            setAllGigs(list.map(mapGig));
          })
          .catch(() => { if (active) setAllGigs([]); })
          .finally(() => { if (active) setGigsLoading(false); });

        /* Real top-rated freelancers working in this skill. */
        publicAPI
          .searchFreelancers({ skills: node.name, sortBy: "rating", limit: 6 })
          .then((res) => {
            if (!active) return;
            const list = res.data?.data || [];
            setFreelancers(list.map(mapFreelancer));
          })
          .catch(() => { if (active) setFreelancers([]); })
          .finally(() => { if (active) setFlLoading(false); });

        /* Real aggregate stats for the hero. */
        publicAPI
          .getSkillStats(node.name)
          .then((res) => { if (active) setStats(res.data?.data || null); })
          .catch(() => { if (active) setStats(null); });

      } catch (err) {
        console.error("Failed loading Skill Details:", err);
        if (active) setLoadingSkill(false);
      }
    };

    loadSkillData();
    return () => { active = false; };
  }, [skillSlug, categorySlug]);

  /* ── Refs ── */
  const heroRef      = useRef(null);
  const gigsRef      = useRef(null);
  const flRef        = useRef(null);
  const trendRef     = useRef(null);

  /* ── Filtering ── */
  const filteredGigs = useMemo(() => {
    return allGigs.filter((gig) => {
      if (activeSub !== "all" && gig.subcategory !== activeSub) return false;
      if (priceFilter === "under25"  && gig.price >= 25)                     return false;
      if (priceFilter === "25-50"    && (gig.price < 25 || gig.price > 50))  return false;
      if (priceFilter === "50-100"   && (gig.price < 50 || gig.price > 100)) return false;
      if (priceFilter === "100plus"  && gig.price <= 100)                    return false;
      /* Real gigs have no deliveryDays field — only filter when it exists. */
      if (gig.deliveryDays != null) {
        if (deliveryFilter === "1"   && gig.deliveryDays > 1)                return false;
        if (deliveryFilter === "3"   && gig.deliveryDays > 3)                return false;
        if (deliveryFilter === "7"   && gig.deliveryDays > 7)                return false;
      }
      if (ratingFilter === "4.5"     && gig.rating < 4.5)                    return false;
      if (ratingFilter === "4.0"     && gig.rating < 4.0)                    return false;
      return true;
    });
  }, [allGigs, activeSub, priceFilter, deliveryFilter, ratingFilter]);

  /* Real per-subcategory gig counts (from fetched gigs, not the static file).
     Match a gig's stored subcategory against either the subcategory id/slug or
     its display label, case-insensitively, so live data drives the badges. */
  const subCounts = useMemo(() => {
    const counts = {};
    for (const sub of skill?.subcategories || []) {
      const idLc = String(sub.id || '').toLowerCase();
      const labelLc = String(sub.label || '').toLowerCase();
      counts[sub.id] = allGigs.filter((g) => {
        const gs = String(g.subcategory || '').toLowerCase();
        return gs && (gs === idLc || gs === labelLc);
      }).length;
    }
    return counts;
  }, [allGigs, skill]);

  /* Real trending = skills that co-occur most across this skill's live gigs
     (excluding the skill itself). Falls back to the static taxonomy tags when
     there are no gigs yet. */
  const trendingTags = useMemo(() => {
    const self = String(skill?.name || '').toLowerCase();
    const freq = new Map();
    for (const g of allGigs) {
      for (const s of g.skills || []) {
        const k = String(s).trim();
        if (k && k.toLowerCase() !== self) freq.set(k, (freq.get(k) || 0) + 1);
      }
    }
    const real = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 15);
    return real.length > 0 ? real : (skill?.trending || []);
  }, [allGigs, skill]);

  const clearFilters = () => {
    setActiveSub("all"); setPriceFilter("any");
    setDeliveryFilter("any"); setRatingFilter("any");
  };
  const hasActiveFilters = activeSub !== "all" || priceFilter !== "any" || deliveryFilter !== "any" || ratingFilter !== "any";

  /* ── Real stats ONLY (no static fallback). Show the real value or 0/—. ── */
  const heroFreelancers = Number(stats?.totalFreelancers) || 0;
  const heroGigs        = Number(stats?.totalGigs) || 0;
  const heroRating      = stats?.avgRating ? Number(stats.avgRating).toFixed(1) : null;
  const heroPrice       = Number(stats?.startingPrice) || 0;

  /* ── GSAP animations ── */
  useEffect(() => {
    if (loadingSkill || !skill || !category) return;
    
    // Hero entrance - runs exactly once
    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(".skl-hero__breadcrumb", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" })
      .fromTo(".skl-hero__title",      { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: "power4.out" }, "-=0.2")
      .fromTo(".skl-hero__desc",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.48, ease: "power3.out" }, "-=0.3")
      .fromTo(".skl-hero__stat",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.4, ease: "power3.out" }, "-=0.2");
  }, [loadingSkill, skill, category]);

  useEffect(() => {
    if (gigsLoading || allGigs.length === 0) return;
    const targets = gigsRef.current?.querySelectorAll(".mp-gig-card");
    if (!targets?.length) return;

    const trigger = ScrollTrigger.create({
      trigger: gigsRef.current,
      start: "top 82%",
      onEnter: () => {
        gsap.fromTo(targets,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: "power3.out" }
        );
      },
      once: true
    });

    return () => trigger.kill();
  }, [gigsLoading, allGigs]);

  useEffect(() => {
    if (flLoading || freelancers.length === 0) return;
    const targets = flRef.current?.querySelectorAll(".mp-freelancer-card");
    if (!targets?.length) return;

    const trigger = ScrollTrigger.create({
      trigger: flRef.current,
      start: "top 82%",
      onEnter: () => {
        gsap.fromTo(targets,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: "power3.out" }
        );
      },
      once: true
    });

    return () => trigger.kill();
  }, [flLoading, freelancers]);

  useEffect(() => {
    if (loadingSkill || trendingTags.length === 0) return;
    const targets = trendRef.current?.querySelectorAll(".mp-trending-pill");
    if (!targets?.length) return;

    const trigger = ScrollTrigger.create({
      trigger: trendRef.current,
      start: "top 82%",
      onEnter: () => {
        gsap.fromTo(targets,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: "power3.out" }
        );
      },
      once: true
    });

    return () => trigger.kill();
  }, [loadingSkill, trendingTags]);

  /* ── Fade out loader overlay ── */
  useEffect(() => {
    if (!loadingSkill) {
      gsap.to(".skl-page-loader", {
        opacity: 0,
        y: -30,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => setHideLoader(true)
      });
    }
  }, [loadingSkill]);

  /* ── Not found ── */
  if (!skill && !loadingSkill) {
    return (
      <>
        <Navbar />
        <div className="mp-page">
          <div className="mp-not-found">
            <div className="mp-not-found__emoji">🔍</div>
            <div className="mp-not-found__title">Skill Not Found</div>
            <div className="mp-not-found__sub">We couldn't find this skill page.</div>
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
        {skill && category ? (
          <>

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section ref={heroRef} className="cat-hero">
          <div className="cat-hero__bg">
            <div className="cat-hero__orb cat-hero__orb--1" />
            <div className="cat-hero__orb cat-hero__orb--2" />
            <div className="cat-hero__orb cat-hero__orb--3" />
            <div className="cat-hero__grid" />
          </div>

          <div className="container cat-hero__inner cat-hero__inner--skill">
            {/* Breadcrumb */}
            <div className="skl-hero__breadcrumb cat-hero__breadcrumb">
              <Link to="/">Home</Link>
              <ChevronRight size={14} />
              <Link to={`/skills/${categorySlug}`}>{category.name}</Link>
              <ChevronRight size={14} />
              <span>{skill.name}</span>
            </div>

            {/* Title */}
            <h1 className="skl-hero__title cat-hero__title">{skill.name}</h1>
            <p className="skl-hero__desc cat-hero__desc">{skill.description}</p>

            {/* Stats — real values only ("0" until there's data) */}
            <div className="cat-hero__stats">
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">{heroFreelancers > 0 ? `${heroFreelancers.toLocaleString()}+` : '0'}</span>
                <span className="cat-hero__stat-lbl">Freelancers</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">{heroGigs > 0 ? `${heroGigs.toLocaleString()}+` : '0'}</span>
                <span className="cat-hero__stat-lbl">Gigs Available</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">{heroRating ? `${heroRating}★` : '0'}</span>
                <span className="cat-hero__stat-lbl">Avg Rating</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">{heroPrice > 0 ? `From Rs. ${heroPrice}` : '0'}</span>
                <span className="cat-hero__stat-lbl">Starting Price</span>
              </div>
            </div>
          </div>

          <div className="cat-hero__wave">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#f4f6f9" />
            </svg>
          </div>
        </section>

        {/* ═══════════════════ CONTENT ═══════════════════ */}
        {(gigsLoading || allGigs.length > 0) && (
        <div className="mp-section">
          <div className="mp-container">

            {/* Subcategory chips */}
            {skill.subcategories?.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Layers size={16} color="#042E4C" />
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#042E4C", fontFamily: "'Roboto Slab', serif" }}>
                    Filter by Subcategory
                  </span>
                </div>
                <div className="mp-subcat-grid">
                  <div
                    className={`mp-subcat-card${activeSub === "all" ? " mp-subcat-card--active" : ""}`}
                    onClick={() => setActiveSub("all")}
                  >
                    <span className="mp-subcat-card__icon">✨</span>
                    All
                    <span className="mp-subcat-card__count">{allGigs.length}</span>
                  </div>
                  {skill.subcategories.map((sub) => (
                    <div
                      key={sub.id}
                      className={`mp-subcat-card${activeSub === sub.id ? " mp-subcat-card--active" : ""}`}
                      onClick={() => setActiveSub(sub.id)}
                    >
                      <span className="mp-subcat-card__icon">{sub.icon}</span>
                      {sub.label}
                      <span className="mp-subcat-card__count">{subCounts[sub.id] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div className="mp-filter-bar">
              <SlidersHorizontal size={16} color="#042E4C" style={{ flexShrink: 0 }} />
              <span className="mp-filter-bar__label">Filters:</span>

              <FilterSelect
                value={priceFilter}
                onChange={setPriceFilter}
                isActive={priceFilter !== "any"}
                options={[
                  { value: "any",     label: "Any Price"    },
                  { value: "under25", label: "Under Rs. 25"    },
                  { value: "25-50",   label: "Rs. 25 – Rs. 50"    },
                  { value: "50-100",  label: "Rs. 50 – Rs. 100"   },
                  { value: "100plus", label: "Rs. 100+"        },
                ]}
              />

              <FilterSelect
                value={deliveryFilter}
                onChange={setDeliveryFilter}
                isActive={deliveryFilter !== "any"}
                options={[
                  { value: "any", label: "Any Delivery"   },
                  { value: "1",   label: "Within 24 hrs"  },
                  { value: "3",   label: "Within 3 Days"  },
                  { value: "7",   label: "Within 7 Days"  },
                ]}
              />

              <FilterSelect
                value={ratingFilter}
                onChange={setRatingFilter}
                isActive={ratingFilter !== "any"}
                options={[
                  { value: "any", label: "Any Rating"  },
                  { value: "4.5", label: "4.5+ Stars"  },
                  { value: "4.0", label: "4.0+ Stars"  },
                ]}
              />

              <span className="mp-filter-results">
                {filteredGigs.length} result{filteredGigs.length !== 1 ? "s" : ""}
              </span>

              {hasActiveFilters && (
                <button className="mp-filter-clear" onClick={clearFilters}>
                  <X size={14} /> Clear Filters
                </button>
              )}
            </div>

            {/* Gig grid */}
            {gigsLoading ? (
              <div className="mp-state-msg">Loading gigs…</div>
            ) : allGigs.length === 0 ? (
              <div className="mp-state-msg">No gigs found for this skill yet.</div>
            ) : (
              <div ref={gigsRef} className="mp-gigs-grid">
                {filteredGigs.length > 0 ? (
                  filteredGigs.map((gig) => (
                    <Link key={gig.id} to={`/gigs/${gig.id}`} className="mp-gig-link">
                      <GigCard gig={gig} />
                    </Link>
                  ))
                ) : (
                  <div className="mp-no-results">
                    <div className="mp-no-results__icon">🔍</div>
                    <div className="mp-no-results__title">No gigs match your filters</div>
                    <div className="mp-no-results__sub">Try adjusting or clearing your filters.</div>
                    <button
                      onClick={clearFilters}
                      style={{
                        marginTop: 18, background: "#042E4C", color: "#fff",
                        border: "none", borderRadius: "99px", padding: "12px 26px",
                        fontWeight: 700, cursor: "pointer", fontFamily: "'Lato', sans-serif", fontSize: 14,
                      }}
                    >Clear Filters</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* ═══════════════════ FREELANCERS ═══════════════════ */}
        {(flLoading || freelancers.length > 0) && (
        <div className="mp-section mp-section--alt">
          <div className="mp-container">
            <div className="mp-section-head">
              <div>
                <div className="mp-section-tag"><Users size={11} /> Top Talent</div>
                <h2 className="mp-section-title">Top Freelancers in {skill.name}</h2>
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
              <div ref={flRef} className="mp-freelancers-scroll">
                {freelancers.map((fl) => (
                  <Link key={fl.id} to={`/freelancers/${fl.id}`} className="mp-freelancer-card">
                    <div className="mp-freelancer-card__avatar">
                      <img
                        src={fl.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fl.seed}`}
                        alt={fl.name}
                        onError={(e) => {
                          e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fl.seed}`;
                        }}
                      />
                    </div>
                    <div className="mp-freelancer-card__name">{fl.name}</div>
                    <div className="mp-freelancer-card__title">{fl.title}</div>
                    <div className="mp-freelancer-card__rating" style={{ gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} fill={s <= Math.round(fl.rating) ? "currentColor" : "none"} style={{ opacity: s <= Math.round(fl.rating) ? 1 : 0.3, color: '#f59e0b' }} />
                      ))}
                      <span className="mp-freelancer-card__reviews" style={{ marginLeft: '4px' }}>({fl.reviews})</span>
                    </div>
                    <div className="mp-freelancer-card__price">From ${fl.price}/hr</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* ═══════════════════ TRENDING ═══════════════════ */}
        {trendingTags.length > 0 && (
          <div className="mp-section" style={{ paddingBottom: 80 }}>
            <div className="mp-container">
              <div className="mp-section-head">
                <div>
                  <div className="mp-section-tag"><Flame size={11} /> Trending</div>
                  <h2 className="mp-section-title">Related Skills in {skill.name}</h2>
                </div>
              </div>
              <div ref={trendRef} className="mp-trending-scroll">
                {trendingTags.map((tag, i) => (
                  <Link key={i} to={`/skills/${categorySlug}/${tag.toLowerCase().replace(/ /g, '-')}`} className="mp-trending-pill" style={{ textDecoration: 'none' }}>
                    <TrendingUp size={12} /> {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

          </>
        ) : (
          <div style={{ minHeight: '80vh' }} />
        )}
      </div>
      <Footer />

      {/* Stunning Glowing Page Loader Overlay */}
      {/* Stunning Glowing Page Loader Overlay (Matches Brand Light Theme) */}
      {!hideLoader && (
        <div className="skl-page-loader" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#f8fafc', // Premium clean soft off-white background
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          color: 'var(--color-primary, #042E4C)',
          fontFamily: "'Inter', sans-serif"
        }}>
          {/* Glowing Animated Circular Gradient Ring */}
          <div className="skl-loader-container" style={{ position: 'relative', width: '80px', height: '80px' }}>
            <div className="skl-loader-glow" style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(4, 46, 76, 0.15) 0%, rgba(4, 46, 76, 0) 70%)',
              filter: 'blur(10px)',
              animation: 'pulseGlow 2s ease-in-out infinite'
            }} />
            <div className="skl-loader-spinner" style={{
              width: '80px',
              height: '80px',
              border: '3px solid rgba(4, 46, 76, 0.05)',
              borderTop: '3px solid var(--color-primary, #042E4C)',
              borderRight: '3px solid var(--color-accent-dark, #8aaece)',
              borderRadius: '50%',
              animation: 'spin 1s cubic-bezier(0.5, 0.1, 0.1, 0.9) infinite'
            }} />
          </div>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'var(--color-primary, #042E4C)',
            letterSpacing: '0.03em',
            animation: 'pulseText 1.8s ease-in-out infinite',
            textAlign: 'center'
          }}>
            Loading premium workspace...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulseGlow {
              0%, 100% { transform: scale(0.9); opacity: 0.5; }
              50% { transform: scale(1.2); opacity: 0.9; }
            }
            @keyframes pulseText {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
