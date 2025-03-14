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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#1DB954]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="ml-2 text-xl font-bold">Music Games</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-[#B3B3B3] hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/add-playlist" className="text-[#B3B3B3] hover:text-white transition-colors">
              Add Playlist
            </Link>
            <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:scale-105 transition-transform duration-200">
              Open Music App
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
                Open Music App
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
