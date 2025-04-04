'use client';

import React, { createContext, useState, useRef, useContext, useEffect, useCallback } from 'react';
// Import usePathname
import { usePathname } from 'next/navigation';

interface AudioTrack {
  id: string | number;
  name: string;
  preview_url: string;
  artists?: { name: string }[];
  album?: {
    name?: string;
    images?: { url: string }[];
  };
}

interface AudioContextType {
  playingTrack: AudioTrack | null;
  isPlaying: boolean;
  playTrack: (track: AudioTrack) => void;
  pauseTrack: () => void;
  // Add resumeTrack if needed
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playingTrack, setPlayingTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Get current pathname
  const pathname = usePathname();

  // Function to stop playback and reset state
  const stopAndResetAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset playback position
      audioRef.current.src = ''; // Clear source to ensure it stops loading/playing
    }
    setPlayingTrack(null);
    setIsPlaying(false);
  }, []); // No dependencies needed for this logic

  // Effect to handle route changes
  useEffect(() => {
    // Stop playing audio when the route changes
    stopAndResetAudio();
    // Cleanup function for the effect (optional but good practice)
    return () => {
        stopAndResetAudio();
    };
  }, [pathname, stopAndResetAudio]); // Rerun effect when pathname changes

  const playTrack = (track: AudioTrack) => {
    // If it's the same track and it's already playing, pause it
    if (playingTrack?.id === track.id && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return; // Exit early
    }

    // If it's the same track and it's paused, resume it
    if (playingTrack?.id === track.id && !isPlaying) {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Error resuming audio:", e));
        setIsPlaying(true);
      }
      return; // Exit early
    }

    // If it's a new track or no track is playing
    if (audioRef.current) {
      audioRef.current.pause(); // Stop previous track if any
    }
    
    // Ensure we have a valid preview_url
    if (!track.preview_url) {
      console.warn("Attempted to play track without preview_url:", track.name);
      setPlayingTrack(null); // Ensure state is clear if no URL
      setIsPlaying(false);
      return;
    }

    // Create or update the audio element
    if (!audioRef.current) {
      audioRef.current = new Audio(track.preview_url);
      audioRef.current.volume = 0.5; // Set default volume
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlayingTrack(null); // Clear track when finished
      });
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio Playback Error:', e);
        setIsPlaying(false);
        setPlayingTrack(null);
        alert('Error playing preview.'); // Inform user
      });
       audioRef.current.addEventListener('pause', () => {
         setIsPlaying(false); // Ensure state is false on pause
       });
       audioRef.current.addEventListener('play', () => {
         setIsPlaying(true); // Ensure state is true on play
       });
    } else {
      // If audio element exists, just update the source
      audioRef.current.src = track.preview_url;
    }
    
    // Set the new track and play
    setPlayingTrack(track);
    audioRef.current.load(); // Important: Load the new source
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(e => {
        console.error("Error playing audio:", e);
        setIsPlaying(false);
        setPlayingTrack(null); 
        alert('Could not play preview. Browser might be blocking autoplay.'); // Inform user
      });
  };

  const pauseTrack = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Cleanup audio element on component unmount
  useEffect(() => {
    const currentAudio = audioRef.current; // Capture current ref
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = ''; // Release resources
      }
    };
  }, []);

  return (
    <AudioContext.Provider value={{ playingTrack, isPlaying, playTrack, pauseTrack }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}; 