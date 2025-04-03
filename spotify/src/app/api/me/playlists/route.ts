'use server';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Adjust path as needed if your auth options are elsewhere
// import { getMyPlaylists } from '@/lib/spotify'; // Make sure this helper exists

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    console.error('[API /me/playlists] No session or access token found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[API /me/playlists] Fetching playlists for user...');
    // This helper function encapsulates the actual Spotify API call
    const playlistsData = await getMyPlaylists(session.accessToken);

    console.log(`[API /me/playlists] Found ${playlistsData?.items?.length ?? 0} playlists.`);
    return NextResponse.json(playlistsData); // Forward the Spotify API response

  } catch (error: any) {
    console.error('[API /me/playlists] Error fetching playlists from Spotify API:', error);
    // Provide a more specific error message if possible
    const errorMessage = error.message || 'Failed to fetch playlists from Spotify';
    const status = error.status || 500; // Use Spotify's error status if available
    return NextResponse.json(
      { error: 'Failed to communicate with Spotify API', details: errorMessage },
      { status: status }
    );
  }
}

// Ensure you have a corresponding helper function in a file like lib/spotify.ts:
/*
import { SPOTIFY_API_BASE } from '@/config';

export async function getMyPlaylists(accessToken: string, limit = 50) {
  const response = await fetch(`${SPOTIFY_API_BASE}/me/playlists?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
     cache: 'no-store', // Ensure fresh data for user's playlists
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    console.error('Spotify API Error (getMyPlaylists):', errorData);
    throw new Error(errorData.error?.message || `Failed to fetch playlists: ${response.status}`);
  }
  return response.json();
}
*/
