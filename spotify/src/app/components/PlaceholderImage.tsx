'use client';

import React from 'react';

interface PlaceholderImageProps {
  type: 'track' | 'album';
  className?: string;
}

export const PlaceholderImage: React.FC<PlaceholderImageProps> = ({ type, className = '' }) => {
  return (
    <div className={`relative w-full h-full bg-[#202020] flex items-center justify-center ${className}`}>
      {type === 'track' ? (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-1/3 h-1/3 text-gray-500"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ) : (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-1/3 h-1/3 text-gray-500"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </div>
  );
};

export default PlaceholderImage; 