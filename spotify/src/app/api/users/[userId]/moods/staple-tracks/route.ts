import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkDbConnection } from '@/lib/db-status';

// Helper function for standardized API responses
function createApiResponse(success: boolean, data: any = null, message: string = '') {
  return NextResponse.json({
    success,
    timestamp: new Date().toISOString(),
    data,
    message
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const awaitedParams = await params;
  const userIdParam = awaitedParams.userId;
  
  console.log(`GET /api/users/${userIdParam}/moods/staple-tracks - Fetching staple mood tracks for user`);

  if (!userIdParam) {
    console.error('[API Staple Tracks] User ID parameter is missing.');
    return createApiResponse(false, null, 'User ID parameter is required');
  }

  // Optional: Check DB connection
  // if (!await checkDbConnection()) {
  //   return createApiResponse(false, null, 'Database connection failed');
  // }

  try {
    // Directly use userIdParam (which is the UUID) to query mood_tracks
    const { data, error } = await supabase
      .from('mood_tracks')
      .select(`
        id,
        track_id,
        track_name,
        artist_name,
        track_image,
        added_at,
        staple_mood_id
      `)
      .eq('user_id', userIdParam) // <-- Use userIdParam directly
      .not('staple_mood_id', 'is', null);

    if (error) {
      console.error('Error fetching staple mood tracks:', error);
      return createApiResponse(false, null, `Failed to fetch staple mood tracks: ${error.message}`);
    }

    console.log(`Found ${data?.length || 0} staple mood tracks for user UUID ${userIdParam}`);
    
    // Return the tracks directly in the 'tracks' property to match frontend expectation
    return NextResponse.json({ tracks: data || [] }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust for production
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Unexpected error fetching staple mood tracks:', error);
    return createApiResponse(false, null, `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
