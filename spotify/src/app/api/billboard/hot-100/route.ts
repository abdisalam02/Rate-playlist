import { NextRequest, NextResponse } from 'next/server';
// Remove the explicit import - assuming types might be available globally?
// import { Track, Artist, Album } from '@/types'; 
import { fetchSpotifyApi } from '../../../lib/spotify'; // Use relative path

// Environment variables
const rapidApiKey = process.env.RAPIDAPI_KEY;
// IMPORTANT: Change this if you use a different Billboard API host on RapidAPI
const rapidApiHost = 'billboard-api2.p.rapidapi.com';

// Set to dynamic to ensure data is always fresh
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// --- Types ---
// Ensure ONLY BillboardChartEntry is defined locally.
// Track, Artist, Album, Image come from the import above.
interface BillboardChartEntry {
  // rank comes as a string from the API (e.g., "1")
  rank: string; 
  title: string;
  artist: string;
  weeks_on_chart?: string; // Assuming these might also be strings
  peak_rank?: string;
  last_week_rank?: string | null;
  image?: string | null; // Billboard API might provide an image URL
}

interface BillboardApiResponse {
  info: {
    category: string;
    chart: string;
    date: string;
    source: string;
  };
  // Use Record<string, BillboardChartEntry> for dynamic keys (like "1", "2")
  content: Record<string, BillboardChartEntry>; 
}

// Placeholder definition for the main Track type used in map/filter
// This relies on the structure defined in @/types, but helps local type checking
// Adjust if the actual imported Track type differs significantly
interface LocalTrackRepresentation {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images?: { url: string; height?: number; width?: number }[];
  };
  duration_ms?: number;
}

// Our desired Track structure for the frontend
interface Artist {
  id: string; // Might need to generate or leave null if not available
  name: string;
}

interface Album {
  id: string; // Might need to generate or leave null
  name: string; // Use track title or generic name?
  images?: { url: string; height?: number; width?: number }[];
}

interface Track {
  id: string; // Use rank? Needs to be unique
  name: string;
  artists: Artist[];
  album: Album;
  // We won't have these from Billboard
  preview_url?: string | null;
  duration_ms?: number;
}

// --- Helper Function for Spotify Client Credentials ---
// Copied from playlist route - SHOULD BE MOVED TO A SHARED UTILITY
const getClientCredentialsToken = async (): Promise<string | null> => { 
  console.warn("[API Billboard Hot 100] Using placeholder getClientCredentialsToken"); 
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[API Billboard Hot 100] Missing Spotify client ID or secret for client credentials.");
    return null;
  }
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }, 
      body: new URLSearchParams({ grant_type: 'client_credentials' }), 
      cache: 'no-store'
    });
    if (!response.ok) {
      console.error(`[API Billboard Hot 100] Failed to get Spotify token: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    console.log("[API Billboard Hot 100] Successfully obtained client credentials token.");
    return data.access_token;
  } catch (error) {
    console.error("[API Billboard Hot 100] Error fetching client credentials token:", error);
    return null;
  }
};

// --- Main GET Handler ---
export async function GET(request: NextRequest) {
  console.log('[API Billboard Hot 100] GET called');

  if (!rapidApiKey) {
    console.error('[API Billboard Hot 100] Missing RAPIDAPI_KEY environment variable.');
    return NextResponse.json({ error: 'API configuration error on server' }, { status: 500 });
  }

  // Get current date in YYYY-MM-DD format
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  const currentDate = `${year}-${month}-${day}`;

  // Append the date AND range=1-100 as query parameters
  const url = `https://${rapidApiHost}/hot-100?date=${currentDate}&range=1-100`;
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': rapidApiHost
    },
    cache: 'no-store' // Ensure fresh data
  } as RequestInit; // Type assertion for cache

  try {
    console.log(`[API Billboard Hot 100] Fetching from ${url}`); // Log includes the date now
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Billboard Hot 100] RapidAPI request failed: ${response.status} ${response.statusText}`);
      console.error(`[API Billboard Hot 100] RapidAPI Error Body: ${errorText}`);
      return NextResponse.json({ error: `Failed to fetch data from Billboard API provider: ${response.statusText}` }, { status: response.status });
    }

    const data: BillboardApiResponse = await response.json();
    console.log('[API Billboard Hot 100] Received data from RapidAPI.');
    // Log the raw structure to help debug
    console.log('[API Billboard Hot 100] Raw data structure:', JSON.stringify(data, null, 2));

    // --- Transform Billboard data to Track format ---
    // Use ?. for safer access and check if content exists
    const chartEntriesObject = data?.content;
    const chartEntries = chartEntriesObject ? Object.values(chartEntriesObject) : [];

    if (!chartEntries || chartEntries.length === 0) {
       // Log the actual received data if entries are missing
       console.warn('[API Billboard Hot 100] No chart entries extracted. Raw content:', chartEntriesObject);
       return NextResponse.json({ tracks: [] }); // Return empty if no data
    }

    const mappedTracks: (Track | null)[] = chartEntries
      // Filter: check rank is a non-empty string, title & artist exist
      .filter(entry => 
        entry && 
        typeof entry.rank === 'string' && 
        entry.rank.length > 0 && 
        entry.title && 
        entry.artist
      )
      // Sort by rank, converting string rank to number for comparison
      .sort((a, b) => {
        const rankA = parseInt(a.rank, 10);
        const rankB = parseInt(b.rank, 10);
        // Handle potential NaN if parsing fails (though filter should prevent)
        if (isNaN(rankA)) return 1; 
        if (isNaN(rankB)) return -1;
        return rankA - rankB;
      })
      .map(entry => {
        const rankNumber = parseInt(entry.rank, 10);
        // Handle NaN case just in case filter fails somehow
        if (isNaN(rankNumber)) {
            console.warn(`[API Billboard Hot 100] Failed to parse rank: ${entry.rank}. Skipping entry.`);
            return null; // Will be filtered out later
        }
        
        // Basic image handling - use provided image or placeholder
        // Ensure image URL is absolute or fallback
        let imageUrl = '/placeholder-track.png';
        if (entry.image && entry.image.startsWith('http')) {
            imageUrl = entry.image;
        } else if (entry.image) {
            console.warn(`[API Billboard Hot 100] Entry rank ${entry.rank}: Image URL "${entry.image}" is not absolute, using placeholder.`);
        }

        return {
          id: `billboard-hot100-${rankNumber}`,
          name: entry.title,
          artists: [{ id: `artist-${entry.artist.replace(/\s+/g, '-').toLowerCase()}`, name: entry.artist }],
          album: { 
            id: `album-${entry.title.replace(/\s+/g, '-').toLowerCase()}`,
            name: entry.title, 
            images: [{ url: imageUrl, height: 300, width: 300 }]
          },
          // duration_ms and preview_url are not available from Billboard
        };
      }); // End of map

    // Now filter out the nulls using the type predicate
    const initialTracks: Track[] = mappedTracks.filter((track): track is Track => track !== null);

    console.log(`[API Billboard Hot 100] Initially transformed ${initialTracks.length} tracks.`);

    // --- Enhance tracks with Spotify images ---
    const spotifyToken = await getClientCredentialsToken();
    let enhancedTracks: Track[] = initialTracks; // Start with initially transformed tracks

    if (spotifyToken) {
      console.log('[API Billboard Hot 100] Starting Spotify search to enhance images...');
      const searchPromises = initialTracks.map(async (track) => {
        const trackName = track.name;
        // Use the first artist's name for the search query
        const artistName = track.artists?.[0]?.name;

        if (!trackName || !artistName) {
          console.warn(`[API Billboard Hot 100] Skipping Spotify search for track ID ${track.id} due to missing name/artist.`);
          return track; // Return original track if no name/artist
        }

        // Construct Spotify search query (limit to 1 result)
        const searchQuery = encodeURIComponent(`track:"${trackName}" artist:"${artistName}"`);
        const searchEndpoint = `/search?q=${searchQuery}&type=track&limit=1`;

        try {
          const searchResults = await fetchSpotifyApi(searchEndpoint, spotifyToken);
          const foundTrack = searchResults?.tracks?.items?.[0];

          if (foundTrack && foundTrack.album?.images?.length > 0) {
            console.log(`[API Billboard Hot 100] Found Spotify image AND ID for: ${trackName}`);
            // Return a new track object with updated album images AND Spotify ID
            return {
              ...track,
              // Overwrite ID with Spotify's ID
              id: foundTrack.id, 
              album: {
                ...track.album,
                // Overwrite images with those found from Spotify
                images: foundTrack.album.images.map((img: any) => ({ 
                  url: img.url,
                  height: img.height,
                  width: img.width
                })),
              },
              // Optionally update other fields if available and desired
              preview_url: foundTrack.preview_url, // Add preview URL if available
              duration_ms: foundTrack.duration_ms, // Add duration if available
            };
          } else if (foundTrack) {
            // Found track but no images, still update ID and other data
            console.log(`[API Billboard Hot 100] Found Spotify ID (no image) for: ${trackName}`);
            return {
              ...track,
              id: foundTrack.id, // Update ID
              preview_url: foundTrack.preview_url,
              duration_ms: foundTrack.duration_ms,
              // Keep placeholder image
            };
          } else {
            console.log(`[API Billboard Hot 100] No Spotify match found for: ${trackName}. Keeping Billboard ID.`);
          }
        } catch (searchError) {
          console.error(`[API Billboard Hot 100] Error searching Spotify for "${trackName}":`, searchError);
          // Keep original track if search fails
        }
        // Return original track if search fails or no image found
        return track;
      });

      // Wait for all search promises to complete
      enhancedTracks = await Promise.all(searchPromises);
      console.log('[API Billboard Hot 100] Finished Spotify image enhancement.');

    } else {
      console.warn('[API Billboard Hot 100] Could not get Spotify token, skipping image enhancement.');
    }

    console.log(`[API Billboard Hot 100] Returning ${enhancedTracks.length} tracks.`);
    return NextResponse.json({ tracks: enhancedTracks });

  } catch (error: any) {
    console.error('[API Billboard Hot 100] Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error processing Billboard request', details: error.message }, { status: 500 });
  }
}