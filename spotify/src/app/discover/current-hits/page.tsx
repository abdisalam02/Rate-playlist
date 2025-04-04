'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import TokenRefresher from '@/app/components/TokenRefresher';
import TrackCard from '@/app/components/TrackCard';
import { Track } from '@/types/index';

export default function CurrentHitsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PAGE_TITLE = "Today's Top Tracks";

  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch from the simplified chart endpoint
        const response = await fetch(`/api/deezer/chart/tracks?limit=50`); 
        if (!response.ok) {
          throw new Error(`Failed to fetch ${PAGE_TITLE}: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Expect { tracks: { items: [...] } }
        const rawTracks = data?.tracks?.items;

         if (!Array.isArray(rawTracks)) {
             console.error(`Invalid track data format (${PAGE_TITLE}):`, data);
             throw new Error(`Invalid data format received for ${PAGE_TITLE}`);
         }

         // Map raw Deezer chart track to shared Track type
         const formattedTracks: Track[] = rawTracks.map((t: any): Track => ({
            id: t.id.toString(), 
            name: t.title_short || t.title,
            title: t.title,
            artists: t.contributors?.map((a: any) => ({ name: a.name })) || (t.artist ? [{ name: t.artist.name }] : []),
            album: {
              id: t.album?.id?.toString(),
              name: t.album?.title,
              images: [{ url: t.album?.cover_medium || t.album?.cover || '/placeholder-album.png' }],
              cover_medium: t.album?.cover_medium,
            },
            duration: t.duration,
            duration_ms: t.duration ? t.duration * 1000 : undefined,
            preview: t.preview,
            preview_url: t.preview,
            explicit: t.explicit_lyrics,
         }));
         setTracks(formattedTracks);

      } catch (err: any) {
        console.error(`Error fetching ${PAGE_TITLE}:`, err);
        setError(err.message || 'Failed to load tracks');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []); // No dependencies needed as endpoint is fixed

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
          <h1 className="text-3xl font-bold">{PAGE_TITLE}</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3"> 
            {tracks.length > 0 ? (
              tracks.map((track, index) => (
                <TrackCard key={track.id || index} track={track} />
              ))
            ) : (
                <p className="text-center text-gray-400 py-10">No tracks found in the chart.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 