import React from 'react';

const IconButton = ({ text, link = "#", variant = "primary" }) => {
    const baseStyles = "relative px-5 py-2.5 rounded-full text-sm font-bold flex items-center overflow-hidden transition-all duration-500 border no-underline";
    
    const variants = {
      primary: "!text-black bg-white border-transparent hover:!text-white hover:bg-black shadow-sm transition-colors duration-500",
      secondary: "!text-black bg-transparent border-black/10 hover:!text-white hover:bg-black hover:border-black transition-colors duration-500"
    };
    
    return (
      <a href={link} className={`group ${baseStyles} ${variants[variant]}`}>
        <div className="relative flex items-center overflow-hidden h-5">
          
          {/* Layer 1: Slides Up */}
          <div className="flex items-center transition-all duration-500 ease-in-out group-hover:-translate-y-full">
            <span className="whitespace-nowrap">{text}</span>
            <ArrowIcon />
          </div>
          
          {/* Layer 2: Slides In from Bottom */}
          <div className="absolute inset-0 flex items-center translate-y-full transition-all duration-500 ease-in-out group-hover:translate-y-0">
            <span className="whitespace-nowrap">{text}</span>
            <ArrowIcon />
          </div>
          
        </div>
      </a>
    );
  };
  
  const ArrowIcon = () => (
    <svg 
      className="ml-2 w-3.5 h-3.5"
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor"
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="7" y1="17" x2="17" y2="7"></line>
      <polyline points="7 7 17 7 17 17"></polyline>
    </svg>
  );

export default IconButton;