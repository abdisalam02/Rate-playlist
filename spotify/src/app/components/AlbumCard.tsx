'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Use Next.js Image for optimization
import { motion } from 'framer-motion';

// Updated interface to include spotify_id
interface Album {
  id: string | number; // Deezer ID
  spotify_id: string | null; // Spotify ID
  name: string; 
  title?: string; // Deezer might use title
  images?: { url: string }[];
  cover_medium?: string; // Deezer image field
  artists?: { id?: string | number; name: string }[];
  artist?: { name: string }; // Deezer might have single artist object
  release_date?: string; 
}

// Helper to get image URL, prioritizing specific fields and providing fallback
const getImageUrl = (album: Album): string => {
  const url = album.images?.[0]?.url || album.cover_medium;
  // Basic placeholder, consider a more specific one if needed
  return url || 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album'; 
};

// Get display name (prefer name, fallback to title)
const getDisplayName = (album: Album): string => album.name || album.title || 'Untitled Album';

// Get artist display string
const getArtistString = (album: Album): string => {
    if (album.artists && album.artists.length > 0) {
        return album.artists.map(a => a.name).join(', ');
    }
    if (album.artist) {
        return album.artist.name;
    }
    return 'Various Artists';
};

// Get release year
const getReleaseYear = (album: Album): number | null => {
    return album.release_date ? new Date(album.release_date.split('-')[0]).getFullYear() : null;
};

// Placeholder for error state
const PLACEHOLDER_IMAGE = 'https://placehold.co/300x300/1DB954/FFFFFF?text=Error';

// The AlbumCard Component
export default function AlbumCard({ album }: { album: Album }) {
  // Initial image URL calculation
  const initialImageUrl = getImageUrl(album);
  // State to manage the image source, allowing fallback
  const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl);

  // Function to handle image loading errors *inside* the client component
  const handleInternalImageError = () => {
      // Only set placeholder if it's not already the placeholder
      if (currentImageUrl !== PLACEHOLDER_IMAGE) {
          console.warn(`Image failed to load: ${initialImageUrl}, falling back to placeholder.`);
          setCurrentImageUrl(PLACEHOLDER_IMAGE);
      }
  };
  
  // Reset image URL if the album prop changes (important for dynamic lists)
  React.useEffect(() => {
      setCurrentImageUrl(getImageUrl(album));
  }, [album]);

  const displayName = getDisplayName(album);
  const artistString = getArtistString(album);
  const releaseYear = getReleaseYear(album);

  // Determine the correct link based on spotify_id availability
  const linkHref = album.spotify_id ? `/album/${album.spotify_id}` : '#'; // Link to # or a search page if no Spotify ID
  const linkTitle = album.spotify_id ? `View details for ${displayName}` : `Spotify ID not found for ${displayName}`;
  const isClickable = !!album.spotify_id; // Card is only truly navigable if we have the Spotify ID

  return (
    <motion.div
      whileHover={isClickable ? { y: -5, boxShadow: '0 8px 25px rgba(0,0,0,0.4)' } : {}}
      className={`bg-gradient-to-br from-[#222222] to-[#181818] rounded-xl overflow-hidden transition-all hover:bg-[#282828] shadow-lg h-full flex flex-col ${!isClickable ? 'opacity-70' : ''}`}
    >
      <Link 
        href={linkHref} 
        className={`block p-4 flex flex-col flex-grow ${!isClickable ? 'pointer-events-none' : ''}`} // Disable pointer events if not clickable
        title={linkTitle}
        aria-disabled={!isClickable}
        onClick={(e) => !isClickable && e.preventDefault()} // Prevent navigation just in case
      >
          <div className="aspect-square mb-4 overflow-hidden rounded-lg relative group">
            <Image 
              src={currentImageUrl} // Use state variable for src
              alt={`Cover art for ${displayName}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" // Example sizes, adjust as needed
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              onError={handleInternalImageError} // Call internal handler
              loading="lazy"
            />
            {/* Only show play overlay if clickable/linkable */}
            {isClickable && (
                 <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all duration-300">
                  <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-in-out shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
            )}
          </div>
          {/* Text content pushed to bottom */}
          <div className="mt-auto">
              <h3 className="font-bold text-base truncate text-white" title={displayName}>{displayName}</h3>
              <p className="text-gray-400 text-sm truncate" title={artistString}>
                {releaseYear ? `${releaseYear} • ` : ''}{artistString}
              </p>
          </div>
      </Link>
    </motion.div>
  );
} 