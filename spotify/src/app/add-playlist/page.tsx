'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';

export default function AddPlaylist() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: playlistUrl, userName }),
      });
      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#121212]">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-[#181818] rounded-lg p-6 shadow-xl">
            <h1 className="text-2xl font-bold mb-6 text-white">Add Playlist</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[#B3B3B3] text-sm font-medium mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full bg-[#282828] text-white border-none rounded-md py-3 px-4 focus:ring-2 focus:ring-[#1DB954] focus:outline-none"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-[#B3B3B3] text-sm font-medium mb-2">
                  Spotify Playlist URL
                </label>
                <input
                  type="text"
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full bg-[#282828] text-white border-none rounded-md py-3 px-4 focus:ring-2 focus:ring-[#1DB954] focus:outline-none"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  required
                />
                <p className="mt-2 text-xs text-[#B3B3B3]">
                  Paste the full URL of a public Spotify playlist
                </p>
              </div>
              
              {error && (
                <div className="bg-red-900/50 text-red-200 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1DB954] text-black font-bold py-3 px-4 rounded-full hover:scale-105 transition-transform duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </div>
                ) : (
                  'Add Playlist'
                )}
              </button>
            </form>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-[#B3B3B3] text-sm">
              Need help? <a href="#" className="text-[#1DB954] hover:underline">Learn how to find your playlist URL</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
