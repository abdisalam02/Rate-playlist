'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  PlayIcon as SolidPlayIcon, 
  PuzzlePieceIcon, 
  StarIcon as SolidStarIcon,
  PlusIcon,
  MusicalNoteIcon,
  QueueListIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/solid';
import { StarIcon as OutlineStarIcon } from '@heroicons/react/24/outline';

// --- Type Definitions ---
interface Playlist {
  id: string;
  name: string;
  image_url?: string | null;
  user_name?: string | null;
  description?: string | null; // Add description if available
  songs?: any[];
  averageRating?: number | null;
  owner?: { display_name?: string }; // Include owner info if available
}

interface RatingDisplayProps {
  rating: number | null | undefined;
}

interface PlaylistCardProps {
  playlist: Playlist;
}

// --- Components ---

// Rating component
function RatingDisplay({ rating }: RatingDisplayProps) {
  const clampedRating = Math.max(0, Math.min(5, rating || 0));
  const fullStars = Math.floor(clampedRating);
  const emptyStars = Math.max(0, 5 - fullStars);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <SolidStarIcon key={`full-${i}`} className="h-4 w-4 text-yellow-400" />
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <OutlineStarIcon key={`empty-${i}`} className="h-4 w-4 text-neutral-600" />
      ))}
    </div>
  );
}

// Restyled PlaylistCard component - "Music Boxd" Theme
function PlaylistCard({ playlist }: PlaylistCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = imageError ? '/placeholder-album.png' : playlist.image_url || '/placeholder-album.png';

  // Game options - now potentially icons or a smaller menu
  const gameOptions = [
    { name: 'Rate Songs', href: `/playlists/${playlist.id}/rate`, icon: SolidStarIcon, color: 'text-purple-400' },
    { name: 'Versus', href: `/playlists/${playlist.id}/versus`, icon: ArrowsRightLeftIcon, color: 'text-blue-400' },
    { name: 'Guess Track', href: `/playlists/${playlist.id}/guess`, icon: PuzzlePieceIcon, color: 'text-orange-400' },
    { name: 'Guess Lyrics', href: `/playlists/${playlist.id}/lyrics`, icon: MusicalNoteIcon, color: 'text-pink-400' }
  ];

  return (
    <div className="bg-[#181818] rounded-lg transition-all duration-300 group relative p-4 flex flex-col h-full hover:bg-[#282828]">
      <div className="relative mb-3 flex-shrink-0">
        <div className="aspect-square rounded-md overflow-hidden">
          <Image
            src={imageUrl}
            alt={playlist.name || 'Playlist cover'}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        </div>
        {/* Play button - more subtle, appears on hover */}
         <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            className="absolute bottom-2 right-2 bg-[#1DB954] text-black rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label={`Play ${playlist.name}`}
          >
            <SolidPlayIcon className="w-5 h-5" />
          </motion.button>
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-bold text-sm text-white truncate mb-1" title={playlist.name}>{playlist.name}</h3>
        <p className="text-xs text-neutral-400 line-clamp-2 flex-1">
          {playlist.description || playlist.owner?.display_name || `${playlist.songs?.length || 0} tracks`}
        </p>
        
        {/* Game Links - Rendered subtly at the bottom */} 
        <div className="mt-3 pt-2 border-t border-neutral-700/50 flex items-center justify-around">
           {gameOptions.map((option) => (
            <Link 
              key={option.name}
              href={option.href}
              title={option.name}
              className={`p-1 rounded-full ${option.color} hover:bg-neutral-700 transition-colors`}
            >
               <option.icon className="w-4 h-4" />
            </Link>
          ))}
        </div>
        
        {/* Optional: Average Rating Display */}
        {/* {playlist.averageRating !== null && typeof playlist.averageRating === 'number' && (
          <div className="flex items-center mt-2 gap-1">
            <RatingDisplay rating={playlist.averageRating} />
            <span className="text-xs text-neutral-400">({playlist.averageRating.toFixed(1)})</span>
          </div>
        )} */} 
      </div>
    </div>
  );
}

// Main Page Component
export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/playlists') // Ensure this endpoint returns needed data (id, name, image_url, description/owner/songs.length)
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch playlists: ${res.status} ${errorText}`);
        }
        return res.json();
      })
      .then((data) => {
        const fetchedPlaylists = Array.isArray(data) ? data : Array.isArray(data.playlists) ? data.playlists : [];
        console.log("Fetched playlists:", fetchedPlaylists); 
        setPlaylists(fetchedPlaylists);
      })
      .catch(err => {
        console.error("Error fetching playlists:", err);
        setError(err.message || 'Could not load playlists.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F1F1F] to-[#121212] text-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Page Header - Refined */}
        <div className="mb-10 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
            Your Playlists
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl">
            Engage with your playlists through ratings and interactive games.
          </p>
        </div>
        
        {/* Add Playlist Button - Optional, consider if playlist adding is manual or automatic */}
        {/* <div className="flex mb-10">
          <Link href="/add-playlist" className="bg-[#1DB954] text-black font-bold py-2.5 px-6 rounded-full hover:scale-105 transition-transform duration-200 flex items-center gap-2 text-sm">
            <PlusIcon className="w-5 h-5" />
            Add Playlist
          </Link>
        </div> */} 
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16 bg-[#181818]/50 rounded-lg border border-neutral-700">
             <p className="text-lg text-red-400 mb-3">Error loading playlists</p>
             <p className="text-neutral-400 text-sm px-4">{error}</p>
             {/* Optional: Add a retry button */}
          </div>
        )}
        
        {/* Content: Grid or Empty State */}
        {!loading && !error && (
          <>
            {playlists.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            ) : (
              // Empty State - Refined
              <div className="text-center py-16 bg-[#181818]/50 rounded-lg border border-neutral-700">
                <QueueListIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
                <p className="text-lg text-neutral-300 mb-2">No playlists found</p>
                <p className="text-sm text-neutral-500 mb-6 max-w-xs mx-auto">Your Spotify playlists should appear here automatically. Try refreshing?</p>
                {/* Optional: Add link to Spotify or a manual sync button */}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
