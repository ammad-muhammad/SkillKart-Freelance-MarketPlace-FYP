import React from 'react';
import { useInView } from './Reveal';

/**
 * ProgressRing — Circular SVG progress indicator
 */
export default function ProgressRing({
  percent = 0,
  size = 72,
  strokeWidth = 6,
  color = '#10B981',
  bgColor = 'rgba(255, 255, 255, 0.25)',
  showText = true,
  textColor = '#FFFFFF',
  textSize = 15,
  sublabel = ''
}) {
  const [ringRef, inView] = useInView();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const activePercent = inView ? clamped : 0;
  const offset = circumference - (activePercent / 100) * circumference;

  return (
    <div ref={ringRef} style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      </svg>
      {showText && (
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          lineHeight: 1
        }}>
          <span style={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontSize: textSize,
            fontWeight: 800,
            color: textColor
          }}>
            {clamped}%
          </span>
          {sublabel && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: textColor,
              opacity: 0.8,
              marginTop: 2
            }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
