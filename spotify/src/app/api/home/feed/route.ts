import { NextRequest, NextResponse } from 'next/server';

// Environment variables for Spotify credentials
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

// Set to dynamic to ensure data is always fresh
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// --- Types --- (Define structure for clarity)
interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
  images?: { url: string; height?: number; width?: number }[];
}

interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  preview_url?: string | null;
  duration_ms: number;
}

// Minimal type for Spotify API response structure needed
interface SpotifyPlaylistResponse {
  items: {
    track: {
      id: string;
      name: string;
      artists: Artist[];
      album: Album;
      preview_url?: string | null;
      duration_ms: number;
    } | null;
  }[];
}

interface HomeFeedResponse {
  trendingTracks: Track[];
  featuredTracks: Track[];
}

// --- Helper Functions ---\n\n// Get Client Credentials Token
async function getClientCredentialsToken(): Promise<string | null> {
  try {
    console.log('[API Home Feed] Getting client credentials token');
    if (!clientId || !clientSecret) {
      console.error('[API Home Feed] Missing Spotify client credentials');
      return null;
    }
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      cache: 'no-store' // Don't cache the token request itself
    });
    if (!response.ok) {
      console.error(`[API Home Feed] Token request failed: ${response.status}`);
      return null;
    }
    const data = await response.json();
    console.log('[API Home Feed] Successfully obtained client credentials token');
    return data.access_token;
  } catch (error) {
    console.error('[API Home Feed] Error getting client credentials token:', error);
    return null;
  }
}

// Fetch tracks from a specific playlist
async function fetchPlaylistTracks(playlistId: string, accessToken: string, limit: number): Promise<Track[]> {
  console.log(`[API Home Feed] Fetching tracks for playlist ${playlistId} with limit ${limit}`);
  // Request fewer fields for efficiency
  const fields = 'items(track(id,name,artists(id,name),album(id,name,images),duration_ms,preview_url))';
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&fields=${fields}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store' // Fetch fresh playlist data
    });

    if (!response.ok) {
      console.error(`[API Home Feed] Failed to fetch playlist ${playlistId}: ${response.status} ${response.statusText}`);
      return []; // Return empty array on failure
    }

    const data: SpotifyPlaylistResponse = await response.json();

    // Transform and validate data
    return (data.items || [])
      .filter(item => item?.track && item.track.id && item.track.album) // Ensure track and album exist
      .map(item => {
        // Non-null assertion because we filter above
        const track = item.track!;
        let imageUrl = '/placeholder-track.png'; // Default placeholder

        // Robust image check
        if (track.album?.images && Array.isArray(track.album.images) && track.album.images.length > 0) {
          const validImage = track.album.images.find(img => img?.url);
          // Ensure URL is absolute before using it
          if (validImage?.url?.startsWith('http')) {
            imageUrl = validImage.url;
          } else if (validImage?.url) {
             console.warn(`[API Home Feed] Playlist ${playlistId}, Track ${track.id}: Image URL "${validImage.url}" is not absolute, using placeholder.`);
          }
        } else {
           console.warn(`[API Home Feed] Playlist ${playlistId}, Track ${track.id}: Missing album images, using placeholder.`);
        }

        return {
          id: track.id,
          name: track.name || 'Unknown Track',
          artists: track.artists || [{ id: 'unknown', name: 'Unknown Artist' }],
          album: {
            id: track.album.id,
            name: track.album.name || 'Unknown Album',
            // Ensure the images array structure is correct for the client
            images: [{ url: imageUrl, height: 300, width: 300 }]
          },
          preview_url: track.preview_url || null,
          duration_ms: track.duration_ms || 180000,
        };
      });
  } catch (error) {
    console.error(`[API Home Feed] Error fetching or processing playlist ${playlistId}:`, error);
    return []; // Return empty on error
  }
}

// --- Main GET Handler ---
export async function GET(request: NextRequest) {
  console.log('[API Home Feed] GET /api/home/feed called');
  try {
    const accessToken = await getClientCredentialsToken();
    if (!accessToken) {
      // Service Unavailable: Couldn't get necessary Spotify token
      return NextResponse.json({ error: 'Failed to authenticate with Spotify service' }, { status: 503 });
    }

    // Use different playlist IDs for testing
    const trendingPlaylistId = '37i9dQZF1DX0XUsuxWHRQd'; // RapCaviar
    const featuredPlaylistId = '37i9dQZF1DX10zKzsJ2jva'; // Viva Latino

    const limit = 6; // Fetch 6 items for each section initially

    // Fetch both playlists concurrently using the obtained token
    const [trendingTracks, featuredTracks] = await Promise.all([
      fetchPlaylistTracks(trendingPlaylistId, accessToken, limit),
      fetchPlaylistTracks(featuredPlaylistId, accessToken, limit)
    ]);

    // Prepare response data
    const responseData: HomeFeedResponse = {
      trendingTracks: trendingTracks.slice(0, limit), // Ensure limit is respected even if API returned more
      featuredTracks: featuredTracks.slice(0, limit)
    };

    // Log success
    console.log(`[API Home Feed] Successfully fetched and processed data. Returning ${responseData.trendingTracks.length} trending, ${responseData.featuredTracks.length} featured tracks.`);

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[API Home Feed] Uncaught Internal Server Error:', error);
    // Generic error for unexpected issues during execution
    return NextResponse.json({ error: 'Internal Server Error processing home feed request', details: error.message }, { status: 500 });
  }
}


