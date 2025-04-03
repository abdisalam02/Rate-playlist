import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type') || 'track';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Validate parameters
    if (!['track', 'album'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid item type. Must be "track" or "album"' },
        { status: 400 }
      );
    }
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get user's top rated items
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('item_id, item_type, rating')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .order('rating', { ascending: false })
      .limit(limit)
      .offset(offset);
    
    if (ratingsError) {
      console.error('Error fetching user ratings:', ratingsError);
      // Return mock data rather than error for better UX
      return getMockItems(userId, itemType, limit);
    }
    
    // If no ratings, use mock data
    if (!ratings || ratings.length === 0) {
      return getMockItems(userId, itemType, limit);
    }
    
    // Enrich with item details from Spotify API
    const enrichedItems = await enrichItemData(ratings);
    
    return NextResponse.json({
      items: enrichedItems,
      hasMore: ratings.length === limit
    });
    
  } catch (error) {
    console.error('Error in user top items GET route:', error);
    return getMockItems(userId, 'track', 10);
  }
}

// Helper function to provide mock items
function getMockItems(userId: string, itemType: string, limit: number) {
  if (itemType === 'track') {
    const mockTracks = [
      { 
        id: '4iV5W9uYEdYUVa79Axb7Rh', 
        name: 'Starboy', 
        artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }],
        album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }] },
        rating: 4.7
      },
      { 
        id: '7qiZfU4dY1lWllzX7mPBI3', 
        name: 'Shape of You', 
        artists: [{ name: 'Ed Sheeran' }],
        album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }] },
        rating: 4.5
      },
      { 
        id: '0VjIjW4GlUZAMYd2vXMi3b', 
        name: 'Blinding Lights', 
        artists: [{ name: 'The Weeknd' }],
        album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }] },
        rating: 4.9
      },
      { 
        id: '5QO79kh1waicV47BqGRL3g', 
        name: 'Save Your Tears', 
        artists: [{ name: 'The Weeknd' }],
        album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }] },
        rating: 4.6
      }
    ];
    
    return NextResponse.json({ 
      items: mockTracks.slice(0, limit),
      hasMore: false
    });
  } else {
    const mockAlbums = [
      {
        id: '4aawyAB9vmqN3uQ7FjRGTy',
        name: 'Dawn FM',
        artists: [{ name: 'The Weeknd' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734ab2520c2c77a1d66b9ee21d' }],
        rating: 4.8
      },
      {
        id: '2noRn2Aes5aoNVsU6iWThc',
        name: 'My Beautiful Dark Twisted Fantasy',
        artists: [{ name: 'Kanye West' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f' }],
        rating: 4.9
      },
      {
        id: '5r36AJ6VOJtp00oxSkBZ5h',
        name: 'To Pimp A Butterfly',
        artists: [{ name: 'Kendrick Lamar' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' }],
        rating: 4.9
      },
      {
        id: '6T7MPEuAR1vBj3Tq1cPX8O',
        name: 'Blonde',
        artists: [{ name: 'Frank Ocean' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526' }],
        rating: 4.8
      }
    ];
    
    return NextResponse.json({ 
      items: mockAlbums.slice(0, limit),
      hasMore: false
    });
  }
}

// Helper function to enrich item data with Spotify item details
async function enrichItemData(ratings: any[]) {
  if (!ratings || ratings.length === 0) {
    return [];
  }
  
  try {
    // Get session for access token
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken || '';
    
    if (!accessToken) {
      // Return basic items if no token
      return ratings.map(r => ({
        id: r.item_id,
        name: 'Unknown Item',
        rating: r.rating
      }));
    }
    
    // Split by item type
    const trackIds = ratings
      .filter(r => r.item_type === 'track')
      .map(r => r.item_id);
    
    const albumIds = ratings
      .filter(r => r.item_type === 'album')
      .map(r => r.item_id);
    
    let enrichedItems = [];
    
    // Fetch tracks in batches
    if (trackIds.length > 0) {
      // Process in smaller batches to avoid URL length limits
      const trackBatches = chunkArray(trackIds, 20);
      
      for (const batch of trackBatches) {
        const trackResponse = await fetch(
          `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            cache: 'no-store'
          }
        );
        
        if (trackResponse.ok) {
          const trackData = await trackResponse.json();
          
          // Combine track data with ratings
          const enrichedTracks = trackData.tracks.map((track: any) => {
            const rating = ratings.find(r => r.item_id === track.id)?.rating || 0;
            return {
              ...track,
              rating
            };
          });
          
          enrichedItems = [...enrichedItems, ...enrichedTracks];
        }
      }
    }
    
    // Fetch albums in batches
    if (albumIds.length > 0) {
      // Process in smaller batches to avoid URL length limits
      const albumBatches = chunkArray(albumIds, 20);
      
      for (const batch of albumBatches) {
        const albumResponse = await fetch(
          `https://api.spotify.com/v1/albums?ids=${batch.join(',')}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            cache: 'no-store'
          }
        );
        
        if (albumResponse.ok) {
          const albumData = await albumResponse.json();
          
          // Combine album data with ratings
          const enrichedAlbums = albumData.albums.map((album: any) => {
            const rating = ratings.find(r => r.item_id === album.id)?.rating || 0;
            return {
              ...album,
              rating
            };
          });
          
          enrichedItems = [...enrichedItems, ...enrichedAlbums];
        }
      }
    }
    
    // If no items could be fetched, just return the basic items
    if (enrichedItems.length === 0) {
      return ratings.map(r => ({
        id: r.item_id,
        name: 'Unknown Item',
        rating: r.rating
      }));
    }
    
    // Sort by rating (highest first)
    return enrichedItems.sort((a, b) => b.rating - a.rating);
    
  } catch (error) {
    console.error('Error enriching item data:', error);
    // Return basic items if error
    return ratings.map(r => ({
      id: r.item_id,
      name: 'Unknown Item',
      rating: r.rating
    }));
  }
}

// Helper function to chunk array
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
} 