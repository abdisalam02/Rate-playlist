import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getSession } from '@/lib/session';

// SQL statements to create tables
const createTables = [
  // Create user_moods table
  `CREATE TABLE IF NOT EXISTS user_moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    mood_name TEXT NOT NULL,
    description TEXT,
    track_id TEXT,
    track_name TEXT,
    artist_name TEXT,
    track_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // Create user_mood_tracks table
  `CREATE TABLE IF NOT EXISTS user_mood_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    mood_id UUID REFERENCES user_moods(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    track_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    track_image TEXT,
    position INTEGER DEFAULT 1,
    category TEXT DEFAULT 'primary',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`
];

// Additional SQL statements to add indices and ensure proper constraints
const updateTables = [
  // Add index on user_id for faster lookups
  `CREATE INDEX IF NOT EXISTS user_moods_user_id_idx ON user_moods (user_id)`,
  
  // Add index on user_id and mood_id for user_mood_tracks
  `CREATE INDEX IF NOT EXISTS user_mood_tracks_user_id_mood_id_idx ON user_mood_tracks (user_id, mood_id)`
];

export async function GET() {
  try {
    console.log('Initializing SQL tables');
    const session = await getSession();
    
    if (!session?.user?.email) {
      console.error('No authenticated user found');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Enable extensions directly through SQL
    await supabase.from('_sql').select('*').execute(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `).catch(e => {
      console.log('Extensions may already exist or require admin privileges:', e?.message);
    });
    
    // Create tables directly
    const results = [];
    
    for (const sql of createTables) {
      try {
        console.log('Executing SQL:', sql.substring(0, 50) + '...');
        
        const { error } = await supabase.from('_sql').select('*').execute(sql);
        
        if (error) {
          console.error('Error executing SQL:', error);
          results.push({
            success: false,
            sql: sql.substring(0, 100) + '...',
            error: error.message
          });
        } else {
          results.push({
            success: true,
            sql: sql.substring(0, 100) + '...'
          });
        }
      } catch (err) {
        console.error('Error executing SQL statement:', err);
        results.push({
          success: false,
          sql: sql.substring(0, 100) + '...',
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    // Create indices and additional constraints
    for (const sql of updateTables) {
      try {
        console.log('Executing SQL update:', sql.substring(0, 50) + '...');
        
        const { error } = await supabase.from('_sql').select('*').execute(sql);
        
        if (error) {
          console.error('Error executing SQL update:', error);
          results.push({
            success: false,
            sql: sql.substring(0, 100) + '...',
            error: error.message
          });
        } else {
          results.push({
            success: true, 
            sql: sql.substring(0, 100) + '...'
          });
        }
      } catch (err) {
        console.error('Error executing SQL update statement:', err);
        results.push({
          success: false,
          sql: sql.substring(0, 100) + '...',
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'SQL initialization completed',
      results
    });
  } catch (error) {
    console.error('Error in SQL initialization:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'SQL initialization failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 