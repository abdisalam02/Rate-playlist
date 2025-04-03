'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Types for the context
interface Track {
  id: string;
  name: string;
  preview_url: string | null;
  artists?: { name: string }[];
  album?: { 
    images?: { url: string }[]; 
    name?: string;
  };
}

interface AudioContextType {
  playingTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
}

// Create the context with default values
const AudioContext = createContext<AudioContextType>({
  playingTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  playTrack: () => {},
  pauseTrack: () => {},
  togglePlayPause: () => {},
  setVolume: () => {},
  seek: () => {},
});

// Export the context hook
export const useAudio = () => useContext(AudioContext);

// Audio Provider Component
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  
  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element on client side
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    
    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Update time during playback
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      // Set up a timer to update currentTime
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying]);
  
  // Set up audio events
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const onLoadedMetadata = () => {
      if (audio) {
        setDuration(audio.duration);
      }
    };
    
    const onPlay = () => {
      setIsPlaying(true);
    };
    
    const onPause = () => {
      setIsPlaying(false);
    };
    
    const onError = (e: Event) => {
      console.error('Audio playback error:', e);
      toast.error('Error playing this track');
      setIsPlaying(false);
    };
    
    // Add event listeners
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    
    // Clean up
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, []);
  
  // Play a track
  const playTrack = (track: Track) => {
    if (!track.preview_url) {
      toast.error('No preview available for this track');
      return;
    }
    
    const isSameTrack = playingTrack && playingTrack.id === track.id;
    
    if (isSameTrack) {
      togglePlayPause();
      return;
    }
    
    // Set the new track
    setPlayingTrack(track);
    
    // Load and play new audio
    if (audioRef.current) {
      audioRef.current.src = track.preview_url;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          toast.success(`Now playing: ${track.name}`);
        })
        .catch(err => {
          console.error('Failed to play track:', err);
          toast.error('Failed to play this track');
        });
    }
  };
  
  // Pause the current track
  const pauseTrack = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  // Toggle between play and pause
  const togglePlayPause = () => {
    if (!audioRef.current || !playingTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play()
        .catch(err => {
          console.error('Failed to resume playback:', err);
          toast.error('Failed to resume playback');
        });
    }
  };
  
  // Set volume
  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.min(1, Math.max(0, newVolume));
    setVolumeState(clampedVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };
  
  // Seek to a specific time
  const seek = (time: number) => {
    if (audioRef.current) {
      const clampedTime = Math.min(Math.max(0, time), duration);
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  };
  
  const value = {
    playingTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playTrack,
    pauseTrack,
    togglePlayPause,
    setVolume,
    seek,
  };
  
  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      {children}
    </AudioProvider>
  );
} 