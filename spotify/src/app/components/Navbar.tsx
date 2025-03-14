import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-[#121212] sticky top-0 z-50 border-b border-[#282828]">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" className="h-8 w-8 text-[#1DB954]" fill="currentColor">
              <path d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm31-76.2c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3z"/>
            </svg>
            <span className="ml-2 text-xl font-bold">Spotify Games</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-[#B3B3B3] hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/add-playlist" className="text-[#B3B3B3] hover:text-white transition-colors">
              Add Playlist
            </Link>
            <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:scale-105 transition-transform duration-200">
              Open Spotify
            </a>
          </div>
          
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white p-2"
            >
              {isOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#181818] border-t border-[#282828]"
          >
            <div className="px-4 py-3 space-y-3">
              <Link 
                href="/" 
                className="block text-white py-2 hover:text-[#1DB954]"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/add-playlist" 
                className="block text-white py-2 hover:text-[#1DB954]"
                onClick={() => setIsOpen(false)}
              >
                Add Playlist
              </Link>
              <a 
                href="https://open.spotify.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full text-center"
              >
                Open Spotify
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
} 