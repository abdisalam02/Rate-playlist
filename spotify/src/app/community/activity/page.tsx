'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import UserAvatar from '@/app/components/UserAvatar';

// Carousel of active users component
function UserCarousel() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Don't do anything if session is still loading
        if (status === 'loading') return;
        
        setLoading(true);
        setError(null);
        
        // Only attempt to fetch users if authenticated
        if (status === 'unauthenticated') {
          setError('You must be logged in to view community data');
          setLoading(false);
          return;
        }
        
        console.log('Fetching users from database...');
        
        // Fetch users from the new community users API
        const response = await fetch('/api/community/users?includeCurrentUser=true', {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch community users: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const fetchedUsers = data.users || [];
        
        console.log(`Fetched ${fetchedUsers.length} users from database`);
        
        // Filter users based on URL parameters
        let usersToDisplay = fetchedUsers;
        if (fetchedUsers.length > 1 && !searchParams.get('includeCurrentUser')) {
          usersToDisplay = fetchedUsers.filter(user => !user.isCurrentUser);
          console.log(`Filtered to ${usersToDisplay.length} other users (excluding current user)`);
        }
        
        setUsers(usersToDisplay);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        
        // If the new API fails, try using the activity users as fallback
        try {
          console.log('Attempting fallback to extract users from activities...');
          const fallbackResponse = await fetch('/api/community/activity?limit=20', {
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`Failed to fetch community activity: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
          }
          
          // Extract unique users from activity data
          const fallbackData = await fallbackResponse.json();
          const activities = fallbackData.activities || [];
          console.log(`Fetched ${activities.length} activities to extract users from`);
          
          // Use a Map to collect unique users based on user_id
          const uniqueUsers = new Map();
          
          activities.forEach(activity => {
            if (activity.user_id && activity.user_name) {
              uniqueUsers.set(activity.user_id, {
                id: activity.user_id,
                display_name: activity.user_name,
                profile_image: activity.user_image || null,
                isCurrentUser: activity.user_id === session?.user?.id
              });
            }
          });
          
          // Convert Map values to array
          const extractedUsers = Array.from(uniqueUsers.values());
          console.log(`Extracted ${extractedUsers.length} unique users from activities`);
          
          setUsers(extractedUsers);
          setLoading(false);
        } catch (fallbackError) {
          console.error('Error in fallback user fetch:', fallbackError);
          setError((error as Error).message);
          setLoading(false);
        }
      }
    };
    
    fetchUsers();
  }, [session, status, searchParams]);
  
  const scrollLeft = () => {
    const container = document.getElementById('userCarouselContainer');
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    const container = document.getElementById('userCarouselContainer');
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Active Community Members</h2>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-white">
          <p>Error loading users: {error}</p>
        </div>
      </div>
    );
  }
  
  // Don't render the carousel if there are no users
  if (users.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Community Members</h2>
        <div className="bg-[#181818] rounded-lg p-6 text-center">
          <p className="text-[#B3B3B3] mb-4">No users found in the database yet.</p>
          <div className="flex justify-center">
            <Link
              href="/profile"
              className="bg-[#1DB954] text-black font-medium py-2 px-4 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Complete Your Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative mb-8">
      <h2 className="text-xl font-bold mb-4">Community Members</h2>
      
      <div className="relative">
        {/* Left scroll button */}
        <button 
          onClick={() => {
            const container = document.getElementById('userCarouselContainer');
            if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
          }} 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-[#121212]/80 hover:bg-[#1DB954] text-white rounded-full p-2"
          aria-label="Scroll left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        
        {/* Carousel container */}
        <div 
          id="userCarouselContainer"
          className="flex overflow-x-auto scrollbar-hide space-x-4 py-2 px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {users.map(user => (
            <Link 
              key={user.id} 
              href={`/user/${user.id}`}
              className="flex-shrink-0 transition-transform hover:scale-105"
            >
              <motion.div 
                className="w-28 flex flex-col items-center"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`w-20 h-20 rounded-full overflow-hidden border-2 ${user.isCurrentUser ? 'border-yellow-400' : 'border-[#1DB954]'} mb-2 relative`}>
                  <UserAvatar 
                    imageUrl={user?.profile_image}
                    username={user?.display_name}
                    sizeClasses="w-full h-full"
                    textSizeClass="text-2xl"
                  />
                  {user.isCurrentUser && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">YOU</div>
                    </div>
                  )}
                </div>
                <p className="text-center truncate w-full font-medium">
                  {user.display_name || "User"}
                  {user.isCurrentUser && (
                    <span className="ml-1 text-yellow-400">★</span>
                  )}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
        
        {/* Right scroll button */}
        <button 
          onClick={() => {
            const container = document.getElementById('userCarouselContainer');
            if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
          }} 
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-[#121212]/80 hover:bg-[#1DB954] text-white rounded-full p-2"
          aria-label="Scroll right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
      
      <style jsx>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        #userCarouselContainer::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
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

// Activity item component
function ActivityItem({ activity }: { activity: any }) {
  // Generate a unique key from activity data
  const uniqueId = activity.id || 
    `${activity.user_id}-${activity.item_id}-${activity.created_at}`;
    
  const getActivityText = () => {
    // Use the activity_description provided by the backend if available
    if (activity.activity_description) {
      return activity.activity_description;
    }
    
    // Fallback to determining it from activity type
    switch (activity.activity_type) {
      case 'rating':
        return `rated`;
      case 'review':
        return `reviewed`;
      case 'playlist_create':
        return `created a new playlist`;
      case 'follow':
        return `started following`;
      default:
        return `interacted with`;
    }
  };
  
  const getTimeAgo = () => {
    const now = new Date();
    const activityDate = new Date(activity.created_at);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return `just now`;
    }
  };
  
  // Determine if we have a valid item - check for valid item_id but don't rely on item_name
  const hasValidItem = Boolean(activity.item_id);
  
  // For debug
  console.log(`Activity item: ${activity.item_type} ${activity.item_id} - Name: ${activity.item_name}`);
  
  return (
    <motion.div 
      className="bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg overflow-hidden mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-5">
        {/* Header with user info and time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href={`/user/${activity.user_id}`}>
              <UserAvatar 
                imageUrl={activity.user_image}
                username={activity.user_name}
                sizeClasses="w-10 h-10"
                textSizeClass="text-base"
              />
            </Link>
            <div>
              <Link href={`/user/${activity.user_id}`} className="font-medium hover:underline">
                {activity.user_name || "Anonymous User"}
              </Link>
              <p className="text-gray-400 text-sm">{getTimeAgo()}</p>
            </div>
          </div>
          <div>
            {activity.activity_type === 'rating' && activity.rating && (
              <div className="bg-[#1DB954]/10 px-3 py-1 rounded-full">
                <StarDisplay rating={activity.rating || 0} />
              </div>
            )}
          </div>
        </div>
        
        {/* Activity content */}
        <div className="mb-4">
          <p className="text-lg">
            <span className="text-gray-400">{getActivityText()}</span>{" "}
            {activity.activity_type !== 'follow' ? (
              <span>
                {activity.item_type && (
                  <span className="text-gray-400">
                    {activity.item_type === 'track' ? 'track' : 
                     activity.item_type === 'album' ? 'album' : 'playlist'}:
                  </span>
                )}{" "}
                {hasValidItem ? (
                  <Link 
                    href={`/${activity.item_type}/${activity.item_id}`} 
                    className="text-[#1DB954] hover:underline"
                  >
                    {activity.item_name || (activity.item_type === 'track' ? 'View Track Details' : 
                     activity.item_type === 'album' ? 'View Album Details' : 'View Playlist')}
                  </Link>
                ) : (
                  <span className="text-[#B3B3B3]">
                    {activity.item_name || 'Deleted item'}
                  </span>
                )}
              </span>
            ) : (
              <Link 
                href={`/user/${activity.target_user_id}`} 
                className="text-[#1DB954] hover:underline"
              >
                {activity.target_user_name}
              </Link>
            )}
          </p>
          
          {activity.review && (
            <blockquote className="mt-2 border-l-4 border-[#1DB954] pl-4 text-gray-300 italic">
              "{activity.review}"
            </blockquote>
          )}
        </div>
        
        {/* Item media */}
        {hasValidItem && (activity.item_type === 'track' || activity.item_type === 'album') && (
          <Link 
            href={`/${activity.item_type}/${activity.item_id}`}
            className="block mt-3"
          >
            <div className="bg-[#282828] rounded-lg p-3 flex items-center gap-4 hover:bg-[#383838] transition-colors">
              {activity.item_image ? (
                <img 
                  src={activity.item_image} 
                  alt={activity.item_name || 'Media'} 
                  className="w-16 h-16 rounded-md object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
              )}
              
              <div>
                <h3 className="font-medium">{activity.item_name || (activity.item_type === 'track' ? 'Track Details' : 'Album Details')}</h3>
                {activity.item_artists && (
                  <p className="text-gray-400">{activity.item_artists}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {activity.item_type === 'track' ? 'Track' : 'Album'} • 
                  {activity.activity_type === 'rating' 
                    ? ` Rated ${activity.rating} stars` 
                    : ' Reviewed'}
                </p>
              </div>
            </div>
          </Link>
        )}
        
        {hasValidItem && activity.item_type === 'playlist' && (
          <Link 
            href={`/community/playlists/${activity.item_id}`}
            className="block mt-3"
          >
            <div className="bg-[#282828] rounded-lg p-3 flex items-center gap-4 hover:bg-[#383838] transition-colors">
              {activity.item_image ? (
                <img 
                  src={activity.item_image} 
                  alt={activity.item_name || 'Playlist'} 
                  className="w-16 h-16 rounded-md object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </div>
              )}
              
              <div>
                <h3 className="font-medium">{activity.item_name || 'Playlist'}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Community Playlist • Created by {activity.user_name}
                </p>
              </div>
            </div>
          </Link>
        )}
        
        {/* Date information */}
        <p className="text-gray-500 text-xs mt-4">
          {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}

export default function CommunityActivity() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const activitiesPerPage = 10;
  
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/community/activity?limit=${activitiesPerPage}&offset=${(page - 1) * activitiesPerPage}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch community activity');
        }
        
        const data = await response.json();
        
        if (page === 1) {
          setActivities(data.activities || []);
        } else {
          setActivities(prev => [...prev, ...(data.activities || [])]);
        }
        
        // Determine if there are more activities to load
        setHasMore((data.activities || []).length === activitiesPerPage);
        
      } catch (err: any) {
        console.error('Error fetching community activity:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [page]);
  
  // For demo purposes, use mock data if API routes are not yet implemented
  useEffect(() => {
    if (activities.length === 0 && !loading && !error) {
      // Mock data for demonstration
      const mockActivities = Array.from({ length: 20 }, (_, i) => {
        const activityTypes = ['rating', 'review', 'playlist_create', 'follow'];
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const itemTypes = ['track', 'album'];
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        const baseActivity = {
          id: `mock-activity-${i + 1}`, // Ensure unique IDs for mock data
          user_id: `user${Math.floor(Math.random() * 10) + 1}`,
          user_name: `User ${Math.floor(Math.random() * 10) + 1}`,
          user_image: `https://i.pravatar.cc/150?img=${(i % 15) + 1}`,
          activity_type: activityType,
          created_at: new Date(Date.now() - (i * 3600000)).toISOString() // Hours ago
        };
        
        if (activityType === 'rating' || activityType === 'review') {
          return {
            ...baseActivity,
            item_id: `item${Math.floor(Math.random() * 100) + 1}`,
            item_type: itemType,
            item_name: `${itemType === 'track' ? 'Track' : 'Album'} ${Math.floor(Math.random() * 100) + 1}`,
            item_image: `https://i.pravatar.cc/150?img=${(i % 15) + 1}`,
            item_artists: 'Artist Name',
            rating: (Math.floor(Math.random() * 10) + 1) / 2,
            review: activityType === 'review' ? 'This is a sample review for the mock data. I really enjoyed this!' : undefined
          };
        } else if (activityType === 'playlist_create') {
          return {
            ...baseActivity,
            item_id: `playlist${Math.floor(Math.random() * 50) + 1}`,
            item_type: 'playlist',
            item_name: `Playlist ${Math.floor(Math.random() * 50) + 1}`,
            item_image: `https://i.pravatar.cc/150?img=${(i % 15) + 1}`
          };
        } else {
          return {
            ...baseActivity,
            target_user_id: `user${Math.floor(Math.random() * 10) + 11}`,
            target_user_name: `User ${Math.floor(Math.random() * 10) + 11}`
          };
        }
      });
      
      setActivities(mockActivities);
    }
  }, [activities, loading, error]);
  
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(page + 1);
    }
  };
  
  // Remove duplicates from activities array
  const uniqueActivities = activities.reduce((acc, current) => {
    // Create a unique ID from the activity properties
    const idKey = current.id || 
      `${current.user_id}-${current.item_id || ''}-${current.activity_type}-${current.created_at}`;
    
    // Check if we already have this activity
    const exists = acc.find(item => {
      const itemIdKey = item.id || 
        `${item.user_id}-${item.item_id || ''}-${item.activity_type}-${item.created_at}`;
      return itemIdKey === idKey;
    });
    
    // Only add if it doesn't exist
    if (!exists) {
      acc.push(current);
    }
    
    return acc;
  }, []);
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <motion.div 
        className="container mx-auto px-4 py-8 pt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Community Activity</h1>
          <p className="text-[#B3B3B3] mb-4">
            See what the music community is rating, reviewing, and discovering
          </p>
          
          <div className="bg-gradient-to-r from-[#1DB954]/50 to-transparent h-1 w-48 rounded-full"></div>
        </motion.div>
        
        {/* Add User Carousel here */}
        <UserCarousel />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {loading && page === 1 ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-lg mb-6">
                Error: {error}
              </div>
            ) : (
              <>
                <div className="activity-feed">
                  {uniqueActivities.map((activity, index) => (
                    <ActivityItem 
                      key={`activity-${activity.id || `${activity.user_id}-${activity.item_id || ''}-${activity.activity_type}-${index}`}`} 
                      activity={activity} 
                    />
                  ))}
                </div>
                
                {activities.length === 0 && (
                  <div className="text-center py-12 bg-[#181818] rounded-lg">
                    <p className="text-[#B3B3B3] mb-4">No activity to show yet.</p>
                    <Link 
                      href="/discover"
                      className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full inline-block hover:scale-105 transition-transform"
                    >
                      Discover Music to Rate
                    </Link>
                  </div>
                )}
                
                {hasMore && activities.length > 0 && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </span>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
                
                {!hasMore && activities.length > 0 && (
                  <p className="text-center text-[#B3B3B3] mt-8">
                    You've reached the end of the activity feed!
                  </p>
                )}
              </>
            )}
          </div>
          
          <div className="md:col-span-1">
            <div className="bg-[#181818] rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Join The Conversation</h2>
              <p className="text-[#B3B3B3] mb-6">
                Rate your favorite music, follow other users, and create themed playlists to appear in the activity feed.
              </p>
              
              <div className="space-y-4">
                <Link 
                  href="/discover"
                  className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-lg w-full flex justify-center items-center hover:bg-[#1DB954]/90 transition-all"
                >
                  Discover New Music
                </Link>
                
                <Link 
                  href="/community/playlists/create"
                  className="bg-[#282828] text-white font-bold py-2 px-4 rounded-lg w-full flex justify-center items-center hover:bg-[#383838] transition-all"
                >
                  Create A Playlist
                </Link>
                
                <Link 
                  href="/community/top-tracks"
                  className="bg-[#282828] text-white font-bold py-2 px-4 rounded-lg w-full flex justify-center items-center hover:bg-[#383838] transition-all"
                >
                  Top Rated Tracks
                </Link>
                
                <Link 
                  href="/community/top-albums"
                  className="bg-[#282828] text-white font-bold py-2 px-4 rounded-lg w-full flex justify-center items-center hover:bg-[#383838] transition-all"
                >
                  Top Rated Albums
                </Link>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h3 className="font-bold mb-3">Activity Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#282828] p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-[#1DB954]">{activities.length}</p>
                    <p className="text-sm text-gray-400">Recent Activities</p>
                  </div>
                  <div className="bg-[#282828] p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-[#1DB954]">
                      {activities.filter(a => a.activity_type === 'rating').length}
                    </p>
                    <p className="text-sm text-gray-400">Ratings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 