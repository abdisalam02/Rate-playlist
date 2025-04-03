import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }
    
    // Use client credentials flow to get a token
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      }),
      cache: 'no-store'
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Spotify API' },
        { status: 500 }
      );
    }
    
    const accessToken = tokenData.access_token;
    
    // Fetch track data with the client credentials token
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch track data: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const trackData = await response.json();
    
    return NextResponse.json(trackData);
  } catch (error) {
    console.error('Error in public track GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 