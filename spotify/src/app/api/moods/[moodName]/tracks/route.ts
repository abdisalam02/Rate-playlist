import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// GET /api/moods/[moodName]/tracks - Get tracks for a specific mood
export async function GET(
  request: NextRequest,
  { params }: { params: { moodName: string } }
) {
  if (!params.moodName) {
    return NextResponse.json({ error: 'Missing mood name parameter' }, { status: 400 });
  }
  
  const decodedMoodName = decodeURIComponent(params.moodName);
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20');
  
  console.log(`Fetching tracks for mood "${decodedMoodName}" with limit: ${limit}`);
  
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // First, find mood IDs that match this mood name
    const { data: moodsData, error: moodsError } = await supabase
      .from('moods')
      .select('id')
      .ilike('mood', `%${decodedMoodName}%`)
      .limit(10);
    
    if (moodsError) {
      console.error('Error fetching moods:', moodsError);
      return getMockTracksResponse(decodedMoodName);
    }
    
    if (!moodsData || moodsData.length === 0) {
      console.log(`No moods found with name: ${decodedMoodName}`);
      return getMockTracksResponse(decodedMoodName);
    }
    
    // Get all mood IDs
    const moodIds = moodsData.map(mood => mood.id);
    
    // Find tracks associated with these moods
    const { data: trackData, error: trackError } = await supabase
      .from('mood_tracks')
      .select('track_id, track_name, artist_name, track_image, mood_id')
      .in('mood_id', moodIds)
      .limit(limit);
    
    if (trackError) {
      console.error('Error fetching tracks for mood:', trackError);
      return getMockTracksResponse(decodedMoodName);
    }
    
    if (!trackData || trackData.length === 0) {
      console.log(`No tracks found for moods with name: ${decodedMoodName}`);
      return getMockTracksResponse(decodedMoodName);
    }
    
    // Fetch additional track details from Spotify API if available
    // Process track IDs
    const trackIds = trackData.map(track => track.track_id).filter(id => !!id);
    
    let processedTracks = [];
    
    if (trackIds.length > 0) {
      try {
        // Try to enrich with data from Spotify API
        const tracksResponse = await fetch(`${request.nextUrl.origin}/api/spotify/tracks?ids=${trackIds.join(',')}`, {
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          }
        });
        
        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          
          if (tracksData && tracksData.tracks && tracksData.tracks.length > 0) {
            // Process and merge the track data with our mood track data
            processedTracks = tracksData.tracks.map((spotifyTrack: any) => {
              // Find our mood track data for this ID
              const moodTrack = trackData.find(t => t.track_id === spotifyTrack.id);
              
              return {
                ...spotifyTrack,
                mood_id: moodTrack?.mood_id
              };
            });
          }
        }
      } catch (spotifyError) {
        console.error('Error fetching track details from Spotify:', spotifyError);
      }
    }
    
    // If we couldn't get enriched data, just use what we have
    if (processedTracks.length === 0) {
      processedTracks = trackData.map(track => ({
        id: track.track_id,
        name: track.track_name,
        artists: [{ name: track.artist_name }],
        album: { 
          images: [{ url: track.track_image || '/placeholder-track.png' }]
        },
        duration_ms: 180000, // 3 minutes default
        mood_id: track.mood_id
      }));
    }
    
    return NextResponse.json({ 
      tracks: processedTracks,
      count: processedTracks.length,
      mood: decodedMoodName
    });
  } catch (error) {
    console.error('Error in mood tracks API:', error);
    return getMockTracksResponse(decodedMoodName);
  }
}

// Helper function to get a mock response based on the mood
function getMockTracksResponse(mood: string) {
  const normalizedMood = mood.toLowerCase();
  
  // Default tracks (will be used if no specific mood matches)
  const defaultTracks = [
    {
      id: '4iV5W9uYEdYUVa79Axb7Rh',
      name: 'Starboy',
      artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }],
      album: { 
        name: 'Starboy',
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }] 
      },
      duration_ms: 230453
    },
    {
      id: '7qiZfU4dY1lWllzX7mPBI3',
      name: 'Shape of You',
      artists: [{ name: 'Ed Sheeran' }],
      album: { 
        name: 'Divide',
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }] 
      },
      duration_ms: 233713
    }
  ];
  
  // Mood-specific tracks
  const moodTracks: {[key: string]: any[]} = {
    'chill': [
      {
        id: '0bYg9bo50gSsH3LtXe2SQn',
        name: 'All I Need',
        artists: [{ name: 'Radiohead' }],
        album: { 
          name: 'In Rainbows',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c5e994a54d93877da606a9bc' }] 
        },
        duration_ms: 228293
      },
      {
        id: '1eVdLq9H4EQ10Hn5l0Y1JP',
        name: 'Nights',
        artists: [{ name: 'Frank Ocean' }],
        album: { 
          name: 'Blonde',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2737004645168bbae16b5c043ad' }] 
        },
        duration_ms: 305280
      }
    ],
    'energetic': [
      {
        id: '5hTpnNvgxAQo56EtETG7uU',
        name: 'Blinding Lights',
        artists: [{ name: 'The Weeknd' }],
        album: { 
          name: 'After Hours',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }] 
        },
        duration_ms: 200040
      },
      {
        id: '6DCZcSspjsKoFjzjrWoCdn',
        name: "God's Plan",
        artists: [{ name: 'Drake' }],
        album: { 
          name: 'Scorpion',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2739416ed64daf84936d89e671c' }] 
        },
        duration_ms: 198973
      }
    ],
    'happy': [
      {
        id: '3MZsBdqDrRTJihTHQrO6Dq',
        name: 'Levitating',
        artists: [{ name: 'Dua Lipa' }, { name: 'DaBaby' }],
        album: { 
          name: 'Future Nostalgia (The Moonlight Edition)',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2739e495fb707973f3390850eea' }] 
        },
        duration_ms: 203064
      },
      {
        id: '4j3VX80C4KhAa0w8CpV2Co',
        name: 'Uptown Funk',
        artists: [{ name: 'Mark Ronson' }, { name: 'Bruno Mars' }],
        album: { 
          name: 'Uptown Special',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2737794d7a2a82522a04f3a38de' }] 
        },
        duration_ms: 270213
      }
    ],
    'sad': [
      {
        id: '1XIkAtmAGzP4eRb9Q35cJT',
        name: 'All I Want',
        artists: [{ name: 'Kodaline' }],
        album: { 
          name: 'In A Perfect World',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c3408d9a01c177c7d8f41126' }] 
        },
        duration_ms: 307435
      },
      {
        id: '4RCWB3V8V0dignt99LZ8vH',
        name: 'Let It Go',
        artists: [{ name: 'James Bay' }],
        album: { 
          name: 'Chaos And The Calm',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d301758907a5cb8506164761' }] 
        },
        duration_ms: 250546
      }
    ]
  };
  
  // Check for mood matches
  for (const [key, tracks] of Object.entries(moodTracks)) {
    if (normalizedMood.includes(key)) {
      return NextResponse.json({ 
        tracks: tracks,
        count: tracks.length,
        mood: mood 
      });
    }
  }
  
  // Return default tracks if no match
  return NextResponse.json({ 
    tracks: defaultTracks,
    count: defaultTracks.length,
    mood: mood
  });
} 