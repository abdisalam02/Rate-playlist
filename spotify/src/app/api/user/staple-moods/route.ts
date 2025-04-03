import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // User ID from session is the UUID
    const userId = session.user.id;
    console.log(`[API /user/staple-moods] Fetching staple moods for user ID: ${userId}`);

    // Fetch associated staple mood IDs and join with staple_moods details
    // Assuming a join table named 'user_staple_moods' with 'user_id' and 'staple_mood_id' columns
    const { data, error } = await supabase
      .from('user_staple_moods') // Replace with your actual join table name if different
      .select(`
        staple_mood_id,
        staple_mood:staple_moods!inner(
          id,
          mood_name,
          description,
          color,
          image_url,
          is_public
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error(`[API /user/staple-moods] Error fetching user staple moods for ${userId}:`, error);
      return NextResponse.json({ error: 'Failed to fetch user staple moods', details: error.message }, { status: 500 });
    }

    // Extract the mood details from the nested structure
    const userStapleMoods = data?.map(item => item.staple_mood).filter(Boolean) || [];

    console.log(`[API /user/staple-moods] Found ${userStapleMoods.length} staple moods for user ${userId}.`);
    return NextResponse.json({ staple_moods: userStapleMoods });

  } catch (error) {
    console.error('[API /user/staple-moods] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 