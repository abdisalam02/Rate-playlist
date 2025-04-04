'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';

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
        {/* Optional: User avatar if activity is about another user, e.g., follow */}
        {/* <img src={activity.actor?.profile_image} ... /> */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            {/* Optional: Link to user who performed action */}
            {/* <Link href={`/user/${activity.user_id}`} className="font-medium text-white hover:underline">{activity.user?.display_name || 'User'}</Link> */}
            <span className="text-sm text-neutral-400">{new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {(itemType === 'track' || itemType === 'album') && (
              <div className="shrink-0 w-12 h-12 rounded overflow-hidden bg-neutral-700">
                <img 
                  src={imageUrl} 
                  alt={itemName}
                  className="w-full h-full object-cover"
                  onError={(e) => { 
                    e.currentTarget.src = itemType === 'track' ? "/placeholder-track.png" : "/placeholder-album.png";
                    e.currentTarget.onerror = null;
                  }}
                  loading="lazy"
                />
              </div>
            )}
            
            <div className="min-w-0">
              <p className="text-white truncate">
                 {/* Simplified text, assuming activity always relates to the current profile user for now */}
                <span className="text-neutral-400">{getActivityText()}</span>
                {(itemType === 'track' || itemType === 'album') && itemId ? (
                  <Link href={`/${itemType}/${itemId}`} className="font-medium hover:underline ml-1">
                    {itemName} {/* Use correct name */}
                  </Link>
                ) : activity.item_name ? ( // Fallback for non-track/album items
                  <span className="font-medium ml-1">{activity.item_name}</span>
                ) : null}
              </p>
              
              {itemType === 'track' || itemType === 'album' ? (
                 <p className="text-neutral-400 text-sm truncate" title={artistNames}>
                    {artistNames} {/* Use correct artists */}
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
  // Extract data using the NEW enriched structure
  const id = item.id || item.item_id; // Use Spotify ID primarily, fallback to item_id if needed
  const name = item.name || (type === 'track' ? 'Unknown Track' : 'Unknown Album');
  const artists = item.artists || [{ name: 'Unknown Artist' }];
  let imageUrl = type === 'track' 
    ? item.album?.images?.[0]?.url 
    : item.images?.[0]?.url;

  // Fallback image URL
  if (!imageUrl) {
    imageUrl = type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png';
  }

  const artistNames = Array.isArray(artists) 
    ? artists.map((a: { name: string }) => a.name).join(', ')
    : 'Unknown Artist';

  // Ensure rating is a number, default to 0 if not present or invalid
  const rating = typeof item.rating === 'number' ? item.rating : 0;

  return (
    <motion.div 
      className="bg-[#181818] rounded-lg overflow-hidden group relative"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/${type}/${id}`} className="block">
        <div className="aspect-square relative">
          {/* Use Next/Image for optimization if possible, requires setup */}
          {/* For now, sticking with img to avoid potential hydration issues with Image needing parent styling */} 
          <img
            src={imageUrl}
            alt={name} // Use correct name for alt text
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
            onError={(e) => { 
              e.currentTarget.src = (type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png');
              e.currentTarget.onerror = null; // Prevent infinite loop if placeholder also fails
            }}
            loading="lazy" // Add lazy loading
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <h3 className="font-semibold text-white text-base line-clamp-2 mb-1">{name}</h3>
            <p className="text-neutral-300 text-xs line-clamp-1 mb-2">
              {artistNames} {/* Display formatted artist names */}
            </p>
            <StarDisplay rating={rating} />
          </div>
        </div>
      </Link>
      {/* Display basic info below image when not hovering */}
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

export default function UserProfile() {
  const { userId } = useParams();
  const { data: session } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMoods, setUserMoods] = useState<any[]>([]);
  const [loadingMoods, setLoadingMoods] = useState(true);
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching data for user ID: ${userId}`);
        
        // Fetch user profile
        const userRes = await fetch(`/api/users/${userId}`, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!userRes.ok) {
          console.error(`User API error status: ${userRes.status} ${userRes.statusText}`);
          if (userRes.status === 404) {
            throw new Error('User not found. The user ID may be invalid or the user no longer exists.');
          }
          throw new Error('Failed to fetch user profile data from the server.');
        }
        
        const userData = await userRes.json();
        console.log('User profile data received:', userData);
        
        // Set user from profile field
        if (userData.profile) {
          setUser({
            id: userData.profile.id || '',
            display_name: userData.profile.display_name || 'Unknown User',
            profile_image: userData.profile.profile_image || null,
            bio: userData.profile.bio || null,
            spotify_id: userData.profile.spotify_id || null,
            username: userData.profile.username || null,
            created_at: userData.profile.created_at || new Date().toISOString(),
            activity_count: 0, // Will be updated from activities 
            ratings_count: userData.stats?.ratings_count || 0,
          });
        } else {
          throw new Error('Received invalid user profile data structure from the server.');
        }
        
        // Set top tracks and albums DIRECTLY from enriched data
        setTopTracks(userData.top_tracks || []);
        setTopAlbums(userData.top_albums || []);
        setActivities(userData.recent_ratings || []); // Assuming recent_ratings are used for activities for now
        
        // Fetch user moods
        try {
          setLoadingMoods(true);
          const moodsRes = await fetch(`/api/users/${userId}/moods`, {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (moodsRes.ok) {
            const moodsData = await moodsRes.json();
            if (moodsData && moodsData.moods && Array.isArray(moodsData.moods)) {
              setUserMoods(moodsData.moods);
            } else {
              console.warn('Moods data is not in the expected format:', moodsData);
              setUserMoods([]);
            }
          } else {
            console.warn(`Could not fetch user moods: ${moodsRes.status}`);
            setUserMoods([]);
          }
        } catch (moodsError) {
          console.warn('Could not fetch user moods:', moodsError);
          setUserMoods([]);
        } finally {
          setLoadingMoods(false);
        }
      } catch (err: any) {
        console.error("Error fetching user data:", err);
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserMoods = async () => {
       // ... (mood fetch logic) ...
    };

    if (userId) {
      fetchUserData();
      fetchUserMoods();
    }
  }, [userId]); // Dependency array
  
  // For demo purposes, use mock data if API routes are not yet implemented
  useEffect(() => {
    if (!loading && !error && activities.length === 0) {
      // Sample activities data
      const mockActivities = [
        {
          id: 1,
          activity_type: 'rating',
          item_id: '4iV5W9uYEdYUVa79Axb7Rh',
          item_type: 'track',
          item_name: 'Starboy',
          item_image: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452',
          item_artists: 'The Weeknd, Daft Punk',
          rating: 4.5,
          created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
          id: 2,
          activity_type: 'review',
          item_id: '4aawyAB9vmqN3uQ7FjRGTy',
          item_type: 'album',
          item_name: 'Dawn FM',
          item_image: 'https://i.scdn.co/image/ab67616d0000b2734ab2520c2c77a1d66b9ee21d',
          item_artists: 'The Weeknd',
          review: 'A fantastic concept album that blends retro synth-pop with contemporary R&B. The Weeknd truly outdid himself with this one.',
          created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        },
        {
          id: 3,
          activity_type: 'rating',
          item_id: '7qiZfU4dY1lWllzX7mPBI3',
          item_type: 'track',
          item_name: 'Shape of You',
          item_image: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
          item_artists: 'Ed Sheeran',
          rating: 3.5,
          created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
        }
      ];
      
      setActivities(mockActivities);
    }
    
    if (!loading && !error && topTracks.length === 0) {
      // Sample top tracks
      const mockTracks = [
        { 
          id: '4iV5W9uYEdYUVa79Axb7Rh', 
          name: 'Starboy', 
          artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }],
          album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }] },
          rating: 4.7
        },
        { 
          id: '7qiZfU4dY1lWllzX7mPBI3', 
          name: 'Shape of You', 
          artists: [{ name: 'Ed Sheeran' }],
          album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }] },
          rating: 4.5
        }
      ];
      
      setTopTracks(mockTracks);
    }
    
    if (!loading && !error && topAlbums.length === 0) {
      // Sample top albums
      const mockAlbums = [
        {
          id: '4aawyAB9vmqN3uQ7FjRGTy',
          name: 'Dawn FM',
          artists: [{ name: 'The Weeknd' }],
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734ab2520c2c77a1d66b9ee21d' }],
          rating: 4.8
        },
        {
          id: '2noRn2Aes5aoNVsU6iWThc',
          name: 'My Beautiful Dark Twisted Fantasy',
          artists: [{ name: 'Kanye West' }],
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f' }],
          rating: 4.9
        }
      ];
      
      setTopAlbums(mockAlbums);
    }
  }, [loading, error, activities.length, topTracks.length, topAlbums.length]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      </div>
    );
  }
  
  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-12 pt-20">
          <div className="max-w-md mx-auto bg-[#181818] p-6 rounded-lg text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
            <p className="text-[#B3B3B3] mb-6">{error}</p>
            <Link href="/community/activity" className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:bg-opacity-90">
              Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-[#121212] min-h-screen text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Profile Header */} 
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-12">
          <div 
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 relative shadow-lg"
            // style={{ boxShadow: '0 8px 24px rgba(0,0,0,.5)' }} // Using Tailwind shadow-lg instead
          >
             {/* Ensure img fills the relative container */}
            <img 
              key={user.profile_image || '/default-avatar.png'} 
              src={user.profile_image || '/default-avatar.png'} 
              alt={`${user.display_name}'s profile`}
              className="w-full h-full object-cover" // Ensure this is applied
              onError={(e) => { e.currentTarget.src = '/default-avatar.png'; e.currentTarget.onerror = null; }}
              loading="lazy"
            />
          </div>
          {/* ... (rest of header text) ... */}
           <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Profile</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2 truncate" title={user.display_name}>{user.display_name}</h1>
            <p className="text-neutral-400 text-sm">
              {/* Use actual stats from user object if available */} 
              <span>{user.ratings_count ?? '0'} Ratings</span> • 
              <span>{user.followers_count ?? '0'} Followers</span> • 
              <span>{user.following_count ?? '0'} Following</span>
            </p>
            {user.bio && (
              <p className="mt-2 text-neutral-300 text-sm max-w-xl">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Sections: Top Albums, Top Tracks, Recent Activity */}
        <div className="space-y-12">
          {/* Top Albums Section - Display Max 6 */} 
          {topAlbums.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Top Albums</h2>
                <Link href={`/user/${userId}/ratings/albums`} className="text-sm text-neutral-400 hover:text-white font-medium">
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {topAlbums.slice(0, 6).map((album) => (
                  <MediaCard key={album.id || album.item_id} item={album} type="album" />
                ))}
              </div>
            </section>
          )}
          
          {/* Top Tracks Section - Display Max 6 */} 
          {topTracks.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Top Tracks</h2>
                <Link href={`/user/${userId}/ratings/tracks`} className="text-sm text-neutral-400 hover:text-white font-medium">
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {topTracks.slice(0, 6).map((track) => (
                  <MediaCard key={track.id || track.item_id} item={track} type="track" />
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity Section - using updated ActivityItem */}
          {activities.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Recent Activity</h2>
                {/* Link to full activity page if it exists */}
                {/* <Link href={`/user/${userId}/activity`} className="text-sm text-neutral-400 hover:text-white font-medium">View All</Link> */}
              </div>
              <div className="bg-[#181818] rounded-lg p-4">
                 {/* Render actual ActivityItem components */}
                {activities.map((activity) => (
                  <ActivityItem key={activity.id || activity.created_at} activity={activity} />
                ))}
              </div>
            </section>
          )}

          {/* ... (User Stats/Moods section) ... */}
           <section>
            {/* ... */}
           </section>
        </div>
      </div>
    </div>
  );
} 