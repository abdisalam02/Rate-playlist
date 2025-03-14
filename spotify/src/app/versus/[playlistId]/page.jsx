'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';

// Traditional Tournament Bracket component - Mobile friendly
function TournamentBracket({ initialSongs, roundsHistory = [], currentRound, winner }) {
  if (!initialSongs || initialSongs.length === 0) return null;
  
  // Ensure we have all the rounds data
  const rounds = Array.isArray(roundsHistory) ? [...roundsHistory] : [];
  
  // Add current round if it exists
  if (currentRound && currentRound.length > 0) {
    rounds.push(currentRound);
  }
  
  // For a traditional bracket, we need to organize the songs differently
  // First round (8 songs)
  const firstRound = rounds[0] || [];
  
  // Semi-finals (4 songs)
  const semiFinals = rounds[1] || [];
  
  // Finals (2 songs)
  const finals = rounds[2] || [];
  
  // Champion (1 song)
  const champion = winner || (rounds[3] && rounds[3][0]);
  
  // Split the bracket into left and right sides
  const leftFirstRound = firstRound.slice(0, 4);
  const rightFirstRound = firstRound.slice(4, 8);
  
  const leftSemiFinals = semiFinals.slice(0, 2);
  const rightSemiFinals = semiFinals.slice(2, 4);
  
  const leftFinal = finals[0];
  const rightFinal = finals[1];
  
  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <div className="tournament-bracket-container">
      <div className="tournament-bracket">
        {/* Left side of bracket */}
        <div className="bracket-section bracket-left">
          {/* Round 1 - First 4 songs */}
          <div className="bracket-round">Round 1</div>
          <div className="bracket-matches r1">
            {leftFirstRound.map((song, index) => (
              <div 
                key={song?.id || index} 
                className={`bracket-item ${leftSemiFinals[Math.floor(index/2)]?.id === song?.id ? 'winner' : ''}`}
              >
                {song && (
                  <div className="song-card">
                    <div className="song-image">
                      <img 
                        src={song.image_url} 
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!isMobile && (
                      <div className="song-details">
                        <div className="song-name">{song.name}</div>
                        <div className="song-artist">{song.artists}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Round 2 - Semi-finals left */}
          <div className="bracket-round">Semi-Finals</div>
          <div className="bracket-matches r2">
            {leftSemiFinals.map((song, index) => (
              <div 
                key={song?.id || index} 
                className={`bracket-item ${leftFinal?.id === song?.id ? 'winner' : ''}`}
              >
                {song && (
                  <div className="song-card">
                    <div className="song-image">
                      <img 
                        src={song.image_url} 
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!isMobile && (
                      <div className="song-details">
                        <div className="song-name">{song.name}</div>
                        <div className="song-artist">{song.artists}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Middle section - Finals and Champion */}
        <div className="bracket-section middle">
          {/* Finals */}
          <div className="bracket-round">Finals</div>
          <div className="bracket-matches finals-matches">
            {finals.map((song, index) => (
              <div 
                key={song?.id || index} 
                className={`bracket-item ${champion?.id === song?.id ? 'winner' : ''}`}
              >
                {song && (
                  <div className="song-card">
                    <div className="song-image">
                      <img 
                        src={song.image_url} 
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!isMobile && (
                      <div className="song-details">
                        <div className="song-name">{song.name}</div>
                        <div className="song-artist">{song.artists}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Champion */}
          {champion && (
            <div className="champion-container">
              <div className="champion-label">CHAMPION</div>
              <div className="champion">
                <div className="song-card">
                  <div className="song-image">
                    <img 
                      src={champion.image_url} 
                      alt={champion.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="song-details">
                    <div className="song-name">{champion.name}</div>
                    <div className="song-artist">{champion.artists}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right side of bracket */}
        <div className="bracket-section bracket-right">
          {/* Round 1 - Last 4 songs */}
          <div className="bracket-round">Round 1</div>
          <div className="bracket-matches r1">
            {rightFirstRound.map((song, index) => (
              <div 
                key={song?.id || index} 
                className={`bracket-item ${rightSemiFinals[Math.floor(index/2)]?.id === song?.id ? 'winner' : ''}`}
              >
                {song && (
                  <div className="song-card">
                    <div className="song-image">
                      <img 
                        src={song.image_url} 
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!isMobile && (
                      <div className="song-details">
                        <div className="song-name">{song.name}</div>
                        <div className="song-artist">{song.artists}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Round 2 - Semi-finals right */}
          <div className="bracket-round">Semi-Finals</div>
          <div className="bracket-matches r2">
            {rightSemiFinals.map((song, index) => (
              <div 
                key={song?.id || index} 
                className={`bracket-item ${rightFinal?.id === song?.id ? 'winner' : ''}`}
              >
                {song && (
                  <div className="song-card">
                    <div className="song-image">
                      <img 
                        src={song.image_url} 
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!isMobile && (
                      <div className="song-details">
                        <div className="song-name">{song.name}</div>
                        <div className="song-artist">{song.artists}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MusicWaveIndicator() {
  return (
    <div className="flex space-x-1 items-end h-6">
      <motion.div 
        className="w-1 bg-[#1DB954] rounded-full"
        animate={{ height: ["10px", "24px", "10px"] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.div 
        className="w-1 bg-[#1DB954] rounded-full"
        animate={{ height: ["18px", "8px", "18px"] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div 
        className="w-1 bg-[#1DB954] rounded-full"
        animate={{ height: ["14px", "24px", "14px"] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
      <motion.div 
        className="w-1 bg-[#1DB954] rounded-full"
        animate={{ height: ["8px", "16px", "8px"] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
      />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (playlistId) {
      setLoading(true);
      fetch(`/api/playlists/${playlistId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load playlist");
          return res.json();
        })
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
          setRoundsHistory([]);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError(err.message);
          setLoading(false);
        });
    }
  }, [playlistId]);

  const playSong = (song) => {
    if (song.preview_url && audioRef.current) {
      audioRef.current.src = song.preview_url;
      audioRef.current
        .play()
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
        setRoundsHistory((prev) => [...prev, currentRound]);
        
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-[#181818] p-6 rounded-lg max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist || initialSongs.length === 0) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-[#181818] p-6 rounded-lg max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[#B3B3B3] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h2 className="text-xl font-bold mb-2">No Songs Found</h2>
            <p className="mb-4">This playlist doesn't have enough songs for a tournament.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bracket phase
  if (gamePhase === 'bracket') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Tournament Bracket</h1>
            <p className="text-[#B3B3B3]">
              {playlist.name}
            </p>
          </div>
          
          <div className="bg-[#181818] rounded-lg p-6 mb-8">
            <TournamentBracket 
              initialSongs={initialSongs} 
              roundsHistory={[initialSongs]} 
              currentRound={[]}
            />
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={() => setGamePhase('match')} 
              className="bg-[#1DB954] text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
            >
              Start Tournament
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Winner phase
  if (gamePhase === 'winner' && winner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#121212] relative">
        <Navbar />
        <ReactConfetti
          width={typeof window !== 'undefined' ? window.innerWidth : 0}
          height={typeof window !== 'undefined' ? window.innerHeight : 0}
          recycle={false}
          numberOfPieces={500}
          gravity={0.05}
        />
        
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="bg-[#181818] rounded-lg p-8 max-w-md mx-auto text-center mb-8 shadow-xl"
          >
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-[#1DB954] to-[#4caf50] bg-clip-text text-transparent">
              Winner!
            </h2>
            
            <motion.div 
              className="relative w-48 h-48 mx-auto mb-6 rounded-lg overflow-hidden"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <img
                src={winner.image_url}
                alt={winner.name}
                className="w-full h-full object-cover"
              />
              {playingSong === winner.id && (
                <div className="absolute bottom-2 left-2">
                  <MusicWaveIndicator />
                </div>
              )}
            </motion.div>
            
            <motion.h3
              className="text-2xl font-bold mb-1"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {winner.name}
            </motion.h3>
            
            <motion.p
              className="text-[#B3B3B3] mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {winner.artists}
            </motion.p>
            
            <motion.div
              className="flex justify-center space-x-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <a
                href={`https://open.spotify.com/track/${winner.id}`}
                target="_blank"
                rel="noreferrer"
                className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform"
              >
                Open in Music App
              </a>
              
              <button
                onClick={() => router.push('/')}
                className="bg-[#282828] text-white font-bold py-2 px-6 rounded-full hover:bg-[#333] transition-colors"
              >
                Home
              </button>
            </motion.div>
          </motion.div>
          
          <div className="bg-[#181818] rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-center">Tournament Results</h3>
            <TournamentBracket 
              initialSongs={initialSongs} 
              roundsHistory={roundsHistory} 
              winner={winner} 
            />
          </div>
        </div>
        
        <audio
          ref={audioRef}
          onLoadedData={handleLoadedData}
          onEnded={handleAudioEnded}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  // Match phase
  const matchIndex = currentMatchIndex * 2;
  const songA = currentRound[matchIndex];
  const songB = currentRound[matchIndex + 1];

  if (!songB) {
    handleWinnerSelection(songA);
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Favorite</h1>
          <p className="text-[#B3B3B3]">
            Round {roundsHistory.length + 1} • Match {currentMatchIndex + 1} of {Math.floor(currentRound.length / 2)}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <motion.div
            key={songA.id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#181818] rounded-lg overflow-hidden shadow-lg flex-1"
          >
            <div className="relative aspect-video sm:aspect-square">
              <img
                src={songA.image_url}
                alt={songA.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                <div className="p-4">
                  <h2 className="text-xl font-bold">{songA.name}</h2>
                  <p className="text-[#B3B3B3] text-sm">{songA.artists}</p>
                </div>
              </div>
              <button
                onClick={() => playSong(songA)}
                className="absolute top-4 right-4 bg-[#1DB954] text-black p-3 rounded-full hover:scale-110 transition-transform"
              >
                {playingSong === songA.id ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 012 0v2a1 1 0 11-2 0V9zm5-1a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              {playingSong === songA.id && (
                <div className="absolute bottom-4 left-4">
                  <MusicWaveIndicator />
                </div>
              )}
            </div>
            <div className="p-4">
              <button 
                onClick={() => handleWinnerSelection(songA)} 
                className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-md hover:scale-105 transition-transform"
              >
                Choose
              </button>
            </div>
          </motion.div>
          
          <div className="hidden sm:flex items-center justify-center">
            <div className="bg-[#282828] rounded-full p-4">
              <span className="text-2xl font-bold">VS</span>
            </div>
          </div>
          
          <motion.div
            key={songB.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#181818] rounded-lg overflow-hidden shadow-lg flex-1"
          >
            <div className="relative aspect-video sm:aspect-square">
              <img
                src={songB.image_url}
                alt={songB.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                <div className="p-4">
                  <h2 className="text-xl font-bold">{songB.name}</h2>
                  <p className="text-[#B3B3B3] text-sm">{songB.artists}</p>
                </div>
              </div>
              <button
                onClick={() => playSong(songB)}
                className="absolute top-4 right-4 bg-[#1DB954] text-black p-3 rounded-full hover:scale-110 transition-transform"
              >
                {playingSong === songB.id ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 012 0v2a1 1 0 11-2 0V9zm5-1a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              {playingSong === songB.id && (
                <div className="absolute bottom-4 left-4">
                  <MusicWaveIndicator />
                </div>
              )}
            </div>
            <div className="p-4">
              <button 
                onClick={() => handleWinnerSelection(songB)} 
                className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-md hover:scale-105 transition-transform"
              >
                Choose
              </button>
            </div>
          </motion.div>
        </div>
        
        <div className="sm:hidden flex justify-center my-6">
          <div className="bg-[#282828] rounded-full p-3">
            <span className="text-xl font-bold">VS</span>
          </div>
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
