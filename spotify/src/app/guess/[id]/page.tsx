'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/components/Navbar';
import Confetti from 'react-confetti';

// Helper: Parse the artists field into an array of lowercase artist names.
function getArtists(song) {
  if (!song.artists) return [];
  if (Array.isArray(song.artists)) {
    return song.artists.map((a) => a.toLowerCase().trim());
  }
  return song.artists.split(',').map((a) => a.toLowerCase().trim());
}

// Turntable component using provided "spinny" CSS classes.
function Turntable() {
  return (
    <div className="spinny mb-6">
      <div className="spinny__inner"></div>
    </div>
  );
}

// OptionCard component always showing song name and artists, with no hard-coded colors.
function OptionCard({ option, onSelect, selected, correct }) {
  let cardClass =
    'card w-full bg-base-200 shadow-md transition-all cursor-pointer';
  if (selected) {
    cardClass += correct
      ? ' border-2 border-success'
      : ' border-2 border-error';
  } else {
    cardClass += ' border border-transparent hover:border-primary';
  }
  return (
    <motion.div
      onClick={() => onSelect(option)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cardClass}
    >
      <figure className="px-4 pt-4">
        <img
          src={option.image_url}
          alt="Song art"
          className="rounded-md object-cover h-40 w-full"
        />
      </figure>
      <div className="card-body items-center text-center p-2">
        <h2 className="card-title text-lg font-bold text-base-content">
          {option.name}
        </h2>
        {option.artists && (
          <p className="text-sm text-base-content/70">{option.artists}</p>
        )}
      </div>
    </motion.div>
  );
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

// Format time helper
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function GuessTheSong() {
  const { id } = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const MAX_ROUNDS = 10;

  // Load playlist data
  useEffect(() => {
    if (id) {
      fetch(`/api/playlists/${id}`)
        .then(res => res.json())
        .then(data => {
          setPlaylist(data);
          // Shuffle and limit to MAX_ROUNDS songs
          const shuffledSongs = [...data.songs].sort(() => 0.5 - Math.random()).slice(0, MAX_ROUNDS);
          setSongs(shuffledSongs);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching playlist:', err);
          setLoading(false);
        });
    }
  }, [id]);

  // Set up first round
  useEffect(() => {
    if (songs.length > 0 && !currentSong) {
      setupRound(songs[0]);
    }
  }, [songs]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    
    if (audio) {
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        // Auto-play when loaded
        audio.play().catch(e => console.log('Auto-play prevented:', e));
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      };
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [currentSong]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Setup a new round
  const setupRound = (song: any) => {
    setCurrentSong(song);
    setSelectedOption(null);
    setIsCorrect(null);
    
    // Create options (1 correct, 3 random)
    const incorrectOptions = songs
      .filter(s => s.id !== song.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    const allOptions = [...incorrectOptions, song].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
  };

  // Handle option selection
  const handleOptionSelect = (option: any) => {
    if (selectedOption) return; // Prevent multiple selections
    
    setSelectedOption(option.id);
    const correct = option.id === currentSong.id;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    // Move to next round after delay
    setTimeout(() => {
      if (round < songs.length) {
        setRound(prev => prev + 1);
        setupRound(songs[round]);
      } else {
        setGameOver(true);
      }
    }, 2000);
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log('Play prevented:', e));
    }
  };

  // Restart game
  const handleRestart = () => {
    setRound(1);
    setScore(0);
    setGameOver(false);
    setSelectedOption(null);
    setIsCorrect(null);
    
    // Reshuffle songs
    const shuffledSongs = [...songs].sort(() => 0.5 - Math.random());
    setSongs(shuffledSongs);
    setupRound(shuffledSongs[0]);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1e1e1e] to-[#121212] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"
        />
      </div>
    );
  }

  // Game over screen
  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1e1e1e] to-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto bg-[#181818] rounded-xl p-8 shadow-2xl"
          >
            <h1 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]">
              Game Over!
            </h1>
            
            <div className="text-center mb-8">
              <p className="text-xl text-[#B3B3B3] mb-2">Your Score</p>
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]"
              >
                {score} / {songs.length}
              </motion.div>
              
              <p className="mt-4 text-[#B3B3B3]">
                {score === songs.length 
                  ? "Perfect score! You're a music genius!" 
                  : score >= songs.length * 0.7 
                    ? "Great job! You really know your music!" 
                    : score >= songs.length * 0.5 
                      ? "Not bad! Keep listening to improve!" 
                      : "Keep practicing! You'll get better!"}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRestart}
                className="bg-[#1DB954] text-black font-bold py-3 px-6 rounded-full shadow-lg"
              >
                Play Again
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="bg-[#282828] text-white font-bold py-3 px-6 rounded-full shadow-lg"
              >
                Back to Home
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1e1e] to-[#121212]">
      <Navbar />
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-[#282828] px-4 py-2 rounded-full"
          >
            <p className="text-[#B3B3B3]">
              Round <span className="text-white font-bold">{round}</span> of <span className="text-white">{songs.length}</span>
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-[#282828] px-4 py-2 rounded-full"
          >
            <p className="text-[#B3B3B3]">
              Score: <span className="text-[#1DB954] font-bold">{score}</span>
            </p>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Guess The Song</h1>
          <p className="text-[#B3B3B3]">Listen to the preview and select the correct song</p>
        </motion.div>
        
        <div className="max-w-md mx-auto mb-10">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-[#282828] to-[#181818] rounded-xl overflow-hidden shadow-xl"
          >
            <div className="p-6 flex flex-col items-center">
              <motion.div 
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-48 h-48 rounded-full overflow-hidden mb-6 shadow-lg relative"
              >
                {/* Generic vinyl record background instead of the actual album art */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#111] to-[#333] rounded-full">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#1e1e1e] flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-[#1DB954]"></div>
                    </div>
                    <div className="absolute inset-0 border-4 border-[#444] rounded-full opacity-20"></div>
                    <div className="absolute inset-[20%] border-2 border-[#444] rounded-full opacity-20"></div>
                    <div className="absolute inset-[40%] border-2 border-[#444] rounded-full opacity-20"></div>
                  </div>
                </div>
                
                <div className="w-full h-full bg-black bg-opacity-40 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePlay}
                    className="bg-[#1DB954] text-black p-4 rounded-full shadow-lg z-10"
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 012 0v2a1 1 0 11-2 0V9zm5-1a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </motion.div>
              
              {isPlaying && (
                <div className="mb-4">
                  <MusicWaveIndicator />
                </div>
              )}
              
              <div className="w-full">
                <div className="relative h-2 w-full bg-[#535353] rounded-full overflow-hidden mb-2">
                  <motion.div 
                    className="absolute top-0 left-0 h-full bg-[#1DB954] rounded-full"
                    style={{ width: `${progress}%` }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  ></motion.div>
                </div>
                
                <div className="flex justify-between text-xs text-[#B3B3B3]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4 text-center">Which song is playing?</h2>
          
          <div className="grid gap-3">
            <AnimatePresence mode="wait">
              {options.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  onClick={() => handleOptionSelect(option)}
                  disabled={selectedOption !== null}
                  className={`p-4 rounded-lg text-left transition-all ${
                    selectedOption === option.id
                      ? isCorrect
                        ? 'bg-[#1DB954] text-black'
                        : 'bg-[#ff5252] text-white'
                      : selectedOption !== null && option.id === currentSong.id
                        ? 'bg-[#1DB954] text-black'
                        : 'bg-[#282828] hover:bg-[#333] text-white'
                  }`}
                  whileHover={selectedOption === null ? { scale: 1.02, x: 5 } : {}}
                  whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded overflow-hidden mr-3 flex-shrink-0">
                      <img 
                        src={option.image_url} 
                        alt={option.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-medium truncate">{option.name}</p>
                      <p className="text-sm text-[#B3B3B3] truncate">{option.artists}</p>
                    </div>
                    {selectedOption === option.id && (
                      <div className="ml-auto">
                        {isCorrect ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          
          {selectedOption && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <p className={`text-xl font-bold ${isCorrect ? 'text-[#1DB954]' : 'text-[#ff5252]'}`}>
                {isCorrect ? 'Correct! 🎉' : 'Wrong! 😕'}
              </p>
              <p className="text-[#B3B3B3] mt-2">
                {isCorrect 
                  ? 'Great job! You know your music.' 
                  : `The correct answer was "${currentSong.name}" by ${currentSong.artists}`}
              </p>
            </motion.div>
          )}
        </div>
      </div>
      
      <audio
        ref={audioRef}
        src={currentSong?.preview_url}
        preload="auto"
        style={{ display: 'none' }}
      />
    </div>
  );
}
  