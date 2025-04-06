import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// --- Helper to get DB User ID --- 
async function getDbUserId(sessionUserId: string | undefined): Promise<string | null> {
  if (!sessionUserId) return null;
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id') // Select the database UUID
    .eq('spotify_id', sessionUserId) // Match using the Spotify ID from the session
    .single();

  if (userError || !userData) {
    console.error(`[Helper getDbUserId] Failed to find user in DB with spotify_id: ${sessionUserId}`, userError);
    return null; // User not found in your DB
  }
  return userData.id; // Return the database UUID
}

// GET handler for fetching favorites
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
     console.log("GET favorites - Unauthorized: No session or session user ID");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the Database User ID (UUID)
  const dbUserId = await getDbUserId(session.user.id);

  console.log("GET favorites - Auth details:", { 
    hasSession: !!session, 
    spotifyUserId: session.user.id, 
    dbUserId: dbUserId 
  });

  if (!dbUserId) {
    console.error(`GET favorites - User with Spotify ID ${session.user.id} not found in local database.`);
    // If user isn't in DB, they have no favorites
    return NextResponse.json({ favorites: [] }); 
  }

  try {
    // Fetch favorites using the Database User ID (UUID)
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('user_favorite_tracks') // Query the correct table
      .select('track_id, added_at')   // Select only needed columns
      .eq('user_id', dbUserId)        // Filter by the database UUID
      .order('added_at', { ascending: false }); // Order by most recent

    if (favoritesError) {
      console.error('Error fetching favorites from Supabase:', favoritesError);
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }

    console.log(`GET favorites - Found ${favoritesData?.length || 0} favorites for DB user ${dbUserId}.`);
    return NextResponse.json({ favorites: favoritesData || [] });

  } catch (error) {
    console.error('Error in GET /api/favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/favorites - Add a track to favorites
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.log("POST favorites - Unauthorized: No session or session user ID");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the Database User ID (UUID)
  const dbUserId = await getDbUserId(session.user.id);

  console.log("POST favorites - Auth details:", { 
    hasSession: !!session, 
    spotifyUserId: session.user.id, 
    dbUserId: dbUserId 
  });

  if (!dbUserId) {
    console.error(`POST favorites - User with Spotify ID ${session.user.id} not found in local database.`);
    return NextResponse.json({ error: 'User profile not found in database.' }, { status: 404 }); 
  }

  try {
    const { trackId } = await request.json();

    if (!trackId || typeof trackId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid trackId in request body' }, { status: 400 });
    }

    console.log(`POST favorites - DB User: ${dbUserId}, Track: ${trackId}`);

    const { data, error } = await supabase
      .from('user_favorite_tracks')
      .insert({ user_id: dbUserId, track_id: trackId })
      .select('id') 
      .single(); 

    if (error) {
      if (error.code === '23505') { 
         console.log(`POST favorites - Track ${trackId} already favorited by user ${dbUserId}.`);
         return NextResponse.json({ success: true, message: 'Track already favorited' }, { status: 200 });
      }
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to add favorite', details: error.message }, { status: 500 });
    }

    console.log(`POST favorites - Successfully added track ${trackId} for user ${dbUserId}. Inserted ID: ${data?.id}`);
    return NextResponse.json({ success: true, favoriteId: data?.id }, { status: 201 });

  } catch (error: any) {
     if (error instanceof SyntaxError) {
       console.error('Error parsing request body:', error);
       return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
     }
    console.error('Error in POST /api/favorites:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE /api/favorites - Remove a track from favorites
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.log("DELETE favorites - Unauthorized: No session or session user ID");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const dbUserId = await getDbUserId(session.user.id);

  console.log("DELETE favorites - Auth details:", { 
    hasSession: !!session, 
    spotifyUserId: session.user.id, 
    dbUserId: dbUserId 
  });

  if (!dbUserId) {
    console.error(`DELETE favorites - User with Spotify ID ${session.user.id} not found in local database.`);
    return NextResponse.json({ error: 'User profile not found in database.' }, { status: 404 }); 
  }

  try {
    const { trackId } = await request.json();

    if (!trackId || typeof trackId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid trackId in request body' }, { status: 400 });
    }

    console.log(`DELETE favorites - DB User: ${dbUserId}, Track: ${trackId}`);

    const { error, count } = await supabase
      .from('user_favorite_tracks')
      .delete({ count: 'exact' })
      .eq('user_id', dbUserId)
      .eq('track_id', trackId);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: 'Failed to remove favorite', details: error.message }, { status: 500 });
    }

    if (count === 0) {
        console.log(`DELETE favorites - No favorite found for track ${trackId} and user ${dbUserId}.`);
        return NextResponse.json({ success: true, message: 'Favorite not found or already removed' });
    }

    console.log(`DELETE favorites - Successfully removed track ${trackId} for user ${dbUserId}. Count: ${count}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
     if (error instanceof SyntaxError) {
       console.error('Error parsing request body:', error);
       return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
     }
    console.error('Error in DELETE /api/favorites:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
} 