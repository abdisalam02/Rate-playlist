import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, AppSession } from '@/lib/auth';
import supabase from '@/utils/supabase'; // Use the global supabase client instead
import { enrichItems } from '@/lib/enrichUtils'; // Import the enrichment utility

// Define artist interface for TypeScript
interface SpotifyArtist {
  id: string;
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions) as AppSession | null;
    
    // --- CORRECT: Use session.user.id directly --- 
    const correctUserId = session?.user?.id; // Supabase UUID
    
    console.log('User ratings API route accessed');
    console.log('Session details:', {
      auth: !!session,
      userId: correctUserId, // Use correct variable
      userName: session?.user?.name,
      email: session?.user?.email,
      accessToken: !!session?.accessToken
    });
    
    // Check for authentication
    if (!correctUserId) {
       console.error('User ratings API - Unauthorized: No user ID found in session.');
       return NextResponse.json({
         ratings: [],
         error: 'Authentication required',
         status: 'unauthorized'
       });
    }
    // --- End Correction --- 
    
    // Get query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const itemType = searchParams.get('itemType'); // 'track' or 'album' filter
    
    // Log request parameters
    console.log('Ratings API request parameters:', {
      limit,
      offset,
      itemType: itemType || 'all',
      url: request.url,
      requestingUserId: correctUserId // Log the ID being used
    });
    
    // Verify Supabase connection
    console.log('Testing Supabase connection...');
    
    try {
      // Try a simple query to verify the connection
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact' });
        
      if (testError) {
        console.error('Error testing Supabase connection:', testError);
        } else {
        console.log('Supabase connection successful! User count:', testData);
      }
    } catch (testErr) {
      console.error('Exception testing Supabase connection:', testErr);
    }
    
    // Query ratings directly using the authenticated user's ID
    console.log('Querying ratings for user_id:', correctUserId);
    let query = supabase
            .from('ratings')
        // --- Select necessary fields for enrichment --- 
        .select('id, item_id, item_type, rating, review, created_at') // Select only needed fields + FKs
        .eq('user_id', correctUserId)
            .order('created_at', { ascending: false })
            .limit(limit)
            .range(offset, offset + limit - 1);
          
    if (itemType === 'track' || itemType === 'album') {
        query = query.eq('item_type', itemType);
    } else if (itemType) {
        console.warn(`Invalid itemType filter received: ${itemType}. Ignoring filter.`);
    }

    const { data: userRatings, error: queryError } = await query;

    if (queryError) {
        console.error(`Error querying ratings for user ${correctUserId}:`, queryError.message);
        // Avoid exposing detailed error messages if not needed
        return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }

    if (!userRatings || userRatings.length === 0) {
        console.log(`No ratings found for user ${correctUserId} with current filters.`);
        return NextResponse.json({ 
            ratings: [],
            message: 'No ratings found for this user'
        });
    }

    console.log(`Found ${userRatings.length} raw ratings for user ${correctUserId}.`);

    // --- Use the actual enrichment function --- 
    const accessToken = session?.accessToken;
    if (!accessToken) {
        console.log('No access token in session, returning raw ratings.');
        // Map to a basic structure expected by frontend if enrichment is skipped
        const basicRatings = userRatings.map(r => ({
          ...r, 
          name: `Unknown ${r.item_type}`,
          artist_name: 'Unknown Artist',
          image_url: '/placeholder.png'
        }));
        return NextResponse.json({ ratings: basicRatings });
    }
    
    console.log('Attempting to enrich ratings with Spotify data using enrichItems...');
    
    // Assuming RatingItem type is compatible or enrichItems handles the structure
    const processedRatings = await enrichItems(userRatings, null, accessToken);

    console.log(`Returning ${processedRatings.length} potentially enriched ratings.`);
    return NextResponse.json({ ratings: processedRatings });

  } catch (error: any) {
    console.error('Error in GET /api/user/ratings:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
} 