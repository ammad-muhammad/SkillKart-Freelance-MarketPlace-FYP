import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import { Star, Users, TrendingUp, Layers, SlidersHorizontal, X, ArrowRight, Flame, ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getSkillBySlug } from "../../../data/skills";
import { getCategoryBySlug } from "../../../data/categories";
import { getGigsBySkill } from "../../../data/gigs";
import Navbar from "../../../Components/common/Navbar/Navbar";
import FilterSelect from "./FilterSelect";
import Footer from "../../../Components/common/Footer/Footer";
import GigCard from "./GigCard";
import "./marketplace.css";

gsap.registerPlugin(ScrollTrigger);

const FREELANCERS_SAMPLE = [
  { name: "Alex Morgan",  title: "Expert Developer",  rating: 4.9, reviews: 312, price: 35, seed: "AlexMorgan"  },
  { name: "Sara Kim",     title: "Top Designer",      rating: 4.9, reviews: 248, price: 45, seed: "SaraKim"    },
  { name: "James Patel",  title: "Senior Specialist", rating: 4.8, reviews: 187, price: 25, seed: "JamesPatel" },
  { name: "Lena Rossi",   title: "Creative Director", rating: 4.9, reviews: 203, price: 20, seed: "LenaRossi"  },
  { name: "Omar Hassan",  title: "AI & Tech Expert",  rating: 5.0, reviews: 159, price: 75, seed: "OmarHassan" },
  { name: "Priya Nair",   title: "Brand Strategist",  rating: 4.8, reviews: 294, price: 40, seed: "PriyaNair"  },
];

export default function SkillPage() {
  const { categorySlug, skillSlug } = useParams();
  const skill    = getSkillBySlug(skillSlug);
  const category = getCategoryBySlug(categorySlug);
  const allGigs  = getGigsBySkill(skillSlug);

  const [activeSub,      setActiveSub]      = useState("all");
  const [priceFilter,    setPriceFilter]    = useState("any");
  const [deliveryFilter, setDeliveryFilter] = useState("any");
  const [ratingFilter,   setRatingFilter]   = useState("any");

  /* ── Refs ── */
  const heroRef      = useRef(null);
  const gigsRef      = useRef(null);
  const flRef        = useRef(null);
  const trendRef     = useRef(null);

  /* ── GSAP animations ── */
  useEffect(() => {
    if (!skill || !category) return;

    /* Hero entrance */
    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(".skl-hero__breadcrumb", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" })
      .fromTo(".skl-hero__title",      { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: "power4.out" }, "-=0.2")
      .fromTo(".skl-hero__desc",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.48, ease: "power3.out" }, "-=0.3")
      .fromTo(".skl-hero__stat",       { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.4, ease: "power3.out" }, "-=0.2");

    /* Scroll animations */
    const animateSection = (ref, selector) => {
      const targets = ref.current?.querySelectorAll(selector);
      if (!targets?.length) return;
      gsap.fromTo(targets,
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 82%" } }
      );
    };

    animateSection(gigsRef,  ".mp-gig-card");
    animateSection(flRef,    ".mp-freelancer-card");
    animateSection(trendRef, ".mp-trending-pill");

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, [skill, category]);

  /* ── Filtering ── */
  const filteredGigs = useMemo(() => {
    return allGigs.filter((gig) => {
      if (activeSub !== "all" && gig.subcategory !== activeSub) return false;
      if (priceFilter === "under25"  && gig.price >= 25)                     return false;
      if (priceFilter === "25-50"    && (gig.price < 25 || gig.price > 50))  return false;
      if (priceFilter === "50-100"   && (gig.price < 50 || gig.price > 100)) return false;
      if (priceFilter === "100plus"  && gig.price <= 100)                    return false;
      if (deliveryFilter === "1"     && gig.deliveryDays > 1)                return false;
      if (deliveryFilter === "3"     && gig.deliveryDays > 3)                return false;
      if (deliveryFilter === "7"     && gig.deliveryDays > 7)                return false;
      if (ratingFilter === "4.5"     && gig.rating < 4.5)                    return false;
      if (ratingFilter === "4.0"     && gig.rating < 4.0)                    return false;
      return true;
    });
  }, [allGigs, activeSub, priceFilter, deliveryFilter, ratingFilter]);

  const clearFilters = () => {
    setActiveSub("all"); setPriceFilter("any");
    setDeliveryFilter("any"); setRatingFilter("any");
  };
  const hasActiveFilters = activeSub !== "all" || priceFilter !== "any" || deliveryFilter !== "any" || ratingFilter !== "any";

  /* ── Not found ── */
  if (!skill || !category) {
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

            {/* Stats */}
            <div className="cat-hero__stats">
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">{skill.totalFreelancers.toLocaleString()}+</span>
                <span className="cat-hero__stat-lbl">Freelancers</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">{skill.totalGigs.toLocaleString()}+</span>
                <span className="cat-hero__stat-lbl">Gigs Available</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">{skill.avgRating}★</span>
                <span className="cat-hero__stat-lbl">Avg Rating</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="skl-hero__stat cat-hero__stat">
                <span className="cat-hero__stat-num">From ${skill.startingPrice}</span>
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
                      <span className="mp-subcat-card__count">{sub.count}</span>
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
                  { value: "under25", label: "Under $25"    },
                  { value: "25-50",   label: "$25 – $50"    },
                  { value: "50-100",  label: "$50 – $100"   },
                  { value: "100plus", label: "$100+"        },
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
            <div ref={gigsRef} className="mp-gigs-grid">
              {filteredGigs.length > 0 ? (
                filteredGigs.map((gig) => <GigCard key={gig.id} gig={gig} />)
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
          </div>
        </div>

        {/* ═══════════════════ FREELANCERS ═══════════════════ */}
        <div className="mp-section mp-section--alt" style={{ paddingTop: 0 }}>
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
            <div ref={flRef} className="mp-freelancers-scroll">
              {FREELANCERS_SAMPLE.map((fl) => (
                <div key={fl.seed} className="mp-freelancer-card">
                  <div className="mp-freelancer-card__avatar">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${fl.seed}`} alt={fl.name} />
                  </div>
                  <div className="mp-freelancer-card__name">{fl.name}</div>
                  <div className="mp-freelancer-card__title">{fl.title}</div>
                  <div className="mp-freelancer-card__rating">
                    <Star size={13} fill="currentColor" /> {fl.rating}
                    <span className="mp-freelancer-card__reviews">({fl.reviews})</span>
                  </div>
                  <div className="mp-freelancer-card__price">From ${fl.price}/hr</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════ TRENDING ═══════════════════ */}
        {skill.trending?.length > 0 && (
          <div className="mp-section" style={{ paddingTop: 0, paddingBottom: 80 }}>
            <div className="mp-container">
              <div className="mp-section-head">
                <div>
                  <div className="mp-section-tag"><Flame size={11} /> Trending</div>
                  <h2 className="mp-section-title">Trending Searches in {skill.name}</h2>
                </div>
              </div>
              <div ref={trendRef} className="mp-trending-scroll">
                {skill.trending.map((tag, i) => (
                  <span key={i} className="mp-trending-pill">
                    <TrendingUp size={12} /> {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </>
  );
}
