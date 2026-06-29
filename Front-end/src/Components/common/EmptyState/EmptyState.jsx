import React from 'react';
import { Link } from 'react-router-dom';
import './EmptyState.css';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  message, 
  actionText, 
  actionLink, 
  actionClick 
}) => {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state__icon-wrapper">
          <Icon className="empty-state__icon" size={48} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__message">{message}</p>
      
      {actionText && (
        <div className="empty-state__action">
          {actionLink ? (
            <Link to={actionLink} className="empty-state__btn">
              {actionText}
            </Link>
          ) : (
            <button onClick={actionClick} className="empty-state__btn">
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
