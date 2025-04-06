import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/moods - Get all moods
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50'); // Increased default limit
  
  console.log(`Fetching all moods with limit: ${limit}`);
  
  try {
    // Fetch moods, associated user display name/image, and associated tracks
    const { data: moodsData, error: moodsError, count } = await supabase
      .from('user_moods')
      .select(`
        id,
        mood_name,
        description,
        created_at,
        user_id,
        users ( display_name, profile_image ),
        mood_tracks ( track_image, added_at ) 
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (moodsError) {
      console.error('Supabase error fetching moods:', moodsError);
      throw moodsError;
    }
    
    // Process data to extract display_name, profile_image and latest track image
    const formattedMoods = moodsData?.map(mood => {
        let latestTrackImage: string | null = null;
        if (mood.mood_tracks && mood.mood_tracks.length > 0) {
            const sortedTracks = [...mood.mood_tracks].sort((a, b) => 
                new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
            );
            latestTrackImage = sortedTracks[0]?.track_image || null;
        }
        
        return {
            id: mood.id,
            mood_name: mood.mood_name,
            description: mood.description,
            created_at: mood.created_at, 
            user_id: mood.user_id, 
            username: mood.users?.display_name || 'Unknown User', 
            profile_image: mood.users?.profile_image || null,
            latest_track_image: latestTrackImage 
        };
    }) || [];
    
    return NextResponse.json({ moods: formattedMoods, count: count ?? 0 });
  } catch (error: any) {
    console.error('Error in moods API:', error);
    return NextResponse.json(
      { error: `Failed to fetch moods: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper function to get a color for a mood
function getMoodColor(mood: string): string {
  const moodColors: {[key: string]: string} = {
    'happy': '#FFD700',    // Gold
    'sad': '#4682B4',      // Steel Blue
    'chill': '#5F9EA0',    // Cadet Blue
    'energetic': '#FF4500', // Orange Red
    'romantic': '#DB7093',  // Pale Violet Red
    'angry': '#8B0000',     // Dark Red
    'nostalgic': '#DDA0DD', // Plum
    'focused': '#2E8B57'    // Sea Green
  };
  
  const normalizedMood = mood.toLowerCase();
  
  for (const [key, color] of Object.entries(moodColors)) {
    if (normalizedMood.includes(key)) {
      return color;
    }
  }
  
  // If no match, return a default color
  return '#1DB954'; // Spotify green
}

// Helper function to get a mock response
function getMockMoodsResponse() {
  const mockMoods = [
    {
      id: '1',
      mood: 'Chill',
      color: '#5F9EA0',
      intensity: 0.4,
      created_at: new Date().toISOString(),
      user_id: 'sample-user',
      track_id: '4iV5W9uYEdYUVa79Axb7Rh',
      track_name: 'Waves',
      artist_name: 'Chill Artist',
      track_image: 'https://i.scdn.co/image/ab67616d0000b2734e40d154b19c07fff7e13c92'
    },
    {
      id: '2',
      mood: 'Energetic',
      color: '#FF4500',
      intensity: 0.8,
      created_at: new Date().toISOString(),
      user_id: 'sample-user-2',
      track_id: '0bYg9bo50gSsH3LtXe2SQn',
      track_name: 'Power Up',
      artist_name: 'Energy Band',
      track_image: 'https://i.scdn.co/image/ab67616d0000b273bca00ddcd5e1e28888433142'
    },
    {
      id: '3',
      mood: 'Happy',
      color: '#FFD700',
      intensity: 0.7,
      created_at: new Date().toISOString(),
      user_id: 'sample-user-3',
      track_id: '3MZsBdqDrRTJihTHQrO6Dq',
      track_name: 'Good Vibes',
      artist_name: 'Happy Tunes',
      track_image: 'https://i.scdn.co/image/ab67616d0000b273e747c2b16ba58a8dc27bad7e'
    }
  ];
  
  return NextResponse.json({ 
    moods: mockMoods,
    count: mockMoods.length
  });
} 