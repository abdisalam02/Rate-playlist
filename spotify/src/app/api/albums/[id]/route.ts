import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const albumId = context.params?.id;
    
    if (!albumId) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }
    
    if (session?.accessToken) {
      console.log("Using user session token for album API request");
      try {
        const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const albumData = await response.json();
          return NextResponse.json(albumData);
        }
        
        if (response.status === 401) {
          console.log("User token expired, falling back to client credentials");
        } else {
          return NextResponse.json(
            { error: `Failed to fetch album data: ${response.statusText}` },
            { status: response.status }
          );
        }
      } catch (error) {
        console.error("Error using user token:", error);
      }
    }
    
    console.log("Using client credentials for album API request");
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
    
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch album data: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const albumData = await response.json();
    return NextResponse.json(albumData);
    
  } catch (error) {
    console.error('Error in album GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 