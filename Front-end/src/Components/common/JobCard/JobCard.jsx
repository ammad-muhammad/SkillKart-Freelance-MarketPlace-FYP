import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle2, Bookmark, ArrowRight } from 'lucide-react';
import './JobCard.css';

/**
 * Format project budget safely into a single-line string.
 * Never outputs NaN or undefined.
 */
export const formatJobBudget = (budget) => {
  if (!budget) return 'Rs. 25,000+';

  if (typeof budget === 'number') {
    return `Rs. ${budget.toLocaleString()}`;
  }

  if (typeof budget === 'string') {
    return budget.startsWith('Rs') ? budget : `Rs. ${budget}`;
  }

  if (typeof budget === 'object') {
    if (budget.type === 'hourly') {
      const rate = budget.min || budget.max || budget.amount || 0;
      return `Rs. ${rate.toLocaleString()}/hr`;
    }
    if (budget.min && budget.max && budget.min !== budget.max) {
      return `Rs. ${budget.min.toLocaleString()} – ${budget.max.toLocaleString()}`;
    }
    const amount = budget.min || budget.max || budget.amount || 0;
    return `Rs. ${amount.toLocaleString()}`;
  }

  return 'Rs. 25,000+';
};

/**
 * Unified Shared JobCard component
 * Used in: /browse-projects grid, Dashboard Recommended slider, Saved Projects,
 * and Similar Projects on Project Details.
 */
export default function JobCard({
  job,
  variant = 'grid',
  surfaceBg = '#FFFFFF',
  isSaved = false,
  onToggleSave,
  className = '',
}) {
  if (!job) return null;

  const jobId = job._id || job.id || '';
  const title = job.title || 'Untitled Project';
  const category = (job.category || 'Freelance').toUpperCase();
  const description = job.description || 'Looking for an experienced freelancer to deliver high-quality milestone deliverables.';

  // Client info
  const clientObj = job.clientId || job.client || {};
  const clientName = clientObj.name ||
    (clientObj.firstName ? `${clientObj.firstName} ${clientObj.lastName || ''}`.trim() : null) ||
    job.clientName ||
    'Verified Client';
  const clientInitial = clientName.charAt(0).toUpperCase() || 'C';
  const clientAvatar = clientObj.profilePicture || clientObj.avatar || null;
  const isVerified = Boolean(clientObj.isEmailVerified || clientObj.verified || job.clientStats?.verified);

  // Match score (only show if data exists)
  const matchScore = job.matchScore || job.matchPercentage || job.match || null;

  // Meta fields
  const jobType = job.type || (job.budget?.type === 'hourly' ? 'Hourly' : 'Fixed Price');
  const rawDuration = job.duration || '2-4 weeks';
  const duration = rawDuration
    .replace(/Less than 1 month/i, '< 1 month')
    .replace(/less than a month/i, '< 1 month');

  let deadline = 'Flexible';
  if (job.deadline) {
    try {
      deadline = new Date(job.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      deadline = 'Flexible';
    }
  } else if (job.experienceLevel) {
    deadline = job.experienceLevel.charAt(0).toUpperCase() + job.experienceLevel.slice(1);
  }

  // Skills list (max 3 + "+N")
  const skillsList = Array.isArray(job.skills) ? job.skills : [];

  // Budget
  const budgetStr = formatJobBudget(job.budget);

  const wrapperClass = [
    'sk-job-card-wrapper',
    variant === 'slider' ? 'sk-job-card-wrapper--slider' : 'sk-job-card-wrapper--grid',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapperClass}
      style={{ '--job-card-notch-bg': surfaceBg }}
    >
      {/* 1. Cut-in Notch Shelf top-right */}
      <div className="sk-job-card__notch-shelf">
        <div className="sk-job-card__notch-pill" title={category}>
          <Sparkles size={13} />
          <span className="sk-job-card__notch-text">{category}</span>
        </div>
      </div>

      <div className="sk-job-card">
        {/* 2. Clickable Card Body Link */}
        <Link to={`/jobs/${jobId}`} className="sk-job-card__body">
          {/* Header Row: starts below notch */}
          <div className="sk-job-card__header-row">
            <div className="sk-job-card__client">
              <div className="sk-job-card__avatar">
                {clientAvatar ? (
                  <img src={clientAvatar} alt={clientName} />
                ) : (
                  <span>{clientInitial}</span>
                )}
              </div>
              <div className="sk-job-card__client-info">
                <div className="sk-job-card__client-name" title={clientName}>
                  <span>{clientName}</span>
                  {isVerified && <CheckCircle2 size={13} color="#10B981" />}
                </div>
                {matchScore != null && (
                  <div className="sk-job-card__match-pill">
                    <span>{matchScore}% Match</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bookmark button */}
            <button
              type="button"
              className="sk-job-card__save-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave?.(job, e);
              }}
              title={isSaved ? 'Remove bookmark' : 'Save project'}
              aria-label={isSaved ? 'Remove bookmark' : 'Save project'}
            >
              <Bookmark
                size={15}
                fill={isSaved ? '#10B981' : 'none'}
                color={isSaved ? '#10B981' : '#94A3B8'}
              />
            </button>
          </div>

          {/* Title: 2 lines clamp */}
          <h4 className="sk-job-card__title" title={title}>
            {title}
          </h4>

          {/* Meta row: 3 plain columns with thin vertical dividers */}
          <div className="sk-job-card__meta-grid">
            <div className="sk-job-card__meta-item sk-job-card__meta-item--first">
              <span className="sk-job-card__meta-lbl">JOB TYPE</span>
              <span className="sk-job-card__meta-val" title={jobType}>{jobType}</span>
            </div>
            <div className="sk-job-card__meta-item">
              <span className="sk-job-card__meta-lbl">DURATION</span>
              <span className="sk-job-card__meta-val" title={duration}>{duration}</span>
            </div>
            <div className="sk-job-card__meta-item">
              <span className="sk-job-card__meta-lbl">DEADLINE</span>
              <span className="sk-job-card__meta-val" title={deadline}>{deadline}</span>
            </div>
          </div>

          {/* Description: 2 lines clamp */}
          <p className="sk-job-card__desc" title={description}>
            {description}
          </p>

          {/* Skill chips: ONE row only, no wrap */}
          {skillsList.length > 0 && (
            <div className="sk-job-card__skills-row">
              {skillsList.slice(0, 3).map((sk, sIdx) => {
                const sLabel = typeof sk === 'string' ? sk : sk?.name || '';
                return sLabel ? (
                  <span key={sIdx} className="sk-job-card__skill-chip">
                    {sLabel}
                  </span>
                ) : null;
              })}
              {skillsList.length > 3 && (
                <span className="sk-job-card__skill-more">
                  +{skillsList.length - 3}
                </span>
              )}
            </div>
          )}
        </Link>

        {/* 3. Footer Band: Budget + Apply Button */}
        <div className="sk-job-card__footer">
          <div className="sk-job-card__budget-box">
            <div className="sk-job-card__budget-label">BUDGET</div>
            <div className="sk-job-card__budget-val" title={budgetStr}>
              {budgetStr}
            </div>
          </div>

          <Link
            to={`/jobs/${jobId}`}
            className="sk-job-card__apply-btn"
          >
            <span>Apply Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder for JobCard loading state
 */
export function JobCardSkeleton({ variant = 'grid', surfaceBg = '#FFFFFF' }) {
  const wrapperClass = [
    'sk-job-card-wrapper',
    'sk-job-card--skeleton',
    variant === 'slider' ? 'sk-job-card-wrapper--slider' : 'sk-job-card-wrapper--grid',
  ].join(' ');

  return (
    <div className={wrapperClass} style={{ '--job-card-notch-bg': surfaceBg }}>
      <div className="sk-job-card__notch-shelf">
        <div className="sk-job-card__notch-pill" style={{ width: 110, background: '#E2E8F0' }} />
      </div>

      <div className="sk-job-card">
        <div className="sk-job-card__body">
          <div className="sk-job-card__header-row">
            <div className="sk-job-card__client">
              <div className="sk-job-card__skel-bar" style={{ width: 42, height: 42, borderRadius: 12 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div className="sk-job-card__skel-bar" style={{ width: '65%', height: 14 }} />
                <div className="sk-job-card__skel-bar" style={{ width: '40%', height: 10 }} />
              </div>
            </div>
            <div className="sk-job-card__skel-bar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          </div>

          <div className="sk-job-card__skel-bar" style={{ width: '92%', height: 20, marginBottom: 8 }} />
          <div className="sk-job-card__skel-bar" style={{ width: '70%', height: 20, marginBottom: 14 }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <div className="sk-job-card__skel-bar" style={{ height: 28 }} />
            <div className="sk-job-card__skel-bar" style={{ height: 28 }} />
            <div className="sk-job-card__skel-bar" style={{ height: 28 }} />
          </div>

          <div className="sk-job-card__skel-bar" style={{ width: '100%', height: 12, marginBottom: 6 }} />
          <div className="sk-job-card__skel-bar" style={{ width: '80%', height: 12, marginBottom: 16 }} />

          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <div className="sk-job-card__skel-bar" style={{ width: 60, height: 22, borderRadius: 999 }} />
            <div className="sk-job-card__skel-bar" style={{ width: 70, height: 22, borderRadius: 999 }} />
            <div className="sk-job-card__skel-bar" style={{ width: 50, height: 22, borderRadius: 999 }} />
          </div>
        </div>

        <div className="sk-job-card__footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="sk-job-card__skel-bar" style={{ width: 50, height: 10 }} />
            <div className="sk-job-card__skel-bar" style={{ width: 90, height: 16 }} />
          </div>
          <div className="sk-job-card__skel-bar" style={{ width: 100, height: 38, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}
