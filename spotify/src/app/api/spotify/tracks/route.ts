import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Adjust path as needed
import { fetchWithToken } from '@/app/utils/api'; // Assuming you have this utility

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/spotify/tracks?ids={comma-separated-track-ids}
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing required "ids" query parameter' }, { status: 400 });
  }

  // Validate IDs format somewhat (basic check for comma separation, non-empty)
  const trackIds = ids.split(',').filter(id => id.trim() !== '');
  if (trackIds.length === 0) {
      return NextResponse.json({ error: 'No valid track IDs provided in "ids" parameter' }, { status: 400 });
  }
   // Spotify limits fetching 50 tracks at a time
   if (trackIds.length > 50) {
      return NextResponse.json({ error: 'Cannot fetch more than 50 tracks at a time' }, { status: 400 });
   }

  console.log(`[API /spotify/tracks] Fetching details for IDs: ${trackIds.join(',')}`);

  try {
    const spotifyApiUrl = `https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`;

    // Use fetchWithToken utility
    const spotifyData = await fetchWithToken(spotifyApiUrl, session.accessToken);

    // Check if Spotify returned the expected structure
    if (!spotifyData || !Array.isArray(spotifyData.tracks)) {
        console.error("[API /spotify/tracks] Unexpected response format from Spotify:", spotifyData);
        // It's possible Spotify returned an error object instead of {tracks: []}
        // Return a 502 Bad Gateway if upstream response is invalid
        return NextResponse.json({ error: 'Received invalid data format from Spotify tracks endpoint' }, { status: 502 });
    }

    // Filter out null tracks in case Spotify returns null for invalid IDs
    const validTracks = spotifyData.tracks.filter((track: any) => track !== null);

    console.log(`[API /spotify/tracks] Successfully fetched details for ${validTracks.length} tracks.`);
    
    // Return data in the format expected by the frontend: { tracks: [...] }
    return NextResponse.json({ tracks: validTracks });

  } catch (error: any) {
    console.error('[API /spotify/tracks] Error fetching track details:', error);
    return NextResponse.json({ 
        error: 'Failed to fetch track details from Spotify', 
        details: error.message || 'Unknown error' 
    }, { status: 500 }); // Use 500 for internal server errors
  }
}
