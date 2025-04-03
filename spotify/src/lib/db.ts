import { Pool } from 'pg';

/**
 * Database utility for PostgreSQL connections
 * For Supabase, we use the @supabase/supabase-js client directly
 * This utility is available for direct PostgreSQL queries if needed
 */

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

// Helper functions for database operations
export const db = {
  /**
   * Execute a query with parameters
   */
  async query(text: string, params?: any[]) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log('Executed query', {
        text,
        params,
        duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      console.error('Error executing query', { text, params, error });
      throw error;
    }
  },
  
  /**
   * Get a client from the pool
   */
  async getClient() {
    try {
      const client = await pool.connect();
      return client;
    } catch (error) {
      console.error('Error getting client from pool', error);
      throw error;
    }
  }
};

// Test the database connection
db.query('SELECT NOW()')
  .then(() => console.log('PostgreSQL connection successful'))
  .catch(err => console.error('PostgreSQL connection error:', err));

export default db; 