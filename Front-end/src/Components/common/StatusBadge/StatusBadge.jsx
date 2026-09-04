import './StatusBadge.css';

/**
 * Shared status pill — replaces cl-badge/fl-badge/fl-status-badge/rp-status/
 * fsp-card__badge and every inline-hex status color across the dashboards.
 *
 * tone: 'success' | 'warning' | 'error' | 'info' | 'neutral'
 */
const StatusBadge = ({ tone = 'neutral', className = '', children, ...rest }) => (
  <span className={`status-badge status-badge--${tone} ${className}`.trim()} {...rest}>
    {children}
  </span>
);

export default StatusBadge;
