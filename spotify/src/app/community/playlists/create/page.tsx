"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album?: {
    images?: Array<{ url: string }>;
  };
}

const PlaylistCreationPage: React.FC = () => {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [newTheme, setNewTheme] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Handle search for tracks
  const handleSearch = async () => {
    if (!searchQuery.trim() || !sessionData?.accessToken) return;
    
    setSearching(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`, {
        headers: {
          'Authorization': `Bearer ${sessionData.accessToken}`
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data.tracks?.items || []);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search for tracks. Please try again.');
    } finally {
      setSearching(false);
    }
  };
  
  // Add track to playlist
  const addTrack = (track: SpotifyTrack) => {
    if (!tracks.some(t => t.id === track.id)) {
      setTracks([...tracks, track]);
      
      // If no cover URL is provided, use the first track's album cover
      if (!coverUrl && !coverPreview && track.album?.images?.[0]?.url) {
        setCoverPreview(track.album.images[0].url);
      }
    }
  };

  // Submit playlist creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionData) {
      router.push('/login');
      return;
    }
    
    // Validate inputs
    if (!playlistName.trim()) {
      setError('Please enter a playlist name');
      return;
    }
    
    if (tracks.length === 0) {
      setError('Please add at least one track to your playlist');
      return;
    }
    
    const themeToUse = newTheme && customTheme.trim() ? customTheme.trim() : selectedTheme;
    
    if (!themeToUse) {
      setError('Please select a theme or create a new one');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Prepare the cover image - use the first track's album cover if none provided
      const finalCoverUrl = coverUrl || (tracks[0]?.album?.images?.[0]?.url || '');
      
      const response = await fetch('/api/community/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          description,
          cover_image: finalCoverUrl,
          theme: themeToUse,
          is_new_theme: newTheme,
          track_ids: tracks.map(track => track.id)
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create playlist');
      }
      
      const data = await response.json();
      setSuccess(true);
      
      // Redirect to the new playlist after a short delay
      setTimeout(() => {
        router.push(`/community/playlists/${data.playlistId}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      setError(error.message || 'Failed to create playlist. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        <h1 className="text-3xl font-bold mb-6">Create a Themed Playlist</h1>
        
        {/* Placeholder for the actual form */}
        <div className="bg-[#181818] rounded-lg p-6">
          <p className="text-center text-gray-400">Playlist creation form goes here</p>
        </div>
      </div>
    </div>
  );
};

export default PlaylistCreationPage; 