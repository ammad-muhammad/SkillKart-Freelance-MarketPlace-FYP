import './Card.css';

/**
 * Shared dashboard card — replaces cl-card/fl-card/rp-card/fsp-card.
 *
 * size: 'sm' | 'md' (default)
 * interactive: true only for genuinely clickable cards (adds hover lift)
 * as: element/component to render as (e.g. 'a', Link) — defaults to 'div'
 */
const Card = ({
  size = 'md',
  interactive = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'card',
    `card--${size}`,
    interactive ? 'card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
};

export default Card;
