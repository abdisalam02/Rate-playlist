'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '@headlessui/react';
import Image from 'next/image';

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
  
  // Helper to get a display name for the item
  const getDisplayName = () => {
    if (activity.item_name) return activity.item_name;
    
    if (activity.item_id) {
      // If we have an ID but no name, show a shortened ID
      return `${activity.item_type === 'track' ? 'Track' : 'Album'} ${activity.item_id.substring(0, 8)}...`;
    }
    
    return activity.item_type === 'track' ? 'Track' : 'Album';
  };
  
  // Helper to get an image URL with fallbacks
  const getImageUrl = () => {
    if (activity.item_image) return activity.item_image;
    
    // Return appropriate placeholder based on item type
    return activity.item_type === 'track' 
      ? "/placeholder-track.png" 
      : "/placeholder-album.png";
  };
  
  return (
    <div className="border-b border-gray-700 py-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden relative">
          <Image 
            src={activity.user_image || "/default-avatar.png"} 
            alt={activity.user_name || "User"} 
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1">
            <Link href={`/user/${activity.user_id}`} className="font-medium hover:underline truncate">
              {activity.user_name || "Anonymous User"}
            </Link>
            <span className="mx-2 text-gray-500">•</span>
            <span className="text-gray-500 text-sm">{new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <div className="shrink-0 w-12 h-12 rounded overflow-hidden relative">
              <Image 
                src={getImageUrl()} 
                alt={getDisplayName()}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            
            <div className="min-w-0">
              <p className="text-white truncate">
                <span className="text-gray-400">{getActivityText()}</span>
                {activity.item_type === 'track' || activity.item_type === 'album' ? (
                  <Link href={`/${activity.item_type}/${activity.item_id}`} className="font-medium hover:underline ml-1">
                    {getDisplayName()}
                  </Link>
                ) : (
                  <span className="font-medium ml-1">{activity.item_name || "View Details"}</span>
                )}
              </p>
              
              {activity.item_artists && (
                <p className="text-gray-400 text-sm truncate">{activity.item_artists}</p>
              )}
              
              {activity.activity_type === 'rating' && typeof activity.rating === 'number' && (
                <div className="mt-1">
                  <StarDisplay rating={activity.rating} />
                </div>
              )}
              
              {activity.review && (
                <p className="text-gray-400 mt-1 text-sm line-clamp-1">{activity.review}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Media card component for tracks/albums
function MediaCard({ item, type, isPriority = false }: { item: any; type: 'track' | 'album'; isPriority?: boolean }) {
  // Check if item exists and has required properties
  if (!item) return null;
  
  // Get the image URL based on type
  let imageUrl = '';
  if (type === 'track' && item.album?.images?.[0]?.url) {
    imageUrl = item.album.images[0].url;
  } else if (type === 'album' && item.images?.[0]?.url) {
    imageUrl = item.images[0].url;
  } else {
    imageUrl = type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png';
  }
  
  // Get artist names
  const artistNames = item.artists?.map((artist: any) => artist.name).join(', ') || 'Unknown Artist';
  
  // Get rating
  const rating = item.average_rating || 0;
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="bg-[#181818] rounded-lg overflow-hidden hover:bg-[#282828] transition-colors duration-300"
    >
      <Link href={`/${type}/${item.id}`} className="block">
        <div className="aspect-square overflow-hidden relative">
          <Image 
            src={imageUrl}
            alt={item.name || 'Media'}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            priority={isPriority}
            className="object-cover"
            unoptimized={!imageUrl.startsWith('http')}
          />
        </div>
        <div className="p-2">
          <h3 className="text-white text-sm font-medium truncate">{item.name || 'Unknown Title'}</h3>
          <p className="text-gray-400 text-xs truncate">{artistNames}</p>
          <div className="mt-1 flex items-center">
            <StarDisplay rating={rating} />
            <span className="ml-1 text-xs text-gray-400">
              ({item.rating_count || 0})
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Main community page component
export default function Community() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for data
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activeUsersLoading, setActiveUsersLoading] = useState(true);
  
  const fetchCommunityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch top tracks
      console.log('Fetching top rated tracks');
      const tracksResponse = await fetch('/api/community/top-rated?type=track&limit=8', {
        cache: 'no-store'
      });
      
      // Fetch top albums
      console.log('Fetching top rated albums');
      const albumsResponse = await fetch('/api/community/top-rated?type=album&limit=8', {
        cache: 'no-store'
      });
      
      // Fetch activities
      console.log('Fetching community activities');
      const activitiesResponse = await fetch('/api/community/activity?limit=5', {
        cache: 'no-store'
      });
      
      // Fetch users
      const fetchUsers = async () => {
        try {
          setActiveUsersLoading(true);
          
          // Fetch all users from the database
          console.log('Fetching community users');
          const response = await fetch('/api/community/users?includeCurrentUser=false', {
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache' 
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch users');
          }
          
          const data = await response.json();
          setActiveUsers(data.users || []);
          setActiveUsersLoading(false);
        } catch (error) {
          console.error('Error fetching users:', error);
          setActiveUsersLoading(false);
        }
      };
      
      // Process responses
      if (tracksResponse.ok && albumsResponse.ok && activitiesResponse.ok) {
        const tracksData = await tracksResponse.json();
        const albumsData = await albumsResponse.json();
        const activitiesData = await activitiesResponse.json();
        
        setTopTracks(tracksData.items || []);
        setTopAlbums(albumsData.items || []);
        setActivities(activitiesData.activities || []);
        
        fetchUsers();
      } else {
        console.error('Failed to fetch some data');
        setTopTracks([]);
        setTopAlbums([]);
        setActivities([]);
      }
      
    } catch (error) {
      console.error('Error fetching community data:', error);
      setError('Failed to load community data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCommunityData();
  }, []);
  
  if (loading) {
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50] mb-2">
            Music Community
          </h1>
          <p className="text-[#B3B3B3] text-lg max-w-3xl mx-auto">
            Discover what's trending, connect with other music lovers, and explore curated playlists from the community.
          </p>
        </motion.div>
        
        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left & Center Columns - Featured Content */}
          <div className="lg:col-span-2">
            {/* Top Tracks Section */}
            {!loading && topTracks.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xl font-bold mb-4">Top Rated Tracks</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
                  {topTracks.map((track, index) => (
                    <MediaCard 
                      key={track.id} 
                      item={track} 
                      type="track" 
                      isPriority={index < 4} // Only prioritize the first 4 images
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Top Albums Section */}
            {!loading && topAlbums.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold mb-4">Top Rated Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
                  {topAlbums.map((album, index) => (
                    <MediaCard 
                      key={album.id} 
                      item={album} 
                      type="album" 
                      isPriority={index < 4} // Only prioritize the first 4 images
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Community Members Section */}
            <div className="mb-12">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Community Members</h2>
                <Link href="/community/activity" className="text-[#1DB954] hover:underline text-sm">
                  View all →
                </Link>
              </div>
              
              <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide">
                {activeUsersLoading ? (
                  <div className="flex justify-center items-center w-full py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
                  </div>
                ) : activeUsers.length > 0 ? (
                  activeUsers.map((user) => (
                    <Link key={user.id} href={`/user/${user.id}`}>
                      <div className="flex flex-col items-center space-y-2 min-w-[100px]">
                        <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden border-2 border-gray-700 relative">
                          <Image 
                            src={user?.profile_image || '/default-avatar.png'} 
                            alt={user?.display_name || 'User'} 
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <h3 className="font-medium text-sm truncate">{user?.display_name || 'User'}</h3>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="w-full py-6 bg-[#181818] rounded-lg text-center">
                    <p className="text-gray-400">No other users found yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Be the first to complete your profile!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Activity Feed */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Community Activity</h2>
                <Link href="/community/activity" className="text-[#1DB954] hover:underline text-sm">
                  View all →
                </Link>
              </div>
              
              <div className="bg-[#181818] rounded-lg p-4">
                {activities.length > 0 ? (
                  <AnimatePresence>
                    {activities.map((activity, index) => (
                      <motion.div
                        key={`activity-${activity.activity_id || index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ActivityItem activity={activity} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="py-6 text-center text-[#B3B3B3]">
                    <p>No recent activity to show.</p>
                    <p className="text-sm mt-2">Start rating tracks and albums to see activity here!</p>
                  </div>
                )}
              </div>
            </motion.div>
            
            <motion.div
              className="mt-8 bg-[#181818] p-6 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="font-bold text-xl mb-4">Join The Conversation</h3>
              <p className="text-[#B3B3B3] mb-4">
                Start rating tracks and albums to see your activity here and connect with other music lovers.
              </p>
              
              {status === "unauthenticated" ? (
                <Link 
                  href="/login"
                  className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full inline-block hover:scale-105 transition-transform"
                >
                  Sign In to Participate
                </Link>
              ) : (
                <Link 
                  href="/discover"
                  className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full inline-block hover:scale-105 transition-transform"
                >
                  Discover Music to Rate
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 