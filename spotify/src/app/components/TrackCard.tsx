'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Use Next.js Image
import { motion } from 'framer-motion';

// Type definition for the Track prop (adapt as needed)
interface Track {
  id: string | number;
  name: string;
  title?: string; // Deezer uses title
  artists?: { name: string }[];
  artist?: { name: string }; // Deezer structure
  contributors?: { name: string }[]; // Deezer structure
  album?: { 
    name?: string;
    title?: string; // Deezer album title
    images?: { url: string }[]; 
    cover_medium?: string; // Deezer image
  };
  duration_ms?: number; // Spotify uses ms
  duration?: number; // Deezer uses seconds
  preview?: string; // Deezer preview URL
}

// Helper to get image URL
const getImageUrl = (track: Track): string => {
  const url = track.album?.images?.[0]?.url || track.album?.cover_medium;
  return url || 'https://placehold.co/100x100/1DB954/FFFFFF?text=Track';
};

// Handle image loading errors
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://placehold.co/100x100/1DB954/FFFFFF?text=Error';
  e.currentTarget.onerror = null;
};

// Get display name (prefer name, fallback to title)
const getDisplayName = (track: Track): string => track.name || track.title || 'Untitled Track';

// Get artist display string (handles different structures)
const getArtistString = (track: Track): string => {
    if (track.artists && track.artists.length > 0) {
        return track.artists.map(a => a.name).join(', ');
    }
    if (track.contributors && track.contributors.length > 0) {
        return track.contributors.map(a => a.name).join(', ');
    }
    if (track.artist) {
        return track.artist.name;
    }
    return 'Unknown Artist';
};

// Format track duration (handles both ms and seconds)
const formatDuration = (track: Track): string => {
    let totalSeconds = 0;
    if (typeof track.duration_ms === 'number') {
        totalSeconds = Math.floor(track.duration_ms / 1000);
    } else if (typeof track.duration === 'number') {
        totalSeconds = Math.floor(track.duration);
    }

    if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// The TrackCard Component
export default function TrackCard({ track, onPlay }: { track: Track; onPlay?: (track: Track) => void }) {
  const imageUrl = getImageUrl(track);
  const displayName = getDisplayName(track);
  const artistString = getArtistString(track);
  const durationString = formatDuration(track);
  const albumName = track.album?.name || track.album?.title || '';

  const handlePlayClick = (e: React.MouseEvent) => {
      if (onPlay && track.preview) {
          e.preventDefault(); // Prevent link navigation if playing preview
          onPlay(track);
      }
      // If no preview or no onPlay handler, the Link navigation will proceed
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: '#2A2A2A' }}
      className="bg-[#181818] rounded-lg transition-all p-3 border border-transparent hover:border-[#333333] group relative"
    >
      <Link href={`/track/${track.id}`} className="flex items-center gap-3 w-full" title={`View details for ${displayName}`}>
        <div className="w-12 h-12 flex-shrink-0 relative">
          <Image
            src={imageUrl}
            alt={`Cover for ${albumName || displayName}`}
            width={48}
            height={48}
            className="w-full h-full object-cover rounded shadow-md"
            onError={handleImageError}
            loading="lazy"
          />
          {/* Play button overlay (conditionally rendered if preview exists) */}
          {track.preview && (
              <button 
                onClick={handlePlayClick}
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200 rounded opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                aria-label={`Play preview of ${displayName}`}
              >
                <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-all duration-200 ease-in-out shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-black">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm md:text-base truncate text-white" title={displayName}>{displayName}</h3>
          <p className="text-gray-400 text-xs md:text-sm truncate" title={artistString}>
            {artistString}
          </p>
        </div>
        <div className="text-gray-400 text-sm ml-2 flex-shrink-0">
          {durationString}
        </div>
      </Link>
    </motion.div>
  );
} 