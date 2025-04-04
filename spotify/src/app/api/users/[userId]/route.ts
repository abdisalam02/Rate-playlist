import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';
import { enrichItems } from '@/lib/enrichUtils'; // Import the extracted function

// --- Start: Copied ID Mapping Helpers --- 
interface DeezerTrackInfo {
  title: string;
  artistName: string;
  previewUrl: string | null;
}

interface CacheEntry {
  spotifyId: string | null;
  deezerPreviewUrl: string | null; // Keep preview URL here if needed
  timestamp: number;
}

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const deezerToSpotifyCache = new Map<string, CacheEntry>();

// Helper to check if an ID looks like a Deezer ID (numeric)
function isDeezerId(id: string | number | undefined): boolean {
  if (typeof id === 'number') return true;
  if (typeof id === 'string') return /^[\d]+$/.test(id);
  return false;
}

// Helper function to get basic track info from Deezer API using track ID
async function getDeezerTrackInfo(deezerId: string): Promise<DeezerTrackInfo | null> {
  const url = `https://api.deezer.com/track/${deezerId}`;
  console.log(`[Deezer Utils] Fetching Deezer track info: ${url}`);
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`[Deezer Utils] Deezer API error for track ${deezerId}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data && data.id && data.title && data.artist?.name) {
        return {
            title: data.title_short || data.title,
            artistName: data.artist.name,
            previewUrl: data.preview || null
        };
    } else {
        console.warn(`[Deezer Utils] Invalid data format from Deezer track API for ID ${deezerId}:`, data);
        return null;
    }
  } catch (error) {
    console.error(`[Deezer Utils] Error fetching Deezer track info for ${deezerId}:`, error);
    return null;
  }
}

// Helper to find Spotify track ID using Deezer info (simplified)
async function findSpotifyId(deezerInfo: DeezerTrackInfo): Promise<string | null> {
  // Simplified search query
  const query = `track:${deezerInfo.title} artist:${deezerInfo.artistName}`;
  const spotifySearchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
  console.log(`[Spotify Utils] Searching Spotify: ${spotifySearchUrl}`);
  try {
     // We need an access token here!
     // Get one using client credentials if no session token available
    const accessToken = await getClientCredentialsToken(); // Reuse existing helper
    if (!accessToken) {
        console.error("[Spotify Utils] Failed to get access token for Spotify search.");
        return null;
    }

    const response = await fetch(spotifySearchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store' // Don't cache this search heavily
    });
    if (!response.ok) {
      console.warn(`[Spotify Utils] Spotify search API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const spotifyTrack = data.tracks?.items?.[0];
    if (spotifyTrack?.id) {
        console.log(`[Spotify Utils] Found potential Spotify match: ID=${spotifyTrack.id}, Name=${spotifyTrack.name}`);
      // Basic match check (optional but recommended)
      // const nameMatch = spotifyTrack.name.toLowerCase().includes(deezerInfo.title.toLowerCase());
      // const artistMatch = spotifyTrack.artists?.some((artist: any) => artist.name.toLowerCase().includes(deezerInfo.artistName.toLowerCase()));
      // if (nameMatch || artistMatch) { // Allow partial match
          return spotifyTrack.id;
      // } else {
      //     console.log(`[Spotify Utils] Potential match discarded due to name mismatch.`);
      //     return null;
      // }
    } else {
        console.log(`[Spotify Utils] No track found in Spotify search results.`);
        return null;
    }
  } catch (error) {
    console.error(`[Spotify Utils] Error during Spotify search:`, error);
    return null;
  }
}
// --- End: Copied ID Mapping Helpers --- 

// --- Start: Deezer ID Mapping Function ---
async function mapDeezerIdsToSpotify(items: any[] | null): Promise<any[]> {
  if (!items) return [];
  
  const mappedItems = await Promise.all(items.map(async (item) => {
    const originalId = item.item_id;
    let spotifyIdToUse = originalId; // Assume it's Spotify initially

    if (isDeezerId(originalId)) {
        console.log(`[ID Mapper] Detected Deezer ID: ${originalId} for item type ${item.item_type}`);
        const cachedEntry = deezerToSpotifyCache.get(originalId);
        let mappedSpotifyId: string | null = null;

        if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
            mappedSpotifyId = cachedEntry.spotifyId;
            console.log(`[ID Mapper] Cache HIT for Deezer ID ${originalId} -> Spotify ID ${mappedSpotifyId}`);
        } else {
            console.log(`[ID Mapper] Cache MISS for Deezer ID ${originalId}. Attempting lookup...`);
            const deezerInfo = await getDeezerTrackInfo(originalId);
            if (deezerInfo) {
                mappedSpotifyId = await findSpotifyId(deezerInfo);
                // Cache the result (even if null)
                deezerToSpotifyCache.set(originalId, {
                    spotifyId: mappedSpotifyId,
                    deezerPreviewUrl: deezerInfo.previewUrl, // Store preview too?
                    timestamp: Date.now()
                });
                console.log(`[ID Mapper] Looked up Deezer ID ${originalId} -> Spotify ID ${mappedSpotifyId}. Cached.`);
            } else {
                 console.log(`[ID Mapper] Failed to get Deezer info for ID ${originalId}. Caching failure.`);
                // Cache the failure to find Deezer info
                 deezerToSpotifyCache.set(originalId, { spotifyId: null, deezerPreviewUrl: null, timestamp: Date.now() });
            }
        }

        if (mappedSpotifyId) {
            spotifyIdToUse = mappedSpotifyId;
            console.log(`[ID Mapper] Using mapped Spotify ID ${spotifyIdToUse} for original Deezer ID ${originalId}`);
        } else {
            console.warn(`[ID Mapper] Could not map Deezer ID ${originalId} to Spotify ID. Enrichment might fail for this item.`);
            // Keep original Deezer ID? Or null? Let's keep original for now, enrichItems might handle it.
             spotifyIdToUse = null; // Set to null if mapping failed, so enrichItems can skip it
        }
    }

    // Return a new object with the potentially updated ID
    // We'll use a dedicated 'spotify_id' field to avoid overwriting the original 'item_id'
    // and to make it clear for enrichItems
    return {
        ...item,
        spotify_id_for_enrichment: spotifyIdToUse
    };
  }));

  // Filter out items where mapping failed and resulted in null ID, 
  // as enrichItems likely expects a valid ID string.
  const validItems = mappedItems.filter(item => item.spotify_id_for_enrichment !== null);
  console.log(`[ID Mapper] Mapping complete. ${items.length} items in, ${validItems.length} items have valid Spotify IDs for enrichment.`);
  return validItems; 
}
// --- End: Deezer ID Mapping Function ---

// Cache control directives
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// --- GET Handler ---
export async function GET(
  request: NextRequest,
  { params }: { params: { userId?: string } }
) {
  try {
    const awaitedParams = await params;
    const userId = awaitedParams?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    console.log('[User API Route] Fetching data for user ID:', userId);
    const session = await getServerSession(authOptions);
    let accessToken = session?.accessToken;
    
    let userProfileData;
      // Fetch user by primary ID first
      const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, display_name, profile_image, spotify_id, created_at')
      .eq('id', userId)
      .single();
    if (userError && userError.code === 'PGRST116') { // PGRST116: Row not found
      // If not found by primary ID, try finding by Spotify ID
      console.log(`[User API Route] User ID ${userId} not found by primary key, trying spotify_id...`);
      const { data: spotifyUser, error: spotifyUserError } = await supabase
        .from('users')
        .select('id, display_name, profile_image, spotify_id, created_at')
        .eq('spotify_id', userId)
        .single();
      if (spotifyUserError) {
         console.error('[User API Route] Error fetching user by spotify_id:', spotifyUserError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userProfileData = spotifyUser;
      console.log('[User API Route] User found by spotify_id:', userProfileData.id);
    } else if (userError) {
       console.error('[User API Route] Error fetching user by primary ID:', userError);
       const errorMessage = userError.message.includes("does not exist") ? 
           `Database schema mismatch: ${userError.message}` : 
           'Error fetching user data';
       return NextResponse.json({ error: errorMessage }, { status: 500 });
    } else {
      userProfileData = userData;
       console.log('[User API Route] User found by primary ID:', userProfileData.id);
    }

    // --- Fetch Stats (temporarily disabled RPC) ---
    let statsData: any = { ratings_count: 0, avg_rating: 0 };
    let fallbackRatingsCount: number = 0;
    try {
      console.log(`[User API Route] Fetching rating stats for user: ${userProfileData.id}`);
      // Keep RPC disabled for now
      // const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_stats', { target_user_id: userProfileData.id });
      const rpcError = { message: 'RPC call disabled temporarily' }; 
      if (rpcError) {
        console.warn('[User API Route] RPC call get_user_stats disabled/failed:', rpcError.message);
        const { count, error: countError } = await supabase
          .from('ratings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userProfileData.id);
        if (countError) {
          console.error('[User API Route] Error fetching ratings count fallback:', countError);
        } else {
          fallbackRatingsCount = count ?? 0;
          statsData = { ratings_count: fallbackRatingsCount, avg_rating: 0 }; // Use fallback count
        }
      } else {
        // statsData = rpcData[0] || { ratings_count: 0, avg_rating: 0 }; // Use if RPC works
      }
    } catch (rpcCatchError) {
      console.error('[User API Route] Caught error during RPC call:', rpcCatchError);
      const { count, error: countError } = await supabase
        .from('ratings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userProfileData.id);
      if (!countError) { fallbackRatingsCount = count ?? 0; }
      statsData = { ratings_count: fallbackRatingsCount, avg_rating: 0 };
    }

    // --- Fetch Top Tracks/Albums (Limit to 6 for profile page) ---
    const limit = 6; 
    console.log(`[User API Route] Fetching top ${limit} tracks and albums for user: ${userProfileData.id}`);
    
    const { data: topTracksRaw, error: tracksError } = await supabase
      .from('ratings')
      .select('id, user_id, item_id, item_type, rating, review, created_at')
      .eq('user_id', userProfileData.id)
      .eq('item_type', 'track')
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false }) // Secondary sort by date
      .limit(limit); 
      
    const { data: topAlbumsRaw, error: albumsError } = await supabase
      .from('ratings')
      .select('id, user_id, item_id, item_type, rating, review, created_at')
      .eq('user_id', userProfileData.id)
      .eq('item_type', 'album')
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit); 
      
    // --- Fetch Recent Ratings (Keep limit at 5 or adjust as needed) ---
     const recentLimit = 5;
     console.log(`[User API Route] Fetching ${recentLimit} recent ratings for user: ${userProfileData.id}`);
     const { data: recentRatingsRaw, error: recentError } = await supabase
      .from('ratings')
      .select('id, user_id, item_id, item_type, rating, review, created_at')
      .eq('user_id', userProfileData.id)
      .order('created_at', { ascending: false })
      .limit(recentLimit); 

    // Handle potential errors from Supabase fetches
    if (tracksError) console.error('[User API Route] Error fetching top tracks:', tracksError);
    if (albumsError) console.error('[User API Route] Error fetching top albums:', albumsError);
    if (recentError) console.error('[User API Route] Error fetching recent ratings:', recentError);

    // --- Map Deezer IDs before enrichment --- 
    console.log('[User API Route] Mapping Deezer IDs to Spotify IDs...');
    const [mappedTopTracks, mappedTopAlbums, mappedRecentRatings] = await Promise.all([
        mapDeezerIdsToSpotify(topTracksRaw),
        mapDeezerIdsToSpotify(topAlbumsRaw),
        mapDeezerIdsToSpotify(recentRatingsRaw)
    ]);
    console.log('[User API Route] ID Mapping complete.');

    // --- Prepare items for enrichment by setting item_id correctly --- 
    const prepareForEnrichment = (items: any[]) => {
        return items.map(item => {
            const newItem = { ...item, item_id: item.spotify_id_for_enrichment };
            delete newItem.spotify_id_for_enrichment; // Clean up the temporary field
            return newItem;
        });
    };

    const finalTopTracks = prepareForEnrichment(mappedTopTracks);
    const finalTopAlbums = prepareForEnrichment(mappedTopAlbums);
    const finalRecentRatings = prepareForEnrichment(mappedRecentRatings);
    console.log('[User API Route] Items prepared with correct item_id for enrichment.');

    // --- Enrich the prepared items using the utility function ---
    console.log('[User API Route] Enriching items...');
    const [enrichedTopTracks, enrichedTopAlbums, enrichedRecentRatings] = await Promise.all([
      enrichItems(finalTopTracks, 'track', accessToken),
      enrichItems(finalTopAlbums, 'album', accessToken),
      enrichItems(finalRecentRatings, null, accessToken) // Enrich mixed types for recent
    ]);
    console.log('[User API Route] Enrichment complete.');

    // --- Construct the final API response --- 
    const responseData = {
      profile: {
          ...userProfileData,
          bio: null,
          ratings_count: statsData.ratings_count,
      },
      top_tracks: enrichedTopTracks,
      top_albums: enrichedTopAlbums,
      recent_ratings: enrichedRecentRatings
    };

    console.log('[User API Route] Final API Data Structure ready to send.');
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[User API Route] Error in GET handler:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
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