import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Fetching track data for ID: ${params.id}`);
    
    // Get the server session
    const session = await getServerSession(authOptions);
    
    // Check for access token
    if (!session?.accessToken) {
      console.error('No access token available for track fetch');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Call the Spotify API to get the track data
    const trackResponse = await fetch(
      `https://api.spotify.com/v1/tracks/${params.id}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        },
        cache: 'no-store'
      }
    );
    
    if (!trackResponse.ok) {
      console.error(`Spotify API error for track ${params.id}: ${trackResponse.status}`);
      
      if (trackResponse.status === 404) {
        return NextResponse.json(
          { error: 'Track not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch track with status: ${trackResponse.status}` },
        { status: trackResponse.status }
      );
    }
    
    const trackData = await trackResponse.json();
    
    // Return the track data
    return NextResponse.json(trackData);
    
  } catch (error: any) {
    console.error('Error in track API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 