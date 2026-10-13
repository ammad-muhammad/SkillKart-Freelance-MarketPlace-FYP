import React, { useEffect } from 'react';
import { ShieldAlert, Mail, LogOut } from 'lucide-react';
import './SuspendedOverlay.css';

const SuspendedOverlay = ({ reason, onLogout }) => {
  useEffect(() => {
    // Prevent scrolling when overlay is mounted
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="suspended-overlay">
      <div className="suspended-card">
        <div className="suspended-icon-wrapper">
          <ShieldAlert size={64} className="suspended-icon" />
        </div>
        <h1 className="suspended-title">Account Suspended</h1>
        <p className="suspended-message">
          Your account has been restricted due to a violation of our platform policies. 
          You can no longer interact with projects, messages, or payments.
        </p>
        
        {reason && (
          <div className="suspended-reason">
            <strong>Reason:</strong> {reason}
          </div>
        )}

        <div className="suspended-actions">
          <a href="mailto:support@skillkart.com" className="suspended-btn">
            <Mail size={18} />
            Contact Support
          </a>
          <button onClick={onLogout} className="suspended-btn suspended-btn-outline">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendedOverlay;
