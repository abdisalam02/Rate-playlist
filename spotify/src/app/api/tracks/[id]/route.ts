import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Define the expected shape of the context containing params
interface RouteContext {
  params: {
    id?: string; // Make id optional to handle cases where it might be missing
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext // Use the defined context type
) {
  try {
    const session = await getServerSession(authOptions);
    // Destructure id from the context object passed as the second argument
    const { params } = context;
    const trackId = params?.id;
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }
    
    // Try to use the user's session token first
    if (session?.accessToken) {
      console.log("Using user session token for track API request");
      try {
        // Fetch track data from Spotify API with user token
        const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          cache: 'no-store'
        });
        
        // If successful, return the data
        if (response.ok) {
          const trackData = await response.json();
          return NextResponse.json(trackData);
        }
        
        // If 401, token might be expired - fall through to client credentials
        if (response.status === 401) {
          console.log("User token expired, falling back to client credentials");
        } else {
          // For other errors, return the error
          return NextResponse.json(
            { error: `Failed to fetch track data: ${response.statusText}` },
            { status: response.status }
          );
        }
      } catch (error) {
        console.error("Error using user token:", error);
        // Fall through to client credentials
      }
    }
    
    // FALLBACK: Use client credentials flow
    console.log("Using client credentials for track API request");
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
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
    console.error('Error in track GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 