import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Search, Users, ArrowLeft, Compass, Briefcase,
  HelpCircle, ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';
import Navbar from '../../../Components/common/Navbar/Navbar';
import Footer from '../../../Components/common/Footer/Footer';
import { isMobileApp } from '../../../utils/platform';
import './NotFound.css';

const SUGGESTIONS = [
  {
    icon: Home,
    label: 'Home',
    desc: 'Return to the start & dashboard',
    to: '/'
  },
  {
    icon: Briefcase,
    label: 'Browse Projects',
    desc: 'Find freelance jobs to bid on',
    to: '/browse-projects',
    webOnly: true
  },
  {
    icon: Users,
    label: 'Find Freelancers',
    desc: 'Hire verified student specialists',
    to: '/browse-freelancers',
    webOnly: true
  },
  {
    icon: Compass,
    label: 'Marketplace Categories',
    desc: 'Explore all skills & categories',
    to: '/categories',
    webOnly: true
  }
];

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  // The route that actually 404'd
  const attempted = location.state?.from;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/browse-projects?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const mobile = isMobileApp();
  const visibleSuggestions = SUGGESTIONS.filter((s) => !s.webOnly || !mobile);

  return (
    <div className="nf-shell">
      {mobile ? (
        <header className="nf-mobile-header">
          <span>SkillKart</span>
        </header>
      ) : (
        <Navbar alwaysSticky />
      )}

      <main className="nf-main">
        {/* Soft Ambient Glows (No Blue Background!) */}
        <div className="nf-ambient-orb nf-ambient-orb--top" aria-hidden="true" />
        <div className="nf-ambient-orb nf-ambient-orb--bottom" aria-hidden="true" />

        <div className="nf-container">
          {/* Status Badge */}
          <div className="nf-badge">
            <AlertCircle size={13} className="nf-badge-icon" />
            <span>ERROR 404 • PAGE NOT FOUND</span>
          </div>

          {/* Big Modern 404 Number */}
          <div className="nf-code-display">
            <span className="nf-code-num">4</span>
            <span className="nf-code-zero">
              <span className="nf-code-zero-inner">0</span>
            </span>
            <span className="nf-code-num">4</span>
          </div>

          {/* Heading & Subtitle */}
          <h1 className="nf-title">
            This Page Seems to Have Wandered Off
          </h1>

          <p className="nf-subtitle">
            The link you followed may be broken, or the project might have already been completed and archived.
            {attempted && (
              <span className="nf-attempted-pill">
                Could not find: <code>{attempted}</code>
              </span>
            )}
          </p>

          {/* Smart In-page Search */}
          <form className="nf-search-bar" onSubmit={handleSearchSubmit}>
            <Search size={18} className="nf-search-icon" />
            <input
              type="text"
              placeholder="Search freelance jobs, gigs, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="nf-search-input"
            />
            <button type="submit" className="nf-search-btn">
              Search
            </button>
          </form>

          {/* Action Buttons */}
          <div className="nf-actions">
            <Link to="/" className="nf-btn-primary">
              <Home size={16} />
              <span>Back to Home</span>
            </Link>
            <button type="button" className="nf-btn-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              <span>Go Back</span>
            </button>
          </div>

          {/* Destination Suggestion Bento Cards */}
          <div className="nf-suggestions-wrap">
            <div className="nf-suggestions-label">
              <Sparkles size={13} style={{ color: '#10B981' }} />
              <span>POPULAR DESTINATIONS</span>
            </div>

            <div className="nf-grid">
              {visibleSuggestions.map(({ icon: Icon, label, desc, to }) => (
                <Link key={to} to={to} className="nf-card">
                  <div className="nf-card-icon-wrap">
                    <Icon size={19} />
                  </div>
                  <div className="nf-card-info">
                    <span className="nf-card-title">{label}</span>
                    <span className="nf-card-desc">{desc}</span>
                  </div>
                  <ArrowRight size={15} className="nf-card-arrow" />
                </Link>
              ))}
            </div>
          </div>

          {/* Help Center Footnote */}
          <p className="nf-footer-help">
            Need urgent assistance? Visit our <Link to="/help">Help Center</Link> or{' '}
            <Link to="/contact">Contact Support</Link>.
          </p>
        </div>
      </main>

      {!mobile && <Footer />}
    </div>
  );
}
