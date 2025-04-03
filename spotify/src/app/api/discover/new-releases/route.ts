import { NextRequest, NextResponse } from 'next/server';

// --- Helper Function for Spotify Client Credentials (Duplicate - refactor later) ---
const getClientCredentialsToken = async (): Promise<string | null> => { 
  console.warn("[API New Releases] Using placeholder getClientCredentialsToken"); 
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[API New Releases] Missing Spotify client ID or secret.");
    return null;
  }
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', { 
      method: 'POST', 
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }, 
      body: new URLSearchParams({ grant_type: 'client_credentials' }), 
      cache: 'no-store'
    });
    if (!response.ok) {
      console.error(`[API New Releases] Failed to get Spotify token: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    console.log("[API New Releases] Successfully obtained client credentials token.");
    return data.access_token;
  } catch (error) {
    console.error("[API New Releases] Error fetching client credentials token:", error);
    return null;
  }
};

export async function GET(request: NextRequest) {
  console.log("API Route: New Releases called (using HITS 2025 playlist)");
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    const useClientCredentials = request.nextUrl.searchParams.get('use_client_credentials') === 'true';
    
    let accessToken = null;
    if (useClientCredentials) {
      // Call the helper function directly
      accessToken = await getClientCredentialsToken(); 
      if (!accessToken) {
        console.error('[API New Releases] Failed to get client credentials token directly.');
        // Decide how to handle failure - maybe fallback to authHeader if available, or error out?
        // For now, let's try to continue with authHeader if it exists.
      }
    }
    
    // Use client token or fall back to auth header
    const finalAuthHeader = accessToken 
      ? `Bearer ${accessToken}` 
      : authHeader;
      
    if (!finalAuthHeader) {
      console.error('No authorization method available for HITS 2025 playlist request');
      return NextResponse.json({ error: 'No authorization available' }, { status: 401 });
    }
    
    // Get limit from query params (optional)
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '20';
    
    // Use HITS 2025 playlist ID
    const hits2025PlaylistId = '5iwkYfnHAGMEFLiHFFGnP4';
    
    console.log(`Fetching HITS 2025 playlist: ${hits2025PlaylistId}`);
    
    try {
      // Get the playlist tracks
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${hits2025PlaylistId}/tracks?limit=${limit}`,
        {
          headers: {
            'Authorization': finalAuthHeader
          },
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        console.error(`Spotify API error for HITS 2025 playlist: ${response.status}`);
        throw new Error(`HITS 2025 playlist API failed with status: ${response.status}`);
      }

      const playlistData = await response.json();
      
      // Transform playlist tracks to match the format expected by the front-end
      // Ensure image URLs are complete with the full Spotify domain
      const albums = playlistData.items
        .filter(item => item.track && item.track.album) // Filter out any null tracks
        .map(item => {
          const album = item.track.album;
          
          // Ensure each image has a complete URL
          if (album.images && album.images.length > 0) {
            album.images = album.images.map(image => {
              // If the URL doesn't start with http/https, it's likely missing the domain
              if (image.url && !image.url.startsWith('http')) {
                return {
                  ...image,
                  url: `https://i.scdn.co/image/${image.url}`
                };
              }
              return image;
            });
          }
          
          return album;
        })
        .filter((album, index, self) => 
          // Deduplicate albums by id
          index === self.findIndex((a) => a.id === album.id)
        )
        .slice(0, parseInt(limit));
      
      console.log(`Successfully retrieved ${albums.length} new releases`);

      return NextResponse.json({
        albums: {
          items: albums,
          total: albums.length,
          limit: parseInt(limit)
        },
        items: albums // Add a top-level items array for consistency with other endpoints
      });
      
    } catch (error) {
      console.error('HITS 2025 playlist fetch error:', error);
      
      // Try to fallback to mock data
      try {
        console.log("Falling back to mock new releases data");
        
        // Use absolute URL for the mock endpoint
        const baseUrl = new URL(request.url).origin;
        const mockUrl = `${baseUrl}/api/discover/mock-new-releases`;
        
        console.log(`Fetching mock data from: ${mockUrl}`);
        const mockResponse = await fetch(mockUrl, {
          cache: 'no-store'
        });
        
        if (mockResponse.ok) {
          console.log("Successfully retrieved mock new releases data");
          const mockData = await mockResponse.json();
          // Add items property if it doesn't exist
          if (mockData.albums && mockData.albums.items && !mockData.items) {
            mockData.items = mockData.albums.items;
          }
          return NextResponse.json(mockData);
        } else {
          console.error(`Mock data request failed with status: ${mockResponse.status}`);
        }
      } catch (mockErr) {
        console.error("Error fetching mock new releases:", mockErr);
      }
      
      // Return a simple mock directly if all else fails with proper image URLs
      const mockAlbums = getMockNewReleases();
      console.log("All approaches failed, returning inline mock data");
      return NextResponse.json({ 
        albums: {
          items: mockAlbums,
          total: mockAlbums.length,
          limit: parseInt(limit),
          is_mock: true
        },
        items: mockAlbums // Add a top-level items array for consistency
      });
    }
  } catch (error) {
    console.error('HITS 2025 playlist API error:', error);
    // Return mock data on error
    const mockAlbums = getMockNewReleases();
    return NextResponse.json({ 
      albums: {
        items: mockAlbums,
        total: mockAlbums.length,
        limit: 5,
        is_mock: true
      },
      items: mockAlbums, // Add a top-level items array for consistency
      error: 'Internal server error' 
    });
  }
}

// Updated mock data to better reflect current popular albums with full image URLs
function getMockNewReleases() {
  return [
    {
      id: '022riawcm8bLFgjUVEvmQP',
      name: 'APT.',
      artists: [{ id: '5JYtpnUKxAzXfHEYpOeeit', name: 'ROSÉ' }, { id: '0du5cEVh5yTK9QJze8zA0C', name: 'Bruno Mars' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d52bfb90ee8dfeda8378b98c', height: 300, width: 300 }],
      release_date: '2024-04-26'
    },
    {
      id: '2rYe8bQJ3dFDD5xz9NoTJh',
      name: 'Die With A Smile',
      artists: [{ id: '1HY2Jd0NmPuamShAr6KMms', name: 'Lady Gaga' }, { id: '0du5cEVh5yTK9QJze8zA0C', name: 'Bruno Mars' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273fde2c8fc1afe0f5ffa456ece', height: 300, width: 300 }],
      release_date: '2024-08-16'
    },
    {
      id: '7afoQECFxVbAoY7HV2Ut0C',
      name: 'Anxiety',
      artists: [{ id: '5fEwFgvxk2kBEFAKKJwoTF', name: 'Doechii' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273a49421dd3a18169d5845ffe3', height: 300, width: 300 }],
      release_date: '2024-08-02'
    },
    {
      id: '4OmFmE1ClvPhmRJJiM55xS',
      name: 'BIRDS OF A FEATHER',
      artists: [{ id: '6qqNVTkY8uBg9cP3Jd7DAH', name: 'Billie Eilish' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273f93e7b79b18799cfee093978', height: 300, width: 300 }],
      release_date: '2024-03-08'
    },
    {
      id: '2oe4YNpvnXYEzK5HzOZnL4',
      name: 'That\'s So True',
      artists: [{ id: '4tuJ0bMpJh08umKkEXKUI1', name: 'Gracie Abrams' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273e7b8071cc85ff715a45566c1', height: 300, width: 300 }],
      release_date: '2024-07-26'
    }
  ];
} 