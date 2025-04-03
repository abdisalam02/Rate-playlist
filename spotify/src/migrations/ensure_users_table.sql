-- Ensure users table exists with proper structure
-- Run this on your Supabase database

-- First make sure the users table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created users table.';
    ELSE
        RAISE NOTICE 'Users table already exists.';
    END IF;
END
$$;

-- Ensure RLS is disabled on the users table to allow direct admin access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create function to create users safely (will upsert)
CREATE OR REPLACE FUNCTION create_user(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  created_time TIMESTAMPTZ DEFAULT now(),
  updated_time TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Executes with owner permissions
AS $$
BEGIN
  INSERT INTO users (id, email, name, created_at, updated_at)
  VALUES (user_id, user_email, user_name, created_time, updated_time)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION create_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_user TO anon;

-- Fix user_moods foreign key if needed
-- This is needed only if your foreign key is causing issues
DO $$
BEGIN
    -- Check if the constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_moods_user_id_fkey'
        AND table_name = 'user_moods'
    ) THEN
        -- Remove and recreate the constraint to be more resilient
        ALTER TABLE user_moods DROP CONSTRAINT user_moods_user_id_fkey;
        
        -- Add the constraint back with ON DELETE CASCADE if desired
        ALTER TABLE user_moods
        ADD CONSTRAINT user_moods_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Recreated foreign key constraint on user_moods.';
    ELSE
        RAISE NOTICE 'Foreign key constraint not found or already modified.';
    END IF;
END
$$; 