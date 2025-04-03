import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('API: Creating missing mood tables');
  
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase credentials',
      }, { status: 500 });
    }
    
    // Create a Supabase client with the service role key for admin privileges
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false }
      }
    );
    
    // Create user_moods table
    const userMoodsResult = await adminSupabase.rpc('create_user_moods_table', {});
    
    // Create mood_tracks table
    const moodTracksResult = await adminSupabase.rpc('create_mood_tracks_table', {});
    
    // Check if the RPC functions exist
    if (userMoodsResult.error && userMoodsResult.error.message.includes('function') && 
        moodTracksResult.error && moodTracksResult.error.message.includes('function')) {
      
      // If RPC functions don't exist, direct SQL fallback - create only if you have service role permissions
      const userMoodsSQL = `
        CREATE TABLE IF NOT EXISTS user_moods (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          mood_name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      const moodTracksSQL = `
        CREATE TABLE IF NOT EXISTS mood_tracks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          staple_mood_id UUID REFERENCES staple_moods(id) ON DELETE CASCADE,
          user_mood_id UUID REFERENCES user_moods(id) ON DELETE CASCADE,
          track_id VARCHAR(50) NOT NULL,
          track_name VARCHAR(255) NOT NULL,
          artist_name VARCHAR(255) NOT NULL,
          track_image VARCHAR(255),
          added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT mood_track_belongs_to_one_mood_type CHECK (
            (staple_mood_id IS NOT NULL AND user_mood_id IS NULL) OR
            (staple_mood_id IS NULL AND user_mood_id IS NOT NULL)
          ),
          CONSTRAINT unique_staple_mood_track_per_user UNIQUE (user_id, staple_mood_id),
          CONSTRAINT unique_user_mood_track UNIQUE (user_mood_id, track_id)
        );
      `;
      
      // Execute direct SQL to create tables (requires service role key)
      try {
        const { error: userMoodsError } = await adminSupabase.from('user_moods').select('count(*)').limit(1);
        
        if (userMoodsError && userMoodsError.code === '42P01') { // Table doesn't exist
          console.log('Creating user_moods table with direct SQL');
          const { error } = await adminSupabase.auth.admin.executeSql(userMoodsSQL);
          if (error) {
            console.error('Error creating user_moods table:', error);
          }
        }
        
        const { error: moodTracksError } = await adminSupabase.from('mood_tracks').select('count(*)').limit(1);
        
        if (moodTracksError && moodTracksError.code === '42P01') { // Table doesn't exist
          console.log('Creating mood_tracks table with direct SQL');
          const { error } = await adminSupabase.auth.admin.executeSql(moodTracksSQL);
          if (error) {
            console.error('Error creating mood_tracks table:', error);
          }
        }
      } catch (sqlError) {
        console.error('SQL execution error:', sqlError);
        
        return NextResponse.json({
          success: false,
          message: 'Tables creation failed via direct SQL',
          error: sqlError instanceof Error ? sqlError.message : String(sqlError),
          note: 'You need to create the tables via Supabase Studio or a migration'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Attempted to create missing tables',
      userMoodsResult: userMoodsResult.error ? { error: userMoodsResult.error.message } : { success: true },
      moodTracksResult: moodTracksResult.error ? { error: moodTracksResult.error.message } : { success: true },
      note: 'If you received function errors, you may need to create these tables via Supabase Studio'
    });
  } catch (error) {
    console.error('API: Error creating mood tables:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create mood tables',
      error: error instanceof Error ? error.message : String(error),
      note: 'You likely need to create the tables manually in Supabase Studio'
    }, { status: 500 });
  }
} 