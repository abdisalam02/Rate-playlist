'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAudio } from '@/app/providers';

// Types
interface Track {
  id: string;
  name: string;
  preview_url: string | null;
  artists: { name: string }[];
  album?: { images: { url: string }[] };
  duration_ms?: number;
}

interface Artist {
  id: string;
  name: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  owner: {
    display_name: string;
  };
  images: { url: string }[];
  tracks: {
    total: number;
    items: {
      track: Track;
    }[];
  };
  followers: {
    total: number;
  };
}

// Format track duration
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export default function PlaylistPage() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get audio context from global provider
  const { 
    playingTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    playTrack, 
    togglePlayPause, 
    seekTo 
  } = useAudio();
  
  useEffect(() => {
    if (!id) {
      setError('No playlist ID provided');
      setLoading(false);
      return;
    }

    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching playlist with ID:', id);
        
        // Add some debugging information
        console.log('Session status:', status);
        console.log('Has access token:', !!session?.accessToken);
        
        if (!session) {
          console.log('No session, waiting...');
          if (status === 'loading') {
            return; // We'll try again when the session loads
          }
        }

        // Fetch the playlist data
        const response = await fetch(`/api/spotify/playlist/${id}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Playlist data received:', data);
        
        setPlaylist(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching playlist:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [id, session, status]);

  // Handle track play button click
  const handlePlayClick = (track: Track) => {
    playTrack(track);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="pt-20 flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="bg-[#181818] p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Playlist</h2>
            <p className="text-gray-300">{error}</p>
            <Link href="/discover" className="mt-4 inline-block px-4 py-2 bg-[#1DB954] text-black font-medium rounded-full">
              Back to Discover
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-16">
        {playlist && (
          <>
            {/* Playlist Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10">
              <div className="w-64 h-64 flex-shrink-0 shadow-lg">
                <img 
                  src={playlist.images?.[0]?.url || '/playlist-placeholder.jpg'} 
                  alt={playlist.name}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              
              <div className="flex-grow">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{playlist.name}</h1>
                <p className="text-gray-400 mb-4">{playlist.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  <div>Created by: <span className="text-white">{playlist.owner?.display_name || 'Unknown'}</span></div>
                  <div>{playlist.tracks?.total || 0} tracks</div>
                  <div>{playlist.followers?.total?.toLocaleString() || 0} followers</div>
                </div>
                
                <div className="mt-6">
                  <button 
                    className="px-6 py-2 bg-[#1DB954] text-black font-bold rounded-full hover:bg-opacity-80 transition-all"
                    onClick={() => {
                      if (playlist.tracks?.items?.length > 0) {
                        const firstTrack = playlist.tracks.items[0].track;
                        if (firstTrack?.preview_url) {
                          playTrack(firstTrack);
                        } else {
                          toast.error('No preview available for first track');
                        }
                      }
                    }}
                  >
                    {isPlaying ? 'Pause' : 'Play'} 
                  </button>
                </div>
              </div>
            </div>
            
            {/* Track List */}
            <div className="overflow-hidden rounded-lg bg-[#181818]">
              <div className="p-4 border-b border-[#282828] grid grid-cols-12 gap-4 text-sm text-gray-400">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">Title</div>
                <div className="col-span-4 hidden md:block">Album</div>
                <div className="col-span-2 text-right">Duration</div>
              </div>
              <div className="divide-y divide-[#282828]">
                {playlist.tracks.items.map((item, index) => (
                  <div 
                    key={item.track.id} 
                    className={`p-4 grid grid-cols-12 gap-4 hover:bg-[#282828] transition-colors cursor-pointer ${playingTrack?.id === item.track.id ? 'bg-[#282828]' : ''}`}
                    onClick={() => handlePlayClick(item.track)}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      {playingTrack?.id === item.track.id && isPlaying ? (
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
                      ) : (
                        <span className="text-gray-400">{index + 1}</span>
                      )}
                    </div>
                    <div className="col-span-5 flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 mr-3">
                        <img 
                          src={item.track.album?.images?.[0]?.url || '/track-placeholder.jpg'} 
                          alt={item.track.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className={`font-medium ${playingTrack?.id === item.track.id ? 'text-[#1DB954]' : 'text-white'}`}>
                          {item.track.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {item.track.artists.map(artist => artist.name).join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-4 hidden md:flex items-center text-gray-400">
                      {item.track.album?.name}
                    </div>
                    <div className="col-span-2 flex items-center justify-end text-gray-400">
                      {item.track.duration_ms ? formatDuration(item.track.duration_ms) : '0:00'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Audio Player (Fixed at Bottom) */}
            {playingTrack && (
              <div className="fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-[#282828] p-3">
                <div className="container mx-auto flex items-center">
                  <div className="flex items-center flex-1">
                    <img 
                      src={playingTrack.album?.images?.[0]?.url || '/track-placeholder.jpg'} 
                      alt={playingTrack.name}
                      className="w-12 h-12 object-cover mr-3"
                    />
                    <div>
                      <div className="text-white font-medium">{playingTrack.name}</div>
                      <div className="text-xs text-gray-400">{playingTrack.artists.map(artist => artist.name).join(', ')}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-center">
                      <button 
                        onClick={togglePlayPause}
                        className="bg-white rounded-full p-2 mx-2 hover:bg-gray-200 transition-colors"
                      >
                        {isPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <span>{formatDuration(currentTime * 1000)}</span>
                      <div className="mx-2 flex-1 h-1 bg-gray-700 rounded-full">
                        <div 
                          className="h-full bg-[#1DB954] rounded-full relative"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        >
                          <div 
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 hover:opacity-100 cursor-pointer"
                            onClick={(e) => {
                              const progressBar = e.currentTarget.parentElement?.parentElement;
                              if (progressBar) {
                                const rect = progressBar.getBoundingClientRect();
                                const pos = (e.clientX - rect.left) / rect.width;
                                seekTo(pos * duration);
                              }
                            }}
                          ></div>
                        </div>
                      </div>
                      <span>{formatDuration(duration * 1000)}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1"></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 