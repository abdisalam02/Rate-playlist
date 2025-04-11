import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, AppSession } from '@/lib/auth'; // Import AppSession
import { fetchWithToken } from '@/app/utils/api'; // Import the utility

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyPlaylist {
  id: string;
  name: string;
  images: Array<{ url: string; height: number | null; width: number | null }>;
  owner: { display_name: string; id: string };
  tracks: { total: number };
  public: boolean;
  collaborative: boolean;
  // Add other relevant fields if needed
}

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export async function GET(request: Request) {
  // Corrected: Declare session once with type assertion
  const session: AppSession | null = await getServerSession(authOptions);

  // Check for token AND user spotifyId
  if (!session?.accessToken) {
    console.error("API Route /api/spotify/me/playlists: No access token found in session.");
    return NextResponse.json({ error: 'Not authenticated or token missing' }, { status: 401 });
  }
  const userSpotifyId = session.user?.spotifyId; // Get the user's Spotify ID
  if (!userSpotifyId) {
     console.error("API Route /api/spotify/me/playlists: No Spotify User ID found in session.");
     return NextResponse.json({ error: 'User Spotify ID missing from session' }, { status: 401 }); // Or 500 if unexpected
  }

  const allPlaylists: SpotifyPlaylist[] = [];
  let url: string | null = `${SPOTIFY_API_BASE}/me/playlists?limit=50`; // Start with the first page, max limit

  console.log(`[API /me/playlists] Fetching playlists for user (Spotify ID: ${userSpotifyId}) starting with ${url}`);

  try {
    // Loop to handle pagination
    while (url) {
      console.log(`[API /me/playlists] Fetching page: ${url}`);
      // Assuming fetchWithToken handles potential errors internally or throws them
      const data: SpotifyPlaylistsResponse = await fetchWithToken(url, session.accessToken);
      
      if (data && Array.isArray(data.items)) {
        // CORRECTED: Filter using userSpotifyId for ownership check
        const relevantPlaylists = data.items.filter(playlist => 
             playlist.owner.id === userSpotifyId || playlist.collaborative
         );
        allPlaylists.push(...relevantPlaylists);
        console.log(`[API /me/playlists] Fetched ${data.items.length} playlists, added ${relevantPlaylists.length} relevant ones. Total relevant: ${allPlaylists.length}. Next page: ${data.next}`);
        url = data.next; // Get URL for the next page
      } else {
         console.warn("[API /me/playlists] Unexpected response structure or empty items array:", data);
        url = null; // Stop if data is invalid or no items
      }
      
      // Safety break: avoid potential infinite loops if 'next' URL is weirdly formed
      if(url && !url.startsWith(SPOTIFY_API_BASE)){
          console.error(`[API /me/playlists] Invalid 'next' URL received: ${url}. Stopping pagination.`);
          url = null;
      }
    }

    console.log(`[API /me/playlists] Finished fetching. Returning ${allPlaylists.length} relevant playlists for user (Spotify ID: ${userSpotifyId}).`);
    // Return only essential fields
    const simplifiedPlaylists = allPlaylists.map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.images?.[0]?.url || null, // Use first image as primary
        trackCount: p.tracks.total,
        // Keep ownerId if needed by frontend, but it's the Spotify ID
        // ownerId: p.owner.id, 
        collaborative: p.collaborative
    }));
    
    return NextResponse.json({ playlists: simplifiedPlaylists });

  } catch (error: any) {
    console.error('[API /me/playlists] Error fetching user playlists:', error);
     // Check if error has status code from fetchWithToken
     const status = error.status || 500;
     const message = error.message || 'Failed to fetch playlists';
     const details = error.details || {}; 
    return NextResponse.json({ error: message, details: details }, { status });
  }
}

// Optional: Add revalidation if needed
export const revalidate = 0; // Force dynamic fetching every time
