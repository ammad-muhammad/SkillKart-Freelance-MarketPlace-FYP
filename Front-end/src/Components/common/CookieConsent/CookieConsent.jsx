import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import './CookieConsent.css';

const STORAGE_KEY = 'cookieConsent';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* localStorage unavailable (e.g. private browsing) — skip the banner entirely */
    }
  }, []);

  const respond = (choice) => {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* non-fatal */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-consent__icon"><Cookie size={22} /></div>
      <p className="cookie-consent__text">
        We use cookies to keep you signed in and improve your experience on SkillKart.
        Read our <Link to="/cookies">Cookie Policy</Link> to learn more.
      </p>
      <div className="cookie-consent__actions">
        <button className="cookie-consent__btn cookie-consent__btn--deny" onClick={() => respond('deny')}>
          Deny
        </button>
        <button className="cookie-consent__btn cookie-consent__btn--allow" onClick={() => respond('allow')}>
          Allow
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
