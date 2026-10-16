import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useInView } from './Reveal';

/* ── Inline SVG Sparkline ── */
const Sparkline = ({ data = [], color = '#10B981' }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 72;
  const h = 26;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - ((val - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ── Number Count-Up Hook triggering on InView / Data Arrival ── */
export const useCountUp = (target, startCounting = true, duration = 800) => {
  const num = typeof target === 'number'
    ? target
    : (parseFloat(String(target || 0).replace(/[^0-9.-]/g, '')) || 0);

  const [val, setVal] = useState(num);

  useEffect(() => {
    // If target is 0 or counting is disabled, show the real num directly
    if (!startCounting || num === 0) {
      setVal(num);
      return;
    }

    // Respect user's reduced-motion preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(num);
      return;
    }

    let frameId;
    const startTime = performance.now();
    const startVal = 0;

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (num - startVal) * eased);
      setVal(current);
      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      } else {
        setVal(num); // Guarantee exact target value
      }
    };

    frameId = requestAnimationFrame(update);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [num, startCounting, duration]);

  // If val evaluated to 0 but num is a real positive number, always return num so amounts never show 0
  return (val === 0 && num > 0) ? num : val;
};

/**
 * BentoKPI Component
 * High-performance KPI card with animated counter on view, sparkline, and trend badge
 */
export default function BentoKPI({
  label,
  value,
  icon: Icon,
  iconBg = '#EAFBF4',
  iconColor = '#10B981',
  trend = '+0%',
  trendUp = true,
  spark = [2, 4, 3, 6, 5, 8],
  to,
  suffix = ''
}) {
  const [cardRef, inView] = useInView();
  const animatedValue = useCountUp(value, inView, 900);
  const displayVal = typeof value === 'string' && value.includes(',')
    ? animatedValue.toLocaleString()
    : animatedValue;

  const content = (
    <div className="bento-kpi" ref={cardRef}>
      <div className="bento-kpi__header">
        <div className="bento-kpi__icon-circle" style={{ background: iconBg, color: iconColor }}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {spark && spark.length > 0 && (
          <div className="bento-kpi__spark">
            <Sparkline data={spark} color={iconColor} />
          </div>
        )}
      </div>

      <div className="bento-kpi__body">
        <div className="bento-kpi__value">
          {displayVal}{suffix}
        </div>
        <div className="bento-kpi__footer">
          <span className="bento-kpi__label">{label}</span>
          {trend && (
            <span className={`bento-kpi__trend ${trendUp ? 'bento-kpi__trend--up' : 'bento-kpi__trend--down'}`}>
              {trendUp ? <TrendingUp size={11} strokeWidth={2.5} /> : <TrendingDown size={11} strokeWidth={2.5} />}
              <span>{trend}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        {content}
      </Link>
    );
  }

  return content;
}
