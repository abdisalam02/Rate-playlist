'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';
import TokenRefresher from '@/app/components/TokenRefresher';
import SectionHeader from '@/app/components/SectionHeader';
import TrackCard from '@/app/components/TrackCard';
import AlbumCard from '@/app/components/AlbumCard';
import TrackSection from '@/app/components/TrackSection';
import AlbumSection from '@/app/components/AlbumSection';
import { useAudio } from '@/app/providers';
import { DeezerTrack, DeezerAlbum } from '@/app/types/deezer';
import SpotifySearch from '@/app/components/SpotifySearch';

// --- TYPE DEFINITIONS ---
interface Album {
  id: string | number;
  spotify_id?: string | null; // Keep spotify_id for type consistency if used elsewhere
  name: string; 
  images?: { url: string }[];
  artists?: { id?: string | number; name: string }[];
  release_date?: string; 
}

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  playlist_id?: string; // Legacy?
  playlist_name?: string; // Legacy?
  source_playlist?: { id: string; name: string }; // Preferred source info
}

interface UserRecommendation {
  id: string;
  userId: string;
  userName: string;
  userImage: string;
  title: string;
  description: string;
  items: Array<{
    id: string;
    type: string;
    name: string;
    artists: Array<{ name: string }>;
    image: string;
  }>;
}

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

// --- COMPONENT DEFINITIONS ---

// --- MAIN DISCOVER PAGE COMPONENT ---
export default function Discover() {
  const { data: session, status: sessionStatus } = useSession();
  const { playTrack } = useAudio();
  
  // State variables - using Deezer names where applicable
  const [newReleases, setNewReleases] = useState<Album[]>([]);
  const [chartAlbums, setChartAlbums] = useState<Album[]>([]);
  const [chartTracks, setChartTracks] = useState<Track[]>([]);
  const [editorialPlaylistTracks, setEditorialPlaylistTracks] = useState<Track[]>([]);
  const [featuredPlaylistTracks, setFeaturedPlaylistTracks] = useState<Track[]>([]);
  const [freshRapTracks, setFreshRapTracks] = useState<Track[]>([]);
  const [freshRnbTracks, setFreshRnbTracks] = useState<Track[]>([]);
  
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [loadingChartAlbums, setLoadingChartAlbums] = useState(true);
  const [loadingChartTracks, setLoadingChartTracks] = useState(true);
  const [loadingEditorialTracks, setLoadingEditorialTracks] = useState(true);
  const [loadingFeaturedPlaylist, setLoadingFeaturedPlaylist] = useState(true);
  const [loadingFreshRap, setLoadingFreshRap] = useState(true);
  const [loadingFreshRnb, setLoadingFreshRnb] = useState(true);
  
  const [errorReleases, setErrorReleases] = useState<string | null>(null);
  const [errorChartAlbums, setErrorChartAlbums] = useState<string | null>(null);
  const [errorChartTracks, setErrorChartTracks] = useState<string | null>(null);
  const [errorEditorialTracks, setErrorEditorialTracks] = useState<string | null>(null);
  const [errorFeaturedPlaylist, setErrorFeaturedPlaylist] = useState<string | null>(null);
  const [errorFreshRap, setErrorFreshRap] = useState<string | null>(null);
  const [errorFreshRnb, setErrorFreshRnb] = useState<string | null>(null);

  const [featuredTracks, setFeaturedTracks] = useState<DeezerTrack[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [errorFeatured, setErrorFeatured] = useState<string | null>(null);

  const [currentHits, setCurrentHits] = useState<DeezerTrack[]>([]);
  const [loadingCurrentHits, setLoadingCurrentHits] = useState(true);
  const [errorCurrentHits, setErrorCurrentHits] = useState<string | null>(null);

  const processTrackImages = (tracks: Track[]): Track[] => {
    return tracks.map(track => ({
      ...track,
      album: {
        ...(track.album || { name: 'Unknown Album', images: [] }), // Add fallback for album
        images: (track.album?.images || []).map(img => ({
          ...img,
          url: processImageUrl(img.url)
        }))
      }
    }));
  };

  const processAlbumImages = (albums: Album[]): Album[] => {
    return albums.map(album => ({
      ...album,
      images: (album.images || []).map(img => ({ // Add fallback for images array
        ...img,
        url: processImageUrl(img.url)
      }))
    }));
  };
  
  useEffect(() => {
    console.log("Discover Page: useEffect triggered. Session status:", sessionStatus);
    
    // Fetch all the Deezer-based data
    fetchDeezerFeaturedPlaylist();
    fetchDeezerChartTracks();
    fetchFreshRapPlaylist();
    fetchFreshRnbPlaylist();
    
    // User Recommendations are removed for now
    // if (session && session.user) {
    //   fetchUserRecommendations(); 
    // }

  }, [session, sessionStatus]); // Dependency array
  
  // --- LOADING SKELETONS ---
  const renderCardSkeletons = (count: number, type: 'album' | 'track' = 'album') => {
    return Array(count).fill(0).map((_, i) => (
       <div key={`skel-${type}-${i}`} className={`bg-gradient-to-br from-[#222222] to-[#181818] rounded-xl p-${type === 'album' ? 4 : 3} animate-pulse ${type === 'track' ? 'flex items-center gap-3' : ''}`}>
        {type === 'album' ? (
           <>
        <div className="aspect-square mb-4 bg-gray-700 rounded-lg"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </>
        ) : (
          <>
             <div className="w-12 h-12 bg-gray-700 rounded-md flex-shrink-0"></div>
             <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
             </div>
             <div className="w-10 h-3 bg-gray-700 rounded ml-2 flex-shrink-0"></div>
          </>
        )}
      </div>
    ));
  };
  
  // --- ERROR DISPLAY COMPONENT ---
  const ErrorDisplay = ({ message }: { message: string | null }) => {
      if (!message) return null;
      // Simple inline display for errors
      return ( <p className="text-red-400 text-sm italic my-2 text-center">{message}</p> );
  };

  // --- Fetch Deezer Featured Playlist (Fresh Pop) ---
  const fetchDeezerFeaturedPlaylist = async () => {
    setLoadingFeaturedPlaylist(true); setErrorFeaturedPlaylist(null);
    const playlistId = '2228601362'; // Fresh Pop ID
    try {
      const apiUrl = buildApiUrl(`/api/deezer/playlist/${playlistId}`, { limit: 5 });
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const tracks = data?.tracks || data || [];
      if (Array.isArray(tracks)) setFeaturedPlaylistTracks(processTrackImages(tracks));
      else throw new Error('Invalid data format');
    } catch (err: any) {
      console.error('FRONTEND: Error fetching Deezer featured playlist:', err);
      setErrorFeaturedPlaylist(err.message || 'Failed to load featured playlist');
      setFeaturedPlaylistTracks([]);
    } finally {
      setLoadingFeaturedPlaylist(false);
    }
  };

  // --- Fetch Deezer Chart Albums ---
  const fetchDeezerChartAlbums = async () => {
    setLoadingChartAlbums(true); setErrorChartAlbums(null);
    try {
      const apiUrl = buildApiUrl('/api/deezer/chart/albums', { limit: 3 });
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const albums = data?.albums || data || [];
      if (Array.isArray(albums)) setChartAlbums(processAlbumImages(albums));
      else throw new Error('Invalid data format');
    } catch (error) {
       console.error('FRONTEND: Error fetching Deezer chart albums:', error);
       setErrorChartAlbums(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
       setChartAlbums([]);
    } finally { setLoadingChartAlbums(false); }
  };

  // --- Fetch Deezer Chart Tracks ---
  const fetchDeezerChartTracks = async () => {
    setLoadingChartTracks(true); setErrorChartTracks(null);
    try {
      const apiUrl = buildApiUrl('/api/deezer/chart/tracks', { limit: 5 });
      console.log("FRONTEND: Fetching Deezer Chart Tracks from:", apiUrl);
      const response = await fetch(apiUrl);
      console.log(`FRONTEND: Deezer Chart Tracks Response Status: ${response.status}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      console.log("FRONTEND: Received Deezer Chart Tracks Data:", data);
      const tracks = data?.tracks || data || [];
      if (Array.isArray(tracks)) {
        setChartTracks(processTrackImages(tracks));
      } else {
         throw new Error('Invalid data format for chart tracks');
      }
    } catch (error) {
      console.error('FRONTEND: Error fetching Deezer chart tracks:', error);
      setErrorChartTracks(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setChartTracks([]);
    } finally { setLoadingChartTracks(false); }
  };

  // --- Fetch Fresh Rap Playlist ---
  const fetchFreshRapPlaylist = async () => {
    setLoadingFreshRap(true); setErrorFreshRap(null);
    const playlistId = '6682665064'; // Fresh Rap ID
    try {
      const apiUrl = buildApiUrl(`/api/deezer/playlist/${playlistId}`, { limit: 6 }); // Fetch 6 for the grid
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error (Fresh Rap): ${response.status}`);
      const data = await response.json();
      const tracks = data?.tracks || data || [];
      if (Array.isArray(tracks)) setFreshRapTracks(processTrackImages(tracks));
      else throw new Error('Invalid data format (Fresh Rap)');
    } catch (err: any) {
      console.error('FRONTEND: Error fetching Fresh Rap playlist:', err);
      setErrorFreshRap(err.message || 'Failed to load Fresh Rap playlist');
      setFreshRapTracks([]);
    } finally { setLoadingFreshRap(false); }
  };

  // --- Fetch Fresh RnB Playlist ---
  const fetchFreshRnbPlaylist = async () => {
    setLoadingFreshRnb(true); setErrorFreshRnb(null);
    const playlistId = '2021225582'; // Fresh RnB ID
    try {
      const apiUrl = buildApiUrl(`/api/deezer/playlist/${playlistId}`, { limit: 5 }); // Fetch 5 for the list
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error (Fresh RnB): ${response.status}`);
      const data = await response.json();
      const tracks = data?.tracks || data || [];
      if (Array.isArray(tracks)) setFreshRnbTracks(processTrackImages(tracks));
      else throw new Error('Invalid data format (Fresh RnB)');
    } catch (err: any) {
      console.error('FRONTEND: Error fetching Fresh RnB playlist:', err);
      setErrorFreshRnb(err.message || 'Failed to load Fresh RnB playlist');
      setFreshRnbTracks([]);
    } finally { setLoadingFreshRnb(false); }
  };

  const handlePlayTrack = (track: DeezerTrack) => {
    if (track.preview) {
      playTrack({ 
        id: String(track.id),
        name: track.title || 'Unknown Track',
        preview_url: track.preview, 
        artists: track.contributors?.map((c: { name: string }) => ({ name: c.name })) || (track.artist ? [{ name: track.artist.name }] : []),
        album: track.album ? { name: track.album.title, images: [{ url: track.album.cover_medium || ''}] } : undefined
      });
    } else {
      console.log("No preview available for this track.");
    }
  };

  // --- MAIN JSX STRUCTURE ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#1a1a1a] text-white">
      <TokenRefresher />
      <Navbar />
      
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-r from-[#1DB954]/30 via-[#1a1a1a]/50 to-[#121212] pt-28 pb-16 px-4 md:px-8">
         <div className="container mx-auto max-w-7xl">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-white tracking-tight"
          >
            Discover <span className="text-[#1DB954]">Your Next Favorite</span>
          </motion.h1>
          <motion.p
             initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
             className="text-gray-300 mb-6 max-w-3xl text-base md:text-lg lg:text-xl"
          >
            Explore fresh releases, trending tracks, top charts, and community picks curated just for you.
          </motion.p>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="container mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12">

        {/* --- Add the SpotifySearch component here --- */} 
        <SpotifySearch /> 

        {/* Featured Playlist Section (Fresh Pop) */}
        <section className="mb-10 md:mb-16">
          <SectionHeader title="Fresh Pop Mix" viewAllLink="/discover/home-featured-tracks" />
           {loadingFeaturedPlaylist ? (
            <div className="space-y-3">{renderCardSkeletons(5, 'track')}</div>
          ) : errorFeaturedPlaylist ? (
             <ErrorDisplay message={errorFeaturedPlaylist} />
          ) : featuredPlaylistTracks.length > 0 ? (
            <div className="space-y-3">
              {featuredPlaylistTracks.map(track => ( <TrackCard key={`featured-${track.id}`} track={track} /> ))} 
            </div>
          ) : ( <p className="text-gray-500 italic">Could not load Fresh Pop playlist.</p> )} 
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Left Column (Wider) */}
          <div className="lg:col-span-2 space-y-10 md:space-y-16">

            {/* Deezer Chart Tracks Section */}
            <section>
              <SectionHeader title="Today's Top Tracks" viewAllLink="/discover/current-hits" />
               {loadingChartTracks ? ( <div className="space-y-3">{renderCardSkeletons(5, 'track')}</div> ) :
                errorChartTracks ? ( <ErrorDisplay message={errorChartTracks} /> ) :
                chartTracks.length > 0 ? ( 
                <div className="space-y-3">
                    {/* Removed source display <p className="text-xs text-green-500">Source: {popularTracksSource} ({chartTracks.length} tracks)</p> */}
                    {chartTracks.map(track => (<TrackCard key={`popular-${track.id}`} track={track} />))} 
                </div>
                ) :
                ( <p className="text-gray-500 italic">Couldn't load top tracks chart.</p> )} 
            </section>
            
            {/* Fresh Rap Section (Replaces New Releases) */}
            <section>
              <SectionHeader title="Fresh Rap" viewAllLink="/discover/fresh-rap" />
              {loadingFreshRap ? ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">{renderCardSkeletons(6, 'track')}</div> ) :
               errorFreshRap ? ( <ErrorDisplay message={errorFreshRap} /> ) :
               freshRapTracks.length > 0 ? ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">{freshRapTracks.map(track => (<TrackCard key={`rap-${track.id}`} track={track} />))}</div> ) : 
               ( <p className="text-gray-500 italic">Couldn't load Fresh Rap playlist.</p> )} 
            </section>
            
             {/* Fresh RnB Section (Replaces Hits of the Moment) */}
            <section>
              <SectionHeader title="Fresh RnB" viewAllLink="/discover/fresh-rnb" /> 
               {loadingFreshRnb ? ( <div className="space-y-3">{renderCardSkeletons(5, 'track')}</div> ) :
                errorFreshRnb ? ( <ErrorDisplay message={errorFreshRnb} /> ) :
                freshRnbTracks.length > 0 ? ( <div className="space-y-3">{freshRnbTracks.map(track => (<TrackCard key={`rnb-${track.id}`} track={track} />))}</div> ) : 
                ( <p className="text-gray-500 italic">Couldn't load Fresh RnB playlist.</p> )} 
            </section>
          </div>
          
          {/* Right Column (Sidebar) */}
          <div className="space-y-10 md:space-y-16">
            {/* --- COMMENTING OUT THE ENTIRE TOP ALBUMS SECTION --- */}
            {/* 
            <section>
              <SectionHeader title="Top Albums" viewAllLink="/discover/popular-albums" /> 
               {loadingTopAlbums ? ( <div className="grid grid-cols-1 gap-4 md:gap-6">{renderCardSkeletons(3, 'album')}</div> ) :
                errorTopAlbums ? ( <ErrorDisplay message={errorTopAlbums} /> ) :
                topAlbums.length > 0 ? ( 
                  <div className="grid grid-cols-1 gap-4 md:gap-6">
                    {topAlbums.map(album => (<AlbumCard key={`pop-album-${album.id}`} album={album} />))} 
                </div>
                ) :
                ( <p className="text-gray-500 italic">Couldn't load top albums chart.</p> )} 
            </section>
            */}
            
            {/* Community Picks Section - REMOVED */}
          </div>
        </div>
      </div>
    </div>
  );
} 
// --- END OF FILE /app/discover/page.tsx ---