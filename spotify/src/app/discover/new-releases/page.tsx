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
  artists: Artist[];
  images: Array<{ url: string; height?: number; width?: number }>;
  release_date?: string;
}

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album';
};

function AlbumCard({ album, index }: { album: Album; index: number }) {
  const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : null;
  const releaseDate = album.release_date ? new Date(album.release_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg overflow-hidden flex flex-col h-full"
    >
      <Link href={`/album/${album.id}`} className="flex flex-col h-full">
        <div className="relative aspect-square w-full">
          <Image
            src={album.images[0]?.url || 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album'}
            alt={album.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            onError={handleImageError}
          />
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-white truncate" title={album.name}>{album.name}</h3>
          <p className="text-gray-400 text-sm mt-1 truncate" title={album.artists.map(a => a.name).join(', ')}>
            {album.artists.map(a => a.name).join(', ')}
          </p>
          {releaseDate && (
            <p className="text-xs text-green-400 mt-auto pt-2">Released: {releaseDate}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function NewReleasesPage() {
  const { data: session } = useSession();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(24);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        
        const url = `/api/discover/new-releases?limit=${pageSize}&use_client_credentials=true`;
        console.log("Fetching new releases from:", url);
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        
        if (data.albums?.items && Array.isArray(data.albums.items)) {
          setAlbums(data.albums.items);
          setTotalCount(data.albums.total || data.albums.items.length);
          console.log(`Loaded ${data.albums.items.length} new releases successfully`);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        console.error('Error fetching new releases:', err);
        setError(`Failed to load new releases: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlbums();
  }, [session, pageSize]);
  
  const loadMore = () => {
    setPageSize(prev => prev + 12);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#181818] text-white">
      <TokenRefresher />
      <Navbar />
      
      <main className="pt-28 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">New Releases</h1>
          <p className="text-gray-400">
            The latest and hottest album releases on Spotify
          </p>
          <p className="text-sm text-green-500 mt-2">{totalCount} recent albums</p>
        </div>
        
        {loading && albums.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-[#181818] rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {albums.map((album, index) => (
                <AlbumCard key={`${album.id}-${index}`} album={album} index={index} />
              ))}
            </div>
            
            {albums.length < totalCount && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-[#1DB954] hover:bg-[#1ED760] text-black font-medium rounded-full transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More Albums'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
} 