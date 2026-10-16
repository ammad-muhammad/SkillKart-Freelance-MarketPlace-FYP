import React from 'react';
import './Loader.css';

/**
 * SkillKart Dual Loader Component
 * - Exact Wi-Fi Rotating Arcs Loader: Shown on page navigation & fullScreen loading.
 * - Standard Circular Spinner: Shown on inline actions, buttons, and "Fill with AI".
 *
 * @param {string} text - optional text displayed below the loader (e.g., 'Loading', 'Searching')
 * @param {boolean} fullScreen - when true, renders full-screen centered overlay with Wi-Fi animation
 * @param {'wifi' | 'normal' | 'auto'} variant - explicitly choose loader type ('auto' uses wifi for fullScreen, normal for inline)
 * @param {'sm' | 'md' | 'lg' | number} size - size variant for normal spinner
 * @param {string} color - stroke color (default: '#10B981' emerald or 'currentColor')
 * @param {string} className - optional additional class
 * @param {object} style - inline styles applied to the outer wrapper
 */
const Loader = ({
  text = '',
  fullScreen = false,
  variant = 'auto',
  size = 'md',
  color = '#10B981',
  className = '',
  style = {},
}) => {
  // Use Wi-Fi loader for fullScreen page transitions or when variant='wifi'
  const isWifi = variant === 'wifi' || (variant === 'auto' && fullScreen);

  if (isWifi) {
    const displayText = text || 'SkillKart';

    return (
      <div
        className={`sk-loader-wrapper ${fullScreen ? 'sk-loader-wrapper--fullscreen' : 'sk-loader-wrapper--wifi-inline'} ${className}`}
        style={style}
        role="status"
        aria-live="polite"
        aria-label={displayText}
      >
        <div id="wifi-loader">
          <svg className="circle-outer" viewBox="0 0 86 86">
            <circle className="back" cx={43} cy={43} r={40} />
            <circle className="front" cx={43} cy={43} r={40} />
            <circle className="new" cx={43} cy={43} r={40} />
          </svg>
          <svg className="circle-middle" viewBox="0 0 60 60">
            <circle className="back" cx={30} cy={30} r={27} />
            <circle className="front" cx={30} cy={30} r={27} />
          </svg>
          <svg className="circle-inner" viewBox="0 0 34 34">
            <circle className="back" cx={17} cy={17} r={14} />
            <circle className="front" cx={17} cy={17} r={14} />
          </svg>
          <div className="text" data-text={displayText} />
        </div>
      </div>
    );
  }

  // Standard Circular Spinner for Buttons / Fill with AI
  let pixelSize = 32;
  if (typeof size === 'number') {
    pixelSize = size;
  } else if (size === 'sm' || size === 'xs') {
    pixelSize = 16;
  } else if (size === 'lg' || size === 'xl') {
    pixelSize = 48;
  } else if (size === 'md') {
    pixelSize = 32;
  }

  const strokeWidth = pixelSize <= 16 ? 2.5 : pixelSize <= 24 ? 3 : pixelSize <= 36 ? 3.5 : 4;
  const isInline = pixelSize <= 22 && !text && !fullScreen;

  return (
    <div
      className={`sk-loader-wrapper ${fullScreen ? 'sk-loader-wrapper--fullscreen' : ''} ${isInline ? 'sk-loader-wrapper--inline' : ''} ${className}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={text || 'Loading'}
    >
      <svg
        className="sk-normal-spinner"
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 50 50"
        style={{
          width: pixelSize,
          height: pixelSize,
          minWidth: pixelSize,
          minHeight: pixelSize,
        }}
        aria-hidden="true"
      >
        <circle
          className="sk-normal-spinner__track"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={color === 'currentColor' ? 'currentColor' : color}
          strokeWidth={strokeWidth}
          opacity={color === 'currentColor' ? 0.2 : 0.18}
        />
        <circle
          className="sk-normal-spinner__head"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray="90 150"
          strokeDashoffset="0"
        />
      </svg>
      {text ? <span className="sk-loader-text">{text}</span> : null}
    </div>
  );
};

export default Loader;
