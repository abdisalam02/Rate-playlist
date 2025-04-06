import React from 'react';
import Image from 'next/image';

interface UserAvatarProps {
  imageUrl?: string | null;
  username?: string | null;
  sizeClasses?: string; // e.g., 'w-6 h-6'
  textSizeClass?: string; // e.g., 'text-xs' for the initial
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  imageUrl,
  username,
  sizeClasses = 'w-8 h-8', // Default size
  textSizeClass = 'text-sm' // Default text size for initial
}) => {
  const initial = username ? username[0].toUpperCase() : 'U';

  return (
    <div 
      className={`relative ${sizeClasses} rounded-full overflow-hidden flex-shrink-0 bg-[#1DB954]`} // Added flex-shrink-0 and Spotify green bg
    >
      {imageUrl ? (
        <Image 
          src={imageUrl}
          alt={username || 'User Avatar'}
          fill
          sizes={sizeClasses.split(' ')[0]} // Use width class for sizes prop
          className="object-cover"
          // Consider adding onError here too if the provided URL might fail
          onError={(e) => { 
            // Optional: Handle image load error, maybe hide the image?
            // For now, the background initial will show if image fails
             (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-semibold text-black ${textSizeClass}`}>
            {initial}
          </span>
        </div>
      )}
      {/* If image fails, the initial on the green background will be visible */}
    </div>
  );
};

export default UserAvatar; 