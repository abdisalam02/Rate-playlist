import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';
import { getUserTopStapleTracks } from '@/lib/supabase';

// Cache control directives
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define expected types for clarity
interface StapleMoodTrack {
    mood_track_id: string;
    user_id: string;
    staple_mood_id: string;
    track_id: string;
    track_name: string;
    artist_name: string;
    track_image: string | null;
    added_at: string;
    mood_name: string;
    mood_description: string | null;
}

interface CustomMood {
    id: string;
    user_id: string;
    mood_name: string;
    description: string | null;
    // Add other relevant fields if needed, e.g., created_at
}

/**
 * GET /api/users/[userId]/moods
 * Get moods for a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Correctly access userId from params
  const userId = params.userId; 
  console.log(`API: Fetching moods for user ID: ${userId}`);

  if (!userId) {
    console.error('API Error: User ID is required');
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // Fetch top staple mood tracks using the new RPC helper
    const stapleTracksResult = await getUserTopStapleTracks(userId, 4); // Fetch top 4
    const stapleTracks: StapleMoodTrack[] = stapleTracksResult || [];
    console.log(`API: Fetched ${stapleTracks.length} staple mood tracks for user ${userId}`);

    // Fetch custom moods created by the user
    console.log(`API: Fetching custom moods for user ${userId}`);
    const { data: customMoodsData, error: customMoodsError } = await supabase
      .from('user_moods') // Target the correct table
      .select('id, user_id, mood_name, description, created_at') // Select only existing columns
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (customMoodsError) {
      console.error(`API: Error fetching custom moods for user ${userId}:`, customMoodsError);
      // Don't throw, return staple tracks if those were successful
      // throw new Error(`Failed to fetch custom moods: ${customMoodsError.message}`);
    }
    
    const customMoods: CustomMood[] = customMoodsData || [];
    console.log(`API: Fetched ${customMoods.length} custom moods for user ${userId}`);

    // Combine results
    const responseData = {
      staple_mood_tracks: stapleTracks,
      custom_moods: customMoods
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error(`API: Error fetching moods for user ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to fetch user moods: ${errorMessage}` }, { status: 500 });
  }
} 