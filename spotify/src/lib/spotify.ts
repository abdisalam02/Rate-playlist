import { Session } from "next-auth";
import { Buffer } from 'buffer'; // Need Buffer for base64 encoding

const BASE_URL = 'https://api.spotify.com/v1';

// Fetch with authentication token
async function fetchFromSpotify(endpoint: string, token: string, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    ...options,
  });

  if (!res.ok) {
    // If token expired, you'd handle refresh here
    const error = await res.json();
    throw new Error(error.error.message || 'Error fetching from Spotify API');
  }

  return res.json();
}

// Get current user profile
export async function getCurrentUserProfile(token: string) {
  return fetchFromSpotify('/me', token);
}

// Get user's top items
export async function getUserTopItems(token: string, type: 'artists' | 'tracks', timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 10) {
  return fetchFromSpotify(`/me/top/${type}?time_range=${timeRange}&limit=${limit}`, token);
}

// Get user's playlists
export async function getUserPlaylists(token: string, limit: number = 20, offset: number = 0) {
  return fetchFromSpotify(`/me/playlists?limit=${limit}&offset=${offset}`, token);
}

// Get user's saved albums
export async function getUserSavedAlbums(token: string, limit: number = 20, offset: number = 0) {
  return fetchFromSpotify(`/me/albums?limit=${limit}&offset=${offset}`, token);
}

// Get user's recently played tracks
export async function getRecentlyPlayedTracks(token: string, limit: number = 20) {
  return fetchFromSpotify(`/me/player/recently-played?limit=${limit}`, token);
}

// Get an album by ID
export async function getAlbum(token: string, albumId: string) {
  return fetchFromSpotify(`/albums/${albumId}`, token);
}

// Get a track by ID
export async function getTrack(token: string, trackId: string) {
  return fetchFromSpotify(`/tracks/${trackId}`, token);
}

// Get audio features for a track
export async function getAudioFeatures(token: string, trackId: string) {
  return fetchFromSpotify(`/audio-features/${trackId}`, token);
}

/**
 * Fetches a playlist from Spotify API
 * @param playlistId - The ID of the playlist
 * @param accessToken - The Spotify API access token
 * @returns Promise with the playlist data
 */
export async function getPlaylist(playlistId: string, accessToken: string) {
  if (!playlistId || !accessToken) {
    console.error('Missing required parameters for getPlaylist:', { 
      hasPlaylistId: !!playlistId, 
      hasAccessToken: !!accessToken 
    });
    throw new Error('Missing required parameters for getPlaylist');
  }
  
  const url = `https://api.spotify.com/v1/playlists/${playlistId}`;
  console.log(`Making request to Spotify API: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      console.error(`Spotify API error: ${response.status} - ${response.statusText}`);
      // Return the response to allow the caller to handle the error
      return response;
    }
    
    return response;
  } catch (error) {
    console.error('Network error when fetching playlist:', error);
    throw error;
  }
}

// Function to search for tracks
export async function searchTracks(token: string, query: string, limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString()
  }).toString();

  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message || 'Failed to search tracks');
  }

  return response.json();
}

// --- NEW Client Credentials Token Function ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Basic in-memory cache for the token (replace with a more robust cache if needed)
let clientCredentialsToken: { token: string; expiresAt: number } | null = null;

export async function getClientCredentialsToken(): Promise<string | null> {
  // Check cache first
  if (clientCredentialsToken && clientCredentialsToken.expiresAt > Date.now()) {
    console.log('[Spotify Auth] Using cached client credentials token.');
    return clientCredentialsToken.token;
  }

  console.log('[Spotify Auth] Fetching new client credentials token...');
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('[Spotify Auth] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables.');
    return null;
  }

  const authHeader = 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64');

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store' // Don't cache this request
    });

    if (!response.ok) {
      console.error(`[Spotify Auth] Error fetching client credentials token: ${response.status} ${await response.text()}`);
      clientCredentialsToken = null; // Clear cache on error
      return null;
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in; // Seconds

    if (!newToken || !expiresIn) {
        console.error('[Spotify Auth] Invalid token data received:', data);
        clientCredentialsToken = null;
        return null;
    }

    // Cache the new token (expires 5 minutes before actual expiration)
    clientCredentialsToken = {
      token: newToken,
      expiresAt: Date.now() + (expiresIn - 300) * 1000 
    };

    console.log('[Spotify Auth] Successfully obtained and cached new client credentials token.');
    return clientCredentialsToken.token;

  } catch (error) {
    console.error('[Spotify Auth] Exception during client credentials fetch:', error);
    clientCredentialsToken = null; // Clear cache on exception
    return null;
  }
} 