import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './BackButton.css';

/**
 * Small icon-only "go back" button for mobile screens that ship with no
 * Navbar (it no-ops under isMobileApp()) — browse-projects, job/gig details.
 * Defaults to real browser-history back (matches the hardware back button's
 * own behavior, see useAndroidBackButton) rather than a hardcoded route.
 */
export default function BackButton({ to, className = '' }) {
  const navigate = useNavigate();
  const handleClick = () => (to ? navigate(to) : navigate(-1));

  return (
    <button type="button" className={`sk-back-btn ${className}`} onClick={handleClick} aria-label="Go back">
      <ChevronLeft size={22} />
    </button>
  );
}
