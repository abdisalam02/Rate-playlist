'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAudio } from '@/app/providers';
import { motion, AnimatePresence } from 'framer-motion';

// Simple Play/Pause Icons (replace with your preferred icons)
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function MiniPlayer() {
  const { playingTrack, isPlaying, playTrack, pauseTrack } = useAudio();

  const handlePlayPause = () => {
    if (!playingTrack) return;
    // If playing, pause; otherwise, play (using the existing track data)
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack(playingTrack); 
    }
  };

  const imageUrl = playingTrack?.album?.images?.[0]?.url;

  return (
    <AnimatePresence>
      {playingTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 h-16 bg-[#181818] border-t border-neutral-700 flex items-center justify-between px-4 z-50 shadow-lg"
        >
          {/* Track Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {imageUrl && (
              <div className="h-10 w-10 flex-shrink-0 relative rounded overflow-hidden bg-neutral-700">
                <Image 
                  src={imageUrl}
                  alt={playingTrack.album?.name || playingTrack.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  onError={(e) => e.currentTarget.src = 'https://placehold.co/40x40/1DB954/FFFFFF?text=Err'}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate" title={playingTrack.name}>{playingTrack.name}</p>
              <p className="text-xs text-neutral-400 truncate" title={playingTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}>
                {playingTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center flex-shrink-0 px-4">
            <button 
              onClick={handlePlayPause}
              className="text-white hover:text-[#1DB954] transition-colors p-2"
              aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          {/* Optional: Link to full track/album (maybe remove for simplicity) */}
          {/* <div className="flex-shrink-0">
             <Link href={`/track/${playingTrack.id}`} className="text-xs text-neutral-400 hover:underline">Details</Link>
          </div> */}

        </motion.div>
      )}
    </AnimatePresence>
  );
} 