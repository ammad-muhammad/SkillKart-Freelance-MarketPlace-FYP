import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Testimonials.css';

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  {
    name: 'Aisha Khan',
    role: 'Frontend Developer',
    university: 'FAST NUCES, Karachi',
    avatar: 'AK',
    avatarBg: '#0a4a73',
    stars: 5,
    text: 'SkillKart\'s AI verification gave me instant credibility. Within a week of completing my profile, I landed my first $500 project. The Buddy AI literally walked me through writing my proposal!',
    earned: '$3,200',
    projects: 8,
  },
  {
    name: 'Omar Farooq',
    role: 'UI/UX Designer',
    university: 'NED University, Karachi',
    avatar: 'OF',
    avatarBg: '#276749',
    stars: 5,
    text: 'As a final year student, I was worried about competing with experienced freelancers. SkillKart\'s smart matching only showed me projects suited to my level. Game changer for students!',
    earned: '$1,800',
    projects: 5,
  },
  {
    name: 'Sara Malik',
    role: 'Content Strategist',
    university: 'IBA Karachi',
    avatar: 'SM',
    avatarBg: '#553c9a',
    stars: 5,
    text: 'The AI Profile Analyzer told me exactly what to add to my portfolio. I went from 2 profile views a week to 40+ after following its suggestions. My conversion rate tripled!',
    earned: '$2,400',
    projects: 12,
  },
  {
    name: 'Ali Hassan',
    role: 'Data Scientist',
    university: 'COMSATS, Islamabad',
    avatar: 'AH',
    avatarBg: '#c05621',
    stars: 5,
    text: 'Clients trust me more because of the verified badge. One client said they chose me specifically because my credentials were verified by AI. Worth every minute spent on setup.',
    earned: '$5,600',
    projects: 14,
  },
  {
    name: 'Zara Ahmed',
    role: 'Mobile Developer',
    university: 'LUMS, Lahore',
    avatar: 'ZA',
    avatarBg: '#c53030',
    stars: 5,
    text: 'I use Buddy AI before every proposal. It estimates the cost, suggests a timeline, and even tells me if I\'m underpricing myself. It\'s like having a mentor available 24/7.',
    earned: '$4,100',
    projects: 10,
  },
  {
    name: 'Danish Qureshi',
    role: 'SEO Specialist',
    university: 'UET, Lahore',
    avatar: 'DQ',
    avatarBg: '#1a6fa8',
    stars: 5,
    text: 'SkillKart is specifically built for students, and you can feel it. The UI is friendly, the AI is actually helpful (not just buzzwords), and the community is incredibly supportive.',
    earned: '$1,200',
    projects: 6,
  },
];

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

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headerRef.current.children,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 85%' },
        }
      );

      gsap.fromTo(colLeft.current.children,
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: colLeft.current, start: 'top 80%' },
        }
      );

      gsap.fromTo(colRight.current.children,
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: colRight.current, start: 'top 80%' },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const half = Math.ceil(TESTIMONIALS.length / 2);
  const col1 = TESTIMONIALS.slice(0, half);
  const col2 = TESTIMONIALS.slice(half);

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
                <div className="testimonials__rating-val">4.9/5</div>
              </div>
              <p className="testimonials__rating-count">Based on 2,400+ reviews</p>
            </div>
          </div>
        </div>

        {/* ── Masonry-style two-column grid ── */}
        <div className="testimonials__grid">
          <div ref={colLeft} className="testimonials__col">
            {col1.map(t => (
              <TestimonialCard key={t.name} t={t} />
            ))}
          </div>
          <div ref={colRight} className="testimonials__col testimonials__col--offset">
            {col2.map(t => (
              <TestimonialCard key={t.name} t={t} />
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
            style={{ background: t.avatarBg }}
          >
            {t.avatar}
          </div>
          <div>
            <div className="testimonial__name">{t.name}</div>
            <div className="testimonial__role">{t.role}</div>
            <div className="testimonial__uni">📍 {t.university}</div>
          </div>
        </div>
        <div className="testimonial__stats">
          <div className="testimonial__stat">
            <span className="testimonial__stat-val">{t.earned}</span>
            <span className="testimonial__stat-lbl">Earned</span>
          </div>
          <div className="testimonial__stat">
            <span className="testimonial__stat-val">{t.projects}</span>
            <span className="testimonial__stat-lbl">Projects</span>
          </div>
        </div>
      </div>
    </div>
  );
}
