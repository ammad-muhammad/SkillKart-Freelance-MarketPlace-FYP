import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Check,
  Zap,
  Star,
} from 'lucide-react';
import { STUDENT_JOURNEYS, formatCurrency } from './testimonialsData';
import './Testimonials.css';

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRippleActive, setIsRippleActive] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [autoplayReady, setAutoplayReady] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(STUDENT_JOURNEYS[0].earnings);
  const [statSuccessRate, setStatSuccessRate] = useState(0);
  const [statProjectsDone, setStatProjectsDone] = useState(0);
  const [paths, setPaths] = useState([]);
  const [redrawKey, setRedrawKey] = useState(0);
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const anchorRef = useRef(null);
  const slotCardRefs = useRef([]);
  const timerRef = useRef(null);
  const touchStartXRef = useRef(0);

  const totalStudents = STUDENT_JOURNEYS.length;
  const currentStudent = STUDENT_JOURNEYS[currentIndex];

  // The 3 next students in the right column
  const visibleNodes = [
    STUDENT_JOURNEYS[(currentIndex + 1) % totalStudents],
    STUDENT_JOURNEYS[(currentIndex + 2) % totalStudents],
    STUDENT_JOURNEYS[(currentIndex + 3) % totalStudents],
  ];

  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Helper for numeric count-up animation
  const animateCountUp = useCallback((start, end, duration, setter) => {
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setter(Math.round(start + (end - start) * ease));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, []);

  // Compute SVG connectors endpoints from DOM bounding client rects
  const computeConnectors = useCallback(() => {
    if (!canvasRef.current || !anchorRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const anchorRect = anchorRef.current.getBoundingClientRect();

    // Start point at fork anchor (right of name block, vertical center of avatar)
    const sx = anchorRect.left + anchorRect.width / 2 - canvasRect.left;
    const sy = anchorRect.top + anchorRect.height / 2 - canvasRect.top;

    const newPaths = [];
    [0, 1, 2].forEach((slotIndex) => {
      const cardEl = slotCardRefs.current[slotIndex];
      if (!cardEl) return;
      const cardRect = cardEl.getBoundingClientRect();

      // End point at the LEFT-MIDDLE edge of each card (tucks under card border)
      const ex = cardRect.left - canvasRect.left + 6;
      const ey = cardRect.top + cardRect.height / 2 - canvasRect.top;
      const dx = ex - sx;

      // 3 smooth S-curves (cubic bezier)
      const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${(sx + dx * 0.5).toFixed(1)} ${sy.toFixed(1)}, ${(ex - dx * 0.5).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      newPaths.push({ d, sx, sy, ex, ey, slotIndex });
    });

    if (newPaths.length > 0) {
      setPaths(newPaths);
    }
  }, []);

  // Slide navigation with sleek stagger animation
  const goToSlide = useCallback((newIndex) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (!prefersReducedMotion) {
      setIsRippleActive(true);
      setTimeout(() => setIsRippleActive(false), 700);
    }

    const prevAmt = STUDENT_JOURNEYS[currentIndex].earnings;
    const nextAmt = STUDENT_JOURNEYS[newIndex].earnings;

    setCurrentIndex(newIndex);

    // Count earnings from previous number to new one
    if (!prefersReducedMotion) {
      const duration = 650;
      const startTime = performance.now();
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setDisplayAmount(prevAmt + (nextAmt - prevAmt) * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    } else {
      setDisplayAmount(nextAmt);
    }

    // Connectors re-draw cleanly as nodes settle
    setTimeout(() => {
      setRedrawKey((k) => k + 1);
      computeConnectors();
    }, 280);

    setTimeout(() => {
      setIsTransitioning(false);
      computeConnectors();
    }, 550);
  }, [isTransitioning, currentIndex, prefersReducedMotion, computeConnectors]);

  const handleNext = useCallback(() => {
    goToSlide((currentIndex + 1) % totalStudents);
  }, [currentIndex, totalStudents, goToSlide]);

  const handlePrev = useCallback(() => {
    goToSlide((currentIndex - 1 + totalStudents) % totalStudents);
  }, [currentIndex, totalStudents, goToSlide]);

  // Click on node card makes that student the spotlight
  const handleNodeClick = (studentId) => {
    const targetIdx = STUDENT_JOURNEYS.findIndex((s) => s.id === studentId);
    if (targetIdx !== -1 && targetIdx !== currentIndex) {
      goToSlide(targetIdx);
    }
  };

  // Entrance Observer (triggers when section is 20% in view)
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsEntered(true);
      setAutoplayReady(true);
      setStatSuccessRate(88);
      setStatProjectsDone(190);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsEntered(true);
          observer.disconnect();

          // Count up bottom stats at 800ms
          setTimeout(() => {
            animateCountUp(0, 88, 900, setStatSuccessRate);
            animateCountUp(0, 190, 900, setStatProjectsDone);
          }, 800);

          // Autoplay starts 1.5s after entrance
          setTimeout(() => {
            setAutoplayReady(true);
          }, 1500);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [prefersReducedMotion, animateCountUp]);

  // Autoplay Timer (5000ms infinite loop)
  useEffect(() => {
    if (prefersReducedMotion || !autoplayReady || isPaused) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(timerRef.current);
  }, [autoplayReady, isPaused, handleNext, prefersReducedMotion]);

  // Pause when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else if (!prefersReducedMotion) {
        setIsPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [prefersReducedMotion]);

  // Recompute connectors on mount, font ready, resize
  useEffect(() => {
    computeConnectors();

    const ro = new ResizeObserver(() => {
      computeConnectors();
    });
    if (canvasRef.current) {
      ro.observe(canvasRef.current);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        computeConnectors();
      });
    }

    const t1 = setTimeout(computeConnectors, 100);
    const t2 = setTimeout(computeConnectors, 300);
    const t3 = setTimeout(computeConnectors, 600);

    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [computeConnectors, currentIndex]);

  // Keyboard navigation Left / Right
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  // Touch / pointer swipe handling (threshold 50px)
  const handlePointerDown = (e) => {
    setIsPaused(true);
    touchStartXRef.current = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
  };

  const handlePointerUp = (e) => {
    setIsPaused(false);
    const endX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
    const diff = endX - touchStartXRef.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  return (
    <section
      ref={sectionRef}
      className={`testi-section ${isEntered ? 'is-entered' : ''}`}
      id="success-stories"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => !prefersReducedMotion && setIsPaused(true)}
      onMouseLeave={() => !prefersReducedMotion && setIsPaused(false)}
      onFocus={() => !prefersReducedMotion && setIsPaused(true)}
      onBlur={() => !prefersReducedMotion && setIsPaused(false)}
    >
      <div className="testi-container">
        {/* ── 1) Header Row (Tight & Compact) ── */}
        <div className="testi-header-row">
          <div className="testi-header-left">
            {/* Pill badge "SUCCESS STORIES" */}
            <div className="testi-badge-pill">
              <svg
                className="testi-badge-trophy"
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 21h8m-4-4v4M5 4h14v4a7 7 0 01-14 0V4zM5 6H3a2 2 0 00-2 2v1a4 4 0 004 4h0M19 6h2a2 2 0 012 2v1a4 4 0 01-4 4h0"
                  stroke="#D97706"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>SUCCESS STORIES</span>
            </div>

            {/* H2 Title */}
            <h2 className="testi-main-heading">
              Students Who{' '}
              <span className="testi-heading-gradient">Changed Their Life</span>
            </h2>

            {/* Subtitle */}
            <p className="testi-subheading">
              Authentic milestones of student freelancers who turned skills into income on SkillKart.
            </p>
          </div>

          {/* Right: Rating Card */}
          <div className="testi-rating-box">
            <div className="testi-rating-score-row">
              <Star
                size={18}
                className="testi-star-icon"
                fill="#F59E0B"
                color="#F59E0B"
                aria-hidden="true"
              />
              <span className="testi-rating-big">4.9</span>
              <span className="testi-rating-denom">/5.0</span>
            </div>
            <span className="testi-rating-caption">Rated by 6,200+ clients</span>
          </div>
        </div>

        {/* Thin divider */}
        <div className="testi-header-divider" />

        {/* ── 2) Canvas Title ── */}
        <div className="testi-canvas-header">
          <h3 className="testi-canvas-title">Life-Changing Journey Orbit</h3>
        </div>

        {/* ── 3) Canvas Grid (Compact & Perfectly Contained) ── */}
        <div
          className="testi-canvas"
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {/* ── SVG Connectors Overlay ── */}
          <svg className="testi-connectors-svg" aria-hidden="true">
            <defs>
              <linearGradient id="connectorStandardGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#2DD4BF" />
              </linearGradient>
              <linearGradient id="connectorMiddleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5EEAD4" />
                <stop offset="100%" stopColor="#2DD4BF" />
              </linearGradient>
              <filter id="connectorGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="rgba(52, 211, 153, 0.45)" />
              </filter>
            </defs>

            {paths.map((p) => {
              const isHovered = hoveredSlot === p.slotIndex;
              const isOtherHovered = hoveredSlot !== null && !isHovered;
              const strokeColor =
                p.slotIndex === 1 ? 'url(#connectorMiddleGrad)' : 'url(#connectorStandardGrad)';

              return (
                <g
                  key={`path-group-${p.slotIndex}-${redrawKey}`}
                  className={`testi-connector-group ${isHovered ? 'active' : ''} ${isOtherHovered ? 'dimmed' : ''}`}
                >
                  <path
                    d={p.d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    pathLength="1"
                    filter="url(#connectorGlowFilter)"
                    className="testi-connector-line"
                  />
                  <circle cx={p.sx} cy={p.sy} r="3.5" fill="#34D399" />
                </g>
              );
            })}
          </svg>

          {/* ════ LEFT COLUMN: Spotlight ════ */}
          <div
            className={`testi-spotlight-col ${isTransitioning ? 'testi-spotlight--transitioning' : ''}`}
            aria-live="polite"
          >
            {/* Label "Spotlight Node" */}
            <div className="testi-spotlight-node-label">Spotlight Node</div>

            {/* Orbit Center Stage */}
            <div className="testi-avatar-orbit-stage">
              {/* Concentric Dashed Rings & Mint Glow */}
              <div className="testi-rings-container" aria-hidden="true">
                <div className="testi-mint-glow" />

                <svg className="testi-rings-svg" viewBox="0 0 460 460" aria-hidden="true">
                  <circle
                    className="testi-svg-ring testi-svg-ring--inner"
                    cx="230"
                    cy="230"
                    r="105"
                    fill="none"
                    stroke="rgba(16, 185, 129, 0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="5 10"
                  />
                  <circle
                    className="testi-svg-ring testi-svg-ring--mid"
                    cx="230"
                    cy="230"
                    r="155"
                    fill="none"
                    stroke="rgba(16, 185, 129, 0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="5 10"
                  />
                  <circle
                    className="testi-svg-ring testi-svg-ring--outer"
                    cx="230"
                    cy="230"
                    r="210"
                    fill="none"
                    stroke="rgba(16, 185, 129, 0.22)"
                    strokeWidth="1.5"
                    strokeDasharray="5 10"
                  />
                </svg>

                {/* 3 small orbiting green dots */}
                <div className="testi-orbit-orb testi-orbit-orb--1" />
                <div className="testi-orbit-orb testi-orbit-orb--2" />
                <div className="testi-orbit-orb testi-orbit-orb--3" />
              </div>

              {/* Avatar Anchor Box */}
              <div className="testi-avatar-anchor-box">
                {isRippleActive && !prefersReducedMotion && (
                  <div className="testi-avatar-ripple" aria-hidden="true" />
                )}

                {/* Visual Timer Progress Ring */}
                <svg
                  className="testi-timer-svg"
                  viewBox="0 0 140 140"
                  aria-hidden="true"
                  key={`timer-${currentIndex}-${isPaused}`}
                >
                  <circle
                    className={`testi-timer-track ${!isPaused && autoplayReady && !prefersReducedMotion ? 'testi-timer-track--active' : ''}`}
                    cx="70"
                    cy="70"
                    r="64"
                  />
                </svg>

                {/* Avatar Frame: 110px */}
                <div className="testi-avatar-frame">
                  {currentStudent.avatar ? (
                    <img
                      key={currentStudent.id}
                      src={currentStudent.avatar}
                      alt={currentStudent.name}
                      className="testi-avatar-photo"
                    />
                  ) : (
                    <div className="testi-avatar-initials">
                      {currentStudent.initials || currentStudent.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Floating Chips */}
                <div className="testi-chip testi-chip--verified-top" aria-hidden="true">
                  <span className="testi-chip-check-circle">
                    <Check size={9} strokeWidth={3} color="#FFFFFF" />
                  </span>
                  <span>Verified</span>
                </div>

                <div className="testi-chip testi-chip--response-left" aria-hidden="true">
                  <Zap size={11} fill="#F59E0B" color="#F59E0B" className="testi-chip-bolt" />
                  <span>{currentStudent.responseTime || '24h response'}</span>
                </div>

                <div className="testi-chip testi-chip--verified-bottom" aria-hidden="true">
                  <span className="testi-chip-check-circle">
                    <Check size={9} strokeWidth={3} color="#FFFFFF" />
                  </span>
                  <span>Verified</span>
                </div>
              </div>

              {/* Name block to the RIGHT of avatar */}
              <div className="testi-name-block">
                <div className="testi-student-name">{currentStudent.name}</div>
                <div className="testi-student-tag">#{currentIndex + 1} Highlighted</div>
              </div>

              {/* Fork anchor ref */}
              <div className="testi-fork-anchor" ref={anchorRef} />
            </div>

            {/* ── Mint Glow Quote Section (Directly under avatar, tightly pulled up) ── */}
            <div className="testi-direct-quote-row">
              <div className="testi-quote-cloud-glow" aria-hidden="true" />

              {/* Line 1: NAME • Rs. amount Projects */}
              <div className="testi-spotlight-quote-headline">
                <span className="testi-headline-name">{currentStudent.name.toUpperCase()}</span>
                <span className="testi-headline-bullet">•</span>
                <span className="testi-headline-amount">
                  Rs. {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayAmount)}
                </span>
                <span className="testi-headline-projects">{currentStudent.projectsLabel || 'Projects'}</span>
              </div>

              {/* Line 2: Italic quote with guaranteed clean word spacing */}
              <p className="testi-direct-quote-text">
                “
                {currentStudent.quote.split(' ').map((word, wIdx) => (
                  <span
                    key={`${currentStudent.id}-word-${wIdx}-${redrawKey}`}
                    className="testi-quote-word"
                    style={{ animationDelay: `${wIdx * 20}ms` }}
                  >
                    {word}
                  </span>
                ))}
                ”
              </p>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: 3 Clean Staggered Cards (No ghost cards, no clipping!) ════ */}
          <div className="testi-nodes-col">
            {visibleNodes.map((node, slot) => {
              const colonIdx = node.caption.indexOf(':');
              const authorPart = colonIdx !== -1 ? node.caption.substring(0, colonIdx + 1) : `${node.name}:`;
              const bodyPart = colonIdx !== -1 ? node.caption.substring(colonIdx + 1) : ` ${node.caption}`;

              return (
                <div
                  key={`node-row-${node.id}-${currentIndex}`}
                  className="testi-node-row"
                  style={{ animationDelay: `${slot * 60}ms` }}
                >
                  {/* Column 1: Pill Card Button + Amount Pill */}
                  <div className="testi-node-card-col">
                    {/* Floating Amount Pill + Extras (Sits strictly above card top edge) */}
                    <div className="testi-floating-amount-group">
                      <div className="testi-amount-edge-dot" aria-hidden="true" />
                      <div className="testi-amount-pill-white">
                        <span>{formatCurrency(node.earnings)}</span>
                      </div>

                      {node.stars && (
                        <div className="testi-node-stars" aria-label="5 stars rating">
                          {[...Array(5)].map((_, sIdx) => (
                            <Star
                              key={sIdx}
                              size={12}
                              fill="#F59E0B"
                              color="#F59E0B"
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      )}

                      {node.available && (
                        <div className="testi-node-badge-available">Available now</div>
                      )}

                      {node.ticks && (
                        <div className="testi-node-ruler-ticks" aria-hidden="true">
                          | | | | | | | |
                        </div>
                      )}
                    </div>

                    {/* White Pill Card Button */}
                    <button
                      type="button"
                      className="testi-node-card-btn"
                      ref={(el) => (slotCardRefs.current[slot] = el)}
                      onClick={() => handleNodeClick(node.id)}
                      onMouseEnter={() => setHoveredSlot(slot)}
                      onMouseLeave={() => setHoveredSlot(null)}
                      aria-label={`View story of ${node.name}`}
                    >
                      {node.avatar ? (
                        <img
                          src={node.avatar}
                          alt={node.name}
                          className="testi-node-avatar-img"
                        />
                      ) : (
                        <div className="testi-node-avatar-initials">
                          {node.initials || node.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="testi-node-meta-box">
                        <div className="testi-node-name-text">{node.name}</div>
                        <div className="testi-node-role-text">{node.role}</div>
                      </div>
                    </button>
                  </div>

                  {/* Column 2: Caption to the RIGHT of card */}
                  <div className="testi-node-caption-col">
                    <p className="testi-node-caption-text">
                      <strong className="testi-caption-author">{authorPart}</strong>
                      {bodyPart}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4) Bottom Bar (Tightly pulled up, cleared from Buddy AI chatbot) ── */}
        <div className="testi-bottom-bar">
          <div className="testi-bottom-stats-left">
            <span className="testi-stat-number">
              <span className="tabular-nums">{statSuccessRate}%</span> success rate
            </span>
            <span className="testi-stat-vbar" aria-hidden="true" />
            <span className="testi-stat-number">
              <span className="tabular-nums">{statProjectsDone}+</span> Projects done
            </span>
          </div>

          <div className="testi-bottom-controls-right">
            <span className="testi-swipe-text">Swipe 140+ student Journeys</span>

            <div className="testi-arrow-group">
              <button
                type="button"
                className="testi-circle-arrow-btn"
                onClick={handlePrev}
                aria-label="Previous student journey"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                className="testi-circle-arrow-btn"
                onClick={handleNext}
                aria-label="Next student journey"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <Link to="/about" className="testi-cta-green-pill">
              <span>View All Journeys</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
