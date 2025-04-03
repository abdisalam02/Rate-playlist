'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';

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
            <div className="relative w-6 h-6 rounded-full overflow-hidden bg-neutral-700">
              <Image
                src={track.user.profile_image || '/default-avatar.png'}
                alt={track.user.display_name || 'User'}
                fill
                className="object-cover"
                sizes="24px"
              />
            </div>
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

export default function StapleModesPage() {
  const [stapleMoods, setStapleMoods] = useState<StapleMood[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch staple moods
        const moodsRes = await fetch('/api/moods/staple-moods');
        if (!moodsRes.ok) {
          throw new Error(`Failed to fetch staple moods: ${moodsRes.statusText}`);
        }
        const moodsData = await moodsRes.json();
        
        // Fetch all user tracks for staple moods
        const tracksRes = await fetch('/api/moods/staple-tracks');
        if (!tracksRes.ok) {
          throw new Error(`Failed to fetch staple mood tracks: ${tracksRes.statusText}`);
        }
        const tracksData = await tracksRes.json();
        
        // Fetch user details for each track contribution
        const tracksWithUserDetails = await Promise.all(
          tracksData.success && tracksData.data
            ? tracksData.data.map(async (track: any) => {
                if (!track.user_id) return track;
                
                // Fetch user profile
                try {
                  const userRes = await fetch(`/api/users/${track.user_id}`);
                  if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.profile) {
                      return {
                        ...track,
                        user: {
                          display_name: userData.profile.display_name,
                          profile_image: userData.profile.profile_image,
                          id: userData.profile.id
                        }
                      };
                    }
                  }
                } catch (userError) {
                  console.error('Error fetching user for track:', userError);
                }
                
                return track;
              })
            : []
        );
        
        setStapleMoods(moodsData.success && moodsData.data ? moodsData.data : []);
        setUserTracks(tracksWithUserDetails);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Group tracks by mood
  const tracksByMood = stapleMoods.map(mood => {
    const moodTracks = userTracks.filter(track => track.staple_mood_id === mood.id);
    return { mood, tracks: moodTracks };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Musical Mood Collection
          </h1>
          <p className="text-neutral-400 text-lg max-w-3xl">
            Explore the community's interpretation of these core musical moods. 
            See how different people express the same emotion through their musical choices.
          </p>
        </header>
        
        {error && (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg mb-8">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        
        {loading ? (
          <StapleMoodsSkeleton />
        ) : tracksByMood.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tracksByMood.map(({ mood, tracks }) => (
              <StapleMoodCard key={mood.id} mood={mood} tracks={tracks} />
            ))}
          </div>
        ) : (
          <div className="bg-neutral-800/30 p-8 rounded-lg text-center">
            <h3 className="text-xl font-bold mb-2">No staple moods available</h3>
            <p className="text-neutral-400">
              The staple moods collection is currently unavailable. Please check back later.
            </p>
          </div>
        )}
      </main>
    </div>
  );
} 