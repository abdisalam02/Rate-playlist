import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Cache control directives to ensure fresh data
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define interfaces for the API response
interface UserInfo {
  display_name: string;
  profile_image: string | null;
}

interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  item_id?: string;
  item_type?: string;
  rating?: number;
  review?: string;
  created_at: string;
  users: UserInfo | null;
}

interface ActivityItemFormatted {
  activity_id: string;
  user_id: string;
  user_name: string;
  user_image: string | null;
  activity_type: string;
  item_id?: string;
  item_type: string;
  rating?: number;
  review?: string;
  created_at: string;
  item_name?: string;
  item_image?: string;
  item_artists?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching community activity');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Try to fetch ratings activity first
    console.log('Fetching rating activities from ratings table');
    const { data: ratingActivities, error: ratingsError } = await supabase
      .from('ratings')
      .select(`
        id,
        user_id,
        item_id,
        item_type,
        rating,
        review,
        created_at,
        users (display_name, profile_image)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (ratingsError) {
      console.error('Error fetching rating activities:', ratingsError);
    }
    
    // Fetch user activities as well
    console.log('Fetching user activities from user_activities table');
    const { data: userActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select(`
        id,
        user_id,
        activity_type,
        item_id,
        item_type,
        rating,
        review,
        created_at,
        users (display_name, profile_image)
      `)
      .in('activity_type', ['playlist_create', 'saved_track', 'saved_album', 'follow'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (activitiesError) {
      console.error('Error fetching user activities:', activitiesError);
    }
    
    // Create combined activities list
    let combinedActivities: ActivityItemFormatted[] = [];
    
    // Format ratings as activities
    if (ratingActivities && ratingActivities.length > 0) {
      const formattedRatings = ratingActivities.map((item: ActivityItem) => {
        const userData = item.users as unknown as UserInfo | null;
        return {
          activity_id: item.id,
          user_id: item.user_id,
          user_name: userData?.display_name || 'Unknown User',
          user_image: userData?.profile_image || null,
          activity_type: item.review ? 'review' : 'rating',
          item_id: item.item_id,
          item_type: item.item_type || 'unknown',
          rating: item.rating,
          review: item.review,
          created_at: item.created_at
        };
      });
      
      combinedActivities = [...combinedActivities, ...formattedRatings];
    }
    
    // Add other user activities
    if (userActivities && userActivities.length > 0) {
      const formattedActivities = userActivities.map((item: ActivityItem) => {
      const userData = item.users as unknown as UserInfo | null;
      return {
        activity_id: item.id,
        user_id: item.user_id,
        user_name: userData?.display_name || 'Unknown User',
        user_image: userData?.profile_image || null,
        activity_type: item.activity_type,
        item_id: item.item_id,
        item_type: item.item_type || 'unknown',
        rating: item.rating,
        review: item.review,
        created_at: item.created_at
      };
    });
    
      combinedActivities = [...combinedActivities, ...formattedActivities];
    }
    
    // Handle case when no activities are found
    if (combinedActivities.length === 0) {
      console.log('No activities found, returning mock data');
      return getMockActivities();
    }
    
    // Sort all activities by creation date (newest first)
    combinedActivities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Limit the result to the requested number
    combinedActivities = combinedActivities.slice(0, limit);
    
    // Enrich with Spotify data where possible
    const enrichedActivities = await enrichWithSpotifyData(combinedActivities);
    
    console.log(`Returning ${enrichedActivities.length} community activities`);
    return NextResponse.json({ activities: enrichedActivities });
  } catch (error) {
    console.error('Error in community activity GET route:', error);
    return getMockActivities();
  }
}

// Helper to fetch Spotify data for items
async function enrichWithSpotifyData(activities: ActivityItemFormatted[]) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken || await getClientCredentialsToken();
    
    if (!accessToken) {
      console.log('No access token available, returning without enrichment');
      return activities;
    }
    
    // Group by item type for batch processing
    const trackItems = activities.filter(a => a.item_type === 'track').map(a => a.item_id).filter(Boolean) as string[];
    const albumItems = activities.filter(a => a.item_type === 'album').map(a => a.item_id).filter(Boolean) as string[];
    
    // Prepare to store fetched data
    const tracksData: Record<string, any> = {};
    const albumsData: Record<string, any> = {};
    
    // Fetch tracks data if any
    if (trackItems.length > 0) {
      // Process only unique IDs
      const uniqueTrackIds = [...new Set(trackItems)];
      console.log(`Attempting to fetch data for ${uniqueTrackIds.length} unique tracks`);
      
      // Batch in groups of 20 (Spotify API limit for tracks endpoint)
      for (let i = 0; i < uniqueTrackIds.length; i += 20) {
        const batch = uniqueTrackIds.slice(i, i + 20);
        try {
          // First try with access token
          let res = await fetch(`https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          // If first attempt fails, try with client credentials
          if (!res.ok && res.status === 401) {
            console.log('Access token failed, trying client credentials for tracks');
            const clientToken = await getClientCredentialsToken();
            if (clientToken) {
              res = await fetch(`https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`, {
                headers: { Authorization: `Bearer ${clientToken}` }
              });
            }
          }
        
        if (res.ok) {
          const data = await res.json();
          data.tracks.forEach((track: any) => {
            if (track) {
              tracksData[track.id] = {
                name: track.name,
                image: track.album?.images?.[0]?.url,
                artists: track.artists?.map((a: any) => a.name).join(', ')
              };
                console.log(`Retrieved data for track: ${track.id} - ${track.name}`);
              }
            });
          } else {
            console.error(`Failed to fetch tracks, status: ${res.status}`);
            // Try individual track lookup as fallback
            for (const trackId of batch) {
              try {
                const singleRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                
                if (singleRes.ok) {
                  const track = await singleRes.json();
                  tracksData[track.id] = {
                    name: track.name,
                    image: track.album?.images?.[0]?.url,
                    artists: track.artists?.map((a: any) => a.name).join(', ')
                  };
                  console.log(`Retrieved individual track data: ${track.id} - ${track.name}`);
                }
              } catch (err) {
                console.error(`Error fetching individual track ${trackId}:`, err);
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching track batch:`, err);
        }
      }
    }
    
    // Fetch albums data if any
    if (albumItems.length > 0) {
      // Process only unique IDs
      const uniqueAlbumIds = [...new Set(albumItems)];
      console.log(`Attempting to fetch data for ${uniqueAlbumIds.length} unique albums`);
      
      // Batch in groups of 20 (Spotify API limit for albums endpoint)
      for (let i = 0; i < uniqueAlbumIds.length; i += 20) {
        const batch = uniqueAlbumIds.slice(i, i + 20);
        try {
          // First try with access token
          let res = await fetch(`https://api.spotify.com/v1/albums?ids=${batch.join(',')}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          // If first attempt fails, try with client credentials
          if (!res.ok && res.status === 401) {
            console.log('Access token failed, trying client credentials for albums');
            const clientToken = await getClientCredentialsToken();
            if (clientToken) {
              res = await fetch(`https://api.spotify.com/v1/albums?ids=${batch.join(',')}`, {
                headers: { Authorization: `Bearer ${clientToken}` }
              });
            }
          }
        
        if (res.ok) {
          const data = await res.json();
          data.albums.forEach((album: any) => {
            if (album) {
              albumsData[album.id] = {
                name: album.name,
                image: album.images?.[0]?.url,
                artists: album.artists?.map((a: any) => a.name).join(', ')
              };
                console.log(`Retrieved data for album: ${album.id} - ${album.name}`);
              }
            });
          } else {
            console.error(`Failed to fetch albums, status: ${res.status}`);
            // Try individual album lookup as fallback
            for (const albumId of batch) {
              try {
                const singleRes = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                
                if (singleRes.ok) {
                  const album = await singleRes.json();
                  albumsData[album.id] = {
                    name: album.name,
                    image: album.images?.[0]?.url,
                    artists: album.artists?.map((a: any) => a.name).join(', ')
                  };
                  console.log(`Retrieved individual album data: ${album.id} - ${album.name}`);
                }
              } catch (err) {
                console.error(`Error fetching individual album ${albumId}:`, err);
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching album batch:`, err);
        }
      }
    }
    
    // Try to load from supabase cache as a fallback for any missing data
    const missingTrackIds = trackItems.filter(id => !tracksData[id]);
    const missingAlbumIds = albumItems.filter(id => !albumsData[id]);
    
    if (missingTrackIds.length > 0 || missingAlbumIds.length > 0) {
      console.log(`Attempting to load ${missingTrackIds.length} tracks and ${missingAlbumIds.length} albums from cache`);
      
      if (missingTrackIds.length > 0) {
        // Try to get track data from supabase cache
        const { data: cachedTracks } = await supabase
          .from('spotify_tracks_cache')
          .select('id, name, image_url, artists')
          .in('id', missingTrackIds);
          
        if (cachedTracks && cachedTracks.length > 0) {
          cachedTracks.forEach(track => {
            tracksData[track.id] = {
              name: track.name,
              image: track.image_url,
              artists: track.artists
            };
            console.log(`Retrieved cached track data: ${track.id} - ${track.name}`);
          });
        }
      }
      
      if (missingAlbumIds.length > 0) {
        // Try to get album data from supabase cache
        const { data: cachedAlbums } = await supabase
          .from('spotify_albums_cache')
          .select('id, name, image_url, artists')
          .in('id', missingAlbumIds);
          
        if (cachedAlbums && cachedAlbums.length > 0) {
          cachedAlbums.forEach(album => {
            albumsData[album.id] = {
              name: album.name,
              image: album.image_url,
              artists: album.artists
            };
            console.log(`Retrieved cached album data: ${album.id} - ${album.name}`);
          });
        }
      }
    }
    
    // Enrich the activities with the fetched data
    return activities.map(activity => {
      if (activity.item_type === 'track' && activity.item_id) {
        if (tracksData[activity.item_id]) {
        return {
          ...activity,
          item_name: tracksData[activity.item_id].name,
          item_image: tracksData[activity.item_id].image,
          item_artists: tracksData[activity.item_id].artists
        };
        } else {
          console.log(`No data found for track: ${activity.item_id}, using fallback display text`);
          // Use the item_id as a fallback name if we couldn't get the data
          return {
            ...activity,
            item_name: `Track ${activity.item_id.substring(0, 8)}...`, 
            item_image: null
          };
        }
      } else if (activity.item_type === 'album' && activity.item_id) {
        if (albumsData[activity.item_id]) {
        return {
          ...activity,
          item_name: albumsData[activity.item_id].name,
          item_image: albumsData[activity.item_id].image,
          item_artists: albumsData[activity.item_id].artists
        };
        } else {
          console.log(`No data found for album: ${activity.item_id}, using fallback display text`);
          // Use the item_id as a fallback name if we couldn't get the data
          return {
            ...activity,
            item_name: `Album ${activity.item_id.substring(0, 8)}...`,
            item_image: null
          };
        }
      }
      
      return activity;
    });
  } catch (error) {
    console.error('Error enriching activities with Spotify data:', error);
    // Provide at least some fallback data so UI isn't empty
    return activities.map(activity => {
      if ((activity.item_type === 'track' || activity.item_type === 'album') && activity.item_id && !activity.item_name) {
        return {
          ...activity,
          item_name: `${activity.item_type.charAt(0).toUpperCase() + activity.item_type.slice(1)} ${activity.item_id.substring(0, 8)}...`,
          item_image: null
        };
      }
      return activity;
    });
  }
}

// Helper function to get client credentials token
async function getClientCredentialsToken() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Client ID or Secret not configured');
      return null;
    }
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('Failed to get client credentials token:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting client credentials token:', error);
    return null;
  }
}

// Provides mock activities when no real data is available
function getMockActivities() {
  const mockActivities = [
    {
      activity_id: '1',
      user_id: 'user123',
      user_name: 'Jane Cooper',
      user_image: 'https://i.pravatar.cc/150?img=5',
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
      activity_id: '2',
      user_id: 'user456',
      user_name: 'John Smith',
      user_image: 'https://i.pravatar.cc/150?img=8',
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
      activity_id: '3',
      user_id: 'user789',
      user_name: 'Emma Wilson',
      user_image: 'https://i.pravatar.cc/150?img=3',
      activity_type: 'rating',
      item_id: '2noRn2Aes5aoNVsU6iWThc',
      item_type: 'album',
      item_name: 'My Beautiful Dark Twisted Fantasy',
      item_image: 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f',
      item_artists: 'Kanye West',
      rating: 5.0,
      created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    },
    {
      activity_id: '4',
      user_id: 'user101',
      user_name: 'Alex Johnson',
      user_image: 'https://i.pravatar.cc/150?img=12',
      activity_type: 'rating',
      item_id: '7qiZfU4dY1lWllzX7mPBI3',
      item_type: 'track',
      item_name: 'Shape of You',
      item_image: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
      item_artists: 'Ed Sheeran',
      rating: 3.5,
      created_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
    },
    {
      activity_id: '5',
      user_id: 'user202',
      user_name: 'Olivia Chen',
      user_image: 'https://i.pravatar.cc/150?img=9',
      activity_type: 'playlist_create',
      item_id: 'playlist1',
      item_type: 'playlist',
      item_name: 'Chill Vibes 2023',
      item_image: 'https://i.scdn.co/image/ab67706c0000bebb8a35560a4aba3a73db8bb91f',
      created_at: new Date(Date.now() - 345600000).toISOString() // 4 days ago
    }
  ];
  
  return NextResponse.json({ activities: mockActivities });
} 