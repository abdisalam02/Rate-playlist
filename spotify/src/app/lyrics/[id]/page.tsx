'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

// Helper: Shuffle an array.
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

// Helper to validate if a line is a proper lyric.
function isValidLyric(line) {
  if (!line || typeof line !== 'string') return false;
  const cleaned = line.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  return cleaned.length >= 2 && /[a-zA-Z]/.test(cleaned);
}

function Receipt({ rounds, score }) {
  const accuracy = Math.round((score / rounds.length) * 100);
  const getGrade = (acc) => {
    if (acc >= 90) return { grade: 'A', color: 'text-green-400' };
    if (acc >= 80) return { grade: 'B', color: 'text-blue-400' };
    if (acc >= 70) return { grade: 'C', color: 'text-yellow-400' };
    if (acc >= 60) return { grade: 'D', color: 'text-orange-400' };
    return { grade: 'F', color: 'text-red-400' };
  };
  const { grade, color } = getGrade(accuracy);

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-gray-800 rounded-lg border border-gray-700 shadow-xl"
      >
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">Your Results</h1>
          <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto"></div>
        </div>
        <div className="space-y-6">
          <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
            <span className="text-xl">Final Score</span>
            <span className="text-2xl font-bold">{score} / {rounds.length}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
            <span className="text-xl">Accuracy</span>
            <span className="text-2xl font-bold">{accuracy}%</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
            <span className="text-xl">Grade</span>
            <span className={`text-3xl font-bold ${color}`}>{grade}</span>
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary px-8 py-3"
            >
              Back to Home
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function FinishLyricGame() {
  const { id } = useParams();

  // Clear any saved state on mount so that every visit starts fresh.
  useEffect(() => {
    if (id) {
      localStorage.removeItem(`finishLyricGame-${id}`);
    }
  }, [id]);

  // Initialize game state WITHOUT loading persisted state.
  const [gameState, setGameState] = useState({
    playlist: null,
    rounds: [],
    currentRoundIndex: 0,
    selectedOption: null,
    score: 0,
    status: 'loading', // 'loading' | 'ready' | 'playing' | 'finished' | 'error'
    error: ''
  });

  // Optionally, you can remove the persistence effect below if you don't want state to be saved across refreshes.
  // Persist state to localStorage on change.
  useEffect(() => {
    if (id) {
      localStorage.setItem(`finishLyricGame-${id}`, JSON.stringify(gameState));
    }
  }, [gameState, id]);

  // Layout wrapper.
  const Layout = ({ children }) => (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900">
        <Navbar />
      </div>
      <div className="pt-16">{children}</div>
    </div>
  );

  // Fetch the playlist.
  useEffect(() => {
    if (!id || gameState.playlist) return;
    async function fetchPlaylist() {
      try {
        const res = await fetch(`/api/playlists/${id}`);
        const data = await res.json();
        if (!data || !data.songs || data.songs.length === 0) {
          setGameState(prev => ({ ...prev, status: 'error', error: 'Invalid playlist' }));
          return;
        }
        setGameState(prev => ({ ...prev, playlist: data }));
      } catch (err) {
        setGameState(prev => ({ ...prev, status: 'error', error: 'Failed to load playlist.' }));
      }
    }
    fetchPlaylist();
  }, [id, gameState.playlist]);

  // Generate rounds once the playlist is loaded.
  useEffect(() => {
    async function generateRounds() {
      if (!gameState.playlist || !gameState.playlist.songs || gameState.playlist.songs.length === 0) {
        setGameState(prev => ({ ...prev, status: 'error', error: 'No songs in playlist.' }));
        return;
      }
      const validSongs = gameState.playlist.songs.filter(
        song => song.name && song.artists && song.image_url
      );
      const shuffledCandidates = shuffleArray(validSongs).slice(0, 20);
      const maxPromptLines = 4;
      const roundPromises = shuffledCandidates.map(async (song) => {
        const { artist, title } = parseSongDetails(song);
        try {
          const res = await fetch(
            `/api/Lyrics/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
          );
          const data = await res.json();
          if (!data.lyrics) return null;
          const lines = data.lyrics
            .split('\n')
            .map(line => line.trim())
            .filter(isValidLyric);
          if (lines.length < maxPromptLines + 1) return null;
          const upperBound = Math.min(maxPromptLines, lines.length - 1);
          const breakIndex = Math.floor(Math.random() * upperBound);
          const prompt = lines.slice(0, breakIndex + 1).join('\n');
          const correctAnswer = lines[breakIndex + 1];
          const validDistractors = lines.filter((line, i) =>
            i !== breakIndex + 1 &&
            line.toLowerCase() !== correctAnswer.toLowerCase()
          );
          if (validDistractors.length < 3) return null;
          const distractors = shuffleArray(validDistractors).slice(0, 3);
          return {
            song,
            prompt,
            correctAnswer,
            options: shuffleArray([correctAnswer, ...distractors])
          };
        } catch (err) {
          console.error(`Error fetching lyrics for ${title}:`, err);
          return null;
        }
      });
      const roundsResults = await Promise.all(roundPromises);
      const validRounds = roundsResults.filter(r => r !== null).slice(0, 10);
      if (validRounds.length === 0) {
        setGameState(prev => ({
          ...prev,
          status: 'error',
          error: 'Could not generate valid rounds. Please try another playlist.'
        }));
        return;
      }
      setGameState(prev => ({ ...prev, rounds: validRounds, status: 'ready' }));
    }
    if (gameState.playlist) {
      generateRounds();
    }
  }, [gameState.playlist, gameState.rounds.length]);

  function handleStartGame() {
    setGameState(prev => ({ ...prev, status: 'playing' }));
  }

  function handleOptionSelect(option) {
    if (gameState.selectedOption !== null) return;
    const currentRound = gameState.rounds[gameState.currentRoundIndex];
    const isCorrect = option === currentRound.correctAnswer;
    setGameState(prev => ({
      ...prev,
      selectedOption: option,
      score: isCorrect ? prev.score + 1 : prev.score
    }));
    setTimeout(() => {
      const nextIndex = gameState.currentRoundIndex + 1;
      setGameState(prev => ({
        ...prev,
        selectedOption: null,
        currentRoundIndex: nextIndex,
        status: nextIndex >= prev.rounds.length ? 'finished' : 'playing'
      }));
    }, 1500);
  }

  // Loading state.
  if (gameState.status === 'loading') {
    return (
      <Layout>
        <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mb-4"
          >
            <svg className="w-16 h-16 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </motion.div>
          <p className="text-xl animate-pulse">Loading your music quiz...</p>
        </div>
      </Layout>
    );
  }

  if (gameState.status === 'error') {
    return (
      <Layout>
        <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-red-500 text-xl mb-4">{gameState.error}</p>
            <Link href="/">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary">
                Back to Home
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (gameState.status === 'ready') {
    return (
      <Layout>
        <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl font-bold mb-6">Ready to Play?</h1>
            <p className="text-xl mb-8">We've prepared {gameState.rounds.length} songs for you!</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartGame}
              className="btn btn-primary px-8 py-3 text-lg"
            >
              Start Game
            </motion.button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (gameState.status === 'finished') {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
          <Receipt rounds={gameState.rounds} score={gameState.score} />
        </div>
      </Layout>
    );
  }

  // Playing state.
  const currentRound = gameState.rounds[gameState.currentRoundIndex];
  const { song, prompt, options, correctAnswer } = currentRound;
  const songDetails = parseSongDetails(song);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold mb-8 text-center">
          Finish the Lyric
        </motion.h1>
        <AnimatePresence mode="wait">
          <motion.div key={gameState.currentRoundIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="mb-8">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              <motion.img initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} src={song.image_url} alt={song.name} className="w-48 h-48 object-cover rounded-lg shadow-xl" />
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold">{song.name}</h2>
                <p className="text-xl text-gray-300">{songDetails.artist}</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg mb-6 whitespace-pre-wrap font-mono border border-gray-700 shadow-lg">
              <pre className="text-lg">{prompt}</pre>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option, idx) => (
            <motion.button
              key={idx}
              onClick={() => handleOptionSelect(option)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.1 } }}
              className={`
                p-4 rounded-lg text-lg font-medium transition-all
                ${gameState.selectedOption !== null
                  ? option === correctAnswer
                    ? 'bg-green-600 border-green-600'
                    : option === gameState.selectedOption
                    ? 'bg-red-600 border-red-600'
                    : 'bg-gray-700 border-gray-600'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }
              `}
            >
              {option}
            </motion.button>
          ))}
        </div>
        <p className="mt-6 text-xl text-center">
          Score: {gameState.score} / {gameState.rounds.length}
        </p>
      </div>
    </Layout>
  );
}
