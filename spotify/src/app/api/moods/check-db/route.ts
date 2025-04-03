import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('API: Checking database connection and tables');
  
  try {
    // First check that we can connect to Supabase
    const { data: connectionTest, error: connectionError } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('API: Database connection error:', connectionError);
      return NextResponse.json({
        success: false,
        message: 'Failed to connect to database',
        error: connectionError
      }, { status: 500 });
    }
    
    // Check staple_moods table
    const { data: stapleMoodsCheck, error: stapleMoodsError } = await supabase
      .from('staple_moods')
      .select('count(*)', { count: 'exact', head: true });
    
    // Check user_moods table  
    const { data: userMoodsCheck, error: userMoodsError } = await supabase
      .from('user_moods')
      .select('count(*)', { count: 'exact', head: true });
    
    // Check mood_tracks table
    const { data: moodTracksCheck, error: moodTracksError } = await supabase
      .from('mood_tracks')
      .select('count(*)', { count: 'exact', head: true });
    
    // Get actual staple moods for verification
    const { data: stapleMoods, error: fetchError } = await supabase
      .from('staple_moods')
      .select('id, mood_name')
      .limit(10);
    
    return NextResponse.json({
      success: true,
      message: 'Database check completed',
      connectionStatus: 'Connected',
      tables: {
        staple_moods: {
          exists: !stapleMoodsError,
          error: stapleMoodsError ? stapleMoodsError.message : null
        },
        user_moods: {
          exists: !userMoodsError,
          error: userMoodsError ? userMoodsError.message : null
        },
        mood_tracks: {
          exists: !moodTracksError,
          error: moodTracksError ? moodTracksError.message : null
        }
      },
      stapleMoods: stapleMoods || [],
      stapleMoodsCount: stapleMoods?.length || 0
    });
  } catch (error) {
    console.error('API: Error checking database:', error);
    return NextResponse.json({
      success: false,
      message: 'Error checking database',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 