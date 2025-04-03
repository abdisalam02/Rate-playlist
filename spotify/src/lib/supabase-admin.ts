import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('CRITICAL ERROR: Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAdminKey) {
  console.error('CRITICAL ERROR: Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  supabaseUrl || 'https://znejkoofgypvwodkvzud.supabase.co',
  supabaseAdminKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Execute raw SQL queries (admin only)
 * This should be used very carefully and only for administrative tasks
 */
export async function executeRawSql(sql: string, params?: any[]) {
  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
      sql,
      params: params || []
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error executing raw SQL:', error);
    return { data: null, error };
  }
}

/**
 * Add a column to a table if it doesn't exist
 */
export async function addColumnIfNotExists(
  table: string, 
  column: string, 
  type: string, 
  defaultValue?: string
) {
  const defaultSql = defaultValue ? ` DEFAULT ${defaultValue}` : '';
  const sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}${defaultSql};`;
  
  return executeRawSql(sql);
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string) {
  const sql = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
    );
  `;
  
  const result = await executeRawSql(sql);
  return result.data?.[0]?.exists === true;
}

/**
 * Create a table if it doesn't exist
 */
export async function createTableIfNotExists(tableName: string, createSql: string) {
  const exists = await tableExists(tableName);
  
  if (!exists) {
    return executeRawSql(createSql);
  }
  
  return { data: { message: `Table ${tableName} already exists` }, error: null };
}

/**
 * Run database migrations
 */
export async function runMigrations() {
  const results: any[] = [];
  
  // 1. Add description column to user_moods if it doesn't exist
  const descriptionMigration = await addColumnIfNotExists(
    'user_moods',
    'description',
    'TEXT',
    '\'\''
  );
  
  results.push({
    migration: 'add_description_to_user_moods',
    status: descriptionMigration.error ? 'failed' : 'success',
    error: descriptionMigration.error?.message
  });
  
  // 2. Check if user_set_moods table exists and create it if needed
  const userSetMoodsTable = `
    CREATE TABLE IF NOT EXISTS user_set_moods (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id VARCHAR(255) NOT NULL,
      mood_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      track_id TEXT NOT NULL,
      track_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      track_image TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  const createUserSetMoodsResult = await createTableIfNotExists('user_set_moods', userSetMoodsTable);
  
  results.push({
    migration: 'create_user_set_moods_table',
    status: createUserSetMoodsResult.error ? 'failed' : 'success',
    error: createUserSetMoodsResult.error?.message
  });
  
  // 3. Check if user_mood_tracks table exists and create it if needed
  const userMoodTracksTable = `
    CREATE TABLE IF NOT EXISTS user_mood_tracks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id VARCHAR(255) NOT NULL,
      mood_id UUID REFERENCES user_set_moods(id) ON DELETE CASCADE,
      track_id VARCHAR(255) NOT NULL,
      track_name VARCHAR(255) NOT NULL,
      artist_name VARCHAR(255) NOT NULL,
      track_image VARCHAR(255),
      position INTEGER DEFAULT 1,
      category VARCHAR(50) DEFAULT 'primary',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  const createUserMoodTracksResult = await createTableIfNotExists('user_mood_tracks', userMoodTracksTable);
  
  results.push({
    migration: 'create_user_mood_tracks_table',
    status: createUserMoodTracksResult.error ? 'failed' : 'success',
    error: createUserMoodTracksResult.error?.message
  });
  
  return results;
}

export default supabaseAdmin; 