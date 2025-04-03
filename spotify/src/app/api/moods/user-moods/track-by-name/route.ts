import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMoodByName, addTrackToUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

// Standardized response format
function createApiResponse(success: boolean, data: any = null, message: string = '') {
  return NextResponse.json({
    success,
    timestamp: new Date().toISOString(),
    data,
    message
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// POST to add a track to a user mood by mood name
export async function POST(request: Request) {
  console.log(`POST /api/moods/user-moods/track-by-name - Adding track to user mood by name`);
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.error('Unauthorized attempt to add track to user mood');
      return createApiResponse(false, null, 'Unauthorized');
    }
    
    // Get user ID
    const userId = await getUserId();
    
    if (!userId) {
      console.error('User ID not found for authenticated user');
      return createApiResponse(false, null, 'User not found');
    }
    
    // Get data from request body
    const { mood_name, track_id, track_name, artist_name, track_image } = await request.json();
    console.log('Request data:', { mood_name, track_id, track_name, artist_name, track_image });
    
    if (!mood_name || !track_id || !track_name || !artist_name) {
      console.error('Missing required data');
      return createApiResponse(false, null, 'Missing required data (mood_name, track_id, track_name, artist_name)');
    }
    
    // Find the mood by name
    const mood = await getUserMoodByName(userId, mood_name);
    
    if (!mood) {
      console.error(`Mood with name "${mood_name}" not found for user ${userId}`);
      return createApiResponse(false, null, `Mood with name "${mood_name}" not found`);
    }
    
    // Add track to the found mood
    const trackData = {
      track_id,
      track_name,
      artist_name,
      track_image
    };
    
    const result = await addTrackToUserMood(userId, mood.id, trackData);
    console.log('Track added to user mood:', result);
    
    return createApiResponse(true, result, `Track added to "${mood_name}" mood successfully`);
  } catch (error) {
    console.error('Error adding track to user mood by name:', error);
    return createApiResponse(false, null, 
      `Error adding track to user mood: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 