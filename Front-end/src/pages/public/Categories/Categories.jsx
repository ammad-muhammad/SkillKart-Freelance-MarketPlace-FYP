import { useRef, useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Briefcase, TrendingUp, Users, ArrowRight, Sparkles, Layers, ShieldCheck, X } from "lucide-react";
import { publicAPI } from "../../../api/publicData";
import { CATEGORY_CATALOG } from "../../../utils/categoryMarketplaceData";
import Navbar from "../../../Components/common/Navbar/Navbar";
import Footer from "../../../Components/common/Footer/Footer";
import Skeleton from "../../../Components/common/Skeleton/Skeleton";
import "./Categories.css";

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const getFallbackList = () => {
    return Object.entries(CATEGORY_CATALOG).map(([slug, data], index) => ({
      id: index + 1,
      name: data.name,
      slug: slug,
      description: data.description,
      icon: data.icon || '💼',
      totalServices: 24 + ((index * 3) % 18),
      isLiveCount: false,
    }));
  };

  useEffect(() => {
    let active = true;
    publicAPI.getCategories()
      .then((res) => {
        if (!active) return;
        const live = res.data?.data?.categories || [];
        if (live.length > 0) {
          setCategories(live.map((c, index) => ({
            id: index + 1,
            name: c.name,
            slug: c.slug,
            description: c.description || `Explore professional student portfolios and gigs matching ${c.name}.`,
            icon: c.icon || '💼',
            totalServices: c.totalServices || 14 + (index % 12),
            isLiveCount: true
          })));
        } else {
          setCategories(getFallbackList());
        }
      })
      .catch(() => {
        if (active) setCategories(getFallbackList());
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Explore Marketplace Categories — SkillKart";
  }, []);

  // Filter categories dynamically by search input
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase().trim();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  }, [categories, search]);

  const totalGigsCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.totalServices || 0), 0);
  }, [categories]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/browse-projects?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="cats-page-shell">
      <Navbar />

      {/* ── 1) COMPACT LIGHT HERO SECTION ── */}
      <section className="cats-hero-section">
        <div className="cats-hero-ambient" />

        <div className="cats-hero-container">
          <div className="cats-hero-badge">
            <Sparkles size={13} className="cats-hero-badge-icon" />
            <span>DISCOVER SKILLKART TALENT DOMAINS</span>
          </div>

          <h1 className="cats-hero-title">
            Explore All <span>Marketplace Categories</span>
          </h1>

          <p className="cats-hero-subtitle">
            Connect with verified student specialists and professional services across dozens of domains.
            Curated and quality-screened.
          </p>

          {/* Unified Search Input Box */}
          <form className="cats-search-pill" onSubmit={onSearchSubmit}>
            <div className="cats-search-input-wrap">
              <Search size={17} className="cats-search-icon" />
              <input
                id="cats-search-input"
                type="text"
                placeholder="Search across all categories, skills, or domains..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="cats-search-clear"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button type="submit" className="cats-search-btn">
              <span>Find Work</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Live Stats Row */}
          <div className="cats-hero-stats-row">
            <div className="cats-hero-stat-badge">
              <Layers size={12} className="cats-stat-icon" />
              <span>{categories.length > 0 ? `${categories.length} Specialized Sectors` : "40+ Sectors"}</span>
            </div>
            <div className="cats-hero-stat-badge">
              <Briefcase size={12} className="cats-stat-icon" />
              <span>{totalGigsCount > 0 ? `${totalGigsCount.toLocaleString()}+ Services` : "500+ Services"}</span>
            </div>
            <div className="cats-hero-stat-badge">
              <ShieldCheck size={12} className="cats-stat-icon" />
              <span>100% Escrow Milestone Protected</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2) MAIN CATEGORIES GRID ── */}
      <main className="cats-main-section">
        <div className="cats-container-1280">

          <div className="cats-section-head">
            <div className="cats-head-left">
              <div className="cats-head-eyebrow">
                <Briefcase size={13} />
                <span>ALL SERVICE DOMAINS</span>
              </div>
              <h2 className="cats-head-title">
                {search.trim() ? `Search Results for "${search}"` : "Browse by Main Sector"}
              </h2>
            </div>
            <span className="cats-head-count">
              Showing <strong>{filteredCategories.length}</strong> of <strong>{categories.length}</strong> categories
            </span>
          </div>

          <div className="cats-grid-cards">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="cats-skeleton-card">
                  <div className="cats-skel-icon" />
                  <div className="cats-skel-line cats-skel-line--title" />
                  <div className="cats-skel-line cats-skel-line--desc" />
                  <div className="cats-skel-footer">
                    <div className="cats-skel-line cats-skel-line--count" />
                    <div className="cats-skel-circle" />
                  </div>
                </div>
              ))
            ) : loadError ? (
              <div className="cats-empty-state">
                <p>Couldn't load categories right now. Please refresh the page to try again.</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="cats-empty-state">
                <div className="cats-empty-icon">🔍</div>
                <h3>No categories found matching "{search}"</h3>
                <p>Try searching with another keyword or explore all categories.</p>
                <button type="button" className="cats-reset-btn" onClick={() => setSearch("")}>
                  Reset Search
                </button>
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <Link key={cat.id} to={`/skills/${cat.slug}`} className="cats-bento-card">
                  <div className="cats-bento-top">
                    <div className="cats-bento-icon-box">
                      <span className="cats-bento-emoji">{cat.icon}</span>
                    </div>
                    <span className="cats-bento-gigs-pill">
                      {cat.totalServices} {cat.totalServices === 1 ? 'service' : 'services'}
                    </span>
                  </div>

                  <div className="cats-bento-body">
                    <h3 className="cats-bento-title">{cat.name}</h3>
                    <p className="cats-bento-desc">{cat.description}</p>
                  </div>

                  <div className="cats-bento-footer">
                    <span className="cats-bento-cta">
                      <span>Explore Skills</span>
                      <ArrowRight size={14} className="cats-arrow-icon" />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

        </div>
      </main>

      {/* ── 3) TRENDING AI ASSISTANCE BANNER ── */}
      <section className="cats-ai-banner-section">
        <div className="cats-container-1280">
          <div className="cats-ai-banner-card">
            <div className="cats-ai-banner-left">
              <div className="cats-ai-pill">
                <TrendingUp size={13} />
                <span>AI TALENT SCOUT</span>
              </div>
              <h2 className="cats-ai-title">Can't decide which category fits your project?</h2>
              <p className="cats-ai-desc">
                Chat with Buddy AI to describe your idea in natural language. Our AI will automatically break down the skills needed, recommend ideal categories, and match top freelancers.
              </p>
              <div className="cats-ai-actions">
                <Link to="/ai/buddy" className="cats-btn-primary">
                  <span>Talk to AI Buddy</span>
                  <ArrowRight size={15} />
                </Link>
                <Link to="/post-project" className="cats-btn-secondary">
                  Post a Project
                </Link>
              </div>
            </div>

            <div className="cats-ai-visual-wrap">
              <div className="cats-ai-visual-circle">
                <div className="cats-ai-robot-icon">🤖</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
