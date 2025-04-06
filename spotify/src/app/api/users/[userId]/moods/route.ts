import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/utils/supabase';

// Cache control directives
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * GET /api/users/[userId]/moods
 * Get both custom and selected staple moods for a specific user
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { userId?: string } } // Correctly typed params
) {
  // 1. Correctly extract userId
  const routeUserId = params.userId;

  if (!routeUserId) {
    return NextResponse.json({ error: 'User ID parameter is missing' }, { status: 400 });
  }

  console.log(`[API /users/${routeUserId}/moods] Received request.`);

  try {
    let actualUserId = routeUserId;

    // 2. Verify user existence and get actual DB ID if needed (lookup logic retained)
    const { data: userCheck, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', routeUserId)
      .maybeSingle(); // Use maybeSingle to handle not found without erroring

    if (userCheckError) {
       console.error(`[API /users/${routeUserId}/moods] Error checking user by ID:`, userCheckError);
       // Don't throw immediately, try spotify_id lookup
    }

    if (!userCheck) {
       console.log(`[API /users/${routeUserId}/moods] User ID not found by direct lookup, trying spotify_id...`);
       const { data: spotifyUser, error: spotifyUserError } = await supabase
         .from('users')
         .select('id')
         .eq('spotify_id', routeUserId) // Assuming the param might be spotify_id
         .single();

       if (spotifyUserError || !spotifyUser) {
         console.error(`[API /users/${routeUserId}/moods] User not found by ID or spotify_id:`, spotifyUserError);
         return NextResponse.json({ error: 'User not found' }, { status: 404 });
       }
       actualUserId = spotifyUser.id;
       console.log(`[API /users/${routeUserId}/moods] Found user via spotify_id. Using database ID: ${actualUserId}`);
     } else {
       actualUserId = userCheck.id; // Use the ID found directly
       console.log(`[API /users/${routeUserId}/moods] Confirmed user exists with ID: ${actualUserId}`);
     }

    // 3. Fetch Custom Moods
    console.log(`[API /users/${actualUserId}/moods] Fetching custom moods...`);
    const { data: customMoodsData, error: customMoodsError } = await supabase
      .from('user_moods')
      .select(`
        id,
        mood_name,
        description,
        track_id,
        track_name,
        artist_name,
        track_image,
        created_at
      `)
      .eq('user_id', actualUserId)
      .order('created_at', { ascending: false });

    if (customMoodsError) {
      console.error(`[API /users/${actualUserId}/moods] Error fetching custom moods:`, customMoodsError);
      // Consider returning partial data or a specific error
      // For now, we'll log and continue to fetch staple moods
    }

    const customMoods = (customMoodsData || []).map(mood => ({
      ...mood,
      name: mood.mood_name, // Rename mood_name to name for consistency
      is_staple: false
    }));
    console.log(`[API /users/${actualUserId}/moods] Found ${customMoods.length} custom moods.`);

    // 4. Fetch Selected Staple Moods
    console.log(`[API /users/${actualUserId}/moods] Fetching selected staple moods...`);
    // **ASSUMPTION:** Joining user_staple_selections (aliased as uss) with staple_moods (aliased as sm)
    const { data: stapleMoodsData, error: stapleMoodsError } = await supabase
      .from('user_staple_selections') // Your table linking users to staple moods
      .select(`
        staple_moods!inner (
          id,
          name,
          description,
          track_image
        )
      `)
      .eq('user_id', actualUserId);

    if (stapleMoodsError) {
      console.error(`[API /users/${actualUserId}/moods] Error fetching staple moods:`, stapleMoodsError);
      // Log error but don't fail the request entirely if custom moods were found
    }

    // Extract and format staple moods, adding is_staple flag
    const stapleMoods = (stapleMoodsData || [])
       .map(item => item.staple_moods) // Extract the nested staple_moods object
       .filter(mood => mood != null) // Filter out potential nulls if join failed
       .map(mood => ({
         ...mood,
         is_staple: true
       }));
     console.log(`[API /users/${actualUserId}/moods] Found ${stapleMoods.length} selected staple moods.`);

    // 5. Combine and Return
    const allMoods = [...stapleMoods, ...customMoods];
    console.log(`[API /users/${actualUserId}/moods] Returning total ${allMoods.length} moods.`);

    // Sort combined moods if desired (e.g., staple first, then custom by date)
    allMoods.sort((a, b) => {
      if (a.is_staple && !b.is_staple) return -1; // Staple first
      if (!a.is_staple && b.is_staple) return 1;  // Staple first
      // If both are same type, sort custom by date (newest first), staple by name (or ID)
      if (!a.is_staple && !b.is_staple) {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      return a.name.localeCompare(b.name); // Sort staple by name
    });

    return NextResponse.json({ moods: allMoods });

  } catch (error: any) {
    console.error(`[API /users/${params.userId}/moods] Unexpected error:`, error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      moods: [] // Return empty array for better error handling in frontend
    }, { status: 500 });
  }
} 