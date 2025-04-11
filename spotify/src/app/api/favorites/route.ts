import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, AppSession } from '@/lib/auth';
import supabase from '@/utils/supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET handler for fetching favorites
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions) as AppSession | null;

  const correctUserId = session?.user?.id;
  if (!correctUserId) {
     console.log("GET favorites - Unauthorized: No session or session user ID");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log("GET favorites - Authenticated DB User ID:", correctUserId);

  try {
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('user_favorite_tracks')
      .select('track_id, added_at')
      .eq('user_id', correctUserId)
      .order('added_at', { ascending: false });
    
    if (favoritesError) {
      console.error('Error fetching favorites from Supabase:', favoritesError);
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }

    console.log(`GET favorites - Found ${favoritesData?.length || 0} favorites for DB user ${correctUserId}.`);
    return NextResponse.json({ favorites: favoritesData || [] });
    
  } catch (error) {
    console.error('Error in GET /api/favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/favorites - Add a track to favorites
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions) as AppSession | null;

  const correctUserId = session?.user?.id;
  if (!correctUserId) {
    console.log("POST favorites - Unauthorized: No session or session user ID");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log("POST favorites - Authenticated DB User ID:", correctUserId);

  try {
    const { trackId } = await request.json();

    if (!trackId || typeof trackId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid trackId in request body' }, { status: 400 });
    }

    console.log(`POST favorites - DB User: ${correctUserId}, Track: ${trackId}`);

    const { data, error } = await supabase
      .from('user_favorite_tracks')
      .insert({ user_id: correctUserId, track_id: trackId })
      .select('id')
      .single();
    
    if (error) {
      if (error.code === '23505') { 
         console.log(`POST favorites - Track ${trackId} already favorited by user ${correctUserId}.`);
         return NextResponse.json({ success: true, message: 'Track already favorited' }, { status: 200 });
      }
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to add favorite', details: error.message }, { status: 500 });
    }

    console.log(`POST favorites - Successfully added track ${trackId} for user ${correctUserId}. Inserted ID: ${data?.id}`);
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
  const session = await getServerSession(authOptions) as AppSession | null;

  const correctUserId = session?.user?.id;
  if (!correctUserId) {
    console.log("DELETE favorites - Unauthorized: No session or session user ID");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log("DELETE favorites - Authenticated DB User ID:", correctUserId);

  try {
    const { trackId } = await request.json();

    if (!trackId || typeof trackId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid trackId in request body' }, { status: 400 });
    }

    console.log(`DELETE favorites - DB User: ${correctUserId}, Track: ${trackId}`);

    const { error, count } = await supabase
      .from('user_favorite_tracks')
      .delete({ count: 'exact' })
      .eq('user_id', correctUserId)
      .eq('track_id', trackId);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: 'Failed to remove favorite', details: error.message }, { status: 500 });
    }

    if (count === 0) {
        console.log(`DELETE favorites - No favorite found for track ${trackId} and user ${correctUserId}.`);
        return NextResponse.json({ success: true, message: 'Favorite not found or already removed' });
    }

    console.log(`DELETE favorites - Successfully removed track ${trackId} for user ${correctUserId}. Count: ${count}`);
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