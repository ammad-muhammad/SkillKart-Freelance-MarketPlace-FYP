/**
 * PkrIcon — drop-in replacement for lucide-react's DollarSign, sized/colored
 * the same way (size, color, className, and any other prop forwarded to the
 * root <svg>), but rendering the "Rs" (Pakistani Rupee) glyph instead of $.
 * The platform is PKR-only — see CLAUDE.md / Payment.js currency default.
 */
const PkrIcon = ({ size = 24, color = 'currentColor', className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    {...rest}
  >
    <text
      x="12"
      y="17"
      textAnchor="middle"
      fontSize="13"
      fontWeight="700"
      fontFamily="inherit"
      fill={color}
    >
      Rs
    </text>
  </svg>
);

export default PkrIcon;
