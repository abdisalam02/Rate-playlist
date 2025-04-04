'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Use Next.js Image
import { motion } from 'framer-motion';
import { useAudio } from '@/app/providers'; // Assuming providers is the correct path
import { Track } from '@/types/index'; // Import shared type

// --- Define Icons Locally ---
const PlayIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const PauseIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
);
const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);
// --- End Icon Definitions ---

// Reusable helper functions (Consider moving to utils if used elsewhere)
const processImageUrl = (url: string | undefined): string => {
  if (!url) return 'https://placehold.co/100x100/1DB954/FFFFFF?text=Track';
  let processedUrl = url;
  if (url.startsWith('http://') && url.includes('.scdn.co')) {
    processedUrl = url.replace('http://', 'https://');
  }
  return processedUrl;
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

// Simple Music Wave Animation (can be its own component)
function MusicWaveAnimation() {
  return (
    <div className="flex space-x-0.5 items-end h-4">
      {[0, 0.1, 0.2, 0.15, 0.25].map((delay, i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-[#1DB954] rounded-full"
          animate={{ height: ["40%", "100%", "40%"] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

interface TrackCardProps {
  track: Track; // Use imported Track type
}

// The TrackCard Component
export default function TrackCard({ track }: TrackCardProps) {
  const { playTrack, playingTrack, isPlaying } = useAudio();
  const [isHovered, setIsHovered] = useState(false);

  // Use optional chaining and nullish coalescing for safety
  const trackName = track.title ?? track.name ?? 'Unknown Track';
  const albumName = track.album?.title ?? track.album?.name ?? 'Unknown Album';
  const imageUrl = track.album?.cover_medium ?? track.album?.images?.[0]?.url;
  const duration = track.duration ? formatDuration(track.duration * 1000) : (track.duration_ms ? formatDuration(track.duration_ms) : '--:--');
  const artists = track.contributors ?? track.artists ?? (track.artist ? [track.artist] : [{ name: 'Unknown Artist'}]);
  const previewUrl = track.preview ?? track.preview_url;
  const isCurrentTrackPlaying = playingTrack?.id === track.id && isPlaying;
  const isCurrentTrackPaused = playingTrack?.id === track.id && !isPlaying;
  const isCurrentTrack = playingTrack?.id === track.id.toString();
  const hasPreview = !!track.preview_url;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    if (hasPreview) {
      playTrack(track);
    } else {
      console.warn('No preview available for track:', trackName);
    }
  };

  return (
    <div 
      className="flex items-center space-x-3 p-2 rounded-md hover:bg-neutral-800/50 transition-colors duration-150 group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-neutral-700 relative cursor-pointer">
        <div className="relative w-full h-full">
          {imageUrl && (
            <Image
              src={processImageUrl(imageUrl)}
              alt={albumName}
              fill
              sizes="48px"
              className="object-cover"
              onError={handleImageError}
              loading="lazy"
            />
          )}
        </div>
        <button
          onClick={handlePlayClick}
          disabled={!hasPreview}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-150 flex items-center justify-center 
                    ${isHovered || isCurrentTrackPlaying || isCurrentTrackPaused ? 'opacity-100' : 'opacity-0'} 
                    ${!hasPreview ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          aria-label={isCurrentTrackPlaying ? `Pause ${trackName}` : `Play ${trackName} preview`}
        >
          {isCurrentTrackPlaying ? (
            <PauseIcon size={24} />
          ) : (
            <PlayIcon size={24} />
          )}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/track/${track.id}`} className="block group/link">
          <p className="text-sm font-medium text-white truncate group-hover/link:underline" title={trackName}>{trackName}</p>
        </Link>
        <p className="text-xs text-neutral-400 truncate" title={artists.map(a => a.name).join(', ')}>
          {/* Ensure artists array exists before mapping */} 
          {artists?.map(a => a.name).join(', ')}
        </p>
      </div>
      {/* Remove duration display */}
      {/* {duration && (
        <p className="text-xs text-neutral-400 flex-shrink-0 font-mono pr-1">{duration}</p>
      )} */}
      {/* Optional: Add rating display if needed */}
      {/* {(track.average_rating !== undefined && track.rating_count !== undefined) && (
        <div className="ml-auto flex items-center gap-1 text-xs text-neutral-400">
          <StarIcon className="w-3 h-3 text-yellow-400" /> 
          <span>{track.average_rating.toFixed(1)}</span>
          <span>({track.rating_count})</span>
        </div>
      )} */}
    </div>
  );
} 