import { getClientCredentialsToken } from './spotify'; // Assuming getClientCredentialsToken is here or adjust path

// Define interfaces needed by enrichItems
export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls?: { spotify: string };
}

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images?: SpotifyImage[];
  artists?: SpotifyArtist[];
  release_date?: string;
  album_type?: string;
  external_urls?: { spotify: string };
}

export interface SpotifyItem {
  id: string;
  name: string;
  type: 'track' | 'album';
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum; // For tracks
  images?: SpotifyImage[]; // For albums
  duration_ms?: number;
  external_urls?: { spotify: string };
  popularity?: number;
  preview_url?: string | null;
}

export interface RatingItem {
  id: string | number; // Rating ID from Supabase
  user_id: string;
  item_id: string; // Spotify track/album ID
  item_type: 'track' | 'album';
  rating: number;
  review?: string | null;
  created_at: string;
  // Allow any other properties from Supabase rating table
  [key: string]: any;
}

/**
 * Enriches a list of rating items (tracks or albums) with details from the Spotify API.
 * Fetches data in batches. Requires a valid Spotify access token.
 *
 * @param items - Array of RatingItem objects from Supabase.
 * @param itemType - Optional: Specify 'track' or 'album' if all items are the same type. If null, determines type from item.item_type.
 * @param accessToken - A valid Spotify API access token. If null/invalid, enrichment may fail.
 * @returns A promise resolving to an array of enriched items, merging rating data with Spotify data.
 */
export async function enrichItems(
    items: RatingItem[],
    itemType: 'track' | 'album' | null, 
    accessToken: string | null
): Promise<any[]> { // Return type could be more specific, e.g., Array<RatingItem & Partial<SpotifyItem>>
    console.log(`[enrichItems] Starting enrichment. Item count: ${items?.length}. Type: ${itemType || 'mixed'}. AccessToken provided: ${!!accessToken}`);
    
    if (!items || items.length === 0) {
        console.log('[enrichItems] No items to enrich.');
        return [];
    }

    let currentToken = accessToken;
    // Optional: Add logic here to fetch a client credentials token if accessToken is null/invalid
    // if (!currentToken) {
    //     console.warn('[enrichItems] No access token provided, attempting client credentials.');
    //     currentToken = await getClientCredentialsToken(); 
    //     if (!currentToken) {
    //       console.error('[enrichItems] Failed to obtain client credentials token. Cannot enrich.');
    //        // Return original items if enrichment isn't possible
    //        return items; 
    //     }
    // }
     if (!currentToken) {
        console.error('[enrichItems] No access token available for enrichment.');
         // Return original items if enrichment isn't possible
         return items; 
    }


    // Split IDs by type
    let trackRatings: RatingItem[] = [];
    let albumRatings: RatingItem[] = [];
    if (itemType === 'track') {
        trackRatings = items;
    } else if (itemType === 'album') {
        albumRatings = items;
    } else { // Mixed types
        trackRatings = items.filter(r => r.item_type === 'track');
        albumRatings = items.filter(r => r.item_type === 'album');
    }
    const trackIds = trackRatings.map(r => r.item_id).filter(Boolean);
    const albumIds = albumRatings.map(r => r.item_id).filter(Boolean);
    console.log(`[enrichItems] Track IDs to fetch: ${trackIds.length}`);
    console.log(`[enrichItems] Album IDs to fetch: ${albumIds.length}`);

    const itemDetails = new Map<string, any>(); // Stores fetched SpotifyItem or error object

    // Function to fetch batches from Spotify API
    const fetchBatch = async (ids: string[], type: 'tracks' | 'albums') => {
        const batchSize = type === 'tracks' ? 50 : 20;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batchIds = ids.slice(i, i + batchSize);
            if (batchIds.length === 0) continue;
            
            const url = `https://api.spotify.com/v1/${type}?ids=${batchIds.join(',')}`;
            console.log(`[enrichItems] Fetching ${type} batch: ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)} (IDs: ${batchIds.length})`);
            
            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${currentToken}` },
                    cache: 'no-store' // Consider changing cache strategy if appropriate
                });
                // console.log(`[enrichItems] Spotify ${type} Batch Response Status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    (data[type] || []).forEach((item: SpotifyItem | null) => {
                        if (item && item.id) {
                            // Store the FULL item object
                            itemDetails.set(item.id, item); 
                        } else if (item === null) {
                           // Spotify API might return null for an ID if it's invalid/doesn't exist
                           // Find which ID this corresponds to (tricky, API doesn't guarantee order)
                           console.warn(`[enrichItems] Received null for an item in ${type} batch.`);
                        }
                    });
                } else {
                    const errorBody = await response.text();
                    console.error(`[enrichItems] Spotify ${type} Batch Response NOT OK (${response.status}). URL: ${url} Body: ${errorBody.substring(0, 500)}`);
                    // Store an error marker for these IDs
                    batchIds.forEach(id => { if (!itemDetails.has(id)) itemDetails.set(id, { error: true, status: response.status }); });
                    
                    // Handle specific errors like 401 Unauthorized (token expired?)
                    if (response.status === 401) {
                        console.error("[enrichItems] Spotify API returned 401 Unauthorized. Access token might be expired or invalid.");
                        // Potentially trigger token refresh logic here if applicable
                    }
                }
            } catch (error) {
                console.error(`[enrichItems] Network or parsing error during Spotify ${type} batch fetch (Batch ${i / batchSize + 1}):`, error);
                // Store an error marker
                 batchIds.forEach(id => { if (!itemDetails.has(id)) itemDetails.set(id, { error: true, message: (error instanceof Error) ? error.message : 'Unknown fetch error' }); });
            }
        }
    };

    // Execute fetches concurrently? Could be faster but riskier with rate limits
    // await Promise.all([
    //     trackIds.length > 0 ? fetchBatch(trackIds, 'tracks') : Promise.resolve(),
    //     albumIds.length > 0 ? fetchBatch(albumIds, 'albums') : Promise.resolve()
    // ]);
    // Sequential fetch is safer for rate limits
    if (trackIds.length > 0) await fetchBatch(trackIds, 'tracks');
    if (albumIds.length > 0) await fetchBatch(albumIds, 'albums');


    console.log(`[enrichItems] Combining ${items.length} items with ${itemDetails.size} fetched/fallback details.`);
    // Combine original rating with FULL Spotify details
    return items.map(item => {
        const details = itemDetails.get(item.item_id);
        
        if (details && !details.error) {
            // Merge rating data with the full Spotify item data
            return { 
                ...details, // Full Spotify info (name, artists array, album object, images array, etc.)
                ...item, // Original rating info (id=UUID, rating, review, created_at, etc.)
            };
        } else {
             // Fallback if fetch failed or no details found
             console.warn(`[enrichItems] Using fallback data for ${item.item_type} ID: ${item.item_id}. Reason: ${details?.error ? ('Fetch error ' + (details.status || details.message || '')) : 'Details not found'}`);
            return {
                ...item,
                // Provide a minimal structure expected by components
                 // CORRECTED: Use the original item.id (UUID)
                 id: item.id, 
                // Optionally add spotifyId if needed elsewhere
                // spotifyId: item.item_id, 
                name: `Unknown ${item.item_type}`,
                type: item.item_type,
                artists: [{ name: 'Unknown Artist' }],
                album: item.item_type === 'track' ? { id: '', name: 'Unknown Album', images: [] } : undefined,
                images: item.item_type === 'album' ? [] : undefined, // Provide images as array for albums
                external_urls: { spotify: '#' }, // Provide a default link
                // Add other fallback fields if needed by components like MediaCard/ActivityItem
            };
        }
    });
} 