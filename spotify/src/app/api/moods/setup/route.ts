import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('API: Checking mood tables existence and data');
  const results = {
    success: true,
    tables: {},
    data: {}
  };
  
  try {
    // 1. Check if staple_moods table exists and has data
    const { data: stapleMoods, error: stapleMoodsError } = await supabase
      .from('staple_moods')
      .select('id, mood_name, description, default_track_id, default_track_name, default_artist_name')
      .limit(10);
    
    if (stapleMoodsError) {
      results.tables.staple_moods = {
        exists: false,
        error: stapleMoodsError.message
      };
    } else {
      results.tables.staple_moods = {
        exists: true,
        count: stapleMoods?.length || 0
      };
      results.data.stapleMoods = stapleMoods || [];
    }
    
    // 2. Check if user_moods table exists
    const { data: userMoods, error: userMoodsError } = await supabase
      .from('user_moods')
      .select('count(*)', { count: 'exact', head: true });
    
    if (userMoodsError) {
      results.tables.user_moods = {
        exists: false,
        error: userMoodsError.message
      };
    } else {
      results.tables.user_moods = {
        exists: true
      };
    }
    
    // 3. Check if mood_tracks table exists
    const { data: moodTracks, error: moodTracksError } = await supabase
      .from('mood_tracks')
      .select('count(*)', { count: 'exact', head: true });
    
    if (moodTracksError) {
      results.tables.mood_tracks = {
        exists: false,
        error: moodTracksError.message
      };
    } else {
      results.tables.mood_tracks = {
        exists: true
      };
    }
    
    // 4. Check the existing functions in supabase.ts
    results.api = {
      getStapleMoods: typeof supabase.getStapleMoods === 'function',
      getStapleMoodTracks: typeof supabase.getStapleMoodTracks === 'function',
      getUserMoods: typeof supabase.getUserMoods === 'function',
      createUserMood: typeof supabase.createUserMood === 'function',
      addTrackToStapleMood: typeof supabase.addTrackToStapleMood === 'function',
      removeTrackFromStapleMood: typeof supabase.removeTrackFromStapleMood === 'function',
      getUserMoodTracks: typeof supabase.getUserMoodTracks === 'function'
    };
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('API: Error checking mood tables:', error);
    return NextResponse.json({
      success: false,
      message: 'Check failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 