'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import SafeImage from './components/SafeImage';

// Simple Play/Pause icons
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
  </svg>
);

// Helper: Get the first artist and song title.
function parseSongDetails(song) {
  let artist = '';
  if (Array.isArray(song.artists)) {
    artist = song.artists[0];
  } else {
    artist = song.artists.split(',')[0].trim();
  }
  return { artist, title: song.name };
}

// RatingIcon: Displays stars based on rating.
function RatingIcon({ rating }) {
  const sizeClass = "text-3xl";
  if (rating >= 4.5) return <span className={`${sizeClass} text-[#1DB954]`}>★★★★★</span>;
  if (rating >= 4.0) return <span className={`${sizeClass} text-[#1DB954]`}>★★★★☆</span>;
  if (rating >= 3.0) return <span className={`${sizeClass} text-[#1DB954]`}>★★★☆☆</span>;
  if (rating >= 2.0) return <span className={`${sizeClass} text-[#1DB954]`}>★★☆☆☆</span>;
  return <span className={`${sizeClass} text-[#1DB954]`}>★☆☆☆☆</span>;
}

// Improved PlaylistCard component with better mobile interaction
function PlaylistCard({ playlist }) {
  const [showOptions, setShowOptions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Game options for the playlist
  const gameOptions = [
    { name: 'Rate', href: `/rate/${playlist.id}`, color: 'bg-purple-600' },
    { name: 'Versus', href: `/versus/${playlist.id}`, color: 'bg-blue-600' },
    { name: 'Guess', href: `/guess/${playlist.id}`, color: 'bg-orange-600' },
    { name: 'Lyrics', href: `/lyrics/${playlist.id}`, color: 'bg-pink-600' }
  ];

  return (
    <motion.div 
      className="bg-[#181818] rounded-lg overflow-hidden transition-all duration-300 h-full relative"
      whileHover={{ y: -4, backgroundColor: '#282828' }}
    >
      {/* Card content */}
      <div className="relative">
        <div className="aspect-square">
          <img
            src={playlist.image_url || '/placeholder.png'}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-[#1DB954] rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
        
        {/* Options button - always visible */}
        <button 
          onClick={() => setShowOptions(!showOptions)}
          className="absolute bottom-4 right-4 bg-[#1DB954] rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        <h2 className="font-bold text-xl text-white truncate">{playlist.name}</h2>
        
        {playlist.user_name && (
          <p className="text-[#B3B3B3] text-sm mt-1">Added by {playlist.user_name}</p>
        )}
        
        {playlist.songs && (
          <p className="text-[#B3B3B3] text-sm mt-1">{playlist.songs.length} tracks</p>
        )}
        
        {playlist.averageRating !== null && (
          <div className="flex items-center mt-3">
            <RatingIcon rating={playlist.averageRating} />
            <span className="ml-2 text-[#B3B3B3]">{playlist.averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      {/* Game options dropdown */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10"
          >
            <h3 className="text-xl font-bold mb-6">Play Games</h3>
            <div className="grid grid-cols-2 gap-3 w-full">
              {gameOptions.map((option, index) => (
                <Link 
                  key={option.name}
                  href={option.href}
                  className={`${option.color} text-white font-medium py-3 px-4 rounded-md flex items-center justify-center hover:brightness-110 transition-all text-center`}
                >
                  {option.name}
                </Link>
              ))}
            </div>
            <button 
              onClick={() => setShowOptions(false)}
              className="mt-6 text-white hover:text-[#1DB954] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/playlists')
      .then((res) => res.json())
      .then((data) => {
        setPlaylists(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]">
            My Playlists
          </h1>
          <p className="text-[#B3B3B3] text-lg max-w-2xl mx-auto">
            Explore your playlists, rate songs, play games, and discover new music
          </p>
        </motion.div>
        
        <div className="flex justify-center mb-12">
          <Link href="/add-playlist" className="bg-[#1DB954] text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform duration-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Playlist
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        ) : (
          <>
            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#181818] rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-[#B3B3B3] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-xl text-[#B3B3B3] mb-4">No playlists added yet</p>
                <Link href="/add-playlist" className="inline-flex items-center text-[#1DB954] hover:underline">
                  <span>Add your first playlist</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
