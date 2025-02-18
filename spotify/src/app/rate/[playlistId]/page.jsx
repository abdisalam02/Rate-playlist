'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Typography, Box, CircularProgress } from '@mui/material';
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

// Motion variants for the song card
const cardVariants = {
  hidden: { opacity: 0, x: '100%' },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeInOut' } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
};

// MusicCard component using theme variables for most styling but fixed colors for the loading bar.
function MusicCard({ song, isPlaying, togglePlay, progress, currentTime, duration }) {
  return (
    <Box
      sx={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        borderRadius: '12px',
        width: { xs: '90%', sm: '400px' },
        p: 3,
        mx: 'auto',
        textAlign: 'center',
      }}
    >
      <img
        src={song.image_url}
        alt={song.name}
        style={{
          width: '100%',
          maxWidth: '300px',
          height: '300px',
          borderRadius: '12px',
          objectFit: 'cover',
          display: 'block',
          margin: '0 auto 20px',
        }}
      />
      <Typography variant="h5" sx={{ mb: 1 }}>
        {song.name}
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        {song.artists}
      </Typography>
      <Button
        variant="contained"
        onClick={togglePlay}
        sx={{
          textTransform: 'none',
          mb: 3,
        }}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      {/* Fixed-color progress bar */}
      <Box
        sx={{
          backgroundColor: '#e0e0e0',
          height: '6px',
          borderRadius: '2.5px',
          overflow: 'hidden',
          mb: 1,
        }}
      >
        <Box
          sx={{
            backgroundColor: '#4caf50',
            height: '100%',
            width: `${progress}%`,
          }}
        />
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </Box>
    </Box>
  );
}

export default function RatePlaylist() {
  const { playlistId } = useParams();
  const router = useRouter();

  // Playback & rating states
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSongReady, setIsSongReady] = useState(false);
  const [lastSongTime, setLastSongTime] = useState(0);

  // For music card playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef(null);

  useEffect(() => {
    setIsSongReady(false);
  }, [currentIndex]);

  // Fetch playlist and only include songs with preview URLs.
  useEffect(() => {
    if (playlistId) {
      fetch(`/api/playlists/${playlistId}`)
        .then((res) => res.json())
        .then((data) => {
          let songs = data.songs || [];
          songs = songs.filter((song) => song.preview_url);
          if (songs.length > 10) {
            songs = songs.sort(() => 0.5 - Math.random()).slice(0, 10);
          }
          data.songs = songs;
          setPlaylist(data);
        });
    }
  }, [playlistId]);

  // Load & play current song
  useEffect(() => {
    if (!playlist || receipt) return;
    const song = playlist.songs[currentIndex];
    if (!audioRef.current || !song.preview_url) return;

    if (audioRef.current.src !== song.preview_url) {
      audioRef.current.src = song.preview_url;
    }
    audioRef.current.load();
    audioRef.current.onloadeddata = () => {
      setIsSongReady(true);
      setDuration(audioRef.current.duration || 0);
      audioRef.current.play().catch((err) => console.error('Audio play error:', err));
    };
    audioRef.current.onended = null;
  }, [playlist, currentIndex, receipt]);

  // Update play/pause state and progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    const interval = setInterval(() => {
      if (audio && audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    }, 500);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      clearInterval(interval);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch((err) => console.error(err));
    } else {
      audioRef.current.pause();
    }
  };

  const handleRatingSelect = (value) => {
    if (!isSongReady) return;

    const currentSong = playlist.songs[currentIndex];
    const newRatings = [
      ...ratings,
      {
        songId: currentSong.id,
        songName: currentSong.name,
        rating: value,
        image_url: currentSong.image_url,
      },
    ];
    setRatings(newRatings);

    if (currentIndex < playlist.songs.length - 1) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentIndex(currentIndex + 1);
    } else {
      if (audioRef.current) {
        setLastSongTime(audioRef.current.currentTime);
      }
      setIsSubmitting(true);
      setTimeout(() => {
        submitRatings(newRatings);
      }, 200);
    }
  };

  const submitRatings = async (ratingsPayload) => {
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlist.id, ratings: ratingsPayload }),
      });
      const result = await res.json();
      if (res.ok) {
        setReceipt(result);
      } else {
        alert(result.error || 'Failed to save ratings.');
      }
    } catch (err) {
      console.error('Error submitting ratings:', err);
      alert('Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const persistentAudio = <audio ref={audioRef} style={{ display: 'none' }} preload="auto" />;

  if (!playlist) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <Navbar />
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Loading playlist...</Typography>
        </Box>
        {persistentAudio}
      </Box>
    );
  }

  if (receipt) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--foreground)', p: 4 }}>
        <Navbar />
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <Box
                sx={{
                  p: 4,
                  backgroundColor: 'var(--base-100)',
                  color: 'var(--foreground)',
                  borderRadius: 2,
                  boxShadow: 3,
                  fontFamily: 'monospace',
                  border: '2px dashed var(--border-color, currentColor)',
                }}
              >
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Rating Receipt
                </Typography>
                <Box component="table" sx={{ width: '100%', mb: 2, borderCollapse: 'collapse' }}>
                  <Box component="thead">
                    <Box component="tr" sx={{ borderBottom: '2px solid var(--border-color, currentColor)' }}>
                      <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Cover</Box>
                      <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Song</Box>
                      <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Rating</Box>
                      <Box component="th" sx={{ textAlign: 'left', p: 1, display: { xs: 'none', sm: 'table-cell' } }}>
                        Listen
                      </Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {ratings.map((r, index) => (
                      <Box key={index} component="tr" sx={{ borderBottom: '1px solid var(--border-color, currentColor)', py: 1 }}>
                        <Box component="td" sx={{ p: 1 }}>
                          <img
                            src={r.image_url}
                            alt={r.songName}
                            style={{ width: 48, height: 48, borderRadius: '50%' }}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1, fontWeight: 'bold' }}>
                          <a
                            href={`https://open.spotify.com/track/${r.songId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: 'none', fontSize: 18, color: 'var(--primary)' }}
                          >
                            {r.songName}
                          </a>
                        </Box>
                        <Box component="td" sx={{ p: 1 }}>
                          {[...Array(r.rating)].map((_, i) => (
                            <span key={i} style={{ color: 'var(--accent)', fontSize: 20 }}>★</span>
                          ))}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            p: 1,
                            display: { xs: 'none', sm: 'table-cell' },
                          }}
                        >
                          <a
                            href={`https://open.spotify.com/track/${r.songId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                          >
                            Listen
                          </a>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Average Rating: {receipt.average.toFixed(1)}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      setRatings([]);
                      setCurrentIndex(0);
                      setReceipt(null);
                    }}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Rate Again
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/')}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Rate Others
                  </Button>
                </Box>
              </Box>
            </motion.div>
          </AnimatePresence>
        </Box>
        {persistentAudio}
      </Box>
    );
  }

  const currentSong = playlist.songs[currentIndex];
  const isFinalSong = currentIndex === playlist.songs.length - 1;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <Navbar />
      <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 800, mx: 'auto' }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 'bold',
            mb: 4,
            textAlign: 'center',
          }}
        >
          {playlist.name}
        </Typography>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSong.id}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Box sx={{ position: 'relative' }}>
              <MusicCard
                song={currentSong}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                progress={progress}
                currentTime={currentTime}
                duration={duration}
              />
              {isFinalSong && isSubmitting && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Loading receipt...
                  </Typography>
                  <CircularProgress color="inherit" />
                </Box>
              )}
            </Box>
          </motion.div>
        </AnimatePresence>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <StarRating key={currentSong.id} onRatingSelect={handleRatingSelect} />
        </Box>
        <Typography variant="body1" align="center" sx={{ mt: 2 }}>
          Song {currentIndex + 1} of {playlist.songs.length}
        </Typography>
        {isSubmitting && !isFinalSong && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress color="inherit" />
          </Box>
        )}
      </Box>
      {persistentAudio}
    </Box>
  );
}
