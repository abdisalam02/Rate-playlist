// Create this file to centralize Spotify API calls

export async function fetchSpotifyApi(endpoint: string, accessToken: string) {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status}`);
  }

  return res.json();
} 