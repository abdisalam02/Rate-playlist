import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

// Log environment variables at module scope (runs once on server start)
console.log(`[Activities Route] SUPABASE_URL (global client check): ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded' : 'MISSING'}`);
console.log(`[Activities Route] SUPABASE_SERVICE_ROLE_KEY (global client check): ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'MISSING'}`);
console.log(`[Activities Route] SUPABASE_ANON_KEY (global client check): ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded' : 'MISSING'}`);

export async function GET(
  request: NextRequest,
  { params }: { params: { userId?: string } }
) {
  // Await params before accessing
  const awaitedParams = await params;
  const userId = awaitedParams?.userId;
  
  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required", details: "No user ID provided in the URL path." },
      { status: 400 }
    );
  }
  
  try {
    console.log('[Activities Route] Inside GET handler - Using global Supabase client');
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // NOTE: We are now using the global 'supabase' client imported above
    // instead of createRouteHandlerClient
    console.log('[Activities Route] Fetching activities using global Supabase client...');
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (activitiesError) {
      console.error('[Activities Route] Error fetching user activities from Supabase (global client):', activitiesError);
      return getMockActivities(userId);
    }
    
    console.log(`[Activities Route] Successfully fetched ${activities?.length || 0} activities from Supabase (global client).`);
    
    // If no activities, use mock data
    if (!activities || activities.length === 0) {
      return getMockActivities(userId);
    }
    
    // Enrich with item details from Spotify API
    const formattedActivities = await enrichActivityData(activities);
    
    return NextResponse.json({
      activities: formattedActivities,
      hasMore: activities.length === limit
    });
    
  } catch (error) {
    console.error('[Activities Route] Unexpected error in GET handler:', error);
    return getMockActivities(userId);
  }
}

// Helper function to provide mock activities
function getMockActivities(userId: string) {
  const mockActivities = [
    {
      id: 1,
      user_id: userId,
      activity_type: 'rating',
      item_id: '4iV5W9uYEdYUVa79Axb7Rh',
      item_type: 'track',
      item_name: 'Starboy',
      item_image: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452',
      item_artists: 'The Weeknd, Daft Punk',
      rating: 4.5,
      created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
      id: 2,
      user_id: userId,
      activity_type: 'review',
      item_id: '4aawyAB9vmqN3uQ7FjRGTy',
      item_type: 'album',
      item_name: 'Dawn FM',
      item_image: 'https://i.scdn.co/image/ab67616d0000b2734ab2520c2c77a1d66b9ee21d',
      item_artists: 'The Weeknd',
      review: 'A fantastic concept album that blends retro synth-pop with contemporary R&B. The Weeknd truly outdid himself with this one.',
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: 3,
      user_id: userId,
      activity_type: 'rating',
      item_id: '7qiZfU4dY1lWllzX7mPBI3',
      item_type: 'track',
      item_name: 'Shape of You',
      item_image: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
      item_artists: 'Ed Sheeran',
      rating: 3.5,
      created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
  ];
  
  return NextResponse.json({
    activities: mockActivities,
    hasMore: false
  });
}

// Helper function to enrich activity data with Spotify item details
async function enrichActivityData(activities: any[]) {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  try {
    // Read session correctly (getServerSession is already async)
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken || '';
    
    if (!accessToken) {
      // Return activities without enrichment if no token
      return activities;
    }
    
    // Group activities by type to batch fetch
    const trackActivities = activities.filter(a => a.item_type === 'track');
    const albumActivities = activities.filter(a => a.item_type === 'album');
    
    // Fetch track details
    const enrichedTracks = await Promise.all(
      trackActivities.map(async activity => {
        try {
          if (!activity.item_id) return activity;
          
          const response = await fetch(`https://api.spotify.com/v1/tracks/${activity.item_id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            cache: 'no-store'
          });
          
          if (!response.ok) {
            // If can't fetch, just return the activity as is
            return activity;
          }
          
          const trackData = await response.json();
          
          return {
            ...activity,
            item_name: trackData.name,
            item_image: trackData.album?.images?.[0]?.url,
            item_artists: trackData.artists?.map((a: any) => ({ name: a.name })) || [{ name: 'Unknown Artist' }]
          };
        } catch (error) {
          return {
            ...activity,
            item_artists: [{ name: 'Unknown Artist' }]
          };
        }
      })
    );
    
    // Fetch album details
    const enrichedAlbums = await Promise.all(
      albumActivities.map(async activity => {
        try {
          if (!activity.item_id) return activity;
          
          const response = await fetch(`https://api.spotify.com/v1/albums/${activity.item_id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            cache: 'no-store'
          });
          
          if (!response.ok) {
            // If can't fetch, just return the activity as is
            return activity;
          }
          
          const albumData = await response.json();
          
          return {
            ...activity,
            item_name: albumData.name,
            item_image: albumData.images?.[0]?.url,
            item_artists: albumData.artists?.map((a: any) => ({ name: a.name })) || [{ name: 'Unknown Artist' }]
          };
        } catch (error) {
          return {
            ...activity,
            item_artists: [{ name: 'Unknown Artist' }]
          };
        }
      })
    );
    
    // Combine enriched data with other activities
    const otherActivities = activities.filter(a => 
      a.item_type !== 'track' && a.item_type !== 'album'
    );
    
    // Combine and ensure all items have the artists array
    const combinedActivities = [...enrichedTracks, ...enrichedAlbums, ...otherActivities].map(act => ({
      ...act,
      item_artists: act.item_artists || (act.item_type === 'track' || act.item_type === 'album' ? [{ name: 'Unknown Artist' }] : undefined)
    }));
    
    return combinedActivities.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
  } catch (error) {
    console.error('Error enriching activity data:', error);
    // Fallback for main error: ensure artists array
    return activities.map(act => ({
      ...act,
      item_artists: act.item_artists || (act.item_type === 'track' || act.item_type === 'album' ? [{ name: 'Unknown Artist' }] : undefined)
    }));
  }
} 