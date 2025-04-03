import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("API Route: Featured Playlists called");
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization header in featured-playlists request');
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }
    
    // Get country and limit from query params (optional)
    const url = new URL(request.url);
    const country = url.searchParams.get('country') || 'US';
    const limit = url.searchParams.get('limit') || '10';
    
    console.log(`Fetching featured playlists with country=${country}, limit=${limit}`);
    
    // Forward the request to Spotify API with the same token
    const response = await fetch(
      `https://api.spotify.com/v1/browse/featured-playlists?country=${country}&limit=${limit}`,
      {
        headers: {
          'Authorization': authHeader
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      console.error(`Spotify API error for featured-playlists: ${response.status}`);
      return NextResponse.json(
        { error: `Spotify API error: ${response.status}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Featured playlists API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 