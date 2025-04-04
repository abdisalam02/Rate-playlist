import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMoodTracks, getMoodTracks, addTrackToUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { checkDbConnection, checkTableExists } from '@/lib/db-status';
import { supabase } from '@/lib/supabase';
import { enrichItems } from '@/lib/enrichUtils';

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
 * Helper function to get client credentials token (copied from user API route)
 */
async function getClientCredentialsToken() {
    console.log('[getClientCredentialsToken] Attempting to get token...');
    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.error('[getClientCredentialsToken] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
        return null;
      }
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials'
        }),
        cache: 'no-store' // Ensure fresh request
      });
      
      const responseBody = await response.text();
      if (!response.ok) {
        console.error(`[getClientCredentialsToken] Failed: ${response.status}`, responseBody);
        return null;
      }
      const data = JSON.parse(responseBody);
      console.log('[getClientCredentialsToken] Successfully received token.');
      return data.access_token;
    } catch (error) {
      console.error('[getClientCredentialsToken] Error during fetch:', error);
      return null;
    }
  }

/**
 * GET handler for /api/moods/user-moods/[id]/tracks
 * Returns all tracks associated with a specific user mood
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Await params before accessing
  const awaitedParams = await params;
  const moodId = awaitedParams.id; // Use awaited moodId

  console.log(`GET /api/moods/user-moods/${moodId}/tracks - Fetching tracks for user mood`); // Use awaited moodId
  
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
          console.log(`Dev mode: Fetching any tracks for mood ${moodId} regardless of user`);
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
            .eq('user_mood_id', moodId)
            .order('added_at', { ascending: false });
            
          if (error) {
            console.error('Error fetching tracks in dev mode:', error);
          } else {
            console.log(`Dev mode: Retrieved ${data.length} tracks for mood ${moodId}`);
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
      console.log(`Checking all tracks for mood ${moodId}`); // Use awaited moodId
      const { data: allTracks, error: allTracksError } = await supabase
        .from('mood_tracks') // Corrected table name
        .select('id, track_id, track_name, user_id')
        .eq('user_mood_id', moodId); // Use awaited moodId
        
      if (allTracksError) {
        console.error('Error listing all tracks for mood:', allTracksError);
      } else {
        console.log(`Found ${allTracks.length} total tracks for mood in database:`);
        allTracks.forEach(track => {
          console.log(`- Track ID: ${track.track_id}, Name: ${track.track_name}, User ID: ${track.user_id}`);
        });
      }
    } catch (error) {
      console.warn('Error listing all tracks for mood:', error);
    }
    
    // Fetch tracks for the specific mood and user
    console.log(`Fetching tracks for mood ${moodId} and user ${userId}`);
    const { data: rawTracks, error } = await supabase
      .from('mood_tracks')
      .select('id, user_id, user_mood_id, track_id, track_name, artist_name, track_image, added_at') // Select needed fields
      .eq('user_mood_id', moodId)
      .eq('user_id', userId)
      .order('added_at', { ascending: true });

    if (error) {
      console.error('Error fetching from mood_tracks:', error);
      return createApiResponse(false, null, `Error fetching mood tracks: ${error.message}`);
    }

    if (!rawTracks || rawTracks.length === 0) {
        console.log(`No tracks found in mood_tracks for mood ${moodId}`);
        return createApiResponse(true, []); // Return empty if none found
    }
    
    console.log(`Retrieved ${rawTracks.length} raw tracks from mood_tracks`);

    // --- Enrich the tracks --- 
    console.log(`Enriching ${rawTracks.length} mood tracks...`);
    let accessToken = session?.accessToken;
    if (!accessToken) {
        console.warn("[Mood Tracks GET] No session token, attempting client credentials for enrichment.");
        accessToken = await getClientCredentialsToken();
    }

    // Prepare items for enrichment (ensure item_id exists)
    const itemsToEnrich = rawTracks.map(track => ({ 
        ...track, 
        item_id: track.track_id, // Make sure enrichItems uses 'item_id'
        item_type: 'track' 
    }));

    const enrichedTracks = await enrichItems(itemsToEnrich, 'track', accessToken);
    console.log(`Enrichment complete. Returning ${enrichedTracks.length} enriched tracks.`);
    
    return createApiResponse(true, enrichedTracks);
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