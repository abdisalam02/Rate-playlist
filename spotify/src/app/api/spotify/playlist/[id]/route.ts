import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
// import { getClientCredentialsToken } from '@/lib/spotifyAuth'; // Assuming this is correct but commenting out for now
// import { getMockPlaylistById } from '@/app/api/utils/mockUtils'; // Assuming this is correct but commenting out for now

// Enable CORS for all origins
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

// Set to dynamic to ensure data is always fresh
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Increase timeout for slow Spotify API responses
export const maxDuration = 10;

// Define the expected shape of the context containing params
interface RouteContext {
  params: {
    id?: string; // Make id optional to handle cases where it might be missing
  };
}

// --- Main GET Handler ---
export async function GET(request: NextRequest, context: RouteContext) {
  console.log('[API Playlist] GET called');

  // Destructure id directly from the context object passed as the second argument
  const { params } = context;
  const id = params?.id;

  // Check if ID is present
  if (!id) {
    console.error('[API Playlist] Missing playlist ID in route parameters.');
    return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
  }

  console.log(`[API Playlist] Processing request for ID: ${id}`);

  const session = await getServerSession(authOptions);

  // Handle CORS preflight for GET
  const corsHeaders = getCorsHeaders(request);

  try {
    console.log(`[API Playlist] GET /api/spotify/playlist/${id} called`);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const useClientCredentials = searchParams.get('use_client_credentials') === 'true';
    console.log(`[API Playlist] Params: limit=${limit}, offset=${offset}, useClientCredentials=${useClientCredentials}`);

    let accessToken = '';
    let tokenType = 'unknown';

    // Temporarily define getClientCredentialsToken locally if import fails
    // This is a placeholder - REMOVE if the real import works
    const getClientCredentialsToken = async (): Promise<string | null> => { 
      console.warn("Using placeholder getClientCredentialsToken"); 
      // Replace with actual implementation or import later
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded','Authorization':`Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`}, body: new URLSearchParams({grant_type:'client_credentials'}), cache:'no-store'});
      if (!response.ok) return null;
      const data = await response.json();
      return data.access_token;
    };
    
    if (useClientCredentials) {
        console.log('[API Playlist] Explicitly using client credentials token');
        tokenType = 'client_credentials';
        try {
            // Call the placeholder/real function which might return null
            const token = await getClientCredentialsToken();
            if (!token) { // Check if token is null
                console.error('[API Playlist] Failed to get client credentials token (returned null).');
                throw new Error('Client credentials token was null'); // Throw error to trigger fallback/error handling
            }
            accessToken = token; // Assign only if not null
        } catch (tokenError) {
             console.error('[API Playlist] Failed to get client credentials token:', tokenError);
             console.warn('[API Playlist] Falling back to session token due to client credentials error...');
             if (session?.accessToken) {
                 accessToken = session.accessToken;
                 tokenType = 'session';
                 console.log('[API Playlist] Using fallback session token.');
             } else {
                 console.error('[API Playlist] No fallback session token available either.');
                 return NextResponse.json({ error: 'Authentication required (Client Creds failed, no Session)' }, { status: 401, headers: corsHeaders });
             }
        }
    } else {
        if (!session?.accessToken) {
            console.log('[API Playlist] No session token found, trying client credentials as fallback...');
            tokenType = 'client_credentials';
            try {
                 // Call the placeholder/real function which might return null
                const token = await getClientCredentialsToken();
                if (!token) { // Check if token is null
                    console.error('[API Playlist] Failed to get fallback client credentials token (returned null).');
                    throw new Error('Fallback client credentials token was null'); // Throw error
                }
                accessToken = token; // Assign only if not null
            } catch (tokenError) {
                console.error('[API Playlist] Failed to get fallback client credentials token:', tokenError);
                return NextResponse.json({ error: 'Authentication required (No Session, Client Creds failed)' }, { status: 401, headers: corsHeaders });
            }
      } else {
            accessToken = session.accessToken;
            tokenType = 'session';
            console.log('[API Playlist] Using session token for playlist request');
      }
    }
    
    if (!accessToken) {
        console.error('[API Playlist] No valid access token could be obtained.');
        return NextResponse.json({ error: 'Failed to obtain access token' }, { status: 500, headers: corsHeaders });
    }

    const fields = 'id,name,description,images,owner(display_name,id),tracks(items(track(id,name,artists(id,name),album(id,name,images,release_date),duration_ms,preview_url,popularity,explicit)),limit,offset,total)';
    const spotifyUrl = `https://api.spotify.com/v1/playlists/${id}?limit=${limit}&offset=${offset}&fields=${fields}`;
    console.log(`[API Playlist] Making request to: ${spotifyUrl} using ${tokenType} token.`);

    const response = await fetch(spotifyUrl, {
        headers: {
        Authorization: `Bearer ${accessToken}`,
        },
      cache: 'no-store',
      });
      
      if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Playlist] Spotify request failed: ${response.status} ${response.statusText}`);
      console.error(`[API Playlist] Spotify Error Body: ${errorText}`);
      // Comment out mock data fallback as the import is commented out
      // const mock = getMockPlaylistById(id, limit);
      // if (mock) { ... } else { ... }
      console.error('[API Playlist] Spotify API request failed and mock function is unavailable.');
      return NextResponse.json({ error: `Spotify API Error: ${response.statusText}`, status: response.status }, { status: response.status, headers: corsHeaders });
      }
      
      const data = await response.json();
    console.log(`[API Playlist] Successfully fetched playlist ${id} with ${data.tracks?.items?.length || 0} tracks`);

    // Basic transformation/validation 
    const transformedData = {
        ...data,
        tracks: {
            ...data.tracks,
            // Filter out items where track is null (can happen with local files)
            items: (data.tracks?.items || []).filter((item: any) => item && item.track)
        }
    };

    // Add CORS headers to successful response
    return NextResponse.json(transformedData, { headers: corsHeaders });

  } catch (error: any) {
    console.error(`[API Playlist] Error in /api/spotify/playlist/[id]:`, error);
    const playlistId = id || 'unknown'; // Try to get ID from params for logging
    console.error(`[API Playlist] Error occurred for playlist ID: ${playlistId}`);
    // Comment out mock data fallback as the import is commented out
    // const mock = getMockPlaylistById(playlistId, 50);
    // if (mock) { ... } else { ... }
    console.error('[API Playlist] Server error occurred and mock function is unavailable.');
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500, headers: corsHeaders });
  }
} 