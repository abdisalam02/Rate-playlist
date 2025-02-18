'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/components/Navbar';
import ReactConfetti from 'react-confetti';

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

export default function GuessGame() {
  const { id } = useParams();

  // Phases: 'intro', 'question', 'final'
  const [phase, setPhase] = useState('intro');
  const [playlist, setPlaylist] = useState(null);
  const [rounds, setRounds] = useState([]); // Each round: { correctSong, options: [song, ...] }
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [roundResults, setRoundResults] = useState([]); // { correct: boolean, correctSong, selectedSong }

  // Audio state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Helper: Generate rounds from songs that have a preview.
  // For each round, after selecting a correct song, force in another song by the same artist if available.
  const generateRounds = (songs) => {
    const validSongs = songs.filter((song) => song.preview_url);
    if (validSongs.length === 0) return [];
    const numRounds = Math.min(5, validSongs.length);
    let generatedRounds = [];
    for (let i = 0; i < numRounds; i++) {
      // Pick a correct song at random.
      const correctSong =
        validSongs[Math.floor(Math.random() * validSongs.length)];
      let options = [correctSong];

      // Find another song with at least one matching artist.
      const correctArtists = getArtists(correctSong);
      const sameArtistSongs = validSongs.filter(
        (s) =>
          s.id !== correctSong.id &&
          getArtists(s).some((artist) => correctArtists.includes(artist))
      );
      if (sameArtistSongs.length > 0) {
        const forcedOption =
          sameArtistSongs[Math.floor(Math.random() * sameArtistSongs.length)];
        options.push(forcedOption);
      }
      // Fill the remaining options randomly until we have 4.
      while (options.length < 4) {
        const option =
          validSongs[Math.floor(Math.random() * validSongs.length)];
        if (!options.some((o) => o.id === option.id)) {
          options.push(option);
        }
      }
      // Shuffle the options.
      options.sort(() => 0.5 - Math.random());
      generatedRounds.push({ correctSong, options });
    }
    return generatedRounds;
  };

  // Fetch playlist and generate rounds on mount.
  useEffect(() => {
    if (id) {
      fetch(`/api/playlists/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setPlaylist(data);
          const songs = data.songs || [];
          const rounds = generateRounds(songs);
          setRounds(rounds);
        });
    }
  }, [id]);

  // When in 'question' phase, load and play the correct song preview.
  useEffect(() => {
    if (phase === 'question' && rounds.length > 0) {
      const currentQuestion = rounds[currentRoundIndex];
      if (audioRef.current && currentQuestion.correctSong.preview_url) {
        audioRef.current.src = currentQuestion.correctSong.preview_url;
        audioRef.current.load();
        audioRef.current.onloadeddata = () => {
          audioRef.current.loop = true;
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch((err) => console.error(err));
        };
      }
    }
  }, [phase, currentRoundIndex, rounds]);

  // When an option is selected, reveal its info, save round result, and advance.
  const handleOptionSelect = (option) => {
    if (!option.preview_url) return;
    if (selectedOption !== null) return;
    setSelectedOption(option.id);
    const currentQuestion = rounds[currentRoundIndex];
    const isCorrect = option.id === currentQuestion.correctSong.id;
    setRoundResults((prev) => [
      ...prev,
      {
        correct: isCorrect,
        correctSong: currentQuestion.correctSong,
        selectedSong: option,
      },
    ]);
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setTimeout(() => {
      setSelectedOption(null);
      if (currentRoundIndex < rounds.length - 1) {
        setCurrentRoundIndex((prev) => prev + 1);
        setPhase('question');
      } else {
        setPhase('final');
      }
    }, 1500);
  };

  // Reset game for replay.
  const resetGame = () => {
    setPhase('intro');
    setScore(0);
    setCurrentRoundIndex(0);
    setRounds([]);
    setPlaylist(null);
    setRoundResults([]);
    fetch(`/api/playlists/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPlaylist(data);
        const songs = data.songs || [];
        const rounds = generateRounds(songs);
        setRounds(rounds);
      });
  };

  const accuracy = rounds.length > 0 ? Math.round((score / rounds.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-base-100 text-base-content relative">
      <Navbar />
      <audio ref={audioRef} style={{ display: 'none' }} preload="auto" />
      {phase === 'final' && (
        <ReactConfetti
          width={typeof window !== 'undefined' ? window.innerWidth : 0}
          height={typeof window !== 'undefined' ? window.innerHeight : 0}
        />
      )}
      <div className="container mx-auto p-6 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="card w-full max-w-md bg-base-200 shadow-xl p-6 text-center mb-6"
            >
              <h1 className="text-4xl font-bold mb-4">Guess the Song!</h1>
              <p className="mb-6">
                You'll hear a short preview of a song—but you won't see its name
                until you guess. Choose the correct option from the four choices.
                Your score updates live.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setPhase('question')}
              >
                Start Game
              </button>
            </motion.div>
          )}

          {phase === 'question' && rounds.length > 0 && (
            <motion.div
              key="question"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center mb-6"
            >
              {/* Turntable with slower spin */}
              <Turntable />
              <p className="mb-4 text-xl">Listen carefully to the preview...</p>
              <div className="grid grid-cols-2 gap-4 w-full">
                {rounds[currentRoundIndex].options.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    onSelect={handleOptionSelect}
                    selected={selectedOption === option.id}
                    correct={
                      option.id === rounds[currentRoundIndex].correctSong.id
                    }
                  />
                ))}
              </div>
              <p className="mt-4 text-lg font-semibold">
                Score: {score} / {rounds.length}
              </p>
            </motion.div>
          )}

          {phase === 'final' && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.6 }}
              className="card w-full max-w-md bg-base-200 shadow-xl p-6 text-center receipt"
            >
              <h2 className="text-3xl font-bold mb-4">Game Over</h2>
              <p className="mb-2 text-xl">
                Final Score: {score} / {rounds.length}
              </p>
              <p className="mb-4 text-lg">Accuracy: {accuracy}%</p>
              <div className="mb-4 text-left">
                <h3 className="font-semibold mb-2">Round Details:</h3>
                <ul className="text-sm space-y-1">
                  {roundResults.map((result, index) => (
                    <li key={index} className="border-b border-base-content/50 pb-1">
                      <span className="font-semibold">Round {index + 1}:</span>{' '}
                      {result.correct ? 'Correct' : 'Wrong'} - Correct: {result.correctSong.name} ({result.correctSong.artists})
                    </li>
                  ))}
                </ul>
              </div>
              <button className="btn btn-primary mb-2" onClick={resetGame}>
                Play Again
              </button>
              <button
                className="btn btn-secondary mb-2 ml-2"
                onClick={() => alert('Share feature coming soon!')}
              >
                Share Score
              </button>
              <Link href="/">
                <button className="btn btn-outline">Back to Home</button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx global>{`
        /* Turntable styles with slower rotation */
        .spinny {
          cursor: pointer;
          position: relative;
          font-size: 20em;
          width: 1em;
          height: 1em;
          animation: spin linear 3s infinite;
          overflow: hidden;
        }
        .spinny__inner {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: url(https://i.imgur.com/cxz5loh.png) no-repeat center;
          background-size: cover;
          animation: spin linear 1.5s infinite;
          animation-direction: reverse;
          animation-play-state: paused;
        }
        .spinny:hover .spinny__inner {
          animation-play-state: running;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        /* Receipt style for final results using theme variables */
        .receipt {
          background: var(--base-100);
          border: 1px dashed var(--border-color, currentColor);
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
  