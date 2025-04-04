'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAudio } from '@/app/providers'; // Corrected path assuming providers is at root
import Navbar from '@/app/components/Navbar';
import TokenRefresher from '@/app/components/TokenRefresher';
import TrackCard from '@/app/components/TrackCard';
import { Track } from '@/types/index';

export default function FreshRnbPage() {
  const [tracks, setTracks] = useState<Track[]>([]); // Use imported Track type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PLAYLIST_ID = '2021225582'; // Fresh RnB Playlist ID

  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/deezer/playlist/${PLAYLIST_ID}?limit=50`);
        if (!response.ok) {
          throw new Error(`Failed to fetch Fresh RnB playlist: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Ensure data structure and map to shared Track type
        const trackData = data?.tracks?.data || data?.data || []; // Deezer API often has tracks under data.tracks.data or data.data
        
        if (Array.isArray(trackData)) {
             // Map Deezer structure to shared Track structure
             const formattedTracks: Track[] = trackData.map((t: any) => ({
               id: t.id.toString(), // Ensure ID is string
               name: t.title_short || t.title, // Prefer short title
               title: t.title, // Keep original title if needed
               artists: t.contributors?.map((a: any) => ({ name: a.name })) || (t.artist ? [{ name: t.artist.name }] : []), // Handle contributors or single artist
               album: {
                 id: t.album?.id?.toString(),
                 name: t.album?.title,
                 images: t.album?.cover_medium ? [{ url: t.album.cover_medium }] : [], // Use cover_medium for image
                 cover_medium: t.album?.cover_medium, // Keep Deezer specific field if needed elsewhere
               },
               duration: t.duration, // Duration in seconds from Deezer
               duration_ms: t.duration ? t.duration * 1000 : undefined, // Calculate ms
               preview: t.preview, // Deezer preview URL
               preview_url: t.preview, // Map to shared preview_url
            }));
            setTracks(formattedTracks);
        } else {
            console.error("Invalid track data format:", data);
             throw new Error('Invalid data format received for Fresh RnB tracks');
        }

      } catch (err: any) {
        console.error('Error fetching Fresh RnB tracks:', err);
        setError(err.message || 'Failed to load tracks');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []);

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
          <h1 className="text-3xl font-bold">Fresh RnB</h1>
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
                <p className="text-center text-gray-400 py-10">No tracks found in this playlist.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 