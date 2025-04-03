import { NextRequest, NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // No longer needed
// import { cookies } from 'next/headers'; // No longer needed
import supabase from '@/utils/supabase'; // Import the global client

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  console.log(`Fetching staple mood tracks for user: ${userId}`);

  try {
    console.log('[Staple Tracks Route] Using global Supabase client...');
    // const supabase = createRouteHandlerClient({ cookies }); // REMOVED
    // console.log('[Staple Tracks Route] Supabase client created.'); // REMOVED

    // Fetch tracks specifically linked to staple moods for this user (using global 'supabase')
    const { data, error } = await supabase
      .from('mood_tracks')
      .select(`
        id,
        staple_mood_id,
        track_id,
        track_name,
        artist_name,
        track_image,
        added_at
      `)
      .eq('user_id', userId)
      .not('staple_mood_id', 'is', null); // Ensure it's linked to a staple mood

    if (error) {
      console.error('Error fetching user staple mood tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch staple mood tracks', details: error.message },
        { status: 500 }
      );
    }

    console.log(`Successfully fetched ${data?.length || 0} staple mood tracks for user ${userId}`);
    // Return the data in the format expected by the MoodManager component
    return NextResponse.json({
      success: true, 
      data: data || [],
      timestamp: new Date().toISOString(),
      message: `Retrieved ${data?.length || 0} staple mood tracks for user ${userId}`
    });

  } catch (error: any) {
    console.error('Server error fetching staple mood tracks:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 