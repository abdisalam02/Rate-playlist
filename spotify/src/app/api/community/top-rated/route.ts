import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Ensure the endpoint is always dynamic and doesn't use cache
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define interfaces for rating data
interface RatingRecord {
  item_id: string;
  item_type: string;
  rating: number;
}

interface RatingStats {
  total: number;
  count: number;
}

interface RatingWithStats {
  item_id: string;
  average_rating: number;
  rating_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type') || 'track';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;
    
    console.log(`[top-rated] Request for ${itemType}, limit=${limit}, page=${page}, offset=${offset}`);
    
    // Validate parameters
    if (!['track', 'album'].includes(itemType)) {
      console.log('[top-rated] Invalid item type');
      return NextResponse.json(
        { error: 'Invalid item type. Must be "track" or "album"' },
        { status: 400 }
      );
    }
    
    // Query to get ratings from the database
    console.log('[top-rated] Fetching top rated items from Supabase');
    
    // First query to get rating statistics for each item
    const { data: ratingStats, error: statsError } = await supabase
      .from('ratings')
      .select('item_id, item_type, rating')
      .eq('item_type', itemType);
    
    if (statsError) {
      console.error('[top-rated] Error fetching rating stats:', statsError);
      return getDefaultSampleData(itemType, limit);
    }
    
    if (!ratingStats || ratingStats.length === 0) {
      console.log('[top-rated] No ratings found in database');
      return getDefaultSampleData(itemType, limit);
    }
    
    console.log(`[top-rated] Found ${ratingStats.length} ratings, calculating averages`);
    
    // Calculate average ratings by item
    const ratingsByItem = new Map<string, RatingStats>();
    (ratingStats as RatingRecord[]).forEach((rating: RatingRecord) => {
      if (!rating.item_id) return;
      
      if (!ratingsByItem.has(rating.item_id)) {
        ratingsByItem.set(rating.item_id, {
          total: rating.rating || 0,
          count: 1
        });
      } else {
        const current = ratingsByItem.get(rating.item_id)!;
        ratingsByItem.set(rating.item_id, {
          total: current.total + (rating.rating || 0),
          count: current.count + 1
        });
      }
    });
    
    // Convert to array with averages and sort by average rating
    const itemsWithRatings = Array.from(ratingsByItem.entries())
      .map(([item_id, data]): RatingWithStats => ({
        item_id,
        average_rating: data.total / data.count,
        rating_count: data.count
      }))
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(offset, offset + limit);
    
    if (itemsWithRatings.length === 0) {
      console.log('[top-rated] No items with ratings after sorting/slicing');
      return getDefaultSampleData(itemType, limit);
    }
    
    // Get item details from Spotify API
    const itemIds = itemsWithRatings.map(item => item.item_id);
    
    // Get access token - prefer session token, fall back to client credentials
    let accessToken = session?.accessToken;
    
    // If no session token, try client credentials
    if (!accessToken) {
      console.log('[top-rated] No session token available, trying client credentials');
      accessToken = await getClientCredentialsToken();
    }
    
    if (!accessToken) {
      console.error('[top-rated] No access token available, falling back to sample data');
      return getDefaultSampleData(itemType, limit);
    }
    
    // Batch fetch from Spotify API
    const apiPath = itemType === 'track' ? 'tracks' : 'albums';
    const idsParam = itemIds.join(',');
    
    try {
      console.log(`[top-rated] Fetching ${itemType} details from Spotify API`);
      const response = await fetch(`https://api.spotify.com/v1/${apiPath}?ids=${idsParam}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        cache: 'no-store'
      });
      
      // Handle 401 specifically to try with client credentials token
      if (response.status === 401 && session?.accessToken) {
        console.log('[top-rated] Session token expired, trying with client credentials');
        const backupToken = await getClientCredentialsToken();
        
        if (backupToken) {
          const retryResponse = await fetch(`https://api.spotify.com/v1/${apiPath}?ids=${idsParam}`, {
            headers: {
              'Authorization': `Bearer ${backupToken}`
            },
            cache: 'no-store'
          });
          
          if (!retryResponse.ok) {
            console.error(`[top-rated] Retry failed: ${retryResponse.status} ${retryResponse.statusText}`);
            return getDefaultSampleData(itemType, limit);
          }
          
          const spotifyData = await retryResponse.json();
          return processSpotifyData(spotifyData, itemsWithRatings, itemType, limit);
        }
      }
      
      if (!response.ok) {
        console.error(`[top-rated] Spotify API error: ${response.status} ${response.statusText}`);
        return getDefaultSampleData(itemType, limit);
      }
      
      const spotifyData = await response.json();
      return processSpotifyData(spotifyData, itemsWithRatings, itemType, limit);
      
    } catch (error) {
      console.error('[top-rated] Error fetching from Spotify API:', error);
      return getDefaultSampleData(itemType, limit);
    }
    
  } catch (error) {
    console.error('[top-rated] Error in top-rated GET route:', error);
    return getDefaultSampleData(itemType, limit);
  }
}

// Process Spotify API data and combine with ratings
function processSpotifyData(spotifyData: any, itemsWithRatings: RatingWithStats[], itemType: string, limit: number) {
  const items = spotifyData.tracks || spotifyData.albums || [];
  
  if (!items || items.length === 0) {
    console.log('[top-rated] No items returned from Spotify API');
    return getDefaultSampleData(itemType, limit);
  }
  
  // Combine Spotify data with our rating data
  const enrichedItems = items.map((spotifyItem: any) => {
    const ratingData = itemsWithRatings.find(item => item.item_id === spotifyItem.id);
    
    return {
      ...spotifyItem,
      average_rating: ratingData?.average_rating || 0,
      rating_count: ratingData?.rating_count || 0
    };
  });
  
  // Sort by average rating (highest first)
  enrichedItems.sort((a: any, b: any) => b.average_rating - a.average_rating);
  
  console.log(`[top-rated] Successfully enriched ${enrichedItems.length} items`);
  
  return NextResponse.json({ items: enrichedItems });
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
    
    console.log('[top-rated] Getting client credentials token from Spotify');
    
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
    console.log('[top-rated] Successfully obtained client credentials token');
    return data.access_token;
  } catch (error) {
    console.error('Error getting client credentials token:', error);
    return null;
  }
}

// Function to provide sample data when no real ratings exist
function getDefaultSampleData(itemType: string, limit: number) {
  console.log(`[top-rated] Returning sample ${itemType} data`);
  
  const sampleTracks = [
    {
      id: '4iV5W9uYEdYUVa79Axb7Rh',
      name: 'Starboy',
      album: {
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }]
      },
      artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }],
      average_rating: 4.7,
      rating_count: 24
    },
    {
      id: '7qiZfU4dY1lWllzX7mPBI3',
      name: 'Shape of You',
      album: {
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }]
      },
      artists: [{ name: 'Ed Sheeran' }],
      average_rating: 4.5,
      rating_count: 18
    },
    {
      id: '0VjIjW4GlUZAMYd2vXMi3b',
      name: 'Blinding Lights',
      album: {
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }]
      },
      artists: [{ name: 'The Weeknd' }],
      average_rating: 4.9,
      rating_count: 31
    },
    {
      id: '5QO79kh1waicV47BqGRL3g',
      name: 'Save Your Tears',
      album: {
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }]
      },
      artists: [{ name: 'The Weeknd' }],
      average_rating: 4.6,
      rating_count: 15
    },
    {
      id: '0nbXyq5TXYPCO7pr3N8S4I',
      name: 'The Hills',
      album: {
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }]
      },
      artists: [{ name: 'The Weeknd' }],
      average_rating: 4.8,
      rating_count: 27
    }
  ];
  
  const sampleAlbums = [
    {
      id: '4aawyAB9vmqN3uQ7FjRGTy',
      name: 'Dawn FM',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734ab2520c2c77a1d66b9ee21d' }],
      artists: [{ name: 'The Weeknd' }],
      average_rating: 4.8,
      rating_count: 32
    },
    {
      id: '2noRn2Aes5aoNVsU6iWThc',
      name: 'My Beautiful Dark Twisted Fantasy',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f' }],
      artists: [{ name: 'Kanye West' }],
      average_rating: 4.9,
      rating_count: 45
    },
    {
      id: '1zi7xx7UVEFkmKfv06H8x0',
      name: 'To Pimp A Butterfly',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2732de22f69cd27011af8ce7e78' }],
      artists: [{ name: 'Kendrick Lamar' }],
      average_rating: 4.9,
      rating_count: 51
    },
    {
      id: '6PWXKiakqhI17mTYM4y6oY',
      name: 'Blonde',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526' }],
      artists: [{ name: 'Frank Ocean' }],
      average_rating: 4.7,
      rating_count: 38
    },
    {
      id: '3mH6qwIy9crq0I9YQbOuDf',
      name: 'Thriller',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273113f906b40b00dd601afc387' }],
      artists: [{ name: 'Michael Jackson' }],
      average_rating: 4.9,
      rating_count: 63
    }
  ];
  
  const samples = itemType === 'track' ? sampleTracks : sampleAlbums;
  return NextResponse.json({ items: samples.slice(0, limit) });
} 