// --- START OF FILE /app/api/auth/spotify-client-token/route.ts ---
import { NextRequest, NextResponse } from "next/server";

// NO revalidate export here

function getCorsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Function to actually fetch the token from Spotify
// Separated for potential reuse or direct calling if needed elsewhere (though not recommended generally)
async function fetchSpotifyClientToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    console.log(`spotify-client-token(fetcher): SPOTIFY_CLIENT_ID is ${clientId ? 'set' : 'MISSING!'}`);
    console.log(`spotify-client-token(fetcher): SPOTIFY_CLIENT_SECRET is ${clientSecret ? 'set' : 'MISSING!'}`);

    if (!clientId || !clientSecret) {
      console.error("spotify-client-token(fetcher): Credentials missing from environment variables.");
      throw new Error('Server configuration error: Missing Spotify API credentials');
    }

    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');

    console.log('spotify-client-token(fetcher): Requesting client credentials token from Spotify API...');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: body.toString(),
      // CRITICAL: No caching for the request to Spotify's token endpoint
      cache: 'no-store'
    });

    console.log(`spotify-client-token(fetcher): Spotify API response status: ${response.status}`);

    if (!response.ok) {
      let errorBody = `Status: ${response.status}`;
      try { errorBody = await response.text(); } catch (e) { /* ignore */ }
      console.error(`spotify-client-token(fetcher): Spotify token request failed: ${response.status}. Response: ${errorBody}`);
      throw new Error(`Failed to obtain token from Spotify: ${response.status}`);
    }

    const tokenData = await response.json();
    // Basic validation
    if (!tokenData || !tokenData.access_token || !tokenData.expires_in) {
        console.error("spotify-client-token(fetcher): Invalid token data received from Spotify:", tokenData);
        throw new Error("Invalid token data received from Spotify");
    }
    console.log('spotify-client-token(fetcher): Successfully received client credentials token from Spotify.');
    return tokenData; // { access_token, token_type, expires_in }
}


// GET Handler for the API route
export async function GET(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  console.log("API Route: /api/auth/spotify-client-token called (GET). Origin:", requestOrigin);

  if (request.method === 'OPTIONS') {
     console.log("spotify-client-token: Handling OPTIONS preflight request.");
    return NextResponse.json({}, { headers: getCorsHeaders(requestOrigin) });
  }

  try {
    // Call the refactored fetcher function
    const tokenData = await fetchSpotifyClientToken();

    // Return token with proper CORS headers and prevent client-side caching
    return NextResponse.json(tokenData, {
      headers: {
          ...getCorsHeaders(requestOrigin),
          'Cache-Control': 'no-store, max-age=0' // Prevent client/browser caching
      }
    });

  } catch (error) {
    console.error('spotify-client-token(GET): Error getting token:', error);
    // Return appropriate error response
    const status = error instanceof Error && error.message.includes("Spotify: 4") ? parseInt(error.message.slice(-3)) : 500; // Crude status extraction
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error while getting client token' },
      { status: status || 500, headers: getCorsHeaders(requestOrigin) }
    );
  }
}

// OPTIONS Handler
export async function OPTIONS(request: NextRequest) {
   const requestOrigin = request.headers.get('origin');
   console.log("spotify-client-token: Handling OPTIONS preflight request (generic). Origin:", requestOrigin);
  return NextResponse.json({}, { headers: getCorsHeaders(requestOrigin) });
}
// --- END OF FILE /app/api/auth/spotify-client-token/route.ts ---