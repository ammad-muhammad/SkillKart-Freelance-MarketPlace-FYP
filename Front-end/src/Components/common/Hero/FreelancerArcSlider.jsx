import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Star, Bookmark, Briefcase } from 'lucide-react';
import './FreelancerArcSlider.css';

/**
 * Avatar gradient fallback palettes
 */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #10B981, #059669)',
  'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  'linear-gradient(135deg, #EC4899, #BE185D)',
  'linear-gradient(135deg, #F59E0B, #D97706)',
  'linear-gradient(135deg, #14B8A6, #0F766E)',
];

export default function FreelancerArcSlider({ freelancers = [] }) {
  const zoneRef = useRef(null);
  const cardRefs = useRef([]);
  const offsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const rafIdRef = useRef(null);
  const lastTimeRef = useRef(performance.now());

  // Image load error tracking
  const [imgErrors, setImgErrors] = useState({});

  // Dynamic geometry based on container measurement
  const [geometry, setGeometry] = useState({
    cardsCount: 28,
    cardW: 220,
    cardH: 286,
    R: 900,
    cx: 600,
    cy: 1060,
    STEP: 15,
    isMobile: false,
  });

  const SPEED = 2; // Degrees per second (~slow, fluid motion)

  // Measure container and compute full circle geometry
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const computeGeometry = () => {
      const rect = zone.getBoundingClientRect();
      const zoneW = rect.width || window.innerWidth;
      const isMobile = zoneW < 768;

      // CARD_W = clamp(200px, 12.5vw, 236px) on desktop; 150-170px on mobile
      const cardW = isMobile
        ? Math.min(Math.max(zoneW * 0.38, 150), 170)
        : Math.min(Math.max(zoneW * 0.125, 200), 236);

      const gap = isMobile ? 18 : 24;
      const cardH = cardW * 1.3;
      const R = Math.max(zoneW * 0.55, 900);

      // Crest card starts about 16px below the zone top:
      // topEdge = topPadding - cardH/2 = 16 => topPadding = cardH * 0.5 + 16
      const topPadding = cardH * 0.5 + 16;
      const cx = zoneW / 2;
      const cy = R + topPadding;
      const rawStep = ((cardW + gap) / R) * (180 / Math.PI);
      const cardsCount = Math.max(12, Math.round(360 / rawStep));
      // Exact uniform angle step: cardsCount * STEP = 360 exactly (zero seam/gap mismatch)
      const STEP = 360 / cardsCount;

      setGeometry({
        cardsCount,
        cardW,
        cardH,
        R,
        cx,
        cy,
        STEP,
        isMobile,
      });
    };

    computeGeometry();

    const resizeObserver = new ResizeObserver(() => {
      computeGeometry();
    });
    resizeObserver.observe(zone);

    window.addEventListener('resize', computeGeometry, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', computeGeometry);
    };
  }, []);

  // Update card positions directly via transform to avoid layout thrashing
  const updatePositions = () => {
    const { cardsCount, cardW, R, cx, cy, STEP } = geometry;
    const currentOffset = offsetRef.current;
    const radFactor = Math.PI / 180;
    const zoneW = cx * 2;

    for (let i = 0; i < cardsCount; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      // Range -180..180, 0 = crest
      const rawA = (i * STEP + currentOffset) % 360;
      const normA = rawA < 0 ? rawA + 360 : rawA;
      const a = normA > 180 ? normA - 360 : normA;
      const absA = Math.abs(a);

      // Only cards with |a| < 70 are displayed, and of those only the ones that
      // are actually on screen (+ one card of margin) — off-screen blurred
      // glass cards are pure GPU cost on phones.
      const rad = a * radFactor;
      const x = cx + R * Math.sin(rad);
      if (absA >= 70 || x < -cardW || x > zoneW + cardW) {
        if (el.style.display !== 'none') {
          el.style.display = 'none';
        }
      } else {
        if (el.style.display !== 'block') {
          el.style.display = 'block';
        }
        const y = cy - R * Math.cos(rad);
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${a.toFixed(2)}deg)`;
      }
    }
  };

  // Run the single requestAnimationFrame loop
  useEffect(() => {
    if (!geometry.cardsCount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      updatePositions();
      return;
    }

    let isRunning = true;
    lastTimeRef.current = performance.now();

    const loop = (currentTime) => {
      if (!isRunning) return;
      const dt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (!isPausedRef.current && dt < 0.2) {
        offsetRef.current = (offsetRef.current + SPEED * dt) % 360;
        updatePositions();
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [geometry]);

  const cardsList = useMemo(() => {
    if (!freelancers.length) return [];
    const list = [];
    for (let i = 0; i < geometry.cardsCount; i++) {
      list.push(freelancers[i % freelancers.length]);
    }
    return list;
  }, [freelancers, geometry.cardsCount]);

  const handleImageError = (id) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div
      ref={zoneRef}
      className="hero2-slider-zone"
      aria-label="Top rated freelancers"
      role="region"
    >
      {cardsList.map((freelancer, index) => {
        const initials = freelancer.name
          ? freelancer.name
              .split(' ')
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          : 'SK';

        const isImgFailed = imgErrors[freelancer.id];
        const tint = freelancer.tint || 'mint';

        return (
          <div
            key={`${freelancer.id}-${index}`}
            ref={(el) => { cardRefs.current[index] = el; }}
            className="arc-card-wrapper"
            style={{ width: `${geometry.cardW}px` }}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') isPausedRef.current = true; }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') isPausedRef.current = false; }}
          >
            {/* Inner glass shell handles hover lift/glow/scale without fighting RAF transform */}
            <article className="arc-card-glass">
              {/* Soft misty landscape cover with layered gradient & white bottom fade */}
              <div className={`arc-card__cover arc-card__cover--${tint}`}>
                {freelancer.topRated && (
                  <div className="arc-card__top-badge">
                    <Star size={9} fill="#059669" color="#059669" />
                    <span>Top Rated</span>
                  </div>
                )}
                <button
                  type="button"
                  className="arc-card__bookmark-btn"
                  aria-label="Save freelancer"
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <Bookmark size={13} />
                </button>
              </div>

              {/* Overlapping Avatar (54px circle, 3px white border, soft shadow) */}
              <div className="arc-card__avatar-box">
                <div className="arc-card__avatar-ring">
                  {!isImgFailed && freelancer.avatar ? (
                    <img
                      src={freelancer.avatar}
                      alt={freelancer.name}
                      className="arc-card__avatar-img"
                      loading="lazy"
                      onError={() => handleImageError(freelancer.id)}
                    />
                  ) : (
                    <div
                      className="arc-card__avatar-fallback"
                      style={{ background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length] }}
                    >
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="arc-card__body">
                {/* Name & Tagline */}
                <h3 className="arc-card__name" title={freelancer.name}>
                  {freelancer.name}
                </h3>
                <p className="arc-card__tagline" title={freelancer.tagline}>
                  {freelancer.tagline || 'Designing for clarity & usability'}
                </p>

                {/* Meta Row: Role + Available status (hidden on mobile if tight) */}
                <div className="arc-card__meta-row">
                  <span className="arc-card__meta-role" title={freelancer.role}>
                    <Briefcase size={11} className="arc-card__meta-icon" />
                    {freelancer.role}
                  </span>
                  <span className="arc-card__meta-status">
                    <span className={`arc-card__status-dot ${freelancer.available !== false ? 'arc-card__status-dot--on' : ''}`} />
                    {freelancer.available !== false ? 'Available now' : 'Busy'}
                  </span>
                </div>

                {/* Thin Divider */}
                <div className="arc-card__divider" />

                {/* 3-Column Stats Row with 1px vertical dividers */}
                <div className="arc-card__stats-row">
                  <div className="arc-card__stat-col">
                    <span className="arc-card__stat-val">
                      <Star size={10} fill="#F59E0B" color="#F59E0B" />
                      {freelancer.rating}
                    </span>
                    <span className="arc-card__stat-lbl">rating</span>
                  </div>
                  <div className="arc-card__stat-sep" />
                  <div className="arc-card__stat-col">
                    <span className="arc-card__stat-val">{freelancer.duration || '5 days'}</span>
                    <span className="arc-card__stat-lbl">duration</span>
                  </div>
                  <div className="arc-card__stat-sep" />
                  <div className="arc-card__stat-col">
                    <span className="arc-card__stat-val arc-card__stat-val--rate">
                      {freelancer.rate}
                    </span>
                    <span className="arc-card__stat-lbl">rate</span>
                  </div>
                </div>

                {/* Full-Width Dark Navy Pill CTA */}
                <button
                  type="button"
                  tabIndex={-1}
                  className="arc-card__cta"
                  aria-hidden="true"
                >
                  Get in touch
                </button>
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
