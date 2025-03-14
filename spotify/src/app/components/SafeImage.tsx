import Image from 'next/image';
import { useState } from 'react';

export default function SafeImage({ src, alt, ...props }) {
  const [error, setError] = useState(false);
  
  if (error || !src) {
    return (
      <div 
        className={`bg-[#282828] flex items-center justify-center ${props.className || ''}`}
        style={props.style}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#B3B3B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    );
  }
  
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
} 