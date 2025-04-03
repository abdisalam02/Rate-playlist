'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/components/Navbar';
import Confetti from 'react-confetti';
import Image from 'next/image'; // Import next/image
import {
  PlayIcon as SolidPlayIcon,
  PauseIcon as SolidPauseIcon,
  ArrowLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';


// --- Type Definitions ---
interface Song {
  id: string;
  name: string;
  artists: string | { name: string }[]; // Allow string or array of artist objects
  image_url?: string | null; // From playlist fetch, may differ from album image
  album?: { images?: { url: string }[] }; // More standard Spotify track structure
  preview_url?: string | null;
}

interface PlaylistInfo {
    id: string;
    name: string;
    songs: Song[]; // Assuming API returns tracks with preview_url
    images?: { url: string }[]; // Playlist cover image
    description?: string;
    image_url?: string | null; // Add image_url here for the state update
}

interface OptionCardProps {
  option: Song;
  onSelect: (option: Song) => void;
  selected: boolean;
  isCorrect: boolean | null; // Renamed for clarity
}

// Helper: Parse the artists field into a display string
function getArtistDisplay(song: Song): string {
  if (!song.artists) return 'Unknown Artist';
  if (Array.isArray(song.artists)) {
    // Handle array of artist objects
    return song.artists.map(artist => artist?.name || 'Unknown').filter(Boolean).join(', ');
  }
  // Handle simple string (though Spotify API usually sends array)
  if (typeof song.artists === 'string') {
      return song.artists;
  }
  return 'Unknown Artist';
}


// --- Components ---

// OptionCard component using Next/Image and modern styling
function OptionCard({ option, onSelect, selected, isCorrect }: OptionCardProps) {
  const [imageError, setImageError] = useState(false);
  // Prefer album image if available, fallback to image_url or placeholder
  const imageUrl = imageError ? '/placeholder-album.png' : option.album?.images?.[0]?.url || option.image_url || '/placeholder-album.png';

  let borderClass = 'border-neutral-700/50'; // Default border
  let overlayClass = '';
  if (selected) {
    borderClass = isCorrect ? 'border-green-500' : 'border-red-500';
    overlayClass = isCorrect ? 'bg-green-500/20' : 'bg-red-500/20';
  }

  return (
    <motion.button
      onClick={() => onSelect(option)}
      whileHover={{ scale: selected ? 1 : 1.03 }} // Only hover scale if not selected
      whileTap={{ scale: selected ? 1 : 0.97 }} // Only tap scale if not selected
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      disabled={selected} // Disable after selection
      className={`bg-[#181818] rounded-lg overflow-hidden transition-all duration-200 w-full text-left border ${borderClass} ${selected ? 'cursor-default' : 'hover:border-neutral-500 cursor-pointer'}`}
    >
      <div className="relative aspect-square w-full">
        <Image
          src={imageUrl}
          alt={option.name || 'Song art'}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover"
          unoptimized={imageUrl.includes('scdn.co')} // Unoptimize Spotify images
          onError={() => setImageError(true)}
        />
        {/* Optional: Subtle overlay for selected state */}
        {selected && <div className={`absolute inset-0 ${overlayClass}`}></div>}
      </div>
      <div className="p-3">
        <h2 className="font-semibold text-sm text-white truncate" title={option.name}>
          {option.name}
        </h2>
        <p className="text-xs text-neutral-400 truncate" title={getArtistDisplay(option)}>
          {getArtistDisplay(option)}
        </p>
      </div>
    </motion.button>
  );
}

// Music wave animation component (matches main app style)
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
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Main Page Component ---

export default function GuessTheSongPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const router = useRouter();

  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [gameSongs, setGameSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [options, setOptions] = useState<Song[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState<number>(0);
  const [round, setRound] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement>(null); // Specify HTMLAudioElement
  const nextRoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_ROUNDS = 10;

  // Load playlist data
  useEffect(() => {
    if (playlistId) {
        console.log(`[GuessGame] Fetching playlist with ID: ${playlistId}`);
        setLoading(true);
        setError(null);
        // Assume API fetches playlist details including tracks
        fetch(`/api/playlists/${playlistId}`) 
            .then(async (res) => {
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to fetch playlist: ${res.status} ${errorText}`);
                }
                return res.json();
            })
            .then((data: PlaylistInfo) => {
                console.log("[GuessGame] Playlist data fetched:", data);
                if (!data || !Array.isArray(data.songs) || data.songs.length === 0) {
                    throw new Error('Playlist data is invalid or contains no songs.');
                }
                // Set playlist state correctly, using data.images for image_url
                setPlaylist({ 
                    ...data, 
                    image_url: data.images?.[0]?.url || null // Use image from images array
                });

                // Ensure songs have necessary structure (adjust if API differs)
                const usableSongs = data.songs.map(s => ({ 
                    ...s,
                    // Make sure image_url exists for option card fallback
                    image_url: s.album?.images?.[0]?.url || s.image_url || null 
                })); 

                const playableSongs = usableSongs.filter(song => song.preview_url);
                if (playableSongs.length < 4) { // Need at least 4 songs for 1 correct + 3 options
                   throw new Error(`Not enough playable songs with previews (${playableSongs.length}) in this playlist for the game.`);
                }
                const shuffledSongs = [...playableSongs].sort(() => 0.5 - Math.random()).slice(0, MAX_ROUNDS);
                console.log(`[GuessGame] Using ${shuffledSongs.length} songs for the game.`);
                setGameSongs(shuffledSongs);
                setRound(0); 
                setScore(0);
                setGameOver(false);
            })
            .catch(err => {
                console.error('[GuessGame] Error fetching playlist:', err);
                setError(err.message || 'Could not load playlist data.');
            })
            .finally(() => {
                setLoading(false);
            });
    } else {
        setError("Playlist ID is missing.");
        setLoading(false);
    }

    // Cleanup timeout on unmount or playlistId change
    return () => {
      if (nextRoundTimeoutRef.current) {
        clearTimeout(nextRoundTimeoutRef.current);
      }
    };
  }, [playlistId]);

  // Setup round effect 
  useEffect(() => {
      if (!gameOver && gameSongs.length > 0 && round < gameSongs.length) {
          console.log(`[GuessGame] Setting up round ${round + 1}`);
          setupRound(gameSongs[round]);
      } else if (!gameOver && gameSongs.length > 0 && round >= gameSongs.length) {
          console.log("[GuessGame] Game over condition met in round effect.");
          setGameOver(true);
      }
  }, [round, gameSongs, gameOver]); 

  // --- Audio Handling ---
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleLoadedMetadata = () => {
          const audioDuration = isNaN(audio.duration) || audio.duration === Infinity ? 30 : audio.duration;
          console.log(`[GuessGame] Audio metadata loaded. Duration: ${audioDuration}`);
          setDuration(audioDuration);
          // Attempt auto-play only if a new round just started (selectedOptionId is null)
          if (!selectedOptionId) {
              audio.play().catch(e => console.warn('[GuessGame] Audio auto-play prevented:', e));
          }
      };
      const handleTimeUpdate = () => {
          if (audio.duration) {
              setCurrentTime(audio.currentTime);
              setProgress((audio.currentTime / audio.duration) * 100);
          }
      };
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
          setIsPlaying(false);
          // Optionally loop? For now, just stop.
          // setCurrentTime(0);
          // setProgress(0);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause); 
      audio.addEventListener('ended', handleEnded);

      // Reset state when currentSong changes
      setDuration(30); 
      setCurrentTime(0);
      setProgress(0);
      setIsPlaying(false);

      return () => {
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('ended', handleEnded);
          audio.pause(); 
      };
  }, [currentSong]); 

  // --- Game Logic ---
  const setupRound = (song: Song) => {
    console.log("[GuessGame] Setting up round with song:", song.name);
    setCurrentSong(song);
    setSelectedOptionId(null);
    setIsCorrect(null);
    setShowConfetti(false);
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);

    // Create options (1 correct, 3 random incorrect)
    const incorrectOptions = gameSongs
      .filter(s => s.id !== song.id) 
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // Ensure we have enough incorrect options (if playableSongs is small)
    while (incorrectOptions.length < 3 && gameSongs.length > incorrectOptions.length + 1) {
        const potentialOption = gameSongs[Math.floor(Math.random() * gameSongs.length)];
        if (potentialOption.id !== song.id && !incorrectOptions.some(o => o.id === potentialOption.id)) {
            incorrectOptions.push(potentialOption);
        }
    }
    
    // Check if we managed to get 3 incorrect options
    if (incorrectOptions.length < 3) {
        console.warn("[GuessGame] Could not generate 3 unique incorrect options.");
        // Handle this case - maybe repeat options or end game? For now, continue with fewer.
    }

    const allOptions = [...incorrectOptions, song].sort(() => 0.5 - Math.random());
    console.log("[GuessGame] Options generated:", allOptions.map(o => o.name));
    setOptions(allOptions);

     if (audioRef.current) {
         audioRef.current.pause();
         audioRef.current.src = song.preview_url || '';
         audioRef.current.load(); 
         console.log("[GuessGame] Audio source updated:", song.preview_url);
     }
  };

  const handleOptionSelect = (option: Song) => {
    if (selectedOptionId) return;

    console.log("[GuessGame] Option selected:", option.name);
    setSelectedOptionId(option.id);
    const correct = option.id === currentSong?.id;
    setIsCorrect(correct);
    console.log("[GuessGame] Answer is correct:", correct);

    if (correct) {
      setScore(prev => prev + 1);
      setShowConfetti(true);
    }

    if (audioRef.current) audioRef.current.pause();

    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);

    nextRoundTimeoutRef.current = setTimeout(() => {
        if (round + 1 < gameSongs.length) {
            console.log("[GuessGame] Moving to next round.");
            setRound(prev => prev + 1);
        } else {
            console.log("[GuessGame] Setting game over.");
            setGameOver(true);
        }
        setShowConfetti(false); 
    }, 2000); // Shorter delay
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentSong?.preview_url) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.error('[GuessGame] Error playing audio:', e));
  };

  const handleRestart = () => {
      console.log("[GuessGame] Restarting game.");
      // Reset all game state immediately
      setLoading(true); 
      setError(null);
      setScore(0);
      setRound(0); 
      setGameOver(false);
      setSelectedOptionId(null);
      setIsCorrect(null);
      setShowConfetti(false);
      setCurrentSong(null); // Clear current song
      setOptions([]); // Clear options

      // Reshuffle game songs from the originally fetched playlist
      if (playlist && playlist.songs) {
          const playableSongs = playlist.songs.filter(song => song.preview_url);
           if (playableSongs.length < 4) {
               setError('Not enough playable songs to restart.');
               setLoading(false);
               return;
           }
          const shuffledSongs = [...playableSongs].sort(() => 0.5 - Math.random()).slice(0, MAX_ROUNDS);
          setGameSongs(shuffledSongs); 
          // The round change effect will pick up round 0 and call setupRound
          setLoading(false); 
      } else {
          setError("Cannot restart game, playlist data is missing.");
          setLoading(false);
      }
  };

  const handleReturn = () => router.push('/playlists');

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black flex items-center justify-center text-white">
         <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954] mx-auto mb-4"></div>
            <p className="text-neutral-400">Loading Guessing Game...</p>
         </div>
      </div>
    );
  }

  if (error) {
     return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8 pt-24 text-center">
          <h1 className="text-2xl font-bold mb-3 text-red-500">Game Error</h1>
          <p className="text-neutral-300 mb-6 text-sm">{error}</p>
          <Link href="/playlists" className="inline-flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 px-6 rounded-full transition-colors text-sm">
             <ArrowLeftIcon className="w-4 h-4" />
            Back to Playlists
          </Link>
        </main>
      </div>
    );
  }
  
  // Fallback if something went wrong during initialization
  if (!playlist || !currentSong) {
     return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8 pt-24 text-center">
          <h1 className="text-2xl font-bold mb-3">Initialization Error</h1>
          <p className="text-neutral-400 mb-6 text-sm">Could not start the game. Please try again or select a different playlist.</p>
           <Link href="/playlists" className="inline-flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 px-6 rounded-full transition-colors text-sm">
             <ArrowLeftIcon className="w-4 h-4" />
            Back to Playlists
          </Link>
        </main>
      </div>
    );
  }

  // Main Game UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F1F1F] to-[#121212] text-white">
      {/* Confetti positioned absolutely */} 
      {showConfetti && 
        <div className="absolute inset-0 z-50 pointer-events-none">
          <Confetti recycle={false} numberOfPieces={300} width={window.innerWidth} height={window.innerHeight} />
        </div>
      }
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 pt-24">
        <AnimatePresence mode="wait">
          {gameOver ? (
            // Game Over Screen - Enhanced Styling
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center bg-[#181818] p-8 rounded-xl shadow-xl border border-neutral-700/50"
            >
              <h1 className="text-3xl font-bold mb-3 text-[#1DB954]">Game Over!</h1>
              <p className="text-xl mb-6 text-neutral-200">Your final score: <span className="font-bold text-white">{score}</span> / {gameSongs.length}</p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button onClick={handleRestart} className="w-full sm:w-auto flex justify-center items-center gap-2 bg-[#1DB954] text-black font-bold py-2.5 px-6 rounded-full hover:scale-105 transition-transform text-sm">
                  <ArrowPathIcon className="w-5 h-5"/> Play Again
                </button>
                <button onClick={handleReturn} className="w-full sm:w-auto flex justify-center items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2.5 px-6 rounded-full transition-colors text-sm">
                   <ArrowLeftIcon className="w-5 h-5" /> Back to Playlists
                </button>
              </div>
            </motion.div>
          ) : (
            // Active Game Round Screen
            <motion.div
              key={round} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header - Simplified */}
              <div className="text-center mb-6">
                {/* <Link href="/playlists" className="text-xs text-neutral-400 hover:text-[#1DB954] inline-flex items-center gap-1 mb-2">
                    <ArrowLeftIcon className="w-3 h-3"/> Back to Playlists
                </Link> */} 
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">Guess the Song</h1>
                <p className="text-xs text-neutral-400 truncate px-4 mb-2" title={playlist.name}>{playlist.name}</p>
                <div className="flex justify-center items-baseline gap-3 text-base">
                    <span className="font-semibold text-neutral-200">Round: <span className="text-[#1DB954]">{round + 1}</span> / {gameSongs.length}</span>
                    <span className="text-neutral-300">Score: <span className="text-white font-medium">{score}</span></span>
                </div>
              </div>

              {/* Core Game Area */}
              <div className="mb-6 flex flex-col items-center">
                  {/* Audio Player - Centered */} 
                  <div className="w-full max-w-sm bg-[#181818] p-4 rounded-lg shadow-md mb-6 border border-neutral-700/50">
                     {currentSong.preview_url ? (
                        <>
                          {/* Preload metadata for faster duration display */} 
                          <audio ref={audioRef} src={currentSong.preview_url} preload="metadata" className="hidden" />
                          <div className="flex items-center space-x-3">
                            <button onClick={togglePlay} className="bg-[#1DB954] rounded-full p-2 text-black flex-shrink-0 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed" disabled={!currentSong.preview_url || selectedOptionId !== null} aria-label={isPlaying ? 'Pause preview' : 'Play preview'}>
                              {isPlaying ? <SolidPauseIcon className="w-5 h-5" /> : <SolidPlayIcon className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 overflow-hidden">
                               {/* Simple Progress Bar */} 
                               <div className="w-full bg-neutral-600 rounded-full h-1.5 relative overflow-hidden">
                                <motion.div 
                                  className="bg-[#1DB954] h-1.5 rounded-full absolute left-0 top-0 bottom-0"
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.1, ease: "linear" }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-center text-neutral-500 py-4 text-sm">No audio preview available.</p>
                      )}
                  </div>

                  {/* Options Grid */} 
                  <p className="text-sm text-neutral-300 mb-4">Which song is playing?</p>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                    {options.map((option) => (
                      <OptionCard
                        key={option.id}
                        option={option}
                        onSelect={handleOptionSelect}
                        selected={selectedOptionId === option.id}
                        isCorrect={isCorrect !== null && option.id === currentSong?.id}
                      />
                    ))}
                  </div>
                </div>
              

              {/* Display feedback */} 
              <div className="h-8 mt-2 relative mb-6"> 
                  <AnimatePresence>
                    {selectedOptionId && isCorrect !== null && (
                      <motion.div 
                        key={selectedOptionId} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute inset-x-0 top-0 p-1.5 rounded-md text-center font-medium text-xs ${isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} border ${isCorrect ? 'border-green-500/30' : 'border-red-500/30'}`}
                      >
                        {isCorrect ? 'Correct!' : `Incorrect! The answer was ${currentSong.name}`}
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>
              
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}


