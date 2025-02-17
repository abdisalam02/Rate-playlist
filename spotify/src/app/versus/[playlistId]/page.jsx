'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import TournamentBracket from '../../components/TournamentBracket';

function MusicWaveIndicator() {
  const barVariants = {
    animate: {
      height: ["10px", "25px", "10px"],
      transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
    },
  };
  return (
    <div className="flex space-x-1">
      <motion.div className="w-1 bg-primary" variants={barVariants} animate="animate" />
      <motion.div className="w-1 bg-primary" variants={barVariants} animate="animate" transition={{ delay: 0.15 }} />
      <motion.div className="w-1 bg-primary" variants={barVariants} animate="animate" transition={{ delay: 0.3 }} />
      <motion.div className="w-1 bg-primary" variants={barVariants} animate="animate" transition={{ delay: 0.45 }} />
    </div>
  );
}

export default function VersusTournament() {
  const { playlistId } = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState(null);
  const [initialSongs, setInitialSongs] = useState([]);
  const [currentRound, setCurrentRound] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [nextRoundWinners, setNextRoundWinners] = useState([]);
  const [roundsHistory, setRoundsHistory] = useState([]);
  const [winner, setWinner] = useState(null);
  const [gamePhase, setGamePhase] = useState('bracket'); // 'bracket', 'match', 'winner'
  const [playingSong, setPlayingSong] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (playlistId) {
      fetch(`/api/playlists/${playlistId}`)
        .then((res) => res.json())
        .then((data) => {
          let songs = data.songs || [];
          // Randomly pick 8 songs for the bracket
          if (songs.length > 8) {
            songs = songs.sort(() => 0.5 - Math.random()).slice(0, 8);
          }
          data.songs = songs;
          setPlaylist(data);
          setInitialSongs(songs);
          setCurrentRound(songs);
          setRoundsHistory([songs]); // The first round
        });
    }
  }, [playlistId]);

  const playSong = (song) => {
    if (song.preview_url && audioRef.current) {
      audioRef.current.src = song.preview_url;
      audioRef.current.play()
        .then(() => setPlayingSong(song.id))
        .catch((err) => console.error(err));
    }
  };

  const handleLoadedData = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => console.error(err));
    }
  };

  const handleAudioEnded = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => console.error(err));
    }
  };

  const handleWinnerSelection = (song) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingSong(null);
    }
    setTimeout(() => {
      setNextRoundWinners((prev) => [...prev, song]);
      const totalMatches = Math.floor(currentRound.length / 2);
      if (currentMatchIndex < totalMatches - 1) {
        setCurrentMatchIndex(currentMatchIndex + 1);
      } else {
        const winnersThisRound = [...nextRoundWinners, song];
        setRoundsHistory((prev) => [...prev, winnersThisRound]);
        if (winnersThisRound.length === 1) {
          // We have a champion
          setWinner(winnersThisRound[0]);
          setGamePhase('winner');
          setTimeout(() => playSong(winnersThisRound[0]), 500);
        } else {
          // Move on to next round
          setCurrentRound(winnersThisRound);
          setCurrentMatchIndex(0);
          setNextRoundWinners([]);
        }
      }
    }, 300);
  };

  if (!playlist) {
    return (
      <div>
        <Navbar />
        <p className="p-4 text-white">Loading playlist...</p>
      </div>
    );
  }

  // Bracket phase: show your static bracket with the 8 seeds (quarterfinal) in roundsHistory[0],
  // plus later rounds if they exist.
  if (gamePhase === 'bracket') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <div className="container mx-auto p-4">
          <h1 className="text-3xl font-bold mb-4">Tournament Bracket</h1>
          <TournamentBracket roundsHistory={roundsHistory} />
          <div className="flex justify-center mt-6">
            <button onClick={() => setGamePhase('match')} className="btn btn-primary">
              Start VS
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Winner phase: show champion with confetti, plus the bracket again with the final champion placed in center
  if (gamePhase === 'winner' && winner) {
    return (
      <div className="min-h-screen bg-gray-900 text-white relative flex flex-col items-center">
        <Navbar />
        <ReactConfetti
          width={typeof window !== 'undefined' ? window.innerWidth : 0}
          height={typeof window !== 'undefined' ? window.innerHeight : 0}
        />
        <div className="container mx-auto p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="card bg-gray-800 shadow-2xl p-8 text-center rounded-xl"
          >
            <h2
              className="card-title text-4xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent animate-text text-center"
            >
              Winner!
            </h2>
            <motion.img
              src={winner.image_url}
              alt={winner.name}
              className="w-48 h-48 mx-auto rounded-lg object-cover mb-4 border-4 border-transparent hover:border-white transition-all duration-300"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            <motion.h3
              className="text-3xl font-bold mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {winner.name}
            </motion.h3>
            {winner.artist && (
              <motion.p
                className="text-xl italic mb-4 text-gray-400"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                by {winner.artist}
              </motion.p>
            )}
            <motion.a
              href={`https://open.spotify.com/track/${winner.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary text-white px-6 py-2 rounded-md shadow-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Listen on Spotify
            </motion.a>
          </motion.div>
          <div className="mt-6">
            <TournamentBracket roundsHistory={roundsHistory} />
          </div>
        </div>
      </div>
    );
  }
  

  // Match phase: pick the current pair
  const matchIndex = currentMatchIndex * 2;
  const songA = currentRound[matchIndex];
  const songB = currentRound[matchIndex + 1];

  if (!songB) {
    handleWinnerSelection(songA);
    return <div className="p-4 text-white">Advancing...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Versus Tournament</h1>
        <p className="mb-4">
          Round with {currentRound.length} songs • Match {currentMatchIndex + 1} of {Math.floor(currentRound.length / 2)}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
          {/* Song A Card */}
          <motion.div
            key={songA.id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="card bg-gray-800 shadow-xl w-full sm:w-1/2 relative"
          >
            <figure className="relative">
              <img
                src={songA.image_url}
                alt={songA.name}
                className="object-cover w-full h-48"
              />
              <button
                onClick={() => playSong(songA)}
                className="absolute bottom-2 right-2 btn btn-circle btn-primary"
              >
                ▶
              </button>
              {playingSong === songA.id && (
                <div className="absolute bottom-2 left-2">
                  <MusicWaveIndicator />
                </div>
              )}
            </figure>
            <div className="card-body text-center">
              <h2 className="card-title">{songA.name}</h2>
              {songA.artist && <p className="text-sm text-gray-400">{songA.artist}</p>}
              <button onClick={() => handleWinnerSelection(songA)} className="btn btn-secondary mt-4">
                Choose
              </button>
            </div>
          </motion.div>
          {/* VS Label */}
          <div className="flex flex-col items-center">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent"
            >
              VS
            </motion.span>
          </div>
          {/* Song B Card */}
          <motion.div
            key={songB.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="card bg-gray-800 shadow-xl w-full sm:w-1/2 relative"
          >
            <figure className="relative">
              <img
                src={songB.image_url}
                alt={songB.name}
                className="object-cover w-full h-48"
              />
              <button
                onClick={() => playSong(songB)}
                className="absolute bottom-2 right-2 btn btn-circle btn-primary"
              >
                ▶
              </button>
              {playingSong === songB.id && (
                <div className="absolute bottom-2 left-2">
                  <MusicWaveIndicator />
                </div>
              )}
            </figure>
            <div className="card-body text-center">
              <h2 className="card-title">{songB.name}</h2>
              {songB.artist && <p className="text-sm text-gray-400">{songB.artist}</p>}
              <button onClick={() => handleWinnerSelection(songB)} className="btn btn-secondary mt-4">
                Choose
              </button>
            </div>
          </motion.div>
        </div>
        <audio
          ref={audioRef}
          onLoadedData={handleLoadedData}
          onEnded={handleAudioEnded}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
