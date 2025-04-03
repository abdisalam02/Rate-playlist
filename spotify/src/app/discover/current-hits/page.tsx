'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';
import TokenRefresher from '@/app/components/TokenRefresher';
import { useAudio } from '@/app/providers';

// Types
interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
  images: Array<{ url: string; height?: number; width?: number }>;
}

interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
  source_playlist?: { id: string; name: string };
  playlist_name?: string;
  preview_url?: string;
}

const formatDuration = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album';
};

function TrackItem({ track, index }: { track: Track; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#181818] hover:bg-[#282828] transition-colors p-4 rounded-lg flex items-center gap-4"
    >
      <div className="text-gray-400 font-medium w-6 text-right">{index + 1}</div>
      
      <div className="relative h-12 w-12 flex-shrink-0">
        <Image
          src={track.album.images[0]?.url || 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album'}
          alt={track.album.name}
          width={48}
          height={48}
          className="rounded-md"
          onError={handleImageError}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <Link href={`/track/${track.id}`} className="block">
          <h3 className="text-white font-medium text-base truncate">{track.name}</h3>
          <p className="text-gray-400 text-sm truncate">
            {track.artists.map(a => a.name).join(', ')}
          </p>
        </Link>
      </div>
      
      <Link href={`/album/${track.album.id}`} className="hidden md:block flex-shrink-0 max-w-[180px]">
        <p className="text-gray-400 text-sm truncate hover:underline">{track.album.name}</p>
      </Link>
      
      {(track.source_playlist?.name || track.playlist_name) && (
        <div className="hidden lg:block flex-shrink-0 max-w-[180px]">
          <p className="text-gray-400 text-xs truncate">
            From: {track.source_playlist?.name || track.playlist_name}
          </p>
        </div>
      )}
      
      <div className="text-gray-400 text-sm flex-shrink-0">
        {formatDuration(track.duration_ms)}
      </div>
    </motion.div>
  );
}

export default function CurrentHitsPage() {
  const { data: session } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = useAudio();

  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch from the Deezer chart endpoint
        const response = await fetch(`/api/deezer/chart/tracks?limit=50`); // Fetch more for the full page
        if (!response.ok) {
          throw new Error(`Failed to fetch current hits: ${response.statusText}`);
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
             throw new Error('Invalid data format received for current hits');
        }

      } catch (err: any) {
        console.error('Error fetching current hits:', err);
        setError(err.message || 'Failed to load tracks');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []);

  const handlePlayTrack = (track: Track) => {
    if (track.preview_url) {
      playTrack({ ...track, preview_url: track.preview_url });
    } else {
      console.log("No preview available for this track.");
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
          <h1 className="text-3xl font-bold">Today's Top Tracks</h1>
        </div>

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-[#181818] p-4 rounded-lg animate-pulse flex items-center gap-4">
                <div className="w-6 h-4 bg-gray-700 rounded"></div>
                <div className="h-12 w-12 bg-gray-700 rounded-md"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-4 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg text-center">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-800/50 hover:bg-red-800 rounded-full text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        {!loading && !error && (
          <div className="space-y-3">
            {tracks.length > 0 ? (
              tracks.map((track, index) => (
                <TrackItem key={track.id || index} track={track} index={index} />
              ))
            ) : (
              <p className="text-center text-gray-400 py-10">No tracks found.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 