import { NextRequest, NextResponse } from 'next/server';
import { fetchSpotifyApi } from '../../../../lib/spotify'; // Relative path

// Set to dynamic to ensure data is always fresh
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define local types matching src/types.d.ts for safety
interface Image { url: string; height?: number; width?: number; }
interface Artist { id: string; name: string; images?: Image[]; }
interface Album { id: string; name: string; images?: Image[]; release_date?: string; }
interface Track { id: string; name: string; artists?: Artist[]; album?: Album; preview_url?: string | null; duration_ms?: number; explicit?: boolean; }

// Assuming Track, Artist, Album types are globally available from src/types.d.ts
// interface Track { ... }
// interface Artist { ... }
// interface Album { ... }

// Define expected structure from Deezer Playlist Tracks API
// Note: This structure might differ slightly from the Chart API
interface DeezerPlaylistTrack {
  id: number; // Deezer ID
  title: string;
  link: string;
  duration: number;
  rank?: number; // Rank might not be present in playlist tracks
  explicit_lyrics: boolean;
  preview: string;
  md5_image?: string; // Sometimes used for images
  artist: {
    id: number;
    name: string;
    link?: string;
    // Playlist track artist might have fewer image details than chart
  };
  album: {
    id: number;
    title: string;
    cover?: string;
    cover_small?: string;
    cover_medium?: string;
    cover_big?: string;
    cover_xl?: string;
    md5_image?: string; // Album might use md5 image
  };
  id_spotify?: string; // Optional Spotify ID
}

interface DeezerPlaylistTracksResponse {
  data: DeezerPlaylistTrack[];
  total: number;
}

// Define types for Spotify Search
interface SpotifySearchResultItem { id: string; preview_url?: string | null; duration_ms?: number; }
interface SpotifyIdMappingResult { deezerId: string; spotifyData: { spotifyId: string; preview_url?: string | null; duration_ms?: number; }; }

// --- Helper Function for Spotify Client Credentials (Duplicate - refactor later) ---
const getClientCredentialsToken = async (): Promise<string | null> => { 
  console.warn("[API Deezer Playlist] Using placeholder getClientCredentialsToken for Spotify search"); 
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) { console.error("[API Deezer Playlist] Missing Spotify client ID/secret."); return null; }
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', { /* ...options... */ 
       method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded','Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`}, body: new URLSearchParams({ grant_type: 'client_credentials' }), cache: 'no-store'
    });
    if (!response.ok) { console.error(`[API Deezer Playlist] Failed Spotify token: ${response.status}`); return null; }
    const data = await response.json();
    console.log("[API Deezer Playlist] Got Spotify token for search.");
    return data.access_token;
  } catch (error) { console.error("[API Deezer Playlist] Error fetching Spotify token:", error); return null; }
};

export async function GET(
  request: NextRequest, 
  // Use destructured params signature with id as required string
  { params }: { params: { id: string } }
) {
  // Access id directly from the destructured params
  const playlistId = params.id; // id is now guaranteed by type

  if (!playlistId) {
    // This check might be redundant now due to type, but safe to keep
    console.error("[API Deezer Playlist] Playlist ID missing unexpectedly despite route match.");
    return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
  }

  console.log(`[API Deezer Playlist] GET called for ID: ${playlistId}`);
  const deezerPlaylistUrl = `https://api.deezer.com/playlist/${playlistId}/tracks`;
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 25; // Default limit for playlist tracks

  try {
    console.log(`[API Deezer Playlist] Fetching from ${deezerPlaylistUrl}`);
    const response = await fetch(`${deezerPlaylistUrl}?limit=${limit}`, { // Add limit to URL
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Deezer Playlist] Deezer API request failed: ${response.status} ${response.statusText}`);
      console.error(`[API Deezer Playlist] Deezer Error Body: ${errorText}`);
      return NextResponse.json({ error: `Failed Deezer playlist request: ${response.statusText}` }, { status: response.status });
    }

    const data: DeezerPlaylistTracksResponse = await response.json();
    console.log(`[API Deezer Playlist] Received ${data?.data?.length} tracks from Deezer for playlist ${playlistId}.`);

    if (!data || !data.data || data.data.length === 0) {
      console.warn(`[API Deezer Playlist] No tracks received from Deezer for playlist ${playlistId}.`);
      return NextResponse.json({ tracks: [] });
    }

    // 2. Initial Transform
    const initialTracks: Track[] = data.data.map((dTrack: DeezerPlaylistTrack): Track => {
       // ... (mapping logic as before, using id_spotify || deezer-id) ...
       const trackId = dTrack.id_spotify || `deezer-${dTrack.id}`;
       const imageUrl = dTrack.album?.cover_xl || '...' || '/placeholder-album.png'; // Simplified
       return { id: trackId, name: dTrack.title, artists: [{ id: `deezer-artist-${dTrack.artist.id}`, name: dTrack.artist.name }], album: { id: `deezer-album-${dTrack.album.id}`, name: dTrack.album.title, images: [{ url: imageUrl, height: 500, width: 500 }] }, preview_url: dTrack.preview, duration_ms: dTrack.duration * 1000, explicit: dTrack.explicit_lyrics };
    });

    // 3. Identify tracks needing Spotify ID lookup
    const tracksToLookup = initialTracks.filter(track => track.id.startsWith('deezer-'));
    let spotifyIdMap = new Map<string, SpotifyIdMappingResult['spotifyData']>();

    // 4. Spotify Search (if needed) - Identical logic to chart route
    if (tracksToLookup.length > 0) {
      console.log(`[API Deezer Playlist] Found ${tracksToLookup.length} tracks needing Spotify ID lookup for playlist ${playlistId}.`);
      const spotifyToken = await getClientCredentialsToken(); 
      if (spotifyToken) {
        const searchPromises = tracksToLookup.map(async (track): Promise<SpotifyIdMappingResult | null> => {
          const trackName = track.name;
          const artistName = track.artists?.[0]?.name; 
          if (!trackName || !artistName) return null;
          const searchQuery = encodeURIComponent(`track:"${trackName}" artist:"${artistName}"`);
          const searchEndpoint = `/search?q=${searchQuery}&type=track&limit=1`;
          try {
            const searchResults: any = await fetchSpotifyApi(searchEndpoint, spotifyToken);
            const foundSpotifyTrack: SpotifySearchResultItem | undefined = searchResults?.tracks?.items?.[0];
            if (foundSpotifyTrack?.id) {
              return { deezerId: track.id, spotifyData: { spotifyId: foundSpotifyTrack.id, preview_url: foundSpotifyTrack.preview_url, duration_ms: foundSpotifyTrack.duration_ms } };
            }
          } catch (searchError) { console.error(`[API Deezer Playlist] Spotify search failed for ${trackName}:`, searchError); }
          return null;
        });
        const searchResults = await Promise.all(searchPromises);
        const validResults = searchResults.filter((result): result is SpotifyIdMappingResult => result !== null);
        spotifyIdMap = new Map(validResults.map(result => [result.deezerId, result.spotifyData]));
        console.log(`[API Deezer Playlist] Mapped ${spotifyIdMap.size} tracks to Spotify IDs for playlist ${playlistId}.`);
      } else { console.warn('[API Deezer Playlist] Could not get Spotify token, skipping ID lookup.'); }
    }

    // 5. Final ID Update - Identical logic to chart route
    const finalTracks: Track[] = initialTracks.map(track => {
      if (track.id.startsWith('deezer-') && spotifyIdMap.has(track.id)) {
        const spotifyData = spotifyIdMap.get(track.id)!;
        return { ...track, id: spotifyData.spotifyId, preview_url: spotifyData.preview_url ?? track.preview_url, duration_ms: spotifyData.duration_ms ?? track.duration_ms };
      }
      return track;
    });

    // 6. Return Enhanced List
    console.log(`[API Deezer Playlist] Returning ${finalTracks.length} final tracks for playlist ${playlistId}.`);
    return NextResponse.json({ tracks: finalTracks });

  } catch (error: any) {
    console.error(`[API Deezer Playlist] Internal Server Error for ID ${playlistId}:`, error);
    return NextResponse.json({ error: `Internal Server Error processing Deezer playlist ${playlistId}`, details: error.message }, { status: 500 });
  }
} 