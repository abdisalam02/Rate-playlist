import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addTrackToUserMood, getUserMoodByName } from '@/lib/supabase';

export async function POST(request: Request) {
  console.log('Request to add track to user mood');

  // Verify the session
  const session = await getServerSession(authOptions);
  console.log('Session found:', !!session);

  if (!session?.user?.id) {
    console.error('Unauthorized: No user in session');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const userId = session.user.id;
  console.log('User ID from session:', userId);

  try {
    // Parse the request body
    const body = await request.json();
    console.log('Request body:', body);

    const { mood_name, track_id, track_name, artist_name, image_url } = body;

    if (!mood_name || !track_id || !track_name) {
      console.error('Bad request: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check if the mood exists
    const mood = await getUserMoodByName(userId, mood_name);
    console.log('Mood found:', mood);

    if (!mood) {
      console.error('Mood not found:', mood_name);
      return NextResponse.json(
        { error: 'Mood not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Add the track to the mood
    const result = await addTrackToUserMood({
      userId,
      moodName: mood_name,
      trackId: track_id,
      trackName: track_name,
      artistName: artist_name || '',
      imageUrl: image_url || ''
    });

    console.log('Track added successfully:', result);
    return NextResponse.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    console.error('Error adding track to mood:', error);
    return NextResponse.json(
      { error: 'Failed to add track to mood' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 