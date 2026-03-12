import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Users, Star, ArrowRight, Flame, ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getCategoryBySlug } from "../../../data/categories";
import { getSkillsByCategorySlug } from "../../../data/skills";
import { getGigsByCategory } from "../../../data/gigs";
import Navbar from "../../../Components/common/Navbar/Navbar";
import Footer from "../../../Components/common/Footer/Footer";
import SkillCard from "./SkillCard";
import GigCard from "./GigCard";
import "./marketplace.css";

gsap.registerPlugin(ScrollTrigger);

const FREELANCERS_SAMPLE = [
  { name: "Alex Morgan",  title: "Full-Stack Developer", rating: 4.9, reviews: 312, price: 35, seed: "AlexMorgan"  },
  { name: "Sara Kim",     title: "UI/UX Designer",       rating: 4.9, reviews: 248, price: 45, seed: "SaraKim"    },
  { name: "James Patel",  title: "SEO Specialist",       rating: 4.8, reviews: 187, price: 25, seed: "JamesPatel" },
  { name: "Lena Rossi",   title: "Content Strategist",   rating: 4.9, reviews: 203, price: 20, seed: "LenaRossi"  },
  { name: "Omar Hassan",  title: "AI Developer",         rating: 5.0, reviews: 159, price: 75, seed: "OmarHassan" },
  { name: "Priya Nair",   title: "Brand Designer",       rating: 4.8, reviews: 294, price: 40, seed: "PriyaNair"  },
  { name: "Tom Clarke",   title: "Video Editor",         rating: 4.9, reviews: 328, price: 30, seed: "TomClarke"  },
];

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  const category = getCategoryBySlug(categorySlug);
  const skills   = getSkillsByCategorySlug(categorySlug);
  const featuredGigs = getGigsByCategory(categorySlug).slice(0, 9);

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
  }, [category]);

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

  const allTrending = skills.flatMap((s) => s.trending || []).slice(0, 20);

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
              {category.totalServices.toLocaleString()} Services Available
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
                <span className="cat-hero__stat-num">{category.totalServices.toLocaleString()}</span>
                <span className="cat-hero__stat-lbl">Total Services</span>
              </div>
              <div className="cat-hero__stat-divider" />
              <div className="cat-hero__stat">
                <span className="cat-hero__stat-num">4.8★</span>
                <span className="cat-hero__stat-lbl">Avg Rating</span>
              </div>
            </div>

            {/* Search */}
            <div className="cat-hero__search">
              <Search size={18} color="rgba(255,255,255,0.55)" style={{ flexShrink: 0 }} />
              <input
                className="cat-hero__search-input"
                placeholder={`Search in ${category.name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="cat-hero__search-btn">Search</button>
            </div>
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
                <SkillCard key={skill.id} skill={skill} categorySlug={categorySlug} />
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
            <div ref={freelanceRef} className="mp-freelancers-scroll">
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

        {/* ═══════════════════ FEATURED GIGS ═══════════════════ */}
        <div className="mp-section mp-section--alt" style={{ paddingBottom: 80 }}>
          <div className="mp-container">
            <div className="mp-section-head">
              <div>
                <div className="mp-section-tag"><Star size={11} /> Featured</div>
                <h2 className="mp-section-title">Featured Gigs in {category.name}</h2>
              </div>
              <a href="#" className="mp-view-all">
                Browse All <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
              </a>
            </div>
            <div ref={gigsRef} className="mp-gigs-grid">
              {featuredGigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </>
  );
}
