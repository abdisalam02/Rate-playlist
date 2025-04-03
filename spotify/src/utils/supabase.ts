import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as supabaseLib } from '@/lib/supabase';

// Get the Supabase URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient;

// Check if environment variables are available
if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment variables missing in utils/supabase.ts, using lib/supabase.ts implementation');
  supabase = supabaseLib as SupabaseClient;
} else {
  // Create a new Supabase client with the environment variables
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default supabase; 