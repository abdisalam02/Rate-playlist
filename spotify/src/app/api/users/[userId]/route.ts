import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

// Cache control directives
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// --- Define enrichItems function here ---
interface SpotifyItem {
    id: string;
    name: string;
    artists?: { name: string }[];
    album?: { images?: { url: string }[] };
    images?: { url: string }[];
}

interface RatingItem {
    id: string | number;
    item_id: string;
    item_type: 'track' | 'album';
    created_at: string; // Or Date
    [key: string]: any; // Allow other properties
}

async function enrichItems(
    items: RatingItem[],
    itemType: 'track' | 'album' | null, // null for mixed types
    accessToken: string | null
): Promise<any[]> {
    console.log(`[enrichItems] Starting enrichment. Type: ${itemType || 'mixed'}. AccessToken available: ${!!accessToken}`);
    
    if (!items || items.length === 0) {
        console.log('[enrichItems] No items to enrich.');
        return [];
    }

    let currentToken = accessToken;
    if (!currentToken) {
        console.error('[enrichItems] No access token provided for enrichment.');
         return items.map(item => ({
             ...item,
             item_name: `Unknown ${item.item_type}`,
             item_artists: 'Unknown Artist',
             item_image: null,
             rated_at: item.created_at
         }));
    }

    let trackRatings: RatingItem[] = [];
    let albumRatings: RatingItem[] = [];

    if (itemType === 'track') {
        trackRatings = items;
    } else if (itemType === 'album') {
        albumRatings = items;
    } else {
        trackRatings = items.filter(r => r.item_type === 'track');
        albumRatings = items.filter(r => r.item_type === 'album');
    }

    const trackIds = trackRatings.map(r => r.item_id).filter(Boolean);
    const albumIds = albumRatings.map(r => r.item_id).filter(Boolean);

    console.log(`[enrichItems] Track IDs to fetch: ${trackIds.length}`);
    console.log(`[enrichItems] Album IDs to fetch: ${albumIds.length}`);

    const itemDetails = new Map<string, any>();

    const fetchBatch = async (ids: string[], type: 'tracks' | 'albums') => {
        const batchSize = type === 'tracks' ? 50 : 20;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batchIds = ids.slice(i, i + batchSize);
            if (batchIds.length === 0) continue;
            
            const url = `https://api.spotify.com/v1/${type}?ids=${batchIds.join(',')}`;
            console.log(`[enrichItems] Fetching ${type} batch: ${i / batchSize + 1} (IDs: ${batchIds.length})`);
            
            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${currentToken}` },
                    cache: 'no-store'
                });
                console.log(`[enrichItems] Spotify ${type} Batch Response Status: ${response.status}`);
                const responseBody = await response.text();
                if (response.ok) {
                    const data = JSON.parse(responseBody);
                    (data[type] || []).forEach((item: SpotifyItem | null) => {
                        if (item && item.id) {
                            itemDetails.set(item.id, {
                                name: item.name,
                                artists: (item.artists || []).map(a => a.name).join(', ') || 'Unknown Artist',
                                image: item.album?.images?.[0]?.url || item.images?.[0]?.url || null,
                                item_type: type === 'tracks' ? 'track' : 'album'
                            });
                        }
                    });
                } else {
                    console.error(`[enrichItems] Spotify ${type} Batch Response NOT OK (${response.status}). Body: ${responseBody.substring(0, 500)}`);
                    batchIds.forEach(id => { if (!itemDetails.has(id)) itemDetails.set(id, { error: true, item_type: type === 'tracks' ? 'track' : 'album' }); });
                }
            } catch (error) {
                console.error(`[enrichItems] Error during Spotify ${type} batch fetch (Batch ${i / batchSize + 1}):`, error);
                 batchIds.forEach(id => { if (!itemDetails.has(id)) itemDetails.set(id, { error: true, item_type: type === 'tracks' ? 'track' : 'album' }); });
            }
        }
    };

    if (trackIds.length > 0) await fetchBatch(trackIds, 'tracks');
    if (albumIds.length > 0) await fetchBatch(albumIds, 'albums');

    console.log(`[enrichItems] Combining ${items.length} items with ${itemDetails.size} fetched/fallback details.`);
    return items.map(item => {
        const details = itemDetails.get(item.item_id);
        return {
            ...item,
            item_name: details && !details.error ? details.name : `Unknown ${item.item_type}`,
            item_artists: details && !details.error ? details.artists : 'Unknown Artist',
            item_image: details && !details.error ? details.image : null,
            rated_at: item.created_at
        };
    });
}
// --- End enrichItems definition ---

export async function GET(
  request: NextRequest,
  context
) {
  try {
    const userId = context.params.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log('Fetching data for user ID:', userId);
    
    // Get access token from session for Spotify API
    const session = await getServerSession(authOptions);
    let accessToken = session?.accessToken;
    
    // Get user profile from the database
    let userProfileData;
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      // Fallback to looking up by Spotify ID
      const { data: spotifyUser, error: spotifyUserError } = await supabase
        .from('users')
        .select('*')
        .eq('spotify_id', userId)
        .single();
      
      if (spotifyUserError) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      userProfileData = spotifyUser;
    } else {
      userProfileData = userData;
    }
    
    // Fetch top-rated items (handle potential error gracefully)
    let statsData: any = null;
    let fallbackRatingsCount: number = 0;
    try {
      console.log(`[User Route] Fetching rating stats using get_top_rated_items for user: ${userId}`);
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_top_rated_items', { user_id_param: userId });
      if (rpcError) {
        console.error('[User Route] Error fetching rating stats (get_top_rated_items):', rpcError);
        // Attempt fallback count query
        const { count, error: countError } = await supabase
          .from('ratings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (countError) {
          console.error('[User Route] Error fetching ratings count fallback:', countError);
        } else {
          fallbackRatingsCount = count ?? 0;
          console.log(`[User Route] Fallback ratings count: ${fallbackRatingsCount}`);
        }
      } else {
        statsData = rpcData; // Assign if successful
      }
    } catch (rpcCatchError) {
      console.error('[User Route] Caught error during RPC call:', rpcCatchError);
      // Attempt fallback count query even if RPC call itself crashes
      const { count, error: countError } = await supabase
        .from('ratings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (countError) {
        console.error('[User Route] Error fetching ratings count fallback after RPC catch:', countError);
      } else {
        fallbackRatingsCount = count ?? 0;
        console.log(`[User Route] Fallback ratings count after RPC catch: ${fallbackRatingsCount}`);
      }
    }
    
    // Get top tracks (limit to 8)
    const { data: topTracks, error: tracksError } = await supabase
      .from('ratings')
      .select('id, user_id, item_id, item_type, rating, review, created_at')
      .eq('user_id', userProfileData.id)
      .eq('item_type', 'track')
      .order('rating', { ascending: false })
      .limit(8);
    
    if (tracksError) {
      console.error('Error fetching user top tracks:', tracksError);
    }
    
    // Get top albums (limit to 8)
    const { data: topAlbums, error: albumsError } = await supabase
      .from('ratings')
      .select('id, user_id, item_id, item_type, rating, review, created_at')
      .eq('user_id', userProfileData.id)
      .eq('item_type', 'album')
      .order('rating', { ascending: false })
      .limit(8);
    
    if (albumsError) {
      console.error('Error fetching user top albums:', albumsError);
    }
    
    // Get recent ratings across both types (limit to 5)
    const { data: recentRatings, error: recentError } = await supabase
      .from('ratings')
      .select('id, user_id, item_id, item_type, rating, review, created_at')
      .eq('user_id', userProfileData.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('Error fetching user recent ratings:', recentError);
    }
    
    // Get followers and following counts
    const { data: followingData, error: followingError } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('followed_id', userProfileData.id);
    
    const { data: followsData, error: followsError } = await supabase
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', userProfileData.id);
    
    const followers_count = followingError ? 0 : followingData?.length || 0;
    const following_count = followsError ? 0 : followsData?.length || 0;
    
    // If no session token, try to get client credentials token
    if (!accessToken) {
      accessToken = await getClientCredentialsToken();
    }
    
    // Enhance ratings with Spotify data if we have ratings and access token
    let enrichedTracks = [];
    let enrichedAlbums = [];
    let enrichedRecent = [];
    
    if (accessToken) {
      // Process tracks
      if (topTracks && topTracks.length > 0) {
        enrichedTracks = await enrichItems(topTracks, 'track', accessToken);
      }
      
      // Process albums
      if (topAlbums && topAlbums.length > 0) {
        enrichedAlbums = await enrichItems(topAlbums, 'album', accessToken);
      }
      
      // Process recent ratings
      if (recentRatings && recentRatings.length > 0) {
        enrichedRecent = await enrichItems(recentRatings, null, accessToken);
      }
    } else {
      // If no access token, return basic data
      enrichedTracks = topTracks?.map(rating => ({
        ...rating,
        name: 'Unknown Track',
        artists: 'Unknown Artist',
        image: null,
        rated_at: rating.created_at
      })) || [];
      
      enrichedAlbums = topAlbums?.map(rating => ({
        ...rating,
        name: 'Unknown Album',
        artists: 'Unknown Artist',
        image: null,
        rated_at: rating.created_at
      })) || [];
      
      enrichedRecent = recentRatings?.map(rating => ({
        ...rating,
        name: `Unknown ${rating.item_type === 'track' ? 'Track' : 'Album'}`,
        artists: 'Unknown Artist',
        image: null,
        rated_at: rating.created_at
      })) || [];
    }
    
    // Prepare the response data
    const responseData = {
      profile: {
        ...userProfileData,
        followers_count,
        following_count
      },
      stats: statsData || {
        ratings_count: fallbackRatingsCount,
        avg_rating: 0,
        tracks_count: 0,
        albums_count: 0,
        reviews_count: 0,
        followers_count: 0,
        following_count: 0
      },
      top_tracks: enrichedTracks,
      top_albums: enrichedAlbums,
      recent_ratings: enrichedRecent
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error in user profile GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get client credentials token as fallback
async function getClientCredentialsToken() {
  console.log('[getClientCredentialsToken] Attempting to get token...');
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('[getClientCredentialsToken] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
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
      cache: 'no-store' // Ensure fresh request
    });
    
    // Log the response status and attempt to read body
    console.log(`[getClientCredentialsToken] Spotify Response Status: ${response.status}`);
    const responseBody = await response.text(); // Read as text first to avoid JSON parse errors on failure
    console.log(`[getClientCredentialsToken] Spotify Response Body: ${responseBody}`);
    
    if (!response.ok) {
      console.error('[getClientCredentialsToken] Failed to get client credentials token.');
      // Attempt to parse error if JSON
      try {
        const errorJson = JSON.parse(responseBody);
        console.error('[getClientCredentialsToken] Spotify Error Details:', errorJson);
      } catch (e) { 
        // Ignore if body wasn't JSON
      }
      return null;
    }
    
    // If response was ok, parse the JSON body
    const data = JSON.parse(responseBody);
    console.log('[getClientCredentialsToken] Successfully received token.');
    return data.access_token;
  } catch (error) {
    console.error('[getClientCredentialsToken] Error during fetch:', error);
    return null;
  }
} 