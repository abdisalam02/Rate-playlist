import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTopStapleTracksPerMood } from '@/lib/supabase';
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
 * Returns the TOP 2 tracks associated with each staple mood
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
        // Consider updating the mock function if needed, or removing it later
        // return createApiResponse(true, getMockStapleMoodTracks()); 
        // For now, let's try the actual call even in dev if no session
        // return createApiResponse(false, null, 'Unauthorized');
      } else {
        return createApiResponse(false, null, 'Unauthorized');
      }
      // Allow dev without session to proceed to actual function call below
      // If this causes issues, uncomment the return statements above.
      console.warn('Proceeding without session in development mode.');
    }
    
    // Call the NEW function to get top tracks
    const topStapleTracks = await getTopStapleTracksPerMood();
    console.log(`Retrieved ${topStapleTracks.length} top staple mood tracks via RPC`);
    
    return createApiResponse(true, topStapleTracks);
  } catch (error) {
    console.error('Error fetching top staple mood tracks:', error);
    // In development, provide test data on error
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: returning empty array after error fetching top tracks');
      // Return empty array instead of mock data on error
      return createApiResponse(true, [], 'Error in development, returning empty array');
    }
    return createApiResponse(false, null, 
      `Error fetching top staple mood tracks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate mock staple mood tracks for testing when database doesn't have any
 * NOTE: This mock data may no longer be suitable if the structure changed.
 */
// function getMockStapleMoodTracks() { ... } // Keep or remove as needed

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