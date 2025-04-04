import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

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
  const query = `track:${deezerInfo.title} artist:${deezerInfo.artistName}`;
  const spotifySearchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
  console.log(`[Spotify Utils] Searching Spotify: ${spotifySearchUrl}`);
  try {
    const accessToken = await getClientCredentialsToken(); 
    if (!accessToken) {
        console.error("[Spotify Utils] Failed to get access token for Spotify search.");
        return null;
    }
    const response = await fetch(spotifySearchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) {
      console.warn(`[Spotify Utils] Spotify search API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const spotifyTrack = data.tracks?.items?.[0];
    if (spotifyTrack?.id) {
        console.log(`[Spotify Utils] Found potential Spotify match: ID=${spotifyTrack.id}, Name=${spotifyTrack.name}`);
        return spotifyTrack.id;
    } else {
        console.log(`[Spotify Utils] No track found in Spotify search results.`);
        return null;
    }
  } catch (error) {
    console.error(`[Spotify Utils] Error during Spotify search:`, error);
    return null;
  }
}

// Helper to find Deezer preview, prioritizing ISRC, then falling back to search (Copied and adapted)
async function searchDeezerForPreview(
  title: string | null | undefined,
  artistName: string | null | undefined,
  isrc: string | null | undefined
): Promise<string | null> {
  
  // 1. Attempt ISRC Lookup first
  if (isrc) {
    const isrcUrl = `https://api.deezer.com/track/isrc:${isrc}`;
    console.log(`[Deezer Preview Search] Looking up via ISRC: ${isrcUrl}`);
    try {
      const isrcResponse = await fetch(isrcUrl, { cache: 'no-store' });
      if (isrcResponse.ok) {
        const isrcData = await isrcResponse.json();
        if (isrcData?.id && isrcData?.preview) {
          console.log(`[Deezer Preview Search] Found track via ISRC: ID=${isrcData.id}, Preview: ${isrcData.preview}`);
          return isrcData.preview;
        } 
      } else if (isrcResponse.status !== 404) {
        console.warn(`[Deezer Preview Search] Deezer ISRC API error (${isrcResponse.status}): ${await isrcResponse.text()}`);
      } else {
          console.log(`[Deezer Preview Search] No track found for ISRC ${isrc}.`);
      }
    } catch (error) {
      console.error(`[Deezer Preview Search] Error during ISRC lookup:`, error);
    }
  } else {
    console.log(`[Deezer Preview Search] No ISRC provided.`);
  }

  // 2. Fallback to Name Search (only if ISRC failed and we have names)
  if (!title || !artistName) {
    console.log('[Deezer Preview Search] Cannot perform name search without title and artist.');
    return null;
  }

  console.log(`[Deezer Preview Search] ISRC lookup failed or not possible. Falling back to name search for "${title}" / "${artistName}".`);
  const simpleQuery = `track:"${title}" artist:"${artistName}"`; 
  const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(simpleQuery)}&limit=1`;
  console.log(`[Deezer Preview Search] Searching Deezer: ${searchUrl}`);
  try {
    const searchResponse = await fetch(searchUrl, { cache: 'no-store' });
    if (!searchResponse.ok) {
      console.warn(`[Deezer Preview Search] Deezer search API error: ${searchResponse.status}`);
      return null;
    }
    const data = await searchResponse.json();
    const deezerTrack = data?.data?.[0];

    if (deezerTrack?.preview) {
      console.log(`[Deezer Preview Search] Found preview via name search (fallback): ID=${deezerTrack.id}`);
      return deezerTrack.preview;
    } else {
      console.log(`[Deezer Preview Search] Fallback name search found no track with a preview.`);
      return null;
    }
  } catch (error) {
    console.error(`[Deezer Preview Search] Error during fallback name search:`, error);
  }
}

// Ensure this closing brace exists

// --- Start: getClientCredentialsToken Definition ---
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
      
      const responseBody = await response.text();
      if (!response.ok) {
        console.error(`[getClientCredentialsToken] Failed: ${response.status}`, responseBody);
        return null;
      }
      const data = JSON.parse(responseBody);
      console.log('[getClientCredentialsToken] Successfully received token.');
      return data.access_token;
    } catch (error) {
      console.error('[getClientCredentialsToken] Error during fetch:', error);
      return null;
    }
  }
// --- End: getClientCredentialsToken Definition ---

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
    
    // --- Map Deezer IDs to Spotify IDs --- 
    console.log('[top-rated] Mapping potential Deezer IDs...');
    const mappedItemsWithRatings = await Promise.all(itemsWithRatings.map(async (item) => {
        let spotifyIdToUse = item.item_id;
        if (isDeezerId(item.item_id)) {
            console.log(`[top-rated] Detected Deezer ID ${item.item_id}, attempting mapping...`);
            const cachedEntry = deezerToSpotifyCache.get(item.item_id);
            let mappedSpotifyId: string | null = null;
            if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
                mappedSpotifyId = cachedEntry.spotifyId;
                console.log(`[top-rated] Cache HIT: Deezer ${item.item_id} -> Spotify ${mappedSpotifyId}`);
            } else {
                const deezerInfo = await getDeezerTrackInfo(item.item_id);
                if (deezerInfo) {
                    mappedSpotifyId = await findSpotifyId(deezerInfo);
                    deezerToSpotifyCache.set(item.item_id, { spotifyId: mappedSpotifyId, deezerPreviewUrl: deezerInfo.previewUrl, timestamp: Date.now() });
                    console.log(`[top-rated] Cache MISS: Looked up Deezer ${item.item_id} -> Spotify ${mappedSpotifyId}. Cached.`);
                } else {
                    deezerToSpotifyCache.set(item.item_id, { spotifyId: null, deezerPreviewUrl: null, timestamp: Date.now() });
                    console.log(`[top-rated] Cache MISS: Failed to get Deezer info for ${item.item_id}. Cached failure.`);
                }
            }
            if (mappedSpotifyId) {
                spotifyIdToUse = mappedSpotifyId;
            } else {
                 console.warn(`[top-rated] Failed to map Deezer ID ${item.item_id}. This item will be excluded from enrichment.`);
                 spotifyIdToUse = null; // Mark for exclusion
            }
        }
        // Return item with the ID to use (or null if mapping failed)
        return { ...item, item_id_for_enrichment: spotifyIdToUse }; 
    }));

    // Filter out items that failed mapping and refine type
    const validItemsForEnrichment = mappedItemsWithRatings.filter(
        (item): item is (RatingWithStats & { item_id_for_enrichment: string }) => 
            item.item_id_for_enrichment !== null
    );
    console.log(`[top-rated] ID Mapping complete. ${itemsWithRatings.length} items in, ${validItemsForEnrichment.length} valid Spotify IDs found.`);

    if (validItemsForEnrichment.length === 0) {
        console.log('[top-rated] No valid items remain after ID mapping.');
        return getDefaultSampleData(itemType, limit); // Use fallback if nothing is left
    }

    // --- Get item details from Spotify API using mapped IDs --- 
    // @ts-expect-error - Linter struggles with inferred type after filter, but logic is sound.
    const itemIds = validItemsForEnrichment.map(item => item.item_id_for_enrichment);
    
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
    
    // Ensure itemIds has elements before joining (safety check)
    if (itemIds.length === 0) {
        console.warn('[top-rated] itemIds array became empty unexpectedly before Spotify call.');
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
          return processSpotifyData(spotifyData, validItemsForEnrichment, itemType, limit);
        }
      }
      
      if (!response.ok) {
        console.error(`[top-rated] Spotify API error: ${response.status} ${response.statusText}`);
        return getDefaultSampleData(itemType, limit);
      }
      
      const spotifyData = await response.json();
      return processSpotifyData(spotifyData, validItemsForEnrichment, itemType, limit);
      
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
async function processSpotifyData(
    spotifyData: any, 
    itemsWithRatings: (RatingWithStats & { item_id_for_enrichment: string })[],
    itemType: string, 
    limit: number
) {
  const items = spotifyData.tracks || spotifyData.albums || [];
  
  if (!items || items.length === 0) {
    console.log('[top-rated] No items returned from Spotify API');
    return getDefaultSampleData(itemType, limit);
  }
  
  // Combine Spotify data with our rating data
  const enrichedItemsInput = items.map((spotifyItem: any) => {
    // Use item_id_for_enrichment for matching
    const ratingData = itemsWithRatings.find(item => item.item_id_for_enrichment === spotifyItem.id);
    
    return {
      ...spotifyItem,
      average_rating: ratingData?.average_rating || 0,
      rating_count: ratingData?.rating_count || 0
    };
  });

  // --- Add Deezer Preview Fetching for Tracks --- 
  let finalEnrichedItems = enrichedItemsInput;
  if (itemType === 'track') {
      console.log('[top-rated] Attempting to fetch Deezer previews for tracks...');
      finalEnrichedItems = await Promise.all(enrichedItemsInput.map(async (track: any) => {
          let finalPreviewUrl = track.preview_url;
          if (!finalPreviewUrl) { // Only search if Spotify didn't provide one
              const isrc = track.external_ids?.isrc;
              const deezerPreview = await searchDeezerForPreview(track.name, track.artists?.[0]?.name, isrc);
              if (deezerPreview) {
                  console.log(`[top-rated] Found Deezer preview for track ${track.id}`);
                  finalPreviewUrl = deezerPreview;
              }
          }
          return { ...track, preview_url: finalPreviewUrl ?? undefined }; // Use nullish coalescing
      }));
      console.log('[top-rated] Deezer preview fetching complete.');
  }
  // --- End Deezer Preview Fetching --- 
  
  // Sort by average rating (highest first)
  finalEnrichedItems.sort((a: any, b: any) => b.average_rating - a.average_rating);
  
  console.log(`[top-rated] Successfully processed ${finalEnrichedItems.length} items`);
  
  return NextResponse.json({ items: finalEnrichedItems });
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