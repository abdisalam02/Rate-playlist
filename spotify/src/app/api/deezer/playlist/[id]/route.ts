import { NextRequest, NextResponse } from 'next/server';

// Interface for a simplified Deezer track structure (adjust as needed based on actual API response)
interface SimplifiedDeezerTrack {
    id: number | string;
    title: string;
    artist?: { id: number | string; name: string };
    album?: { id: number | string; title: string; cover_medium?: string };
    duration?: number;
    preview?: string;
    // Add other relevant fields you need from the Deezer API
}

/**
 * Fetches track data for a specific Deezer playlist.
 * Returns a simplified structure focusing on essential track details.
 */
async function fetchDeezerPlaylistTracks(playlistId: string, limit: number = 50): Promise<SimplifiedDeezerTrack[]> {
    const url = `https://api.deezer.com/playlist/${playlistId}/tracks?limit=${limit}`;
    console.log(`[API Deezer Playlist - Simplified] Fetching tracks from ${url}`);
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[API Deezer Playlist - Simplified] Deezer API error (${response.status}) for playlist ${playlistId}: ${errorBody}`);
            throw new Error(`Failed to fetch Deezer playlist tracks: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Check if 'data' contains the tracks or if it's nested (e.g., data.data)
        const tracks = data?.data || []; 

        if (!Array.isArray(tracks)) {
            console.error(`[API Deezer Playlist - Simplified] Unexpected data format received for playlist ${playlistId}. Expected an array.`, data);
            return [];
        }

        console.log(`[API Deezer Playlist - Simplified] Received ${tracks.length} tracks from Deezer for playlist ${playlistId}.`);
        // Return the raw track objects as received from Deezer
        return tracks as SimplifiedDeezerTrack[]; 
    } catch (error) {
        console.error(`[API Deezer Playlist - Simplified] Error fetching Deezer tracks for playlist ${playlistId}:`, error);
        return []; // Return empty array on error
    }
}

/**
 * GET handler for /api/deezer/playlist/[id]
 * Fetches tracks for a given Deezer playlist ID.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const playlistId = params.id; // Correct usage with the signature above
    const { searchParams } = new URL(request.url);

    if (!playlistId) {
        console.error("[API Deezer Playlist - Simplified] Playlist ID missing unexpectedly.");
        return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50; // Default limit
    if (isNaN(limit) || limit <= 0) {
        return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }

    console.log(`[API Deezer Playlist - Simplified] GET called for ID: ${playlistId}, Limit: ${limit}`);

    try {
        // Fetch raw Deezer tracks using the helper
        const deezerTracks = await fetchDeezerPlaylistTracks(playlistId, limit);
        
        // Return the raw Deezer tracks directly, nested as expected by frontend
        // The discover page fetch helper expects { tracks: { data: [...] } }
        console.log(`[API Deezer Playlist - Simplified] Returning ${deezerTracks.length} raw Deezer tracks for playlist ${playlistId}.`);
        return NextResponse.json({ tracks: { data: deezerTracks } });

    } catch (error) {
        console.error(`[API Deezer Playlist - Simplified] Final catch block error processing playlist ${playlistId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}