'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Navbar from '@/app/components/Navbar';
import { toast } from 'react-hot-toast';
import { useAudio } from './providers';
import { communityEndpoints } from '@/app/index';
import { fetchWithClientFallback } from '@/app/utils/api';
import UserAvatar from '@/app/components/UserAvatar';

// Types
interface Artist {
  id: string;
  name: string;
  images?: { url: string; height?: number; width?: number }[];
  genres?: string[]; // Optional genres from Spotify
}

interface Album {
  id: string;
  name: string;
  artists?: Artist[];
  images?: {
    url: string;
    height: number;
    width: number;
  }[];
  release_date?: string;
  average_rating?: number;
  rating_count?: number;
}

interface Track {
  id: string;
  name: string;
  artists?: Artist[];
  album?: Album;
  preview_url?: string | null;
  duration_ms?: number;
  average_rating?: number;
  rating_count?: number;
}

interface Activity {
  id: string;
  activity_id?: string;
  user_id: string;
  user_name: string;
  user_image: string;
  activity_type: 'rating' | 'review' | 'playlist_create' | 'follow';
  item_id: string;
  item_type: 'track' | 'album' | 'playlist' | 'user';
  item_name: string;
  item_image: string;
  item_artists?: string;
  rating?: number;
  review?: string;
  created_at: string;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  images?: { url: string; height?: number; width?: number }[];
}

// Helper functions
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://placehold.co/400x400/1DB954/FFFFFF?text=Music';
};

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Format relative time for activity
const getTimeAgo = (date: string) => {
  const now = new Date();
  const activityDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return activityDate.toLocaleDateString();
};

// Components
function MusicWaveAnimation() {
  return (
    <div className="flex space-x-0.5 items-end h-4">
      {[0, 0.1, 0.2, 0.15, 0.25].map((delay, i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-[#1DB954] rounded-full"
          animate={{ height: ["40%", "100%", "40%"] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex text-[#1DB954]">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-xs ${star <= Math.floor(rating) ? 'text-[#1DB954]' : 'text-gray-600'}`}>
          ★
        </span>
      ))}
      <span className="text-xs text-gray-300 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function SectionTitle({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className={`text-2xl font-bold mb-6 ${highlight ? 'text-white' : 'text-white'}`}
    >
      {children}
    </motion.h2>
  );
}

interface TrackCardProps {
  track: Track;
  index: number;
  priority?: boolean;
}

function TrackCard({ track, index, priority = false }: TrackCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  const { playingTrack, isPlaying } = useAudio();
  const isCurrentTrack = playingTrack?.id === track.id;
  
  // Enhanced image URL handling
  const getImageUrl = () => {
    // If image loading failed or there are no album images
    if (imageError || !track.album?.images || track.album.images.length === 0) {
      return '/placeholder-track.png';
    }
    
    // Get the image URL and ensure it uses https if it's from Spotify CDN
    const originalUrl = track.album.images[0].url;
    
    // Handle relative URLs
    if (originalUrl.startsWith('/')) {
      return originalUrl;
    }
    
    // Make sure Spotify CDN URLs use https
    if (originalUrl.includes('scdn.co') || originalUrl.includes('spotifycdn.com')) {
      return originalUrl.replace('http://', 'https://');
    }
    
    return originalUrl;
  };
  
  const imageUrl = getImageUrl();
  const trackId = track.id || '';

  // Skip invalid tracks
  if (!trackId) {
    console.warn('Skipping track with missing ID:', track.name);
    return null;
  }

  // Log rendered track details for debugging
  useEffect(() => {
    if (inView) {
      console.debug(`Rendering track: ${track.name} (${trackId}), image: ${imageUrl}`);
    }
  }, [inView, track.name, trackId, imageUrl]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
      className="w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/track/${trackId}`} className="flex flex-col h-full">
        <div className="relative aspect-square overflow-hidden rounded-xl w-full">
        <Image
          src={imageUrl}
          alt={track.name}
          fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
          priority={priority}
          className={`object-cover transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}
          onError={() => setImageError(true)}
        />
          <div className={`absolute inset-0 ${isHovered ? 'bg-black/60' : 'bg-black/40'} transition-colors duration-300`}>
          {isCurrentTrack && isPlaying && (
            <div className="absolute bottom-3 left-3">
              <MusicWaveAnimation />
          </div>
        )}
        </div>
          
          {/* Control overlay with icons instead of play button */}
          {isHovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-3">
                <div className="bg-[#282828] hover:bg-[#333] p-3 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/>
            </svg>
                </div>
                <div className="bg-[#282828] hover:bg-[#333] p-3 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 2h14a1 1 0 0 1 1 1v19.143a.5.5 0 0 1-.766.424L12 18.03l-7.234 4.536A.5.5 0 0 1 4 22.143V3a1 1 0 0 1 1-1zm13 2H6v15.432l6-3.761 6 3.761V4z"/>
            </svg>
          </div>
      </div>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-[#181818] rounded-b-xl flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-medium line-clamp-1 text-white text-base">{track.name}</h3>
            <p className="text-gray-400 text-sm line-clamp-1 mt-1">
            {track.artists?.map(artist => artist.name).join(', ')}
          </p>
          {track.average_rating && (
              <div className="flex items-center mt-2">
              <StarDisplay rating={track.average_rating} />
              <span className="text-xs text-gray-400 ml-1">({track.rating_count || 0})</span>
            </div>
          )}
      </div>
        </div>
      </Link>
    </motion.div>
  );
}

function AlbumCard({ album, priority = false, index = 0 }: { album: Album; priority?: boolean; index?: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  // Enhanced image URL handling
  const getImageUrl = () => {
    // If image loading failed or there are no album images
    if (imageError || !album.images || album.images.length === 0) {
      return '/placeholder-album.png';
    }
    
    // Get the image URL and ensure it uses https if it's from Spotify CDN
    const originalUrl = album.images[0].url;
    
    // Handle relative URLs
    if (originalUrl.startsWith('/')) {
      return originalUrl;
    }
    
    // Make sure Spotify CDN URLs use https
    if (originalUrl.includes('scdn.co') || originalUrl.includes('spotifycdn.com')) {
      return originalUrl.replace('http://', 'https://');
    }
    
    return originalUrl;
  };
  
  const imageUrl = getImageUrl();
  const albumId = album.id || '';
  
  // Skip invalid albums
  if (!albumId) {
    console.warn('Skipping album with missing ID:', album.name);
    return null;
  }

  // Log rendered album details for debugging
  useEffect(() => {
    if (inView) {
      console.debug(`Rendering album: ${album.name} (${albumId}), image: ${imageUrl}`);
    }
  }, [inView, album.name, albumId, imageUrl]);
  
  return (
            <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index ? index * 0.1 : 0 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/album/${albumId}`} className="flex flex-col h-full">
        <div className="relative aspect-square overflow-hidden rounded-xl w-full">
          <Image
            src={imageUrl}
            alt={album.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
            priority={priority}
            className={`object-cover transition-transform duration-300 ${isHovered ? 'scale-105' : 'scale-100'}`}
            onError={() => setImageError(true)}
          />
          {isHovered && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="flex gap-3">
                <div className="bg-[#282828] hover:bg-[#333] p-3 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/>
                    </svg>
                </div>
                <div className="bg-[#282828] hover:bg-[#333] p-3 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 2h14a1 1 0 0 1 1 1v19.143a.5.5 0 0 1-.766.424L12 18.03l-7.234 4.536A.5.5 0 0 1 4 22.143V3a1 1 0 0 1 1-1zm13 2H6v15.432l6-3.761 6 3.761V4z"/>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-[#181818] rounded-b-xl flex-1 flex flex-col">
          <h3 className="font-bold text-base line-clamp-1 text-white">{album.name}</h3>
          <p className="text-gray-400 text-sm line-clamp-1 mt-1">
            {album.artists?.map(artist => artist.name).join(', ')}
          </p>
          {album.average_rating && (
            <div className="flex items-center mt-2">
              <StarDisplay rating={album.average_rating} />
              <span className="text-xs text-gray-400 ml-1">({album.rating_count || 0})</span>
            </div>
          )}
        </div>
                  </Link>
                </motion.div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const getActivityText = () => {
    switch (activity.activity_type) {
      case 'rating':
        return `rated ${activity.item_type === 'track' ? 'the song' : activity.item_type}`;
      case 'review':
        return `reviewed ${activity.item_type === 'track' ? 'the song' : activity.item_type}`;
      case 'playlist_create':
        return 'created a playlist';
      case 'follow':
        return 'followed';
      default:
        return 'interacted with';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#181818] hover:bg-[#282828] p-4 rounded-lg mb-3 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Link href={`/user/${activity.user_id}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#282828]">
            <UserAvatar 
              imageUrl={activity.user_image} 
              username={activity.user_name} 
              sizeClasses="w-full h-full"
              textSizeClass="text-lg"
            />
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <Link href={`/user/${activity.user_id}`} className="font-semibold hover:underline">
              {activity.user_name}
            </Link>
            <span className="text-gray-400 text-sm">{getActivityText()}</span>
            <Link href={`/${activity.item_type}/${activity.item_id}`} className="font-medium text-[#1DB954] hover:underline text-sm">
              {activity.item_name}
            </Link>
          </div>
          {activity.item_artists && (
            <p className="text-gray-400 text-xs truncate mt-0.5">
              {activity.item_artists}
            </p>
          )}
          {activity.rating && (
            <div className="mt-1.5">
              <StarDisplay rating={activity.rating * 2} />
            </div>
          )}
          {activity.review && (
            <div className="mt-1.5">
              <p className="text-gray-300 text-sm line-clamp-2">{activity.review}</p>
            </div>
          )}
          <p className="text-gray-500 text-xs mt-1.5">
            {getTimeAgo(activity.created_at)}
          </p>
        </div>
        
        <Link href={`/${activity.item_type}/${activity.item_id}`} className="flex-shrink-0 ml-2">
          <div className="w-12 h-12 rounded-md overflow-hidden bg-[#282828]">
            <Image
              src={activity.item_image || "/placeholder-art.png"} 
              alt={`${activity.item_type} artwork for ${activity.item_name}`}
              width={48}
              height={48}
              className="object-cover w-full h-full"
              onError={handleImageError}
            />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}

// Featured playlist IDs
const FEATURED_PLAYLISTS = [
  '37i9dQZF1DX0SPPXJeeVcg', // 100 Greatest R&B Songs
  '37i9dQZF1DXb8wplbC2YhV', // 100 Greatest Hip-Hop Songs
  '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
  '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
];

// Playlist categories
const PLAYLIST_CATEGORIES: { [key: string]: string } = {
  '37i9dQZF1DX0SPPXJeeVcg': 'R&B Essentials',
  '37i9dQZF1DXb8wplbC2YhV': 'Hip-Hop Hits',
  '37i9dQZF1DXcBWIGoYBM5M': 'Today\'s Top Hits',
  '37i9dQZF1DX0XUsuxWHRQd': 'RapCaviar Selections',
};

function SkeletonCard() {
  return (
    <div className="w-full h-full animate-pulse">
      <div className="flex flex-col h-full">
        <div className="aspect-square bg-gray-800 rounded-t-xl"></div>
        <div className="p-3 bg-[#181818] rounded-b-xl">
          <div className="h-5 bg-gray-800 rounded mb-2"></div>
          <div className="h-4 bg-gray-800 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="bg-[#181818] p-4 rounded-lg mb-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/3 mt-2"></div>
              </div>
        <div className="w-12 h-12 rounded-md bg-gray-700"></div>
      </div>
    </div>
  );
}

// Add a helper function to get the correct API URL
function getApiUrl(path: string) {
  // When running on client side, use the current URL's origin (hostname + port)
  if (typeof window !== 'undefined') {
    // This will use whatever port the page was loaded from
    const currentOrigin = window.location.origin;
    console.log(`Client-side API URL: ${currentOrigin}${path}`);
    return `${currentOrigin}${path}`;
  }
  
  // During SSR, use the host from environment or default to localhost:3001
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log(`Server-side API URL: ${baseUrl}${path}`);
  return `${baseUrl}${path}`;
}

// Keep necessary mock data functions (getMockTracks, getMock2010BangersPlaylist)

// Keep fetchPlaylistById and its dependencies as it's used by 2010 Bangers
async function fetchPlaylistById(playlistId: string, session: any, limit: number = 12): Promise<Track[]> {
  // ... (Keep FULL existing implementation of fetchPlaylistById)
  try {
    console.log(`Fetching playlist data for ID: ${playlistId}`);
    const response = await fetchWithClientFallback(
      getApiUrl(`/api/spotify/playlist/${playlistId}?limit=${limit}`), 
      session
    );
    if (response && response.tracks && response.tracks.items && response.tracks.items.length > 0) {
      const tracks = response.tracks.items
        .filter((item: any) => item && item.track)
        .map((item: any) => {
          const processImageUrl = (url: string) => {
            if (!url) return '/placeholder-album.png';
            if (url.includes('scdn.co') || url.includes('spotifycdn.com')) {
              return url.replace('http://', 'https://');
            }
            return url;
          };
          const albumImages = 
            (item.track?.album?.images && item.track.album.images.length > 0)
              ? item.track.album.images.map((img: any) => ({
                  url: processImageUrl(img.url),
                  height: img.height || 300,
                  width: img.width || 300
                }))
              : [{ url: '/placeholder-album.png', height: 300, width: 300 }];
          return {
            id: item.track?.id || `mock-track-${Math.random().toString(36).substring(2, 9)}`,
            name: item.track?.name || 'Unknown Track',
            artists: item.track?.artists || [{ id: 'unknown', name: 'Unknown Artist' }],
            album: {
              id: item.track?.album?.id || `album-${Math.random().toString(36).substring(2, 9)}`,
              name: item.track?.album?.name || 'Unknown Album',
              images: albumImages
            },
            preview_url: item.track?.preview_url || null,
            duration_ms: item.track?.duration_ms || 180000
          };
        });
      if (tracks.length > 0) {
        console.log(`Successfully extracted ${tracks.length} tracks from playlist ${playlistId}`);
      return tracks;
      }
    }
    console.log(`No valid tracks found for playlist ${playlistId}, using mock data`);
    // Keep mock fallbacks for specific playlists used here
    if (playlistId === '357fWKFTiDhpt9C69CMG4q') return getMock2010BangersPlaylist();
    // Add other specific mocks if needed by fetchPlaylistById
    return getMockTracks().slice(0, limit); // Generic fallback
  } catch (error) {
    console.error(`Error fetching playlist ${playlistId}:`, error);
    // Keep mock fallbacks for specific playlists used here
    if (playlistId === '357fWKFTiDhpt9C69CMG4q') return getMock2010BangersPlaylist();
    // Add other specific mocks if needed by fetchPlaylistById
    return getMockTracks().slice(0, limit); // Generic fallback
  }
}

// Keep mock data functions used by fetchPlaylistById (including Bangers)
// function getMockRnBPlaylist(): Track[] { ... } // Keep if used by fetchPlaylistById
// function getMockPopHitsPlaylist(): Track[] { ... } // Keep if used by fetchPlaylistById
// ... etc ...
function getMock2010BangersPlaylist(): Track[] {
    // ... (Keep FULL existing implementation)
    return [ { id: '7tqhbajSfrz2F7E1Z75ASX', name: 'Tik Tok', artists: [{ id: '6LqNN22kT3074XbTVUrhzX', name: 'Kesha' }], album: { id: 'album-kesha-2010', name: 'Animal', images: [{ url: '/mock-album-kesha.jpg', height: 640, width: 640 }] }, preview_url: null, duration_ms: 200000 }, /* ... more tracks ... */ { id: '2eBCk48Jf8qlxn7JF5zwUQ', name: 'Need You Now', artists: [{ id: '4YLtscXsxbVgi031ovDDdh', name: 'Lady A' }], album: { id: 'album-ladya-needyounow', name: 'Need You Now', images: [{ url: '/mock-album-ladya.jpg', height: 640, width: 640 }] }, preview_url: null, duration_ms: 234000 } ];
}

// Keep generic getMockTracks if used as a fallback
function getMockTracks(): Track[] {
  // ... (Keep FULL existing implementation)
  return [ { id: 'mock-track-1', name: 'Summertime Vibes', artists: [{ id: 'artist-1', name: 'DJ Sunshine' }], album: { id: 'album-1', name: 'Summer Hits', images: [{ url: '/placeholder-track.png', height: 300, width: 300 }] }, average_rating: 4.5, rating_count: 120 }, /* ... more tracks ... */ { id: 'mock-track-12', name: 'Floppy Disk', artists: [{ id: 'artist-12', name: 'Save Icon' }], album: { id: 'album-12', name: 'Storage Media', images: [{ url: '/placeholder-track.png', height: 300, width: 300 }] }, average_rating: 4.0, rating_count: 88 } ];
}

// --- Define Carousel Data ---
const carouselItems = [
  {
    title: "Discover",
    description: "Explore brand new releases and trending music from around the globe.",
    image: "/img/carousel-discover.jpg", // Placeholder - replace with actual image
    link: "/discover"
  },
  {
    title: "Community",
    description: "Connect with fellow music lovers, share ratings, and find new sounds.",
    image: "/img/carousel-community.jpg", // Placeholder
    link: "/community"
  },
  {
    title: "Activity Feed",
    description: "See what your friends and the community are listening to and rating.",
    image: "/img/carousel-activity.jpg", // Placeholder
    link: "/community/activity"
  }
];

// --- Main component ---
export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [topChartTracks, setTopChartTracks] = useState<Track[]>([]);
  const [topChartLoading, setTopChartLoading] = useState(true);
  const [radarWeeklyTracks, setRadarWeeklyTracks] = useState<Track[]>([]);
  const [radarWeeklyLoading, setRadarWeeklyLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [bangersPlaylist, setBangersPlaylist] = useState<Track[]>([]);
  const [bangersLoading, setBangersLoading] = useState(true);
  const [newReleases, setNewReleases] = useState<Album[]>([]);
  const [newReleasesLoading, setNewReleasesLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0); // State for carousel
  
  // Animation
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 500], [0, 100]);
  const { ref: heroRef, inView: heroInView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Prefetch routes
  useEffect(() => {
    router.prefetch('/discover');
    router.prefetch('/community');
    router.prefetch('/profile');
  }, [router]);
  
  // Update useEffect to fetch Deezer Top Chart
  useEffect(() => {
    const fetchTopChartData = async () => {
      setTopChartLoading(true); 
      console.log('[Home Page] Fetching Deezer Top Chart data...');
      try {
        const response = await fetchWithClientFallback(
          getApiUrl('/api/deezer/chart/tracks'), 
          session 
        );

        console.log('[Home Page] Deezer Chart API response structure:', response ? Object.keys(response) : 'null response'); // Log structure
        // *** Access the nested data array ***
        const tracksData = response?.tracks?.data;

        if (tracksData && Array.isArray(tracksData)) {
          console.log(`[Home Page] Successfully received ${tracksData.length} tracks from Deezer Chart API.`);
          // Map the Deezer structure to the expected Track structure
          const formattedTracks = tracksData.map((item: any): Track => ({
            id: item.id?.toString() ?? Math.random().toString(),
            name: item.title ?? 'Unknown Track',
            artists: item.artist ? [{ id: item.artist.id?.toString(), name: item.artist.name }] : [],
            album: {
                id: item.album?.id?.toString(),
                name: item.album?.title,
                images: item.album?.cover_medium ? [{ url: item.album.cover_medium, height: 300, width: 300 }] : [],
            },
            duration_ms: item.duration ? item.duration * 1000 : undefined,
            preview_url: item.preview || null,
          }));
          setTopChartTracks(formattedTracks); 
        } else {
          console.warn('[Home Page] Deezer Chart API did not return expected { tracks: { data: [...] } } format. Setting empty.', response);
          setTopChartTracks([]); 
        }
      } catch (error) {
        console.error('[Home Page] Error fetching Deezer chart data:', error);
        setTopChartTracks([]); 
      } finally {
        setTopChartLoading(false); 
      }
    };
    fetchTopChartData();
  }, [session]);

  // Add useEffect for fetching Radar Weekly Playlist
  useEffect(() => {
    const fetchRadarWeekly = async () => {
      setRadarWeeklyLoading(true);
      console.log('[Home Page] Fetching Radar Weekly playlist data...');
      const playlistId = '1282495565'; // Deezer Radar Weekly ID
      try {
        const response = await fetchWithClientFallback(
          getApiUrl(`/api/deezer/playlist/${playlistId}?limit=6`), 
            session
          );
        console.log(`[Home Page] Radar Weekly (${playlistId}) API response structure:`, response ? Object.keys(response) : 'null response'); // Log structure
        // *** Access the nested data array ***
        const tracksData = response?.tracks?.data; 

        if (tracksData && Array.isArray(tracksData)) {
          console.log(`[Home Page] Successfully received ${tracksData.length} tracks from Radar Weekly.`);
          // Map the Deezer structure to the expected Track structure
          const formattedTracks = tracksData.map((item: any): Track => ({
            id: item.id?.toString() ?? Math.random().toString(),
            name: item.title ?? 'Unknown Track',
            artists: item.artist ? [{ id: item.artist.id?.toString(), name: item.artist.name }] : [],
                    album: {
                id: item.album?.id?.toString(),
                name: item.album?.title,
                images: item.album?.cover_medium ? [{ url: item.album.cover_medium, height: 300, width: 300 }] : [],
            },
            duration_ms: item.duration ? item.duration * 1000 : undefined,
            preview_url: item.preview || null,
          }));
          setRadarWeeklyTracks(formattedTracks);
        } else {
          console.warn('[Home Page] Radar Weekly API did not return expected { tracks: { data: [...] } } format.', response);
          setRadarWeeklyTracks([]);
        }
      } catch (error) {
        console.error('[Home Page] Error fetching Radar Weekly data:', error);
        setRadarWeeklyTracks([]);
      } finally {
        setRadarWeeklyLoading(false);
      }
    };
    fetchRadarWeekly();
  }, [session]);

  // Keep useEffect for community activity
  useEffect(() => {
    const fetchActivities = async () => {
        setActivityLoading(true);
      try {
        const data = await fetchWithClientFallback(getApiUrl('/api/community/activity?limit=5'), session);
        if (data && data.activities && Array.isArray(data.activities)) {
          setActivities(data.activities);
        } else if (data && Array.isArray(data)) {
          setActivities(data);
        } else {
          console.error('Invalid activity data format:', data);
          setActivities([]); // Set empty on invalid format
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]); // Set empty on error
      } finally {
        setActivityLoading(false);
      }
    };
    fetchActivities();
  }, [session]);

  // Keep useEffect for 2010 Bangers playlist
  useEffect(() => {
    const fetchBangersPlaylist = async () => {
      setBangersLoading(true);
      try {
        // Ensure fetchPlaylistById is available and called
        const tracks = await fetchPlaylistById('357fWKFTiDhpt9C69CMG4q', session, 12);
        if (tracks.length > 0) {
          setBangersPlaylist(tracks);
        } else {
          console.warn('[Home Page] fetchPlaylistById returned no tracks for 2010 Bangers, using mock.');
          // Ensure getMock2010BangersPlaylist is available
          setBangersPlaylist(getMock2010BangersPlaylist()); 
        }
      } catch (error) {
        console.error('Error fetching 2010 Bangers playlist:', error);
        // Ensure getMock2010BangersPlaylist is available
        setBangersPlaylist(getMock2010BangersPlaylist()); 
      } finally {
        setBangersLoading(false);
      }
    };
    fetchBangersPlaylist();
  }, [session]);

  // Add back useEffect for New Releases
  useEffect(() => {
    const fetchNewReleases = async () => {
      setNewReleasesLoading(true);
      console.log('[Home Page] Fetching New Releases data...');
      try {
        // Fetch from the dedicated new-releases endpoint
        const response = await fetchWithClientFallback(
          getApiUrl('/api/discover/new-releases?limit=6'), 
          session
        );

        console.log('[Home Page] New Releases response status:', response?.status);
        // Check the expected structure (albums.items or just items)
        const albumsData = response?.albums?.items || response?.items || [];

        if (albumsData && Array.isArray(albumsData)) {
           console.log(`[Home Page] Successfully received ${albumsData.length} new releases.`);
           // Perform minimal validation/transformation if needed, similar to other sections
           const validatedAlbums = albumsData.map((album: any): Album => {
               let imageUrl = '/placeholder-album.png';
               if (album.images && Array.isArray(album.images) && album.images.length > 0) {
                   const validImage = album.images.find((img: any) => img?.url?.startsWith('http'));
                   if (validImage) {
                       imageUrl = validImage.url;
                   }
               }
               return {
                   ...album,
                   id: album.id || `mock-release-${Math.random()}`,
                   name: album.name || 'Unknown Album',
                   images: [{ url: imageUrl, height: 300, width: 300 }] // Ensure image structure
               };
           });
           setNewReleases(validatedAlbums);
        } else {
            console.warn('[Home Page] New Releases data format unexpected or empty. Using mock data.');
            // Use mock tracks' albums as fallback - ensure getMockTracks exists
            // Filter out undefined albums before setting state
            setNewReleases(getMockTracks().slice(0, 6).map(t => t.album).filter((a): a is Album => !!a)); 
        }

      } catch (error) {
        console.error('[Home Page] Error fetching new releases:', error);
        // Use mock tracks' albums as fallback on error - ensure getMockTracks exists
        // Filter out undefined albums before setting state
        setNewReleases(getMockTracks().slice(0, 6).map(t => t.album).filter((a): a is Album => !!a)); 
      } finally {
        setNewReleasesLoading(false);
      }
    };
    fetchNewReleases();
  }, [session]);

  // --- Carousel Auto-slide Effect ---
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  // --- Framer Motion Variants for Carousel ---
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  // Determine slide direction (always forward in this case)
  const slideDirection = 1; 

  return (
    <>
      <Navbar />
      
      <main className="pb-24 overflow-x-hidden">
        <div className="bg-gradient-to-b from-black to-[#121212] absolute top-0 left-0 right-0 h-96 -z-10" />
        
        {/* --- Hero Section --- */}
        <motion.div 
          ref={heroRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: heroInView ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-[90vh] md:min-h-[85vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden" 
          style={{ 
            background: `radial-gradient(circle at center top, rgba(29,185,84,0.15) 0%, rgba(18,18,18,0) 70%)`, 
          }}
        >
              <motion.h1 
            className="text-5xl md:text-7xl font-extrabold mb-10 md:mb-12"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
              >
            <span className="text-white">Music</span>
            <span className="text-[#1DB954]">boxd</span>
        </motion.h1>

          {/* --- Carousel Container --- */}
          <div className="relative w-full max-w-3xl h-48 md:h-56 flex items-center justify-center">
            <AnimatePresence initial={false} custom={slideDirection}>
              <motion.div
                key={activeIndex}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 200, damping: 30 },
                  opacity: { duration: 0.5 }
                }}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
              >
                <div className="relative z-10 p-4">
                    <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2 md:mb-3">
                        {carouselItems[activeIndex].title}
                    </h2>
                    <p className="text-base md:text-lg mb-4 md:mb-6 max-w-xl text-neutral-300">
                        {carouselItems[activeIndex].description}
                    </p>
                    <Link href={carouselItems[activeIndex].link} className="musicboxd-button inline-block px-6 py-2.5 text-sm">
                        Explore {carouselItems[activeIndex].title}
                </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 pb-20 relative z-10 -mt-16 md:-mt-20">
          <section className="mb-20">
            <SectionTitle highlight>Top Tracks (Deezer)</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"> 
              {topChartLoading ? (
                Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
              ) : topChartTracks.length > 0 ? (
                topChartTracks.slice(0, 12).map((track, index) => (
                  <TrackCard key={track.id || index} track={track} index={index} priority={index < 4} />
              ))
            ) : (
                 <p className="col-span-full text-center text-neutral-400">Could not load Top Tracks chart.</p> 
            )}
          </div>
        </section>

          <section className="mb-20">
            <SectionTitle>Radar Weekly</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {radarWeeklyLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : radarWeeklyTracks.length > 0 ? (
                radarWeeklyTracks.map((track, index) => (
                  <TrackCard key={track.id || index} track={track} index={index} priority={index < 2} />
              ))
            ) : (
                 <p className="col-span-full text-center text-neutral-400">Could not load Radar Weekly playlist.</p> 
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 mb-12">
          <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <SectionTitle>2010 Bangers 🔥</SectionTitle>
                <Link 
                  href="/playlist/357fWKFTiDhpt9C69CMG4q"
                  className="text-[#1DB954] hover:underline text-sm inline-flex items-center group"
                >
                  View full playlist
                  <svg 
                    className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
            </div>
            
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {bangersLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                ) : bangersPlaylist.length > 0 ? (
                  bangersPlaylist.slice(0, 8).map((track, index) => (
                    <TrackCard key={track.id || index} track={track} index={index} priority={index < 4} />
                    ))
                  ) : (
                       // Use specific bangers mock as fallback display
                      getMock2010BangersPlaylist().slice(0, 8).map((track, index) => (
                    <TrackCard key={track.id || index} track={track} index={index} priority={index < 4} />
                    ))
                  )}
            </div>
              <div className="mt-4 flex justify-center">
                <Link 
                  href="/playlist/357fWKFTiDhpt9C69CMG4q" 
                  className="musicboxd-button-secondary inline-flex items-center px-5 py-2 text-sm"
                >
                  <span>See all tracks</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
          </div>
          </div>
          
            <div>
              <SectionTitle>Activity</SectionTitle>
              <div className="space-y-4">
                {activityLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <ActivitySkeleton key={i} />)
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityItem 
                      key={activity.id || activity.activity_id || `activity-${activity.user_id}-${activity.created_at}`} 
                      activity={activity} 
                    />
                  ))
                ) : (
                  <div className="text-center p-4 bg-[#181818] rounded-lg">
                    <p className="text-gray-400">No recent activity</p>
                    <Link href="/community" className="text-[#1DB954] hover:underline mt-2 inline-block">
                      Explore community
          </Link>
                  </div>
                )}
              </div>
            </div>
        </div>

          <section className="mb-12 px-4">
            <SectionTitle>New Releases</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                 {newReleasesLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : newReleases.length > 0 ? (
                newReleases.slice(0, 6).map((album, index) => (
                     // Make sure AlbumCard component exists and is imported
                     <AlbumCard key={album.id} album={album} index={index} priority={index < 2} />
            ))
          ) : (
                  // Fallback display if fetch fails or returns empty
                  <p className="col-span-full text-center text-neutral-400">Could not load new releases.</p>
          )}
        </div>
          </section>

      </div>
      </main>
    </>
  );
}

