import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("API Route: Top 100 Most Streamed Songs called");
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    const useClientCredentials = request.nextUrl.searchParams.get('use_client_credentials') === 'true';
    
    // If we need to use client credentials, make the necessary API call
    let accessToken = null;
    if (useClientCredentials) {
      try {
        console.log("Using client credentials flow for top streamed tracks");
        
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
      console.error('No authorization method available for top streamed tracks request');
      return NextResponse.json({ error: 'No authorization available' }, { status: 401 });
    }
    
    // Get limit from query params (optional)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Top 100 Most Streamed Songs playlist - updated to user-provided playlist
    const playlistId = '5ABHKGoOzxkaa28ttQV9sE';
    
    console.log(`Fetching top streamed songs from playlist (${playlistId}) with limit=${limit}`);
    
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
        console.error(`Failed to verify Top 100 Most Streamed playlist: ${playlistResponse.status}`);
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
        console.error(`Failed to fetch tracks from Top 100 Most Streamed playlist: ${tracksResponse.status}`);
        throw new Error(`Tracks fetch failed with status: ${tracksResponse.status}`);
      }
      
      const tracksData = await tracksResponse.json();
      const tracks = tracksData.items
        .map((item) => item.track)
        .filter((track) => track !== null);
      
      if (tracks.length > 0) {
        console.log(`Successfully retrieved ${tracks.length} all-time most streamed tracks`);
        return NextResponse.json({ tracks });
      } else {
        console.error("Top 100 Most Streamed playlist returned no valid tracks");
        throw new Error("Top 100 Most Streamed playlist returned no valid tracks");
      }
    } catch (err) {
      console.error(`Error fetching tracks from Top 100 Most Streamed playlist:`, err);
      
      // Try mock data as a last resort
      try {
        console.log("Falling back to mock top streamed tracks data");
        const mockResponse = await fetch(new URL('/api/discover/mock-top-streamed', request.url).toString());
        if (mockResponse.ok) {
          const mockData = await mockResponse.json();
          return NextResponse.json({ tracks: mockData.tracks });
        }
      } catch (mockErr) {
        console.error("Error fetching mock top streamed tracks:", mockErr);
      }
      
      return NextResponse.json(
        { error: 'Could not retrieve top streamed tracks from any source' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Top streamed tracks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 