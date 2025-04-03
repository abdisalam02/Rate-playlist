// --- START OF FILE /app/discover/page.tsx ---
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar'; // Assuming Navbar path is correct
import { motion } from 'framer-motion';
import TokenRefresher from '@/app/components/TokenRefresher'; // Assuming TokenRefresher path is correct

// --- TYPE DEFINITIONS ---
interface Album {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  images: Array<{ url: string }>;
  release_date?: string;
  source?: string; // Added for debugging
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


// --- COMPONENT DEFINITIONS ---

// Album Card Component
function AlbumCard({ album }: { album: Album }) {
  const imageUrl = processImageUrl(album.images?.[0]?.url);
  const releaseYear = album.release_date ? new Date(album.release_date.split('-')[0]).getFullYear() : null;

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }}
      className="bg-gradient-to-br from-[#222222] to-[#181818] rounded-xl overflow-hidden transition-all hover:bg-[#282828] shadow-lg h-full flex flex-col" // Added h-full flex flex-col
    >
      <Link href={`/album/${album.id}`} className="block p-4 flex flex-col flex-grow"> {/* Added flex flex-col flex-grow */}
          <div className="aspect-square mb-4 overflow-hidden rounded-lg relative group">
            <img
              src={imageUrl}
              alt={album.name || 'Album cover'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={handleImageError}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all duration-300">
              <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-in-out shadow-lg">
                {/* Play Icon or Arrow */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          <div className="mt-auto"> {/* Pushes text to bottom */}
              <h3 className="font-bold text-base truncate text-white" title={album.name}>{album.name}</h3>
              <p className="text-gray-400 text-sm truncate" title={album.artists?.map(a => a.name).join(', ')}>
                {releaseYear ? `${releaseYear} • ` : ''}{album.artists?.map(a => a.name).join(', ') || 'Various Artists'}
              </p>
              {/* Optional: Show source for debugging */}
              {album.source && <p className="text-[10px] text-gray-600 mt-1">Src: {album.source}</p> }
        </div>
      </Link>
    </motion.div>
  );
}

// Track Card Component
function TrackCard({ track }: { track: Track }) {
  const imageUrl = processImageUrl(track.album?.images?.[0]?.url);

  return (
    <motion.div
      whileHover={{ backgroundColor: '#2A2A2A', x: 3 }}
      className="bg-[#181818] rounded-lg overflow-hidden transition-all p-3 border border-transparent hover:border-[#333333]"
    >
      <Link href={`/track/${track.id}`} className="flex items-center gap-3">
        <div className="w-12 h-12 flex-shrink-0 relative group">
          <img
            src={imageUrl}
            alt={track.album?.name || track.name}
            className="w-full h-full object-cover rounded-md shadow-md"
            onError={handleImageError}
            loading="lazy"
          />
           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200 rounded-md">
            <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-200 ease-in-out">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-black">
                   <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm md:text-base truncate text-white" title={track.name}>{track.name}</h3>
          <p className="text-gray-400 text-xs md:text-sm truncate" title={track.artists?.map(a => a.name).join(', ')}>
            {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
          </p>
          {track.source_playlist?.name && (
            <p className="text-xs text-green-400 mt-0.5">
              From: {track.source_playlist.name}
            </p>
          )}
          {track.playlist_name && !track.source_playlist?.name && ( // Legacy fallback
            <p className="text-xs text-green-500 mt-0.5">
              From: {track.playlist_name}
            </p>
          )}
        </div>
        <div className="text-gray-400 text-sm ml-2 flex-shrink-0">
          {formatDuration(track.duration_ms)}
        </div>
      </Link>
    </motion.div>
  );
}

// User Recommendation Card Component
function UserRecommendationCard({ recommendation }: { recommendation: UserRecommendation }) {
  const userImageUrl = processImageUrl(recommendation.userImage);
  return (
    <div className="bg-gradient-to-br from-[#222222] to-[#181818] rounded-xl overflow-hidden p-5 shadow-md border border-[#333333] hover:border-[#444444] transition-all">
      <div className="flex items-center mb-4">
        <Link href={`/user/${recommendation.userId}`}>
          <img 
            src={userImageUrl || 'https://placehold.co/100x100/1DB954/FFFFFF?text=User'} // Fallback
            alt={recommendation.userName || 'User'}
            className="w-12 h-12 rounded-full mr-4 border-2 border-[#1DB954]"
            onError={handleImageError}
            loading="lazy"
          />
        </Link>
        <div>
          <h3 className="font-bold text-lg text-white">{recommendation.title}</h3>
          <Link href={`/user/${recommendation.userId}`} className="text-sm text-gray-400 hover:text-[#1DB954] transition-colors">
            @{recommendation.userName}
          </Link>
        </div>
      </div>
      
      <p className="text-gray-300 mb-5 text-sm italic">{recommendation.description}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recommendation.items.slice(0, 4).map(item => {
          const itemImageUrl = processImageUrl(item.image);
          const itemType = item.type || 'track'; // Default to track if type missing
          const itemArtists = item.artists?.map(a => a.name).join(', ') || 'Various Artists';
          return (
          <Link 
            key={item.id} 
            href={`/${itemType}/${item.id}`} // Use itemType
            className="flex items-center bg-[#282828] rounded-lg p-3 hover:bg-[#333333] transition-colors min-w-0"
            title={`${item.name} by ${itemArtists}`}
          >
            <img 
              src={itemImageUrl}
              alt={item.name || 'Item image'}
              className="w-10 h-10 rounded-md mr-3 object-cover shadow-sm flex-shrink-0"
              onError={handleImageError}
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate text-white">{item.name}</h4>
              <p className="text-xs text-gray-400 truncate">{itemArtists}</p>
            </div>
          </Link>
        );
       })}
      </div>
    </div>
  );
}

// *** THIS IS THE MISSING COMPONENT ***
// Section Header component for consistent styling
// Ensure this function is defined OUTSIDE the main Discover component function
function SectionHeader({ title, viewAllLink }: { title: string; viewAllLink?: string }) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      {viewAllLink && (
      <Link 
        href={viewAllLink} 
          className="text-sm font-medium text-[#b3b3b3] hover:text-white hover:underline flex items-center group" // Adjusted colors slightly
        >
          Show all
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      )}
    </div>
  );
}
// *** END OF SectionHeader DEFINITION ***


// --- MAIN DISCOVER PAGE COMPONENT ---
export default function Discover() {
  const { data: session } = useSession();
  
  const [newReleases, setNewReleases] = useState<Album[]>([]);
  const [popularAlbums, setPopularAlbums] = useState<Album[]>([]);
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<UserRecommendation[]>([]);
  const [topStreamedTracks, setTopStreamedTracks] = useState<Track[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [loadingPopularAlbums, setLoadingPopularAlbums] = useState(true);
  const [loadingPopularTracks, setLoadingPopularTracks] = useState(true);
  const [loadingUserRecs, setLoadingUserRecs] = useState(true);
  const [loadingTopStreamed, setLoadingTopStreamed] = useState(true);
  const [loadingFeaturedTracks, setLoadingFeaturedTracks] = useState(true);
  
  const [errorReleases, setErrorReleases] = useState<string | null>(null);
  const [errorPopularAlbums, setErrorPopularAlbums] = useState<string | null>(null);
  const [errorPopularTracks, setErrorPopularTracks] = useState<string | null>(null);
  const [errorUserRecs, setErrorUserRecs] = useState<string | null>(null);
  const [errorTopStreamed, setErrorTopStreamed] = useState<string | null>(null);
  const [errorFeaturedTracks, setErrorFeaturedTracks] = useState<string | null>(null);

  const [popularTracksSource, setPopularTracksSource] = useState<string | null>(null);
  const [popularAlbumsSource, setPopularAlbumsSource] = useState<string | null>(null);


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
    console.log("Discover Page: useEffect triggered. Session status:", session ? "authenticated" : "unauthenticated");
    
    // Determine if we should use client credentials based on session state
    const shouldUseClientCreds = !session || !session.user;
    console.log("Discover Page: Should primarily use client credentials?", shouldUseClientCreds);
    
    // Fetch all the data
    fetchFeaturedTracks();
    fetchNewReleases();
    fetchPopularAlbums();
    fetchPopularTracks();
    fetchTopStreamedTracks();
    
    // Only fetch user-specific recommendations if we have a session
    if (session && session.user) {
    fetchUserRecommendations();
    } else {
      console.log("FRONTEND: Skipping user recommendations fetch - user not authenticated.");
    }

  }, [session]); // Dependency array
  
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
  
  const renderUserRecSkeleton = () => (
     <div className="bg-gradient-to-br from-[#222222] to-[#181818] rounded-xl p-5 animate-pulse">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-700 rounded-full mr-4"></div>
          <div> <div className="h-5 bg-gray-700 rounded w-32 mb-2"></div> <div className="h-3 bg-gray-700 rounded w-24"></div> </div>
        </div>
        <div className="h-4 bg-gray-700 rounded w-4/5 mb-5"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array(2).fill(0).map((_, j) => (
            <div key={`skel-rec-item-${j}`} className="flex items-center bg-[#282828] rounded-lg p-3">
              <div className="w-10 h-10 bg-gray-700 rounded-md mr-3"></div>
              <div className="flex-1"> <div className="h-3 bg-gray-700 rounded w-20 mb-1"></div> <div className="h-2 bg-gray-700 rounded w-16"></div> </div>
            </div>
          ))}
        </div>
      </div>
  );

  // --- ERROR DISPLAY COMPONENT ---
  const ErrorDisplay = ({ message }: { message: string | null }) => {
      if (!message) return null;
      // Simple inline display for errors
      return ( <p className="text-red-400 text-sm italic my-2 text-center">{message}</p> );
  };

  // --- Fetch Featured Tracks ---
  const fetchFeaturedTracks = async () => {
    try {
      setLoadingFeaturedTracks(true); setErrorFeaturedTracks(null);
      const url = `/api/discover/home-featured-tracks?tracks_per_playlist=8&shuffle=true&use_client_credentials=true`;
      console.log("FRONTEND: Fetching Featured Tracks from:", url);
      const response = await fetch(url, { cache: 'no-store' });
      console.log(`FRONTEND: Featured Tracks Response Status: ${response.status}`);
      if (!response.ok) { throw new Error(`Featured Tracks API Error: ${response.status}`); }
      const data = await response.json();
      console.log("FRONTEND: Featured Tracks Data Received:", data);
      if (data.tracks && Array.isArray(data.tracks)) {
        setFeaturedTracks(processTrackImages(data.tracks));
      } else { throw new Error("Invalid featured tracks data format"); }
    } catch (error) {
      console.error('FRONTEND: Error fetching featured tracks:', error);
      setErrorFeaturedTracks(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setFeaturedTracks([]);
    } finally { setLoadingFeaturedTracks(false); }
  };

  // --- Fetch New Releases ---
  const fetchNewReleases = async () => {
    try {
      setLoadingReleases(true); setErrorReleases(null);
      const url = `/api/discover/new-releases?limit=6&use_client_credentials=true`;
      console.log("FRONTEND: Fetching New Releases from:", url);
      const response = await fetch(url, { cache: 'no-store' });
      console.log(`FRONTEND: New Releases Response Status: ${response.status}`);
      if (!response.ok) { throw new Error(`New Releases API Error: ${response.status}`); }
      const data = await response.json();
      console.log("FRONTEND: New Releases Data Received:", data);
      if (data.albums?.items && Array.isArray(data.albums.items)) {
        setNewReleases(processAlbumImages(data.albums.items));
      } else { throw new Error("Invalid new releases data format"); }
    } catch (error) {
      console.error('FRONTEND: Error fetching new releases:', error);
      setErrorReleases(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setNewReleases([]);
    } finally { setLoadingReleases(false); }
  };

  // --- Fetch Popular Albums ---
  const fetchPopularAlbums = async () => {
    try {
      setLoadingPopularAlbums(true); setErrorPopularAlbums(null); setPopularAlbumsSource(null);
      
      // Always use client credentials for public content
      const url = `/api/discover/featured-albums?limit=3&use_client_credentials=true`;
      
      console.log("FRONTEND: Fetching Featured Albums from:", url);
      
      const response = await fetch(url, { cache: 'no-store' });
      console.log(`FRONTEND: Featured Albums Response Status: ${response.status}`);
      if (!response.ok) { throw new Error(`Featured Albums API Error: ${response.status}`); }
      const data = await response.json();
      console.log("FRONTEND: Received Featured Albums Data:", data);

      if (data.albums?.items && Array.isArray(data.albums.items)) {
         const albums: Album[] = data.albums.items;
         console.log("PROCESSED FEATURED ALBUMS DATA:", {
            before: albums.slice(0, 2),
            source: albums[0]?.source || 'Unknown',
            albumCount: albums.length
         });
         const sourceHref = data.albums.href || '';
         if (sourceHref.includes('mock')) { setPopularAlbumsSource('Mock Data'); }
         else if (albums[0]?.source) { setPopularAlbumsSource(albums[0].source); }
         else if (data.debug_info?.sources_used) { setPopularAlbumsSource(data.debug_info.sources_used); }
         else if (data.source) { setPopularAlbumsSource(data.source); }
         else { setPopularAlbumsSource('Unknown'); }
         setPopularAlbums(processAlbumImages(albums));
         console.log("AFTER SETTING STATE - Popular Albums:", popularAlbums.length);
      } else {
          console.error("FRONTEND: Invalid featured albums data format received:", data);
          throw new Error("Invalid featured albums data format received from API");
      }
    } catch (error) {
       console.error('FRONTEND: Error fetching featured albums:', error);
       setErrorPopularAlbums(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
       setPopularAlbums([]); setPopularAlbumsSource('Error');
    } finally { setLoadingPopularAlbums(false); }
  };

  // --- Fetch Trending Tracks (Popular Tracks) ---
  const fetchPopularTracks = async () => {
    try {
        setLoadingPopularTracks(true); setErrorPopularTracks(null); setPopularTracksSource(null);
        
        // Always use client credentials for public content
        const url = `/api/discover/current-hits?limit=5&use_client_credentials=true`;
        
        console.log("FRONTEND: Fetching Current Hits from:", url);
        
        const response = await fetch(url, { cache: 'no-store' });
        console.log(`FRONTEND: Current Hits Response Status: ${response.status}`);
        if (!response.ok) { throw new Error(`Current Hits API Error: ${response.status}`); }
        const data = await response.json();
        console.log("FRONTEND: Received Current Hits Data:", data);
        if (data.tracks && Array.isArray(data.tracks)) {
          console.log("PROCESSED CURRENT HITS DATA:", {
            before: data.tracks.slice(0, 2),
            source: data.source,
            trackCount: data.tracks.length
          });
          setPopularTracks(processTrackImages(data.tracks));
          setPopularTracksSource(data.source ? `${data.source}${data.is_mock ? ' (Mock)' : ''}` : 'Unknown');
          console.log("AFTER SETTING STATE - Popular Tracks:", popularTracks.length);
        } else { 
          console.error("Invalid current hits data format:", data);
          throw new Error("Invalid current hits data format"); 
        }
      } catch (error) {
        console.error('FRONTEND: Error fetching current hits:', error);
        setErrorPopularTracks(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setPopularTracks([]); setPopularTracksSource('Error');
      } finally { setLoadingPopularTracks(false); }
   };

  // --- Fetch Top Streamed Tracks ---
  const fetchTopStreamedTracks = async () => {
     try {
      setLoadingTopStreamed(true); setErrorTopStreamed(null);
      const url = `/api/discover/top-streamed?limit=5&use_client_credentials=true`;
      console.log("FRONTEND: Fetching Top Streamed from:", url);
      const response = await fetch(url, { cache: 'no-store' });
      console.log(`FRONTEND: Top Streamed Response Status: ${response.status}`);
      if (!response.ok) { throw new Error(`Top Streamed API Error: ${response.status}`); }
      const data = await response.json();
      console.log("FRONTEND: Top Streamed Data Received:", data);
      let tracks: Track[] = [];
      if (data.tracks && Array.isArray(data.tracks)) { tracks = data.tracks; }
      else if (data.items && Array.isArray(data.items)) { tracks = data.items; } // Handle alternative format
      else { throw new Error("Invalid top streamed tracks data format"); }
      setTopStreamedTracks(processTrackImages(tracks));
    } catch (error) {
      console.error('FRONTEND: Error fetching top streamed tracks:', error);
      setErrorTopStreamed(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTopStreamedTracks([]);
    } finally { setLoadingTopStreamed(false); }
  };

  // --- Fetch User Recommendations ---
  const fetchUserRecommendations = async () => {
    if (!session?.user) {
        console.log("FRONTEND: Skipping user recommendations fetch - user not authenticated.");
        setLoadingUserRecs(false); setUserRecommendations([]); setErrorUserRecs(null); return;
    }
    try {
      setLoadingUserRecs(true); setErrorUserRecs(null);
      const url = `/api/discover/user-recommendations?limit=2`;
      console.log("FRONTEND: Fetching User Recommendations from:", url);
      const response = await fetch(url, { cache: 'no-store' }); // Assumes cookies are sent
      console.log(`FRONTEND: User Recs Response Status: ${response.status}`);
      if (!response.ok) {
        if (response.status === 401) { throw new Error(`User Recs Error: Unauthorized (401).`); }
        throw new Error(`User Recs API Error: ${response.status}`);
      }
      const data = await response.json();
      console.log("FRONTEND: User Recommendations Data Received:", data);
      setUserRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('FRONTEND: Error fetching user recommendations:', error);
      setErrorUserRecs(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUserRecommendations([]);
    } finally { setLoadingUserRecs(false); }
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

         {/* Featured Tracks Section */}
        <section className="mb-10 md:mb-16">
          {/* Using the SectionHeader component defined above */}
          <SectionHeader title="Featured Playlists Mix" viewAllLink="/discover/home-featured-tracks" />
           {loadingFeaturedTracks ? (
            <div className="space-y-3">{renderCardSkeletons(5, 'track')}</div>
          ) : errorFeaturedTracks ? (
             <ErrorDisplay message={errorFeaturedTracks} />
          ) : featuredTracks.length > 0 ? (
            <div className="space-y-3">
              {featuredTracks.slice(0, 5).map(track => ( <TrackCard key={`featured-${track.id}`} track={track} /> ))}
            </div>
          ) : ( <p className="text-gray-500 italic">No featured tracks found.</p> )}
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Left Column (Wider) */}
          <div className="lg:col-span-2 space-y-10 md:space-y-16">

            {/* Trending Tracks Section */}
            <section>
              <SectionHeader title="Today's Top Hits" viewAllLink="/discover/current-hits" />
               {loadingPopularTracks ? ( <div className="space-y-3">{renderCardSkeletons(5, 'track')}</div> ) :
                errorPopularTracks ? ( <ErrorDisplay message={errorPopularTracks} /> ) :
                popularTracks.length > 0 ? ( 
                <div className="space-y-3">
                    <p className="text-xs text-green-500">Source: {popularTracksSource} ({popularTracks.length} tracks)</p>
                    {popularTracks.slice(0, 5).map(track => (<TrackCard key={`popular-${track.id}`} track={track} />))}
                </div>
                ) :
                ( <p className="text-gray-500 italic">Couldn't load trending tracks.</p> )}
            </section>
            
            {/* New Releases Section */}
            <section>
              <SectionHeader title="New Releases" viewAllLink="/discover/new-releases" />
              {loadingReleases ? ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">{renderCardSkeletons(6, 'album')}</div> ) :
               errorReleases ? ( <ErrorDisplay message={errorReleases} /> ) :
               newReleases.length > 0 ? ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">{newReleases.slice(0, 6).map(album => (<AlbumCard key={`new-${album.id}`} album={album} />))}</div> ) :
               ( <p className="text-gray-500 italic">Couldn't load new releases.</p> )}
            </section>
            
             {/* Top Streamed Section */}
            <section>
              <SectionHeader title="All-Time Most Streamed" viewAllLink="/discover/top-streamed" />
               {loadingTopStreamed ? ( <div className="space-y-3">{renderCardSkeletons(5, 'track')}</div> ) :
                errorTopStreamed ? ( <ErrorDisplay message={errorTopStreamed} /> ) :
                topStreamedTracks.length > 0 ? ( <div className="space-y-3">{topStreamedTracks.slice(0, 5).map(track => (<TrackCard key={`top-${track.id}`} track={track} />))}</div> ) :
                ( <p className="text-gray-500 italic">Couldn't load top streamed tracks.</p> )}
            </section>
          </div>
          
          {/* Right Column (Sidebar) */}
          <div className="space-y-10 md:space-y-16">
            {/* Popular Albums Section */}
            <section>
              <SectionHeader title="Top Albums" viewAllLink="/discover/popular-albums" />
               {loadingPopularAlbums ? ( <div className="grid grid-cols-1 gap-4 md:gap-6">{renderCardSkeletons(3, 'album')}</div> ) :
                errorPopularAlbums ? ( <ErrorDisplay message={errorPopularAlbums} /> ) :
                popularAlbums.length > 0 ? ( 
                  <div className="grid grid-cols-1 gap-4 md:gap-6">
                    <p className="text-xs text-green-500">Source: {popularAlbumsSource} ({popularAlbums.length} albums)</p>
                    {popularAlbums.slice(0, 3).map(album => (<AlbumCard key={`pop-album-${album.id}`} album={album} />))}
                </div>
                ) :
                ( <p className="text-gray-500 italic">Couldn't load featured albums.</p> )}
            </section>
            
            {/* Community Picks Section */}
            <section>
              <SectionHeader title="Community Picks" viewAllLink="/discover/user-recommendations" />
               {loadingUserRecs ? ( <div className="space-y-4">{renderUserRecSkeleton()}</div> ) :
                errorUserRecs ? (
                    errorUserRecs.includes("Unauthorized") ?
                    <p className="text-gray-500 italic text-center p-4 bg-[#181818] rounded-lg"><Link href="/login" className="text-[#1DB954] hover:underline">Log in</Link> to see community picks!</p>
                    : <ErrorDisplay message={errorUserRecs} />
                ) :
                userRecommendations.length > 0 ? ( <div className="space-y-4 md:space-y-6">{userRecommendations.slice(0, 2).map(rec => (<UserRecommendationCard key={rec.id} recommendation={rec} />))}</div> ) :
                session?.user ? ( <p className="text-gray-500 italic">No community recommendations available.</p> ) :
                ( <p className="text-gray-500 italic text-center p-4 bg-[#181818] rounded-lg"><Link href="/login" className="text-[#1DB954] hover:underline">Log in</Link> to see community picks!</p> )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 
// --- END OF FILE /app/discover/page.tsx ---