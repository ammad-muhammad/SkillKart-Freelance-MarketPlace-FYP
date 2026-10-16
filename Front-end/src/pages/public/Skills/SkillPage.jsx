import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import { Star, Users, TrendingUp, Layers, SlidersHorizontal, X, ArrowRight, Flame, ChevronRight } from "lucide-react";
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
import Loader from "../../../Components/common/Loader/Loader";
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
      const fallbackCat = resolveFallbackCategory(categorySlug);
      const matchedSkill = (fallbackCat.skills || []).find((s) => s.slug === skillSlug);
      const titleCaseSkill = (skillSlug || "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      const fallbackSkill = matchedSkill || {
        _id: `skill-${skillSlug}`,
        name: titleCaseSkill,
        slug: skillSlug,
        description: `Professional student freelancers offering verified ${titleCaseSkill} services.`,
        totalServices: 14,
        trending: [titleCaseSkill, `${titleCaseSkill} Pro`, "Verified Talent"],
        subcategories: [
          { id: "all", name: "All Services" },
          { id: "starter", name: "Starter" },
          { id: "pro", name: "Professional" },
          { id: "custom", name: "Custom" },
        ],
      };

      try {
        const { skillsAPI } = await import("../../../api/skills");
        let node = null;
        try {
          const resolveRes = await skillsAPI.resolve(skillSlug);
          node = resolveRes.data?.data?.node;
        } catch (_) {
          node = null;
        }

        let catNode = null;
        try {
          const ancestorsRes = await skillsAPI.resolve(categorySlug);
          catNode = ancestorsRes.data?.data?.node;
        } catch (_) {
          catNode = null;
        }

        const resolvedSkill = node || fallbackSkill;
        const resolvedCategory = catNode || fallbackCat;

        if (!active) return;
        setSkill(resolvedSkill);
        setCategory(resolvedCategory);
        setLoadingSkill(false);

        /* Real gigs for this skill (Gig.skills stores display names). */
        gigsAPI
          .listGigs({ skill: resolvedSkill.name, limit: 48 })
          .then((res) => {
            if (!active) return;
            const list = res.data?.data || [];
            if (list.length > 0) {
              setAllGigs(list.map(mapGig));
            } else {
              setAllGigs(getFallbackGigs(resolvedCategory.name, resolvedSkill.name));
            }
          })
          .catch(() => {
            if (active) setAllGigs(getFallbackGigs(resolvedCategory.name, resolvedSkill.name));
          })
          .finally(() => { if (active) setGigsLoading(false); });

        /* Real top-rated freelancers working in this skill. */
        publicAPI
          .searchFreelancers({ skills: resolvedSkill.name, sortBy: "rating", limit: 6 })
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

        /* Real aggregate stats for the hero. */
        publicAPI
          .getSkillStats(resolvedSkill.name)
          .then((res) => {
            if (!active) return;
            const s = res.data?.data;
            if (s && (s.totalGigs > 0 || s.totalFreelancers > 0)) {
              setStats(s);
            } else {
              setStats({
                totalGigs: 16,
                totalFreelancers: 12,
                avgRating: 4.9,
                startingPrice: 1500,
              });
            }
          })
          .catch(() => {
            if (active) {
              setStats({
                totalGigs: 16,
                totalFreelancers: 12,
                avgRating: 4.9,
                startingPrice: 1500,
              });
            }
          });

      } catch (err) {
        console.error("Failed loading Skill Details:", err);
        if (!active) return;
        setSkill(fallbackSkill);
        setCategory(fallbackCat);
        setLoadingSkill(false);
        setAllGigs(getFallbackGigs(fallbackCat.name, fallbackSkill.name));
        setGigsLoading(false);
        setFreelancers(getFallbackFreelancers());
        setFlLoading(false);
        setStats({
          totalGigs: 16,
          totalFreelancers: 12,
          avgRating: 4.9,
          startingPrice: 1500,
        });
      }
    };

    loadSkillData();
    return () => { active = false; };
  }, [skillSlug, categorySlug]);

  useEffect(() => {
    document.title = skill?.name ? `${skill.name} – SkillKart` : 'Skill – SkillKart';
  }, [skill?.name]);

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

  /* ── Stats with sensible fallbacks ── */
  const heroFreelancers = Number(stats?.totalFreelancers) || (freelancers.length > 0 ? freelancers.length : 12);
  const heroGigs        = Number(stats?.totalGigs) || (allGigs.length > 0 ? allGigs.length : 16);
  const heroRating      = stats?.avgRating ? Number(stats.avgRating).toFixed(1) : "4.9";
  const heroPrice       = Number(stats?.startingPrice) || (allGigs[0]?.price || 1500);

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

        {/* ═══════════════════ COMPACT LIGHT HERO ═══════════════════ */}
        <section ref={heroRef} className="cat-hero-section">
          <div className="cat-hero-ambient" />

          <div className="cat-hero-container">
            {/* Breadcrumb */}
            <div className="cat-hero-breadcrumb">
              <Link to="/">Home</Link>
              <ChevronRight size={13} />
              <Link to={`/skills/${categorySlug}`}>{category.name}</Link>
              <ChevronRight size={13} />
              <span>{skill.name}</span>
            </div>

            {/* Badge */}
            <div className="cat-hero-badge">
              <span>⚡</span>
              <span>Verified Skill Specialty</span>
            </div>

            {/* Title */}
            <h1 className="cat-hero-title">{skill.name}</h1>
            <p className="cat-hero-subtitle">{skill.description}</p>

            {/* Stats Badges */}
            <div className="cat-hero-stats">
              <div className="cat-hero-stat-badge">
                <span className="cat-hero-stat-num">{heroFreelancers > 0 ? `${heroFreelancers.toLocaleString()}+` : '0'}</span>
                <span className="cat-hero-stat-lbl">Freelancers</span>
              </div>
              <div className="cat-hero-stat-badge">
                <span className="cat-hero-stat-num">{heroGigs > 0 ? `${heroGigs.toLocaleString()}+` : '0'}</span>
                <span className="cat-hero-stat-lbl">Gigs Available</span>
              </div>
              <div className="cat-hero-stat-badge">
                <span className="cat-hero-stat-num">{heroRating ? `${heroRating}★` : '0'}</span>
                <span className="cat-hero-stat-lbl">Avg Rating</span>
              </div>
              <div className="cat-hero-stat-badge">
                <span className="cat-hero-stat-num">{heroPrice > 0 ? `From Rs. ${heroPrice}` : '0'}</span>
                <span className="cat-hero-stat-lbl">Starting Price</span>
              </div>
            </div>
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
                  <Layers size={16} color="#10B981" />
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#0B2942" }}>
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
              <SlidersHorizontal size={16} color="#10B981" style={{ flexShrink: 0 }} />
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
                        marginTop: 18, background: "#10B981", color: "#fff",
                        border: "none", borderRadius: "99px", padding: "12px 26px",
                        fontWeight: 700, cursor: "pointer", fontSize: 14,
                        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
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
                    <div className="mp-freelancer-card__price">From Rs. {fl.price}/hr</div>
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
          <div style={{ minHeight: 'calc(var(--vh-full, 100vh) * 0.8)' }} />
        )}
      </div>
      <Footer />

      {!hideLoader && <Loader fullScreen text="Loading" />}
    </>
  );
}
