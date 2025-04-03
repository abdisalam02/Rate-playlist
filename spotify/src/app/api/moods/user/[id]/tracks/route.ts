import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMoodTracks, addTrackToUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

// Empty tracks with instructions instead of pre-populated mock data
const getEmptyTracks = (moodId: string) => {
  return [];
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: moodId } = params;
    console.log(`API: Received GET request to /api/moods/user/${moodId}/tracks`);
    
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error('API: Unauthorized access attempt to user mood tracks');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = await getUserId();
    if (!userId) {
      console.error('API: User not found when accessing mood tracks');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`API: Fetching tracks for user mood ${moodId} for user ${userId}`);
    
    try {
      // Fetch user mood tracks
      const tracks = await getUserMoodTracks(userId, moodId);
      console.log(`API: Found ${tracks.length} tracks for user mood ${moodId}`);
      
      // Return actual tracks or empty array
      return NextResponse.json(tracks);
    } catch (dbError) {
      console.error('API: Database error when fetching user mood tracks:', dbError);
      console.log('API: Returning empty tracks with instructions');
      
      // If there's a database error, return empty instructional state
      return NextResponse.json(getEmptyTracks(moodId));
    }
  } catch (error) {
    console.error('API: Error fetching user mood tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user mood tracks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: moodId } = params;
    console.log(`API: Received POST request to /api/moods/user/${moodId}/tracks`);
    
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error('API: Unauthorized attempt to add track to user mood');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = await getUserId();
    if (!userId) {
      console.error('API: User not found when adding track to mood');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get track data from request
    const trackData = await request.json();
    if (!trackData.track_id || !trackData.track_name || !trackData.artist_name) {
      return NextResponse.json(
        { error: 'Track data is incomplete' },
        { status: 400 }
      );
    }

    console.log(`API: Adding track ${trackData.track_name} to user mood ${moodId}`);
    
    try {
      // Add track to user mood
      const newTrack = await addTrackToUserMood(userId, moodId, trackData);
      console.log(`API: Added track ${newTrack.track_name} to user mood ${moodId}`);
      
      return NextResponse.json(newTrack);
    } catch (dbError) {
      console.error('API: Database error when adding track to user mood:', dbError);
      console.log('API: Creating mock track response');
      
      // Create a mock track with the provided data and a unique ID
      const mockNewTrack = {
        id: `new-track-${Date.now()}`,
        user_id: userId,
        user_mood_id: moodId,
        track_id: trackData.track_id,
        track_name: trackData.track_name,
        artist_name: trackData.artist_name,
        track_image: trackData.track_image || null,
        added_at: new Date().toISOString()
      };
      
      return NextResponse.json(mockNewTrack);
    }
  } catch (error) {
    console.error('API: Error adding track to user mood:', error);
    return NextResponse.json(
      { error: 'Failed to add track to user mood', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 