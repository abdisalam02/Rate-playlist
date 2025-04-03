'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAudio } from '../../providers'; // Adjust path as needed
import Navbar from '@/app/components/Navbar';
import TokenRefresher from '@/app/components/TokenRefresher';

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  preview_url?: string | null;
}

// Helper functions (copied from current-hits/page.tsx)
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://placehold.co/400x400/1DB954/FFFFFF?text=Music';
  e.currentTarget.onerror = null;
};

const formatDuration = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

function MusicWaveAnimation() {
  // ... (keep implementation from current-hits)
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

function TrackListItem({ track, index, onPlay }: { track: Track; index: number; onPlay: (track: Track) => void }) {
  const { playingTrack, isPlaying } = useAudio();
  const isCurrentTrack = playingTrack?.id === track.id;
  const [imageError, setImageError] = useState(false);

  const imageUrl = imageError || !track.album?.images?.[0]?.url 
    ? '/placeholder-track.png' 
    : track.album.images[0].url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-center space-x-4 p-3 bg-[#181818] hover:bg-[#282828] rounded-lg transition-colors cursor-pointer"
      onClick={() => onPlay(track)}
    >
      <div className="flex-shrink-0 relative w-12 h-12">
        <Image
          src={imageUrl}
          alt={track.album.name || track.name}
          fill
          sizes="48px"
          className="rounded-md object-cover"
          onError={() => setImageError(true)}
        />
        {isCurrentTrack && isPlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
            <MusicWaveAnimation />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white truncate font-medium">{track.name}</p>
        <p className="text-gray-400 text-sm truncate">
          {track.artists?.map(a => a.name).join(', ')}
        </p>
      </div>
      <div className="text-gray-400 text-sm">
        {formatDuration(track.duration_ms)}
      </div>
    </motion.div>
  );
}

export default function FreshRapPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = useAudio();
  const PLAYLIST_ID = '6682665064'; // Fresh Rap Playlist ID

  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch from the Deezer playlist endpoint
        const response = await fetch(`/api/deezer/playlist/${PLAYLIST_ID}?limit=50`); // Fetch more for the full page
        if (!response.ok) {
          throw new Error(`Failed to fetch Fresh Rap playlist: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Check the data structure (assuming tracks are in data.tracks or data directly)
        const trackData = data?.tracks || data || [];
        if (Array.isArray(trackData)) {
             setTracks(trackData.map((t: any) => ({ // Basic transformation, enhance as needed
               ...t,
               duration_ms: t.duration * 1000 || 0
            })));
        } else {
            console.error("Invalid track data format:", data);
             throw new Error('Invalid data format received for Fresh Rap tracks');
        }

      } catch (err: any) {
        console.error('Error fetching Fresh Rap tracks:', err);
        setError(err.message || 'Failed to load tracks');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []);

  const handlePlayTrack = (track: Track) => {
    if (track.preview_url) {
      playTrack({ ...track, previewUrl: track.preview_url });
    } else {
      console.log("No preview available for this track.");
      // Optionally show a toast message
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">
      <TokenRefresher />
      <Navbar />
      <main className="pt-20 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <Link 
            href="/discover" 
            className="flex items-center bg-black bg-opacity-40 hover:bg-opacity-60 transition rounded-full p-2 mr-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold">Fresh Rap</h1>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        )}
        
        {error && (
             <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg text-center">
                 <p className="text-red-300">Error loading tracks: {error}</p>
             </div>
         )}

        {!loading && !error && (
          <div className="space-y-3">
            {tracks.length > 0 ? (
              tracks.map((track, index) => (
                <TrackListItem key={track.id || index} track={track} index={index} onPlay={handlePlayTrack} />
              ))
            ) : (
                <p className="text-center text-gray-400 py-10">No tracks found in this playlist.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 