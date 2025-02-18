'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';

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

// RatingIcon: Displays an emoji based on rating.
function RatingIcon({ rating }) {
  const sizeClass = "text-5xl";
  if (rating >= 4.5) return <span className={sizeClass}>🤩</span>;
  if (rating >= 4.0) return <span className={sizeClass}>😎</span>;
  if (rating >= 3.0) return <span className={sizeClass}>🙂</span>;
  return <span className={sizeClass}>😵</span>;
}

// Framer Motion variants for the dropdown buttons.
const buttonVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.1, duration: 0.3 }
  }),
};

// Revamped PlaylistCard component.
function PlaylistCard({ playlist }) {
  const [expanded, setExpanded] = useState(false);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <div className="card bg-base-100 shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:scale-105">
      <figure className="relative">
        <motion.img
          whileHover={{ scale: 1.05 }}
          src={playlist.image_url || '/placeholder.png'}
          alt={playlist.name}
          className="object-cover w-full h-48" // Updated image height
        />
        {/* Optional overlay to darken image slightly */}
        <div className="absolute inset-0 bg-black bg-opacity-20" />
      </figure>
      <div className="card-body p-6 relative">
      <h2 className="card-title text-2xl font-bold text-base-content">
      {playlist.name}
        </h2>
        {playlist.user_name && (
          <p className="text-sm text-base-content/70 mt-1">Added by: {playlist.user_name}</p>
        )}
        {playlist.songs && (
          <p className="text-sm text-gray-600 mt-1">Tracks: {playlist.songs.length}</p>
        )}
        {playlist.averageRating !== null && (
          <div className="flex items-center space-x-3 mt-3">
            <RatingIcon rating={playlist.averageRating} />
            <span className="text-lg text-gray-600">{playlist.averageRating.toFixed(1)}</span>
          </div>
        )}

        {/* Dropdown toggle: Using up/down arrow icons */}
        <button
          onClick={toggleDropdown}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          aria-label="Toggle actions"
        >
          {expanded ? (
            // Up arrow icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            // Down arrow icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="dropdown"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="mt-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-2 gap-4">
                <motion.div custom={0.1} variants={buttonVariants} initial="hidden" animate="visible">
                  <Link href={`/rate/${playlist.id}`} className="btn btn-primary btn-md w-full flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.24 9.397c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.97z" />
                    </svg>
                    Rate
                  </Link>
                </motion.div>
                <motion.div custom={0.2} variants={buttonVariants} initial="hidden" animate="visible">
                  <Link href={`/versus/${playlist.id}`} className="btn btn-secondary btn-md w-full flex items-center justify-center gap-2">
                    <span className="font-bold text-lg">VS</span>
                    Versus
                  </Link>
                </motion.div>
                <motion.div custom={0.3} variants={buttonVariants} initial="hidden" animate="visible">
                  <Link href={`/guess/${playlist.id}`} className="btn btn-accent btn-md w-full flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zm-8-4a1 1 0 00-1 1v1a1 1 0 002 0V7a1 1 0 00-1-1zm1 6a1 1 0 10-2 0v1a1 1 0 002 0v-1z" />
                    </svg>
                    Guess
                  </Link>
                </motion.div>
                <motion.div custom={0.4} variants={buttonVariants} initial="hidden" animate="visible">
                  <Link href={`/lyrics/${playlist.id}`} className="btn btn-info btn-md w-full flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804V13a1 1 0 001.447.894l5-3a1 1 0 000-1.788l-5-3A1 1 0 009 4.804z" />
                      <path d="M7 3a1 1 0 00-1 1v10a1 1 0 001.447.894l5-3A1 1 0 0013 11V4a1 1 0 00-1-1H7z" />
                    </svg>
                    Lyrics
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Home() {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    fetch('/api/playlists')
      .then((res) => res.json())
      .then((data) => setPlaylists(data));
  }, []);

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <Navbar />
      <div className="container mx-auto px-6 py-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center text-4xl md:text-5xl font-bold mb-10 text-base-content"
        >
          My Playlists
        </motion.h1>
        <div className="flex justify-center mb-10">
          <Link href="/add-playlist" className="btn btn-outline btn-lg hover:btn-info transition-all shadow-md">
            Add Playlist
          </Link>
        </div>
        <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
          {playlists.length > 0 ? (
            playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))
          ) : (
            <p className="text-center text-xl text-gray-500">
              No playlists added yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
