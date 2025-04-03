'use client';

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Playlist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  owner: {
    display_name: string;
  };
}

function PlaylistCard({ playlist, index }: { playlist: Playlist; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group"
    >
      <Link href={`/playlist/${playlist.id}`} className="block">
        <div className="aspect-square rounded-md overflow-hidden mb-3">
          <img
            src={playlist.images?.[0]?.url || '/placeholder.png'}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h3 className="font-medium truncate">{playlist.name}</h3>
        <p className="text-sm text-gray-400 truncate">By {playlist.owner?.display_name}</p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{playlist.description}</p>
      </Link>
    </motion.div>
  );
}

export default function FeaturedPlaylists() {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/discover/featured-playlists');
        if (!res.ok) throw new Error('Failed to fetch featured playlists');
        
        const data = await res.json();
        setMessage(data.message || 'Featured Playlists');
        setPlaylists(data.playlists?.items || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{message || 'Featured Playlists'}</h1>
          <p className="text-gray-400">Curated playlists featured on Spotify</p>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-800 rounded-md mb-3"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-900 p-4 rounded-md">
            <p>Error: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 bg-red-900 text-white px-4 py-2 rounded-md hover:bg-red-800"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlists.map((playlist, index) => (
              <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 