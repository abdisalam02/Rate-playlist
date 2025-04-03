import { NextRequest, NextResponse } from 'next/server';

// Featured playlist IDs that are popular and diverse
const FEATURED_PLAYLISTS = [
  '37i9dQZF1DX2L0iB23Enbq', // Trending Playlist
  '5ABHKGoOzxkaa28ttQV9sE', // Most Streamed Playlist
  '5zCdhPJHI9kgYsgkSBEWT0', // Best RnB Playlist
  '34NbomaTu7YuOYnky8nLXL', // Pop Hits 2025 (Top 50)
  '357fWKFTiDhpt9C69CMG4q', // 2010 Bangers
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
  console.log("API Route: Home Featured Tracks called");
  try {
    const url = new URL(request.url);
    const tracksPerPlaylist = parseInt(url.searchParams.get('tracks_per_playlist') || '6');
    const shuffle = url.searchParams.get('shuffle') === 'true';
    const useClientCredentials = url.searchParams.get('use_client_credentials') === 'true';
    
    console.log(`Fetching ${tracksPerPlaylist} tracks per playlist, shuffle: ${shuffle}`);
    
    // Get authorization token
    let accessToken = null;
    if (useClientCredentials) {
      try {
        console.log("Using client credentials flow for featured tracks");
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
      console.log("Returning mock featured tracks data due to missing token");
      return getMockFeaturedTracks();
    }
    
    // Fetch tracks from each playlist
    const allTracks: any[] = [];
    const failedPlaylists: string[] = [];
    
    await Promise.all(FEATURED_PLAYLISTS.map(async (playlistId) => {
      try {
        const baseUrl = new URL(request.url).origin;
        // Use our own API endpoint instead of direct Spotify API call
        const playlistUrl = `${baseUrl}/api/spotify/playlist/${playlistId}?limit=${tracksPerPlaylist}&use_client_credentials=true`;
        console.log(`Fetching playlist from: ${playlistUrl}`);
        
        const playlistResponse = await fetch(playlistUrl, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
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
            // Add playlist_id to each track for grouping
            const track = {
              ...item.track,
              playlist_id: playlistId,
              playlist_name: playlistData.name || 'Unnamed Playlist'
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
        allTracks.push(...validTracks);
      } catch (error) {
        console.error(`Error fetching playlist ${playlistId}:`, error);
        failedPlaylists.push(playlistId);
      }
    }));
    
    if (allTracks.length === 0) {
      console.error("Failed to fetch any tracks from featured playlists");
      // Try to fall back to the mock data
      console.log("All playlist fetches failed, using mock data");
      return getMockFeaturedTracks();
    }
    
    // Shuffle tracks if requested
    const finalTracks = shuffle ? shuffleArray(allTracks) : allTracks;
    
    console.log(`Returning ${finalTracks.length} tracks from featured playlists`);
    return NextResponse.json({
      tracks: finalTracks,
      total: finalTracks.length,
      failed_playlists: failedPlaylists
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
    
  } catch (error) {
    console.error("Error in home-featured-tracks API route:", error);
    
    // Return mock data in case of error
    console.log("Returning mock featured tracks data due to error");
    return getMockFeaturedTracks();
  }
}

// Helper function to generate mock data if everything fails
function getMockFeaturedTracks() {
  console.log("Returning mock featured tracks data");
  const mockTracks = [
    {
      id: "32OlwWuMpZ6b0aN2RZOeMS",
      name: "Uptown Funk (feat. Bruno Mars)",
      artists: [{ id: "3hv9jJF3adDNsBSIQDqcjp", name: "Mark Ronson" }, { id: "0du5cEVh5yTK9QJze8zA0C", name: "Bruno Mars" }],
      album: { 
        id: "3vLaOYCNCzngDf8QdBg2Zy",
        name: "Uptown Special", 
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2738e7ded275eb624f673ff9e9a", height: 300, width: 300 }] 
      },
      duration_ms: 270240,
      preview_url: "https://p.scdn.co/mp3-preview/9252743ac2ecd5e7a1874c3c38c3ca05e1a03a67",
      playlist_id: "37i9dQZF1DX0SPPXJeeVcg",
      playlist_name: "Mock 2010s Hits"
    },
    {
      id: "2ykVhnIiyQYEb4n9Str3tP",
      name: "HUMBLE.",
      artists: [{ id: "2YZyLoL8N0Wb9xBt1NhZWg", name: "Kendrick Lamar" }],
      album: { 
        id: "4eLPsYPBmXABThSJ821sqY", 
        name: "DAMN.", 
        images: [{ url: "/placeholder-track.png", height: 300, width: 300 }] 
      },
      duration_ms: 177000,
      preview_url: "https://p.scdn.co/mp3-preview/b4a6dad587d55e9848be3cb971516375657e737d",
      playlist_id: "37i9dQZF1DXb8wplbC2YhV"
    },
    {
      id: "3GCdLUSnKSMJhs4Tj6CV3s",
      name: "All of Me",
      artists: [{ id: "5y2Xq6xcjJb2jVM54GHK3t", name: "John Legend" }],
      album: { 
        id: "3FQnZ3ss7e8mgKH4R9OJYq", 
        name: "Love In The Future", 
        images: [{ url: "/placeholder-track.png", height: 300, width: 300 }] 
      },
      duration_ms: 269733,
      preview_url: "https://p.scdn.co/mp3-preview/e7eb60e5e2e536e2052b4e75d30bea9ea20664cb",
      playlist_id: "37i9dQZF1DX0SPPXJeeVcg"
    },
    {
      id: "1zi7xx7UVEFkmKfv06H8x0",
      name: "One Dance",
      artists: [{ id: "3TVXtAsR1Inumwj472S9r4", name: "Drake" }, { id: "6OQzFHs2ke4tOvoZQD2XqK", name: "WizKid" }, { id: "19TtVNQG64Y06QzCA3Zpb5", name: "Kyla" }],
      album: { 
        id: "1XslIirSxfAhhxRdn4Li9h", 
        name: "Views", 
        images: [{ url: "/placeholder-track.png", height: 300, width: 300 }] 
      },
      duration_ms: 173987,
      preview_url: "https://p.scdn.co/mp3-preview/5f47b0a50ec826b4d1fe6fd2a8cc5b2eab2f5b1a",
      playlist_id: "37i9dQZF1DXcBWIGoYBM5M"
    },
    {
      id: "7KXjTSCq5nL1LoYtL7XAwS",
      name: "SICKO MODE",
      artists: [{ id: "0Y5tJX1MQlPlqiwlOH1tJY", name: "Travis Scott" }],
      album: { 
        id: "41GuZcammIkupMPKH2OJ6I", 
        name: "ASTROWORLD", 
        images: [{ url: "/placeholder-track.png", height: 300, width: 300 }] 
      },
      duration_ms: 312820,
      preview_url: "https://p.scdn.co/mp3-preview/de31c0fbd8645c8d53fcc9c9fb7444628496401f",
      playlist_id: "37i9dQZF1DX0XUsuxWHRQd"
    },
    {
      id: "6DCZcSspjsKoFjzjrWoCdn",
      name: "God's Plan",
      artists: [{ id: "3TVXtAsR1Inumwj472S9r4", name: "Drake" }],
      album: { 
        id: "3qYBEAPj1F36q7EsgHYQEJ", 
        name: "Scorpion", 
        images: [{ url: "/placeholder-track.png", height: 300, width: 300 }] 
      },
      duration_ms: 198973,
      preview_url: "https://p.scdn.co/mp3-preview/a5b04de53ee2fe4bce76c1e038f88ba09d083e1e",
      playlist_id: "37i9dQZF1DX0XUsuxWHRQd"
    },
    {
      id: "4iJyoBOLtHqaGxP12qzhQI",
      name: "Peaches (feat. Daniel Caesar & Giveon)",
      artists: [{ id: "1uNFoZAHBGtllmzznpCI3s", name: "Justin Bieber" }, { id: "20wkVLutqVOYrc0kxFs7rA", name: "Daniel Caesar" }, { id: "4fxd5Ee7UefO4CUXgwJ7IP", name: "Giveon" }],
      album: { 
        id: "5dGWwsZ9iB2Xc3UKR0gif2", 
        name: "Justice", 
        images: [{ url: "/placeholder-track.png", height: 300, width: 300 }] 
      },
      duration_ms: 198082,
      preview_url: "https://p.scdn.co/mp3-preview/8d39aad9b3f7ddb6d6d87ec4e3b3a3857f2ea130",
      playlist_id: "37i9dQZF1DXcBWIGoYBM5M"
    },
    {
      id: "7FIWs0pqAYbP91WWM0vlTQ",
      name: "Godzilla (feat. Juice WRLD)",
      artists: [{ id: "7dGJo4pcD2V6oG8kP0tJRR", name: "Eminem" }, { id: "4MCBfE4596Uoi2O4DtmEMz", name: "Juice WRLD" }],
      album: { 
        id: "4otkd9As6YaxxEkIjXPiZ6", 
        name: "Music To Be Murdered By", 
        images: [{ url: "/placeholder-track.png", height: 300, width: 300 }] 
      },
      duration_ms: 210800,
      preview_url: "https://p.scdn.co/mp3-preview/8a4d63fc0fcb36b7be7f78d59159fc0afb9d795a",
      playlist_id: "37i9dQZF1DXb8wplbC2YhV"
    }
  ];
  
  return NextResponse.json({
    tracks: mockTracks,
    total: mockTracks.length,
    failed_playlists: [],
    source: 'mock'
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
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