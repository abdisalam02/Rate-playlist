import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// GET /api/moods - Get all moods
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20');
  
  console.log(`Fetching all moods with limit: ${limit}`);
  
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Fetch all unique moods from the database
    const { data: moodsData, error: moodsError } = await supabase
      .from('moods')
      .select('id, mood, color, intensity, created_at, user_id, tracks:mood_tracks(track_id, track_name, artist_name, track_image)')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (moodsError) {
      console.error('Error fetching moods:', moodsError);
      return getMockMoodsResponse();
    }
    
    // Process moods to add sample track data if missing
    const processedMoods = moodsData.map(mood => {
      // Process track info if available
      let trackInfo = null;
      if (mood.tracks && mood.tracks.length > 0) {
        trackInfo = mood.tracks[0]; // Get first track associated with this mood
      }
      
      return {
        id: mood.id,
        mood: mood.mood,
        color: mood.color || getMoodColor(mood.mood),
        intensity: mood.intensity || 0.5,
        user_id: mood.user_id,
        created_at: mood.created_at,
        track_id: trackInfo?.track_id,
        track_name: trackInfo?.track_name,
        artist_name: trackInfo?.artist_name,
        track_image: trackInfo?.track_image
      };
    });
    
    return NextResponse.json({ 
      moods: processedMoods,
      count: processedMoods.length
    });
  } catch (error) {
    console.error('Error in moods API:', error);
    return getMockMoodsResponse();
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