import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllTracksForStapleMood } from '@/lib/supabase'; // Import the correct helper

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
      'Access-Control-Allow-Origin': '*', // Adjust CORS as needed
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * GET handler for /api/moods/staple/[id]/tracks
 * Returns all tracks associated with a specific staple mood ID.
 *
 * The [id] parameter in the URL corresponds to the staple_mood_id (UUID).
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const moodId = params.id;
  console.log(`GET /api/moods/staple/${moodId}/tracks - Request URL: ${request.url}`);

  if (!moodId) {
    return createApiResponse(false, null, 'Mood ID is required in the URL path.');
  }

  // Basic UUID validation (optional but recommended)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(moodId)) {
      return createApiResponse(false, null, 'Invalid Mood ID format.');
  }

  try {
    // Optional: Check authentication if these tracks shouldn't be public
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   console.error(`No session found for staple tracks request for mood ${moodId}`);
    //   return createApiResponse(false, null, 'Unauthorized');
    // }
    // console.log(`Session found for user: ${session.user?.email}`);

    // Call the function to get all tracks for the specific mood ID
    const tracks = await getAllTracksForStapleMood(moodId);
    console.log(`Retrieved ${tracks.length} tracks for staple mood ID ${moodId}`);

    return createApiResponse(true, tracks);

  } catch (error) {
    console.error(`Error fetching tracks for staple mood ID ${moodId}:`, error);
    return createApiResponse(false, null,
      `Error fetching tracks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust CORS as needed
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
