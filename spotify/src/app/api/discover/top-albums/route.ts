import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("API Route: Top Albums called");
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    const useClientCredentials = request.nextUrl.searchParams.get('use_client_credentials') === 'true';
    
    // If we need to use client credentials, make the necessary API call
    let accessToken = null;
    if (useClientCredentials) {
      try {
        console.log("Using client credentials flow for top albums");
        
        // Use absolute URL for the Spotify client token endpoint
        const baseUrl = new URL(request.url).origin;
        const tokenUrl = `${baseUrl}/api/auth/spotify-client-token`;
        
        console.log(`Fetching client token from: ${tokenUrl}`);
        const tokenResponse = await fetch(tokenUrl, {
          cache: 'no-store'
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
          console.log("Successfully obtained client credentials token");
        } else {
          console.error(`Failed to get client credentials token: ${tokenResponse.status}`);
        }
      } catch (error) {
        console.error("Error fetching client credentials token:", error);
      }
    }
    
    // Use client token or fall back to auth header
    const finalAuthHeader = accessToken 
      ? `Bearer ${accessToken}` 
      : authHeader;
      
    if (!finalAuthHeader) {
      console.error('No authorization method available for top albums request');
      return NextResponse.json({ error: 'No authorization available' }, { status: 401 });
    }
    
    // Get limit from query params (optional)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    console.log(`Fetching top albums with limit=${limit}`);
    
    try {
      // Spotify doesn't have a direct "top albums" endpoint, so we'll use a curated playlist 
      // of top albums and extract the album data from the tracks
      // Using Today's Top Hits as a source for popular albums
      const topAlbumsPlaylistId = '37i9dQZF1DXcBWIGoYBM5M';
      
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${topAlbumsPlaylistId}/tracks?limit=${limit * 2}&market=US`,
        {
          headers: { 'Authorization': finalAuthHeader },
          cache: 'no-store'
        }
      );
      
      if (!tracksResponse.ok) {
        console.error(`Failed to fetch tracks from Top Albums playlist: ${tracksResponse.status}`);
        throw new Error(`Tracks fetch failed with status: ${tracksResponse.status}`);
      }
      
      const tracksData = await tracksResponse.json();
      const tracks = tracksData.items
        .map((item: any) => item.track)
        .filter((track: any) => track !== null && track.album);
      
      // Extract unique albums from the tracks
      const albumMap = new Map();
      tracks.forEach((track: any) => {
        if (track.album && !albumMap.has(track.album.id)) {
          albumMap.set(track.album.id, track.album);
        }
      });
      
      const albums = Array.from(albumMap.values()).slice(0, limit);
      
      if (albums.length > 0) {
        console.log(`Successfully retrieved ${albums.length} top albums`);
        return NextResponse.json({ 
          items: albums,
          albums: {
            items: albums,
            total: albums.length,
            limit: limit
          },
          tracks: tracks.slice(0, limit) // Include tracks as well for consistency
        });
      } else {
        console.error("Top Albums playlist returned no valid albums");
        throw new Error("Top Albums playlist returned no valid albums");
      }
    } catch (err) {
      console.error(`Error fetching top albums:`, err);
      
      // Try popular-albums as a fallback
      try {
        console.log("Falling back to popular-albums data");
        
        // Use absolute URL for fallback requests too
        const baseUrl = new URL(request.url).origin;
        const fallbackParams = useClientCredentials ? 'use_client_credentials=true' : '';
        const fallbackUrl = `${baseUrl}/api/discover/popular-albums?limit=${limit}${fallbackParams ? `&${fallbackParams}` : ''}`;
        
        console.log(`Trying fallback: ${fallbackUrl}`);
        const fallbackResponse = await fetch(fallbackUrl, {
          cache: 'no-store'
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const albums = fallbackData.albums?.items || [];
          return NextResponse.json({ 
            items: albums,
            albums: {
              items: albums,
              total: albums.length,
              limit: limit
            }
          });
        } else {
          console.error(`Fallback request failed with status: ${fallbackResponse.status}`);
        }
      } catch (fallbackErr) {
        console.error("Error fetching fallback popular albums:", fallbackErr);
      }
      
      // Return mock data if all attempts fail
      const mockAlbums = getMockAlbums(limit);
      console.log("All methods failed, returning mock data");
      return NextResponse.json({ 
        items: mockAlbums,
        albums: {
          items: mockAlbums,
          total: mockAlbums.length,
          limit: limit
        },
        is_mock: true 
      });
    }
  } catch (error) {
    console.error('Top albums API error:', error);
    // Return mock data on error
    const mockAlbums = getMockAlbums(10);
    return NextResponse.json({ 
      items: mockAlbums,
      albums: {
        items: mockAlbums,
        total: mockAlbums.length,
        limit: 10
      },
      is_mock: true,
      error: 'Internal server error' 
    });
  }
}

// Helper function to generate mock data
function getMockAlbums(limit = 10) {
  const mockAlbums = [
    {
      id: '4aawyAB9vmqN3uQ7FjRGTy',
      name: 'SOS',
      artists: [{ id: '7tYKF4w9nC0nq9CsPZTHyP', name: 'SZA' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2730c471c36970b9406233842a5', height: 300, width: 300 }],
      release_date: '2022-12-09'
    },
    {
      id: '5MS3MvWHJ3lOZPLiMxzOU6',
      name: 'RENAISSANCE',
      artists: [{ id: '6vWDO969PvNqNYHIOW5v0m', name: 'Beyoncé' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2730e58a0f8308c1ad403d105e7', height: 300, width: 300 }],
      release_date: '2022-07-29'
    },
    {
      id: '151w1FgRZfnKZA9FEcg9Z3',
      name: 'Midnights',
      artists: [{ id: '06HL4z0CvFAxyc27GXpf02', name: 'Taylor Swift' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2735bdb3b72aafc1f9973f9e3ce', height: 300, width: 300 }],
      release_date: '2022-10-21'
    },
    {
      id: '1bCmvPBHzVTgvdgFjgkKuK',
      name: 'Un Verano Sin Ti',
      artists: [{ id: '4q3ewBCX7sLwd24euuV69X', name: 'Bad Bunny' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273645c5ed79fe068eea2fab331', height: 300, width: 300 }],
      release_date: '2022-05-06'
    },
    {
      id: '3SpBlxme9WbeQdI9kx7KAV',
      name: 'Harry\'s House',
      artists: [{ id: '6KImCVD70vtIoJWnq6nGn3', name: 'Harry Styles' }],
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0', height: 300, width: 300 }],
      release_date: '2022-05-20'
    }
  ];
  
  // Return a subset or the whole array depending on limit
  return mockAlbums.slice(0, Math.min(limit, mockAlbums.length));
} 