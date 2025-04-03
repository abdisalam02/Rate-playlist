import { NextRequest, NextResponse } from 'next/server';
import { fetchSpotifyApi } from '../../../../lib/spotify'; // Correct relative path (4 levels up)

// Set to dynamic to ensure data is always fresh
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define local types matching src/types.d.ts for safety
interface Image {
  url: string;
  height?: number;
  width?: number;
}
interface Artist {
  id: string;
  name: string;
  images?: Image[];
}
interface Album {
  id: string;
  name: string;
  images?: Image[];
  release_date?: string;
}
interface Track {
  id: string;
  name: string;
  artists?: Artist[];
  album?: Album;
  preview_url?: string | null;
  duration_ms?: number;
  explicit?: boolean;
}

// Define expected structure from Deezer Chart API
interface DeezerTrack {
  id: number; // Deezer ID
  title: string;
  link: string;
  duration: number;
  rank: number;
  explicit_lyrics: boolean;
  preview: string;
  artist: {
    id: number;
    name: string;
    link: string;
    picture: string;
    picture_small: string;
    picture_medium: string;
    picture_big: string;
    picture_xl: string;
  };
  album: {
    id: number;
    title: string;
    cover: string;
    cover_small: string;
    cover_medium: string;
    cover_big: string;
    cover_xl: string;
  };
  id_spotify?: string; // Optional Spotify ID
}

interface DeezerChartResponse {
  data: DeezerTrack[];
  total: number;
}

// --- Helper Function for Spotify Client Credentials (Duplicate - refactor later) ---
const getClientCredentialsToken = async (): Promise<string | null> => { 
  console.warn("[API Deezer Chart] Using placeholder getClientCredentialsToken for Spotify search"); 
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[API Deezer Chart] Missing Spotify client ID or secret for search.");
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
        console.error(`[API Deezer Chart] Failed to get Spotify token: ${response.status}`); 
        return null; 
    }
    const data = await response.json();
    console.log("[API Deezer Chart] Got Spotify token for search.");
    return data.access_token;
  } catch (error) { 
      console.error("[API Deezer Chart] Error fetching Spotify token:", error); 
      return null; 
  }
};

// Define type for Spotify Search result item we care about
interface SpotifySearchResultItem {
  id: string;
  preview_url?: string | null; // Make optional here to match potential undefined
  duration_ms?: number;      // Make optional here
}

// Define type for the result of the mapping within Promise.all
interface SpotifyIdMappingResult {
  deezerId: string;
  spotifyData: {
    spotifyId: string;
    preview_url?: string | null; // Allow undefined
    duration_ms?: number;      // Allow undefined
  };
}

export async function GET(request: NextRequest) {
  console.log('[API Deezer Chart] GET called');
  const deezerChartUrl = 'https://api.deezer.com/chart/0/tracks';
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 20; 

  try {
    // 1. Fetch from Deezer
    console.log(`[API Deezer Chart] Fetching from ${deezerChartUrl}`);
    const deezerResponse = await fetch(deezerChartUrl, { method: 'GET', cache: 'no-store' });
    if (!deezerResponse.ok) { 
        const errorText = await deezerResponse.text();
        console.error(`[API Deezer Chart] Deezer API request failed: ${deezerResponse.status} ${deezerResponse.statusText}, Body: ${errorText}`);
        return NextResponse.json({ error: `Failed Deezer chart request: ${deezerResponse.statusText}` }, { status: deezerResponse.status }); 
    }

    const deezerData: DeezerChartResponse = await deezerResponse.json();
    console.log(`[API Deezer Chart] Received ${deezerData?.data?.length} tracks from Deezer.`);
    if (!deezerData?.data?.length) { return NextResponse.json({ tracks: [] }); }

    // 2. Initial Transform (Deezer -> Track format)
    const initialTracks: Track[] = deezerData.data.slice(0, limit).map((dTrack: DeezerTrack): Track => {
      const trackId = dTrack.id_spotify || `deezer-${dTrack.id}`;
      const imageUrl = dTrack.album?.cover_xl || dTrack.album?.cover_big || dTrack.album?.cover_medium || dTrack.album?.cover_small || dTrack.album?.cover || '/placeholder-album.png';
      return {
        id: trackId,
        name: dTrack.title,
        artists: [{ id: `deezer-artist-${dTrack.artist.id}`, name: dTrack.artist.name }],
        album: { id: `deezer-album-${dTrack.album.id}`, name: dTrack.album.title, images: [{ url: imageUrl, height: 500, width: 500 }] }, // Use defined Image type
        preview_url: dTrack.preview, 
        duration_ms: dTrack.duration * 1000, 
        explicit: dTrack.explicit_lyrics,
      };
    });

    // 3. Identify tracks needing Spotify ID lookup
    const tracksToLookup = initialTracks.filter(track => track.id.startsWith('deezer-'));
    let spotifyIdMap = new Map<string, SpotifyIdMappingResult['spotifyData']>(); // Use refined type

    // 4. Spotify Search (if needed)
    if (tracksToLookup.length > 0) {
      console.log(`[API Deezer Chart] Found ${tracksToLookup.length} tracks needing Spotify ID lookup.`);
      const spotifyToken = await getClientCredentialsToken(); 
      if (spotifyToken) {
        // Specify the return type of the async map function
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
              // Return the defined mapping result type
              return { 
                deezerId: track.id, 
                spotifyData: {
                   spotifyId: foundSpotifyTrack.id, 
                   preview_url: foundSpotifyTrack.preview_url, // Can be string | null | undefined
                   duration_ms: foundSpotifyTrack.duration_ms  // Can be number | undefined
                }
              };
            }
          } catch (searchError) {
            console.error(`[API Deezer Chart] Spotify search failed for ${trackName}:`, searchError);
          }
          return null; // Indicate search failed or no match
        });

        const searchResults = await Promise.all(searchPromises);
        
        // Filter using the defined result type
        const validResults = searchResults.filter(
            (result): result is SpotifyIdMappingResult => result !== null
        );
        spotifyIdMap = new Map(validResults.map(result => [result.deezerId, result.spotifyData]));

        console.log(`[API Deezer Chart] Successfully mapped ${spotifyIdMap.size} tracks to Spotify IDs.`);
      } else {
        console.warn('[API Deezer Chart] Could not get Spotify token for search, skipping ID lookup.');
      }
    }

    // 5. Final ID Update
    const finalTracks: Track[] = initialTracks.map(track => {
      if (track.id.startsWith('deezer-') && spotifyIdMap.has(track.id)) {
        const spotifyData = spotifyIdMap.get(track.id)!;
        console.log(`[API Deezer Chart] Updating ID for ${track.name} from ${track.id} to ${spotifyData.spotifyId}`);
        return {
          ...track,
          id: spotifyData.spotifyId, // Update the ID!
          preview_url: spotifyData.preview_url ?? track.preview_url, // Update if available
          duration_ms: spotifyData.duration_ms ?? track.duration_ms, // Update if available
        };
      }
      return track; // Return original track if no update needed
    });

    // 6. Return Enhanced List
    console.log(`[API Deezer Chart] Returning ${finalTracks.length} final tracks.`);
    return NextResponse.json({ tracks: finalTracks });

  } catch (error: any) {
    console.error('[API Deezer Chart] Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error processing Deezer chart request', details: error.message }, { status: 500 });
  }
} 