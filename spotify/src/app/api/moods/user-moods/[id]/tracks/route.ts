import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMoodTracks, getMoodTracks, addTrackToUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { checkDbConnection, checkTableExists } from '@/lib/db-status';
import { supabase } from '@/lib/supabase';

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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * GET handler for /api/moods/user-moods/[id]/tracks
 * Returns all tracks associated with a specific user mood
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`GET /api/moods/user-moods/${params.id}/tracks - Fetching tracks for user mood`);
  
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // For debugging
    console.log('Session in mood tracks API:', session ? 'Exists' : 'Null', 
      session?.user ? `User email: ${session.user.email}` : 'No user in session');
    
    // In development, we'll be more lenient with authentication
    if (!session?.user?.email) {
      console.log('No authenticated user for mood tracks request');
      
      if (isDevelopment) {
        console.log('Development mode: proceeding without authentication');
        
        // In development, try to find tracks for this mood regardless of user ID
        try {
          console.log(`Dev mode: Fetching any tracks for mood ${params.id} regardless of user`);
          const { data, error } = await supabase
            .from('mood_tracks')
            .select(`
              id,
              user_mood_id,
              user_id,
              track_id,
              track_name,
              artist_name,
              track_image,
              added_at
            `)
            .eq('user_mood_id', params.id)
            .order('added_at', { ascending: false });
            
          if (error) {
            console.error('Error fetching tracks in dev mode:', error);
          } else {
            console.log(`Dev mode: Retrieved ${data.length} tracks for mood ${params.id}`);
            return createApiResponse(true, data);
          }
          
          // If no tracks found, return empty array
          console.log('Dev mode: No tracks found for this mood');
          return createApiResponse(true, []);
        } catch (error) {
          console.error('Exception in dev mode tracks fetch:', error);
          return createApiResponse(true, []);
        }
      } else {
        console.error('Unauthorized attempt to access user mood tracks');
        return createApiResponse(false, null, 'Unauthorized');
      }
    }
    
    // Get user ID
    let userId = await getUserId();
    console.log('Retrieved user ID for GET mood tracks:', userId);
    
    // For development mode, use a fallback user ID if needed
    if (!userId && isDevelopment) {
      userId = '00000000-0000-4000-a000-000000000001'; // Same as the dev user ID
      console.log('Using development user ID:', userId);
    }
    
    if (!userId && session.user.id) {
      console.log(`Using session ID ${session.user.id} as fallback for user ID`);
      userId = session.user.id;
    }
    
    if (!userId) {
      console.error('User ID not found for authenticated user');
      return isDevelopment 
        ? createApiResponse(true, []) 
        : createApiResponse(false, null, 'User not found');
    }
    
    // Debug: List all tracks in the database for this mood
    try {
      console.log(`Checking all tracks for mood ${params.id}`);
      const { data: allTracks, error: allTracksError } = await supabase
        .from('mood_tracks')
        .select('*')
        .eq('user_mood_id', params.id);
        
      if (allTracksError) {
        console.error('Error listing all tracks for mood:', allTracksError);
      } else {
        console.log(`Found ${allTracks.length} total tracks for mood in database:`);
        allTracks.forEach(track => {
          console.log(`- Track ID: ${track.track_id}, Name: ${track.track_name}, User ID: ${track.user_id}`);
        });
        
        // In development, return all tracks regardless of user ID
        if (isDevelopment && allTracks.length > 0) {
          console.log('Development mode: returning all tracks for testing');
          return createApiResponse(true, allTracks);
        }
      }
    } catch (error) {
      console.warn('Error listing all tracks for mood:', error);
    }
    
    // First try mood_tracks table for the specified mood ID
    try {
      console.log(`Fetching tracks from mood_tracks for mood ${params.id}`);
      const { data: moodTracks, error } = await supabase
        .from('mood_tracks')
        .select(`
          id,
          user_mood_id,
          user_id,
          track_id,
          track_name,
          artist_name,
          track_image,
          added_at
        `)
        .eq('user_mood_id', params.id)
        .order('added_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching from mood_tracks:', error);
      } else if (moodTracks && moodTracks.length > 0) {
        console.log(`Retrieved ${moodTracks.length} tracks from mood_tracks`);
        return createApiResponse(true, moodTracks);
      }
    } catch (error) {
      console.error('Exception fetching from mood_tracks:', error);
    }
    
    // If no tracks found in mood_tracks, try the user_mood_tracks table
    try {
      console.log(`Fetching tracks from user_mood_tracks for mood ${params.id}`);
      const tracks = await getMoodTracks(userId, params.id);
      console.log(`Retrieved ${tracks.length} tracks from user_mood_tracks`);
      
      return createApiResponse(true, tracks);
    } catch (error) {
      console.error('Error fetching user mood tracks:', error);
      return createApiResponse(false, null, 
        `Error fetching user mood tracks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error fetching user mood tracks:', error);
    return createApiResponse(false, null, 
      `Error fetching user mood tracks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * POST handler for /api/moods/user-moods/[id]/tracks
 * Adds a track to a specific user mood
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`POST /api/moods/user-moods/${params.id}/tracks - Adding track to user mood`);
  
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // For debugging
    console.log('Session in mood tracks API:', session ? 'Exists' : 'Null', 
      session?.user ? `User email: ${session.user.email}` : 'No user in session');
    
    // In development, we'll be more lenient with authentication
    if (!session?.user?.email && !isDevelopment) {
      console.error('Unauthorized attempt to add track to user mood');
      return createApiResponse(false, null, 'Unauthorized');
    }
    
    // Get user ID
    let userId = await getUserId();
    console.log('Retrieved user ID for POST mood tracks:', userId);
    
    // For development mode, use a fallback user ID if needed
    if (!userId && isDevelopment) {
      userId = '00000000-0000-4000-a000-000000000001'; // Same as the dev user ID
      console.log('Using development user ID:', userId);
    } else if (!userId && session?.user?.id) {
      console.log(`Using session ID ${session.user.id} as fallback for user ID`);
      userId = session.user.id;
    }
    
    if (!userId && !isDevelopment) {
      console.error('User ID not found for authenticated user');
      return createApiResponse(false, null, 'User not found');
    }
    
    // Get track data from request body
    const trackData = await request.json();
    console.log('Track data:', trackData);
    
    if (!trackData.track_id || !trackData.track_name || !trackData.artist_name) {
      console.error('Missing required track data');
      return createApiResponse(false, null, 'Missing required track data');
    }
    
    // Add track to mood_tracks table
    try {
      console.log(`Adding track to mood ${params.id} for user ${userId || 'development user'}`);
      const { data, error } = await supabase
        .from('mood_tracks')
        .insert([
          { 
            user_id: userId || '00000000-0000-4000-a000-000000000001', // Use dev ID if no user ID
            user_mood_id: params.id,
            track_id: trackData.track_id,
            track_name: trackData.track_name || 'Unknown Track',
            artist_name: trackData.artist_name || 'Unknown Artist',
            track_image: trackData.track_image || null
          }
        ])
        .select()
        .single();
        
      if (error) {
        console.error('Error adding track to mood_tracks:', error);
        
        // Fall back to the old way if the direct insert fails
        if (userId) {
          const result = await addTrackToUserMood(userId, params.id, trackData);
          console.log('Track added to user mood via legacy method:', result);
          return createApiResponse(true, result, 'Track added successfully via legacy method');
        } else {
          return createApiResponse(false, null, `Error adding track: ${error.message}`);
        }
      }
      
      console.log('Track added to mood_tracks:', data);
      return createApiResponse(true, data, 'Track added successfully');
    } catch (error) {
      console.error('Error adding track to user mood:', error);
      return createApiResponse(false, null, 
        `Error adding track to user mood: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error adding track to user mood:', error);
    return createApiResponse(false, null, 
      `Error adding track to user mood: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 