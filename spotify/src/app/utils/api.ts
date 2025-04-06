// Create a utility function for making API calls with the token

export const fetchWithToken = async (url: string, accessToken: string | undefined, options: RequestInit = {}): Promise<any> => {
  if (!accessToken) {
    console.error("No access token available for request to:", url);
    throw new Error("No access token available");
  }
  
  // Determine method for logging
  const method = options.method || 'GET';
  console.log(`[fetchWithToken] Making ${method} request to: ${url}`);
  
  try {
    // Prepare headers using Headers object for easier manipulation
    const headers = new Headers(options.headers); // Initialize with incoming headers
    
    // Set defaults if not present
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'no-cache');
    }
    
    // Always set Authorization, overriding any potentially passed one
    headers.set('Authorization', `Bearer ${accessToken}`);

    // Prepare final fetch options
    const fetchOptions: RequestInit = {
        ...options, // Spread incoming options (method, body, etc.)
        headers: headers, // Use the constructed Headers object
        cache: 'no-store', 
    };

    const response = await fetch(url, fetchOptions);

    console.log(`[fetchWithToken] Response from ${url}: ${response.status}`);

    // Handle responses with no content (e.g., successful DELETE)
    if (response.status === 204) {
      return { success: true }; 
    }

    // Attempt to parse JSON, handle potential errors
    let data;
    try {
        // Handle 201 Created specifically for Spotify Add Tracks success
        if (response.status === 201 && response.headers.get('content-length') !== '0') { 
            data = await response.json();
        } else if (response.ok && response.headers.get('content-length') !== '0') { 
             // Handle other successful responses with bodies (e.g., 200 OK)
            data = await response.json();
        } else if (response.ok) { 
             // Handle successful responses with no body (e.g., maybe some PUTs)
             data = { success: true };
        } else { 
             // Handle error responses (attempt to parse JSON body for details)
             try {
                 data = await response.json();
             } catch (e) {
                 // If JSON parsing fails on error response, use status text
                 data = { error: response.statusText || "API Error", status: response.status };
             }
        }
    } catch (e) {
      console.error(`[fetchWithToken] Error parsing JSON from ${url}:`, e);
      // If JSON parsing fails entirely, construct an error
      data = { error: "Failed to parse response", status: response.status };
       // Re-throw only if response was actually ok but parsing failed
       if(response.ok) throw new Error("Failed to parse successful response.");
    }

    // If the response was not OK originally, throw an error with parsed details
    if (!response.ok) {
      console.error(`[fetchWithToken] Error response from ${url} (${response.status}):`, data);
      // Construct a more informative error message
      const errorMessage = data?.error?.message || data?.error || data?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status; // Attach status code to error object
      (error as any).details = data; // Attach full details
      throw error;
    }

    return data; // Return parsed data for successful responses

  } catch (error) {
    console.error(`[fetchWithToken] Error fetching ${url}:`, error);
    // Re-throw the caught error (could be fetch network error or the error thrown above)
    throw error;
  }
};

// New function that handles all authentication scenarios with client credentials fallback
export async function fetchWithClientFallback(url: string, session: any | null, options: any = {}) {
  let correctedUrl = url; // Declare outside the try block
  try {
    // Fix port mismatch issues - if the URL contains localhost:3000 but we're on port 3001
    if (typeof window !== 'undefined' && 
        url.includes('localhost:3000') && 
        window.location.port === '3001') {
      correctedUrl = url.replace('localhost:3000', 'localhost:3001');
      console.log(`Port mismatch detected, corrected URL from ${url} to ${correctedUrl}`);
    }
    
    // Log the request for debugging
    const debugDetails = correctedUrl.includes('playlist') 
      ? 'playlist request' 
      : correctedUrl.includes('discover') 
        ? 'discover endpoint' 
        : 'regular request';
    console.log(`Attempting to fetch ${correctedUrl} (${debugDetails})${session ? ' with session token' : ''}`);
    
    // Try with session token if available
  if (session?.accessToken) {
      try {
        const headers = {
          ...options.headers,
          'Authorization': `Bearer ${session.accessToken}`
        };
        
        const response = await fetch(correctedUrl, {
          ...options,
          headers,
          cache: 'no-store',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully fetched ${correctedUrl} with session token`);
          
          // Enhanced logging for response data structure
          if (correctedUrl.includes('playlist')) {
            // For playlists, log the structure
            console.log('Playlist response structure:', 
              data.tracks?.items ? `Found ${data.tracks.items.length} items in tracks.items` : 
              data.items ? `Found ${data.items.length} items directly` : 
              'No playlist items found in response'
            );
          } else if (correctedUrl.includes('discover')) {
            // For discover endpoints, log available data properties
            const properties = Object.keys(data);
            console.log('Discover endpoint response properties:', properties.join(', '));
            
            // Log counts for common data patterns
            console.log('Items count:', data.items?.length || 0);
            console.log('Tracks count:', data.tracks?.length || 0);
            console.log('Albums count:', data.albums?.items?.length || 0);
          }
          
          return data;
        }
        
        console.log(`Session token request failed with status ${response.status}, trying client credentials fallback...`);
      } catch (error) {
        console.error('Error with session token request:', error);
      }
    }
    
    // If session token failed or doesn't exist, try with client credentials
    try {
      // Need to modify URL to add or update client credentials parameter
      const clientUrl = new URL(correctedUrl);
      clientUrl.searchParams.set('use_client_credentials', 'true');
      
      const response = await fetch(clientUrl.toString(), {
        ...options,
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully fetched ${clientUrl.toString()} with client credentials`);
        
        // Enhanced logging for client credentials response
        if (correctedUrl.includes('playlist')) {
          console.log('Client credentials playlist response structure:', 
            data.tracks?.items ? `Found ${data.tracks.items.length} items in tracks.items` : 
            data.items ? `Found ${data.items.length} items directly` : 
            'No playlist items found in response'
          );
        }
        
        return data;
      }
      
      console.error(`Client credentials request failed with status ${response.status}`);
      
      // Try to use mock data if we're fetching a playlist or discover endpoint
      if (correctedUrl.includes('/playlist/')) {
        console.log(`Attempting to get mock data for playlist endpoint: ${correctedUrl}`);
        return await tryGetMockPlaylistData(correctedUrl);
      } else if (correctedUrl.includes('/discover/')) {
        console.log(`Attempting to get mock data for discover endpoint: ${correctedUrl}`);
        return await tryGetMockDiscoverData(correctedUrl);
      }
      
      throw new Error(`Failed to fetch with both session token and client credentials: ${response.status}`);
    } catch (clientError) {
      console.error('Error with client credentials request:', clientError);
      
      // Try to use mock data if we're fetching a playlist or discover endpoint
      if (correctedUrl.includes('/playlist/')) {
        console.log(`Attempting to get mock data for playlist endpoint after error: ${correctedUrl}`);
        return await tryGetMockPlaylistData(correctedUrl);
      } else if (correctedUrl.includes('/discover/')) {
        console.log(`Attempting to get mock data for discover endpoint after error: ${correctedUrl}`);
        return await tryGetMockDiscoverData(correctedUrl);
      }
      
      throw clientError; // Re-throw to be handled by the caller
    }
  } catch (error) {
    console.error(`Error in fetchWithClientFallback for ${correctedUrl || url}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
}

// Helper function to get mock data for a playlist
async function tryGetMockPlaylistData(url: string) {
  console.log(`Trying to get mock data for playlist: ${url}`);
  
  // Extract the playlist ID from the URL
  const urlParts = url.split('/');
  // Handle potential query params by splitting on '?'
  const playlistIdSegment = urlParts[urlParts.length - 1];
  const playlistId = playlistIdSegment ? playlistIdSegment.split('?')[0] : null;
  
  if(!playlistId) {
      console.warn("Could not extract playlist ID for mock data from URL:", url);
      return getGenericMockPlaylist('unknown'); // Return generic if ID extraction fails
  }

  // Handle 2010 Bangers playlist specifically
  if (playlistId === '357fWKFTiDhpt9C69CMG4q') {
    console.log('Using mock data for 2010 Bangers playlist');
    return getMock2010BangersPlaylist();
  }
  
  // Check for other known mock playlists
  if (playlistId === '37i9dQZF1DX0SPPXJeeVcg') {
    return getMockRnBPlaylist();
  } else if (playlistId === '37i9dQZF1DXb8wplbC2YhV') {
    return getMockHipHopPlaylist();
  } else if (playlistId === '37i9dQZF1DXcBWIGoYBM5M') {
    return getMockTopHitsPlaylist();
  } else if (playlistId === '37i9dQZF1DX0XUsuxWHRQd') {
    return getMockRapCaviarPlaylist();
  }
  
  // For other playlists, return a generic mock playlist
  return getGenericMockPlaylist(playlistId);
}

// Mock data for R&B playlist
function getMockRnBPlaylist() {
  return {
    id: "37i9dQZF1DX0SPPXJeeVcg",
    name: "100 Greatest R&B Songs",
    description: "The most streamed R&B songs on Spotify",
    images: [{ url: "/placeholder-playlist.png" }],
    tracks: {
      items: [
        {
          track: {
            id: "32OlwWuMpZ6b0aN2RZOeMS",
            name: "Uptown Funk (feat. Bruno Mars)",
            artists: [{ id: "3hv9jJF3adDNsBSIQDqcjp", name: "Mark Ronson" }, { id: "0du5cEVh5yTK9QJze8zA0C", name: "Bruno Mars" }],
            album: { name: "Uptown Special", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 270000
          }
        },
        {
          track: {
            id: "3GCdLUSnKSMJhs4Tj6CV3s",
            name: "All of Me",
            artists: [{ id: "5y2Xq6xcjJb2jVM54GHK3t", name: "John Legend" }],
            album: { name: "Love In The Future", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 269000
          }
        },
        {
          track: {
            id: "40riOy7x9W7GXjyGp4pjAv",
            name: "Empire State of Mind (feat. Alicia Keys)",
            artists: [{ id: "3nFkdlSjzX9mRTtwJOzDYB", name: "JAY-Z" }, { id: "3DiDSECUqqY1AuBP8qtaIa", name: "Alicia Keys" }],
            album: { name: "The Blueprint 3", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 276000
          }
        }
      ]
    }
  };
}

// Mock data for Hip-Hop playlist
function getMockHipHopPlaylist() {
  return {
    id: "37i9dQZF1DXb8wplbC2YhV",
    name: "100 Greatest Hip-Hop Songs",
    description: "The most streamed Hip-Hop songs on Spotify",
    images: [{ url: "/placeholder-playlist.png" }],
    tracks: {
      items: [
        {
          track: {
            id: "7KXjTSCq5nL1LoYtL7XAwS",
            name: "HUMBLE.",
            artists: [{ id: "2YZyLoL8N0Wb9xBt1NhZWg", name: "Kendrick Lamar" }],
            album: { name: "DAMN.", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 178000
          }
        },
        {
          track: {
            id: "6DCZcSspjsKoFjzjrWoCdn",
            name: "God's Plan",
            artists: [{ id: "3TVXtAsR1Inumwj472S9r4", name: "Drake" }],
            album: { name: "Scorpion", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 198000
          }
        },
        {
          track: {
            id: "0VgkVdmE4gld66l8iyGjgx",
            name: "Mask Off",
            artists: [{ id: "1RyvyyTE3xzB2ZywiAwp0i", name: "Future" }],
            album: { name: "FUTURE", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 204000
          }
        }
      ]
    }
  };
}

// Mock data for Top Hits playlist
function getMockTopHitsPlaylist() {
  return {
    id: "37i9dQZF1DXcBWIGoYBM5M",
    name: "Today's Top Hits",
    description: "The biggest hits right now.",
    images: [{ url: "/placeholder-playlist.png" }],
    tracks: {
      items: [
        {
          track: {
            id: "mock-top-hit-1",
            name: "Current Hit 1",
            artists: [{ id: "artist-top-1", name: "Popular Artist 1" }],
            album: { name: "Top Album 1", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 210000
          }
        },
        {
          track: {
            id: "mock-top-hit-2",
            name: "Current Hit 2",
            artists: [{ id: "artist-top-2", name: "Popular Artist 2" }],
            album: { name: "Top Album 2", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 189000
          }
        }
      ]
    }
  };
}

// Mock data for RapCaviar playlist
function getMockRapCaviarPlaylist() {
  return {
    id: "37i9dQZF1DX0XUsuxWHRQd",
    name: "RapCaviar",
    description: "The most influential hip-hop playlist.",
    images: [{ url: "/placeholder-playlist.png" }],
    tracks: {
      items: [
        {
          track: {
            id: "mock-rap-1",
            name: "Hip-Hop Track 1",
            artists: [{ id: "artist-rap-1", name: "Rap Artist 1" }],
            album: { name: "Rap Album 1", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 188000
          }
        },
        {
          track: {
            id: "mock-rap-2",
            name: "Hip-Hop Track 2",
            artists: [{ id: "artist-rap-2", name: "Rap Artist 2" }],
            album: { name: "Rap Album 2", images: [{ url: "/placeholder-album.png" }] },
            preview_url: null,
            duration_ms: 202000
          }
        }
      ]
    }
  };
}

// Mock data for 2010 Bangers playlist
function getMock2010BangersPlaylist() {
  return {
    id: "357fWKFTiDhpt9C69CMG4q",
    name: "2010 Bangers 🔥",
    description: "The biggest hits from 2010, when life was simpler and these bangers were everywhere",
    images: [{ url: "/placeholder-playlist.png" }],
    tracks: {
      items: [
        {
          track: {
            id: "7tqhbajSfrz2F7E1Z75ASX",
            name: "Tik Tok",
            artists: [{ id: "6LqNN22kT3074XbTVUrhzX", name: "Kesha" }],
            album: { 
              name: "Animal", 
              images: [{ url: "/placeholder-album.png" }] 
            },
            preview_url: null,
            duration_ms: 200000
          }
        },
        {
          track: {
            id: "3BKD1PwArikchz2Zrlj5o3",
            name: "Love The Way You Lie",
            artists: [
              { id: "7dGJo4pcD2V6oG8kP0tJRR", name: "Eminem" },
              { id: "5pKCCKE2ajJHZ9KAiaK11H", name: "Rihanna" }
            ],
            album: { 
              name: "Recovery", 
              images: [{ url: "/placeholder-album.png" }] 
            },
            preview_url: null,
            duration_ms: 263000
          }
        },
        {
          track: {
            id: "6uuxzKRoGsSqJLFBiF9wSp",
            name: "California Gurls",
            artists: [
              { id: "6jJ0s89eD6GaHleKKya26X", name: "Katy Perry" },
              { id: "7hJcb9fa4alzcOq3EaNPoG", name: "Snoop Dogg" }
            ],
            album: { 
              name: "Teenage Dream", 
              images: [{ url: "/placeholder-album.png" }] 
            },
            preview_url: null,
            duration_ms: 234000
          }
        },
        {
          track: {
            id: "7iZJ74nXtXI9T8cUoKuQdB",
            name: "Bad Romance",
            artists: [{ id: "1HY2Jd0NmPuamShAr6KMms", name: "Lady Gaga" }],
            album: { 
              name: "The Fame Monster", 
              images: [{ url: "/placeholder-album.png" }] 
            },
            preview_url: null,
            duration_ms: 294000
          }
        }
      ]
    }
  };
}

// Helper function to get mock data for discover endpoints
async function tryGetMockDiscoverData(url: string) {
  console.log(`Trying to get mock data for discover endpoint: ${url}`);
  
  if (url.includes('/new-releases')) {
    // Try the mock new releases endpoint
    try {
      const response = await fetch('/api/discover/mock-new-releases');
      if (response.ok) {
        return await response.json();
      }
  } catch (error) {
      console.error('Error fetching mock new releases:', error);
    }
  }
  
  if (url.includes('/top-albums')) {
    // Return mock top albums
    return {
      items: Array(6).fill(0).map((_, i) => ({
        id: `mock-album-${i}`,
        name: `Top Album ${i + 1}`,
        artists: [{ id: `mock-artist-${i}`, name: "Popular Artist" }],
        images: [{ url: "/placeholder-album.png" }],
        release_date: "2023-01-01",
        average_rating: 4.5,
        rating_count: 100 + i
      }))
    };
  }
  
  if (url.includes('/trending')) {
    // Return mock trending tracks
    return {
      tracks: Array(6).fill(0).map((_, i) => ({
        id: `mock-track-${i}`,
        name: `Trending Track ${i + 1}`,
        artists: [{ id: `mock-artist-${i}`, name: "Trending Artist" }],
        album: {
          id: `mock-album-${i}`,
          name: `Trending Album ${i + 1}`,
          images: [{ url: "/placeholder-album.png" }]
        },
        average_rating: 4.8,
        rating_count: 200 + i
      }))
    };
  }
  
  if (url.includes('/home-featured-tracks')) {
    // Return mock featured tracks
    return {
      tracks: Array(8).fill(0).map((_, i) => ({
        id: `mock-featured-${i}`,
        name: `Featured Track ${i + 1}`,
        artists: [{ id: `mock-artist-${i}`, name: "Featured Artist" }],
        album: {
          id: `mock-album-${i}`,
          name: `Featured Album ${i + 1}`,
          images: [{ url: "/placeholder-album.png" }]
        },
        playlist_id: `mock-playlist-${Math.floor(i/2)}`
      }))
    };
  }
  
  // Default generic mock data
  return {
    items: Array(6).fill(0).map((_, i) => ({
      id: `mock-item-${i}`,
      name: `Item ${i + 1}`
    }))
  };
}

// --- ADDED Basic Generic Mock Playlist Function ---
function getGenericMockPlaylist(playlistId: string) {
  console.log(`Generating generic mock playlist data for ID: ${playlistId}`);
  return {
    id: playlistId,
    name: `Mock Playlist (${playlistId.substring(0, 5)}...)`,
    description: "This playlist data is generated when the Spotify API is unavailable.",
    images: [{ url: "/placeholder-playlist.png" }], // Ensure you have this placeholder image
    tracks: {
      href: `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=0&limit=10`,
      items: Array(10).fill(null).map((_, i) => ({
        added_at: new Date().toISOString(),
        added_by: { id: 'mock-user', type: 'user' },
        is_local: false,
        primary_color: null,
        track: {
          id: `mock-track-${playlistId}-${i}`,
          name: `Mock Track ${i + 1}`,
          artists: [{ id: `mock-artist-${i}`, name: `Mock Artist ${i}` }],
          album: {
            id: `mock-album-${i}`,
            name: `Mock Album ${i}`,
            images: [{ url: "/placeholder-album.png" }], // Ensure you have this placeholder image
            release_date: "2023-01-01",
          },
          duration_ms: 180000 + Math.random() * 60000, // Random duration 3-4 mins
          explicit: false,
          external_urls: { spotify: "#" },
          href: "#",
          is_playable: true,
          popularity: 50,
          preview_url: null, // Often null
          track_number: i + 1,
          type: 'track',
          uri: `spotify:track:mock-track-${playlistId}-${i}`,
        },
        video_thumbnail: { url: null },
      })),
      limit: 10,
      next: null,
      offset: 0,
      previous: null,
      total: 10,
    },
    type: 'playlist',
    // Add other fields if your frontend expects them
  };
} 