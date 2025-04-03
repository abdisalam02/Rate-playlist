import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addTrackToUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { checkDbConnection, checkTableExists } from '@/lib/db-status';

/**
 * Helper function to create standardized API responses
 */
function createApiResponse(data: any, status = 200, error = null) {
  const timestamp = new Date().toISOString();
  const responseBody = {
    success: !error,
    timestamp,
    data: error ? null : data,
    error: error ? { message: error.message || 'Unknown error', details: error } : null
  };

  return NextResponse.json(responseBody, {
    status: error ? (error.status || 500) : status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * POST handler for /api/moods/user-moods/[id]/track
 * Adds a track to a user mood
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  console.log(`\n==== POST ${request.url} ====`);
  console.log(`API: Received POST request to add track to user mood ${params.id}`);
  
  try {
    // Step 1: Check database connection
    const dbStatus = await checkDbConnection();
    if (!dbStatus.connected) {
      console.error('API: Database connection failed:', dbStatus.message);
      return createApiResponse(null, 503, { 
        message: 'Database connection unavailable', 
        details: dbStatus.message, 
        status: 503 
      });
    }
    
    // Step 2: Check if required tables exist
    const moodsTableExists = await checkTableExists('user_moods');
    const tracksTableExists = await checkTableExists('mood_tracks');
    
    if (!moodsTableExists || !tracksTableExists) {
      const missingTables = [];
      if (!moodsTableExists) missingTables.push('user_moods');
      if (!tracksTableExists) missingTables.push('mood_tracks');
      
      console.error(`API: Required tables do not exist: ${missingTables.join(', ')}`);
      return createApiResponse(null, 500, { 
        message: 'Required database tables do not exist', 
        details: `Missing tables: ${missingTables.join(', ')}`, 
        status: 500 
      });
    }
    
    // Step 3: Verify authenticated session
    console.log('API: Verifying user session...');
    const session = await getServerSession(authOptions);
    console.log('API: Session found:', !!session);
    
    if (!session?.user?.email) {
      console.error('API: Unauthorized access attempt - no valid session');
      return createApiResponse(null, 401, { 
        message: 'Unauthorized', 
        details: 'No valid session found', 
        status: 401 
      });
    }

    // Step 4: Get the user ID
    const userId = await getUserId();
    if (!userId) {
      console.error('API: User ID not found for session user');
      return createApiResponse(null, 404, { 
        message: 'User not found', 
        details: 'Could not find user ID for current session', 
        status: 404 
      });
    }

    // Step 5: Parse the request body
    console.log('API: Parsing request body');
    const body = await request.json();
    console.log('API: Request body:', body);
    
    // Check for required track ID
    if (!body.track_id) {
      console.error('API: Missing track_id in request body');
      return createApiResponse(null, 400, { 
        message: 'Bad request', 
        details: 'track_id is required', 
        status: 400 
      });
    }
    
    // Step 6: Add the track to the user mood
    console.log(`API: Adding track ${body.track_id} to user mood ${params.id}`);
    const addedTrack = await addTrackToUserMood(userId, params.id, {
      track_id: body.track_id,
      track_name: body.track_name || 'Unknown Track',
      artist_name: body.artist_name || 'Unknown Artist',
      track_image: body.track_image || null
    });
    
    console.log('API: Track added successfully:', addedTrack);
    return createApiResponse(addedTrack);
  } catch (error) {
    console.error('API: Unexpected error adding track to user mood:', error);
    return createApiResponse(null, 500, { 
      message: 'Failed to add track to user mood', 
      details: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 