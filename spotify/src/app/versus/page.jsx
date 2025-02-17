'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';

export default function VersusGame() {
  const { playlistId } = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState(null);
  // currentRound holds the list of songs competing in the current round
  const [currentRound, setCurrentRound] = useState([]);
  // currentMatchIndex points to the current match (each match is a pair)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  // nextRoundWinners collects winners of the current round
  const [nextRoundWinners, setNextRoundWinners] = useState([]);
  // Final winner, once only one song remains
  const [winner, setWinner] = useState(null);
  // For playing song previews
  const audioRef = useRef(null);

  // Fetch playlist and choose songs on mount
  useEffect(() => {
    if (playlistId) {
      fetch(`/api/playlists/${playlistId}`)
        .then((res) => res.json())
        .then((data) => {
          let songs = data.songs || [];
          // If more than 10 songs, randomly pick 10; then force a bracket of 8 if possible.
          if (songs.length > 10) {
            songs = songs.sort(() => 0.5 - Math.random()).slice(0, 10);
          }
          // If we have at least 8 songs, use 8; otherwise, use available songs.
          if (songs.length >= 8) {
            songs = songs.sort(() => 0.5 - Math.random()).slice(0, 8);
          }
          data.songs = songs;
          setPlaylist(data);
          setCurrentRound(songs);
        });
    }
  }, [playlistId]);

  // Function to play a song preview when the Play button is pressed
  const playSong = (song) => {
    if (song.preview_url) {
      if (audioRef.current) {
        audioRef.current.src = song.preview_url;
        audioRef.current.play().catch((err) => console.error(err));
      }
    }
  };

  // Callback when a match winner is selected
  const handleMatchWinner = (song) => {
    // Pause any playing preview
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // Add this song to the winners of this round
    setNextRoundWinners((prev) => [...prev, song]);

    // Determine the next match index (each match is 2 songs)
    const totalMatches = Math.floor(currentRound.length / 2);
    if (currentMatchIndex < totalMatches - 1) {
      // Move to the next match in this round
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else {
      // Round is complete. If only one winner, tournament is over.
      let winnersThisRound = [...nextRoundWinners, song];
      if (winnersThisRound.length === 1) {
        setWinner(winnersThisRound[0]);
      } else {
        // If odd number, give bye to the last song
        if (winnersThisRound.length % 2 === 1 && currentRound.length % 2 === 1) {
          winnersThisRound.push(currentRound[currentRound.length - 1]);
        }
        // Start next round
        setCurrentRound(winnersThisRound);
        setCurrentMatchIndex(0);
        setNextRoundWinners([]);
      }
    }
  };

  // If playlist is not loaded
  if (!playlist) {
    return (
      <div>
        <Navbar />
        <p className="p-4 text-white">Loading playlist...</p>
      </div>
    );
  }

  // If we have a final winner, show the winner screen
  if (winner) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="card bg-gray-800 shadow-xl p-6 text-center">
            <h2 className="card-title text-3xl mb-4">Champion!</h2>
            <img
              src={winner.image_url}
              alt={winner.name}
              className="w-32 h-32 mx-auto rounded-full object-cover mb-4"
            />
            <h3 className="text-2xl mb-2">{winner.name}</h3>
            <a
              href={`https://open.spotify.com/track/${winner.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Listen on Spotify
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Determine the current match pair
  const pairIndex = currentMatchIndex * 2;
  const songA = currentRound[pairIndex];
  const songB = currentRound[pairIndex + 1];

  // If there's an odd number and no opponent, auto-advance songA
  if (!songB) {
    handleMatchWinner(songA);
    return <div className="p-4 text-white">Advancing...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Navbar />
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Versus Tournament</h1>
        <p className="mb-4">
          Round with {currentRound.length} songs • Match {currentMatchIndex + 1} of {Math.floor(currentRound.length / 2)}
        </p>
        <div className="flex flex-col sm:flex-row justify-around items-center gap-4">
          {/* Song A Card */}
          <div className="card bg-gray-800 shadow-xl w-full sm:w-1/2">
            <figure className="relative">
              <img src={songA.image_url} alt={songA.name} className="object-cover w-full h-48" />
              <button
                onClick={() => playSong(songA)}
                className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full"
              >
                Play
              </button>
            </figure>
            <div className="card-body text-center">
              <h2 className="card-title">{songA.name}</h2>
              <button onClick={() => handleMatchWinner(songA)} className="btn btn-secondary mt-4">
                Choose
              </button>
            </div>
          </div>
          {/* Versus Label */}
          <div className="hidden sm:flex items-center">
            <span className="text-4xl font-bold">VS</span>
          </div>
          {/* Song B Card */}
          <div className="card bg-gray-800 shadow-xl w-full sm:w-1/2">
            <figure className="relative">
              <img src={songB.image_url} alt={songB.name} className="object-cover w-full h-48" />
              <button
                onClick={() => playSong(songB)}
                className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full"
              >
                Play
              </button>
            </figure>
            <div className="card-body text-center">
              <h2 className="card-title">{songB.name}</h2>
              <button onClick={() => handleMatchWinner(songB)} className="btn btn-secondary mt-4">
                Choose
              </button>
            </div>
          </div>
        </div>
        {/* Hidden audio element */}
        <audio ref={audioRef} onLoadedData={handleLoadedData} onEnded={handleAudioEnded} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
