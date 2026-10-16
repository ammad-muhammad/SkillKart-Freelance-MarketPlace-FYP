import { useEffect, useState, useRef } from 'react';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { pauseToast, resumeToast, dismissToast } from '../../../utils/notify';

export default function ToastItem({ toast, depth = 0 }) {
  const { id, type, title, message, fullText, count, action, duration, isExiting, isPaused } = toast;
  const [progress, setProgress] = useState(100);
  const touchStartX = useRef(null);
  const touchCurrentX = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Smoothly shrink progress bar
  useEffect(() => {
    if (!duration || duration <= 0) return;

    let rafId;
    const updateProgress = () => {
      if (!isPaused && toast.startTime) {
        const elapsed = Date.now() - toast.startTime;
        const remaining = Math.max(0, (toast.remaining || duration) - elapsed);
        const percent = Math.min(100, Math.max(0, (remaining / duration) * 100));
        setProgress(percent);
      }
      rafId = requestAnimationFrame(updateProgress);
    };

    rafId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [duration, isPaused, toast.startTime, toast.remaining]);

  // Touch Swipe to Dismiss (Swipe right)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 0) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 70) {
      dismissToast(id);
    } else {
      setSwipeOffset(0);
    }
    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (action?.onClick) {
      action.onClick();
    }
    dismissToast(id);
  };

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={16} strokeWidth={2.6} />;
      case 'error':
        return <AlertCircle size={16} strokeWidth={2.4} />;
      case 'warning':
        return <AlertTriangle size={16} strokeWidth={2.4} />;
      case 'loading':
        return <div className="sk-toast-spinner" />;
      case 'info':
      default:
        return <Info size={16} strokeWidth={2.4} />;
    }
  };

  const depthClass = depth > 0 ? `sk-toast-card--depth-${Math.min(depth, 2)}` : '';
  const exitClass = isExiting ? 'sk-toast-card--exiting' : '';

  return (
    <div
      className={`sk-toast-card sk-toast-card--${type} ${depthClass} ${exitClass}`}
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      onMouseEnter={() => pauseToast(id)}
      onMouseLeave={() => resumeToast(id)}
      onFocus={() => pauseToast(id)}
      onBlur={() => resumeToast(id)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
        opacity: swipeOffset > 0 ? Math.max(0.2, 1 - swipeOffset / 200) : undefined,
      }}
    >
      {/* 32px Soft Circle Icon */}
      <div className="sk-toast-icon-circle" aria-hidden="true">
        {renderIcon()}
      </div>

      {/* Title & Message */}
      <div className="sk-toast-body" title={fullText}>
        <div className="sk-toast-header">
          <h4 className="sk-toast-title">{title}</h4>
          {count > 1 && (
            <span className="sk-toast-count-badge" aria-label={`Repeated ${count} times`}>
              ×{count}
            </span>
          )}
        </div>
        {message && <p className="sk-toast-message">{message}</p>}
      </div>

      {/* Right Actions: Link + Close X */}
      <div className="sk-toast-right-actions">
        {action?.label && (
          <button
            type="button"
            className="sk-toast-action-btn"
            onClick={handleActionClick}
          >
            {action.label}
          </button>
        )}
        <button
          type="button"
          className="sk-toast-close-btn"
          onClick={() => dismissToast(id)}
          aria-label="Close notification"
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>

      {/* 2px Bottom Progress Bar */}
      {duration > 0 && (
        <div className="sk-toast-progress-track" aria-hidden="true">
          <div
            className="sk-toast-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
