import { NextRequest, NextResponse } from 'next/server';

// Featured playlist IDs that contain popular hits
const POPULAR_PLAYLISTS = [
  '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits (official Spotify)
  '37i9dQZEVXbMDoHDwVN2tF', // Top 50 Global (official Spotify)
  '1Cgey68pUlQGsCPI2wJuxr', // Best of 2025 🔥 Most Popular Hits (user provided)
  '37i9dQZF1DX0XUsuxWHRQd', // Hot Hits USA (official Spotify)
  '37i9dQZF1DX0b1hHYQtJjp', // Pop Rising (official Spotify)
];

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
  if (!url) return 'https://placehold.co/300x300/1DB954/FFFFFF?text=Track';
  
  // Make sure Spotify CDN URLs use HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
}

export async function GET(request: NextRequest) {
  console.log("API Route: Current Hits called");
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const shuffle = url.searchParams.get('shuffle') === 'true';
    const useClientCredentials = url.searchParams.get('use_client_credentials') === 'true';
    
    console.log(`Fetching current hits, limit: ${limit}, shuffle: ${shuffle}`);
    
    // Get authorization token
    let accessToken = null;
    if (useClientCredentials) {
      try {
        console.log("Using client credentials flow for current hits");
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
      console.log("Returning mock current hits data due to missing token");
      return getMockCurrentHits(limit);
    }
    
    // Fetch tracks from each playlist
    const allTracks: any[] = [];
    const failedPlaylists: string[] = [];
    const successfulSources: string[] = [];
    
    await Promise.all(POPULAR_PLAYLISTS.map(async (playlistId) => {
      try {
        // Use direct Spotify API call with obtained access token
        const playlistResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks.items(track(id,name,artists,album,duration_ms,popularity))&limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        
        if (!playlistResponse.ok) {
          console.error(`Failed to fetch playlist ${playlistId}: ${playlistResponse.status}`);
          failedPlaylists.push(playlistId);
          return;
        }
        
        const playlistData = await playlistResponse.json();
        
        if (!playlistData.tracks || !playlistData.tracks.items || !Array.isArray(playlistData.tracks.items)) {
          console.error(`Invalid playlist data structure for ${playlistId}`);
          failedPlaylists.push(playlistId);
          return;
        }
        
        const validTracks = playlistData.tracks.items
          .filter((item: any) => item.track && item.track.id && item.track.name)
          .map((item: any) => {
            // Add playlist info to each track for reference
            const track = {
              ...item.track,
              source_playlist: {
                id: playlistId,
                name: playlistData.name || 'Unnamed Playlist'
              }
            };
            
            // Process images to ensure HTTPS
            if (track.album && track.album.images && Array.isArray(track.album.images)) {
              track.album.images = track.album.images.map((img: any) => ({
                ...img,
                url: processImageUrl(img.url)
              }));
            }
            
            return track;
          });
          
        console.log(`Retrieved ${validTracks.length} valid tracks from playlist ${playlistId} (${playlistData.name})`);
        successfulSources.push(playlistData.name || playlistId);
        allTracks.push(...validTracks);
      } catch (error) {
        console.error(`Error fetching playlist ${playlistId}:`, error);
        failedPlaylists.push(playlistId);
      }
    }));
    
    if (allTracks.length === 0) {
      console.error("Failed to fetch any tracks from current hits playlists");
      return getMockCurrentHits(limit);
    }
    
    // Remove duplicates (same track might appear in multiple playlists)
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );
    
    // Sort by popularity (if available) then shuffle if requested
    let processedTracks = uniqueTracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    
    if (shuffle) {
      processedTracks = shuffleArray(processedTracks);
    }
    
    // Limit the number of tracks
    const limitedTracks = processedTracks.slice(0, limit);
    
    console.log(`Returning ${limitedTracks.length} tracks from current hits playlists`);
    return NextResponse.json({
      tracks: limitedTracks,
      total: limitedTracks.length,
      source: successfulSources.join(', '),
      failed_playlists: failedPlaylists,
      is_mock: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error in current-hits API route:", error);
    
    // Return mock data in case of error
    console.log("Returning mock current hits data due to error");
    return getMockCurrentHits(parseInt(new URL(request.url).searchParams.get('limit') || '10'));
  }
}

// Helper function to generate mock data if everything fails
function getMockCurrentHits(limit: number) {
  console.log("Returning mock current hits data");
  const mockTracks = [
    {
      id: "7iQXmUT7XligAxxZbUvEVar",
      name: "Birds of a Feather",
      artists: [{ id: "74KM79xoOWLCCXWFS9XXJ5", name: "Sabrina Carpenter" }],
      album: {
        id: "3ZMur3RpWWDKPBHvsJs7Vg",
        name: "Emails I Can't Send (Deluxe)",
        images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }]
      },
      popularity: 95,
      duration_ms: 172000,
      source_playlist: { id: "mock", name: "Mock Top Hits" }
    },
    {
      id: "1CYtAt9HxvdJjOFjWRov1O",
      name: "Fortnight (feat. Post Malone)",
      artists: [{ id: "06HL4z0CvFAxyc27GXpf02", name: "Taylor Swift" }, { id: "246dkjvS1zLTtiykXe5h60", name: "Post Malone" }],
      album: {
        id: "6g9ewsRYf0ZMlLRnfx7xFZ",
        name: "The Tortured Poets Department",
        images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }]
      },
      popularity: 95,
      duration_ms: 215000,
      source_playlist: { id: "mock", name: "Mock Top Hits" }
    },
    {
      id: "1BxfuPKGuaTgP7aM0Bbdwr",
      name: "Cruel Summer",
      artists: [{ id: "06HL4z0CvFAxyc27GXpf02", name: "Taylor Swift" }],
      album: {
        id: "1NAmidJlEaVgA3MpcPFYGq",
        name: "Lover",
        images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }]
      },
      popularity: 99,
      duration_ms: 178000,
      source_playlist: { id: "mock", name: "Mock Top Hits" }
    },
    {
      id: "4Dvkj6JhhA12EX05fT7y2e",
      name: "As It Was",
      artists: [{ id: "6KImCVD70vtIoJWnq6nGn3", name: "Harry Styles" }],
      album: {
        id: "5r36AJ6VOJtp00oxSkBZ5h",
        name: "Harry's House",
        images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }]
      },
      popularity: 92,
      duration_ms: 167000,
      source_playlist: { id: "mock", name: "Mock Top Hits" }
    },
    {
      id: "7EbXUi68NnzQPPnTAgqDOr",
      name: "Espresso",
      artists: [{ id: "74KM79xoOWLCCXWFS9XXJ5", name: "Sabrina Carpenter" }],
      album: {
        id: "25ZLgQ9BWFyiDWi5QQq8hw",
        name: "Short n' Sweet",
        images: [{ url: "https://placehold.co/300x300/1DB954/FFFFFF?text=Album", height: 640, width: 640 }]
      },
      popularity: 88,
      duration_ms: 144000,
      source_playlist: { id: "mock", name: "Mock Top Hits" }
    }
  ];
  
  return NextResponse.json({
    tracks: mockTracks.slice(0, limit),
    total: Math.min(mockTracks.length, limit),
    source: "Mock Data",
    failed_playlists: POPULAR_PLAYLISTS,
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