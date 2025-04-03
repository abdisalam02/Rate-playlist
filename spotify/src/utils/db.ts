import { Pool } from 'pg';

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default {
  query: (text: string, params: any[] = []) => pool.query(text, params),
}; 