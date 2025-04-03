import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("API Route: Popular Tracks called");
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    const useClientCredentials = request.nextUrl.searchParams.get('use_client_credentials') === 'true';
    
    // If we need to use client credentials, make the necessary API call
    let accessToken = null;
    if (useClientCredentials) {
      try {
        console.log("Using client credentials flow for popular tracks");
        
        // Use absolute URL for the Spotify client token endpoint
        const baseUrl = new URL(request.url).origin;
        const tokenUrl = `${baseUrl}/api/auth/spotify-client-token`;
        
        console.log(`Fetching client token from: ${tokenUrl}`);
        const tokenResponse = await fetch(tokenUrl, {
          cache: 'no-store'
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
          console.log("Successfully obtained client credentials token");
        } else {
          console.error(`Failed to get client credentials token: ${tokenResponse.status}`);
        }
      } catch (error) {
        console.error("Error fetching client credentials token:", error);
      }
    }
    
    // Use client token or fall back to auth header
    const finalAuthHeader = accessToken 
      ? `Bearer ${accessToken}` 
      : authHeader;
      
    if (!finalAuthHeader) {
      console.error('No authorization method available for popular tracks request');
      return NextResponse.json({ error: 'No authorization available' }, { status: 401 });
    }
    
    // Get limit from query params (optional)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Use Today's Top Hits playlist ID
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    
    console.log(`Fetching popular tracks from playlist (${playlistId}) with limit=${limit}`);
    
    try {
      // Try to get the full playlist to ensure it exists
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          headers: { 'Authorization': finalAuthHeader },
          cache: 'no-store'
        }
      );
      
      if (!playlistResponse.ok) {
        console.error(`Failed to verify playlist: ${playlistResponse.status}`);
        throw new Error(`Playlist fetch failed with status: ${playlistResponse.status}`);
      }
      
      // Then get the tracks
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&market=US`,
        {
          headers: { 'Authorization': finalAuthHeader },
          cache: 'no-store'
        }
      );
      
      if (!tracksResponse.ok) {
        console.error(`Failed to fetch tracks from playlist: ${tracksResponse.status}`);
        throw new Error(`Tracks fetch failed with status: ${tracksResponse.status}`);
      }
      
      const tracksData = await tracksResponse.json();
      const tracks = tracksData.items
        .map((item: any) => item.track)
        .filter((track: any) => track !== null);
      
      if (tracks.length > 0) {
        console.log(`Successfully retrieved ${tracks.length} popular tracks`);
        return NextResponse.json({ tracks });
      } else {
        console.error("Playlist returned no valid tracks");
        throw new Error("Playlist returned no valid tracks");
      }
    } catch (err) {
      console.error(`Error fetching tracks from playlist:`, err);
      
      // Try mock data as a last resort
      try {
        console.log("Falling back to mock popular tracks data");
        const mockResponse = await fetch(new URL('/api/discover/mock-popular-tracks', request.url).toString());
        if (mockResponse.ok) {
          const mockData = await mockResponse.json();
          return NextResponse.json({ tracks: mockData.tracks });
        }
      } catch (mockErr) {
        console.error("Error fetching mock popular tracks:", mockErr);
      }
      
      return NextResponse.json(
        { error: 'Could not retrieve popular tracks from any source' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Popular tracks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 