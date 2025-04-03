import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getClientCredentialsToken } from '@/lib/spotify';

/**
 * GET handler for /api/spotify/search
 * Searches for tracks on Spotify
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'track,album'; // Default search type
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const token = await getClientCredentialsToken();
    if (!token) {
      return NextResponse.json({ error: 'Failed to authenticate with Spotify' }, { status: 500 });
    }

    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`;
    
    console.log(`[API Spotify Search] Fetching: ${spotifyUrl}`);
    const response = await fetch(spotifyUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store' // Search results should be fresh
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[API Spotify Search] Spotify API Error ${response.status}:`, errorData);
      return NextResponse.json({ error: `Spotify API error: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[API Spotify Search] Success for query: "${query}"`);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API Spotify Search] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Function to return mock search results for testing or when rate limited
 */
function getMockSearchResults(type: string, query: string, limit: number) {
  if (type === 'track') {
    const mockTracks = [
      {
        id: '4iV5W9uYEdYUVa79Axb7Rh',
        name: 'Starboy',
        artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }],
        album: { 
          name: 'Starboy',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }] 
        },
        popularity: 85
      },
      {
        id: '7qiZfU4dY1lWllzX7mPBI3',
        name: 'Shape of You',
        artists: [{ name: 'Ed Sheeran' }],
        album: { 
          name: '÷ (Divide)',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }] 
        },
        popularity: 87
      },
      {
        id: '0VjIjW4GlUZAMYd2vXMi3b',
        name: 'Blinding Lights',
        artists: [{ name: 'The Weeknd' }],
        album: { 
          name: 'After Hours',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }] 
        },
        popularity: 90
      },
      {
        id: '5QO79kh1waicV47BqGRL3g',
        name: 'Save Your Tears',
        artists: [{ name: 'The Weeknd' }],
        album: { 
          name: 'After Hours',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }] 
        },
        popularity: 84
      },
      {
        id: '2J2Z1SkXYghSajLibnQHOa',
        name: 'Cut To The Feeling',
        artists: [{ name: 'Carly Rae Jepsen' }],
        album: { 
          name: 'Cut To The Feeling',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273273b4bd284bbeadd37b8b2c8' }] 
        },
        popularity: 78
      }
    ];
    
    // Customize mock results based on search query
    const customizedTracks = mockTracks.map((track, i) => ({
      ...track,
      name: i === 0 ? `${query} (Search Result)` : `${track.name} (${query} Mix)`,
    }));

    // Duplicate tracks if more are needed to meet the limit
    const finalTracks = [];
    while (finalTracks.length < limit) {
      finalTracks.push(...customizedTracks.slice(0, limit - finalTracks.length));
    }
    
    return { tracks: { items: finalTracks } };
  }
  
  // For other types
  return { [type]: { items: [] } };
} 