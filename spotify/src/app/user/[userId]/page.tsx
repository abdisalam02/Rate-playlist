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
  
  return (
    <div className="border-b border-gray-700 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1">
            <span className="text-gray-500 text-sm">{new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <div className="shrink-0 w-12 h-12 rounded overflow-hidden">
              <img 
                src={activity.item_image || (activity.item_type === 'track' ? "/placeholder-track.png" : "/placeholder-album.png")} 
                alt={activity.item_name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="min-w-0">
              <p className="text-white truncate">
                <span className="text-gray-400">{getActivityText()}</span>
                {activity.item_type === 'track' || activity.item_type === 'album' ? (
                  <Link href={`/${activity.item_type}/${activity.item_id}`} className="font-medium hover:underline ml-1">
                    {activity.item_name}
                  </Link>
                ) : (
                  <span className="font-medium ml-1">{activity.item_name}</span>
                )}
              </p>
              
              {activity.item_artists && (
                <p className="text-gray-400 text-sm truncate">
                  {Array.isArray(activity.item_artists) 
                    ? activity.item_artists.map((artist: { name: string }) => artist.name).join(', ') 
                    : activity.item_artists}
                </p>
              )}
              
              {activity.activity_type === 'rating' && (
                <div className="mt-1">
                  <StarDisplay rating={activity.rating || 0} />
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
function MediaCard({ item, type }: { item: any; type: 'track' | 'album' }) {
  return (
    <motion.div 
      className="bg-[#181818] rounded-lg overflow-hidden"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/${type}/${item.item_id}`}>
        <div className="aspect-square relative">
          <img
            src={item.item_image || (type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png')}
            alt={item.item_name}
            className="w-full h-full object-cover"
            onError={(e) => { 
              e.currentTarget.src = (type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png');
              e.currentTarget.onerror = null; 
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
            <h3 className="font-medium text-lg line-clamp-1">{item.item_name}</h3>
            <p className="text-gray-300 line-clamp-1">
              {item.item_artists}
            </p>
            
            <div className="flex items-center mt-2">
              <StarDisplay rating={item.rating || 0} />
            </div>
          </div>
        </div>
      </Link>
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
        
        // Explicitly check each array before processing to avoid manipulation of undefined values
        
        // Set initial ratings from the API response
        if (userData.recent_ratings && Array.isArray(userData.recent_ratings) && userData.recent_ratings.length > 0) {
          const processRatings = (ratings) => ratings.map(rating => ({
            id: rating.item_id,
            name: rating.name || (rating.item_type === 'track' ? 'Unknown Track' : 'Unknown Album'),
            images: rating.item_type === 'album' ? [{ url: rating.image || '/placeholder-album.png' }] : undefined,
            album: rating.item_type === 'track' ? { images: [{ url: rating.image || '/placeholder-track.png' }] } : undefined,
            artists: rating.artists && Array.isArray(rating.artists) ? rating.artists : [{ name: rating.artists || 'Unknown Artist' }],
            rating: rating.rating != null ? rating.rating : 0,
            item_type: rating.item_type
          }));
          
          // Process recent ratings
          const recentRatings = processRatings(userData.recent_ratings);
          
          // Split into tracks and albums
          const albumRatings = recentRatings.filter(r => r.item_type === 'album');
          const trackRatings = recentRatings.filter(r => r.item_type === 'track');
          
          if (albumRatings.length > 0) setTopAlbums(albumRatings);
          if (trackRatings.length > 0) setTopTracks(trackRatings);
        }
        
        // If top tracks/albums are provided directly in the API response
        if (userData.top_tracks && Array.isArray(userData.top_tracks) && userData.top_tracks.length > 0) {
          setTopTracks(userData.top_tracks.map(track => ({
            ...track,
            rating: track.rating != null ? track.rating : 0
          })));
        }
        
        if (userData.top_albums && Array.isArray(userData.top_albums) && userData.top_albums.length > 0) {
          setTopAlbums(userData.top_albums.map(album => ({
            ...album,
            rating: album.rating != null ? album.rating : 0
          })));
        }
        
        // Fetch user activities
        try {
          const activitiesRes = await fetch(`/api/users/${userId}/activities?limit=10`, {
            credentials: 'include', 
            cache: 'no-store'
          });
          
          if (!activitiesRes.ok) {
            console.warn(`Could not fetch user activities: ${activitiesRes.status}`);
          } else {
            const activitiesData = await activitiesRes.json();
            
            if (activitiesData && activitiesData.activities && Array.isArray(activitiesData.activities)) {
              // Keep rating on 0-5 scale
              const processedActivities = activitiesData.activities.map(activity => {
                if (activity.activity_type === 'rating' && activity.rating != null) {
                  return { ...activity, rating: activity.rating };
                }
                return activity;
              });
              
              setActivities(processedActivities);
            } else {
              console.warn('Activities data is not in the expected format:', activitiesData);
              setActivities([]);
            }
          }
        } catch (activitiesError) {
          console.warn('Error fetching activities:', activitiesError);
          setActivities([]);
        }
        
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
        
        // If we still don't have ratings data, fetch them directly
        if ((topTracks.length === 0 || topAlbums.length === 0)) {
          try {
            // Fetch user's ratings
            const ratingsRes = await fetch(`/api/users/${userId}/ratings?limit=10`, {
              credentials: 'include',
              cache: 'no-store'
            });
            
            if (ratingsRes.ok) {
              const ratingsData = await ratingsRes.json();
              console.log('User ratings data:', ratingsData);
              
              if (ratingsData && ratingsData.ratings && Array.isArray(ratingsData.ratings) && ratingsData.ratings.length > 0) {
                // Process ratings data - keep on 0-5 scale
                const processedRatings = ratingsData.ratings.map(rating => ({
                  ...rating,
                  rating: rating.rating != null ? rating.rating : 0
                }));
                
                // Process album ratings
                const albumRatings = processedRatings.filter((r) => r.item_type === 'album');
                if (albumRatings.length > 0 && topAlbums.length === 0) {
                  const formattedAlbums = albumRatings.map((rating) => ({
                    id: rating.item_id,
                    name: rating.name || 'Unknown Album',
                    images: [{ url: rating.image || '/placeholder-album.png' }],
                    artists: rating.artists ? [{ name: rating.artists }] : [{ name: 'Unknown Artist' }],
                    rating: rating.rating || 0,
                    item_type: 'album'
                  }));
                  setTopAlbums(formattedAlbums);
                }
                
                // Process track ratings
                const trackRatings = processedRatings.filter((r) => r.item_type === 'track');
                if (trackRatings.length > 0 && topTracks.length === 0) {
                  const formattedTracks = trackRatings.map((rating) => ({
                    id: rating.item_id,
                    name: rating.name || 'Unknown Track',
                    album: { images: [{ url: rating.image || '/placeholder-track.png' }] },
                    artists: rating.artists ? [{ name: rating.artists }] : [{ name: 'Unknown Artist' }],
                    rating: rating.rating || 0,
                    item_type: 'track'
                  }));
                  setTopTracks(formattedTracks);
                }
              } else {
                console.warn('No ratings found in data:', ratingsData);
              }
            } else {
              console.warn(`Could not fetch user ratings: ${ratingsRes.status}`);
            }
          } catch (err) {
            console.error('Error fetching user ratings:', err);
          }
        }
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUserData();
    }
  }, [userId, session]);
  
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
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* User Header */}
        <div className="bg-gradient-to-b from-[#1DB954]/20 to-transparent rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-gray-700">
              <img 
                src={user?.profile_image || "/default-avatar.png"}
                alt={user?.display_name || "User"}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{user?.display_name || "User"}</h1>
              <div className="text-gray-400 text-lg mb-4">
                {user?.username || (user?.spotify_id ? `@${user.spotify_id}` : "")}
              </div>
              
              {user.bio && (
                <p className="text-[#B3B3B3] mb-4 max-w-xl">{user.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="bg-[#181818] px-4 py-2 rounded-full">
                  <span className="text-[#1DB954] font-bold">{user.ratings_count || 0}</span>
                  <span className="text-gray-400 ml-1">Ratings</span>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              {/* Follow button removed */}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Activities */}
          <div className="lg:col-span-2">
            <div className="bg-[#181818] rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
              
              {activities.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-2">No recent activity to show.</p>
                  {userId === session?.user?.id && (
                    <p className="text-sm text-[#1DB954]">
                      Start rating and reviewing music to see your activity here!
                    </p>
                  )}
                </div>
              ) : (
                <div className="activity-list">
                  {activities.map((activity, index) => (
                    <ActivityItem key={`activity-${activity.id || index}`} activity={activity} />
                  ))}
                </div>
              )}
            </div>
            
            {/* Top Albums Section */}
            <div className="bg-[#181818] rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Top Albums</h2>
                <Link href={`/user/${userId}/albums`} className="text-[#1DB954] text-sm hover:underline">
                  View All
                </Link>
              </div>
              
              {topAlbums.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400">No album ratings yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {topAlbums.map((album, index) => (
                    <MediaCard key={`album-${album.id || index}`} item={album} type="album" />
                  ))}
                </div>
              )}
            </div>
            
            {/* Top Tracks Section */}
            <div className="bg-[#181818] rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Top Tracks</h2>
                <Link href={`/user/${userId}/tracks`} className="text-[#1DB954] text-sm hover:underline">
                  View All
                </Link>
              </div>
              
              {topTracks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400">No track ratings yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {topTracks.map((track, index) => (
                    <MediaCard key={`track-${track.id || index}`} item={track} type="track" />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Stats & Info */}
          <div className="lg:col-span-1">
            <div className="bg-[#181818] rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">User Stats</h2>
              
              <div className="space-y-4">
                <div className="bg-[#282828] p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Average Rating</h3>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold text-[#1DB954]">
                      {user.ratings_count ? (
                        <StarDisplay rating={4.2} /> // You'd need to get this from the API
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#282828] p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Member Since</h3>
                  <p className="text-lg">
                    {new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                {userId === session?.user?.id && (
                  <div className="mt-8">
                    <Link 
                      href="/profile/edit"
                      className="bg-[#282828] hover:bg-[#383838] text-white py-2 px-4 rounded-lg w-full flex justify-center items-center transition-colors"
                    >
                      Edit Profile
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* User Moods Section */}
            {userMoods.length > 0 && (
              <div className="bg-[#181818] rounded-lg p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Music Moods</h2>
                  <Link 
                    href={`/user/${userId}/moods`}
                    className="text-[#1DB954] text-sm hover:underline"
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-3">
                  {userMoods.slice(0, 3).map(mood => (
                    <Link 
                      key={mood.id || mood.mood} 
                      href={`/user/${userId}/moods/${encodeURIComponent(mood.mood || mood.mood_name)}`}
                      className="flex items-center bg-[#282828] p-3 rounded-lg hover:bg-[#333] transition-colors"
                      style={{
                        borderLeft: `4px solid ${mood.color || '#1DB954'}`
                      }}
                    >
                      <div 
                        className="w-12 h-12 rounded-md mr-3 flex items-center justify-center"
                        style={{ backgroundColor: mood.color || '#1DB954' }}
                      >
                        {mood.track_image ? (
                          <img 
                            src={mood.track_image} 
                            alt={mood.track_name || mood.mood || 'Mood'}
                            className="w-full h-full rounded-md object-cover"
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white">{mood.mood || mood.mood_name}</div>
                        <div 
                          className="text-xs rounded-full px-2 py-0.5 inline-block"
                          style={{ 
                            backgroundColor: mood.color ? `${mood.color}80` : '#1DB95480',
                            color: 'white'
                          }}
                        >
                          {mood.intensity ? `Intensity: ${Math.round(mood.intensity * 100)}%` : 'Medium Intensity'}
                        </div>
                        {mood.track_name && (
                          <div className="text-xs text-gray-400 truncate mt-1">
                            {mood.track_name} • {mood.artist_name || 'Unknown Artist'}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  
                  {userMoods.length > 3 && (
                    <div className="text-center mt-3">
                      <Link 
                        href={`/user/${userId}/moods`}
                        className="text-[#1DB954] text-sm hover:underline"
                      >
                        See all {userMoods.length} moods
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 