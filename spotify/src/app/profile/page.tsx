'use client';

import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { fetchWithToken } from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { Album, Artist, UserProfile, Playlist } from '@/types.d';
import { PlusCircleIcon } from '@heroicons/react/24/solid';
import MoodManager from '../components/MoodManager';
import { PlaceholderImage } from "../components/PlaceholderImage";
import { HomeIcon, StarIcon, ChatBubbleLeftRightIcon, QueueListIcon, TrashIcon, PlayIcon, MusicalNoteIcon } from '@heroicons/react/24/solid';
import UserAvatar from '@/app/components/UserAvatar'; // Import UserAvatar
import { ConfirmModal } from '@/app/components/modals/ConfirmModal';
import { EditProfileModal } from '@/app/components/modals/EditProfileModal'; // <-- Import EditProfileModal

// Define TABS constant
const TABS = {
  OVERVIEW: 'overview',
  ALBUMS: 'albums',
  TRACKS: 'tracks',
  RATINGS: 'ratings',
  STATS: 'stats',
  MOODS: 'moods'
} as const; // Use 'as const' for stricter typing

// Define a type for the valid tab values
type TabKey = typeof TABS[keyof typeof TABS];

type SpotifyApi = {
  getMe: () => Promise<{ body: UserProfile }>;
  getUserPlaylists: (userId: string) => Promise<{ body: { items: Playlist[] } }>;
  getPlaylist: (playlistId: string) => Promise<{ body: Playlist }>;
  getAlbum: (albumId: string) => Promise<{ body: Album }>;
  getArtist: (artistId: string) => Promise<{ body: Artist }>;
  getTrack: (trackId: string) => Promise<{ body: Track }>;
  searchTracks: (query: string) => Promise<{ body: { tracks: { items: Track[] } } }>;
};

// Rating component
function StarRating({ rating, onChange, readonly = false }: { 
  rating: number; 
  onChange: (rating: number) => void; 
  readonly?: boolean; 
}) {
  const stars = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  
  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => {
        const isHalfStar = star % 1 !== 0;
        const fullStars = Math.floor(rating);
        const isActive = isHalfStar 
          ? rating >= star
          : fullStars >= star;
        
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange(star)}
            className={`text-lg ${isActive ? 'text-[#1DB954]' : 'text-gray-600'} ${!readonly && 'hover:text-[#1DB954] transition-colors'}`}
          >
            {isHalfStar ? '½' : '★'}
          </button>
        );
      })}
      <span className="ml-2 text-sm">{rating ? rating.toFixed(1) : '-'}</span>
    </div>
  );
}

// Album Item component with improved mobile responsiveness
const AlbumItem = ({ album }: { album: any }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg overflow-hidden bg-[#181818] hover:bg-[#282828] transition-all duration-300 h-full flex flex-col shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full pb-[100%] overflow-hidden">
        <Link href={`/album/${album.id}`} className="block">
        <img 
          src={album.images?.[0]?.url || '/placeholder.png'} 
          alt={album.name} 
            className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
          <div className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
          {isHovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#1DB954] text-black rounded-full p-2.5 shadow-xl transform transition-transform duration-300 hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
        </div>
            </div>
          )}
      </Link>
      </div>
      <div className="p-3 flex-grow flex flex-col">
        <Link href={`/album/${album.id}`} className="block">
          <h3 className="font-medium text-white text-base line-clamp-2 mb-1 hover:underline" title={album.name}>
            {album.name}
          </h3>
        </Link>
        <p className="text-[#B3B3B3] text-sm line-clamp-1" title={album.artists?.map((artist: any) => artist.name).join(', ')}>
          {album.artists?.map((artist: any) => artist.name).join(', ')}
        </p>
        {album.release_date && (
          <p className="text-[#B3B3B3] text-xs mt-1">
            {new Date(album.release_date).getFullYear()}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// Playlist Item component with improved mobile responsiveness
const PlaylistItem = ({ playlist }: { playlist: any }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg overflow-hidden bg-[#181818] hover:bg-[#282828] transition-all duration-300 h-full flex flex-col shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full pb-[100%] overflow-hidden">
        <Link href={`/playlist/${playlist.id}`} className="block">
          <img
            src={playlist.images?.[0]?.url || '/placeholder.png'}
            alt={playlist.name}
            className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
          <div className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
          {isHovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#1DB954] text-black rounded-full p-2.5 shadow-xl transform transition-transform duration-300 hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </Link>
      </div>
      <div className="p-3 flex-grow flex flex-col">
        <Link href={`/playlist/${playlist.id}`} className="block">
          <h3 className="font-medium text-white text-base line-clamp-2 mb-1 hover:underline" title={playlist.name}>
            {playlist.name}
          </h3>
        </Link>
        <p className="text-[#B3B3B3] text-sm line-clamp-1">
          By {playlist.owner?.display_name || 'Unknown'}
        </p>
        <div className="flex items-center mt-2 text-xs text-[#B3B3B3] gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"></path>
          </svg>
          {playlist.tracks?.total || 0} tracks
        </div>
      </div>
    </motion.div>
  );
};

// Track item component
function TrackItem({ track, onRateTrack }: { 
  track: Track & { userRating?: number }; 
  onRateTrack: (id: string, rating: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-[#181818] hover:bg-[#282828] transition-colors p-3 rounded-md">
      <div className="flex items-center gap-3">
        <img 
          src={track.album?.images?.[0]?.url || '/placeholder.png'} 
          alt={track.name}
          className="w-12 h-12 rounded-md"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{track.name}</h3>
          <p className="text-gray-400 text-sm truncate">
            {track.artists?.map(a => a.name).join(', ')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-[#333] rounded-full"
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400 mb-1">Your Rating</p>
              <StarRating 
                rating={track.userRating || 0} 
                onChange={(newRating) => onRateTrack(track.id, newRating)} 
              />
            </div>
            
            <a 
              href={`https://open.spotify.com/track/${track.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-[#1DB954] text-black font-medium py-1 px-3 rounded-full text-xs"
            >
              Open in Spotify
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Playlist card component
function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link href={`/playlist/${playlist.id}`}>
      <div className="bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg overflow-hidden">
        <div className="aspect-square">
          <img 
            src={playlist.images?.[0]?.url || '/placeholder-playlist.jpg'} 
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-3">
          <h3 className="font-bold truncate">{playlist.name}</h3>
          <p className="text-sm text-gray-400 truncate">{playlist.tracks.total} tracks</p>
        </div>
      </div>
    </Link>
  )
}

// Album moodboard component
function AlbumMoodboard({ albums, artists, isLoading }: { 
  albums: Album[];
  artists: Artist[];
  isLoading: boolean;
}) {
  // Limit number of items to ensure they fit well
  const getLimitedItems = (items: any[], maxCount = 8) => {
    if (!items || items.length === 0) return [];
    
    // For smaller collections, make sure we have squares
    const count = items.length;
    if (count <= 4) return items.slice(0, 4);
    // If we have more than 4, just use 8 as the max for a nice grid
    return items.slice(0, maxCount);
  };
  
  // Determine optimal grid size based on number of items
  const getOptimalGridSize = (itemCount: number) => {
    // Always use a 2x4 grid (8 items)
    return "grid-cols-4";
  };
  
  const getContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 bg-gradient-to-r from-[#3b1966] via-[#1e3264] to-[#0a557a]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent"></div>
        </div>
      );
    }
    
    if (albums && albums.length > 0) {
      const limitedAlbums = getLimitedItems(albums);
      const gridSize = getOptimalGridSize(limitedAlbums.length);
      
      return (
        <>
          <div className={`absolute inset-0 grid ${gridSize}`}>
            {limitedAlbums.map((album, i) => (
              album.images?.[0]?.url ? (
                <div key={i} className="overflow-hidden">
                  <img 
                    src={album.images[0].url} 
                    alt={album.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent"></div>
          {/* Add animated spotlight effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1DB954]/20 via-transparent to-transparent animate-pulse"></div>
          </div>
        </>
      );
    }
    
    if (artists && artists.length > 0) {
      const limitedArtists = getLimitedItems(artists);
      const gridSize = getOptimalGridSize(limitedArtists.length);
      
      return (
        <>
          <div className={`absolute inset-0 grid ${gridSize}`}>
            {limitedArtists.map((artist, i) => (
              artist.images?.[0]?.url ? (
                <div key={i} className="overflow-hidden">
                  <img 
                    src={artist.images[0].url} 
                    alt={artist.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent"></div>
          {/* Add subtle radial gradient that shifts position */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-radial-gradient from-[#1DB954]/10 via-transparent to-transparent"></div>
          </div>
        </>
      );
    }
    
    // Default fallback - more interesting gradient
    return (
      <div className="absolute inset-0 bg-gradient-to-r from-[#3b1966] via-[#1e3264] to-[#0a557a]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1DB954]/20 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1e3264]/30 rounded-full filter blur-3xl"></div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-24 sm:h-32 md:h-48 rounded-xl overflow-hidden mb-6 sm:mb-12 relative">
      {getContent()}
    </div>
  );
}

// Define types for the component
type Track = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
};

type Mood = {
  id: string;
  name: string;
  description?: string;
  track_id?: string;
  track_name?: string;
  artist_name?: string;
  track_image?: string;
  created_at?: string;
  updated_at?: string;
  is_staple?: boolean;
  user_id?: string | null;
};

// MoodSearchModal Props
interface MoodSearchModalProps {
  show: boolean;
  onClose: () => void;
  onTrackSelect: (track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      images: Array<{ url: string }>;
    };
  }) => void;
}

// MoodSearchModal component for searching and adding tracks to moods
const MoodSearchModal = ({ show, onClose, onTrackSelect }: MoodSearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`);
      const data = await response.json();
      
      if (data.tracks && data.tracks.items) {
        setSearchResults(data.tracks.items);
      }
    } catch (error) {
      console.error('Failed to search tracks:', error);
      toast.error('Failed to search tracks');
      } finally {
      setLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#121212] rounded-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Find a Track</h2>
            <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
        </div>
        
        <div className="flex mb-4">
              <input
                type="text"
            placeholder="Search for a track..."
            className="flex-1 bg-[#1e1e1e] border border-[#333] rounded-l-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
              />
              <button
            onClick={handleSearch}
            className="bg-[#1DB954] text-black px-4 py-2 rounded-r-lg font-medium hover:bg-[#1ed760] transition-colors"
              >
            Search
              </button>
            </div>
        
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
              </div>
            ) : searchResults.length > 0 ? (
            <div className="space-y-2">
                {searchResults.map((track) => (
                <div 
                  key={track.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-[#282828] cursor-pointer transition-colors"
                  onClick={() => {
                    onTrackSelect(track);
                    onClose();
                  }}
                >
                  <img 
                    src={track.album.images[0]?.url || '/placeholder.png'} 
                    alt={track.name}
                    className="w-12 h-12 rounded-md"
                  />
                  <div>
                    <p className="font-medium line-clamp-1">{track.name}</p>
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {track.artists.map((artist: any) => artist.name).join(', ')}
                        </p>
                      </div>
                    </div>
                ))}
          </div>
          ) : searchQuery ? (
            <p className="text-gray-400 text-center py-4">No results found</p>
          ) : (
            <p className="text-gray-400 text-center py-4">Search for a track to add to your mood</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Add this new component for creating moods
const CreateMoodModal = ({ show, onClose, onSave }: { 
  show: boolean; 
  onClose: () => void;
  onSave: (moodData: { 
    name: string; 
    description: string;
    track_id?: string;
    track_name?: string;
    artist_name?: string;
    track_image?: string;
  }) => Promise<void>;
}) => {
  const [moodName, setMoodName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const res = await fetch(`/api/spotify/search?query=${encodeURIComponent(searchTerm)}&type=track`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.tracks?.items || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to search tracks. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodName.trim()) return;
    
    try {
      setIsLoading(true);
      await onSave({ 
        name: moodName, 
        description,
        track_id: selectedTrack?.id,
        track_name: selectedTrack?.name,
        artist_name: selectedTrack?.artists?.[0]?.name,
        track_image: selectedTrack?.album?.images?.[0]?.url
      });
      setMoodName('');
      setDescription('');
      setSelectedTrack(null);
      setSearchTerm('');
      setSearchResults([]);
      onClose();
      } catch (err) {
      console.error('Error creating mood:', err);
      toast.error('Failed to create mood');
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#282828] rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Create New Mood</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mood-name" className="block text-sm font-medium mb-2">
              Mood Name
            </label>
            <input
              id="mood-name"
              type="text"
              value={moodName}
              onChange={(e) => setMoodName(e.target.value)}
              placeholder="e.g., Late Night Drive"
              className="w-full bg-[#3E3E3E] text-white px-4 py-2 rounded-lg border border-[#4A4A4A] focus:outline-none focus:border-[#1DB954]"
              required
            />
        </div>

          <div>
            <label htmlFor="mood-description" className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              id="mood-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this mood..."
              className="w-full bg-[#3E3E3E] text-white px-4 py-2 rounded-lg border border-[#4A4A4A] focus:outline-none focus:border-[#1DB954] min-h-[100px]"
            />
      </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select a Track (Optional)
            </label>
            <form onSubmit={handleSearch} className="mb-2">
              <div className="flex gap-2">
            <input
              type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for a song..."
                  className="flex-1 bg-[#3E3E3E] text-white px-4 py-2 rounded-lg border border-[#4A4A4A] focus:outline-none focus:border-[#1DB954]"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-[#1DB954] hover:bg-[#18a148] text-black font-medium rounded-lg transition-colors"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
          </div>
            </form>

            {searchError && (
              <p className="text-red-500 text-sm mb-2">{searchError}</p>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto bg-[#3E3E3E] rounded-lg">
                {searchResults.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setSelectedTrack(track)}
                    className={`w-full p-3 text-left hover:bg-[#4A4A4A] transition-colors ${
                      selectedTrack?.id === track.id ? 'bg-[#1DB954]/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={track.album?.images?.[0]?.url || '/placeholder.png'}
                        alt={track.name}
                        className="w-10 h-10 rounded-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{track.name}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {track.artists?.map(a => a.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
          </div>
        )}
        
            {selectedTrack && (
              <div className="mt-2 p-3 bg-[#1DB954]/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedTrack.album?.images?.[0]?.url || '/placeholder.png'}
                    alt={selectedTrack.name}
                    className="w-10 h-10 rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedTrack.name}</p>
                    <p className="text-sm text-gray-400 truncate">
                      {selectedTrack.artists?.map(a => a.name).join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTrack(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
          </div>
        )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
              <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
              </button>
              <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                  Creating...
                </span>
              ) : (
                'Create Mood'
              )}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Tab Constants ---
const tabConfig = [
  { name: TABS.OVERVIEW, icon: <HomeIcon className="h-5 w-5" /> },
  { name: TABS.ALBUMS, icon: <QueueListIcon className="h-5 w-5" /> }, // Placeholder icon
  { name: TABS.TRACKS, icon: <QueueListIcon className="h-5 w-5" /> }, // Placeholder icon
  { name: TABS.RATINGS, icon: <StarIcon className="h-5 w-5" /> },
  { name: TABS.STATS, icon: <ChatBubbleLeftRightIcon className="h-5 w-5" /> }, // Placeholder icon
  { name: TABS.MOODS, icon: <div className="h-5 w-5">😊</div> }, // Simple emoji icon
];

// --- Existing Profile Page Component --- 
export default function Profile() {
  const { data: session, status, update } = useSession(); // <-- Destructure the update function
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // State for profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<Album[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  
  // Loading states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTopArtists, setLoadingTopArtists] = useState(true);
  const [loadingTopTracks, setLoadingTopTracks] = useState(true);
  const [loadingSavedAlbums, setLoadingSavedAlbums] = useState(true);
  const [loadingRecentlyPlayed, setLoadingRecentlyPlayed] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  
  // Tab state - Use the TabKey type
  const [activeTab, setActiveTab] = useState<TabKey>(TABS.OVERVIEW);
  
  // Add state for user ratings
  const [userRatings, setUserRatings] = useState<any[]>([]);
  const [userRatingsLoading, setUserRatingsLoading] = useState(true);
  const [userRatingsError, setUserRatingsError] = useState<string | null>(null);
  const [ratingsFilter, setRatingsFilter] = useState<'all' | 'track' | 'album'>('all');
  const [ratingsSort, setRatingsSort] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [ratingSearch, setRatingSearch] = useState('');
  
  // --- MOVE STATE INSIDE --- 
  // --- State for Confirmation Modal ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [ratingToDelete, setRatingToDelete] = useState<{ id: string; name: string } | null>(null);
  // --- State for Edit Profile Modal ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // --- END MOVE STATE --- 
  
  // --- Initiate delete process ---
  const handleDeleteRating = (ratingId: string, ratingName: string) => {
    if (!ratingId) {
      console.error("Delete error: No rating ID provided.");
      return;
    }
    // Set the rating to be deleted and open the modal
    setRatingToDelete({ id: ratingId, name: ratingName });
    setIsConfirmModalOpen(true);
  };

  // --- MOVE HANDLERS INSIDE --- 
  // --- Function to execute the deletion after confirmation ---
  const executeDelete = async () => {
    if (!ratingToDelete) return;

    const toastId = toast.loading('Deleting rating...');
    try {
      const response = await fetch(`/api/ratings/item/${ratingToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete rating' }));
        throw new Error(errorData.error || `Failed to delete: ${response.statusText}`);
      }

      // Remove rating from state
      setUserRatings(prevRatings => prevRatings.filter(rating => rating.id !== ratingToDelete.id));

      toast.success('Rating deleted!', { id: toastId });
    } catch (error) {
      console.error('Failed to delete rating:', error);
      toast.error(`Error: ${(error as Error).message || 'Could not delete rating'}`, { id: toastId });
    } finally {
      // Close modal and clear the rating to delete state regardless of success/error
      setIsConfirmModalOpen(false);
      setRatingToDelete(null);
    }
  };

  // --- Handle saving profile changes --- 
  const handleSaveProfile = async (newName: string): Promise<boolean> => {
    const toastId = toast.loading('Updating profile...');
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: newName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to update profile: ${response.statusText}`);
      }

      // Update local profile state immediately
      setProfile(prevProfile => 
        prevProfile ? { ...prevProfile, display_name: result.user.displayName } : null
      );
      
      // --- UPDATE SESSION --- 
      // Manually update the session data on the client side - RE-ADD THIS
      await update({ name: result.user.displayName }); 
      // console.log('Client session update attempted for name:', result.user.displayName);
      // Remove the direct manipulation which doesn't work reliably:
      toast.success('Profile updated successfully!', { id: toastId });
      router.refresh(); // Keep this for syncing server components
      return true; // Indicate success

    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(`Error: ${(error as Error).message || 'Could not update profile'}`, { id: toastId });
      return false; // Indicate failure
    }
  };
  // --- END MOVE HANDLERS --- 
  
  // Function to handle track rating - moved inside component
  const handleRateTrack = (trackId: string, rating: number) => {
    if (!trackId) return;
    
    toast.promise(
      fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_id: trackId,
          item_type: 'track',
          rating
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to rate track');
        return res.json();
      }),
      {
        loading: 'Saving rating...',
        success: 'Rating saved!',
        error: 'Failed to save rating'
      }
    );
  };
  
  // Set active tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    // Check if tabParam is a valid TabKey
    if (tabParam && Object.values(TABS).includes(tabParam as TabKey)) {
      setActiveTab(tabParam as TabKey);
    }
  }, [searchParams]);
  
  // Function to fetch ratings with better error handling
  const fetchUserRatings = async () => {
    if (!session) return;
    
    try {
      setUserRatingsLoading(true);
      setUserRatingsError(null);
      
      console.log('Fetching user ratings with session:', {
        userId: session?.user?.id,
        email: session?.user?.email,
        hasAccessToken: !!session?.accessToken
      });
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Use a more direct URL to the ratings API
      const url = `/api/user/ratings?limit=50&t=${timestamp}`;
      console.log('Fetching from URL:', url);
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      console.log('Ratings API response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Ratings fetch failed with status:', res.status, errorText);
        throw new Error(`Failed to fetch ratings: ${res.statusText}`);
      }
      
      // First get the raw response text for debugging
      const responseText = await res.text();
      console.log('Ratings API raw response:', responseText.substring(0, 200) + '...');
      
      // Then parse it
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed ratings data:', {
          success: !!data,
          ratingsLength: data?.ratings?.length || 0
        });
      } catch (parseError) {
        console.error('Error parsing ratings JSON:', parseError);
        throw new Error('Failed to parse ratings response');
      }
      
      if (Array.isArray(data.ratings)) {
        console.log(`Found ${data.ratings.length} ratings for user`);
        setUserRatings(data.ratings);
      } else {
        console.error('Invalid ratings response format:', data);
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching user ratings:', err);
      setUserRatingsError('Failed to load your ratings. Please try again later.');
    } finally {
      setUserRatingsLoading(false);
    }
  };
  
  // Fetch user profile data with better error handling
  useEffect(() => {
    console.log("Profile page - Session status:", status);
    console.log("Profile page - Session data:", session);
    
    if (status === "unauthenticated") {
      router.push('/login');
      return;
    }
    
    if (status === "loading") {
      console.log("Still loading session");
      return;
    }
    
    if (!session) {
      console.error("No session object available");
      return;
    }
    
    // Testing direct API access with fetch
    if (session?.accessToken) {
      console.log("Making direct Spotify API call to test token");
      
      fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })
      .then(res => {
        console.log("Direct Spotify API response status:", res.status);
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("Direct Spotify API call successful:", data.display_name);
      })
      .catch(err => {
        console.error("Direct Spotify API call failed:", err);
      });
    }
    
    if (session?.accessToken) {
      // Use fetchWithToken with correct endpoints
      Promise.all([
        fetchWithToken('/api/user/profile', session.accessToken),
        fetchWithToken('/api/user/top-items?type=artists&time_range=medium_term&limit=5', session.accessToken),
        fetchWithToken('/api/user/top-items?type=tracks&time_range=medium_term&limit=10', session.accessToken),
        fetchWithToken('/api/user/albums?limit=10', session.accessToken),
        fetchWithToken('/api/user/recently-played?limit=10', session.accessToken),
        fetch('/api/user/playlists?limit=12', {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }).then(res => res.json()).catch(err => {
          console.error("Error fetching playlists:", err);
          return { items: [] };
        })
      ])
      .then(([profileData, artistsData, tracksData, albumsData, recentlyPlayedData, playlistsData]) => {
        setProfile(profileData);
        setTopArtists(artistsData.items || []);
        setTopTracks(tracksData.items || []);
        setSavedAlbums(albumsData.items?.map((item: { album: Album }) => item.album) || []);
        setRecentlyPlayed(recentlyPlayedData.items?.map((item: { track: Track }) => item.track) || []);
        setUserPlaylists(playlistsData.items || []);
        
        setLoadingProfile(false);
        setLoadingTopArtists(false);
        setLoadingTopTracks(false);
        setLoadingSavedAlbums(false);
        setLoadingRecentlyPlayed(false);
        setLoadingPlaylists(false);
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        setLoadingProfile(false);
        setLoadingTopArtists(false);
        setLoadingTopTracks(false);
        setLoadingSavedAlbums(false);
        setLoadingRecentlyPlayed(false);
        setLoadingPlaylists(false);
      });
    }
  }, [session, status, router]);
  
  // Fetch ratings whenever the active tab changes to ratings (use TABS constant)
  useEffect(() => {
    if (activeTab === TABS.RATINGS) { // Use TABS constant
      console.log('Ratings tab activated, fetching user ratings');
      fetchUserRatings();
    }
  }, [activeTab, session]);

  // Modified render function for the profile page content (use TABS constant)
  const renderContent = () => {
    switch (activeTab) {
      case TABS.OVERVIEW:
        return renderOverviewContent();
      case TABS.ALBUMS:
        return renderAlbumsContent();
      case TABS.TRACKS:
        return renderTracksContent();
      case TABS.RATINGS: // Use TABS constant
        return renderRatingsContent();
      case TABS.STATS:
        return renderStatsContent();
      case TABS.MOODS:
        return renderMoodsContent();
      default:
        return renderOverviewContent(); // Default case
    }
  };
  
  // Modified render function for albums section
  const renderAlbumsContent = () => {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Your Saved Albums</h2>
        {loadingSavedAlbums ? (
          <div className="flex justify-center my-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        ) : savedAlbums.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
            {savedAlbums.map((album) => (
              <AlbumItem key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <p className="text-[#B3B3B3] mt-4">No saved albums found.</p>
        )}
        {savedAlbums.length > 0 && (
          <div className="mt-4">
            <button 
              onClick={() => setActiveTab(TABS.ALBUMS)}
              className="text-sm text-[#1DB954] hover:underline"
            >
              View all saved albums
            </button>
          </div>
        )}
      </section>
    );
  };

  // Modified render function for playlists section
  const renderPlaylistsSection = () => {
    return (
      <section className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Playlists</h2>
          <Link 
            href="/create-playlist" 
            className="text-sm bg-white/10 hover:bg-white/20 transition-colors py-1 px-4 rounded-full flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New
          </Link>
        </div>
        
        {loadingPlaylists ? (
          <div className="flex justify-center my-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        ) : userPlaylists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {userPlaylists.map((playlist) => (
              <PlaylistItem key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <div className="bg-[#181818] rounded-lg p-8 text-center">
            <p className="text-[#B3B3B3] mb-4">You don't have any playlists yet.</p>
            <Link 
              href="/create-playlist" 
              className="inline-block bg-[#1DB954] text-black font-bold px-4 py-2 rounded-full text-sm hover:bg-[#18a148] transition-colors"
            >
              Create Your First Playlist
            </Link>
          </div>
        )}
      </section>
    );
  };

  // Modified render function for ratings content
  const renderRatingsContent = () => {
        return (
      <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-6">Your Ratings</h2>
            
            {userRatingsLoading && (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
                </div>
            )}
            
            {userRatingsError && !userRatingsLoading && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-300">{userRatingsError}</p>
            <button 
              onClick={fetchUserRatings}
              className="mt-2 px-4 py-1 bg-red-900/30 hover:bg-red-800/40 rounded-full text-sm transition-colors"
            >
              Retry
            </button>
              </div>
            )}
            
            {!userRatingsLoading && (!userRatings || userRatings.length === 0) && !userRatingsError && (
          <div className="text-center py-8 bg-[#181818] rounded-lg p-6">
            <div className="mb-4 text-[#1DB954]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-gray-400 mb-4 text-lg">You haven't rated any tracks or albums yet</p>
            <p className="text-gray-500 mb-6">Share your opinions and keep track of your favorite music</p>
            <Link href="/discover" className="px-6 py-3 bg-[#1DB954] text-black font-medium rounded-full inline-block hover:bg-opacity-90 transition-colors">
                  Discover Music to Rate
                </Link>
              </div>
            )}
            
            {userRatings && userRatings.length > 0 && (
          <div className="space-y-10">
            {/* Track Ratings Section */}
            {userRatings.filter(rating => rating.item_type === 'track').length > 0 && (
              <div className="bg-[#181818]/60 p-6 rounded-xl border border-gray-800">
                <h3 className="text-xl font-semibold mb-6 flex items-center">
                  <PlayIcon className="h-5 w-5 mr-2 text-[#1DB954]" /> {/* Track Icon */}
                  Track Ratings
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {userRatings
                      .filter(rating => rating.item_type === 'track')
                      .map((rating) => {
                        const itemName = rating.name || 'Unknown Track';
                        const artistName = rating.artists?.map((a: { name: string }) => a.name).join(', ') || 'Unknown Artist';
                        const imageUrl = rating.album?.images?.[0]?.url || '/placeholder.png';
                        const ratingValue = rating.rating; // Use the 0-5 value directly
                        
                        return (
                          <div key={rating.id} className="group relative bg-[#202020] hover:bg-[#282828] rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                            {/* Delete Button - Always visible */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteRating(rating.id, itemName); 
                              }}
                              className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 hover:bg-red-600/90 rounded-full text-gray-300 hover:text-white transition-all" // Removed opacity classes
                              aria-label="Delete rating"
                              title="Delete rating"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                            
                            <Link href={`/track/${rating.item_id}`}>
                              <div className="relative aspect-square">
                                {/* Placeholder is always underneath */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <PlaceholderImage type="track" />
                                </div>
                                {/* Real Image on top, hidden on error */}
                                <Image
                                  src={imageUrl}
                                  alt={itemName}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                  className="relative z-[1] object-cover group-hover:scale-110 transition-transform duration-500" // z-index added
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide on error
                                  unoptimized
                                />
                                {/* Gradient Overlay & Play Icon */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-[#1DB954] text-black p-3 rounded-full transform transition-transform">
                                    <PlayIcon className="h-6 w-6" />{/* Example Play Icon */}
                                  </div>
                                </div>
                              </div>
                              {/* Rating Badge (Simplified) */}
                              <div className="absolute bottom-0 right-0 m-2 bg-black/80 rounded-full px-2 py-1 flex items-center z-10">
                                 {/* --- Simplified Star --- */}
                                 <StarIcon className="text-yellow-400 h-3 w-3 mr-1" />
                                 <span className="text-white text-xs font-semibold">{ratingValue.toFixed(1)}</span> 
                              </div>
                              <div className="p-4">
                                <h4 className="font-medium line-clamp-1 text-white group-hover:text-[#1DB954] transition-colors" title={itemName}>{itemName}</h4>
                                <p className="text-sm text-gray-400 line-clamp-1" title={artistName}>{artistName}</p> {/* USE CORRECTED artistName */}
                                <p className="text-xs text-gray-500 mt-1">{new Date(rating.created_at).toLocaleDateString()}</p>
                              </div>
                            </Link>
                          </div>
                        );
                      })
                    }
                  </div>
              </div>
            )}
                        
            {/* Album Ratings Section */}
            {userRatings.filter(rating => rating.item_type === 'album').length > 0 && (
               <div className="bg-[#181818]/60 p-6 rounded-xl border border-gray-800">
                 <h3 className="text-xl font-semibold mb-6 flex items-center">
                   <MusicalNoteIcon className="h-5 w-5 mr-2 text-[#1DB954]" /> {/* Use valid Album Icon */} 
                    Album Ratings
                 </h3>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                     {userRatings
                       .filter(rating => rating.item_type === 'album')
                       .map((rating) => {
                          const itemName = rating.name || 'Unknown Album';
                          const artistName = rating.artists?.map((a: { name: string }) => a.name).join(', ') || 'Unknown Artist';
                          const imageUrl = rating.images?.[0]?.url || '/placeholder.png';
                          const ratingValue = rating.rating; // Use 0-5 value
                          
                          return (
                            <div key={rating.id} className="group relative bg-[#202020] hover:bg-[#282828] rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                              {/* Delete Button - Always visible */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeleteRating(rating.id, itemName);
                                }}
                                className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 hover:bg-red-600/90 rounded-full text-gray-300 hover:text-white transition-all" // Removed opacity classes
                                aria-label="Delete rating"
                                title="Delete rating"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                              
                              <Link href={`/album/${rating.item_id}`}>
                                <div className="relative aspect-square">
                                  {/* Placeholder is always underneath */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <PlaceholderImage type="album" />
                                  </div>
                                  {/* Real Image on top, hidden on error */}
                                  <Image
                                    src={imageUrl}
                                    alt={itemName}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    className="relative z-[1] object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    unoptimized
                                  />
                                  {/* Gradient Overlay and Play Button Icon */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-[#1DB954] text-black p-3 rounded-full transform transition-transform">
                                      <PlayIcon className="h-6 w-6" />
                                    </div>
                                  </div>
                                </div>
                                {/* Rating Badge (Simplified) */}
                                <div className="absolute bottom-0 right-0 m-2 bg-black/80 rounded-full px-2 py-1 flex items-center z-10">
                                    {/* --- Simplified Star --- */}
                                    <StarIcon className="text-yellow-400 h-3 w-3 mr-1" />
                                    <span className="text-white text-xs font-semibold">{ratingValue.toFixed(1)}</span> 
                                </div>
                                <div className="p-4">
                                  <h4 className="font-medium line-clamp-1 text-white group-hover:text-[#1DB954] transition-colors" title={itemName}>{itemName}</h4>
                                  <p className="text-sm text-gray-400 line-clamp-1" title={artistName}>{artistName}</p> 
                                  <p className="text-xs text-gray-500 mt-1">{new Date(rating.created_at).toLocaleDateString()}</p>
                                </div>
                              </Link>
                            </div>
                          );
                        })
                     }
                   </div>
               </div>
            )}
                
            {userRatings.length > 20 && (
              <div className="text-center mt-8">
                <Link 
                  href="/profile/ratings" 
                  className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors"
                >
                      See All Ratings
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
            
            <div className="bg-[#181818]/60 p-5 rounded-lg mt-8">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#1DB954]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Rating Statistics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div className="bg-[#202020] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Ratings</p>
                  <p className="text-2xl font-bold">{userRatings.length}</p>
                </div>
                <div className="bg-[#202020] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Tracks Rated</p>
                  <p className="text-2xl font-bold">{userRatings.filter(r => r.item_type === 'track').length}</p>
                </div>
                <div className="bg-[#202020] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Albums Rated</p>
                  <p className="text-2xl font-bold">{userRatings.filter(r => r.item_type === 'album').length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        );
  };
  
  // Modified render function for tracks content
  const renderTracksContent = () => {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-6">Your Top Tracks</h2>
        {loadingTopTracks ? (
          <p className="text-gray-400">Loading top tracks...</p>
        ) : topTracks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {topTracks.map((track) => (
              <TrackItem 
                key={track.id} 
                track={track} 
                onRateTrack={handleRateTrack}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No top tracks to show.</p>
        )}
      </section>
    );
  };

  // Modified render function for stats content
  const renderStatsContent = () => {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Your Listening Stats</h2>
        <div className="bg-[#181818] p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Artists Stats */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Top Artists</h3>
              {loadingTopArtists ? (
                <p className="text-gray-400">Loading artists stats...</p>
              ) : topArtists.length > 0 ? (
                <div className="space-y-3">
                  {topArtists.slice(0, 10).map((artist, index) => (
                    <div key={artist.id} className="flex items-center gap-3">
                      <div className="w-9 h-9">
                        <img 
                          src={artist.images?.[0]?.url || '/placeholder.png'} 
                          alt={artist.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <Link href={`/artist/${artist.id}`} className="hover:underline">
                          <p className="font-medium">{artist.name}</p>
                        </Link>
                        <div className="w-full bg-[#333] h-2 rounded-full mt-1">
                          <div 
                            className="bg-[#1DB954] h-2 rounded-full" 
                            style={{ width: `${100 - (index * 10)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No artist stats available.</p>
              )}
            </div>
            
            {/* Top Tracks Stats */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Top Tracks</h3>
              {loadingTopTracks ? (
                <p className="text-gray-400">Loading track stats...</p>
              ) : topTracks.length > 0 ? (
                <div className="space-y-3">
                  {topTracks.slice(0, 10).map((track, index) => (
                    <div key={track.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 flex-shrink-0">
                        <img 
                          src={track.album?.images?.[0]?.url || '/placeholder.png'} 
                          alt={track.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/track/${track.id}`} className="hover:underline">
                          <p className="font-medium truncate">{track.name}</p>
                        </Link>
                        <p className="text-sm text-gray-400 truncate">
                          {track.artists?.map(artist => artist.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No track stats available.</p>
              )}
            </div>
          </div>
        </div>
      </section>
        );
  };
  
  // Modified render function for moods content
  const renderMoodsContent = () => {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Your Moods</h1>
        <MoodManager />
      </div>
    );
  };

  // Modified render function for overview content
  const renderOverviewContent = () => {
    return (
      <>
        {/* Recent Activity */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="grid grid-cols-1 gap-4">
            {loadingRecentlyPlayed ? (
              <p className="text-gray-400">Loading recent activity...</p>
            ) : recentlyPlayed.length > 0 ? (
              recentlyPlayed.slice(0, 5).map((track) => (
                <TrackItem 
                  key={track.id} 
                  track={track} 
                  onRateTrack={handleRateTrack}
                />
              ))
            ) : (
              <p className="text-gray-400">No recent activity to show.</p>
            )}
          </div>
        </section>
        
        {/* Top Artists */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Your Top Artists</h2>
          {loadingTopArtists ? (
            <p className="text-gray-400">Loading top artists...</p>
          ) : topArtists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {topArtists.slice(0, 5).map((artist, index) => (
                <motion.div 
                  key={artist.id} 
                  className="relative flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/artist/${artist.id}`} className="block">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 overflow-hidden rounded-full mb-2">
                    <img 
                      src={artist.images?.[0]?.url || '/placeholder.png'} 
                      alt={artist.name} 
                        className="w-full h-full object-cover"
                    />
                    </div>
                    <div className="text-center mt-2">
                      <h3 className="font-medium text-sm truncate max-w-[120px] mx-auto">{artist.name}</h3>
                      <p className="text-gray-400 text-xs truncate max-w-[120px] mx-auto">
                        {artist.genres?.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No top artists to show.</p>
          )}
          {topArtists.length > 0 && (
            <div className="mt-6">
              <Link href="/stats?view=artists" className="inline-block text-sm bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] font-medium px-4 py-2 rounded-full transition-colors">
                View all top artists
              </Link>
            </div>
          )}
        </section>
        
        {/* Saved Albums - Use the new function */}
        {renderAlbumsContent()}
        
        {/* Playlists Section - Use the new function */}
        {userPlaylists.length > 0 && renderPlaylistsSection()}
      </>
    );
  };
  
  // Loading state
  if (status === "loading" || loadingProfile) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Profile Header */}
        <div className="relative mb-8">
          {/* Album Moodboard as Cover */}
          <AlbumMoodboard 
            albums={savedAlbums} 
            artists={topArtists} 
            isLoading={loadingSavedAlbums && loadingTopArtists} 
          />
          
          {/* Profile Info */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mt-[-2rem] md:mt-[-4rem] relative z-10">
            {/* Profile Image - Updated to use UserAvatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 relative border-4 border-[#121212] rounded-full bg-[#282828]"> 
              <UserAvatar 
                imageUrl={profile?.images?.[0]?.url || session?.user?.image}
                username={profile?.display_name || session?.user?.name}
                sizeClasses="w-full h-full" // Ensure it fills the container
                textSizeClass="text-4xl md:text-5xl" // Larger text for large avatar
              />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-1">{profile?.display_name || session?.user?.name || "Music Lover"}</h1>
              <p className="text-gray-400 mb-4">
                {profile?.followers?.total ? `${profile.followers.total} followers` : ""}
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                {profile?.external_urls?.spotify && (
                  <a 
                    href={profile.external_urls.spotify} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#1DB954] text-black font-bold px-4 py-2 rounded-full text-sm hover:scale-105 transition-transform"
                  >
                    Spotify Profile
                  </a>
                )}
                
                {/* --- MODIFIED: Edit Profile Button --- */}
                <button 
                  onClick={() => setIsEditModalOpen(true)} // Open the modal
                  className="bg-[#282828] hover:bg-[#333] text-white font-bold px-4 py-2 rounded-full text-sm transition-colors"
                >
                  Edit Profile
                </button>
                {/* --- END MODIFIED --- */}
                      </div>
                    </div>
                  </div>
        </div>
                
        {/* Profile Tabs (onClick should already be using TABS) */}
        <div className="border-b border-gray-800 mb-8">
          <div className="flex overflow-x-auto no-scrollbar">
                  <button
              onClick={() => setActiveTab(TABS.OVERVIEW)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === TABS.OVERVIEW ? 'border-[#1DB954] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              Overview
                  </button>
                  <button
              onClick={() => setActiveTab(TABS.ALBUMS)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === TABS.ALBUMS ? 'border-[#1DB954] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
              Albums
                  </button>
            <button 
              onClick={() => setActiveTab(TABS.TRACKS)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === TABS.TRACKS ? 'border-[#1DB954] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              Tracks
            </button>
            <button 
              onClick={() => setActiveTab(TABS.RATINGS)} // Use TABS constant
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === TABS.RATINGS ? 'border-[#1DB954] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              Ratings
            </button>
                        <button
              onClick={() => setActiveTab(TABS.STATS)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === TABS.STATS ? 'border-[#1DB954] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                        >
              Stats
                        </button>
                <button
              onClick={() => setActiveTab(TABS.MOODS)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${activeTab === TABS.MOODS ? 'border-[#1DB954] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
              Moods
                </button>
              </div>
          </div>
        
        {/* Profile Content based on active tab */}
        {renderContent()}
      </div>
      
      {/* --- MOVE MODAL RENDERING INSIDE RETURN --- */}
      {/* --- Render Confirmation Modal --- */}
      {ratingToDelete && (
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setRatingToDelete(null); // Clear selection on cancel
          }}
          onConfirm={executeDelete}
          title="Delete Rating"
          message={`Are you sure you want to permanently delete your rating for "${ratingToDelete.name || 'this item'}"? This action cannot be undone.`}
          confirmButtonText="Delete"
          isDestructive={true}
        />
      )}

      {/* --- Render Edit Profile Modal --- */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
        currentName={profile?.display_name || session?.user?.name}
      />
      {/* --- END MOVE MODAL RENDERING --- */}

    </div> // This is the final closing div of the main return
  ); 
} // This is the final closing brace for the Profile component function

