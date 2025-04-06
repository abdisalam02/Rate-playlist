'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import UserAvatar from '@/app/components/UserAvatar';

// Types for the staple moods and user tracks
interface StapleMood {
  id: string;
  mood_name: string;
  description: string | null;
  default_track_image: string | null;
}

interface UserTrack {
  id: string;
  user_id: string;
  staple_mood_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  track_image: string | null;
  added_at: string;
  mood_name?: string;
  user?: {
    display_name: string;
    profile_image: string | null;
    id: string;
  };
}

// Interface for Custom Moods
interface CustomMood {
  id: string;
  mood_name: string; 
  description: string | null;
  user_id?: string; 
  username?: string; 
  profile_image?: string | null; // Added profile image
  latest_track_image?: string | null; 
}

// Simple Loading Spinner
function SimpleLoadingSpinner({ size = 'h-12 w-12' }: { size?: string }) {
  return (
    <div className={`flex items-center justify-center py-10`}>
      <div className={`animate-spin rounded-full ${size} border-t-2 border-b-2 border-[#1DB954]`}></div>
    </div>
  );
}

// Error Display Component
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto bg-[#181818] p-6 rounded-lg text-center my-10">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-[#B3B3B3] mb-4">{message}</p>
    </div>
  );
}

// Skeletal loading component
function StapleMoodsSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="h-10 bg-neutral-800 rounded-lg w-1/3"></div>
        <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-neutral-800/40 rounded-lg overflow-hidden">
            <div className="h-40 bg-neutral-700"></div>
            <div className="p-4 space-y-3">
              <div className="h-6 bg-neutral-700 rounded w-1/2"></div>
              <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
              <div className="pt-4 space-y-3">
                <div className="h-5 bg-neutral-700 rounded w-2/3"></div>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-neutral-700 rounded-full"></div>
                  <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component to display when there are no user contributions yet
function EmptyStapleContributions({ mood }: { mood: StapleMood }) {
  return (
    <div className="bg-neutral-800/30 rounded-lg p-5 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      <h3 className="text-lg font-semibold mb-2">No tracks added yet</h3>
      <p className="text-neutral-400 text-sm">
        Be the first to add a track that represents "{mood.mood_name}" to you!
      </p>
    </div>
  );
}

// Display a user's track contribution
function UserTrackCard({ track }: { track: UserTrack }) {
  return (
    <motion.div 
      className="flex items-start gap-4 bg-neutral-800/50 hover:bg-neutral-700/60 rounded-lg overflow-hidden p-4 transition-all"
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden">
        <Image
          src={track.track_image || '/placeholder-track.png'}
          alt={track.track_name}
          fill
          className="object-cover"
          sizes="64px"
          unoptimized={track.track_image?.includes('i.scdn.co')}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate">{track.track_name}</h4>
        <p className="text-sm text-neutral-400 truncate mb-2">{track.artist_name}</p>
        
        {track.user && (
          <Link href={`/user/${track.user.id}`} className="flex items-center gap-2 mt-auto">
            <UserAvatar 
              imageUrl={track.user.profile_image}
              username={track.user.display_name}
              sizeClasses="w-6 h-6"
              textSizeClass="text-xs"
            />
            <span className="text-xs text-neutral-300 hover:text-white transition-colors">
              {track.user.display_name || 'Unknown User'}
            </span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// Main Component for a Staple Mood Card 
function StapleMoodCard({ mood, tracks }: { mood: StapleMood; tracks: UserTrack[] }) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  
  // Get a colorful background based on mood name for fallback
  const getBackgroundClass = () => {
    const colorBackgrounds = [
      'bg-gradient-to-br from-[#1DB954] to-[#0D8043]', // Green
      'bg-gradient-to-br from-[#2D46B9] to-[#1a2a70]', // Blue
      'bg-gradient-to-br from-[#3b1966] to-[#29104d]', // Purple
      'bg-gradient-to-br from-[#1e3264] to-[#0e1832]', // Dark Blue
      'bg-gradient-to-br from-[#e13300] to-[#8c1932]', // Red Orange
      'bg-gradient-to-br from-[#8c1932] to-[#3b1966]', // Purple Red
      'bg-gradient-to-br from-[#f037a5] to-[#8c1932]', // Pink
      'bg-gradient-to-br from-[#509bf5] to-[#2D46B9]', // Light Blue
      'bg-gradient-to-br from-[#ff6c00] to-[#e13300]', // Orange
      'bg-gradient-to-br from-[#ffae00] to-[#ff6c00]', // Yellow Orange
    ];
    
    if (!mood.mood_name) return colorBackgrounds[0];
    const sum = mood.mood_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colorBackgrounds[sum % colorBackgrounds.length];
  };
  
  // Navigate to detailed mood page
  const handleClick = () => {
    router.push(`/moods/staple/${encodeURIComponent(mood.mood_name)}`);
  };
  
  return (
    <div 
      className="bg-neutral-800/40 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div onClick={handleClick} className="cursor-pointer">
        {/* Header with featured image */}
        <div className="relative h-48">
          {mood.default_track_image ? (
            <Image 
              src={mood.default_track_image}
              alt={`${mood.mood_name} mood`}
              fill
              className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={mood.default_track_image.includes('i.scdn.co') || mood.default_track_image.startsWith('https://images.unsplash.com')}
            />
          ) : (
            <div className={`absolute inset-0 ${getBackgroundClass()} flex items-center justify-center`}>
              <span className="text-white text-3xl font-bold opacity-60">
                {mood.mood_name?.charAt(0) || "M"}
              </span>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent"></div>
        </div>
        
        {/* Mood info */}
        <div className="p-5">
          <h3 className="text-xl font-bold text-white mb-1">{mood.mood_name}</h3>
          <p className="text-neutral-300 text-sm mb-4 line-clamp-2">{mood.description}</p>
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-neutral-400">
              {tracks.length} {tracks.length === 1 ? 'contribution' : 'contributions'}
            </div>
            
            <Link 
              href={`/moods/staple/${encodeURIComponent(mood.mood_name)}`}
              className="text-xs font-medium text-[#1DB954] hover:text-white transition-colors"
            >
              See all contributions →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Preview of contributions */}
      <div className="px-5 pb-5">
        <h4 className="text-sm font-medium text-neutral-300 mb-3">
          {tracks.length > 0 ? 'Recent contributions' : 'Contributions'}
        </h4>
        
        {tracks.length > 0 ? (
          <div className="space-y-2">
            {tracks.slice(0, 2).map(track => (
              <UserTrackCard key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <EmptyStapleContributions mood={mood} />
        )}
      </div>
    </div>
  );
}

// NEW Component: Card for displaying a Custom Mood (View Only) - Updated UI
function ViewOnlyCustomMoodCard({ mood }: { mood: CustomMood }) {

   return (
     <Link
       href={`/moods/custom/${mood.id}`} 
       className="block bg-[#181818] hover:bg-[#282828] transition-all duration-300 rounded-lg overflow-hidden shadow-md hover:shadow-xl group h-full flex flex-col"
     >
       {/* Image Section */}
       <div className="relative aspect-square bg-neutral-800 overflow-hidden">
         {mood.latest_track_image ? (
           <Image
             src={mood.latest_track_image}
             alt={`Image for ${mood.mood_name}`}
             fill
             sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
             className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
             unoptimized={mood.latest_track_image.includes('i.scdn.co')} 
             onError={(e) => { e.currentTarget.src = '/placeholder-mood.png'; }} 
           />
         ) : (
           <div className="absolute inset-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
           </div>
         )}
         {/* Play button overlay example */}
         <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             {/* Replace with actual Play icon component if available */}
             <button aria-label="Play mood preview" className="p-3 bg-[#1DB954] rounded-full shadow-lg hover:scale-110 transition-transform">
                 <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
             </button>
         </div>
       </div>
       
       {/* Text Content - Improved Layout */}
       <div className="p-4 flex flex-col flex-grow">
         <h3 className="font-bold text-white truncate mb-1 text-sm" title={mood.mood_name}>{mood.mood_name}</h3>
         {mood.description && (
           <p className="text-neutral-400 text-xs line-clamp-2 mb-2 flex-grow" title={mood.description}>
             {mood.description}
           </p>
         )}
         {/* Creator Info at the bottom - Use UserAvatar */}
         <div className="text-xs text-neutral-500 mt-auto pt-2 flex items-center gap-2">
             <UserAvatar 
                 imageUrl={mood.profile_image} 
                 username={mood.username} 
                 sizeClasses="w-5 h-5" // Specify size for the card
                 textSizeClass="text-[10px]" // Smaller text for smaller avatar
             />
             <span className="truncate">{mood.username || 'Unknown'}</span>
         </div>
       </div>
     </Link>
   );
}

export default function MoodsStapleAndCustomPage() {
  const [activeTab, setActiveTab] = useState<'staple' | 'custom'>('staple');

  // State for Staple Moods
  const [stapleMoods, setStapleMoods] = useState<StapleMood[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]); // All tracks for all staple moods
  const [stapleLoading, setStapleLoading] = useState(true);
  const [stapleError, setStapleError] = useState<string | null>(null);

  // State for Custom Moods
  const [customMoods, setCustomMoods] = useState<CustomMood[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Fetch Staple Moods and Tracks (Runs on initial load)
  useEffect(() => {
    const fetchStapleData = async () => {
      setStapleLoading(true);
      setStapleError(null);
      let fetchedMoods: StapleMood[] = [];
      let fetchedTracks: UserTrack[] = [];

      try {
        // Fetch staple moods
        const moodsRes = await fetch('/api/moods/staple-moods');
        if (!moodsRes.ok) throw new Error(`Staple moods fetch failed: ${moodsRes.statusText}`);
        const moodsData = await moodsRes.json();
        fetchedMoods = moodsData.success ? moodsData.data : [];

        // Fetch all user tracks for staple moods
        const tracksRes = await fetch('/api/moods/staple-tracks');
        if (!tracksRes.ok) throw new Error(`Staple tracks fetch failed: ${tracksRes.statusText}`);
        const tracksData = await tracksRes.json();
        fetchedTracks = tracksData.success ? tracksData.data : [];

        // Fetch user details for each track (can be slow for many tracks)
        // Consider optimizing this if performance becomes an issue
        const tracksWithUserDetails = await Promise.all(
          fetchedTracks.map(async (track: any) => {
            if (!track.user_id) return track;
            try {
              const userRes = await fetch(`/api/users/${track.user_id}`);
              if (userRes.ok) {
                const userData = await userRes.json();
                if (userData.profile) {
                  return { ...track, user: userData.profile };
                }
              }
            } catch (userError) {
              console.error('Error fetching user for track:', userError);
            }
            return track;
          })
        );

        setStapleMoods(fetchedMoods);
        setUserTracks(tracksWithUserDetails);
      } catch (err: any) {
        console.error('Error fetching staple data:', err);
        setStapleError(err.message);
      } finally {
        setStapleLoading(false);
      }
    };
    fetchStapleData();
  }, []);

  // Fetch Custom Moods (Runs when custom tab is active)
  useEffect(() => {
    const fetchCustomMoods = async () => {
      setCustomLoading(true);
      setCustomError(null);
      try {
        // Assumes /api/moods fetches all custom moods
        // Add query parameters like ?limit=100 if needed
        const res = await fetch('/api/moods'); 
        if (!res.ok) {
          throw new Error(`Failed to fetch custom moods: ${res.statusText}`);
        }
        const data = await res.json();
        
        // Adjust parsing based on actual API response structure
        // Expecting { moods: [...], count: ... } based on console log and API fix
        if (data && Array.isArray(data.moods)) {
            setCustomMoods(data.moods); // Extract the moods array
        } else {
            // Log the unexpected format for debugging
            console.warn("Unexpected custom moods format received from API:", data);
            // Set an error state or handle appropriately
            throw new Error('Invalid data format for custom moods');
        }
      } catch (err: any) {
        console.error('Error fetching custom moods:', err);
        setCustomError(err.message);
        setCustomMoods([]); // Clear on error
      } finally {
        setCustomLoading(false);
      }
    };

    if (activeTab === 'custom') {
      fetchCustomMoods();
    }
  }, [activeTab]);

  // Render Staple Moods Tab Content
  const renderStapleMoods = () => {
    if (stapleLoading) return <StapleMoodsSkeleton />;
    if (stapleError) return <ErrorDisplay message={stapleError} />;
    if (stapleMoods.length === 0) return <p className="text-neutral-400 text-center py-10">No staple moods found.</p>;

    // Group tracks by staple_mood_id for easier access
    const tracksByMoodId = userTracks.reduce((acc, track) => {
        if (!acc[track.staple_mood_id]) {
            acc[track.staple_mood_id] = [];
        }
        acc[track.staple_mood_id].push(track);
        // Sort tracks within each mood by date (newest first)
        acc[track.staple_mood_id].sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
        return acc;
    }, {} as Record<string, UserTrack[]>);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stapleMoods.map(mood => (
          <StapleMoodCard 
            key={mood.id} 
            mood={mood} 
            tracks={tracksByMoodId[mood.id] || []} 
          />
        ))}
      </div>
    );
  };

  // Render Custom Moods Tab Content
  const renderCustomMoods = () => {
    if (customLoading) return <SimpleLoadingSpinner />;
    if (customError) return <ErrorDisplay message={customError} />;
    if (customMoods.length === 0) return <p className="text-neutral-400 text-center py-10">No custom moods found yet.</p>;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {customMoods.map(mood => (
          <ViewOnlyCustomMoodCard key={mood.id} mood={mood} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Explore Moods</h1>
            <p className="text-neutral-400 max-w-xl">Discover pre-defined staple moods or browse unique moods created by the community.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-neutral-700 mb-8">
          <button
            onClick={() => setActiveTab('staple')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'staple'
                ? 'border-b-2 border-[#1DB954] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Staple Moods
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'border-b-2 border-[#1DB954] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Community Custom Moods
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'staple' && renderStapleMoods()}
          {activeTab === 'custom' && renderCustomMoods()}
        </div>
      </main>
    </div>
  );
} 