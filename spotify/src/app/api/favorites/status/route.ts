import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth/next'; // No longer needed with Supabase direct session
// import { authOptions } from '@/lib/auth'; // No longer needed
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic'; // Force dynamic execution

export async function GET(request: NextRequest) {
  // Ensure cookies are awaited and route is dynamic
  const cookieStore = cookies(); 

  // Pass cookieStore getter function to the helper
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Now get the session
  const { data: { session } } = await supabase.auth.getSession();

  // 1. Check Authentication
  if (!session?.user?.id) {
    console.warn('[API Fav Status] Unauthorized: No Supabase session found via Route Handler Client');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

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
    const { error, count } = await supabase
      .from('user_favorite_tracks')
      .select('id', { count: 'exact', head: true }) 
      .eq('user_id', userId)
      .eq('track_id', trackId);

    // 4. Handle errors and result
    if (error) {
      console.error(`[API Fav Status] Supabase error checking favorite for user ${userId}, track ${trackId}:`, error);
      return NextResponse.json({ error: 'Database error checking favorite status' }, { status: 500 });
    }

    console.log(`[API Fav Status] Raw Supabase query result: count = ${count}, error = ${error}`);

    const isFavorited = count !== null && count > 0;
    console.log(`[API Fav Status] User ${userId}, track ${trackId} - Is Favorited: ${isFavorited}`);

    // 5. Return Status
    return NextResponse.json({ isFavorited });

  } catch (error) {
    console.error(`[API Fav Status] Unexpected error for user ${userId}, track ${trackId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
