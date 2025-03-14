'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/components/Navbar';

// Helper: Get the first artist and song title.
function parseSongDetails(song: any) {
  let artist = '';
  if (Array.isArray(song.artists)) {
    artist = song.artists[0];
  } else if (typeof song.artists === 'string') {
    artist = song.artists.split(',')[0].trim();
  }
  const title = song.name || '';
  return { artist, title };
}

// Helper: Shuffle an array.
function shuffleArray(array: any[]) {
  return array.sort(() => Math.random() - 0.5);
}

// Helper: Validate if a line is a proper lyric.
function isValidLyric(line: string) {
  if (!line || typeof line !== 'string') return false;
  
  // Skip section markers like [Verse], [Chorus]
  if (line.match(/^\[.*\]$/)) return false;
  
  // Skip very short lines or lines that are just timestamps
  if (line.trim().length < 10) return false;
  if (line.match(/^\d+:\d+$/)) return false;
  
  // Skip common non-lyric lines
  const lowerLine = line.toLowerCase();
  if (lowerLine.includes('verse') || 
      lowerLine.includes('chorus') || 
      lowerLine.includes('bridge') || 
      lowerLine.includes('intro') || 
      lowerLine.includes('outro')) {
    return false;
  }
  
  // Clean the line and check if it has meaningful content
  const cleaned = line.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  return cleaned.length >= 10 && /[a-zA-Z]/.test(cleaned);
}

// Receipt component using theme classes.
function Receipt({ rounds, score }: { rounds: any[], score: number }) {
  const accuracy = Math.round((score / rounds.length) * 100);
  const getGrade = (acc: number) => {
    if (acc >= 90) return { grade: 'A', color: 'text-success' };
    if (acc >= 80) return { grade: 'B', color: 'text-info' };
    if (acc >= 70) return { grade: 'C', color: 'text-warning' };
    if (acc >= 60) return { grade: 'D', color: 'text-warning' };
    return { grade: 'F', color: 'text-error' };
  };
  
  const { grade, color } = getGrade(accuracy);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-b from-[#1e1e1e] to-[#121212] rounded-lg p-6 max-w-2xl mx-auto border border-[#282828] shadow-xl"
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]">
            Lyrics Game Results
          </h2>
          <p className="text-[#B3B3B3] text-lg">How well do you know your lyrics?</p>
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className={`text-4xl font-bold ${color}`}
        >
          {grade}
        </motion.div>
      </div>
      
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-[#282828] text-white mb-6">
        <div className="stat">
          <div className="stat-title text-[#B3B3B3]">Score</div>
          <div className="stat-value text-[#1DB954]">{score} / {rounds.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title text-[#B3B3B3]">Accuracy</div>
          <div className="stat-value text-[#1DB954]">{accuracy}%</div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-bold mb-2">Round Details</h3>
        {rounds.map((round, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg ${round.isCorrect ? 'bg-[#1e3a2f]' : 'bg-[#3a1e1e]'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                <img 
                  src={round.song.image_url} 
                  alt={round.song.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-grow">
                <p className="font-bold">{round.song.name}</p>
                <p className="text-sm text-[#B3B3B3]">{round.song.artists}</p>
              </div>
              <div className={`text-2xl ${round.isCorrect ? 'text-[#1DB954]' : 'text-[#ff5252]'}`}>
                {round.isCorrect ? '✓' : '✗'}
              </div>
            </div>
            <div className="mt-2 p-3 bg-[#121212] rounded text-sm italic">
              "{round.prompt}"
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="flex justify-center mt-8 gap-4">
        <Link href="/" className="btn btn-outline">
          Home
        </Link>
        <button onClick={() => window.location.reload()} className="btn bg-[#1DB954] text-black hover:bg-[#1ed760] border-none">
          Play Again
        </button>
      </div>
    </motion.div>
  );
}

// Layout wrapper.
const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-base-100 text-base-content">
    <div className="fixed top-0 left-0 right-0 z-50 bg-base-100">
      <Navbar />
    </div>
    <div className="pt-16 pb-8 px-4">{children}</div>
  </div>
);

// Main component.
export default function LyricsGame() {
  const { id } = useParams();
  const router = useRouter();
  const [gameState, setGameState] = useState({
    playlist: null,
    rounds: [],
    currentRoundIndex: 0,
    selectedOption: null,
    score: 0,
    status: 'loading',
    error: '',
  });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Track window size for responsive design
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    // Set initial size
    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Fetch playlist data.
  useEffect(() => {
    async function fetchPlaylist() {
      try {
        const res = await fetch(`/api/playlists/${id}`);
        if (!res.ok) throw new Error('Failed to fetch playlist');
        const data = await res.json();
        setGameState(prev => ({ ...prev, playlist: data, status: 'fetched' }));
      } catch (error) {
        console.error('Error fetching playlist:', error);
        setGameState(prev => ({
          ...prev,
          status: 'error',
          error: 'Failed to load playlist. Please try again.',
        }));
      }
    }
    if (id) {
      fetchPlaylist();
    }
  }, [id]);

  // Generate rounds once playlist is loaded.
  useEffect(() => {
    async function generateRounds() {
      if (!gameState.playlist || !gameState.playlist.songs || gameState.playlist.songs.length === 0) {
        setGameState(prev => ({ ...prev, status: 'error', error: 'No songs in playlist.' }));
        return;
      }
      const validSongs = gameState.playlist.songs.filter(
        (song: any) => song.name && song.artists && song.image_url
      );
      const shuffledCandidates = shuffleArray(validSongs).slice(0, 20);
      const maxPromptLines = 4;
      const roundPromises = shuffledCandidates.map(async (song: any) => {
        const { artist, title } = parseSongDetails(song);
        try {
          const res = await fetch(`/api/Lyrics/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
          const data = await res.json();
          
          // Process lyrics to handle different formats
          let lyrics = data.lyrics;
          if (typeof lyrics === 'string' && (lyrics.startsWith('{') || lyrics.startsWith('['))) {
            try {
              const parsedLyrics = JSON.parse(lyrics);
              if (typeof parsedLyrics === 'object' && parsedLyrics.lyrics) {
                lyrics = parsedLyrics.lyrics;
              } else if (Array.isArray(parsedLyrics)) {
                lyrics = parsedLyrics.join('\n');
              }
            } catch (e) {
              // Keep original if parsing fails
            }
          }
          
          if (!lyrics) return null;
          
          // Split lyrics into lines and filter for valid lyrics
          const lines = lyrics.split('\n')
            .map((line: string) => line.trim())
            .filter(isValidLyric);
            
          if (lines.length < maxPromptLines + 1) return null;
          
          // Find a good breaking point for the lyrics
          // Try to break at the end of a sentence or phrase
          let breakIndex = -1;
          for (let i = maxPromptLines; i >= 1; i--) {
            const line = lines[i];
            if (line.endsWith('.') || line.endsWith('?') || line.endsWith('!') || line.endsWith(':')) {
              breakIndex = i;
              break;
            }
          }
          
          // If no good breaking point found, use a random one
          if (breakIndex === -1) {
            breakIndex = Math.floor(Math.random() * (maxPromptLines - 1)) + 1;
          }

          const prompt = lines.slice(0, breakIndex + 1).join('\n');
          const correctAnswer = lines[breakIndex + 1];
          
          // Filter out very similar lines to avoid confusion
          const validDistractors = lines.filter((line: string, i: number) => {
            if (i === breakIndex + 1) return false;
            
            // Check if line is too similar to correct answer
            const correctLower = correctAnswer.toLowerCase();
            const lineLower = line.toLowerCase();
            
            // Skip if starts with same 3+ words
            const correctWords = correctLower.split(' ');
            const lineWords = lineLower.split(' ');
            
            if (correctWords.length >= 3 && lineWords.length >= 3) {
              const correctStart = correctWords.slice(0, 3).join(' ');
              const lineStart = lineWords.slice(0, 3).join(' ');
              if (correctStart === lineStart) return false;
            }
            
            return lineLower !== correctLower;
          });
          
          if (validDistractors.length < 3) return null;
          
          // Get 3 random distractors
          const distractors = shuffleArray(validDistractors).slice(0, 3);
          
          // Create options with the correct answer and distractors
          const options = shuffleArray([
            { id: 'correct', text: correctAnswer },
            ...distractors.map((text: string, i: number) => ({ id: `wrong-${i}`, text })),
          ]);
          
          return {
            song,
            prompt,
            correctAnswer,
            options,
          };
        } catch (error) {
          console.error(`Error fetching lyrics for ${title}:`, error);
          return null;
        }
      });

      const roundResults = await Promise.all(roundPromises);
      const validRounds = roundResults.filter(Boolean).slice(0, 10); // Limit to 10 rounds
      
      if (validRounds.length === 0) {
        setGameState(prev => ({
          ...prev,
          status: 'error',
          error: 'Could not find enough songs with lyrics. Please try another playlist.',
        }));
        return;
      }
      setGameState(prev => ({ ...prev, rounds: validRounds, status: 'ready' }));
      setDataLoaded(true);
    }
    if (gameState.playlist) {
      generateRounds();
    }
  }, [gameState.playlist]);

  // Handle option selection.
  function handleOptionSelect(option: any) {
    if (gameState.selectedOption !== null) return;
    const currentRound = gameState.rounds[gameState.currentRoundIndex];
    const isCorrect = option.id === 'correct';
    setGameState(prev => ({
      ...prev,
      selectedOption: option.id,
      score: isCorrect ? prev.score + 1 : prev.score,
    }));

    // Store round result for the receipt
    const updatedRounds = [...gameState.rounds];
    updatedRounds[gameState.currentRoundIndex] = {
      ...currentRound,
      isCorrect,
      selectedOption: option,
    };
    
    setGameState(prev => ({
      ...prev,
      rounds: updatedRounds,
    }));

    // Move to next round after delay.
    setTimeout(() => {
      if (gameState.currentRoundIndex < gameState.rounds.length - 1) {
        setGameState(prev => ({
          ...prev,
          currentRoundIndex: prev.currentRoundIndex + 1,
          selectedOption: null,
        }));
      } else {
        setGameState(prev => ({ ...prev, status: 'complete' }));
      }
    }, 2000);
  }

  // Loading state.
  if (gameState.status === 'loading' || gameState.status === 'fetched') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954] mb-4"
          />
          <p className="text-lg text-[#B3B3B3]">Loading lyrics game...</p>
        </div>
      </Layout>
    );
  }

  // Error state.
  if (gameState.status === 'error') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="bg-[#282828] p-8 rounded-lg max-w-md text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-[#ff5252] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong</h2>
            <p className="text-[#B3B3B3] mb-6">{gameState.error}</p>
            <Link href="/" className="btn bg-[#1DB954] text-black hover:bg-[#1ed760] border-none">
              Back to Home
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Game complete, show receipt.
  if (gameState.status === 'complete') {
    return (
      <Layout>
        <Receipt rounds={gameState.rounds} score={gameState.score} />
      </Layout>
    );
  }

  // Active game.
  const currentRound = gameState.rounds[gameState.currentRoundIndex];
  const song = currentRound.song;
  const songDetails = parseSongDetails(song);
  const options = currentRound.options;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-[#282828] px-4 py-2 rounded-full"
          >
            <p className="text-[#B3B3B3]">
              Round <span className="text-white font-bold">{gameState.currentRoundIndex + 1}</span> of <span className="text-white">{gameState.rounds.length}</span>
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-[#282828] px-4 py-2 rounded-full"
          >
            <p className="text-[#B3B3B3]">
              Score: <span className="text-[#1DB954] font-bold">{gameState.score}</span>
            </p>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Complete the Lyrics</h1>
          <p className="text-[#B3B3B3]">What comes next in these lyrics?</p>
        </motion.div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={gameState.currentRoundIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              <motion.img 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                src={song.image_url} 
                alt={song.name} 
                className="w-48 h-48 object-cover rounded-lg shadow-xl" 
              />
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold">{song.name}</h2>
                <p className="text-xl text-base-content/70">{songDetails.artist}</p>
              </div>
            </div>
            
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-[#1e1e1e] to-[#282828] p-6 rounded-lg shadow-lg mb-8"
            >
              <div className="text-xl italic leading-relaxed whitespace-pre-line">
                "{currentRound.prompt}"
              </div>
              <div className="mt-4 flex items-center">
                <div className="h-0.5 flex-grow bg-[#1DB954] opacity-50"></div>
                <div className="px-4 text-[#B3B3B3]">What comes next?</div>
                <div className="h-0.5 flex-grow bg-[#1DB954] opacity-50"></div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option: any, idx: number) => (
            <motion.button
              key={idx}
              onClick={() => handleOptionSelect(option)}
              disabled={gameState.selectedOption !== null}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-4 rounded-lg text-left transition-all ${
                gameState.selectedOption === option.id
                  ? option.id === 'correct'
                    ? 'bg-[#1DB954] text-black'
                    : 'bg-[#ff5252] text-white'
                  : gameState.selectedOption !== null && option.id === 'correct'
                    ? 'bg-[#1DB954] text-black'
                    : 'bg-[#282828] hover:bg-[#333] text-white'
              }`}
              whileHover={gameState.selectedOption === null ? { scale: 1.02, x: 5 } : {}}
              whileTap={gameState.selectedOption === null ? { scale: 0.98 } : {}}
            >
              <div className="text-lg">{option.text}</div>
              {gameState.selectedOption !== null && (
                <div className="mt-2">
                  {option.id === 'correct' && (
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Correct answer
                    </div>
                  )}
                  {gameState.selectedOption === option.id && option.id !== 'correct' && (
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Your answer
                    </div>
                  )}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
