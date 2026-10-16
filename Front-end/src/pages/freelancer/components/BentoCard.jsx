import React from 'react';

export default function BentoCard({
  children,
  className = '',
  title,
  icon: Icon,
  action,
  colSpan = 12,
  style = {}
}) {
  return (
    <div
      className={`bento-card bento-card--col-${colSpan} ${className}`}
      style={style}
    >
      {(title || action) && (
        <div className="bento-card__head">
          <div className="bento-card__title-wrap">
            {Icon && (
              <span className="bento-card__icon-badge">
                <Icon size={18} strokeWidth={2} />
              </span>
            )}
            {title && <h3 className="bento-card__title">{title}</h3>}
          </div>
          {action && <div className="bento-card__action">{action}</div>}
        </div>
      )}
      <div className="bento-card__content">
        {children}
      </div>
    </div>
  );
}
