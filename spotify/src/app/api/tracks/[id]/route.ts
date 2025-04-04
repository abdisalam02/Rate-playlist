import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getClientCredentialsToken, searchTracks } from '@/lib/spotify';
import { AppSession } from '@/types/index';

// --- Simple In-Memory Cache for Deezer -> Spotify ID mapping ---
const idCache = new Map<string, string | null>();
const CACHE_TTL = 10 * 60 * 1000; // Cache for 10 minutes

interface CacheEntry {
  spotifyId: string | null;
  deezerPreviewUrl: string | null;
  timestamp: number;
}
const deezerToSpotifyCache = new Map<string, CacheEntry>();
// --- End Cache ---

// Removing explicit RouteContext interface
// interface RouteContext {
//   params: { id: string };
// }

// Helper to check if an ID looks like a Deezer ID (numeric)
function isDeezerId(id: string): boolean {
  return /^[0-9]+$/.test(id);
}

// Helper to get basic track info from Deezer
async function getDeezerTrackInfo(deezerId: string): Promise<{ title: string; artistName: string; previewUrl: string | null } | null> {
  const url = `https://api.deezer.com/track/${deezerId}`;
  console.log(`[API Track - Deezer Lookup] Fetching Deezer info from ${url}`);
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok || response.status === 204) { // Handle no content
      console.error(`[API Track - Deezer Lookup] Deezer API error for ${deezerId}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    // Check for error response from Deezer or missing essential fields
    if (data.error || !data.title || !data.artist?.name) {
        console.error(`[API Track - Deezer Lookup] Invalid data or error from Deezer for ${deezerId}:`, data);
        return null;
    }
    const previewUrl = data.preview || null; // Extract preview URL
    console.log(`[API Track - Deezer Lookup] Found Deezer track: ${data.title} by ${data.artist.name}. Preview: ${previewUrl}`);
    return { 
      title: data.title, 
      artistName: data.artist.name, 
      previewUrl: previewUrl // Return preview URL
    };
  } catch (error) {
    console.error(`[API Track - Deezer Lookup] Error fetching Deezer info for ${deezerId}:`, error);
    return null;
  }
}

// Helper to find Deezer preview, prioritizing ISRC, then falling back to search
async function searchDeezerForPreview(
  title: string | null | undefined,
  artistName: string | null | undefined,
  isrc: string | null | undefined
): Promise<string | null> {
  
  // 1. Attempt ISRC Lookup first
  if (isrc) {
    const isrcUrl = `https://api.deezer.com/track/isrc:${isrc}`;
    console.log(`[API Track - Deezer ISRC] Looking up via ISRC: ${isrcUrl}`);
    try {
      const isrcResponse = await fetch(isrcUrl, { cache: 'no-store' });
      if (isrcResponse.ok) {
        const isrcData = await isrcResponse.json();
        if (isrcData?.id && isrcData?.preview) {
          console.log(`[API Track - Deezer ISRC] Found track via ISRC: ID=${isrcData.id}, Title='${isrcData.title}'. Preview: ${isrcData.preview}`);
          return isrcData.preview;
        } else {
            console.log(`[API Track - Deezer ISRC] Track found via ISRC, but no preview or ID. Data:`, isrcData);
        }
      } else if (isrcResponse.status !== 404) {
        // Log errors other than 'Not Found'
        console.warn(`[API Track - Deezer ISRC] Deezer ISRC API error (${isrcResponse.status}): ${await isrcResponse.text()}`);
      } else {
          console.log(`[API Track - Deezer ISRC] No track found for ISRC ${isrc}.`);
      }
    } catch (error) {
      console.error(`[API Track - Deezer ISRC] Error during ISRC lookup:`, error);
    }
  } else {
    console.log(`[API Track - Deezer ISRC] No ISRC provided by Spotify.`);
  }

  // 2. Fallback to Name Search (only if ISRC failed and we have names)
  if (!title || !artistName) {
    console.log('[API Track - Deezer Search] Cannot perform name search without title and artist.');
    return null;
  }

  console.log(`[API Track - Deezer Search] ISRC lookup failed or not possible. Falling back to name search.`);
  // Simplified query - Deezer search is finicky, exact matching rarely works well
  // Let's try just searching for the title and hope the first result is relevant enough
  const simpleQuery = `track:"${title}" artist:"${artistName}"`; // Keep artist to narrow down slightly
  const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(simpleQuery)}&limit=1`;
  console.log(`[API Track - Deezer Search] Searching Deezer: ${searchUrl}`);
  try {
    const searchResponse = await fetch(searchUrl, { cache: 'no-store' });
    if (!searchResponse.ok) {
      console.warn(`[API Track - Deezer Search] Deezer search API error: ${searchResponse.status}`);
      return null;
    }
    const data = await searchResponse.json();
    const deezerTrack = data?.data?.[0];

    if (deezerTrack?.preview) {
      // No complex matching, just return the first preview found via search as a last resort
      console.log(`[API Track - Deezer Search] Found potential match via name search (fallback): ID=${deezerTrack.id}, Title='${deezerTrack.title}', Preview='${deezerTrack.preview}'`);
      return deezerTrack.preview;
    } else {
      console.log(`[API Track - Deezer Search] Fallback name search found no track with a preview.`);
      return null;
    }
  } catch (error) {
    console.error(`[API Track - Deezer Search] Error during fallback name search:`, error);
    return null;
  }
}

// Helper to find Spotify ID using Deezer info
async function findSpotifyId(deezerInfo: { title: string; artistName: string }): Promise<string | null> {
  try {
    const spotifyToken = await getClientCredentialsToken();
    if (!spotifyToken) {
      console.error("[API Track - Spotify Search] Failed to get Spotify token for search.");
      return null;
    }
    
    const query = `track:"${deezerInfo.title}" artist:"${deezerInfo.artistName}"`;
    console.log(`[API Track - Spotify Search] Searching Spotify with query: ${query}`);
    const searchResult = await searchTracks(spotifyToken, query, 1);
    const spotifyTrack = searchResult?.tracks?.items?.[0];

    if (spotifyTrack?.id) {
      console.log(`[API Track - Spotify Search] Found Spotify ID: ${spotifyTrack.id} for Deezer track: ${deezerInfo.title}`);
      return spotifyTrack.id;
    } else {
      console.warn(`[API Track - Spotify Search] No Spotify track found for query: ${query}`);
      return null;
    }
  } catch (error) {
    console.error("[API Track - Spotify Search] Error during Spotify search:", error);
    return null;
  }
}

// Use standard inline context type for params
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions) as AppSession | null;
  const requestedId = params.id;
  let resolvedSpotifyId: string | null = null;
  let potentialDeezerPreview: string | null = null;

  console.log(`[API Track] Processing request for ID: ${requestedId}`);
  
  try {
      // --- Step 1: Resolve Spotify ID and potentially get initial Deezer Preview --- 
      if (isDeezerId(requestedId)) {
          console.log(`[API Track] ID ${requestedId} looks like Deezer ID.`);
          const cachedEntry = deezerToSpotifyCache.get(requestedId);
          if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
              console.log(`[API Track] Cache HIT for Deezer ID ${requestedId}.`);
              resolvedSpotifyId = cachedEntry.spotifyId;
              potentialDeezerPreview = cachedEntry.deezerPreviewUrl; // Get preview from cache
              if (!resolvedSpotifyId && cachedEntry.spotifyId !== null) { // Cached as not found on Spotify
                   return NextResponse.json({ error: "Track not found on Spotify (cached)" }, { status: 404 });
              }
          } else {
              console.log(`[API Track] Cache MISS/expired for Deezer ID ${requestedId}.`);
              const deezerInfo = await getDeezerTrackInfo(requestedId);
              if (deezerInfo) {
                  resolvedSpotifyId = await findSpotifyId(deezerInfo);
                  potentialDeezerPreview = deezerInfo.previewUrl;
                  deezerToSpotifyCache.set(requestedId, { spotifyId: resolvedSpotifyId, deezerPreviewUrl: potentialDeezerPreview, timestamp: Date.now() });
                  console.log(`[API Track] Cached result for Deezer ID ${requestedId}: SpotifyID=${resolvedSpotifyId}, DeezerPreview=${potentialDeezerPreview}`);
              } else {
                   // Failed to get Deezer info, cache this failure?
                   deezerToSpotifyCache.set(requestedId, { spotifyId: null, deezerPreviewUrl: null, timestamp: Date.now() });
                   return NextResponse.json({ error: "Track not found on Deezer" }, { status: 404 }); 
              }
          }
      } else {
          // Assume it's already a Spotify ID
          console.log(`[API Track] ID ${requestedId} assumed to be a Spotify ID.`);
          resolvedSpotifyId = requestedId;
      }

      if (!resolvedSpotifyId) {
          console.error(`[API Track] Could not resolve a Spotify ID for requested ID ${requestedId}.`);
           // If mapping failed after Deezer lookup
          if(isDeezerId(requestedId)) return NextResponse.json({ error: "Track not found on Spotify" }, { status: 404 });
          // If the original ID was assumed Spotify but invalid?
          return NextResponse.json({ error: "Invalid Track ID provided" }, { status: 400 });
      }

      // --- Step 2: Fetch Spotify Details and (potentially) search Deezer in parallel --- 
      let accessToken = session?.accessToken;
      if (!accessToken) {
          console.log("[API Track] No session token, using client credentials.");
          accessToken = await getClientCredentialsToken();
          if (!accessToken) {
               console.error("[API Track] Failed to get client credentials token.");
               return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
          }
      } else {
          console.log("[API Track] Using user session token.");
      }

      const spotifyTrackUrl = `https://api.spotify.com/v1/tracks/${resolvedSpotifyId}`;

      // Prepare promises
      const spotifyFetchPromise = fetch(spotifyTrackUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store'
        });
        
      // We only need to search Deezer if we didn't already get a preview from a Deezer ID lookup
      let deezerSearchPromise: Promise<string | null> = Promise.resolve(potentialDeezerPreview); // Default to existing preview or null
      
      // Temporary: Fetch Spotify first to get name/artist for Deezer search (will optimize later if needed)
      const spotifyResponse = await spotifyFetchPromise;

      if (!spotifyResponse.ok) {
          // Handle Spotify fetch errors (e.g., 401, 404, 500)
          const errorBodyText = await spotifyResponse.text();
          console.error(`[API Track] Spotify API error: ${spotifyResponse.status} ${spotifyResponse.statusText}`, errorBodyText);
          if (spotifyResponse.status === 401 && session?.accessToken) {
              return NextResponse.json({ requires_auth: true, error: "Spotify token expired or invalid" }, { status: 401 });
          }
           let errorDetail = `Spotify API error: ${spotifyResponse.statusText}`;
            try {
               const errorBodyJson = JSON.parse(errorBodyText);
               errorDetail = errorBodyJson?.error?.message || errorDetail;
            } catch { /* Ignore parsing error */ }
          return NextResponse.json({ error: errorDetail }, { status: spotifyResponse.status });
      }

      const spotifyTrackData = await spotifyResponse.json();
      const trackName = spotifyTrackData?.name;
      const artistName = spotifyTrackData?.artists?.[0]?.name;
      const isrc = spotifyTrackData?.external_ids?.isrc;

      console.log(`[API Track] Spotify Data: Name='${trackName}', Artist='${artistName}', ISRC=${isrc}`);

      // If we don't have a Deezer preview yet, try to find one
      if (!potentialDeezerPreview) {
          // Prioritize ISRC lookup, fallback to name search
          console.log(`[API Track] No initial Deezer preview. Attempting Deezer lookup (ISRC first)...`);
          deezerSearchPromise = searchDeezerForPreview(trackName, artistName, isrc);
      } else {
          // Already have a preview from Deezer ID lookup, skip search
          console.log(`[API Track] Already have potential Deezer preview: ${potentialDeezerPreview}. Skipping Deezer search.`);
          deezerSearchPromise = Promise.resolve(potentialDeezerPreview); 
      }
      
      // Await the Deezer search/lookup result
      const finalDeezerPreview = await deezerSearchPromise;

      // --- Step 3: Merge and Return --- 
      let finalPreviewUrl = spotifyTrackData.preview_url; // Start with Spotify's version
      if (finalDeezerPreview) {
          console.log(`[API Track] Using Deezer preview (${finalDeezerPreview}) instead of Spotify (${spotifyTrackData.preview_url})`);
          finalPreviewUrl = finalDeezerPreview;
      }

      console.log(`[API Track] Successfully processed track ${resolvedSpotifyId}. Final Preview URL: ${finalPreviewUrl}`);
      
      return NextResponse.json({
        ...spotifyTrackData,
        preview_url: finalPreviewUrl ?? undefined // Use nullish coalescing directly
      });

  } catch (error) {
      console.error('[API Track] Unhandled error in GET route:', error);
      // Log the requested ID if possible
      const idForLog = typeof requestedId === 'string' ? requestedId : 'unknown';
      console.error(`[API Track] Error occurred for requested ID: ${idForLog}`);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 