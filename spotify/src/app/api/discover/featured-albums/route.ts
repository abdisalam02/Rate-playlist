import { NextRequest, NextResponse } from 'next/server';

// Featured album sources - focusing only on the 500 best albums of all time
const ALBUM_SOURCES = {
  playlists: [
    '4KmcBdDIbHeO0alvCfk2TC', // 500 best albums of all time (user provided)
  ],
  apis: [
    // No API sources - we're focusing on the 500 best albums playlist
  ]
};

// Function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper function to process image URLs
function processImageUrl(url: string | undefined): string {
  if (!url) return 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album';
  
  // Make sure Spotify CDN URLs use HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
}

export async function GET(request: NextRequest) {
  console.log("API Route: Featured Albums called");
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const shuffle = url.searchParams.get('shuffle') === 'true';
    const useClientCredentials = url.searchParams.get('use_client_credentials') === 'true';
    
    console.log(`Fetching featured albums, limit: ${limit}, shuffle: ${shuffle}`);
    
    // Get authorization token
    let accessToken = null;
    if (useClientCredentials) {
      try {
        console.log("Using client credentials flow for featured albums");
        // Use absolute URL for the Spotify client token endpoint
        const baseUrl = new URL(request.url).origin;
        const tokenUrl = `${baseUrl}/api/auth/spotify-client-token`;
        
        console.log(`Fetching client token from: ${tokenUrl}`);
        const tokenResponse = await fetch(tokenUrl, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          }
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
    } else {
      // Try to get auth header
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log("Using auth header token");
      } else {
        // Try to get token via client credentials as fallback
        try {
          console.log("No auth header, falling back to client credentials");
          const baseUrl = new URL(request.url).origin;
          const tokenUrl = `${baseUrl}/api/auth/spotify-client-token`;
          
          const tokenResponse = await fetch(tokenUrl, {
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            accessToken = tokenData.access_token;
            console.log("Successfully obtained fallback client credentials token");
          }
        } catch (fallbackError) {
          console.error("Error fetching fallback token:", fallbackError);
        }
      }
    }
    
    if (!accessToken) {
      console.error("No authorization token available");
      console.log("Returning mock featured albums data due to missing token");
      return getMockFeaturedAlbums(limit);
    }
    
    // Collect albums from all sources
    const allAlbums: any[] = [];
    const failedSources: string[] = [];
    const successfulSources: string[] = [];
    
    // Skip API endpoints and go straight to the 500 best albums playlist
    // APPROACH: Get albums directly from the 500 best albums playlist
    await Promise.all(ALBUM_SOURCES.playlists.map(async (playlistId) => {
      try {
        console.log(`Fetching albums from playlist: ${playlistId}`);
        // First get playlist details for the name
        const playlistResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}?fields=name`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        
        if (!playlistResponse.ok) {
          console.error(`Failed to fetch playlist ${playlistId} info: ${playlistResponse.status}`);
          failedSources.push(playlistId);
          return;
        }
        
        const playlistData = await playlistResponse.json();
        const playlistName = playlistData.name || `Playlist ${playlistId}`;
        
        // Now get the tracks to extract albums
        const tracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit * 3}&market=US`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        
        if (!tracksResponse.ok) {
          console.error(`Failed to fetch tracks from playlist ${playlistId}: ${tracksResponse.status}`);
          failedSources.push(playlistName);
          return;
        }
        
        const tracksData = await tracksResponse.json();
        const tracks = tracksData.items || [];
        
        // Extract unique albums from tracks
        const albumMap = new Map();
        
        for (const item of tracks) {
          if (item.track?.album && !albumMap.has(item.track.album.id)) {
            // Process album image URLs
            const album = {...item.track.album};
            if (album.images && Array.isArray(album.images)) {
              album.images = album.images.map((img: any) => ({
                ...img,
                url: processImageUrl(img.url)
              }));
            }
            
            albumMap.set(item.track.album.id, {
              ...album,
              source: playlistName
            });
          }
        }
        
        // Add unique albums to our collection
        const playlistAlbums = Array.from(albumMap.values());
        console.log(`Extracted ${playlistAlbums.length} unique albums from playlist: ${playlistName}`);
        
        if (playlistAlbums.length > 0) {
          allAlbums.push(...playlistAlbums);
          successfulSources.push(playlistName);
        } else {
          failedSources.push(playlistName);
        }
      } catch (error) {
        console.error(`Error fetching from playlist ${playlistId}:`, error);
        failedSources.push(playlistId);
      }
    }));
    
    if (allAlbums.length === 0) {
      console.error("Failed to fetch albums from any source");
      return getMockFeaturedAlbums(limit);
    }
    
    // Remove duplicates (by album ID)
    const uniqueAlbums = allAlbums.filter((album, index, self) => 
      index === self.findIndex(a => a.id === album.id)
    );
    
    // Sort by release date (newest first) if available
    let processedAlbums = uniqueAlbums.sort((a, b) => {
      const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
      const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Shuffle if requested
    if (shuffle) {
      processedAlbums = shuffleArray(processedAlbums);
    }
    
    // Limit the number of albums
    const limitedAlbums = processedAlbums.slice(0, limit);
    
    console.log(`Returning ${limitedAlbums.length} albums from sources: ${successfulSources.join(', ')}`);
    return NextResponse.json({
      albums: {
        items: limitedAlbums,
        total: limitedAlbums.length,
        limit: limit,
        href: 'spotify:featured-albums'
      },
      source: successfulSources.join(', '),
      failed_sources: failedSources,
      is_mock: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error in featured-albums API route:", error);
    
    // Return mock data in case of error
    console.log("Returning mock featured albums data due to error");
    return getMockFeaturedAlbums(parseInt(new URL(request.url).searchParams.get('limit') || '10'));
  }
}

// Helper function to generate mock data if everything fails
function getMockFeaturedAlbums(limit: number) {
  console.log("Returning mock featured albums data");
  const mockAlbums = [
    {
      id: "1PztLVGXRj4HKGfxFMyldW",
      name: "Harlequin",
      artists: [{ id: "1HY2Jd0NmPuamShAr6KMms", name: "Lady Gaga" }],
      images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }],
      release_date: "2024-05-26",
      source: "Featured Albums Mock"
    },
    {
      id: "59yLQ15ZWTM6s58Cqb0mMt",
      name: "HIT ME HARD AND SOFT",
      artists: [{ id: "6qqNVTkY8uBg9cP3Jd7DAH", name: "Billie Eilish" }],
      images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }],
      release_date: "2024-05-17",
      source: "Featured Albums Mock"
    },
    {
      id: "5GWRl6NBtezs0Sxn7MjGqY",
      name: "Short n' Sweet",
      artists: [{ id: "74KM79xoOWLCCXWFS9XXJ5", name: "Sabrina Carpenter" }],
      images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }],
      release_date: "2024-08-24",
      source: "Featured Albums Mock"
    }
  ];
  
  return NextResponse.json({
    albums: {
      items: mockAlbums.slice(0, limit),
      total: Math.min(mockAlbums.length, limit),
      limit: limit,
      href: 'spotify:mock-featured-albums'
    },
    source: "Mock Data",
    failed_sources: [...ALBUM_SOURCES.playlists, ...ALBUM_SOURCES.apis],
    is_mock: true,
    timestamp: new Date().toISOString()
  });
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 