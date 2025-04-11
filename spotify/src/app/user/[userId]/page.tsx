'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import UserAvatar from '@/app/components/UserAvatar';
import Image from 'next/image';

interface UserProfile {
  id: string;
  display_name: string;
  profile_image: string | null;
  bio: string | null;
  spotify_id: string | null;
  created_at: string;
  activity_count: number;
  ratings_count: number;
}

// Type for the combined user data response
interface UserPageData {
  profile: UserProfile;
  top_tracks: any[]; // Define more specific types if possible
  top_albums: any[];
  recent_ratings: any[];
}

// Type for the moods API response
interface UserMoodsData {
  staple_mood_tracks: StapleMoodTrack[];
  custom_moods: CustomMood[];
}

// Type for a single Staple Mood Track (from RPC)
interface StapleMoodTrack {
    mood_track_id: string;
    user_id: string;
    staple_mood_id: string;
    track_id: string;
    track_name: string;
    artist_name: string;
    track_image: string | null;
    added_at: string;
    mood_name: string;
    mood_description: string | null;
}

// Type for a Custom Mood
interface CustomMood {
    id: string;
    user_id: string;
    mood_name: string;
    description: string | null;
    created_at?: string;
    // Add latest_track_image if available from API
    latest_track_image?: string | null;
}

// Star display component
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      <div className="text-[#1DB954]">
        {"★".repeat(Math.floor(rating))}
        {rating % 1 === 0.5 && "½"}
        {"☆".repeat(5 - Math.ceil(rating))}
      </div>
      <span className="ml-2 text-sm">{rating.toFixed(1)}</span>
    </div>
  );
}

// Activity feed item component
function ActivityItem({ activity }: { activity: any }) {
  const getActivityText = () => {
    switch (activity.activity_type) {
      case 'rating':
        return `rated ${activity.item_type === 'track' ? 'the track' : 'the album'}`;
      case 'review':
        return `reviewed ${activity.item_type === 'track' ? 'the track' : 'the album'}`;
      case 'playlist_create':
        return `created a new playlist`;
      case 'follow':
        return `started following`;
      default:
        return `interacted with`;
    }
  };
  
  // Use new enriched properties
  const itemType = activity.item_type;
  const itemId = activity.id || activity.item_id; // Use Spotify ID or rating ID
  const itemName = activity.name || (itemType === 'track' ? 'Unknown Track' : 'Unknown Album');
  const artists = activity.artists || [{ name: 'Unknown Artist' }];
  let imageUrl = itemType === 'track'
    ? activity.album?.images?.[0]?.url
    : activity.images?.[0]?.url;

  // Fallback image
  if (!imageUrl) {
    imageUrl = itemType === 'track' ? '/placeholder-track.png' : '/placeholder-album.png';
  }

  const artistNames = Array.isArray(artists)
    ? artists.map((a: { name: string }) => a.name).join(', ')
    : 'Unknown Artist';

  const rating = typeof activity.rating === 'number' ? activity.rating : 0;
  
  return (
    <div className="border-b border-neutral-800 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-neutral-400">{new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            {(itemType === 'track' || itemType === 'album') && (
              <div className="shrink-0 w-12 h-12 rounded overflow-hidden bg-neutral-700">
                <Image 
                  src={imageUrl} 
                  alt={itemName}
                  width={48}
                  height={48}
                className="w-full h-full object-cover"
                  unoptimized
                  onError={(e) => { 
                    (e.target as HTMLImageElement).src = itemType === 'track' ? "/placeholder-track.png" : "/placeholder-album.png";
                  }}
              />
            </div>
            )}
            
            <div className="min-w-0">
              <p className="text-white truncate">
                <span className="text-neutral-400">{getActivityText()}</span>
                {(itemType === 'track' || itemType === 'album') && itemId ? (
                  <Link href={`/${itemType}/${itemId}`} className="font-medium hover:underline ml-1">
                    {itemName}
                  </Link>
                ) : activity.item_name ? (
                  <span className="font-medium ml-1">{activity.item_name}</span>
                ) : null}
              </p>
              
              {itemType === 'track' || itemType === 'album' ? (
                 <p className="text-neutral-400 text-sm truncate" title={artistNames}>
                    {artistNames}
                 </p>
              ) : null}
              
              {activity.activity_type === 'rating' && (
                <div className="mt-1">
                  <StarDisplay rating={rating} />
                </div>
              )}
              
              {activity.review && (
                <p className="text-neutral-400 mt-1 text-sm line-clamp-1" title={activity.review}>{activity.review}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Media card component for tracks/albums
function MediaCard({ item, type }: { item: any; type: 'track' | 'album' }) {
  const id = item.id || item.item_id;
  const name = item.name || (type === 'track' ? 'Unknown Track' : 'Unknown Album');
  const artists = item.artists || [{ name: 'Unknown Artist' }];
  let imageUrl = type === 'track' 
    ? item.album?.images?.[0]?.url 
    : item.images?.[0]?.url;
  if (!imageUrl) {
    imageUrl = type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png';
  }
  const artistNames = Array.isArray(artists) 
    ? artists.map((a: { name: string }) => a.name).join(', ')
    : 'Unknown Artist';
  const rating = typeof item.rating === 'number' ? item.rating : 0;

  return (
    <motion.div 
      className="bg-[#181818] rounded-lg overflow-hidden group relative"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/${type}/${id}`} className="block">
        <div className="aspect-square relative">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
            unoptimized
            onError={(e) => { 
              (e.target as HTMLImageElement).src = (type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png');
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <h3 className="font-semibold text-white text-base line-clamp-2 mb-1">{name}</h3>
            <p className="text-neutral-300 text-xs line-clamp-1 mb-2">
              {artistNames}
            </p>
            <StarDisplay rating={rating} />
          </div>
        </div>
      </Link>
       <div className="p-3 pt-2 group-hover:opacity-0 transition-opacity duration-300">
          <h4 className="text-sm font-medium text-white truncate mb-0.5" title={name}>{name}</h4>
          <p className="text-xs text-neutral-400 truncate" title={artistNames}>{artistNames}</p>
          <div className="mt-1">
              <StarDisplay rating={rating} />
            </div>
       </div>
    </motion.div>
  );
}

// --- NEW Staple Mood Track Card --- 
function StapleMoodTrackCard({ item }: { item: StapleMoodTrack }) {
  return (
    <motion.div 
      className="bg-[#181818] rounded-lg overflow-hidden group relative"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/track/${item.track_id}`} className="block">
        <div className="aspect-square relative">
          <Image
            src={item.track_image || '/placeholder-track.png'}
            alt={item.track_name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
            unoptimized
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-track.png'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <h3 className="font-semibold text-white text-base line-clamp-2 mb-1">{item.track_name}</h3>
            <p className="text-neutral-300 text-xs line-clamp-1 mb-2">
              {item.artist_name}
            </p>
             {/* Link to the STAPLE mood page */}
             <Link 
                href={`/moods/staple/${encodeURIComponent(item.mood_name)}`} 
                onClick={(e) => e.stopPropagation()} // Prevent card link trigger
                className="text-xs font-bold text-[#1DB954] hover:text-white bg-black/50 px-2 py-0.5 rounded-full self-start mt-1"
              >
                {item.mood_name}
             </Link>
          </div>
        </div>
      </Link>
       <div className="p-3 pt-2 group-hover:opacity-0 transition-opacity duration-300">
          <h4 className="text-sm font-medium text-white truncate mb-0.5" title={item.track_name}>{item.track_name}</h4>
          <p className="text-xs text-neutral-400 truncate mb-1" title={item.artist_name}>{item.artist_name}</p>
           <Link 
                href={`/moods/staple/${encodeURIComponent(item.mood_name)}`} 
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-bold text-[#1DB954] hover:text-white inline-block"
            >
                {item.mood_name}
           </Link>
       </div>
    </motion.div>
  );
}

// --- NEW Custom Mood Card --- 
function CustomMoodCard({ mood }: { mood: CustomMood }) {
  return (
    <motion.div
      className="bg-[#181818] hover:bg-[#282828] transition rounded-lg overflow-hidden p-4 h-full flex flex-col"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/moods/custom/${mood.id}`} className="flex flex-col flex-grow">
        {/* Optional: Display latest track image if available */}
        {mood.latest_track_image && (
          <div className="aspect-square mb-3 overflow-hidden rounded-md relative bg-neutral-700">
            <Image 
              src={mood.latest_track_image} 
              alt={mood.mood_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 mt-auto">
          <h3 className="font-semibold text-sm text-white truncate" title={mood.mood_name}>{mood.mood_name}</h3>
          {mood.description && (
            <p className="text-neutral-400 text-xs truncate mt-1" title={mood.description}>{mood.description}</p>
          )}
        </div>
        <span className="text-xs text-purple-400 mt-2 self-start">Custom Mood</span>
      </Link>
    </motion.div>
  );
}

// --- Skeleton Components --- 
function SectionSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-[#181818] rounded-lg animate-pulse">
          <div className="aspect-square bg-neutral-700 rounded-t-lg"></div>
          <div className="p-3 space-y-2">
            <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
            <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UserProfileSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
                <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-neutral-800 shrink-0"></div>
                <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div className="h-8 bg-neutral-700 rounded w-1/2 mx-auto sm:mx-0"></div>
                    <div className="h-4 bg-neutral-700 rounded w-3/4 mx-auto sm:mx-0"></div>
                    <div className="h-4 bg-neutral-700 rounded w-1/2 mx-auto sm:mx-0"></div>
                    <div className="flex justify-center sm:justify-start gap-4 pt-2">
                        <div className="h-5 bg-neutral-700 rounded w-20"></div>
                        <div className="h-5 bg-neutral-700 rounded w-20"></div>
                    </div>
                </div>
            </div>
            {/* Section Skeletons */}
            <div className="mb-8 space-y-3">
                <div className="h-6 bg-neutral-700 rounded w-1/4"></div>
                <SectionSkeleton count={4} />
            </div>
            <div className="mb-8 space-y-3">
                <div className="h-6 bg-neutral-700 rounded w-1/4"></div>
                <SectionSkeleton count={4} />
            </div>
            <div className="mb-8 space-y-3">
                <div className="h-6 bg-neutral-700 rounded w-1/4"></div>
                <SectionSkeleton count={6} />
            </div>
            <div className="space-y-3">
                <div className="h-6 bg-neutral-700 rounded w-1/4"></div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-neutral-800 rounded-lg"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Main Component --- 
export default function UserProfile() {
  const { userId } = useParams();
  const { data: session } = useSession();

  const [profileData, setProfileData] = useState<UserPageData | null>(null);
  const [moodsData, setMoodsData] = useState<UserMoodsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCurrentUser = session?.user?.id === userId || session?.user?.spotifyId === userId;
  
  useEffect(() => {
    if (!userId || typeof userId !== 'string') {
      setError('Invalid User ID');
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      setProfileData(null); // Reset previous data
      setMoodsData(null);
      
      try {
        // Fetch profile details AND moods in parallel
        const [profileRes, moodsRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/moods`) // Fetch moods from the fixed endpoint
        ]);

        // Process Profile Data
        if (!profileRes.ok) {
          const profileErrorText = await profileRes.text();
           if (profileRes.status === 404) throw new Error('User not found');
          throw new Error(`Failed to fetch user profile: ${profileRes.status} ${profileErrorText}`);
        }
        const fetchedProfileData: UserPageData = await profileRes.json();
        console.log('User profile data received:', fetchedProfileData);
        setProfileData(fetchedProfileData);
        
        // Process Moods Data
        if (!moodsRes.ok) {
           console.error(`Failed to fetch user moods: ${moodsRes.status}`);
           // Don't throw error for moods, page can still render profile
           setMoodsData({ staple_mood_tracks: [], custom_moods: [] }); // Set empty state
        } else {
           const fetchedMoodsData: UserMoodsData = await moodsRes.json();
           console.log('User moods data received:', fetchedMoodsData);
           setMoodsData(fetchedMoodsData);
        }

          } catch (err) {
        console.error('Error fetching user page data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [userId]);
  
  if (loading) {
    return (
       <div className="min-h-screen bg-[#121212] text-white">
        <Navbar />
         <main className="container mx-auto px-4 pt-24 pb-16">
            <UserProfileSkeleton />
         </main>
      </div>
    );
  }
  
  if (error) {
    return (
       <div className="min-h-screen bg-[#121212] text-white">
         <Navbar />
         <main className="container mx-auto px-4 pt-24 pb-16 text-center">
           <p className="text-red-400">Error: {error}</p>
           {/* Add a back button or link */} 
         </main>
       </div>
     );
  }

  if (!profileData?.profile) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
           <p>User profile not found.</p>
        </main>
      </div>
    );
  }

  const { profile, top_tracks = [], top_albums = [], recent_ratings = [] } = profileData;
  const { staple_mood_tracks = [], custom_moods = [] } = moodsData || {};
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* --- Profile Header --- */} 
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
          <UserAvatar 
            imageUrl={profile.profile_image}
            username={profile.display_name}
            sizeClasses="w-32 h-32 lg:w-40 lg:h-40 shrink-0" // Larger avatar
            textSizeClass="text-5xl" // Larger initial
          />
          <div className="flex-1 pt-2 text-center sm:text-left">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2 break-words">{profile.display_name}</h1>
            {profile.bio && <p className="text-neutral-300 mb-3 max-w-xl">{profile.bio}</p>}
            <p className="text-sm text-neutral-500 mb-4">Member since {new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
            <div className="flex justify-center sm:justify-start items-center gap-x-4 gap-y-1 text-sm text-neutral-400 flex-wrap">
              <span>{profile.ratings_count || 0} Ratings</span>
              <span className="text-neutral-600">•</span>
              <span>{profile.activity_count || 0} Activities</span>
              {/* Add follower count here if available */} 
            </div>
            {/* TODO: Add Follow Button if not current user */} 
          </div>
        </div>
        
         {/* --- User's Staple Mood Tracks Section --- */} 
         {staple_mood_tracks.length > 0 && (
             <section className="mb-12">
                 <h2 className="text-xl font-bold mb-4">Staple Mood Selections</h2>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                     {staple_mood_tracks.map((item) => (
                         <StapleMoodTrackCard key={item.mood_track_id} item={item} />
                  ))}
                </div>
             </section>
         )}

         {/* --- User's Custom Moods Section --- */} 
         {custom_moods.length > 0 && (
             <section className="mb-12">
                 <h2 className="text-xl font-bold mb-4">Custom Moods</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                     {custom_moods.map((mood) => (
                         <CustomMoodCard key={mood.id} mood={mood} />
                     ))}
              </div>
             </section>
         )}

        {/* --- Top Tracks Section --- */} 
        {top_tracks.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">Top Rated Tracks</h2>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
               {top_tracks.map((track) => (
                 <MediaCard key={track.id || track.item_id} item={track} type="track" />
                  ))}
                </div>
          </section>
        )}

        {/* --- Top Albums Section --- */} 
        {top_albums.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">Top Rated Albums</h2>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
               {top_albums.map((album) => (
                 <MediaCard key={album.id || album.item_id} item={album} type="album" />
                  ))}
                </div>
          </section>
        )}

        {/* --- Recent Activity Section --- */} 
        {recent_ratings.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            <div className="bg-[#181818]/50 rounded-lg p-4 md:p-6">
              {recent_ratings.map((activity) => (
                 <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </section>
        )}
        
        {/* Placeholder if no content */}
        {top_tracks.length === 0 && top_albums.length === 0 && recent_ratings.length === 0 && staple_mood_tracks.length === 0 && custom_moods.length === 0 && (
            <div className="text-center text-neutral-500 py-10">
                This user hasn't added any ratings or moods yet.
                          </div>
                        )}

      </main>
    </div>
  );
} 