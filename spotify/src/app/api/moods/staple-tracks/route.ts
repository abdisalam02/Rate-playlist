import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStapleMoodTracks } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { checkDbConnection, checkTableExists } from '@/lib/db-status';

/**
 * Helper function to create standardized API responses
 */
function createApiResponse(success: boolean, data: any = null, message: string = '') {
  return NextResponse.json({
    success,
    timestamp: new Date().toISOString(),
    data,
    message
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * GET handler for /api/moods/staple-tracks
 * Returns all tracks associated with staple moods
 */
export async function GET(request: Request) {
  console.log(`GET /api/moods/staple-tracks - Request URL: ${request.url}`);
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // Ensure fallback for empty session.user
    if (session && !session.user) {
      // @ts-ignore: Force create user object if missing
      session.user = { email: null };
    }
    
    // For debugging
    console.log('Session in staple-tracks API:', session ? 'Exists' : 'Null', 
      session?.user ? `User email: ${session.user.email}` : 'No user in session');
    
    // Modified condition to check if session exists even without email
    // This helps debugging and allows development without strict auth
    if (!session) {
      console.error('No session found for staple tracks request');
      // In development, provide test data instead of authorization error
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: returning mock staple tracks');
        return createApiResponse(true, getMockStapleMoodTracks());
      }
      return createApiResponse(false, null, 'Unauthorized');
    }
    
    // Get staple mood tracks - no need for user ID in this case
    const stapleTracks = await getStapleMoodTracks();
    console.log(`Retrieved ${stapleTracks.length} staple mood tracks`);
    
    return createApiResponse(true, stapleTracks);
  } catch (error) {
    console.error('Error fetching staple mood tracks:', error);
    // In development, provide test data on error
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: returning mock staple tracks after error');
      return createApiResponse(true, getMockStapleMoodTracks());
    }
    return createApiResponse(false, null, 
      `Error fetching staple mood tracks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate mock staple mood tracks for testing when database doesn't have any
 */
function getMockStapleMoodTracks() {
  return [
    {
      id: 'mock-happy-track-1',
      staple_mood_id: 'mock-happy',
      mood_name: 'Happy',
      track_id: '4iV5W9uYEdYUVa79Axb7Rh',
      track_name: 'Starboy',
      artist_name: 'The Weeknd',
      track_image: 'https://i.scdn.co/image/ab67616d0000b2738399047ff71200928f5b4be2',
      added_at: new Date().toISOString()
    },
    {
      id: 'mock-happy-track-2',
      staple_mood_id: 'mock-happy',
      mood_name: 'Happy',
      track_id: '0VjIjW4GlUZAMYd2vXMi3b',
      track_name: 'Blinding Lights',
      artist_name: 'The Weeknd',
      track_image: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
      added_at: new Date().toISOString()
    },
    {
      id: 'mock-relaxed-track-1',
      staple_mood_id: 'mock-relaxed',
      mood_name: 'Relaxed',
      track_id: '6DCZcSspjsKoFjzjrWoCdn',
      track_name: 'God\'s Plan',
      artist_name: 'Drake',
      track_image: 'https://i.scdn.co/image/ab67616d0000b273731731446f99d23a3535bd3f',
      added_at: new Date().toISOString()
    },
    {
      id: 'mock-focus-track-1',
      staple_mood_id: 'mock-focus',
      mood_name: 'Focus',
      track_id: '3n3Ppam7vgaVa1iaRUc9Lp',
      track_name: 'Party Monster',
      artist_name: 'The Weeknd',
      track_image: 'https://i.scdn.co/image/ab67616d0000b273e52a59eb13be11ca6f8aca66',
      added_at: new Date().toISOString()
    }
  ];
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 