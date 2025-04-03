'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';
import TokenRefresher from '@/app/components/TokenRefresher';

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
  const [pageSize, setPageSize] = useState(20);
  const [source, setSource] = useState<string>('Loading...');
  const [totalCount, setTotalCount] = useState<number>(0);
  
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true);
        
        const url = `/api/discover/current-hits?limit=${pageSize}&use_client_credentials=true`;
        console.log("Fetching tracks from:", url);
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        
        if (data.tracks && Array.isArray(data.tracks)) {
          setTracks(data.tracks);
          setTotalCount(data.total || data.tracks.length);
          setSource(data.source || 'Unknown source');
          console.log(`Loaded ${data.tracks.length} tracks successfully`);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        console.error('Error fetching tracks:', err);
        setError(`Failed to load tracks: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTracks();
  }, [session, pageSize]);
  
  const loadMore = () => {
    setPageSize(prev => prev + 20);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#181818] text-white">
      <TokenRefresher />
      <Navbar />
      
      <main className="pt-28 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Today's Top Hits</h1>
          <p className="text-gray-400">
            The most popular tracks on Spotify right now
          </p>
          <p className="text-sm text-green-500 mt-2">Source: {source} • {totalCount} tracks</p>
        </div>
        
        {loading && tracks.length === 0 ? (
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
        ) : error ? (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg text-center">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-800/50 hover:bg-red-800 rounded-full text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-8">
              {tracks.map((track, index) => (
                <TrackItem key={`${track.id}-${index}`} track={track} index={index} />
              ))}
            </div>
            
            {tracks.length < totalCount && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-[#1DB954] hover:bg-[#1ED760] text-black font-medium rounded-full transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More Tracks'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
} 