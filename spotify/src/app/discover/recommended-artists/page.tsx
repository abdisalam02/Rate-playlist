'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from "next-auth/react";
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Artist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  genres: string[];
  popularity: number;
}

function ArtistCard({ artist, index }: { artist: Artist; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group"
    >
      <Link href={`/artist/${artist.id}`} className="block">
        <div className="aspect-square rounded-full overflow-hidden mb-3">
          <img
            src={artist.images?.[0]?.url || '/placeholder.png'}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h3 className="font-medium text-center truncate">{artist.name}</h3>
        <p className="text-xs text-gray-500 text-center mt-1 line-clamp-1">
          {artist.genres?.slice(0, 2).join(', ')}
        </p>
      </Link>
    </motion.div>
  );
}

export default function RecommendedArtists() {
  const { data: session } = useSession();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        if (!session) {
          setError('Please sign in to see your recommended artists');
          setLoading(false);
          return;
        }

        setLoading(true);
        const res = await fetch('/api/discover/recommended-artists');
        if (!res.ok) throw new Error('Failed to fetch recommended artists');
        
        const data = await res.json();
        setArtists(data || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchArtists();
  }, [session]);

  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Recommended Artists</h1>
          <p className="text-gray-400">Based on your listening history</p>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-800 rounded-full mb-3"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-1/2 mx-auto"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg text-center">
            <p className="mb-4">{error}</p>
            {!session && (
              <button 
                onClick={() => signIn("spotify")}
                className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:bg-opacity-90 transition"
              >
                Sign in with Spotify
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {artists.map((artist, index) => (
              <ArtistCard key={artist.id} artist={artist} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 