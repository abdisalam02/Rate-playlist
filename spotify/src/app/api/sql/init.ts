import supabase from '@/utils/supabase';

/**
 * Initialize stored procedures in Supabase
 * This should be called from an API route during initialization
 */
export async function initStoredProcedures() {
  console.log('Initializing stored procedures...');

  try {
    // Create the user_mood_tracks table if it doesn't exist
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS user_mood_tracks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      mood_id UUID NOT NULL REFERENCES user_set_moods(id),
      track_id TEXT NOT NULL,
      track_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      track_image TEXT DEFAULT '',
      position INTEGER DEFAULT 1,
      category TEXT DEFAULT 'primary',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(mood_id, track_id)
    );
    `;

    // Execute the SQL to create the table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (tableError) {
      console.error('Error creating user_mood_tracks table:', tableError);
      
      // Try a simplified table creation as fallback (removing constraints)
      const simplifiedTableSQL = `
      CREATE TABLE IF NOT EXISTS user_mood_tracks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        mood_id UUID NOT NULL,
        track_id TEXT NOT NULL,
        track_name TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        track_image TEXT DEFAULT '',
        position INTEGER DEFAULT 1,
        category TEXT DEFAULT 'primary',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      `;
      
      const { error: simplifiedTableError } = await supabase.rpc('exec_sql', {
        sql: simplifiedTableSQL
      });
      
      if (simplifiedTableError) {
        console.error('Error creating simplified user_mood_tracks table:', simplifiedTableError);
      } else {
        console.log('Created simplified user_mood_tracks table successfully');
      }
    } else {
      console.log('Created user_mood_tracks table successfully');
    }

    return {
      success: !tableError,
      errors: tableError ? [tableError.message] : []
    };
  } catch (error) {
    console.error('Error initializing database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 