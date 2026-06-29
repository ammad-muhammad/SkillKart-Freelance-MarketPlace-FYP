import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, variant = 'rectangular', style = {}, className = '' }) => {
  return (
    <div 
      className={`skeleton ${variant} ${className}`} 
      style={{ width, height, ...style }}
    />
  );
};

export default Skeleton;
