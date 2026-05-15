import React, { useState } from 'react';
import './UserAvatar.css';

/**
 * Reusable Avatar component with smart fallback for broken images (e.g. expired Google URLs)
 */
const UserAvatar = ({ src, fullName, initials, className = '', size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const displayInitials = initials || (fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'FL');

  // If no source or image failed to load, show initials
  if (!src || imgError) {
    return (
      <div className={`user-avatar user-avatar--initials user-avatar--${size} ${className}`}>
        <span>{displayInitials}</span>
      </div>
    );
  }

  return (
    <div className={`user-avatar user-avatar--${size} ${className}`}>
      <img 
        src={src} 
        alt={fullName || 'User Avatar'} 
        onError={() => setImgError(true)}
        loading="lazy"
      />
    </div>
  );
};

export default UserAvatar;
