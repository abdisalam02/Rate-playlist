-- SQL to remove default track fields from staple_moods table

-- First, back up the current data if we need to revert
CREATE TABLE IF NOT EXISTS staple_moods_backup AS SELECT * FROM staple_moods;

-- Create a migration function to safely remove columns
-- This function will create a new table without the columns, copy the data, and swap tables
CREATE OR REPLACE FUNCTION remove_staple_mood_default_tracks() RETURNS VOID AS
$$
BEGIN
    -- Create a new table without the default track columns
    CREATE TABLE staple_moods_new (
        id UUID PRIMARY KEY,
        mood_name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Copy the data from the existing table
    INSERT INTO staple_moods_new (id, mood_name, description, created_at)
    SELECT id, mood_name, description, created_at FROM staple_moods;
    
    -- Drop the old table and rename the new one
    DROP TABLE staple_moods;
    ALTER TABLE staple_moods_new RENAME TO staple_moods;
    
    -- Add any needed indexes
    CREATE INDEX IF NOT EXISTS staple_moods_mood_name_idx ON staple_moods (mood_name);
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT remove_staple_mood_default_tracks();

-- Cleanup
DROP FUNCTION IF EXISTS remove_staple_mood_default_tracks();

-- Verify the new structure
-- COMMENT OUT this line before running the SQL if you don't want to see the output
SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'staple_moods'; 