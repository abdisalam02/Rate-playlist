import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStapleMoodTracks } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export async function GET() {
  console.log('API: Received GET request to /api/moods/staple/tracks');
  
  // Return a test response first to verify the route is working
  return NextResponse.json({ test: true });

  /* Commenting out the actual implementation for now
  try {
    // Verify authenticated session
    console.log('API: Attempting to get server session');
    const session = await getServerSession(authOptions);
    console.log('API: Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email
    });

    if (!session?.user?.email) {
      console.error('API: Unauthorized access attempt to staple mood tracks');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    console.log('API: Attempting to get user ID');
    const userId = await getUserId();
    console.log('API: User ID result:', { hasUserId: !!userId, userId });

    if (!userId) {
      console.error('API: User not found when accessing staple mood tracks');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('API: Fetching staple mood tracks for user ID:', userId);
    
    // Fetch staple mood tracks for the user
    const tracks = await getStapleMoodTracks(userId);
    console.log('API: Staple mood tracks result:', {
      trackCount: tracks.length,
      trackIds: tracks.map(t => t.id)
    });
    
    return NextResponse.json(tracks);
  } catch (error) {
    console.error('API: Error in staple mood tracks route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staple mood tracks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  */
} 