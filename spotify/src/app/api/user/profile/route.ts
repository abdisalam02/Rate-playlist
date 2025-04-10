import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
// import { getCurrentUserProfile } from '@/lib/spotify'; // No longer fetching directly from Spotify here
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Use Supabase UUID from session
    if (!session?.user?.id) {
      console.error('[GET PROFILE API] Unauthorized: No session or user ID (UUID) found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id; // Supabase UUID
    console.log(`[GET PROFILE API] Fetching profile from Supabase for user ID: ${userId}`);
    
    // Fetch user data from Supabase
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('id, display_name, email, profile_image, spotify_id, created_at, last_login') // Select desired fields
      .eq('id', userId)
      .single(); // Expecting one user for the given UUID

    if (dbError) {
      console.error(`[GET PROFILE API] Supabase error fetching user ${userId}:`, dbError);
      return NextResponse.json({ error: 'Failed to fetch profile from database' }, { status: 500 });
    }

    if (!userData) {
      console.error(`[GET PROFILE API] User not found in Supabase for ID: ${userId}`);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    console.log(`[GET PROFILE API] Successfully fetched profile for user ${userId}`);

    // Return data in a structure similar to what frontend might expect 
    // (Matches UserProfile type structure if possible, using DB data)
    // NOTE: Things like follower count would need a separate Spotify API call if needed
    const profileResponse = {
        id: userData.spotify_id, // Use spotify_id for consistency if frontend uses it as main ID
        display_name: userData.display_name, // CRITICAL: Use DB display_name
        email: userData.email,
        images: userData.profile_image ? [{ url: userData.profile_image }] : [],
        // followers: { total: 0 }, // Need separate call for this
        external_urls: {
            spotify: `https://open.spotify.com/user/${userData.spotify_id}`
        },
        // Add other fields from Supabase if needed by frontend
        db_id: userData.id, // Include Supabase UUID if helpful
        created_at: userData.created_at,
        last_login: userData.last_login
    };

    return NextResponse.json(profileResponse);

  } catch (error: any) {
    console.error('[GET PROFILE API] Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// Validate display name (basic example)
function isValidDisplayName(name: string): boolean {
  const trimmedName = name.trim();
  return trimmedName.length > 0 && trimmedName.length <= 50;
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // 1. Check Authentication (using Supabase UUID from session)
  if (!session?.user?.id) {
    console.error('[UPDATE PROFILE] Unauthorized: No session or user ID found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id; // This should be the Supabase UUID

  // 2. Parse Request Body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error('[UPDATE PROFILE] Bad Request: Invalid JSON body');
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { displayName } = body;

  // 3. Validate Input
  if (typeof displayName !== 'string' || !isValidDisplayName(displayName)) {
    console.warn(`[UPDATE PROFILE] Bad Request: Invalid display name for user ${userId}: ${displayName}`);
    return NextResponse.json({ error: 'Invalid display name. Must be between 1 and 50 characters.' }, { status: 400 });
  }

  const trimmedDisplayName = displayName.trim();

  console.log(`[UPDATE PROFILE] Attempting to update display name for user ID: ${userId} to "${trimmedDisplayName}"`);

  // 4. Update Supabase
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ display_name: trimmedDisplayName })
      .eq('id', userId) // Match the user by their Supabase UUID
      .select('id, display_name, profile_image, spotify_id, email') // Select updated data to return
      .single();

    if (error) {
      console.error(`[UPDATE PROFILE] Supabase error updating user ${userId}:`, error);
      // Check for specific errors if needed, e.g., foreign key violations, etc.
      return NextResponse.json({ error: 'Failed to update profile in database' }, { status: 500 });
    }

    if (!data) {
        console.error(`[UPDATE PROFILE] Supabase returned no data after update for user ${userId}. This should not happen.`);
        return NextResponse.json({ error: 'Failed to confirm profile update' }, { status: 500 });
    }

    console.log(`[UPDATE PROFILE] Successfully updated display name for user ID: ${userId}`);
    // Return the updated relevant user fields
    return NextResponse.json({ 
        message: 'Profile updated successfully', 
        user: { 
            id: data.id,
            displayName: data.display_name, 
            profileImage: data.profile_image,
            spotifyId: data.spotify_id, // Include if needed by frontend
            email: data.email // Include if needed by frontend
        } 
    }, { status: 200 });

  } catch (error) {
    console.error(`[UPDATE PROFILE] Internal Server Error for user ID ${userId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 