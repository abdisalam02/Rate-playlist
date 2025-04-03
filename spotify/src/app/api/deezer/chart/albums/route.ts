import { NextResponse } from 'next/server';
import { DeezerAlbum, DeezerTrack } from '@/app/types/deezer'; 
import { getClientCredentialsToken } from '@/lib/spotify'; // Assuming this utility exists

// Add spotify_id to the transformed type
interface TransformedAlbum {
  id: string; // Deezer ID
  spotify_id: string | null; // Spotify ID
  name: string;
  images?: Array<{ url: string }>;
  artists?: Array<{ id?: string | number; name: string }>; 
  release_date?: string; 
}

// Function to search Spotify for a matching album ID
async function findSpotifyAlbumId(albumTitle: string, artistName: string | undefined): Promise<string | null> {
  if (!albumTitle || !artistName) {
    return null;
  }

  try {
    const token = await getClientCredentialsToken();
    if (!token) {
      console.error("[Spotify Search] Failed to get client credentials token.");
      return null;
    }

    // Construct search query - be specific
    const query = encodeURIComponent(`album:"${albumTitle}" artist:"${artistName}"`);
    const url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`;
    
    console.log(`[Spotify Search] Searching for: ${albumTitle} / ${artistName}`);
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store' // Search results can change
    });

    if (!response.ok) {
      console.error(`[Spotify Search] API error ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    const foundAlbum = data?.albums?.items?.[0];

    if (foundAlbum) {
      console.log(`[Spotify Search] Found match: ${foundAlbum.name} (ID: ${foundAlbum.id})`);
      // Optional: Add stricter matching logic here (e.g., compare release year, track count)
      return foundAlbum.id;
    } else {
      console.log(`[Spotify Search] No match found.`);
      return null;
    }
  } catch (error) {
    console.error("[Spotify Search] Error during search:", error);
    return null;
  }
}

// --- Function to fetch tracks from the New Releases playlist --- 
async function fetchNewReleasePlaylistTracks(limit: number = 50): Promise<DeezerTrack[]> {
  // Deezer Playlist ID for "New Releases" (example, verify if this is the best one)
  const playlistId = '1313621735'; 
  // Fetch more tracks since multiple tracks can belong to the same album
  const trackLimit = limit * 3; // Fetch more tracks initially
  const url = `https://api.deezer.com/playlist/${playlistId}/tracks?limit=${trackLimit}`;
  
  let responseBody = '';
  try {
    console.log(`[API New Albums] Fetching tracks from playlist: ${url}`);
    const response = await fetch(url, { cache: 'no-store' }); 
    responseBody = await response.text(); 
    
    if (!response.ok) {
      console.error(`[API New Albums] Deezer Playlist API Error: ${response.status} ${response.statusText}`, responseBody);
      throw new Error(`Failed to fetch Deezer playlist tracks: ${response.statusText} - ${responseBody}`);
    }
    
    const data = JSON.parse(responseBody); 
    const tracks = data?.data || []; 
    console.log(`[API New Albums] Fetched ${tracks.length} tracks from playlist ${playlistId}.`);
    return tracks;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
         console.error("[API New Albums] Failed to parse JSON response:", error, "\nResponse Body:", responseBody);
         throw new Error("Failed to parse response from Deezer playlist API.");
    } else {
        console.error("[API New Albums] Error fetching from Deezer Playlist API:", error);
         throw error; 
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // This limit applies to the final number of unique albums returned
  const limit = parseInt(searchParams.get('limit') || '20', 10); 

  console.log(`[API New Albums] GET handler started. Target unique albums: ${limit}`);
  try {
    // 1. Fetch tracks from the playlist
    const playlistTracks: DeezerTrack[] = await fetchNewReleasePlaylistTracks(limit);
    
    if (!Array.isArray(playlistTracks)) {
      console.error("[API New Albums] Playlist track fetch did not return an array.");
      throw new Error("Invalid data format fetching playlist tracks.");
    }
    
    // 2. Extract and de-duplicate albums
    const uniqueAlbumsMap = new Map<number, DeezerAlbum>();
    for (const track of playlistTracks) {
        // Ensure track has album data and an ID
        if (track.album && track.album.id && !uniqueAlbumsMap.has(track.album.id)) {
            // Add necessary fields if missing from track.album object (like artist)
            // The standard `/playlist/:id/tracks` response might differ slightly from a direct `/album/:id` call
            uniqueAlbumsMap.set(track.album.id, {
                ...track.album, // Spread existing album data from track
                id: track.album.id, // Ensure ID is present
                title: track.album.title || 'Untitled Album', // Ensure title
                // IMPORTANT: The track's artist might be what we need for the album artist
                // If track.album doesn't have artist info, use track.artist
                artist: track.album.artist || track.artist 
            });
        }
        // Stop collecting once we have enough unique albums to potentially meet the limit
        if (uniqueAlbumsMap.size >= limit * 1.5) { // Fetch a bit extra to account for Spotify misses
             break; 
        }
    }
    const uniqueDeezerAlbums: DeezerAlbum[] = Array.from(uniqueAlbumsMap.values());
    console.log(`[API New Albums] Found ${uniqueDeezerAlbums.length} unique albums from playlist tracks.`);

    // 3. Enrich unique albums with Spotify IDs
    const enrichedAlbums: TransformedAlbum[] = await Promise.all(
        uniqueDeezerAlbums.slice(0, limit * 2).map(async (album) => { // Process slightly more initially
            // Use album.artist if available, otherwise fallback might be needed
            const artistName = album.artist?.name; 
            const spotifyId = await findSpotifyAlbumId(album.title, artistName);
            return {
                id: String(album.id), 
                spotify_id: spotifyId,
                name: album.title, // Use title as the primary name field from Deezer
                images: [{ url: album.cover_xl || album.cover_big || album.cover_medium || album.cover || '' }],
                artists: album.artist ? [{ id: album.artist.id, name: album.artist.name }] : [],
                // release_date might not be available on album object within track, might need separate fetch if crucial
                release_date: album.release_date, 
            };
        })
    );
    
    // Filter out albums where Spotify ID lookup failed, if desired (optional)
    // const finalAlbums = enrichedAlbums.filter(album => album.spotify_id);
    const finalAlbums = enrichedAlbums; // Keep all for now

    console.log(`[API New Albums] Enriched ${finalAlbums.length} albums with Spotify IDs.`);

    // 4. Return the final list, respecting the limit
    return NextResponse.json({ 
        albums: { items: finalAlbums.slice(0, limit) },  
        total: finalAlbums.length // Total available after enrichment might differ
    });

  } catch (error: any) {
    console.error("[API NEW ALBUMS ERROR]", error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch new release albums', error: true }, 
      { status: 500 }
    );
  }
} 