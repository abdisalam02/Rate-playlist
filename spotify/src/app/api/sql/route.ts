import { NextRequest, NextResponse } from 'next/server';
import { initStoredProcedures } from './init';
import { getSession } from '@/lib/session';
import supabase from '@/lib/supabase';

/**
 * POST /api/sql
 * Initialize database functions and stored procedures
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication (only allow authenticated users to run this)
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Starting SQL initialization...');

    // Create user_mood_tracks table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('create_user_mood_tracks_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_mood_tracks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          mood_id UUID REFERENCES public.user_moods(id) ON DELETE CASCADE,
          track_id TEXT NOT NULL,
          track_name TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          track_image TEXT,
          position INTEGER NOT NULL,
          category TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          UNIQUE(mood_id, track_id)
        );
      `
    });

    if (createTableError) {
      console.error('Error creating user_mood_tracks table:', createTableError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create user_mood_tracks table',
        details: createTableError.message 
      }, { status: 500 });
    }

    // Create function to insert track
    const { error: createFunctionError } = await supabase.rpc('create_insert_track_function', {
      sql: `
        CREATE OR REPLACE FUNCTION public.insert_track(
          p_user_id UUID,
          p_mood_id UUID,
          p_track_id TEXT,
          p_track_name TEXT,
          p_artist_name TEXT,
          p_track_image TEXT
        ) RETURNS JSON AS $$
        DECLARE
          v_position INTEGER;
          v_result JSON;
        BEGIN
          -- Get the next position
          SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
          FROM public.user_mood_tracks
          WHERE mood_id = p_mood_id;

          -- Insert the track
          INSERT INTO public.user_mood_tracks (
            user_id, mood_id, track_id, track_name, artist_name, track_image, position
          ) VALUES (
            p_user_id, p_mood_id, p_track_id, p_track_name, p_artist_name, p_track_image, v_position
          ) RETURNING json_build_object(
            'id', id,
            'position', position,
            'track_name', track_name,
            'artist_name', artist_name
          ) INTO v_result;

          RETURN v_result;
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object('error', SQLERRM);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    if (createFunctionError) {
      console.error('Error creating insert_track function:', createFunctionError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create insert_track function',
        details: createFunctionError.message 
      }, { status: 500 });
    }

    console.log('SQL initialization completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in SQL initialization:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initialize SQL functions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 