'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Use App Router's useRouter
import { useDebouncedCallback } from 'use-debounce';
import Image from 'next/image';
import Link from 'next/link';

// Interfaces for Spotify search results (simplified)
interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: SpotifyArtist[];
  album_type: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  preview_url: string | null;
  duration_ms: number;
}

// Combined result item type
type SearchResultItem = (SpotifyTrack & { type: 'track' }) | (SpotifyAlbum & { type: 'album' });

// Helper to format duration
const formatDuration = (ms: number): string => {
    if (isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function SpotifySearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Debounced function to fetch search results
  const fetchResults = useDebouncedCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`Searching Spotify for: ${searchTerm}`);

    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchTerm)}&type=track,album&limit=5`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `API Error: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Combine and type tracks and albums
      const combinedResults: SearchResultItem[] = [];
      if (data.tracks?.items) {
          combinedResults.push(...data.tracks.items.map((item: SpotifyTrack) => ({ ...item, type: 'track' })));
      }
      if (data.albums?.items) {
          combinedResults.push(...data.albums.items.map((item: SpotifyAlbum) => ({ ...item, type: 'album' })));
      }
      
      setResults(combinedResults);
      console.log("Search results set:", combinedResults);

    } catch (err: any) {
      console.error("Search fetch error:", err);
      setError(err.message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 350); // Debounce time in ms

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    fetchResults(newQuery);
  };
  
  const handleResultClick = () => {
      // Close results dropdown when an item is clicked
      setQuery(''); // Clear input
      setResults([]); // Clear results
      setIsFocused(false); // Hide dropdown
  };

  return (
    <div className="relative w-full max-w-xl mx-auto mb-12 z-20"> {/* Added z-index */}
      {/* Search Input */}
      <div className="relative">
         <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          // Consider onBlur with a slight delay if needed to allow clicks
          onBlur={() => setTimeout(() => setIsFocused(false), 150)} // Delay allows click on results
          placeholder="Search Spotify for tracks & albums..."
          className="w-full pl-10 pr-4 py-3 bg-[#2a2a2a] text-white border border-[#404040] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent placeholder-gray-500 transition duration-200"
        />
         <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
         </svg>
      </div>

      {/* Results Dropdown - Show only when focused and has query/results/loading/error */}
      {isFocused && (query || results.length > 0 || isLoading || error) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#282828] border border-[#404040] rounded-lg shadow-xl overflow-hidden overflow-y-auto max-h-80 z-30"> {/* Added higher z-index */}
          {isLoading && (
            <div className="p-4 text-center text-gray-400">Searching...</div>
          )}
          {error && (
            <div className="p-4 text-center text-red-400">Error: {error}</div>
          )}
          {!isLoading && !error && results.length === 0 && query && (
            <div className="p-4 text-center text-gray-400">No results found for "{query}"</div>
          )}
          {!isLoading && !error && results.length > 0 && (
            <ul>
              {results.map((item) => (
                <li key={`${item.type}-${item.id}`} className="border-b border-[#404040] last:border-b-0">
                  <Link
                    href={item.type === 'track' ? `/track/${item.id}` : `/album/${item.id}`}
                    onClick={handleResultClick} // Close dropdown on click
                    className="flex items-center p-3 gap-3 hover:bg-[#3a3a3a] transition duration-150"
                  >
                    <Image
                      src={item.type === 'track' ? item.album.images?.[0]?.url : item.images?.[0]?.url}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="rounded object-cover flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/40x40/1DB954/FFFFFF?text=!'; e.currentTarget.onerror = null; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{item.name}</p>
                      <p className="text-gray-400 text-xs truncate">
                        <span className="capitalize mr-1">{item.type}</span> • {item.artists.map(a => a.name).join(', ')}
                      </p>
                    </div>
                    {item.type === 'track' && (
                        <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
                            {formatDuration(item.duration_ms)}
                        </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 