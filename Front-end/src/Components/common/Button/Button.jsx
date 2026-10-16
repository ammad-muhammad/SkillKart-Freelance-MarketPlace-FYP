import Loader from '../Loader/Loader';
import './Button.css';

/**
 * Shared dashboard button — replaces the cl-btn/fl-btn/rp-btn/fsp-card__btn
 * class systems and one-off inline-styled buttons across Client + Freelancer.
 *
 * variant: 'primary' | 'outline' | 'ghost' | 'danger' | 'success'
 * size:    'sm' | 'md' (default) | 'lg'
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    loading ? 'btn--loading' : '',
    fullWidth ? 'btn--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <Loader size="sm" text="" />}
      {!loading && icon && iconPosition === 'left' && <span className="btn__icon">{icon}</span>}
      {children != null && <span className="btn__label">{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span className="btn__icon">{icon}</span>}
    </button>
  );
};

export default Button;
