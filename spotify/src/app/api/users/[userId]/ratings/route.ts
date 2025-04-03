import { NextRequest, NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // No longer needed for client creation
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // No longer needed
import supabase from '@/utils/supabase'; // Import the global client
import { getServerSession } from 'next-auth/next'; // Keep for Spotify token
import { authOptions } from '@/lib/auth'; // Keep for Spotify token

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Get userId from params (remove incorrect await)
  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const itemType = searchParams.get('type'); // 'track' or 'album' or undefined for both
  const limitParam = searchParams.get('limit') || '10';
  const offsetParam = searchParams.get('offset') || '0';
  const sortByParam = searchParams.get('sort')?.split(':')[0];
  const sortOrder = searchParams.get('sort')?.split(':')[1] || 'desc'; // 'asc' or 'desc'

  // Validate sortBy - default to created_at if invalid or missing
  const allowedSortColumns = ['created_at', 'updated_at', 'rating']; // Add valid columns
  const sortBy = allowedSortColumns.includes(sortByParam || '') ? sortByParam : 'created_at';

  // Validate and parse limit/offset
  const limit = Math.max(1, parseInt(limitParam)); 
  const offset = Math.max(0, parseInt(offsetParam));
  const ascending = sortOrder === 'asc';

  console.log(`Fetching ratings for user: ${userId}, type: ${itemType || 'all'}, limit: ${limit}, offset: ${offset}, sort: ${sortBy}:${sortOrder}`);

  try {
    // Use the global Supabase client instead of Route Handler client
    console.log('[Ratings Route] Using global Supabase client...');
    // const supabase = createRouteHandlerClient({ cookies }); // REMOVED

    // Build the query (using the imported global 'supabase' client)
    let query = supabase
      .from('ratings')
      .select(`
        id,
        rating,
        item_id,
        item_type,
        created_at,
        updated_at, 
        review
      `)
      .eq('user_id', userId)
      .order(sortBy, { ascending: ascending }); // Apply dynamic sorting using validated sortBy

    // Filter by item type if provided
    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: ratingsData, error: ratingsError } = await query;

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      // Provide more specific error if possible
      const errorMessage = ratingsError.message || 'Failed to fetch ratings';
      const status = ratingsError.code === 'PGRST116' ? 401 : 500; // Handle potential RLS issues
      return NextResponse.json({ error: errorMessage, details: ratingsError.details }, { status });
    }

    // If no ratings found, return an empty array
    if (!ratingsData || ratingsData.length === 0) {
      return NextResponse.json({ ratings: [] });
    }

    // --- Spotify Enrichment --- 
    // Get track and album IDs for enrichment
    const trackIds = ratingsData.filter(r => r.item_type === 'track').map(r => r.item_id);
    const albumIds = ratingsData.filter(r => r.item_type === 'album').map(r => r.item_id);
    const itemDetails: Record<string, any> = {}; // Map to store details

    // **Important: Pass Auth Token for Spotify Calls** 
    // Fetching the auth token securely - Use getServerSession as client is global
    console.log('[Ratings Route] Attempting to get NextAuth session for Spotify token...');
    // const { data: { session }, error: sessionError } = await supabase.auth.getSession(); // REMOVED - Doesn't work with global client
    const session = await getServerSession(authOptions);
    
    // Log session status
    if (session) {
      console.log(`[Ratings Route] NextAuth session retrieved. User authenticated: ${!!session?.user}`);
    } else {
      console.log(`[Ratings Route] NextAuth session not found.`);
    }

    const accessToken = session?.accessToken; // Use accessToken from NextAuth session

    if (!accessToken) {
      console.warn('Spotify access token not found for enrichment in ratings API.');
      // Proceed without enrichment, or return an error depending on requirements
    }

    // Fetch track details if needed and token available
    if (trackIds.length > 0 && accessToken) {
      try {
        const tracksResponse = await fetch(`https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (tracksResponse.ok) {
          const d = await tracksResponse.json();
          d?.tracks?.forEach((track: any) => {
            if (track && track.id) {
              itemDetails[track.id] = {
                name: track.name,
                artists: track.artists?.map((a: any) => a.name).join(', '),
                image: track.album?.images?.[0]?.url || '/placeholder-track.png'
              };
            }
          });
        } else {
          console.warn(`Spotify track fetch failed: ${tracksResponse.status}`);
        }
      } catch (e) { console.error('Error fetching Spotify track details:', e); }
    }

    // Fetch album details if needed and token available
    if (albumIds.length > 0 && accessToken) {
      try {
        const albumsResponse = await fetch(`https://api.spotify.com/v1/albums?ids=${albumIds.join(',')}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (albumsResponse.ok) {
          const d = await albumsResponse.json();
          d?.albums?.forEach((album: any) => {
            if (album && album.id) {
              itemDetails[album.id] = {
                name: album.name,
                artists: album.artists?.map((a: any) => a.name).join(', '),
                image: album.images?.[0]?.url || '/placeholder-album.png'
              };
            }
          });
        } else {
          console.warn(`Spotify album fetch failed: ${albumsResponse.status}`);
        }
      } catch (e) { console.error('Error fetching Spotify album details:', e); }
    }
    // --- End Spotify Enrichment ---

    // Combine ratings with item details
    const enrichedRatings = ratingsData.map(rating => {
      const details = itemDetails[rating.item_id];
      return {
        id: rating.id,
        item_id: rating.item_id,
        item_type: rating.item_type,
        item_name: details?.name || (rating.item_type === 'track' ? 'Unknown Track' : 'Unknown Album'),
        item_artists: details?.artists || 'Unknown Artist',
        item_image: details?.image || (rating.item_type === 'track' ? '/placeholder-track.png' : '/placeholder-album.png'),
        rating: rating.rating,
        rated_at: rating.created_at, // Use created_at as the date field in the response
        review: rating.review
      };
    });

    return NextResponse.json({ ratings: enrichedRatings });

  } catch (error: any) {
    console.error('Error in ratings API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 