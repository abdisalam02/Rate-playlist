'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import TokenRefresher from '@/app/components/TokenRefresher';
import TrackCard from '@/app/components/TrackCard';
import { Album, Track } from '@/types/index'; // Use shared types
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAudio } from '@/app/providers';
// Remove unused/incorrect imports
// import { processAlbumImages, InlineAlbumCard } from '@/app/components/InlineAlbumCard'; 
// import { processTrackImages } from '@/utils/imageProcessing'; 

// --- HELPER FUNCTIONS ---

// Ensure image URLs use HTTPS and provide fallback
const processImageUrl = (url: string | undefined): string => {
  // If no URL, use a reliable placeholder
  if (!url) return 'https://placehold.co/400x400/1DB954/FFFFFF?text=Music';
  
  // Ensure we use HTTPS for Spotify images
  let processedUrl = url;
  if (url.startsWith('http://') && url.includes('.scdn.co')) {
    processedUrl = url.replace('http://', 'https://');
  }
  
  // Don't replace Spotify CDN images with placeholders
  // Just return the processed URL
  return processedUrl;
};

// Handle image loading errors
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  console.warn(`Image failed to load: ${e.currentTarget.src}, falling back to placeholder.`);
  
  // Use different placeholder based on size
  const width = e.currentTarget.width || 400;
  const height = e.currentTarget.height || 400;
  e.currentTarget.src = `https://placehold.co/${width}x${height}/1DB954/FFFFFF?text=Music`;
  
  e.currentTarget.onerror = null; // Prevent infinite loop
};

// Format track duration
const formatDuration = (ms: number): string => {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper function to construct API URL
// NOTE: Removed conditional client credentials logic for simplicity,
// assuming backend handles auth appropriately or endpoints are public.
const buildApiUrl = (basePath: string, params: Record<string, any> = {}) => {
  const query = new URLSearchParams(params);
  const url = `${basePath}?${query.toString()}`;
  console.log(`FRONTEND: Fetching from: ${url}`);
  return url;
};

// --- Helper Functions to Fetch Data --- 

// Helper to fetch Deezer Playlist and format tracks
async function fetchAndFormatDeezerPlaylist(playlistId: string, limit: number, playlistName: string): Promise<Track[]> {
  console.log(`FRONTEND: Fetching from: /api/deezer/playlist/${playlistId}?limit=${limit}`);
  const response = await fetch(`/api/deezer/playlist/${playlistId}?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${playlistName} playlist: ${response.statusText}`);
  }
  const data = await response.json();

  // Playlist API returns { tracks: { data: [...] } }
  const rawTracks = data?.tracks?.data;

  if (!Array.isArray(rawTracks)) {
    console.error(`Invalid data format (${playlistName})`, data);
    throw new Error(`Invalid data format (${playlistName})`);
  }

  console.log(`FRONTEND: Received ${rawTracks.length} tracks for ${playlistName}.`);

  // Map raw Deezer track to shared Track type
  return rawTracks.map((t: any): Track => ({
    id: t.id.toString(),
    name: t.title_short || t.title,
    title: t.title,
    artists: t.contributors?.map((a: any) => ({ name: a.name })) || (t.artist ? [{ name: t.artist.name }] : []),
    album: {
      id: t.album?.id?.toString(),
      name: t.album?.title,
      images: [{ url: t.album?.cover_medium || t.album?.cover || '/placeholder-album.png' }], 
      cover_medium: t.album?.cover_medium, 
    },
    duration: t.duration,
    duration_ms: t.duration ? t.duration * 1000 : undefined,
    preview: t.preview,
    preview_url: t.preview, 
    explicit: t.explicit_lyrics, 
  }));
}

// Fetch Featured Playlist (Deezer - Example: Fresh Pop Mix)
async function fetchDeezerFeaturedPlaylist(): Promise<Track[]> {
    const PLAYLIST_ID = '6682665064';
    const LIMIT = 6;
    return fetchAndFormatDeezerPlaylist(PLAYLIST_ID, LIMIT, "Deezer Featured Playlist (Fresh Pop Mix)");
}

// Reusable function to fetch Deezer Chart Tracks
async function fetchDeezerChartTracks(limit: number = 5): Promise<Track[]> {
    const apiUrl = `/api/deezer/chart/tracks?limit=${limit}`;
    console.log(`FRONTEND (Discover): Fetching Deezer Chart Tracks from: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl, { cache: 'no-store' });
        console.log(`FRONTEND (Discover): Deezer Chart Tracks Response Status: ${response.status}`);
        if (!response.ok) {
            console.error(`FRONTEND (Discover): Failed to fetch Deezer chart tracks: ${response.status}`);
            return [];
        }
        const data = await response.json();
        console.log(`FRONTEND (Discover): Received Deezer Chart Tracks Data:`, data);
        
        // *** CORRECTED DATA ACCESS ***
        const tracksData = data?.tracks?.data; // Access nested 'data' array

        if (!Array.isArray(tracksData)) {
            console.error("FRONTEND (Discover): Invalid data format (Deezer Chart)", data);
            return [];
        }

        // Adapt to Deezer API structure
        const tracks = tracksData.map((item: any): Track => ({
            id: item.id?.toString() ?? Math.random().toString(),
            name: item.title ?? 'Unknown Track',
            artists: item.artist ? [{ id: item.artist.id?.toString(), name: item.artist.name }] : [],
            album: {
                id: item.album?.id?.toString(),
                name: item.album?.title,
                images: item.album?.cover_medium ? [{ url: item.album.cover_medium, height: 300, width: 300 }] : [], // Use cover_medium
            },
            duration_ms: item.duration ? item.duration * 1000 : undefined,
            preview_url: item.preview || null,
        }));
        console.log(`FRONTEND (Discover): Received ${tracks.length} chart tracks.`);
        return tracks;
    } catch (error) {
        console.error(`FRONTEND (Discover): Error fetching Deezer chart tracks:`, error);
        return [];
    }
}

// Fetch Fresh Rap (Deezer Playlist)
async function fetchFreshRapPlaylist(): Promise<Track[]> {
    const PLAYLIST_ID = '2228601362';
    const LIMIT = 5;
    return fetchAndFormatDeezerPlaylist(PLAYLIST_ID, LIMIT, "Fresh Rap");
}

// Fetch Fresh RnB (Deezer Playlist)
async function fetchFreshRnbPlaylist(): Promise<Track[]> {
    const PLAYLIST_ID = '2021225582'; // Fresh RnB ID
    const LIMIT = 5;
    return fetchAndFormatDeezerPlaylist(PLAYLIST_ID, LIMIT, "Fresh RnB");
}

// --- Search Result Types ---
interface SearchResults {
    tracks?: { items: Track[] };
    albums?: { items: Album[] };
    artists?: { items: any[] }; // Add artists later if needed
}

// --- Simple Album Card for Search Results ---
function SearchAlbumCard({ album }: { album: Album }) {
    const imageUrl = album.images?.[0]?.url || 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album';
    const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : null;
  return (
        <div className="bg-[#181818] hover:bg-[#282828] transition rounded-lg overflow-hidden h-full flex flex-col">
            <Link href={`/album/${album.id}`} className="block p-3 flex flex-col h-full">
                <div className="aspect-square mb-3 overflow-hidden rounded-md relative">
                    <Image 
              src={imageUrl}
              alt={album.name || 'Album cover'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                        onError={(e: any) => { e.target.src = 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album'; }}
                    />
              </div>
                <div className="flex-1">
                    <h3 className="font-bold text-sm text-white truncate" title={album.name}>{album.name}</h3>
                    <p className="text-neutral-400 text-xs truncate" title={album.artists?.map(a => a.name).join(', ')}>
                {releaseYear ? `${releaseYear} • ` : ''}{album.artists?.map(a => a.name).join(', ') || 'Various Artists'}
              </p>
        </div>
      </Link>
        </div>
    );
}

// --- Search Input Component (Modified) ---
interface SearchBarProps {
    onSearchSubmit: (query: string) => void;
    initialQuery?: string; // To potentially persist query if needed
}
function SearchBar({ onSearchSubmit, initialQuery = '' }: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearchSubmit(query);
    };

          return (
        <form onSubmit={handleSearch} className="relative mb-8">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for tracks, albums, artists..."
                className="w-full px-4 py-3 pr-10 bg-[#2a2a2a] text-white rounded-full border border-transparent focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent placeholder-neutral-500 text-sm"
            />
            <button 
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-neutral-400 hover:text-white transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
            </button>
        </form>
    );
}

// Loading spinner (can be reused)
function SimpleLoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="w-full h-32 flex items-center justify-center text-neutral-400">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954] mr-3"></div>
      <p>{message}</p>
    </div>
  );
}

// --- Discover Component (Modified) ---
export default function Discover() {
    const { data: session, status } = useSession();
    
    // State for default Discover content
    const [featuredPlaylist, setFeaturedPlaylist] = useState<Track[]>([]);
    const [topTracks, setTopTracks] = useState<Track[]>([]);
    const [freshRap, setFreshRap] = useState<Track[]>([]);
    const [freshRnb, setFreshRnb] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorFeatured, setErrorFeatured] = useState<string | null>(null);
    const [errorTop, setErrorTop] = useState<string | null>(null);
    const [errorRap, setErrorRap] = useState<string | null>(null);
    const [errorRnb, setErrorRnb] = useState<string | null>(null);
    
    // State for Search
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
    const [isSearchLoading, setIsSearchLoading] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Fetch initial discover data (playlists, charts)
    useEffect(() => {
        const loadInitialData = async () => {
            console.log("Discover: Fetching initial data...");
            setIsLoading(true);
            try {
                const [featuredData, topData, rapData, rnbData] = await Promise.all([
                    fetchDeezerFeaturedPlaylist(),
                    fetchDeezerChartTracks(),
                    fetchFreshRapPlaylist(),
                    fetchFreshRnbPlaylist()
                ]);
                setFeaturedPlaylist(featuredData);
                setTopTracks(topData);
                setFreshRap(rapData);
                setFreshRnb(rnbData);
    } catch (error) {
                console.error("Discover: Error fetching initial data:", error);
                // Set individual errors or a general error message
                setErrorFeatured('Failed to load featured playlist.');
                setErrorTop('Failed to load top tracks.');
                setErrorRap('Failed to load fresh rap.');
                setErrorRnb('Failed to load fresh RnB.');
            } finally {
                setIsLoading(false);
            }
        };
        // Only fetch if not searching
        if (!searchQuery) {
            loadInitialData();
        }
    }, [searchQuery]); // Refetch if searchQuery becomes empty

    // Fetch search results when searchQuery changes
    useEffect(() => {
        if (searchQuery) {
            const fetchResults = async () => {
                setIsSearchLoading(true);
                setSearchError(null);
                setSearchResults(null); // Clear previous results
                try {
                    const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&type=track,album&limit=12`);
                    if (!response.ok) {
                        throw new Error(`Search failed: ${response.statusText}`);
                    }
                    const data: SearchResults = await response.json();
                    console.log("Search results received:", data);
                    setSearchResults(data);
                } catch (err) {
                    console.error("Error fetching search results:", err);
                    setSearchError(err instanceof Error ? err.message : 'An unknown search error occurred');
                } finally {
                    setIsSearchLoading(false);
                }
            };
            fetchResults();
        }
    }, [searchQuery]);

    const handleSearchSubmit = (query: string) => {
        setSearchQuery(query);
        // Clear default content when starting a search
        if (query) {
             setFeaturedPlaylist([]);
             setTopTracks([]);
             setFreshRap([]);
             setFreshRnb([]);
        }
    };
    
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
        setIsSearchLoading(false);
        setSearchError(null);
        // Refetching of default content will happen via the first useEffect
    };

    // --- Render Helper for default sections ---
    const renderTrackSection = (title: string, tracks: Track[], viewAllLink: string, loading: boolean, error: string | null) => (
        <section className="mb-12">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                {!loading && !error && tracks.length > 0 && (
                    <Link href={viewAllLink} className="text-sm font-semibold text-neutral-400 hover:text-white hover:underline">
                        View all
                    </Link>
                )}
            </div>
            {loading && <p className="text-neutral-400">Loading {title.toLowerCase()}...</p>}
            {error && <p className="text-red-500">Error loading {title.toLowerCase()}: {error}</p>}
            {!loading && !error && tracks.length === 0 && <p className="text-neutral-400">No {title.toLowerCase()} available right now.</p>}
            {!loading && !error && tracks.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                    {tracks.map((track) => (
                        <TrackCard key={track.id} track={track} />
                    ))}
                </div>
            )}
        </section>
    );
    
    // --- Render Helper for search result sections ---
    const renderSearchResults = () => (
        <div className="mt-8 space-y-12">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Search Results for "{searchQuery}"</h2>
                <button 
                    onClick={clearSearch} 
                    className="text-sm text-neutral-400 hover:text-white hover:underline">
                    Clear Search
                </button>
                </div>
            
            {isSearchLoading && <SimpleLoadingSpinner message="Searching..." />}
            {searchError && <p className="text-red-500 text-center mt-8">Error searching: {searchError}</p>}

            {!isSearchLoading && !searchError && !searchResults && (
                <p className="text-neutral-500 text-center mt-8">No results found.</p>
            )}
            
            {searchResults && (
                <>
                    {/* Tracks */}
                    {searchResults.tracks && searchResults.tracks.items.length > 0 && (
                        <section>
                            <h3 className="text-xl font-semibold mb-4">Tracks</h3>
                            {/* Using grid layout similar to search page */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {searchResults.tracks.items.map((track) => (
                                    <TrackCard key={`search-${track.id}`} track={track} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Albums */}
                    {searchResults.albums && searchResults.albums.items.length > 0 && (
            <section>
                            <h3 className="text-xl font-semibold mb-4">Albums</h3>
                            {/* Using grid layout similar to search page */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {searchResults.albums.items.map((album) => (
                                    <SearchAlbumCard key={`search-${album.id}`} album={album} />
                                ))}
                            </div>
            </section>
                    )}

                    {/* No results message */}
                    {searchResults.tracks?.items.length === 0 && searchResults.albums?.items.length === 0 && (
                        <p className="text-neutral-500 text-center mt-8">No matching tracks or albums found.</p>
                    )}
                </>
            )}
          </div>
    );

    // --- Main Render ---
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">
            <TokenRefresher />
            <Navbar />
            <main className="pt-20 pb-20 px-6 max-w-7xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold mb-2">Discover</h1>
                    <p className="text-neutral-400">Explore new music or search for tracks, albums, and artists.</p>
                </div>

                <SearchBar onSearchSubmit={handleSearchSubmit} initialQuery={searchQuery} />

                {/* Wrap content in Suspense */}
                <Suspense fallback={<SimpleLoadingSpinner message="Loading..." />}>
                    {searchQuery ? (
                        renderSearchResults()
                    ) : (
                        // Check if initial loading is complete before rendering default sections
                        isLoading ? (
                            <SimpleLoadingSpinner message="Loading music..." />
                        ) : (
                            <>
                                {renderTrackSection("Rap", featuredPlaylist, "/discover/featured-playlists", false, errorFeatured)}
                                {renderTrackSection("Today's Top Tracks", topTracks, "/discover/current-hits", false, errorTop)}
                                {renderTrackSection("Fresh Pop", freshRap, "/discover/fresh-rap", false, errorRap)}
                                {renderTrackSection("Fresh RnB", freshRnb, "/discover/fresh-rnb", false, errorRnb)}
                            </>
                        )
                    )}
                </Suspense>
            </main>
    </div>
  );
} 