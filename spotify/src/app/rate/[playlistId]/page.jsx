'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/components/Navbar';
import StarRating from '../../components/StarRating';

// Helper: Format seconds as mm:ss
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Music wave animation component
function MusicWaveIndicator() {
  return (
    <div className="flex space-x-1 items-end h-6">
      {[0, 0.2, 0.4, 0.6, 0.8].map((delay, index) => (
        <motion.div 
          key={index}
          className="w-1 bg-[#1DB954] rounded-full"
          animate={{ height: ["8px", "24px", "8px"] }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity, 
            delay: delay,
            ease: "easeInOut" 
          }}
        />
      ))}
    </div>
  );
}

// Improved receipt component with better styling
function Receipt({ playlist, ratings }) {
  if (!playlist || !ratings || ratings.length === 0) return null;
  
  // Calculate average rating
  const totalRating = ratings.reduce((sum, item) => sum + item.rating, 0);
  const averageRating = totalRating / ratings.length;
  
  // Get top rated songs (rating 4 or higher)
  const topRatedSongs = ratings
    .filter(item => item.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
  
  // Get lowest rated songs (rating 3 or lower)
  const lowRatedSongs = ratings
    .filter(item => item.rating <= 3)
    .sort((a, b) => a.rating - b.rating)
    .slice(0, 3);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-b from-[#1e1e1e] to-[#121212] rounded-lg p-6 max-w-2xl mx-auto border border-[#282828] shadow-xl"
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]">
            Rating Summary
          </h2>
          <p className="text-[#B3B3B3] text-lg">{playlist.name}</p>
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="bg-gradient-to-r from-[#1DB954] to-[#4caf50] text-black font-bold text-2xl p-3 rounded-lg shadow-lg"
        >
          {averageRating.toFixed(1)}
        </motion.div>
      </div>
      
      <div className="border-t border-b border-[#282828] py-6 my-6">
        <h3 className="font-bold text-xl mb-4 text-white">Your Top Picks</h3>
        {topRatedSongs.length > 0 ? (
          <div className="space-y-4">
            {topRatedSongs.map((item, index) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 * index, duration: 0.4 }}
                className="flex items-center bg-[#282828] p-3 rounded-lg hover:bg-[#333333] transition-colors"
                whileHover={{ x: 5 }}
              >
                <div className="w-12 h-12 flex-shrink-0 mr-4 overflow-hidden rounded">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow overflow-hidden">
                  <div className="font-medium truncate text-white">{item.name}</div>
                  <div className="text-sm text-[#B3B3B3] truncate">{item.artists}</div>
                </div>
                <div className="ml-3 text-[#1DB954] font-bold text-lg flex items-center">
                  {item.rating.toFixed(1)}
                  <span className="ml-1 text-[#1DB954]">★</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-[#B3B3B3] italic">No top picks found</p>
        )}
      </div>
      
      <div className="mb-6">
        <h3 className="font-bold text-xl mb-4 text-white">Needs Improvement</h3>
        {lowRatedSongs.length > 0 ? (
          <div className="space-y-4">
            {lowRatedSongs.map((item, index) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 * index + 0.6, duration: 0.4 }}
                className="flex items-center bg-[#282828] p-3 rounded-lg hover:bg-[#333333] transition-colors"
                whileHover={{ x: 5 }}
              >
                <div className="w-12 h-12 flex-shrink-0 mr-4 overflow-hidden rounded">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow overflow-hidden">
                  <div className="font-medium truncate text-white">{item.name}</div>
                  <div className="text-sm text-[#B3B3B3] truncate">{item.artists}</div>
                </div>
                <div className="ml-3 text-[#ff5252] font-bold text-lg flex items-center">
                  {item.rating.toFixed(1)}
                  <span className="ml-1 text-[#ff5252]">★</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-[#B3B3B3] italic">No low rated songs found</p>
        )}
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        className="bg-[#282828] p-4 rounded-lg flex justify-between items-center"
      >
        <div>
          <p className="text-[#B3B3B3]">Total Songs Rated</p>
          <p className="text-2xl font-bold">{ratings.length}</p>
        </div>
        <div>
          <p className="text-[#B3B3B3]">Average Rating</p>
          <div className="flex items-center">
            <span className="text-2xl font-bold mr-2">{averageRating.toFixed(1)}</span>
            <span className="text-[#1DB954]">★</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function RatePlaylist() {
  const { playlistId } = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const progressInterval = useRef(null);
  const MAX_SONGS = 10; // Limit to 10 songs

  // Load playlist data
  useEffect(() => {
    if (playlistId) {
      setLoading(true);
      fetch(`/api/playlists/${playlistId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load playlist");
          return res.json();
        })
        .then((data) => {
          // Limit to 10 songs and randomize selection
          let songs = [...data.songs];
          if (songs.length > MAX_SONGS) {
            songs = songs.sort(() => 0.5 - Math.random()).slice(0, MAX_SONGS);
          }
          setPlaylist({...data, songs});
          if (songs.length > 0) {
            setCurrentSong(songs[0]);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err.message);
          setLoading(false);
        });
    }
  }, [playlistId]);

  // Set up audio player
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.preview_url;
      audioRef.current.volume = 0.7;
      
      // Auto-play when song changes
      audioRef.current.play().catch(e => {
        console.log("Auto-play prevented:", e);
        // Some browsers prevent autoplay, we'll handle this gracefully
      });
      
      // Set up progress tracking
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const total = audioRef.current.duration;
          if (!isNaN(total) && total > 0) {
            setCurrentTime(current);
            setProgress((current / total) * 100);
          }
        }
      }, 100);
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentSong]);

  // Handle audio metadata loaded
  const handleLoadedData = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  // Handle rating selection
  const handleRatingSelect = (rating) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Add rating to the list
    const ratedSong = {
      ...currentSong,
      rating: rating
    };
    
    setRatings([...ratings, ratedSong]);
    
    // Animate transition to next song
    setTimeout(() => {
      if (currentIndex < playlist.songs.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentSong(playlist.songs[currentIndex + 1]);
      } else {
        // Last song rated, show receipt
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
        setShowReceipt(true);
      }
      setIsSubmitting(false);
    }, 500);
  };

  // Create persistent audio element
  const persistentAudio = (
    <audio
      ref={audioRef}
      onEnded={() => setIsPlaying(false)}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onLoadedData={handleLoadedData}
      style={{ display: 'none' }}
    />
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center p-4">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl text-[#B3B3B3] mb-4"
          >
            Error: {error}
          </motion.p>
          <motion.button
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => router.push('/')}
            className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90"
          >
            Go Back Home
          </motion.button>
        </div>
      </div>
    );
  }

  if (!playlist || !currentSong) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-xl text-[#B3B3B3]">No songs found in this playlist.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {showReceipt ? (
            <motion.div
              key="receipt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8"
            >
              <motion.h1 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]"
              >
                Rating Complete!
              </motion.h1>
              <Receipt playlist={playlist} ratings={ratings} />
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="flex justify-center mt-8"
              >
                <button
                  onClick={() => router.push('/')}
                  className="bg-[#1DB954] text-black font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform"
                >
                  Back to Playlists
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="rating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-bold mb-2">Rate This Song</h1>
                <p className="text-[#B3B3B3]">
                  Song {currentIndex + 1} of {playlist.songs.length}
                </p>
              </motion.div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSong.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="max-w-md mx-auto mb-8"
                >
                  <div className="bg-[#181818] rounded-lg overflow-hidden shadow-lg">
                    <motion.div 
                      className="relative aspect-square"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <img
                        src={currentSong.image_url}
                        alt={currentSong.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                        <div className="p-6">
                          <h2 className="text-2xl font-bold text-white">{currentSong.name}</h2>
                          <p className="text-[#B3B3B3]">{currentSong.artists}</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={togglePlay}
                        className="absolute top-4 right-4 bg-[#1DB954] text-black p-3 rounded-full transition-transform"
                      >
                        {isPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 012 0v2a1 1 0 11-2 0V9zm5-1a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </motion.button>
                      {isPlaying && (
                        <div className="absolute bottom-4 left-4">
                          <MusicWaveIndicator />
                        </div>
                      )}
                    </motion.div>
                    
                    <div className="p-4">
                      {/* Progress bar */}
                      <div className="relative h-1 w-full bg-[#535353] rounded-full overflow-hidden mb-2">
                        <motion.div 
                          className="absolute top-0 left-0 h-full bg-[#1DB954] rounded-full"
                          style={{ width: `${progress}%` }}
                          initial={{ width: "0%" }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.1 }}
                        ></motion.div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-[#B3B3B3] mb-4">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="mb-6">
                  <StarRating key={currentSong.id} onRatingSelect={handleRatingSelect} />
                </div>
                
                {isSubmitting && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="mt-4"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {persistentAudio}
    </div>
  );
}
