// app/api/playlists/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

// Helper: Get Spotify access token using Client Credentials flow
async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify client credentials not configured');
  }
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokenResponse.ok) {
    throw new Error('Failed to fetch Spotify access token');
  }
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Helper: Recursive search for an audioPreview URL in a JSON object
function findAudioPreviewUrl(obj) {
  if (typeof obj !== 'object' || obj === null) return null;
  if (obj.audioPreview && typeof obj.audioPreview === 'object' && obj.audioPreview.url) {
    return obj.audioPreview.url;
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const result = findAudioPreviewUrl(obj[key]);
      if (result) return result;
    }
  }
  return null;
}

// Helper: Workaround to fetch preview URL from the Spotify embed page
async function fetchTrackPreviewUrl(trackId) {
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
  try {
    const res = await fetch(embedUrl, {
      headers: { 'Content-Type': 'text/html' },
    });
    if (!res.ok) {
      console.error(`Failed to fetch embed page for track ${trackId}`);
      return null;
    }
    const html = await res.text();
    const regex = /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s;
    const match = html.match(regex);
    if (match) {
      let jsonData;
      try {
        jsonData = JSON.parse(match[1]);
      } catch (err) {
        console.error('Error parsing JSON from embed page:', err);
      }
      if (jsonData) {
        const preview = findAudioPreviewUrl(jsonData);
        if (preview) return preview;
      }
      const audioPreviewRegex = /"audioPreview"\s*:\s*{\s*"url"\s*:\s*"([^"]+)"/;
      const audioMatch = html.match(audioPreviewRegex);
      if (audioMatch) return audioMatch[1];
    }
  } catch (error) {
    console.error('Error fetching preview URL for track', trackId, error);
    return null;
  }
  return null;
}

// Helper: Query Deezer API to fetch a track's preview URL using track and artist info
async function fetchDeezerPreviewUrl(trackName, artistName) {
  const query = encodeURIComponent(`track:"${trackName}" artist:"${artistName}"`);
  const deezerUrl = `https://api.deezer.com/search?q=${query}`;
  try {
    const res = await fetch(deezerUrl);
    if (!res.ok) {
      console.error('Deezer API error', res.status);
      return null;
    }
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].preview || null;
    }
  } catch (error) {
    console.error('Error fetching preview URL from Deezer:', error);
  }
  return null;
}

// GET endpoint: Fetch playlists with average rating computed
export async function GET() {
  // Fetch all playlists from Supabase
  const { data: playlists, error: playlistsError } = await supabase
    .from('playlists')
    .select('*');

  if (playlistsError) {
    return NextResponse.json({ error: playlistsError.message }, { status: 500 });
  }

  // For each playlist, query the ratings table and compute the average rating
  const playlistsWithAvg = await Promise.all(
    playlists.map(async (playlist) => {
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('rating', { count: 'exact', head: false })
        .eq('playlist_id', playlist.id);

      let averageRating = null;
      if (!ratingsError && ratings && ratings.length > 0) {
        const total = ratings.reduce((sum, r) => sum + r.rating, 0);
        averageRating = total / ratings.length;
      }
      return { ...playlist, averageRating };
    })
  );

  return NextResponse.json(playlistsWithAvg);
}

// POST endpoint: Upsert playlist and tracks from Spotify data
export async function POST(request) {
  try {
    const { url, userName } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'Playlist URL is required' }, { status: 400 });
    }
    const idMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    const playlistId = idMatch ? idMatch[1] : null;
    if (!playlistId) {
      return NextResponse.json({ error: 'Invalid Spotify playlist URL' }, { status: 400 });
    }
    const accessToken = await getSpotifyAccessToken();

    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}?market=US`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!spotifyResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch playlist from Spotify' }, { status: spotifyResponse.status });
    }
    const spotifyData = await spotifyResponse.json();

    const tracks = spotifyData.tracks?.items?.length > 0
      ? await Promise.all(
          spotifyData.tracks.items.map(async (item) => {
            const track = item.track;
            let previewUrl = track.preview_url;
            if (!previewUrl) {
              previewUrl = await fetchTrackPreviewUrl(track.id);
              if (!previewUrl) {
                const artistName = track.artists?.[0]?.name || '';
                previewUrl = await fetchDeezerPreviewUrl(track.name, artistName);
              }
            }
            return {
              id: track.id,
              name: track.name,
              image_url: track.album.images?.[0]?.url || '/placeholder.png',
              preview_url: previewUrl,
              album_name: track.album.name,
              album_release_date: track.album.release_date,
              duration_ms: track.duration_ms,
              explicit: track.explicit,
              popularity: track.popularity,
              artists: track.artists.map((artist) => artist.name).join(', '),
            };
          })
        )
      : [];

    const { error: playlistError } = await supabase.from('playlists').upsert({
      id: playlistId,
      name: spotifyData.name,
      image_url: spotifyData.images?.[0]?.url || '/placeholder.png',
      user_name: userName,
    });
    if (playlistError) {
      throw new Error(playlistError.message);
    }

    for (const track of tracks) {
      const { error: songError } = await supabase.from('songs').upsert({
        id: track.id,
        playlist_id: playlistId,
        name: track.name,
        image_url: track.image_url,
        preview_url: track.preview_url,
        album_name: track.album_name,
        album_release_date: track.album_release_date,
        duration_ms: track.duration_ms,
        explicit: track.explicit,
        popularity: track.popularity,
        artists: track.artists,
      });
      if (songError) {
        console.error(`Error inserting track ${track.id}:`, songError.message);
      }
    }

    const newPlaylist = {
      id: playlistId,
      name: spotifyData.name,
      image_url: spotifyData.images?.[0]?.url || '/placeholder.png',
      songs: tracks,
    };

    return NextResponse.json(newPlaylist, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/playlists:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
