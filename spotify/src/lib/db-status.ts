import { supabase } from './supabase';

export type DbStatus = {
  connected: boolean;
  message: string;
};

/**
 * Check if the database connection is working
 */
export async function checkDbConnection(): Promise<DbStatus> {
  console.log('DB: Checking database connection');
  
  try {
    // Try to query a simple table that should always exist
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('DB: Connection check failed:', error);
      return {
        connected: false,
        message: error.message || 'Unknown database error'
      };
    }
    
    console.log('DB: Connection successful');
    return {
      connected: true,
      message: 'Database connection successful'
    };
  } catch (error) {
    console.error('DB: Connection check exception:', error);
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Unknown error checking database connection'
    };
  }
}

/**
 * Check if a particular table exists in the database
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  console.log(`DB: Checking if table '${tableName}' exists`);
  
  try {
    // Method 1: Try to select a count from the table
    const { error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1);
    
    // If no error, the table exists
    if (!error) {
      console.log(`DB: Table '${tableName}' exists`);
      return true;
    }
    
    // If the error is not a "doesn't exist" error, try another method
    if (!error.message.includes('does not exist')) {
      // Method 2: Check information_schema
      const { data, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', tableName)
        .limit(1);
      
      if (schemaError) {
        console.error(`DB: Error checking information_schema for '${tableName}':`, schemaError);
        return false;
      }
      
      const exists = Array.isArray(data) && data.length > 0;
      console.log(`DB: Table '${tableName}' ${exists ? 'exists' : 'does not exist'} (via information_schema)`);
      return exists;
    }
    
    console.log(`DB: Table '${tableName}' does not exist`);
    return false;
  } catch (error) {
    console.error(`DB: Error checking if table '${tableName}' exists:`, error);
    return false;
  }
} 