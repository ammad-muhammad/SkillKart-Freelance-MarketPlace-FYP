import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { testimonialsAPI } from '../../../api/testimonials';
import './Testimonials.css';

gsap.registerPlugin(ScrollTrigger);

const AVATAR_BGS = ['#0a4a73', '#276749', '#553c9a', '#c05621', '#c53030', '#1a6fa8'];

// Map a REAL submitted testimonial (with its author's profile data) into the
// card shape. These are genuine stories written by freelancers — no fake data.
const mapTestimonial = (t, i) => {
  const initials = (t.name || 'F').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return {
    id: t.id || `${t.name}-${i}`,
    name: t.name,
    role: t.role || 'Freelancer',
    avatar: initials,
    avatarUrl: t.avatarUrl || null,
    avatarBg: AVATAR_BGS[i % AVATAR_BGS.length],
    stars: Math.max(1, Math.min(5, Math.round(t.rating || 5))),
    text: t.text,
    earned: t.totalEarnings ? `$${Number(t.totalEarnings).toLocaleString()}` : null,
    projects: t.completedProjects || 0,
  };
};

function StarRating({ count }) {
  return (
    <div className="testimonial__stars">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="testimonial__star">★</span>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const colLeft = useRef(null);
  const colRight = useRef(null);
  // Only real, freelancer-submitted (approved) testimonials. No fake data —
  // the section hides entirely until at least one real story exists.
  const [stories, setStories] = useState(null); // null = loading

  useEffect(() => {
    let active = true;
    testimonialsAPI.getPublic(6)
      .then((res) => {
        if (!active) return;
        const list = res.data?.data?.testimonials || [];
        setStories(list.map(mapTestimonial));
      })
      .catch(() => { if (active) setStories([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    // Only animate once real stories have rendered (refs exist).
    if (!stories || stories.length === 0) return undefined;
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(headerRef.current.children,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: headerRef.current, start: 'top 85%' } }
        );
      }
      [colLeft, colRight].forEach((ref) => {
        if (ref.current) {
          gsap.fromTo(ref.current.children,
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.15, duration: 0.6, ease: 'power3.out',
              scrollTrigger: { trigger: ref.current, start: 'top 80%' } }
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [stories]);

  // No real stories yet → hide the entire section (no fake data).
  if (!stories || stories.length === 0) return null;

  const half = Math.ceil(stories.length / 2);
  const col1 = stories.slice(0, half);
  const col2 = stories.slice(half);
  const avgRating = (stories.reduce((s, t) => s + (t.stars || 5), 0) / stories.length).toFixed(1);

  return (
    <section ref={sectionRef} className="testimonials">
      <div className="container">
        <div ref={headerRef} className="testimonials__header">
          <div className="section-tag">
            <span>💬</span> Success Stories
          </div>
          <div className="testimonials__header-row">
            <div>
              <h2 className="section-title">
                Students Who <span className="testimonials__highlight">Changed</span> Their Life
              </h2>
              <p className="section-subtitle">
                Real stories from real students who turned their skills into income on SkillKart.
              </p>
            </div>
            <div className="testimonials__summary">
              <div className="testimonials__rating">
                <div className="testimonials__rating-stars">★★★★★</div>
                <div className="testimonials__rating-val">{avgRating}/5</div>
              </div>
              <p className="testimonials__rating-count">From {stories.length} student stor{stories.length === 1 ? 'y' : 'ies'}</p>
            </div>
          </div>
        </div>

        {/* ── Masonry-style two-column grid ── */}
        <div className="testimonials__grid">
          <div ref={colLeft} className="testimonials__col">
            {col1.map(t => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
          <div ref={colRight} className="testimonials__col testimonials__col--offset">
            {col2.map(t => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t }) {
  return (
    <div className="testimonial__card">
      <div className="testimonial__card-top">
        <StarRating count={t.stars} />
        <span className="testimonial__verified">✓ Verified Student</span>
      </div>
      <p className="testimonial__text">"{t.text}"</p>
      <div className="testimonial__card-footer">
        <div className="testimonial__author">
          <div
            className="testimonial__avatar"
            style={{ background: t.avatarBg, overflow: 'hidden' }}
          >
            {t.avatarUrl
              ? <img src={t.avatarUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : t.avatar}
          </div>
          <div>
            <div className="testimonial__name">{t.name}</div>
            <div className="testimonial__role">{t.role}</div>
          </div>
        </div>
        {(t.earned || t.projects > 0) && (
          <div className="testimonial__stats">
            {t.earned && (
              <div className="testimonial__stat">
                <span className="testimonial__stat-val">{t.earned}</span>
                <span className="testimonial__stat-lbl">Earned</span>
              </div>
            )}
            {t.projects > 0 && (
              <div className="testimonial__stat">
                <span className="testimonial__stat-val">{t.projects}</span>
                <span className="testimonial__stat-lbl">Projects</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
