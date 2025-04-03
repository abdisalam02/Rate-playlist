-- Schema updates for improved track information in mood tables

-- Update the user_moods table to include fields for a "featured track"
-- This allows a mood to have a primary/representative track while still allowing multiple tracks
ALTER TABLE user_moods 
ADD COLUMN IF NOT EXISTS featured_track_id VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS featured_track_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS featured_artist_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS featured_track_image VARCHAR(255) NULL;

-- Ensure the mood_tracks table has all necessary fields
-- This table is the junction table that links tracks to either staple moods or user moods
ALTER TABLE mood_tracks
ADD COLUMN IF NOT EXISTS track_image VARCHAR(255) NULL;

-- Create a helper view for easier querying of user moods with their featured track
CREATE OR REPLACE VIEW user_moods_with_tracks AS
SELECT 
    um.id,
    um.user_id,
    um.mood_name,
    um.description,
    um.created_at,
    um.featured_track_id,
    um.featured_track_name,
    um.featured_artist_name,
    um.featured_track_image,
    (
        SELECT COUNT(*) 
        FROM mood_tracks mt 
        WHERE mt.user_mood_id = um.id
    ) AS track_count
FROM 
    user_moods um;

-- Create a function to set a featured track for a user mood
CREATE OR REPLACE FUNCTION set_featured_track(
    p_mood_id UUID,
    p_track_id VARCHAR(50),
    p_track_name VARCHAR(255),
    p_artist_name VARCHAR(255),
    p_track_image VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN
    UPDATE user_moods
    SET 
        featured_track_id = p_track_id,
        featured_track_name = p_track_name,
        featured_artist_name = p_artist_name,
        featured_track_image = p_track_image
    WHERE id = p_mood_id;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set the first added track as the featured track
-- if no featured track is already set
CREATE OR REPLACE FUNCTION update_mood_featured_track()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a track being added to a user mood
    IF NEW.user_mood_id IS NOT NULL THEN
        -- Check if the user mood has no featured track yet
        UPDATE user_moods um
        SET 
            featured_track_id = NEW.track_id,
            featured_track_name = NEW.track_name,
            featured_artist_name = NEW.artist_name,
            featured_track_image = NEW.track_image
        WHERE 
            um.id = NEW.user_mood_id AND
            um.featured_track_id IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS mood_track_added_trigger ON mood_tracks;

-- Create the trigger
CREATE TRIGGER mood_track_added_trigger
AFTER INSERT ON mood_tracks
FOR EACH ROW
EXECUTE FUNCTION update_mood_featured_track(); 