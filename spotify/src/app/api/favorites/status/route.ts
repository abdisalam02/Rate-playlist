import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient'; // Ensure correct path

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // 1. Check Authentication
  if (!session?.user?.id) {
    console.warn('[API Fav Status] Unauthorized: No session or user ID');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id; // Supabase UUID

  // 2. Get trackId from query parameters
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get('trackId');

  if (!trackId) {
    console.warn('[API Fav Status] Bad Request: trackId is required');
    return NextResponse.json({ error: 'trackId query parameter is required' }, { status: 400 });
  }

  console.log(`[API Fav Status] Checking favorite status for user: ${userId}, track: ${trackId}`);

  // 3. Query Supabase
  try {
    // Use `select` with `count: 'exact'` and `head: true` for efficiency.
    // This only checks if a matching row exists without retrieving data.
    const { error, count } = await supabase
      .from('user_favorite_tracks')
      .select('id', { count: 'exact', head: true }) 
      .eq('user_id', userId)
      .eq('track_id', trackId);

    if (error) {
      console.error(`[API Fav Status] Supabase error checking favorite for user ${userId}, track ${trackId}:`, error);
      return NextResponse.json({ error: 'Database error checking favorite status' }, { status: 500 });
    }

    // If count is greater than 0, the record exists, so it's favorited.
    const isFavorited = count !== null && count > 0;
    console.log(`[API Fav Status] User ${userId}, track ${trackId} - Is Favorited: ${isFavorited}`);

    // 4. Return Status
    return NextResponse.json({ isFavorited });

  } catch (error) {
    console.error(`[API Fav Status] Unexpected error for user ${userId}, track ${trackId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Optional: Add OPTIONS handler for CORS preflight if needed, similar to other routes
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
